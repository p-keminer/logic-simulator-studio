/**
 * Tick-basierte Discrete-Event-Simulation mit Double-Buffering.
 *
 * Kernprinzip:
 *   Phase 1 (Read):  Alle Gatter lesen Eingänge aus `currentBuffer.outputs`
 *   Phase 2 (Write): Alle Gatter berechnen neue Ausgaben → `nextOutputs`
 *   Swap:            nextOutputs wird zum neuen currentBuffer
 *
 * Dadurch:
 *   - Kein Gatter liest seinen eigenen Ausgang aus dem gleichen Tick (no race)
 *   - Rückkopplungsschleifen (SR-Latch, Ring-Oszillator) konvergieren natürlich
 *   - 1-Tick Propagation-Delay pro Gatter ist automatisch garantiert
 */

import type { Circuit, SignalValue, SignalState, SimulationResult } from '../types';
import { gateRegistry } from '../registry/GateRegistry';

// ── Konfiguration ─────────────────────────────────────────────────────────────

/** Simulierte Ticks pro Sekunde (Schule/Demo-Modus — Signalwechsel sind sichtbar) */
export const SIM_TICKS_PER_SEC = 500;

/** Maximale Settle-Ticks nach Strukturänderungen (verhindert Endlosschleife bei Ringoszillatoren) */
const MAX_SETTLE_TICKS = 64;

// ── SimBuffer ─────────────────────────────────────────────────────────────────

export interface SimBuffer {
  /** Aktueller Ausgabewert jedes Gatters: gateId → portId → 0|1 */
  outputs: Record<string, Record<string, SignalValue>>;
  /** Interner Zustand von Gattern (Flip-Flop Q, Clock-Wert, etc.): gateId → state */
  customStates: Record<string, Record<string, unknown>>;
  /** Monotoner Tick-Zähler */
  tick: number;
}

// ── Initialisierung ───────────────────────────────────────────────────────────

/**
 * Erstellt einen initialen SimBuffer aus dem aktuellen React-Circuit-State.
 * Seed-Werte kommen von `gate.outputSignals` und `gate.customState`.
 */
export function initBuffer(circuit: Circuit): SimBuffer {
  const outputs:      Record<string, Record<string, SignalValue>> = {};
  const customStates: Record<string, Record<string, unknown>>     = {};

  for (const gate of Object.values(circuit.gates)) {
    outputs[gate.id] = {};
    try {
      const def = gateRegistry.get(gate.typeId);
      for (const port of def.outputs) {
        outputs[gate.id][port.id] = (gate.outputSignals[port.id]?.value ?? 0) as SignalValue;
      }
    } catch { /* unbekannter Typ → leere Ausgabe */ }

    customStates[gate.id] = { ...(gate.customState ?? {}) };
  }

  return { outputs, customStates, tick: 0 };
}

/**
 * Synchronisiert den SimBuffer wenn sich die Schaltkreisstruktur oder
 * Benutzereingaben ändern. Bestehende Gatter-Zustände bleiben erhalten.
 *
 * Wichtige Unterscheidung:
 *   - INPUT_SWITCH / PUSH_BTN / CONST: Wert wird immer aus React-State übernommen
 *   - CLOCK: Frequenz wird übernommen; Wert nur wenn Takt angehalten (manuelle Schritte)
 *   - Flip-Flops & Logik: Zustand wird vom Tick-Engine verwaltet (nicht überschrieben)
 */
export function syncBuffer(
  buffer:        SimBuffer,
  circuit:       Circuit,
  isClockPaused: boolean,
): SimBuffer {
  const outputs      = { ...buffer.outputs };
  const customStates = { ...buffer.customStates };
  const circuitIds   = new Set(Object.keys(circuit.gates));

  // Gelöschte Gatter aus Buffer entfernen
  for (const id of Object.keys(outputs)) {
    if (!circuitIds.has(id)) {
      delete outputs[id];
      delete customStates[id];
    }
  }

  for (const gate of Object.values(circuit.gates)) {
    // Neu platzierte Gatter initialisieren
    if (!outputs[gate.id]) {
      outputs[gate.id] = {};
      try {
        const def = gateRegistry.get(gate.typeId);
        for (const port of def.outputs) {
          outputs[gate.id][port.id] = (gate.outputSignals[port.id]?.value ?? 0) as SignalValue;
        }
      } catch { /* unbekannter Typ */ }
      customStates[gate.id] = { ...(gate.customState ?? {}) };
      continue;
    }

    // Benutzergesteuerte Eingaben immer aus React-State synchronisieren
    if (
      gate.typeId === 'INPUT_SWITCH' ||
      gate.typeId === 'PUSH_BTN'     ||
      gate.typeId === 'CONST_HIGH'   ||
      gate.typeId === 'CONST_LOW'    ||
      gate.typeId === 'ADC8'
    ) {
      customStates[gate.id] = { ...customStates[gate.id], ...(gate.customState ?? {}) };
      continue;
    }

    // CLOCK: Frequenz synchronisieren; bei Pause den Wert übernehmen und tickCounter
    // zurücksetzen, damit das Timing nach Resume korrekt bleibt.
    if (gate.typeId === 'CLOCK') {
      const freq = (gate.customState?.frequency as number) ?? 1;
      if (isClockPaused) {
        customStates[gate.id] = {
          ...customStates[gate.id],
          value:       (gate.customState?.value as 0 | 1) ?? 0,
          frequency:   freq,
          tickCounter: 0,
        };
      } else {
        customStates[gate.id] = { ...customStates[gate.id], frequency: freq };
      }
      continue;
    }

    // ROM256: Inhalt wird vom Benutzer per Editor gesetzt (nicht simulation-gesteuert).
    // customState.data muss aus React-State synchronisiert werden, sonst würde der
    // nächste Tick das per GATE_ROM_LOAD geladene ROM-Daten mit dem alten SimBuffer-
    // Zustand (leeres Array) überschreiben, da stateUpdate nicht das React-State kennt.
    if (gate.typeId === 'ROM256') {
      customStates[gate.id] = { ...customStates[gate.id], ...(gate.customState ?? {}) };
      continue;
    }
    // Alle anderen Gatter (Logik, Flip-Flops): Zustand vollständig vom Tick-Engine verwaltet
  }

  return { outputs, customStates, tick: buffer.tick };
}

// ── Wire-Map ──────────────────────────────────────────────────────────────────

export type WireMap = Map<string, { fromGateId: string; fromPortId: string }>;

/** Erstellt eine schnelle Lookup-Map: "gateId:portId" → Upstream-Quelle */
export function buildWireMap(circuit: Circuit): WireMap {
  const map: WireMap = new Map();
  for (const wire of Object.values(circuit.wires)) {
    map.set(`${wire.to.gateId}:${wire.to.portId}`, {
      fromGateId: wire.from.gateId,
      fromPortId: wire.from.portId,
    });
  }
  return map;
}

// ── Einzelner Tick ────────────────────────────────────────────────────────────

/**
 * Führt einen einzelnen Simulations-Tick durch (Double-Buffer Read/Write).
 *
 * ALLE Gatter lesen aus `buffer.outputs` (read-only im aktuellen Tick).
 * ALLE Gatter schreiben ihre neuen Werte in `nextOutputs` (write-only).
 * Kein Gatter kann seinen eigenen Output im gleichen Tick beeinflussen.
 * → Feedback-Schleifen sind strukturell sicher.
 */
export function runOneTick(
  circuit:       Circuit,
  buffer:        SimBuffer,
  wireMap:       WireMap,
  isClockPaused: boolean,
): SimBuffer {
  const nextOutputs:      Record<string, Record<string, SignalValue>> = {};
  const nextCustomStates: Record<string, Record<string, unknown>>     = {};

  for (const gate of Object.values(circuit.gates)) {
    let def;
    try { def = gateRegistry.get(gate.typeId); } catch { continue; }

    let cs: Record<string, unknown> = buffer.customStates[gate.id] ?? gate.customState ?? {};

    // CLOCK-Gatter: Pausezustand injizieren, damit stateUpdate nicht vorantreibt
    // wenn der Takt eingefroren ist (Settle-Phase oder explizite Pause).
    if (gate.typeId === 'CLOCK') {
      cs = { ...cs, _paused: isClockPaused };
    }

    // ── Phase 1: Eingänge aus AKTUELLEM Buffer lesen ──────────────────────
    const inputValues: Record<string, SignalValue> = {};
    for (const inputPort of def.inputs) {
      const upstream = wireMap.get(`${gate.id}:${inputPort.id}`);
      inputValues[inputPort.id] = upstream
        ? ((buffer.outputs[upstream.fromGateId]?.[upstream.fromPortId] ?? 0) as SignalValue)
        : (def.defaultInputValues?.[inputPort.id] ?? 0);
    }

    // ── Phase 2: Neue Ausgaben berechnen ──────────────────────────────────
    const outputValues = def.evaluate(inputValues, cs);
    nextOutputs[gate.id] = {};
    for (const [portId, val] of Object.entries(outputValues)) {
      nextOutputs[gate.id][portId] = val as SignalValue;
    }

    // Zustand für zustandsbehaftete Gatter (Flip-Flops, Register, Clock, etc.)
    nextCustomStates[gate.id] = def.stateUpdate
      ? def.stateUpdate(inputValues, outputValues as Record<string, SignalValue>, cs)
      : ({ ...cs } as Record<string, unknown>);
  }

  return {
    outputs:      nextOutputs,
    customStates: nextCustomStates,
    tick:         buffer.tick + 1,
  };
}

// ── Stabilitätsprüfung ────────────────────────────────────────────────────────

/**
 * Gibt true zurück, wenn sich zwischen zwei Ticks kein Ausgabewert geändert hat.
 * Für kombinatorische Schaltungen: Zeigt an, dass alle Signale propagiert sind.
 * Für Ringoszillatoren / Clock-Schaltungen: Gibt nie true zurück (erwünscht!).
 */
export function isStable(a: SimBuffer, b: SimBuffer): boolean {
  const aKeys = Object.keys(a.outputs);
  const bKeys = Object.keys(b.outputs);
  if (aKeys.length !== bKeys.length) return false;
  for (const [gateId, aPorts] of Object.entries(a.outputs)) {
    const bPorts = b.outputs[gateId];
    if (!bPorts) return false;
    const aPortKeys = Object.keys(aPorts);
    const bPortKeys = Object.keys(bPorts);
    if (aPortKeys.length !== bPortKeys.length) return false;
    for (const [portId, aVal] of Object.entries(aPorts)) {
      if (bPorts[portId] !== aVal) return false;
    }
  }
  return true;
}

/**
 * Führt Settle-Ticks durch (nur mit eingefrorenen CLOCKs) bis die Schaltung
 * stabil ist oder MAX_SETTLE_TICKS erreicht sind.
 * Wird nach Strukturänderungen und Benutzereingaben aufgerufen.
 */
export function runUntilStable(
  circuit: Circuit,
  buffer:  SimBuffer,
  wireMap: WireMap,
): { buffer: SimBuffer; changed: boolean } {
  let buf     = buffer;
  let changed = false;

  for (let i = 0; i < MAX_SETTLE_TICKS; i++) {
    // Clocks während der Settle-Phase einfrieren → rein kombinatorische Propagation
    const next = runOneTick(circuit, buf, wireMap, /* isClockPaused */ true);
    if (isStable(buf, next)) {
      buf     = next;
      changed = changed || i > 0;
      break;
    }
    buf     = next;
    changed = true;
  }

  return { buffer: buf, changed };
}

// ── SimulationResult aufbauen ─────────────────────────────────────────────────

/** Inline-Version von makeSignal, damit tickEngine.ts in sich geschlossen bleibt */
function makeSignal(value: SignalValue, prev: SignalState | undefined, nowMs: number): SignalState {
  const changed = !prev || prev.value !== value;
  return {
    value,
    version:       prev ? (changed ? prev.version + 1 : prev.version) : 0,
    lastChangedAt: changed ? nowMs : (prev?.lastChangedAt ?? nowMs),
  };
}

/**
 * Konvertiert einen SimBuffer in ein SimulationResult, das der Reducer
 * über SIMULATION_APPLY verarbeiten kann. Hält bestehende SignalState-Versionen
 * bei, um unnötige Re-Renders zu vermeiden.
 */
export function buildSimResult(buffer: SimBuffer, circuit: Circuit): SimulationResult {
  const now = Date.now();
  const gateSignals: Record<string, Record<string, SignalState>> = {};
  for (const [gateId, ports] of Object.entries(buffer.outputs)) {
    const gate = circuit.gates[gateId];
    if (!gate) continue;
    gateSignals[gateId] = {};
    for (const [portId, val] of Object.entries(ports)) {
      gateSignals[gateId][portId] = makeSignal(val, gate.outputSignals[portId], now);
    }
  }

  const wireSignals: Record<string, SignalState> = {};
  for (const wire of Object.values(circuit.wires)) {
    const val = (buffer.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as SignalValue;
    wireSignals[wire.id] = makeSignal(val, wire.signal, now);
  }

  return {
    gateSignals,
    wireSignals,
    // Alle Gate-Custom-States zurückschreiben (Flip-Flop Q, prevClk, etc.)
    customStateUpdates: buffer.customStates as Record<string, Record<string, unknown>>,
    cycles:          [],
    evaluationOrder: Object.keys(circuit.gates),
  };
}

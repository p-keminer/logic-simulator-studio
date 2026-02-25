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
  /** Ticks seit letztem Toggle pro CLOCK-Gatter */
  clockCounters: Record<string, number>;
  /** Monotoner Tick-Zähler */
  tick: number;
}

// ── Initialisierung ───────────────────────────────────────────────────────────

/**
 * Erstellt einen initialen SimBuffer aus dem aktuellen React-Circuit-State.
 * Seed-Werte kommen von `gate.outputSignals` und `gate.customState`.
 */
export function initBuffer(circuit: Circuit): SimBuffer {
  const outputs:       Record<string, Record<string, SignalValue>> = {};
  const customStates:  Record<string, Record<string, unknown>>     = {};
  const clockCounters: Record<string, number>                      = {};

  for (const gate of Object.values(circuit.gates)) {
    outputs[gate.id] = {};
    try {
      const def = gateRegistry.get(gate.typeId);
      for (const port of def.outputs) {
        outputs[gate.id][port.id] = (gate.outputSignals[port.id]?.value ?? 0) as SignalValue;
      }
    } catch { /* unbekannter Typ → leere Ausgabe */ }

    customStates[gate.id]  = { ...(gate.customState ?? {}) };
    if (gate.typeId === 'CLOCK') clockCounters[gate.id] = 0;
  }

  return { outputs, customStates, clockCounters, tick: 0 };
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
  const outputs       = { ...buffer.outputs };
  const customStates  = { ...buffer.customStates };
  const clockCounters = { ...buffer.clockCounters };
  const circuitIds    = new Set(Object.keys(circuit.gates));

  // Gelöschte Gatter aus Buffer entfernen
  for (const id of Object.keys(outputs)) {
    if (!circuitIds.has(id)) {
      delete outputs[id];
      delete customStates[id];
      delete clockCounters[id];
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
      customStates[gate.id]  = { ...(gate.customState ?? {}) };
      if (gate.typeId === 'CLOCK') clockCounters[gate.id] = 0;
      continue;
    }

    // Benutzergesteuerte Eingaben immer aus React-State synchronisieren
    if (
      gate.typeId === 'INPUT_SWITCH' ||
      gate.typeId === 'PUSH_BTN'     ||
      gate.typeId === 'CONST_HIGH'   ||
      gate.typeId === 'CONST_LOW'
    ) {
      customStates[gate.id] = { ...customStates[gate.id], ...(gate.customState ?? {}) };
      continue;
    }

    // CLOCK: Frequenz synchronisieren; Wert nur wenn Takt pausiert (manuelle Schritte)
    if (gate.typeId === 'CLOCK') {
      const freq = (gate.customState?.frequency as number) ?? 1;
      if (isClockPaused) {
        // Wenn pausiert, übernimmt der Buffer den via GATE_CLOCK_TICK gesetzten Wert
        customStates[gate.id] = {
          ...customStates[gate.id],
          value:     (gate.customState?.value as 0 | 1) ?? 0,
          frequency: freq,
        };
      } else {
        // Wenn laufend, verwaltet der Tick-Engine den Wert intern
        customStates[gate.id] = { ...customStates[gate.id], frequency: freq };
      }
    }
    // Alle anderen Gatter (Logik, Flip-Flops): Zustand vollständig vom Tick-Engine verwaltet
  }

  return { outputs, customStates, clockCounters, tick: buffer.tick };
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
  const nextClockCounters                                              = { ...buffer.clockCounters };

  for (const gate of Object.values(circuit.gates)) {
    let def;
    try { def = gateRegistry.get(gate.typeId); } catch { continue; }

    const cs = buffer.customStates[gate.id] ?? gate.customState ?? {};

    // ── Phase 1: Eingänge aus AKTUELLEM Buffer lesen ──────────────────────
    const inputValues: Record<string, SignalValue> = {};
    for (const inputPort of def.inputs) {
      const upstream = wireMap.get(`${gate.id}:${inputPort.id}`);
      inputValues[inputPort.id] = upstream
        ? ((buffer.outputs[upstream.fromGateId]?.[upstream.fromPortId] ?? 0) as SignalValue)
        : 0;
    }

    // ── Phase 2: Neue Ausgaben berechnen ──────────────────────────────────
    const outputValues = def.evaluate(inputValues, cs);
    nextOutputs[gate.id] = {};
    for (const [portId, val] of Object.entries(outputValues)) {
      nextOutputs[gate.id][portId] = val as SignalValue;
    }

    // Zustand für zustandsbehaftete Gatter (Flip-Flops, Register, etc.)
    nextCustomStates[gate.id] = def.stateUpdate
      ? def.stateUpdate(
          inputValues,
          outputValues as Record<string, SignalValue>,
          cs,
        )
      : ({ ...cs } as Record<string, unknown>);
  }

  // ── CLOCK-Zähler vorantreiben (nur wenn nicht pausiert) ───────────────────
  if (!isClockPaused) {
    for (const gate of Object.values(circuit.gates)) {
      if (gate.typeId !== 'CLOCK') continue;

      const freq           = Math.max(0.1, Math.min(100, (nextCustomStates[gate.id]?.frequency as number) ?? 1));
      const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));

      nextClockCounters[gate.id] = (buffer.clockCounters[gate.id] ?? 0) + 1;

      if (nextClockCounters[gate.id] >= toggleInterval) {
        const cur = (nextCustomStates[gate.id]?.value as 0 | 1) ?? 0;
        nextCustomStates[gate.id] = {
          ...nextCustomStates[gate.id],
          value: (cur ^ 1) as 0 | 1,
        };
        nextClockCounters[gate.id] = 0;
      }
    }
  }

  return {
    outputs:       nextOutputs,
    customStates:  nextCustomStates,
    clockCounters: nextClockCounters,
    tick:          buffer.tick + 1,
  };
}

// ── Stabilitätsprüfung ────────────────────────────────────────────────────────

/**
 * Gibt true zurück, wenn sich zwischen zwei Ticks kein Ausgabewert geändert hat.
 * Für kombinatorische Schaltungen: Zeigt an, dass alle Signale propagiert sind.
 * Für Ringoszillatoren / Clock-Schaltungen: Gibt nie true zurück (erwünscht!).
 */
export function isStable(a: SimBuffer, b: SimBuffer): boolean {
  for (const [gateId, aPorts] of Object.entries(a.outputs)) {
    const bPorts = b.outputs[gateId];
    if (!bPorts) return false;
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
function makeSignal(value: SignalValue, prev?: SignalState): SignalState {
  const changed = !prev || prev.value !== value;
  return {
    value,
    version:       prev ? (changed ? prev.version + 1 : prev.version) : 0,
    lastChangedAt: changed ? Date.now() : (prev?.lastChangedAt ?? Date.now()),
  };
}

/**
 * Konvertiert einen SimBuffer in ein SimulationResult, das der Reducer
 * über SIMULATION_APPLY verarbeiten kann. Hält bestehende SignalState-Versionen
 * bei, um unnötige Re-Renders zu vermeiden.
 */
export function buildSimResult(buffer: SimBuffer, circuit: Circuit): SimulationResult {
  const gateSignals: Record<string, Record<string, SignalState>> = {};
  for (const [gateId, ports] of Object.entries(buffer.outputs)) {
    const gate = circuit.gates[gateId];
    if (!gate) continue;
    gateSignals[gateId] = {};
    for (const [portId, val] of Object.entries(ports)) {
      gateSignals[gateId][portId] = makeSignal(val, gate.outputSignals[portId]);
    }
  }

  const wireSignals: Record<string, SignalState> = {};
  for (const wire of Object.values(circuit.wires)) {
    const val = (buffer.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as SignalValue;
    wireSignals[wire.id] = makeSignal(val, wire.signal);
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

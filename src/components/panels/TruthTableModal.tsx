import React, { useMemo } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { runSimulation } from '../../core/simulation/engine';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { topologicalSort } from '../../core/simulation/topologicalSort';
import {
  initBuffer, buildWireMap, runOneTick,
} from '../../core/simulation/tickEngine';
import { resolveWiredValues } from '../../core/simulation/signal';
import type { Circuit, GateInstance, SignalValue } from '../../core/types';

// ── Gattertyp-Kategorien ─────────────────────────────────────────────────────

/** Gatter die als variable Eingabe durchgezählt werden */
const INPUT_TYPES  = new Set(['INPUT_SWITCH', 'PUSH_BTN', 'CLOCK']);

/** Gatter deren Ausgabe als Ergebnis-Spalte angezeigt wird */
const OUTPUT_TYPES = new Set(['OUTPUT_LED']);

/**
 * Gatter die weder als Zwischenstufe noch als Ein-/Ausgang angezeigt werden.
 */
const SKIP_TYPES = new Set([
  'CONST_HIGH', 'CONST_LOW', 'ADC8', 'TEXT_NOTE', 'JUNCTION',
]);

// ── Typen ────────────────────────────────────────────────────────────────────

interface IntermediateCol { gateId: string; portId: string; header: string; }
interface StateVar        { gateId: string; portId: string; stateKey: string; label: string; }

/**
 * Metadata present when the STT was computed in "reduced" mode because
 * totalVars > 8.  The table uses only control inputs and 1 representative
 * state bit; all data inputs and the remaining state bits were fixed at 0.
 */
interface ReducedMeta {
  /** Labels of the data-input gates whose value was held at 0 */
  fixedDataLabels: string[];
  /** Total number of state bits in the circuit (only 1 is enumerated) */
  totalStateBits: number;
  /** Number of control inputs that were actually enumerated */
  controlCount: number;
  /** True if some control inputs were also capped (> 7) */
  cappedControls: boolean;
}

interface TruthTableResult {
  mode:            'truth-table';
  inputs:          GateInstance[];
  outputs:         GateInstance[];
  tooMany:         boolean;
  table:           Array<{ ins: number[]; mids: number[]; outs: number[] }> | null;
  intermediateCols: IntermediateCol[];
}

interface StateTransitionResult {
  mode:        'state-transition';
  inputs:      GateInstance[];
  stateVars:   StateVar[];
  outputGates: GateInstance[];
  rows:        Array<{
    inputBits:  number[];
    stateBits:  number[];
    nextState:  number[];
    outputBits: number[];
  }>;
  tooMany: boolean;
  /** Present when the analysis was reduced to fit within the row limit. */
  reducedMeta?: ReducedMeta;
}

type Computed = TruthTableResult | StateTransitionResult;
type ColKind  = 'in' | 'state' | 'next' | 'out' | 'mid';

interface Props { onClose: () => void; }

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function gateLabel(g: GateInstance): string {
  return g.label || g.typeId.replace(/_/g, '') + '_' + g.id.slice(0, 4);
}

/**
 * Returns true if the port ID on the *downstream* gate looks like a "data"
 * pin (D0–D31 or DS) rather than a control pin.
 */
function isDataPortId(portId: string): boolean {
  return /^d\d+$|^ds$/i.test(portId);
}

/**
 * Separates a list of input gates into "control" vs "data" based on what
 * port(s) each gate drives downstream.  A gate is classified as "data" when
 * every one of its downstream connections targets a data port.
 */
function classifyInputs(
  inputGates: GateInstance[],
  circuit: Circuit,
): { controls: GateInstance[]; data: GateInstance[] } {
  const controls: GateInstance[] = [];
  const data: GateInstance[]     = [];
  for (const g of inputGates) {
    const outWires = Object.values(circuit.wires).filter(w => w.from.gateId === g.id);
    const allData  = outWires.length > 0 && outWires.every(w => isDataPortId(w.to.portId));
    (allData ? data : controls).push(g);
  }
  return { controls, data };
}

// ── Komponente ────────────────────────────────────────────────────────────────

export function TruthTableModal({ onClose }: Props) {
  const { circuit } = useCircuitContext();

  // ── Hauptberechnung ────────────────────────────────────────────────────────
  const computed = useMemo((): Computed => {
    const allGates = Object.values(circuit.gates);

    // Verbundene Gate-IDs (haben mindestens einen Draht)
    const connectedIds = new Set<string>();
    for (const w of Object.values(circuit.wires)) {
      connectedIds.add(w.from.gateId);
      connectedIds.add(w.to.gateId);
    }

    // Zyklenerkennung via Topologischer Sortierung
    const { order: evalOrder, cycles } = topologicalSort(circuit);
    const hasCycles = cycles.length > 0;

    // Erkennung sequenzieller Gatter (Flip-Flops, Latches) auch ohne Draht-Zyklen.
    // isSynchronous-Gatter (D-FF, JK-FF …) und Gatter mit stateUpdate (SR-Latch, D-Latch)
    // führen intern Zustand → Mode 2 (Zustandsübergangstabelle) nötig.
    //
    // Autonome Quellen (CLOCK, INPUT_SWITCH, PUSH_BTN, CONST, ADC) und reine
    // Ausgabe-Gatter (OUTPUT_LED) werden explizit ausgeschlossen: Sie haben
    // zwar stateUpdate (z. B. CLOCK-Tick-Zähler) oder isSynchronous (STEPPER),
    // sind aber keine Zustands-Elemente der kombinatorischen Logik.
    const hasSynchronous = allGates.some(g => {
      if (!connectedIds.has(g.id)) return false;
      if (INPUT_TYPES.has(g.typeId))  return false; // CLOCK, INPUT_SWITCH, PUSH_BTN
      if (OUTPUT_TYPES.has(g.typeId)) return false; // OUTPUT_LED
      if (SKIP_TYPES.has(g.typeId))   return false; // CONST_HIGH/LOW, ADC8, ...
      try {
        const def = gateRegistry.get(g.typeId);
        return !!def.isSynchronous || typeof def.stateUpdate === 'function';
      } catch { return false; }
    });

    // ════════════════════════════════════════════════════════════════════════
    // MODUS 1: Klassische Wahrheitstabelle (rein kombinatorische Schaltung)
    // ════════════════════════════════════════════════════════════════════════
    if (!hasCycles && !hasSynchronous) {
      const inputs = allGates
        .filter(g => INPUT_TYPES.has(g.typeId))
        .sort((a, b) => a.x - b.x);

      const outputs = allGates
        .filter(g => OUTPUT_TYPES.has(g.typeId))
        .sort((a, b) => a.x - b.x);

      const tooMany = inputs.length > 12;

      if (inputs.length === 0 || outputs.length === 0 || tooMany) {
        return { mode: 'truth-table', inputs, outputs, tooMany, table: null, intermediateCols: [] };
      }

      // Zwischengatter identifizieren
      const interMap = new Map<string, GateInstance>();
      for (const g of allGates) {
        if (
          !INPUT_TYPES.has(g.typeId)  &&
          !OUTPUT_TYPES.has(g.typeId) &&
          !SKIP_TYPES.has(g.typeId)   &&
          connectedIds.has(g.id)      &&
          gateRegistry.has(g.typeId)
        ) {
          interMap.set(g.id, g);
        }
      }

      // In topologischer Reihenfolge sortieren
      const evalOrderSet = new Set(evalOrder);
      const sortedInter: GateInstance[] = [];
      for (const id of evalOrder)     { if (interMap.has(id)) sortedInter.push(interMap.get(id)!); }
      for (const [id, g] of interMap) { if (!evalOrderSet.has(id)) sortedInter.push(g); }

      const intermediateCols: IntermediateCol[] = [];
      for (const g of sortedInter) {
        let def; try { def = gateRegistry.get(g.typeId); } catch { continue; }
        if (!def || def.outputs.length === 0) continue;
        const lbl = gateLabel(g);
        for (const p of def.outputs) {
          intermediateCols.push({
            gateId: g.id,
            portId: p.id,
            header: def.outputs.length === 1 ? lbl : `${lbl}.${p.label ?? p.id}`,
          });
        }
      }

      // Wahrheitstabelle generieren
      const table: Array<{ ins: number[]; mids: number[]; outs: number[] }> = [];
      for (let mask = 0; mask < (1 << inputs.length); mask++) {
        const copy: Circuit = {
          ...circuit,
          gates: Object.fromEntries(
            Object.entries(circuit.gates).map(([id, g]) => {
              const idx = inputs.findIndex(sw => sw.id === id);
              if (idx < 0) return [id, g];
              const val = (mask >> (inputs.length - 1 - idx)) & 1;
              return [id, { ...g, customState: { ...g.customState, value: val as 0 | 1 } }];
            })
          ),
        };

        const result = runSimulation(copy);
        const mids = intermediateCols.map(col =>
          result.gateSignals[col.gateId]?.[col.portId]?.value ?? 0
        );
        const outs = outputs.map(led => {
          const wire = Object.values(copy.wires).find(
            w => w.to.gateId === led.id && w.to.portId === 'in'
          );
          if (!wire) return 0;
          return result.gateSignals[wire.from.gateId]?.[wire.from.portId]?.value ?? 0;
        });
        table.push({
          ins:  inputs.map((_, i) => (mask >> (inputs.length - 1 - i)) & 1),
          mids,
          outs,
        });
      }

      return { mode: 'truth-table', inputs, outputs, tooMany, table, intermediateCols };
    }

    // ════════════════════════════════════════════════════════════════════════
    // MODUS 2: Zustandsübergangstabelle (sequenzielle / rückkoppelnde Schaltung)
    // ════════════════════════════════════════════════════════════════════════

    // Zustandsgatter = Gatter in Draht-Zyklen (Feedback) ODER synchrone
    // FF/Register ODER Gatter mit stateUpdate (z.B. SR-Latch, D-Latch).
    const feedbackGateIds = new Set(cycles.flat());
    for (const g of allGates) {
      if (!connectedIds.has(g.id)) continue;
      try {
        const def = gateRegistry.get(g.typeId);
        if (def.isSynchronous || def.stateUpdate) feedbackGateIds.add(g.id);
      }
      catch { /* unbekannter Typ */ }
    }

    // Zustandsvariablen = Ausgangsports der Zustandsgatter, x-sortiert
    const stateVars: StateVar[] = [];
    const feedbackGatesSorted = [...feedbackGateIds]
      .map(id => circuit.gates[id])
      .filter(Boolean)
      .filter(g => connectedIds.has(g.id))
      .sort((a, b) => a.x - b.x);

    for (const gate of feedbackGatesSorted) {
      let def; try { def = gateRegistry.get(gate.typeId); } catch { continue; }
      const lbl = gateLabel(gate);
      if (def.isSynchronous || def.stateKeys) {
        // Gatter mit expliziten stateKeys oder isSynchronous:
        // stateKeys bestimmt, welche customState-Schlüssel den
        // sichtbaren Zustand tragen. Default ['q'] für einfache D/JK/T/SR-FFs.
        const keys = def.stateKeys ?? ['q'];
        for (const key of keys) {
          stateVars.push({
            gateId:   gate.id,
            portId:   key,
            stateKey: key,
            label:    keys.length === 1 ? lbl : `${lbl}.${key}`,
          });
        }
      } else {
        // Feedback-Gates ohne stateKeys (kombinatorisch): alle Ausgänge nehmen.
        for (const p of def.outputs) {
          stateVars.push({
            gateId:   gate.id,
            portId:   p.id,
            stateKey: p.id,
            label:    def.outputs.length === 1 ? lbl : `${lbl}.${p.label ?? p.id}`,
          });
        }
      }
    }

    // ── Label-Deduplizierung ────────────────────────────────────────────────────
    // Falls mehrere Feedback-Gatter den gleichen auto-generierten Namen haben
    // (z.B. zwei unbeschriftete NOT-Gatter → "NOT_xxxx"), Index anhängen.
    {
      const labelCount = new Map<string, number>();
      for (const sv of stateVars) labelCount.set(sv.label, (labelCount.get(sv.label) ?? 0) + 1);
      const labelIdx = new Map<string, number>();
      for (const sv of stateVars) {
        if ((labelCount.get(sv.label) ?? 1) > 1) {
          const n = (labelIdx.get(sv.label) ?? 0) + 1;
          labelIdx.set(sv.label, n);
          sv.label = `${sv.label}_${n}`;
        }
      }
    }

    // Externe Eingänge (keine Feedback-Gates, verbunden)
    const inputs = allGates
      .filter(g => INPUT_TYPES.has(g.typeId) && connectedIds.has(g.id))
      .sort((a, b) => a.x - b.x);

    // Externe Ausgänge
    const outputGates = allGates
      .filter(g => OUTPUT_TYPES.has(g.typeId) && connectedIds.has(g.id))
      .sort((a, b) => a.x - b.x);

    const totalVars = inputs.length + stateVars.length;

    // Keine Zustandsvariablen → kein valides STT-Modell
    if (stateVars.length === 0) {
      return { mode: 'state-transition', inputs, stateVars, outputGates, rows: [], tooMany: false };
    }

    // ── Reduzierte Analyse für breite Schaltungen (totalVars > 8) ────────────
    //
    // Strategie: Eingänge in "Steuer-Pins" (CLK, /CLR, LE, OE, …) und
    // "Daten-Pins" (D0-D7, DS) trennen.  Nur Steuerpins × ein repräsentatives
    // Zustandsbit werden enumerated.  Datenpins werden auf 0 fixiert, alle
    // übrigen Zustandsbits auf 0 fixiert.  Damit bleibt die Tabelle ≤ 256 Zeilen
    // und zeigt das wesentliche Steuerverhalten des IC.
    let activeInputs  = inputs;
    let activeStateVars = stateVars;
    let dataInputsToZero: GateInstance[] = [];
    let nonRepStateBits: StateVar[] = [];
    let reducedMeta: StateTransitionResult['reducedMeta'];

    if (totalVars > 8) {
      const { controls, data } = classifyInputs(inputs, circuit);
      // Reserve 1 slot for the representative state bit → max 7 control inputs
      const MAX_CTRL    = 7;
      const cappedCtrls = controls.length > MAX_CTRL;
      activeInputs       = cappedCtrls ? controls.slice(0, MAX_CTRL) : controls;
      activeStateVars    = [stateVars[0]];   // one representative bit
      dataInputsToZero   = data;
      nonRepStateBits    = stateVars.slice(1);
      reducedMeta = {
        fixedDataLabels: data.map(g => gateLabel(g)),
        totalStateBits:  stateVars.length,
        controlCount:    activeInputs.length,
        cappedControls:  cappedCtrls,
      };
      // Sanity: if we still can't fit (shouldn't happen), fall back to tooMany
      if (activeInputs.length + 1 > 8) {
        return { mode: 'state-transition', inputs, stateVars, outputGates, rows: [], tooMany: true };
      }
    }

    const activeTotalVars = activeInputs.length + activeStateVars.length;

    // Wire-Map für Single-Tick-Simulation (einmal berechnen)
    const wireMap = buildWireMap(circuit);

    // Alle Kombinationen von (aktive Eingänge × aktiver Zustand) enumerated
    const rows: StateTransitionResult['rows'] = [];

    for (let combo = 0; combo < (1 << activeTotalVars); combo++) {
      // Bit-Layout: [input0 ... inputN-1 | state0 ... stateM-1], MSB links
      const inputBits = activeInputs.map(
        (_, i) => (combo >> (activeTotalVars - 1 - i)) & 1
      );
      const stateBits = activeStateVars.map(
        (_, s) => (combo >> (activeStateVars.length - 1 - s)) & 1
      );

      // Buffer aus aktuellem Circuit-Zustand initialisieren
      const buf = initBuffer(circuit);

      // ── Aktive Steuer-Eingänge erzwingen ─────────────────────────────────
      for (let i = 0; i < activeInputs.length; i++) {
        const g   = activeInputs[i];
        const val = inputBits[i] as SignalValue;
        buf.customStates[g.id] = { ...(buf.customStates[g.id] ?? {}), value: val };
        if (!buf.outputs[g.id]) buf.outputs[g.id] = {};
        try {
          for (const port of gateRegistry.get(g.typeId).outputs) {
            buf.outputs[g.id][port.id] = val;
          }
        } catch {
          buf.outputs[g.id]['out'] = val; // Fallback
        }
      }

      // ── Datenpins fest 0 (reduzierte Analyse) ────────────────────────────
      for (const g of dataInputsToZero) {
        buf.customStates[g.id] = { ...(buf.customStates[g.id] ?? {}), value: 0 };
        if (!buf.outputs[g.id]) buf.outputs[g.id] = {};
        try {
          for (const port of gateRegistry.get(g.typeId).outputs) {
            buf.outputs[g.id][port.id] = 0 as SignalValue;
          }
        } catch {
          buf.outputs[g.id]['out'] = 0 as SignalValue;
        }
      }

      // ── Nicht-repräsentative Zustandsbits auf 0 fixieren ─────────────────
      for (const sv of nonRepStateBits) {
        let hiddenInit: Record<string, unknown> = {};
        try {
          const svDef = gateRegistry.get(circuit.gates[sv.gateId].typeId);
          if (svDef.stateInit) {
            // Pick only hidden state keys from stateInit
            for (const hk of svDef.hiddenStateKeys ?? []) {
              if (hk in svDef.stateInit) hiddenInit[hk] = svDef.stateInit[hk];
            }
          } else {
            hiddenInit = { prevClk: 0 }; // legacy fallback
          }
        } catch { hiddenInit = { prevClk: 0 }; }
        buf.customStates[sv.gateId] = {
          ...(buf.customStates[sv.gateId] ?? {}),
          [sv.stateKey]: 0,
          ...hiddenInit,
        };
      }

      // ── Aktive Zustandsvariablen erzwingen ────────────────────────────────
      // 1) buf.customStates: damit das Gatter in evaluate() / stateUpdate()
      //    den korrekten aktuellen Zustand kennt (nicht den aus der echten Schaltung)
      // 2) Hidden state (z.B. prevClk) wird aus stateInit initialisiert,
      //    damit clock=1 immer eine steigende Flanke auslöst.
      for (let s = 0; s < activeStateVars.length; s++) {
        const sv  = activeStateVars[s];
        const val = stateBits[s] as SignalValue;
        let hiddenInit: Record<string, unknown> = {};
        try {
          const svDef = gateRegistry.get(circuit.gates[sv.gateId].typeId);
          if (svDef.stateInit) {
            for (const hk of svDef.hiddenStateKeys ?? []) {
              if (hk in svDef.stateInit) hiddenInit[hk] = svDef.stateInit[hk];
            }
          } else {
            hiddenInit = { prevClk: 0 }; // legacy fallback
          }
        } catch { hiddenInit = { prevClk: 0 }; }
        buf.customStates[sv.gateId] = {
          ...(buf.customStates[sv.gateId] ?? {}),
          [sv.stateKey]: val,
          ...hiddenInit,
        };
      }

      // Ausgabe-Ports aus dem erzwungenen customState via evaluate() berechnen,
      // damit downstream-Gates den vorgegebenen Zustand lesen.
      // Echte Input-Werte (z.B. OE) werden aus dem Buffer via WireMap gelesen.
      // NOTE: we use stateVars (full list) here to ensure all state-gate outputs
      // are initialised, even if their state is fixed at 0 in reducedMeta mode.
      const forcedGateIds = new Set(stateVars.map(sv => sv.gateId));
      for (const gateId of forcedGateIds) {
        try {
          const def = gateRegistry.get(circuit.gates[gateId].typeId);
          const gateInputs: Record<string, SignalValue> = {};
          for (const inp of def.inputs) {
            const upstream = wireMap.get(`${gateId}:${inp.id}`) ?? [];
            gateInputs[inp.id] = upstream.length > 0
              ? resolveWiredValues(
                upstream.map((src) => ((buf.outputs[src.fromGateId]?.[src.fromPortId] ?? 0) as SignalValue)),
              )
              : (def.defaultInputValues?.[inp.id] ?? 0);
          }
          const evalOutputs = def.evaluate(
            gateInputs,
            buf.customStates[gateId] as Record<string, unknown>,
          );
          if (!buf.outputs[gateId]) buf.outputs[gateId] = {};
          for (const [pid, v] of Object.entries(evalOutputs)) {
            buf.outputs[gateId][pid] = v as SignalValue;
          }
        } catch { /* unbekannter Typ */ }
      }

      // Alle anderen synchronen Gatter (nicht State-Variable) ebenfalls auf prevClk=0
      // setzen, damit keine Phantom-Flanken aus dem echten Schaltungszustand entstehen.
      for (const gate of allGates) {
        if (feedbackGateIds.has(gate.id)) continue; // bereits oben behandelt
        try {
          if (gateRegistry.get(gate.typeId).isSynchronous) {
            buf.customStates[gate.id] = { ...(buf.customStates[gate.id] ?? {}), prevClk: 0 };
          }
        } catch { /* unbekannter Typ */ }
      }

      // ── Exakt EIN Simulations-Tick (Read-Buffer → Logik → Write-Buffer) ─────
      // KEIN Settle/while-Loop! Die STT zeigt den Zustand nach genau einem
      // Propagations-Schritt. Das ist die mathematisch korrekte Definition von
      // Q(t+1): was die Gatter im nächsten Takt aus Q(t) und den Eingängen machen.
      // Clocks werden eingefroren (isClockPaused = true) → nur kombinatorische Logik.
      const nextBuf = runOneTick(circuit, buf, wireMap, /* isClockPaused */ true);

      // ── Synchrone Outputs nachziehen ──────────────────────────────────────
      // runOneTick berechnet outputs via evaluate(oldState) → Q(t).
      // stateUpdate berechnet Q(t+1) → nextBuf.customStates.
      // Damit nachgelagerte LEDs den korrekten Q(t+1) sehen, müssen wir
      // evaluate() für synchrone Gatter mit dem neuen customState wiederholen.
      // Dabei werden die echten Input-Werte (z.B. OE) aus dem Wire-Map gelesen,
      // damit tri-state Outputs korrekt Z liefern wenn OE inaktiv ist.
      for (const gate of allGates) {
        let def; try { def = gateRegistry.get(gate.typeId); } catch { continue; }
        if (!def.isSynchronous) continue;
        const newCs = nextBuf.customStates[gate.id];
        if (!newCs) continue;
        // Re-read actual input values from post-tick buffer via wireMap
        const reInputs: Record<string, SignalValue> = {};
        for (const inp of def.inputs) {
          const upstream = wireMap.get(`${gate.id}:${inp.id}`) ?? [];
          reInputs[inp.id] = upstream.length > 0
            ? resolveWiredValues(
              upstream.map((src) => ((nextBuf.outputs[src.fromGateId]?.[src.fromPortId] ?? 0) as SignalValue)),
            )
            : (def.defaultInputValues?.[inp.id] ?? 0);
        }
        const reEval = def.evaluate(
          reInputs,
          newCs as Record<string, unknown>,
        );
        if (!nextBuf.outputs[gate.id]) nextBuf.outputs[gate.id] = {};
        for (const [pid, v] of Object.entries(reEval)) {
          nextBuf.outputs[gate.id][pid] = v as SignalValue;
        }
      }

      // Nächster Zustand Q(t+1) bestimmen (only for active/enumerated state vars):
      const nextState = activeStateVars.map(sv => {
        try {
          const gType = circuit.gates[sv.gateId]?.typeId ?? '';
          if (gateRegistry.get(gType).isSynchronous) {
            return (nextBuf.customStates[sv.gateId]?.[sv.stateKey] ?? 0) as number;
          }
        } catch { /* unbekannter Typ → Fallback */ }
        return (nextBuf.outputs[sv.gateId]?.[sv.portId] ?? 0) as number;
      });

      // Externe LED-Ausgänge — outputs bereits mit neuem Zustand aktualisiert
      const outputBits = outputGates.map(led => {
        const wire = Object.values(circuit.wires).find(w => w.to.gateId === led.id);
        if (!wire) return 0;
        return (nextBuf.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as number;
      });

      rows.push({ inputBits, stateBits, nextState, outputBits });
    }

    return {
      mode: 'state-transition',
      inputs:      activeInputs,
      stateVars:   activeStateVars,
      outputGates,
      rows,
      tooMany:     false,
      reducedMeta,
    };

  }, [circuit]);

  // ── Style-Funktionen ──────────────────────────────────────────────────────────

  const kindColor = (kind: ColKind): string =>
    kind === 'in'    ? '#60a5fa'   // Blau   – externe Eingänge
    : kind === 'state' ? '#f59e0b' // Amber  – aktueller Zustand Q(t)
    : kind === 'next'  ? '#a78bfa' // Lila   – nächster Zustand Q(t+1)
    : kind === 'mid'   ? '#a78bfa' // Lila   – Zwischenwerte
    : '#22c55e';                   // Grün   – Ausgänge

  const thStyle = (kind: ColKind): React.CSSProperties => ({
    padding: '4px 10px',
    borderBottom: '1px solid #334155',
    color: kindColor(kind),
    whiteSpace: 'nowrap' as const,
    fontSize: 12,
    fontWeight: 600,
  });

  const sectionTh = (kind: ColKind): React.CSSProperties => ({
    padding: '3px 8px',
    borderBottom: '1px solid #475569',
    color: kindColor(kind),
    textAlign: 'center' as const,
    fontSize: 9,
    fontWeight: 400,
    letterSpacing: '0.1em',
    opacity: 0.85,
  });

  const tdStyle = (v: number, kind: ColKind): React.CSSProperties => ({
    padding: '3px 12px',
    textAlign: 'center' as const,
    color:      v === 2 ? '#f59e0b' : v === 0 ? '#475569' : kindColor(kind),
    fontWeight: v && kind !== 'in' ? 700 : 400,
  });

  /** Display a signal value: 0, 1, 'Z' for high-impedance, 'X' for unknown */
  const displayVal = (v: number) => v === 3 ? 'X' : v === 2 ? 'Z' : v;

  const sepTh: React.CSSProperties = {
    padding: '4px 4px', borderBottom: '1px solid #334155', color: '#334155',
  };
  const sepTd: React.CSSProperties = { padding: '3px 4px', color: '#334155' };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24, maxWidth: '95vw', maxHeight: '82vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Kopfzeile ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 16, fontFamily: 'monospace' }}>
              {computed.mode === 'state-transition'
                ? 'Zustandsübergangstabelle'
                : 'Wahrheitstabelle'}
            </h2>
            {computed.mode === 'state-transition' && (
              <p style={{ margin: '4px 0 0', color: '#f59e0b', fontSize: 11, fontFamily: 'monospace' }}>
                ⟳ Sequenzielle Logik erkannt (Flip-Flops / Rückkopplung) – Zustandsanalyse
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
          >×</button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODUS 1: Klassische Wahrheitstabelle                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {computed.mode === 'truth-table' && (() => {
          const { inputs, outputs, tooMany, table, intermediateCols } = computed;
          return (
            <>
              {inputs.length === 0 && (
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Keine Eingänge (INPUT_SWITCH / PUSH_BTN / CLOCK) gefunden.
                </p>
              )}
              {outputs.length === 0 && (
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Keine Ausgänge (OUTPUT_LED) gefunden.
                </p>
              )}
              {tooMany && (
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Zu viele Eingänge (&gt;12).
                </p>
              )}
              {table && intermediateCols.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11, fontFamily: 'monospace' }}>
                  <span style={{ color: '#60a5fa' }}>■ Eingänge</span>
                  <span style={{ color: '#a78bfa' }}>■ Zwischenwerte</span>
                  <span style={{ color: '#22c55e' }}>■ Ausgänge</span>
                </div>
              )}
              {table && (
                <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>
                  <thead>
                    <tr>
                      {inputs.map(g => (
                        <th key={g.id} style={thStyle('in')}>{gateLabel(g)}</th>
                      ))}
                      {intermediateCols.length > 0 && <th style={sepTh}>│</th>}
                      {intermediateCols.map((col, i) => (
                        <th key={i} style={thStyle('mid')}>{col.header}</th>
                      ))}
                      <th style={sepTh}>│</th>
                      {outputs.map(g => (
                        <th key={g.id} style={thStyle('out')}>{gateLabel(g)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)' }}>
                        {row.ins.map((v, i)  => <td key={i} style={tdStyle(v, 'in')} >{v}</td>)}
                        {intermediateCols.length > 0 && <td style={sepTd}>│</td>}
                        {row.mids.map((v, i) => <td key={i} style={tdStyle(v, 'mid')}>{displayVal(v)}</td>)}
                        <td style={sepTd}>│</td>
                        {row.outs.map((v, i) => <td key={i} style={tdStyle(v, 'out')}>{displayVal(v)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODUS 2: Zustandsübergangstabelle                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {computed.mode === 'state-transition' && (() => {
          const { inputs, stateVars, outputGates, rows, tooMany, reducedMeta } = computed;

          if (stateVars.length === 0) {
            return (
              <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                Keine Zustandsvariablen identifizierbar (keine isSynchronous-Gatter / Feedback-Knoten verbunden).
              </p>
            );
          }

          if (tooMany) {
            return (
              <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                Zu viele Steuer-Eingänge für reduzierte Analyse (&gt;7). Schaltung zu komplex für tabellarische Darstellung.
              </p>
            );
          }

          const hasInputs  = inputs.length > 0;
          const hasOutputs = outputGates.length > 0;

          return (
            <>
              {/* ── Reduzierte-Analyse-Banner ────────────────────────────── */}
              {reducedMeta && (
                <div style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  background: '#18181b',
                  border: '1px solid #92400e',
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 11,
                }}>
                  <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 4 }}>
                    ⚠ Reduzierte Steuerlogik-Analyse
                  </div>
                  <div style={{ color: '#94a3b8', lineHeight: 1.7 }}>
                    <div>
                      Zeigt Zustandsbit <span style={{ color: '#f59e0b' }}>{stateVars[0].label}</span>
                      {' '}stellvertretend für alle{' '}
                      <span style={{ color: '#f59e0b' }}>{reducedMeta.totalStateBits}</span> Zustandsbits
                      {reducedMeta.totalStateBits > 1 && ' (übrige Bits: 0)'}
                    </div>
                    {reducedMeta.fixedDataLabels.length > 0 && (
                      <div>
                        Dateneingänge fest 0:{' '}
                        <span style={{ color: '#64748b' }}>
                          {reducedMeta.fixedDataLabels.join(', ')}
                        </span>
                      </div>
                    )}
                    {reducedMeta.cappedControls && (
                      <div style={{ color: '#f87171' }}>
                        Steuer-Eingänge auf {reducedMeta.controlCount} begrenzt (überschüssige weggelassen)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legende */}
              <div style={{ marginBottom: 12, fontSize: 11, fontFamily: 'monospace', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {hasInputs  && <span style={{ color: '#60a5fa' }}>■ Steuer-Eingänge</span>}
                <span style={{ color: '#f59e0b' }}>■ Aktueller Zustand Q(t)</span>
                <span style={{ color: '#a78bfa' }}>■ Nächster Zustand Q(t+1)</span>
                {hasOutputs && <span style={{ color: '#22c55e' }}>■ Ausgänge</span>}
              </div>

              <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>
                <thead>
                  {/* Sektions-Zeile (Gruppen-Beschriftung) */}
                  <tr>
                    {hasInputs && (
                      <th colSpan={inputs.length} style={sectionTh('in')}>STEUER-EINGÄNGE</th>
                    )}
                    {hasInputs && <th style={{ ...sectionTh('in'), color: '#334155', padding: '3px 4px' }}></th>}
                    <th colSpan={stateVars.length} style={sectionTh('state')}>ZUSTAND Q(t)</th>
                    <th style={{ ...sectionTh('state'), color: '#334155', padding: '3px 4px' }}></th>
                    <th colSpan={stateVars.length} style={sectionTh('next')}>NÄCHSTER ZUSTAND Q(t+1)</th>
                    {hasOutputs && (
                      <>
                        <th style={{ ...sectionTh('out'), color: '#334155', padding: '3px 4px' }}></th>
                        <th colSpan={outputGates.length} style={sectionTh('out')}>AUSGÄNGE</th>
                      </>
                    )}
                  </tr>

                  {/* Spalten-Label-Zeile */}
                  <tr>
                    {inputs.map(g => (
                      <th key={g.id} style={thStyle('in')}>{gateLabel(g)}</th>
                    ))}
                    {hasInputs && <th style={sepTh}>│</th>}
                    {stateVars.map((sv, i) => (
                      <th key={i} style={thStyle('state')}>{sv.label}</th>
                    ))}
                    <th style={sepTh}>│</th>
                    {stateVars.map((sv, i) => (
                      <th key={i} style={thStyle('next')}>{sv.label}′</th>
                    ))}
                    {hasOutputs && <th style={sepTh}>│</th>}
                    {hasOutputs && outputGates.map(g => (
                      <th key={g.id} style={thStyle('out')}>{gateLabel(g)}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, ri) => {
                    // Stabiler Zustand: Q(t) = Q(t+1) für alle Zustandsbits
                    const isStableState = row.stateBits.every((v, i) => v === row.nextState[i]);
                    return (
                      <tr
                        key={ri}
                        style={{
                          background: isStableState
                            ? 'rgba(245,158,11,0.07)'      // Amber-Tint = stabiler Zustand
                            : ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                        }}
                      >
                        {row.inputBits.map( (v, i) => <td key={i} style={tdStyle(v, 'in')   }>{v}</td>)}
                        {hasInputs && <td style={sepTd}>│</td>}
                        {row.stateBits.map( (v, i) => <td key={i} style={tdStyle(v, 'state')}>{v}</td>)}
                        <td style={sepTd}>│</td>
                        {row.nextState.map( (v, i) => <td key={i} style={tdStyle(v, 'next') }>{displayVal(v)}</td>)}
                        {hasOutputs && <td style={sepTd}>│</td>}
                        {row.outputBits.map((v, i) => <td key={i} style={tdStyle(v, 'out')  }>{displayVal(v)}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Fußzeile */}
              <p style={{ marginTop: 10, fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                ′ = Zustand nach einem Simulationsschritt (Settle-Phase)
                &nbsp;|&nbsp;
                <span style={{ color: '#f59e0b' }}>■</span> = Stabiler Zustand Q(t) = Q(t+1)
                {reducedMeta && (
                  <span style={{ color: '#78716c' }}>
                    &nbsp;|&nbsp; Reduzierte Ansicht – vollständige Analyse bei {reducedMeta.totalStateBits * Math.pow(2, inputs.length + reducedMeta.totalStateBits)} Zeilen nicht darstellbar
                  </span>
                )}
              </p>
            </>
          );
        })()}
      </div>
    </div>
  );
}

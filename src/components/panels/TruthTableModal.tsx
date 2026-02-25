import React, { useMemo } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { runSimulation } from '../../core/simulation/engine';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { topologicalSort } from '../../core/simulation/topologicalSort';
import {
  initBuffer, buildWireMap, runOneTick,
} from '../../core/simulation/tickEngine';
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
interface StateVar        { gateId: string; portId: string; label: string;  }

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
}

type Computed = TruthTableResult | StateTransitionResult;
type ColKind  = 'in' | 'state' | 'next' | 'out' | 'mid';

interface Props { onClose: () => void; }

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function gateLabel(g: GateInstance): string {
  return g.label || g.typeId.replace(/_/g, '') + '_' + g.id.slice(0, 4);
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

    // ════════════════════════════════════════════════════════════════════════
    // MODUS 1: Klassische Wahrheitstabelle (rein kombinatorische Schaltung)
    // ════════════════════════════════════════════════════════════════════════
    if (!hasCycles) {
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

    // Feedback-Gatter (Knoten die in Zyklen sind)
    const feedbackGateIds = new Set(cycles.flat());

    // Zustandsvariablen = Ausgangsports der Feedback-Gatter, x-sortiert
    const stateVars: StateVar[] = [];
    const feedbackGatesSorted = [...feedbackGateIds]
      .map(id => circuit.gates[id])
      .filter(Boolean)
      .filter(g => connectedIds.has(g.id))
      .sort((a, b) => a.x - b.x);

    for (const gate of feedbackGatesSorted) {
      let def; try { def = gateRegistry.get(gate.typeId); } catch { continue; }
      const lbl = gateLabel(gate);
      for (const p of def.outputs) {
        stateVars.push({
          gateId: gate.id,
          portId: p.id,
          label:  def.outputs.length === 1 ? lbl : `${lbl}.${p.label ?? p.id}`,
        });
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

    // Zu viele Kombinationen? (>256 Zeilen)
    if (totalVars > 8 || stateVars.length === 0) {
      return {
        mode: 'state-transition',
        inputs, stateVars, outputGates,
        rows: [], tooMany: stateVars.length === 0 ? false : true,
      };
    }

    // Wire-Map für Single-Tick-Simulation (einmal berechnen)
    const wireMap = buildWireMap(circuit);

    // Alle Kombinationen von (Eingänge × aktueller Zustand) enumerated
    const rows: StateTransitionResult['rows'] = [];

    for (let combo = 0; combo < (1 << totalVars); combo++) {
      // Bit-Layout: [input0 ... inputN-1 | state0 ... stateM-1], MSB links
      const inputBits = inputs.map(
        (_, i) => (combo >> (totalVars - 1 - i)) & 1
      );
      const stateBits = stateVars.map(
        (_, s) => (combo >> (stateVars.length - 1 - s)) & 1
      );

      // Buffer aus aktuellem Circuit-Zustand initialisieren
      const buf = initBuffer(circuit);

      // Externe Eingänge erzwingen:
      // - customStates: damit evaluate() den korrekten Wert liefert
      // - outputs: damit downstream-Gates im ersten Settle-Tick korrekt lesen
      for (let i = 0; i < inputs.length; i++) {
        const g = inputs[i];
        buf.customStates[g.id] = {
          ...(buf.customStates[g.id] ?? {}),
          value: inputBits[i] as SignalValue,
        };
        if (!buf.outputs[g.id]) buf.outputs[g.id] = {};
        buf.outputs[g.id]['out'] = inputBits[i] as SignalValue;
      }

      // Zustandsvariablen erzwingen (Ausgänge der Feedback-Gatter als Startwert)
      for (let s = 0; s < stateVars.length; s++) {
        const sv = stateVars[s];
        if (!buf.outputs[sv.gateId]) buf.outputs[sv.gateId] = {};
        buf.outputs[sv.gateId][sv.portId] = stateBits[s] as SignalValue;
      }

      // ── Exakt EIN Simulations-Tick (Read-Buffer → Logik → Write-Buffer) ─────
      // KEIN Settle/while-Loop! Die STT zeigt den Zustand nach genau einem
      // Propagations-Schritt. Das ist die mathematisch korrekte Definition von
      // Q(t+1): was die Gatter im nächsten Takt aus Q(t) und den Eingängen machen.
      // Clocks werden dabei eingefroren (isClockPaused = true).
      const nextBuf = runOneTick(circuit, buf, wireMap, /* isClockPaused */ true);

      // Nächster Zustand = Ausgänge der Feedback-Gatter nach einem Tick
      const nextState = stateVars.map(sv =>
        (nextBuf.outputs[sv.gateId]?.[sv.portId] ?? 0) as number
      );

      // Externe LED-Ausgänge
      const outputBits = outputGates.map(led => {
        const wire = Object.values(circuit.wires).find(w => w.to.gateId === led.id);
        if (!wire) return 0;
        return (nextBuf.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as number;
      });

      rows.push({ inputBits, stateBits, nextState, outputBits });
    }

    return { mode: 'state-transition', inputs, stateVars, outputGates, rows, tooMany: false };

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
    color:      v === 0 ? '#475569' : kindColor(kind),
    fontWeight: v && kind !== 'in' ? 700 : 400,
  });

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
                ⟳ Rückkopplung erkannt – sequenzielle Schaltungsanalyse
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
                        {row.mids.map((v, i) => <td key={i} style={tdStyle(v, 'mid')}>{v}</td>)}
                        <td style={sepTd}>│</td>
                        {row.outs.map((v, i) => <td key={i} style={tdStyle(v, 'out')}>{v}</td>)}
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
          const { inputs, stateVars, outputGates, rows, tooMany } = computed;

          if (stateVars.length === 0) {
            return (
              <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                Rückkopplung erkannt, aber keine Zustands-Gatter identifizierbar.
              </p>
            );
          }

          if (tooMany) {
            return (
              <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                Zu viele Variablen ({inputs.length} Eingänge + {stateVars.length} Zustandsbits
                = {inputs.length + stateVars.length} &gt; 8). Max. 256 Tabellenzeilen.
              </p>
            );
          }

          const hasInputs  = inputs.length > 0;
          const hasOutputs = outputGates.length > 0;

          return (
            <>
              {/* Legende */}
              <div style={{ marginBottom: 12, fontSize: 11, fontFamily: 'monospace', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {hasInputs  && <span style={{ color: '#60a5fa' }}>■ Eingänge</span>}
                <span style={{ color: '#f59e0b' }}>■ Aktueller Zustand Q(t)</span>
                <span style={{ color: '#a78bfa' }}>■ Nächster Zustand Q(t+1)</span>
                {hasOutputs && <span style={{ color: '#22c55e' }}>■ Ausgänge</span>}
              </div>

              <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>
                <thead>
                  {/* Sektions-Zeile (Gruppen-Beschriftung) */}
                  <tr>
                    {hasInputs && (
                      <th colSpan={inputs.length} style={sectionTh('in')}>EINGÄNGE</th>
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
                        {row.nextState.map( (v, i) => <td key={i} style={tdStyle(v, 'next') }>{v}</td>)}
                        {hasOutputs && <td style={sepTd}>│</td>}
                        {row.outputBits.map((v, i) => <td key={i} style={tdStyle(v, 'out')  }>{v}</td>)}
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
              </p>
            </>
          );
        })()}
      </div>
    </div>
  );
}

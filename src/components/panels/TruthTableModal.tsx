import React, { useMemo, useRef, useState } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { runSimulation } from '../../core/simulation/engine';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { topologicalSort } from '../../core/simulation/topologicalSort';
import {
  buildStateTransitionProjection,
  buildAnalysisSubsystemOptions,
  type StateTransitionProjectionStatus,
} from '../../core/analysis/sequentialProjection';
import {
  buildDisplayedStateTransitionTable,
  buildStaticAnalysisCircuit,
  buildStaticAnalysisKey,
  buildStaticStateTransitionTable,
  resolveStateTransitionViewState,
  type ReducedStateTransitionMeta,
  type StateTransitionDisplayMode,
} from '../../core/analysis/stateTransitionTable';
import type { Circuit, GateInstance } from '../../core/types';
import {
  buildAnalysisSubsystemSemanticNotes,
  resolveTruthTablePanelState,
} from './panelViewState';
import {
  collectConnectedGateIds,
  collectStateVarsForStt,
  collectSttFeedbackGateIds,
  gateLabel,
  INPUT_TYPES,
  OUTPUT_TYPES,
  SKIP_TYPES,
  type StateVar,
} from './truthTableAnalysis';

// â”€â”€ Gattertyp-Kategorien â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Gatter die als variable Eingabe durchgezÃ¤hlt werden */


// â”€â”€ Typen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface IntermediateCol { gateId: string; portId: string; header: string; }

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
  inputRoles:  Record<string, 'clock' | 'reset' | 'input'>;
  projectionStatus: StateTransitionProjectionStatus;
  stateVars:   StateVar[];
  outputGates: GateInstance[];
  rows:        Array<{
    inputBits:  number[];
    stateBits:  number[];
    nextState:  number[];
    outputBits: number[];
  }>;
  isProjectedFsmView: boolean;
  tooMany: boolean;
  /** Present when the analysis was reduced to fit within the row limit. */
  reducedMeta?: ReducedStateTransitionMeta;
}

type Computed = TruthTableResult | StateTransitionResult;
type ColKind  = 'in' | 'state' | 'next' | 'out' | 'mid';

interface Props { onClose: () => void; }

// â”€â”€ Komponente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function TruthTableModal({ onClose }: Props) {
  const { circuit } = useCircuitContext();
  const [sttViewMode, setSttViewMode] = useState<StateTransitionDisplayMode>('fsm_compact');
  const [selectedSubsystemKey, setSelectedSubsystemKey] = useState<string>('');
  const analysisKey = useMemo(() => buildStaticAnalysisKey(circuit), [circuit]);
  const analysisSnapshotRef = useRef<{ key: string; circuit: Circuit } | null>(null);
  if (!analysisSnapshotRef.current || analysisSnapshotRef.current.key !== analysisKey) {
    analysisSnapshotRef.current = {
      key: analysisKey,
      circuit: buildStaticAnalysisCircuit(circuit),
    };
  }
  const analysisCircuit = analysisSnapshotRef.current.circuit;
  const analysisSubsystemOptions = useMemo(
    () => buildAnalysisSubsystemOptions(analysisCircuit),
    [analysisCircuit],
  );
  const {
    activeAnalysisSubsystem,
    analysisSourceCircuit,
    showSubsystemSelector,
  } = resolveTruthTablePanelState(
    analysisCircuit,
    analysisSubsystemOptions,
    selectedSubsystemKey,
  );

  // â”€â”€ Hauptberechnung â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const computed = useMemo((): Computed => {
    const allGates = Object.values(analysisSourceCircuit.gates);

    // Verbundene Gate-IDs (haben mindestens einen Draht)
    const connectedIds = collectConnectedGateIds(analysisSourceCircuit);

    // Zyklenerkennung via Topologischer Sortierung
    const { order: evalOrder, cycles } = topologicalSort(analysisSourceCircuit);
    const hasCycles = cycles.length > 0;

    // Erkennung sequenzieller Gatter (Flip-Flops, Latches) auch ohne Draht-Zyklen.
    // isSynchronous-Gatter (D-FF, JK-FF â€¦) und Gatter mit stateUpdate (SR-Latch, D-Latch)
    // fÃ¼hren intern Zustand â†’ Mode 2 (ZustandsÃ¼bergangstabelle) nÃ¶tig.
    //
    // Autonome Quellen (CLOCK, INPUT_SWITCH, PUSH_BTN, CONST, ADC) und reine
    // Ausgabe-Gatter (OUTPUT_LED) werden explizit ausgeschlossen: Sie haben
    // zwar stateUpdate (z. B. CLOCK-Tick-ZÃ¤hler) oder isSynchronous (STEPPER),
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MODUS 1: Klassische Wahrheitstabelle (rein kombinatorische Schaltung)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
          ...analysisSourceCircuit,
          gates: Object.fromEntries(
            Object.entries(analysisSourceCircuit.gates).map(([id, g]) => {
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MODUS 2: ZustandsÃ¼bergangstabelle (sequenzielle / rÃ¼ckkoppelnde Schaltung)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    // Zustandsgatter = Gatter in Draht-Zyklen (Feedback) ODER synchrone
    // FF/Register ODER Gatter mit stateUpdate (z.B. SR-Latch, D-Latch).
    const feedbackGateIds = collectSttFeedbackGateIds(
      analysisSourceCircuit,
      connectedIds,
      cycles,
      gateRegistry.get.bind(gateRegistry),
    );

    // Zustandsvariablen = sichtbare State-Carriers der Zustandsgatter, x-sortiert
    const stateVars = collectStateVarsForStt(
      analysisSourceCircuit,
      connectedIds,
      feedbackGateIds,
      gateRegistry.get.bind(gateRegistry),
    );

    // â”€â”€ Label-Deduplizierung â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Falls mehrere Feedback-Gatter den gleichen auto-generierten Namen haben
    // (z.B. zwei unbeschriftete NOT-Gatter â†’ "NOT_xxxx"), Index anhÃ¤ngen.
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

    // Externe EingÃ¤nge (keine Feedback-Gates, verbunden)
    const inputs = allGates
      .filter(g => INPUT_TYPES.has(g.typeId) && connectedIds.has(g.id))
      .sort((a, b) => a.x - b.x);

    // Externe AusgÃ¤nge
    const outputGates = allGates
      .filter(g => OUTPUT_TYPES.has(g.typeId) && connectedIds.has(g.id))
      .sort((a, b) => a.x - b.x);

    const projectedView = buildStateTransitionProjection(analysisSourceCircuit, inputs, stateVars, outputGates);
    const projectedInputs = projectedView.inputs;
    const projectedStateVars = projectedView.stateVars;
    const projectedOutputGates = projectedView.outputGates;

    // Keine Zustandsvariablen â†’ kein valides STT-Modell
    if (projectedStateVars.length === 0) {
      return {
        mode: 'state-transition',
        inputs: projectedInputs,
        inputRoles: projectedView.inputRoles,
        projectionStatus: projectedView.projectionStatus,
        stateVars: projectedStateVars,
        outputGates: projectedOutputGates,
        rows: [],
        isProjectedFsmView: projectedView.isProjectedFsmView,
        tooMany: false,
      };
    }
    const staticTable = buildStaticStateTransitionTable({
      circuit: analysisSourceCircuit,
      feedbackGateIds,
      projectedInputs,
      projectedStateVars,
      projectedOutputGates,
      isProjectedFsmView: projectedView.isProjectedFsmView,
    });

    return {
      mode: 'state-transition',
      inputs: staticTable.inputs,
      inputRoles: projectedView.inputRoles,
      projectionStatus: projectedView.projectionStatus,
      stateVars: staticTable.stateVars,
      outputGates: staticTable.outputGates,
      rows: staticTable.rows,
      isProjectedFsmView: projectedView.isProjectedFsmView,
      tooMany: staticTable.tooMany,
      reducedMeta: staticTable.reducedMeta,
    };

  }, [analysisSourceCircuit]);

  const sttViewState = computed.mode === 'state-transition'
    ? resolveStateTransitionViewState({
      requestedMode: sttViewMode,
      projectionStatus: computed.projectionStatus,
      isProjectedFsmView: computed.isProjectedFsmView,
      reducedMeta: computed.reducedMeta,
      inputRoles: computed.inputRoles,
    })
    : null;
  const activeSttViewMode: StateTransitionDisplayMode = sttViewState?.activeMode ?? 'technical_full';

  const displayedStateTransition = useMemo(() => {
    if (computed.mode !== 'state-transition') return null;
    return buildDisplayedStateTransitionTable({
      table: {
        inputs: computed.inputs,
        stateVars: computed.stateVars,
        outputGates: computed.outputGates,
        rows: computed.rows,
        tooMany: computed.tooMany,
        reducedMeta: computed.reducedMeta,
      },
      mode: activeSttViewMode,
      isProjectedFsmView: computed.isProjectedFsmView,
      inputRoles: computed.inputRoles,
    });
  }, [activeSttViewMode, computed]);

  const showSttViewModeSelect = sttViewState?.showModeSelect ?? false;
  const showReducedCompactNote = sttViewState?.showReducedCompactNote ?? false;
  const fallbackProjectionNote = sttViewState?.fallbackNote ?? '';
  const analysisSemanticNotes = buildAnalysisSubsystemSemanticNotes({
    analysisSubsystemOptions,
    activeAnalysisSubsystem,
    target: 'truth_table',
  });

  // â”€â”€ Style-Funktionen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const kindColor = (kind: ColKind): string =>
    kind === 'in'    ? '#60a5fa'   // Blau   â€“ externe EingÃ¤nge
    : kind === 'state' ? '#f59e0b' // Amber  â€“ aktueller Zustand Q(t)
    : kind === 'next'  ? '#a78bfa' // Lila   â€“ nÃ¤chster Zustand Q(t+1)
    : kind === 'mid'   ? '#a78bfa' // Lila   â€“ Zwischenwerte
    : '#22c55e';                   // GrÃ¼n   â€“ AusgÃ¤nge

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

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24, maxWidth: '95vw', maxHeight: '82vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* â”€â”€ Kopfzeile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 16, fontFamily: 'monospace' }}>
              {computed.mode === 'state-transition'
                ? 'Zustandsuebergangstabelle'
                : 'Wahrheitstabelle'}
            </h2>
            {computed.mode === 'state-transition' && (
              <p style={{ margin: '4px 0 0', color: '#f59e0b', fontSize: 11, fontFamily: 'monospace' }}>
                [seq] Sequenzielle Logik erkannt (Flip-Flops / Rueckkopplung) - Zustandsanalyse
              </p>
            )}
          </div>
          {showSubsystemSelector && activeAnalysisSubsystem && (
            <label
              style={{
                marginLeft: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                color: '#94a3b8',
                fontSize: 11,
                fontFamily: 'monospace',
                marginRight: showSttViewModeSelect ? 12 : 0,
              }}
            >
              <span>System</span>
              <select
                aria-label="System"
                value={activeAnalysisSubsystem.key}
                onChange={(event) => setSelectedSubsystemKey(event.target.value)}
                style={{
                  minWidth: 180,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #475569',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {analysisSubsystemOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {showSttViewModeSelect && (
            <label
              style={{
                marginLeft: showSubsystemSelector ? 0 : 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                color: '#94a3b8',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
            >
              <span>Ansicht</span>
              <select
                aria-label="STT-Ansicht"
                value={activeSttViewMode}
                onChange={(event) => setSttViewMode(event.target.value as StateTransitionDisplayMode)}
                style={{
                  minWidth: 170,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #475569',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                <option value="fsm_compact">FSM kompakt</option>
                <option value="technical_full">Technisch voll</option>
              </select>
            </label>
          )}
          <button
            onClick={onClose}
            style={{ marginLeft: (showSttViewModeSelect || showSubsystemSelector) ? 12 : 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
          >x</button>
        </div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* MODUS 1: Klassische Wahrheitstabelle                              */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {computed.mode === 'truth-table' && (() => {
          const { inputs, outputs, tooMany, table, intermediateCols } = computed;
          return (
            <>
              {inputs.length === 0 && (
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Keine Eingaenge (INPUT_SWITCH / PUSH_BTN / CLOCK) gefunden.
                </p>
              )}
              {outputs.length === 0 && (
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Keine Ausgaenge (OUTPUT_LED) gefunden.
                </p>
              )}
              {tooMany && (
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Zu viele Eingaenge (&gt;12).
                </p>
              )}
              {table && intermediateCols.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11, fontFamily: 'monospace' }}>
                  <span style={{ color: '#60a5fa' }}>[in] Eingaenge</span>
                  <span style={{ color: '#a78bfa' }}>[mid] Zwischenwerte</span>
                  <span style={{ color: '#22c55e' }}>[out] Ausgaenge</span>
                </div>
              )}
              {table && (
                <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>
                  <thead>
                    <tr>
                      {inputs.map(g => (
                        <th key={g.id} style={thStyle('in')}>{gateLabel(g)}</th>
                      ))}
                      {intermediateCols.length > 0 && <th style={sepTh}>|</th>}
                      {intermediateCols.map((col) => (
                        <th key={`${col.gateId}:${col.portId}`} style={thStyle('mid')}>{col.header}</th>
                      ))}
                      <th style={sepTh}>|</th>
                      {outputs.map(g => (
                        <th key={g.id} style={thStyle('out')}>{gateLabel(g)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.map((row, ri) => (
                      <tr key={row.ins.join('')} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)' }}>
                        {row.ins.map((v, i)  => <td key={i} style={tdStyle(v, 'in')} >{v}</td>)}
                        {intermediateCols.length > 0 && <td style={sepTd}>|</td>}
                        {row.mids.map((v, i) => <td key={i} style={tdStyle(v, 'mid')}>{displayVal(v)}</td>)}
                        <td style={sepTd}>|</td>
                        {row.outs.map((v, i) => <td key={i} style={tdStyle(v, 'out')}>{displayVal(v)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          );
        })()}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* MODUS 2: ZustandsÃ¼bergangstabelle                                 */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {computed.mode === 'state-transition' && (() => {
          const { tooMany, reducedMeta } = computed;
          const inputs = displayedStateTransition?.inputs ?? computed.inputs;
          const stateVars = displayedStateTransition?.stateVars ?? computed.stateVars;
          const outputGates = displayedStateTransition?.outputGates ?? computed.outputGates;
          const rows = displayedStateTransition?.rows ?? computed.rows;
          const modeNotes = displayedStateTransition?.notes ?? [];
          const renderSemanticBlocks = () => (
            <>
              {analysisSemanticNotes.map((note) => (
                <div
                  key={note.key}
                  style={{
                    marginBottom: 14,
                    padding: '8px 12px',
                    background: note.tone === 'warning' ? '#172554' : '#0f172a',
                    border: `1px solid ${note.tone === 'warning' ? '#1d4ed8' : '#334155'}`,
                    borderRadius: 6,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: note.tone === 'warning' ? '#dbeafe' : '#cbd5e1',
                    lineHeight: 1.7,
                  }}
                >
                  {note.message}
                </div>
              ))}

              {fallbackProjectionNote && (
                <div style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  background: '#172554',
                  border: '1px solid #1d4ed8',
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#dbeafe',
                  lineHeight: 1.7,
                }}>
                  {fallbackProjectionNote}
                </div>
              )}
            </>
          );

          if (stateVars.length === 0) {
            return (
              <>
                {renderSemanticBlocks()}
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Keine Zustandsvariablen identifizierbar (keine isSynchronous-Gatter / Feedback-Knoten verbunden).
                </p>
              </>
            );
          }

          if (tooMany) {
            return (
              <>
                {renderSemanticBlocks()}
                <p style={{ color: '#ef4444', fontSize: 12, fontFamily: 'monospace' }}>
                  Zu viele Steuer-Eingaenge fuer reduzierte Analyse (&gt;7). Schaltung zu komplex fuer tabellarische Darstellung.
                </p>
              </>
            );
          }

          const hasInputs  = inputs.length > 0;
          const hasOutputs = outputGates.length > 0;

          return (
            <>
              {/* â”€â”€ Reduzierte-Analyse-Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    ! Reduzierte Steuerlogik-Analyse
                  </div>
                  <div style={{ color: '#94a3b8', lineHeight: 1.7 }}>
                    <div>
                      Zeigt Zustandsbit <span style={{ color: '#f59e0b' }}>{stateVars[0].label}</span>
                      {' '}stellvertretend fuer alle{' '}
                      <span style={{ color: '#f59e0b' }}>{reducedMeta.totalStateBits}</span> Zustandsbits
                      {reducedMeta.totalStateBits > 1 && ' (uebrige Bits: 0)'}
                    </div>
                    {reducedMeta.fixedDataLabels.length > 0 && (
                      <div>
                        Dateneingaenge fest 0:{' '}
                        <span style={{ color: '#64748b' }}>
                          {reducedMeta.fixedDataLabels.join(', ')}
                        </span>
                      </div>
                    )}
                    {reducedMeta.cappedControls && (
                      <div style={{ color: '#f87171' }}>
                        Steuer-Eingaenge auf {reducedMeta.controlCount} begrenzt
                        {reducedMeta.omittedControlLabels.length > 0 && (
                          <>
                            {' '}(
                            uebersprungen:{' '}
                            <span style={{ color: '#fca5a5' }}>
                              {reducedMeta.omittedControlLabels.join(', ')}
                            </span>
                            )
                          </>
                        )}
                      </div>
                    )}
                    <div>
                      Reduzierte FSM-STT:{' '}
                      <span style={{ color: '#f59e0b' }}>{reducedMeta.reducedCompactRowCount}</span>
                      {' '}sichtbare Zeilen statt{' '}
                      <span style={{ color: '#f59e0b' }}>{reducedMeta.fullCompactRowCount}</span>
                      {' '}fachlich relevanter Vollzeilen.
                    </div>
                  </div>
                </div>
              )}

              {showReducedCompactNote && (
                <div style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#cbd5e1',
                  lineHeight: 1.7,
                }}>
                  Technisch voll ist hier absichtlich ausgeblendet, weil die projizierte FSM bereits in einer reduzierten STT-Ansicht laeuft.
                </div>
              )}

              {renderSemanticBlocks()}

              {activeSttViewMode === 'fsm_compact' && modeNotes.length > 0 && (
                <div style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#cbd5e1',
                  lineHeight: 1.7,
                }}>
                  {modeNotes.map((note) => (
                    <div key={note}>- {note}</div>
                  ))}
                </div>
              )}

              {/* Legende */}
              <div style={{ marginBottom: 12, fontSize: 11, fontFamily: 'monospace', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {hasInputs  && <span style={{ color: '#60a5fa' }}>[in] Steuer-Eingaenge</span>}
                <span style={{ color: '#f59e0b' }}>[state] Aktueller Zustand Q(t)</span>
                <span style={{ color: '#a78bfa' }}>[next] Naechster Zustand Q(t+1)</span>
                {hasOutputs && <span style={{ color: '#22c55e' }}>[out] Ausgaenge</span>}
              </div>

              <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>
                <thead>
                  {/* Sektions-Zeile (Gruppen-Beschriftung) */}
                  <tr>
                    {hasInputs && (
                      <th colSpan={inputs.length} style={sectionTh('in')}>STEUER-EINGAENGE</th>
                    )}
                    {hasInputs && <th style={{ ...sectionTh('in'), color: '#334155', padding: '3px 4px' }}></th>}
                    <th colSpan={stateVars.length} style={sectionTh('state')}>ZUSTAND Q(t)</th>
                    <th style={{ ...sectionTh('state'), color: '#334155', padding: '3px 4px' }}></th>
                    <th colSpan={stateVars.length} style={sectionTh('next')}>NAECHSTER ZUSTAND Q(t+1)</th>
                    {hasOutputs && (
                      <>
                        <th style={{ ...sectionTh('out'), color: '#334155', padding: '3px 4px' }}></th>
                        <th colSpan={outputGates.length} style={sectionTh('out')}>AUSGAENGE</th>
                      </>
                    )}
                  </tr>

                  {/* Spalten-Label-Zeile */}
                  <tr>
                    {inputs.map(g => (
                      <th key={g.id} style={thStyle('in')}>{gateLabel(g)}</th>
                    ))}
                    {hasInputs && <th style={sepTh}>|</th>}
                    {stateVars.map((sv) => (
                      <th key={`${sv.gateId}:${sv.stateKey}`} style={thStyle('state')}>{sv.label}</th>
                    ))}
                    <th style={sepTh}>|</th>
                    {stateVars.map((sv) => (
                      <th key={`${sv.gateId}:${sv.stateKey}:next`} style={thStyle('next')}>{sv.label}'</th>
                    ))}
                    {hasOutputs && <th style={sepTh}>|</th>}
                    {hasOutputs && outputGates.map(g => (
                      <th key={g.id} style={thStyle('out')}>{gateLabel(g)}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, ri) => {
                    // Stabiler Zustand: Q(t) = Q(t+1) fuer alle Zustandsbits
                    const isStableState = row.stateBits.every((v, i) => v === row.nextState[i]);
                    return (
                      <tr
                        key={`${row.inputBits.join('')}:${row.stateBits.join('')}`}
                        style={{
                          background: isStableState
                            ? 'rgba(245,158,11,0.07)'      // Amber-Tint = stabiler Zustand
                            : ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                        }}
                      >
                        {row.inputBits.map( (v, i) => <td key={i} style={tdStyle(v, 'in')   }>{v}</td>)}
                        {hasInputs && <td style={sepTd}>|</td>}
                        {row.stateBits.map( (v, i) => <td key={i} style={tdStyle(v, 'state')}>{v}</td>)}
                        <td style={sepTd}>|</td>
                        {row.nextState.map( (v, i) => <td key={i} style={tdStyle(v, 'next') }>{displayVal(v)}</td>)}
                        {hasOutputs && <td style={sepTd}>|</td>}
                        {row.outputBits.map((v, i) => <td key={i} style={tdStyle(v, 'out')  }>{displayVal(v)}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Fusszeile */}
              <p style={{ marginTop: 10, fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
                {activeSttViewMode === 'fsm_compact'
                  ? 'FSM kompakt: Takt als Uebergangsereignis, Resetfaelle im technischen Modus.'
                  : "' = Zustand nach einem Simulationsschritt (Settle-Phase)"}
                &nbsp;|&nbsp;
                <span style={{ color: '#f59e0b' }}>[*]</span> = Stabiler Zustand Q(t) = Q(t+1)
                {reducedMeta && (
                  <span style={{ color: '#78716c' }}>
                    &nbsp;|&nbsp; Reduzierte Ansicht - {reducedMeta.reducedCompactRowCount} sichtbare statt {reducedMeta.fullCompactRowCount} fachlich relevanter Vollzeilen
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

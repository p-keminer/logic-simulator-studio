import legacyFsmExportFixture from '../../../validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json';
import { describe, expect, it } from 'vitest';
import '../../gates/definitions/not.gate';
import '../../gates/io/clock.gate';
import '../../gates/io/inputSwitch.gate';
import '../../gates/io/outputLed.gate';
import '../../gates/sequential/flipflops.gates';
import {
  collectConnectedGateIds,
  collectStateVarsForStt,
  collectSttFeedbackGateIds,
  INPUT_TYPES,
  OUTPUT_TYPES,
} from '../../components/panels/truthTableAnalysis';
import {
  buildAnalysisSubsystemOptions,
  buildStateTransitionProjection,
} from '../../core/analysis/sequentialProjection';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { topologicalSort } from '../../core/simulation/topologicalSort';
import {
  buildDisplayedStateTransitionTable,
  buildStaticAnalysisKey,
  buildStaticStateTransitionTable,
  getAvailableStateTransitionDisplayModes,
  getStateTransitionFallbackNote,
  resolveStateTransitionViewState,
} from '../../core/analysis/stateTransitionTable';
import type { Circuit, GateInstance, SignalState, Wire } from '../../core/types';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  opts?: {
    x?: number;
    y?: number;
    label?: string;
    projection?: GateInstance['projection'];
    customState?: Record<string, unknown>;
  },
): GateInstance {
  return {
    id,
    typeId,
    x: opts?.x ?? 0,
    y: opts?.y ?? 0,
    label: opts?.label,
    projection: opts?.projection,
    outputSignals: {},
    customState: opts?.customState ?? {},
    isSelected: false,
  };
}

function makeWire(
  id: string,
  fromGate: string,
  fromPort: string,
  toGate: string,
  toPort: string,
): Wire {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to: { gateId: toGate, portId: toPort },
    signal: { ...defaultSignal },
    waypoints: [],
    isSelected: false,
  };
}

function makeCircuit(gates: GateInstance[], wires: Wire[]): Circuit {
  return {
    id: 'state-transition-table-test',
    name: 'StateTransitionTable Test',
    version: '1.0.0',
    gates: Object.fromEntries(gates.map((gate) => [gate.id, gate])),
    wires: Object.fromEntries(wires.map((wire) => [wire.id, wire])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  };
}

function buildLegacyFixtureTable(circuit: Circuit) {
  const connectedIds = collectConnectedGateIds(circuit);
  const { cycles } = topologicalSort(circuit);
  const feedbackGateIds = collectSttFeedbackGateIds(
    circuit,
    connectedIds,
    cycles,
    gateRegistry.get.bind(gateRegistry),
  );
  const stateVars = collectStateVarsForStt(
    circuit,
    connectedIds,
    feedbackGateIds,
    gateRegistry.get.bind(gateRegistry),
  );
  const inputs = Object.values(circuit.gates)
    .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
    .sort((a, b) => a.x - b.x);
  const outputGates = Object.values(circuit.gates)
    .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
    .sort((a, b) => a.x - b.x);
  const projected = buildStateTransitionProjection(circuit, inputs, stateVars, outputGates);
  return buildStaticStateTransitionTable({
    circuit,
    feedbackGateIds,
    projectedInputs: projected.inputs,
    projectedStateVars: projected.stateVars,
    projectedOutputGates: projected.outputGates,
    isProjectedFsmView: projected.isProjectedFsmView,
  });
}

function buildProjectedViewForCircuit(circuit: Circuit) {
  const connectedIds = collectConnectedGateIds(circuit);
  const feedbackGateIds = collectSttFeedbackGateIds(
    circuit,
    connectedIds,
    [],
    gateRegistry.get.bind(gateRegistry),
  );
  const stateVars = collectStateVarsForStt(
    circuit,
    connectedIds,
    feedbackGateIds,
    gateRegistry.get.bind(gateRegistry),
  );
  const inputs = Object.values(circuit.gates)
    .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
    .sort((a, b) => a.x - b.x);
  const outputGates = Object.values(circuit.gates)
    .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
    .sort((a, b) => a.x - b.x);

  return buildStateTransitionProjection(circuit, inputs, stateVars, outputGates);
}

function buildProjectedTableForCircuit(circuit: Circuit) {
  const connectedIds = collectConnectedGateIds(circuit);
  const feedbackGateIds = collectSttFeedbackGateIds(
    circuit,
    connectedIds,
    [],
    gateRegistry.get.bind(gateRegistry),
  );
  const projected = buildProjectedViewForCircuit(circuit);
  const table = buildStaticStateTransitionTable({
    circuit,
    feedbackGateIds,
    projectedInputs: projected.inputs,
    projectedStateVars: projected.stateVars,
    projectedOutputGates: projected.outputGates,
    isProjectedFsmView: projected.isProjectedFsmView,
  });

  return { projected, table };
}

function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'state-transition-fsm',
    name: 'State Transition FSM',
    archType: 'moore',
    inputCount: 1,
    inputNames: ['A'],
    outputCount: 1,
    outputNames: ['Y'],
    states: {},
    transitions: [],
    ...overrides,
  };
}

function emptyCircuit(): Circuit {
  return {
    id: 'projection-circ',
    name: 'Projection Circuit',
    version: '1.0',
    gates: {},
    wires: {},
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '', updatedAt: '' },
  };
}

function projectedInput(
  id: string,
  label: string,
  role: 'clock' | 'reset' | 'input',
  signalPortId: string,
  batchId = 'batch-wide',
): GateInstance {
  return makeGate(id, role === 'clock' ? 'CLOCK' : 'INPUT_SWITCH', {
    label,
    projection: {
      sourceSystem: 'fsm_synth',
      projectionBatchId: batchId,
      role,
      visibility: 'canonical',
      signalLabel: label,
      groupKey: `${role}:${label}`,
      signalPortId,
    },
  });
}

function projectedState(
  id: string,
  label: string,
  batchId = 'batch-wide',
): GateInstance {
  return makeGate(id, 'D_FF_R', {
    label,
    projection: {
      sourceSystem: 'fsm_synth',
      projectionBatchId: batchId,
      role: 'state',
      visibility: 'canonical',
      signalLabel: label,
      groupKey: `state:${label}`,
      signalPortId: 'q',
    },
  });
}

function projectedOutput(id: string, label: string, batchId = 'batch-wide'): GateInstance {
  return makeGate(id, 'OUTPUT_LED', {
    label,
    projection: {
      sourceSystem: 'fsm_synth',
      projectionBatchId: batchId,
      role: 'output',
      visibility: 'canonical',
      signalLabel: label,
      groupKey: `output:${label}`,
      signalPortId: '_display',
    },
  });
}

describe('stateTransitionTable', () => {
  it('reduces a wide projected FSM into a single representative state bit and capped controls', () => {
    const clk = projectedInput('clk', 'CLK', 'clock', 'clk');
    const rst = projectedInput('rst', 'RST', 'reset', 'out');
    const inputs = Array.from({ length: 6 }, (_, index) =>
      projectedInput(`in${index}`, `A${index}`, 'input', 'out'),
    );
    const q0 = projectedState('q0', 'Q0');
    const q1 = projectedState('q1', 'Q1');
    const outY = projectedOutput('outY', 'Y');

    const circuit = makeCircuit(
      [clk, rst, ...inputs, q0, q1, outY],
      [
        makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
        makeWire('w2', 'rst', 'out', 'q0', 'rst'),
        makeWire('w3', 'in0', 'out', 'q0', 'd'),
        makeWire('w4', 'q0', 'q', 'q1', 'd'),
        makeWire('w5', 'q0', 'q', 'outY', 'in'),
      ],
    );

    const result = buildStaticStateTransitionTable({
      circuit,
      feedbackGateIds: new Set(['q0', 'q1']),
      projectedInputs: [clk, rst, ...inputs],
      projectedStateVars: [
        { gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' },
        { gateId: 'q1', portId: 'q', stateKey: 'q', label: 'Q1' },
      ],
      projectedOutputGates: [outY],
      isProjectedFsmView: true,
    });

    expect(result.tooMany).toBe(false);
    expect(result.inputs.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A0', 'A1', 'A2', 'A3', 'A4']);
    expect(result.stateVars.map((stateVar) => stateVar.label)).toEqual(['Q0']);
    expect(result.rows).toHaveLength(256);
    expect(result.reducedMeta).toMatchObject({
      totalStateBits: 2,
      controlCount: 7,
      cappedControls: true,
      fixedDataLabels: [],
    });
  });

  it('builds a compact FSM display mode that hides clock and reset dimensions', () => {
    const clk = projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-compact');
    const rst = projectedInput('rst', 'RST', 'reset', 'out', 'batch-compact');
    const a = projectedInput('a', 'A', 'input', 'out', 'batch-compact');
    const q0 = projectedState('q0', 'Q0', 'batch-compact');
    const outY = projectedOutput('outY', 'Y', 'batch-compact');

    const circuit = makeCircuit(
      [clk, rst, a, q0, outY],
      [
        makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
        makeWire('w2', 'rst', 'out', 'q0', 'rst'),
        makeWire('w3', 'a', 'out', 'q0', 'd'),
        makeWire('w4', 'q0', 'q', 'outY', 'in'),
      ],
    );

    const projected = buildStateTransitionProjection(
      circuit,
      [clk, rst, a],
      [{ gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' }],
      [outY],
    );

    expect(projected.isProjectedFsmView).toBe(true);
    expect(projected.inputRoles).toEqual({
      clk: 'clock',
      rst: 'reset',
      a: 'input',
    });

    const table = buildStaticStateTransitionTable({
      circuit,
      feedbackGateIds: new Set(['q0']),
      projectedInputs: projected.inputs,
      projectedStateVars: projected.stateVars,
      projectedOutputGates: projected.outputGates,
      isProjectedFsmView: projected.isProjectedFsmView,
    });

    const compact = buildDisplayedStateTransitionTable({
      table,
      mode: 'fsm_compact',
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    });

    expect(compact.inputs.map((gate) => gate.label)).toEqual(['A']);
    expect(compact.rows).toHaveLength(4);
    expect(compact.rows.every((row) => row.inputBits.length === 1)).toBe(true);
    expect(compact.rows.every((row) => row.stateBits.length === 1)).toBe(true);
    expect(compact.rows.map((row) => `${row.inputBits[0]}:${row.stateBits[0]}`)).toEqual([
      '0:0',
      '0:1',
      '1:0',
      '1:1',
    ]);
    expect(compact.rows.some((row) => row.nextState[0] === 1)).toBe(true);
    expect(compact.rows.some((row) => row.outputBits[0] === 1)).toBe(true);
    expect(compact.notes).toEqual([
      'CLK wird als Übergangsereignis interpretiert.',
      'RST=1 ist im Modus "Technisch voll" sichtbar.',
    ]);
  });

  it('keeps the technical STT mode as a pass-through view', () => {
    const clk = projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-tech');
    const rst = projectedInput('rst', 'RST', 'reset', 'out', 'batch-tech');
    const a = projectedInput('a', 'A', 'input', 'out', 'batch-tech');
    const q0 = projectedState('q0', 'Q0', 'batch-tech');
    const outY = projectedOutput('outY', 'Y', 'batch-tech');

    const table = buildStaticStateTransitionTable({
      circuit: makeCircuit(
        [clk, rst, a, q0, outY],
        [
          makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
          makeWire('w2', 'rst', 'out', 'q0', 'rst'),
          makeWire('w3', 'a', 'out', 'q0', 'd'),
          makeWire('w4', 'q0', 'q', 'outY', 'in'),
        ],
      ),
      feedbackGateIds: new Set(['q0']),
      projectedInputs: [clk, rst, a],
      projectedStateVars: [{ gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' }],
      projectedOutputGates: [outY],
      isProjectedFsmView: true,
    });

    const technical = buildDisplayedStateTransitionTable({
      table,
      mode: 'technical_full',
      isProjectedFsmView: true,
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    });

    expect(technical.mode).toBe('technical_full');
    expect(technical.inputs).toEqual(table.inputs);
    expect(technical.rows).toEqual(table.rows);
    expect(technical.notes).toEqual([]);
  });

  it('offers both compact and technical modes only for narrow projected FSM tables with one clock', () => {
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: 'projected',
      isProjectedFsmView: true,
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    })).toEqual(['fsm_compact', 'technical_full']);

    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: 'legacy_projected',
      isProjectedFsmView: true,
      reducedMeta: {
        fixedDataLabels: [],
        totalStateBits: 3,
        controlCount: 7,
        cappedControls: true,
      },
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    })).toEqual(['fsm_compact']);

    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: 'fallback_partial_inputs',
      isProjectedFsmView: true,
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    })).toEqual(['technical_full']);

    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: 'fallback_partial_outputs',
      isProjectedFsmView: true,
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    })).toEqual(['technical_full']);

    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: 'fallback_mixed_batches',
      isProjectedFsmView: true,
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    })).toEqual(['technical_full']);

    expect(getAvailableStateTransitionDisplayModes({
      isProjectedFsmView: false,
      inputRoles: {},
    })).toEqual(['technical_full']);
  });

  it('keeps projected FSM tables in technical mode when more than one clock role is present', () => {
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: 'projected',
      isProjectedFsmView: true,
      inputRoles: { clkA: 'clock', clkB: 'clock', rst: 'reset', a: 'input' },
    })).toEqual(['technical_full']);
  });

  it('resolves the modal STT view state for narrow projected tables and preserves a valid requested mode', () => {
    const resolved = resolveStateTransitionViewState({
      requestedMode: 'technical_full',
      projectionStatus: 'projected',
      isProjectedFsmView: true,
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    });

    expect(resolved.availableModes).toEqual(['fsm_compact', 'technical_full']);
    expect(resolved.activeMode).toBe('technical_full');
    expect(resolved.showModeSelect).toBe(true);
    expect(resolved.showReducedCompactNote).toBe(false);
    expect(resolved.fallbackNote).toBe('');
  });

  it('resolves the modal STT view state for reduced legacy projected tables by locking back to compact mode', () => {
    const resolved = resolveStateTransitionViewState({
      requestedMode: 'technical_full',
      projectionStatus: 'legacy_projected',
      isProjectedFsmView: true,
      reducedMeta: {
        fixedDataLabels: [],
        totalStateBits: 3,
        controlCount: 7,
        cappedControls: true,
      },
      inputRoles: { clk: 'clock', rst: 'reset', a: 'input' },
    });

    expect(resolved.availableModes).toEqual(['fsm_compact']);
    expect(resolved.activeMode).toBe('fsm_compact');
    expect(resolved.showModeSelect).toBe(false);
    expect(resolved.showReducedCompactNote).toBe(true);
    expect(resolved.fallbackNote).toBe('');
  });

  it('resolves the modal STT view state for partial-output fallbacks as technical-only with note', () => {
    const resolved = resolveStateTransitionViewState({
      requestedMode: 'fsm_compact',
      projectionStatus: 'fallback_partial_outputs',
      isProjectedFsmView: false,
      inputRoles: {},
    });

    expect(resolved.availableModes).toEqual(['technical_full']);
    expect(resolved.activeMode).toBe('technical_full');
    expect(resolved.showModeSelect).toBe(false);
    expect(resolved.showReducedCompactNote).toBe(false);
    expect(resolved.fallbackNote).toContain('Ausgänge sind gemischt oder nur teilweise projiziert');
  });

  it('maps fallback projection statuses to stable explanatory notes', () => {
    expect(getStateTransitionFallbackNote('fallback_partial_state'))
      .toContain('nicht alle Zustandsbits');
    expect(getStateTransitionFallbackNote('fallback_partial_inputs'))
      .toContain('Eingänge sind nur teilweise projiziert');
    expect(getStateTransitionFallbackNote('fallback_partial_outputs'))
      .toContain('Ausgänge sind gemischt oder nur teilweise projiziert');
    expect(getStateTransitionFallbackNote('fallback_mixed_batches'))
      .toContain('Mehrere FSM-Projektionsbatches erkannt');
    expect(getStateTransitionFallbackNote('projected')).toBe('');
  });

  it('keeps compact STT mode available for observer-trimmed projected analysis subsystems', () => {
    const circuit = makeCircuit([
      projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-observer'),
      projectedInput('rst', 'RST', 'reset', 'out', 'batch-observer'),
      projectedInput('inA', 'A', 'input', 'out', 'batch-observer'),
      projectedState('q0', 'Q0', 'batch-observer'),
      projectedOutput('outY', 'Y', 'batch-observer'),
      makeGate('rawSwitch', 'INPUT_SWITCH', { label: 'RAW_IN' }),
      makeGate('rawAnd', 'AND'),
      makeGate('rawLed', 'OUTPUT_LED', { label: 'RAW_LED' }),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'rst', 'out', 'q0', 'rst'),
      makeWire('w3', 'inA', 'out', 'q0', 'd'),
      makeWire('w4', 'q0', 'q', 'outY', 'in'),
      makeWire('w5', 'q0', 'q', 'rawAnd', 'a'),
      makeWire('w6', 'rawSwitch', 'out', 'rawAnd', 'b'),
      makeWire('w7', 'rawAnd', 'out', 'rawLed', 'in'),
    ]);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    const selectedOption = analysisOptions.find((option) => option.kind === 'projected_fsm');
    expect(selectedOption).toBeTruthy();

    const projected = buildProjectedViewForCircuit(selectedOption!.circuit);
    expect(projected.projectionStatus).toBe('projected');
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: projected.projectionStatus,
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    })).toEqual(['fsm_compact', 'technical_full']);
    expect(getStateTransitionFallbackNote(projected.projectionStatus)).toBe('');
  });

  it('keeps only the technical STT mode for analysis-selected partial-input fallbacks', () => {
    const circuit = makeCircuit([
      projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-upstream'),
      projectedInput('rst', 'RST', 'reset', 'out', 'batch-upstream'),
      projectedState('q0', 'Q0', 'batch-upstream'),
      projectedOutput('outY', 'Y', 'batch-upstream'),
      makeGate('rawSwitch', 'INPUT_SWITCH', { label: 'RAW_IN' }),
      makeGate('rawNot', 'NOT'),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'rst', 'out', 'q0', 'rst'),
      makeWire('w3', 'rawSwitch', 'out', 'rawNot', 'a'),
      makeWire('w4', 'rawNot', 'out', 'q0', 'd'),
      makeWire('w5', 'q0', 'q', 'outY', 'in'),
    ]);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    const selectedOption = analysisOptions.find((option) => Object.keys(option.circuit.gates).includes('rawSwitch'));
    expect(selectedOption?.kind).toBe('generic');

    const projected = buildProjectedViewForCircuit(selectedOption!.circuit);
    expect(projected.projectionStatus).toBe('fallback_partial_inputs');
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: projected.projectionStatus,
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    })).toEqual(['technical_full']);
    expect(getStateTransitionFallbackNote(projected.projectionStatus)).toContain('Eingänge sind nur teilweise projiziert');
  });

  it('keeps only the technical STT mode for analysis-selected partial-state fallbacks', () => {
    const circuit = makeCircuit([
      projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-state'),
      projectedInput('rst', 'RST', 'reset', 'out', 'batch-state'),
      projectedState('q0', 'Q0', 'batch-state'),
      projectedOutput('outY', 'Y', 'batch-state'),
      makeGate('rawReg', 'D_FF_R', { label: 'RAW_Q', customState: { q: 0, prevClk: 0 } }),
      makeGate('rawAnd', 'AND'),
      makeGate('rawLed', 'OUTPUT_LED', { label: 'RAW_LED' }),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'rst', 'out', 'q0', 'rst'),
      makeWire('w3', 'q0', 'q', 'outY', 'in'),
      makeWire('w4', 'clk', 'clk', 'rawReg', 'clk'),
      makeWire('w5', 'rst', 'out', 'rawReg', 'rst'),
      makeWire('w6', 'q0', 'q', 'rawAnd', 'a'),
      makeWire('w7', 'rawReg', 'q', 'rawAnd', 'b'),
      makeWire('w8', 'rawAnd', 'out', 'rawReg', 'd'),
      makeWire('w9', 'rawReg', 'q', 'rawLed', 'in'),
    ]);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    const selectedOption = analysisOptions.find((option) => Object.keys(option.circuit.gates).includes('rawReg'));
    expect(selectedOption?.kind).toBe('generic');

    const projected = buildProjectedViewForCircuit(selectedOption!.circuit);
    expect(projected.projectionStatus).toBe('fallback_partial_state');
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: projected.projectionStatus,
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    })).toEqual(['technical_full']);
    expect(getStateTransitionFallbackNote(projected.projectionStatus)).toContain('nicht alle Zustandsbits');
  });

  it('keeps only the technical STT mode and note for partial-output fallbacks', () => {
    const circuit = makeCircuit([
      projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-output'),
      projectedState('q0', 'Q0', 'batch-output'),
      projectedOutput('outY', 'Y', 'batch-output'),
      makeGate('rawLed', 'OUTPUT_LED', { label: 'RAW' }),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'q0', 'q', 'outY', 'in'),
      makeWire('w3', 'q0', 'q', 'rawLed', 'in'),
    ]);

    const { projected, table } = buildProjectedTableForCircuit(circuit);
    expect(projected.projectionStatus).toBe('fallback_partial_outputs');
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: projected.projectionStatus,
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    })).toEqual(['technical_full']);
    expect(getStateTransitionFallbackNote(projected.projectionStatus)).toContain('Ausgänge sind gemischt oder nur teilweise projiziert');

    const displayed = buildDisplayedStateTransitionTable({
      table,
      mode: 'fsm_compact',
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    });

    expect(displayed.mode).toBe('technical_full');
    expect(displayed.inputs).toEqual(table.inputs);
    expect(displayed.rows).toEqual(table.rows);
    expect(displayed.notes).toEqual([]);
  });

  it('keeps compact STT mode available for analysis-selected legacy projected subsystems', () => {
    const circuit = structuredClone(legacyFsmExportFixture as Circuit);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    const selectedOption = analysisOptions.find((option) => option.kind === 'projected_fsm');
    expect(selectedOption).toBeTruthy();

    const projected = buildProjectedViewForCircuit(selectedOption!.circuit);
    expect(projected.isProjectedFsmView).toBe(true);
    expect(projected.projectionStatus).toBe('legacy_projected');
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: projected.projectionStatus,
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    })).toEqual(['fsm_compact', 'technical_full']);
    expect(getStateTransitionFallbackNote(projected.projectionStatus)).toBe('');
  });

  it('keeps reduced legacy-projected tables locked to compact mode', () => {
    const clk = projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-legacy-reduced');
    const rst = projectedInput('rst', 'RST', 'reset', 'out', 'batch-legacy-reduced');
    const inputs = Array.from({ length: 6 }, (_, index) =>
      projectedInput(`in${index}`, `A${index}`, 'input', 'out', 'batch-legacy-reduced'),
    );
    const q0 = projectedState('q0', 'Q0', 'batch-legacy-reduced');
    const q1 = projectedState('q1', 'Q1', 'batch-legacy-reduced');
    const outY = projectedOutput('outY', 'Y', 'batch-legacy-reduced');
    const circuit = makeCircuit(
      [clk, rst, ...inputs, q0, q1, outY],
      [
        makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
        makeWire('w2', 'rst', 'out', 'q0', 'rst'),
        makeWire('w3', 'in0', 'out', 'q0', 'd'),
        makeWire('w4', 'q0', 'q', 'q1', 'd'),
        makeWire('w5', 'q0', 'q', 'outY', 'in'),
      ],
    );

    const projected = buildStateTransitionProjection(
      circuit,
      [clk, rst, ...inputs],
      [
        { gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' },
        { gateId: 'q1', portId: 'q', stateKey: 'q', label: 'Q1' },
      ],
      [outY],
    );
    expect(projected.isProjectedFsmView).toBe(true);

    const table = buildStaticStateTransitionTable({
      circuit,
      feedbackGateIds: new Set(['q0', 'q1']),
      projectedInputs: projected.inputs,
      projectedStateVars: projected.stateVars,
      projectedOutputGates: projected.outputGates,
      isProjectedFsmView: projected.isProjectedFsmView,
    });
    expect(table.reducedMeta).toBeTruthy();

    const availableModes = getAvailableStateTransitionDisplayModes({
      projectionStatus: 'legacy_projected',
      isProjectedFsmView: projected.isProjectedFsmView,
      reducedMeta: table.reducedMeta,
      inputRoles: projected.inputRoles,
    });
    expect(availableModes).toEqual(['fsm_compact']);

    const displayed = buildDisplayedStateTransitionTable({
      table,
      mode: availableModes[0]!,
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    });

    expect(displayed.mode).toBe('fsm_compact');
    expect(displayed.inputs.map((gate) => gate.label)).toEqual(['A0', 'A1', 'A2', 'A3', 'A4']);
    expect(displayed.stateVars.map((stateVar) => stateVar.label)).toEqual(['Q0']);
    expect(displayed.notes).toEqual([
      'CLK wird als Übergangsereignis interpretiert.',
      'RST=1 ist im Modus "Technisch voll" sichtbar.',
    ]);
    expect(getStateTransitionFallbackNote('legacy_projected')).toBe('');
  });

  it('keeps only the technical STT mode for analysis-selected mixed projection batches', () => {
    const circuit = makeCircuit([
      projectedInput('clkA', 'CLK', 'clock', 'clk', 'batch-a'),
      projectedState('q0A', 'Q0', 'batch-a'),
      projectedOutput('outYA', 'Y', 'batch-a'),
      projectedInput('clkB', 'CLK_B', 'clock', 'clk', 'batch-b'),
      projectedState('q0B', 'QB0', 'batch-b'),
      projectedOutput('outYB', 'YB', 'batch-b'),
    ], [
      makeWire('w1', 'clkA', 'clk', 'q0A', 'clk'),
      makeWire('w2', 'q0A', 'q', 'outYA', 'in'),
      makeWire('w3', 'clkB', 'clk', 'q0B', 'clk'),
      makeWire('w4', 'q0B', 'q', 'outYB', 'in'),
      makeWire('w5', 'q0A', 'q', 'q0B', 'd'),
    ]);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    const selectedOption = analysisOptions.find((option) =>
      Object.keys(option.circuit.gates).includes('q0A') && Object.keys(option.circuit.gates).includes('q0B'),
    );
    expect(selectedOption?.kind).toBe('generic');

    const projected = buildProjectedViewForCircuit(selectedOption!.circuit);
    expect(projected.isProjectedFsmView).toBe(false);
    expect(projected.projectionStatus).toBe('fallback_mixed_batches');
    expect(getAvailableStateTransitionDisplayModes({
      projectionStatus: projected.projectionStatus,
      isProjectedFsmView: projected.isProjectedFsmView,
      inputRoles: projected.inputRoles,
    })).toEqual(['technical_full']);
    expect(getStateTransitionFallbackNote(projected.projectionStatus)).toContain('Mehrere FSM-Projektionsbatches erkannt');
  });

  it('falls back to the technical view when compact mode is requested for a non-projected table', () => {
    const a = makeGate('a', 'INPUT_SWITCH', { label: 'A' });
    const q0 = makeGate('q0', 'D_FF', { label: 'Q0' });
    const outY = makeGate('outY', 'OUTPUT_LED', { label: 'Y' });
    const table = buildStaticStateTransitionTable({
      circuit: makeCircuit(
        [a, q0, outY],
        [
          makeWire('w1', 'a', 'out', 'q0', 'd'),
          makeWire('w2', 'q0', 'q', 'outY', 'in'),
        ],
      ),
      feedbackGateIds: new Set(['q0']),
      projectedInputs: [a],
      projectedStateVars: [{ gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' }],
      projectedOutputGates: [outY],
      isProjectedFsmView: false,
    });

    const compact = buildDisplayedStateTransitionTable({
      table,
      mode: 'fsm_compact',
      isProjectedFsmView: false,
      inputRoles: {},
    });

    expect(compact.mode).toBe('technical_full');
    expect(compact.inputs).toEqual(table.inputs);
    expect(compact.rows).toEqual(table.rows);
  });

  it('falls back for mixed projected and non-projected sequential state carriers', () => {
    const circuit = makeCircuit([
      projectedInput('clk', 'CLK', 'clock', 'clk', 'batch-mixed'),
      projectedState('q0', 'Q0', 'batch-mixed'),
      makeGate('plain', 'D_FF', { label: 'PLAIN' }),
      projectedOutput('outY', 'Y', 'batch-mixed'),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'q0', 'q', 'plain', 'd'),
      makeWire('w3', 'q0', 'q', 'outY', 'in'),
    ]);

    const projected = buildStateTransitionProjection(
      circuit,
      [circuit.gates.clk],
      [
        { gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' },
        { gateId: 'plain', portId: 'q', stateKey: 'q', label: 'PLAIN' },
      ],
      [circuit.gates.outY],
    );

    expect(projected.isProjectedFsmView).toBe(false);
    expect(projected.projectionStatus).toBe('fallback_partial_state');
    expect(projected.stateVars.map((stateVar) => stateVar.label)).toEqual(['Q0', 'PLAIN']);
  });

  it('ignores live gate output signals when rebuilding the downloaded legacy FSM table', () => {
    const pristine = structuredClone(legacyFsmExportFixture as Circuit);
    const polluted = structuredClone(legacyFsmExportFixture as Circuit);

    for (const gate of Object.values(polluted.gates)) {
      if (gate.customState) {
        for (const key of Object.keys(gate.customState)) {
          const value = gate.customState[key];
          if (typeof value === 'number') {
            gate.customState[key] = value === 1 ? 0 : 1;
          }
        }
      }

      const nextSignals: Record<string, SignalState> = {};
      for (const [portId, signal] of Object.entries(gate.outputSignals ?? {})) {
        nextSignals[portId] = {
          value: signal.value === 1 ? 0 : 1,
          version: signal.version + 1,
          lastChangedAt: signal.lastChangedAt + 1,
        };
      }
      gate.outputSignals = nextSignals;
    }

    const pristineTable = buildLegacyFixtureTable(pristine);
    const pollutedTable = buildLegacyFixtureTable(polluted);

    expect(buildStaticAnalysisKey(polluted)).toEqual(buildStaticAnalysisKey(pristine));
    expect(pollutedTable.rows).toEqual(pristineTable.rows);
    expect(pollutedTable.inputs.map((gate) => gate.label)).toEqual(pristineTable.inputs.map((gate) => gate.label));
    expect(pollutedTable.stateVars.map((stateVar) => stateVar.label)).toEqual(pristineTable.stateVars.map((stateVar) => stateVar.label));
    expect(pollutedTable.outputGates.map((gate) => gate.label)).toEqual(pristineTable.outputGates.map((gate) => gate.label));
  });

  it('ignores live signals for a freshly synthesized FSM table as well', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const s2 = 'state-2';
    const s3 = 'state-3';
    const fsm = makeFsm({
      states: {
        [s0]: { id: s0, label: 'S0', x: 100, y: 100, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 300, y: 100, isInitial: false, output: 0 },
        [s2]: { id: s2, label: 'S2', x: 100, y: 300, isInitial: false, output: 1 },
        [s3]: { id: s3, label: 'S3', x: 300, y: 300, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't01', fromId: s0, toId: s1, conditionText: 'A', mealyOutput: 0 },
        { id: 't12', fromId: s1, toId: s2, conditionText: 'A', mealyOutput: 0 },
        { id: 't23', fromId: s2, toId: s3, conditionText: 'A', mealyOutput: 0 },
        { id: 't30', fromId: s3, toId: s0, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const synthesized = synthesizeFsm(fsm, emptyCircuit());
    const pristine = { ...emptyCircuit(), gates: synthesized.gates, wires: synthesized.wires } as Circuit;
    const polluted = structuredClone(pristine);

    for (const gate of Object.values(polluted.gates)) {
      if (gate.customState) {
        for (const key of Object.keys(gate.customState)) {
          const value = gate.customState[key];
          if (typeof value === 'number') {
            gate.customState[key] = value === 1 ? 0 : 1;
          }
        }
      }

      const nextSignals: Record<string, SignalState> = {};
      for (const [portId, signal] of Object.entries(gate.outputSignals ?? {})) {
        nextSignals[portId] = {
          value: signal.value === 1 ? 0 : 1,
          version: signal.version + 1,
          lastChangedAt: signal.lastChangedAt + 1,
        };
      }
      gate.outputSignals = nextSignals;
    }

    const pristineTable = buildLegacyFixtureTable(pristine);
    const pollutedTable = buildLegacyFixtureTable(polluted);

    expect(buildStaticAnalysisKey(polluted)).toEqual(buildStaticAnalysisKey(pristine));
    expect(pollutedTable.rows).toEqual(pristineTable.rows);
  });

  it('keeps post-tick follower outputs settled so q and inverted q stay complementary', () => {
    const clk = makeGate('clk', 'CLOCK', { label: 'CLK' });
    const a = makeGate('a', 'INPUT_SWITCH', { label: 'A' });
    const ff = makeGate('ff', 'D_FF', { label: 'Q0' });
    const inv = makeGate('inv', 'NOT', { label: '!Q0' });
    const ledQ = makeGate('ledQ', 'OUTPUT_LED', { label: 'Q' });
    const ledInv = makeGate('ledInv', 'OUTPUT_LED', { label: '!Q' });
    const table = buildStaticStateTransitionTable({
      circuit: makeCircuit(
        [clk, a, ff, inv, ledQ, ledInv],
        [
          makeWire('w1', 'clk', 'clk', 'ff', 'clk'),
          makeWire('w2', 'a', 'out', 'ff', 'd'),
          makeWire('w3', 'ff', 'q', 'inv', 'a'),
          makeWire('w4', 'ff', 'q', 'ledQ', 'in'),
          makeWire('w5', 'inv', 'out', 'ledInv', 'in'),
        ],
      ),
      feedbackGateIds: new Set(['ff']),
      projectedInputs: [a, clk],
      projectedStateVars: [{ gateId: 'ff', portId: 'q', stateKey: 'q', label: 'Q0' }],
      projectedOutputGates: [ledQ, ledInv],
      isProjectedFsmView: false,
    });

    for (const row of table.rows) {
      expect(row.outputBits).toHaveLength(2);
      expect(row.outputBits[1]).toBe((row.outputBits[0] ^ 1) as 0 | 1);
    }

    const risingWriteRow = table.rows.find((row) =>
      row.inputBits.join('') === '11' && row.stateBits.join('') === '0',
    );
    expect(risingWriteRow?.nextState).toEqual([1]);
    expect(risingWriteRow?.outputBits).toEqual([1, 0]);
  });
});




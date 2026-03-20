import legacyFsmExportFixture from '../../../validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json';
import { describe, expect, it } from 'vitest';
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
  buildStateTransitionProjection,
} from '../../core/analysis/sequentialProjection';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { topologicalSort } from '../../core/simulation/topologicalSort';
import {
  buildDisplayedStateTransitionTable,
  buildStaticAnalysisKey,
  buildStaticStateTransitionTable,
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
});




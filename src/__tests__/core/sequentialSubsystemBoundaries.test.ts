import { describe, expect, it } from 'vitest';
import type { Circuit } from '../../core/types';
import {
  buildAnalysisSubsystemOptions,
  buildProjectedFsmSubsystemOptions,
} from '../../core/analysis/sequentialProjection';
import { collectSequentialSubsystemBoundaries } from '../../core/analysis/sequentialSubsystemBoundaries';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';

function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'fsm-boundary-test',
    name: 'Boundary Test FSM',
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
    id: 'boundary-circ',
    name: 'Boundary Circuit',
    version: '1.0',
    gates: {},
    wires: {},
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '', updatedAt: '' },
  };
}

function makeTwoStateFsm(): FsmMachine {
  const sA = 'state-a';
  const sB = 'state-b';
  return makeFsm({
    states: {
      [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
      [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
    },
    transitions: [
      { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
      { id: 't2', fromId: sA, toId: sA, conditionText: '!A', mealyOutput: 0 },
      { id: 't3', fromId: sB, toId: sA, conditionText: 'A', mealyOutput: 0 },
      { id: 't4', fromId: sB, toId: sB, conditionText: '!A', mealyOutput: 0 },
    ],
  });
}

function makeDisconnectedProjectedCircuit(): Circuit {
  const fsm = makeTwoStateFsm();
  const first = synthesizeFsm(fsm, emptyCircuit());
  const firstCircuit: Circuit = {
    ...emptyCircuit(),
    gates: first.gates,
    wires: first.wires,
  };
  const second = synthesizeFsm(fsm, firstCircuit);

  return {
    ...emptyCircuit(),
    gates: { ...first.gates, ...second.gates },
    wires: { ...first.wires, ...second.wires },
  };
}

function makeChainedProjectedCircuit(): Circuit {
  const disconnected = makeDisconnectedProjectedCircuit();
  const firstState = Object.values(disconnected.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0');
  const secondState = Object.values(disconnected.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');

  expect(firstState).toBeTruthy();
  expect(secondState).toBeTruthy();

  return {
    ...disconnected,
    wires: {
      ...disconnected.wires,
      chain_w1: {
        id: 'chain_w1',
        from: { gateId: firstState!.id, portId: 'q' },
        to: { gateId: secondState!.id, portId: 'd' },
        signal: { value: 0, version: 0, lastChangedAt: 0 },
        isSelected: false,
      },
    },
  };
}

describe('Sequential subsystem boundaries', () => {
  it('creates one clean projected boundary per disconnected synthesized FSM batch', () => {
    const circuit = makeDisconnectedProjectedCircuit();

    const boundaries = collectSequentialSubsystemBoundaries(circuit);

    expect(boundaries).toHaveLength(2);
    expect(boundaries.every((boundary) => boundary.hasProjectedContent)).toBe(true);
    expect(boundaries.every((boundary) => !boundary.hasMixedProjectedBatches)).toBe(true);
    expect(boundaries.map((boundary) => boundary.singleProjectedBatchId).every(Boolean)).toBe(true);

    const subsystemOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(subsystemOptions.map((option) => option.label)).toEqual(['Y', 'Y_1']);
  });

  it('marks directly chained synthesized FSM batches as one mixed projected boundary', () => {
    const circuit = makeChainedProjectedCircuit();

    const boundaries = collectSequentialSubsystemBoundaries(circuit);

    expect(boundaries).toHaveLength(1);
    expect(boundaries[0].hasProjectedContent).toBe(true);
    expect(boundaries[0].hasMixedProjectedBatches).toBe(true);
    expect(boundaries[0].projectedBatchIds).toHaveLength(2);
    expect(boundaries[0].singleProjectedBatchId).toBeNull();

    expect(buildProjectedFsmSubsystemOptions(circuit)).toHaveLength(0);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    expect(analysisOptions).toHaveLength(1);
    expect(analysisOptions[0].kind).toBe('generic');
  });
});

import legacyFsmExportFixture from '../../../validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json';
import { describe, expect, it } from 'vitest';
import type { Circuit } from '../../core/types';
import {
  buildProjectedSequentialSttGates,
  buildSequentialProjectionChannels,
} from '../../core/analysis/sequentialProjection';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';

function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'fsm-projection-test',
    name: 'Projection Test FSM',
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

function loadLegacyFsmExportFixture(): Circuit {
  return legacyFsmExportFixture as Circuit;
}

describe('FSM projection metadata', () => {
  it('annotates synthesized FSM gates with canonical and derived projection roles', () => {
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
      states: {
        [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
        [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: sB, toId: sA, conditionText: '!A', mealyOutput: 0 },
      ],
    });

    const result = synthesizeFsm(fsm, emptyCircuit());
    const gates = Object.values(result.gates);

    const clk = gates.find((gate) => gate.typeId === 'CLOCK');
    expect(clk?.projection).toMatchObject({ sourceSystem: 'fsm_synth', role: 'clock', visibility: 'canonical', signalLabel: 'CLK' });

    const state = gates.find((gate) => gate.typeId === 'D_FF_R');
    expect(state?.projection).toMatchObject({ sourceSystem: 'fsm_synth', role: 'state', visibility: 'canonical', signalLabel: 'Q0', signalPortId: 'q' });

    const outputLed = gates.find((gate) => gate.typeId === 'OUTPUT_LED' && gate.label === 'Y');
    expect(outputLed?.projection).toMatchObject({ sourceSystem: 'fsm_synth', role: 'output', visibility: 'canonical', signalLabel: 'Y', signalPortId: '_display' });

    const stateLed = gates.find((gate) => gate.typeId === 'OUTPUT_LED' && gate.label === 'Q0');
    expect(stateLed?.projection).toMatchObject({ sourceSystem: 'fsm_synth', role: 'display_mirror', visibility: 'derived', signalLabel: 'Q0', signalPortId: '_display' });
  });

  it('builds canonical timing channels for synthesized FSMs without helper duplicates', () => {
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
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

    const result = synthesizeFsm(fsm, emptyCircuit());
    const circuit: Circuit = {
      ...emptyCircuit(),
      gates: result.gates,
      wires: result.wires,
    };

    const channels = buildSequentialProjectionChannels(circuit);
    expect(channels.map((channel) => channel.label)).toEqual(['CLK', 'RST', 'A', 'Q0', 'Y']);
    expect(channels.every((channel) => channel.visibility === 'canonical')).toBe(true);
    expect(channels.some((channel) => channel.label === '!Q0')).toBe(false);
  });

  it('derives canonical STT inputs and outputs for synthesized FSMs', () => {
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

    const result = synthesizeFsm(fsm, emptyCircuit());
    const circuit: Circuit = {
      ...emptyCircuit(),
      gates: result.gates,
      wires: result.wires,
    };

    const projected = buildProjectedSequentialSttGates(circuit);
    expect(projected?.inputs.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A']);
    expect(projected?.outputs.map((gate) => gate.label)).toEqual(['Y']);
  });

  it('assigns one shared projection batch id per synthesize call and unique ids across calls', () => {
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
      states: {
        [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
        [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: sB, toId: sA, conditionText: '!A', mealyOutput: 0 },
      ],
    });

    const first = synthesizeFsm(fsm, emptyCircuit());
    const second = synthesizeFsm(fsm, emptyCircuit());

    const firstBatchIds = new Set(
      Object.values(first.gates)
        .map((gate) => gate.projection?.projectionBatchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    );
    const secondBatchIds = new Set(
      Object.values(second.gates)
        .map((gate) => gate.projection?.projectionBatchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    );

    expect(firstBatchIds.size).toBe(1);
    expect(secondBatchIds.size).toBe(1);
    expect([...firstBatchIds][0]).not.toBe([...secondBatchIds][0]);
  });

  it('falls back to raw sequential projection when batches are mixed', () => {
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
      states: {
        [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
        [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: sB, toId: sA, conditionText: '!A', mealyOutput: 0 },
      ],
    });

    const first = synthesizeFsm(fsm, emptyCircuit());
    const second = synthesizeFsm(fsm, emptyCircuit());
    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: { ...first.gates, ...second.gates },
      wires: { ...first.wires, ...second.wires },
    };

    expect(buildProjectedSequentialSttGates(mixedCircuit)).toBeNull();
    expect(buildSequentialProjectionChannels(mixedCircuit)).toEqual([]);
  });

  it('keeps projected FSM state channels in canonical Q-order', () => {
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

    const result = synthesizeFsm(fsm, emptyCircuit());
    const circuit: Circuit = {
      ...emptyCircuit(),
      gates: result.gates,
      wires: result.wires,
    };

    const channels = buildSequentialProjectionChannels(circuit);
    expect(channels.filter((channel) => channel.role === 'state').map((channel) => channel.label)).toEqual(['Q0', 'Q1']);
  });
  it('reconstructs a canonical legacy FSM projection from the downloaded export fixture', () => {
    const circuit = loadLegacyFsmExportFixture();

    const channels = buildSequentialProjectionChannels(circuit);
    expect(channels.map((channel) => channel.label)).toEqual(['CLK', 'RST', 'A', 'Q0', 'Q1', 'Y']);

    const projected = buildProjectedSequentialSttGates(circuit);
    expect(projected?.inputs.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A']);
    expect(projected?.outputs.map((gate) => gate.label)).toEqual(['Y']);
  });
});

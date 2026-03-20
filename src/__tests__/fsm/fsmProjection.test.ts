import legacyFsmExportFixture from '../../../validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json';
import { describe, expect, it } from 'vitest';
import type { Circuit, GateInstance, Wire } from '../../core/types';
import {
  buildStateTransitionProjection,
  buildProjectedFsmSubsystemOptions,
  buildProjectedSequentialSttGates,
  buildSequentialProjectionChannels,
} from '../../core/analysis/sequentialProjection';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';
import { gateLabel } from '../../components/panels/truthTableAnalysis';
import {
  collectConnectedGateIds,
  collectStateVarsForStt,
  collectSttFeedbackGateIds,
  INPUT_TYPES,
  OUTPUT_TYPES,
} from '../../components/panels/truthTableAnalysis';
import { gateRegistry } from '../../core/registry/GateRegistry';

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

  it('assigns unique canonical signal labels when synthesizing into a circuit that already contains an FSM export', () => {
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
    const firstCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const second = synthesizeFsm(fsm, firstCircuit);
    const secondCircuit: Circuit = {
      ...emptyCircuit(),
      gates: second.gates,
      wires: second.wires,
    };

    const secondChannels = buildSequentialProjectionChannels(secondCircuit);
    expect(secondChannels.map((channel) => channel.label)).toEqual(['CLK_1', 'RST_1', 'A_1', 'Q0_1', 'Y_1']);

    const secondProjected = buildProjectedSequentialSttGates(secondCircuit);
    expect(secondProjected?.inputs.map((gate) => gate.label)).toEqual(['CLK_1', 'RST_1', 'A_1']);
    expect(secondProjected?.outputs.map((gate) => gate.label)).toEqual(['Y_1']);

    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R');
    expect(secondState?.projection).toMatchObject({ signalLabel: 'Q0_1', groupKey: 'state:Q0_1' });

    const secondOutputLed = Object.values(second.gates).find((gate) => gate.typeId === 'OUTPUT_LED' && gate.label === 'Y_1');
    expect(secondOutputLed?.projection).toMatchObject({ signalLabel: 'Y_1', groupKey: 'output:Y_1' });
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

  it('keeps technical-full labels distinct when two synthesized FSMs share the same base signal names', () => {
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
    const firstCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const second = synthesizeFsm(fsm, firstCircuit);
    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: { ...first.gates, ...second.gates },
      wires: { ...first.wires, ...second.wires },
    };

    const inputLabels = Object.values(mixedCircuit.gates)
      .filter((gate) => gate.typeId === 'CLOCK' || gate.typeId === 'INPUT_SWITCH' || gate.typeId === 'PUSH_BTN')
      .map((gate) => gateLabel(gate));
    expect(inputLabels).toEqual(['CLK', 'RST', 'A', 'CLK_1', 'RST_1', 'A_1']);
    expect(new Set(inputLabels).size).toBe(inputLabels.length);

    const outputLabels = Object.values(mixedCircuit.gates)
      .filter((gate) => gate.typeId === 'OUTPUT_LED')
      .map((gate) => gateLabel(gate))
      .sort((a, b) => a.localeCompare(b));
    expect(outputLabels).toEqual(['Q0', 'Q0_1', 'Y', 'Y_1']);
    expect(new Set(outputLabels).size).toBe(outputLabels.length);

    const stateLabels = Object.values(mixedCircuit.gates)
      .filter((gate) => gate.typeId === 'D_FF_R')
      .map((gate) => gateLabel(gate));
    expect(stateLabels).toEqual(['Q0', 'Q0_1']);
    expect(new Set(stateLabels).size).toBe(stateLabels.length);
  });

  it('keeps the single-FSM projection path unchanged when only one synthesized FSM is present', () => {
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
    const circuit: Circuit = {
      ...emptyCircuit(),
      gates: result.gates,
      wires: result.wires,
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(subsystemOptions).toHaveLength(1);
    expect(subsystemOptions[0]?.label).toBe('Y');

    const channels = buildSequentialProjectionChannels(circuit);
    expect(channels.map((channel) => channel.label)).toEqual(['CLK', 'RST', 'A', 'Q0', 'Y']);
  });

  it('builds one projected STT subsystem per disconnected synthesized FSM batch', () => {
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
    const firstCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };
    const second = synthesizeFsm(fsm, firstCircuit);

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: { ...first.gates, ...second.gates },
      wires: { ...first.wires, ...second.wires },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    expect(subsystemOptions.map((option) => option.label)).toEqual(['Y', 'Y_1']);

    const firstSubsystem = subsystemOptions.find((option) => option.label === 'Y');
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');

    expect(buildProjectedSequentialSttGates(firstSubsystem!.circuit)?.inputs.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A']);
    expect(buildProjectedSequentialSttGates(firstSubsystem!.circuit)?.outputs.map((gate) => gate.label)).toEqual(['Y']);
    expect(buildProjectedSequentialSttGates(secondSubsystem!.circuit)?.inputs.map((gate) => gate.label)).toEqual(['CLK_1', 'RST_1', 'A_1']);
    expect(buildProjectedSequentialSttGates(secondSubsystem!.circuit)?.outputs.map((gate) => gate.label)).toEqual(['Y_1']);
  });

  it('keeps raw push-button and LED additions inside the selected FSM subsystem and falls back to technical-full STT', () => {
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
    const firstCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const second = synthesizeFsm(fsm, firstCircuit);
    const secondOutput = Object.values(second.gates).find((gate) => gate.typeId === 'OUTPUT_LED' && gate.label === 'Y_1');
    expect(secondOutput).toBeTruthy();

    const rawPush: GateInstance = {
      id: 'raw-push',
      typeId: 'PUSH_BTN',
      x: 40,
      y: 40,
      label: 'RAW_BTN',
      outputSignals: {},
      isSelected: false,
    };
    const rawLed: GateInstance = {
      id: 'raw-led',
      typeId: 'OUTPUT_LED',
      x: 160,
      y: 40,
      label: 'RAW_LED',
      outputSignals: {},
      isSelected: false,
    };

    const bridgeWire: Wire = {
      id: 'raw-bridge',
      from: { gateId: rawPush.id, portId: 'out' },
      to: { gateId: secondOutput!.id, portId: 'in' },
      signal: { value: 0, version: 0, lastChangedAt: 0 },
      isSelected: false,
    };
    const rawWire: Wire = {
      id: 'raw-wire',
      from: { gateId: rawPush.id, portId: 'out' },
      to: { gateId: rawLed.id, portId: 'in' },
      signal: { value: 0, version: 0, lastChangedAt: 0 },
      isSelected: false,
    };

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: { ...first.gates, ...second.gates, [rawPush.id]: rawPush, [rawLed.id]: rawLed },
      wires: { ...first.wires, ...second.wires, [bridgeWire.id]: bridgeWire, [rawWire.id]: rawWire },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');
    expect(secondSubsystem).toBeTruthy();

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
    const subsystemInputs = Object.values(secondSubsystem!.circuit.gates)
      .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
      .map((gate) => gateLabel(gate))
      .sort((a, b) => a.localeCompare(b));
    const subsystemOutputs = Object.values(secondSubsystem!.circuit.gates)
      .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
      .map((gate) => gateLabel(gate))
      .sort((a, b) => a.localeCompare(b));

    expect(subsystemInputs).toEqual(['A_1', 'CLK_1', 'RAW_BTN', 'RST_1']);
    expect(subsystemOutputs).toEqual(['Q0_1', 'RAW_LED', 'Y_1']);

    const feedbackGateIds = collectSttFeedbackGateIds(
      secondSubsystem!.circuit,
      connectedIds,
      [],
      gateRegistry.get.bind(gateRegistry),
    );
    const stateVars = collectStateVarsForStt(
      secondSubsystem!.circuit,
      connectedIds,
      feedbackGateIds,
      gateRegistry.get.bind(gateRegistry),
    );
    const projectedView = buildStateTransitionProjection(
      secondSubsystem!.circuit,
      Object.values(secondSubsystem!.circuit.gates)
        .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
      stateVars,
      Object.values(secondSubsystem!.circuit.gates)
        .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
    );

    expect(projectedView.isProjectedFsmView).toBe(false);
    expect(projectedView.projectionStatus).toMatch(/^fallback_partial_/);
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

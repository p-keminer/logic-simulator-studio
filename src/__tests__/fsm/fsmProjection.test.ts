import legacyFsmExportFixture from '../../../validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json';
import { describe, expect, it } from 'vitest';
import '../../core/registry/index';
import type { Circuit, GateInstance, Wire } from '../../core/types';
import {
  buildStateTransitionProjection,
  buildAnalysisSubsystemOptions,
  buildProjectedFsmSubsystemOptions,
  buildProjectedSequentialSttGates,
  buildSequentialProjectionChannels,
} from '../../core/analysis/sequentialProjection';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';
import { gateLabel } from '../../components/panels/truthTableAnalysis';
import { buildClipboardDataForSelection } from '../../store/clipboardSelection';
import { buildPastedClipboardContent } from '../../store/pasteClipboardProjection';
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

function cloneCircuit<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeCopiedLegacyFsmCircuit(): Circuit {
  const base = loadLegacyFsmExportFixture();
  const clipboard = buildClipboardDataForSelection(
    base,
    new Set(Object.keys(base.gates)),
  );
  expect(clipboard).toBeTruthy();
  const pasted = buildPastedClipboardContent({
    clipboard: clipboard!,
    existingCircuit: base,
    offsetX: 24,
    offsetY: 24,
    createId: (() => {
      let index = 0;
      return () => `legacy-copy-${++index}`;
    })(),
  });

  return {
    ...cloneCircuit(base),
    gates: {
      ...cloneCircuit(base.gates),
      ...Object.fromEntries(pasted.gates.map((gate) => [gate.id, gate])),
    },
    wires: {
      ...cloneCircuit(base.wires),
      ...Object.fromEntries(pasted.wires.map((wire) => [wire.id, wire])),
    },
  };
}

function makeModifiedLegacyFsmCircuit(): Circuit {
  const circuit = cloneCircuit(loadLegacyFsmExportFixture());
  const clockGate = Object.values(circuit.gates).find((gate) => gate.typeId === 'CLOCK' && gate.label === 'CLK');
  const resetGate = Object.values(circuit.gates).find((gate) => gate.typeId === 'INPUT_SWITCH' && gate.label === 'RST');
  const targetAnd = Object.values(circuit.gates).find((gate) => gate.typeId === 'AND');
  const replacedWire = Object.values(circuit.wires).find((wire) =>
    wire.to.gateId === targetAnd?.id && wire.to.portId === 'a',
  );

  expect(clockGate).toBeTruthy();
  expect(resetGate).toBeTruthy();
  expect(targetAnd).toBeTruthy();
  expect(replacedWire).toBeTruthy();

  const rawAnd: GateInstance = {
    id: 'legacy-raw-and',
    typeId: 'AND',
    x: (targetAnd?.x ?? 0) - 140,
    y: (targetAnd?.y ?? 0) - 80,
    label: 'RAW_CTRL',
    outputSignals: {},
    isSelected: false,
  };

  delete circuit.wires[replacedWire!.id];
  circuit.gates[rawAnd.id] = rawAnd;
  circuit.wires['legacy-raw-clk'] = {
    id: 'legacy-raw-clk',
    from: { gateId: clockGate!.id, portId: 'clk' },
    to: { gateId: rawAnd.id, portId: 'a' },
    signal: { value: 0, version: 0, lastChangedAt: 0 },
    isSelected: false,
  };
  circuit.wires['legacy-raw-rst'] = {
    id: 'legacy-raw-rst',
    from: { gateId: resetGate!.id, portId: 'out' },
    to: { gateId: rawAnd.id, portId: 'b' },
    signal: { value: 0, version: 0, lastChangedAt: 0 },
    isSelected: false,
  };
  circuit.wires['legacy-raw-feed'] = {
    id: 'legacy-raw-feed',
    from: { gateId: rawAnd.id, portId: 'out' },
    to: { gateId: targetAnd!.id, portId: 'a' },
    signal: { value: 0, version: 0, lastChangedAt: 0 },
    isSelected: false,
  };

  return circuit;
}

function makeProjection(
  batchId: string,
  role: 'clock' | 'reset' | 'input' | 'state' | 'output',
  signalLabel: string,
  signalPortId?: string,
) {
  return {
    sourceSystem: 'fsm_synth' as const,
    projectionBatchId: batchId,
    role,
    visibility: 'canonical' as const,
    signalLabel,
    groupKey: `${role}:${signalLabel}`,
    signalPortId,
  };
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

  it('deduplicates subsystem selector entries when a malformed circuit reuses one projection batch across disconnected components', () => {
    const batchId = 'shared-batch';
    const circuit: Circuit = {
      ...emptyCircuit(),
      gates: {
        clk: {
          id: 'clk',
          typeId: 'CLOCK',
          x: 0,
          y: 0,
          label: 'CLK',
          projection: makeProjection(batchId, 'clock', 'CLK', 'clk'),
        } as GateInstance,
        rst: {
          id: 'rst',
          typeId: 'INPUT_SWITCH',
          x: 0,
          y: 80,
          label: 'RST',
          outputSignals: {},
          isSelected: false,
          customState: { value: 0 },
          projection: makeProjection(batchId, 'reset', 'RST', 'out'),
        } as GateInstance,
        inA: {
          id: 'inA',
          typeId: 'INPUT_SWITCH',
          x: 0,
          y: 160,
          label: 'A',
          outputSignals: {},
          isSelected: false,
          customState: { value: 0 },
          projection: makeProjection(batchId, 'input', 'A', 'out'),
        } as GateInstance,
        ffQ0: {
          id: 'ffQ0',
          typeId: 'D_FF_R',
          x: 220,
          y: 80,
          label: 'Q0',
          outputSignals: {},
          isSelected: false,
          customState: { q: 0, prevClk: 0 },
          projection: makeProjection(batchId, 'state', 'Q0', 'q'),
        } as GateInstance,
        outY: {
          id: 'outY',
          typeId: 'OUTPUT_LED',
          x: 420,
          y: 80,
          label: 'Y',
          projection: makeProjection(batchId, 'output', 'Y', '_display'),
        } as GateInstance,
        tapIn: {
          id: 'tapIn',
          typeId: 'INPUT_SWITCH',
          x: 0,
          y: 320,
          label: 'TAP_A',
          outputSignals: {},
          isSelected: false,
          customState: { value: 0 },
          projection: makeProjection(batchId, 'input', 'TAP_A', 'out'),
        } as GateInstance,
        tapOut: {
          id: 'tapOut',
          typeId: 'OUTPUT_LED',
          x: 220,
          y: 320,
          label: 'TAP_Y',
          projection: makeProjection(batchId, 'output', 'TAP_Y', '_display'),
        } as GateInstance,
      },
      wires: {
        w1: { id: 'w1', from: { gateId: 'clk', portId: 'clk' }, to: { gateId: 'ffQ0', portId: 'clk' } } as Wire,
        w2: { id: 'w2', from: { gateId: 'rst', portId: 'out' }, to: { gateId: 'ffQ0', portId: 'rst' } } as Wire,
        w3: { id: 'w3', from: { gateId: 'inA', portId: 'out' }, to: { gateId: 'ffQ0', portId: 'd' } } as Wire,
        w4: { id: 'w4', from: { gateId: 'ffQ0', portId: 'q' }, to: { gateId: 'outY', portId: 'in' } } as Wire,
        w5: { id: 'w5', from: { gateId: 'tapIn', portId: 'out' }, to: { gateId: 'tapOut', portId: 'in' } } as Wire,
      },
    };

    const projectedOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(projectedOptions).toHaveLength(1);
    expect(projectedOptions[0].label).toBe('Y');

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    expect(analysisOptions.filter((option) => option.kind === 'projected_fsm')).toHaveLength(1);
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
    expect(subsystemOptions[0]?.projectionSemantics).toBe('clean_projected_fsm');

    const channels = buildSequentialProjectionChannels(circuit);
    expect(channels.map((channel) => channel.label)).toEqual(['CLK', 'RST', 'A', 'Q0', 'Y']);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    expect(analysisOptions[0]?.projectionSemantics).toBe('clean_projected_fsm');
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

  it('keeps directly chained synthesized FSM batches as one generic technical subsystem', () => {
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

    const firstState = Object.values(first.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0');
    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');
    expect(firstState).toBeTruthy();
    expect(secondState).toBeTruthy();

    const chainedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: { ...first.gates, ...second.gates },
      wires: {
        ...first.wires,
        ...second.wires,
        chain_w1: {
          id: 'chain_w1',
          from: { gateId: firstState!.id, portId: 'q' },
          to: { gateId: secondState!.id, portId: 'd' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    expect(buildProjectedFsmSubsystemOptions(chainedCircuit)).toHaveLength(0);

    const analysisOptions = buildAnalysisSubsystemOptions(chainedCircuit);
    expect(analysisOptions).toHaveLength(1);
    expect(analysisOptions[0]?.kind).toBe('generic');
    expect(analysisOptions[0]?.projectionSemantics).toBe('mixed_projected_subsystem');
    expect(buildSequentialProjectionChannels(analysisOptions[0]!.circuit)).toEqual([]);

    const connectedIds = collectConnectedGateIds(analysisOptions[0]!.circuit);
    const feedbackGateIds = collectSttFeedbackGateIds(
      analysisOptions[0]!.circuit,
      connectedIds,
      [],
      gateRegistry.get.bind(gateRegistry),
    );
    const stateVars = collectStateVarsForStt(
      analysisOptions[0]!.circuit,
      connectedIds,
      feedbackGateIds,
      gateRegistry.get.bind(gateRegistry),
    );
    const projectedView = buildStateTransitionProjection(
      analysisOptions[0]!.circuit,
      Object.values(analysisOptions[0]!.circuit.gates)
        .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
      stateVars,
      Object.values(analysisOptions[0]!.circuit.gates)
        .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
    );

    expect(projectedView.isProjectedFsmView).toBe(false);
    expect(projectedView.projectionStatus).toBe('fallback_mixed_batches');
  });
  it('includes separate raw disconnected circuits in the analysis subsystem selector', () => {
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

    const rawSwitch: GateInstance = {
      id: 'raw-switch',
      typeId: 'INPUT_SWITCH',
      x: 900,
      y: 80,
      label: 'RAW_IN',
      outputSignals: {},
      isSelected: false,
    };
    const rawNot: GateInstance = {
      id: 'raw-not',
      typeId: 'NOT',
      x: 1020,
      y: 80,
      outputSignals: {},
      isSelected: false,
    };
    const rawLed: GateInstance = {
      id: 'raw-led',
      typeId: 'OUTPUT_LED',
      x: 1140,
      y: 80,
      label: 'RAW_LED',
      outputSignals: {},
      isSelected: false,
    };

    const rawCircuit: Circuit = {
      ...emptyCircuit(),
      gates: {
        ...first.gates,
        ...second.gates,
        [rawSwitch.id]: rawSwitch,
        [rawNot.id]: rawNot,
        [rawLed.id]: rawLed,
      },
      wires: {
        ...first.wires,
        ...second.wires,
        raw_w1: {
          id: 'raw_w1',
          from: { gateId: rawSwitch.id, portId: 'out' },
          to: { gateId: rawNot.id, portId: 'a' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_w2: {
          id: 'raw_w2',
          from: { gateId: rawNot.id, portId: 'out' },
          to: { gateId: rawLed.id, portId: 'in' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const subsystemOptions = buildAnalysisSubsystemOptions(rawCircuit);
    expect(subsystemOptions.map((option) => option.label)).toEqual(['RAW_LED', 'Y', 'Y_1']);

    const rawSubsystem = subsystemOptions.find((option) => option.label === 'RAW_LED');
    expect(rawSubsystem?.kind).toBe('generic');
    expect(Object.keys(rawSubsystem!.circuit.gates).sort()).toEqual(['raw-led', 'raw-not', 'raw-switch']);
    expect(buildProjectedSequentialSttGates(rawSubsystem!.circuit)).toBeNull();
  });

  it('trims raw leaf attachments from a projected FSM subsystem selection', () => {
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
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-push');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-led');

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
    const subsystemInputs = Object.values(secondSubsystem!.circuit.gates)
      .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
      .map((gate) => gateLabel(gate))
      .sort((a, b) => a.localeCompare(b));
    const subsystemOutputs = Object.values(secondSubsystem!.circuit.gates)
      .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
      .map((gate) => gateLabel(gate))
      .sort((a, b) => a.localeCompare(b));

    expect(subsystemInputs).toEqual(['A_1', 'CLK_1', 'RST_1']);
    expect(subsystemOutputs).toEqual(['Q0_1', 'Y_1']);

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

    expect(projectedView.isProjectedFsmView).toBe(true);
    expect(projectedView.projectionStatus).toBe('projected');
  });

  it('trims a downstream raw state observer from the projected subsystem and keeps analysis projected', () => {
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
    const secondClock = Object.values(second.gates).find((gate) => gate.typeId === 'CLOCK' && gate.label === 'CLK_1');
    const secondReset = Object.values(second.gates).find((gate) => gate.typeId === 'INPUT_SWITCH' && gate.label === 'RST_1');
    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');
    expect(secondClock).toBeTruthy();
    expect(secondReset).toBeTruthy();
    expect(secondState).toBeTruthy();

    const rawReg: GateInstance = {
      id: 'raw-reg',
      typeId: 'D_FF_R',
      x: 320,
      y: 40,
      label: 'RAW_Q',
      outputSignals: {},
      customState: { q: 0, prevClk: 0 },
      isSelected: false,
    };
    const rawLed: GateInstance = {
      id: 'raw-led',
      typeId: 'OUTPUT_LED',
      x: 460,
      y: 40,
      label: 'RAW_LED',
      outputSignals: {},
      isSelected: false,
    };

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: { ...first.gates, ...second.gates, [rawReg.id]: rawReg, [rawLed.id]: rawLed },
      wires: {
        ...first.wires,
        ...second.wires,
        raw_clk: {
          id: 'raw_clk',
          from: { gateId: secondClock!.id, portId: 'clk' },
          to: { gateId: rawReg.id, portId: 'clk' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_rst: {
          id: 'raw_rst',
          from: { gateId: secondReset!.id, portId: 'out' },
          to: { gateId: rawReg.id, portId: 'rst' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_d: {
          id: 'raw_d',
          from: { gateId: secondState!.id, portId: 'q' },
          to: { gateId: rawReg.id, portId: 'd' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_out: {
          id: 'raw_out',
          from: { gateId: rawReg.id, portId: 'q' },
          to: { gateId: rawLed.id, portId: 'in' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');
    expect(secondSubsystem).toBeTruthy();
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-reg');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-led');

    const analysisOptions = buildAnalysisSubsystemOptions(mixedCircuit);
    const secondAnalysisOption = analysisOptions.find((option) =>
      option.kind === 'projected_fsm' && Object.keys(option.circuit.gates).includes(secondState!.id),
    );
    expect(secondAnalysisOption?.kind).toBe('projected_fsm');
    expect(analysisOptions.some((option) => Object.keys(option.circuit.gates).includes('raw-reg'))).toBe(false);

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
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

    expect(projectedView.isProjectedFsmView).toBe(true);
    expect(projectedView.projectionStatus).toBe('projected');
  });

  it('keeps an upstream raw driver attached to the projected subsystem and falls back via partial inputs', () => {
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
    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');
    expect(secondState).toBeTruthy();

    const rawSwitch: GateInstance = {
      id: 'raw-switch',
      typeId: 'INPUT_SWITCH',
      x: 40,
      y: 40,
      label: 'RAW_IN',
      outputSignals: {},
      isSelected: false,
    };

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: { ...first.gates, ...second.gates, [rawSwitch.id]: rawSwitch },
      wires: {
        ...first.wires,
        ...second.wires,
        raw_drive: {
          id: 'raw_drive',
          from: { gateId: rawSwitch.id, portId: 'out' },
          to: { gateId: secondState!.id, portId: 'd' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');
    expect(secondSubsystem).toBeTruthy();
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).toContain('raw-switch');

    const analysisOptions = buildAnalysisSubsystemOptions(mixedCircuit);
    const mixedAnalysisOption = analysisOptions.find((option) => Object.keys(option.circuit.gates).includes('raw-switch'));
    expect(mixedAnalysisOption).toBeTruthy();
    expect(mixedAnalysisOption?.kind).toBe('generic');
    expect(mixedAnalysisOption?.projectionSemantics).toBe('modified_projected_fsm');
    expect(
      analysisOptions.some((option) => option.kind === 'projected_fsm' && Object.keys(option.circuit.gates).includes('raw-switch')),
    ).toBe(false);

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
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
    expect(projectedView.projectionStatus).toBe('fallback_partial_inputs');
  });

  it('keeps a multi-stage upstream raw driver chain attached to the projected subsystem and falls back via partial inputs', () => {
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
    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');
    expect(secondState).toBeTruthy();

    const rawSwitch: GateInstance = {
      id: 'raw-switch',
      typeId: 'INPUT_SWITCH',
      x: 40,
      y: 40,
      label: 'RAW_IN',
      outputSignals: {},
      isSelected: false,
    };
    const rawNot: GateInstance = {
      id: 'raw-not',
      typeId: 'NOT',
      x: 180,
      y: 40,
      outputSignals: {},
      isSelected: false,
    };

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: {
        ...first.gates,
        ...second.gates,
        [rawSwitch.id]: rawSwitch,
        [rawNot.id]: rawNot,
      },
      wires: {
        ...first.wires,
        ...second.wires,
        raw_chain_1: {
          id: 'raw_chain_1',
          from: { gateId: rawSwitch.id, portId: 'out' },
          to: { gateId: rawNot.id, portId: 'a' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_chain_2: {
          id: 'raw_chain_2',
          from: { gateId: rawNot.id, portId: 'out' },
          to: { gateId: secondState!.id, portId: 'd' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');
    expect(secondSubsystem).toBeTruthy();
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).toContain('raw-switch');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).toContain('raw-not');

    const analysisOptions = buildAnalysisSubsystemOptions(mixedCircuit);
    const mixedAnalysisOption = analysisOptions.find((option) => Object.keys(option.circuit.gates).includes('raw-switch'));
    expect(mixedAnalysisOption).toBeTruthy();
    expect(mixedAnalysisOption?.kind).toBe('generic');
    expect(mixedAnalysisOption?.projectionSemantics).toBe('modified_projected_fsm');
    expect(
      analysisOptions.some((option) =>
        option.kind === 'projected_fsm'
        && (Object.keys(option.circuit.gates).includes('raw-switch') || Object.keys(option.circuit.gates).includes('raw-not'))),
    ).toBe(false);

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
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
    expect(projectedView.projectionStatus).toBe('fallback_partial_inputs');
  });

  it('trims a downstream raw combinational observer cone and keeps analysis projected', () => {
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
    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');
    expect(secondState).toBeTruthy();

    const rawSwitch: GateInstance = {
      id: 'raw-switch',
      typeId: 'INPUT_SWITCH',
      x: 320,
      y: 20,
      label: 'RAW_IN',
      outputSignals: {},
      isSelected: false,
    };
    const rawAnd: GateInstance = {
      id: 'raw-and',
      typeId: 'AND',
      x: 460,
      y: 40,
      outputSignals: {},
      isSelected: false,
    };
    const rawLed: GateInstance = {
      id: 'raw-led',
      typeId: 'OUTPUT_LED',
      x: 600,
      y: 40,
      label: 'RAW_LED',
      outputSignals: {},
      isSelected: false,
    };

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: {
        ...first.gates,
        ...second.gates,
        [rawSwitch.id]: rawSwitch,
        [rawAnd.id]: rawAnd,
        [rawLed.id]: rawLed,
      },
      wires: {
        ...first.wires,
        ...second.wires,
        raw_seed: {
          id: 'raw_seed',
          from: { gateId: secondState!.id, portId: 'q' },
          to: { gateId: rawAnd.id, portId: 'a' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_input: {
          id: 'raw_input',
          from: { gateId: rawSwitch.id, portId: 'out' },
          to: { gateId: rawAnd.id, portId: 'b' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_out: {
          id: 'raw_out',
          from: { gateId: rawAnd.id, portId: 'out' },
          to: { gateId: rawLed.id, portId: 'in' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');
    expect(secondSubsystem).toBeTruthy();
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-switch');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-and');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-led');

    const analysisOptions = buildAnalysisSubsystemOptions(mixedCircuit);
    const secondAnalysisOption = analysisOptions.find((option) =>
      option.kind === 'projected_fsm' && Object.keys(option.circuit.gates).includes(secondState!.id),
    );
    expect(secondAnalysisOption?.kind).toBe('projected_fsm');
    expect(analysisOptions.some((option) => Object.keys(option.circuit.gates).includes('raw-and'))).toBe(false);

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
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

    expect(projectedView.isProjectedFsmView).toBe(true);
    expect(projectedView.projectionStatus).toBe('projected');
  });

  it('trims a downstream raw observer cone with a stateful sink branch and keeps analysis projected', () => {
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
    const secondClock = Object.values(second.gates).find((gate) => gate.typeId === 'CLOCK' && gate.label === 'CLK_1');
    const secondReset = Object.values(second.gates).find((gate) => gate.typeId === 'INPUT_SWITCH' && gate.label === 'RST_1');
    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');
    expect(secondClock).toBeTruthy();
    expect(secondReset).toBeTruthy();
    expect(secondState).toBeTruthy();

    const rawNot: GateInstance = {
      id: 'raw-not',
      typeId: 'NOT',
      x: 320,
      y: 40,
      outputSignals: {},
      isSelected: false,
    };
    const rawReg: GateInstance = {
      id: 'raw-reg',
      typeId: 'D_FF_R',
      x: 460,
      y: 40,
      label: 'RAW_Q',
      outputSignals: {},
      customState: { q: 0, prevClk: 0 },
      isSelected: false,
    };
    const rawLed: GateInstance = {
      id: 'raw-led',
      typeId: 'OUTPUT_LED',
      x: 460,
      y: -40,
      label: 'RAW_LED',
      outputSignals: {},
      isSelected: false,
    };
    const rawLed2: GateInstance = {
      id: 'raw-led-2',
      typeId: 'OUTPUT_LED',
      x: 600,
      y: 40,
      label: 'RAW_LED_2',
      outputSignals: {},
      isSelected: false,
    };

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: {
        ...first.gates,
        ...second.gates,
        [rawNot.id]: rawNot,
        [rawReg.id]: rawReg,
        [rawLed.id]: rawLed,
        [rawLed2.id]: rawLed2,
      },
      wires: {
        ...first.wires,
        ...second.wires,
        raw_seed: {
          id: 'raw_seed',
          from: { gateId: secondState!.id, portId: 'q' },
          to: { gateId: rawNot.id, portId: 'a' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_branch_led: {
          id: 'raw_branch_led',
          from: { gateId: rawNot.id, portId: 'out' },
          to: { gateId: rawLed.id, portId: 'in' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_branch_reg: {
          id: 'raw_branch_reg',
          from: { gateId: rawNot.id, portId: 'out' },
          to: { gateId: rawReg.id, portId: 'd' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_clk: {
          id: 'raw_clk',
          from: { gateId: secondClock!.id, portId: 'clk' },
          to: { gateId: rawReg.id, portId: 'clk' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_rst: {
          id: 'raw_rst',
          from: { gateId: secondReset!.id, portId: 'out' },
          to: { gateId: rawReg.id, portId: 'rst' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_state_led: {
          id: 'raw_state_led',
          from: { gateId: rawReg.id, portId: 'q' },
          to: { gateId: rawLed2.id, portId: 'in' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');
    expect(secondSubsystem).toBeTruthy();
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-not');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-reg');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-led');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).not.toContain('raw-led-2');

    const analysisOptions = buildAnalysisSubsystemOptions(mixedCircuit);
    const secondAnalysisOption = analysisOptions.find((option) =>
      option.kind === 'projected_fsm' && Object.keys(option.circuit.gates).includes(secondState!.id),
    );
    expect(secondAnalysisOption?.kind).toBe('projected_fsm');
    expect(analysisOptions.some((option) => Object.keys(option.circuit.gates).includes('raw-reg'))).toBe(false);

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
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

    expect(projectedView.isProjectedFsmView).toBe(true);
    expect(projectedView.projectionStatus).toBe('projected');
  });

  it('keeps an attached raw sequential loop inside the selected subsystem and stays in technical fallback', () => {
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
    const secondClock = Object.values(second.gates).find((gate) => gate.typeId === 'CLOCK' && gate.label === 'CLK_1');
    const secondReset = Object.values(second.gates).find((gate) => gate.typeId === 'INPUT_SWITCH' && gate.label === 'RST_1');
    const secondState = Object.values(second.gates).find((gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1');
    expect(secondClock).toBeTruthy();
    expect(secondReset).toBeTruthy();
    expect(secondState).toBeTruthy();

    const rawReg: GateInstance = {
      id: 'raw-reg',
      typeId: 'D_FF_R',
      x: 320,
      y: 40,
      label: 'RAW_Q',
      outputSignals: {},
      customState: { q: 0, prevClk: 0 },
      isSelected: false,
    };
    const rawAnd: GateInstance = {
      id: 'raw-and',
      typeId: 'AND',
      x: 460,
      y: 40,
      outputSignals: {},
      isSelected: false,
    };
    const rawLed: GateInstance = {
      id: 'raw-led',
      typeId: 'OUTPUT_LED',
      x: 600,
      y: 40,
      label: 'RAW_LED',
      outputSignals: {},
      isSelected: false,
    };

    const mixedCircuit: Circuit = {
      ...emptyCircuit(),
      gates: {
        ...first.gates,
        ...second.gates,
        [rawReg.id]: rawReg,
        [rawAnd.id]: rawAnd,
        [rawLed.id]: rawLed,
      },
      wires: {
        ...first.wires,
        ...second.wires,
        raw_clk: {
          id: 'raw_clk',
          from: { gateId: secondClock!.id, portId: 'clk' },
          to: { gateId: rawReg.id, portId: 'clk' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_rst: {
          id: 'raw_rst',
          from: { gateId: secondReset!.id, portId: 'out' },
          to: { gateId: rawReg.id, portId: 'rst' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_seed: {
          id: 'raw_seed',
          from: { gateId: secondState!.id, portId: 'q' },
          to: { gateId: rawAnd.id, portId: 'a' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_feedback: {
          id: 'raw_feedback',
          from: { gateId: rawReg.id, portId: 'q' },
          to: { gateId: rawAnd.id, portId: 'b' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_d: {
          id: 'raw_d',
          from: { gateId: rawAnd.id, portId: 'out' },
          to: { gateId: rawReg.id, portId: 'd' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
        raw_out: {
          id: 'raw_out',
          from: { gateId: rawReg.id, portId: 'q' },
          to: { gateId: rawLed.id, portId: 'in' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const subsystemOptions = buildProjectedFsmSubsystemOptions(mixedCircuit);
    const secondSubsystem = subsystemOptions.find((option) => option.label === 'Y_1');
    expect(secondSubsystem).toBeTruthy();
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).toContain('raw-reg');
    expect(Object.keys(secondSubsystem!.circuit.gates).sort()).toContain('raw-and');

    const analysisOptions = buildAnalysisSubsystemOptions(mixedCircuit);
    const mixedAnalysisOption = analysisOptions.find((option) => Object.keys(option.circuit.gates).includes('raw-reg'));
    expect(mixedAnalysisOption).toBeTruthy();
    expect(mixedAnalysisOption?.kind).toBe('generic');
    expect(mixedAnalysisOption?.projectionSemantics).toBe('modified_projected_fsm');
    expect(
      analysisOptions.some((option) => option.kind === 'projected_fsm' && Object.keys(option.circuit.gates).includes('raw-reg')),
    ).toBe(false);

    const connectedIds = collectConnectedGateIds(secondSubsystem!.circuit);
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
    expect(projectedView.projectionStatus).toBe('fallback_partial_state');
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

  it('keeps the downloaded legacy export fixture on the projected analysis path', () => {
    const circuit = loadLegacyFsmExportFixture();

    const projectedSubsystemOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(projectedSubsystemOptions.map((option) => option.label)).toEqual(['Y']);
    expect(projectedSubsystemOptions[0]?.projectionSemantics).toBe('legacy_projected_fsm');

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'projected_fsm', projectionSemantics: 'legacy_projected_fsm' },
    ]);

    const subsystemCircuit = analysisOptions[0].circuit;
    const connectedIds = collectConnectedGateIds(subsystemCircuit);
    const feedbackGateIds = collectSttFeedbackGateIds(
      subsystemCircuit,
      connectedIds,
      [],
      gateRegistry.get.bind(gateRegistry),
    );
    const stateVars = collectStateVarsForStt(
      subsystemCircuit,
      connectedIds,
      feedbackGateIds,
      gateRegistry.get.bind(gateRegistry),
    );
    const projectedView = buildStateTransitionProjection(
      subsystemCircuit,
      Object.values(subsystemCircuit.gates)
        .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
      stateVars,
      Object.values(subsystemCircuit.gates)
        .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
    );

    expect(projectedView.isProjectedFsmView).toBe(true);
    expect(projectedView.projectionStatus).toBe('legacy_projected');
    expect(projectedView.inputs.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A']);
    expect(projectedView.stateVars.map((stateVar) => stateVar.label)).toEqual(['Q0', 'Q1']);
    expect(projectedView.outputGates.map((gate) => gate.label)).toEqual(['Y']);
  });

  it('reconstructs two separately selectable legacy FSM batches after copying a loaded export', () => {
    const circuit = makeCopiedLegacyFsmCircuit();

    const projectedSubsystemOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(projectedSubsystemOptions.map((option) => ({
      label: option.label,
      semantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', semantics: 'legacy_projected_fsm' },
      { label: 'Y_1', semantics: 'legacy_projected_fsm' },
    ]);

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'projected_fsm', projectionSemantics: 'legacy_projected_fsm' },
      { label: 'Y_1', kind: 'projected_fsm', projectionSemantics: 'legacy_projected_fsm' },
    ]);
  });

  it('drops modified legacy exports out of the compact projected FSM path', () => {
    const circuit = makeModifiedLegacyFsmCircuit();

    const projectedSubsystemOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(projectedSubsystemOptions.map((option) => option.label)).toEqual(['Y']);
    expect(Object.keys(projectedSubsystemOptions[0]!.circuit.gates)).toContain('legacy-raw-and');

    const analysisOptions = buildAnalysisSubsystemOptions(circuit);
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'generic', projectionSemantics: 'modified_projected_fsm' },
    ]);

    expect(buildSequentialProjectionChannels(analysisOptions[0]!.circuit)).toEqual([]);

    const subsystemCircuit = analysisOptions[0]!.circuit;
    const connectedIds = collectConnectedGateIds(subsystemCircuit);
    const feedbackGateIds = collectSttFeedbackGateIds(
      subsystemCircuit,
      connectedIds,
      [],
      gateRegistry.get.bind(gateRegistry),
    );
    const stateVars = collectStateVarsForStt(
      subsystemCircuit,
      connectedIds,
      feedbackGateIds,
      gateRegistry.get.bind(gateRegistry),
    );
    const projectedView = buildStateTransitionProjection(
      subsystemCircuit,
      Object.values(subsystemCircuit.gates)
        .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
      stateVars,
      Object.values(subsystemCircuit.gates)
        .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
        .sort((a, b) => a.x - b.x),
    );

    expect(projectedView.isProjectedFsmView).toBe(false);
    expect(projectedView.projectionStatus).toBe('fallback_partial_inputs');
  });
});

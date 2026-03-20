import { describe, expect, it } from 'vitest';
import type { Circuit, GateInstance, Wire } from '../../core/types';
import { buildProjectedFsmSubsystemOptions } from '../../core/analysis/sequentialProjection';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';
import { buildClipboardProjectionBatchPolicies, buildPastedClipboardContent } from '../../store/pasteClipboardProjection';

function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'fsm-paste-test',
    name: 'Paste Test FSM',
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
    id: 'paste-circ',
    name: 'Paste Circuit',
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
      { id: 't2', fromId: sB, toId: sA, conditionText: '!A', mealyOutput: 0 },
    ],
  });
}

function combineCircuit(base: Circuit, additions: { gates: GateInstance[]; wires: Wire[] }): Circuit {
  return {
    ...base,
    gates: {
      ...base.gates,
      ...Object.fromEntries(additions.gates.map((gate) => [gate.id, gate])),
    },
    wires: {
      ...base.wires,
      ...Object.fromEntries(additions.wires.map((wire) => [wire.id, wire])),
    },
  };
}

describe('FSM paste projection helper', () => {
  it('regenerates projection batch ids and canonical labels for full copied FSM batches', () => {
    const fsm = makeTwoStateFsm();
    const first = synthesizeFsm(fsm, emptyCircuit());
    const existingCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const selectedGateIds = new Set(Object.keys(first.gates));
    const clipboard = {
      gates: Object.values(first.gates),
      wires: Object.values(first.wires),
      fsmProjectionBatchPolicies: buildClipboardProjectionBatchPolicies(existingCircuit, selectedGateIds),
    };

    const pasted = buildPastedClipboardContent({
      clipboard,
      existingCircuit,
      offsetX: 24,
      offsetY: 24,
      createId: (() => {
        let index = 0;
        return () => `paste-${++index}`;
      })(),
    });

    const originalBatchIds = new Set(
      Object.values(first.gates)
        .map((gate) => gate.projection?.projectionBatchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    );
    const pastedBatchIds = new Set(
      pasted.gates
        .map((gate) => gate.projection?.projectionBatchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    );

    expect(originalBatchIds.size).toBe(1);
    expect(pastedBatchIds.size).toBe(1);
    expect([...pastedBatchIds][0]).not.toBe([...originalBatchIds][0]);

    const combined = combineCircuit(existingCircuit, pasted);
    const subsystemLabels = buildProjectedFsmSubsystemOptions(combined)
      .map((option) => option.label)
      .sort((a, b) => a.localeCompare(b));
    expect(subsystemLabels).toEqual(['Y', 'Y_1']);

    const pastedCanonicalLabels = pasted.gates
      .filter((gate) => gate.projection?.visibility === 'canonical')
      .map((gate) => gate.label)
      .sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    expect(pastedCanonicalLabels).toEqual(['A_1', 'CLK_1', 'Q0_1', 'RST_1', 'Y_1']);
  });

  it('drops projection metadata for partial copied FSM batches while keeping labels unique', () => {
    const fsm = makeTwoStateFsm();
    const first = synthesizeFsm(fsm, emptyCircuit());
    const existingCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const selectedCanonicalGates = Object.values(first.gates).filter(
      (gate) => gate.projection?.visibility === 'canonical',
    );
    const selectedGateIds = new Set(selectedCanonicalGates.map((gate) => gate.id));
    const selectedWires = Object.values(first.wires).filter(
      (wire) => selectedGateIds.has(wire.from.gateId) && selectedGateIds.has(wire.to.gateId),
    );

    const clipboard = {
      gates: selectedCanonicalGates,
      wires: selectedWires,
      fsmProjectionBatchPolicies: buildClipboardProjectionBatchPolicies(existingCircuit, selectedGateIds),
    };

    const pasted = buildPastedClipboardContent({
      clipboard,
      existingCircuit,
      offsetX: 24,
      offsetY: 24,
      createId: (() => {
        let index = 100;
        return () => `partial-${++index}`;
      })(),
    });

    expect(pasted.gates.every((gate) => gate.projection === undefined)).toBe(true);
    expect(
      pasted.gates
        .map((gate) => gate.label)
        .sort((a, b) => (a ?? '').localeCompare(b ?? '')),
    ).toEqual(['A_1', 'CLK_1', 'Q0_1', 'RST_1', 'Y_1']);
  });

  it('keeps raw additions raw when a full FSM subsystem with manual extras is copied', () => {
    const fsm = makeTwoStateFsm();
    const first = synthesizeFsm(fsm, emptyCircuit());
    const existingCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const outputGate = Object.values(first.gates).find((gate) => gate.typeId === 'OUTPUT_LED' && gate.label === 'Y');
    expect(outputGate).toBeTruthy();

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
      to: { gateId: outputGate!.id, portId: 'in' },
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
    const augmentedCircuit: Circuit = {
      ...existingCircuit,
      gates: { ...existingCircuit.gates, [rawPush.id]: rawPush, [rawLed.id]: rawLed },
      wires: { ...existingCircuit.wires, [bridgeWire.id]: bridgeWire, [rawWire.id]: rawWire },
    };

    const selectedGateIds = new Set(Object.keys(augmentedCircuit.gates));
    const clipboard = {
      gates: Object.values(augmentedCircuit.gates),
      wires: Object.values(augmentedCircuit.wires),
      fsmProjectionBatchPolicies: buildClipboardProjectionBatchPolicies(augmentedCircuit, selectedGateIds),
    };

    const pasted = buildPastedClipboardContent({
      clipboard,
      existingCircuit: augmentedCircuit,
      offsetX: 24,
      offsetY: 24,
      createId: (() => {
        let index = 200;
        return () => `aug-${++index}`;
      })(),
    });

    const rawLabels = pasted.gates
      .filter((gate) => gate.label?.startsWith('RAW_'))
      .map((gate) => gate.label)
      .sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    expect(rawLabels).toEqual(['RAW_BTN_1', 'RAW_LED_1']);

    const projectedCanonicalLabels = pasted.gates
      .filter((gate) => gate.projection?.visibility === 'canonical')
      .map((gate) => gate.label)
      .sort((a, b) => (a ?? '').localeCompare(b ?? ''));
    expect(projectedCanonicalLabels).toEqual(['A_1', 'CLK_1', 'Q0_1', 'RST_1', 'Y_1']);
  });
});

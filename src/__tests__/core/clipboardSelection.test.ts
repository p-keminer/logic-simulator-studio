import { describe, expect, it } from 'vitest';
import type { Circuit } from '../../core/types';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';
import { buildClipboardDataForSelection } from '../../store/clipboardSelection';
import { buildPastedClipboardContent } from '../../store/pasteClipboardProjection';
import {
  buildAnalysisSubsystemOptions,
  buildStateTransitionProjection,
} from '../../core/analysis/sequentialProjection';
import { gateRegistry } from '../../core/registry';
import {
  INPUT_TYPES,
  OUTPUT_TYPES,
  collectConnectedGateIds,
  collectStateVarsForStt,
  collectSttFeedbackGateIds,
} from '../../components/panels/truthTableAnalysis';

function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'fsm-clipboard-selection',
    name: 'Clipboard Selection FSM',
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
    id: 'clipboard-selection-circ',
    name: 'Clipboard Selection Circuit',
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

describe('clipboard selection helper', () => {
  it('preserves projection paste policies for a full synthesized FSM selection', () => {
    const first = synthesizeFsm(makeTwoStateFsm(), emptyCircuit());
    const existingCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const clipboard = buildClipboardDataForSelection(
      existingCircuit,
      new Set(Object.keys(existingCircuit.gates)),
    );

    expect(clipboard).toBeTruthy();
    expect(clipboard?.fsmProjectionBatchPolicies).toBeTruthy();
    expect(Object.values(clipboard?.fsmProjectionBatchPolicies ?? {})).toEqual(['regenerate']);

    const pasted = buildPastedClipboardContent({
      clipboard: clipboard!,
      existingCircuit,
      offsetX: 24,
      offsetY: 24,
      createId: (() => {
        let index = 0;
        return () => `sel-${++index}`;
      })(),
    });

    const combined: Circuit = {
      ...existingCircuit,
      gates: {
        ...existingCircuit.gates,
        ...Object.fromEntries(pasted.gates.map((gate) => [gate.id, gate])),
      },
      wires: {
        ...existingCircuit.wires,
        ...Object.fromEntries(pasted.wires.map((wire) => [wire.id, wire])),
      },
    };

    expect(
      buildAnalysisSubsystemOptions(combined)
        .map((option) => option.label)
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(['Y', 'Y_1']);
  });

  it('keeps copied FSM batches distinct so chained copies fall back as mixed batches', () => {
    const first = synthesizeFsm(makeTwoStateFsm(), emptyCircuit());
    const existingCircuit: Circuit = {
      ...emptyCircuit(),
      gates: first.gates,
      wires: first.wires,
    };

    const clipboard = buildClipboardDataForSelection(
      existingCircuit,
      new Set(Object.keys(existingCircuit.gates)),
    );
    const pasted = buildPastedClipboardContent({
      clipboard: clipboard!,
      existingCircuit,
      offsetX: 24,
      offsetY: 24,
      createId: (() => {
        let index = 100;
        return () => `chain-${++index}`;
      })(),
    });

    const firstState = Object.values(existingCircuit.gates).find(
      (gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0',
    );
    const secondState = pasted.gates.find(
      (gate) => gate.typeId === 'D_FF_R' && gate.label === 'Q0_1',
    );

    expect(firstState).toBeTruthy();
    expect(secondState).toBeTruthy();

    const chainedCircuit: Circuit = {
      ...existingCircuit,
      gates: {
        ...existingCircuit.gates,
        ...Object.fromEntries(pasted.gates.map((gate) => [gate.id, gate])),
      },
      wires: {
        ...existingCircuit.wires,
        ...Object.fromEntries(pasted.wires.map((wire) => [wire.id, wire])),
        chainWire: {
          id: 'chainWire',
          from: { gateId: firstState!.id, portId: 'q' },
          to: { gateId: secondState!.id, portId: 'd' },
          signal: { value: 0, version: 0, lastChangedAt: 0 },
          isSelected: false,
        },
      },
    };

    const connectedIds = collectConnectedGateIds(chainedCircuit);
    const feedbackGateIds = collectSttFeedbackGateIds(
      chainedCircuit,
      connectedIds,
      [],
      gateRegistry.get.bind(gateRegistry),
    );
    const stateVars = collectStateVarsForStt(
      chainedCircuit,
      connectedIds,
      feedbackGateIds,
      gateRegistry.get.bind(gateRegistry),
    );
    const inputs = Object.values(chainedCircuit.gates)
      .filter((gate) => INPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
      .sort((a, b) => a.x - b.x);
    const outputGates = Object.values(chainedCircuit.gates)
      .filter((gate) => OUTPUT_TYPES.has(gate.typeId) && connectedIds.has(gate.id))
      .sort((a, b) => a.x - b.x);

    const projectedView = buildStateTransitionProjection(
      chainedCircuit,
      inputs,
      stateVars,
      outputGates,
    );

    expect(projectedView.isProjectedFsmView).toBe(false);
    expect(projectedView.projectionStatus).toBe('fallback_mixed_batches');
  });
});

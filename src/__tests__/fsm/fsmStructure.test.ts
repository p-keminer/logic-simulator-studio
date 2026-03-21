import { describe, expect, it } from 'vitest';
import { analyzeFsmStructure, requireFsmStructure } from '../../fsm/analysis/structure';
import type { FsmMachine } from '../../fsm/types';

function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'fsm-structure-test',
    name: 'Structure Test FSM',
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

describe('FSM structure analysis', () => {
  it('computes reachable states, unreachable states, encoding, and effective bit width centrally', () => {
    const initial = 'state-initial';
    const middle = 'state-middle';
    const done = 'state-done';
    const dead = 'state-dead';
    const fsm = makeFsm({
      states: {
        [initial]: { id: initial, label: 'BOOT', x: 0, y: 0, isInitial: true, output: 0 },
        [middle]: { id: middle, label: 'ALPHA', x: 100, y: 0, isInitial: false, output: 0 },
        [done]: { id: done, label: 'OMEGA', x: 200, y: 0, isInitial: false, output: 1 },
        [dead]: { id: dead, label: 'DEAD', x: 300, y: 0, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't0', fromId: initial, toId: middle, conditionText: 'A', mealyOutput: 0 },
        { id: 't1', fromId: middle, toId: done, conditionText: '!A', mealyOutput: 0 },
        { id: 't2', fromId: dead, toId: dead, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const structure = requireFsmStructure(fsm);

    expect(structure.initialState!.id).toBe(initial);
    expect(structure.orderedStates.map((state) => state.label)).toEqual(['BOOT', 'ALPHA', 'DEAD', 'OMEGA']);
    expect(structure.reachableStates.map((state) => state.label)).toEqual(['BOOT', 'ALPHA', 'OMEGA']);
    expect(structure.unreachableStates.map((state) => state.label)).toEqual(['DEAD']);
    expect(structure.encodingByStateId.get(initial)).toBe(0);
    expect(structure.encodingByStateId.get(middle)).toBe(1);
    expect(structure.encodingByStateId.get(done)).toBe(2);
    expect(structure.encodingByStateId.has(dead)).toBe(false);
    expect(structure.effectiveStateCount).toBe(3);
    expect(structure.effectiveBitWidth).toBe(2);
    expect(structure.effectiveTransitions.map((transition) => transition.id)).toEqual(['t0', 't1']);
  });

  it('keeps malformed transitions from reachable states in the effective transition set', () => {
    const initial = 'state-initial';
    const live = 'state-live';
    const dead = 'state-dead';
    const fsm = makeFsm({
      states: {
        [initial]: { id: initial, label: 'INIT', x: 0, y: 0, isInitial: true, output: 0 },
        [live]: { id: live, label: 'LIVE', x: 100, y: 0, isInitial: false, output: 0 },
        [dead]: { id: dead, label: 'DEAD', x: 200, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't0', fromId: initial, toId: live, conditionText: 'A', mealyOutput: 0 },
        { id: 't1', fromId: live, toId: 'missing-state', conditionText: '!A', mealyOutput: 0 },
        { id: 't2', fromId: dead, toId: dead, conditionText: 'A B', mealyOutput: 0 },
      ],
    });

    const structure = requireFsmStructure(fsm);

    expect(structure.effectiveTransitions.map((transition) => transition.id)).toEqual(['t0', 't1']);
    expect(structure.unreachableStates.map((state) => state.id)).toEqual([dead]);
  });

  it('throws when the FSM has no unique initial state', () => {
    expect(() => requireFsmStructure(makeFsm())).toThrow('FSM hat keinen Startzustand');

    expect(() => requireFsmStructure(makeFsm({
      states: {
        a: { id: 'a', label: 'A', x: 0, y: 0, isInitial: true, output: 0 },
        b: { id: 'b', label: 'B', x: 100, y: 0, isInitial: true, output: 0 },
      },
    }))).toThrow('FSM hat mehrere Startzustände');
  });

  it('returns a safe analysis result for empty FSMs without throwing in the UI layer', () => {
    const structure = analyzeFsmStructure(makeFsm());

    expect(structure.initialState).toBeNull();
    expect(structure.initialStateError).toBe('FSM hat keinen Startzustand');
    expect(structure.orderedStates).toEqual([]);
    expect(structure.effectiveStateCount).toBe(0);
  });
});

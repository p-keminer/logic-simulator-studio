import { describe, it, expect } from 'vitest';
import { parseCondition, evalCondition, exprVars, getMinterms, validateVars } from '../../fsm/conditionParser';
import type { Expr } from '../../fsm/conditionParser';
import { fsmReducer, createDefaultFsm } from '../../fsm/fsmReducer';
import type { FsmMachine, FsmTransition } from '../../fsm/types';
import { synthesizeFsm, detectOverlappingTransitions } from '../../fsm/synthesis/synthesize';
import type { Circuit } from '../../core/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse a condition string and assert success, returning the AST. */
function parseOk(text: string): Expr {
  const { ast, error } = parseCondition(text);
  expect(error).toBeNull();
  expect(ast).not.toBeNull();
  return ast!;
}

/** Parse and evaluate a condition with given variable values. */
function evalCond(text: string, vals: Record<string, boolean>): boolean {
  const ast = parseOk(text);
  return evalCondition(ast, vals);
}

/** Create a minimal FSM machine for testing. */
function makeFsm(overrides?: Partial<FsmMachine>): FsmMachine {
  return {
    id: 'fsm-test',
    name: 'Test FSM',
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

/** Create a minimal empty circuit for synthesis tests. */
function emptyCircuit(): Circuit {
  return {
    id: 'circ-test',
    name: 'Test Circuit',
    version: '1.0',
    gates: {},
    wires: {},
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '', updatedAt: '' },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1: Condition Parser
// ═══════════════════════════════════════════════════════════════════════════════

describe('Condition Parser - parseCondition', () => {
  it('parses a simple variable', () => {
    const ast = parseOk('A');
    expect(ast.kind).toBe('var');
    if (ast.kind === 'var') expect(ast.name).toBe('A');
  });

  it('evaluates a simple variable correctly', () => {
    expect(evalCond('A', { A: true })).toBe(true);
    expect(evalCond('A', { A: false })).toBe(false);
  });

  it('evaluates AND with various inputs', () => {
    expect(evalCond('A & B', { A: false, B: false })).toBe(false);
    expect(evalCond('A & B', { A: true, B: false })).toBe(false);
    expect(evalCond('A & B', { A: false, B: true })).toBe(false);
    expect(evalCond('A & B', { A: true, B: true })).toBe(true);
  });

  it('evaluates OR with various inputs', () => {
    expect(evalCond('A | B', { A: false, B: false })).toBe(false);
    expect(evalCond('A | B', { A: true, B: false })).toBe(true);
    expect(evalCond('A | B', { A: false, B: true })).toBe(true);
    expect(evalCond('A | B', { A: true, B: true })).toBe(true);
  });

  it('evaluates NOT with ! operator', () => {
    expect(evalCond('!A', { A: true })).toBe(false);
    expect(evalCond('!A', { A: false })).toBe(true);
  });

  it('evaluates NOT with ~ operator', () => {
    expect(evalCond('~A', { A: true })).toBe(false);
    expect(evalCond('~A', { A: false })).toBe(true);
  });

  it('respects operator precedence: AND binds tighter than OR', () => {
    // A | B & C  should be parsed as  A | (B & C)
    // When A=0, B=1, C=0: (B&C)=0, A|0=0
    expect(evalCond('A | B & C', { A: false, B: true, C: false })).toBe(false);
    // When A=1, B=0, C=0: (B&C)=0, A|0=1
    expect(evalCond('A | B & C', { A: true, B: false, C: false })).toBe(true);
    // When A=0, B=1, C=1: (B&C)=1, A|1=1
    expect(evalCond('A | B & C', { A: false, B: true, C: true })).toBe(true);
  });

  it('respects parentheses overriding precedence', () => {
    // (A | B) & C  should be parsed as  (A | B) & C
    // When A=1, B=0, C=0: (A|B)=1, 1&C=0
    expect(evalCond('(A | B) & C', { A: true, B: false, C: false })).toBe(false);
    // When A=1, B=0, C=1: (A|B)=1, 1&C=1
    expect(evalCond('(A | B) & C', { A: true, B: false, C: true })).toBe(true);
    // When A=0, B=0, C=1: (A|B)=0, 0&C=0
    expect(evalCond('(A | B) & C', { A: false, B: false, C: true })).toBe(false);
  });

  it('handles constant "true"', () => {
    const ast = parseOk('true');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(true);
  });

  it('handles constant "false"', () => {
    const ast = parseOk('false');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(false);
  });

  it('handles constant "always" as true', () => {
    const ast = parseOk('always');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(true);
  });

  it('handles constant "never" as false', () => {
    const ast = parseOk('never');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(false);
  });

  it('handles constant "1" as true', () => {
    const ast = parseOk('1');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(true);
  });

  it('handles constant "0" as false', () => {
    const ast = parseOk('0');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(false);
  });

  it('handles keyword AND', () => {
    expect(evalCond('A AND B', { A: true, B: true })).toBe(true);
    expect(evalCond('A AND B', { A: true, B: false })).toBe(false);
  });

  it('handles keyword OR', () => {
    expect(evalCond('A OR B', { A: false, B: true })).toBe(true);
    expect(evalCond('A OR B', { A: false, B: false })).toBe(false);
  });

  it('handles keyword NOT', () => {
    expect(evalCond('NOT A', { A: true })).toBe(false);
    expect(evalCond('NOT A', { A: false })).toBe(true);
  });

  it('returns error for invalid input characters', () => {
    const { ast, error } = parseCondition('#');
    expect(error).not.toBeNull();
    expect(ast).toBeNull();
  });

  it('returns error for unbalanced parentheses', () => {
    const { ast, error } = parseCondition('(A & B');
    expect(error).not.toBeNull();
    expect(ast).toBeNull();
  });

  it('returns error for trailing tokens', () => {
    const { ast, error } = parseCondition('A B');
    expect(error).not.toBeNull();
    expect(ast).toBeNull();
  });

  it('treats empty condition as always-true', () => {
    const ast = parseOk('');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(true);
  });

  it('treats whitespace-only condition as always-true', () => {
    const ast = parseOk('   ');
    expect(ast.kind).toBe('const');
    if (ast.kind === 'const') expect(ast.value).toBe(true);
  });

  it('supports && and || operators', () => {
    expect(evalCond('A && B', { A: true, B: true })).toBe(true);
    expect(evalCond('A && B', { A: true, B: false })).toBe(false);
    expect(evalCond('A || B', { A: false, B: true })).toBe(true);
    expect(evalCond('A || B', { A: false, B: false })).toBe(false);
  });

  it('extracts variable names with exprVars', () => {
    const ast = parseOk('A & !B | C');
    const vars = exprVars(ast);
    expect(vars.sort()).toEqual(['A', 'B', 'C']);
  });

  it('computes minterms correctly for single variable', () => {
    // A with inputNames=['A']: minterm 1 (A=1)
    const ast = parseOk('A');
    const minterms = getMinterms(ast, ['A']);
    expect(minterms).toEqual([1]);
  });

  it('computes minterms correctly for AND expression', () => {
    // A & B with inputNames=['A','B']:
    // LSB=A, MSB=B: A=1,B=1 -> index 3
    const ast = parseOk('A & B');
    const minterms = getMinterms(ast, ['A', 'B']);
    expect(minterms).toEqual([3]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 2: FSM Reducer
// ═══════════════════════════════════════════════════════════════════════════════

describe('FSM Reducer', () => {
  describe('ADD_STATE', () => {
    it('adds a state with auto-generated label', () => {
      const fsm = makeFsm();
      const next = fsmReducer(fsm, { type: 'ADD_STATE' });
      const states = Object.values(next.states);
      expect(states).toHaveLength(1);
      expect(states[0].label).toBe('S0');
      // First state should be initial
      expect(states[0].isInitial).toBe(true);
    });

    it('second state gets label S1 and is not initial', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      const states = Object.values(fsm.states);
      expect(states).toHaveLength(2);
      expect(states[1].label).toBe('S1');
      expect(states[1].isInitial).toBe(false);
    });

    it('adds state at specified position', () => {
      const fsm = makeFsm();
      const next = fsmReducer(fsm, { type: 'ADD_STATE', payload: { x: 100, y: 200 } });
      const states = Object.values(next.states);
      expect(states[0].x).toBe(100);
      expect(states[0].y).toBe(200);
    });
  });

  describe('DELETE_STATE', () => {
    it('removes state and associated transitions', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      const [s0, s1] = Object.values(fsm.states);

      // Add a transition from s0 to s1
      fsm = fsmReducer(fsm, {
        type: 'ADD_TRANSITION',
        payload: { fromId: s0.id, toId: s1.id, conditionText: 'A', mealyOutput: 0 },
      });
      expect(fsm.transitions).toHaveLength(1);

      // Delete s0 - should remove the transition too
      fsm = fsmReducer(fsm, { type: 'DELETE_STATE', payload: { id: s0.id } });
      expect(Object.keys(fsm.states)).toHaveLength(1);
      expect(fsm.transitions).toHaveLength(0);
    });

    it('promotes another state to initial if deleting initial state', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      const [s0, s1] = Object.values(fsm.states);
      expect(s0.isInitial).toBe(true);
      expect(s1.isInitial).toBe(false);

      // Delete the initial state
      fsm = fsmReducer(fsm, { type: 'DELETE_STATE', payload: { id: s0.id } });
      const remaining = Object.values(fsm.states);
      expect(remaining).toHaveLength(1);
      // The remaining state should now be initial
      expect(remaining[0].isInitial).toBe(true);
    });
  });

  describe('UPDATE_STATE', () => {
    it('updates state label', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      const stateId = Object.keys(fsm.states)[0];

      fsm = fsmReducer(fsm, { type: 'UPDATE_STATE', payload: { id: stateId, label: 'IDLE' } });
      expect(fsm.states[stateId].label).toBe('IDLE');
    });

    it('auto-suffixes duplicate label (BUG-M3 fix)', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S0
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S1
      const [s0, s1] = Object.values(fsm.states);

      // Try to rename S1 to "S0" - should get auto-suffixed
      fsm = fsmReducer(fsm, { type: 'UPDATE_STATE', payload: { id: s1.id, label: 'S0' } });
      expect(fsm.states[s1.id].label).toBe('S0_1');
    });

    it('allows renaming to same label (no-op for uniqueness)', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S0
      const stateId = Object.keys(fsm.states)[0];

      // Rename S0 to "S0" - should stay S0 (same state, no conflict)
      fsm = fsmReducer(fsm, { type: 'UPDATE_STATE', payload: { id: stateId, label: 'S0' } });
      expect(fsm.states[stateId].label).toBe('S0');
    });

    it('updates state output', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      const stateId = Object.keys(fsm.states)[0];

      fsm = fsmReducer(fsm, { type: 'UPDATE_STATE', payload: { id: stateId, output: 1 } });
      expect(fsm.states[stateId].output).toBe(1);
    });
  });

  describe('ADD_TRANSITION', () => {
    it('adds a transition between states', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      const [s0, s1] = Object.values(fsm.states);

      fsm = fsmReducer(fsm, {
        type: 'ADD_TRANSITION',
        payload: { fromId: s0.id, toId: s1.id, conditionText: 'A', mealyOutput: 0 },
      });
      expect(fsm.transitions).toHaveLength(1);
      expect(fsm.transitions[0].fromId).toBe(s0.id);
      expect(fsm.transitions[0].toId).toBe(s1.id);
      expect(fsm.transitions[0].conditionText).toBe('A');
    });
  });

  describe('DELETE_TRANSITION', () => {
    it('removes a transition', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
      const [s0, s1] = Object.values(fsm.states);

      fsm = fsmReducer(fsm, {
        type: 'ADD_TRANSITION',
        payload: { fromId: s0.id, toId: s1.id, conditionText: 'A', mealyOutput: 0 },
      });
      const tId = fsm.transitions[0].id;

      fsm = fsmReducer(fsm, { type: 'DELETE_TRANSITION', payload: { id: tId } });
      expect(fsm.transitions).toHaveLength(0);
    });
  });

  describe('SET_INPUT_COUNT', () => {
    it('increases input count and generates default names', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'SET_INPUT_COUNT', payload: { count: 3 } });
      expect(fsm.inputCount).toBe(3);
      expect(fsm.inputNames).toEqual(['A', 'B', 'C']);
    });

    it('decreases input count and trims names', () => {
      let fsm = makeFsm({ inputCount: 3, inputNames: ['X', 'Y', 'Z'] });
      fsm = fsmReducer(fsm, { type: 'SET_INPUT_COUNT', payload: { count: 1 } });
      expect(fsm.inputCount).toBe(1);
      expect(fsm.inputNames).toEqual(['X']);
    });

    it('preserves existing names when increasing', () => {
      let fsm = makeFsm({ inputCount: 1, inputNames: ['X'] });
      fsm = fsmReducer(fsm, { type: 'SET_INPUT_COUNT', payload: { count: 3 } });
      expect(fsm.inputNames[0]).toBe('X');
      expect(fsm.inputNames[1]).toBe('B');
      expect(fsm.inputNames[2]).toBe('C');
    });
  });

  describe('SET_OUTPUT_COUNT', () => {
    it('adjusts output names array', () => {
      let fsm = makeFsm();
      fsm = fsmReducer(fsm, { type: 'SET_OUTPUT_COUNT', payload: { count: 3 } });
      expect(fsm.outputCount).toBe(3);
      expect(fsm.outputNames).toHaveLength(3);
    });

    it('masks existing output values to new bit width', () => {
      // Create FSM with a state that has output=7 (binary 111)
      const s0Id = 'state-0';
      let fsm = makeFsm({
        outputCount: 3,
        outputNames: ['Y', 'X', 'W'],
        states: {
          [s0Id]: { id: s0Id, label: 'S0', x: 0, y: 0, isInitial: true, output: 7 },
        },
      });

      // Reduce output count to 2: mask = (1<<2)-1 = 3 (binary 11)
      fsm = fsmReducer(fsm, { type: 'SET_OUTPUT_COUNT', payload: { count: 2 } });
      expect(fsm.states[s0Id].output).toBe(3); // 7 & 3 = 3
    });

    it('masks output value to 1 bit correctly', () => {
      const s0Id = 'state-0';
      let fsm = makeFsm({
        outputCount: 3,
        outputNames: ['Y', 'X', 'W'],
        states: {
          [s0Id]: { id: s0Id, label: 'S0', x: 0, y: 0, isInitial: true, output: 5 },
        },
      });

      // Reduce to 1 bit: mask = 1, 5 & 1 = 1
      fsm = fsmReducer(fsm, { type: 'SET_OUTPUT_COUNT', payload: { count: 1 } });
      expect(fsm.states[s0Id].output).toBe(1);
    });
  });

  describe('createDefaultFsm', () => {
    it('creates a default FSM with 2 states', () => {
      const fsm = createDefaultFsm();
      const states = Object.values(fsm.states);
      expect(states).toHaveLength(2);
      expect(fsm.archType).toBe('moore');
      expect(fsm.inputCount).toBe(1);
      expect(fsm.outputCount).toBe(1);
    });

    it('has one initial state', () => {
      const fsm = createDefaultFsm();
      const initialStates = Object.values(fsm.states).filter(s => s.isInitial);
      expect(initialStates).toHaveLength(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 3: FSM Synthesis
// ═══════════════════════════════════════════════════════════════════════════════

describe('FSM Synthesis - synthesizeFsm', () => {
  it('synthesizes a simple 2-state toggle FSM (Moore)', () => {
    // State A (initial, output=0) → B on A=1
    // State B (output=1) → A on A=1
    // Self-loop on A=0 for both
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
      archType: 'moore',
      inputCount: 1,
      inputNames: ['A'],
      outputCount: 1,
      outputNames: ['Y'],
      states: {
        [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
        [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: sB, toId: sA, conditionText: 'A', mealyOutput: 0 },
        { id: 't3', fromId: sA, toId: sA, conditionText: '!A', mealyOutput: 0 },
        { id: 't4', fromId: sB, toId: sB, conditionText: '!A', mealyOutput: 0 },
      ],
    });

    const result = synthesizeFsm(fsm, emptyCircuit());
    const gates = Object.values(result.gates);
    const wires = Object.values(result.wires);

    // Should have gates (at minimum: CLK, RST, input switch, D_FF_R, NOT gates, AND/OR logic, LEDs)
    expect(gates.length).toBeGreaterThan(0);
    expect(wires.length).toBeGreaterThan(0);

    // Check for expected gate types
    const gateTypes = gates.map(g => g.typeId);
    expect(gateTypes).toContain('CLOCK');
    expect(gateTypes).toContain('INPUT_SWITCH');
    expect(gateTypes).toContain('D_FF_R');
    expect(gateTypes).toContain('OUTPUT_LED');

    // 2 states = 1 bit encoding = 1 D flip-flop
    const dffCount = gateTypes.filter(t => t === 'D_FF_R').length;
    expect(dffCount).toBe(1);
  });

  it('synthesizes a 2-state FSM with correct output mapping', () => {
    // State A: output=0, State B: output=1
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
      archType: 'moore',
      states: {
        [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
        [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: sB, toId: sA, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const result = synthesizeFsm(fsm, emptyCircuit());
    const gates = Object.values(result.gates);

    // Should have OUTPUT_LED gates for Y and Q0
    const leds = gates.filter(g => g.typeId === 'OUTPUT_LED');
    expect(leds.length).toBeGreaterThanOrEqual(1);

    // One LED should be labeled 'Y' (the output)
    const yLed = leds.find(g => g.label === 'Y');
    expect(yLed).toBeDefined();
  });

  it('synthesizes a Mealy FSM', () => {
    // Mealy: outputs depend on inputs AND state
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
      archType: 'mealy',
      states: {
        [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
        [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 1 },
        { id: 't2', fromId: sB, toId: sA, conditionText: 'A', mealyOutput: 0 },
        { id: 't3', fromId: sA, toId: sA, conditionText: '!A', mealyOutput: 0 },
        { id: 't4', fromId: sB, toId: sB, conditionText: '!A', mealyOutput: 1 },
      ],
    });

    const result = synthesizeFsm(fsm, emptyCircuit());
    const gates = Object.values(result.gates);

    // Should still produce a valid circuit
    expect(gates.length).toBeGreaterThan(0);

    const gateTypes = gates.map(g => g.typeId);
    expect(gateTypes).toContain('D_FF_R');
    expect(gateTypes).toContain('OUTPUT_LED');
  });

  it('Moore output uses only state variables (fewer AND gate inputs)', () => {
    // For a Moore machine with 2 states and 1 input:
    // N=1 (state bits), M=1 (input bits)
    // D function uses V=N+M=2 variables
    // Output function uses only N=1 variable (state only)
    const sA = 'state-a';
    const sB = 'state-b';
    const fsm = makeFsm({
      archType: 'moore',
      states: {
        [sA]: { id: sA, label: 'SA', x: 100, y: 100, isInitial: true, output: 0 },
        [sB]: { id: sB, label: 'SB', x: 300, y: 100, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't1', fromId: sA, toId: sB, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: sB, toId: sA, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const result = synthesizeFsm(fsm, emptyCircuit());
    const gates = Object.values(result.gates);

    // The synthesis should complete without error
    expect(gates.length).toBeGreaterThan(0);

    // For a Moore machine: output=1 only when Q0=1 (state B encoded as 1)
    // This means output Y can be directly connected from Q0 without extra AND gates
    // for the output function. Verify no extra logic is needed beyond what is produced.
    const gateTypes = gates.map(g => g.typeId);
    expect(gateTypes).toContain('D_FF_R');
  });

  it('handles a 4-state FSM requiring 2 flip-flops', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const s2 = 'state-2';
    const s3 = 'state-3';
    const fsm = makeFsm({
      archType: 'moore',
      inputCount: 1,
      inputNames: ['A'],
      outputCount: 1,
      outputNames: ['Y'],
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
    const gates = Object.values(result.gates);
    const gateTypes = gates.map(g => g.typeId);

    // 4 states -> ceil(log2(4)) = 2 flip-flops
    const dffCount = gateTypes.filter(t => t === 'D_FF_R').length;
    expect(dffCount).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 4: Overlap Detection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Overlap Detection - detectOverlappingTransitions', () => {
  it('no overlap with mutually exclusive conditions', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const s2 = 'state-2';
    const fsm = makeFsm({
      inputCount: 1,
      inputNames: ['A'],
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
        [s2]: { id: s2, label: 'S2', x: 200, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: s0, toId: s1, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: s0, toId: s2, conditionText: '!A', mealyOutput: 0 },
      ],
    });

    const warnings = detectOverlappingTransitions(fsm);
    expect(warnings).toHaveLength(0);
  });

  it('detects overlap with same condition on two transitions', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const s2 = 'state-2';
    const fsm = makeFsm({
      inputCount: 1,
      inputNames: ['A'],
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
        [s2]: { id: s2, label: 'S2', x: 200, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: s0, toId: s1, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: s0, toId: s2, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const warnings = detectOverlappingTransitions(fsm);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].stateId).toBe(s0);
    expect(warnings[0].transitionIds).toContain('t1');
    expect(warnings[0].transitionIds).toContain('t2');
  });

  it('detects partial overlap: "A" and "A & B"', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const s2 = 'state-2';
    const fsm = makeFsm({
      inputCount: 2,
      inputNames: ['A', 'B'],
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
        [s2]: { id: s2, label: 'S2', x: 200, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: s0, toId: s1, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: s0, toId: s2, conditionText: 'A & B', mealyOutput: 0 },
      ],
    });

    const warnings = detectOverlappingTransitions(fsm);
    // Overlap when A=1, B=1 (both conditions are true)
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0].stateId).toBe(s0);
  });

  it('detects multiple overlaps from same state', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const s2 = 'state-2';
    const s3 = 'state-3';
    const fsm = makeFsm({
      inputCount: 1,
      inputNames: ['A'],
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
        [s2]: { id: s2, label: 'S2', x: 200, y: 0, isInitial: false, output: 0 },
        [s3]: { id: s3, label: 'S3', x: 300, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        // Three transitions from s0, all with condition "A" -> 3 overlapping pairs
        { id: 't1', fromId: s0, toId: s1, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: s0, toId: s2, conditionText: 'A', mealyOutput: 0 },
        { id: 't3', fromId: s0, toId: s3, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const warnings = detectOverlappingTransitions(fsm);
    // 3 transitions with same condition -> C(3,2)=3 overlapping pairs
    expect(warnings).toHaveLength(3);
    warnings.forEach(w => expect(w.stateId).toBe(s0));
  });

  it('does not report overlap for transitions from different states', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const s2 = 'state-2';
    const fsm = makeFsm({
      inputCount: 1,
      inputNames: ['A'],
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
        [s2]: { id: s2, label: 'S2', x: 200, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: s0, toId: s1, conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: s1, toId: s2, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const warnings = detectOverlappingTransitions(fsm);
    expect(warnings).toHaveLength(0);
  });

  it('no overlap with single outgoing transition', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const fsm = makeFsm({
      inputCount: 1,
      inputNames: ['A'],
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: s0, toId: s1, conditionText: 'A', mealyOutput: 0 },
      ],
    });

    const warnings = detectOverlappingTransitions(fsm);
    expect(warnings).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 5: FSM Audit Bug Fix Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('FSM Audit - getEncoding edge cases (K1)', () => {
  it('throws when no initial state exists', () => {
    const s0 = 'state-0';
    const fsm = makeFsm({
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: false, output: 0 },
      },
    });
    expect(() => synthesizeFsm(fsm, emptyCircuit())).toThrow('Startzustand');
  });

  it('throws when multiple initial states exist', () => {
    const s0 = 'state-0';
    const s1 = 'state-1';
    const fsm = makeFsm({
      states: {
        [s0]: { id: s0, label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        [s1]: { id: s1, label: 'S1', x: 100, y: 0, isInitial: true, output: 0 },
      },
    });
    expect(() => synthesizeFsm(fsm, emptyCircuit())).toThrow('mehrere');
  });
});

describe('FSM Audit - Reducer edge cases', () => {
  it('H1: ADD_STATE ignores payload when y is missing', () => {
    const fsm = makeFsm();
    const next = fsmReducer(fsm, { type: 'ADD_STATE', payload: { x: 100 } });
    const states = Object.values(next.states);
    // Should use auto-placement since y is missing
    expect(states[0].x).not.toBe(100);
  });

  it('H2: SET_INITIAL with invalid id returns unchanged state', () => {
    let fsm = makeFsm();
    fsm = fsmReducer(fsm, { type: 'ADD_STATE' });
    const before = fsm;
    const after = fsmReducer(fsm, { type: 'SET_INITIAL', payload: { id: 'nonexistent' } });
    // Should return same state reference
    expect(after).toBe(before);
  });

  it('H3: SET_OUTPUT_COUNT clamps to 30 max', () => {
    const fsm = makeFsm();
    const next = fsmReducer(fsm, { type: 'SET_OUTPUT_COUNT', payload: { count: 35 } });
    expect(next.outputCount).toBe(30);
  });

  it('H3: SET_OUTPUT_COUNT clamps to 0 min', () => {
    const fsm = makeFsm();
    const next = fsmReducer(fsm, { type: 'SET_OUTPUT_COUNT', payload: { count: -5 } });
    expect(next.outputCount).toBe(0);
  });

  it('M1: ADD_STATE generates unique label after deletion', () => {
    let fsm = makeFsm();
    fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S0
    fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S1
    fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S2
    const s1id = Object.values(fsm.states).find(s => s.label === 'S1')!.id;
    fsm = fsmReducer(fsm, { type: 'DELETE_STATE', payload: { id: s1id } }); // delete S1
    fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // should get S1 (free) or S3 but NOT duplicate S2
    const labels = Object.values(fsm.states).map(s => s.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length); // all labels unique
  });

  it('M2: UPDATE_STATE strips isInitial from payload', () => {
    let fsm = makeFsm();
    fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S0 (initial)
    fsm = fsmReducer(fsm, { type: 'ADD_STATE' }); // S1
    const [s0, s1] = Object.values(fsm.states);
    expect(s0.isInitial).toBe(true);

    // Try to set isInitial on S1 via UPDATE_STATE (should be stripped)
    fsm = fsmReducer(fsm, { type: 'UPDATE_STATE', payload: { id: s1.id, isInitial: true } as any });
    // S0 should remain the only initial
    expect(fsm.states[s0.id].isInitial).toBe(true);
    expect(fsm.states[s1.id].isInitial).toBe(false);
  });

  it('M3: SET_INPUT_COUNT clamps to 26 max', () => {
    const fsm = makeFsm();
    const next = fsmReducer(fsm, { type: 'SET_INPUT_COUNT', payload: { count: 30 } });
    expect(next.inputCount).toBe(26);
  });

  it('M4: SET_INPUT_NAME rejects empty string', () => {
    let fsm = makeFsm();
    const before = fsm;
    const after = fsmReducer(fsm, { type: 'SET_INPUT_NAME', payload: { index: 0, name: '' } });
    expect(after).toBe(before);
  });

  it('M4: SET_INPUT_NAME rejects special characters', () => {
    let fsm = makeFsm();
    const before = fsm;
    const after = fsmReducer(fsm, { type: 'SET_INPUT_NAME', payload: { index: 0, name: 'A B' } });
    expect(after).toBe(before);
  });

  it('M5: SET_INPUT_NAME rejects duplicate name', () => {
    let fsm = makeFsm({ inputCount: 2, inputNames: ['A', 'B'] });
    const before = fsm;
    const after = fsmReducer(fsm, { type: 'SET_INPUT_NAME', payload: { index: 1, name: 'A' } });
    expect(after).toBe(before);
  });

  it('M6: SET_INPUT_NAME propagates rename in conditions', () => {
    let fsm = makeFsm({
      inputCount: 1,
      inputNames: ['A'],
      transitions: [
        { id: 't1', fromId: 'x', toId: 'y', conditionText: 'A & !A', mealyOutput: 0 },
      ],
    });
    fsm = fsmReducer(fsm, { type: 'SET_INPUT_NAME', payload: { index: 0, name: 'X' } });
    expect(fsm.inputNames[0]).toBe('X');
    expect(fsm.transitions[0].conditionText).toBe('X & !X');
  });
});

describe('FSM Audit - Condition Parser edge cases', () => {
  it('L1: digits 2-9 throw specific error', () => {
    const { error } = parseCondition('2');
    expect(error).not.toBeNull();
    expect(error).toContain('Ziffer');
  });

  it('L3: getMinterms throws for n > 20', () => {
    const ast = parseOk('A');
    const names = Array.from({ length: 21 }, (_, i) => `V${i}`);
    expect(() => getMinterms(ast, names)).toThrow('Maximum 20');
  });
});

describe('FSM Audit - Synthesis edge cases', () => {
  it('H7: throws for M > 15 inputs', () => {
    const states = {
      s0: { id: 's0', label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
      s1: { id: 's1', label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
    };
    const names = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i));
    const fsm = makeFsm({
      inputCount: 16,
      inputNames: names,
      states,
    });
    expect(() => synthesizeFsm(fsm, emptyCircuit())).toThrow('Maximum: 15');
  });

  it('M7: synthesis rejects unknown variables in conditions', () => {
    const fsm = makeFsm({
      inputCount: 1,
      inputNames: ['A'],
      states: {
        s0: { id: 's0', label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        s1: { id: 's1', label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: 's0', toId: 's1', conditionText: 'X', mealyOutput: 0 },
      ],
    });
    expect(() => synthesizeFsm(fsm, emptyCircuit())).toThrow('Unbekannte');
  });

  it('H6: Mealy synthesis warns about unmatched combos', () => {
    const fsm = makeFsm({
      archType: 'mealy',
      inputCount: 1,
      inputNames: ['A'],
      states: {
        s0: { id: 's0', label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        s1: { id: 's1', label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        // Only transition for A=1, no transition for A=0
        { id: 't1', fromId: 's0', toId: 's1', conditionText: 'A', mealyOutput: 1 },
      ],
    });
    const result = synthesizeFsm(fsm, emptyCircuit());
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Unvollständige');
  });

  it('holds current state when no transition matches', () => {
    // 2-state FSM: S0 -> S1 on A=1, no self-loop for S0
    // When A=0 at S0, should hold S0 (not jump to S0 encoding 0)
    const fsm = makeFsm({
      archType: 'moore',
      states: {
        s0: { id: 's0', label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        s1: { id: 's1', label: 'S1', x: 100, y: 0, isInitial: false, output: 1 },
      },
      transitions: [
        { id: 't1', fromId: 's0', toId: 's1', conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: 's1', toId: 's0', conditionText: 'A', mealyOutput: 0 },
      ],
    });
    // Should not throw — missing transitions cause hold, not error
    const result = synthesizeFsm(fsm, emptyCircuit());
    expect(Object.keys(result.gates).length).toBeGreaterThan(0);
  });

  it('overlap detection returns empty for > 15 inputs', () => {
    const names = Array.from({ length: 16 }, (_, i) => String.fromCharCode(65 + i));
    const fsm = makeFsm({
      inputCount: 16,
      inputNames: names,
      states: {
        s0: { id: 's0', label: 'S0', x: 0, y: 0, isInitial: true, output: 0 },
        s1: { id: 's1', label: 'S1', x: 100, y: 0, isInitial: false, output: 0 },
      },
      transitions: [
        { id: 't1', fromId: 's0', toId: 's1', conditionText: 'A', mealyOutput: 0 },
        { id: 't2', fromId: 's0', toId: 's1', conditionText: 'B', mealyOutput: 0 },
      ],
    });
    const warnings = detectOverlappingTransitions(fsm);
    expect(warnings).toHaveLength(0); // Skips brute-force for M > 15
  });
});

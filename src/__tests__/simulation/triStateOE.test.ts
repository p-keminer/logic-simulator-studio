/**
 * Tests for tri-state / OE (Output Enable) behavior:
 * - 74HC595, 74HC373, 74HC374, TRIBUF output HI_Z (2) when OE is inactive
 * - Downstream gates receive 0 (pull-down sanitization) when input is HI_Z
 * - Wire signals carry HI_Z for display purposes
 */
import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';
import type { Circuit, GateInstance, Wire, SignalState, SignalValue } from '../../core/types';
import { HI_Z } from '../../core/types';
import {
  initBuffer,
  runOneTick,
  buildWireMap,
  type SimBuffer,
} from '../../core/simulation/tickEngine';

// ── Helpers ─────────────────────────────────────────────────────────────────

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  opts?: {
    customState?: Record<string, unknown>;
    outputSignals?: Record<string, SignalState>;
  },
): GateInstance {
  return {
    id,
    typeId,
    x: 0,
    y: 0,
    outputSignals: opts?.outputSignals ?? {},
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
    id: 'test-circuit',
    name: 'Test Circuit',
    version: '1.0.0',
    gates: Object.fromEntries(gates.map(g => [g.id, g])),
    wires: Object.fromEntries(wires.map(w => [w.id, w])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  };
}

// ── HI_Z constant ────────────────────────────────────────────────────────────

describe('HI_Z constant', () => {
  it('HI_Z is 2', () => {
    expect(HI_Z).toBe(2);
  });
});

// ── TRIBUF ───────────────────────────────────────────────────────────────────

describe('TRIBUF tri-state', () => {
  it('outputs A when OE=0 (active)', () => {
    const def = gateRegistry.get('TRIBUF');
    const result = def.evaluate({ a: 1, oe: 0 });
    expect(result.y).toBe(1);
  });

  it('outputs HI_Z when OE=1 (inactive)', () => {
    const def = gateRegistry.get('TRIBUF');
    const result = def.evaluate({ a: 1, oe: 1 });
    expect(result.y).toBe(HI_Z);
  });

  it('outputs HI_Z when OE=1 regardless of input A', () => {
    const def = gateRegistry.get('TRIBUF');
    expect(def.evaluate({ a: 0, oe: 1 }).y).toBe(HI_Z);
    expect(def.evaluate({ a: 1, oe: 1 }).y).toBe(HI_Z);
  });
});

// ── 74HC595 ──────────────────────────────────────────────────────────────────

describe('74HC595 tri-state OE', () => {
  it('outputs HI_Z on all Q when OE=1 (inactive)', () => {
    const def = gateRegistry.get('74HC595');
    const state = { q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0, latch: 0x55, shift: 0 };
    const result = def.evaluate({ oe: 1 } as Record<string, SignalValue>, state);
    for (let i = 0; i < 8; i++) {
      expect(result[`q${i}`]).toBe(HI_Z);
    }
  });

  it('outputs latch data when OE=0 (active)', () => {
    const def = gateRegistry.get('74HC595');
    const state = { q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0, latch: 0x55 };
    const result = def.evaluate({ oe: 0 } as Record<string, SignalValue>, state);
    expect(result.q0).toBe(1);
    expect(result.q1).toBe(0);
    expect(result.q2).toBe(1);
    expect(result.q3).toBe(0);
  });
});

// ── 74HC373 ──────────────────────────────────────────────────────────────────

describe('74HC373 tri-state OE', () => {
  it('outputs HI_Z on all Q when OE=1 (inactive)', () => {
    const def = gateRegistry.get('74HC373');
    const result = def.evaluate(
      { oe: 1, le: 0, d0: 1, d1: 0, d2: 1, d3: 0, d4: 1, d5: 0, d6: 1, d7: 0 } as Record<string, SignalValue>,
      { q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0, latch: 0x55 },
    );
    for (let i = 0; i < 8; i++) {
      expect(result[`q${i}`]).toBe(HI_Z);
    }
  });

  it('outputs latch data when OE=0, LE=0', () => {
    const def = gateRegistry.get('74HC373');
    const result = def.evaluate(
      { oe: 0, le: 0 } as Record<string, SignalValue>,
      { q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0, latch: 0x55 },
    );
    expect(result.q0).toBe(1);
    expect(result.q1).toBe(0);
  });
});

// ── 74HC374 ──────────────────────────────────────────────────────────────────

describe('74HC374 tri-state OE', () => {
  it('outputs HI_Z on all Q when OE=1 (inactive)', () => {
    const def = gateRegistry.get('74HC374');
    const result = def.evaluate(
      { oe: 1 } as Record<string, SignalValue>,
      { q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0, reg: 0x55 },
    );
    for (let i = 0; i < 8; i++) {
      expect(result[`q${i}`]).toBe(HI_Z);
    }
  });

  it('outputs register data when OE=0 (active)', () => {
    const def = gateRegistry.get('74HC374');
    const result = def.evaluate(
      { oe: 0 } as Record<string, SignalValue>,
      { q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0, reg: 0x55 },
    );
    expect(result.q0).toBe(1);
    expect(result.q1).toBe(0);
    expect(result.q2).toBe(1);
    expect(result.q3).toBe(0);
  });
});

// ── Input Sanitization ───────────────────────────────────────────────────────

describe('Input sanitization: HI_Z → 0 for downstream gates', () => {
  it('NOT gate receiving HI_Z via wire sees 0 (pull-down)', () => {
    // TRIBUF with OE=1 → Y=HI_Z → wire → NOT gate → out should be 1 (NOT of 0)
    const swOE = makeGate('sw_oe', 'CONST_HIGH');
    const swA  = makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 1 } });
    const tri  = makeGate('tri', 'TRIBUF');
    const inv  = makeGate('inv', 'NOT');

    const wires = [
      makeWire('w1', 'sw_a', 'out', 'tri', 'a'),
      makeWire('w2', 'sw_oe', 'out', 'tri', 'oe'),
      makeWire('w3', 'tri', 'y', 'inv', 'a'),
    ];

    const circuit = makeCircuit([swOE, swA, tri, inv], wires);
    const wireMap = buildWireMap(circuit);
    let buf = initBuffer(circuit);

    // Run several ticks to stabilize
    for (let i = 0; i < 5; i++) {
      buf = runOneTick(circuit, buf, wireMap, true);
    }

    // TRIBUF output should be HI_Z
    expect(buf.outputs['tri']?.['y']).toBe(HI_Z);
    // NOT gate should see sanitized 0 → output 1
    expect(buf.outputs['inv']?.['out']).toBe(1);
  });
});

// ── Regression: Existing gates unaffected ────────────────────────────────────

describe('Regression: non-tri-state gates unaffected', () => {
  it('AND gate still computes correctly', () => {
    const def = gateRegistry.get('AND');
    expect(def.evaluate({ a: 1, b: 1 }).out).toBe(1);
    expect(def.evaluate({ a: 1, b: 0 }).out).toBe(0);
    expect(def.evaluate({ a: 0, b: 1 }).out).toBe(0);
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(0);
  });

  it('D_FF still computes correctly', () => {
    const def = gateRegistry.get('D_FF');
    // Rising edge: d=1, clk=1, prevClk=0 → q=1
    const result = def.evaluate(
      { d: 1, clk: 1 } as Record<string, SignalValue>,
      { q: 0, prevClk: 0 },
    );
    expect(result.q).toBe(0); // evaluate returns old state
    const newState = def.stateUpdate!(
      { d: 1, clk: 1 } as Record<string, SignalValue>,
      result as Record<string, SignalValue>,
      { q: 0, prevClk: 0 },
    );
    expect(newState.q).toBe(1); // stateUpdate computes new state
  });

  it('SR_LATCH state still works', () => {
    const def = gateRegistry.get('SR_LATCH');
    const result = def.evaluate(
      { s: 1, r: 0 } as Record<string, SignalValue>,
      { q: 0 },
    );
    expect(result.q).toBe(1);
    expect(result.q_n).toBe(0);
  });

  it('BIN_CTR7S stateKeys maintained', () => {
    const def = gateRegistry.get('BIN_CTR7S');
    expect(def.stateKeys).toEqual(['cnt0', 'cnt1', 'cnt2', 'cnt3']);
  });

  it('74HC161 stateKeys maintained', () => {
    const def = gateRegistry.get('74HC161');
    expect(def.stateKeys).toEqual(['cnt0', 'cnt1', 'cnt2', 'cnt3']);
  });

  it('74HC74 stateKeys maintained', () => {
    const def = gateRegistry.get('74HC74');
    expect(def.stateKeys).toEqual(['q1', 'q2']);
  });

  it('74HC194 stateKeys maintained', () => {
    const def = gateRegistry.get('74HC194');
    expect(def.stateKeys).toEqual(['q0', 'q1', 'q2', 'q3']);
  });
});

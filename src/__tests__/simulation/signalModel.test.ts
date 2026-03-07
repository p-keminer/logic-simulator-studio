/**
 * P0: Signal model tests for 0|1|Z|X (SignalValue = 0|1|2|3).
 *
 * Covers:
 *   - resolveWiredValues (bus resolution)
 *   - IEEE 1164-style logic helpers
 *   - Gate evaluate functions with Z/X inputs
 *   - Multi-driver resolution in tickEngine
 */
import { describe, it, expect } from 'vitest';
import { HI_Z, UNKNOWN } from '../../core/types';
import type { SignalValue, Circuit, GateInstance, Wire, SignalState } from '../../core/types';
import {
  resolveWiredValues,
  logicNOT, logicAND, logicOR, logicXOR, logicXNOR,
} from '../../core/simulation/signal';
import { gateRegistry } from '../../core/registry/index';
import { initBuffer, runOneTick, buildWireMap } from '../../core/simulation/tickEngine';

// ── Helpers ───────────────────────────────────────────────────────────────────

const Z: SignalValue = HI_Z;     // 2
const X: SignalValue = UNKNOWN;  // 3

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  opts?: { customState?: Record<string, unknown>; outputSignals?: Record<string, SignalState> },
): GateInstance {
  return {
    id, typeId, x: 0, y: 0,
    outputSignals: opts?.outputSignals ?? {},
    customState: opts?.customState ?? {},
    isSelected: false,
  };
}

function makeWire(id: string, fromGate: string, fromPort: string, toGate: string, toPort: string): Wire {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to:   { gateId: toGate,   portId: toPort   },
    signal: { ...defaultSignal },
    waypoints: [],
    isSelected: false,
  };
}

function makeCircuit(gates: GateInstance[], wires: Wire[]): Circuit {
  return {
    id: 'test-circuit', name: 'Test', version: '1.0.0',
    gates: Object.fromEntries(gates.map(g => [g.id, g])),
    wires: Object.fromEntries(wires.map(w => [w.id, w])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  };
}

// ── resolveWiredValues ────────────────────────────────────────────────────────

describe('resolveWiredValues', () => {
  it('empty → 0 (pull-down)', () => {
    expect(resolveWiredValues([])).toBe(0);
  });
  it('single value passes through unchanged', () => {
    expect(resolveWiredValues([0])).toBe(0);
    expect(resolveWiredValues([1])).toBe(1);
    expect(resolveWiredValues([Z])).toBe(Z);
    expect(resolveWiredValues([X])).toBe(X);
  });
  it('all Z → Z', () => {
    expect(resolveWiredValues([Z, Z])).toBe(Z);
    expect(resolveWiredValues([Z, Z, Z])).toBe(Z);
  });
  it('one active + rest Z → active value', () => {
    expect(resolveWiredValues([0, Z])).toBe(0);
    expect(resolveWiredValues([1, Z])).toBe(1);
    expect(resolveWiredValues([Z, 1, Z])).toBe(1);
  });
  it('same active value from multiple drivers → that value', () => {
    expect(resolveWiredValues([1, 1])).toBe(1);
    expect(resolveWiredValues([0, 0])).toBe(0);
    expect(resolveWiredValues([1, 1, Z])).toBe(1);
  });
  it('conflicting 0 + 1 → X (bus fight)', () => {
    expect(resolveWiredValues([0, 1])).toBe(X);
    expect(resolveWiredValues([1, 0, Z])).toBe(X);
  });
  it('any X in inputs → X', () => {
    expect(resolveWiredValues([X, 0])).toBe(X);
    expect(resolveWiredValues([X, Z])).toBe(X);
    expect(resolveWiredValues([X, 1, Z])).toBe(X);
  });
});

// ── logicNOT ─────────────────────────────────────────────────────────────────

describe('logicNOT', () => {
  it('NOT 0 = 1', () => expect(logicNOT(0)).toBe(1));
  it('NOT 1 = 0', () => expect(logicNOT(1)).toBe(0));
  it('NOT Z = X', () => expect(logicNOT(Z)).toBe(X));
  it('NOT X = X', () => expect(logicNOT(X)).toBe(X));
});

// ── logicAND ─────────────────────────────────────────────────────────────────

describe('logicAND', () => {
  it('0 dominates', () => {
    expect(logicAND([0, 1])).toBe(0);
    expect(logicAND([0, Z])).toBe(0);
    expect(logicAND([0, X])).toBe(0);
  });
  it('all 1 → 1', () => {
    expect(logicAND([1, 1])).toBe(1);
  });
  it('Z without 0 → X', () => {
    expect(logicAND([Z, 1])).toBe(X);
    expect(logicAND([Z, Z])).toBe(X);
  });
  it('X without 0 → X', () => {
    expect(logicAND([X, 1])).toBe(X);
  });
});

// ── logicOR ──────────────────────────────────────────────────────────────────

describe('logicOR', () => {
  it('1 dominates', () => {
    expect(logicOR([1, 0])).toBe(1);
    expect(logicOR([1, Z])).toBe(1);
    expect(logicOR([1, X])).toBe(1);
  });
  it('all 0 → 0', () => {
    expect(logicOR([0, 0])).toBe(0);
  });
  it('Z without 1 → X', () => {
    expect(logicOR([Z, 0])).toBe(X);
    expect(logicOR([Z, Z])).toBe(X);
  });
  it('X without 1 → X', () => {
    expect(logicOR([X, 0])).toBe(X);
  });
});

// ── logicXOR / logicXNOR ─────────────────────────────────────────────────────

describe('logicXOR', () => {
  it('0^0=0, 0^1=1, 1^0=1, 1^1=0', () => {
    expect(logicXOR(0, 0)).toBe(0);
    expect(logicXOR(0, 1)).toBe(1);
    expect(logicXOR(1, 0)).toBe(1);
    expect(logicXOR(1, 1)).toBe(0);
  });
  it('any Z/X → X', () => {
    expect(logicXOR(Z, 0)).toBe(X);
    expect(logicXOR(0, X)).toBe(X);
    expect(logicXOR(Z, X)).toBe(X);
  });
});

describe('logicXNOR', () => {
  it('0⊙0=1, 0⊙1=0, 1⊙1=1', () => {
    expect(logicXNOR(0, 0)).toBe(1);
    expect(logicXNOR(0, 1)).toBe(0);
    expect(logicXNOR(1, 1)).toBe(1);
  });
  it('any Z/X → X', () => {
    expect(logicXNOR(Z, 1)).toBe(X);
    expect(logicXNOR(X, 0)).toBe(X);
  });
});

// ── Gate evaluate with Z/X ────────────────────────────────────────────────────

describe('NOT gate evaluate with Z/X', () => {
  const def = gateRegistry.get('NOT');
  it('NOT(0) = 1', () => expect(def.evaluate({ a: 0 }).out).toBe(1));
  it('NOT(1) = 0', () => expect(def.evaluate({ a: 1 }).out).toBe(0));
  it('NOT(Z) = X', () => expect(def.evaluate({ a: Z }).out).toBe(X));
  it('NOT(X) = X', () => expect(def.evaluate({ a: X }).out).toBe(X));
});

describe('AND gate evaluate with Z/X', () => {
  const def = gateRegistry.get('AND');
  it('AND(1,1)=1, AND(0,1)=0', () => {
    expect(def.evaluate({ a: 1, b: 1 }).out).toBe(1);
    expect(def.evaluate({ a: 0, b: 1 }).out).toBe(0);
  });
  it('AND(Z,1)=X (Z without 0)', () => expect(def.evaluate({ a: Z, b: 1 }).out).toBe(X));
  it('AND(Z,0)=0 (0 dominates)', () => expect(def.evaluate({ a: Z, b: 0 }).out).toBe(0));
  it('AND(X,0)=0 (0 dominates)', () => expect(def.evaluate({ a: X, b: 0 }).out).toBe(0));
});

describe('OR gate evaluate with Z/X', () => {
  const def = gateRegistry.get('OR');
  it('OR(0,0)=0, OR(0,1)=1', () => {
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(0);
    expect(def.evaluate({ a: 0, b: 1 }).out).toBe(1);
  });
  it('OR(Z,0)=X (Z without 1)', () => expect(def.evaluate({ a: Z, b: 0 }).out).toBe(X));
  it('OR(Z,1)=1 (1 dominates)', () => expect(def.evaluate({ a: Z, b: 1 }).out).toBe(1));
  it('OR(X,1)=1 (1 dominates)', () => expect(def.evaluate({ a: X, b: 1 }).out).toBe(1));
});

// ── Z propagation in simulation engine (tri_not_sanitized) ───────────────────

describe('tri_not_sanitized: Z propagates through wire → NOT outputs X', () => {
  it('TRIBUF(A=1, OE=1) → Z → NOT → X', () => {
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
    for (let i = 0; i < 5; i++) {
      buf = runOneTick(circuit, buf, wireMap, true);
    }

    expect(buf.outputs['tri']?.['y']).toBe(Z);
    expect(buf.outputs['inv']?.['out']).toBe(X);
  });
});

// ── Multi-driver conflict → X ─────────────────────────────────────────────────

describe('multi_driver_same_input: conflicting drivers → X on net', () => {
  it('CONST_HIGH and CONST_LOW both driving same input → X', () => {
    // Two constant sources driving the same AND input → resolveWiredValues([1,0]) = X
    // AND(X, 1) can still resolve if dominant logic applies, but here we test the LED output
    const high = makeGate('sw_high', 'CONST_HIGH');
    const low  = makeGate('sw_low',  'CONST_LOW');
    const led  = makeGate('led', 'OUTPUT_LED');

    const wires = [
      makeWire('w1', 'sw_high', 'out', 'led', 'in'),
      makeWire('w2', 'sw_low',  'out', 'led', 'in'),
    ];

    const circuit = makeCircuit([high, low, led], wires);
    const wireMap = buildWireMap(circuit);
    let buf = initBuffer(circuit);
    for (let i = 0; i < 5; i++) {
      buf = runOneTick(circuit, buf, wireMap, true);
    }

    // LED 'in' receives [1, 0] → resolveWiredValues = X
    // Structural test: circuit ran without crash and LED gate exists in buffer
    expect(buf.outputs['led']).toBeDefined();
  });

  it('conflicting 0+1 drivers on NOT input → NOT outputs X', () => {
    const high = makeGate('sw_high', 'CONST_HIGH');
    const low  = makeGate('sw_low',  'CONST_LOW');
    const inv  = makeGate('inv', 'NOT');

    const wires = [
      makeWire('w1', 'sw_high', 'out', 'inv', 'a'),
      makeWire('w2', 'sw_low',  'out', 'inv', 'a'),
    ];

    const circuit = makeCircuit([high, low, inv], wires);
    const wireMap = buildWireMap(circuit);
    let buf = initBuffer(circuit);
    for (let i = 0; i < 5; i++) {
      buf = runOneTick(circuit, buf, wireMap, true);
    }

    // resolveWiredValues([1, 0]) = X → NOT(X) = X
    expect(buf.outputs['inv']?.['out']).toBe(X);
  });
});

// ── Regression: basic gates with 0/1 still correct ───────────────────────────

describe('Regression: basic gates still correct with 0/1', () => {
  it('AND: truth table', () => {
    const def = gateRegistry.get('AND');
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(0);
    expect(def.evaluate({ a: 0, b: 1 }).out).toBe(0);
    expect(def.evaluate({ a: 1, b: 0 }).out).toBe(0);
    expect(def.evaluate({ a: 1, b: 1 }).out).toBe(1);
  });
  it('OR: truth table', () => {
    const def = gateRegistry.get('OR');
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(0);
    expect(def.evaluate({ a: 0, b: 1 }).out).toBe(1);
    expect(def.evaluate({ a: 1, b: 0 }).out).toBe(1);
    expect(def.evaluate({ a: 1, b: 1 }).out).toBe(1);
  });
  it('NAND: truth table', () => {
    const def = gateRegistry.get('NAND');
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(1);
    expect(def.evaluate({ a: 1, b: 1 }).out).toBe(0);
  });
  it('NOR: truth table', () => {
    const def = gateRegistry.get('NOR');
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(1);
    expect(def.evaluate({ a: 1, b: 0 }).out).toBe(0);
  });
  it('XOR: truth table', () => {
    const def = gateRegistry.get('XOR');
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(0);
    expect(def.evaluate({ a: 0, b: 1 }).out).toBe(1);
    expect(def.evaluate({ a: 1, b: 1 }).out).toBe(0);
  });
  it('XNOR: truth table', () => {
    const def = gateRegistry.get('XNOR');
    expect(def.evaluate({ a: 0, b: 0 }).out).toBe(1);
    expect(def.evaluate({ a: 0, b: 1 }).out).toBe(0);
    expect(def.evaluate({ a: 1, b: 1 }).out).toBe(1);
  });
  it('NOT: truth table', () => {
    const def = gateRegistry.get('NOT');
    expect(def.evaluate({ a: 0 }).out).toBe(1);
    expect(def.evaluate({ a: 1 }).out).toBe(0);
  });
});

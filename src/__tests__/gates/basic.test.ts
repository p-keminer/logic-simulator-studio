import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';

describe('Gate Registry', () => {
  it('should have basic gates registered', () => {
    expect(gateRegistry.has('AND')).toBe(true);
    expect(gateRegistry.has('OR')).toBe(true);
    expect(gateRegistry.has('NOT')).toBe(true);
    expect(gateRegistry.has('NAND')).toBe(true);
    expect(gateRegistry.has('NOR')).toBe(true);
    expect(gateRegistry.has('XOR')).toBe(true);
    expect(gateRegistry.has('XNOR')).toBe(true);
    expect(gateRegistry.has('BUFFER')).toBe(true);
  });

  it('AND gate should have correct properties', () => {
    const andGate = gateRegistry.get('AND');
    expect(andGate.typeId).toBe('AND');
    expect(andGate.label).toBe('AND');
    expect(andGate.category).toBe('logic_basic');
    expect(andGate.inputs).toHaveLength(2);
    expect(andGate.outputs).toHaveLength(1);
    expect(andGate.inputs[0].id).toBe('a');
    expect(andGate.inputs[1].id).toBe('b');
    expect(andGate.outputs[0].id).toBe('out');
  });
});

describe('AND gate evaluate', () => {
  const andGate = gateRegistry.get('AND');

  it('AND(0, 0) = 0', () => {
    expect(andGate.evaluate({ a: 0, b: 0 })).toEqual({ out: 0 });
  });

  it('AND(0, 1) = 0', () => {
    expect(andGate.evaluate({ a: 0, b: 1 })).toEqual({ out: 0 });
  });

  it('AND(1, 0) = 0', () => {
    expect(andGate.evaluate({ a: 1, b: 0 })).toEqual({ out: 0 });
  });

  it('AND(1, 1) = 1', () => {
    expect(andGate.evaluate({ a: 1, b: 1 })).toEqual({ out: 1 });
  });
});

describe('OR gate evaluate', () => {
  const orGate = gateRegistry.get('OR');

  it('OR(0, 0) = 0', () => {
    expect(orGate.evaluate({ a: 0, b: 0 })).toEqual({ out: 0 });
  });

  it('OR(0, 1) = 1', () => {
    expect(orGate.evaluate({ a: 0, b: 1 })).toEqual({ out: 1 });
  });

  it('OR(1, 0) = 1', () => {
    expect(orGate.evaluate({ a: 1, b: 0 })).toEqual({ out: 1 });
  });

  it('OR(1, 1) = 1', () => {
    expect(orGate.evaluate({ a: 1, b: 1 })).toEqual({ out: 1 });
  });
});

describe('NOT gate evaluate', () => {
  const notGate = gateRegistry.get('NOT');

  it('NOT(0) = 1', () => {
    expect(notGate.evaluate({ a: 0 })).toEqual({ out: 1 });
  });

  it('NOT(1) = 0', () => {
    expect(notGate.evaluate({ a: 1 })).toEqual({ out: 0 });
  });
});

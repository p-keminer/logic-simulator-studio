import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';

// ── Helper: evaluate a gate by typeId ──────────────────────────────────────
function evalGate(
  typeId: string,
  inputs: Record<string, 0 | 1>,
): Record<string, 0 | 1> {
  const def = gateRegistry.get(typeId);
  if (!def) throw new Error(`Gate ${typeId} not found`);
  return def.evaluate(inputs, {}) as Record<string, 0 | 1>;
}

// ════════════════════════════════════════════════════════════════════════════
//  1. NOT gate  (1 input, 2 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('NOT gate – complete truth table', () => {
  it.each([
    { a: 0 as const, out: 1 as const },
    { a: 1 as const, out: 0 as const },
  ])('NOT($a) = $out', ({ a, out }) => {
    expect(evalGate('NOT', { a })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  2. AND gate  (2 inputs, 4 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('AND gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, out: 0 as const },
    { a: 0 as const, b: 1 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, out: 1 as const },
  ])('AND($a, $b) = $out', ({ a, b, out }) => {
    expect(evalGate('AND', { a, b })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  3. OR gate  (2 inputs, 4 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('OR gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, out: 0 as const },
    { a: 0 as const, b: 1 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, out: 1 as const },
    { a: 1 as const, b: 1 as const, out: 1 as const },
  ])('OR($a, $b) = $out', ({ a, b, out }) => {
    expect(evalGate('OR', { a, b })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  4. NAND gate  (2 inputs, 4 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('NAND gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, out: 1 as const },
    { a: 1 as const, b: 1 as const, out: 0 as const },
  ])('NAND($a, $b) = $out', ({ a, b, out }) => {
    expect(evalGate('NAND', { a, b })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  5. NOR gate  (2 inputs, 4 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('NOR gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, out: 0 as const },
  ])('NOR($a, $b) = $out', ({ a, b, out }) => {
    expect(evalGate('NOR', { a, b })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  6. XOR gate  (2 inputs, 4 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('XOR gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, out: 0 as const },
    { a: 0 as const, b: 1 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, out: 1 as const },
    { a: 1 as const, b: 1 as const, out: 0 as const },
  ])('XOR($a, $b) = $out', ({ a, b, out }) => {
    expect(evalGate('XOR', { a, b })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  7. XNOR gate  (2 inputs, 4 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('XNOR gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, out: 1 as const },
  ])('XNOR($a, $b) = $out', ({ a, b, out }) => {
    expect(evalGate('XNOR', { a, b })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  8. BUFFER gate  (1 input, 2 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('BUFFER gate – complete truth table', () => {
  it.each([
    { a: 0 as const, out: 0 as const },
    { a: 1 as const, out: 1 as const },
  ])('BUFFER($a) = $out', ({ a, out }) => {
    expect(evalGate('BUFFER', { a })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  9. AND3 gate  (3 inputs, 8 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('AND3 gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, c: 0 as const, out: 0 as const },
    { a: 0 as const, b: 0 as const, c: 1 as const, out: 0 as const },
    { a: 0 as const, b: 1 as const, c: 0 as const, out: 0 as const },
    { a: 0 as const, b: 1 as const, c: 1 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, c: 0 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, c: 1 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, c: 0 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, c: 1 as const, out: 1 as const },
  ])('AND3($a, $b, $c) = $out', ({ a, b, c, out }) => {
    expect(evalGate('AND3', { a, b, c })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  10. AND4 gate  (4 inputs, 16 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('AND4 gate – complete truth table', () => {
  const rows: { a: 0 | 1; b: 0 | 1; c: 0 | 1; d: 0 | 1; out: 0 | 1 }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = ((i >> 3) & 1) as 0 | 1;
    const b = ((i >> 2) & 1) as 0 | 1;
    const c = ((i >> 1) & 1) as 0 | 1;
    const d = ((i >> 0) & 1) as 0 | 1;
    rows.push({ a, b, c, d, out: (a & b & c & d) as 0 | 1 });
  }
  it.each(rows)('AND4($a, $b, $c, $d) = $out', ({ a, b, c, d, out }) => {
    expect(evalGate('AND4', { a, b, c, d })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  11. OR3 gate  (3 inputs, 8 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('OR3 gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, c: 0 as const, out: 0 as const },
    { a: 0 as const, b: 0 as const, c: 1 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, c: 0 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, c: 1 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, c: 0 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, c: 1 as const, out: 1 as const },
    { a: 1 as const, b: 1 as const, c: 0 as const, out: 1 as const },
    { a: 1 as const, b: 1 as const, c: 1 as const, out: 1 as const },
  ])('OR3($a, $b, $c) = $out', ({ a, b, c, out }) => {
    expect(evalGate('OR3', { a, b, c })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  12. OR4 gate  (4 inputs, 16 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('OR4 gate – complete truth table', () => {
  const rows: { a: 0 | 1; b: 0 | 1; c: 0 | 1; d: 0 | 1; out: 0 | 1 }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = ((i >> 3) & 1) as 0 | 1;
    const b = ((i >> 2) & 1) as 0 | 1;
    const c = ((i >> 1) & 1) as 0 | 1;
    const d = ((i >> 0) & 1) as 0 | 1;
    rows.push({ a, b, c, d, out: ((a | b | c | d) as 0 | 1) });
  }
  it.each(rows)('OR4($a, $b, $c, $d) = $out', ({ a, b, c, d, out }) => {
    expect(evalGate('OR4', { a, b, c, d })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  13. NAND3 gate  (3 inputs, 8 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('NAND3 gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, c: 0 as const, out: 1 as const },
    { a: 0 as const, b: 0 as const, c: 1 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, c: 0 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, c: 1 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, c: 0 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, c: 1 as const, out: 1 as const },
    { a: 1 as const, b: 1 as const, c: 0 as const, out: 1 as const },
    { a: 1 as const, b: 1 as const, c: 1 as const, out: 0 as const },
  ])('NAND3($a, $b, $c) = $out', ({ a, b, c, out }) => {
    expect(evalGate('NAND3', { a, b, c })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  14. NAND4 gate  (4 inputs, 16 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('NAND4 gate – complete truth table', () => {
  const rows: { a: 0 | 1; b: 0 | 1; c: 0 | 1; d: 0 | 1; out: 0 | 1 }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = ((i >> 3) & 1) as 0 | 1;
    const b = ((i >> 2) & 1) as 0 | 1;
    const c = ((i >> 1) & 1) as 0 | 1;
    const d = ((i >> 0) & 1) as 0 | 1;
    rows.push({ a, b, c, d, out: ((a & b & c & d) === 1 ? 0 : 1) as 0 | 1 });
  }
  it.each(rows)('NAND4($a, $b, $c, $d) = $out', ({ a, b, c, d, out }) => {
    expect(evalGate('NAND4', { a, b, c, d })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  15. NOR3 gate  (3 inputs, 8 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('NOR3 gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, c: 0 as const, out: 1 as const },
    { a: 0 as const, b: 0 as const, c: 1 as const, out: 0 as const },
    { a: 0 as const, b: 1 as const, c: 0 as const, out: 0 as const },
    { a: 0 as const, b: 1 as const, c: 1 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, c: 0 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, c: 1 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, c: 0 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, c: 1 as const, out: 0 as const },
  ])('NOR3($a, $b, $c) = $out', ({ a, b, c, out }) => {
    expect(evalGate('NOR3', { a, b, c })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  16. NOR4 gate  (4 inputs, 16 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('NOR4 gate – complete truth table', () => {
  const rows: { a: 0 | 1; b: 0 | 1; c: 0 | 1; d: 0 | 1; out: 0 | 1 }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = ((i >> 3) & 1) as 0 | 1;
    const b = ((i >> 2) & 1) as 0 | 1;
    const c = ((i >> 1) & 1) as 0 | 1;
    const d = ((i >> 0) & 1) as 0 | 1;
    rows.push({ a, b, c, d, out: ((a | b | c | d) === 0 ? 1 : 0) as 0 | 1 });
  }
  it.each(rows)('NOR4($a, $b, $c, $d) = $out', ({ a, b, c, d, out }) => {
    expect(evalGate('NOR4', { a, b, c, d })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  17. XOR3 gate  (3 inputs, 8 rows)
// ════════════════════════════════════════════════════════════════════════════
describe('XOR3 gate – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, c: 0 as const, out: 0 as const },
    { a: 0 as const, b: 0 as const, c: 1 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, c: 0 as const, out: 1 as const },
    { a: 0 as const, b: 1 as const, c: 1 as const, out: 0 as const },
    { a: 1 as const, b: 0 as const, c: 0 as const, out: 1 as const },
    { a: 1 as const, b: 0 as const, c: 1 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, c: 0 as const, out: 0 as const },
    { a: 1 as const, b: 1 as const, c: 1 as const, out: 1 as const },
  ])('XOR3($a, $b, $c) = $out', ({ a, b, c, out }) => {
    expect(evalGate('XOR3', { a, b, c })).toEqual({ out });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  18. CONST_HIGH  (no inputs, output always 1)
// ════════════════════════════════════════════════════════════════════════════
describe('CONST_HIGH gate', () => {
  it('always outputs 1', () => {
    expect(evalGate('CONST_HIGH', {})).toEqual({ out: 1 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  19. CONST_LOW  (no inputs, output always 0)
// ════════════════════════════════════════════════════════════════════════════
describe('CONST_LOW gate', () => {
  it('always outputs 0', () => {
    expect(evalGate('CONST_LOW', {})).toEqual({ out: 0 });
  });
});

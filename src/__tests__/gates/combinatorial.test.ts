import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';

// ── Helper: evaluate a gate by typeId ──────────────────────────────────────
function evalGate(
  typeId: string,
  inputs: Record<string, 0 | 1>,
): Record<string, number> {
  const def = gateRegistry.get(typeId);
  if (!def) throw new Error(`Gate ${typeId} not found`);
  return def.evaluate(inputs, {}) as Record<string, number>;
}

// ════════════════════════════════════════════════════════════════════════════
//  1. MUX2 – 2:1 Multiplexer  (d0, d1, s -> y)
//     All 8 input combinations
// ════════════════════════════════════════════════════════════════════════════
describe('MUX2 – complete truth table', () => {
  // When s=0, y=d0.  When s=1, y=d1.
  it.each([
    { d0: 0 as const, d1: 0 as const, s: 0 as const, y: 0 },
    { d0: 0 as const, d1: 0 as const, s: 1 as const, y: 0 },
    { d0: 0 as const, d1: 1 as const, s: 0 as const, y: 0 },
    { d0: 0 as const, d1: 1 as const, s: 1 as const, y: 1 },
    { d0: 1 as const, d1: 0 as const, s: 0 as const, y: 1 },
    { d0: 1 as const, d1: 0 as const, s: 1 as const, y: 0 },
    { d0: 1 as const, d1: 1 as const, s: 0 as const, y: 1 },
    { d0: 1 as const, d1: 1 as const, s: 1 as const, y: 1 },
  ])('MUX2(d0=$d0, d1=$d1, s=$s) => y=$y', ({ d0, d1, s, y }) => {
    expect(evalGate('MUX2', { d0, d1, s })).toEqual({ y });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  2. MUX4 – 4:1 Multiplexer  (d0, d1, d2, d3, s0, s1 -> y)
//     sel = (s1 << 1) | s0  =>  sel selects d0..d3
// ════════════════════════════════════════════════════════════════════════════
describe('MUX4 – selection of each input', () => {
  it('sel=0 (s1=0,s0=0) selects d0', () => {
    expect(evalGate('MUX4', { d0: 1, d1: 0, d2: 0, d3: 0, s0: 0, s1: 0 })).toEqual({ y: 1 });
    expect(evalGate('MUX4', { d0: 0, d1: 1, d2: 1, d3: 1, s0: 0, s1: 0 })).toEqual({ y: 0 });
  });

  it('sel=1 (s1=0,s0=1) selects d1', () => {
    expect(evalGate('MUX4', { d0: 0, d1: 1, d2: 0, d3: 0, s0: 1, s1: 0 })).toEqual({ y: 1 });
    expect(evalGate('MUX4', { d0: 1, d1: 0, d2: 1, d3: 1, s0: 1, s1: 0 })).toEqual({ y: 0 });
  });

  it('sel=2 (s1=1,s0=0) selects d2', () => {
    expect(evalGate('MUX4', { d0: 0, d1: 0, d2: 1, d3: 0, s0: 0, s1: 1 })).toEqual({ y: 1 });
    expect(evalGate('MUX4', { d0: 1, d1: 1, d2: 0, d3: 1, s0: 0, s1: 1 })).toEqual({ y: 0 });
  });

  it('sel=3 (s1=1,s0=1) selects d3', () => {
    expect(evalGate('MUX4', { d0: 0, d1: 0, d2: 0, d3: 1, s0: 1, s1: 1 })).toEqual({ y: 1 });
    expect(evalGate('MUX4', { d0: 1, d1: 1, d2: 1, d3: 0, s0: 1, s1: 1 })).toEqual({ y: 0 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  3. DEMUX2 – 1:2 Demultiplexer  (d, s -> y0, y1)
//     s=0 => y0=d, y1=0.   s=1 => y0=0, y1=d.
// ════════════════════════════════════════════════════════════════════════════
describe('DEMUX2 – complete truth table', () => {
  it.each([
    { d: 0 as const, s: 0 as const, y0: 0, y1: 0 },
    { d: 0 as const, s: 1 as const, y0: 0, y1: 0 },
    { d: 1 as const, s: 0 as const, y0: 1, y1: 0 },
    { d: 1 as const, s: 1 as const, y0: 0, y1: 1 },
  ])('DEMUX2(d=$d, s=$s) => y0=$y0, y1=$y1', ({ d, s, y0, y1 }) => {
    expect(evalGate('DEMUX2', { d, s })).toEqual({ y0, y1 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  4. DEMUX4 – 1:4 Demultiplexer  (d, s0, s1 -> y0, y1, y2, y3)
//     sel = (s1 << 1) | s0
// ════════════════════════════════════════════════════════════════════════════
describe('DEMUX4 – all 4 select states', () => {
  it('sel=0 (s1=0,s0=0): d routed to y0', () => {
    expect(evalGate('DEMUX4', { d: 1, s0: 0, s1: 0 })).toEqual({ y0: 1, y1: 0, y2: 0, y3: 0 });
    expect(evalGate('DEMUX4', { d: 0, s0: 0, s1: 0 })).toEqual({ y0: 0, y1: 0, y2: 0, y3: 0 });
  });

  it('sel=1 (s1=0,s0=1): d routed to y1', () => {
    expect(evalGate('DEMUX4', { d: 1, s0: 1, s1: 0 })).toEqual({ y0: 0, y1: 1, y2: 0, y3: 0 });
    expect(evalGate('DEMUX4', { d: 0, s0: 1, s1: 0 })).toEqual({ y0: 0, y1: 0, y2: 0, y3: 0 });
  });

  it('sel=2 (s1=1,s0=0): d routed to y2', () => {
    expect(evalGate('DEMUX4', { d: 1, s0: 0, s1: 1 })).toEqual({ y0: 0, y1: 0, y2: 1, y3: 0 });
    expect(evalGate('DEMUX4', { d: 0, s0: 0, s1: 1 })).toEqual({ y0: 0, y1: 0, y2: 0, y3: 0 });
  });

  it('sel=3 (s1=1,s0=1): d routed to y3', () => {
    expect(evalGate('DEMUX4', { d: 1, s0: 1, s1: 1 })).toEqual({ y0: 0, y1: 0, y2: 0, y3: 1 });
    expect(evalGate('DEMUX4', { d: 0, s0: 1, s1: 1 })).toEqual({ y0: 0, y1: 0, y2: 0, y3: 0 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  5. CMP1 – 1-bit Comparator  (a, b -> eq, gt, lt)
// ════════════════════════════════════════════════════════════════════════════
describe('CMP1 – complete truth table', () => {
  it.each([
    { a: 0 as const, b: 0 as const, eq: 1, gt: 0, lt: 0 },  // 0 == 0
    { a: 0 as const, b: 1 as const, eq: 0, gt: 0, lt: 1 },  // 0 <  1
    { a: 1 as const, b: 0 as const, eq: 0, gt: 1, lt: 0 },  // 1 >  0
    { a: 1 as const, b: 1 as const, eq: 1, gt: 0, lt: 0 },  // 1 == 1
  ])('CMP1(a=$a, b=$b) => eq=$eq, gt=$gt, lt=$lt', ({ a, b, eq, gt, lt }) => {
    expect(evalGate('CMP1', { a, b })).toEqual({ eq, gt, lt });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  6. TRIBUF – Tri-State Buffer  (a, oe -> y)
//     /OE=0 => Y=A (enabled);  /OE=1 => Y=0 (Hi-Z represented as 0)
// ════════════════════════════════════════════════════════════════════════════
describe('TRIBUF – tri-state buffer', () => {
  it('/OE=0 (enabled): passes input through', () => {
    expect(evalGate('TRIBUF', { a: 0, oe: 0 })).toEqual({ y: 0 });
    expect(evalGate('TRIBUF', { a: 1, oe: 0 })).toEqual({ y: 1 });
  });

  it('/OE=1 (disabled): output is Hi-Z (2)', () => {
    expect(evalGate('TRIBUF', { a: 0, oe: 1 })).toEqual({ y: 2 });
    expect(evalGate('TRIBUF', { a: 1, oe: 1 })).toEqual({ y: 2 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  7. SPLIT4 – 4-bit Bus Splitter  (a0..a3 -> y0..y3)
//     Each input passes through to corresponding output
// ════════════════════════════════════════════════════════════════════════════
describe('SPLIT4 – 4-bit bus splitter', () => {
  it('all zeros pass through', () => {
    expect(evalGate('SPLIT4', { a0: 0, a1: 0, a2: 0, a3: 0 }))
      .toEqual({ y0: 0, y1: 0, y2: 0, y3: 0 });
  });

  it('all ones pass through', () => {
    expect(evalGate('SPLIT4', { a0: 1, a1: 1, a2: 1, a3: 1 }))
      .toEqual({ y0: 1, y1: 1, y2: 1, y3: 1 });
  });

  it('individual bits pass through independently', () => {
    // Only a0 = 1
    expect(evalGate('SPLIT4', { a0: 1, a1: 0, a2: 0, a3: 0 }))
      .toEqual({ y0: 1, y1: 0, y2: 0, y3: 0 });
    // Only a1 = 1
    expect(evalGate('SPLIT4', { a0: 0, a1: 1, a2: 0, a3: 0 }))
      .toEqual({ y0: 0, y1: 1, y2: 0, y3: 0 });
    // Only a2 = 1
    expect(evalGate('SPLIT4', { a0: 0, a1: 0, a2: 1, a3: 0 }))
      .toEqual({ y0: 0, y1: 0, y2: 1, y3: 0 });
    // Only a3 = 1
    expect(evalGate('SPLIT4', { a0: 0, a1: 0, a2: 0, a3: 1 }))
      .toEqual({ y0: 0, y1: 0, y2: 0, y3: 1 });
  });

  it('mixed pattern passes through', () => {
    expect(evalGate('SPLIT4', { a0: 1, a1: 0, a2: 1, a3: 0 }))
      .toEqual({ y0: 1, y1: 0, y2: 1, y3: 0 });
    expect(evalGate('SPLIT4', { a0: 0, a1: 1, a2: 0, a3: 1 }))
      .toEqual({ y0: 0, y1: 1, y2: 0, y3: 1 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  8. SPLIT8 – 8-bit Bus Splitter  (a0..a7 -> y0..y7)
//     Each input passes through to corresponding output
// ════════════════════════════════════════════════════════════════════════════
describe('SPLIT8 – 8-bit bus splitter', () => {
  it('all zeros pass through', () => {
    expect(evalGate('SPLIT8', { a0: 0, a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0 }))
      .toEqual({ y0: 0, y1: 0, y2: 0, y3: 0, y4: 0, y5: 0, y6: 0, y7: 0 });
  });

  it('all ones pass through', () => {
    expect(evalGate('SPLIT8', { a0: 1, a1: 1, a2: 1, a3: 1, a4: 1, a5: 1, a6: 1, a7: 1 }))
      .toEqual({ y0: 1, y1: 1, y2: 1, y3: 1, y4: 1, y5: 1, y6: 1, y7: 1 });
  });

  it('individual bits pass through independently', () => {
    for (let bit = 0; bit < 8; bit++) {
      const inputs: Record<string, 0 | 1> = {};
      const expected: Record<string, number> = {};
      for (let j = 0; j < 8; j++) {
        inputs[`a${j}`] = (j === bit ? 1 : 0) as 0 | 1;
        expected[`y${j}`] = j === bit ? 1 : 0;
      }
      expect(evalGate('SPLIT8', inputs)).toEqual(expected);
    }
  });

  it('mixed pattern passes through (alternating bits)', () => {
    expect(evalGate('SPLIT8', { a0: 1, a1: 0, a2: 1, a3: 0, a4: 1, a5: 0, a6: 1, a7: 0 }))
      .toEqual({ y0: 1, y1: 0, y2: 1, y3: 0, y4: 1, y5: 0, y6: 1, y7: 0 });
  });

  it('upper nibble only', () => {
    expect(evalGate('SPLIT8', { a0: 0, a1: 0, a2: 0, a3: 0, a4: 1, a5: 1, a6: 1, a7: 1 }))
      .toEqual({ y0: 0, y1: 0, y2: 0, y3: 0, y4: 1, y5: 1, y6: 1, y7: 1 });
  });
});

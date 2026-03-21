import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'x'; }

// ── Helpers: packed integer ↔ individual bit state keys ──────────────────────
// Reconstruct a packed integer from individual bit stateKeys (prefix0..prefixN-1).
// Falls back to the legacy packed key if individual bits aren't set.
function bitsFromState(cs: Record<string, unknown> | undefined, prefix: string, width: number, legacyKey: string): number {
  if (cs && cs[`${prefix}0`] !== undefined) {
    let v = 0;
    for (let i = 0; i < width; i++) v |= (((cs[`${prefix}${i}`] as number) ?? 0) & 1) << i;
    return v;
  }
  return (cs?.[legacyKey] as number) ?? 0;
}

// Decompose a packed integer into individual bit stateKeys.
function bitsToState(value: number, prefix: string, width: number): Record<string, number> {
  const s: Record<string, number> = {};
  for (let i = 0; i < width; i++) s[`${prefix}${i}`] = (value >> i) & 1;
  return s;
}

function makeStateKeys(prefix: string, width: number): string[] {
  return Array.from({ length: width }, (_, i) => `${prefix}${i}`);
}

// 74HC00 – Quad NAND 2-input
gateRegistry.register({
  typeId: '74HC00', label: '74HC00', category: 'ic74', width: 100, height: 120,
  propagationDelay: 7,
  inputs: [
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.09 },
    { id: 'b1', label: 'B1', relativeX: 0, relativeY: 0.22 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.35 },
    { id: 'b2', label: 'B2', relativeX: 0, relativeY: 0.48 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.61 },
    { id: 'b3', label: 'B3', relativeX: 0, relativeY: 0.74 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.87 },
    { id: 'b4', label: 'B4', relativeX: 0, relativeY: 1.0 },
  ],
  outputs: [
    { id: 'y1', label: 'Y1', relativeX: 1, relativeY: 0.155 },
    { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.415 },
    { id: 'y3', label: 'Y3', relativeX: 1, relativeY: 0.675 },
    { id: 'y4', label: 'Y4', relativeX: 1, relativeY: 0.935 },
  ],
  evaluate: ({ a1, b1, a2, b2, a3, b3, a4, b4 }) => ({
    y1: ((a1 & b1) ^ 1) as 0|1,
    y2: ((a2 & b2) ^ 1) as 0|1,
    y3: ((a3 & b3) ^ 1) as 0|1,
    y4: ((a4 & b4) ^ 1) as 0|1,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`// 74HC00 ${sid}`, `assign ${y1} = ~(${a1} & ${b1});`, `assign ${y2} = ~(${a2} & ${b2});`, `assign ${y3} = ~(${a3} & ${b3});`, `assign ${y4} = ~(${a4} & ${b4});`].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`-- 74HC00 ${sid}`, `${y1} <= not (${a1} and ${b1});`, `${y2} <= not (${a2} and ${b2});`, `${y3} <= not (${a3} and ${b3});`, `${y4} <= not (${a4} and ${b4});`].join('\n');
  },
  shapeComponent: FlipFlopShape, description: 'Quad 2-Eingang NAND (4x NAND)',
});

// 74HC04 – Hex Inverter
gateRegistry.register({
  typeId: '74HC04', label: '74HC04', category: 'ic74', width: 100, height: 110,
  propagationDelay: 7,
  inputs: [
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.09 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.25 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.42 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.58 },
    { id: 'a5', label: 'A5', relativeX: 0, relativeY: 0.75 },
    { id: 'a6', label: 'A6', relativeX: 0, relativeY: 0.92 },
  ],
  outputs: [
    { id: 'y1', label: 'Y1', relativeX: 1, relativeY: 0.09 },
    { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.25 },
    { id: 'y3', label: 'Y3', relativeX: 1, relativeY: 0.42 },
    { id: 'y4', label: 'Y4', relativeX: 1, relativeY: 0.58 },
    { id: 'y5', label: 'Y5', relativeX: 1, relativeY: 0.75 },
    { id: 'y6', label: 'Y6', relativeX: 1, relativeY: 0.92 },
  ],
  evaluate: ({ a1, a2, a3, a4, a5, a6 }) => ({
    y1: (a1 ^ 1) as 0|1, y2: (a2 ^ 1) as 0|1, y3: (a3 ^ 1) as 0|1,
    y4: (a4 ^ 1) as 0|1, y5: (a5 ^ 1) as 0|1, y6: (a6 ^ 1) as 0|1,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const as = ['a1','a2','a3','a4','a5','a6'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const ys = ['y1','y2','y3','y4','y5','y6'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`// 74HC04 ${sid}`, ...ys.map((y,i) => `assign ${y} = ~${as[i]};`)].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const as = ['a1','a2','a3','a4','a5','a6'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const ys = ['y1','y2','y3','y4','y5','y6'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`-- 74HC04 ${sid}`, ...ys.map((y,i) => `${y} <= not ${as[i]};`)].join('\n');
  },
  shapeComponent: FlipFlopShape, description: 'Hex-Inverter (6x NOT)',
});

// 74HC08 – Quad AND 2-input
gateRegistry.register({
  typeId: '74HC08', label: '74HC08', category: 'ic74', width: 100, height: 120,
  propagationDelay: 7,
  inputs: [
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.09 }, { id: 'b1', label: 'B1', relativeX: 0, relativeY: 0.22 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.35 }, { id: 'b2', label: 'B2', relativeX: 0, relativeY: 0.48 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.61 }, { id: 'b3', label: 'B3', relativeX: 0, relativeY: 0.74 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.87 }, { id: 'b4', label: 'B4', relativeX: 0, relativeY: 1.0 },
  ],
  outputs: [
    { id: 'y1', label: 'Y1', relativeX: 1, relativeY: 0.155 }, { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.415 },
    { id: 'y3', label: 'Y3', relativeX: 1, relativeY: 0.675 }, { id: 'y4', label: 'Y4', relativeX: 1, relativeY: 0.935 },
  ],
  evaluate: ({ a1, b1, a2, b2, a3, b3, a4, b4 }) => ({
    y1: (a1 & b1) as 0|1, y2: (a2 & b2) as 0|1, y3: (a3 & b3) as 0|1, y4: (a4 & b4) as 0|1,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`// 74HC08 ${sid}`, `assign ${y1} = ${a1} & ${b1};`, `assign ${y2} = ${a2} & ${b2};`, `assign ${y3} = ${a3} & ${b3};`, `assign ${y4} = ${a4} & ${b4};`].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`-- 74HC08 ${sid}`, `${y1} <= ${a1} and ${b1};`, `${y2} <= ${a2} and ${b2};`, `${y3} <= ${a3} and ${b3};`, `${y4} <= ${a4} and ${b4};`].join('\n');
  },
  shapeComponent: FlipFlopShape, description: 'Quad 2-Eingang AND',
});

// 74HC32 – Quad OR 2-input
gateRegistry.register({
  typeId: '74HC32', label: '74HC32', category: 'ic74', width: 100, height: 120,
  propagationDelay: 7,
  inputs: [
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.09 }, { id: 'b1', label: 'B1', relativeX: 0, relativeY: 0.22 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.35 }, { id: 'b2', label: 'B2', relativeX: 0, relativeY: 0.48 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.61 }, { id: 'b3', label: 'B3', relativeX: 0, relativeY: 0.74 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.87 }, { id: 'b4', label: 'B4', relativeX: 0, relativeY: 1.0 },
  ],
  outputs: [
    { id: 'y1', label: 'Y1', relativeX: 1, relativeY: 0.155 }, { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.415 },
    { id: 'y3', label: 'Y3', relativeX: 1, relativeY: 0.675 }, { id: 'y4', label: 'Y4', relativeX: 1, relativeY: 0.935 },
  ],
  evaluate: ({ a1, b1, a2, b2, a3, b3, a4, b4 }) => ({
    y1: (a1 | b1) as 0|1, y2: (a2 | b2) as 0|1, y3: (a3 | b3) as 0|1, y4: (a4 | b4) as 0|1,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`// 74HC32 ${sid}`, `assign ${y1} = ${a1} | ${b1};`, `assign ${y2} = ${a2} | ${b2};`, `assign ${y3} = ${a3} | ${b3};`, `assign ${y4} = ${a4} | ${b4};`].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`-- 74HC32 ${sid}`, `${y1} <= ${a1} or ${b1};`, `${y2} <= ${a2} or ${b2};`, `${y3} <= ${a3} or ${b3};`, `${y4} <= ${a4} or ${b4};`].join('\n');
  },
  shapeComponent: FlipFlopShape, description: 'Quad 2-Eingang OR',
});

// 74HC86 – Quad XOR 2-input
gateRegistry.register({
  typeId: '74HC86', label: '74HC86', category: 'ic74', width: 100, height: 120,
  propagationDelay: 7,
  inputs: [
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.09 }, { id: 'b1', label: 'B1', relativeX: 0, relativeY: 0.22 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.35 }, { id: 'b2', label: 'B2', relativeX: 0, relativeY: 0.48 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.61 }, { id: 'b3', label: 'B3', relativeX: 0, relativeY: 0.74 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.87 }, { id: 'b4', label: 'B4', relativeX: 0, relativeY: 1.0 },
  ],
  outputs: [
    { id: 'y1', label: 'Y1', relativeX: 1, relativeY: 0.155 }, { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.415 },
    { id: 'y3', label: 'Y3', relativeX: 1, relativeY: 0.675 }, { id: 'y4', label: 'Y4', relativeX: 1, relativeY: 0.935 },
  ],
  evaluate: ({ a1, b1, a2, b2, a3, b3, a4, b4 }) => ({
    y1: (a1 ^ b1) as 0|1, y2: (a2 ^ b2) as 0|1, y3: (a3 ^ b3) as 0|1, y4: (a4 ^ b4) as 0|1,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`// 74HC86 ${sid}`, `assign ${y1} = ${a1} ^ ${b1};`, `assign ${y2} = ${a2} ^ ${b2};`, `assign ${y3} = ${a3} ^ ${b3};`, `assign ${y4} = ${a4} ^ ${b4};`].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4] = ['a1','b1','a2','b2','a3','b3','a4','b4'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const [y1,y2,y3,y4] = ['y1','y2','y3','y4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`-- 74HC86 ${sid}`, `${y1} <= ${a1} xor ${b1};`, `${y2} <= ${a2} xor ${b2};`, `${y3} <= ${a3} xor ${b3};`, `${y4} <= ${a4} xor ${b4};`].join('\n');
  },
  shapeComponent: FlipFlopShape, description: 'Quad 2-Eingang XOR',
});

// 74HC138 – 3-to-8 Line Decoder
gateRegistry.register({
  typeId: '74HC138', label: '74HC138', category: 'ic74', width: 110, height: 160,
  propagationDelay: 14,
  defaultInputValues: { g2a: 1, g2b: 1 },
  inputs: [
    { id: 'a',   label: 'A',    relativeX: 0, relativeY: 0.08 },
    { id: 'b',   label: 'B',    relativeX: 0, relativeY: 0.18 },
    { id: 'c',   label: 'C',    relativeX: 0, relativeY: 0.28 },
    { id: 'g1',  label: 'G1',   relativeX: 0, relativeY: 0.42 },
    { id: 'g2a', label: '/G2A', relativeX: 0, relativeY: 0.52 },
    { id: 'g2b', label: '/G2B', relativeX: 0, relativeY: 0.62 },
  ],
  outputs: [
    { id: 'y0', label: '/Y0', relativeX: 1, relativeY: 0.08 },
    { id: 'y1', label: '/Y1', relativeX: 1, relativeY: 0.21 },
    { id: 'y2', label: '/Y2', relativeX: 1, relativeY: 0.34 },
    { id: 'y3', label: '/Y3', relativeX: 1, relativeY: 0.47 },
    { id: 'y4', label: '/Y4', relativeX: 1, relativeY: 0.60 },
    { id: 'y5', label: '/Y5', relativeX: 1, relativeY: 0.73 },
    { id: 'y6', label: '/Y6', relativeX: 1, relativeY: 0.86 },
    { id: 'y7', label: '/Y7', relativeX: 1, relativeY: 0.99 },
  ],
  evaluate: ({ a, b, c, g1, g2a, g2b }) => {
    const enabled = g1 === 1 && g2a === 0 && g2b === 0;
    const addr = ((c ?? 0) << 2) | ((b ?? 0) << 1) | (a ?? 0);
    const out: Record<string, 0|1> = {};
    for (let i = 0; i < 8; i++) out['y' + i] = (enabled && addr === i ? 0 : 1) as 0|1;
    return out;
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const a    = w[`${g.id}:a`]   ?? "1'b0";
    const b    = w[`${g.id}:b`]   ?? "1'b0";
    const c    = w[`${g.id}:c`]   ?? "1'b0";
    const g1   = w[`${g.id}:g1`]  ?? "1'b0";
    const g2a  = w[`${g.id}:g2a`] ?? "1'b1";
    const g2b  = w[`${g.id}:g2b`] ?? "1'b1";
    const ys   = Array.from({length:8},(_,i) => w[`${g.id}:y${i}`] ?? `w_${sid}_y${i}`);
    const en   = `(${g1} & ~${g2a} & ~${g2b})`;
    const addr = `{${c}, ${b}, ${a}}`;
    return [
      `// 74HC138 ${sid}`,
      ...ys.map((y,i) => `assign ${y} = ~(${en} & (${addr} == 3'd${i}));`),
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const a    = w[`${g.id}:a`]   ?? "'0'";
    const b    = w[`${g.id}:b`]   ?? "'0'";
    const c    = w[`${g.id}:c`]   ?? "'0'";
    const g1   = w[`${g.id}:g1`]  ?? "'0'";
    const g2a  = w[`${g.id}:g2a`] ?? "'1'";
    const g2b  = w[`${g.id}:g2b`] ?? "'1'";
    const ys   = Array.from({length:8},(_,i) => w[`${g.id}:y${i}`] ?? `w_${sid}_y${i}`);
    const addr = `STD_LOGIC_VECTOR'(${c} & ${b} & ${a})`; // cast avoids ambiguous "=" overloads in GHDL
    const en   = `(${g1} = '1' and ${g2a} = '0' and ${g2b} = '0')`;
    const lines = [`-- 74HC138 ${sid}`];
    for (let i = 0; i < 8; i++) {
      const bits = i.toString(2).padStart(3,'0');
      const cmp  = `"${bits}"`; // c&b&a comparison
      lines.push(`${ys[i]} <= '0' when ${en} and ${addr} = ${cmp} else '1';`);
    }
    return lines.join('\n');
  },
  shapeComponent: FlipFlopShape, description: '3-zu-8 Dekoder (active-low Ausgänge)',
});

// 74HC283 – 4-bit Binary Full Adder
gateRegistry.register({
  typeId: '74HC283', label: '74HC283', category: 'ic74', width: 110, height: 140,
  propagationDelay: 19,
  inputs: [
    { id: 'a1', label: 'A1', relativeX: 0, relativeY: 0.09 },
    { id: 'b1', label: 'B1', relativeX: 0, relativeY: 0.19 },
    { id: 'a2', label: 'A2', relativeX: 0, relativeY: 0.30 },
    { id: 'b2', label: 'B2', relativeX: 0, relativeY: 0.40 },
    { id: 'a3', label: 'A3', relativeX: 0, relativeY: 0.51 },
    { id: 'b3', label: 'B3', relativeX: 0, relativeY: 0.61 },
    { id: 'a4', label: 'A4', relativeX: 0, relativeY: 0.72 },
    { id: 'b4', label: 'B4', relativeX: 0, relativeY: 0.82 },
    { id: 'c0', label: 'C0',  relativeX: 0, relativeY: 0.94 },
  ],
  outputs: [
    { id: 's1', label: 'S1', relativeX: 1, relativeY: 0.14 },
    { id: 's2', label: 'S2', relativeX: 1, relativeY: 0.35 },
    { id: 's3', label: 'S3', relativeX: 1, relativeY: 0.56 },
    { id: 's4', label: 'S4', relativeX: 1, relativeY: 0.77 },
    { id: 'c4', label: 'C4', relativeX: 1, relativeY: 0.94 },
  ],
  evaluate: ({ a1, b1, a2, b2, a3, b3, a4, b4, c0 }) => {
    const a = ((a4 ?? 0) << 3) | ((a3 ?? 0) << 2) | ((a2 ?? 0) << 1) | (a1 ?? 0);
    const b = ((b4 ?? 0) << 3) | ((b3 ?? 0) << 2) | ((b2 ?? 0) << 1) | (b1 ?? 0);
    const sum = a + b + (c0 ?? 0);
    return {
      s1: ((sum >> 0) & 1) as 0|1,
      s2: ((sum >> 1) & 1) as 0|1,
      s3: ((sum >> 2) & 1) as 0|1,
      s4: ((sum >> 3) & 1) as 0|1,
      c4: ((sum >> 4) & 1) as 0|1,
    };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const ps  = ['a1','b1','a2','b2','a3','b3','a4','b4','c0'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const [a1,b1,a2,b2,a3,b3,a4,b4,c0] = ps;
    const [s1,s2,s3,s4,c4] = ['s1','s2','s3','s4','c4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `// 74HC283 ${sid}`,
      `wire [4:0] sum_${sid} = {1'b0,${a4},${a3},${a2},${a1}} + {1'b0,${b4},${b3},${b2},${b1}} + {4'b0,${c0}};`,
      `assign ${s1} = sum_${sid}[0];`,
      `assign ${s2} = sum_${sid}[1];`,
      `assign ${s3} = sum_${sid}[2];`,
      `assign ${s4} = sum_${sid}[3];`,
      `assign ${c4} = sum_${sid}[4];`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const [a1,b1,a2,b2,a3,b3,a4,b4,c0] = ['a1','b1','a2','b2','a3','b3','a4','b4','c0'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const [s1,s2,s3,s4,c4] = ['s1','s2','s3','s4','c4'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `-- 74HC283 ${sid}`,
      `process(${a1},${b1},${a2},${b2},${a3},${b3},${a4},${b4},${c0})`,
      `  variable a_v : integer range 0 to 15;`,
      `  variable b_v : integer range 0 to 15;`,
      `  variable cin_v : integer range 0 to 1;`,
      `  variable sum_v : unsigned(4 downto 0);`,
      `begin`,
      `  a_v := 0;`,
      `  if ${a1} = '1' then a_v := a_v + 1; end if;`,
      `  if ${a2} = '1' then a_v := a_v + 2; end if;`,
      `  if ${a3} = '1' then a_v := a_v + 4; end if;`,
      `  if ${a4} = '1' then a_v := a_v + 8; end if;`,
      `  b_v := 0;`,
      `  if ${b1} = '1' then b_v := b_v + 1; end if;`,
      `  if ${b2} = '1' then b_v := b_v + 2; end if;`,
      `  if ${b3} = '1' then b_v := b_v + 4; end if;`,
      `  if ${b4} = '1' then b_v := b_v + 8; end if;`,
      `  cin_v := 0;`,
      `  if ${c0} = '1' then cin_v := 1; end if;`,
      `  sum_v := to_unsigned(a_v + b_v + cin_v, 5);`,
      `  ${s1} <= std_logic(sum_v(0));`,
      `  ${s2} <= std_logic(sum_v(1));`,
      `  ${s3} <= std_logic(sum_v(2));`,
      `  ${s4} <= std_logic(sum_v(3));`,
      `  ${c4} <= std_logic(sum_v(4));`,
      `end process; -- 74HC283 ${sid}`,
    ].join('\n');
  },
  verilogAlwaysComb: false,
  shapeComponent: FlipFlopShape, description: '4-Bit Volladdierer mit Carry',
});

// 74HC74 – Dual D Flip-Flop with Preset and Clear
gateRegistry.register({
  typeId: '74HC74', label: '74HC74', category: 'ic74', width: 110, height: 130,
  propagationDelay: 14, isSynchronous: true,
  stateKeys: ['q1', 'q2'],
  hiddenStateKeys: ['pc1', 'pc2'],
  stateInit: { q1: 0, q2: 0, pc1: 0, pc2: 0 },
  defaultInputValues: { pre1: 1, clr1: 1, pre2: 1, clr2: 1 },
  inputs: [
    { id: 'pre1', label: '/PRE1', relativeX: 0, relativeY: 0.08 },
    { id: 'clr1', label: '/CLR1', relativeX: 0, relativeY: 0.22 },
    { id: 'd1',   label: 'D1',   relativeX: 0, relativeY: 0.36 },
    { id: 'clk1', label: 'CLK1', relativeX: 0, relativeY: 0.50 },
    { id: 'pre2', label: '/PRE2', relativeX: 0, relativeY: 0.64 },
    { id: 'clr2', label: '/CLR2', relativeX: 0, relativeY: 0.78 },
    { id: 'd2',   label: 'D2',   relativeX: 0, relativeY: 0.86 },
    { id: 'clk2', label: 'CLK2', relativeX: 0, relativeY: 0.96 },
  ],
  outputs: [
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.29 },
    { id: 'qn1', label: '/Q1', relativeX: 1, relativeY: 0.43 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.79 },
    { id: 'qn2', label: '/Q2', relativeX: 1, relativeY: 0.93 },
  ],
  evaluate: (_i, state) => {
    const q1 = (state?.q1 as 0|1) ?? 0;
    const q2 = (state?.q2 as 0|1) ?? 0;
    return { q1, qn1: (q1 ^ 1) as 0|1, q2, qn2: (q2 ^ 1) as 0|1 };
  },
  stateUpdate: ({ pre1, clr1, d1, clk1, pre2, clr2, d2, clk2 }, _o, state) => {
    const pc1 = (state?.pc1 as 0|1) ?? 0;
    const pc2 = (state?.pc2 as 0|1) ?? 0;
    let q1 = (state?.q1 as 0|1) ?? 0;
    let q2 = (state?.q2 as 0|1) ?? 0;
    if (pre1 === 0) q1 = 1;
    else if (clr1 === 0) q1 = 0;
    else if (clk1 === 1 && pc1 === 0) q1 = d1 as 0|1;
    if (pre2 === 0) q2 = 1;
    else if (clr2 === 0) q2 = 0;
    else if (clk2 === 1 && pc2 === 0) q2 = d2 as 0|1;
    return { q1, q2, pc1: clk1, pc2: clk2 };
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const pre1 = w[`${g.id}:pre1`] ?? "1'b1";
    const clr1 = w[`${g.id}:clr1`] ?? "1'b1";
    const d1   = w[`${g.id}:d1`]   ?? "1'b0";
    const clk1 = w[`${g.id}:clk1`] ?? 'clk';
    const pre2 = w[`${g.id}:pre2`] ?? "1'b1";
    const clr2 = w[`${g.id}:clr2`] ?? "1'b1";
    const d2   = w[`${g.id}:d2`]   ?? "1'b0";
    const clk2 = w[`${g.id}:clk2`] ?? 'clk';
    const q1   = w[`${g.id}:q1`]   ?? `w_${sid}_q1`;
    const qn1  = w[`${g.id}:qn1`]  ?? `w_${sid}_qn1`;
    const q2   = w[`${g.id}:q2`]   ?? `w_${sid}_q2`;
    const qn2  = w[`${g.id}:qn2`]  ?? `w_${sid}_qn2`;
    return [
      `// 74HC74 ${sid}`,
      `always @(posedge ${clk1} or negedge ${pre1} or negedge ${clr1}) begin`,
      `  if      (!${pre1}) ${q1} <= 1'b1;`,
      `  else if (!${clr1}) ${q1} <= 1'b0;`,
      `  else               ${q1} <= ${d1};`,
      `end`,
      `always @(posedge ${clk2} or negedge ${pre2} or negedge ${clr2}) begin`,
      `  if      (!${pre2}) ${q2} <= 1'b1;`,
      `  else if (!${clr2}) ${q2} <= 1'b0;`,
      `  else               ${q2} <= ${d2};`,
      `end // 74HC74 ${sid}`,
      `assign ${qn1} = ~${q1};`,
      `assign ${qn2} = ~${q2};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const pre1 = w[`${g.id}:pre1`] ?? "'1'";
    const clr1 = w[`${g.id}:clr1`] ?? "'1'";
    const d1   = w[`${g.id}:d1`]   ?? "'0'";
    const clk1 = w[`${g.id}:clk1`] ?? 'clk';
    const pre2 = w[`${g.id}:pre2`] ?? "'1'";
    const clr2 = w[`${g.id}:clr2`] ?? "'1'";
    const d2   = w[`${g.id}:d2`]   ?? "'0'";
    const clk2 = w[`${g.id}:clk2`] ?? 'clk';
    const q1   = w[`${g.id}:q1`]   ?? `w_${sid}_q1`;
    const qn1  = w[`${g.id}:qn1`]  ?? `w_${sid}_qn1`;
    const q2   = w[`${g.id}:q2`]   ?? `w_${sid}_q2`;
    const qn2  = w[`${g.id}:qn2`]  ?? `w_${sid}_qn2`;
    return [
      `-- 74HC74 ${sid}`,
      `process(${clk1}, ${pre1}, ${clr1})`,
      `begin`,
      `  if    ${pre1} = '0' then ${q1} <= '1';`,
      `  elsif ${clr1} = '0' then ${q1} <= '0';`,
      `  elsif rising_edge(${clk1}) then ${q1} <= ${d1};`,
      `  end if;`,
      `end process;`,
      `process(${clk2}, ${pre2}, ${clr2})`,
      `begin`,
      `  if    ${pre2} = '0' then ${q2} <= '1';`,
      `  elsif ${clr2} = '0' then ${q2} <= '0';`,
      `  elsif rising_edge(${clk2}) then ${q2} <= ${d2};`,
      `  end if;`,
      `end process; -- 74HC74 ${sid}`,
      `${qn1} <= not ${q1};`,
      `${qn2} <= not ${q2};`,
    ].join('\n');
  },
  verilogWireOutputs: ['qn1', 'qn2'],
  // Dual FF: each FF has its own clock (clk1 / clk2).  clockInputId is not set
  // because a single port ID cannot represent both clocks; setup/hold detection
  // would produce false positives when the two clocks are independent.
  shapeComponent: FlipFlopShape, description: 'Dual D-Flip-Flop mit Preset/Clear',
});

// 74HC595 – 8-bit Shift Register with output latch
gateRegistry.register({
  typeId: '74HC595', label: '74HC595', category: 'ic74', width: 110, height: 160,
  propagationDelay: 25, isSynchronous: true,
  stateKeys: makeStateKeys('q', 8),
  hiddenStateKeys: ['shift', 'latch', 'pShcp', 'pStcp'],
  stateInit: { q0: 0, q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, shift: 0, latch: 0, pShcp: 0, pStcp: 0 },
  defaultInputValues: { mr: 1, oe: 1 },
  inputs: [
    { id: 'ds',   label: 'DS',   relativeX: 0, relativeY: 0.08 },
    { id: 'shcp', label: 'SHCP', relativeX: 0, relativeY: 0.18 },
    { id: 'stcp', label: 'STCP', relativeX: 0, relativeY: 0.28 },
    { id: 'mr',   label: '/MR',  relativeX: 0, relativeY: 0.38 },
    { id: 'oe',   label: '/OE',  relativeX: 0, relativeY: 0.48 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.08 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.21 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.34 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.47 },
    { id: 'q4', label: 'Q4', relativeX: 1, relativeY: 0.60 },
    { id: 'q5', label: 'Q5', relativeX: 1, relativeY: 0.73 },
    { id: 'q6', label: 'Q6', relativeX: 1, relativeY: 0.86 },
    { id: 'q7', label: 'Q7', relativeX: 1, relativeY: 0.99 },
  ],
  evaluate: (inputs, state) => {
    const latch = bitsFromState(state as Record<string, unknown>, 'q', 8, 'latch');
    const oe = inputs.oe ?? 0;
    if (oe !== 0) return { q0:2,q1:2,q2:2,q3:2,q4:2,q5:2,q6:2,q7:2 };
    const out: Record<string,0|1> = {};
    for (let i = 0; i < 8; i++) out['q'+i] = ((latch >> i) & 1) as 0|1;
    return out;
  },
  stateUpdate: ({ ds, shcp, stcp, mr }, _o, state) => {
    const pShcp = (state?.pShcp as 0|1) ?? 0;
    const pStcp = (state?.pStcp as 0|1) ?? 0;
    let shift = (state?.shift as number) ?? 0;
    let latch = bitsFromState(state as Record<string, unknown>, 'q', 8, 'latch');
    if (mr === 0) shift = 0;
    else if (shcp === 1 && pShcp === 0) shift = ((shift << 1) | (ds ?? 0)) & 0xFF;
    if (stcp === 1 && pStcp === 0) latch = shift;
    return { shift, latch, ...bitsToState(latch, 'q', 8), pShcp: shcp, pStcp: stcp };
  },
  toVerilog: (g, w) => {
    const sid   = sanitize(g.id);
    const shift = `shift_${sid}`;
    const latch = `latch_${sid}`;
    const ds    = w[`${g.id}:ds`]   ?? "1'b0";
    const shcp  = w[`${g.id}:shcp`] ?? 'clk';
    const stcp  = w[`${g.id}:stcp`] ?? 'clk';
    const mr    = w[`${g.id}:mr`]   ?? "1'b1";
    const oe    = w[`${g.id}:oe`]   ?? "1'b0";
    const qs    = Array.from({length:8},(_,i) => w[`${g.id}:q${i}`] ?? `w_${sid}_q${i}`);
    return [
      `// 74HC595 ${sid}`,
      `always @(posedge ${shcp} or negedge ${mr}) begin`,
      `  if (!${mr}) ${shift} <= 8'b0;`,
      `  else        ${shift} <= {${shift}[6:0], ${ds}};`,
      `end`,
      `always @(posedge ${stcp}) begin`,
      `  ${latch} <= ${shift};`,
      `end // 74HC595 ${sid}`,
      ...qs.map((q,i) => `assign ${q} = ${oe} ? 1'bz : ${latch}[${i}];`),
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid   = sanitize(g.id);
    const shift = `shift_${sid}`;
    const latch = `latch_${sid}`;
    const ds    = w[`${g.id}:ds`]   ?? "'0'";
    const shcp  = w[`${g.id}:shcp`] ?? 'clk';
    const stcp  = w[`${g.id}:stcp`] ?? 'clk';
    const mr    = w[`${g.id}:mr`]   ?? "'1'";
    const oe    = w[`${g.id}:oe`]   ?? "'0'";
    const qs    = Array.from({length:8},(_,i) => w[`${g.id}:q${i}`] ?? `w_${sid}_q${i}`);
    return [
      `-- 74HC595 ${sid}`,
      `process(${shcp}, ${mr})`,
      `begin`,
      `  if ${mr} = '0' then ${shift} <= (others => '0');`,
      `  elsif rising_edge(${shcp}) then ${shift} <= ${shift}(6 downto 0) & ${ds};`,
      `  end if;`,
      `end process;`,
      `process(${stcp})`,
      `begin`,
      `  if rising_edge(${stcp}) then ${latch} <= ${shift};`,
      `  end if;`,
      `end process; -- 74HC595 ${sid}`,
      ...qs.map((q,i) => `${q} <= 'Z' when ${oe} = '1' else ${latch}(${i});`),
    ].join('\n');
  },
  verilogExtraRegs: (g) => [
    { name: `shift_${sanitize(g.id)}`, width: 8 },
    { name: `latch_${sanitize(g.id)}`, width: 8 },
  ],
  vhdlExtraSignals: (g) => [
    { name: `shift_${sanitize(g.id)}`, width: 8 },
    { name: `latch_${sanitize(g.id)}`, width: 8 },
  ],
  verilogWireOutputs: ['q0','q1','q2','q3','q4','q5','q6','q7'],
  clockInputId: 'shcp',
  shapeComponent: FlipFlopShape, description: '8-Bit Schieberegister mit Ausgangs-Latch',
});

// 74HC161 – 4-bit synchronous binary counter with asynchronous clear and load
gateRegistry.register({
  typeId: '74HC161', label: '74HC161', category: 'ic74', width: 110, height: 160,
  propagationDelay: 20, isSynchronous: true,
  stateKeys: makeStateKeys('cnt', 4),
  hiddenStateKeys: ['cnt', 'pClk'],
  stateInit: { cnt0: 0, cnt1: 0, cnt2: 0, cnt3: 0, cnt: 0, pClk: 0 },
  defaultInputValues: { clrn: 1, ldn: 1 },
  inputs: [
    { id: 'clk',  label: 'CLK',  relativeX: 0, relativeY: 0.07 },
    { id: 'clrn', label: '/CLR', relativeX: 0, relativeY: 0.17 },
    { id: 'ldn',  label: '/LD',  relativeX: 0, relativeY: 0.27 },
    { id: 'enp',  label: 'ENP',  relativeX: 0, relativeY: 0.37 },
    { id: 'ent',  label: 'ENT',  relativeX: 0, relativeY: 0.47 },
    { id: 'd0',   label: 'D0',   relativeX: 0, relativeY: 0.59 },
    { id: 'd1',   label: 'D1',   relativeX: 0, relativeY: 0.69 },
    { id: 'd2',   label: 'D2',   relativeX: 0, relativeY: 0.79 },
    { id: 'd3',   label: 'D3',   relativeX: 0, relativeY: 0.89 },
  ],
  outputs: [
    { id: 'q0',  label: 'Q0',  relativeX: 1, relativeY: 0.59 },
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.69 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.79 },
    { id: 'q3',  label: 'Q3',  relativeX: 1, relativeY: 0.89 },
    { id: 'rco', label: 'RCO', relativeX: 1, relativeY: 0.15 },
  ],
  evaluate: ({ ent }, state) => {
    const cnt = bitsFromState(state as Record<string, unknown> | undefined, 'cnt', 4, 'cnt');
    return {
      q0: ((cnt >> 0) & 1) as 0|1,
      q1: ((cnt >> 1) & 1) as 0|1,
      q2: ((cnt >> 2) & 1) as 0|1,
      q3: ((cnt >> 3) & 1) as 0|1,
      rco: (cnt === 15 && ent === 1 ? 1 : 0) as 0|1,
    };
  },
  stateUpdate: ({ clk, clrn, ldn, enp, ent, d0, d1, d2, d3 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let cnt = bitsFromState(state as Record<string, unknown> | undefined, 'cnt', 4, 'cnt');
    // 74HC161: asynchronous clear (active immediately, regardless of clock)
    if (clrn === 0) return { ...bitsToState(0, 'cnt', 4), cnt: 0, pClk: clk };
    const rising = clk === 1 && prev === 0;
    if (!rising) return { ...state, pClk: clk };
    if (ldn === 0) {
      cnt = ((d3 ?? 0) << 3) | ((d2 ?? 0) << 2) | ((d1 ?? 0) << 1) | (d0 ?? 0);
    } else if ((enp ?? 0) === 1 && (ent ?? 0) === 1) {
      cnt = (cnt + 1) & 0xF;
    }
    return { ...bitsToState(cnt, 'cnt', 4), cnt, pClk: clk };
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const cnt  = `cnt_${sid}`;
    const clk  = w[`${g.id}:clk`]  ?? 'clk';
    const clrn = w[`${g.id}:clrn`] ?? "1'b1";
    const ldn  = w[`${g.id}:ldn`]  ?? "1'b1";
    const enp  = w[`${g.id}:enp`]  ?? "1'b0";
    const ent  = w[`${g.id}:ent`]  ?? "1'b0";
    const d    = ['d0','d1','d2','d3'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const q    = ['q0','q1','q2','q3'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    const rco  = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `// 74HC161 ${sid}`,
      `always @(posedge ${clk} or negedge ${clrn}) begin`,
      `  if      (!${clrn})               ${cnt} <= 4'd0;`,
      `  else if (!${ldn})                ${cnt} <= {${d[3]},${d[2]},${d[1]},${d[0]}};`,
      `  else if (${enp} && ${ent})       ${cnt} <= ${cnt} + 1'b1;`,
      `end // 74HC161 ${sid}`,
      `assign ${q[0]} = ${cnt}[0];`,
      `assign ${q[1]} = ${cnt}[1];`,
      `assign ${q[2]} = ${cnt}[2];`,
      `assign ${q[3]} = ${cnt}[3];`,
      `assign ${rco}  = ${ent} & (${cnt} == 4'd15);`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const cnt  = `cnt_${sid}`;
    const clk  = w[`${g.id}:clk`]  ?? 'clk';
    const clrn = w[`${g.id}:clrn`] ?? "'1'";
    const ldn  = w[`${g.id}:ldn`]  ?? "'1'";
    const enp  = w[`${g.id}:enp`]  ?? "'0'";
    const ent  = w[`${g.id}:ent`]  ?? "'0'";
    const d    = ['d0','d1','d2','d3'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const q    = ['q0','q1','q2','q3'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    const rco  = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `-- 74HC161 ${sid}`,
      `process(${clk}, ${clrn})`,
      `begin`,
      `  if    ${clrn} = '0'             then ${cnt} <= (others => '0');`,
      `  elsif rising_edge(${clk}) then`,
      `    if    ${ldn}  = '0'                       then ${cnt} <= ${d[3]} & ${d[2]} & ${d[1]} & ${d[0]};`,
      `    elsif ${enp}  = '1' and ${ent} = '1'      then ${cnt} <= std_logic_vector(unsigned(${cnt}) + 1);`,
      `    end if;`,
      `  end if;`,
      `end process; -- 74HC161 ${sid}`,
      `${q[0]} <= ${cnt}(0);`,
      `${q[1]} <= ${cnt}(1);`,
      `${q[2]} <= ${cnt}(2);`,
      `${q[3]} <= ${cnt}(3);`,
      `${rco}  <= ${ent} when unsigned(${cnt}) = 15 else '0';`,
    ].join('\n');
  },
  verilogExtraRegs: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 4 }],
  vhdlExtraSignals: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 4 }],
  verilogWireOutputs: ['q0','q1','q2','q3','rco'],
  clockInputId: 'clk',
  shapeComponent: FlipFlopShape, description: '4-Bit synchroner Binärzähler mit asynchronem Clear',
});

// 74HC151 – 8-to-1 Multiplexer
gateRegistry.register({
  typeId: '74HC151', label: '74HC151', category: 'ic74', width: 110, height: 160,
  propagationDelay: 12,
  inputs: [
    { id: 's0', label: 'S0', relativeX: 0, relativeY: 0.07 },
    { id: 's1', label: 'S1', relativeX: 0, relativeY: 0.17 },
    { id: 's2', label: 'S2', relativeX: 0, relativeY: 0.27 },
    { id: 'en', label: '/E', relativeX: 0, relativeY: 0.37 },
    { id: 'd0', label: 'D0', relativeX: 0, relativeY: 0.50 },
    { id: 'd1', label: 'D1', relativeX: 0, relativeY: 0.60 },
    { id: 'd2', label: 'D2', relativeX: 0, relativeY: 0.70 },
    { id: 'd3', label: 'D3', relativeX: 0, relativeY: 0.80 },
    { id: 'd4', label: 'D4', relativeX: 1, relativeY: 0.50 },
    { id: 'd5', label: 'D5', relativeX: 1, relativeY: 0.60 },
    { id: 'd6', label: 'D6', relativeX: 1, relativeY: 0.70 },
    { id: 'd7', label: 'D7', relativeX: 1, relativeY: 0.80 },
  ],
  outputs: [
    { id: 'y',  label: 'Y',  relativeX: 1, relativeY: 0.17 },
    { id: 'yn', label: '/Y', relativeX: 1, relativeY: 0.27 },
  ],
  evaluate: ({ s0, s1, s2, en, d0, d1, d2, d3, d4, d5, d6, d7 }) => {
    if ((en ?? 0) === 1) return { y: 0, yn: 1 };
    const sel = ((s2 ?? 0) << 2) | ((s1 ?? 0) << 1) | (s0 ?? 0);
    const inputs = [d0, d1, d2, d3, d4, d5, d6, d7];
    const y = (inputs[sel] ?? 0) as 0|1;
    return { y, yn: (y ^ 1) as 0|1 };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const s   = ['s0','s1','s2'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const en  = w[`${g.id}:en`] ?? "1'b0";
    const d   = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const y   = w[`${g.id}:y`]  ?? `w_${sid}_y`;
    const yn  = w[`${g.id}:yn`] ?? `w_${sid}_yn`;
    const chain = d.map((di,i) => `{${s[2]},${s[1]},${s[0]}}==3'd${i} ? ${di} : `).join('') + "1'b0";
    return [
      `// 74HC151 ${sid}`,
      `assign ${y}  = ${en} ? 1'b0 : (${chain});`,
      `assign ${yn} = ~${y};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const s   = ['s0','s1','s2'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const en  = w[`${g.id}:en`] ?? "'0'";
    const d   = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const y   = w[`${g.id}:y`]  ?? `w_${sid}_y`;
    const yn  = w[`${g.id}:yn`] ?? `w_${sid}_yn`;
    const bits = (i: number) => i.toString(2).padStart(3,'0');
    return [
      `-- 74HC151 ${sid}`,
      `${y} <= '0' when ${en} = '1' else`,
      ...d.slice(0,-1).map((di,i) => `       ${di} when STD_LOGIC_VECTOR'(${s[2]} & ${s[1]} & ${s[0]}) = STD_LOGIC_VECTOR'("${bits(i)}") else`),
      `       ${d[7]};`,
      `${yn} <= not ${y};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape, description: '8-zu-1 Multiplexer mit Enable',
});

// 74HC153 – Dual 4-to-1 Multiplexer
gateRegistry.register({
  typeId: '74HC153', label: '74HC153', category: 'ic74', width: 110, height: 160,
  propagationDelay: 12,
  inputs: [
    { id: 's0',  label: 'S0',  relativeX: 0, relativeY: 0.07 },
    { id: 's1',  label: 'S1',  relativeX: 0, relativeY: 0.17 },
    { id: 'e1n', label: '/E1', relativeX: 0, relativeY: 0.30 },
    { id: 'i10', label: 'I10', relativeX: 0, relativeY: 0.40 },
    { id: 'i11', label: 'I11', relativeX: 0, relativeY: 0.50 },
    { id: 'i12', label: 'I12', relativeX: 0, relativeY: 0.60 },
    { id: 'i13', label: 'I13', relativeX: 0, relativeY: 0.70 },
    { id: 'e2n', label: '/E2', relativeX: 1, relativeY: 0.30 },
    { id: 'i20', label: 'I20', relativeX: 1, relativeY: 0.40 },
    { id: 'i21', label: 'I21', relativeX: 1, relativeY: 0.50 },
    { id: 'i22', label: 'I22', relativeX: 1, relativeY: 0.60 },
    { id: 'i23', label: 'I23', relativeX: 1, relativeY: 0.70 },
  ],
  outputs: [
    { id: 'y1', label: 'Y1', relativeX: 0, relativeY: 0.85 },
    { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.85 },
  ],
  evaluate: ({ s0, s1, e1n, i10, i11, i12, i13, e2n, i20, i21, i22, i23 }) => {
    const sel = ((s1 ?? 0) << 1) | (s0 ?? 0);
    const g1 = [i10, i11, i12, i13];
    const g2 = [i20, i21, i22, i23];
    const y1 = (e1n ?? 0) === 1 ? 0 : ((g1[sel] ?? 0) as 0|1);
    const y2 = (e2n ?? 0) === 1 ? 0 : ((g2[sel] ?? 0) as 0|1);
    return { y1, y2 };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const s   = ['s0','s1'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const e1n = w[`${g.id}:e1n`] ?? "1'b0";
    const e2n = w[`${g.id}:e2n`] ?? "1'b0";
    const i1  = ['i10','i11','i12','i13'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const i2  = ['i20','i21','i22','i23'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const y1  = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    const y2  = w[`${g.id}:y2`] ?? `w_${sid}_y2`;
    const ch1 = i1.map((x,i) => `{${s[1]},${s[0]}}==2'd${i} ? ${x} : `).join('') + "1'b0";
    const ch2 = i2.map((x,i) => `{${s[1]},${s[0]}}==2'd${i} ? ${x} : `).join('') + "1'b0";
    return [
      `// 74HC153 ${sid}`,
      `assign ${y1} = ${e1n} ? 1'b0 : (${ch1});`,
      `assign ${y2} = ${e2n} ? 1'b0 : (${ch2});`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const s   = ['s0','s1'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const e1n = w[`${g.id}:e1n`] ?? "'0'";
    const e2n = w[`${g.id}:e2n`] ?? "'0'";
    const i1  = ['i10','i11','i12','i13'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const i2  = ['i20','i21','i22','i23'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const y1  = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    const y2  = w[`${g.id}:y2`] ?? `w_${sid}_y2`;
    const bits = (i: number) => i.toString(2).padStart(2,'0');
    return [
      `-- 74HC153 ${sid}`,
      `${y1} <= '0' when ${e1n} = '1' else`,
      ...i1.slice(0,-1).map((x,i) => `       ${x} when STD_LOGIC_VECTOR'(${s[1]} & ${s[0]}) = STD_LOGIC_VECTOR'("${bits(i)}") else`),
      `       ${i1[3]};`,
      `${y2} <= '0' when ${e2n} = '1' else`,
      ...i2.slice(0,-1).map((x,i) => `       ${x} when STD_LOGIC_VECTOR'(${s[1]} & ${s[0]}) = STD_LOGIC_VECTOR'("${bits(i)}") else`),
      `       ${i2[3]};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape, description: 'Dual 4-zu-1 Multiplexer',
});

// 74HC194 – 4-bit universal shift register (left/right)
gateRegistry.register({
  typeId: '74HC194', label: '74HC194', category: 'ic74', width: 110, height: 160,
  propagationDelay: 20, isSynchronous: true,
  stateKeys: makeStateKeys('q', 4),
  hiddenStateKeys: ['reg', 'pClk'],
  stateInit: { q0: 0, q1: 0, q2: 0, q3: 0, reg: 0, pClk: 0 },
  defaultInputValues: { clrn: 1 },
  inputs: [
    { id: 'clk',  label: 'CLK',  relativeX: 0, relativeY: 0.07 },
    { id: 'clrn', label: '/CLR', relativeX: 0, relativeY: 0.17 },
    { id: 's0',   label: 'S0',   relativeX: 0, relativeY: 0.27 },
    { id: 's1',   label: 'S1',   relativeX: 0, relativeY: 0.37 },
    { id: 'sr',   label: 'SR',   relativeX: 0, relativeY: 0.47 },
    { id: 'sl',   label: 'SL',   relativeX: 0, relativeY: 0.57 },
    { id: 'd0',   label: 'D0',   relativeX: 0, relativeY: 0.67 },
    { id: 'd1',   label: 'D1',   relativeX: 0, relativeY: 0.77 },
    { id: 'd2',   label: 'D2',   relativeX: 0, relativeY: 0.87 },
    { id: 'd3',   label: 'D3',   relativeX: 0, relativeY: 0.97 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.67 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.77 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.87 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.97 },
  ],
  evaluate: (_i, state) => {
    const reg = bitsFromState(state as Record<string, unknown> | undefined, 'q', 4, 'reg');
    return {
      q0: ((reg >> 0) & 1) as 0|1,
      q1: ((reg >> 1) & 1) as 0|1,
      q2: ((reg >> 2) & 1) as 0|1,
      q3: ((reg >> 3) & 1) as 0|1,
    };
  },
  stateUpdate: ({ clk, clrn, s0, s1, sr, sl, d0, d1, d2, d3 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let reg = bitsFromState(state as Record<string, unknown> | undefined, 'q', 4, 'reg');
    const rising = clk === 1 && prev === 0;
    if (clrn === 0) { reg = 0; }
    else if (rising) {
      const mode = ((s1 ?? 0) << 1) | (s0 ?? 0);
      if (mode === 1) reg = ((reg >> 1) | ((sr ?? 0) << 3)) & 0xF;        // shift right
      else if (mode === 2) reg = ((reg << 1) | (sl ?? 0)) & 0xF;          // shift left
      else if (mode === 3) reg = ((d3 ?? 0) << 3) | ((d2 ?? 0) << 2) | ((d1 ?? 0) << 1) | (d0 ?? 0); // parallel load
      // mode 0 = hold
    }
    return { ...bitsToState(reg, 'q', 4), reg, pClk: clk };
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const reg  = `reg_${sid}`;
    const clk  = w[`${g.id}:clk`]  ?? 'clk';
    const clrn = w[`${g.id}:clrn`] ?? "1'b1";
    const s0   = w[`${g.id}:s0`]   ?? "1'b0";
    const s1   = w[`${g.id}:s1`]   ?? "1'b0";
    const sr   = w[`${g.id}:sr`]   ?? "1'b0";
    const sl   = w[`${g.id}:sl`]   ?? "1'b0";
    const d    = ['d0','d1','d2','d3'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const q    = ['q0','q1','q2','q3'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `// 74HC194 ${sid}`,
      `always @(posedge ${clk} or negedge ${clrn}) begin`,
      `  if (!${clrn}) ${reg} <= 4'b0;`,
      `  else case ({${s1}, ${s0}})`,
      `    2'b01: ${reg} <= {${sr}, ${reg}[3:1]};`,
      `    2'b10: ${reg} <= {${reg}[2:0], ${sl}};`,
      `    2'b11: ${reg} <= {${d[3]},${d[2]},${d[1]},${d[0]}};`,
      `    default: ;`,
      `  endcase`,
      `end // 74HC194 ${sid}`,
      `assign ${q[0]} = ${reg}[0];`,
      `assign ${q[1]} = ${reg}[1];`,
      `assign ${q[2]} = ${reg}[2];`,
      `assign ${q[3]} = ${reg}[3];`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const reg  = `reg_${sid}`;
    const clk  = w[`${g.id}:clk`]  ?? 'clk';
    const clrn = w[`${g.id}:clrn`] ?? "'1'";
    const s0   = w[`${g.id}:s0`]   ?? "'0'";
    const s1   = w[`${g.id}:s1`]   ?? "'0'";
    const sr   = w[`${g.id}:sr`]   ?? "'0'";
    const sl   = w[`${g.id}:sl`]   ?? "'0'";
    const d    = ['d0','d1','d2','d3'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const q    = ['q0','q1','q2','q3'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `-- 74HC194 ${sid}`,
      `process(${clk}, ${clrn})`,
      `begin`,
      `  if ${clrn} = '0' then ${reg} <= (others => '0');`,
      `  elsif rising_edge(${clk}) then`,
      `    case STD_LOGIC_VECTOR'(${s1} & ${s0}) is`,
      `      when "01" => ${reg} <= ${sr} & ${reg}(3 downto 1);`,
      `      when "10" => ${reg} <= ${reg}(2 downto 0) & ${sl};`,
      `      when "11" => ${reg} <= ${d[3]} & ${d[2]} & ${d[1]} & ${d[0]};`,
      `      when others => null;`,
      `    end case;`,
      `  end if;`,
      `end process; -- 74HC194 ${sid}`,
      `${q[0]} <= ${reg}(0);`,
      `${q[1]} <= ${reg}(1);`,
      `${q[2]} <= ${reg}(2);`,
      `${q[3]} <= ${reg}(3);`,
    ].join('\n');
  },
  verilogExtraRegs: (g) => [{ name: `reg_${sanitize(g.id)}`, width: 4 }],
  vhdlExtraSignals: (g) => [{ name: `reg_${sanitize(g.id)}`, width: 4 }],
  verilogWireOutputs: ['q0','q1','q2','q3'],
  clockInputId: 'clk',
  shapeComponent: FlipFlopShape, description: '4-Bit Universal-Schieberegister (Links/Rechts/Laden)',
});

// 74HC373 – 8-bit transparent D-latch
gateRegistry.register({
  typeId: '74HC373', label: '74HC373', category: 'ic74', width: 110, height: 180,
  propagationDelay: 14, isSynchronous: true,
  stateKeys: makeStateKeys('q', 8),
  defaultInputValues: { oe: 1 },
  inputs: [
    { id: 'oe', label: '/OE', relativeX: 0, relativeY: 0.05 },
    { id: 'le', label: 'LE',  relativeX: 0, relativeY: 0.12 },
    { id: 'd0', label: 'D0',  relativeX: 0, relativeY: 0.22 },
    { id: 'd1', label: 'D1',  relativeX: 0, relativeY: 0.32 },
    { id: 'd2', label: 'D2',  relativeX: 0, relativeY: 0.42 },
    { id: 'd3', label: 'D3',  relativeX: 0, relativeY: 0.52 },
    { id: 'd4', label: 'D4',  relativeX: 0, relativeY: 0.62 },
    { id: 'd5', label: 'D5',  relativeX: 0, relativeY: 0.72 },
    { id: 'd6', label: 'D6',  relativeX: 0, relativeY: 0.82 },
    { id: 'd7', label: 'D7',  relativeX: 0, relativeY: 0.92 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.22 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.32 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.42 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.52 },
    { id: 'q4', label: 'Q4', relativeX: 1, relativeY: 0.62 },
    { id: 'q5', label: 'Q5', relativeX: 1, relativeY: 0.72 },
    { id: 'q6', label: 'Q6', relativeX: 1, relativeY: 0.82 },
    { id: 'q7', label: 'Q7', relativeX: 1, relativeY: 0.92 },
  ],
  evaluate: ({ oe, le, d0, d1, d2, d3, d4, d5, d6, d7 }, state) => {
    if ((oe ?? 0) === 1) return { q0:2,q1:2,q2:2,q3:2,q4:2,q5:2,q6:2,q7:2 };
    if ((le ?? 0) === 1) {
      return { q0:(d0??0) as 0|1, q1:(d1??0) as 0|1, q2:(d2??0) as 0|1, q3:(d3??0) as 0|1,
               q4:(d4??0) as 0|1, q5:(d5??0) as 0|1, q6:(d6??0) as 0|1, q7:(d7??0) as 0|1 };
    }
    const latch = bitsFromState(state as Record<string, unknown> | undefined, 'q', 8, 'latch');
    const out: Record<string,0|1> = {};
    for (let i = 0; i < 8; i++) out['q'+i] = ((latch >> i) & 1) as 0|1;
    return out;
  },
  stateUpdate: ({ le, d0, d1, d2, d3, d4, d5, d6, d7 }, _o, state) => {
    let latch = bitsFromState(state as Record<string, unknown> | undefined, 'q', 8, 'latch');
    if ((le ?? 0) === 1) {
      latch = ((d7??0)<<7)|((d6??0)<<6)|((d5??0)<<5)|((d4??0)<<4)|
              ((d3??0)<<3)|((d2??0)<<2)|((d1??0)<<1)|(d0??0);
    }
    return { ...bitsToState(latch, 'q', 8), latch };
  },
  toVerilog: (g, w) => {
    const sid   = sanitize(g.id);
    const latch = `latch_${sid}`;
    const oe    = w[`${g.id}:oe`] ?? "1'b0";
    const le    = w[`${g.id}:le`] ?? "1'b0";
    const d     = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const q     = ['q0','q1','q2','q3','q4','q5','q6','q7'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `// 74HC373 ${sid}`,
      `/* verilator lint_off LATCH */`,
      `always @(*) begin`,
      `  if (${le}) ${latch} = {${d[7]},${d[6]},${d[5]},${d[4]},${d[3]},${d[2]},${d[1]},${d[0]}};`,
      `end /* verilator lint_on LATCH */ // 74HC373 ${sid}`,
      ...q.map((qi,i) => `assign ${qi} = ${oe} ? 1'bz : ${latch}[${i}];`),
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid   = sanitize(g.id);
    const latch = `latch_${sid}`;
    const oe    = w[`${g.id}:oe`] ?? "'0'";
    const le    = w[`${g.id}:le`] ?? "'0'";
    const d     = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const q     = ['q0','q1','q2','q3','q4','q5','q6','q7'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `-- 74HC373 ${sid}`,
      `process(${le}, ${d.join(', ')})`,
      `begin`,
      `  if ${le} = '1' then`,
      `    ${latch} <= ${d[7]} & ${d[6]} & ${d[5]} & ${d[4]} & ${d[3]} & ${d[2]} & ${d[1]} & ${d[0]};`,
      `  end if;`,
      `end process; -- 74HC373 ${sid}`,
      ...q.map((qi,i) => `${qi} <= 'Z' when ${oe} = '1' else ${latch}(${i});`),
    ].join('\n');
  },
  verilogExtraRegs: (g) => [{ name: `latch_${sanitize(g.id)}`, width: 8 }],
  vhdlExtraSignals: (g) => [{ name: `latch_${sanitize(g.id)}`, width: 8 }],
  verilogWireOutputs: ['q0','q1','q2','q3','q4','q5','q6','q7'],
  shapeComponent: FlipFlopShape, description: '8-Bit transparentes D-Latch mit Output-Enable',
});

// 74HC374 – 8-bit positive-edge-triggered D flip-flop
gateRegistry.register({
  typeId: '74HC374', label: '74HC374', category: 'ic74', width: 110, height: 180,
  propagationDelay: 14, isSynchronous: true,
  stateKeys: makeStateKeys('q', 8),
  hiddenStateKeys: ['reg', 'pClk'],
  stateInit: { q0: 0, q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, reg: 0, pClk: 0 },
  defaultInputValues: { oe: 1 },
  inputs: [
    { id: 'oe',  label: '/OE', relativeX: 0, relativeY: 0.05 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.12 },
    { id: 'd0',  label: 'D0',  relativeX: 0, relativeY: 0.22 },
    { id: 'd1',  label: 'D1',  relativeX: 0, relativeY: 0.32 },
    { id: 'd2',  label: 'D2',  relativeX: 0, relativeY: 0.42 },
    { id: 'd3',  label: 'D3',  relativeX: 0, relativeY: 0.52 },
    { id: 'd4',  label: 'D4',  relativeX: 0, relativeY: 0.62 },
    { id: 'd5',  label: 'D5',  relativeX: 0, relativeY: 0.72 },
    { id: 'd6',  label: 'D6',  relativeX: 0, relativeY: 0.82 },
    { id: 'd7',  label: 'D7',  relativeX: 0, relativeY: 0.92 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.22 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.32 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.42 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.52 },
    { id: 'q4', label: 'Q4', relativeX: 1, relativeY: 0.62 },
    { id: 'q5', label: 'Q5', relativeX: 1, relativeY: 0.72 },
    { id: 'q6', label: 'Q6', relativeX: 1, relativeY: 0.82 },
    { id: 'q7', label: 'Q7', relativeX: 1, relativeY: 0.92 },
  ],
  evaluate: ({ oe }, state) => {
    const reg = bitsFromState(state as Record<string, unknown> | undefined, 'q', 8, 'reg');
    if ((oe ?? 0) === 1) return { q0:2,q1:2,q2:2,q3:2,q4:2,q5:2,q6:2,q7:2 };
    const out: Record<string,0|1> = {};
    for (let i = 0; i < 8; i++) out['q'+i] = ((reg >> i) & 1) as 0|1;
    return out;
  },
  stateUpdate: ({ clk, d0, d1, d2, d3, d4, d5, d6, d7 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let reg = bitsFromState(state as Record<string, unknown> | undefined, 'q', 8, 'reg');
    if (clk === 1 && prev === 0) {
      reg = ((d7??0)<<7)|((d6??0)<<6)|((d5??0)<<5)|((d4??0)<<4)|
            ((d3??0)<<3)|((d2??0)<<2)|((d1??0)<<1)|(d0??0);
    }
    return { ...bitsToState(reg, 'q', 8), reg, pClk: clk };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const reg = `reg_${sid}`;
    const oe  = w[`${g.id}:oe`]  ?? "1'b0";
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const d   = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const q   = ['q0','q1','q2','q3','q4','q5','q6','q7'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `// 74HC374 ${sid}`,
      `always @(posedge ${clk}) begin`,
      `  ${reg} <= {${d[7]},${d[6]},${d[5]},${d[4]},${d[3]},${d[2]},${d[1]},${d[0]}};`,
      `end // 74HC374 ${sid}`,
      ...q.map((qi,i) => `assign ${qi} = ${oe} ? 1'bz : ${reg}[${i}];`),
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const reg = `reg_${sid}`;
    const oe  = w[`${g.id}:oe`]  ?? "'0'";
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const d   = ['d0','d1','d2','d3','d4','d5','d6','d7'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const q   = ['q0','q1','q2','q3','q4','q5','q6','q7'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [
      `-- 74HC374 ${sid}`,
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    ${reg} <= ${d[7]} & ${d[6]} & ${d[5]} & ${d[4]} & ${d[3]} & ${d[2]} & ${d[1]} & ${d[0]};`,
      `  end if;`,
      `end process; -- 74HC374 ${sid}`,
      ...q.map((qi,i) => `${qi} <= 'Z' when ${oe} = '1' else ${reg}(${i});`),
    ].join('\n');
  },
  verilogExtraRegs: (g) => [{ name: `reg_${sanitize(g.id)}`, width: 8 }],
  vhdlExtraSignals: (g) => [{ name: `reg_${sanitize(g.id)}`, width: 8 }],
  verilogWireOutputs: ['q0','q1','q2','q3','q4','q5','q6','q7'],
  clockInputId: 'clk',
  shapeComponent: FlipFlopShape, description: '8-Bit D-Flip-Flop Register mit Output-Enable',
});

// 74HC148 – 8-to-3 priority encoder
gateRegistry.register({
  typeId: '74HC148', label: '74HC148', category: 'ic74', width: 110, height: 160,
  propagationDelay: 16,
  defaultInputValues: { ein: 1, i0: 1, i1: 1, i2: 1, i3: 1, i4: 1, i5: 1, i6: 1, i7: 1 },
  inputs: [
    { id: 'ein', label: 'EI',  relativeX: 0, relativeY: 0.07 },
    { id: 'i0',  label: 'I0',  relativeX: 0, relativeY: 0.20 },
    { id: 'i1',  label: 'I1',  relativeX: 0, relativeY: 0.30 },
    { id: 'i2',  label: 'I2',  relativeX: 0, relativeY: 0.40 },
    { id: 'i3',  label: 'I3',  relativeX: 0, relativeY: 0.50 },
    { id: 'i4',  label: 'I4',  relativeX: 0, relativeY: 0.60 },
    { id: 'i5',  label: 'I5',  relativeX: 0, relativeY: 0.70 },
    { id: 'i6',  label: 'I6',  relativeX: 0, relativeY: 0.80 },
    { id: 'i7',  label: 'I7',  relativeX: 0, relativeY: 0.90 },
  ],
  outputs: [
    { id: 'a0',  label: 'A0',  relativeX: 1, relativeY: 0.25 },
    { id: 'a1',  label: 'A1',  relativeX: 1, relativeY: 0.40 },
    { id: 'a2',  label: 'A2',  relativeX: 1, relativeY: 0.55 },
    { id: 'gs',  label: 'GS',  relativeX: 1, relativeY: 0.70 },
    { id: 'eo',  label: 'EO',  relativeX: 1, relativeY: 0.85 },
  ],
  evaluate: ({ ein, i0, i1, i2, i3, i4, i5, i6, i7 }) => {
    // active-low inputs and outputs
    if (ein === 1) return { a0: 1, a1: 1, a2: 1, gs: 1, eo: 1 };
    const inputs = [i7, i6, i5, i4, i3, i2, i1, i0]; // priority: i7 highest
    let pri = -1;
    for (let i = 0; i < 8; i++) {
      if (inputs[i] === 0) { pri = 7 - i; break; }
    }
    if (pri < 0) return { a0: 1, a1: 1, a2: 1, gs: 1, eo: 0 }; // no input active
    const a = pri ^ 0b111; // active-low output
    return {
      a0: ((a >> 0) & 1) as 0|1,
      a1: ((a >> 1) & 1) as 0|1,
      a2: ((a >> 2) & 1) as 0|1,
      gs: 0, eo: 1,
    };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const ein = w[`${g.id}:ein`] ?? "1'b1";
    const ins = ['i0','i1','i2','i3','i4','i5','i6','i7'].map(p => w[`${g.id}:${p}`] ?? "1'b1");
    const [i0,i1,i2,i3,i4,i5,i6,i7] = ins;
    const a0  = w[`${g.id}:a0`] ?? `w_${sid}_a0`;
    const a1  = w[`${g.id}:a1`] ?? `w_${sid}_a1`;
    const a2  = w[`${g.id}:a2`] ?? `w_${sid}_a2`;
    const gs  = w[`${g.id}:gs`] ?? `w_${sid}_gs`;
    const eo  = w[`${g.id}:eo`] ?? `w_${sid}_eo`;
    return [
      `// 74HC148 ${sid}`,
      `wire       act_${sid} = ~${i7}|~${i6}|~${i5}|~${i4}|~${i3}|~${i2}|~${i1}|~${i0};`,
      `wire [2:0] pri_${sid} = ~${i7} ? 3'b000 : ~${i6} ? 3'b001 : ~${i5} ? 3'b010 : ~${i4} ? 3'b011 :`,
      `                        ~${i3} ? 3'b100 : ~${i2} ? 3'b101 : ~${i1} ? 3'b110 : 3'b111;`,
      `assign ${a0} = ${ein} ? 1'b1 : (act_${sid} ? pri_${sid}[0] : 1'b1);`,
      `assign ${a1} = ${ein} ? 1'b1 : (act_${sid} ? pri_${sid}[1] : 1'b1);`,
      `assign ${a2} = ${ein} ? 1'b1 : (act_${sid} ? pri_${sid}[2] : 1'b1);`,
      `assign ${gs} = ${ein} | ~act_${sid};`,
      `assign ${eo} = ${ein} | act_${sid};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const ein = w[`${g.id}:ein`] ?? "'1'";
    const ins = ['i0','i1','i2','i3','i4','i5','i6','i7'].map(p => w[`${g.id}:${p}`] ?? "'1'");
    const [i0,i1,i2,i3,i4,i5,i6,i7] = ins;
    const a0  = w[`${g.id}:a0`] ?? `w_${sid}_a0`;
    const a1  = w[`${g.id}:a1`] ?? `w_${sid}_a1`;
    const a2  = w[`${g.id}:a2`] ?? `w_${sid}_a2`;
    const gs  = w[`${g.id}:gs`] ?? `w_${sid}_gs`;
    const eo  = w[`${g.id}:eo`] ?? `w_${sid}_eo`;
    // priority i7>i6>...>i0; active-low inputs & outputs; encoded: i7→000, i6→001, ..., i0→111
    return [
      `-- 74HC148 ${sid}`,
      `process(${ein},${ins.join(',')})`,
      `begin`,
      `  if    ${ein} = '1' then ${a2}<='1'; ${a1}<='1'; ${a0}<='1'; ${gs}<='1'; ${eo}<='1';`,
      `  elsif ${i7}  = '0' then ${a2}<='0'; ${a1}<='0'; ${a0}<='0'; ${gs}<='0'; ${eo}<='1';`,
      `  elsif ${i6}  = '0' then ${a2}<='0'; ${a1}<='0'; ${a0}<='1'; ${gs}<='0'; ${eo}<='1';`,
      `  elsif ${i5}  = '0' then ${a2}<='0'; ${a1}<='1'; ${a0}<='0'; ${gs}<='0'; ${eo}<='1';`,
      `  elsif ${i4}  = '0' then ${a2}<='0'; ${a1}<='1'; ${a0}<='1'; ${gs}<='0'; ${eo}<='1';`,
      `  elsif ${i3}  = '0' then ${a2}<='1'; ${a1}<='0'; ${a0}<='0'; ${gs}<='0'; ${eo}<='1';`,
      `  elsif ${i2}  = '0' then ${a2}<='1'; ${a1}<='0'; ${a0}<='1'; ${gs}<='0'; ${eo}<='1';`,
      `  elsif ${i1}  = '0' then ${a2}<='1'; ${a1}<='1'; ${a0}<='0'; ${gs}<='0'; ${eo}<='1';`,
      `  elsif ${i0}  = '0' then ${a2}<='1'; ${a1}<='1'; ${a0}<='1'; ${gs}<='0'; ${eo}<='1';`,
      `  else                    ${a2}<='1'; ${a1}<='1'; ${a0}<='1'; ${gs}<='1'; ${eo}<='0';`,
      `  end if;`,
      `end process; -- 74HC148 ${sid}`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape, description: '8-zu-3 Prioritätsencoder (active-low)',
});

// 74HC163 – 4-bit synchronous binary counter with synchronous clear
gateRegistry.register({
  typeId: '74HC163', label: '74HC163', category: 'ic74', width: 110, height: 160,
  propagationDelay: 20, isSynchronous: true,
  stateKeys: makeStateKeys('cnt', 4),
  hiddenStateKeys: ['cnt', 'pClk'],
  stateInit: { cnt0: 0, cnt1: 0, cnt2: 0, cnt3: 0, cnt: 0, pClk: 0 },
  defaultInputValues: { clrn: 1, ldn: 1 },
  inputs: [
    { id: 'clk',  label: 'CLK',  relativeX: 0, relativeY: 0.07 },
    { id: 'clrn', label: '/CLR', relativeX: 0, relativeY: 0.17 },
    { id: 'ldn',  label: '/LD',  relativeX: 0, relativeY: 0.27 },
    { id: 'enp',  label: 'ENP',  relativeX: 0, relativeY: 0.37 },
    { id: 'ent',  label: 'ENT',  relativeX: 0, relativeY: 0.47 },
    { id: 'd0',   label: 'D0',   relativeX: 0, relativeY: 0.59 },
    { id: 'd1',   label: 'D1',   relativeX: 0, relativeY: 0.69 },
    { id: 'd2',   label: 'D2',   relativeX: 0, relativeY: 0.79 },
    { id: 'd3',   label: 'D3',   relativeX: 0, relativeY: 0.89 },
  ],
  outputs: [
    { id: 'q0',  label: 'Q0',  relativeX: 1, relativeY: 0.59 },
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.69 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.79 },
    { id: 'q3',  label: 'Q3',  relativeX: 1, relativeY: 0.89 },
    { id: 'rco', label: 'RCO', relativeX: 1, relativeY: 0.15 },
  ],
  evaluate: ({ ent }, state) => {
    const cnt = bitsFromState(state as Record<string, unknown> | undefined, 'cnt', 4, 'cnt');
    return {
      q0: ((cnt >> 0) & 1) as 0|1,
      q1: ((cnt >> 1) & 1) as 0|1,
      q2: ((cnt >> 2) & 1) as 0|1,
      q3: ((cnt >> 3) & 1) as 0|1,
      rco: (cnt === 15 && ent === 1 ? 1 : 0) as 0|1,
    };
  },
  stateUpdate: ({ clk, clrn, ldn, enp, ent, d0, d1, d2, d3 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let cnt = bitsFromState(state as Record<string, unknown> | undefined, 'cnt', 4, 'cnt');
    const rising = clk === 1 && prev === 0;
    if (!rising) return { ...state, pClk: clk };
    // 74HC163: synchronous clear (only on rising clock edge)
    if (clrn === 0) return { ...bitsToState(0, 'cnt', 4), cnt: 0, pClk: clk };
    if (ldn === 0) {
      cnt = ((d3 ?? 0) << 3) | ((d2 ?? 0) << 2) | ((d1 ?? 0) << 1) | (d0 ?? 0);
    } else if ((enp ?? 0) === 1 && (ent ?? 0) === 1) {
      cnt = (cnt + 1) & 0xF;
    }
    return { ...bitsToState(cnt, 'cnt', 4), cnt, pClk: clk };
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const cnt  = `cnt_${sid}`;
    const clk  = w[`${g.id}:clk`]  ?? 'clk';
    const clrn = w[`${g.id}:clrn`] ?? "1'b1";
    const ldn  = w[`${g.id}:ldn`]  ?? "1'b1";
    const enp  = w[`${g.id}:enp`]  ?? "1'b0";
    const ent  = w[`${g.id}:ent`]  ?? "1'b0";
    const d    = ['d0','d1','d2','d3'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const q    = ['q0','q1','q2','q3'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    const rco  = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `// 74HC163 ${sid}`,
      `always @(posedge ${clk}) begin`,
      `  if      (!${clrn})               ${cnt} <= 4'd0;`,
      `  else if (!${ldn})                ${cnt} <= {${d[3]},${d[2]},${d[1]},${d[0]}};`,
      `  else if (${enp} && ${ent})       ${cnt} <= ${cnt} + 1'b1;`,
      `end // 74HC163 ${sid}`,
      `assign ${q[0]} = ${cnt}[0];`,
      `assign ${q[1]} = ${cnt}[1];`,
      `assign ${q[2]} = ${cnt}[2];`,
      `assign ${q[3]} = ${cnt}[3];`,
      `assign ${rco}  = ${ent} & (${cnt} == 4'd15);`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const cnt  = `cnt_${sid}`;
    const clk  = w[`${g.id}:clk`]  ?? 'clk';
    const clrn = w[`${g.id}:clrn`] ?? "'1'";
    const ldn  = w[`${g.id}:ldn`]  ?? "'1'";
    const enp  = w[`${g.id}:enp`]  ?? "'0'";
    const ent  = w[`${g.id}:ent`]  ?? "'0'";
    const d    = ['d0','d1','d2','d3'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const q    = ['q0','q1','q2','q3'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    const rco  = w[`${g.id}:rco`] ?? `w_${sid}_rco`;
    return [
      `-- 74HC163 ${sid}`,
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    if    ${clrn} = '0'                       then ${cnt} <= (others => '0');`,
      `    elsif ${ldn}  = '0'                       then ${cnt} <= ${d[3]} & ${d[2]} & ${d[1]} & ${d[0]};`,
      `    elsif ${enp}  = '1' and ${ent} = '1'      then ${cnt} <= std_logic_vector(unsigned(${cnt}) + 1);`,
      `    end if;`,
      `  end if;`,
      `end process; -- 74HC163 ${sid}`,
      `${q[0]} <= ${cnt}(0);`,
      `${q[1]} <= ${cnt}(1);`,
      `${q[2]} <= ${cnt}(2);`,
      `${q[3]} <= ${cnt}(3);`,
      `${rco}  <= ${ent} when unsigned(${cnt}) = 15 else '0';`,
    ].join('\n');
  },
  verilogExtraRegs: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 4 }],
  vhdlExtraSignals: (g) => [{ name: `cnt_${sanitize(g.id)}`, width: 4 }],
  verilogWireOutputs: ['q0','q1','q2','q3','rco'],
  clockInputId: 'clk',
  shapeComponent: FlipFlopShape, description: '4-Bit synchroner Binärzähler mit synchronem Clear',
});

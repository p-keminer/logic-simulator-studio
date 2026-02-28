/**
 * Gates with complementary outputs: Q (true) and Q̄ (inverted).
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { AndCShape, OrCShape, XorCShape } from '../shapes/MultiGateShapes';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

/** VHDL concurrent assignment for a 2-input complementary gate. */
function dualVHDL(op: string) {
  return (g: { id: string }, w: Record<string, string>) => {
    const a  = w[`${g.id}:a`]   ?? "'0'";
    const b  = w[`${g.id}:b`]   ?? "'0'";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `${q}  <= ${a} ${op} ${b};`,
      `${qn} <= not (${a} ${op} ${b});`,
    ].join('\n');
  };
}

/** Verilog assign pair for a 2-input complementary gate. */
function dualVerilog(op: string) {
  return (g: { id: string }, w: Record<string, string>) => {
    const a  = w[`${g.id}:a`]   ?? "1'b0";
    const b  = w[`${g.id}:b`]   ?? "1'b0";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [
      `assign ${q}  = ${a} ${op} ${b};`,
      `assign ${qn} = ~(${a} ${op} ${b});`,
    ].join('\n');
  };
}

// Output port positions: Q at top-right, Q_n at bottom-right
const dualOutputs = [
  { id: 'q',   label: 'Q',  relativeX: 1, relativeY: 0.33 },
  { id: 'q_n', label: 'Q̄', relativeX: 1, relativeY: 0.67 },
];

gateRegistry.register({
  typeId: 'AND_C',
  label: 'AND±',
  category: 'logic_comp_out',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q = (a & b) as 0 | 1;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  toVHDL:    dualVHDL('and'),
  toVerilog: dualVerilog('&'),
  shapeComponent: AndCShape,
  description: 'AND mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'OR_C',
  label: 'OR±',
  category: 'logic_comp_out',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q = (a | b) as 0 | 1;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  toVHDL:    dualVHDL('or'),
  toVerilog: dualVerilog('|'),
  shapeComponent: OrCShape,
  description: 'OR mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'XOR_C',
  label: 'XOR±',
  category: 'logic_comp_out',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q = (a ^ b) as 0 | 1;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  toVHDL:    dualVHDL('xor'),
  toVerilog: dualVerilog('^'),
  shapeComponent: XorCShape,
  description: 'XOR mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'NAND_C',
  label: 'NAND±',
  category: 'logic_comp_out',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q_n = (a & b) as 0 | 1;
    return { q: (q_n ^ 1) as 0 | 1, q_n };
  },
  // For NAND_C: q_n = a AND b (the AND result), q = NOT(a AND b)
  toVHDL: (g, w) => {
    const a  = w[`${g.id}:a`]   ?? "'0'";
    const b  = w[`${g.id}:b`]   ?? "'0'";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [`${qn} <= ${a} and ${b};`, `${q}  <= not (${a} and ${b});`].join('\n');
  },
  toVerilog: (g, w) => {
    const a  = w[`${g.id}:a`]   ?? "1'b0";
    const b  = w[`${g.id}:b`]   ?? "1'b0";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [`assign ${qn} = ${a} & ${b};`, `assign ${q}  = ~(${a} & ${b});`].join('\n');
  },
  shapeComponent: AndCShape,
  description: 'NAND mit Q und Q̄ Ausgang',
});

gateRegistry.register({
  typeId: 'NOR_C',
  label: 'NOR±',
  category: 'logic_comp_out',
  width: 90, height: 60,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.33 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.67 },
  ],
  outputs: dualOutputs,
  evaluate: ({ a, b }) => {
    const q_n = (a | b) as 0 | 1;
    return { q: (q_n ^ 1) as 0 | 1, q_n };
  },
  // For NOR_C: q_n = a OR b (the OR result), q = NOT(a OR b)
  toVHDL: (g, w) => {
    const a  = w[`${g.id}:a`]   ?? "'0'";
    const b  = w[`${g.id}:b`]   ?? "'0'";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [`${qn} <= ${a} or ${b};`, `${q}  <= not (${a} or ${b});`].join('\n');
  },
  toVerilog: (g, w) => {
    const a  = w[`${g.id}:a`]   ?? "1'b0";
    const b  = w[`${g.id}:b`]   ?? "1'b0";
    const q  = w[`${g.id}:q`]   ?? `w_${sanitize(g.id)}_q`;
    const qn = w[`${g.id}:q_n`] ?? `w_${sanitize(g.id)}_q_n`;
    return [`assign ${qn} = ${a} | ${b};`, `assign ${q}  = ~(${a} | ${b});`].join('\n');
  },
  shapeComponent: OrCShape,
  description: 'NOR mit Q und Q̄ Ausgang',
});

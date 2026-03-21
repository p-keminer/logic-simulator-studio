import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'x'; }

// ─── 1-Bit Comparator ────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'CMP1',
  label: 'CMP',
  category: 'arith',
  width: 80, height: 80,
  inputs: [
    { id: 'a', label: 'A', relativeX: 0, relativeY: 0.3 },
    { id: 'b', label: 'B', relativeX: 0, relativeY: 0.7 },
  ],
  outputs: [
    { id: 'eq', label: '=',  relativeX: 1, relativeY: 0.25 },
    { id: 'gt', label: '>',  relativeX: 1, relativeY: 0.5  },
    { id: 'lt', label: '<',  relativeX: 1, relativeY: 0.75 },
  ],
  evaluate: ({ a, b }) => ({
    eq: (a === b ? 1 : 0) as 0 | 1,
    gt: (a  >  b ? 1 : 0) as 0 | 1,
    lt: (a  <  b ? 1 : 0) as 0 | 1,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const a  = w[`${g.id}:a`]  ?? "1'b0";
    const b  = w[`${g.id}:b`]  ?? "1'b0";
    const eq = w[`${g.id}:eq`] ?? `w_${sid}_eq`;
    const gt = w[`${g.id}:gt`] ?? `w_${sid}_gt`;
    const lt = w[`${g.id}:lt`] ?? `w_${sid}_lt`;
    return [
      `// CMP1 ${sid}`,
      `assign ${eq} = ~(${a} ^ ${b});`,
      `assign ${gt} = ${a} & ~${b};`,
      `assign ${lt} = ~${a} & ${b};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const a  = w[`${g.id}:a`]  ?? "'0'";
    const b  = w[`${g.id}:b`]  ?? "'0'";
    const eq = w[`${g.id}:eq`] ?? `w_${sid}_eq`;
    const gt = w[`${g.id}:gt`] ?? `w_${sid}_gt`;
    const lt = w[`${g.id}:lt`] ?? `w_${sid}_lt`;
    return [
      `-- CMP1 ${sid}`,
      `${eq} <= '1' when ${a} = ${b}              else '0';`,
      `${gt} <= '1' when ${a} = '1' and ${b} = '0' else '0';`,
      `${lt} <= '1' when ${a} = '0' and ${b} = '1' else '0';`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: '1-Bit Komparator: EQ (A=B), GT (A>B), LT (A<B)',
});

// ─── 4-Bit Cascadable Comparator ─────────────────────────────────────────────
gateRegistry.register({
  typeId: 'CMP4',
  label: 'CMP4',
  category: 'arith',
  width: 90, height: 200,
  inputs: [
    { id: 'a0',   label: 'A0',   relativeX: 0, relativeY: 0.07 },
    { id: 'a1',   label: 'A1',   relativeX: 0, relativeY: 0.17 },
    { id: 'a2',   label: 'A2',   relativeX: 0, relativeY: 0.27 },
    { id: 'a3',   label: 'A3',   relativeX: 0, relativeY: 0.37 },
    { id: 'b0',   label: 'B0',   relativeX: 0, relativeY: 0.50 },
    { id: 'b1',   label: 'B1',   relativeX: 0, relativeY: 0.60 },
    { id: 'b2',   label: 'B2',   relativeX: 0, relativeY: 0.70 },
    { id: 'b3',   label: 'B3',   relativeX: 0, relativeY: 0.80 },
    { id: 'ltin', label: 'LTin', relativeX: 0, relativeY: 0.87 },
    { id: 'eqin', label: 'EQin', relativeX: 0, relativeY: 0.93 },
    { id: 'gtin', label: 'GTin', relativeX: 0, relativeY: 0.99 },
  ],
  outputs: [
    { id: 'lt', label: '<',  relativeX: 1, relativeY: 0.33 },
    { id: 'eq', label: '=',  relativeX: 1, relativeY: 0.5  },
    { id: 'gt', label: '>',  relativeX: 1, relativeY: 0.67 },
  ],
  evaluate: ({ a0, a1, a2, a3, b0, b1, b2, b3, ltin, eqin, gtin }) => {
    const a = ((a0 ?? 0) as number) | (((a1 ?? 0) as number) << 1) | (((a2 ?? 0) as number) << 2) | (((a3 ?? 0) as number) << 3);
    const b = ((b0 ?? 0) as number) | (((b1 ?? 0) as number) << 1) | (((b2 ?? 0) as number) << 2) | (((b3 ?? 0) as number) << 3);
    if (a < b) return { lt: 1, eq: 0, gt: 0 };
    if (a > b) return { lt: 0, eq: 0, gt: 1 };
    // A == B: cascade inputs propagate through
    return {
      lt: ((ltin ?? 0) as number) as 0|1,
      eq: ((eqin ?? 0) as number) as 0|1,
      gt: ((gtin ?? 0) as number) as 0|1,
    };
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const a0   = w[`${g.id}:a0`]   ?? "1'b0"; const a1   = w[`${g.id}:a1`]   ?? "1'b0";
    const a2   = w[`${g.id}:a2`]   ?? "1'b0"; const a3   = w[`${g.id}:a3`]   ?? "1'b0";
    const b0   = w[`${g.id}:b0`]   ?? "1'b0"; const b1   = w[`${g.id}:b1`]   ?? "1'b0";
    const b2   = w[`${g.id}:b2`]   ?? "1'b0"; const b3   = w[`${g.id}:b3`]   ?? "1'b0";
    const ltin = w[`${g.id}:ltin`] ?? "1'b0";
    const eqin = w[`${g.id}:eqin`] ?? "1'b0";
    const gtin = w[`${g.id}:gtin`] ?? "1'b0";
    const lt   = w[`${g.id}:lt`]   ?? `w_${sid}_lt`;
    const eq   = w[`${g.id}:eq`]   ?? `w_${sid}_eq`;
    const gt   = w[`${g.id}:gt`]   ?? `w_${sid}_gt`;
    return [
      `// CMP4 ${sid}`,
      `always @(*) begin : blk_${sid}`,
      `  reg [3:0] va, vb;`,
      `  va = {${a3}, ${a2}, ${a1}, ${a0}};`,
      `  vb = {${b3}, ${b2}, ${b1}, ${b0}};`,
      `  if      (va < vb) begin ${lt} = 1'b1; ${eq} = 1'b0; ${gt} = 1'b0; end`,
      `  else if (va > vb) begin ${lt} = 1'b0; ${eq} = 1'b0; ${gt} = 1'b1; end`,
      `  else              begin ${lt} = ${ltin}; ${eq} = ${eqin}; ${gt} = ${gtin}; end`,
      `end // CMP4 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const a0   = w[`${g.id}:a0`]   ?? "'0'"; const a1   = w[`${g.id}:a1`]   ?? "'0'";
    const a2   = w[`${g.id}:a2`]   ?? "'0'"; const a3   = w[`${g.id}:a3`]   ?? "'0'";
    const b0   = w[`${g.id}:b0`]   ?? "'0'"; const b1   = w[`${g.id}:b1`]   ?? "'0'";
    const b2   = w[`${g.id}:b2`]   ?? "'0'"; const b3   = w[`${g.id}:b3`]   ?? "'0'";
    const ltin = w[`${g.id}:ltin`] ?? "'0'";
    const eqin = w[`${g.id}:eqin`] ?? "'0'";
    const gtin = w[`${g.id}:gtin`] ?? "'0'";
    const lt   = w[`${g.id}:lt`]   ?? `w_${sid}_lt`;
    const eq   = w[`${g.id}:eq`]   ?? `w_${sid}_eq`;
    const gt   = w[`${g.id}:gt`]   ?? `w_${sid}_gt`;
    // Sensitivity list: only real signal names (no literals like '0')
    const sens = [...new Set([a0, a1, a2, a3, b0, b1, b2, b3, ltin, eqin, gtin]
      .filter(s => !s.startsWith("'")))].join(', ') || 'a0';
    return [
      `-- CMP4 ${sid}`,
      `process(${sens})`,
      `  variable va : unsigned(3 downto 0);`,
      `  variable vb : unsigned(3 downto 0);`,
      `begin`,
      `  va := unsigned(${a3} & ${a2} & ${a1} & ${a0});`,
      `  vb := unsigned(${b3} & ${b2} & ${b1} & ${b0});`,
      `  if    va < vb then ${lt} <= '1'; ${eq} <= '0'; ${gt} <= '0';`,
      `  elsif va > vb then ${lt} <= '0'; ${eq} <= '0'; ${gt} <= '1';`,
      `  else               ${lt} <= ${ltin}; ${eq} <= ${eqin}; ${gt} <= ${gtin};`,
      `  end if;`,
      `end process; -- CMP4 ${sid}`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: '4-Bit Komparator: Vergleicht A[3:0] mit B[3:0] (LT / EQ / GT)',
  verilogAlwaysComb: true,
});

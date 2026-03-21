/**
 * Register definitions: 4-bit and 8-bit D-Registers.
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import { ShiftRegShape } from '../shapes/ShiftRegShape';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'x'; }

// ─── 4-bit Register ──────────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'REG4',
  label: 'REG4',
  category: 'register',
  width: 100, height: 160,
  inputs: [
    { id: 'd0',  label: 'D0',  relativeX: 0, relativeY: 0.12 },
    { id: 'd1',  label: 'D1',  relativeX: 0, relativeY: 0.25 },
    { id: 'd2',  label: 'D2',  relativeX: 0, relativeY: 0.38 },
    { id: 'd3',  label: 'D3',  relativeX: 0, relativeY: 0.51 },
    { id: 'en',  label: 'EN',  relativeX: 0, relativeY: 0.64 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.79 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.93 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.12 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.25 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.38 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.51 },
  ],
  evaluate: (_inputs, state) => ({
    q0: (state?.q0 as 0 | 1) ?? 0,
    q1: (state?.q1 as 0 | 1) ?? 0,
    q2: (state?.q2 as 0 | 1) ?? 0,
    q3: (state?.q3 as 0 | 1) ?? 0,
  }),
  stateUpdate: ({ d0, d1, d2, d3, en, clk, rst }, _outputs, state) => {
    if (rst === 1) return { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: clk };
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    if (clk === 1 && prevClk === 0 && en === 1) {
      return { q0: d0, q1: d1, q2: d2, q3: d3, prevClk: clk };
    }
    return {
      q0: state?.q0 ?? 0,
      q1: state?.q1 ?? 0,
      q2: state?.q2 ?? 0,
      q3: state?.q3 ?? 0,
      prevClk: clk,
    };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const d0  = w[`${g.id}:d0`]  ?? "1'b0"; const d1  = w[`${g.id}:d1`]  ?? "1'b0";
    const d2  = w[`${g.id}:d2`]  ?? "1'b0"; const d3  = w[`${g.id}:d3`]  ?? "1'b0";
    const en  = w[`${g.id}:en`]  ?? "1'b0";
    const clk = w[`${g.id}:clk`] ?? "1'b0";
    const rst = w[`${g.id}:rst`] ?? "1'b0";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`; const q1  = w[`${g.id}:q1`]  ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`; const q3  = w[`${g.id}:q3`]  ?? `w_${sid}_q3`;
    return [
      `// REG4 ${sid}`,
      `always @(posedge ${clk} or posedge ${rst}) begin`,
      `  if (${rst}) begin`,
      `    ${q0} <= 1'b0; ${q1} <= 1'b0; ${q2} <= 1'b0; ${q3} <= 1'b0;`,
      `  end else if (${en}) begin`,
      `    ${q0} <= ${d0}; ${q1} <= ${d1}; ${q2} <= ${d2}; ${q3} <= ${d3};`,
      `  end`,
      `end // REG4 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const d0  = w[`${g.id}:d0`]  ?? "'0'"; const d1  = w[`${g.id}:d1`]  ?? "'0'";
    const d2  = w[`${g.id}:d2`]  ?? "'0'"; const d3  = w[`${g.id}:d3`]  ?? "'0'";
    const en  = w[`${g.id}:en`]  ?? "'0'";
    const clk = w[`${g.id}:clk`] ?? "'0'";
    const rst = w[`${g.id}:rst`] ?? "'0'";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`; const q1  = w[`${g.id}:q1`]  ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`; const q3  = w[`${g.id}:q3`]  ?? `w_${sid}_q3`;
    return [
      `-- REG4 ${sid}`,
      `process(${clk}, ${rst})`,
      `begin`,
      `  if ${rst} = '1' then`,
      `    ${q0} <= '0'; ${q1} <= '0'; ${q2} <= '0'; ${q3} <= '0';`,
      `  elsif rising_edge(${clk}) then`,
      `    if ${en} = '1' then`,
      `      ${q0} <= ${d0}; ${q1} <= ${d1}; ${q2} <= ${d2}; ${q3} <= ${d3};`,
      `    end if;`,
      `  end if;`,
      `end process; -- REG4 ${sid}`,
    ].join('\n');
  },
  shapeComponent: ShiftRegShape,
  description: '4-Bit D-Register mit EN (steigende CLK-Flanke, async RST)',
  isSynchronous: true,
  clockInputId: 'clk',
  stateKeys: ['q0', 'q1', 'q2', 'q3'],
  hiddenStateKeys: ['prevClk'],
  stateInit: { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 },
});

// ─── 8-bit Register ──────────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'REG8',
  label: 'REG8',
  category: 'register',
  width: 100, height: 220,
  inputs: [
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `d${i}`, label: `D${i}`, relativeX: 0, relativeY: (i + 0.5) / 10,
    })),
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.88 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.95 },
  ],
  outputs: Array.from({ length: 8 }, (_, i) => ({
    id: `q${i}`, label: `Q${i}`, relativeX: 1, relativeY: (i + 0.5) / 10,
  })),
  evaluate: (_inputs, state) => Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => [`q${i}`, (state?.[`q${i}`] as 0 | 1) ?? 0])
  ),
  stateUpdate: (inputs, _outputs, state) => {
    const { clk, rst } = inputs;
    if (rst === 1) {
      return { ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`q${i}`, 0])), prevClk: clk };
    }
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    if (clk === 1 && prevClk === 0) {
      return { ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`q${i}`, inputs[`d${i}`]])), prevClk: clk };
    }
    return { ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`q${i}`, state?.[`q${i}`] ?? 0])), prevClk: clk };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const ds  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:d${i}`] ?? "1'b0");
    const qs  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:q${i}`] ?? `w_${sid}_q${i}`);
    const clk = w[`${g.id}:clk`] ?? "1'b0";
    const rst = w[`${g.id}:rst`] ?? "1'b0";
    return [
      `// REG8 ${sid}`,
      `always @(posedge ${clk} or posedge ${rst}) begin`,
      `  if (${rst}) begin`,
      `    ${qs.map(q => `${q} <= 1'b0;`).join(' ')}`,
      `  end else begin`,
      `    ${qs.map((q, i) => `${q} <= ${ds[i]};`).join(' ')}`,
      `  end`,
      `end // REG8 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const ds  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:d${i}`] ?? "'0'");
    const qs  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:q${i}`] ?? `w_${sid}_q${i}`);
    const clk = w[`${g.id}:clk`] ?? "'0'";
    const rst = w[`${g.id}:rst`] ?? "'0'";
    return [
      `-- REG8 ${sid}`,
      `process(${clk}, ${rst})`,
      `begin`,
      `  if ${rst} = '1' then`,
      `    ${qs.map(q => `${q} <= '0';`).join(' ')}`,
      `  elsif rising_edge(${clk}) then`,
      `    ${qs.map((q, i) => `${q} <= ${ds[i]};`).join(' ')}`,
      `  end if;`,
      `end process; -- REG8 ${sid}`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: '8-Bit D-Register (steigende CLK-Flanke)',
  isSynchronous: true,
  clockInputId: 'clk',
  stateKeys: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
  hiddenStateKeys: ['prevClk'],
  stateInit: { q0: 0, q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, prevClk: 0 },
});

// ─── Shift Register (4-bit SIPO) ─────────────────────────────────────────────

gateRegistry.register({
  typeId: 'SHIFT4',
  label: 'SHIFT4',
  category: 'register',
  width: 100, height: 120,
  inputs: [
    { id: 'si',  label: 'SI',  relativeX: 0, relativeY: 0.2 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.55 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.85 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.2 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.4 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.6 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.8 },
  ],
  evaluate: (_inputs, state) => ({
    q0: (state?.q0 as 0 | 1) ?? 0,
    q1: (state?.q1 as 0 | 1) ?? 0,
    q2: (state?.q2 as 0 | 1) ?? 0,
    q3: (state?.q3 as 0 | 1) ?? 0,
  }),
  stateUpdate: ({ si, clk, rst }, _outputs, state) => {
    if (rst === 1) return { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: clk };
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    if (clk === 1 && prevClk === 0) {
      return { q0: si, q1: state?.q0 ?? 0, q2: state?.q1 ?? 0, q3: state?.q2 ?? 0, prevClk: clk };
    }
    return { q0: state?.q0 ?? 0, q1: state?.q1 ?? 0, q2: state?.q2 ?? 0, q3: state?.q3 ?? 0, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const si  = w[`${g.id}:si`]  ?? "1'b0";
    const clk = w[`${g.id}:clk`] ?? "1'b0";
    const rst = w[`${g.id}:rst`] ?? "1'b0";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`; const q1 = w[`${g.id}:q1`] ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`; const q3 = w[`${g.id}:q3`] ?? `w_${sid}_q3`;
    return [
      `// SHIFT4 ${sid}`,
      `always @(posedge ${clk} or posedge ${rst}) begin`,
      `  if (${rst}) begin`,
      `    ${q0} <= 1'b0; ${q1} <= 1'b0; ${q2} <= 1'b0; ${q3} <= 1'b0;`,
      `  end else begin`,
      `    ${q3} <= ${q2}; ${q2} <= ${q1}; ${q1} <= ${q0}; ${q0} <= ${si};`,
      `  end`,
      `end // SHIFT4 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const si  = w[`${g.id}:si`]  ?? "'0'";
    const clk = w[`${g.id}:clk`] ?? "'0'";
    const rst = w[`${g.id}:rst`] ?? "'0'";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`; const q1 = w[`${g.id}:q1`] ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`; const q3 = w[`${g.id}:q3`] ?? `w_${sid}_q3`;
    return [
      `-- SHIFT4 ${sid}`,
      `process(${clk}, ${rst})`,
      `begin`,
      `  if ${rst} = '1' then`,
      `    ${q0} <= '0'; ${q1} <= '0'; ${q2} <= '0'; ${q3} <= '0';`,
      `  elsif rising_edge(${clk}) then`,
      `    ${q3} <= ${q2}; ${q2} <= ${q1}; ${q1} <= ${q0}; ${q0} <= ${si};`,
      `  end if;`,
      `end process; -- SHIFT4 ${sid}`,
    ].join('\n');
  },
  shapeComponent: ShiftRegShape,
  description: '4-Bit Schieberegister SIPO (Seriell-Ein / Parallel-Aus)',
  isSynchronous: true,
  clockInputId: 'clk',
  stateKeys: ['q0', 'q1', 'q2', 'q3'],
  hiddenStateKeys: ['prevClk'],
  stateInit: { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 },
});

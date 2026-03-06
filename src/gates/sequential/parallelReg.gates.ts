/**
 * Parallel registers:
 *  PISO4 – Parallel-In Serial-Out, 4-bit
 *  PIPO4 – Parallel-In Parallel-Out, 4-bit
 *  PIPO8 – Parallel-In Parallel-Out, 8-bit
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import type { SignalValue } from '../../core/types';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

// ─── PISO4 ───────────────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'PISO4',
  label: 'PISO4',
  category: 'register',
  width: 90, height: 120,
  inputs: [
    { id: 'p0',   label: 'P0',   relativeX: 0, relativeY: 0.10 },
    { id: 'p1',   label: 'P1',   relativeX: 0, relativeY: 0.24 },
    { id: 'p2',   label: 'P2',   relativeX: 0, relativeY: 0.38 },
    { id: 'p3',   label: 'P3',   relativeX: 0, relativeY: 0.52 },
    { id: 'load', label: 'LD',   relativeX: 0, relativeY: 0.69 },
    { id: 'clk',  label: 'CLK',  relativeX: 0, relativeY: 0.85 },
  ],
  outputs: [
    { id: 'q', label: 'Q', relativeX: 1, relativeY: 0.50 },
  ],
  evaluate: (_inputs, state) => ({
    q: ((state?.bit0 as number) ?? 0) as SignalValue,
  }),
  stateUpdate: ({ p0, p1, p2, p3, load, clk }, _out, state) => {
    const prevClk = (state?.prevClk as number) ?? 0;
    const b0 = (state?.bit0 as number) ?? 0;
    const b1 = (state?.bit1 as number) ?? 0;
    const b2 = (state?.bit2 as number) ?? 0;
    const b3 = (state?.bit3 as number) ?? 0;
    if (!(clk === 1 && prevClk === 0)) return { bit0: b0, bit1: b1, bit2: b2, bit3: b3, prevClk: clk };
    if (load === 1) return { bit0: p0, bit1: p1, bit2: p2, bit3: p3, prevClk: clk };
    // Shift: output b0, shift left: b0←b1, b1←b2, b2←b3, b3←0
    return { bit0: b1, bit1: b2, bit2: b3, bit3: 0, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const sid  = sanitize(g.id);
    const sr   = `sr_${sid}`;           // internal shift register, declared via verilogExtraRegs
    const p0   = w[`${g.id}:p0`]   ?? "1'b0"; const p1 = w[`${g.id}:p1`] ?? "1'b0";
    const p2   = w[`${g.id}:p2`]   ?? "1'b0"; const p3 = w[`${g.id}:p3`] ?? "1'b0";
    const load = w[`${g.id}:load`] ?? "1'b0";
    const clk  = w[`${g.id}:clk`]  ?? "1'b0";
    const q    = w[`${g.id}:q`]    ?? `w_${sid}_q`;
    return [
      `// PISO4 ${sid}  (LD=1→load, LD=0→shift)`,
      `always @(posedge ${clk}) begin`,
      `  if (${load} == 1'b1)`,
      `    ${sr} <= {${p0}, ${p1}, ${p2}, ${p3}};`,
      `  else`,
      `    ${sr} <= {${sr}[2:0], 1'b0};`,
      `end // PISO4 ${sid}`,
      `assign ${q} = ${sr}[3];`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid  = sanitize(g.id);
    const sr   = `sr_${sid}`;           // internal shift register, declared via vhdlExtraSignals
    const p0   = w[`${g.id}:p0`]   ?? "'0'"; const p1 = w[`${g.id}:p1`] ?? "'0'";
    const p2   = w[`${g.id}:p2`]   ?? "'0'"; const p3 = w[`${g.id}:p3`] ?? "'0'";
    const load = w[`${g.id}:load`] ?? "'0'";
    const clk  = w[`${g.id}:clk`]  ?? "'0'";
    const q    = w[`${g.id}:q`]    ?? `w_${sid}_q`;
    return [
      `-- PISO4 ${sid}  (LD='1'→load, LD='0'→shift)`,
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    if ${load} = '1' then`,
      `      ${sr} <= ${p0} & ${p1} & ${p2} & ${p3};`,
      `    else`,
      `      ${sr} <= ${sr}(2 downto 0) & '0';`,
      `    end if;`,
      `  end if;`,
      `end process; -- PISO4 ${sid}`,
      `${q} <= ${sr}(3);`,
    ].join('\n');
  },
  verilogExtraRegs: (g) => [{ name: `sr_${sanitize(g.id)}`, width: 4 }],
  vhdlExtraSignals: (g) => [{ name: `sr_${sanitize(g.id)}`, width: 4 }],
  shapeComponent: FlipFlopShape,
  description: 'PISO 4-Bit Register: LD=1 lädt P0–P3, LD=0 schiebt seriell aus',
  isSynchronous: true,
  clockInputId: 'clk',
  stateKeys: ['bit0', 'bit1', 'bit2', 'bit3'],
  // sr reg is driven by always @(posedge) → reg; q driven by assign q=sr[3] → wire
  verilogWireOutputs: ['q'],
});

// ─── PIPO4 ───────────────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'PIPO4',
  label: 'PIPO4',
  category: 'register',
  width: 90, height: 120,
  inputs: [
    { id: 'p0',  label: 'P0',  relativeX: 0, relativeY: 0.12 },
    { id: 'p1',  label: 'P1',  relativeX: 0, relativeY: 0.30 },
    { id: 'p2',  label: 'P2',  relativeX: 0, relativeY: 0.50 },
    { id: 'p3',  label: 'P3',  relativeX: 0, relativeY: 0.68 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.88 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.20 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.40 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.60 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.80 },
  ],
  evaluate: (_inputs, state) => ({
    q0: ((state?.bit0 as number) ?? 0) as SignalValue,
    q1: ((state?.bit1 as number) ?? 0) as SignalValue,
    q2: ((state?.bit2 as number) ?? 0) as SignalValue,
    q3: ((state?.bit3 as number) ?? 0) as SignalValue,
  }),
  stateUpdate: ({ p0, p1, p2, p3, clk }, _out, state) => {
    const prevClk = (state?.prevClk as number) ?? 0;
    if (!(clk === 1 && prevClk === 0))
      return { bit0: (state?.bit0 ?? 0), bit1: (state?.bit1 ?? 0), bit2: (state?.bit2 ?? 0), bit3: (state?.bit3 ?? 0), prevClk: clk };
    return { bit0: p0, bit1: p1, bit2: p2, bit3: p3, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const p0  = w[`${g.id}:p0`]  ?? "1'b0"; const p1 = w[`${g.id}:p1`] ?? "1'b0";
    const p2  = w[`${g.id}:p2`]  ?? "1'b0"; const p3 = w[`${g.id}:p3`] ?? "1'b0";
    const clk = w[`${g.id}:clk`] ?? "1'b0";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`; const q1 = w[`${g.id}:q1`] ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`; const q3 = w[`${g.id}:q3`] ?? `w_${sid}_q3`;
    return [
      `// PIPO4 ${sid}`,
      `always @(posedge ${clk}) begin`,
      `  ${q0} <= ${p0}; ${q1} <= ${p1}; ${q2} <= ${p2}; ${q3} <= ${p3};`,
      `end // PIPO4 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const p0  = w[`${g.id}:p0`]  ?? "'0'"; const p1 = w[`${g.id}:p1`] ?? "'0'";
    const p2  = w[`${g.id}:p2`]  ?? "'0'"; const p3 = w[`${g.id}:p3`] ?? "'0'";
    const clk = w[`${g.id}:clk`] ?? "'0'";
    const q0  = w[`${g.id}:q0`]  ?? `w_${sid}_q0`; const q1 = w[`${g.id}:q1`] ?? `w_${sid}_q1`;
    const q2  = w[`${g.id}:q2`]  ?? `w_${sid}_q2`; const q3 = w[`${g.id}:q3`] ?? `w_${sid}_q3`;
    return [
      `-- PIPO4 ${sid}`,
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    ${q0} <= ${p0}; ${q1} <= ${p1}; ${q2} <= ${p2}; ${q3} <= ${p3};`,
      `  end if;`,
      `end process; -- PIPO4 ${sid}`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'PIPO 4-Bit Register: lädt P0–P3 bei CLK↑',
  isSynchronous: true,
  clockInputId: 'clk',
  stateKeys: ['bit0', 'bit1', 'bit2', 'bit3'],
});

// ─── PIPO8 ───────────────────────────────────────────────────────────────────
gateRegistry.register({
  typeId: 'PIPO8',
  label: 'PIPO8',
  category: 'register',
  width: 100, height: 200,
  inputs: [
    { id: 'p0',  label: 'P0',  relativeX: 0, relativeY: 0.08 },
    { id: 'p1',  label: 'P1',  relativeX: 0, relativeY: 0.19 },
    { id: 'p2',  label: 'P2',  relativeX: 0, relativeY: 0.30 },
    { id: 'p3',  label: 'P3',  relativeX: 0, relativeY: 0.41 },
    { id: 'p4',  label: 'P4',  relativeX: 0, relativeY: 0.52 },
    { id: 'p5',  label: 'P5',  relativeX: 0, relativeY: 0.63 },
    { id: 'p6',  label: 'P6',  relativeX: 0, relativeY: 0.74 },
    { id: 'p7',  label: 'P7',  relativeX: 0, relativeY: 0.85 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.94 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.08 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.19 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.30 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.41 },
    { id: 'q4', label: 'Q4', relativeX: 1, relativeY: 0.52 },
    { id: 'q5', label: 'Q5', relativeX: 1, relativeY: 0.63 },
    { id: 'q6', label: 'Q6', relativeX: 1, relativeY: 0.74 },
    { id: 'q7', label: 'Q7', relativeX: 1, relativeY: 0.85 },
  ],
  evaluate: (_inputs, state) => ({
    q0: ((state?.b0 as number) ?? 0) as SignalValue,
    q1: ((state?.b1 as number) ?? 0) as SignalValue,
    q2: ((state?.b2 as number) ?? 0) as SignalValue,
    q3: ((state?.b3 as number) ?? 0) as SignalValue,
    q4: ((state?.b4 as number) ?? 0) as SignalValue,
    q5: ((state?.b5 as number) ?? 0) as SignalValue,
    q6: ((state?.b6 as number) ?? 0) as SignalValue,
    q7: ((state?.b7 as number) ?? 0) as SignalValue,
  }),
  stateUpdate: ({ p0, p1, p2, p3, p4, p5, p6, p7, clk }, _out, state) => {
    const prevClk = (state?.prevClk as number) ?? 0;
    if (!(clk === 1 && prevClk === 0))
      return { b0: (state?.b0 ?? 0), b1: (state?.b1 ?? 0), b2: (state?.b2 ?? 0), b3: (state?.b3 ?? 0),
               b4: (state?.b4 ?? 0), b5: (state?.b5 ?? 0), b6: (state?.b6 ?? 0), b7: (state?.b7 ?? 0), prevClk: clk };
    return { b0: p0, b1: p1, b2: p2, b3: p3, b4: p4, b5: p5, b6: p6, b7: p7, prevClk: clk };
  },
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const ps  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:p${i}`] ?? "1'b0");
    const qs  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:q${i}`] ?? `w_${sid}_q${i}`);
    const clk = w[`${g.id}:clk`] ?? "1'b0";
    return [
      `// PIPO8 ${sid}`,
      `always @(posedge ${clk}) begin`,
      `  ${qs.map((q, i) => `${q} <= ${ps[i]};`).join(' ')}`,
      `end // PIPO8 ${sid}`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const ps  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:p${i}`] ?? "'0'");
    const qs  = Array.from({ length: 8 }, (_, i) => w[`${g.id}:q${i}`] ?? `w_${sid}_q${i}`);
    const clk = w[`${g.id}:clk`] ?? "'0'";
    return [
      `-- PIPO8 ${sid}`,
      `process(${clk})`,
      `begin`,
      `  if rising_edge(${clk}) then`,
      `    ${qs.map((q, i) => `${q} <= ${ps[i]};`).join(' ')}`,
      `  end if;`,
      `end process; -- PIPO8 ${sid}`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'PIPO 8-Bit Register: lädt P0–P7 bei CLK↑',
  isSynchronous: true,
  clockInputId: 'clk',
  stateKeys: ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'],
});
/**
 * Flip-Flops with asynchronous Set (S / Preset) and Reset (R / Clear) inputs.
 * S=1 overrides clock → Q=1. R=1 overrides clock → Q=0.
 * S=1, R=1 is an invalid/undefined state (treated as Q=0).
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { jkSimplifiedVerilog, jkSimplifiedVHDL, asyncSRWrapVerilog, asyncSRWrapVHDL, portConst } from '../../core/io/hdlSimplify';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_'); }

const qqnOutputs = [
  { id: 'q',   label: 'Q',  relativeX: 1, relativeY: 0.35 },
  { id: 'q_n', label: 'Q̄', relativeX: 1, relativeY: 0.65 },
];

// Helper: apply async S/R override
function asyncSR(s: number, r: number): number | null {
  if (s === 1 && r === 0) return 1;
  if (s === 0 && r === 1) return 0;
  if (s === 1 && r === 1) return 0; // undefined → 0
  return null; // no override
}

// ─── D Flip-Flop with async Set + Reset ──────────────────────────────────────
gateRegistry.register({
  typeId: 'D_FF_ASSR',
  label: 'D-FF/SR',
  category: 'flipflop',
  width: 80, height: 110,
  stateKeys: ['q'],
  hiddenStateKeys: ['prevClk'],
  stateInit: { q: 0, prevClk: 0 },
  inputs: [
    { id: 'd',   label: 'D',   relativeX: 0, relativeY: 0.20 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.45 },
    { id: 's',   label: 'S',   relativeX: 0, relativeY: 0.67 },
    { id: 'r',   label: 'R',   relativeX: 0, relativeY: 0.85 },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ d, clk, s, r }, _out, state) => {
    const async = asyncSR(s, r);
    if (async !== null) return { q: async, prevClk: clk };
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q = (state?.q as 0 | 1) ?? 0;
    const newQ = (clk === 1 && prevClk === 0) ? d as 0 | 1 : q;
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w, cm) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const d   = w[`${g.id}:d`]   ?? "1'b0";
    const s   = w[`${g.id}:s`]   ?? "1'b0";
    const r   = w[`${g.id}:r`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    const sc = portConst(g.id, 's', cm), rc = portConst(g.id, 'r', cm);
    return [
      ...asyncSRWrapVerilog(clk, s, r, sc, rc, q, [`${q} <= ${d};`]),
      `end // D-FF/ASSR ${sid}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w, cm) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const d   = w[`${g.id}:d`]   ?? "'0'";
    const s   = w[`${g.id}:s`]   ?? "'0'";
    const r   = w[`${g.id}:r`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    const sc = portConst(g.id, 's', cm), rc = portConst(g.id, 'r', cm);
    return [
      ...asyncSRWrapVHDL(clk, s, r, sc, rc, q, [`  ${q} <= ${d};`]),
      `end process; -- D-FF/ASSR ${sid}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'D Flip-Flop mit asynchronem Set (S) und Reset (R)',
  isSynchronous: true,
  clockInputId: 'clk',
  verilogWireOutputs: ['q_n'],
});

// ─── JK Flip-Flop with async Set + Reset ─────────────────────────────────────
gateRegistry.register({
  typeId: 'JK_FF_ASSR',
  label: 'JK-FF/SR',
  category: 'flipflop',
  width: 80, height: 130,
  stateKeys: ['q'],
  hiddenStateKeys: ['prevClk'],
  stateInit: { q: 0, prevClk: 0 },
  inputs: [
    { id: 'j',   label: 'J',   relativeX: 0, relativeY: 0.15 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.37 },
    { id: 'k',   label: 'K',   relativeX: 0, relativeY: 0.55 },
    { id: 's',   label: 'S',   relativeX: 0, relativeY: 0.72 },
    { id: 'r',   label: 'R',   relativeX: 0, relativeY: 0.88 },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ j, clk, k, s, r }, _out, state) => {
    const async = asyncSR(s, r);
    if (async !== null) return { q: async, prevClk: clk };
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q = (state?.q as 0 | 1) ?? 0;
    let newQ = q;
    if (clk === 1 && prevClk === 0) {
      if      (j === 1 && k === 0) newQ = 1;
      else if (j === 0 && k === 1) newQ = 0;
      else if (j === 1 && k === 1) newQ = (q ^ 1) as 0 | 1;
    }
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w, cm) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const j   = w[`${g.id}:j`]   ?? "1'b0";
    const k   = w[`${g.id}:k`]   ?? "1'b0";
    const s   = w[`${g.id}:s`]   ?? "1'b0";
    const r   = w[`${g.id}:r`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    const sc = portConst(g.id, 's', cm), rc = portConst(g.id, 'r', cm);
    const jkBody = jkSimplifiedVerilog(j, k, portConst(g.id, 'j', cm), portConst(g.id, 'k', cm), q, '  ');
    return [
      ...asyncSRWrapVerilog(clk, s, r, sc, rc, q, jkBody),
      `end // JK-FF/ASSR ${sid}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w, cm) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const j   = w[`${g.id}:j`]   ?? "'0'";
    const k   = w[`${g.id}:k`]   ?? "'0'";
    const s   = w[`${g.id}:s`]   ?? "'0'";
    const r   = w[`${g.id}:r`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    const sc = portConst(g.id, 's', cm), rc = portConst(g.id, 'r', cm);
    const jkBody = jkSimplifiedVHDL(j, k, portConst(g.id, 'j', cm), portConst(g.id, 'k', cm), q, '  ');
    return [
      ...asyncSRWrapVHDL(clk, s, r, sc, rc, q, jkBody),
      `end process; -- JK-FF/ASSR ${sid}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'JK Flip-Flop mit asynchronem Set (S) und Reset (R)',
  isSynchronous: true,
  clockInputId: 'clk',
  verilogWireOutputs: ['q_n'],
});

// ─── T Flip-Flop with async Set + Reset ──────────────────────────────────────
gateRegistry.register({
  typeId: 'T_FF_ASSR',
  label: 'T-FF/SR',
  category: 'flipflop',
  width: 80, height: 110,
  stateKeys: ['q'],
  hiddenStateKeys: ['prevClk'],
  stateInit: { q: 0, prevClk: 0 },
  inputs: [
    { id: 't',   label: 'T',   relativeX: 0, relativeY: 0.20 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.45 },
    { id: 's',   label: 'S',   relativeX: 0, relativeY: 0.67 },
    { id: 'r',   label: 'R',   relativeX: 0, relativeY: 0.85 },
  ],
  outputs: qqnOutputs,
  evaluate: (_inputs, state) => {
    const q = (state?.q as 0 | 1) ?? 0;
    return { q, q_n: (q ^ 1) as 0 | 1 };
  },
  stateUpdate: ({ t, clk, s, r }, _out, state) => {
    const async = asyncSR(s, r);
    if (async !== null) return { q: async, prevClk: clk };
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    const q = (state?.q as 0 | 1) ?? 0;
    const newQ = (clk === 1 && prevClk === 0 && t === 1) ? (q ^ 1) as 0 | 1 : q;
    return { q: newQ, prevClk: clk };
  },
  toVerilog: (g, w, cm) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const t   = w[`${g.id}:t`]   ?? "1'b0";
    const s   = w[`${g.id}:s`]   ?? "1'b0";
    const r   = w[`${g.id}:r`]   ?? "1'b0";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    const sc = portConst(g.id, 's', cm), rc = portConst(g.id, 'r', cm);
    const tc = portConst(g.id, 't', cm);
    const tBody = tc === 1 ? [`  ${q} <= ~${q};`]
                : tc === 0 ? [`  // T=0: hold`]
                :            [`  if (${t})  ${q} <= ~${q};`];
    return [
      ...asyncSRWrapVerilog(clk, s, r, sc, rc, q, tBody),
      `end // T-FF/ASSR ${sid}`,
      `assign ${qn} = ~${q};`,
    ].join('\n');
  },
  toVHDL: (g, w, cm) => {
    const sid = sanitize(g.id);
    const clk = w[`${g.id}:clk`] ?? 'clk';
    const t   = w[`${g.id}:t`]   ?? "'0'";
    const s   = w[`${g.id}:s`]   ?? "'0'";
    const r   = w[`${g.id}:r`]   ?? "'0'";
    const q   = w[`${g.id}:q`]   ?? `w_${sid}_q`;
    const qn  = w[`${g.id}:q_n`] ?? `w_${sid}_q_n`;
    const sc = portConst(g.id, 's', cm), rc = portConst(g.id, 'r', cm);
    const tc = portConst(g.id, 't', cm);
    const tBody = tc === 1 ? [`  ${q} <= not ${q};`]
                : tc === 0 ? [`  -- T=0: hold`]
                :            [`  if ${t} = '1' then ${q} <= not ${q};`, `  end if;`];
    return [
      ...asyncSRWrapVHDL(clk, s, r, sc, rc, q, tBody),
      `end process; -- T-FF/ASSR ${sid}`,
      `${qn} <= not ${q};`,
    ].join('\n');
  },
  shapeComponent: FlipFlopShape,
  description: 'T Flip-Flop mit asynchronem Set (S) und Reset (R)',
  isSynchronous: true,
  clockInputId: 'clk',
  verilogWireOutputs: ['q_n'],
});
/**
 * Flip-Flops with asynchronous Set (S / Preset) and Reset (R / Clear) inputs.
 * S=1 overrides clock → Q=1. R=1 overrides clock → Q=0.
 * S=1, R=1 is an invalid/undefined state (treated as Q=0).
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

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
  shapeComponent: FlipFlopShape,
  description: 'D Flip-Flop mit asynchronem Set (S) und Reset (R)',
  isSynchronous: true,
});

// ─── JK Flip-Flop with async Set + Reset ─────────────────────────────────────
gateRegistry.register({
  typeId: 'JK_FF_ASSR',
  label: 'JK-FF/SR',
  category: 'flipflop',
  width: 80, height: 130,
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
  shapeComponent: FlipFlopShape,
  description: 'JK Flip-Flop mit asynchronem Set (S) und Reset (R)',
  isSynchronous: true,
});

// ─── T Flip-Flop with async Set + Reset ──────────────────────────────────────
gateRegistry.register({
  typeId: 'T_FF_ASSR',
  label: 'T-FF/SR',
  category: 'flipflop',
  width: 80, height: 110,
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
  shapeComponent: FlipFlopShape,
  description: 'T Flip-Flop mit asynchronem Set (S) und Reset (R)',
  isSynchronous: true,
});
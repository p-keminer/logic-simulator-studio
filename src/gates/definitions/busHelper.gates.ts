import { gateRegistry } from '../../core/registry/GateRegistry';
import { BusSplitterShape } from '../shapes/BusSplitterShape';
import type { SignalValue } from '../../core/types';

function sanitize(id: string) { return id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'x'; }

// ─── 4-Bit Bus Splitter / Merger ─────────────────────────────────────────────
gateRegistry.register({
  typeId: 'SPLIT4',
  label: 'BUS-4',
  category: 'bus',
  width: 30, height: 80,
  inputs: [
    { id: 'a0', label: '0', relativeX: 0, relativeY: 0.12 },
    { id: 'a1', label: '1', relativeX: 0, relativeY: 0.37 },
    { id: 'a2', label: '2', relativeX: 0, relativeY: 0.62 },
    { id: 'a3', label: '3', relativeX: 0, relativeY: 0.88 },
  ],
  outputs: [
    { id: 'y0', label: '0', relativeX: 1, relativeY: 0.12 },
    { id: 'y1', label: '1', relativeX: 1, relativeY: 0.37 },
    { id: 'y2', label: '2', relativeX: 1, relativeY: 0.62 },
    { id: 'y3', label: '3', relativeX: 1, relativeY: 0.88 },
  ],
  evaluate: ({ a0, a1, a2, a3 }) => ({
    y0: (a0 ?? 0) as SignalValue,
    y1: (a1 ?? 0) as SignalValue,
    y2: (a2 ?? 0) as SignalValue,
    y3: (a3 ?? 0) as SignalValue,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const a0 = w[`${g.id}:a0`] ?? "1'b0"; const a1 = w[`${g.id}:a1`] ?? "1'b0";
    const a2 = w[`${g.id}:a2`] ?? "1'b0"; const a3 = w[`${g.id}:a3`] ?? "1'b0";
    const y0 = w[`${g.id}:y0`] ?? `w_${sid}_y0`; const y1 = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    const y2 = w[`${g.id}:y2`] ?? `w_${sid}_y2`; const y3 = w[`${g.id}:y3`] ?? `w_${sid}_y3`;
    return [
      `// SPLIT4 ${sid}`,
      `assign ${y0} = ${a0};`,
      `assign ${y1} = ${a1};`,
      `assign ${y2} = ${a2};`,
      `assign ${y3} = ${a3};`,
    ].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const a0 = w[`${g.id}:a0`] ?? "'0'"; const a1 = w[`${g.id}:a1`] ?? "'0'";
    const a2 = w[`${g.id}:a2`] ?? "'0'"; const a3 = w[`${g.id}:a3`] ?? "'0'";
    const y0 = w[`${g.id}:y0`] ?? `w_${sid}_y0`; const y1 = w[`${g.id}:y1`] ?? `w_${sid}_y1`;
    const y2 = w[`${g.id}:y2`] ?? `w_${sid}_y2`; const y3 = w[`${g.id}:y3`] ?? `w_${sid}_y3`;
    return [
      `-- SPLIT4 ${sid}`,
      `${y0} <= ${a0};`,
      `${y1} <= ${a1};`,
      `${y2} <= ${a2};`,
      `${y3} <= ${a3};`,
    ].join('\n');
  },
  shapeComponent: BusSplitterShape,
  description: '4-Bit Bus-Splitter/Merger: Pass-Through (links=Bus, rechts=Einzelleitungen)',
});

// ─── 8-Bit Bus Splitter / Merger ─────────────────────────────────────────────
gateRegistry.register({
  typeId: 'SPLIT8',
  label: 'BUS-8',
  category: 'bus',
  width: 30, height: 160,
  inputs: [
    { id: 'a0', label: '0', relativeX: 0, relativeY: 0.06 },
    { id: 'a1', label: '1', relativeX: 0, relativeY: 0.19 },
    { id: 'a2', label: '2', relativeX: 0, relativeY: 0.31 },
    { id: 'a3', label: '3', relativeX: 0, relativeY: 0.44 },
    { id: 'a4', label: '4', relativeX: 0, relativeY: 0.56 },
    { id: 'a5', label: '5', relativeX: 0, relativeY: 0.69 },
    { id: 'a6', label: '6', relativeX: 0, relativeY: 0.81 },
    { id: 'a7', label: '7', relativeX: 0, relativeY: 0.94 },
  ],
  outputs: [
    { id: 'y0', label: '0', relativeX: 1, relativeY: 0.06 },
    { id: 'y1', label: '1', relativeX: 1, relativeY: 0.19 },
    { id: 'y2', label: '2', relativeX: 1, relativeY: 0.31 },
    { id: 'y3', label: '3', relativeX: 1, relativeY: 0.44 },
    { id: 'y4', label: '4', relativeX: 1, relativeY: 0.56 },
    { id: 'y5', label: '5', relativeX: 1, relativeY: 0.69 },
    { id: 'y6', label: '6', relativeX: 1, relativeY: 0.81 },
    { id: 'y7', label: '7', relativeX: 1, relativeY: 0.94 },
  ],
  evaluate: ({ a0, a1, a2, a3, a4, a5, a6, a7 }) => ({
    y0: (a0 ?? 0) as SignalValue,
    y1: (a1 ?? 0) as SignalValue,
    y2: (a2 ?? 0) as SignalValue,
    y3: (a3 ?? 0) as SignalValue,
    y4: (a4 ?? 0) as SignalValue,
    y5: (a5 ?? 0) as SignalValue,
    y6: (a6 ?? 0) as SignalValue,
    y7: (a7 ?? 0) as SignalValue,
  }),
  toVerilog: (g, w) => {
    const sid = sanitize(g.id);
    const ins  = ['a0','a1','a2','a3','a4','a5','a6','a7'].map(p => w[`${g.id}:${p}`] ?? "1'b0");
    const outs = ['y0','y1','y2','y3','y4','y5','y6','y7'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`// SPLIT8 ${sid}`, ...outs.map((y, i) => `assign ${y} = ${ins[i]};`)].join('\n');
  },
  toVHDL: (g, w) => {
    const sid = sanitize(g.id);
    const ins  = ['a0','a1','a2','a3','a4','a5','a6','a7'].map(p => w[`${g.id}:${p}`] ?? "'0'");
    const outs = ['y0','y1','y2','y3','y4','y5','y6','y7'].map(p => w[`${g.id}:${p}`] ?? `w_${sid}_${p}`);
    return [`-- SPLIT8 ${sid}`, ...outs.map((y, i) => `${y} <= ${ins[i]};`)].join('\n');
  },
  shapeComponent: BusSplitterShape,
  description: '8-Bit Bus-Splitter/Merger: Pass-Through',
});

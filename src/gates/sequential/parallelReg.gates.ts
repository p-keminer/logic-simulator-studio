/**
 * Parallel registers:
 *  PISO4 – Parallel-In Serial-Out, 4-bit
 *  PIPO4 – Parallel-In Parallel-Out, 4-bit
 *  PIPO8 – Parallel-In Parallel-Out, 8-bit
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';
import type { SignalValue } from '../../core/types';

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
  shapeComponent: FlipFlopShape,
  description: 'PISO 4-Bit Register: LD=1 lädt P0–P3, LD=0 schiebt seriell aus',
  isSynchronous: true,
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
  shapeComponent: FlipFlopShape,
  description: 'PIPO 4-Bit Register: lädt P0–P3 bei CLK↑',
  isSynchronous: true,
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
  shapeComponent: FlipFlopShape,
  description: 'PIPO 8-Bit Register: lädt P0–P7 bei CLK↑',
  isSynchronous: true,
});
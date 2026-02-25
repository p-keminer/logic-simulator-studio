/**
 * Register definitions: 4-bit and 8-bit D-Registers.
 */
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

// ─── 4-bit Register ──────────────────────────────────────────────────────────

gateRegistry.register({
  typeId: 'REG4',
  label: 'REG4',
  category: 'register',
  width: 100, height: 140,
  inputs: [
    { id: 'd0',  label: 'D0',  relativeX: 0, relativeY: 0.14 },
    { id: 'd1',  label: 'D1',  relativeX: 0, relativeY: 0.29 },
    { id: 'd2',  label: 'D2',  relativeX: 0, relativeY: 0.44 },
    { id: 'd3',  label: 'D3',  relativeX: 0, relativeY: 0.59 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.78 },
    { id: 'rst', label: 'RST', relativeX: 0, relativeY: 0.93 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.14 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.29 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.44 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.59 },
  ],
  evaluate: (_inputs, state) => ({
    q0: (state?.q0 as 0 | 1) ?? 0,
    q1: (state?.q1 as 0 | 1) ?? 0,
    q2: (state?.q2 as 0 | 1) ?? 0,
    q3: (state?.q3 as 0 | 1) ?? 0,
  }),
  stateUpdate: ({ d0, d1, d2, d3, clk, rst }, _outputs, state) => {
    if (rst === 1) return { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: clk };
    const prevClk = (state?.prevClk as 0 | 1) ?? 0;
    if (clk === 1 && prevClk === 0) {
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
  shapeComponent: FlipFlopShape,
  description: '4-Bit D-Register (steigende CLK-Flanke)',
  isSynchronous: true,
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
  shapeComponent: FlipFlopShape,
  description: '8-Bit D-Register (steigende CLK-Flanke)',
  isSynchronous: true,
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
  shapeComponent: FlipFlopShape,
  description: '4-Bit Schieberegister SIPO (Seriell-Ein / Parallel-Aus)',
  isSynchronous: true,
});

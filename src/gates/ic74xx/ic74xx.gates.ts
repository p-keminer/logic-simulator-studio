import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../shapes/FlipFlopShape';

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
  shapeComponent: FlipFlopShape, description: 'Quad 2-Eingang XOR',
});

// 74HC138 – 3-to-8 Line Decoder
gateRegistry.register({
  typeId: '74HC138', label: '74HC138', category: 'ic74', width: 110, height: 160,
  propagationDelay: 14,
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
  shapeComponent: FlipFlopShape, description: '4-Bit Volladdierer mit Carry',
});

// 74HC74 – Dual D Flip-Flop with Preset and Clear
gateRegistry.register({
  typeId: '74HC74', label: '74HC74', category: 'ic74', width: 110, height: 130,
  propagationDelay: 14, isSynchronous: true,
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
    if ((pre1 ?? 1) === 0) q1 = 1;
    else if ((clr1 ?? 1) === 0) q1 = 0;
    else if (clk1 === 1 && pc1 === 0) q1 = d1 as 0|1;
    if ((pre2 ?? 1) === 0) q2 = 1;
    else if ((clr2 ?? 1) === 0) q2 = 0;
    else if (clk2 === 1 && pc2 === 0) q2 = d2 as 0|1;
    return { q1, q2, pc1: clk1, pc2: clk2 };
  },
  shapeComponent: FlipFlopShape, description: 'Dual D-Flip-Flop mit Preset/Clear',
});

// 74HC595 – 8-bit Shift Register with output latch
gateRegistry.register({
  typeId: '74HC595', label: '74HC595', category: 'ic74', width: 110, height: 160,
  propagationDelay: 25, isSynchronous: true,
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
  evaluate: (_i, state) => {
    const latch = (state?.latch as number) ?? 0;
    const oe = 0; // assume OE = 0 (active)
    if (oe !== 0) return { q0:0,q1:0,q2:0,q3:0,q4:0,q5:0,q6:0,q7:0 };
    const out: Record<string,0|1> = {};
    for (let i = 0; i < 8; i++) out['q'+i] = ((latch >> i) & 1) as 0|1;
    return out;
  },
  stateUpdate: ({ ds, shcp, stcp, mr }, _o, state) => {
    const pShcp = (state?.pShcp as 0|1) ?? 0;
    const pStcp = (state?.pStcp as 0|1) ?? 0;
    let shift = (state?.shift as number) ?? 0;
    let latch = (state?.latch as number) ?? 0;
    if ((mr ?? 1) === 0) shift = 0;
    else if (shcp === 1 && pShcp === 0) shift = ((shift << 1) | (ds ?? 0)) & 0xFF;
    if (stcp === 1 && pStcp === 0) latch = shift;
    return { shift, latch, pShcp: shcp, pStcp: stcp };
  },
  shapeComponent: FlipFlopShape, description: '8-Bit Schieberegister mit Ausgangs-Latch',
});
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

// 74HC161 – 4-bit synchronous binary counter with synchronous clear and load
gateRegistry.register({
  typeId: '74HC161', label: '74HC161', category: 'ic74', width: 110, height: 160,
  propagationDelay: 20, isSynchronous: true,
  inputs: [
    { id: 'clk',  label: 'CLK',  relativeX: 0, relativeY: 0.07 },
    { id: 'clrn', label: '/CLR', relativeX: 0, relativeY: 0.17 },
    { id: 'ldn',  label: '/LD',  relativeX: 0, relativeY: 0.27 },
    { id: 'enp',  label: 'ENP',  relativeX: 0, relativeY: 0.37 },
    { id: 'ent',  label: 'ENT',  relativeX: 0, relativeY: 0.47 },
    { id: 'd0',   label: 'D0',   relativeX: 0, relativeY: 0.59 },
    { id: 'd1',   label: 'D1',   relativeX: 0, relativeY: 0.69 },
    { id: 'd2',   label: 'D2',   relativeX: 0, relativeY: 0.79 },
    { id: 'd3',   label: 'D3',   relativeX: 0, relativeY: 0.89 },
  ],
  outputs: [
    { id: 'q0',  label: 'Q0',  relativeX: 1, relativeY: 0.59 },
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.69 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.79 },
    { id: 'q3',  label: 'Q3',  relativeX: 1, relativeY: 0.89 },
    { id: 'rco', label: 'RCO', relativeX: 1, relativeY: 0.15 },
  ],
  evaluate: (_i, state) => {
    const cnt = (state?.cnt as number) ?? 0;
    return {
      q0: ((cnt >> 0) & 1) as 0|1,
      q1: ((cnt >> 1) & 1) as 0|1,
      q2: ((cnt >> 2) & 1) as 0|1,
      q3: ((cnt >> 3) & 1) as 0|1,
      rco: (cnt === 15 ? 1 : 0) as 0|1,
    };
  },
  stateUpdate: ({ clk, clrn, ldn, enp, ent, d0, d1, d2, d3 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let cnt = (state?.cnt as number) ?? 0;
    const rising = clk === 1 && prev === 0;
    if (rising) {
      if ((clrn ?? 1) === 0) cnt = 0;
      else if ((ldn ?? 1) === 0) {
        cnt = ((d3 ?? 0) << 3) | ((d2 ?? 0) << 2) | ((d1 ?? 0) << 1) | (d0 ?? 0);
      } else if ((enp ?? 0) === 1 && (ent ?? 0) === 1) {
        cnt = (cnt + 1) & 0xF;
      }
    }
    return { cnt, pClk: clk };
  },
  shapeComponent: FlipFlopShape, description: '4-Bit synchroner Binärzähler mit Load/Clear',
});

// 74HC151 – 8-to-1 Multiplexer
gateRegistry.register({
  typeId: '74HC151', label: '74HC151', category: 'ic74', width: 110, height: 160,
  propagationDelay: 12,
  inputs: [
    { id: 's0', label: 'S0', relativeX: 0, relativeY: 0.07 },
    { id: 's1', label: 'S1', relativeX: 0, relativeY: 0.17 },
    { id: 's2', label: 'S2', relativeX: 0, relativeY: 0.27 },
    { id: 'en', label: '/E', relativeX: 0, relativeY: 0.37 },
    { id: 'd0', label: 'D0', relativeX: 0, relativeY: 0.50 },
    { id: 'd1', label: 'D1', relativeX: 0, relativeY: 0.60 },
    { id: 'd2', label: 'D2', relativeX: 0, relativeY: 0.70 },
    { id: 'd3', label: 'D3', relativeX: 0, relativeY: 0.80 },
    { id: 'd4', label: 'D4', relativeX: 1, relativeY: 0.50 },
    { id: 'd5', label: 'D5', relativeX: 1, relativeY: 0.60 },
    { id: 'd6', label: 'D6', relativeX: 1, relativeY: 0.70 },
    { id: 'd7', label: 'D7', relativeX: 1, relativeY: 0.80 },
  ],
  outputs: [
    { id: 'y',  label: 'Y',  relativeX: 1, relativeY: 0.17 },
    { id: 'yn', label: '/Y', relativeX: 1, relativeY: 0.27 },
  ],
  evaluate: ({ s0, s1, s2, en, d0, d1, d2, d3, d4, d5, d6, d7 }) => {
    if ((en ?? 0) === 1) return { y: 0, yn: 1 };
    const sel = ((s2 ?? 0) << 2) | ((s1 ?? 0) << 1) | (s0 ?? 0);
    const inputs = [d0, d1, d2, d3, d4, d5, d6, d7];
    const y = (inputs[sel] ?? 0) as 0|1;
    return { y, yn: (y ^ 1) as 0|1 };
  },
  shapeComponent: FlipFlopShape, description: '8-zu-1 Multiplexer mit Enable',
});

// 74HC153 – Dual 4-to-1 Multiplexer
gateRegistry.register({
  typeId: '74HC153', label: '74HC153', category: 'ic74', width: 110, height: 160,
  propagationDelay: 12,
  inputs: [
    { id: 's0',  label: 'S0',  relativeX: 0, relativeY: 0.07 },
    { id: 's1',  label: 'S1',  relativeX: 0, relativeY: 0.17 },
    { id: 'e1n', label: '/E1', relativeX: 0, relativeY: 0.30 },
    { id: 'i10', label: 'I10', relativeX: 0, relativeY: 0.40 },
    { id: 'i11', label: 'I11', relativeX: 0, relativeY: 0.50 },
    { id: 'i12', label: 'I12', relativeX: 0, relativeY: 0.60 },
    { id: 'i13', label: 'I13', relativeX: 0, relativeY: 0.70 },
    { id: 'e2n', label: '/E2', relativeX: 1, relativeY: 0.30 },
    { id: 'i20', label: 'I20', relativeX: 1, relativeY: 0.40 },
    { id: 'i21', label: 'I21', relativeX: 1, relativeY: 0.50 },
    { id: 'i22', label: 'I22', relativeX: 1, relativeY: 0.60 },
    { id: 'i23', label: 'I23', relativeX: 1, relativeY: 0.70 },
  ],
  outputs: [
    { id: 'y1', label: 'Y1', relativeX: 0, relativeY: 0.85 },
    { id: 'y2', label: 'Y2', relativeX: 1, relativeY: 0.85 },
  ],
  evaluate: ({ s0, s1, e1n, i10, i11, i12, i13, e2n, i20, i21, i22, i23 }) => {
    const sel = ((s1 ?? 0) << 1) | (s0 ?? 0);
    const g1 = [i10, i11, i12, i13];
    const g2 = [i20, i21, i22, i23];
    const y1 = (e1n ?? 0) === 1 ? 0 : ((g1[sel] ?? 0) as 0|1);
    const y2 = (e2n ?? 0) === 1 ? 0 : ((g2[sel] ?? 0) as 0|1);
    return { y1, y2 };
  },
  shapeComponent: FlipFlopShape, description: 'Dual 4-zu-1 Multiplexer',
});

// 74HC194 – 4-bit universal shift register (left/right)
gateRegistry.register({
  typeId: '74HC194', label: '74HC194', category: 'ic74', width: 110, height: 160,
  propagationDelay: 20, isSynchronous: true,
  inputs: [
    { id: 'clk',  label: 'CLK',  relativeX: 0, relativeY: 0.07 },
    { id: 'clrn', label: '/CLR', relativeX: 0, relativeY: 0.17 },
    { id: 's0',   label: 'S0',   relativeX: 0, relativeY: 0.27 },
    { id: 's1',   label: 'S1',   relativeX: 0, relativeY: 0.37 },
    { id: 'sr',   label: 'SR',   relativeX: 0, relativeY: 0.47 },
    { id: 'sl',   label: 'SL',   relativeX: 0, relativeY: 0.57 },
    { id: 'd0',   label: 'D0',   relativeX: 0, relativeY: 0.67 },
    { id: 'd1',   label: 'D1',   relativeX: 0, relativeY: 0.77 },
    { id: 'd2',   label: 'D2',   relativeX: 0, relativeY: 0.87 },
    { id: 'd3',   label: 'D3',   relativeX: 0, relativeY: 0.97 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.67 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.77 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.87 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.97 },
  ],
  evaluate: (_i, state) => {
    const reg = (state?.reg as number) ?? 0;
    return {
      q0: ((reg >> 0) & 1) as 0|1,
      q1: ((reg >> 1) & 1) as 0|1,
      q2: ((reg >> 2) & 1) as 0|1,
      q3: ((reg >> 3) & 1) as 0|1,
    };
  },
  stateUpdate: ({ clk, clrn, s0, s1, sr, sl, d0, d1, d2, d3 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let reg = (state?.reg as number) ?? 0;
    const rising = clk === 1 && prev === 0;
    if ((clrn ?? 1) === 0) { reg = 0; }
    else if (rising) {
      const mode = ((s1 ?? 0) << 1) | (s0 ?? 0);
      if (mode === 1) reg = ((reg >> 1) | ((sr ?? 0) << 3)) & 0xF;        // shift right
      else if (mode === 2) reg = ((reg << 1) | (sl ?? 0)) & 0xF;          // shift left
      else if (mode === 3) reg = ((d3 ?? 0) << 3) | ((d2 ?? 0) << 2) | ((d1 ?? 0) << 1) | (d0 ?? 0); // parallel load
      // mode 0 = hold
    }
    return { reg, pClk: clk };
  },
  shapeComponent: FlipFlopShape, description: '4-Bit Universal-Schieberegister (Links/Rechts/Laden)',
});

// 74HC373 – 8-bit transparent D-latch
gateRegistry.register({
  typeId: '74HC373', label: '74HC373', category: 'ic74', width: 110, height: 180,
  propagationDelay: 14, isSynchronous: true,
  inputs: [
    { id: 'oe', label: '/OE', relativeX: 0, relativeY: 0.05 },
    { id: 'le', label: 'LE',  relativeX: 0, relativeY: 0.12 },
    { id: 'd0', label: 'D0',  relativeX: 0, relativeY: 0.22 },
    { id: 'd1', label: 'D1',  relativeX: 0, relativeY: 0.32 },
    { id: 'd2', label: 'D2',  relativeX: 0, relativeY: 0.42 },
    { id: 'd3', label: 'D3',  relativeX: 0, relativeY: 0.52 },
    { id: 'd4', label: 'D4',  relativeX: 0, relativeY: 0.62 },
    { id: 'd5', label: 'D5',  relativeX: 0, relativeY: 0.72 },
    { id: 'd6', label: 'D6',  relativeX: 0, relativeY: 0.82 },
    { id: 'd7', label: 'D7',  relativeX: 0, relativeY: 0.92 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.22 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.32 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.42 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.52 },
    { id: 'q4', label: 'Q4', relativeX: 1, relativeY: 0.62 },
    { id: 'q5', label: 'Q5', relativeX: 1, relativeY: 0.72 },
    { id: 'q6', label: 'Q6', relativeX: 1, relativeY: 0.82 },
    { id: 'q7', label: 'Q7', relativeX: 1, relativeY: 0.92 },
  ],
  evaluate: ({ oe }, state) => {
    const latch = (state?.latch as number) ?? 0;
    if ((oe ?? 0) === 1) return { q0:0,q1:0,q2:0,q3:0,q4:0,q5:0,q6:0,q7:0 };
    const out: Record<string,0|1> = {};
    for (let i = 0; i < 8; i++) out['q'+i] = ((latch >> i) & 1) as 0|1;
    return out;
  },
  stateUpdate: ({ le, d0, d1, d2, d3, d4, d5, d6, d7 }, _o, state) => {
    let latch = (state?.latch as number) ?? 0;
    if ((le ?? 0) === 1) {
      latch = ((d7??0)<<7)|((d6??0)<<6)|((d5??0)<<5)|((d4??0)<<4)|
              ((d3??0)<<3)|((d2??0)<<2)|((d1??0)<<1)|(d0??0);
    }
    return { latch };
  },
  shapeComponent: FlipFlopShape, description: '8-Bit transparentes D-Latch mit Output-Enable',
});

// 74HC374 – 8-bit positive-edge-triggered D flip-flop
gateRegistry.register({
  typeId: '74HC374', label: '74HC374', category: 'ic74', width: 110, height: 180,
  propagationDelay: 14, isSynchronous: true,
  inputs: [
    { id: 'oe',  label: '/OE', relativeX: 0, relativeY: 0.05 },
    { id: 'clk', label: 'CLK', relativeX: 0, relativeY: 0.12 },
    { id: 'd0',  label: 'D0',  relativeX: 0, relativeY: 0.22 },
    { id: 'd1',  label: 'D1',  relativeX: 0, relativeY: 0.32 },
    { id: 'd2',  label: 'D2',  relativeX: 0, relativeY: 0.42 },
    { id: 'd3',  label: 'D3',  relativeX: 0, relativeY: 0.52 },
    { id: 'd4',  label: 'D4',  relativeX: 0, relativeY: 0.62 },
    { id: 'd5',  label: 'D5',  relativeX: 0, relativeY: 0.72 },
    { id: 'd6',  label: 'D6',  relativeX: 0, relativeY: 0.82 },
    { id: 'd7',  label: 'D7',  relativeX: 0, relativeY: 0.92 },
  ],
  outputs: [
    { id: 'q0', label: 'Q0', relativeX: 1, relativeY: 0.22 },
    { id: 'q1', label: 'Q1', relativeX: 1, relativeY: 0.32 },
    { id: 'q2', label: 'Q2', relativeX: 1, relativeY: 0.42 },
    { id: 'q3', label: 'Q3', relativeX: 1, relativeY: 0.52 },
    { id: 'q4', label: 'Q4', relativeX: 1, relativeY: 0.62 },
    { id: 'q5', label: 'Q5', relativeX: 1, relativeY: 0.72 },
    { id: 'q6', label: 'Q6', relativeX: 1, relativeY: 0.82 },
    { id: 'q7', label: 'Q7', relativeX: 1, relativeY: 0.92 },
  ],
  evaluate: ({ oe }, state) => {
    const reg = (state?.reg as number) ?? 0;
    if ((oe ?? 0) === 1) return { q0:0,q1:0,q2:0,q3:0,q4:0,q5:0,q6:0,q7:0 };
    const out: Record<string,0|1> = {};
    for (let i = 0; i < 8; i++) out['q'+i] = ((reg >> i) & 1) as 0|1;
    return out;
  },
  stateUpdate: ({ clk, d0, d1, d2, d3, d4, d5, d6, d7 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let reg = (state?.reg as number) ?? 0;
    if (clk === 1 && prev === 0) {
      reg = ((d7??0)<<7)|((d6??0)<<6)|((d5??0)<<5)|((d4??0)<<4)|
            ((d3??0)<<3)|((d2??0)<<2)|((d1??0)<<1)|(d0??0);
    }
    return { reg, pClk: clk };
  },
  shapeComponent: FlipFlopShape, description: '8-Bit D-Flip-Flop Register mit Output-Enable',
});

// 74HC148 – 8-to-3 priority encoder
gateRegistry.register({
  typeId: '74HC148', label: '74HC148', category: 'ic74', width: 110, height: 160,
  propagationDelay: 16,
  inputs: [
    { id: 'ein', label: 'EI',  relativeX: 0, relativeY: 0.07 },
    { id: 'i0',  label: 'I0',  relativeX: 0, relativeY: 0.20 },
    { id: 'i1',  label: 'I1',  relativeX: 0, relativeY: 0.30 },
    { id: 'i2',  label: 'I2',  relativeX: 0, relativeY: 0.40 },
    { id: 'i3',  label: 'I3',  relativeX: 0, relativeY: 0.50 },
    { id: 'i4',  label: 'I4',  relativeX: 0, relativeY: 0.60 },
    { id: 'i5',  label: 'I5',  relativeX: 0, relativeY: 0.70 },
    { id: 'i6',  label: 'I6',  relativeX: 0, relativeY: 0.80 },
    { id: 'i7',  label: 'I7',  relativeX: 0, relativeY: 0.90 },
  ],
  outputs: [
    { id: 'a0',  label: 'A0',  relativeX: 1, relativeY: 0.25 },
    { id: 'a1',  label: 'A1',  relativeX: 1, relativeY: 0.40 },
    { id: 'a2',  label: 'A2',  relativeX: 1, relativeY: 0.55 },
    { id: 'gs',  label: 'GS',  relativeX: 1, relativeY: 0.70 },
    { id: 'eo',  label: 'EO',  relativeX: 1, relativeY: 0.85 },
  ],
  evaluate: ({ ein, i0, i1, i2, i3, i4, i5, i6, i7 }) => {
    // active-low inputs and outputs
    if ((ein ?? 1) === 1) return { a0: 1, a1: 1, a2: 1, gs: 1, eo: 1 };
    const inputs = [i7, i6, i5, i4, i3, i2, i1, i0]; // priority: i7 highest
    let pri = -1;
    for (let i = 0; i < 8; i++) {
      if ((inputs[i] ?? 1) === 0) { pri = 7 - i; break; }
    }
    if (pri < 0) return { a0: 1, a1: 1, a2: 1, gs: 1, eo: 0 }; // no input active
    const a = pri ^ 0b111; // active-low output
    return {
      a0: ((a >> 0) & 1) as 0|1,
      a1: ((a >> 1) & 1) as 0|1,
      a2: ((a >> 2) & 1) as 0|1,
      gs: 0, eo: 1,
    };
  },
  shapeComponent: FlipFlopShape, description: '8-zu-3 Prioritätsencoder (active-low)',
});

// 74HC163 – 4-bit synchronous binary counter with asynchronous clear
gateRegistry.register({
  typeId: '74HC163', label: '74HC163', category: 'ic74', width: 110, height: 160,
  propagationDelay: 20, isSynchronous: true,
  inputs: [
    { id: 'clk',  label: 'CLK',  relativeX: 0, relativeY: 0.07 },
    { id: 'clrn', label: '/CLR', relativeX: 0, relativeY: 0.17 },
    { id: 'ldn',  label: '/LD',  relativeX: 0, relativeY: 0.27 },
    { id: 'enp',  label: 'ENP',  relativeX: 0, relativeY: 0.37 },
    { id: 'ent',  label: 'ENT',  relativeX: 0, relativeY: 0.47 },
    { id: 'd0',   label: 'D0',   relativeX: 0, relativeY: 0.59 },
    { id: 'd1',   label: 'D1',   relativeX: 0, relativeY: 0.69 },
    { id: 'd2',   label: 'D2',   relativeX: 0, relativeY: 0.79 },
    { id: 'd3',   label: 'D3',   relativeX: 0, relativeY: 0.89 },
  ],
  outputs: [
    { id: 'q0',  label: 'Q0',  relativeX: 1, relativeY: 0.59 },
    { id: 'q1',  label: 'Q1',  relativeX: 1, relativeY: 0.69 },
    { id: 'q2',  label: 'Q2',  relativeX: 1, relativeY: 0.79 },
    { id: 'q3',  label: 'Q3',  relativeX: 1, relativeY: 0.89 },
    { id: 'rco', label: 'RCO', relativeX: 1, relativeY: 0.15 },
  ],
  evaluate: (_i, state) => {
    const cnt = (state?.cnt as number) ?? 0;
    return {
      q0: ((cnt >> 0) & 1) as 0|1,
      q1: ((cnt >> 1) & 1) as 0|1,
      q2: ((cnt >> 2) & 1) as 0|1,
      q3: ((cnt >> 3) & 1) as 0|1,
      rco: (cnt === 15 ? 1 : 0) as 0|1,
    };
  },
  stateUpdate: ({ clk, clrn, ldn, enp, ent, d0, d1, d2, d3 }, _o, state) => {
    const prev = (state?.pClk as 0|1) ?? 0;
    let cnt = (state?.cnt as number) ?? 0;
    // 74HC163: asynchronous clear (active immediately)
    if ((clrn ?? 1) === 0) return { cnt: 0, pClk: clk };
    const rising = clk === 1 && prev === 0;
    if (rising) {
      if ((ldn ?? 1) === 0) {
        cnt = ((d3 ?? 0) << 3) | ((d2 ?? 0) << 2) | ((d1 ?? 0) << 1) | (d0 ?? 0);
      } else if ((enp ?? 0) === 1 && (ent ?? 0) === 1) {
        cnt = (cnt + 1) & 0xF;
      }
    }
    return { cnt, pClk: clk };
  },
  shapeComponent: FlipFlopShape, description: '4-Bit synchroner Binärzähler mit asynchronem Clear',
});
import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function evalGate(typeId: string, inputs: Record<string, number>): Record<string, number> {
  const def = gateRegistry.get(typeId)!;
  return def.evaluate(inputs, {}) as Record<string, number>;
}

function stateTransition(
  typeId: string,
  inputs: Record<string, number>,
  state: Record<string, unknown>,
) {
  const def = gateRegistry.get(typeId)!;
  const outputsOld = def.evaluate(inputs, state) as Record<string, number>;
  const nextState = def.stateUpdate
    ? def.stateUpdate(inputs, outputsOld, state)
    : { ...state };
  const outputs = def.evaluate(inputs, nextState) as Record<string, number>;
  return { outputs, nextState };
}

// ─────────────────────────────────────────────────────────────────────────────────
// 1. 74HC00 – Quad NAND 2-input
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC00 – Quad NAND', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC00')).toBe(true);
  });

  it('NAND(0,0) = 1', () => {
    const out = evalGate('74HC00', { a1: 0, b1: 0, a2: 0, b2: 0, a3: 0, b3: 0, a4: 0, b4: 0 });
    expect(out.y1).toBe(1);
  });

  it('NAND(0,1) = 1', () => {
    const out = evalGate('74HC00', { a1: 0, b1: 1, a2: 0, b2: 0, a3: 0, b3: 0, a4: 0, b4: 0 });
    expect(out.y1).toBe(1);
  });

  it('NAND(1,0) = 1', () => {
    const out = evalGate('74HC00', { a1: 1, b1: 0, a2: 0, b2: 0, a3: 0, b3: 0, a4: 0, b4: 0 });
    expect(out.y1).toBe(1);
  });

  it('NAND(1,1) = 0', () => {
    const out = evalGate('74HC00', { a1: 1, b1: 1, a2: 0, b2: 0, a3: 0, b3: 0, a4: 0, b4: 0 });
    expect(out.y1).toBe(0);
  });

  it('all 4 gates operate independently', () => {
    const out = evalGate('74HC00', { a1: 1, b1: 1, a2: 0, b2: 1, a3: 1, b3: 0, a4: 0, b4: 0 });
    expect(out.y1).toBe(0); // 1&1 -> NAND -> 0
    expect(out.y2).toBe(1); // 0&1 -> NAND -> 1
    expect(out.y3).toBe(1); // 1&0 -> NAND -> 1
    expect(out.y4).toBe(1); // 0&0 -> NAND -> 1
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 2. 74HC04 – Hex Inverter
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC04 – Hex Inverter', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC04')).toBe(true);
  });

  it('inverts 0 to 1 on all channels', () => {
    const out = evalGate('74HC04', { a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0 });
    expect(out).toEqual({ y1: 1, y2: 1, y3: 1, y4: 1, y5: 1, y6: 1 });
  });

  it('inverts 1 to 0 on all channels', () => {
    const out = evalGate('74HC04', { a1: 1, a2: 1, a3: 1, a4: 1, a5: 1, a6: 1 });
    expect(out).toEqual({ y1: 0, y2: 0, y3: 0, y4: 0, y5: 0, y6: 0 });
  });

  it('inverts independently per channel', () => {
    const out = evalGate('74HC04', { a1: 0, a2: 1, a3: 0, a4: 1, a5: 0, a6: 1 });
    expect(out).toEqual({ y1: 1, y2: 0, y3: 1, y4: 0, y5: 1, y6: 0 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 3. 74HC08 – Quad AND 2-input
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC08 – Quad AND', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC08')).toBe(true);
  });

  const base = { a1: 0, b1: 0, a2: 0, b2: 0, a3: 0, b3: 0, a4: 0, b4: 0 };

  it('AND(0,0) = 0', () => {
    expect(evalGate('74HC08', { ...base, a1: 0, b1: 0 }).y1).toBe(0);
  });

  it('AND(0,1) = 0', () => {
    expect(evalGate('74HC08', { ...base, a1: 0, b1: 1 }).y1).toBe(0);
  });

  it('AND(1,0) = 0', () => {
    expect(evalGate('74HC08', { ...base, a1: 1, b1: 0 }).y1).toBe(0);
  });

  it('AND(1,1) = 1', () => {
    expect(evalGate('74HC08', { ...base, a1: 1, b1: 1 }).y1).toBe(1);
  });

  it('all 4 gates operate independently', () => {
    const out = evalGate('74HC08', { a1: 1, b1: 1, a2: 0, b2: 1, a3: 1, b3: 0, a4: 0, b4: 0 });
    expect(out.y1).toBe(1);
    expect(out.y2).toBe(0);
    expect(out.y3).toBe(0);
    expect(out.y4).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 4. 74HC32 – Quad OR 2-input
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC32 – Quad OR', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC32')).toBe(true);
  });

  const base = { a1: 0, b1: 0, a2: 0, b2: 0, a3: 0, b3: 0, a4: 0, b4: 0 };

  it('OR(0,0) = 0', () => {
    expect(evalGate('74HC32', { ...base, a1: 0, b1: 0 }).y1).toBe(0);
  });

  it('OR(0,1) = 1', () => {
    expect(evalGate('74HC32', { ...base, a1: 0, b1: 1 }).y1).toBe(1);
  });

  it('OR(1,0) = 1', () => {
    expect(evalGate('74HC32', { ...base, a1: 1, b1: 0 }).y1).toBe(1);
  });

  it('OR(1,1) = 1', () => {
    expect(evalGate('74HC32', { ...base, a1: 1, b1: 1 }).y1).toBe(1);
  });

  it('all 4 gates operate independently', () => {
    const out = evalGate('74HC32', { a1: 0, b1: 0, a2: 0, b2: 1, a3: 1, b3: 0, a4: 1, b4: 1 });
    expect(out.y1).toBe(0);
    expect(out.y2).toBe(1);
    expect(out.y3).toBe(1);
    expect(out.y4).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 5. 74HC86 – Quad XOR 2-input
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC86 – Quad XOR', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC86')).toBe(true);
  });

  const base = { a1: 0, b1: 0, a2: 0, b2: 0, a3: 0, b3: 0, a4: 0, b4: 0 };

  it('XOR(0,0) = 0', () => {
    expect(evalGate('74HC86', { ...base, a1: 0, b1: 0 }).y1).toBe(0);
  });

  it('XOR(0,1) = 1', () => {
    expect(evalGate('74HC86', { ...base, a1: 0, b1: 1 }).y1).toBe(1);
  });

  it('XOR(1,0) = 1', () => {
    expect(evalGate('74HC86', { ...base, a1: 1, b1: 0 }).y1).toBe(1);
  });

  it('XOR(1,1) = 0', () => {
    expect(evalGate('74HC86', { ...base, a1: 1, b1: 1 }).y1).toBe(0);
  });

  it('all 4 gates operate independently', () => {
    const out = evalGate('74HC86', { a1: 0, b1: 0, a2: 0, b2: 1, a3: 1, b3: 0, a4: 1, b4: 1 });
    expect(out.y1).toBe(0);
    expect(out.y2).toBe(1);
    expect(out.y3).toBe(1);
    expect(out.y4).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 6. 74HC74 – Dual D Flip-Flop with Preset and Clear
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC74 – Dual D-FF', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC74')).toBe(true);
  });

  it('should have correct defaultInputValues for active-low pins (BUG-K1 fix)', () => {
    const def = gateRegistry.get('74HC74')!;
    expect(def.defaultInputValues).toEqual({ pre1: 1, clr1: 1, pre2: 1, clr2: 1 });
  });

  it('rising edge latches D=1 into Q', () => {
    // CLK 0->1 with D=1, PRE=1, CLR=1
    const state0 = { q1: 0, q2: 0, pc1: 0, pc2: 0 };
    const { outputs, nextState } = stateTransition('74HC74', {
      pre1: 1, clr1: 1, d1: 1, clk1: 1,
      pre2: 1, clr2: 1, d2: 0, clk2: 0,
    }, state0);
    expect(outputs.q1).toBe(1);
    expect(outputs.qn1).toBe(0);
    expect(nextState.q1).toBe(1);
  });

  it('rising edge latches D=0 into Q', () => {
    const state0 = { q1: 1, q2: 0, pc1: 0, pc2: 0 };
    const { outputs, nextState } = stateTransition('74HC74', {
      pre1: 1, clr1: 1, d1: 0, clk1: 1,
      pre2: 1, clr2: 1, d2: 0, clk2: 0,
    }, state0);
    expect(outputs.q1).toBe(0);
    expect(outputs.qn1).toBe(1);
    expect(nextState.q1).toBe(0);
  });

  it('no change when CLK stays high (no rising edge)', () => {
    const state0 = { q1: 0, q2: 0, pc1: 1, pc2: 0 }; // pc1=1 means CLK was already high
    const { outputs } = stateTransition('74HC74', {
      pre1: 1, clr1: 1, d1: 1, clk1: 1,
      pre2: 1, clr2: 1, d2: 0, clk2: 0,
    }, state0);
    expect(outputs.q1).toBe(0); // should not change
  });

  it('/PRE=0 forces Q=1 (async preset)', () => {
    const state0 = { q1: 0, q2: 0, pc1: 0, pc2: 0 };
    const { outputs } = stateTransition('74HC74', {
      pre1: 0, clr1: 1, d1: 0, clk1: 0,
      pre2: 1, clr2: 1, d2: 0, clk2: 0,
    }, state0);
    expect(outputs.q1).toBe(1);
    expect(outputs.qn1).toBe(0);
  });

  it('/CLR=0 forces Q=0 (async clear)', () => {
    const state0 = { q1: 1, q2: 0, pc1: 0, pc2: 0 };
    const { outputs } = stateTransition('74HC74', {
      pre1: 1, clr1: 0, d1: 1, clk1: 0,
      pre2: 1, clr2: 1, d2: 0, clk2: 0,
    }, state0);
    expect(outputs.q1).toBe(0);
    expect(outputs.qn1).toBe(1);
  });

  it('/PRE takes priority over /CLR when both active (PRE=0 wins)', () => {
    const state0 = { q1: 0, q2: 0, pc1: 0, pc2: 0 };
    const { outputs } = stateTransition('74HC74', {
      pre1: 0, clr1: 0, d1: 0, clk1: 0,
      pre2: 1, clr2: 1, d2: 0, clk2: 0,
    }, state0);
    // PRE checked first in the code, so Q1=1
    expect(outputs.q1).toBe(1);
  });

  it('FF2 operates independently from FF1', () => {
    const state0 = { q1: 0, q2: 0, pc1: 0, pc2: 0 };
    const { outputs } = stateTransition('74HC74', {
      pre1: 1, clr1: 1, d1: 0, clk1: 0,
      pre2: 1, clr2: 1, d2: 1, clk2: 1,
    }, state0);
    expect(outputs.q1).toBe(0); // FF1 no edge
    expect(outputs.q2).toBe(1); // FF2 rising edge with D=1
    expect(outputs.qn2).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 7. 74HC138 – 3-to-8 Line Decoder
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC138 – 3-to-8 Decoder', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC138')).toBe(true);
  });

  it('disabled when g1=0 (all outputs high)', () => {
    const out = evalGate('74HC138', { a: 0, b: 0, c: 0, g1: 0, g2a: 0, g2b: 0 });
    for (let i = 0; i < 8; i++) expect(out['y' + i]).toBe(1);
  });

  it('disabled when g2a=1 (all outputs high)', () => {
    const out = evalGate('74HC138', { a: 0, b: 0, c: 0, g1: 1, g2a: 1, g2b: 0 });
    for (let i = 0; i < 8; i++) expect(out['y' + i]).toBe(1);
  });

  it('disabled when g2b=1 (all outputs high)', () => {
    const out = evalGate('74HC138', { a: 0, b: 0, c: 0, g1: 1, g2a: 0, g2b: 1 });
    for (let i = 0; i < 8; i++) expect(out['y' + i]).toBe(1);
  });

  // Enabled: g1=1, g2a=0, g2b=0
  it.each([
    [0, 0, 0, 0],
    [1, 0, 0, 1],
    [0, 1, 0, 2],
    [1, 1, 0, 3],
    [0, 0, 1, 4],
    [1, 0, 1, 5],
    [0, 1, 1, 6],
    [1, 1, 1, 7],
  ])('addr A=%d B=%d C=%d selects /Y%d=0', (a, b, c, idx) => {
    const out = evalGate('74HC138', { a, b, c, g1: 1, g2a: 0, g2b: 0 });
    for (let i = 0; i < 8; i++) {
      expect(out['y' + i]).toBe(i === idx ? 0 : 1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 8. 74HC283 – 4-Bit Binary Full Adder
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC283 – 4-Bit Adder', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC283')).toBe(true);
  });

  function add(a: number, b: number, cin: number) {
    return evalGate('74HC283', {
      a1: (a >> 0) & 1, a2: (a >> 1) & 1, a3: (a >> 2) & 1, a4: (a >> 3) & 1,
      b1: (b >> 0) & 1, b2: (b >> 1) & 1, b3: (b >> 2) & 1, b4: (b >> 3) & 1,
      c0: cin,
    });
  }

  function sumFromOutputs(out: Record<string, number>) {
    return out.s1 | (out.s2 << 1) | (out.s3 << 2) | (out.s4 << 3) | (out.c4 << 4);
  }

  it('0 + 0 = 0, carry=0', () => {
    const out = add(0, 0, 0);
    expect(sumFromOutputs(out)).toBe(0);
  });

  it('1 + 1 = 2, carry=0', () => {
    const out = add(1, 1, 0);
    expect(sumFromOutputs(out)).toBe(2);
  });

  it('15 + 1 = 0 + carry (overflow)', () => {
    const out = add(15, 1, 0);
    expect(out.s1).toBe(0);
    expect(out.s2).toBe(0);
    expect(out.s3).toBe(0);
    expect(out.s4).toBe(0);
    expect(out.c4).toBe(1);
  });

  it('carry-in: 7 + 7 + 1 = 15', () => {
    const out = add(7, 7, 1);
    expect(sumFromOutputs(out)).toBe(15);
  });

  it('carry-in: 15 + 0 + 1 = 16 (overflow)', () => {
    const out = add(15, 0, 1);
    expect(sumFromOutputs(out)).toBe(16); // c4=1, sum=0
  });

  it('5 + 3 = 8', () => {
    const out = add(5, 3, 0);
    expect(sumFromOutputs(out)).toBe(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 9. 74HC595 – 8-Bit Shift Register with Output Latch
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC595 – Shift Register', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC595')).toBe(true);
  });

  it('should have correct defaultInputValues for /MR (BUG-K1 fix)', () => {
    const def = gateRegistry.get('74HC595')!;
    expect(def.defaultInputValues).toEqual({ mr: 1 });
  });

  it('serial shift on SRCLK rising edge', () => {
    let state: Record<string, unknown> = {};
    // Shift in bit 1: DS=1, SHCP 0->1
    ({ nextState: state } = stateTransition('74HC595', {
      ds: 1, shcp: 1, stcp: 0, mr: 1, oe: 0,
    }, state));
    expect(state.shift).toBe(1);

    // Lower clock
    ({ nextState: state } = stateTransition('74HC595', {
      ds: 0, shcp: 0, stcp: 0, mr: 1, oe: 0,
    }, state));

    // Shift in bit 0: DS=0, SHCP 0->1
    ({ nextState: state } = stateTransition('74HC595', {
      ds: 0, shcp: 1, stcp: 0, mr: 1, oe: 0,
    }, state));
    expect(state.shift).toBe(0b10); // previous bit shifted left, new 0 entered
  });

  it('latch to output on RCLK (STCP) rising edge', () => {
    let state: Record<string, unknown> = { shift: 0b10101010, latch: 0, pShcp: 0, pStcp: 0 };
    // Latch: STCP 0->1
    const { outputs, nextState } = stateTransition('74HC595', {
      ds: 0, shcp: 0, stcp: 1, mr: 1, oe: 0,
    }, state);
    expect(nextState.latch).toBe(0b10101010);
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(1);
    expect(outputs.q7).toBe(1);
  });

  it('/MR=0 clears shift register', () => {
    const state: Record<string, unknown> = { shift: 0xFF, latch: 0xFF, pShcp: 0, pStcp: 0 };
    const { nextState } = stateTransition('74HC595', {
      ds: 0, shcp: 0, stcp: 0, mr: 0, oe: 0,
    }, state);
    expect(nextState.shift).toBe(0);
    // latch is NOT affected by /MR
    expect(nextState.latch).toBe(0xFF);
  });

  it('/OE=1 forces all outputs to 0', () => {
    const state: Record<string, unknown> = { latch: 0xFF };
    const def = gateRegistry.get('74HC595')!;
    const out = def.evaluate({ oe: 1 }, state) as Record<string, number>;
    for (let i = 0; i < 8; i++) expect(out['q' + i]).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 10. 74HC161 – 4-Bit Synchronous Binary Counter
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC161 – 4-Bit Counter', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC161')).toBe(true);
  });

  it('should have correct defaultInputValues for /CLR, /LD (BUG-K1 fix)', () => {
    const def = gateRegistry.get('74HC161')!;
    expect(def.defaultInputValues).toEqual({ clrn: 1, ldn: 1 });
  });

  it('counts up on CLK rising edge when ENP=1 and ENT=1', () => {
    let state: Record<string, unknown> = { cnt: 0, pClk: 0 };
    // CLK 0->1
    const { outputs, nextState } = stateTransition('74HC161', {
      clk: 1, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(1);
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(0);
  });

  it('does not count when ENP=0', () => {
    const state: Record<string, unknown> = { cnt: 5, pClk: 0 };
    const { nextState } = stateTransition('74HC161', {
      clk: 1, clrn: 1, ldn: 1, enp: 0, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(5);
  });

  it('does not count when ENT=0', () => {
    const state: Record<string, unknown> = { cnt: 5, pClk: 0 };
    const { nextState } = stateTransition('74HC161', {
      clk: 1, clrn: 1, ldn: 1, enp: 1, ent: 0, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(5);
  });

  it('/CLR=0 clears immediately (asynchronous), even without clock edge', () => {
    const state: Record<string, unknown> = { cnt: 10, pClk: 0 };
    const { nextState } = stateTransition('74HC161', {
      clk: 0, clrn: 0, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(0);
  });

  it('/LD=0 parallel loads on rising edge', () => {
    const state: Record<string, unknown> = { cnt: 0, pClk: 0 };
    const { outputs, nextState } = stateTransition('74HC161', {
      clk: 1, clrn: 1, ldn: 0, enp: 0, ent: 0, d0: 1, d1: 0, d2: 1, d3: 1,
    }, state);
    // d3:1 d2:1 d1:0 d0:1 = 0b1101 = 13
    expect(nextState.cnt).toBe(13);
    expect(outputs.q0).toBe(1);
    expect(outputs.q3).toBe(1);
  });

  it('RCO=1 when counter reaches 15', () => {
    const state: Record<string, unknown> = { cnt: 14, pClk: 0 };
    const { outputs } = stateTransition('74HC161', {
      clk: 1, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(outputs.rco).toBe(1);
  });

  it('wraps around from 15 to 0', () => {
    const state: Record<string, unknown> = { cnt: 15, pClk: 0 };
    const { nextState } = stateTransition('74HC161', {
      clk: 1, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 11. 74HC151 – 8-to-1 Multiplexer
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC151 – 8-to-1 MUX', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC151')).toBe(true);
  });

  it('disabled (/E=1) forces Y=0, /Y=1', () => {
    const out = evalGate('74HC151', {
      s0: 0, s1: 0, s2: 0, en: 1,
      d0: 1, d1: 1, d2: 1, d3: 1, d4: 1, d5: 1, d6: 1, d7: 1,
    });
    expect(out.y).toBe(0);
    expect(out.yn).toBe(1);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7])('selects input d%d when S=%d', (sel) => {
    const inputs: Record<string, number> = {
      s0: (sel >> 0) & 1, s1: (sel >> 1) & 1, s2: (sel >> 2) & 1, en: 0,
      d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, d7: 0,
    };
    inputs['d' + sel] = 1; // only selected input is 1
    const out = evalGate('74HC151', inputs);
    expect(out.y).toBe(1);
    expect(out.yn).toBe(0);
  });

  it('passes 0 when selected input is 0', () => {
    const out = evalGate('74HC151', {
      s0: 1, s1: 0, s2: 0, en: 0, // select d1
      d0: 1, d1: 0, d2: 1, d3: 1, d4: 1, d5: 1, d6: 1, d7: 1,
    });
    expect(out.y).toBe(0);
    expect(out.yn).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 12. 74HC153 – Dual 4-to-1 Multiplexer
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC153 – Dual 4-to-1 MUX', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC153')).toBe(true);
  });

  it('disabled /E1=1 forces Y1=0', () => {
    const out = evalGate('74HC153', {
      s0: 0, s1: 0,
      e1n: 1, i10: 1, i11: 1, i12: 1, i13: 1,
      e2n: 0, i20: 1, i21: 0, i22: 0, i23: 0,
    });
    expect(out.y1).toBe(0);
    expect(out.y2).toBe(1); // e2n=0, sel=0, i20=1
  });

  it.each([0, 1, 2, 3])('select S=%d routes correct MUX1 input', (sel) => {
    const inputs: Record<string, number> = {
      s0: sel & 1, s1: (sel >> 1) & 1,
      e1n: 0, i10: 0, i11: 0, i12: 0, i13: 0,
      e2n: 0, i20: 0, i21: 0, i22: 0, i23: 0,
    };
    inputs['i1' + sel] = 1;
    const out = evalGate('74HC153', inputs);
    expect(out.y1).toBe(1);
  });

  it.each([0, 1, 2, 3])('select S=%d routes correct MUX2 input', (sel) => {
    const inputs: Record<string, number> = {
      s0: sel & 1, s1: (sel >> 1) & 1,
      e1n: 0, i10: 0, i11: 0, i12: 0, i13: 0,
      e2n: 0, i20: 0, i21: 0, i22: 0, i23: 0,
    };
    inputs['i2' + sel] = 1;
    const out = evalGate('74HC153', inputs);
    expect(out.y2).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 13. 74HC194 – 4-Bit Universal Shift Register
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC194 – 4-Bit Shift Register', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC194')).toBe(true);
  });

  it('should have correct defaultInputValues for /CLR (BUG-K1 fix)', () => {
    const def = gateRegistry.get('74HC194')!;
    expect(def.defaultInputValues).toEqual({ clrn: 1 });
  });

  it('mode 0 (S1=0,S0=0): hold', () => {
    const state: Record<string, unknown> = { reg: 0b1010, pClk: 0 };
    const { nextState } = stateTransition('74HC194', {
      clk: 1, clrn: 1, s0: 0, s1: 0, sr: 0, sl: 0,
      d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.reg).toBe(0b1010); // unchanged
  });

  it('mode 1 (S1=0,S0=1): shift right', () => {
    // reg=0b1010 (bits: q3=1 q2=0 q1=1 q0=0), shift right with SR=1
    // New: SR enters at q3 position, bits shift right
    const state: Record<string, unknown> = { reg: 0b1010, pClk: 0 };
    const { nextState } = stateTransition('74HC194', {
      clk: 1, clrn: 1, s0: 1, s1: 0, sr: 1, sl: 0,
      d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    // (0b1010 >> 1) | (1 << 3) = 0b0101 | 0b1000 = 0b1101 = 13
    expect(nextState.reg).toBe(0b1101);
  });

  it('mode 2 (S1=1,S0=0): shift left', () => {
    // reg=0b1010, shift left with SL=1
    const state: Record<string, unknown> = { reg: 0b1010, pClk: 0 };
    const { nextState } = stateTransition('74HC194', {
      clk: 1, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 1,
      d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    // (0b1010 << 1) | 1 = 0b10100 | 1 = 0b10101, & 0xF = 0b0101 = 5
    expect(nextState.reg).toBe(0b0101);
  });

  it('mode 3 (S1=1,S0=1): parallel load', () => {
    const state: Record<string, unknown> = { reg: 0, pClk: 0 };
    const { outputs, nextState } = stateTransition('74HC194', {
      clk: 1, clrn: 1, s0: 1, s1: 1, sr: 0, sl: 0,
      d0: 1, d1: 1, d2: 0, d3: 1,
    }, state);
    // d3:1 d2:0 d1:1 d0:1 = 0b1011 = 11
    expect(nextState.reg).toBe(11);
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(1);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(1);
  });

  it('/CLR=0 clears register (async, even without clock edge)', () => {
    const state: Record<string, unknown> = { reg: 0b1111, pClk: 0 };
    const { nextState } = stateTransition('74HC194', {
      clk: 0, clrn: 0, s0: 0, s1: 0, sr: 0, sl: 0,
      d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.reg).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 14. 74HC373 – 8-Bit Transparent D-Latch
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC373 – 8-Bit Transparent D-Latch', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC373')).toBe(true);
  });

  it('LE=1 transparent: outputs follow inputs', () => {
    const state: Record<string, unknown> = { latch: 0 };
    const { outputs, nextState } = stateTransition('74HC373', {
      oe: 0, le: 1,
      d0: 1, d1: 0, d2: 1, d3: 0, d4: 1, d5: 0, d6: 1, d7: 0,
    }, state);
    // latch = 0b01010101 = 85
    expect(nextState.latch).toBe(0b01010101);
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(1);
    expect(outputs.q6).toBe(1);
    expect(outputs.q7).toBe(0);
  });

  it('LE=0 holds last latched value', () => {
    const state: Record<string, unknown> = { latch: 0b11110000 };
    const { outputs, nextState } = stateTransition('74HC373', {
      oe: 0, le: 0,
      d0: 1, d1: 1, d2: 1, d3: 1, d4: 1, d5: 1, d6: 1, d7: 1,
    }, state);
    // Latch should remain unchanged since LE=0
    expect(nextState.latch).toBe(0b11110000);
    expect(outputs.q0).toBe(0);
    expect(outputs.q4).toBe(1);
  });

  it('/OE=1 forces all outputs to 0', () => {
    const state: Record<string, unknown> = { latch: 0xFF };
    const def = gateRegistry.get('74HC373')!;
    const out = def.evaluate({ oe: 1 }, state) as Record<string, number>;
    for (let i = 0; i < 8; i++) expect(out['q' + i]).toBe(0);
  });

  it('/OE=0 outputs latched data', () => {
    const state: Record<string, unknown> = { latch: 0b10000001 };
    const def = gateRegistry.get('74HC373')!;
    const out = def.evaluate({ oe: 0 }, state) as Record<string, number>;
    expect(out.q0).toBe(1);
    expect(out.q7).toBe(1);
    expect(out.q1).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 15. 74HC374 – 8-Bit D Flip-Flop (edge-triggered)
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC374 – 8-Bit D-FF', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC374')).toBe(true);
  });

  it('latches data on rising CLK edge', () => {
    const state: Record<string, unknown> = { reg: 0, pClk: 0 };
    const { outputs, nextState } = stateTransition('74HC374', {
      oe: 0, clk: 1,
      d0: 1, d1: 1, d2: 0, d3: 0, d4: 1, d5: 1, d6: 0, d7: 0,
    }, state);
    // reg = 0b00110011 = 51
    expect(nextState.reg).toBe(0b00110011);
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(1);
    expect(outputs.q4).toBe(1);
    expect(outputs.q7).toBe(0);
  });

  it('does not latch when CLK stays high (no rising edge)', () => {
    const state: Record<string, unknown> = { reg: 0b11111111, pClk: 1 };
    const { nextState } = stateTransition('74HC374', {
      oe: 0, clk: 1,
      d0: 0, d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, d7: 0,
    }, state);
    expect(nextState.reg).toBe(0b11111111); // unchanged
  });

  it('/OE=1 forces all outputs to 0', () => {
    const state: Record<string, unknown> = { reg: 0xFF };
    const def = gateRegistry.get('74HC374')!;
    const out = def.evaluate({ oe: 1 }, state) as Record<string, number>;
    for (let i = 0; i < 8; i++) expect(out['q' + i]).toBe(0);
  });

  it('/OE=0 outputs registered data', () => {
    const state: Record<string, unknown> = { reg: 0b10101010 };
    const def = gateRegistry.get('74HC374')!;
    const out = def.evaluate({ oe: 0 }, state) as Record<string, number>;
    expect(out.q0).toBe(0);
    expect(out.q1).toBe(1);
    expect(out.q2).toBe(0);
    expect(out.q3).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 16. 74HC148 – 8-to-3 Priority Encoder
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC148 – Priority Encoder', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC148')).toBe(true);
  });

  it('should have correct defaultInputValues for active-low pins (BUG-K1 fix)', () => {
    const def = gateRegistry.get('74HC148')!;
    expect(def.defaultInputValues).toEqual({
      ein: 1, i0: 1, i1: 1, i2: 1, i3: 1, i4: 1, i5: 1, i6: 1, i7: 1,
    });
  });

  it('/EIN=1 disables: all outputs high', () => {
    const out = evalGate('74HC148', {
      ein: 1, i0: 0, i1: 0, i2: 0, i3: 0, i4: 0, i5: 0, i6: 0, i7: 0,
    });
    expect(out).toEqual({ a0: 1, a1: 1, a2: 1, gs: 1, eo: 1 });
  });

  it('no input active with /EIN=0: GS=1, EO=0', () => {
    const out = evalGate('74HC148', {
      ein: 0, i0: 1, i1: 1, i2: 1, i3: 1, i4: 1, i5: 1, i6: 1, i7: 1,
    });
    expect(out.gs).toBe(1);
    expect(out.eo).toBe(0);
    expect(out.a0).toBe(1);
    expect(out.a1).toBe(1);
    expect(out.a2).toBe(1);
  });

  // Priority encoding tests: i7 has highest priority
  // Active-low inputs: 0 means active
  // Active-low outputs: encoded value is inverted (XOR with 0b111)
  it.each([
    // [iN active, expected a2, a1, a0]
    { active: 7, a2: 0, a1: 0, a0: 0 }, // i7 active -> ~7 = 000
    { active: 6, a2: 0, a1: 0, a0: 1 }, // i6 active -> ~6 = 001
    { active: 5, a2: 0, a1: 1, a0: 0 }, // i5 active -> ~5 = 010
    { active: 4, a2: 0, a1: 1, a0: 1 }, // i4 active -> ~4 = 011
    { active: 3, a2: 1, a1: 0, a0: 0 }, // i3 active -> ~3 = 100
    { active: 2, a2: 1, a1: 0, a0: 1 }, // i2 active -> ~2 = 101
    { active: 1, a2: 1, a1: 1, a0: 0 }, // i1 active -> ~1 = 110
    { active: 0, a2: 1, a1: 1, a0: 1 }, // i0 active -> ~0 = 111
  ])('encodes i$active as a2=$a2 a1=$a1 a0=$a0', ({ active, a2, a1, a0 }) => {
    const inputs: Record<string, number> = {
      ein: 0, i0: 1, i1: 1, i2: 1, i3: 1, i4: 1, i5: 1, i6: 1, i7: 1,
    };
    inputs['i' + active] = 0; // active-low: 0 means active
    const out = evalGate('74HC148', inputs);
    expect(out.a2).toBe(a2);
    expect(out.a1).toBe(a1);
    expect(out.a0).toBe(a0);
    expect(out.gs).toBe(0);
    expect(out.eo).toBe(1);
  });

  it('i7 has priority over i0 when both active', () => {
    const out = evalGate('74HC148', {
      ein: 0, i0: 0, i1: 1, i2: 1, i3: 1, i4: 1, i5: 1, i6: 1, i7: 0,
    });
    // i7 has highest priority -> encoded as 000
    expect(out.a2).toBe(0);
    expect(out.a1).toBe(0);
    expect(out.a0).toBe(0);
  });

  it('i5 has priority over i3 when both active', () => {
    const out = evalGate('74HC148', {
      ein: 0, i0: 1, i1: 1, i2: 1, i3: 0, i4: 1, i5: 0, i6: 1, i7: 1,
    });
    // i5 (higher) wins -> ~5 = 010
    expect(out.a2).toBe(0);
    expect(out.a1).toBe(1);
    expect(out.a0).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// 17. 74HC163 – 4-Bit Synchronous Counter with Synchronous Clear
// ─────────────────────────────────────────────────────────────────────────────────
describe('74HC163 – 4-Bit Sync Counter (Sync Clear)', () => {
  it('should be registered', () => {
    expect(gateRegistry.has('74HC163')).toBe(true);
  });

  it('should have correct defaultInputValues for /CLR, /LD (BUG-K1 fix)', () => {
    const def = gateRegistry.get('74HC163')!;
    expect(def.defaultInputValues).toEqual({ clrn: 1, ldn: 1 });
  });

  it('counts up on CLK rising edge when ENP=1 and ENT=1', () => {
    const state: Record<string, unknown> = { cnt: 3, pClk: 0 };
    const { nextState } = stateTransition('74HC163', {
      clk: 1, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(4);
  });

  it('/CLR=0 clears counter on rising edge (synchronous clear)', () => {
    const state: Record<string, unknown> = { cnt: 12, pClk: 0 };
    const { nextState } = stateTransition('74HC163', {
      clk: 1, clrn: 0, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(0);
  });

  it('/CLR=0 does NOT clear without rising edge (synchronous)', () => {
    const state: Record<string, unknown> = { cnt: 12, pClk: 0 };
    const { nextState } = stateTransition('74HC163', {
      clk: 0, clrn: 0, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(12);
  });

  it('/LD=0 parallel loads on rising edge', () => {
    const state: Record<string, unknown> = { cnt: 0, pClk: 0 };
    const { nextState } = stateTransition('74HC163', {
      clk: 1, clrn: 1, ldn: 0, enp: 0, ent: 0, d0: 0, d1: 1, d2: 0, d3: 1,
    }, state);
    // d3:1 d2:0 d1:1 d0:0 = 0b1010 = 10
    expect(nextState.cnt).toBe(10);
  });

  it('RCO=1 when counter reaches 15', () => {
    const state: Record<string, unknown> = { cnt: 14, pClk: 0 };
    const { outputs } = stateTransition('74HC163', {
      clk: 1, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(outputs.rco).toBe(1);
  });

  it('wraps around from 15 to 0', () => {
    const state: Record<string, unknown> = { cnt: 15, pClk: 0 };
    const { nextState } = stateTransition('74HC163', {
      clk: 1, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(0);
  });

  it('does not count when enables are inactive', () => {
    const state: Record<string, unknown> = { cnt: 7, pClk: 0 };
    const { nextState } = stateTransition('74HC163', {
      clk: 1, clrn: 1, ldn: 1, enp: 0, ent: 0, d0: 0, d1: 0, d2: 0, d3: 0,
    }, state);
    expect(nextState.cnt).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// Cross-cutting: Active-Low Default Input Values Verification (BUG-K1)
// ─────────────────────────────────────────────────────────────────────────────────
describe('Active-Low defaultInputValues verification (BUG-K1)', () => {
  it('74HC74: /PRE and /CLR pins default to 1 (inactive)', () => {
    const def = gateRegistry.get('74HC74')!;
    expect(def.defaultInputValues).toBeDefined();
    expect(def.defaultInputValues!.pre1).toBe(1);
    expect(def.defaultInputValues!.clr1).toBe(1);
    expect(def.defaultInputValues!.pre2).toBe(1);
    expect(def.defaultInputValues!.clr2).toBe(1);
  });

  it('74HC595: /MR pin defaults to 1 (inactive)', () => {
    const def = gateRegistry.get('74HC595')!;
    expect(def.defaultInputValues).toBeDefined();
    expect(def.defaultInputValues!.mr).toBe(1);
  });

  it('74HC161: /CLR and /LD pins default to 1 (inactive)', () => {
    const def = gateRegistry.get('74HC161')!;
    expect(def.defaultInputValues).toBeDefined();
    expect(def.defaultInputValues!.clrn).toBe(1);
    expect(def.defaultInputValues!.ldn).toBe(1);
  });

  it('74HC194: /CLR pin defaults to 1 (inactive)', () => {
    const def = gateRegistry.get('74HC194')!;
    expect(def.defaultInputValues).toBeDefined();
    expect(def.defaultInputValues!.clrn).toBe(1);
  });

  it('74HC148: /EIN and all /I inputs default to 1 (inactive)', () => {
    const def = gateRegistry.get('74HC148')!;
    expect(def.defaultInputValues).toBeDefined();
    expect(def.defaultInputValues!.ein).toBe(1);
    for (let i = 0; i < 8; i++) {
      expect(def.defaultInputValues!['i' + i]).toBe(1);
    }
  });

  it('74HC163: /CLR and /LD pins default to 1 (inactive)', () => {
    const def = gateRegistry.get('74HC163')!;
    expect(def.defaultInputValues).toBeDefined();
    expect(def.defaultInputValues!.clrn).toBe(1);
    expect(def.defaultInputValues!.ldn).toBe(1);
  });

  it('ICs without active-low pins should NOT have defaultInputValues', () => {
    // These combinatorial ICs have no active-low input pins
    for (const typeId of ['74HC00', '74HC04', '74HC08', '74HC32', '74HC86', '74HC283']) {
      const def = gateRegistry.get(typeId)!;
      expect(def.defaultInputValues).toBeUndefined();
    }
  });
});

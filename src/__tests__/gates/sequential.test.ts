import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';
import { SIM_TICKS_PER_SEC } from '../../core/simulation/tickEngine';

/**
 * Simulates a full state transition cycle for a sequential gate:
 *  1. evaluate with old state -> old outputs
 *  2. stateUpdate(inputs, oldOutputs, oldState) -> new state
 *  3. evaluate with new state -> new outputs (the ones visible after the tick)
 */
function stateTransition(
  typeId: string,
  inputs: Record<string, 0 | 1>,
  currentState: Record<string, unknown>,
): {
  outputs: Record<string, 0 | 1>;
  nextState: Record<string, unknown>;
} {
  const def = gateRegistry.get(typeId)!;
  const outputsOld = def.evaluate(inputs, currentState) as Record<string, 0 | 1>;
  const nextState = def.stateUpdate
    ? def.stateUpdate(inputs, outputsOld, currentState)
    : { ...currentState };
  const outputs = def.evaluate(inputs, nextState) as Record<string, 0 | 1>;
  return { outputs, nextState };
}

// ---------------------------------------------------------------------------
// 1. SR-Latch (asynchronous)
// ---------------------------------------------------------------------------
describe('SR_LATCH', () => {
  const typeId = 'SR_LATCH';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('S=0, R=0 holds previous state (Q=0)', () => {
    const { outputs, nextState } = stateTransition(typeId, { s: 0, r: 0 }, { q: 0 });
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('S=0, R=0 holds previous state (Q=1)', () => {
    const { outputs, nextState } = stateTransition(typeId, { s: 0, r: 0 }, { q: 1 });
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('S=1, R=0 sets Q=1', () => {
    const { outputs, nextState } = stateTransition(typeId, { s: 1, r: 0 }, { q: 0 });
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('S=0, R=1 resets Q=0', () => {
    const { outputs, nextState } = stateTransition(typeId, { s: 0, r: 1 }, { q: 1 });
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('S=1, R=1 (forbidden) yields Q=0, Q_n=0', () => {
    const { outputs } = stateTransition(typeId, { s: 1, r: 1 }, { q: 1 });
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(0);
  });

  it('default initial state is Q=0', () => {
    const { outputs } = stateTransition(typeId, { s: 0, r: 0 }, {});
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. D-Latch (level-sensitive)
// ---------------------------------------------------------------------------
describe('D_LATCH', () => {
  const typeId = 'D_LATCH';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('EN=1, D=1 -> Q follows D (transparent)', () => {
    const { outputs, nextState } = stateTransition(typeId, { d: 1, en: 1 }, { q: 0 });
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('EN=1, D=0 -> Q follows D', () => {
    const { outputs, nextState } = stateTransition(typeId, { d: 0, en: 1 }, { q: 1 });
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('EN=0 -> Q holds (was 1)', () => {
    const { outputs, nextState } = stateTransition(typeId, { d: 0, en: 0 }, { q: 1 });
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('EN=0 -> Q holds (was 0)', () => {
    const { outputs, nextState } = stateTransition(typeId, { d: 1, en: 0 }, { q: 0 });
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('default initial state is Q=0', () => {
    const { outputs } = stateTransition(typeId, { d: 0, en: 0 }, {});
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. D Flip-Flop (rising edge)
// ---------------------------------------------------------------------------
describe('D_FF', () => {
  const typeId = 'D_FF';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge (prevClk=0->clk=1), D=1 -> Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
    expect(nextState.prevClk).toBe(1);
  });

  it('rising edge (prevClk=0->clk=1), D=0 -> Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 0, clk: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('no edge (prevClk=1, clk=1) -> Q holds', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('falling edge (prevClk=1->clk=0) -> Q holds', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('clk stays low (prevClk=0, clk=0) -> Q holds', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('default initial state is Q=0, prevClk=0', () => {
    const { outputs } = stateTransition(typeId, { d: 0, clk: 0 }, {});
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. D Flip-Flop with async Reset
// ---------------------------------------------------------------------------
describe('D_FF_R', () => {
  const typeId = 'D_FF_R';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rst=1 forces Q=0 regardless of clock', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, rst: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('rst=1 forces Q=0 even when clk stays high', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, rst: 1 }, { q: 1, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('rst=0, rising edge, D=1 -> Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, rst: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('rst=0, rising edge, D=0 -> Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 0, clk: 1, rst: 0 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('rst=0, no edge -> Q holds', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, rst: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. JK Flip-Flop (rising edge)
// ---------------------------------------------------------------------------
describe('JK_FF', () => {
  const typeId = 'JK_FF';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  // Rising edge tests (prevClk=0 -> clk=1)
  it('rising edge, J=0 K=0 -> hold (Q stays 0)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 0, clk: 1, k: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('rising edge, J=0 K=0 -> hold (Q stays 1)', () => {
    const { outputs } = stateTransition(
      typeId, { j: 0, clk: 1, k: 0 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
  });

  it('rising edge, J=0 K=1 -> reset Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 0, clk: 1, k: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('rising edge, J=1 K=0 -> set Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('rising edge, J=1 K=1 -> toggle (0->1)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 1 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('rising edge, J=1 K=1 -> toggle (1->0)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  // No edge tests (prevClk=1 -> clk=1)
  it('no edge (clk stays high), J=1 K=0 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('no edge (clk stays high), J=1 K=1 -> hold (no toggle)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 1 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('falling edge, J=1 K=0 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 0, k: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. T Flip-Flop (rising edge)
// ---------------------------------------------------------------------------
describe('T_FF', () => {
  const typeId = 'T_FF';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge, T=1 -> toggle (0->1)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 1, clk: 1 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('rising edge, T=1 -> toggle (1->0)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 1, clk: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('rising edge, T=0 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 0, clk: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('no edge (clk stays high), T=1 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 1, clk: 1 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('falling edge, T=1 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 1, clk: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('multiple toggles in sequence', () => {
    let state: Record<string, unknown> = { q: 0, prevClk: 0 };
    // tick 1: rising edge with T=1 -> toggle to 1
    let result = stateTransition(typeId, { t: 1, clk: 1 }, state);
    expect(result.outputs.q).toBe(1);
    state = result.nextState;
    // tick 2: falling edge -> hold
    result = stateTransition(typeId, { t: 1, clk: 0 }, state);
    expect(result.outputs.q).toBe(1);
    state = result.nextState;
    // tick 3: rising edge -> toggle to 0
    result = stateTransition(typeId, { t: 1, clk: 1 }, state);
    expect(result.outputs.q).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Master-Slave JK Flip-Flop
// ---------------------------------------------------------------------------
describe('MS_JK_FF', () => {
  const typeId = 'MS_JK_FF';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('output is driven by slave (qS), not master (qM)', () => {
    const def = gateRegistry.get(typeId)!;
    const outputs = def.evaluate({}, { qS: 1, qM: 0 });
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
  });

  it('master tracks J=1,K=0 when clk=1 (master transparent)', () => {
    const { nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 0 }, { qM: 0, qS: 0, prevClk: 0 },
    );
    expect(nextState.qM).toBe(1);
    // slave does NOT change yet (no falling edge)
    expect(nextState.qS).toBe(0);
  });

  it('master tracks J=0,K=1 when clk=1', () => {
    const { nextState } = stateTransition(
      typeId, { j: 0, clk: 1, k: 1 }, { qM: 1, qS: 1, prevClk: 0 },
    );
    expect(nextState.qM).toBe(0);
    expect(nextState.qS).toBe(1); // slave holds until falling edge
  });

  it('slave captures on falling edge (clk 1->0)', () => {
    // Master already set to 1
    const { outputs, nextState } = stateTransition(
      typeId, { j: 0, clk: 0, k: 0 }, { qM: 1, qS: 0, prevClk: 1 },
    );
    expect(nextState.qS).toBe(1);
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
  });

  it('slave holds when no falling edge (clk stays 0)', () => {
    const { nextState } = stateTransition(
      typeId, { j: 0, clk: 0, k: 0 }, { qM: 1, qS: 0, prevClk: 0 },
    );
    expect(nextState.qS).toBe(0);
  });

  it('J=1,K=1 toggle uses qS (slave), not qM (master)', () => {
    // slave Q=0, so toggle should set master to 1 (qS^1 = 1)
    const { nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 1 }, { qM: 0, qS: 0, prevClk: 0 },
    );
    expect(nextState.qM).toBe(1);

    // slave Q=1, so toggle should set master to 0 (qS^1 = 0)
    const { nextState: ns2 } = stateTransition(
      typeId, { j: 1, clk: 1, k: 1 }, { qM: 0, qS: 1, prevClk: 0 },
    );
    expect(ns2.qM).toBe(0);
  });

  it('J=0,K=0 hold: master stays unchanged when clk=1', () => {
    const { nextState } = stateTransition(
      typeId, { j: 0, clk: 1, k: 0 }, { qM: 1, qS: 0, prevClk: 0 },
    );
    expect(nextState.qM).toBe(1);
  });

  it('full cycle: set via master then capture on falling edge', () => {
    let state: Record<string, unknown> = { qM: 0, qS: 0, prevClk: 0 };

    // Step 1: clk rises to 1 with J=1, K=0 -> master sets
    let result = stateTransition(typeId, { j: 1, clk: 1, k: 0 }, state);
    expect(result.nextState.qM).toBe(1);
    expect(result.nextState.qS).toBe(0);
    expect(result.outputs.q).toBe(0); // slave still 0
    state = result.nextState;

    // Step 2: clk falls to 0 -> slave captures master
    result = stateTransition(typeId, { j: 1, clk: 0, k: 0 }, state);
    expect(result.nextState.qS).toBe(1);
    expect(result.outputs.q).toBe(1);
  });

  it('default initial state: qM=0, qS=0', () => {
    const { outputs } = stateTransition(typeId, { j: 0, clk: 0, k: 0 }, {});
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 8. Edge-triggered SR Flip-Flop
// ---------------------------------------------------------------------------
describe('SR_FF_EDGE', () => {
  const typeId = 'SR_FF_EDGE';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge, S=1 R=0 -> set Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { s: 1, clk: 1, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('rising edge, S=0 R=1 -> reset Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { s: 0, clk: 1, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('rising edge, S=0 R=0 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { s: 0, clk: 1, r: 0 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(nextState.q).toBe(1);
  });

  it('rising edge, S=1 R=1 (forbidden) -> Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { s: 1, clk: 1, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('no edge (clk stays high), S=1 R=0 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { s: 1, clk: 1, r: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('falling edge, S=1 R=0 -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { s: 1, clk: 0, r: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. D Flip-Flop with Async Set/Reset
// ---------------------------------------------------------------------------
describe('D_FF_ASSR', () => {
  const typeId = 'D_FF_ASSR';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('R=1 (async reset) overrides clock -> Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, s: 0, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(outputs.q_n).toBe(1);
    expect(nextState.q).toBe(0);
  });

  it('S=1 (async set) overrides clock -> Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 0, clk: 0, s: 1, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(outputs.q_n).toBe(0);
    expect(nextState.q).toBe(1);
  });

  it('S=1, R=1 (both active) -> Q=0 (R wins)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, s: 1, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('S=0, R=0, rising edge, D=1 -> Q=1 (normal clock)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, s: 0, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(nextState.q).toBe(1);
  });

  it('S=0, R=0, no edge -> Q holds', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { d: 1, clk: 1, s: 0, r: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('priority: R > S > CLK', () => {
    // R=1 should override S=1 and clk rising edge
    const { outputs } = stateTransition(
      typeId, { d: 1, clk: 1, s: 1, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10. JK Flip-Flop with Async Set/Reset
// ---------------------------------------------------------------------------
describe('JK_FF_ASSR', () => {
  const typeId = 'JK_FF_ASSR';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('R=1 (async reset) -> Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 0, s: 0, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('S=1 (async set) -> Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 0, clk: 0, k: 0, s: 1, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(nextState.q).toBe(1);
  });

  it('S=1, R=1 -> Q=0 (undefined treated as 0)', () => {
    const { outputs } = stateTransition(
      typeId, { j: 1, clk: 1, k: 0, s: 1, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
  });

  it('S=0, R=0, rising edge, J=1 K=0 -> set Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 0, s: 0, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(nextState.q).toBe(1);
  });

  it('S=0, R=0, rising edge, J=0 K=1 -> reset Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 0, clk: 1, k: 1, s: 0, r: 0 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('S=0, R=0, rising edge, J=1 K=1 -> toggle', () => {
    const { outputs } = stateTransition(
      typeId, { j: 1, clk: 1, k: 1, s: 0, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
  });

  it('S=0, R=0, rising edge, J=0 K=0 -> hold', () => {
    const { outputs } = stateTransition(
      typeId, { j: 0, clk: 1, k: 0, s: 0, r: 0 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
  });

  it('S=0, R=0, no edge -> hold', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { j: 1, clk: 1, k: 0, s: 0, r: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 11. T Flip-Flop with Async Set/Reset
// ---------------------------------------------------------------------------
describe('T_FF_ASSR', () => {
  const typeId = 'T_FF_ASSR';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('R=1 (async reset) -> Q=0', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 1, clk: 1, s: 0, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
    expect(nextState.q).toBe(0);
  });

  it('S=1 (async set) -> Q=1', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 0, clk: 0, s: 1, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(nextState.q).toBe(1);
  });

  it('S=1, R=1 -> Q=0', () => {
    const { outputs } = stateTransition(
      typeId, { t: 1, clk: 1, s: 1, r: 1 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
  });

  it('S=0, R=0, rising edge, T=1 -> toggle (0->1)', () => {
    const { outputs, nextState } = stateTransition(
      typeId, { t: 1, clk: 1, s: 0, r: 0 }, { q: 0, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
    expect(nextState.q).toBe(1);
  });

  it('S=0, R=0, rising edge, T=1 -> toggle (1->0)', () => {
    const { outputs } = stateTransition(
      typeId, { t: 1, clk: 1, s: 0, r: 0 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(0);
  });

  it('S=0, R=0, rising edge, T=0 -> hold', () => {
    const { outputs } = stateTransition(
      typeId, { t: 0, clk: 1, s: 0, r: 0 }, { q: 1, prevClk: 0 },
    );
    expect(outputs.q).toBe(1);
  });

  it('S=0, R=0, no edge, T=1 -> hold', () => {
    const { outputs } = stateTransition(
      typeId, { t: 1, clk: 1, s: 0, r: 0 }, { q: 0, prevClk: 1 },
    );
    expect(outputs.q).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 12. REG4 (4-bit register)
// ---------------------------------------------------------------------------
describe('REG4', () => {
  const typeId = 'REG4';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge + EN=1 loads d0-d3 into q0-q3', () => {
    const { outputs, nextState } = stateTransition(
      typeId,
      { d0: 1, d1: 0, d2: 1, d3: 1, en: 1, clk: 1, rst: 0 },
      { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 },
    );
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(1);
    expect(outputs.q3).toBe(1);
    expect(nextState.q0).toBe(1);
    expect(nextState.q1).toBe(0);
    expect(nextState.q2).toBe(1);
    expect(nextState.q3).toBe(1);
  });

  it('rising edge + EN=0 -> hold (no load)', () => {
    const { outputs } = stateTransition(
      typeId,
      { d0: 1, d1: 1, d2: 1, d3: 1, en: 0, clk: 1, rst: 0 },
      { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 },
    );
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
  });

  it('no edge + EN=1 -> hold', () => {
    const { outputs } = stateTransition(
      typeId,
      { d0: 1, d1: 1, d2: 1, d3: 1, en: 1, clk: 1, rst: 0 },
      { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 1 },
    );
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
  });

  it('rst=1 resets all outputs to 0', () => {
    const { outputs, nextState } = stateTransition(
      typeId,
      { d0: 1, d1: 1, d2: 1, d3: 1, en: 1, clk: 1, rst: 1 },
      { q0: 1, q1: 1, q2: 1, q3: 1, prevClk: 0 },
    );
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
    expect(nextState.q0).toBe(0);
    expect(nextState.q1).toBe(0);
    expect(nextState.q2).toBe(0);
    expect(nextState.q3).toBe(0);
  });

  it('default initial state is all zeros', () => {
    const { outputs } = stateTransition(
      typeId,
      { d0: 0, d1: 0, d2: 0, d3: 0, en: 0, clk: 0, rst: 0 },
      {},
    );
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 13. REG8 (8-bit register)
// ---------------------------------------------------------------------------
describe('REG8', () => {
  const typeId = 'REG8';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge loads d0-d7 into q0-q7', () => {
    const inputs: Record<string, 0 | 1> = { clk: 1, rst: 0 };
    const state: Record<string, unknown> = { prevClk: 0 };
    for (let i = 0; i < 8; i++) {
      inputs[`d${i}`] = (i % 2 === 0 ? 1 : 0) as 0 | 1;
      state[`q${i}`] = 0;
    }
    const { outputs } = stateTransition(typeId, inputs, state);
    for (let i = 0; i < 8; i++) {
      expect(outputs[`q${i}`]).toBe(i % 2 === 0 ? 1 : 0);
    }
  });

  it('no edge -> hold', () => {
    const inputs: Record<string, 0 | 1> = { clk: 1, rst: 0 };
    const state: Record<string, unknown> = { prevClk: 1 };
    for (let i = 0; i < 8; i++) {
      inputs[`d${i}`] = 1;
      state[`q${i}`] = 0;
    }
    const { outputs } = stateTransition(typeId, inputs, state);
    for (let i = 0; i < 8; i++) {
      expect(outputs[`q${i}`]).toBe(0);
    }
  });

  it('rst=1 resets all to 0', () => {
    const inputs: Record<string, 0 | 1> = { clk: 1, rst: 1 };
    const state: Record<string, unknown> = { prevClk: 0 };
    for (let i = 0; i < 8; i++) {
      inputs[`d${i}`] = 1;
      state[`q${i}`] = 1;
    }
    const { outputs } = stateTransition(typeId, inputs, state);
    for (let i = 0; i < 8; i++) {
      expect(outputs[`q${i}`]).toBe(0);
    }
  });

  it('default initial state is all zeros', () => {
    const inputs: Record<string, 0 | 1> = { clk: 0, rst: 0 };
    for (let i = 0; i < 8; i++) inputs[`d${i}`] = 0;
    const { outputs } = stateTransition(typeId, inputs, {});
    for (let i = 0; i < 8; i++) {
      expect(outputs[`q${i}`]).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 14. SHIFT4 (4-bit serial shift register)
// ---------------------------------------------------------------------------
describe('SHIFT4', () => {
  const typeId = 'SHIFT4';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge shifts in SI at q0, previous q0->q1->q2->q3', () => {
    const { outputs, nextState } = stateTransition(
      typeId,
      { si: 1, clk: 1, rst: 0 },
      { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 },
    );
    expect(outputs.q0).toBe(1); // SI shifted in
    expect(outputs.q1).toBe(0); // old q0
    expect(outputs.q2).toBe(0); // old q1
    expect(outputs.q3).toBe(0); // old q2
    expect(nextState.q0).toBe(1);
  });

  it('multiple shifts form a serial pattern', () => {
    let state: Record<string, unknown> = { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 };

    // Shift in 1
    let result = stateTransition(typeId, { si: 1, clk: 1, rst: 0 }, state);
    expect(result.outputs).toEqual({ q0: 1, q1: 0, q2: 0, q3: 0 });
    state = result.nextState;

    // Falling edge
    result = stateTransition(typeId, { si: 0, clk: 0, rst: 0 }, state);
    state = result.nextState;

    // Shift in 0
    result = stateTransition(typeId, { si: 0, clk: 1, rst: 0 }, state);
    expect(result.outputs).toEqual({ q0: 0, q1: 1, q2: 0, q3: 0 });
    state = result.nextState;

    // Falling edge
    result = stateTransition(typeId, { si: 0, clk: 0, rst: 0 }, state);
    state = result.nextState;

    // Shift in 1
    result = stateTransition(typeId, { si: 1, clk: 1, rst: 0 }, state);
    expect(result.outputs).toEqual({ q0: 1, q1: 0, q2: 1, q3: 0 });
  });

  it('rst=1 resets all to 0', () => {
    const { outputs } = stateTransition(
      typeId,
      { si: 1, clk: 1, rst: 1 },
      { q0: 1, q1: 1, q2: 1, q3: 1, prevClk: 0 },
    );
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
  });

  it('no edge -> hold', () => {
    const { outputs } = stateTransition(
      typeId,
      { si: 1, clk: 1, rst: 0 },
      { q0: 1, q1: 0, q2: 1, q3: 0, prevClk: 1 },
    );
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(1);
    expect(outputs.q3).toBe(0);
  });

  it('default initial state is all zeros', () => {
    const { outputs } = stateTransition(typeId, { si: 0, clk: 0, rst: 0 }, {});
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 15. BIN_CTR7S (4-bit binary counter 0-15)
// ---------------------------------------------------------------------------
describe('BIN_CTR7S', () => {
  const typeId = 'BIN_CTR7S';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge + EN=1 increments count', () => {
    const { outputs, nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 0, prevClk: 0 },
    );
    expect(nextState.count).toBe(1);
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
    expect(outputs.rco).toBe(0);
  });

  it('counts binary correctly (count=5 -> q0=1,q1=0,q2=1,q3=0)', () => {
    const { outputs } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 4, prevClk: 0 },
    );
    // After increment: count=5 = 0101
    expect(outputs.q0).toBe(1);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(1);
    expect(outputs.q3).toBe(0);
  });

  it('overflows from 15 to 0', () => {
    const { outputs, nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 15, prevClk: 0 },
    );
    expect(nextState.count).toBe(0);
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
    expect(outputs.rco).toBe(0);
  });

  it('RCO=1 when count=15', () => {
    const { outputs } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 14, prevClk: 0 },
    );
    // After increment: count=15
    expect(nextStateCountIs(outputs, 15)).toBe(true);
    expect(outputs.rco).toBe(1);
  });

  it('rst=1 resets count to 0', () => {
    const { outputs, nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 1, en: 1 },
      { count: 10, prevClk: 0 },
    );
    expect(nextState.count).toBe(0);
    expect(outputs.q0).toBe(0);
    expect(outputs.q1).toBe(0);
    expect(outputs.q2).toBe(0);
    expect(outputs.q3).toBe(0);
  });

  it('EN=0 -> no counting on rising edge', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 0 },
      { count: 5, prevClk: 0 },
    );
    expect(nextState.count).toBe(5);
  });

  it('no edge (clk stays high) -> no counting', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 5, prevClk: 1 },
    );
    expect(nextState.count).toBe(5);
  });

  it('falling edge -> no counting', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 0, rst: 0, en: 1 },
      { count: 5, prevClk: 1 },
    );
    expect(nextState.count).toBe(5);
  });

  it('counts from 0 to 15 in sequence', () => {
    let state: Record<string, unknown> = { count: 0, prevClk: 0 };
    for (let expected = 1; expected <= 15; expected++) {
      // Rising edge
      let result = stateTransition(typeId, { clk: 1, rst: 0, en: 1 }, state);
      expect(result.nextState.count).toBe(expected);
      state = result.nextState;
      // Falling edge
      result = stateTransition(typeId, { clk: 0, rst: 0, en: 1 }, state);
      state = result.nextState;
    }
    // One more: overflow
    const result = stateTransition(typeId, { clk: 1, rst: 0, en: 1 }, state);
    expect(result.nextState.count).toBe(0);
  });

  it('default EN is treated as 1 (counts when en not connected)', () => {
    // Source: const en = inputs['en'] ?? 1;
    const def = gateRegistry.get(typeId)!;
    const nextState = def.stateUpdate!(
      { clk: 1, rst: 0 } as any,
      {} as any,
      { count: 0, prevClk: 0 },
    );
    expect(nextState!.count).toBe(1);
  });
});

// Helper to verify count from binary outputs
function nextStateCountIs(outputs: Record<string, 0 | 1>, expected: number): boolean {
  const actual = (outputs.q0 || 0) + ((outputs.q1 || 0) << 1)
    + ((outputs.q2 || 0) << 2) + ((outputs.q3 || 0) << 3);
  return actual === expected;
}

// ---------------------------------------------------------------------------
// 16. BIN_CTR_99 (0-99 counter)
// ---------------------------------------------------------------------------
describe('BIN_CTR_99', () => {
  const typeId = 'BIN_CTR_99';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('rising edge + EN=1 increments count', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 0, prevClk: 0 },
    );
    expect(nextState.count).toBe(1);
  });

  it('counts up correctly', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 42, prevClk: 0 },
    );
    expect(nextState.count).toBe(43);
  });

  it('overflows from 99 to 0', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 99, prevClk: 0 },
    );
    expect(nextState.count).toBe(0);
  });

  it('RCO=1 when count=99', () => {
    const { outputs } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 98, prevClk: 0 },
    );
    // After increment: count=99
    expect(outputs.rco).toBe(1);
  });

  it('RCO=0 when count!=99', () => {
    const { outputs } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 50, prevClk: 0 },
    );
    expect(outputs.rco).toBe(0);
  });

  it('rst=1 resets count to 0', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 1, en: 1 },
      { count: 55, prevClk: 0 },
    );
    expect(nextState.count).toBe(0);
  });

  it('EN=0 -> no counting', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 0 },
      { count: 30, prevClk: 0 },
    );
    expect(nextState.count).toBe(30);
  });

  it('no edge -> no counting', () => {
    const { nextState } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 30, prevClk: 1 },
    );
    expect(nextState.count).toBe(30);
  });

  it('outputs binary encoding of count', () => {
    // count=42 = 0b101010 -> q0=0,q1=1,q2=0,q3=1,q4=0,q5=1
    const { outputs } = stateTransition(
      typeId,
      { clk: 1, rst: 0, en: 1 },
      { count: 41, prevClk: 0 },
    );
    // After increment: count=42
    expect(outputs.q0).toBe(0); // bit 0
    expect(outputs.q1).toBe(1); // bit 1
    expect(outputs.q2).toBe(0); // bit 2
    expect(outputs.q3).toBe(1); // bit 3
    expect(outputs.q4).toBe(0); // bit 4
    expect(outputs.q5).toBe(1); // bit 5
  });

  it('full cycle: 99 -> 0 -> 1', () => {
    let state: Record<string, unknown> = { count: 99, prevClk: 0 };

    // Rising edge: 99 -> 0
    let result = stateTransition(typeId, { clk: 1, rst: 0, en: 1 }, state);
    expect(result.nextState.count).toBe(0);
    state = result.nextState;

    // Falling edge
    result = stateTransition(typeId, { clk: 0, rst: 0, en: 1 }, state);
    state = result.nextState;

    // Rising edge: 0 -> 1
    result = stateTransition(typeId, { clk: 1, rst: 0, en: 1 }, state);
    expect(result.nextState.count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 17. CLOCK (tick-based clock generator)
// ---------------------------------------------------------------------------
describe('CLOCK', () => {
  const typeId = 'CLOCK';

  it('is registered', () => {
    expect(gateRegistry.has(typeId)).toBe(true);
  });

  it('evaluate returns current value from state', () => {
    const def = gateRegistry.get(typeId)!;
    expect(def.evaluate({}, { value: 0 })).toEqual({ clk: 0 });
    expect(def.evaluate({}, { value: 1 })).toEqual({ clk: 1 });
  });

  it('evaluate defaults to 0 when no state', () => {
    const def = gateRegistry.get(typeId)!;
    expect(def.evaluate({}, {})).toEqual({ clk: 0 });
    expect(def.evaluate({}, undefined)).toEqual({ clk: 0 });
  });

  it('stateUpdate increments tickCounter', () => {
    const def = gateRegistry.get(typeId)!;
    const state = { frequency: 1, tickCounter: 0, value: 0 };
    const next = def.stateUpdate!({}, {}, state);
    expect(next!.tickCounter).toBe(1);
    expect(next!.value).toBe(0); // not yet toggled
  });

  it('stateUpdate toggles value when tickCounter reaches toggleInterval', () => {
    const def = gateRegistry.get(typeId)!;
    const freq = 1;
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));
    // Set tickCounter just before the toggle point
    const state = { frequency: freq, tickCounter: toggleInterval - 1, value: 0 };
    const next = def.stateUpdate!({}, {}, state);
    expect(next!.value).toBe(1);
    expect(next!.tickCounter).toBe(0);
  });

  it('stateUpdate toggles back from 1 to 0', () => {
    const def = gateRegistry.get(typeId)!;
    const freq = 1;
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));
    const state = { frequency: freq, tickCounter: toggleInterval - 1, value: 1 };
    const next = def.stateUpdate!({}, {}, state);
    expect(next!.value).toBe(0);
    expect(next!.tickCounter).toBe(0);
  });

  it('does not advance when _paused is true', () => {
    const def = gateRegistry.get(typeId)!;
    const state = { frequency: 1, tickCounter: 5, value: 0, _paused: true };
    const next = def.stateUpdate!({}, {}, state);
    expect(next!.tickCounter).toBe(5);
    expect(next!.value).toBe(0);
  });

  it('handles high frequency correctly', () => {
    const def = gateRegistry.get(typeId)!;
    const freq = 100;
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));
    // At 100Hz with 500 ticks/sec: toggleInterval = round(500/200) = round(2.5) = 3
    expect(toggleInterval).toBeGreaterThanOrEqual(1);
    const state = { frequency: freq, tickCounter: toggleInterval - 1, value: 0 };
    const next = def.stateUpdate!({}, {}, state);
    expect(next!.value).toBe(1);
  });

  it('clamps frequency between 0.1 and 100', () => {
    const def = gateRegistry.get(typeId)!;
    // Very low frequency
    const stateLow = { frequency: 0.01, tickCounter: 0, value: 0 };
    const nextLow = def.stateUpdate!({}, {}, stateLow);
    expect(nextLow!.tickCounter).toBe(1); // should still increment

    // Very high frequency
    const stateHigh = { frequency: 999, tickCounter: 0, value: 0 };
    const nextHigh = def.stateUpdate!({}, {}, stateHigh);
    expect(nextHigh!.tickCounter).toBe(1); // should still increment
  });

  it('full toggle cycle: 0 -> 1 -> 0', () => {
    const def = gateRegistry.get(typeId)!;
    const freq = 1;
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));
    let state: Record<string, unknown> = { frequency: freq, tickCounter: 0, value: 0 };

    // Tick until first toggle
    for (let i = 0; i < toggleInterval; i++) {
      state = def.stateUpdate!({}, {}, state)!;
    }
    expect(state.value).toBe(1);

    // Tick until second toggle
    for (let i = 0; i < toggleInterval; i++) {
      state = def.stateUpdate!({}, {}, state)!;
    }
    expect(state.value).toBe(0);
  });
});

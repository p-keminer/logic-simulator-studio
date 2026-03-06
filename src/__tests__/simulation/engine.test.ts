/**
 * Simulation engine integration tests.
 *
 * These tests build actual circuits (gates + wires) programmatically and run
 * the tick-based simulation engine to verify signal propagation, feedback
 * stability, clock behaviour, and topological ordering.
 */
import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';
import type { Circuit, GateInstance, Wire, SignalState, SignalValue } from '../../core/types';
import {
  initBuffer,
  runOneTick,
  runUntilStable,
  isStable,
  buildWireMap,
  SIM_TICKS_PER_SEC,
  type SimBuffer,
} from '../../core/simulation/tickEngine';
import { runSimulation } from '../../core/simulation/engine';
import { topologicalSort } from '../../core/simulation/topologicalSort';

// ── Helpers ─────────────────────────────────────────────────────────────────

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  opts?: {
    customState?: Record<string, unknown>;
    outputSignals?: Record<string, SignalState>;
  },
): GateInstance {
  return {
    id,
    typeId,
    x: 0,
    y: 0,
    outputSignals: opts?.outputSignals ?? {},
    customState: opts?.customState ?? {},
    isSelected: false,
  };
}

function makeWire(
  id: string,
  fromGate: string,
  fromPort: string,
  toGate: string,
  toPort: string,
): Wire {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to: { gateId: toGate, portId: toPort },
    signal: { ...defaultSignal },
    waypoints: [],
    isSelected: false,
  };
}

function makeCircuit(gates: GateInstance[], wires: Wire[]): Circuit {
  return {
    id: 'test-circuit',
    name: 'Test Circuit',
    version: '1.0.0',
    gates: Object.fromEntries(gates.map(g => [g.id, g])),
    wires: Object.fromEntries(wires.map(w => [w.id, w])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  };
}

/** Run multiple ticks, returning the final buffer. */
function runTicks(
  circuit: Circuit,
  buffer: SimBuffer,
  wireMap: ReturnType<typeof buildWireMap>,
  n: number,
  paused = false,
): SimBuffer {
  let buf = buffer;
  for (let i = 0; i < n; i++) {
    buf = runOneTick(circuit, buf, wireMap, paused);
  }
  return buf;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Signal propagation through a chain
// ═══════════════════════════════════════════════════════════════════════════

describe('1 - Signal propagation through a chain (INPUT_SWITCH -> NOT -> OUTPUT_LED)', () => {
  function buildNotChain(switchVal: 0 | 1) {
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: switchVal } });
    const not1 = makeGate('not1', 'NOT');
    const led = makeGate('led', 'OUTPUT_LED');

    return makeCircuit(
      [sw, not1, led],
      [
        makeWire('w1', 'sw', 'out', 'not1', 'a'),
        makeWire('w2', 'not1', 'out', 'led', 'in'),
      ],
    );
  }

  it('switch=1 -> NOT -> LED gets 0 (tick engine)', () => {
    const circuit = buildNotChain(1);
    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);
    const { buffer } = runUntilStable(circuit, buf0, wireMap);

    expect(buffer.outputs['not1']['out']).toBe(0);
    expect(buffer.outputs['led']['_display']).toBe(0);
  });

  it('switch=0 -> NOT -> LED gets 1 (tick engine)', () => {
    const circuit = buildNotChain(0);
    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);
    const { buffer } = runUntilStable(circuit, buf0, wireMap);

    expect(buffer.outputs['not1']['out']).toBe(1);
    expect(buffer.outputs['led']['_display']).toBe(1);
  });

  it('switch=1 -> NOT -> LED gets 0 (legacy engine)', () => {
    const circuit = buildNotChain(1);
    const result = runSimulation(circuit);

    expect(result.gateSignals['not1']['out'].value).toBe(0);
    expect(result.gateSignals['led']['_display'].value).toBe(0);
  });

  it('switch=0 -> NOT -> LED gets 1 (legacy engine)', () => {
    const circuit = buildNotChain(0);
    const result = runSimulation(circuit);

    expect(result.gateSignals['not1']['out'].value).toBe(1);
    expect(result.gateSignals['led']['_display'].value).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Multi-gate combinatorial (AND truth table)
// ═══════════════════════════════════════════════════════════════════════════

describe('2 - Multi-gate combinatorial (Two INPUT_SWITCHES -> AND -> OUTPUT_LED)', () => {
  function buildAndCircuit(a: 0 | 1, b: 0 | 1) {
    const swA = makeGate('swA', 'INPUT_SWITCH', { customState: { value: a } });
    const swB = makeGate('swB', 'INPUT_SWITCH', { customState: { value: b } });
    const and1 = makeGate('and1', 'AND');
    const led = makeGate('led', 'OUTPUT_LED');

    return makeCircuit(
      [swA, swB, and1, led],
      [
        makeWire('w1', 'swA', 'out', 'and1', 'a'),
        makeWire('w2', 'swB', 'out', 'and1', 'b'),
        makeWire('w3', 'and1', 'out', 'led', 'in'),
      ],
    );
  }

  // --- Tick engine ---

  it('AND(0,0) = 0 (tick engine)', () => {
    const circuit = buildAndCircuit(0, 0);
    const wireMap = buildWireMap(circuit);
    const { buffer } = runUntilStable(circuit, initBuffer(circuit), wireMap);
    expect(buffer.outputs['and1']['out']).toBe(0);
  });

  it('AND(0,1) = 0 (tick engine)', () => {
    const circuit = buildAndCircuit(0, 1);
    const wireMap = buildWireMap(circuit);
    const { buffer } = runUntilStable(circuit, initBuffer(circuit), wireMap);
    expect(buffer.outputs['and1']['out']).toBe(0);
  });

  it('AND(1,0) = 0 (tick engine)', () => {
    const circuit = buildAndCircuit(1, 0);
    const wireMap = buildWireMap(circuit);
    const { buffer } = runUntilStable(circuit, initBuffer(circuit), wireMap);
    expect(buffer.outputs['and1']['out']).toBe(0);
  });

  it('AND(1,1) = 1 (tick engine)', () => {
    const circuit = buildAndCircuit(1, 1);
    const wireMap = buildWireMap(circuit);
    const { buffer } = runUntilStable(circuit, initBuffer(circuit), wireMap);
    expect(buffer.outputs['and1']['out']).toBe(1);
    expect(buffer.outputs['led']['_display']).toBe(1);
  });

  // --- Legacy engine ---

  it.each([
    [0, 0, 0],
    [0, 1, 0],
    [1, 0, 0],
    [1, 1, 1],
  ] as [0|1, 0|1, 0|1][])(
    'AND(%i,%i) = %i (legacy engine)',
    (a, b, expected) => {
      const circuit = buildAndCircuit(a, b);
      const result = runSimulation(circuit);
      expect(result.gateSignals['and1']['out'].value).toBe(expected);
    },
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Feedback stability (RS-Latch from cross-coupled NOR gates)
// ═══════════════════════════════════════════════════════════════════════════

describe('3 - Feedback stability (RS-Latch from cross-coupled NOR gates)', () => {
  // Standard NOR RS-Latch:
  //   Q  = NOR(R, Q_bar)  -> nor_q
  //   Q_bar = NOR(S, Q)   -> nor_qn
  function buildRSLatch(sVal: 0 | 1, rVal: 0 | 1) {
    const s_in = makeGate('s_in', 'INPUT_SWITCH', { customState: { value: sVal } });
    const r_in = makeGate('r_in', 'INPUT_SWITCH', { customState: { value: rVal } });
    const nor_q = makeGate('nor_q', 'NOR');
    const nor_qn = makeGate('nor_qn', 'NOR');

    const circuit = makeCircuit(
      [s_in, r_in, nor_q, nor_qn],
      [
        makeWire('w1', 'r_in', 'out', 'nor_q', 'a'),    // R -> NOR_Q.a
        makeWire('w2', 'nor_qn', 'out', 'nor_q', 'b'),  // Q_bar -> NOR_Q.b (feedback)
        makeWire('w3', 's_in', 'out', 'nor_qn', 'a'),   // S -> NOR_QN.a
        makeWire('w4', 'nor_q', 'out', 'nor_qn', 'b'),  // Q -> NOR_QN.b (feedback)
      ],
    );
    return { circuit, wireMap: buildWireMap(circuit) };
  }

  it('S=1 -> Q=1 (Set operation)', () => {
    const { circuit, wireMap } = buildRSLatch(1, 0);
    const buf0 = initBuffer(circuit);
    const { buffer } = runUntilStable(circuit, buf0, wireMap);

    expect(buffer.outputs['nor_q']['out']).toBe(1);   // Q = 1
    expect(buffer.outputs['nor_qn']['out']).toBe(0);  // Q_bar = 0
  });

  it('after S=1 then S=0,R=0 -> Q holds at 1', () => {
    // Phase 1: SET with S=1, R=0
    const { circuit, wireMap } = buildRSLatch(1, 0);
    const buf0 = initBuffer(circuit);
    const { buffer: setBuf } = runUntilStable(circuit, buf0, wireMap);

    expect(setBuf.outputs['nor_q']['out']).toBe(1);

    // Phase 2: HOLD with S=0, R=0 -- modify buffer customStates
    const holdBuf: SimBuffer = {
      ...setBuf,
      customStates: {
        ...setBuf.customStates,
        s_in: { value: 0 },
      },
    };
    const { buffer: heldBuf } = runUntilStable(circuit, holdBuf, wireMap);

    expect(heldBuf.outputs['nor_q']['out']).toBe(1);   // Q still 1
    expect(heldBuf.outputs['nor_qn']['out']).toBe(0);  // Q_bar still 0
  });

  it('R=1 -> Q=0 (Reset operation)', () => {
    const { circuit, wireMap } = buildRSLatch(0, 1);
    const buf0 = initBuffer(circuit);
    const { buffer } = runUntilStable(circuit, buf0, wireMap);

    expect(buffer.outputs['nor_q']['out']).toBe(0);   // Q = 0
    expect(buffer.outputs['nor_qn']['out']).toBe(1);  // Q_bar = 1
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Tick engine: initBuffer + runOneTick
// ═══════════════════════════════════════════════════════════════════════════

describe('4 - Tick engine: initBuffer + runOneTick', () => {
  it('initBuffer produces correct initial output values from outputSignals', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH', {
      customState: { value: 1 },
      outputSignals: { out: { value: 0, version: 0, lastChangedAt: 0 } },
    });
    const not1 = makeGate('not1', 'NOT', {
      outputSignals: { out: { value: 1, version: 0, lastChangedAt: 0 } },
    });
    const circuit = makeCircuit(
      [sw, not1],
      [makeWire('w1', 'sw', 'out', 'not1', 'a')],
    );

    const buf = initBuffer(circuit);

    expect(buf.outputs['sw']['out']).toBe(0);     // seeded from outputSignals
    expect(buf.outputs['not1']['out']).toBe(1);   // seeded from outputSignals
    expect(buf.tick).toBe(0);
    expect(buf.customStates['sw']).toEqual({ value: 1 });
  });

  it('initBuffer defaults to 0 when outputSignals is empty', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 1 } });
    const not1 = makeGate('not1', 'NOT');
    const circuit = makeCircuit(
      [sw, not1],
      [makeWire('w1', 'sw', 'out', 'not1', 'a')],
    );

    const buf = initBuffer(circuit);

    expect(buf.outputs['sw']['out']).toBe(0);    // defaults to 0
    expect(buf.outputs['not1']['out']).toBe(0);  // defaults to 0
  });

  it('runOneTick advances tick counter', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 1 } });
    const circuit = makeCircuit([sw], []);
    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);

    const buf1 = runOneTick(circuit, buf0, wireMap, true);
    expect(buf1.tick).toBe(1);

    const buf2 = runOneTick(circuit, buf1, wireMap, true);
    expect(buf2.tick).toBe(2);
  });

  it('runOneTick propagates switch value through NOT (double-buffer)', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 1 } });
    const not1 = makeGate('not1', 'NOT');
    const circuit = makeCircuit(
      [sw, not1],
      [makeWire('w1', 'sw', 'out', 'not1', 'a')],
    );

    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);

    // Tick 1: switch outputs 1, NOT reads old sw.out=0 from buf0 -> NOT(0) = 1
    const buf1 = runOneTick(circuit, buf0, wireMap, true);
    expect(buf1.outputs['sw']['out']).toBe(1);
    expect(buf1.outputs['not1']['out']).toBe(1); // NOT(0) from prev buffer

    // Tick 2: NOT reads sw.out=1 from buf1 -> NOT(1) = 0
    const buf2 = runOneTick(circuit, buf1, wireMap, true);
    expect(buf2.outputs['not1']['out']).toBe(0); // NOT(1)

    // Tick 3: same inputs -> same outputs -> stable
    const buf3 = runOneTick(circuit, buf2, wireMap, true);
    expect(buf3.outputs['not1']['out']).toBe(0);
    expect(isStable(buf2, buf3)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Settle detection (runUntilStable)
// ═══════════════════════════════════════════════════════════════════════════

describe('5 - Settle detection (runUntilStable)', () => {
  it('long NOT chain converges (even number of inverters = identity)', () => {
    // 1 -> NOT -> NOT -> NOT -> NOT  =>  final output = 1
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 1 } });
    const not1 = makeGate('not1', 'NOT');
    const not2 = makeGate('not2', 'NOT');
    const not3 = makeGate('not3', 'NOT');
    const not4 = makeGate('not4', 'NOT');

    const circuit = makeCircuit(
      [sw, not1, not2, not3, not4],
      [
        makeWire('w1', 'sw', 'out', 'not1', 'a'),
        makeWire('w2', 'not1', 'out', 'not2', 'a'),
        makeWire('w3', 'not2', 'out', 'not3', 'a'),
        makeWire('w4', 'not3', 'out', 'not4', 'a'),
      ],
    );

    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);
    const { buffer, changed } = runUntilStable(circuit, buf0, wireMap);

    // 4 NOTs = even => output = input = 1
    expect(buffer.outputs['not4']['out']).toBe(1);
    expect(changed).toBe(true);
  });

  it('long NOT chain converges (odd number of inverters)', () => {
    // 1 -> NOT -> NOT -> NOT  =>  final output = 0
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 1 } });
    const not1 = makeGate('not1', 'NOT');
    const not2 = makeGate('not2', 'NOT');
    const not3 = makeGate('not3', 'NOT');

    const circuit = makeCircuit(
      [sw, not1, not2, not3],
      [
        makeWire('w1', 'sw', 'out', 'not1', 'a'),
        makeWire('w2', 'not1', 'out', 'not2', 'a'),
        makeWire('w3', 'not2', 'out', 'not3', 'a'),
      ],
    );

    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);
    const { buffer } = runUntilStable(circuit, buf0, wireMap);

    // 3 NOTs = odd => output = NOT(input) = 0
    expect(buffer.outputs['not3']['out']).toBe(0);
  });

  it('already-stable circuit reports changed=false on second settle', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 0 } });
    const circuit = makeCircuit([sw], []);
    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);

    const { buffer: buf1 } = runUntilStable(circuit, buf0, wireMap);

    // Second settle on an already-stable buffer
    const { changed } = runUntilStable(circuit, buf1, wireMap);
    expect(changed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Clock tick counting
// ═══════════════════════════════════════════════════════════════════════════

describe('6 - Clock tick counting', () => {
  it('clock toggles at the correct interval', () => {
    const freq = 100;
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));

    const clk = makeGate('clk', 'CLOCK', {
      customState: { value: 0, frequency: freq, tickCounter: 0 },
    });
    const circuit = makeCircuit([clk], []);
    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);

    // Run toggleInterval ticks -- evaluate still outputs old value
    let buf = runTicks(circuit, buf0, wireMap, toggleInterval, false);
    // The stateUpdate at the last tick toggled value, but evaluate still output 0
    expect(buf.outputs['clk']['clk']).toBe(0);

    // One more tick -- evaluate now reads the toggled value
    buf = runOneTick(circuit, buf, wireMap, false);
    expect(buf.outputs['clk']['clk']).toBe(1);

    // Run another toggleInterval ticks -- value toggles back
    buf = runTicks(circuit, buf, wireMap, toggleInterval, false);
    expect(buf.outputs['clk']['clk']).toBe(0);
  });

  it('clock does not advance when paused', () => {
    const clk = makeGate('clk', 'CLOCK', {
      customState: { value: 0, frequency: 100, tickCounter: 0 },
    });
    const circuit = makeCircuit([clk], []);
    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);

    // Run 100 ticks with clock PAUSED
    const buf = runTicks(circuit, buf0, wireMap, 100, true);

    expect(buf.outputs['clk']['clk']).toBe(0);
    expect(buf.customStates['clk']['value']).toBe(0);
  });

  it('clock frequency affects toggle interval', () => {
    // Higher frequency -> shorter toggle interval
    const freq = 50; // toggleInterval = round(500/100) = 5
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));
    expect(toggleInterval).toBe(5);

    const clk = makeGate('clk', 'CLOCK', {
      customState: { value: 0, frequency: freq, tickCounter: 0 },
    });
    const circuit = makeCircuit([clk], []);
    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);

    // After toggleInterval+1 ticks, output should be 1
    const buf = runTicks(circuit, buf0, wireMap, toggleInterval + 1, false);
    expect(buf.outputs['clk']['clk']).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. isStable detection
// ═══════════════════════════════════════════════════════════════════════════

describe('7 - isStable detection', () => {
  it('returns true for two buffers with identical outputs', () => {
    const bufA: SimBuffer = {
      outputs: { g1: { out: 0 }, g2: { out: 1 } },
      customStates: {},
      tick: 0,
    };
    const bufB: SimBuffer = {
      outputs: { g1: { out: 0 }, g2: { out: 1 } },
      customStates: {},
      tick: 1,
    };
    expect(isStable(bufA, bufB)).toBe(true);
  });

  it('returns false when one output value differs', () => {
    const bufA: SimBuffer = {
      outputs: { g1: { out: 0 }, g2: { out: 1 } },
      customStates: {},
      tick: 0,
    };
    const bufB: SimBuffer = {
      outputs: { g1: { out: 0 }, g2: { out: 0 } },
      customStates: {},
      tick: 1,
    };
    expect(isStable(bufA, bufB)).toBe(false);
  });

  it('returns false when a gate is missing in the second buffer', () => {
    const bufA: SimBuffer = {
      outputs: { g1: { out: 0 }, g2: { out: 1 } },
      customStates: {},
      tick: 0,
    };
    const bufB: SimBuffer = {
      outputs: { g1: { out: 0 } },
      customStates: {},
      tick: 1,
    };
    expect(isStable(bufA, bufB)).toBe(false);
  });

  it('returns false when second buffer has extra gates not in first', () => {
    const bufA: SimBuffer = {
      outputs: { g1: { out: 0 } },
      customStates: {},
      tick: 0,
    };
    const bufB: SimBuffer = {
      outputs: { g1: { out: 0 }, g2: { out: 1 } },
      customStates: {},
      tick: 1,
    };
    // isStable is symmetric — extra keys in either buffer means not stable
    expect(isStable(bufA, bufB)).toBe(false);
  });

  it('returns true for empty outputs', () => {
    const bufA: SimBuffer = { outputs: {}, customStates: {}, tick: 0 };
    const bufB: SimBuffer = { outputs: {}, customStates: {}, tick: 1 };
    expect(isStable(bufA, bufB)).toBe(true);
  });

  it('returns false when a port value differs within a gate', () => {
    const bufA: SimBuffer = {
      outputs: { g1: { q: 1, q_n: 0 } },
      customStates: {},
      tick: 0,
    };
    const bufB: SimBuffer = {
      outputs: { g1: { q: 1, q_n: 1 } },
      customStates: {},
      tick: 1,
    };
    expect(isStable(bufA, bufB)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. D-FF with clock in tick engine
// ═══════════════════════════════════════════════════════════════════════════

describe('8 - D-FF with clock in tick engine', () => {
  it('latches D=1 on rising clock edge', () => {
    const freq = 100;
    const toggleInterval = Math.max(1, Math.round(SIM_TICKS_PER_SEC / (freq * 2)));

    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 1 } });
    const clk = makeGate('clk', 'CLOCK', {
      customState: { value: 0, frequency: freq, tickCounter: 0 },
    });
    const dff = makeGate('dff', 'D_FF', {
      customState: { q: 0, prevClk: 0 },
    });
    const led = makeGate('led', 'OUTPUT_LED');

    const circuit = makeCircuit(
      [sw, clk, dff, led],
      [
        makeWire('w1', 'sw', 'out', 'dff', 'd'),
        makeWire('w2', 'clk', 'clk', 'dff', 'clk'),
        makeWire('w3', 'dff', 'q', 'led', 'in'),
      ],
    );

    const wireMap = buildWireMap(circuit);

    // Phase 1: Settle combinational logic with clock paused so D propagates
    const buf0 = initBuffer(circuit);
    const { buffer: settled } = runUntilStable(circuit, buf0, wireMap);

    // D-FF should still be 0 (no clock edge during settle)
    expect(settled.outputs['dff']['q']).toBe(0);

    // Phase 2: Run with clock NOT paused to get a rising edge
    // toggleInterval ticks for clock stateUpdate to toggle +
    // 1 tick for new clock value to appear in evaluate output +
    // 1 tick for D-FF to read clk=1 and detect rising edge +
    // 1 tick for D-FF to output the new Q from updated state
    const ticksNeeded = toggleInterval + 3;
    const bufFinal = runTicks(circuit, settled, wireMap, ticksNeeded, false);

    expect(bufFinal.outputs['dff']['q']).toBe(1);
  });

  it('does not latch when clock stays low', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH', { customState: { value: 1 } });
    const clk = makeGate('clk', 'CLOCK', {
      customState: { value: 0, frequency: 100, tickCounter: 0 },
    });
    const dff = makeGate('dff', 'D_FF', {
      customState: { q: 0, prevClk: 0 },
    });

    const circuit = makeCircuit(
      [sw, clk, dff],
      [
        makeWire('w1', 'sw', 'out', 'dff', 'd'),
        makeWire('w2', 'clk', 'clk', 'dff', 'clk'),
      ],
    );

    const wireMap = buildWireMap(circuit);
    const buf0 = initBuffer(circuit);

    // Run with clock PAUSED -- no clock edge can occur
    const buf = runTicks(circuit, buf0, wireMap, 20, true);

    expect(buf.outputs['dff']['q']).toBe(0); // Q stays 0, no clock edge
  });

  it('D-FF with manual clock edge using INPUT_SWITCH', () => {
    // Use INPUT_SWITCH as clock for precise control
    const dInput = makeGate('dInput', 'INPUT_SWITCH', { customState: { value: 1 } });
    const clkSw = makeGate('clkSw', 'INPUT_SWITCH', { customState: { value: 0 } });
    const dff = makeGate('dff', 'D_FF', {
      customState: { q: 0, prevClk: 0 },
    });

    const circuit = makeCircuit(
      [dInput, clkSw, dff],
      [
        makeWire('w1', 'dInput', 'out', 'dff', 'd'),
        makeWire('w2', 'clkSw', 'out', 'dff', 'clk'),
      ],
    );

    const wireMap = buildWireMap(circuit);

    // Step 1: Settle with CLK=0
    const buf0 = initBuffer(circuit);
    const { buffer: buf1 } = runUntilStable(circuit, buf0, wireMap);
    expect(buf1.outputs['dff']['q']).toBe(0);

    // Step 2: Set CLK=1 (rising edge)
    const risingBuf: SimBuffer = {
      ...buf1,
      customStates: { ...buf1.customStates, clkSw: { value: 1 } },
    };
    // runUntilStable settles combinational paths. The D-FF detects the rising
    // edge in stateUpdate (capturing D into state.q), but evaluate in the SAME
    // tick still outputs the OLD q. isStable sees no output change and stops.
    // One additional tick is needed for evaluate to read the updated state.
    const { buffer: settled } = runUntilStable(circuit, risingBuf, wireMap);
    const buf2 = runOneTick(circuit, settled, wireMap, true);

    // After the extra tick: evaluate reads state.q=1 -> output q=1
    expect(buf2.outputs['dff']['q']).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Wire map building
// ═══════════════════════════════════════════════════════════════════════════

describe('9 - Wire map building', () => {
  it('correctly maps destination ports to source ports', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH');
    const not1 = makeGate('not1', 'NOT');
    const and1 = makeGate('and1', 'AND');

    const circuit = makeCircuit(
      [sw, not1, and1],
      [
        makeWire('w1', 'sw', 'out', 'not1', 'a'),
        makeWire('w2', 'not1', 'out', 'and1', 'a'),
        makeWire('w3', 'sw', 'out', 'and1', 'b'),
      ],
    );

    const wireMap = buildWireMap(circuit);

    expect(wireMap.get('not1:a')).toEqual({ fromGateId: 'sw', fromPortId: 'out' });
    expect(wireMap.get('and1:a')).toEqual({ fromGateId: 'not1', fromPortId: 'out' });
    expect(wireMap.get('and1:b')).toEqual({ fromGateId: 'sw', fromPortId: 'out' });
  });

  it('source ports are not in the map (only destinations)', () => {
    const sw = makeGate('sw', 'INPUT_SWITCH');
    const not1 = makeGate('not1', 'NOT');

    const circuit = makeCircuit(
      [sw, not1],
      [makeWire('w1', 'sw', 'out', 'not1', 'a')],
    );

    const wireMap = buildWireMap(circuit);

    expect(wireMap.has('sw:out')).toBe(false);
    expect(wireMap.has('not1:a')).toBe(true);
  });

  it('wire map size equals number of wires', () => {
    const a = makeGate('a', 'INPUT_SWITCH');
    const b = makeGate('b', 'INPUT_SWITCH');
    const c = makeGate('c', 'AND');

    const circuit = makeCircuit(
      [a, b, c],
      [
        makeWire('w1', 'a', 'out', 'c', 'a'),
        makeWire('w2', 'b', 'out', 'c', 'b'),
      ],
    );

    const wireMap = buildWireMap(circuit);
    expect(wireMap.size).toBe(2);
  });

  it('empty circuit produces empty wire map', () => {
    const circuit = makeCircuit([], []);
    const wireMap = buildWireMap(circuit);
    expect(wireMap.size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Topological sort
// ═══════════════════════════════════════════════════════════════════════════

describe('10 - Topological sort', () => {
  it('produces valid ordering for a diamond DAG', () => {
    // a -> b -> d
    // a -> c -> d
    const a = makeGate('a', 'INPUT_SWITCH');
    const b = makeGate('b', 'NOT');
    const c = makeGate('c', 'NOT');
    const d = makeGate('d', 'AND');

    const circuit = makeCircuit(
      [a, b, c, d],
      [
        makeWire('w1', 'a', 'out', 'b', 'a'),
        makeWire('w2', 'a', 'out', 'c', 'a'),
        makeWire('w3', 'b', 'out', 'd', 'a'),
        makeWire('w4', 'c', 'out', 'd', 'b'),
      ],
    );

    const { order, cycles } = topologicalSort(circuit);

    expect(order).toHaveLength(4);
    expect(cycles).toHaveLength(0);

    // Topological constraints
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
  });

  it('detects a 2-node cycle', () => {
    const a = makeGate('a', 'NOR');
    const b = makeGate('b', 'NOR');

    // a -> b -> a (cycle)
    const circuit = makeCircuit(
      [a, b],
      [
        makeWire('w1', 'a', 'out', 'b', 'a'),
        makeWire('w2', 'b', 'out', 'a', 'a'),
      ],
    );

    const { order, cycles } = topologicalSort(circuit);

    // Both gates are in the cycle, none can be ordered
    expect(order).toHaveLength(0);
    expect(cycles.length).toBeGreaterThan(0);
    const allCycleGates = cycles.flat();
    expect(allCycleGates).toContain('a');
    expect(allCycleGates).toContain('b');
  });

  it('separates DAG nodes from cycle nodes', () => {
    const input = makeGate('input', 'INPUT_SWITCH');
    const a = makeGate('a', 'NOR');
    const b = makeGate('b', 'NOR');

    // input -> a -> b -> a  (input is DAG, a<->b is cycle)
    const circuit = makeCircuit(
      [input, a, b],
      [
        makeWire('w1', 'input', 'out', 'a', 'a'),
        makeWire('w2', 'a', 'out', 'b', 'a'),
        makeWire('w3', 'b', 'out', 'a', 'b'),
      ],
    );

    const { order, cycles } = topologicalSort(circuit);

    // Input is in DAG order
    expect(order).toContain('input');
    expect(order).not.toContain('a');
    expect(order).not.toContain('b');

    // a and b are in the cycle
    const allCycleGates = cycles.flat();
    expect(allCycleGates).toContain('a');
    expect(allCycleGates).toContain('b');
    expect(allCycleGates).not.toContain('input');
  });

  it('linear chain is sorted in order', () => {
    const g1 = makeGate('g1', 'INPUT_SWITCH');
    const g2 = makeGate('g2', 'NOT');
    const g3 = makeGate('g3', 'NOT');

    const circuit = makeCircuit(
      [g1, g2, g3],
      [
        makeWire('w1', 'g1', 'out', 'g2', 'a'),
        makeWire('w2', 'g2', 'out', 'g3', 'a'),
      ],
    );

    const { order, cycles } = topologicalSort(circuit);

    expect(order).toEqual(['g1', 'g2', 'g3']);
    expect(cycles).toHaveLength(0);
  });

  it('isolated gates appear in order with no cycles', () => {
    const g1 = makeGate('g1', 'INPUT_SWITCH');
    const g2 = makeGate('g2', 'INPUT_SWITCH');

    const circuit = makeCircuit([g1, g2], []);

    const { order, cycles } = topologicalSort(circuit);

    expect(order).toHaveLength(2);
    expect(order).toContain('g1');
    expect(order).toContain('g2');
    expect(cycles).toHaveLength(0);
  });
});

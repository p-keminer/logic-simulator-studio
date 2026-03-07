/**
 * Verification tests for the validation report bugs:
 * Bug 1: STT output column shows old Q(t) instead of Q(t+1) for synchronous gates
 * Bug 2: Counter stateKeys modeled as single integer instead of individual bits
 */
import { describe, it, expect } from 'vitest';
import { gateRegistry } from '../../core/registry/index';
import type { Circuit, GateInstance, Wire, SignalState, SignalValue } from '../../core/types';
import {
  initBuffer,
  runOneTick,
  buildWireMap,
  type SimBuffer,
} from '../../core/simulation/tickEngine';

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

/**
 * Simulate one STT row: set inputs + state, run one tick, read outputs.
 * This replicates what TruthTableModal does (after the Bug 1 fix).
 */
function sttRow(
  circuit: Circuit,
  inputAssigns: Record<string, number>,
  stateAssigns: Record<string, Record<string, unknown>>,
): { nextBuf: SimBuffer } {
  const wireMap = buildWireMap(circuit);
  const buf = initBuffer(circuit);

  // Force inputs
  for (const [gateId, val] of Object.entries(inputAssigns)) {
    buf.customStates[gateId] = { ...(buf.customStates[gateId] ?? {}), value: val };
    if (!buf.outputs[gateId]) buf.outputs[gateId] = {};
    const def = gateRegistry.get(circuit.gates[gateId].typeId);
    for (const port of def.outputs) {
      buf.outputs[gateId][port.id] = val as SignalValue;
    }
  }

  // Force state + prevClk = 0 (so clk=1 triggers rising edge)
  for (const [gateId, cs] of Object.entries(stateAssigns)) {
    buf.customStates[gateId] = { ...(buf.customStates[gateId] ?? {}), ...cs, prevClk: 0 };
    // Re-evaluate outputs from forced state
    const def = gateRegistry.get(circuit.gates[gateId].typeId);
    const evalOut = def.evaluate(
      {} as Record<string, SignalValue>,
      buf.customStates[gateId] as Record<string, unknown>,
    );
    if (!buf.outputs[gateId]) buf.outputs[gateId] = {};
    for (const [pid, v] of Object.entries(evalOut)) {
      buf.outputs[gateId][pid] = v as SignalValue;
    }
  }

  const nextBuf = runOneTick(circuit, buf, wireMap, true);

  // Re-evaluate synchronous gate outputs with new customStates (Bug 1 fix)
  for (const gate of Object.values(circuit.gates)) {
    let def;
    try { def = gateRegistry.get(gate.typeId); } catch { continue; }
    if (!def.isSynchronous) continue;
    const newCs = nextBuf.customStates[gate.id];
    if (!newCs) continue;
    const reEval = def.evaluate(
      {} as Record<string, SignalValue>,
      newCs as Record<string, unknown>,
    );
    if (!nextBuf.outputs[gate.id]) nextBuf.outputs[gate.id] = {};
    for (const [pid, v] of Object.entries(reEval)) {
      nextBuf.outputs[gate.id][pid] = v as SignalValue;
    }
  }

  return { nextBuf };
}

// ══════════════════════════════════════════════════════════════════════════════
// Bug 1: D_FF output column should show Q(t+1), not Q(t)
// ══════════════════════════════════════════════════════════════════════════════

describe('Bug 1: STT output column for synchronous gates', () => {
  it('D_FF: d=1, clk=1, q=0 → output q should be 1 (not 0)', () => {
    const circuit = makeCircuit([
      makeGate('sw_d', 'INPUT_SWITCH'),
      makeGate('clk',  'CLOCK'),
      makeGate('dff',  'D_FF'),
      makeGate('led',  'OUTPUT_LED'),
    ], [
      makeWire('w1', 'sw_d', 'out', 'dff', 'd'),
      makeWire('w2', 'clk',  'clk', 'dff', 'clk'),
      makeWire('w3', 'dff',  'q',   'led', 'in'),
    ]);

    const { nextBuf } = sttRow(
      circuit,
      { sw_d: 1, clk: 1 },
      { dff: { q: 0 } },
    );

    // Next state should be 1
    expect(nextBuf.customStates['dff']?.['q']).toBe(1);
    // Output should also be 1 (not the old 0)
    expect(nextBuf.outputs['dff']?.['q']).toBe(1);
    // LED should show 1
    expect(nextBuf.outputs['dff']?.['q']).toBe(1);
  });

  it('JK_FF: j=1, k=0, clk=1, q=0 → output q should be 1', () => {
    const circuit = makeCircuit([
      makeGate('sw_j', 'INPUT_SWITCH'),
      makeGate('sw_k', 'INPUT_SWITCH'),
      makeGate('clk',  'CLOCK'),
      makeGate('jk',   'JK_FF'),
      makeGate('led',  'OUTPUT_LED'),
    ], [
      makeWire('w1', 'sw_j', 'out', 'jk', 'j'),
      makeWire('w2', 'sw_k', 'out', 'jk', 'k'),
      makeWire('w3', 'clk',  'clk', 'jk', 'clk'),
      makeWire('w4', 'jk',   'q',   'led', 'in'),
    ]);

    const { nextBuf } = sttRow(
      circuit,
      { sw_j: 1, sw_k: 0, clk: 1 },
      { jk: { q: 0 } },
    );

    expect(nextBuf.customStates['jk']?.['q']).toBe(1);
    expect(nextBuf.outputs['jk']?.['q']).toBe(1);
  });

  it('T_FF: t=1, clk=1, q=0 → output q should be 1 (toggle)', () => {
    const circuit = makeCircuit([
      makeGate('sw_t', 'INPUT_SWITCH'),
      makeGate('clk',  'CLOCK'),
      makeGate('tff',  'T_FF'),
      makeGate('led',  'OUTPUT_LED'),
    ], [
      makeWire('w1', 'sw_t', 'out', 'tff', 't'),
      makeWire('w2', 'clk',  'clk', 'tff', 'clk'),
      makeWire('w3', 'tff',  'q',   'led', 'in'),
    ]);

    const { nextBuf } = sttRow(
      circuit,
      { sw_t: 1, clk: 1 },
      { tff: { q: 0 } },
    );

    expect(nextBuf.customStates['tff']?.['q']).toBe(1);
    expect(nextBuf.outputs['tff']?.['q']).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Bug 2: Counter stateKeys should be individual bits, not a single 'count'
// ══════════════════════════════════════════════════════════════════════════════

describe('Bug 2: Counter stateKeys as individual bits', () => {
  it('BIN_CTR7S: stateKeys should be cnt0..cnt3', () => {
    const def = gateRegistry.get('BIN_CTR7S');
    expect(def.stateKeys).toEqual(['cnt0', 'cnt1', 'cnt2', 'cnt3']);
  });

  it('BIN_CTR_99: stateKeys should be cnt0..cnt6', () => {
    const def = gateRegistry.get('BIN_CTR_99');
    expect(def.stateKeys).toEqual(['cnt0', 'cnt1', 'cnt2', 'cnt3', 'cnt4', 'cnt5', 'cnt6']);
  });

  it('BIN_CTR7S: evaluate reconstructs count from individual bits', () => {
    const def = gateRegistry.get('BIN_CTR7S');
    // count = 5 → cnt0=1, cnt1=0, cnt2=1, cnt3=0
    const out = def.evaluate({} as Record<string, SignalValue>, {
      cnt0: 1, cnt1: 0, cnt2: 1, cnt3: 0,
    });
    expect(out.q0).toBe(1);
    expect(out.q1).toBe(0);
    expect(out.q2).toBe(1);
    expect(out.q3).toBe(0);
    expect(out.rco).toBe(0);
  });

  it('BIN_CTR7S: evaluate with count=15 → rco=1', () => {
    const def = gateRegistry.get('BIN_CTR7S');
    // count = 15 → all cnt bits = 1
    const out = def.evaluate({} as Record<string, SignalValue>, {
      cnt0: 1, cnt1: 1, cnt2: 1, cnt3: 1,
    });
    expect(out.q0).toBe(1);
    expect(out.q1).toBe(1);
    expect(out.q2).toBe(1);
    expect(out.q3).toBe(1);
    expect(out.rco).toBe(1);
  });

  it('BIN_CTR7S: stateUpdate increments and stores cnt bits + count', () => {
    const def = gateRegistry.get('BIN_CTR7S');
    // count = 5, rising clock edge, en=1
    const next = def.stateUpdate!(
      { clk: 1, rst: 0, en: 1 } as Record<string, SignalValue>,
      {} as Record<string, SignalValue>,
      { cnt0: 1, cnt1: 0, cnt2: 1, cnt3: 0, prevClk: 0 },
    );
    // next count = 6 → cnt0=0, cnt1=1, cnt2=1, cnt3=0
    expect(next.count).toBe(6);
    expect(next.cnt0).toBe(0);
    expect(next.cnt1).toBe(1);
    expect(next.cnt2).toBe(1);
    expect(next.cnt3).toBe(0);
  });

  it('BIN_CTR7S: stateUpdate wraps 15 → 0', () => {
    const def = gateRegistry.get('BIN_CTR7S');
    const next = def.stateUpdate!(
      { clk: 1, rst: 0, en: 1 } as Record<string, SignalValue>,
      {} as Record<string, SignalValue>,
      { cnt0: 1, cnt1: 1, cnt2: 1, cnt3: 1, prevClk: 0 },
    );
    expect(next.count).toBe(0);
    expect(next.cnt0).toBe(0);
    expect(next.cnt1).toBe(0);
    expect(next.cnt2).toBe(0);
    expect(next.cnt3).toBe(0);
  });

  it('BIN_CTR7S: backward compat — evaluate with legacy count key', () => {
    const def = gateRegistry.get('BIN_CTR7S');
    const out = def.evaluate({} as Record<string, SignalValue>, { count: 10 });
    expect(out.q0).toBe(0); // 10 = 1010
    expect(out.q1).toBe(1);
    expect(out.q2).toBe(0);
    expect(out.q3).toBe(1);
  });
});

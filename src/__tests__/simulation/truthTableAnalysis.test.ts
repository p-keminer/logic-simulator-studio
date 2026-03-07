import { describe, expect, it } from 'vitest';
import { gateRegistry } from '../../core/registry/index';
import type { Circuit, GateInstance, SignalState, Wire } from '../../core/types';
import {
  chooseRepresentativeStateVar,
  collectConnectedGateIds,
  collectStateVarsForStt,
  collectSttFeedbackGateIds,
} from '../../components/panels/truthTableAnalysis';

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  opts?: {
    x?: number;
    y?: number;
    label?: string;
    customState?: Record<string, unknown>;
    outputSignals?: Record<string, SignalState>;
  },
): GateInstance {
  return {
    id,
    typeId,
    x: opts?.x ?? 0,
    y: opts?.y ?? 0,
    label: opts?.label,
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
    id: 'truth-table-analysis-test',
    name: 'TruthTable Analysis Test',
    version: '1.0.0',
    gates: Object.fromEntries(gates.map(g => [g.id, g])),
    wires: Object.fromEntries(wires.map(w => [w.id, w])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-08', updatedAt: '2026-03-08' },
  };
}

describe('truthTableAnalysis', () => {
  it('excludes CLOCK from STT feedback state gates even though CLOCK has stateUpdate', () => {
    const circuit = makeCircuit([
      makeGate('clk', 'CLOCK', { x: 0 }),
      makeGate('ff1', 'JK_FF_ASSR', { x: 100 }),
      makeGate('ff2', 'JK_FF_ASSR', { x: 200 }),
      makeGate('ff3', 'JK_FF_ASSR', { x: 300 }),
      makeGate('led1', 'OUTPUT_LED'),
      makeGate('led2', 'OUTPUT_LED'),
      makeGate('led3', 'OUTPUT_LED'),
      makeGate('high', 'CONST_HIGH'),
      makeGate('low', 'CONST_LOW'),
    ], [
      makeWire('w1', 'clk', 'clk', 'ff1', 'clk'),
      makeWire('w2', 'clk', 'clk', 'ff2', 'clk'),
      makeWire('w3', 'clk', 'clk', 'ff3', 'clk'),
      makeWire('w4', 'high', 'out', 'ff1', 'j'),
      makeWire('w5', 'low', 'out', 'ff1', 'k'),
      makeWire('w6', 'ff1', 'q', 'led1', 'in'),
      makeWire('w7', 'ff2', 'q', 'led2', 'in'),
      makeWire('w8', 'ff3', 'q', 'led3', 'in'),
    ]);

    const connectedIds = collectConnectedGateIds(circuit);
    const feedbackGateIds = collectSttFeedbackGateIds(circuit, connectedIds, [], gateRegistry.get.bind(gateRegistry));

    expect(feedbackGateIds.has('clk')).toBe(false);
    expect(feedbackGateIds.has('ff1')).toBe(true);
    expect(feedbackGateIds.has('ff2')).toBe(true);
    expect(feedbackGateIds.has('ff3')).toBe(true);
  });

  it('collects only visible FF state bits for a modulo-like counter circuit', () => {
    const circuit = makeCircuit([
      makeGate('clk', 'CLOCK', { x: 0 }),
      makeGate('ff1', 'JK_FF_ASSR', { x: 100 }),
      makeGate('ff2', 'JK_FF_ASSR', { x: 200 }),
      makeGate('ff3', 'JK_FF_ASSR', { x: 300 }),
      makeGate('j1', 'JUNCTION', { x: 150 }),
      makeGate('led1', 'OUTPUT_LED'),
    ], [
      makeWire('w1', 'clk', 'clk', 'ff1', 'clk'),
      makeWire('w2', 'clk', 'clk', 'ff2', 'clk'),
      makeWire('w3', 'clk', 'clk', 'ff3', 'clk'),
      makeWire('w4', 'ff1', 'q', 'j1', 'in'),
      makeWire('w5', 'j1', 'y0', 'ff2', 'j'),
      makeWire('w6', 'j1', 'y1', 'ff2', 'k'),
      makeWire('w7', 'ff1', 'q', 'led1', 'in'),
    ]);

    const connectedIds = collectConnectedGateIds(circuit);
    const feedbackGateIds = collectSttFeedbackGateIds(circuit, connectedIds, [], gateRegistry.get.bind(gateRegistry));
    const stateVars = collectStateVarsForStt(circuit, connectedIds, feedbackGateIds, gateRegistry.get.bind(gateRegistry));

    expect(stateVars).toHaveLength(3);
    expect(stateVars.map(v => v.stateKey)).toEqual(['q', 'q', 'q']);
    expect(stateVars.every(v => v.gateId.startsWith('ff'))).toBe(true);
  });

  it('prefers q-style state keys over counter and clock-like keys', () => {
    const representative = chooseRepresentativeStateVar([
      { gateId: 'clock', portId: 'value', stateKey: 'value', label: 'CLOCK_abcd' },
      { gateId: 'counter', portId: 'cnt0', stateKey: 'cnt0', label: 'CTR.cnt0' },
      { gateId: 'ff', portId: 'q', stateKey: 'q', label: 'DFF.q' },
    ]);

    expect(representative.gateId).toBe('ff');
    expect(representative.stateKey).toBe('q');
  });

  it('drops unstructured feedback helper nodes when structured state gates exist', () => {
    const circuit = makeCircuit([
      makeGate('ff', 'D_FF', { x: 100 }),
      makeGate('not1', 'NOT', { x: 200 }),
    ], []);

    const connectedIds = new Set(['ff', 'not1']);
    const feedbackGateIds = new Set(['ff', 'not1']);
    const stateVars = collectStateVarsForStt(circuit, connectedIds, feedbackGateIds, gateRegistry.get.bind(gateRegistry));

    expect(stateVars).toHaveLength(1);
    expect(stateVars[0].gateId).toBe('ff');
    expect(stateVars[0].stateKey).toBe('q');
  });

  it('still allows unstructured feedback states when no structured state gate exists', () => {
    const circuit = makeCircuit([
      makeGate('not1', 'NOT', { x: 100 }),
    ], []);

    const connectedIds = new Set(['not1']);
    const feedbackGateIds = new Set(['not1']);
    const stateVars = collectStateVarsForStt(circuit, connectedIds, feedbackGateIds, gateRegistry.get.bind(gateRegistry));

    expect(stateVars).toHaveLength(1);
    expect(stateVars[0].gateId).toBe('not1');
    expect(stateVars[0].stateKey).toBe('out');
  });
});

import { describe, expect, it } from 'vitest';
import { gateRegistry } from '../../core/registry/index';
import type { Circuit, GateInstance, SignalState, Wire } from '../../core/types';
import {
  buildSequentialProjectionChannels,
  buildStateTransitionProjection,
} from '../../core/analysis/sequentialProjection';
import {
  chooseRepresentativeStateVar,
  classifyStateTransitionInputs,
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
    projection?: GateInstance['projection'];
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
    projection: opts?.projection,
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

  it('projects isolated synthesized FSM STT entities onto canonical inputs, states, and outputs', () => {
    const circuit = makeCircuit([
      makeGate('clk', 'CLOCK', {
        label: 'CLK',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'clock',
          visibility: 'canonical',
          signalLabel: 'CLK',
          groupKey: 'clock:CLK',
          signalPortId: 'clk',
        },
      }),
      makeGate('rst', 'INPUT_SWITCH', {
        label: 'RST',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'reset',
          visibility: 'canonical',
          signalLabel: 'RST',
          groupKey: 'reset:RST',
          signalPortId: 'out',
        },
      }),
      makeGate('inA', 'INPUT_SWITCH', {
        label: 'A',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'input',
          visibility: 'canonical',
          signalLabel: 'A',
          groupKey: 'input:A',
          signalPortId: 'out',
        },
      }),
      makeGate('q0', 'D_FF_R', {
        label: 'Q0',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'state',
          visibility: 'canonical',
          signalLabel: 'Q0',
          groupKey: 'state:Q0',
          signalPortId: 'q',
        },
      }),
      makeGate('q0_inv', 'NOT', {
        label: '!Q0',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'state_inverted',
          visibility: 'derived',
          signalLabel: '!Q0',
          groupKey: 'state:Q0',
        },
      }),
      makeGate('outY', 'OUTPUT_LED', {
        label: 'Y',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'output',
          visibility: 'canonical',
          signalLabel: 'Y',
          groupKey: 'output:Y',
          signalPortId: '_display',
        },
      }),
      makeGate('stateLed', 'OUTPUT_LED', {
        label: 'Q0',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'display_mirror',
          visibility: 'derived',
          signalLabel: 'Q0',
          groupKey: 'state:Q0',
          signalPortId: '_display',
        },
      }),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'inA', 'out', 'q0', 'd'),
      makeWire('w3', 'q0', 'q', 'outY', 'in'),
    ]);

    const inputs = [circuit.gates.clk, circuit.gates.rst, circuit.gates.inA];
    const stateVars = [{ gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' }];
    const outputGates = [circuit.gates.outY, circuit.gates.stateLed];

    const projected = buildStateTransitionProjection(circuit, inputs, stateVars, outputGates);

    expect(projected.isProjectedFsmView).toBe(true);
    expect(projected.projectionStatus).toBe('projected');
    expect(projected.inputs.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A']);
    expect(projected.stateVars.map((stateVar) => stateVar.label)).toEqual(['Q0']);
    expect(projected.outputGates.map((gate) => gate.label)).toEqual(['Y']);
  });

  it('falls back to generic STT view when projected and non-projected state gates are mixed', () => {
    const circuit = makeCircuit([
      makeGate('clk', 'CLOCK', {
        label: 'CLK',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'clock',
          visibility: 'canonical',
          signalLabel: 'CLK',
          groupKey: 'clock:CLK',
          signalPortId: 'clk',
        },
      }),
      makeGate('q0', 'D_FF_R', {
        label: 'Q0',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'state',
          visibility: 'canonical',
          signalLabel: 'Q0',
          groupKey: 'state:Q0',
          signalPortId: 'q',
        },
      }),
      makeGate('plain_ff', 'D_FF', { label: 'PLAIN' }),
      makeGate('outY', 'OUTPUT_LED', {
        label: 'Y',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'output',
          visibility: 'canonical',
          signalLabel: 'Y',
          groupKey: 'output:Y',
          signalPortId: '_display',
        },
      }),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'q0', 'q', 'plain_ff', 'd'),
      makeWire('w3', 'q0', 'q', 'outY', 'in'),
    ]);

    const inputs = [circuit.gates.clk];
    const stateVars = [
      { gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' },
      { gateId: 'plain_ff', portId: 'q', stateKey: 'q', label: 'PLAIN' },
    ];
    const outputGates = [circuit.gates.outY];

    const projected = buildStateTransitionProjection(circuit, inputs, stateVars, outputGates);

    expect(projected.isProjectedFsmView).toBe(false);
    expect(projected.projectionStatus).toBe('fallback_partial_state');
    expect(projected.stateVars.map((stateVar) => stateVar.label)).toEqual(['Q0', 'PLAIN']);
  });

  it('keeps fallback STT selection unchanged for non-projected sequential circuits', () => {
    const circuit = makeCircuit([
      makeGate('clk', 'CLOCK', { label: 'CLK' }),
      makeGate('ff', 'D_FF', { label: 'FF' }),
      makeGate('outY', 'OUTPUT_LED', { label: 'Y' }),
    ], []);

    const inputs = [circuit.gates.clk];
    const stateVars = [{ gateId: 'ff', portId: 'q', stateKey: 'q', label: 'FF' }];
    const outputGates = [circuit.gates.outY];

    const projected = buildStateTransitionProjection(circuit, inputs, stateVars, outputGates);

    expect(projected.isProjectedFsmView).toBe(false);
    expect(projected.projectionStatus).toBe('fallback_unprojected');
    expect(projected.inputs).toBe(inputs);
    expect(projected.stateVars).toBe(stateVars);
    expect(projected.outputGates).toBe(outputGates);
  });

  it('falls back when projected FSM outputs are mixed with raw outputs and disables timing projection too', () => {
    const circuit = makeCircuit([
      makeGate('clk', 'CLOCK', {
        label: 'CLK',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-2',
          role: 'clock',
          visibility: 'canonical',
          signalLabel: 'CLK',
          groupKey: 'clock:CLK',
          signalPortId: 'clk',
        },
      }),
      makeGate('q0', 'D_FF_R', {
        label: 'Q0',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-2',
          role: 'state',
          visibility: 'canonical',
          signalLabel: 'Q0',
          groupKey: 'state:Q0',
          signalPortId: 'q',
        },
      }),
      makeGate('outY', 'OUTPUT_LED', {
        label: 'Y',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-2',
          role: 'output',
          visibility: 'canonical',
          signalLabel: 'Y',
          groupKey: 'output:Y',
          signalPortId: '_display',
        },
      }),
      makeGate('rawLed', 'OUTPUT_LED', { label: 'RAW' }),
    ], [
      makeWire('w1', 'clk', 'clk', 'q0', 'clk'),
      makeWire('w2', 'q0', 'q', 'outY', 'in'),
      makeWire('w3', 'q0', 'q', 'rawLed', 'in'),
    ]);

    const inputs = [circuit.gates.clk];
    const stateVars = [{ gateId: 'q0', portId: 'q', stateKey: 'q', label: 'Q0' }];
    const outputGates = [circuit.gates.outY, circuit.gates.rawLed];

    const projected = buildStateTransitionProjection(circuit, inputs, stateVars, outputGates);

    expect(projected.isProjectedFsmView).toBe(false);
    expect(projected.projectionStatus).toBe('fallback_partial_outputs');
    expect(buildSequentialProjectionChannels(circuit)).toEqual([]);
  });

  it('treats projected FSM inputs as control inputs in reduced STT mode', () => {
    const circuit = makeCircuit([
      makeGate('clk', 'CLOCK', {
        label: 'CLK',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'clock',
          visibility: 'canonical',
          signalLabel: 'CLK',
          groupKey: 'clock:CLK',
          signalPortId: 'clk',
        },
      }),
      makeGate('rst', 'INPUT_SWITCH', {
        label: 'RST',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'reset',
          visibility: 'canonical',
          signalLabel: 'RST',
          groupKey: 'reset:RST',
          signalPortId: 'out',
        },
      }),
      makeGate('inA', 'INPUT_SWITCH', {
        label: 'A',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-1',
          role: 'input',
          visibility: 'canonical',
          signalLabel: 'A',
          groupKey: 'input:A',
          signalPortId: 'out',
        },
      }),
    ], []);

    const classified = classifyStateTransitionInputs(
      [circuit.gates.clk, circuit.gates.rst, circuit.gates.inA],
      circuit,
      { isProjectedFsmView: true },
    );

    expect(classified.controls.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A']);
    expect(classified.data).toEqual([]);
  });

  it('keeps wide projected FSM inputs on the control side for reduced STT classification', () => {
    const projectedInputs = [
      makeGate('clk', 'CLOCK', {
        label: 'CLK',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-wide',
          role: 'clock',
          visibility: 'canonical',
          signalLabel: 'CLK',
          groupKey: 'clock:CLK',
          signalPortId: 'clk',
        },
      }),
      makeGate('rst', 'INPUT_SWITCH', {
        label: 'RST',
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-wide',
          role: 'reset',
          visibility: 'canonical',
          signalLabel: 'RST',
          groupKey: 'reset:RST',
          signalPortId: 'out',
        },
      }),
      ...Array.from({ length: 7 }, (_, index) => makeGate(`in${index}`, 'INPUT_SWITCH', {
        label: `A${index}`,
        projection: {
          sourceSystem: 'fsm_synth',
          projectionBatchId: 'batch-wide',
          role: 'input',
          visibility: 'canonical',
          signalLabel: `A${index}`,
          groupKey: `input:A${index}`,
          signalPortId: 'out',
        },
      })),
    ];

    const classified = classifyStateTransitionInputs(
      projectedInputs,
      makeCircuit(projectedInputs, []),
      { isProjectedFsmView: true },
    );

    expect(classified.controls.map((gate) => gate.label)).toEqual(['CLK', 'RST', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
    expect(classified.data).toEqual([]);
  });
});

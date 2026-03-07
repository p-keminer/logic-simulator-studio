import type {
  Circuit,
  SignalState,
  SignalValue,
  SimulationResult,
  Wire,
} from '../types';
import { gateRegistry } from '../registry/GateRegistry';
import { topologicalSort } from './topologicalSort';

export function makeSignal(value: SignalValue, prev?: SignalState): SignalState {
  const changed = prev === undefined || prev.value !== value;
  return {
    value,
    version: prev ? (changed ? prev.version + 1 : prev.version) : 0,
    lastChangedAt: changed ? Date.now() : (prev?.lastChangedAt ?? Date.now()),
  };
}

function buildInputWireMap(circuit: Circuit): Map<string, Wire> {
  const map = new Map<string, Wire>();
  for (const wire of Object.values(circuit.wires)) {
    map.set(`${wire.to.gateId}:${wire.to.portId}`, wire);
  }
  return map;
}

/**
 * Run one full combinational simulation pass.
 * Returns updated signals for all gates and wires.
 */
export function runSimulation(circuit: Circuit): SimulationResult {
  const { order, cycles } = topologicalSort(circuit);
  const inputWireMap = buildInputWireMap(circuit);

  const resolvedOutputs = new Map<string, Record<string, SignalState>>();
  for (const gate of Object.values(circuit.gates)) {
    resolvedOutputs.set(gate.id, { ...gate.outputSignals });
  }

  const customStateUpdates: Record<string, Record<string, unknown>> = {};

  for (const gateId of order) {
    const gate = circuit.gates[gateId];
    if (!gate) continue;

    try {
      const definition = gateRegistry.get(gate.typeId);
      const inputValues: Record<string, SignalValue> = {};

      for (const inputPort of definition.inputs) {
        const wire = inputWireMap.get(`${gateId}:${inputPort.id}`);
        if (wire) {
          const upstreamOutputs = resolvedOutputs.get(wire.from.gateId);
          const raw = upstreamOutputs?.[wire.from.portId]?.value ?? 0;
          // Sanitize hi-Z (2) → 0 so gate evaluate functions only see 0|1
          inputValues[inputPort.id] = (raw === 2 ? 0 : raw) as SignalValue;
        } else {
          inputValues[inputPort.id] = (definition.defaultInputValues?.[inputPort.id] ?? 0);
        }
      }

      const outputValues = definition.evaluate(inputValues, gate.customState);

      // Stateful gates (flip-flops, registers) compute next state
      if (definition.stateUpdate) {
        customStateUpdates[gateId] = definition.stateUpdate(inputValues, outputValues, gate.customState);
      }

      const newOutputSignals: Record<string, SignalState> = {};
      for (const [portId, value] of Object.entries(outputValues)) {
        newOutputSignals[portId] = makeSignal(value as SignalValue, gate.outputSignals[portId]);
      }

      resolvedOutputs.set(gateId, newOutputSignals);
    } catch { /* unknown gate type — skip silently */ }
  }

  const wireSignals: Record<string, SignalState> = {};
  for (const wire of Object.values(circuit.wires)) {
    const upstreamOutputs = resolvedOutputs.get(wire.from.gateId);
    const newValue = (upstreamOutputs?.[wire.from.portId]?.value ?? 0) as SignalValue;
    wireSignals[wire.id] = makeSignal(newValue, wire.signal);
  }

  const gateSignals: Record<string, Record<string, SignalState>> = {};
  for (const [gateId, signals] of resolvedOutputs) {
    gateSignals[gateId] = signals;
  }

  return { gateSignals, wireSignals, customStateUpdates, cycles, evaluationOrder: order };
}

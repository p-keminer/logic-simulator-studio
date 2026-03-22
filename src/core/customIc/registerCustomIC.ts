import { gateRegistry } from '../registry/GateRegistry';
import { runSimulation } from '../simulation/engine';
import type { Circuit, SignalValue } from '../types';
import { FlipFlopShape } from '../../gates/shapes/FlipFlopShape';
import { toCustomIcTypeId } from './customIcTypeId';

function buildSubcircuitCopy(
  subcircuit: Circuit,
  inputGates: { id: string }[],
  inputs: Record<string, SignalValue>,
  innerStates: Record<string, Record<string, unknown>>,
): Circuit {
  return {
    ...subcircuit,
    gates: Object.fromEntries(
      Object.entries(subcircuit.gates).map(([id, g]) => {
        const idx = inputGates.findIndex((ig) => ig.id === id);
        if (idx >= 0) {
          const val = (inputs[`i${idx}`] ?? 0) as 0 | 1;
          return [id, { ...g, customState: { ...g.customState, value: val } }];
        }
        if (innerStates[id]) {
          return [id, { ...g, customState: { ...innerStates[id] } }];
        }
        return [id, g];
      }),
    ),
  };
}

export function registerCustomIC(
  name: string,
  subcircuit: Circuit,
  portNames?: string[],
  options?: { replace?: boolean },
) {
  const typeId = toCustomIcTypeId(name);
  if (gateRegistry.has(typeId)) {
    if (!options?.replace) return;
    gateRegistry.unregister(typeId);
  }

  const inputGates = Object.values(subcircuit.gates).filter((g) => g.typeId === 'INPUT_SWITCH');
  const outputGates = Object.values(subcircuit.gates).filter((g) => g.typeId === 'OUTPUT_LED');
  const inputGateIds = inputGates.map((g) => g.id);
  const outputGateIds = outputGates.map((g) => g.id);
  const nIn = inputGates.length;
  const nOut = outputGates.length;
  const height = Math.max(60, Math.max(nIn, nOut) * 20 + 20);

  const getInputLabel = (gate: typeof inputGates[number], index: number) =>
    portNames?.[index] ?? gate.label ?? `I${index}`;
  const getOutputLabel = (gate: typeof outputGates[number], index: number) =>
    portNames?.[nIn + index] ?? gate.label ?? `O${index}`;

  gateRegistry.register({
    typeId,
    label: name,
    category: 'custom',
    width: 100,
    height,
    inputs: inputGates.map((gate, index) => ({
      id: `i${index}`,
      label: getInputLabel(gate, index),
      relativeX: 0,
      relativeY: (index + 0.5) / Math.max(nIn, 1),
    })),
    outputs: outputGates.map((gate, index) => ({
      id: `o${index}`,
      label: getOutputLabel(gate, index),
      relativeX: 1,
      relativeY: (index + 0.5) / Math.max(nOut, 1),
    })),
    evaluate: (inputs, customState) => {
      const innerStates = (customState?.innerStates as Record<string, Record<string, unknown>>) ?? {};
      const copy = buildSubcircuitCopy(subcircuit, inputGates, inputs, innerStates);
      const result = runSimulation(copy);
      const outputs: Record<string, 0 | 1> = {};

      outputGates.forEach((led, index) => {
        const wire = Object.values(copy.wires).find((w) => w.to.gateId === led.id && w.to.portId === 'in');
        if (!wire) {
          outputs[`o${index}`] = 0;
          return;
        }
        outputs[`o${index}`] = (result.gateSignals[wire.from.gateId]?.[wire.from.portId]?.value ?? 0) as 0 | 1;
      });

      return outputs;
    },
    stateUpdate: (inputs, _outputs, customState) => {
      const innerStates = (customState?.innerStates as Record<string, Record<string, unknown>>) ?? {};
      const copy = buildSubcircuitCopy(subcircuit, inputGates, inputs, innerStates);
      const result = runSimulation(copy);
      const mergedStates: Record<string, Record<string, unknown>> = { ...innerStates };
      for (const [gateId, stateUpdate] of Object.entries(result.customStateUpdates ?? {})) {
        mergedStates[gateId] = stateUpdate;
      }
      return { ...customState, innerStates: mergedStates };
    },
    customIC: {
      subcircuit,
      inputGateIds,
      outputGateIds,
    },
    shapeComponent: FlipFlopShape,
    description: `Benutzerdefiniertes IC: ${name}`,
  });
}

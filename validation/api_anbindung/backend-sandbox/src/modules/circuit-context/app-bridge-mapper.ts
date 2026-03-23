import {
  appBridgeSnapshotSchema,
  type AppBridgeSnapshot,
} from '../../contracts/app-bridge.js';
import type { CircuitSource } from './types.js';

export function mapAppBridgeSnapshotToCircuitSource(
  snapshot: AppBridgeSnapshot,
): CircuitSource {
  const parsedSnapshot = appBridgeSnapshotSchema.parse(snapshot);
  const openCircuit = parsedSnapshot.openCircuit;

  return {
    id: openCircuit.circuitId,
    name: openCircuit.title,
    selectedElementIds: [...openCircuit.selection.activeElementIds],
    nodes: openCircuit.elements.nodes.map((node) => ({
      id: node.id,
      kind: node.nodeType,
      label: node.displayName,
    })),
    gates: openCircuit.elements.gates.map((gate) => ({
      id: gate.id,
      type: gate.gateType,
      label: gate.displayName,
      inputs: gate.pins.inputs.map((port) => ({
        gateId: port.gateId,
        port: port.port,
      })),
      outputs: gate.pins.outputs.map((port) => ({
        gateId: port.gateId,
        port: port.port,
      })),
    })),
    connections: openCircuit.elements.wires.map((wire) => ({
      from: {
        gateId: wire.source.gateId,
        port: wire.source.port,
      },
      to: {
        gateId: wire.target.gateId,
        port: wire.target.port,
      },
    })),
    notes: openCircuit.annotations.notes,
  };
}

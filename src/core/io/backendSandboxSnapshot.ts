import { gateRegistry } from '../registry/GateRegistry';
import type { Circuit, GateDefinition, GateInstance } from '../types';

export const BACKEND_SANDBOX_BRIDGE_VERSION = 'sandbox-app-bridge-v1' as const;

export type BackendSandboxBridgeVersion =
  typeof BACKEND_SANDBOX_BRIDGE_VERSION;

export interface BackendSandboxPort {
  gateId: string;
  port: string;
}

export interface BackendSandboxNode {
  id: string;
  nodeType: string;
  displayName?: string;
}

export interface BackendSandboxGate {
  id: string;
  gateType: string;
  displayName?: string;
  pins: {
    inputs: BackendSandboxPort[];
    outputs: BackendSandboxPort[];
  };
}

export interface BackendSandboxWire {
  source: BackendSandboxPort;
  target: BackendSandboxPort;
}

export interface BackendSandboxCurrentCircuitSnapshot {
  bridgeVersion: BackendSandboxBridgeVersion;
  openCircuit: {
    circuitId: string;
    title?: string;
    selection: {
      activeElementIds: string[];
    };
    elements: {
      nodes: BackendSandboxNode[];
      gates: BackendSandboxGate[];
      wires: BackendSandboxWire[];
    };
    annotations: {
      notes?: string;
    };
  };
}

export interface BackendSandboxCurrentCircuitSnapshotSummary {
  bridgeVersion: BackendSandboxBridgeVersion;
  circuitId: string;
  selectedElementCount: number;
  nodeCount: number;
  gateCount: number;
  wireCount: number;
  unresolvedGateTypeCount: number;
  snapshotFingerprint: string;
}

const backendSandboxNodeCategories = new Set<GateDefinition['category']>([
  'annotation',
  'input',
  'output',
]);

const toSortedIds = (ids: Iterable<string>) => Array.from(ids).sort();

const toSandboxPort = (gateId: string, portId: string): BackendSandboxPort => ({
  gateId,
  port: portId,
});

const resolveDisplayName = (
  gate: GateInstance,
  definition?: GateDefinition,
): string | undefined => {
  const label = gate.label?.trim();

  if (label) {
    return label;
  }

  return definition?.label;
};

const resolveGateDefinition = (typeId: string): GateDefinition | undefined => {
  try {
    return gateRegistry.get(typeId);
  } catch {
    return undefined;
  }
};

const createBackendSandboxNode = (
  gate: GateInstance,
  definition: GateDefinition,
): BackendSandboxNode => ({
  id: gate.id,
  nodeType: gate.typeId,
  displayName: resolveDisplayName(gate, definition),
});

const createBackendSandboxGate = (
  gate: GateInstance,
  definition?: GateDefinition,
): BackendSandboxGate => ({
  id: gate.id,
  gateType: gate.typeId,
  displayName: resolveDisplayName(gate, definition) ?? gate.typeId,
  pins: {
    inputs:
      definition?.inputs.map((port) => toSandboxPort(gate.id, port.id)) ?? [],
    outputs:
      definition?.outputs.map((port) => toSandboxPort(gate.id, port.id)) ?? [],
  },
});

export const createBackendSandboxCurrentCircuitSnapshot = (
  circuit: Circuit,
): BackendSandboxCurrentCircuitSnapshot => {
  const nodes: BackendSandboxNode[] = [];
  const gates: BackendSandboxGate[] = [];

  const orderedGates = Object.values(circuit.gates).sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const orderedWires = Object.values(circuit.wires).sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  for (const gate of orderedGates) {
    const definition = resolveGateDefinition(gate.typeId);

    if (definition && backendSandboxNodeCategories.has(definition.category)) {
      nodes.push(createBackendSandboxNode(gate, definition));
      continue;
    }

    gates.push(createBackendSandboxGate(gate, definition));
  }

  return {
    bridgeVersion: BACKEND_SANDBOX_BRIDGE_VERSION,
    openCircuit: {
      circuitId: circuit.id,
      title: circuit.name,
      selection: {
        activeElementIds: toSortedIds([
          ...orderedGates.filter((gate) => gate.isSelected).map((gate) => gate.id),
          ...orderedWires.filter((wire) => wire.isSelected).map((wire) => wire.id),
        ]),
      },
      elements: {
        nodes,
        gates,
        wires: orderedWires.map((wire) => ({
          source: toSandboxPort(wire.from.gateId, wire.from.portId),
          target: toSandboxPort(wire.to.gateId, wire.to.portId),
        })),
      },
      // Keep annotations intentionally empty for the first live app-side seam
      // until free-text policy is explicitly approved for integration.
      annotations: {},
    },
  };
};

export const summarizeBackendSandboxCurrentCircuitSnapshot = (
  snapshot: BackendSandboxCurrentCircuitSnapshot,
): BackendSandboxCurrentCircuitSnapshotSummary => {
  const unresolvedGateTypeCount = snapshot.openCircuit.elements.gates.filter(
    (gate) => !resolveGateDefinition(gate.gateType),
  ).length;
  const fingerprintParts = [
    snapshot.openCircuit.circuitId,
    snapshot.openCircuit.selection.activeElementIds.join(','),
    snapshot.openCircuit.elements.nodes.map((node) => node.id).join(','),
    snapshot.openCircuit.elements.gates.map((gate) => gate.id).join(','),
    snapshot.openCircuit.elements.wires
      .map(
        (wire) =>
          `${wire.source.gateId}:${wire.source.port}->${wire.target.gateId}:${wire.target.port}`,
      )
      .join(','),
    String(unresolvedGateTypeCount),
  ];

  return {
    bridgeVersion: snapshot.bridgeVersion,
    circuitId: snapshot.openCircuit.circuitId,
    selectedElementCount: snapshot.openCircuit.selection.activeElementIds.length,
    nodeCount: snapshot.openCircuit.elements.nodes.length,
    gateCount: snapshot.openCircuit.elements.gates.length,
    wireCount: snapshot.openCircuit.elements.wires.length,
    unresolvedGateTypeCount,
    snapshotFingerprint: fingerprintParts.join('|'),
  };
};

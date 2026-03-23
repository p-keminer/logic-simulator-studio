import type {
  CircuitContextBuildOptions,
  CircuitSource,
} from "./types.js";

export type CircuitContextDraft = {
  scope: "active-circuit";
  version: string;
  circuitId: string;
  circuitName?: string;
  selectedElementIds: string[];
  nodes: Array<{ id: string; kind: string; label?: string }>;
  gates: Array<{
    id: string;
    type: string;
    label?: string;
    inputs: Array<{ gateId: string; port: string }>;
    outputs: Array<{ gateId: string; port: string }>;
  }>;
  connections: Array<{
    from: { gateId: string; port: string };
    to: { gateId: string; port: string };
  }>;
  notes?: string;
};

export function mapCircuitSourceToContextDraft(
  source: CircuitSource | null | undefined,
  options: CircuitContextBuildOptions,
): CircuitContextDraft | null {
  if (!source) {
    return null;
  }

  return {
    scope: "active-circuit",
    version: options.version,
    circuitId: source.id,
    circuitName: source.name,
    selectedElementIds: [...(source.selectedElementIds ?? [])],
    nodes: [...(source.nodes ?? [])].map((node) => ({
      id: node.id,
      kind: node.kind,
      label: node.label,
    })),
    gates: [...(source.gates ?? [])].map((gate) => ({
      id: gate.id,
      type: gate.type,
      label: gate.label,
      inputs: [...(gate.inputs ?? [])].map((port) => ({
        gateId: port.gateId,
        port: port.port,
      })),
      outputs: [...(gate.outputs ?? [])].map((port) => ({
        gateId: port.gateId,
        port: port.port,
      })),
    })),
    connections: [...(source.connections ?? [])].map((connection) => ({
      from: {
        gateId: connection.from.gateId,
        port: connection.from.port,
      },
      to: {
        gateId: connection.to.gateId,
        port: connection.to.port,
      },
    })),
    notes: source.notes,
  };
}

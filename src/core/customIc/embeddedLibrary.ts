import { gateRegistry } from '../registry/GateRegistry';
import type { Circuit, GateDefinition, GateTypeId, SerializedCustomICDefinition } from '../types';
import { registerCustomIC } from './registerCustomIC';

function isCustomGateTypeId(typeId: GateTypeId): boolean {
  return typeId.startsWith('CIC_');
}

function extractPortNames(definition: GateDefinition): string[] {
  return [
    ...definition.inputs.map((port, index) => port.label ?? `I${index}`),
    ...definition.outputs.map((port, index) => port.label ?? `O${index}`),
  ];
}

function toEmbeddedDefinition(definition: GateDefinition): SerializedCustomICDefinition | null {
  if (definition.category !== 'custom' || !definition.customIC) return null;
  return {
    name: definition.label,
    typeId: definition.typeId,
    circuit: definition.customIC.subcircuit,
    portNames: extractPortNames(definition),
  };
}

function collectFromCustomTypeId(
  typeId: GateTypeId,
  ordered: SerializedCustomICDefinition[],
  visiting: Set<GateTypeId>,
  visited: Set<GateTypeId>,
): void {
  if (visited.has(typeId) || visiting.has(typeId) || !gateRegistry.has(typeId)) return;

  const definition = gateRegistry.get(typeId);
  const embedded = toEmbeddedDefinition(definition);
  if (!embedded) return;

  visiting.add(typeId);
  for (const gate of Object.values(embedded.circuit.gates)) {
    if (isCustomGateTypeId(gate.typeId)) {
      collectFromCustomTypeId(gate.typeId, ordered, visiting, visited);
    }
  }
  visiting.delete(typeId);
  visited.add(typeId);
  ordered.push(embedded);
}

export function collectEmbeddedCustomIcLibrary(circuit: Circuit): SerializedCustomICDefinition[] {
  const ordered: SerializedCustomICDefinition[] = [];
  const visiting = new Set<GateTypeId>();
  const visited = new Set<GateTypeId>();

  for (const gate of Object.values(circuit.gates)) {
    if (isCustomGateTypeId(gate.typeId)) {
      collectFromCustomTypeId(gate.typeId, ordered, visiting, visited);
    }
  }

  return ordered;
}

export function registerEmbeddedCustomIcLibrary(circuit: Circuit): void {
  for (const entry of circuit.customIcLibrary ?? []) {
    if (!entry?.name || !entry?.circuit) continue;
    registerCustomIC(entry.name, entry.circuit, entry.portNames, { replace: true });
  }
}

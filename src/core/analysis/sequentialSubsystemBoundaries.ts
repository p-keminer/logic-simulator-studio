import type { Circuit, GateInstance, GateProjectionMetadata } from '../types';

export interface SequentialSubsystemBoundary {
  key: string;
  gateIds: Set<string>;
  circuit: Circuit;
  projectedGateIds: Set<string>;
  projectedGateCount: number;
  projectedBatchIds: string[];
  singleProjectedBatchId: string | null;
  hasProjectedContent: boolean;
  hasMixedProjectedBatches: boolean;
  hasMissingProjectedBatchIds: boolean;
}

type ProjectionResolver = (gate: GateInstance) => GateProjectionMetadata | null | undefined;

export function getConnectedGateIds(circuit: Circuit): Set<string> {
  const ids = new Set<string>();
  for (const wire of Object.values(circuit.wires)) {
    ids.add(wire.from.gateId);
    ids.add(wire.to.gateId);
  }
  return ids;
}

export function getConnectedComponents(circuit: Circuit): Set<string>[] {
  const connectedIds = [...getConnectedGateIds(circuit)];
  if (connectedIds.length === 0) return [];

  const adjacency = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    if (!adjacency.has(id)) adjacency.set(id, new Set());
    return adjacency.get(id)!;
  };

  for (const id of connectedIds) ensure(id);

  for (const wire of Object.values(circuit.wires)) {
    ensure(wire.from.gateId).add(wire.to.gateId);
    ensure(wire.to.gateId).add(wire.from.gateId);
  }

  const seen = new Set<string>();
  const components: Set<string>[] = [];
  for (const startId of connectedIds) {
    if (seen.has(startId)) continue;
    const component = new Set<string>();
    const stack = [startId];
    seen.add(startId);

    while (stack.length > 0) {
      const gateId = stack.pop();
      if (!gateId) continue;
      component.add(gateId);
      for (const nextId of adjacency.get(gateId) ?? []) {
        if (seen.has(nextId)) continue;
        seen.add(nextId);
        stack.push(nextId);
      }
    }

    components.push(component);
  }

  return components;
}

export function buildCircuitSubset(circuit: Circuit, gateIds: Set<string>): Circuit {
  return {
    ...circuit,
    gates: Object.fromEntries(
      Object.entries(circuit.gates)
        .filter(([gateId]) => gateIds.has(gateId))
        .map(([gateId, gate]) => [gateId, { ...gate }]),
    ),
    wires: Object.fromEntries(
      Object.entries(circuit.wires)
        .filter(([, wire]) => gateIds.has(wire.from.gateId) && gateIds.has(wire.to.gateId))
        .map(([wireId, wire]) => [wireId, { ...wire }]),
    ),
  };
}

export function collectSequentialSubsystemBoundaries(
  circuit: Circuit,
  resolveProjection: ProjectionResolver = (gate) => gate.projection ?? null,
): SequentialSubsystemBoundary[] {
  return getConnectedComponents(circuit).map((gateIds, index) => {
    const componentCircuit = buildCircuitSubset(circuit, gateIds);
    const projectedGateIds = new Set<string>();
    const batchIds = new Set<string>();
    let hasMissingProjectedBatchIds = false;

    for (const gateId of gateIds) {
      const gate = circuit.gates[gateId];
      if (!gate) continue;
      const projection = resolveProjection(gate);
      if (projection?.sourceSystem !== 'fsm_synth') continue;
      projectedGateIds.add(gateId);
      if (projection.projectionBatchId) batchIds.add(projection.projectionBatchId);
      else hasMissingProjectedBatchIds = true;
    }

    const projectedBatchIds = [...batchIds].sort((a, b) => a.localeCompare(b));
    const singleProjectedBatchId = projectedBatchIds.length === 1 && !hasMissingProjectedBatchIds
      ? projectedBatchIds[0]
      : null;

    return {
      key: `component:${index + 1}`,
      gateIds,
      circuit: componentCircuit,
      projectedGateIds,
      projectedGateCount: projectedGateIds.size,
      projectedBatchIds,
      singleProjectedBatchId,
      hasProjectedContent: projectedGateIds.size > 0,
      hasMixedProjectedBatches: projectedBatchIds.length > 1 || hasMissingProjectedBatchIds,
      hasMissingProjectedBatchIds,
    };
  });
}

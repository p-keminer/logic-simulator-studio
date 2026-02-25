import type { Circuit } from '../types';

export interface SortResult {
  order: string[];
  cycles: string[][];
}

/**
 * Kahn's Algorithm: BFS-based topological sort.
 * Gates with no inputs (or all inputs disconnected) are evaluated first.
 * Remaining gates after the sort are in feedback cycles.
 */
export function topologicalSort(circuit: Circuit): SortResult {
  const gateIds = Object.keys(circuit.gates);
  const inDegree = new Map<string, number>(gateIds.map((id) => [id, 0]));
  const adjacency = new Map<string, string[]>(
    gateIds.map((id) => [id, []])
  );

  for (const wire of Object.values(circuit.wires)) {
    adjacency.get(wire.from.gateId)?.push(wire.to.gateId);
    inDegree.set(wire.to.gateId, (inDegree.get(wire.to.gateId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  const remaining = gateIds.filter((id) => !order.includes(id));
  const cycles: string[][] = remaining.length > 0 ? [remaining] : [];

  return { order, cycles };
}

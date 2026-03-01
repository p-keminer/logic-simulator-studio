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

  // ── Kosaraju SCC on remaining (feedback) nodes ────────────────────────────
  // Decomposes the cycle set into individual strongly-connected components so
  // that independent feedback loops are reported as separate cycle arrays.
  // cycles.flat() equals the old `remaining` array — callers using hasCycles /
  // feedbackGateIds (via flat()) are unaffected.
  let cycles: string[][] = [];
  if (remaining.length > 0) {
    const remainingSet = new Set(remaining);

    // Build forward and reverse adjacency for the remaining subgraph only.
    const fwd = new Map<string, string[]>(remaining.map(id => [id, []]));
    const rev = new Map<string, string[]>(remaining.map(id => [id, []]));
    for (const wire of Object.values(circuit.wires)) {
      const u = wire.from.gateId;
      const v = wire.to.gateId;
      if (remainingSet.has(u) && remainingSet.has(v)) {
        fwd.get(u)!.push(v);
        rev.get(v)!.push(u);
      }
    }

    // Pass 1: DFS on forward graph, collect finish order.
    const visited1 = new Set<string>();
    const finishOrder: string[] = [];
    const dfs1 = (node: string) => {
      const stack: Array<{ node: string; iter: Iterator<string> }> = [
        { node, iter: (fwd.get(node) ?? []).values() },
      ];
      visited1.add(node);
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const next = top.iter.next();
        if (!next.done) {
          const nb = next.value;
          if (!visited1.has(nb)) {
            visited1.add(nb);
            stack.push({ node: nb, iter: (fwd.get(nb) ?? []).values() });
          }
        } else {
          finishOrder.push(top.node);
          stack.pop();
        }
      }
    };
    for (const id of remaining) {
      if (!visited1.has(id)) dfs1(id);
    }

    // Pass 2: DFS on reverse graph in reverse-finish order → each tree = one SCC.
    const visited2 = new Set<string>();
    const dfs2 = (start: string): string[] => {
      const component: string[] = [];
      const stack = [start];
      visited2.add(start);
      while (stack.length > 0) {
        const node = stack.pop()!;
        component.push(node);
        for (const nb of rev.get(node) ?? []) {
          if (!visited2.has(nb)) {
            visited2.add(nb);
            stack.push(nb);
          }
        }
      }
      return component;
    };
    for (let i = finishOrder.length - 1; i >= 0; i--) {
      const id = finishOrder[i];
      if (!visited2.has(id)) {
        cycles.push(dfs2(id));
      }
    }
  }

  return { order, cycles };
}

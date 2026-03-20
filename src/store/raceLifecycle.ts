import type { Circuit, RaceInfo, SignalValue } from '../core/types';

function sortSignalValues(values: SignalValue[]): SignalValue[] {
  return [...values].sort((a, b) => a - b);
}

export function collectActiveRaceNetIds(circuit: Circuit): Set<string> {
  const netIds = new Set<string>();
  for (const wire of Object.values(circuit.wires)) {
    netIds.add(`${wire.from.gateId}:${wire.from.portId}`);
  }
  return netIds;
}

export function buildRaceSignature(race: RaceInfo): string {
  return JSON.stringify({
    netId: race.netId,
    severity: race.severity,
    type: race.type ?? '',
    gateIds: [...race.gateIds].sort(),
    values: sortSignalValues(race.values),
  });
}

export function isRaceStillRelevant(
  race: RaceInfo,
  circuit: Circuit,
  activeNetIds = collectActiveRaceNetIds(circuit),
): boolean {
  if (!activeNetIds.has(race.netId)) return false;
  return race.gateIds.some((gateId) => circuit.gates[gateId] !== undefined);
}

export function pruneRaceHistory(races: RaceInfo[], circuit: Circuit): RaceInfo[] {
  const activeNetIds = collectActiveRaceNetIds(circuit);
  return races.filter((race) => isRaceStillRelevant(race, circuit, activeNetIds));
}

export function appendRaceHistory(
  existing: RaceInfo[],
  incoming: RaceInfo[],
  circuit: Circuit,
  maxEntries = 50,
): RaceInfo[] {
  const activeNetIds = collectActiveRaceNetIds(circuit);
  const bySignature = new Map<string, RaceInfo>();
  const order: string[] = [];

  for (const race of [...existing, ...incoming]) {
    if (!isRaceStillRelevant(race, circuit, activeNetIds)) continue;

    const signature = buildRaceSignature(race);
    if (bySignature.has(signature)) {
      const prevIndex = order.indexOf(signature);
      if (prevIndex !== -1) order.splice(prevIndex, 1);
    }
    bySignature.set(signature, race);
    order.push(signature);
  }

  return order
    .slice(-maxEntries)
    .map((signature) => bySignature.get(signature))
    .filter((race): race is RaceInfo => race !== undefined);
}

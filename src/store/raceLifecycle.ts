import type { Circuit, RaceIncident, RaceInfo, SignalValue } from '../core/types';

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

function splitNetId(netId: string): { gateId: string; portId: string } {
  const separator = netId.indexOf(':');
  return {
    gateId: netId.slice(0, separator),
    portId: netId.slice(separator + 1),
  };
}

function collectIncomingWires(circuit: Circuit, gateId: string) {
  return Object.values(circuit.wires)
    .filter((wire) => wire.to.gateId === gateId)
    .sort((a, b) => {
      const byPort = a.to.portId.localeCompare(b.to.portId);
      if (byPort !== 0) return byPort;
      const byFromGate = a.from.gateId.localeCompare(b.from.gateId);
      if (byFromGate !== 0) return byFromGate;
      return a.from.portId.localeCompare(b.from.portId);
    });
}

export function buildRaceStructuralSignature(race: RaceInfo, circuit: Circuit): string | null {
  const { gateId: ownerGateId } = splitNetId(race.netId);
  const roots = [...new Set([ownerGateId, ...race.gateIds])].sort();
  const visited = new Set<string>();
  const entries: string[] = [`net:${race.netId}`];

  const visitGate = (gateId: string): boolean => {
    if (visited.has(gateId)) return true;
    visited.add(gateId);

    const gate = circuit.gates[gateId];
    if (!gate) {
      entries.push(`missing:${gateId}`);
      return false;
    }

    entries.push(`gate:${gateId}:${gate.typeId}`);
    const incoming = collectIncomingWires(circuit, gateId);

    if (incoming.length === 0) {
      entries.push(`inputs:${gateId}:<none>`);
      return true;
    }

    let complete = true;
    for (const wire of incoming) {
      entries.push(`in:${gateId}:${wire.to.portId}<=${wire.from.gateId}:${wire.from.portId}`);
      complete = visitGate(wire.from.gateId) && complete;
    }

    return complete;
  };

  let complete = true;
  for (const gateId of roots) {
    complete = visitGate(gateId) && complete;
  }

  return complete ? JSON.stringify(entries) : null;
}

export function isRaceStillRelevant(
  race: RaceInfo | RaceIncident,
  circuit: Circuit,
  activeNetIds = collectActiveRaceNetIds(circuit),
): boolean {
  if (!activeNetIds.has(race.netId)) return false;
  if (!race.gateIds.some((gateId) => circuit.gates[gateId] !== undefined)) return false;

  if ('structuralSignature' in race && typeof race.structuralSignature === 'string') {
    return buildRaceStructuralSignature(race, circuit) === race.structuralSignature;
  }

  return true;
}

function toRaceIncident(race: RaceInfo | RaceIncident, circuit: Circuit): RaceIncident {
  const structuralSignature = buildRaceStructuralSignature(race, circuit) ?? (
    'structuralSignature' in race ? race.structuralSignature : undefined
  );

  if ('occurrenceCount' in race && 'firstSeenTime' in race && 'lastSeenTime' in race) {
    return { ...race, structuralSignature };
  }

  return {
    ...race,
    firstSeenTime: race.time,
    lastSeenTime: race.time,
    occurrenceCount: 1,
    structuralSignature,
  };
}

function mergeStoredIncidents(existing: RaceIncident, incoming: RaceIncident): RaceIncident {
  const useIncomingAsLatest = incoming.lastSeenTime >= existing.lastSeenTime;
  const latest = useIncomingAsLatest ? incoming : existing;

  return {
    ...latest,
    time: Math.max(existing.time, incoming.time),
    firstSeenTime: Math.min(existing.firstSeenTime, incoming.firstSeenTime),
    lastSeenTime: Math.max(existing.lastSeenTime, incoming.lastSeenTime),
    occurrenceCount: existing.occurrenceCount + incoming.occurrenceCount,
  };
}

function mergeIncomingRace(existing: RaceIncident, incoming: RaceIncident): RaceIncident {
  const incomingTime = incoming.time;
  const useIncomingAsLatest = incomingTime >= existing.lastSeenTime;

  return {
    ...(useIncomingAsLatest ? existing : { ...incoming }),
    ...(useIncomingAsLatest ? incoming : existing),
    time: Math.max(existing.time, incomingTime),
    firstSeenTime: existing.firstSeenTime,
    lastSeenTime: Math.max(existing.lastSeenTime, incomingTime),
    occurrenceCount: existing.occurrenceCount + 1,
  };
}

function moveSignatureToTail(order: string[], signature: string): void {
  const prevIndex = order.indexOf(signature);
  if (prevIndex !== -1) order.splice(prevIndex, 1);
  order.push(signature);
}

export function pruneRaceHistory(races: Array<RaceInfo | RaceIncident>, circuit: Circuit): RaceIncident[] {
  const activeNetIds = collectActiveRaceNetIds(circuit);
  return races
    .filter((race) => isRaceStillRelevant(race, circuit, activeNetIds))
    .map((race) => toRaceIncident(race, circuit));
}

export function appendRaceHistory(
  existing: Array<RaceInfo | RaceIncident>,
  incoming: RaceInfo[],
  circuit: Circuit,
  maxEntries = 50,
): RaceIncident[] {
  const activeNetIds = collectActiveRaceNetIds(circuit);
  const bySignature = new Map<string, RaceIncident>();
  const order: string[] = [];

  for (const incident of existing) {
    if (!isRaceStillRelevant(incident, circuit, activeNetIds)) continue;

    const signature = buildRaceSignature(incident);
    const normalized = toRaceIncident(incident, circuit);
    const prev = bySignature.get(signature);
    bySignature.set(signature, prev ? mergeStoredIncidents(prev, normalized) : normalized);
    if (!order.includes(signature)) order.push(signature);
  }

  for (const race of incoming) {
    if (!isRaceStillRelevant(race, circuit, activeNetIds)) continue;

    const signature = buildRaceSignature(race);
    const normalized = toRaceIncident(race, circuit);
    const prev = bySignature.get(signature);
    bySignature.set(signature, prev ? mergeIncomingRace(prev, normalized) : normalized);
    moveSignatureToTail(order, signature);
  }

  return order
    .slice(-maxEntries)
    .map((signature) => bySignature.get(signature))
    .filter((race): race is RaceIncident => race !== undefined);
}

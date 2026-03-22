import type { Circuit, RaceIncident, RaceInfo, RaceSeverity } from '../core/types';
import { appendRaceHistory, collectActiveRaceNetIds, pruneRaceHistory } from './raceLifecycle';

export interface RaceMark {
  severity: RaceSeverity;
  lastSeenMs: number;
}

export interface RaceMonitorState {
  incidents: RaceIncident[];
  marks: Map<string, RaceMark>;
  netIds: Map<string, RaceSeverity>;
}

export function projectRaceMarkNetIds(marks: ReadonlyMap<string, RaceMark>): Map<string, RaceSeverity> {
  const netIds = new Map<string, RaceSeverity>();
  for (const [netId, mark] of marks) {
    netIds.set(netId, mark.severity);
  }
  return netIds;
}

export function clearRaceMonitorState(): RaceMonitorState {
  return {
    incidents: [],
    marks: new Map(),
    netIds: new Map(),
  };
}

export function recordDetectedRaceBatch(
  races: Array<RaceInfo | RaceIncident>,
  marks: ReadonlyMap<string, RaceMark>,
  detectedRaces: RaceInfo[],
  circuit: Circuit,
  nowMs: number,
  maxEntries = 50,
): RaceMonitorState {
  const incidents = appendRaceHistory(races, detectedRaces, circuit, maxEntries);
  const nextMarks = new Map(marks);

  for (const race of detectedRaces) {
    const existing = nextMarks.get(race.netId);
    nextMarks.set(race.netId, {
      severity: existing ? pickWorseSeverity(existing.severity, race.severity) : race.severity,
      lastSeenMs: nowMs,
    });
  }

  return {
    incidents,
    marks: nextMarks,
    netIds: projectRaceMarkNetIds(nextMarks),
  };
}

export function pruneRaceMonitorState(
  races: Array<RaceInfo | RaceIncident>,
  marks: ReadonlyMap<string, RaceMark>,
  circuit: Circuit,
): RaceMonitorState {
  const activeNetIds = collectActiveRaceNetIds(circuit);
  const nextMarks = new Map<string, RaceMark>();

  for (const [netId, mark] of marks) {
    if (activeNetIds.has(netId)) {
      nextMarks.set(netId, mark);
    }
  }

  const incidents = pruneRaceHistory(races, circuit);

  return {
    incidents,
    marks: nextMarks,
    netIds: projectRaceMarkNetIds(nextMarks),
  };
}

export function expireRaceMarks(
  incidents: RaceIncident[],
  marks: ReadonlyMap<string, RaceMark>,
  nowMs: number,
  ttlMs: number,
): RaceMonitorState {
  const nextMarks = new Map<string, RaceMark>();

  for (const [netId, mark] of marks) {
    if (nowMs - mark.lastSeenMs <= ttlMs) {
      nextMarks.set(netId, mark);
    }
  }

  return {
    incidents,
    marks: nextMarks,
    netIds: projectRaceMarkNetIds(nextMarks),
  };
}

function pickWorseSeverity(a: RaceSeverity, b: RaceSeverity): RaceSeverity {
  const rank: Record<RaceSeverity, number> = {
    loop: 1,
    warning: 2,
    glitch: 3,
    timing: 4,
    critical: 5,
  };
  return rank[a] >= rank[b] ? a : b;
}

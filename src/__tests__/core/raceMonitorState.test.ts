import { describe, expect, it } from 'vitest';
import type { Circuit, GateInstance, RaceIncident, RaceInfo, SignalState, Wire } from '../../core/types';
import {
  clearRaceMonitorState,
  expireRaceMarks,
  projectRaceMarkNetIds,
  pruneRaceMonitorState,
  recordDetectedRaceBatch,
  type RaceMark,
} from '../../store/raceMonitorState';

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(id: string, typeId = 'INPUT_SWITCH'): GateInstance {
  return {
    id,
    typeId,
    x: 0,
    y: 0,
    outputSignals: {},
    customState: {},
    isSelected: false,
  };
}

function makeWire(
  id: string,
  fromGate: string,
  fromPort: string,
  toGate: string,
  toPort: string,
): Wire {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to: { gateId: toGate, portId: toPort },
    signal: { ...defaultSignal },
    waypoints: [],
    isSelected: false,
  };
}

function makeCircuit(gates: GateInstance[], wires: Wire[]): Circuit {
  return {
    id: 'race-monitor-state-test',
    name: 'Race Monitor State Test',
    version: '1.0.0',
    gates: Object.fromEntries(gates.map((gate) => [gate.id, gate])),
    wires: Object.fromEntries(wires.map((wire) => [wire.id, wire])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-21', updatedAt: '2026-03-21' },
  };
}

function makeRace(
  raceId: string,
  time: number,
  netId: string,
  gateIds: string[],
  values: RaceInfo['values'],
): RaceInfo {
  return {
    raceId,
    time,
    netId,
    gateIds,
    values,
    severity: 'critical',
    type: 'value_conflict',
  };
}

function makeIncident(race: RaceInfo, occurrenceCount: number, firstSeenTime: number, lastSeenTime: number): RaceIncident {
  return {
    ...race,
    occurrenceCount,
    firstSeenTime,
    lastSeenTime,
  };
}

function makeMarks(entries: Array<[string, RaceMark]>): Map<string, RaceMark> {
  return new Map(entries);
}

describe('raceMonitorState', () => {
  it('clears incidents, marks and projected net ids together', () => {
    const cleared = clearRaceMonitorState();

    expect(cleared.incidents).toEqual([]);
    expect(cleared.marks.size).toBe(0);
    expect(cleared.netIds.size).toBe(0);
  });

  it('projects mark severities to the canvas net-id map', () => {
    const marks = makeMarks([
      ['src:out', { severity: 'critical', lastSeenMs: 10 }],
      ['other:q', { severity: 'timing', lastSeenMs: 12 }],
    ]);

    expect(projectRaceMarkNetIds(marks)).toEqual(
      new Map([
        ['src:out', 'critical'],
        ['other:q', 'timing'],
      ]),
    );
  });

  it('prunes stale incidents and stale marks against the current circuit together', () => {
    const liveCircuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );
    const prunedCircuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [],
    );
    const liveRace = makeRace('race-live', 4, 'src:out', ['src'], [1]);
    const staleRace = makeRace('race-stale', 5, 'gone:out', ['gone'], [0, 1]);
    const incidents = [
      makeIncident(liveRace, 2, 1, 4),
      makeIncident(staleRace, 3, 2, 5),
    ];
    const marks = makeMarks([
      ['src:out', { severity: 'critical', lastSeenMs: 20 }],
      ['gone:out', { severity: 'warning', lastSeenMs: 22 }],
    ]);

    const liveState = pruneRaceMonitorState(incidents, marks, liveCircuit);
    expect(liveState.incidents).toHaveLength(1);
    expect(liveState.incidents[0].netId).toBe('src:out');
    expect(liveState.netIds).toEqual(new Map([['src:out', 'critical']]));

    const prunedState = pruneRaceMonitorState(incidents, marks, prunedCircuit);
    expect(prunedState.incidents).toEqual([]);
    expect(prunedState.marks.size).toBe(0);
    expect(prunedState.netIds.size).toBe(0);
  });

  it('expires only marks older than the configured TTL', () => {
    const result = expireRaceMarks(
      [
        makeIncident(makeRace('race-1', 1, 'fresh:out', ['fresh'], [1]), 1, 1, 1),
      ],
      makeMarks([
        ['fresh:out', { severity: 'critical', lastSeenMs: 900 }],
        ['stale:out', { severity: 'warning', lastSeenMs: 100 }],
      ]),
      1000,
      200,
    );

    expect(result.incidents).toHaveLength(1);
    expect(result.marks).toEqual(new Map([['fresh:out', { severity: 'critical', lastSeenMs: 900 }]]));
    expect(result.netIds).toEqual(new Map([['fresh:out', 'critical']]));
  });

  it('records detected races into incidents and wire marks together', () => {
    const circuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );
    const detected = [makeRace('race-1', 4, 'src:out', ['src'], [1])];

    const result = recordDetectedRaceBatch([], new Map(), detected, circuit, 1000, 50);

    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]).toMatchObject({
      raceId: 'race-1',
      occurrenceCount: 1,
      firstSeenTime: 4,
      lastSeenTime: 4,
    });
    expect(result.netIds).toEqual(new Map([['src:out', 'critical']]));
    expect(result.marks).toEqual(new Map([['src:out', { severity: 'critical', lastSeenMs: 1000 }]]));
  });

  it('manual reset clears current state only; the same physical cause can reappear on later detection', () => {
    const circuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );
    const detected = [makeRace('race-1', 4, 'src:out', ['src'], [1])];

    const first = recordDetectedRaceBatch([], new Map(), detected, circuit, 1000, 50);
    const cleared = clearRaceMonitorState();
    const reappeared = recordDetectedRaceBatch(cleared.incidents, cleared.marks, detected, circuit, 1200, 50);

    expect(first.incidents).toHaveLength(1);
    expect(cleared.incidents).toEqual([]);
    expect(cleared.marks.size).toBe(0);
    expect(reappeared.incidents).toHaveLength(1);
    expect(reappeared.incidents[0]).toMatchObject({
      raceId: 'race-1',
      occurrenceCount: 1,
      firstSeenTime: 4,
      lastSeenTime: 4,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  appendRaceHistory,
  buildRaceSignature,
  buildRaceStructuralSignature,
  collectActiveRaceNetIds,
  isRaceStillRelevant,
  pruneRaceHistory,
} from '../../store/raceLifecycle';
import type { Circuit, GateInstance, RaceInfo, SignalState, Wire } from '../../core/types';

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
    id: 'race-lifecycle-test',
    name: 'Race Lifecycle Test',
    version: '1.0.0',
    gates: Object.fromEntries(gates.map((gate) => [gate.id, gate])),
    wires: Object.fromEntries(wires.map((wire) => [wire.id, wire])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  };
}

function makeRace(
  raceId: string,
  time: number,
  netId: string,
  gateIds: string[],
  values: RaceInfo['values'],
  severity: RaceInfo['severity'] = 'critical',
  type: RaceInfo['type'] = 'value_conflict',
): RaceInfo {
  return { raceId, time, netId, gateIds, values, severity, type };
}

describe('raceLifecycle', () => {
  it('collects active race net ids from wire sources', () => {
    const circuit = makeCircuit(
      [makeGate('srcA'), makeGate('srcB'), makeGate('dst')],
      [
        makeWire('w1', 'srcA', 'out', 'dst', 'inA'),
        makeWire('w2', 'srcB', 'q', 'dst', 'inB'),
      ],
    );

    expect(collectActiveRaceNetIds(circuit)).toEqual(new Set(['srcA:out', 'srcB:q']));
  });

  it('builds order-insensitive signatures for repeated races', () => {
    const a = makeRace('r1', 1, 'src:out', ['g2', 'g1'], [1, 0], 'critical', 'value_conflict');
    const b = makeRace('r2', 7, 'src:out', ['g1', 'g2'], [0, 1], 'critical', 'value_conflict');

    expect(buildRaceSignature(a)).toBe(buildRaceSignature(b));
  });

  it('dedupes repeated identical races and keeps the latest occurrence', () => {
    const circuit = makeCircuit(
      [makeGate('src'), makeGate('other'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );
    const older = makeRace('race-old', 3, 'src:out', ['src', 'other'], [0, 1]);
    const newer = makeRace('race-new', 9, 'src:out', ['other', 'src'], [1, 0]);

    const result = appendRaceHistory([older], [newer], circuit, 50);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      raceId: 'race-new',
      time: 9,
      firstSeenTime: 3,
      lastSeenTime: 9,
      occurrenceCount: 2,
      netId: 'src:out',
    });
  });

  it('keeps distinct incidents separate and respects the max history size', () => {
    const circuit = makeCircuit(
      [makeGate('srcA'), makeGate('srcB'), makeGate('srcC'), makeGate('dst', 'OUTPUT_LED')],
      [
        makeWire('w1', 'srcA', 'out', 'dst', 'inA'),
        makeWire('w2', 'srcB', 'out', 'dst', 'inB'),
        makeWire('w3', 'srcC', 'out', 'dst', 'inC'),
      ],
    );

    const r1 = makeRace('r1', 1, 'srcA:out', ['srcA'], [1]);
    const r2 = makeRace('r2', 2, 'srcB:out', ['srcB'], [0], 'warning', 'multi_source');
    const r3 = makeRace('r3', 3, 'srcC:out', ['srcC'], [1], 'glitch', 'reconvergent_glitch');

    const result = appendRaceHistory([r1], [r2, r3], circuit, 2);

    expect(result.map((race) => race.raceId)).toEqual(['r2', 'r3']);
  });

  it('drops stale races when the affected net no longer exists', () => {
    const liveCircuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );
    const prunedCircuit = makeCircuit([makeGate('src'), makeGate('dst', 'OUTPUT_LED')], []);
    const race = makeRace('race-1', 5, 'src:out', ['src'], [1]);

    expect(isRaceStillRelevant(race, liveCircuit)).toBe(true);
    expect(isRaceStillRelevant(race, prunedCircuit)).toBe(false);
    expect(pruneRaceHistory([race], prunedCircuit)).toEqual([]);
  });

  it('drops stale races when all referenced gates are gone even if the net id still exists', () => {
    const circuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );
    const race = makeRace('race-ghost', 8, 'src:out', ['ghostA', 'ghostB'], [0, 1]);

    expect(isRaceStillRelevant(race, circuit)).toBe(false);
    expect(pruneRaceHistory([race], circuit)).toEqual([]);
  });

  it('coalesces a seeded incident with new repeats and preserves first/last seen metadata', () => {
    const circuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );
    const seeded = appendRaceHistory([], [makeRace('race-1', 4, 'src:out', ['src'], [1])], circuit, 50);
    const updated = appendRaceHistory(
      seeded,
      [
        makeRace('race-2', 9, 'src:out', ['src'], [1]),
        makeRace('race-3', 12, 'src:out', ['src'], [1]),
      ],
      circuit,
      50,
    );

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      raceId: 'race-3',
      time: 12,
      firstSeenTime: 4,
      lastSeenTime: 12,
      occurrenceCount: 3,
    });
  });

  it('stores a structural signature for seeded incidents', () => {
    const circuit = makeCircuit(
      [makeGate('src'), makeGate('dst', 'OUTPUT_LED')],
      [makeWire('w1', 'src', 'out', 'dst', 'in')],
    );

    const seeded = appendRaceHistory([], [makeRace('race-1', 4, 'src:out', ['src'], [1])], circuit, 50);

    expect(seeded[0].structuralSignature).toBe(buildRaceStructuralSignature(seeded[0], circuit));
  });

  it('prunes a glitch incident when the upstream reconvergent branch changes even if the output net still exists', () => {
    const liveCircuit = makeCircuit(
      [
        makeGate('sw_a'),
        makeGate('not_1', 'NOT'),
        makeGate('not_2', 'NOT'),
        makeGate('xor', 'XOR'),
        makeGate('led', 'OUTPUT_LED'),
      ],
      [
        makeWire('w_direct', 'sw_a', 'out', 'xor', 'a'),
        makeWire('w_delay_1', 'sw_a', 'out', 'not_1', 'a'),
        makeWire('w_delay_2', 'not_1', 'out', 'not_2', 'a'),
        makeWire('w_delay_3', 'not_2', 'out', 'xor', 'b'),
        makeWire('w_out', 'xor', 'out', 'led', 'in'),
      ],
    );
    const changedCircuit = makeCircuit(
      [
        makeGate('sw_a'),
        makeGate('not_2', 'NOT'),
        makeGate('xor', 'XOR'),
        makeGate('led', 'OUTPUT_LED'),
      ],
      [
        makeWire('w_direct', 'sw_a', 'out', 'xor', 'a'),
        makeWire('w_delay_3', 'not_2', 'out', 'xor', 'b'),
        makeWire('w_out', 'xor', 'out', 'led', 'in'),
      ],
    );

    const seeded = appendRaceHistory(
      [],
      [makeRace('glitch-1', 6, 'xor:out', ['xor'], [1], 'glitch', 'reconvergent_glitch')],
      liveCircuit,
      50,
    );

    expect(seeded).toHaveLength(1);
    expect(isRaceStillRelevant(seeded[0], liveCircuit)).toBe(true);
    expect(isRaceStillRelevant(seeded[0], changedCircuit)).toBe(false);
    expect(pruneRaceHistory(seeded, changedCircuit)).toEqual([]);
  });
});

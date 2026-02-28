/**
 * Discrete-Event Scheduler for GATE_DELAY simulation mode.
 *
 * Architecture overview:
 *   - committedOutputs   : last stable values for every gate output (gateId → portId → 0|1)
 *   - committedCustomStates: last state for every gate (for stateful gates like flip-flops)
 *   - queue              : events sorted ascending by time
 *
 * Per advance() call (≈ one RAF-frame batch of ticks):
 *   1. "No-input gates" (CLOCK, CONST_HIGH, CONST_LOW, INPUT_SWITCH) are evaluated every
 *      tick regardless, because they are autonomous signal sources.
 *   2. All queued events with time ≤ targetTime are processed in time order.
 *   3. Each committed net-value change triggers re-evaluation of downstream gates.
 *   4. New events are enqueued at (triggerTime + gate.propagationDelay).
 *   5. Race detection: same (time, netId) with different sourceGateId or conflicting values.
 *
 * Stability guarantee:
 *   An event for netId N at time T is only enqueued when the computed value DIFFERS from
 *   the currently committed value AND from any already-queued event for (N, T). This
 *   prevents runaway event accumulation in stable circuits.
 *
 * Memory safety:
 *   The queue is bounded because:
 *   - Events are only generated when signal values change.
 *   - Settled circuits produce no new events.
 *   - Oscillating circuits (ring oscillators, clocks) generate a constant-rate stream.
 */

import type { Circuit, SignalValue, RaceInfo } from '../types';
import { gateRegistry } from '../registry/GateRegistry';
import type { SimBuffer, WireMap } from './tickEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A scheduled signal transition: gate output netId will change to value at time. */
export interface SimEvent {
  time: number;
  /** 'gateId:portId' — the output port that will change */
  netId: string;
  value: SignalValue;
  /** gateId of the gate that produced this event */
  sourceGateId: string;
}

/**
 * Reverse fan-out map: for each gate output net, lists all downstream gate inputs.
 * Key:   'fromGateId:fromPortId'
 * Value: array of { toGateId, toPortId }
 */
export type FanoutMap = Map<string, Array<{ toGateId: string; toPortId: string }>>;

/** Build the fan-out map from a circuit snapshot. Must be rebuilt after structural changes. */
export function buildFanoutMap(circuit: Circuit): FanoutMap {
  const map: FanoutMap = new Map();
  for (const wire of Object.values(circuit.wires)) {
    const key = `${wire.from.gateId}:${wire.from.portId}`;
    const arr = map.get(key);
    const entry = { toGateId: wire.to.gateId, toPortId: wire.to.portId };
    if (arr) arr.push(entry);
    else map.set(key, [entry]);
  }
  return map;
}

// ── Gate categories for autonomous evaluation ─────────────────────────────────

/**
 * Gate types that must be evaluated every tick regardless of input changes.
 * These gates are autonomous signal sources (no inputs, or user-controlled inputs).
 */
const AUTONOMOUS_TYPES = new Set([
  'CLOCK', 'CONST_HIGH', 'CONST_LOW', 'INPUT_SWITCH', 'PUSH_BTN', 'ADC8',
]);

// ── EventScheduler ────────────────────────────────────────────────────────────

export class EventScheduler {
  /** Current simulation time in ticks. */
  private currentTime = 0;

  /** Committed output signals: gateId → portId → SignalValue. */
  private committedOutputs: Record<string, Record<string, SignalValue>> = {};

  /** Committed custom states for stateful gates (flip-flops, clocks, …). */
  private committedCustomStates: Record<string, Record<string, unknown>> = {};

  /** Event queue sorted ascending by time (primary) then netId (secondary, for determinism). */
  private queue: SimEvent[] = [];

  /**
   * "Shadow" set of queued events indexed by 'time:netId' → last-scheduled value.
   * Used to avoid duplicate events and to detect value-changing re-schedules.
   */
  private scheduled = new Map<string, { value: SignalValue; sourceGateId: string }>();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Seed the scheduler from a settled SimBuffer.
   * Clears the queue and schedules initial evaluations for all gates at currentTime.
   */
  seed(buffer: SimBuffer, circuit: Circuit, wireMap: WireMap): void {
    this.currentTime = buffer.tick;
    this.committedOutputs = this._deepCopyOutputs(buffer.outputs);
    this.committedCustomStates = this._deepCopyCustomStates(buffer.customStates);
    this.queue = [];
    this.scheduled.clear();

    // Schedule initial evaluation of every gate to populate the queue.
    // This gives all gates a chance to produce their first events.
    for (const gate of Object.values(circuit.gates)) {
      this._evaluateGate(gate, circuit, wireMap, this.currentTime);
    }
  }

  /**
   * Advance the simulation from currentTime to targetTime.
   * Processes all matured events and triggers downstream re-evaluations.
   *
   * @returns Detected race conditions in this time window.
   */
  advance(
    targetTime: number,
    circuit: Circuit,
    wireMap: WireMap,
    fanoutMap: FanoutMap,
    isClockPaused: boolean,
  ): RaceInfo[] {
    const races: RaceInfo[] = [];

    // ── Step 1: Per-tick autonomous gate evaluation ───────────────────────
    // Autonomous gates (CLOCK etc.) must be evaluated every tick because they
    // advance internal counters that have no input-driven trigger.
    for (let t = this.currentTime + 1; t <= targetTime; t++) {
      for (const gate of Object.values(circuit.gates)) {
        if (!AUTONOMOUS_TYPES.has(gate.typeId)) continue;

        // Inject pause flag for CLOCK gates, matching the ZERO_DELAY behaviour.
        let cs: Record<string, unknown> = this.committedCustomStates[gate.id] ?? gate.customState ?? {};
        if (gate.typeId === 'CLOCK') {
          cs = { ...cs, _paused: isClockPaused };
        }

        this._evaluateGateWithCs(gate, circuit, wireMap, t, cs);
      }
    }

    // ── Step 2: Process all events up to targetTime ───────────────────────
    while (this.queue.length > 0 && this.queue[0].time <= targetTime) {
      // Collect entire batch at the earliest time for race detection.
      const batchTime = this.queue[0].time;
      const batch: SimEvent[] = [];
      while (this.queue.length > 0 && this.queue[0].time === batchTime) {
        batch.push(this.queue.shift()!);
      }

      // Remove batch entries from the shadow set.
      for (const ev of batch) {
        this.scheduled.delete(`${ev.time}:${ev.netId}`);
      }

      // Group by netId for race detection.
      const byNet = new Map<string, SimEvent[]>();
      for (const ev of batch) {
        const arr = byNet.get(ev.netId);
        if (arr) arr.push(ev);
        else byNet.set(ev.netId, [ev]);
      }

      const changedGateIds = new Set<string>();

      for (const [netId, evts] of byNet) {
        // ── Race detection ──────────────────────────────────────────────
        const uniqueSources = new Set(evts.map(e => e.sourceGateId));
        const uniqueValues  = new Set(evts.map(e => e.value));
        if (uniqueSources.size > 1 || uniqueValues.size > 1) {
          races.push({
            raceId:   `${batchTime}:${netId}`,
            time:     batchTime,
            netId,
            gateIds:  [...uniqueSources],
            values:   [...uniqueValues] as SignalValue[],
          });
        }

        // Race resolution: last event in stable case; 0 (unknown) in conflicting case.
        const finalValue: SignalValue = uniqueValues.size > 1 ? 0 : evts[0].value;

        // Commit the value.
        const colonIdx = netId.indexOf(':');
        const gateId   = netId.slice(0, colonIdx);
        const portId   = netId.slice(colonIdx + 1);

        if (!this.committedOutputs[gateId]) this.committedOutputs[gateId] = {};
        const oldValue = this.committedOutputs[gateId][portId];

        if (oldValue !== finalValue) {
          this.committedOutputs[gateId][portId] = finalValue;
          // Mark all gates downstream of this net for re-evaluation.
          for (const { toGateId } of fanoutMap.get(netId) ?? []) {
            changedGateIds.add(toGateId);
          }
        }
      }

      // ── Step 3: Re-evaluate downstream gates ─────────────────────────
      for (const gateId of changedGateIds) {
        const gate = circuit.gates[gateId];
        if (gate) this._evaluateGate(gate, circuit, wireMap, batchTime);
      }

      this.currentTime = batchTime;
    }

    // Advance clock even if no events fired (queue may be empty / past targetTime).
    if (targetTime > this.currentTime) this.currentTime = targetTime;

    return races;
  }

  /** Build a SimBuffer snapshot from the current committed state. */
  buildBuffer(): SimBuffer {
    return {
      outputs:      this.committedOutputs,
      customStates: this.committedCustomStates,
      tick:         this.currentTime,
    };
  }

  /** Current simulation time. */
  get time(): number { return this.currentTime; }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Evaluate a gate using its current committed custom state. */
  private _evaluateGate(
    gate: { id: string; typeId: string; customState?: Record<string, unknown> },
    circuit: Circuit,
    wireMap: WireMap,
    triggerTime: number,
  ): void {
    const cs = this.committedCustomStates[gate.id] ?? gate.customState ?? {};
    this._evaluateGateWithCs(gate, circuit, wireMap, triggerTime, cs);
  }

  /** Evaluate a gate with an explicit custom state (used for CLOCK pause injection). */
  private _evaluateGateWithCs(
    gate: { id: string; typeId: string; customState?: Record<string, unknown> },
    circuit: Circuit,
    wireMap: WireMap,
    triggerTime: number,
    cs: Record<string, unknown>,
  ): void {
    let def;
    try { def = gateRegistry.get(gate.typeId); } catch { return; }

    // Read input signals from committed state.
    const inputValues: Record<string, SignalValue> = {};
    for (const inp of def.inputs) {
      const upstream = wireMap.get(`${gate.id}:${inp.id}`);
      inputValues[inp.id] = upstream
        ? ((this.committedOutputs[upstream.fromGateId]?.[upstream.fromPortId] ?? 0) as SignalValue)
        : 0;
    }

    // Evaluate outputs.
    const outputValues = def.evaluate(inputValues, cs);

    // Update custom state immediately (state transitions have no propagation delay).
    if (def.stateUpdate) {
      this.committedCustomStates[gate.id] = def.stateUpdate(
        inputValues,
        outputValues as Record<string, SignalValue>,
        cs,
      );
    } else {
      // Preserve existing custom state for non-stateful gates.
      if (!this.committedCustomStates[gate.id]) {
        this.committedCustomStates[gate.id] = { ...cs };
      }
    }

    // Schedule events for outputs that differ from the currently committed value.
    const delay = Math.max(1, def.propagationDelay ?? 1);
    const eventTime = triggerTime + delay;

    for (const [portId, rawVal] of Object.entries(outputValues)) {
      const val = rawVal as SignalValue;
      const netId    = `${gate.id}:${portId}`;
      const committed = this.committedOutputs[gate.id]?.[portId];

      if (committed === val) continue; // No change — no event needed.

      // Deduplication: if an event already scheduled for (eventTime, netId) with the
      // same value and same source, skip. If conflicting, replace (newer evaluation wins).
      const shadowKey  = `${eventTime}:${netId}`;
      const existing   = this.scheduled.get(shadowKey);
      if (existing && existing.value === val && existing.sourceGateId === gate.id) continue;

      // Remove superseded event from queue if present.
      if (existing) {
        const idx = this.queue.findIndex(
          e => e.time === eventTime && e.netId === netId && e.sourceGateId === gate.id,
        );
        if (idx !== -1) this.queue.splice(idx, 1);
      }

      // Enqueue new event in sorted order.
      this._enqueue({ time: eventTime, netId, value: val, sourceGateId: gate.id });
      this.scheduled.set(shadowKey, { value: val, sourceGateId: gate.id });
    }
  }

  /** Insert an event into the sorted queue. O(n) insertion — acceptable for small queues. */
  private _enqueue(ev: SimEvent): void {
    let i = this.queue.length;
    while (i > 0) {
      const prev = this.queue[i - 1];
      if (prev.time < ev.time) break;
      if (prev.time === ev.time && prev.netId <= ev.netId) break;
      i--;
    }
    this.queue.splice(i, 0, ev);
  }

  private _deepCopyOutputs(
    src: Record<string, Record<string, SignalValue>>,
  ): Record<string, Record<string, SignalValue>> {
    const dst: Record<string, Record<string, SignalValue>> = {};
    for (const [gid, ports] of Object.entries(src)) {
      dst[gid] = { ...ports };
    }
    return dst;
  }

  private _deepCopyCustomStates(
    src: Record<string, Record<string, unknown>>,
  ): Record<string, Record<string, unknown>> {
    const dst: Record<string, Record<string, unknown>> = {};
    for (const [gid, state] of Object.entries(src)) {
      dst[gid] = { ...state };
    }
    return dst;
  }
}

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

import type { Circuit, SignalValue, RaceInfo, RaceSeverity, RaceType } from '../types';
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
  seed(
    buffer: SimBuffer,
    circuit: Circuit,
    wireMap: WireMap,
    /**
     * Optional set of gate IDs whose live `gate.customState` should override the
     * buffer's committed custom states before the initial gate evaluation pass.
     *
     * Used for switch-only settles in GATE_DELAY mode: the caller passes the
     * pre-settle scheduler snapshot (with old committed outputs) and specifies
     * which INPUT_SWITCH / PUSH_BTN gates changed.  _evaluateGate() then detects
     * that the switch output differs from the committed output and schedules a
     * timed propagation event — producing the correct timing-diagram staircase
     * instead of an instant jump.
     */
    liveCustomStateFor?: ReadonlySet<string>,
  ): void {
    this.currentTime = buffer.tick;
    this.committedOutputs = this._deepCopyOutputs(buffer.outputs);
    this.committedCustomStates = this._deepCopyCustomStates(buffer.customStates);

    if (liveCustomStateFor) {
      for (const gate of Object.values(circuit.gates)) {
        if (liveCustomStateFor.has(gate.id) && gate.customState) {
          this.committedCustomStates[gate.id] = { ...gate.customState };
        }
      }
    }

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
   * Hardened detection (beyond the original multi-driver race):
   *   TASK 1 — Severity classification: critical / warning / glitch / timing / loop.
   *   TASK 2 — Reconvergent-glitch detection: nets that change polarity >1× per advance().
   *   TASK 3 — Setup / hold risk: FF clock rising-edge and data input change in same batch.
   *   TASK 4 — Latch race-through: covered by TASK 2 (latch outputs flagged as 'glitch').
   *   TASK 5 — Loop overflow guard: MAX_EVENTS_PER_ADVANCE cap prevents RAF stalls.
   *
   * @returns Detected race conditions and hazards in this time window.
   */
  advance(
    targetTime: number,
    circuit: Circuit,
    wireMap: WireMap,
    fanoutMap: FanoutMap,
    isClockPaused: boolean,
    /**
     * Optional callback invoked synchronously after every event-batch commits.
     * committedOutputs/customStates already reflect the new state when this runs.
     *
     * @param batchTime          Simulation tick at which this batch fired.
     * @param batchRaces         Races emitted during this batch (critical/warning/timing).
     *                           Glitch races are emitted post-loop, not here.
     * @param batchChangedNetIds NetIds whose committed value actually changed this batch.
     *
     * Used by CircuitContext for two purposes:
     *   1. Per-batch timing-diagram snapshots (propagation-delay staircase).
     *   2. TTL wire-marking: accumulate maxSeverity per netId across an entire
     *      advance() window so transient glitches stay visible in CanvasWire.
     * The glitch-detection window (netToggleCount) is NOT affected — it still
     * spans the full advance() call from currentTime → targetTime.
     */
    onBatchCommit?: (
      batchTime:          number,
      batchRaces:         RaceInfo[],
      batchChangedNetIds: ReadonlySet<string>,
    ) => void,
  ): RaceInfo[] {
    const races: RaceInfo[] = [];

    // ── TASK 5: Loop overflow guard ───────────────────────────────────────
    // Limits total events processed per advance() call.  Circuits with
    // combinational oscillation loops generate unbounded events; without this
    // guard the RAF callback blocks the UI until the queue drains.
    const MAX_EVENTS_PER_ADVANCE = 10_000;
    let eventsProcessed = 0;

    // ── TASK 2: Per-advance toggle counter per net ────────────────────────
    // Count how many times each net commits a polarity change.
    // >1 on a combinatorial or latch output → reconvergent glitch / race-through.
    const netToggleCount = new Map<string, number>();

    // ── TASK 3: Pre-compute per-gate metadata (one pass, O(G)) ───────────
    // gateClockInputId — gates that have a clock pin (for setup/hold check).
    // syncGateIds      — gates whose outputs can legitimately multi-toggle
    //                    (FFs + autonomous sources); excluded from glitch check.
    const gateClockInputId = new Map<string, string>();
    const syncGateIds      = new Set<string>();
    for (const gate of Object.values(circuit.gates)) {
      if (AUTONOMOUS_TYPES.has(gate.typeId)) {
        syncGateIds.add(gate.id);
        continue;
      }
      try {
        const def = gateRegistry.get(gate.typeId);
        if (def.clockInputId) gateClockInputId.set(gate.id, def.clockInputId);
        if (def.isSynchronous) syncGateIds.add(gate.id);
      } catch { /* gate type not in registry */ }
    }

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

      // TASK 5: Overflow check before extracting each batch.
      if (eventsProcessed >= MAX_EVENTS_PER_ADVANCE) {
        const overflowEv = this.queue[0];
        races.push({
          raceId:   `loop:${overflowEv.time}:${overflowEv.netId}`,
          time:     overflowEv.time,
          netId:    overflowEv.netId,
          gateIds:  [overflowEv.sourceGateId],
          values:   [overflowEv.value],
          severity: 'loop',
          type:     'loop_overflow',
        });
        break;
      }

      // Collect entire batch at the earliest time for race detection.
      const batchTime = this.queue[0].time;
      const batch: SimEvent[] = [];
      while (this.queue.length > 0 && this.queue[0].time === batchTime) {
        batch.push(this.queue.shift()!);
      }
      eventsProcessed += batch.length;

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

      const changedGateIds     = new Set<string>();
      const batchChangedNetIds = new Set<string>(); // netIds that actually committed a change
      const batchRaceStart     = races.length;       // index into races[] before this batch

      // TASK 3: Per-batch setup/hold tracking.
      // ffClockChanges: gateId → { oldVal, newVal } of its clock input in this batch.
      // ffDataChanged:  set of gateIds whose non-clock inputs also changed this batch.
      const ffClockChanges = new Map<string, { oldVal: SignalValue; newVal: SignalValue }>();
      const ffDataChanged  = new Set<string>();

      for (const [netId, evts] of byNet) {
        // ── Race detection with severity (TASK 1) ──────────────────────
        const uniqueSources = new Set(evts.map(e => e.sourceGateId));
        const uniqueValues  = new Set(evts.map(e => e.value));
        if (uniqueSources.size > 1 || uniqueValues.size > 1) {
          const severity: RaceSeverity = uniqueValues.size > 1 ? 'critical' : 'warning';
          const type: RaceType = uniqueValues.size > 1 ? 'value_conflict' : 'multi_source';
          races.push({
            raceId:   `${batchTime}:${netId}`,
            time:     batchTime,
            netId,
            gateIds:  [...uniqueSources],
            values:   [...uniqueValues] as SignalValue[],
            severity,
            type,
          });
        }

        // Race resolution: 0 (unknown) on conflict; otherwise the scheduled value.
        const finalValue: SignalValue = uniqueValues.size > 1 ? 0 : evts[0].value;

        // Commit the value.
        const colonIdx = netId.indexOf(':');
        const gateId   = netId.slice(0, colonIdx);
        const portId   = netId.slice(colonIdx + 1);

        if (!this.committedOutputs[gateId]) this.committedOutputs[gateId] = {};
        const oldValue = this.committedOutputs[gateId][portId];

        if (oldValue !== finalValue) {
          this.committedOutputs[gateId][portId] = finalValue;
          batchChangedNetIds.add(netId);

          // TASK 2: Count polarity changes per net.
          netToggleCount.set(netId, (netToggleCount.get(netId) ?? 0) + 1);

          // Mark downstream gates for re-evaluation and collect setup/hold info.
          for (const { toGateId, toPortId } of fanoutMap.get(netId) ?? []) {
            changedGateIds.add(toGateId);

            // TASK 3: Separate clock transitions from data transitions per FF gate.
            const clkId = gateClockInputId.get(toGateId);
            if (clkId !== undefined) {
              if (toPortId === clkId) {
                // Record the committed clock transition for this FF.
                ffClockChanges.set(toGateId, {
                  oldVal: (oldValue ?? 0) as SignalValue,
                  newVal: finalValue,
                });
              } else {
                // A non-clock input of this FF changed in the same batch.
                ffDataChanged.add(toGateId);
              }
            }
          }
        }
      }

      // TASK 3: Emit setup/hold timing risk races.
      // Fired when a FF sees a rising clock edge AND a data input change in the
      // same simulation batch — the hardware equivalent of a setup-time violation.
      for (const [gateId, clkTrans] of ffClockChanges) {
        if (clkTrans.oldVal !== 0 || clkTrans.newVal !== 1) continue; // Rising edge only
        if (!ffDataChanged.has(gateId)) continue;                      // No simultaneous data change

        // Report on the net that drives the clock input.
        const clkInputId = gateClockInputId.get(gateId)!;
        const upstream   = wireMap.get(`${gateId}:${clkInputId}`);
        const clkNetId   = upstream
          ? `${upstream.fromGateId}:${upstream.fromPortId}`
          : `${gateId}:${clkInputId}`;

        races.push({
          raceId:   `timing:${batchTime}:${gateId}`,
          time:     batchTime,
          netId:    clkNetId,
          gateIds:  [gateId],
          values:   [1],
          severity: 'timing',
          type:     'setup_hold_risk',
        });
      }

      // ── Step 3: Re-evaluate downstream gates ─────────────────────────
      for (const gateId of changedGateIds) {
        const gate = circuit.gates[gateId];
        if (gate) this._evaluateGate(gate, circuit, wireMap, batchTime);
      }

      this.currentTime = batchTime;

      // Notify caller after the full batch commit (incl. setup/hold races).
      // committedOutputs already contains the new state.  batchRaces covers
      // only races emitted during this batch (not the post-loop glitch pass).
      onBatchCommit?.(batchTime, races.slice(batchRaceStart), batchChangedNetIds);
    }

    // ── TASK 2 (post-loop): Emit glitch races for multi-toggle nets ───────
    // A combinatorial or latch net that committed more than one polarity
    // reversal within this advance() call is a reconvergent glitch or
    // latch race-through.  Synchronous / autonomous gate outputs are excluded
    // because they legitimately change multiple times per advance() (e.g. a
    // T-FF divider or a fast clock signal).
    const criticalNets = new Set(
      races.filter(r => r.severity === 'critical').map(r => r.netId),
    );
    const LATCH_TYPES = new Set(['SR_LATCH', 'D_LATCH', '74HC373']);

    for (const [netId, count] of netToggleCount) {
      if (count <= 1) continue;
      const gateId = netId.slice(0, netId.indexOf(':'));
      if (syncGateIds.has(gateId)) continue;      // FF / clock outputs — legitimate multi-toggle
      if (criticalNets.has(netId)) continue;       // Already flagged critical — don't double-report

      const portId  = netId.slice(netId.indexOf(':') + 1);
      const gate    = circuit.gates[gateId];
      const isLatch = gate ? LATCH_TYPES.has(gate.typeId) : false;

      races.push({
        raceId:   `glitch:${this.currentTime}:${netId}`,
        time:     this.currentTime,
        netId,
        gateIds:  [gateId],
        values:   [this.committedOutputs[gateId]?.[portId] ?? 0],
        severity: 'glitch',
        type:     isLatch ? 'latch_race_through' : 'reconvergent_glitch',
      });
    }

    // Advance clock even if no events fired (queue may be empty / past targetTime).
    if (targetTime > this.currentTime) this.currentTime = targetTime;

    return races;
  }

  /** Build a SimBuffer snapshot from the current committed state. */
  buildBuffer(): SimBuffer {
    // Deep-copy so that simBufferRef.current never aliases the scheduler's internal
    // mutable objects.  Without copies, isStable(oldBuf, newBuf) would compare an
    // object to itself after the first GATE_DELAY frame and always return true,
    // preventing SIMULATION_APPLY from firing (→ LED/wire display frozen).
    return {
      outputs:      this._deepCopyOutputs(this.committedOutputs),
      customStates: this._deepCopyCustomStates(this.committedCustomStates),
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
    _circuit: Circuit,
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

    // Evaluate outputs with OLD state (for combinational gates).
    const outputValuesOld = def.evaluate(inputValues, cs);

    // Update custom state immediately (state transitions have no propagation delay).
    let outputValues: Record<string, SignalValue>;
    if (def.stateUpdate) {
      const newCs = def.stateUpdate(
        inputValues,
        outputValuesOld as Record<string, SignalValue>,
        cs,
      );
      this.committedCustomStates[gate.id] = newCs;
      // For stateful elements, re-evaluate outputs with NEW state.
      // This ensures FF outputs reflect state changes (e.g., Q changes on clock edge).
      outputValues = def.evaluate(inputValues, newCs);
    } else {
      // Preserve existing custom state for non-stateful gates.
      if (!this.committedCustomStates[gate.id]) {
        this.committedCustomStates[gate.id] = { ...cs };
      }
      outputValues = outputValuesOld;
    }

    // Schedule events for outputs that differ from the currently committed value.
    const delay = Math.max(0, def.propagationDelay ?? 1);
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

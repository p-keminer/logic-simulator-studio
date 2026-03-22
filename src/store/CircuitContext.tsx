import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { Circuit, SignalValue, TimingSnapshot, RaceIncident, RaceInfo, RaceSeverity } from '../core/types';
import type { CircuitAction } from './actions';
import { circuitReducer, createEmptyCircuit } from './circuitReducer';
import { registerEmbeddedCustomIcLibrary } from '../core/customIc/embeddedLibrary';
import {
  clearRaceMonitorState,
  expireRaceMarks,
  pruneRaceMonitorState,
  recordDetectedRaceBatch,
  type RaceMark,
} from './raceMonitorState';
import {
  initBuffer, syncBuffer, buildWireMap,
  runUntilStable, isStable,
  buildSimResult, SIM_TICKS_PER_SEC,
} from '../core/simulation/tickEngine';
import type { SimBuffer, WireMap } from '../core/simulation/tickEngine';
import { EventScheduler, buildFanoutMap } from '../core/simulation/eventScheduler';
import type { FanoutMap } from '../core/simulation/eventScheduler';

const MAX_HISTORY  = 1000;
const AUTOSAVE_KEY = 'lgsim_autosave';

/**
 * Take one timing-diagram snapshot per N event-batches.
 * Value 1 = maximum resolution — every distinct simulation-time with a net
 * change produces one diagram step.  20-NOT chain → 20-step staircase.
 * Glitch detection (netToggleCount) still covers the full advance() window.
 */
const SAMPLE_EVERY = 1;

/**
 * How long (ms) a wire-marking stays visible in CanvasWire after the last
 * detection in that net.  Prevents fast-glitch flicker while ensuring
 * transient findings (setup/hold, glitch) remain on screen long enough to read.
 * Only active in GATE_DELAY mode.
 */
const RACE_TTL_MS = 400;

// eslint-disable-next-line react-refresh/only-export-components
export function loadSavedCircuit(): Circuit | null {
  try {
    const s = sessionStorage.getItem(AUTOSAVE_KEY);
    if (!s) return null;
    const raw = JSON.parse(s) as Circuit;
    // Apply field migration (same as deserializeCircuit) without gate-type
    // validation — Custom ICs may not be registered yet at call time.
    const defaultSignal = { value: 0 as const, version: 0, lastChangedAt: 0 };
    for (const gate of Object.values(raw.gates ?? {})) {
      gate.isSelected = false;
      gate.outputSignals ??= {};
    }
    for (const wire of Object.values(raw.wires ?? {})) {
      wire.isSelected = false;
      wire.signal ??= { ...defaultSignal };
    }
    raw.viewport ??= { panX: 0, panY: 0, zoom: 1 };
    registerEmbeddedCustomIcLibrary(raw);
    return raw;
  } catch { return null; }
}

interface CircuitContextValue {
  circuit: Circuit;
  dispatch: React.Dispatch<CircuitAction>;
  timingHistory: TimingSnapshot[];
  clearTimingHistory: () => void;
  isClockPaused: boolean;
  setIsClockPaused: (v: boolean) => void;
  stepOneClock: () => void;
  /** Race conditions detected in the last GATE_DELAY advance. */
  races: RaceIncident[];
  clearRaceMonitor: () => void;
  /**
   * Map of netId → worst RaceSeverity for wires currently involved in a race.
   * Used by CanvasWire to highlight affected wires with severity-based colours.
   * Map.has() works identically to the former ReadonlySet.has() call.
   */
  raceNetIds: Map<string, RaceSeverity>;
  /**
   * Lookup map: portKey (`${toGateId}:${toPortId}`) → wireId.
   * Rebuilt only when the set of wires changes (not on signal updates).
   * Allows O(1) input-signal resolution in resolveInputSignals / CanvasGate.
   */
  portToWireIdMap: ReadonlyMap<string, string>;
}

const CircuitContext = createContext<CircuitContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  initialCircuit?: Circuit;
}

export function CircuitProvider({ children, initialCircuit }: ProviderProps) {
  const [circuit, dispatch] = useReducer(
    circuitReducer, undefined,
    () => initialCircuit ?? createEmptyCircuit()
  );
  const [timingHistory, setTimingHistory] = useState<TimingSnapshot[]>([]);
  const [isClockPaused, setIsClockPaused] = useState(false);
  const [races, setRaces] = useState<RaceIncident[]>([]);
  const [raceNetIds, setRaceNetIds] = useState<Map<string, RaceSeverity>>(new Map());

  // ── Immer-aktuelle Refs (kein stale-closure-Problem im RAF-Handler) ────────
  const circuitRef       = useRef<Circuit>(circuit);
  circuitRef.current     = circuit;

  const isClockPausedRef = useRef(isClockPaused);
  isClockPausedRef.current = isClockPaused;

  const racesRef = useRef(races);
  racesRef.current = races;

  // ── Tick-Engine-Zustand ───────────────────────────────────────────────────
  const simBufferRef     = useRef<SimBuffer | null>(null);
  const wireMapRef       = useRef<WireMap>(new Map());
  const needsSettleRef   = useRef(true);   // Initial settle beim ersten Frame
  const rafRef           = useRef(0);
  const lastTsRef        = useRef(0);      // Letzter RAF-Timestamp
  const stepRef          = useRef(0);      // Timing-History-Schrittzähler
  const sampleCounterRef = useRef(0);      // Zählt Ticks zwischen Snapshots
  const isFirstRender    = useRef(true);

  // ── GATE_DELAY-Engine-Zustand ─────────────────────────────────────────────
  const schedulerRef     = useRef<EventScheduler | null>(null);
  const fanoutMapRef     = useRef<FanoutMap>(new Map());
  /**
   * TTL wire-marking map: netId → { severity, lastSeenMs }.
   * Mutable ref — never stored in React state so updates don't trigger renders.
   * Converted to raceNetIds (React state) only when the derived Map changes.
   */
  const raceMarkRef      = useRef<Map<string, RaceMark>>(new Map());
  /** Tracks last-seen gate / wire ID sets to distinguish structural vs switch-only settles. */
  const prevGateKeysRef  = useRef<Set<string>>(new Set());
  const prevWireKeysRef  = useRef<Set<string>>(new Set());

  const clearTimingHistory = useCallback(() => setTimingHistory([]), []);
  const clearRaceMonitor = useCallback(() => {
    const cleared = clearRaceMonitorState();
    racesRef.current = cleared.incidents;
    setRaces(cleared.incidents);
    setRaceNetIds(cleared.netIds);
    raceMarkRef.current = cleared.marks;
  }, []);

  // ── Auto-Save (debounced 500 ms) ──────────────────────────────────────────
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      try { sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(circuit)); } catch { /* quota */ }
    }, 500);
    return () => { if (autosaveTimerRef.current !== null) clearTimeout(autosaveTimerRef.current); };
  }, [circuit]);

  // ── beforeunload-Warnung wenn Canvas nicht leer ───────────────────────────
  // gateCountRef allows the listener to be registered only once (stable dep [])
  // while still reading the current gate count on every beforeunload event.
  const gateCountRef = useRef(Object.keys(circuit.gates).length);
  const gateCount = Object.keys(circuit.gates).length;
  useEffect(() => { gateCountRef.current = gateCount; }, [gateCount]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (gateCountRef.current > 0) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ── Strukturelle Änderungen → Settle anfordern ────────────────────────────
  // (Gate hinzugefügt/entfernt, Draht gezogen/getrennt, Input-Schalter umgelegt)
  const gateKeys = Object.keys(circuit.gates).sort().join(',');
  const wireKeys = Object.keys(circuit.wires).sort().join(',');

  // ── O(1) Input-Port Lookup Map ────────────────────────────────────────────
  // Rebuilt only when the wire set changes (not on signal updates).
  // portKey = `${toGateId}:${toPortId}` → wireId
  const portToWireIdMap = useMemo<ReadonlyMap<string, string>>(() => {
    const m = new Map<string, string>();
    for (const wire of Object.values(circuit.wires)) {
      m.set(`${wire.to.gateId}:${wire.to.portId}`, wire.id);
    }
    return m;
  }, [wireKeys]); // eslint-disable-line react-hooks/exhaustive-deps
  const switchStates = Object.values(circuit.gates)
    .filter(g =>
      g.typeId === 'INPUT_SWITCH' ||
      g.typeId === 'PUSH_BTN'     ||
      g.typeId === 'CONST_HIGH'   ||
      g.typeId === 'CONST_LOW'    ||
      g.typeId === 'ADC8'
    )
    .map(g => g.id + ':' + ((g.customState?.value as number) ?? 0))
    .sort().join(',');
  // CLOCK-Wert ist NICHT in switchStates — der Tick-Engine verwaltet ihn intern

  useEffect(() => {
    // Wire-Map und Fanout-Map neu bauen wenn Drähte/Gatter sich geändert haben
    wireMapRef.current   = buildWireMap(circuitRef.current);
    fanoutMapRef.current = buildFanoutMap(circuitRef.current);
    needsSettleRef.current = true;
  }, [gateKeys, wireKeys, switchStates]);

  // ── Push-Button Auto-Release (150 ms) ─────────────────────────────────────
  const pushBtnStates = Object.values(circuit.gates)
    .filter(g => g.typeId === 'PUSH_BTN')
    .map(g => g.id + ':' + ((g.customState?.value as number) ?? 0))
    .sort().join(',');

  useEffect(() => {
    const active = Object.values(circuit.gates).filter(
      g => g.typeId === 'PUSH_BTN' && (g.customState?.value as number) === 1
    );
    const timers = active.map(btn =>
      setTimeout(() => dispatch({ type: 'GATE_BTN_RELEASE', payload: { gateId: btn.id } }), 150)
    );
    return () => { for (const t of timers) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushBtnStates]);

  // ── Manueller Clock-Schritt (bei pausiertem Takt) ─────────────────────────
  const stepOneClock = useCallback(() => {
    Object.values(circuitRef.current.gates)
      .filter(g => g.typeId === 'CLOCK')
      .forEach(g => dispatch({ type: 'GATE_CLOCK_TICK', payload: { gateId: g.id } }));
    // Settle auslösen: syncBuffer übernimmt den getoggleten Clock-Wert beim nächsten Frame
    needsSettleRef.current = true;
  }, []);

  // ── Shared snapshot builder (deduplicates 3 identical blocks) ─────────────
  function buildTimingSnapshot(
    outputs: Record<string, Record<string, SignalValue>>,
    circuit: Circuit,
    tick: number,
  ): TimingSnapshot {
    const step = ++stepRef.current;
    const wireValues: Record<string, SignalValue> = {};
    for (const wire of Object.values(circuit.wires)) {
      wireValues[wire.id] = (outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as SignalValue;
    }
    const gateValues: Record<string, SignalValue> = {};
    for (const [gId, ports] of Object.entries(outputs)) {
      for (const [pId, val] of Object.entries(ports)) {
        gateValues[`${gId}:${pId}`] = val;
      }
    }
    return { step, tick, wireValues, gateValues };
  }

  // ── RAF-Simulations-Schleife ──────────────────────────────────────────────
  useEffect(() => {
    const frame = (timestamp: number) => {
      const c = circuitRef.current;

      // Lazily initialisieren
      if (!simBufferRef.current) {
        simBufferRef.current = initBuffer(c);
        wireMapRef.current   = buildWireMap(c);
        fanoutMapRef.current = buildFanoutMap(c);
        needsSettleRef.current = true;
      }

      // Benutzereingaben + Struktur aus React-State in SimBuffer übernehmen
      simBufferRef.current = syncBuffer(
        simBufferRef.current, c, isClockPausedRef.current
      );

      // Delta-Zeit für diesen Frame berechnen
      const rawDelta = lastTsRef.current === 0 ? 16 : (timestamp - lastTsRef.current);
      lastTsRef.current = timestamp;
      const delta = Math.min(rawDelta, 50); // Max 50 ms → verhindert Tick-Explosion nach Tab-Wechsel

      let buf        = simBufferRef.current;
      let anyChanged = false;

      // ── Settle-Phase: ─────────────────────────────────────────────────────
      // Schaltung nach Änderungen stabilisieren. Clocks sind dabei eingefroren.
      // Läuft auch während der Pause, damit Schalter-Änderungen sofort propagieren.
      // Dient als Ausgangs-Seed für den Scheduler.
      if (needsSettleRef.current) {
        needsSettleRef.current = false;

        // Determine whether this settle was triggered by a structural change
        // (gate / wire added or removed) or by a user switch-only toggle.
        // Only switch-only settles use a special re-seed path.
        // Set-based O(n) comparison — avoids sort() + string allocation per settle.
        const gateIds = Object.keys(c.gates);
        const wireIds = Object.keys(c.wires);
        let isStructuralChange =
          gateIds.length !== prevGateKeysRef.current.size ||
          wireIds.length !== prevWireKeysRef.current.size;
        if (!isStructuralChange) {
          for (const id of gateIds) {
            if (!prevGateKeysRef.current.has(id)) { isStructuralChange = true; break; }
          }
        }
        if (!isStructuralChange) {
          for (const id of wireIds) {
            if (!prevWireKeysRef.current.has(id)) { isStructuralChange = true; break; }
          }
        }
        prevGateKeysRef.current = new Set(gateIds);
        prevWireKeysRef.current = new Set(wireIds);

        // For switch-only changes: capture the scheduler's current committed
        // state BEFORE runUntilStable propagates the change instantly.  After
        // settle we re-seed from this snapshot while injecting the new switch
        // customStates, so seed() detects the output transition and schedules
        // a proper timed propagation event.
        let preSettleBuf: SimBuffer | null = null;
        let switchGateIds: ReadonlySet<string> | undefined;
        if (
          !isStructuralChange &&
          schedulerRef.current !== null
        ) {
          preSettleBuf = schedulerRef.current.buildBuffer();
          switchGateIds = new Set(
            Object.values(c.gates)
              .filter(g => g.typeId === 'INPUT_SWITCH' || g.typeId === 'PUSH_BTN' || g.typeId === 'ADC8' || g.typeId === 'CLOCK')
              .map(g => g.id),
          );
        }

        const result = runUntilStable(c, buf, wireMapRef.current);
        if (result.changed) anyChanged = true;
        buf = result.buffer;

        // Re-seed the scheduler.
        if (schedulerRef.current) {
          if (preSettleBuf && switchGateIds) {
            // Switch-only: seed from pre-settle snapshot + live switch customStates.
            // seed() detects that the switch output changed (old committed vs new cs)
            // and enqueues a timed event → downstream chain propagates with delays.
            schedulerRef.current.seed(preSettleBuf, c, wireMapRef.current, switchGateIds);
          } else {
            // Structural change or first settle: seed from fully-settled buffer.
            schedulerRef.current.seed(buf, c, wireMapRef.current);
          }
        }
      }

      // ── Pause-Guard ───────────────────────────────────────────────────────
      if (isClockPausedRef.current) {
        // TTL wire-markings must expire even while the clock is paused.
        // Without this, a 400 ms glitch marking would hang indefinitely in pause.
        const nowMs = Date.now();
        const expired = expireRaceMarks(racesRef.current, raceMarkRef.current, nowMs, RACE_TTL_MS);
        if (expired.marks.size !== raceMarkRef.current.size) {
          racesRef.current = expired.incidents;
          setRaces(expired.incidents);
          raceMarkRef.current = expired.marks;
          setRaceNetIds(expired.netIds);
        }
        simBufferRef.current = buf;
        if (anyChanged) {
          const result = buildSimResult(buf, c);
          dispatch({ type: 'SIMULATION_APPLY', payload: result });
        }
        if (anyChanged) {
          const snap = buildTimingSnapshot(buf.outputs, c, buf.tick);
          setTimingHistory(prev => {
            const next = [...prev, snap];
            return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
          });
        }
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const ticksToRun = Math.max(1, Math.round(SIM_TICKS_PER_SEC * delta / 1000));

      // ─────────────────────────────────────────────────────────────────────
      // GATE_DELAY MODE — discrete-event scheduler
      // ─────────────────────────────────────────────────────────────────────

      // Lazily create scheduler if not yet seeded (e.g. first frame).
      if (!schedulerRef.current) {
        schedulerRef.current = new EventScheduler();
        schedulerRef.current.seed(buf, c, wireMapRef.current);
      }

        const scheduler = schedulerRef.current;
        const targetTime = scheduler.time + ticksToRun;

        // ── onBatchCommit: per-batch timing snapshots ──────────────────────
        // Fires synchronously inside advance() after each event-batch commits.
        // committedOutputs already reflects the new state at that point.
        // Timing-diagram snapshot — one step per batch = per-gate-level resolution
        //    so a 20-NOT chain shows a 20-step staircase.
        const newSnaps: TimingSnapshot[] = [];
        const onBatchCommit = (
          batchTime:        number,
          _batchRaces:      RaceInfo[],
          batchChangedNets: ReadonlySet<string>,
        ) => {
          // Timing-diagram snapshot.
          // Skip batches where nothing actually committed a new value.  This
          // prevents spurious flat steps caused by the redundant Step-1
          // re-evaluations of INPUT_SWITCH / PUSH_BTN gates that the scheduler
          // generates after a switch-only seed: those events arrive after the
          // first real transition has already committed the new output, so their
          // committed value equals the final value → no downstream change.
          if (batchChangedNets.size === 0) return;

          // In paused (step) mode: skip per-batch snapshots.
          // One final-state snapshot is pushed after advance() completes (below).
          if (isClockPausedRef.current) return;

          sampleCounterRef.current++;
          if (sampleCounterRef.current < SAMPLE_EVERY) return;
          sampleCounterRef.current = 0;
          // buildBuffer() deep-copies — no aliasing of scheduler internals.
          const s = scheduler.buildBuffer();
          newSnaps.push(buildTimingSnapshot(s.outputs, c, batchTime));
        };

        const detectedRaces = scheduler.advance(
          targetTime,
          c,
          wireMapRef.current,
          fanoutMapRef.current,
          isClockPausedRef.current,
          onBatchCommit,
        );

        const nowMs = Date.now();
        const newBuf = scheduler.buildBuffer();

        // Determine if any signals changed compared to the last committed state.
        if (!isStable(buf, newBuf)) {
          anyChanged = true;
          // In paused step mode: push exactly 1 final-state snapshot per ⏭ click.
          // (Per-batch sampling was suppressed in onBatchCommit above.)
          if (isClockPausedRef.current && newSnaps.length === 0) {
            newSnaps.push(buildTimingSnapshot(newBuf.outputs, c, newBuf.tick));
          }
        }

        // Keep simBuffer in sync so settle still works correctly.
        simBufferRef.current = {
          outputs:      newBuf.outputs,
          customStates: newBuf.customStates,
          tick:         newBuf.tick,
        };

        if (anyChanged) {
          const result = buildSimResult(newBuf, c);
          dispatch({ type: 'SIMULATION_APPLY', payload: result });
        }

        if (detectedRaces.length > 0) {
          const MAX_RACES = 50;
          const next = recordDetectedRaceBatch(
            racesRef.current,
            raceMarkRef.current,
            detectedRaces,
            c,
            nowMs,
            MAX_RACES,
          );
          racesRef.current = next.incidents;
          raceMarkRef.current = next.marks;
          setRaces(next.incidents);
          setRaceNetIds(next.netIds);
        } else {
          const expired = expireRaceMarks(racesRef.current, raceMarkRef.current, nowMs, RACE_TTL_MS);
          if (expired.marks.size !== raceMarkRef.current.size) {
            racesRef.current = expired.incidents;
            raceMarkRef.current = expired.marks;
            setRaces(expired.incidents);
            setRaceNetIds(expired.netIds);
          }
        }

        // ── Timing history ───────────────────────────────────────────────
        if (newSnaps.length > 0) {
          setTimingHistory(prev => {
            const next = [...prev, ...newSnaps];
            return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
          });
        }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // Nur einmal starten — alle Werte kommen aus Refs

  // ── Circuit-ID change: clear race state on CIRCUIT_LOAD / CIRCUIT_RESET ──
  // circuit.id changes whenever a new circuit is loaded or the canvas is reset.
  // Stale race entries from the previous circuit must not leak into the new one.
  useEffect(() => {
    clearRaceMonitor();
    // The scheduler will be re-seeded automatically on the next settle.
  }, [circuit.id, clearRaceMonitor]);

  // ── Structure change: prune stale race history and wire markings ─────────
  useEffect(() => {
    const currentCircuit = circuitRef.current;
    const next = pruneRaceMonitorState(racesRef.current, raceMarkRef.current, currentCircuit);
    racesRef.current = next.incidents;
    raceMarkRef.current = next.marks;
    setRaces(next.incidents);
    setRaceNetIds(next.netIds);
  }, [gateKeys, wireKeys]);

  return (
    <CircuitContext.Provider value={{
      circuit, dispatch,
      timingHistory, clearTimingHistory,
      isClockPaused, setIsClockPaused,
      stepOneClock,
      races,
      clearRaceMonitor,
      raceNetIds,
      portToWireIdMap,
    }}>
      {children}
    </CircuitContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCircuitContext(): CircuitContextValue {
  const ctx = useContext(CircuitContext);
  if (!ctx) throw new Error('useCircuitContext must be used within CircuitProvider');
  return ctx;
}

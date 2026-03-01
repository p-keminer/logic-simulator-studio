import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import type { Circuit, SignalValue, TimingSnapshot, RaceInfo, RaceSeverity } from '../core/types';
import type { CircuitAction } from './actions';
import { circuitReducer, createEmptyCircuit } from './circuitReducer';
import {
  initBuffer, syncBuffer, buildWireMap,
  runOneTick, runUntilStable, isStable,
  buildSimResult, SIM_TICKS_PER_SEC,
} from '../core/simulation/tickEngine';
import type { SimBuffer, WireMap } from '../core/simulation/tickEngine';
import { EventScheduler, buildFanoutMap } from '../core/simulation/eventScheduler';
import type { FanoutMap } from '../core/simulation/eventScheduler';
import { SimulationMode } from './simulationMode';

const MAX_HISTORY  = 1000;
const AUTOSAVE_KEY = 'lgsim_autosave';

/**
 * Einen Snapshot alle N Simulations-Ticks aufnehmen.
 * Sampling ist tick-genau (dank sampleCounterRef), daher ist der zeitliche
 * Abstand zwischen je zwei aufeinander folgenden Snapshots immer exakt
 * SAMPLE_EVERY Ticks — unabhängig von der variablen RAF-Framerate.
 * → Index-basierte X-Achse im TimingDiagram ist jitter-frei.
 *
 * Bei SIM_TICKS_PER_SEC=500 und SAMPLE_EVERY=25:
 *   20 Snapshots/s → MAX_HISTORY=1000 → 50 s gespeichert
 *   Für 1 Hz-Clock: Toggle alle 250 Ticks = 10 Diagram-Steps pro Halbperiode
 *   → Bei STEP_W=3px: 30px/Halbwelle, 60px/Periode → ~11 Zyklen auf 700px ✓
 */
const SAMPLE_EVERY = 25;
/**
 * In GATE_DELAY mode, take one timing-diagram snapshot per N event-batches.
 * Value 1 = maximum resolution — every distinct simulation-time with a net
 * change produces one diagram step.  20-NOT chain → 20-step staircase.
 * Glitch detection (netToggleCount) still covers the full advance() window.
 */
const GATE_DELAY_SAMPLE_EVERY = 1;

// ── Severity helpers (single source of truth) ─────────────────────────────
/**
 * Numeric rank for RaceSeverity.  Higher = more severe.
 * Used for the TTL wire-marking map and raceNetIds accumulation.
 * Priority: critical > timing > glitch > warning > loop
 */
const SEVERITY_RANK: Record<RaceSeverity, number> = {
  loop: 1, warning: 2, glitch: 3, timing: 4, critical: 5,
};
const maxSev = (a: RaceSeverity, b: RaceSeverity): RaceSeverity =>
  SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;

/**
 * How long (ms) a wire-marking stays visible in CanvasWire after the last
 * detection in that net.  Prevents fast-glitch flicker while ensuring
 * transient findings (setup/hold, glitch) remain on screen long enough to read.
 * Only active in GATE_DELAY mode.
 */
const RACE_TTL_MS = 400;

/** Internal entry in the per-net TTL tracking map. */
interface RaceMark {
  severity:   RaceSeverity;
  lastSeenMs: number;
}

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
  /** Current simulation mode (ZERO_DELAY | GATE_DELAY). */
  simulationMode: SimulationMode;
  setSimulationMode: (mode: SimulationMode) => void;
  /** Race conditions detected in the last GATE_DELAY advance. */
  races: RaceInfo[];
  /**
   * Map of netId → worst RaceSeverity for wires currently involved in a race.
   * Used by CanvasWire to highlight affected wires with severity-based colours.
   * Map.has() works identically to the former ReadonlySet.has() call.
   */
  raceNetIds: Map<string, RaceSeverity>;
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
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(SimulationMode.ZERO_DELAY);
  const [races, setRaces] = useState<RaceInfo[]>([]);
  const [raceNetIds, setRaceNetIds] = useState<Map<string, RaceSeverity>>(new Map());

  // ── Immer-aktuelle Refs (kein stale-closure-Problem im RAF-Handler) ────────
  const circuitRef       = useRef<Circuit>(circuit);
  circuitRef.current     = circuit;

  const isClockPausedRef = useRef(isClockPaused);
  isClockPausedRef.current = isClockPaused;

  const simulationModeRef = useRef(simulationMode);
  simulationModeRef.current = simulationMode;

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
  /** Set to true whenever raceMarkRef is mutated; cleared after state sync. */
  const raceMarkDirtyRef = useRef(false);
  // Ref to last known mode so we can detect mode switches and re-seed.
  const prevModeRef      = useRef<SimulationMode>(SimulationMode.ZERO_DELAY);
  /** Tracks last-seen gate / wire key strings to distinguish structural vs switch-only settles. */
  const prevGateKeysRef  = useRef('');
  const prevWireKeysRef  = useRef('');

  const clearTimingHistory = useCallback(() => setTimingHistory([]), []);

  // ── Auto-Save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    try { sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(circuit)); } catch { /* quota */ }
  }, [circuit]);

  // ── beforeunload-Warnung wenn Canvas nicht leer ───────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (Object.keys(circuit.gates).length > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [circuit.gates]);

  // ── Strukturelle Änderungen → Settle anfordern ────────────────────────────
  // (Gate hinzugefügt/entfernt, Draht gezogen/getrennt, Input-Schalter umgelegt)
  const gateKeys = Object.keys(circuit.gates).sort().join(',');
  const wireKeys = Object.keys(circuit.wires).sort().join(',');
  const switchStates = Object.values(circuit.gates)
    .filter(g =>
      g.typeId === 'INPUT_SWITCH' ||
      g.typeId === 'PUSH_BTN'     ||
      g.typeId === 'CONST_HIGH'   ||
      g.typeId === 'CONST_LOW'
    )
    .map(g => g.id + ':' + ((g.customState?.value as number) ?? 0))
    .sort().join(',');
  // CLOCK-Wert ist NICHT in switchStates — der Tick-Engine verwaltet ihn intern

  useEffect(() => {
    // Wire-Map und Fanout-Map neu bauen wenn Drähte/Gatter sich geändert haben
    wireMapRef.current   = buildWireMap(circuitRef.current);
    fanoutMapRef.current = buildFanoutMap(circuitRef.current);
    needsSettleRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // ── Settle-Phase (immer im ZERO_DELAY-Modus): ────────────────────────
      // Schaltung nach Änderungen stabilisieren. Clocks sind dabei eingefroren.
      // Läuft auch während der Pause, damit Schalter-Änderungen sofort propagieren.
      // Im GATE_DELAY-Modus dient dies als Ausgangs-Seed für den Scheduler.
      if (needsSettleRef.current) {
        needsSettleRef.current = false;

        // Determine whether this settle was triggered by a structural change
        // (gate / wire added or removed) or by a user switch-only toggle.
        // Only switch-only settles in GATE_DELAY mode use a special re-seed path.
        const currentGateKeys = Object.keys(c.gates).sort().join(',');
        const currentWireKeys = Object.keys(c.wires).sort().join(',');
        const isStructuralChange =
          currentGateKeys !== prevGateKeysRef.current ||
          currentWireKeys !== prevWireKeysRef.current;
        prevGateKeysRef.current = currentGateKeys;
        prevWireKeysRef.current = currentWireKeys;

        // For switch-only changes in GATE_DELAY mode: capture the scheduler's
        // current committed state BEFORE runUntilStable propagates the change
        // instantly.  After settle we re-seed from this snapshot while injecting
        // the new switch customStates, so seed() detects the output transition
        // and schedules a proper timed propagation event.
        let preSettleBuf: SimBuffer | null = null;
        let switchGateIds: ReadonlySet<string> | undefined;
        if (
          !isStructuralChange &&
          schedulerRef.current !== null &&
          simulationModeRef.current === SimulationMode.GATE_DELAY
        ) {
          preSettleBuf = schedulerRef.current.buildBuffer();
          switchGateIds = new Set(
            Object.values(c.gates)
              .filter(g => g.typeId === 'INPUT_SWITCH' || g.typeId === 'PUSH_BTN')
              .map(g => g.id),
          );
        }

        const result = runUntilStable(c, buf, wireMapRef.current);
        if (result.changed) anyChanged = true;
        buf = result.buffer;

        // Re-seed the GATE_DELAY scheduler.
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

      const mode = simulationModeRef.current;

      // ── Mode-Switch Detection: re-seed GATE_DELAY scheduler ──────────────
      if (mode !== prevModeRef.current) {
        prevModeRef.current = mode;
        if (mode === SimulationMode.GATE_DELAY) {
          // Create or re-create the scheduler and seed from current settled state.
          schedulerRef.current = new EventScheduler();
          schedulerRef.current.seed(buf, c, wireMapRef.current);
        }
      }

      // ── Pause-Guard ───────────────────────────────────────────────────────
      if (isClockPausedRef.current) {
        simBufferRef.current = buf;
        if (anyChanged) {
          const result = buildSimResult(buf, c);
          dispatch({ type: 'SIMULATION_APPLY', payload: result });
        }
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const ticksToRun = Math.max(1, Math.round(SIM_TICKS_PER_SEC * delta / 1000));

      // ─────────────────────────────────────────────────────────────────────
      // ZERO_DELAY MODE (default — exact original behaviour)
      // ─────────────────────────────────────────────────────────────────────
      if (mode === SimulationMode.ZERO_DELAY) {
        const preTickBuf = buf;
        const newSnaps: TimingSnapshot[] = [];

        for (let i = 0; i < ticksToRun; i++) {
          const next = runOneTick(c, buf, wireMapRef.current, false);
          if (!isStable(buf, next)) anyChanged = true;
          buf = next;

          sampleCounterRef.current++;
          if (sampleCounterRef.current >= SAMPLE_EVERY) {
            sampleCounterRef.current = 0;
            const step = ++stepRef.current;
            const tick = buf.tick;
            const wireValues: Record<string, SignalValue> = {};
            for (const wire of Object.values(c.wires)) {
              wireValues[wire.id] = (buf.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as SignalValue;
            }
            const gateValues: Record<string, SignalValue> = {};
            for (const [gId, ports] of Object.entries(buf.outputs)) {
              for (const [pId, val] of Object.entries(ports)) {
                gateValues[`${gId}:${pId}`] = val;
              }
            }
            newSnaps.push({ step, tick, wireValues, gateValues });
          }
        }

        // Geradzahliger Oszillator-Fix
        if (anyChanged && isStable(preTickBuf, buf)) {
          buf = runOneTick(c, buf, wireMapRef.current, false);
        }

        simBufferRef.current = buf;

        if (anyChanged) {
          const result = buildSimResult(buf, c);
          dispatch({ type: 'SIMULATION_APPLY', payload: result });
        }

        if (newSnaps.length > 0) {
          setTimingHistory(prev => {
            const next = [...prev, ...newSnaps];
            return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
          });
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // GATE_DELAY MODE — discrete-event scheduler
      // ─────────────────────────────────────────────────────────────────────
      else {
        // Lazily create scheduler if not yet seeded (e.g. first frame after mode switch).
        if (!schedulerRef.current) {
          schedulerRef.current = new EventScheduler();
          schedulerRef.current.seed(buf, c, wireMapRef.current);
        }

        const scheduler = schedulerRef.current;
        const targetTime = scheduler.time + ticksToRun;

        // ── onBatchCommit: TTL wire-marking + per-batch timing snapshots ──
        // Fires synchronously inside advance() after each event-batch commits.
        // committedOutputs already reflects the new state at that point.
        //
        // A) TTL wire-marking — updates raceMarkRef with max-severity per netId.
        //    Glitch detection (netToggleCount) accumulates over the FULL advance()
        //    window — this callback only handles critical/warning/timing races that
        //    are known per-batch.  Glitch races (post-loop) are handled separately.
        //
        // B) Timing-diagram snapshot — one step per batch = per-gate-level resolution
        //    so a 20-NOT chain shows a 20-step staircase.
        const newSnaps: TimingSnapshot[] = [];
        const onBatchCommit = (
          batchTime:        number,
          batchRaces:       RaceInfo[],
          batchChangedNets: ReadonlySet<string>,
        ) => {
          // A) TTL marking for per-batch races (critical / warning / timing).
          if (batchRaces.length > 0) {
            const now = Date.now();
            for (const race of batchRaces) {
              const existing = raceMarkRef.current.get(race.netId);
              raceMarkRef.current.set(race.netId, {
                severity:   existing ? maxSev(existing.severity, race.severity) : race.severity,
                lastSeenMs: now,
              });
            }
            raceMarkDirtyRef.current = true;
          }

          // B) Timing-diagram snapshot.
          // Skip batches where nothing actually committed a new value.  This
          // prevents spurious flat steps caused by the redundant Step-1
          // re-evaluations of INPUT_SWITCH / PUSH_BTN gates that the scheduler
          // generates after a switch-only seed: those events arrive after the
          // first real transition has already committed the new output, so their
          // committed value equals the final value → no downstream change.
          if (batchChangedNets.size === 0) return;

          sampleCounterRef.current++;
          if (sampleCounterRef.current < GATE_DELAY_SAMPLE_EVERY) return;
          sampleCounterRef.current = 0;
          // buildBuffer() deep-copies — no aliasing of scheduler internals.
          const s = scheduler.buildBuffer();
          const step = ++stepRef.current;
          const wireValues: Record<string, SignalValue> = {};
          for (const wire of Object.values(c.wires)) {
            wireValues[wire.id] = (s.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as SignalValue;
          }
          const gateValues: Record<string, SignalValue> = {};
          for (const [gId, ports] of Object.entries(s.outputs)) {
            for (const [pId, val] of Object.entries(ports)) {
              gateValues[`${gId}:${pId}`] = val;
            }
          }
          newSnaps.push({ step, tick: batchTime, wireValues, gateValues });
        };

        const detectedRaces = scheduler.advance(
          targetTime,
          c,
          wireMapRef.current,
          fanoutMapRef.current,
          isClockPausedRef.current,
          onBatchCommit,
        );

        // Post-loop glitch races (emitted by advance() after the while loop) also
        // enter the TTL map — they are not covered by onBatchCommit above.
        const glitchRaces = detectedRaces.filter(r => r.severity === 'glitch');
        if (glitchRaces.length > 0) {
          const now = Date.now();
          for (const race of glitchRaces) {
            const existing = raceMarkRef.current.get(race.netId);
            raceMarkRef.current.set(race.netId, {
              severity:   existing ? maxSev(existing.severity, race.severity) : race.severity,
              lastSeenMs: now,
            });
          }
          raceMarkDirtyRef.current = true;
        }

        // ── TTL cleanup + raceNetIds sync ────────────────────────────────
        // Expire entries older than RACE_TTL_MS; sync React state only on change.
        const nowMs = Date.now();
        for (const [netId, mark] of raceMarkRef.current) {
          if (nowMs - mark.lastSeenMs > RACE_TTL_MS) {
            raceMarkRef.current.delete(netId);
            raceMarkDirtyRef.current = true;
          }
        }
        if (raceMarkDirtyRef.current) {
          raceMarkDirtyRef.current = false;
          const next = new Map<string, RaceSeverity>();
          for (const [netId, mark] of raceMarkRef.current) next.set(netId, mark.severity);
          setRaceNetIds(next);
        }

        const newBuf = scheduler.buildBuffer();

        // Determine if any signals changed compared to the last committed state.
        if (!isStable(buf, newBuf)) anyChanged = true;

        // Keep the ZERO_DELAY simBuffer in sync so settle still works correctly.
        simBufferRef.current = {
          outputs:      newBuf.outputs,
          customStates: newBuf.customStates,
          tick:         newBuf.tick,
        };

        if (anyChanged) {
          const result = buildSimResult(newBuf, c);
          dispatch({ type: 'SIMULATION_APPLY', payload: result });
        }

        // ── Race panel list ──────────────────────────────────────────────
        if (detectedRaces.length > 0) {
          const MAX_RACES = 50;
          setRaces(prev => {
            const combined = [...prev, ...detectedRaces];
            return combined.length > MAX_RACES
              ? combined.slice(combined.length - MAX_RACES)
              : combined;
          });
        }

        // ── Timing history ───────────────────────────────────────────────
        if (newSnaps.length > 0) {
          setTimingHistory(prev => {
            const next = [...prev, ...newSnaps];
            return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
          });
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // Nur einmal starten — alle Werte kommen aus Refs

  // ── Mode change side effects ──────────────────────────────────────────────
  // When switching GATE_DELAY → ZERO_DELAY, clear races, TTL map, and scheduler.
  useEffect(() => {
    if (simulationMode === SimulationMode.ZERO_DELAY) {
      setRaces([]);
      setRaceNetIds(new Map());
      raceMarkRef.current.clear();
      raceMarkDirtyRef.current = false;
      schedulerRef.current = null;
    }
  }, [simulationMode]);

  return (
    <CircuitContext.Provider value={{
      circuit, dispatch,
      timingHistory, clearTimingHistory,
      isClockPaused, setIsClockPaused,
      stepOneClock,
      simulationMode, setSimulationMode,
      races,
      raceNetIds,
    }}>
      {children}
    </CircuitContext.Provider>
  );
}

export function useCircuitContext(): CircuitContextValue {
  const ctx = useContext(CircuitContext);
  if (!ctx) throw new Error('useCircuitContext must be used within CircuitProvider');
  return ctx;
}

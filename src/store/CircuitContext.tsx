import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import type { Circuit, SignalValue, TimingSnapshot, RaceInfo } from '../core/types';
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

export function loadSavedCircuit(): Circuit | null {
  try {
    const s = sessionStorage.getItem(AUTOSAVE_KEY);
    return s ? (JSON.parse(s) as Circuit) : null;
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
   * Set of netIds ('gateId:portId') currently involved in a race.
   * Used by CanvasWire to highlight affected wires.
   */
  raceNetIds: ReadonlySet<string>;
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
  const [raceNetIds, setRaceNetIds] = useState<ReadonlySet<string>>(new Set());

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
  // Ref to last known mode so we can detect mode switches and re-seed.
  const prevModeRef      = useRef<SimulationMode>(SimulationMode.ZERO_DELAY);

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
        const result = runUntilStable(c, buf, wireMapRef.current);
        if (result.changed) anyChanged = true;
        buf = result.buffer;

        // Re-seed the GATE_DELAY scheduler after every settle so it starts from a
        // consistent state (settled combinatorial outputs, fresh customStates).
        if (schedulerRef.current) {
          schedulerRef.current.seed(buf, c, wireMapRef.current);
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

        const detectedRaces = scheduler.advance(
          targetTime,
          c,
          wireMapRef.current,
          fanoutMapRef.current,
          isClockPausedRef.current,
        );

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

        // ── Race state update ────────────────────────────────────────────
        if (detectedRaces.length > 0) {
          // Accumulate races: keep the latest MAX_RACES entries for display.
          const MAX_RACES = 50;
          setRaces(prev => {
            const combined = [...prev, ...detectedRaces];
            return combined.length > MAX_RACES
              ? combined.slice(combined.length - MAX_RACES)
              : combined;
          });
          // Build netId set for wire highlighting.
          setRaceNetIds(prev => {
            const next = new Set(prev);
            for (const r of detectedRaces) next.add(r.netId);
            return next;
          });
        }

        // Sample timing snapshots (GATE_DELAY: one snapshot per ticksToRun batch)
        sampleCounterRef.current += ticksToRun;
        if (sampleCounterRef.current >= SAMPLE_EVERY) {
          sampleCounterRef.current = 0;
          const step = ++stepRef.current;
          const tick = newBuf.tick;
          const wireValues: Record<string, SignalValue> = {};
          for (const wire of Object.values(c.wires)) {
            wireValues[wire.id] = (newBuf.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as SignalValue;
          }
          const gateValues: Record<string, SignalValue> = {};
          for (const [gId, ports] of Object.entries(newBuf.outputs)) {
            for (const [pId, val] of Object.entries(ports)) {
              gateValues[`${gId}:${pId}`] = val;
            }
          }
          setTimingHistory(prev => {
            const next = [...prev, { step, tick, wireValues, gateValues }];
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
  // When switching GATE_DELAY → ZERO_DELAY, clear races and scheduler.
  useEffect(() => {
    if (simulationMode === SimulationMode.ZERO_DELAY) {
      setRaces([]);
      setRaceNetIds(new Set());
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

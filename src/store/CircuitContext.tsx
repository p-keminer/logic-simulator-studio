import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import type { Circuit, SignalValue, TimingSnapshot } from '../core/types';
import type { CircuitAction } from './actions';
import { circuitReducer, createEmptyCircuit } from './circuitReducer';
import {
  initBuffer, syncBuffer, buildWireMap,
  runOneTick, runUntilStable, isStable,
  buildSimResult, SIM_TICKS_PER_SEC,
} from '../core/simulation/tickEngine';
import type { SimBuffer, WireMap } from '../core/simulation/tickEngine';

const MAX_HISTORY  = 1000;
const AUTOSAVE_KEY = 'lgsim_autosave';

/**
 * Einen Snapshot alle N Simulations-Ticks aufnehmen.
 * Damit ist der x-Achsen-Abstand im Timing-Diagramm immer exakt N Ticks –
 * unabhängig davon, wie viele Ticks ein RAF-Frame enthält.
 * → Kein Jitter mehr in der Rechteckwelle.
 *
 * Bei SIM_TICKS_PER_SEC=500 und SAMPLE_EVERY=5:
 *   100 Snapshots/s → MAX_HISTORY=1000 → 10 s gespeichert
 *   Für 1 Hz-Clock: Toggle alle 250 Ticks = 50 Diagram-Steps → perfekte Rechteckwelle
 */
const SAMPLE_EVERY = 5;

export function loadSavedCircuit(): Circuit | null {
  try {
    const s = localStorage.getItem(AUTOSAVE_KEY);
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

  // ── Immer-aktuelle Refs (kein stale-closure-Problem im RAF-Handler) ────────
  const circuitRef       = useRef<Circuit>(circuit);
  circuitRef.current     = circuit;

  const isClockPausedRef = useRef(isClockPaused);
  isClockPausedRef.current = isClockPaused;

  // ── Tick-Engine-Zustand ───────────────────────────────────────────────────
  const simBufferRef     = useRef<SimBuffer | null>(null);
  const wireMapRef       = useRef<WireMap>(new Map());
  const needsSettleRef   = useRef(true);   // Initial settle beim ersten Frame
  const rafRef           = useRef(0);
  const lastTsRef        = useRef(0);      // Letzter RAF-Timestamp
  const stepRef          = useRef(0);      // Timing-History-Schrittzähler
  const sampleCounterRef = useRef(0);      // Zählt Ticks zwischen Snapshots
  const isFirstRender    = useRef(true);

  const clearTimingHistory = useCallback(() => setTimingHistory([]), []);

  // ── Auto-Save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(circuit)); } catch { /* quota */ }
  }, [circuit]);

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
    // Wire-Map neu bauen wenn Drähte/Gatter sich geändert haben
    wireMapRef.current = buildWireMap(circuitRef.current);
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

      // ── Settle-Phase: Schaltung nach Änderungen stabilisieren ────────────
      // Clocks sind dabei eingefroren → rein kombinatorische Propagation
      if (needsSettleRef.current) {
        needsSettleRef.current = false;
        const result = runUntilStable(c, buf, wireMapRef.current);
        if (result.changed) anyChanged = true;
        buf = result.buffer;
      }

      // ── Normale Ticks für diesen Frame ───────────────────────────────────
      // Snapshots werden INNERHALB des Tick-Loops aufgenommen (alle SAMPLE_EVERY Ticks),
      // damit der Abstand auf der x-Achse des Timing-Diagramms exakt N Simulations-Ticks
      // beträgt – unabhängig von der variablen RAF-Framerate. Das eliminiert den Jitter
      // in der Rechteckwelle vollständig.
      const ticksToRun = Math.max(1, Math.round(SIM_TICKS_PER_SEC * delta / 1000));
      const preTickBuf = buf; // Referenz für Geradzahliger-Oszillator-Fix
      const newSnaps: TimingSnapshot[] = [];

      for (let i = 0; i < ticksToRun; i++) {
        const next = runOneTick(c, buf, wireMapRef.current, isClockPausedRef.current);
        if (!isStable(buf, next)) anyChanged = true;
        buf = next;

        // Jeden SAMPLE_EVERY-ten Tick einen Snapshot aufnehmen
        sampleCounterRef.current++;
        if (sampleCounterRef.current >= SAMPLE_EVERY) {
          sampleCounterRef.current = 0;
          const step = ++stepRef.current;
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
          newSnaps.push({ step, wireValues, gateValues });
        }
      }

      // ── Geradzahliger Oszillator-Fix ──────────────────────────────────────
      // Problem: Bei Rückkopplungsschleifen mit geradzahliger Periode (z.B. NOT-NOT-Ring,
      // NOR-SR-Latch im metastabilen Zustand) landen genau ticksToRun ≈ 8 Ticks den Buffer
      // immer wieder am Ausgangspunkt → anyChanged=true, aber dispatched State ist identisch
      // → UI zeigt keine Änderung.
      // Fix: Einen Extra-Tick ausführen, wenn sich etwas verändert hat, der Endzustand
      // aber dem Zustand vor dem normalen Tick-Block gleicht.
      if (anyChanged && isStable(preTickBuf, buf)) {
        buf = runOneTick(c, buf, wireMapRef.current, isClockPausedRef.current);
      }

      simBufferRef.current = buf;

      // ── React-State nur updaten wenn sich tatsächlich etwas geändert hat ──
      if (anyChanged) {
        const result = buildSimResult(buf, c);
        dispatch({ type: 'SIMULATION_APPLY', payload: result });
      }

      // ── Timing-Snapshots batch-pushen (nur wenn sich etwas verändert hat) ──
      if (anyChanged && newSnaps.length > 0) {
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

  return (
    <CircuitContext.Provider value={{
      circuit, dispatch,
      timingHistory, clearTimingHistory,
      isClockPaused, setIsClockPaused,
      stepOneClock,
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

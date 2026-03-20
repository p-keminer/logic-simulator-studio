import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { gateRegistry } from '../../core/registry/GateRegistry';
import {
  buildAnalysisSubsystemOptions,
  buildSequentialProjectionChannels,
} from '../../core/analysis/sequentialProjection';
import type { TimingSnapshot } from '../../core/types';

interface Props { history: TimingSnapshot[]; onClose: () => void; }
type TimingViewMode = 'all' | 'selected';
type TimingChannelRole = 'clock' | 'reset' | 'input' | 'state' | 'output' | 'state_inverted' | 'display_mirror' | 'internal_helper';
type TimingChannel = { key: string; label: string; color: string; role?: TimingChannelRole };

// ── Konstanten ───────────────────────────────────────────────────────────────

const CH_H    = 32;   // Zeilenhöhe (sichtbar)
const CH_MINI = 22;   // Zeilenhöhe (ausgeblendet / eingeklappt)
const LBL_W   = 184;
const AXIS_H  = 24;
const WAVE_PAD = 12;
const MAX_ST  = 200;  // Sichtbare Snapshots (letzte N)
const ROW_ORDER_STORAGE_KEY = 'logic-sim:timing-diagram:row-order';
const HIDDEN_KEYS_STORAGE_KEY = 'logic-sim:timing-diagram:hidden-keys';
const VIEW_MODE_STORAGE_KEY = 'logic-sim:timing-diagram:view-mode';
const SELECTED_KEYS_STORAGE_KEY = 'logic-sim:timing-diagram:selected-keys';

// Index-basierte X-Achse (Zero-Delay): Snapshot-Index × STEP_W Pixel.
// Da Snapshots alle SAMPLE_EVERY=25 Ticks aufgenommen werden (CircuitContext),
// sind aufeinanderfolgende Samples immer exakt SAMPLE_EVERY Ticks apart →
// konstanter Pixelabstand, kein Jitter, keine Framerate-Abhängigkeit.
//
// Skalierung für 1-Hz-Clock bei SIM_TICKS_PER_SEC=500, SAMPLE_EVERY=25:
//   Halbperiode = 250 Ticks / 25 = 10 Samples × 3px = 30px
//   Vollperiode = 60px → auf 700px Breite ≈ 11 vollständige Zyklen sichtbar ✓
const STEP_W = 3;

// Tick-basierte X-Achse (Gate-Delay): Jeder Tick bekommt TICK_PX Pixel.
// Da im Gate-Delay-Modus pro CLK↑ mehrere Event-Batches gefeuert werden
// (Kaskade CLK→FF1→FF2→...), aber pro CLK↓ nur 1 Batch, wuerde eine index-basierte
// Darstellung den CLK HIGH-Bereich viel breiter zeigen als LOW.
// Tick-basiert: X = (snap.tick - firstTick) * TICK_PX → symmetrischer Takt.
const TICK_PX = 0.12;

// ── Gattertyp-Kategorien ─────────────────────────────────────────────────────

/** Dargestellt als Eingangs-Kanal (blau) */
const INPUT_TYPES  = new Set([
  'INPUT_SWITCH', 'PUSH_BTN', 'CLOCK', 'CONST_HIGH', 'CONST_LOW',
]);

/** Dargestellt als Ausgangs-Kanal (grün) – benutzen internen _display-Port */
const OUTPUT_TYPES = new Set(['OUTPUT_LED', 'SEG7', 'SEG7_BCD']);

/** Werden komplett übersprungen (keine sinnvollen Signalwerte) */
const SKIP_TYPES   = new Set(['TEXT_NOTE', 'JUNCTION', 'ADC8']);

function readPersistedKeys(storageKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writePersistedKeys(storageKey: string, values: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(values));
  } catch {
    // Persistenz ist rein ergonomisch; Schreibfehler sollen das Panel nicht brechen.
  }
}

function readPersistedViewMode(): TimingViewMode {
  if (typeof window === 'undefined') return 'all';
  try {
    const raw = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return raw === 'selected' ? 'selected' : 'all';
  } catch {
    return 'all';
  }
}

function readPersistedSelection(): { keys: string[]; configured: boolean } {
  if (typeof window === 'undefined') return { keys: [], configured: false };
  try {
    const raw = window.localStorage.getItem(SELECTED_KEYS_STORAGE_KEY);
    if (!raw) return { keys: [], configured: false };
    const parsed = JSON.parse(raw);
    const keys = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
    return { keys, configured: true };
  } catch {
    return { keys: [], configured: false };
  }
}

function writePersistedViewMode(mode: TimingViewMode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // rein ergonomisch
  }
}

function clearPersistedKeys(storageKey: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // rein ergonomisch
  }
}

function reconcileRowOrder(rowOrder: string[], channelKeys: string[]): string[] {
  if (channelKeys.length === 0) return [];
  if (rowOrder.length === 0) return channelKeys;

  const next = rowOrder.filter((key) => channelKeys.includes(key));
  for (const key of channelKeys) {
    if (!next.includes(key)) next.push(key);
  }
  return next;
}

function reconcileSelection(selectedKeys: string[], channelKeys: string[]): string[] {
  return selectedKeys.filter((key) => channelKeys.includes(key));
}

function reorderVisibleSubset(
  allOrder: string[],
  visibleKeys: string[],
  key: string,
  toIndex: number,
): string[] {
  if (visibleKeys.length === 0) return allOrder;
  const visibleSet = new Set(visibleKeys);
  const currentVisible = allOrder.filter((entry) => visibleSet.has(entry));
  const fromIndex = currentVisible.indexOf(key);
  if (fromIndex === -1) return allOrder;

  const boundedIndex = Math.max(0, Math.min(toIndex, currentVisible.length - 1));
  if (boundedIndex === fromIndex) return allOrder;

  const nextVisible = [...currentVisible];
  const [moved] = nextVisible.splice(fromIndex, 1);
  nextVisible.splice(boundedIndex, 0, moved);

  let visibleIndex = 0;
  return allOrder.map((entry) => (visibleSet.has(entry) ? nextVisible[visibleIndex++] : entry));
}

function getRowControlMetrics(rowH: number) {
  const buttonSize = Math.max(12, Math.min(14, rowH - 8));
  const controlsWidth = buttonSize * 4 + 18;
  const labelInset = controlsWidth + 10;
  const labelWidth = Math.max(36, LBL_W - labelInset - 8);
  return { buttonSize, controlsWidth, labelInset, labelWidth };
}

// ── Hauptkomponente ──────────────────────────────────────────────────────────

export function TimingDiagram({ history, onClose }: Props) {
  const { circuit }   = useCircuitContext();
  const scrollRef                       = useRef<HTMLDivElement>(null);
  const signalMenuRef                   = useRef<HTMLDivElement>(null);
  const sidePanelBodyRef                = useRef<HTMLDivElement>(null);
  const initialSelection                = useMemo(() => readPersistedSelection(), []);
  const [hiddenKeys, setHiddenKeys]     = useState<Set<string>>(() => new Set(readPersistedKeys(HIDDEN_KEYS_STORAGE_KEY)));
  const [rowOrder, setRowOrder]         = useState<string[]>(() => readPersistedKeys(ROW_ORDER_STORAGE_KEY)); // channel keys in user-chosen order
  const [viewMode, setViewMode]         = useState<TimingViewMode>(() => readPersistedViewMode());
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => initialSelection.keys);
  const [hasCustomSelection, setHasCustomSelection] = useState<boolean>(() => initialSelection.configured);
  const [isSignalMenuOpen, setIsSignalMenuOpen] = useState(false);
  const [selectedSubsystemKey, setSelectedSubsystemKey] = useState('');
  // true = Nutzer hat zurückgescrollt → Auto-Scroll pausieren
  const userScrolledBackRef             = useRef(false);

  // Auto-scroll ans Ende nur wenn der Nutzer nicht manuell zurückgescrollt hat
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledBackRef.current) return;
    el.scrollLeft = el.scrollWidth;
  }, [history.length]);

  // Scroll-Event: prüfen ob Nutzer am Ende ist oder zurückgescrollt hat
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // "Am Ende" = weniger als 20px vom rechten Rand entfernt
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 20;
    userScrolledBackRef.current = !atEnd;
    if (sidePanelBodyRef.current) {
      sidePanelBodyRef.current.style.transform = `translateY(${-el.scrollTop}px)`;
    }
  }, []);

  // Kanal ein-/ausblenden
  const toggleHidden = useCallback((key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const setSelectedKeysAndPersist = useCallback((nextKeys: string[]) => {
    setHasCustomSelection(true);
    setSelectedKeys(nextKeys);
  }, []);

  const analysisSubsystemOptions = useMemo(
    () => buildAnalysisSubsystemOptions(circuit),
    [circuit],
  );

  const activeAnalysisSubsystem = analysisSubsystemOptions.find((option) => option.key === selectedSubsystemKey)
    ?? analysisSubsystemOptions[0]
    ?? null;

  const analysisSourceCircuit = analysisSubsystemOptions.length > 1
    ? (activeAnalysisSubsystem?.circuit ?? circuit)
    : circuit;

  // ── Verbundene Gatter-IDs ermitteln ──────────────────────────────────────
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of Object.values(analysisSourceCircuit.wires)) {
      ids.add(w.from.gateId);
      ids.add(w.to.gateId);
    }
    return ids;
  }, [analysisSourceCircuit]);

  // ── Kanäle aufbauen ──────────────────────────────────────────────────────
  // Nur verbundene Gatter; Priorität: Eingänge → Logik → Ausgänge
  const channels = useMemo<TimingChannel[]>(() => {
    const projectedChannels = buildSequentialProjectionChannels(analysisSourceCircuit);
    if (projectedChannels.length > 0) return projectedChannels;

    const chs: TimingChannel[] = [];

    const sortedGates = Object.values(analysisSourceCircuit.gates)
      .filter(g => !SKIP_TYPES.has(g.typeId) && connectedIds.has(g.id))
      .sort((a, b) => {
        const pa = INPUT_TYPES.has(a.typeId) ? 0 : OUTPUT_TYPES.has(a.typeId) ? 2 : 1;
        const pb = INPUT_TYPES.has(b.typeId) ? 0 : OUTPUT_TYPES.has(b.typeId) ? 2 : 1;
        return pa !== pb ? pa - pb : a.id.localeCompare(b.id);
      });

    for (const gate of sortedGates) {
      try {
        const def    = gateRegistry.get(gate.typeId);
        const sName  = gate.typeId.toLowerCase().replace(/_/g, '').slice(0, 7);
        const gLabel = gate.label || (sName + '_' + gate.id.slice(0, 4));
        const color  = INPUT_TYPES.has(gate.typeId)  ? '#60a5fa'
                     : OUTPUT_TYPES.has(gate.typeId) ? '#22c55e'
                     : '#f59e0b';

        if (OUTPUT_TYPES.has(gate.typeId)) {
          // LED/7-Seg liefern {_display: inputValue} aus evaluate()
          chs.push({ key: gate.id + ':_display', label: gLabel, color, role: 'output' });
        } else {
          const role: TimingChannelRole | undefined =
            gate.typeId === 'CLOCK' ? 'clock'
              : INPUT_TYPES.has(gate.typeId) ? 'input'
                : undefined;
          for (const port of def.outputs) {
            const lbl = def.outputs.length === 1
              ? gLabel
              : `${gLabel}.${port.label ?? port.id}`;
            chs.push({ key: gate.id + ':' + port.id, label: lbl, color, role });
          }
        }
      } catch { /* unbekannter Typ – überspringen */ }
    }

    return chs;
  }, [analysisSourceCircuit, connectedIds]);

  // Zeile nach oben/unten verschieben
  const moveRow = useCallback((key: string, direction: -1 | 1) => {
    const channelKeys = channels.map((channel) => channel.key);
    const currentOrder = reconcileRowOrder(rowOrder, channelKeys);
    const visibleKeys = (viewMode === 'selected' && hasCustomSelection)
      ? reconcileSelection(selectedKeys, channelKeys)
      : channelKeys;
    const currentVisible = currentOrder.filter((entry) => visibleKeys.includes(entry));
    const fromIdx = currentVisible.indexOf(key);
    if (fromIdx === -1) return;
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= currentVisible.length) return;

    setRowOrder(reorderVisibleSubset(currentOrder, currentVisible, key, toIdx));
  }, [channels, hasCustomSelection, rowOrder, selectedKeys, viewMode]);

  const moveRowToEdge = useCallback((key: string, edge: 'top' | 'bottom') => {
    const channelKeys = channels.map((channel) => channel.key);
    const currentOrder = reconcileRowOrder(rowOrder, channelKeys);
    const visibleKeys = (viewMode === 'selected' && hasCustomSelection)
      ? reconcileSelection(selectedKeys, channelKeys)
      : channelKeys;
    const currentVisible = currentOrder.filter((entry) => visibleKeys.includes(entry));
    const fromIdx = currentVisible.indexOf(key);
    if (fromIdx === -1) return;

    setRowOrder(reorderVisibleSubset(
      currentOrder,
      currentVisible,
      key,
      edge === 'top' ? 0 : currentVisible.length - 1,
    ));
  }, [channels, hasCustomSelection, rowOrder, selectedKeys, viewMode]);

  const resetRowOrder = useCallback((nextKeys: string[]) => {
    setRowOrder(nextKeys);
  }, []);

  useEffect(() => {
    const channelKeys = channels.map((channel) => channel.key);
    writePersistedKeys(ROW_ORDER_STORAGE_KEY, reconcileRowOrder(rowOrder, channelKeys));
  }, [channels, rowOrder]);

  useEffect(() => {
    writePersistedKeys(HIDDEN_KEYS_STORAGE_KEY, [...hiddenKeys]);
  }, [hiddenKeys]);

  useEffect(() => {
    writePersistedViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!isSignalMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!signalMenuRef.current?.contains(event.target as Node)) {
        setIsSignalMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isSignalMenuOpen]);

  useEffect(() => {
    if (!hasCustomSelection) {
      clearPersistedKeys(SELECTED_KEYS_STORAGE_KEY);
      return;
    }
    writePersistedKeys(
      SELECTED_KEYS_STORAGE_KEY,
      reconcileSelection(selectedKeys, channels.map((channel) => channel.key)),
    );
  }, [channels, hasCustomSelection, selectedKeys]);

  const effectiveRowOrder = useMemo(() => {
    const channelKeys = channels.map((channel) => channel.key);
    return reconcileRowOrder(rowOrder, channelKeys);
  }, [channels, rowOrder]);

  const effectiveSelectedKeys = useMemo(() => {
    const channelKeys = channels.map((channel) => channel.key);
    return hasCustomSelection
      ? reconcileSelection(selectedKeys, channelKeys)
      : channelKeys;
  }, [channels, hasCustomSelection, selectedKeys]);

  // Kanäle in user-chosen Reihenfolge (rowOrder), mit Fallback auf Default-Sort
  const orderedChannels = useMemo(() => {
    if (effectiveRowOrder.length === 0) return channels;
    // rowOrder enthält die keys in gewünschter Reihenfolge
    const byKey = new Map(channels.map(c => [c.key, c]));
    const ordered = effectiveRowOrder.map(k => byKey.get(k)).filter((c): c is typeof channels[0] => c !== undefined);
    // Nicht in rowOrder enthaltene Channels (z.B. neuer Gate nach Änderung) hinten anfügen
    for (const c of channels) {
      if (!effectiveRowOrder.includes(c.key)) ordered.push(c);
    }
    return ordered;
  }, [channels, effectiveRowOrder]);

  const renderedChannels = useMemo(() => {
    if (viewMode !== 'selected') return orderedChannels;
    const selectedSet = new Set(effectiveSelectedKeys);
    return orderedChannels.filter((channel) => selectedSet.has(channel.key));
  }, [effectiveSelectedKeys, orderedChannels, viewMode]);

  useEffect(() => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    if (sidePanelBodyRef.current) {
      sidePanelBodyRef.current.style.transform = `translateY(${-scrollTop}px)`;
    }
  }, [hiddenKeys, renderedChannels.length, viewMode]);

  // ── Geometrie ─────────────────────────────────────────────────────────────
  function getVal(snap: TimingSnapshot, key: string): number {
    return snap.gateValues[key] ?? 0;
  }

  const displayHistory = history.slice(-MAX_ST);

  // ── X-Positionsberechnung ──────────────────────────────────────────────
  // Zero-Delay: index-basiert (STEP_W pro Snapshot, gleichmaessig).
  // Tick-basierte X-Achse (proportional zur Simulationszeit).
  // Sorgt fuer symmetrischen Takt, da CLK HIGH und LOW gleich viele Ticks dauern,
  // auch wenn unterschiedlich viele Event-Batches (Snapshots) pro Halbperiode anfallen.
  const firstTick = displayHistory.length > 0 ? displayHistory[0].tick : 0;

  const xOf = useCallback((si: number): number => {
    if (displayHistory.length > 0) {
      return WAVE_PAD + (displayHistory[si].tick - firstTick) * TICK_PX;
    }
    return WAVE_PAD + si * STEP_W;
  }, [displayHistory, firstTick]);

  const lastX = displayHistory.length > 0
    ? xOf(displayHistory.length - 1)
    : WAVE_PAD + 10 * STEP_W;
  const totalW = lastX + 20;

  // Gesamthöhe: sichtbare Kanäle CH_H, versteckte CH_MINI
  let totalH = AXIS_H + 4;
  for (const ch of renderedChannels) {
    totalH += hiddenKeys.has(ch.key) ? CH_MINI : CH_H;
  }

  const hiddenCount  = renderedChannels.filter(ch => hiddenKeys.has(ch.key)).length;
  const visibleCount = renderedChannels.length - hiddenCount;
  const hasCustomRowOrder = channels.length > 0 && channels.some((channel, idx) => orderedChannels[idx]?.key !== channel.key);
  const hasNoSelectedSignals = viewMode === 'selected' && renderedChannels.length === 0 && channels.length > 0;
  const clockChannel = renderedChannels.find((channel) => channel.role === 'clock' && !hiddenKeys.has(channel.key));
  const cycleMarkers = useMemo(() => {
    if (!clockChannel || displayHistory.length === 0) return [];

    const starts: Array<{ startIndex: number; cycle: number }> = [];
    let prev = getVal(displayHistory[0], clockChannel.key);
    if (prev === 1) {
      starts.push({ startIndex: 0, cycle: 1 });
    }

    for (let index = 1; index < displayHistory.length; index++) {
      const current = getVal(displayHistory[index], clockChannel.key);
      if (prev !== 1 && current === 1) {
        starts.push({ startIndex: index, cycle: starts.length + 1 });
      }
      prev = current;
    }

    return starts.map((entry, index) => {
      const endIndex = starts[index + 1]?.startIndex ?? displayHistory.length - 1;
      return {
        cycle: entry.cycle,
        x: (xOf(entry.startIndex) + xOf(endIndex)) / 2,
      };
    });
  }, [clockChannel, displayHistory, xOf]);

  function renderRowControls(
    key: string,
    label: string,
    rowH: number,
    canMoveUp: boolean,
    canMoveDown: boolean,
  ) {
    const { buttonSize } = getRowControlMetrics(rowH);
    const buttonStyle = (enabled: boolean) => ({
      width: `${buttonSize}px`,
      height: `${buttonSize}px`,
      padding: 0,
      borderRadius: 3,
      border: '1px solid #334155',
      background: enabled ? '#0f172a' : '#111827',
      color: enabled ? '#cbd5e1' : '#64748b',
      cursor: enabled ? 'pointer' : 'not-allowed',
      fontSize: 10,
      lineHeight: 1,
      fontFamily: 'monospace',
    });

    return (
      <div
        style={{ display: 'flex', gap: 6, height: `${buttonSize}px`, flexShrink: 0 }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={`${label} ganz nach oben verschieben`}
          title="Ganz nach oben verschieben"
          disabled={!canMoveUp}
          onClick={(event) => {
            event.stopPropagation();
            moveRowToEdge(key, 'top');
          }}
          style={buttonStyle(canMoveUp)}
        >
          ⇞
        </button>
        <button
          type="button"
          aria-label={`${label} nach oben verschieben`}
          title="Nach oben verschieben"
          disabled={!canMoveUp}
          onClick={(event) => {
            event.stopPropagation();
            moveRow(key, -1);
          }}
          style={buttonStyle(canMoveUp)}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`${label} nach unten verschieben`}
          title="Nach unten verschieben"
          disabled={!canMoveDown}
          onClick={(event) => {
            event.stopPropagation();
            moveRow(key, 1);
          }}
          style={buttonStyle(canMoveDown)}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label={`${label} ganz nach unten verschieben`}
          title="Ganz nach unten verschieben"
          disabled={!canMoveDown}
          onClick={(event) => {
            event.stopPropagation();
            moveRowToEdge(key, 'bottom');
          }}
          style={buttonStyle(canMoveDown)}
        >
          ⇟
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', background: '#060d1a', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>

      {/* ── Kopfleiste ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', borderBottom: '1px solid #1e293b', flexShrink: 0, gap: 6, flexWrap: 'wrap', position: 'relative' }}>
        <span style={{ color: '#60a5fa', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>ZEITDIAGRAMM</span>
        <span style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>
          {displayHistory.length} Schritte
        </span>
        <span style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace' }}>
          · {visibleCount} Signale
          {hiddenCount > 0 && <span style={{ color: '#64748b' }}> ({hiddenCount} ausgeblendet)</span>}
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}>
          <span>Ansicht</span>
          <select
            aria-label="Timing-Ansicht"
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as TimingViewMode)}
            style={{
              minWidth: 128,
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#e2e8f0',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            <option value="all">vollständig</option>
            <option value="selected">ausgewählt</option>
          </select>
        </label>
        {analysisSubsystemOptions.length > 1 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}>
            <span>System</span>
            <select
              aria-label="Timing-System"
              value={activeAnalysisSubsystem?.key ?? ''}
              onChange={(event) => setSelectedSubsystemKey(event.target.value)}
              style={{
                minWidth: 132,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: 11,
              }}
            >
              {analysisSubsystemOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div ref={signalMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsSignalMenuOpen((prev) => !prev)}
            style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 9, fontFamily: 'monospace', borderRadius: 3, padding: '1px 6px' }}
          >
            signale waehlen ({effectiveSelectedKeys.length}/{channels.length})
          </button>
          {isSignalMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                zIndex: 5,
                minWidth: 230,
                maxWidth: 320,
                border: '1px solid #334155',
                borderRadius: 8,
                background: '#0f172a',
                boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
                padding: 10,
              }}
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <span style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}>
                  Signalauswahl
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedKeysAndPersist(channels.map((channel) => channel.key))}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 9, fontFamily: 'monospace', borderRadius: 3, padding: '1px 6px' }}
                >
                  alle
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKeysAndPersist([])}
                  style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 9, fontFamily: 'monospace', borderRadius: 3, padding: '1px 6px' }}
                >
                  keine
                </button>
              </div>
              <p style={{ margin: '0 0 8px', color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>
                Im Modus `ausgewählt` werden nur die markierten Kanäle gerendert.
              </p>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 6 }}>
                {orderedChannels.map((channel) => {
                  const checked = effectiveSelectedKeys.includes(channel.key);
                  return (
                    <label
                      key={channel.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = new Set(effectiveSelectedKeys);
                          if (event.target.checked) next.add(channel.key);
                          else next.delete(channel.key);
                          setSelectedKeysAndPersist([...next]);
                        }}
                      />
                      <span style={{ color: channel.color }}>■</span>
                      <span>{channel.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {hiddenCount > 0 && (
          <button
            onClick={() => setHiddenKeys(new Set())}
            style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 9, fontFamily: 'monospace', borderRadius: 3, padding: '1px 6px' }}
          >
            alle einblenden
          </button>
        )}
        {hasCustomRowOrder && (
          <button
            onClick={() => resetRowOrder(channels.map(channel => channel.key))}
            style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 9, fontFamily: 'monospace', borderRadius: 3, padding: '1px 6px' }}
          >
            reihenfolge reset
          </button>
        )}
        {/* Legende + Hinweis */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <span style={{ color: '#60a5fa', fontSize: 9, fontFamily: 'monospace' }}>■ Eingang</span>
          <span style={{ color: '#f59e0b', fontSize: 9, fontFamily: 'monospace' }}>■ Logik</span>
          <span style={{ color: '#22c55e', fontSize: 9, fontFamily: 'monospace' }}>■ Ausgang</span>
        </span>
        <span style={{ color: '#1e3a5f', fontSize: 9, fontFamily: 'monospace', marginLeft: 4 }}>
          (Label klicken = ein-/ausblenden, Pfeile = sortieren, ⇞/⇟ = ganz nach oben/unten)
        </span>
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
        >×</button>
      </div>

      {/* ── Kein Inhalt ───────────────────────────────────────────────── */}
      {channels.length === 0 ? (
        <div style={{ color: '#475569', padding: 12, fontSize: 11, fontFamily: 'monospace' }}>
          Keine verbundenen Bausteine gefunden. Gatter platzieren und mit Drähten verbinden.
        </div>
      ) : hasNoSelectedSignals ? (
        <div style={{ color: '#94a3b8', padding: 12, fontSize: 11, fontFamily: 'monospace' }}>
          Im Modus `ausgewählt` sind aktuell keine Signale markiert. Über `signale waehlen` kannst du gezielt Kanäle einblenden.
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div ref={scrollRef} onScroll={handleScroll} style={{ overflowX: 'scroll', overflowY: 'auto', flex: 1, minWidth: 0 }}>
            <svg width={Math.max(totalW, 400)} height={totalH} style={{ display: 'block' }}>
              <rect x={0} y={0} width={Math.max(totalW, 400)} height={AXIS_H} fill="rgba(0,0,0,0.18)" />
              <line x1={0} y1={AXIS_H - 1} x2={Math.max(totalW, 400)} y2={AXIS_H - 1} stroke="#1e293b" strokeWidth={1} />

              {cycleMarkers.map((marker) => (
                <g key={`cycle-${marker.cycle}`}>
                  <line
                    x1={marker.x}
                    y1={AXIS_H - 6}
                    x2={marker.x}
                    y2={AXIS_H - 1}
                    stroke="#334155"
                    strokeWidth={1}
                  />
                  <text
                    x={marker.x}
                    y={12}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    {marker.cycle}
                  </text>
                </g>
              ))}

              {/* Vertikale Rasterlinien — an Sample-Positionen */}
              {displayHistory.map((_, si) => (
                <line key={'vl' + si}
                  x1={xOf(si)} y1={AXIS_H}
                  x2={xOf(si)} y2={totalH}
                  stroke="#1e293b" strokeWidth={1} />
              ))}

              {/* Kanal-Zeilen */}
              {(() => {
                const rows: React.ReactElement[] = [];
                let yOffset = AXIS_H + 2;

                for (let chIdx = 0; chIdx < renderedChannels.length; chIdx++) {
                  const ch = renderedChannels[chIdx];
                  const hidden = hiddenKeys.has(ch.key);
                  const rowH   = hidden ? CH_MINI : CH_H;
                  const y0     = yOffset;
                  yOffset     += rowH;

                  if (hidden) {
                    rows.push(
                      <g key={ch.key}>
                        <rect x={0} y={y0} width={Math.max(totalW, 400)} height={rowH - 1} fill="rgba(0,0,0,0.08)" />
                        <line x1={0} y1={y0 + rowH - 1} x2={Math.max(totalW, 400)} y2={y0 + rowH - 1}
                          stroke="#1e293b" strokeWidth={1} />
                      </g>
                    );
                    continue;
                  }

                  const yH = y0 + 5;
                  const yL = y0 + CH_H - 8;
                  const yZ = y0 + (CH_H - 3) / 2;
                  const yX = yZ;
                  const segs: string[] = [];
                  const hiZsegs: string[] = [];
                  const xSegs: string[] = [];
                  let prev = -1;

                  const pathOf = (v: number): string[] => v === 2 ? hiZsegs : v === 3 ? xSegs : segs;
                  const yOf    = (v: number): number => v === 2 ? yZ : v === 3 ? yX : v === 1 ? yH : yL;

                  displayHistory.forEach((snap, si) => {
                    const val = getVal(snap, ch.key);
                    const x   = xOf(si);
                    const yPrev = yOf(prev);
                    const yCurr = yOf(val);
                    if (si === 0) {
                      pathOf(val).push('M ' + x + ' ' + yCurr);
                    } else if (val !== prev) {
                      pathOf(prev).push('L ' + x + ' ' + yPrev);
                      if (yPrev !== yCurr) {
                        pathOf(val).push('M ' + x + ' ' + yPrev + ' L ' + x + ' ' + yCurr);
                      } else {
                        pathOf(val).push('M ' + x + ' ' + yCurr);
                      }
                    } else {
                      pathOf(val).push('L ' + x + ' ' + yCurr);
                    }
                    prev = val;
                  });

                  if (displayHistory.length > 0) {
                    const endX = lastX + 20;
                    const yEnd = yOf(prev);
                    pathOf(prev).push('L ' + endX + ' ' + yEnd);
                  }

                  rows.push(
                    <g key={ch.key}>
                      {segs.length > 0 && (
                        <path d={segs.join(' ')} stroke={ch.color} strokeWidth={1.5} fill="none" />
                      )}
                      {hiZsegs.length > 0 && (
                        <path d={hiZsegs.join(' ')} stroke="#f59e0b" strokeWidth={1.5} fill="none"
                          strokeDasharray="4 3" />
                      )}
                      {xSegs.length > 0 && (
                        <path d={xSegs.join(' ')} stroke="#ef4444" strokeWidth={1.5} fill="none"
                          strokeDasharray="2 2" />
                      )}
                      <line x1={0} y1={y0 + CH_H - 1} x2={Math.max(totalW, 400)} y2={y0 + CH_H - 1}
                        stroke="#0f172a" strokeWidth={1} />
                    </g>
                  );
                }
                return rows;
              })()}
            </svg>
          </div>

          <div
            style={{
              width: LBL_W + 16,
              borderLeft: '1px solid #1e293b',
              background: '#08101d',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: AXIS_H,
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                borderBottom: '1px solid #1e293b',
                color: '#64748b',
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: 0.4,
              }}
            >
              SIGNAL-STEUERUNG
            </div>
            <div ref={sidePanelBodyRef} style={{ willChange: 'transform' }}>
              {(() => {
                const rows: React.ReactElement[] = [];
                let yOffset = AXIS_H + 2;

                for (let chIdx = 0; chIdx < renderedChannels.length; chIdx++) {
                  const ch = renderedChannels[chIdx];
                  const hidden = hiddenKeys.has(ch.key);
                  const rowH = hidden ? CH_MINI : CH_H;
                  const canMoveUp = chIdx > 0;
                  const canMoveDown = chIdx < renderedChannels.length - 1;
                  const y0 = yOffset;
                  yOffset += rowH;

                  rows.push(
                    <div
                      key={ch.key}
                      style={{
                        height: rowH - 1,
                        padding: '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderBottom: '1px solid #1e293b',
                        background: hidden ? 'rgba(0,0,0,0.12)' : 'transparent',
                        marginTop: y0 === AXIS_H + 2 ? 2 : 0,
                      }}
                    >
                      <button
                        type="button"
                        title={ch.label}
                        onClick={() => toggleHidden(ch.key)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: hidden ? `${ch.color}99` : ch.color,
                          fontSize: hidden ? 10 : 11,
                          fontFamily: 'monospace',
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                        }}
                      >
                        {hidden ? `▶ ${ch.label}` : ch.label}
                      </button>
                      {renderRowControls(ch.key, ch.label, rowH, canMoveUp, canMoveDown)}
                    </div>
                  );
                }

                return rows;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { gateRegistry } from '../../core/registry/GateRegistry';
import type { TimingSnapshot } from '../../core/types';

interface Props { history: TimingSnapshot[]; onClose: () => void; }

// ── Konstanten ───────────────────────────────────────────────────────────────

const CH_H    = 32;   // Zeilenhöhe (sichtbar)
const CH_MINI = 10;   // Zeilenhöhe (ausgeblendet / eingeklappt)
const LBL_W   = 148;
const MAX_ST  = 200;  // Sichtbare Snapshots (letzte N)

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

// ── Hauptkomponente ──────────────────────────────────────────────────────────

export function TimingDiagram({ history, onClose }: Props) {
  const { circuit }   = useCircuitContext();
  const scrollRef                       = useRef<HTMLDivElement>(null);
  const [hiddenKeys, setHiddenKeys]     = useState<Set<string>>(new Set());
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
  }, []);

  // Kanal ein-/ausblenden
  const toggleHidden = useCallback((key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Verbundene Gatter-IDs ermitteln ──────────────────────────────────────
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of Object.values(circuit.wires)) {
      ids.add(w.from.gateId);
      ids.add(w.to.gateId);
    }
    return ids;
  }, [circuit]);

  // ── Kanäle aufbauen ──────────────────────────────────────────────────────
  // Nur verbundene Gatter; Priorität: Eingänge → Logik → Ausgänge
  const channels = useMemo(() => {
    const chs: Array<{ key: string; label: string; color: string }> = [];

    const sortedGates = Object.values(circuit.gates)
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
          chs.push({ key: gate.id + ':_display', label: gLabel, color });
        } else {
          for (const port of def.outputs) {
            const lbl = def.outputs.length === 1
              ? gLabel
              : `${gLabel}.${port.label ?? port.id}`;
            chs.push({ key: gate.id + ':' + port.id, label: lbl, color });
          }
        }
      } catch { /* unbekannter Typ – überspringen */ }
    }

    return chs;
  }, [circuit, connectedIds]);

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

  function xOf(si: number): number {
    if (displayHistory.length > 0) {
      return LBL_W + (displayHistory[si].tick - firstTick) * TICK_PX;
    }
    return LBL_W + si * STEP_W;
  }

  const lastX = displayHistory.length > 0
    ? xOf(displayHistory.length - 1)
    : LBL_W + 10 * STEP_W;
  const totalW = lastX + 20;

  // Gesamthöhe: sichtbare Kanäle CH_H, versteckte CH_MINI
  let totalH = 20;
  for (const ch of channels) {
    totalH += hiddenKeys.has(ch.key) ? CH_MINI : CH_H;
  }

  const hiddenCount  = channels.filter(ch => hiddenKeys.has(ch.key)).length;
  const visibleCount = channels.length - hiddenCount;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', background: '#060d1a', borderTop: '1px solid #1e293b', display: 'flex', flexDirection: 'column' }}>

      {/* ── Kopfleiste ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', borderBottom: '1px solid #1e293b', flexShrink: 0, gap: 6, flexWrap: 'wrap' }}>
        <span style={{ color: '#60a5fa', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>ZEITDIAGRAMM</span>
        <span style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace' }}>
          {displayHistory.length} Schritte
        </span>
        <span style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace' }}>
          · {visibleCount} Signale
          {hiddenCount > 0 && <span style={{ color: '#64748b' }}> ({hiddenCount} ausgeblendet)</span>}
        </span>
        {hiddenCount > 0 && (
          <button
            onClick={() => setHiddenKeys(new Set())}
            style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontSize: 9, fontFamily: 'monospace', borderRadius: 3, padding: '1px 6px' }}
          >
            alle einblenden
          </button>
        )}
        {/* Legende + Hinweis */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <span style={{ color: '#60a5fa', fontSize: 9, fontFamily: 'monospace' }}>■ Eingang</span>
          <span style={{ color: '#f59e0b', fontSize: 9, fontFamily: 'monospace' }}>■ Logik</span>
          <span style={{ color: '#22c55e', fontSize: 9, fontFamily: 'monospace' }}>■ Ausgang</span>
        </span>
        <span style={{ color: '#1e3a5f', fontSize: 9, fontFamily: 'monospace', marginLeft: 4 }}>
          (Label klicken = ein-/ausblenden)
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
      ) : (
        /* ── SVG-Canvas ──────────────────────────────────────────────── */
        <div ref={scrollRef} onScroll={handleScroll} style={{ overflowX: 'scroll', overflowY: 'auto', flex: 1 }}>
          <svg width={Math.max(totalW, 400)} height={totalH} style={{ display: 'block' }}>

            {/* Vertikale Rasterlinien — an Sample-Positionen */}
            {displayHistory.map((snap, si) => (
              <line key={'vl' + si}
                x1={xOf(si)} y1={0}
                x2={xOf(si)} y2={totalH}
                stroke="#1e293b" strokeWidth={1} />
            ))}

            {/* Kanal-Zeilen */}
            {(() => {
              const rows: React.ReactElement[] = [];
              let yOffset = 2;

              for (const ch of channels) {
                const hidden = hiddenKeys.has(ch.key);
                const rowH   = hidden ? CH_MINI : CH_H;
                const y0     = yOffset;
                yOffset     += rowH;

                if (hidden) {
                  /* ── Eingeklappte Zeile ───────────────────────────── */
                  rows.push(
                    <g key={ch.key} onClick={() => toggleHidden(ch.key)} style={{ cursor: 'pointer' }}>
                      <rect x={0} y={y0} width={LBL_W - 2} height={rowH - 1}
                        fill="rgba(0,0,0,0.15)" />
                      <text x={LBL_W - 6} y={y0 + rowH - 2}
                        textAnchor="end" fontSize={7}
                        fill={ch.color + '99'} fontFamily="monospace">
                        ▶ {ch.label}
                      </text>
                      <line x1={0} y1={y0 + rowH - 1} x2={Math.max(totalW, 400)} y2={y0 + rowH - 1}
                        stroke="#1e293b" strokeWidth={1} />
                    </g>
                  );
                } else {
                  /* ── Sichtbare Zeile mit Signalverlauf ───────────── */
                  const yH = y0 + 5;
                  const yL = y0 + CH_H - 8;
                  const segs: string[] = [];
                  let prev = -1;

                  displayHistory.forEach((snap, si) => {
                    const val = getVal(snap, ch.key);
                    const x   = xOf(si);
                    const y   = val === 1 ? yH : yL;
                    if (si === 0) {
                      segs.push('M ' + x + ' ' + y);
                    } else {
                      if (val !== prev)
                        segs.push('L ' + x + ' ' + (prev === 1 ? yH : yL) + ' L ' + x + ' ' + y);
                      else
                        segs.push('L ' + x + ' ' + y);
                    }
                    prev = val;
                  });
                  // Linie bis zum rechten Rand ziehen (letzter bekannter Wert)
                  if (displayHistory.length > 0) {
                    const endX = lastX + 20;
                    segs.push('L ' + endX + ' ' + (prev === 1 ? yH : yL));
                  }

                  rows.push(
                    <g key={ch.key}>
                      {/* Klickbarer Label-Bereich */}
                      <rect x={0} y={y0} width={LBL_W - 2} height={CH_H - 2}
                        fill="rgba(0,0,0,0.3)"
                        onClick={() => toggleHidden(ch.key)}
                        style={{ cursor: 'pointer' }} />
                      <text x={LBL_W - 6} y={y0 + CH_H / 2 + 4}
                        textAnchor="end" fontSize={9} fill={ch.color} fontFamily="monospace"
                        onClick={() => toggleHidden(ch.key)}
                        style={{ cursor: 'pointer', userSelect: 'none' }}>
                        {ch.label}
                      </text>
                      {/* Signalverlauf */}
                      {segs.length > 0 && (
                        <path d={segs.join(' ')} stroke={ch.color} strokeWidth={1.5} fill="none" />
                      )}
                      {/* Trennlinie */}
                      <line x1={0} y1={y0 + CH_H - 1} x2={Math.max(totalW, 400)} y2={y0 + CH_H - 1}
                        stroke="#0f172a" strokeWidth={1} />
                    </g>
                  );
                }
              }
              return rows;
            })()}
          </svg>
        </div>
      )}
    </div>
  );
}

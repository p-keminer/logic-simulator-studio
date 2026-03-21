/**
 * Race Condition Debug Panel.
 *
 * Displays detected race conditions from GATE_DELAY simulation mode.
 * Clicking an entry focuses the affected area on the canvas via viewport dispatch.
 */
import { useEffect } from 'react';
import type { RaceInfo, RaceSeverity } from '../../core/types';
import { useCircuitContext } from '../../store/CircuitContext';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../utils/constants';

const SEVERITY_LABEL: Record<RaceSeverity, string> = {
  critical: 'KRITISCH',
  warning:  'WARNUNG',
  glitch:   'GLITCH',
  timing:   'TIMING',
  loop:     'LOOP',
};

const SEVERITY_COLOR: Record<RaceSeverity, string> = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  glitch:   '#f97316',
  timing:   '#a855f7',
  loop:     '#ec4899',
};

const TYPE_DESC: Record<string, string> = {
  value_conflict:      'Konfliktierende Werte auf demselben Netz',
  multi_source:        'Mehrere Treiber, gleicher Wert',
  reconvergent_glitch: 'Rekonvergenter Glitch (mehrfacher Pegelwechsel im selben Batch)',
  latch_race_through:  'Latch Race-Through: Ausgang oszilliert bei aktivem Enable',
  setup_hold_risk:     'Setup/Hold-Risiko: Taktflanke und Datenänderung im selben Batch',
  loop_overflow:       'Ereignis-Budget überschritten — mögliche kombinatorische Schleife',
};

interface Props {
  onClose: () => void;
}

export function RacePanel({ onClose }: Props) {
  const { races, clearRaceMonitor, circuit, dispatch } = useCircuitContext();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleFocus = (race: RaceInfo) => {
    // Find the position of any involved gate and zoom to it.
    const gate = race.gateIds
      .map((gateId) => circuit.gates[gateId])
      .find((candidate) => candidate !== undefined);
    if (!gate) return;

    // Look up actual gate dimensions from registry.
    const def = gateRegistry.get(gate.typeId);
    const gw  = def?.width  ?? 80;
    const gh  = def?.height ?? 60;

    // Center of the gate in SVG coordinates.
    const cx = gate.x + gw / 2;
    const cy = gate.y + gh / 2;

    // Use a comfortable zoom level that shows the gate large and centered.
    const zoom = 5;
    const vbW  = CANVAS_WIDTH  / zoom;
    const vbH  = CANVAS_HEIGHT / zoom;

    dispatch({
      type: 'VIEWPORT_SET',
      payload: { panX: cx - vbW / 2, panY: cy - vbH / 2, zoom },
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        zIndex: 3000,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #ef4444',
          borderRadius: 8,
          padding: '16px',
          width: 'min(600px, calc(100vw - 24px))',
          maxWidth: 600,
          maxHeight: 'calc(100vh - 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontFamily: 'monospace',
          color: '#e2e8f0',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', minWidth: 0 }}>
            Race / Hazard Monitor — Gate-Delay-Modus
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Explanation */}
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          Erkannte Hazards im Gate-Delay-Modus. Betroffene Leitungen werden farblich markiert:
          rot = Wertekonflikt, lila = Setup/Hold-Risiko, orange = Glitch, gelb = Mehrtreiber, pink = Schleife.
        </p>

        {/* Race list */}
        <div style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {races.length === 0 ? (
            <span style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
              Keine Races erkannt.
            </span>
          ) : (
            [...races].reverse().map(race => {
              const sev   = race.severity ?? 'critical';
              const color = SEVERITY_COLOR[sev] ?? '#ef4444';
              return (
                <button
                  key={race.raceId}
                  onClick={() => handleFocus(race)}
                  title="Klick: Im Canvas fokussieren"
                  style={{
                    background: '#1e293b',
                    border: `1px solid ${color}40`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 4,
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    color: '#e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background: color,
                          color: '#0f172a',
                          fontWeight: 700,
                          fontSize: 9,
                          padding: '1px 5px',
                          borderRadius: 3,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {SEVERITY_LABEL[sev]}
                      </span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>t = {race.time}</span>
                    </div>
                    <span style={{ color: '#64748b', overflowWrap: 'anywhere' }}>{race.netId}</span>
                  </div>
                  {race.type && (
                    <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                      {TYPE_DESC[race.type] ?? race.type}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8', overflowWrap: 'anywhere' }}>
                    Gate: {race.gateIds.map(id => {
                      const g = circuit.gates[id];
                      return g?.label ? `${g.label} (${id.slice(0, 8)})` : id.slice(0, 12);
                    }).join(', ')}
                  </div>
                  {race.values.length > 0 && (
                    <div style={{ fontSize: 11, color }}>
                      Werte: {race.values.map(v => `'${v}'`).join(' vs ')}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, borderTop: '1px solid #1e293b', paddingTop: 10 }}>
          <button
            onClick={clearRaceMonitor}
            style={{
              fontSize: 11,
              padding: '4px 12px',
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: 4,
              color: '#fca5a5',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Monitor reset
          </button>
          <button
            onClick={onClose}
            style={{
              fontSize: 11,
              padding: '4px 12px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 4,
              color: '#94a3b8',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

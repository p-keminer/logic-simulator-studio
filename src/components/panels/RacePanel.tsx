/**
 * Race Condition Debug Panel.
 *
 * Displays detected race conditions from GATE_DELAY simulation mode.
 * Clicking an entry focuses the affected area on the canvas via viewport dispatch.
 */
import React from 'react';
import type { RaceInfo, RaceSeverity } from '../../core/types';
import { useCircuitContext } from '../../store/CircuitContext';

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
  reconvergent_glitch: 'Rekonvergentes Fächerglitch (mehrf. Pegelwechsel)',
  latch_race_through:  'Latch-Race-Through (Ausgang oszilliert bei EN=1)',
  setup_hold_risk:     'Setup/Hold-Risiko: CLK-Flanke und Daten im selben Takt',
  loop_overflow:       'Ereignisbudget überschritten — mögliche kombinatorische Schleife',
};

interface Props {
  onClose: () => void;
}

export function RacePanel({ onClose }: Props) {
  const { races, circuit, dispatch } = useCircuitContext();

  const handleFocus = (race: RaceInfo) => {
    // Find the position of any involved gate and zoom to it.
    const gateId = race.gateIds[0];
    const gate   = gateId ? circuit.gates[gateId] : undefined;
    if (!gate) return;

    // Center viewport on the gate.
    const cx = gate.x + 50;
    const cy = gate.y + 40;
    dispatch({
      type: 'VIEWPORT_SET',
      payload: { panX: cx - 400, panY: cy - 300, zoom: 2 },
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
        zIndex: 3000,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #ef4444',
          borderRadius: 8,
          padding: '16px 20px',
          minWidth: 420,
          maxWidth: 600,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontFamily: 'monospace',
          color: '#e2e8f0',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
            Race / Hazard Monitor — GATE_DELAY Modus
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
            }}
          >
            ×
          </button>
        </div>

        {/* Explanation */}
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          Erkannte Hazards im GATE_DELAY-Modus. Betroffene Leitungen werden farblich
          hervorgehoben: rot=Konflikt, lila=Timing, orange=Glitch, gelb=Warnung, pink=Schleife.
        </p>

        {/* Race list */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                    <span style={{ color: '#64748b' }}>{race.netId}</span>
                  </div>
                  {race.type && (
                    <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                      {TYPE_DESC[race.type] ?? race.type}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #1e293b', paddingTop: 10 }}>
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

/**
 * Race Condition Debug Panel.
 *
 * Displays detected race conditions from GATE_DELAY simulation mode.
 * Clicking an entry focuses the affected area on the canvas via viewport dispatch.
 */
import React from 'react';
import type { RaceInfo } from '../../core/types';
import { useCircuitContext } from '../../store/CircuitContext';

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
            ⚠ Race Conditions — GATE_DELAY Modus
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
          Eine Race Condition tritt auf, wenn mehrere Ereignisse dasselbe Netz zur gleichen
          Simulationszeit mit konkurrierenden Werten beeinflussen.
          Betroffene Leitungen werden im Canvas rot hervorgehoben.
        </p>

        {/* Race list */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {races.length === 0 ? (
            <span style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
              Keine Races erkannt.
            </span>
          ) : (
            [...races].reverse().map(race => (
              <button
                key={race.raceId}
                onClick={() => handleFocus(race)}
                title="Klick: Im Canvas fokussieren"
                style={{
                  background: '#1e293b',
                  border: '1px solid #ef444440',
                  borderLeft: '3px solid #ef4444',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                    t = {race.time}
                  </span>
                  <span style={{ color: '#64748b' }}>
                    {race.netId}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Treiber: {race.gateIds.map(id => {
                    const g = circuit.gates[id];
                    return g?.label ? `${g.label} (${id.slice(0, 8)})` : id.slice(0, 12);
                  }).join(', ')}
                </div>
                <div style={{ fontSize: 11, color: '#ef4444' }}>
                  Werte: {race.values.map(v => `'${v}'`).join(' vs ')}
                </div>
              </button>
            ))
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

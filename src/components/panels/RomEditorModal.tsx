import { useState, useEffect } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';

interface Props {
  gateId: string;
  onClose: () => void;
}

export function RomEditorModal({ gateId, onClose }: Props) {
  const { circuit, dispatch } = useCircuitContext();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const gate = circuit.gates[gateId];
  const currentData = (gate?.customState?.data as number[] | undefined) ?? new Array(256).fill(0);

  // Format current data as hex string for display
  const toHexString = (data: number[]) =>
    data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

  const [hexText, setHexText] = useState(() => toHexString(currentData));
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    const tokens = hexText.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 256) {
      setError(`Zu viele Werte: ${tokens.length} (max. 256)`);
      return;
    }
    const data: number[] = new Array(256).fill(0);
    for (let i = 0; i < tokens.length; i++) {
      const v = parseInt(tokens[i], 16);
      if (isNaN(v) || v < 0 || v > 255) {
        setError(`Ungültiger Wert an Position ${i}: "${tokens[i]}" (erwartet 00–FF)`);
        return;
      }
      data[i] = v;
    }
    dispatch({ type: 'GATE_ROM_LOAD', payload: { gateId, data } });
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3500,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
          padding: '20px 24px', width: 520, maxHeight: '80vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ color: '#f1f5f9', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, margin: 0 }}>
            💾 ROM-Inhalt bearbeiten
          </h2>
          <button onClick={onClose}
            style={{ background:'none', border:'none', color:'#64748b', fontSize:18, cursor:'pointer', padding:'2px 6px', borderRadius:4 }}>
            ✕
          </button>
        </div>

        <p style={{ color:'#64748b', fontSize:11, fontFamily:'monospace', marginBottom:10, marginTop:0 }}>
          Hex-Werte (00–FF), leerzeichengetrennt, bis zu 256 Bytes.
          Nicht angegebene Adressen werden mit 00 aufgefüllt.
        </p>

        <textarea
          value={hexText}
          onChange={(e) => setHexText(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1, minHeight: 220, resize: 'vertical',
            background: '#020617', border: '1px solid #334155', borderRadius: 6,
            color: '#7dd3fc', fontFamily: 'monospace', fontSize: 13, padding: '10px',
            outline: 'none', letterSpacing: 1,
          }}
          placeholder="00 01 02 03 FF FE ..."
        />

        {error && (
          <div style={{ color:'#f87171', fontSize:11, fontFamily:'monospace', marginTop:8 }}>{error}</div>
        )}

        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
          <button onClick={onClose}
            style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', borderRadius:6, padding:'5px 16px', cursor:'pointer', fontFamily:'monospace', fontSize:12 }}>
            Abbrechen
          </button>
          <button onClick={handleLoad}
            style={{ background:'#1d4ed8', border:'none', color:'#fff', borderRadius:6, padding:'5px 16px', cursor:'pointer', fontFamily:'monospace', fontSize:12, fontWeight:600 }}>
            Laden
          </button>
        </div>
      </div>
    </div>
  );
}

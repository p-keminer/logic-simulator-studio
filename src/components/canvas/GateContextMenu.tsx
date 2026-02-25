import { useState } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import type { GateInstance } from '../../core/types';
import { RomEditorModal } from '../panels/RomEditorModal';

const LED_COLORS = ['#22c55e','#ef4444','#f59e0b','#3b82f6','#a855f7','#ec4899','#ffffff','#f97316'];

interface Props {
  gate: GateInstance;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

export function GateContextMenu({ gate, screenX, screenY, onClose }: Props) {
  const { dispatch } = useCircuitContext();
  const [showLedColors, setShowLedColors] = useState(false);
  const [showFreqInput, setShowFreqInput] = useState(false);
  const [freqVal, setFreqVal] = useState(String((gate.customState?.frequency as number) ?? 1));
  const [showRomEditor, setShowRomEditor] = useState(false);

  const handleRename = () => {
    onClose();
    const isNote = gate.typeId === 'TEXT_NOTE';
    const current = isNote ? ((gate.customState?.text as string) ?? '') : (gate.label ?? '');
    const next = window.prompt(isNote ? 'Notiztext:' : 'Instanzname (für HDL):', current);
    if (next !== null) {
      if (isNote) dispatch({ type: 'GATE_SET_TEXT', payload: { gateId: gate.id, text: next } });
      else dispatch({ type: 'GATE_SET_LABEL', payload: { gateId: gate.id, label: next } });
    }
  };

  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', background: 'none', border: 'none',
    color: '#cbd5e1', fontSize: 12, fontFamily: 'monospace', textAlign: 'left',
    padding: '5px 12px', cursor: 'pointer', borderRadius: 4, whiteSpace: 'nowrap',
  };
  const hov = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    (e.currentTarget as HTMLButtonElement).style.background = enter ? '#1e293b' : 'none';
  };

  // Clamp so menu stays on screen
  const maxX = window.innerWidth - 180;
  const maxY = window.innerHeight - 300;
  const left = Math.min(screenX, maxX);
  const top  = Math.min(screenY, maxY);

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:1999 }} onMouseDown={onClose} />
      <div
        style={{
          position:'fixed', top, left, zIndex:2000,
          background:'#0f172a', border:'1px solid #334155', borderRadius:8,
          padding:'4px 0', boxShadow:'0 8px 32px rgba(0,0,0,0.7)', minWidth:170,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ color:'#475569', fontSize:10, fontFamily:'monospace', padding:'3px 12px 6px', borderBottom:'1px solid #1e293b', marginBottom:2 }}>
          {gate.typeId.replace(/_/g,' ')}
          {gate.label && <span style={{ color:'#64748b' }}> · {gate.label}</span>}
        </div>

        {gate.typeId === 'INPUT_SWITCH' && (
          <button style={itemStyle} onMouseEnter={(e)=>hov(e,true)} onMouseLeave={(e)=>hov(e,false)}
            onClick={() => { dispatch({ type:'GATE_TOGGLE_SWITCH', payload:{ gateId:gate.id } }); onClose(); }}>
            ⚡ Umschalten
          </button>
        )}

        <button style={itemStyle} onMouseEnter={(e)=>hov(e,true)} onMouseLeave={(e)=>hov(e,false)} onClick={handleRename}>
          ✏️ {gate.typeId === 'TEXT_NOTE' ? 'Text bearbeiten' : 'Umbenennen'}
        </button>

        <button style={itemStyle} onMouseEnter={(e)=>hov(e,true)} onMouseLeave={(e)=>hov(e,false)}
          onClick={() => { dispatch({ type:'GATE_ROTATE', payload:{ gateId:gate.id } }); onClose(); }}>
          ↻ Drehen (90°)
        </button>

        {gate.typeId === 'OUTPUT_LED' && !showLedColors && (
          <button style={itemStyle} onMouseEnter={(e)=>hov(e,true)} onMouseLeave={(e)=>hov(e,false)}
            onClick={() => setShowLedColors(true)}>
            🎨 LED-Farbe…
          </button>
        )}
        {gate.typeId === 'OUTPUT_LED' && showLedColors && (
          <div style={{ padding:'4px 12px 8px' }}>
            <div style={{ color:'#94a3b8', fontSize:10, fontFamily:'monospace', marginBottom:5 }}>LED-Farbe</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', maxWidth:150 }}>
              {LED_COLORS.map((color) => (
                <button key={color}
                  onClick={() => { dispatch({ type:'GATE_SET_LED_COLOR', payload:{ gateId:gate.id, color } }); onClose(); }}
                  style={{
                    width:22, height:22, borderRadius:4, cursor:'pointer',
                    border:'2px solid ' + ((gate.customState?.ledColor as string)===color ? '#fff' : '#475569'),
                    background:color,
                    boxShadow:(gate.customState?.ledColor as string)===color ? '0 0 6px '+color : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {gate.typeId === 'CLOCK' && !showFreqInput && (
          <button style={itemStyle} onMouseEnter={(e)=>hov(e,true)} onMouseLeave={(e)=>hov(e,false)}
            onClick={() => setShowFreqInput(true)}>
            ⏱ Frequenz…
          </button>
        )}
        {gate.typeId === 'CLOCK' && showFreqInput && (
          <div style={{ padding:'4px 12px 8px' }}>
            <div style={{ color:'#94a3b8', fontSize:10, fontFamily:'monospace', marginBottom:4 }}>Hz (0.1–100)</div>
            <div style={{ display:'flex', gap:4 }}>
              <input type="number" min={0.1} max={100} step={0.1} value={freqVal}
                onChange={(e) => setFreqVal(e.target.value)}
                style={{ width:68, background:'#1e293b', border:'1px solid #334155', color:'#e2e8f0', borderRadius:4, padding:'2px 6px', fontSize:11, fontFamily:'monospace' }}
              />
              <button
                onClick={() => {
                  const freq = parseFloat(freqVal);
                  if (!isNaN(freq) && freq >= 0.1 && freq <= 100)
                    dispatch({ type:'GATE_SET_FREQ', payload:{ gateId:gate.id, frequency:freq } });
                  onClose();
                }}
                style={{ background:'#1d4ed8', border:'none', color:'#fff', borderRadius:4, padding:'2px 8px', cursor:'pointer', fontSize:11, fontFamily:'monospace' }}>
                OK
              </button>
            </div>
          </div>
        )}

        {gate.typeId === 'ROM256' && (
          <button style={itemStyle} onMouseEnter={(e)=>hov(e,true)} onMouseLeave={(e)=>hov(e,false)}
            onClick={() => setShowRomEditor(true)}>
            💾 ROM-Inhalt bearbeiten…
          </button>
        )}

        <div style={{ height:1, background:'#1e293b', margin:'3px 0' }} />
        <button
          style={{ ...itemStyle, color:'#f87171' }}
          onMouseEnter={(e) => { hov(e,true); (e.currentTarget as HTMLButtonElement).style.color='#fca5a5'; }}
          onMouseLeave={(e) => { hov(e,false); (e.currentTarget as HTMLButtonElement).style.color='#f87171'; }}
          onClick={() => { dispatch({ type:'GATE_DELETE', payload:{ gateId:gate.id } }); onClose(); }}>
          🗑 Löschen
        </button>
      </div>
      {showRomEditor && (
        <RomEditorModal gateId={gate.id} onClose={() => { setShowRomEditor(false); onClose(); }} />
      )}
    </>
  );
}
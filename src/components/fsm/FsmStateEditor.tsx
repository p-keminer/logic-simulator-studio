import { useState, useEffect, useMemo } from 'react';
import { useFsm } from '../../fsm/FsmContext';
import { analyzeFsmStructure } from '../../fsm/analysis/structure';
import type { FsmStateNode } from '../../fsm/types';

interface Props { state: FsmStateNode; onClose: () => void }

const BTN = { padding:'4px 12px', borderRadius:4, cursor:'pointer', fontSize:12, fontFamily:'monospace' } as const;

export function FsmStateEditor({ state, onClose }: Props) {
  const { fsm, dispatch } = useFsm();
  const isUnreachable = useMemo(() => {
    try {
      return analyzeFsmStructure(fsm).unreachableStateIds.has(state.id);
    } catch {
      return false;
    }
  }, [fsm, state.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const [label,  setLabel]  = useState(state.label);
  const [output, setOutput] = useState(state.output);
  const [initial, setInitial] = useState(state.isInitial);

  const save = () => {
    dispatch({ type:'UPDATE_STATE', payload:{ id:state.id, label:label.trim()||state.label, output, isInitial:initial } });
    if (initial) {
      // SET_INITIAL ensures exactly one initial state by clearing all others
      dispatch({ type:'SET_INITIAL', payload:{ id:state.id } });
    } else if (state.isInitial) {
      // User unchecked "initial" for the current initial state → promote first other state
      const others = Object.values(fsm.states).filter(s => s.id !== state.id);
      if (others.length > 0 && !others.some(s => s.isInitial)) {
        dispatch({ type:'SET_INITIAL', payload:{ id: others[0].id } });
      }
    }
    onClose();
  };

  const del = () => {
    dispatch({ type:'DELETE_STATE', payload:{ id:state.id } });
    onClose();
  };

  const maxOut = (1 << fsm.outputCount) - 1;

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:4000 }}
      onMouseDown={onClose}
    >
      <div style={{ background:'#0f172a',border:'1px solid #334155',borderRadius:10,
        padding:'20px 24px',minWidth:280,boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <h3 style={{ color:'#f1f5f9',fontFamily:'monospace',fontSize:13,margin:'0 0 16px' }}>
          ✎ Zustand bearbeiten
        </h3>

        <label style={{ color:'#94a3b8',fontSize:11,fontFamily:'monospace' }}>
          Bezeichnung
          <input value={label} onChange={e=>setLabel(e.target.value)}
            style={{ display:'block',marginTop:4,width:'100%',background:'#1e293b',border:'1px solid #334155',
              borderRadius:4,padding:'5px 8px',color:'#f1f5f9',fontFamily:'monospace',fontSize:12 }} />
        </label>

        {fsm.archType === 'moore' && (
          <label style={{ color:'#94a3b8',fontSize:11,fontFamily:'monospace',display:'block',marginTop:12 }}>
            Ausgabewert (0 – {maxOut})
            <input type="number" min={0} max={maxOut} value={output}
              onChange={e => setOutput(Math.max(0,Math.min(maxOut,+e.target.value||0)))}
              style={{ display:'block',marginTop:4,width:'100%',background:'#1e293b',border:'1px solid #334155',
                borderRadius:4,padding:'5px 8px',color:'#22c55e',fontFamily:'monospace',fontSize:13 }} />
          </label>
        )}

        <label style={{ display:'flex',alignItems:'center',gap:8,color:'#94a3b8',
          fontSize:11,fontFamily:'monospace',marginTop:12,cursor:'pointer' }}>
          <input type="checkbox" checked={initial} onChange={e=>setInitial(e.target.checked)}/>
          Anfangszustand
        </label>

        {isUnreachable && (
          <div style={{
            marginTop: 12,
            padding: '8px 10px',
            background: '#431407',
            border: '1px solid #9a3412',
            borderRadius: 6,
            color: '#fdba74',
            fontSize: 10,
            fontFamily: 'monospace',
          }}>
            Dieser Zustand ist vom Startzustand aus unerreichbar und wird nicht synthetisiert.
          </div>
        )}

        <div style={{ display:'flex',justifyContent:'space-between',marginTop:20,gap:8 }}>
          <button onClick={del}
            style={{ ...BTN,background:'#7f1d1d',color:'#fca5a5',border:'1px solid #ef4444' }}>
            Löschen
          </button>
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={onClose}
              style={{ ...BTN,background:'#1e293b',color:'#64748b',border:'1px solid #334155' }}>
              Abbrechen
            </button>
            <button onClick={save}
              style={{ ...BTN,background:'#166534',color:'#86efac',border:'1px solid #22c55e' }}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

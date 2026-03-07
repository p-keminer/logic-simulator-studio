import { useState, useEffect } from 'react';
import { useFsm } from '../../fsm/FsmContext';
import { parseCondition, validateVars, evalCondition } from '../../fsm/conditionParser';
import type { FsmTransition } from '../../fsm/types';

interface AddProps { fromId: string; toId: string; onClose: () => void }
interface EditProps { transition: FsmTransition; onClose: () => void }
type Props = ({ mode: 'add' } & AddProps) | ({ mode: 'edit' } & EditProps);

const BTN = { padding:'4px 12px',borderRadius:4,cursor:'pointer',fontSize:12,fontFamily:'monospace' } as const;

export function FsmTransitionEditor(props: Props) {
  const { fsm, dispatch } = useFsm();
  const { onClose } = props;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const initial = props.mode === 'edit' ? props.transition : null;

  const [cond,   setCond]    = useState(initial?.conditionText ?? '1');
  const [mealy,  setMealy]   = useState(initial?.mealyOutput   ?? 0);

  const fromLabel = fsm.states[props.mode==='add' ? props.fromId : initial!.fromId]?.label ?? '?';
  const toLabel   = fsm.states[props.mode==='add' ? props.toId   : initial!.toId]?.label   ?? '?';

  // Live validation
  const { ast, error: parseErr } = parseCondition(cond);
  const varErr   = ast ? validateVars(ast, fsm.inputNames) : null;
  const err      = parseErr ?? varErr;
  const isValid  = !err;

  // Preview: which input combos trigger this condition
  const preview: string[] = [];
  if (ast && isValid && fsm.inputCount <= 4) {
    const n = fsm.inputCount;
    for (let i = 0; i < (1<<n); i++) {
      const vals: Record<string,boolean> = {};
      for (let j = 0; j < n; j++) vals[fsm.inputNames[j]] = ((i>>(n-1-j))&1)===1;
      if (evalCondition(ast, vals)) {
        preview.push(fsm.inputNames.map((nm,j)=>`${nm}=${((i>>(n-1-j))&1)}`).join(', '));
      }
    }
  }

  const maxOut = (1 << fsm.outputCount) - 1;

  const confirm = () => {
    if (!isValid) return;
    if (props.mode === 'add') {
      dispatch({ type:'ADD_TRANSITION', payload:{ fromId:props.fromId, toId:props.toId,
        conditionText: cond.trim()||'1', mealyOutput: mealy } });
    } else {
      dispatch({ type:'UPDATE_TRANSITION', payload:{ id:initial!.id,
        conditionText: cond.trim()||'1', mealyOutput: mealy } });
    }
    onClose();
  };

  const del = () => {
    if (props.mode === 'edit') dispatch({ type:'DELETE_TRANSITION', payload:{ id:initial!.id } });
    onClose();
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',
      alignItems:'center',justifyContent:'center',zIndex:4000 }}
      onMouseDown={onClose}
    >
      <div style={{ background:'#0f172a',border:'1px solid #334155',borderRadius:10,
        padding:'20px 24px',minWidth:320,maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,0.8)' }}
        onMouseDown={e=>e.stopPropagation()}
      >
        <h3 style={{ color:'#f1f5f9',fontFamily:'monospace',fontSize:13,margin:'0 0 4px' }}>
          {props.mode==='add' ? '+ Übergang hinzufügen' : '✎ Übergang bearbeiten'}
        </h3>
        <p style={{ color:'#475569',fontSize:11,fontFamily:'monospace',margin:'0 0 16px' }}>
          {fromLabel} → {toLabel}
        </p>

        {/* Condition input */}
        <label style={{ color:'#94a3b8',fontSize:11,fontFamily:'monospace' }}>
          Bedingung
          <input value={cond} onChange={e=>setCond(e.target.value)}
            placeholder="z.B.  A & !B  oder  A | B  oder  1"
            style={{ display:'block',marginTop:4,width:'100%',background:'#1e293b',
              border:`1px solid ${err ? '#ef4444' : isValid ? '#22c55e' : '#334155'}`,
              borderRadius:4,padding:'6px 8px',color:'#f1f5f9',fontFamily:'monospace',fontSize:12,
              boxSizing:'border-box' }} />
        </label>
        <p style={{ fontSize:10,fontFamily:'monospace',margin:'4px 0 0',
          color:'#475569' }}>
          Variablen: {fsm.inputNames.join(', ')} &nbsp;·&nbsp; Operatoren: &amp; &nbsp;| &nbsp;! &nbsp;()
        </p>

        {/* Error */}
        {err && <p style={{ color:'#ef4444',fontSize:10,fontFamily:'monospace',marginTop:6 }}>{err}</p>}

        {/* Preview */}
        {!err && preview.length > 0 && (
          <p style={{ color:'#22c55e',fontSize:10,fontFamily:'monospace',marginTop:6 }}>
            ✓ Aktiv bei: {preview.slice(0,4).join(' | ')}{preview.length>4?' …':''}
          </p>
        )}
        {!err && preview.length===0 && cond.trim() && fsm.inputCount <= 4 && (
          <p style={{ color:'#f59e0b',fontSize:10,fontFamily:'monospace',marginTop:6 }}>
            ⚠ Bedingung niemals wahr
          </p>
        )}

        {/* Mealy output */}
        {fsm.archType === 'mealy' && (
          <label style={{ color:'#94a3b8',fontSize:11,fontFamily:'monospace',display:'block',marginTop:12 }}>
            Mealy-Ausgabe (0 – {maxOut})
            <input type="number" min={0} max={maxOut} value={mealy}
              onChange={e=>setMealy(Math.max(0,Math.min(maxOut,+e.target.value||0)))}
              style={{ display:'block',marginTop:4,width:80,background:'#1e293b',border:'1px solid #334155',
                borderRadius:4,padding:'5px 8px',color:'#22c55e',fontFamily:'monospace',fontSize:13 }} />
          </label>
        )}

        <div style={{ display:'flex',justifyContent:'space-between',marginTop:20,gap:8 }}>
          {props.mode==='edit' ? (
            <button onClick={del}
              style={{ ...BTN,background:'#7f1d1d',color:'#fca5a5',border:'1px solid #ef4444' }}>
              Löschen
            </button>
          ) : <span/>}
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={props.onClose}
              style={{ ...BTN,background:'#1e293b',color:'#64748b',border:'1px solid #334155' }}>
              Abbrechen
            </button>
            <button onClick={confirm} disabled={!isValid}
              style={{ ...BTN,
                background: isValid ? '#166534' : '#1e293b',
                color:      isValid ? '#86efac' : '#475569',
                border:     `1px solid ${isValid ? '#22c55e' : '#334155'}`,
                cursor:     isValid ? 'pointer' : 'not-allowed',
              }}>
              {props.mode==='add' ? 'Hinzufügen' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

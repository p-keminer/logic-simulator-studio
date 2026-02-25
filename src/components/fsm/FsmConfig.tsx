import { useFsm } from '../../fsm/FsmContext';

function btnStyle(active?: boolean) {
  return {
    padding: '2px 8px', fontSize: 11, fontFamily: 'monospace', borderRadius: 4,
    cursor: 'pointer' as const,
    background: active ? '#1d4ed8' : '#1e293b',
    color:      active ? '#93c5fd' : '#94a3b8',
    border:     `1px solid ${active ? '#3b82f6' : '#334155'}`,
  };
}
function smBtnStyle() {
  return {
    padding: '0 6px', fontSize: 13, fontFamily: 'monospace', borderRadius: 4,
    cursor: 'pointer' as const, background: '#1e293b', color: '#94a3b8',
    border: '1px solid #334155',
  };
}

export function FsmConfig() {
  const { fsm, dispatch } = useFsm();

  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b',
      display: 'flex', flexDirection: 'column', gap: 10 }}>

      <div style={{ color:'#60a5fa', fontFamily:'monospace', fontSize:12, fontWeight:700 }}>
        Konfiguration
      </div>

      {/* Architecture */}
      <div>
        <div style={{ color:'#64748b', fontSize:11, fontFamily:'monospace', marginBottom:4 }}>
          Architektur
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <button style={btnStyle(fsm.archType==='moore')}
            onClick={() => dispatch({ type:'SET_ARCH', payload:{ archType:'moore' } })}>
            Moore
          </button>
          <button style={btnStyle(fsm.archType==='mealy')}
            onClick={() => dispatch({ type:'SET_ARCH', payload:{ archType:'mealy' } })}>
            Mealy
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          color:'#64748b', fontSize:11, fontFamily:'monospace', marginBottom:4 }}>
          <span>Eingänge ({fsm.inputCount})</span>
          <div style={{ display:'flex', gap:3 }}>
            <button style={smBtnStyle()}
              onClick={() => dispatch({ type:'SET_INPUT_COUNT', payload:{ count:Math.max(1,fsm.inputCount-1) } })}>
              −
            </button>
            <button style={smBtnStyle()}
              onClick={() => dispatch({ type:'SET_INPUT_COUNT', payload:{ count:Math.min(4,fsm.inputCount+1) } })}>
              +
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {fsm.inputNames.map((name, i) => (
            <input key={i} value={name} maxLength={4}
              style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:4,
                color:'#e2e8f0', fontSize:11, fontFamily:'monospace', padding:'2px 6px',
                outline:'none', width:46, boxSizing:'border-box' }}
              onChange={e => dispatch({ type:'SET_INPUT_NAME', payload:{ index:i, name:e.target.value } })}
            />
          ))}
        </div>
      </div>

      {/* Outputs */}
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          color:'#64748b', fontSize:11, fontFamily:'monospace', marginBottom:4 }}>
          <span>Ausgänge ({fsm.outputCount})</span>
          <div style={{ display:'flex', gap:3 }}>
            <button style={smBtnStyle()}
              onClick={() => dispatch({ type:'SET_OUTPUT_COUNT', payload:{ count:Math.max(1,fsm.outputCount-1) } })}>
              −
            </button>
            <button style={smBtnStyle()}
              onClick={() => dispatch({ type:'SET_OUTPUT_COUNT', payload:{ count:Math.min(4,fsm.outputCount+1) } })}>
              +
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {fsm.outputNames.map((name, i) => (
            <input key={i} value={name} maxLength={4}
              style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:4,
                color:'#e2e8f0', fontSize:11, fontFamily:'monospace', padding:'2px 6px',
                outline:'none', width:46, boxSizing:'border-box' }}
              onChange={e => dispatch({ type:'SET_OUTPUT_NAME', payload:{ index:i, name:e.target.value } })}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

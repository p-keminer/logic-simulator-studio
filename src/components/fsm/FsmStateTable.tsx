import { useMemo } from 'react';
import { useFsm } from '../../fsm/FsmContext';
import type { FsmStateNode } from '../../fsm/types';
import { parseCondition, evalCondition } from '../../fsm/conditionParser';
import { detectOverlappingTransitions } from '../../fsm/synthesis/synthesize';

function getStateEncoding(states: Record<string, FsmStateNode>): Map<string, string> {
  const list    = Object.values(states);
  const initial = list.find(s => s.isInitial);
  const others  = list.filter(s => !s.isInitial).sort((a, b) => a.label.localeCompare(b.label));
  const ordered = initial ? [initial, ...others] : others;
  const bits    = Math.ceil(Math.log2(Math.max(2, list.length)));
  const enc     = new Map<string, string>();
  ordered.forEach((s, i) => enc.set(s.id, i.toString(2).padStart(bits, '0')));
  return enc;
}

const HDR: React.CSSProperties = {
  background: '#1e293b', color: '#64748b', fontSize: 10,
  fontFamily: 'monospace', padding: '4px 6px', textAlign: 'left', fontWeight: 600,
};
const CELL: React.CSSProperties = {
  color: '#94a3b8', fontSize: 10, fontFamily: 'monospace',
  padding: '3px 6px', borderBottom: '1px solid #0f172a',
};

export function FsmStateTable() {
  const { fsm } = useFsm();
  const { states, transitions, inputNames, outputNames, archType, inputCount, outputCount } = fsm;

  const encoding = useMemo(() => getStateEncoding(states), [states]);

  const stateList = useMemo(() => {
    const initial = Object.values(states).find(s => s.isInitial);
    const others  = Object.values(states).filter(s => !s.isInitial)
      .sort((a, b) => a.label.localeCompare(b.label));
    return initial ? [initial, ...others] : others;
  }, [states]);

  const inputCombos = useMemo(() => {
    const n = inputCount;
    return Array.from({ length: 1 << n }, (_, i) => {
      const vals: Record<string, boolean> = {};
      for (let j = 0; j < n; j++) vals[inputNames[j]] = ((i >> (n-1-j)) & 1) === 1;
      return { label: i.toString(2).padStart(n, '0'), vals };
    });
  }, [inputCount, inputNames]);

  const overlapWarnings = useMemo(() => detectOverlappingTransitions(fsm), [fsm]);
  const statesWithOverlaps = useMemo(
    () => new Set(overlapWarnings.map(w => w.stateId)),
    [overlapWarnings],
  );

  // Pre-parse all transition conditions once per FSM change (V3-L5)
  const parsedConditions = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseCondition>>();
    for (const t of transitions) {
      map.set(t.id, parseCondition(t.conditionText));
    }
    return map;
  }, [transitions]);

  const findNext = (stateId: string, vals: Record<string, boolean>) => {
    for (const t of transitions.filter(t => t.fromId === stateId)) {
      const cached = parsedConditions.get(t.id);
      if (cached && !cached.error && cached.ast && evalCondition(cached.ast, vals))
        return { ns: states[t.toId] ?? null, mealyOut: t.mealyOutput };
    }
    return { ns: null, mealyOut: null };
  };

  if (stateList.length === 0) {
    return (
      <div style={{ padding:12, color:'#475569', fontSize:11, fontFamily:'monospace' }}>
        Keine Zustände definiert.
      </div>
    );
  }

  return (
    <div style={{ padding:'10px 12px' }}>
      <div style={{ color:'#60a5fa', fontFamily:'monospace', fontSize:12, fontWeight:700, marginBottom:8 }}>
        Zustandstabelle
        <span style={{ color:'#475569', fontWeight:400, marginLeft:6, fontSize:10 }}>
          ({inputNames.join('')} / {outputNames.join('')})
        </span>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', width:'100%' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #334155' }}>
              <th style={HDR}>Zustand</th>
              <th style={HDR}>Enc</th>
              <th style={{ ...HDR, borderLeft:'1px solid #1e293b' }}>{inputNames.join('')}</th>
              <th style={HDR}>→ Folge</th>
              <th style={HDR}>Enc</th>
              <th style={HDR}>{archType==='moore' ? outputNames.join('') : 'Y'}</th>
            </tr>
          </thead>
          <tbody>
            {stateList.map(s =>
              inputCombos.map((combo, ci) => {
                const { ns, mealyOut } = findNext(s.id, combo.vals);
                // Display MSB-first to match the column header (outputNames[0] = MSB)
                const toBitStr = (v: number) =>
                  outputNames.map((_, i) => ((v >> (outputCount - 1 - i)) & 1)).join('');
                const outStr = archType === 'moore'
                  ? toBitStr(s.output)
                  : (mealyOut != null ? toBitStr(mealyOut) : '—');
                return (
                  <tr key={`${s.id}-${ci}`}
                    style={ci===0 ? { borderTop:'1px solid #1e293b' } : {}}>
                    <td style={{ ...CELL, color:'#e2e8f0', fontWeight: ci===0?700:400 }}>
                      {ci===0 ? s.label : ''}
                      {ci===0 && statesWithOverlaps.has(s.id) && (
                        <span style={{ color:'#f59e0b', marginLeft:4, fontSize:9 }} title="Overlapping transitions">
                          !! overlap
                        </span>
                      )}
                    </td>
                    <td style={{ ...CELL, color:'#7dd3fc' }}>
                      {ci===0 ? (encoding.get(s.id)??'?') : ''}
                    </td>
                    <td style={{ ...CELL, borderLeft:'1px solid #1e293b' }}>
                      {combo.label}
                    </td>
                    <td style={{ ...CELL, color: ns ? '#94a3b8' : '#f87171' }}>
                      {ns ? ns.label : '—'}
                    </td>
                    <td style={{ ...CELL, color:'#7dd3fc' }}>
                      {ns ? (encoding.get(ns.id)??'?') : ''}
                    </td>
                    <td style={{ ...CELL, color:'#a3e635' }}>
                      {outStr}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {overlapWarnings.length > 0 && (
        <div style={{
          marginTop: 8, padding: '6px 8px', background: '#451a03',
          border: '1px solid #78350f', borderRadius: 4,
          color: '#fbbf24', fontSize: 10, fontFamily: 'monospace',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            Overlapping transitions detected
          </div>
          {overlapWarnings.map((w, i) => {
            const st = states[w.stateId];
            const t0 = transitions.find(t => t.id === w.transitionIds[0]);
            const t1 = transitions.find(t => t.id === w.transitionIds[1]);
            return (
              <div key={i} style={{ color: '#fcd34d', marginTop: 2 }}>
                State {st?.label ?? '?'}: &quot;{t0?.conditionText}&quot; and &quot;{t1?.conditionText}&quot;
                {' '}overlap at {inputNames.join('')}={w.inputCombo}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

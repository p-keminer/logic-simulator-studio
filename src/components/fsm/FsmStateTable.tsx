import { useMemo } from 'react';
import { useFsm } from '../../fsm/FsmContext';
import { parseCondition, evalCondition } from '../../fsm/conditionParser';
import { analyzeFsmStructure, formatStateEncoding } from '../../fsm/analysis/structure';
import { detectOverlappingTransitions } from '../../fsm/synthesis/synthesize';

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
  return <FsmStateTableContent fsm={fsm} />;
}

interface Props {
  fsm: ReturnType<typeof useFsm>['fsm'];
}

export function FsmStateTableContent({ fsm }: Props) {
  const { states, transitions, inputNames, outputNames, archType, inputCount, outputCount } = fsm;
  const stateCount = Object.keys(states).length;
  const { structure, structureError } = useMemo(() => {
    if (stateCount === 0) {
      return { structure: null, structureError: null };
    }

    const nextStructure = analyzeFsmStructure(fsm);
    if (nextStructure.initialStateError) {
      return { structure: null, structureError: nextStructure.initialStateError };
    }
    return { structure: nextStructure, structureError: null };
  }, [fsm, stateCount]);
  const encoding = useMemo(() => {
    const next = new Map<string, string>();
    if (!structure) return next;
    structure.orderedStates.forEach((state) => {
      const value = formatStateEncoding(structure, state.id);
      if (value) next.set(state.id, value);
    });
    return next;
  }, [structure]);
  const stateList = structure?.orderedStates ?? [];

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

  if (stateCount === 0) {
    return (
      <div style={{ padding:12, color:'#475569', fontSize:11, fontFamily:'monospace' }}>
        Keine Zustände definiert.
      </div>
    );
  }

  if (!structure) {
    return (
      <div style={{ padding:'10px 12px' }}>
        <div style={{
          padding: '8px 10px',
          background: '#431407',
          border: '1px solid #9a3412',
          borderRadius: 6,
          color: '#fdba74',
          fontSize: 10,
          fontFamily: 'monospace',
        }}>
          FSM-Strukturfehler: {structureError ?? 'Analyse nicht verfuegbar'}
        </div>
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
      <div style={{ color:'#64748b', fontFamily:'monospace', fontSize:10, marginBottom:8 }}>
        Synthese: {structure.effectiveStateCount}/{stateList.length} Zustände erreichbar · {structure.effectiveBitWidth} Bit
      </div>
      {structure.unreachableStates.length > 0 && (
        <div style={{
          marginBottom: 8, padding: '6px 8px', background: '#431407',
          border: '1px solid #9a3412', borderRadius: 4,
          color: '#fdba74', fontSize: 10, fontFamily: 'monospace',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            Nicht synthetisiert
          </div>
          {structure.unreachableStates.map((state) => (
            <div key={state.id}>
              {state.label}: dieser Zustand ist unerreichbar und wird nicht synthetisiert
            </div>
          ))}
        </div>
      )}
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
                const isUnreachable = structure.unreachableStateIds.has(s.id);
                const nextIsUnreachable = ns ? structure.unreachableStateIds.has(ns.id) : false;
                // Display MSB-first to match the column header (outputNames[0] = MSB)
                const toBitStr = (v: number) =>
                  outputNames.map((_, i) => ((v >> (outputCount - 1 - i)) & 1)).join('');
                const outStr = archType === 'moore'
                  ? toBitStr(s.output)
                  : (mealyOut != null ? toBitStr(mealyOut) : '—');
                return (
                  <tr key={`${s.id}-${ci}`}
                    style={ci===0 ? { borderTop:'1px solid #1e293b' } : {}}>
                    <td style={{
                      ...CELL,
                      color: isUnreachable ? '#fdba74' : '#e2e8f0',
                      fontWeight: ci===0 ? 700 : 400,
                    }}>
                      {ci===0 ? s.label : ''}
                      {ci===0 && statesWithOverlaps.has(s.id) && (
                        <span style={{ color:'#f59e0b', marginLeft:4, fontSize:9 }} title="Overlapping transitions">
                          !! overlap
                        </span>
                      )}
                      {ci===0 && isUnreachable && (
                        <span
                          style={{ color:'#fb923c', marginLeft:4, fontSize:9 }}
                          title="Dieser Zustand ist unerreichbar und wird nicht synthetisiert"
                        >
                          unreachable
                        </span>
                      )}
                      {ci===0 && isUnreachable && (
                        <div style={{ color:'#fdba74', fontSize:9, fontWeight:400, marginTop:2 }}>
                          wird nicht synthetisiert
                        </div>
                      )}
                    </td>
                    <td style={{ ...CELL, color:'#7dd3fc' }}>
                      {ci===0 ? (encoding.get(s.id) ?? '—') : ''}
                    </td>
                    <td style={{ ...CELL, borderLeft:'1px solid #1e293b' }}>
                      {combo.label}
                    </td>
                    <td style={{ ...CELL, color: ns ? (nextIsUnreachable ? '#fdba74' : '#94a3b8') : '#f87171' }}>
                      {ns ? ns.label : '—'}
                    </td>
                    <td style={{ ...CELL, color: nextIsUnreachable ? '#fdba74' : '#7dd3fc' }}>
                      {ns ? (encoding.get(ns.id) ?? '—') : ''}
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

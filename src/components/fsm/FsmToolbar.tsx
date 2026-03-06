import { useState, useRef } from 'react';
import { useFsm } from '../../fsm/FsmContext';
import { useCircuitContext } from '../../store/CircuitContext';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';
import type { CanvasMode } from './FsmCanvas';

interface Props {
  mode: CanvasMode;
  onModeChange: (m: CanvasMode) => void;
  onBack: () => void;
}

function tb(active?: boolean, danger?: boolean) {
  return {
    padding: '3px 10px', fontSize: 11, fontFamily: 'monospace', borderRadius: 4,
    cursor: 'pointer' as const,
    background: danger ? '#7f1d1d' : active ? '#1d4ed8' : '#1e293b',
    color:      danger ? '#fca5a5' : active ? '#93c5fd' : '#94a3b8',
    border:     `1px solid ${danger ? '#ef4444' : active ? '#3b82f6' : '#334155'}`,
  };
}

export function FsmToolbar({ mode, onModeChange, onBack }: Props) {
  const { fsm, dispatch } = useFsm();
  const { circuit, dispatch: cDispatch } = useCircuitContext();
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(fsm.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── FSM als JSON-Datei speichern ──────────────────────────────────────────
  const handleSave = () => {
    const json = JSON.stringify(fsm, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${fsm.name.replace(/\s+/g, '_') || 'fsm'}.fsm.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── FSM aus JSON-Datei laden ──────────────────────────────────────────────
  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const loaded = JSON.parse(ev.target?.result as string) as FsmMachine;
        if (!loaded.id || !loaded.states || !Array.isArray(loaded.transitions))
          throw new Error('Ungültiges FSM-Format');

        // ── Structural validation (V3-M4) ────────────────────────────────
        if (loaded.archType !== 'moore' && loaded.archType !== 'mealy')
          throw new Error(`Ungültiger archType: "${loaded.archType}" (erlaubt: moore, mealy)`);

        if (!Number.isInteger(loaded.inputCount) || loaded.inputCount < 1)
          throw new Error(`inputCount muss eine positive Ganzzahl sein (erhalten: ${loaded.inputCount})`);

        if (!Number.isInteger(loaded.outputCount) || loaded.outputCount < 1)
          throw new Error(`outputCount muss eine positive Ganzzahl sein (erhalten: ${loaded.outputCount})`);

        if (!Array.isArray(loaded.inputNames) || loaded.inputNames.length !== loaded.inputCount)
          throw new Error(`inputNames muss ein Array der Länge ${loaded.inputCount} sein`);

        if (!Array.isArray(loaded.outputNames) || loaded.outputNames.length !== loaded.outputCount)
          throw new Error(`outputNames muss ein Array der Länge ${loaded.outputCount} sein`);

        const stateIds = new Set(Object.keys(loaded.states));
        const maxOutput = (1 << loaded.outputCount) - 1;

        for (const s of Object.values(loaded.states)) {
          if (s.output < 0 || s.output > maxOutput)
            throw new Error(`Zustand "${s.label}": Output ${s.output} außerhalb des Bereichs 0–${maxOutput}`);
        }

        for (const t of loaded.transitions) {
          if (!stateIds.has(t.fromId))
            throw new Error(`Übergang "${t.conditionText}": fromId "${t.fromId}" referenziert keinen existierenden Zustand`);
          if (!stateIds.has(t.toId))
            throw new Error(`Übergang "${t.conditionText}": toId "${t.toId}" referenziert keinen existierenden Zustand`);
        }

        dispatch({ type: 'LOAD_FSM', payload: loaded });
      } catch (err) {
        alert('Fehler beim Laden: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';   // Reset, damit dieselbe Datei erneut geladen werden kann
  };

  const handleNeu = () => {
    const sc = Object.keys(fsm.states).length;
    const tc = fsm.transitions.length;
    if (sc === 0 || confirm(
      `Die FSM enthält ${sc} Zustände und ${tc} Übergänge.\nNicht gespeicherte Änderungen gehen verloren!\n\nFortfahren und neue FSM erstellen?`
    )) {
      dispatch({ type: 'RESET_FSM' });
    }
  };

  const handleSynthesize = () => {
    const sc = Object.keys(fsm.states).length;
    if (sc < 2) { alert('Bitte mindestens 2 Zustände definieren.'); return; }
    try {
      const { gates: newGates, wires: newWires } = synthesizeFsm(fsm, circuit);
      cDispatch({
        type: 'CIRCUIT_LOAD',
        payload: {
          circuit: {
            ...circuit,
            gates: { ...circuit.gates, ...newGates },
            wires: { ...circuit.wires, ...newWires },
          },
        },
      });
      onBack();
    } catch (e) {
      alert('Synthese fehlgeschlagen: ' + (e as Error).message);
    }
  };

  return (
    <header style={{
      height: 44, background: '#0c1526', borderBottom: '1px solid #1e293b',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, flexShrink: 0,
    }}>
      {/* Verstecktes File-Input für Laden */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.fsm.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Back */}
      <button style={tb()} onClick={onBack}>← Schaltung</button>
      <div style={{ width:1, height:20, background:'#1e293b' }} />
      <button style={tb(false, true)} onClick={handleNeu} title="Neue leere FSM erstellen">Neu</button>

      {/* Speichern / Laden */}
      <button style={{ ...tb(), background:'#1e3a5f', color:'#93c5fd', border:'1px solid #3b82f6' }}
        onClick={handleSave} title="FSM als JSON-Datei herunterladen">
        💾 Speichern
      </button>
      <button style={{ ...tb(), background:'#1e3a5f', color:'#93c5fd', border:'1px solid #3b82f6' }}
        onClick={handleLoadClick} title="FSM aus JSON-Datei laden">
        📂 Laden
      </button>

      <div style={{ width:1, height:20, background:'#1e293b' }} />

      {/* FSM name */}
      {editing ? (
        <input
          autoFocus value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={() => { dispatch({ type:'RENAME', payload:{ name:nameVal||'Neue FSM' } }); setEditing(false); }}
          onKeyDown={e => e.key==='Enter' && (e.currentTarget as HTMLInputElement).blur()}
          style={{ background:'transparent', border:'none', borderBottom:'1px solid #3b82f6',
            color:'#e2e8f0', fontSize:12, fontFamily:'monospace', outline:'none', width:160 }}
        />
      ) : (
        <span
          style={{ color:'#60a5fa', fontSize:12, fontFamily:'monospace', fontWeight:700, cursor:'text' }}
          onDoubleClick={() => { setNameVal(fsm.name); setEditing(true); }}
          title="Doppelklick zum Umbenennen"
        >
          FSM: {fsm.name}
        </span>
      )}

      <div style={{ flex:1 }} />

      {/* Add state */}
      <button style={tb()} onClick={() => dispatch({ type:'ADD_STATE' })}>
        + Zustand
      </button>
      <button
        style={{ ...tb(), background:'#14532d', color:'#86efac', border:'1px solid #16a34a' }}
        onClick={handleSynthesize}
        title="FSM als Hardware auf den Canvas synthetisieren (neben bestehender Schaltung)"
      >
        ⚡ Synthetisieren
      </button>

      <div style={{ width:1, height:20, background:'#1e293b' }} />

      {/* Select / Connect mode */}
      <button style={tb(mode==='select')} onClick={() => onModeChange('select')}>↖ Auswahl</button>
      <button style={tb(mode==='connect')} onClick={() => onModeChange('connect')}>→ Verbinden</button>

      <div style={{ width:1, height:20, background:'#1e293b' }} />

      {/* Moore / Mealy */}
      <button style={tb(fsm.archType==='moore')}
        onClick={() => dispatch({ type:'SET_ARCH', payload:{ archType:'moore' } })}>
        Moore
      </button>
      <button style={tb(fsm.archType==='mealy')}
        onClick={() => dispatch({ type:'SET_ARCH', payload:{ archType:'mealy' } })}>
        Mealy
      </button>
    </header>
  );
}

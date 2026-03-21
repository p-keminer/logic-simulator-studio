import { useEffect, useRef, useState } from 'react';
import { useFsm } from '../../fsm/FsmContext';
import { useCircuitContext } from '../../store/CircuitContext';
import { synthesizeFsm } from '../../fsm/synthesis/synthesize';
import type { FsmMachine } from '../../fsm/types';
import type { CanvasMode } from './FsmCanvas';

interface Props {
  mode: CanvasMode;
  onModeChange: (m: CanvasMode) => void;
  onBack: () => void;
  isCompactLayout?: boolean;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

function tb(active?: boolean, danger?: boolean) {
  return {
    padding: '3px 10px', fontSize: 11, fontFamily: 'monospace', borderRadius: 4,
    cursor: 'pointer' as const,
    background: danger ? '#7f1d1d' : active ? '#1d4ed8' : '#1e293b',
    color: danger ? '#fca5a5' : active ? '#93c5fd' : '#94a3b8',
    border: `1px solid ${danger ? '#ef4444' : active ? '#3b82f6' : '#334155'}`,
  };
}

function compactButton(active?: boolean, danger?: boolean) {
  return {
    ...tb(active, danger),
    padding: '4px 8px',
    minHeight: 30,
  };
}

function dividerStyle(vertical = true) {
  return vertical
    ? { width: 1, height: 20, background: '#1e293b' }
    : { width: '100%', height: 1, background: '#1e293b' };
}

export function FsmToolbar({
  mode,
  onModeChange,
  onBack,
  isCompactLayout = false,
  isInspectorOpen = false,
  onToggleInspector,
}: Props) {
  const { fsm, dispatch } = useFsm();
  const { circuit, dispatch: cDispatch } = useCircuitContext();
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(fsm.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const handleSave = () => {
    const json = JSON.stringify(fsm, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fsm.name.replace(/\s+/g, '_') || 'fsm'}.fsm.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

        if (loaded.archType !== 'moore' && loaded.archType !== 'mealy')
          throw new Error(`Ungültiger archType: "${loaded.archType}" (erlaubt: moore, mealy)`);

        if (!Number.isInteger(loaded.inputCount) || loaded.inputCount < 1 || loaded.inputCount > 26)
          throw new Error(`inputCount muss zwischen 1 und 26 liegen (erhalten: ${loaded.inputCount})`);

        if (!Number.isInteger(loaded.outputCount) || loaded.outputCount < 1 || loaded.outputCount > 30)
          throw new Error(`outputCount muss zwischen 1 und 30 liegen (erhalten: ${loaded.outputCount})`);

        if (!Array.isArray(loaded.inputNames) || loaded.inputNames.length !== loaded.inputCount)
          throw new Error(`inputNames muss ein Array der Länge ${loaded.inputCount} sein`);

        if (!Array.isArray(loaded.outputNames) || loaded.outputNames.length !== loaded.outputCount)
          throw new Error(`outputNames muss ein Array der Länge ${loaded.outputCount} sein`);

        const RESERVED = ['AND', 'OR', 'NOT', 'TRUE', 'FALSE'];
        const seenNames = new Set<string>();
        for (const name of loaded.inputNames) {
          const upper = String(name).toUpperCase();
          if (RESERVED.includes(upper))
            throw new Error(`Input-Name "${name}" ist ein reserviertes Schlüsselwort`);
          if (seenNames.has(upper))
            throw new Error(`Doppelter Input-Name: "${name}"`);
          seenNames.add(upper);
        }

        const initials = Object.values(loaded.states).filter(s => s.isInitial);
        if (initials.length === 0)
          throw new Error('FSM hat keinen Startzustand (isInitial)');
        if (initials.length > 1)
          throw new Error(`FSM hat ${initials.length} Startzustände – es darf nur einen geben`);

        const stateIds = new Set(Object.keys(loaded.states));
        const maxOutput = (1 << loaded.outputCount) - 1;

        for (const s of Object.values(loaded.states)) {
          if (s.output < 0 || s.output > maxOutput)
            throw new Error(`Zustand "${s.label}": Output ${s.output} außerhalb des Bereichs 0–${maxOutput}`);
          s.output = s.output & maxOutput;
        }

        for (const t of loaded.transitions) {
          if (!stateIds.has(t.fromId))
            throw new Error(`Übergang "${t.conditionText}": fromId "${t.fromId}" referenziert keinen existierenden Zustand`);
          if (!stateIds.has(t.toId))
            throw new Error(`Übergang "${t.conditionText}": toId "${t.toId}" referenziert keinen existierenden Zustand`);
          if (t.mealyOutput != null) t.mealyOutput = t.mealyOutput & maxOutput;
        }

        dispatch({ type: 'LOAD_FSM', payload: loaded });
      } catch (err) {
        alert('Fehler beim Laden: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
      const { gates: newGates, wires: newWires, warnings } = synthesizeFsm(fsm, circuit);
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
      if (warnings.length > 0) alert('Synthese-Warnungen:\n' + warnings.join('\n'));
    } catch (e) {
      alert('Synthese fehlgeschlagen: ' + (e as Error).message);
    }
  };

  useEffect(() => {
    if (!isCompactLayout) {
      setMenuOpen(false);
      return undefined;
    }

    if (!menuOpen) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCompactLayout, menuOpen]);

  const runCompactAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  if (isCompactLayout) {
    return (
      <header style={{
        background: '#0c1526',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 12px',
        flexShrink: 0,
        position: 'relative',
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.fsm.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button type="button" style={compactButton()} onClick={onBack}>← Zurück</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editing ? (
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onBlur={() => { dispatch({ type:'RENAME', payload:{ name:nameVal||'Neue FSM' } }); setEditing(false); }}
                onKeyDown={e => e.key==='Enter' && (e.currentTarget as HTMLInputElement).blur()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #3b82f6',
                  color: '#e2e8f0',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  outline: 'none',
                  width: '100%',
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setNameVal(fsm.name); setEditing(true); }}
                style={{
                  width: '100%',
                  padding: 0,
                  margin: 0,
                  background: 'transparent',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'text',
                }}
                title="FSM umbenennen"
              >
                FSM: {fsm.name}
              </button>
            )}
            <div style={{ color: '#475569', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
              {mode === 'select' ? 'Modus: Auswahl' : 'Modus: Verbinden'} · {fsm.archType}
            </div>
          </div>
          <button
            type="button"
            style={compactButton(isInspectorOpen)}
            onClick={onToggleInspector}
          >
            Panel
          </button>
          <div style={{ position: 'relative' }}>
            <button
              ref={menuButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={compactButton(menuOpen)}
              onClick={() => setMenuOpen((current) => !current)}
            >
              Menü
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 'min(280px, calc(100vw - 24px))',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  boxShadow: '0 16px 40px rgba(2, 6, 23, 0.45)',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  zIndex: 40,
                }}
              >
                <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', padding: '0 4px' }}>
                  Datei
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button type="button" role="menuitem" style={compactButton(false, true)} onClick={() => runCompactAction(handleNeu)}>
                    Neu
                  </button>
                  <button type="button" role="menuitem" style={compactButton()} onClick={() => runCompactAction(handleSave)}>
                    Speichern
                  </button>
                  <button type="button" role="menuitem" style={compactButton()} onClick={() => runCompactAction(handleLoadClick)}>
                    Laden
                  </button>
                  <button type="button" role="menuitem" style={compactButton()} onClick={() => runCompactAction(() => dispatch({ type:'ADD_STATE' }))}>
                    + Zustand
                  </button>
                </div>

                <div style={dividerStyle(false)} />

                <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', padding: '0 4px' }}>
                  Werkzeug
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button type="button" role="menuitem" style={compactButton(mode === 'select')} onClick={() => runCompactAction(() => onModeChange('select'))}>
                    Auswahl
                  </button>
                  <button type="button" role="menuitem" style={compactButton(mode === 'connect')} onClick={() => runCompactAction(() => onModeChange('connect'))}>
                    Verbinden
                  </button>
                  <button type="button" role="menuitem" style={compactButton(fsm.archType === 'moore')} onClick={() => runCompactAction(() => dispatch({ type:'SET_ARCH', payload:{ archType:'moore' } }))}>
                    Moore
                  </button>
                  <button type="button" role="menuitem" style={compactButton(fsm.archType === 'mealy')} onClick={() => runCompactAction(() => dispatch({ type:'SET_ARCH', payload:{ archType:'mealy' } }))}>
                    Mealy
                  </button>
                </div>

                <div style={dividerStyle(false)} />

                <button
                  type="button"
                  role="menuitem"
                  style={{
                    ...compactButton(),
                    width: '100%',
                    background: '#14532d',
                    color: '#86efac',
                    border: '1px solid #16a34a',
                  }}
                  onClick={() => runCompactAction(handleSynthesize)}
                >
                  Synthetisieren
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header style={{
      height: 44, background: '#0c1526', borderBottom: '1px solid #1e293b',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, flexShrink: 0,
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.fsm.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <button style={tb()} onClick={onBack}>← Schaltung</button>
      <div style={dividerStyle()} />
      <button style={tb(false, true)} onClick={handleNeu} title="Neue leere FSM erstellen">Neu</button>

      <button style={{ ...tb(), background:'#1e3a5f', color:'#93c5fd', border:'1px solid #3b82f6' }}
        onClick={handleSave} title="FSM als JSON-Datei herunterladen">
        💾 Speichern
      </button>
      <button style={{ ...tb(), background:'#1e3a5f', color:'#93c5fd', border:'1px solid #3b82f6' }}
        onClick={handleLoadClick} title="FSM aus JSON-Datei laden">
        📂 Laden
      </button>

      <div style={dividerStyle()} />

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

      <div style={dividerStyle()} />

      <button style={tb(mode==='select')} onClick={() => onModeChange('select')}>↖ Auswahl</button>
      <button style={tb(mode==='connect')} onClick={() => onModeChange('connect')}>→ Verbinden</button>

      <div style={dividerStyle()} />

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

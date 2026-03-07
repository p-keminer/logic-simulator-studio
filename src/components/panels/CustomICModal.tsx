import { useState, useEffect } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../../gates/shapes/FlipFlopShape';
import { runSimulation } from '../../core/simulation/engine';
import type { Circuit, SignalValue } from '../../core/types';

interface Props { onClose: () => void; }

const STORAGE_KEY = 'lgsim_custom_ics';

function loadCustomICs(): Array<{ name: string; circuit: Circuit; portNames?: string[] }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveCustomICs(ics: Array<{ name: string; circuit: Circuit; portNames?: string[] }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ics));
}

/**
 * Build a copy of the subcircuit with input values and persisted inner gate
 * states applied.  Used by both evaluate() and stateUpdate() of custom ICs.
 */
function buildSubcircuitCopy(
  subcircuit: Circuit,
  inputGates: { id: string }[],
  inputs: Record<string, SignalValue>,
  innerStates: Record<string, Record<string, unknown>>,
): Circuit {
  return {
    ...subcircuit,
    gates: Object.fromEntries(
      Object.entries(subcircuit.gates).map(([id, g]) => {
        const idx = inputGates.findIndex((ig) => ig.id === id);
        if (idx >= 0) {
          // Input gate: inject the current external input value
          const val = (inputs['i' + idx] ?? 0) as 0 | 1;
          return [id, { ...g, customState: { ...g.customState, value: val } }];
        }
        if (innerStates[id]) {
          // Stateful inner gate: restore persisted state from previous cycle
          return [id, { ...g, customState: { ...innerStates[id] } }];
        }
        return [id, g];
      }),
    ),
  };
}

/** Register a saved custom IC into the gate registry */
// eslint-disable-next-line react-refresh/only-export-components
export function registerCustomIC(name: string, subcircuit: Circuit, portNames?: string[]) {
  const typeId = 'CIC_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  if (gateRegistry.has(typeId)) return; // already registered

  const inputGates  = Object.values(subcircuit.gates).filter((g) => g.typeId === 'INPUT_SWITCH');
  const outputGates = Object.values(subcircuit.gates).filter((g) => g.typeId === 'OUTPUT_LED');
  const nIn  = inputGates.length;
  const nOut = outputGates.length;
  const H = Math.max(60, Math.max(nIn, nOut) * 20 + 20);

  // portNames order: inputs first, then outputs
  const getInputLabel  = (g: typeof inputGates[0], i: number) =>
    portNames?.[i] ?? g.label ?? ('I' + i);
  const getOutputLabel = (g: typeof outputGates[0], i: number) =>
    portNames?.[nIn + i] ?? g.label ?? ('O' + i);

  gateRegistry.register({
    typeId,
    label: name,
    category: 'custom',
    width: 100,
    height: H,
    inputs:  inputGates.map((g, i) => ({ id: 'i' + i, label: getInputLabel(g, i), relativeX: 0, relativeY: (i + 0.5) / Math.max(nIn, 1) })),
    outputs: outputGates.map((g, i) => ({ id: 'o' + i, label: getOutputLabel(g, i), relativeX: 1, relativeY: (i + 0.5) / Math.max(nOut, 1) })),
    evaluate: (inputs, customState) => {
      // Restore persisted inner gate states (empty on first evaluation)
      const innerStates = (customState?.innerStates as Record<string, Record<string, unknown>>) ?? {};
      const copy = buildSubcircuitCopy(subcircuit, inputGates, inputs, innerStates);
      const result = runSimulation(copy);
      const out: Record<string, 0|1> = {};
      outputGates.forEach((led, i) => {
        const wire = Object.values(copy.wires).find((w) => w.to.gateId === led.id && w.to.portId === 'in');
        if (!wire) { out['o' + i] = 0; return; }
        out['o' + i] = (result.gateSignals[wire.from.gateId]?.[wire.from.portId]?.value ?? 0) as 0|1;
      });
      return out;
    },
    stateUpdate: (inputs, _outputs, customState) => {
      // Restore persisted inner gate states (empty on first evaluation)
      const innerStates = (customState?.innerStates as Record<string, Record<string, unknown>>) ?? {};
      const copy = buildSubcircuitCopy(subcircuit, inputGates, inputs, innerStates);
      const result = runSimulation(copy);
      // Merge: keep states from previous cycle, overwrite with any updates
      const mergedStates: Record<string, Record<string, unknown>> = { ...innerStates };
      for (const [gateId, stateUpd] of Object.entries(result.customStateUpdates ?? {})) {
        mergedStates[gateId] = stateUpd;
      }
      return { ...customState, innerStates: mergedStates };
    },
    shapeComponent: FlipFlopShape,
    description: 'Benutzerdefiniertes IC: ' + name,
  });
}

/** Call on app start to reload all saved custom ICs */
// eslint-disable-next-line react-refresh/only-export-components
export function reloadAllCustomICs() {
  for (const ic of loadCustomICs()) {
    registerCustomIC(ic.name, ic.circuit, ic.portNames);
  }
}

export function CustomICModal({ onClose }: Props) {
  const { circuit, dispatch } = useCircuitContext();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const [savedICs, setSavedICs] = useState(() => loadCustomICs());
  const [newName, setNewName] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [portNames, setPortNames] = useState<string[]>([]);

  const inputs  = Object.values(circuit.gates).filter((g) => g.typeId === 'INPUT_SWITCH');
  const outputs = Object.values(circuit.gates).filter((g) => g.typeId === 'OUTPUT_LED');

  const handleNext = () => {
    const name = newName.trim();
    if (!name) return;
    if (inputs.length === 0 || outputs.length === 0) {
      alert('Die aktuelle Schaltung braucht mind. einen Schalter und eine LED.');
      return;
    }
    const hasCICGates = Object.values(circuit.gates).some(g => g.typeId.startsWith('CIC_'));
    if (hasCICGates) {
      alert('Die Schaltung enthält ein Custom IC. Verschachtelte Custom ICs werden nicht unterstützt (Rekursionsgefahr).');
      return;
    }
    // Pre-fill port names from existing labels
    const initialNames = [
      ...inputs.map((g, i) => g.label || 'I' + i),
      ...outputs.map((g, i) => g.label || 'O' + i),
    ];
    setPortNames(initialNames);
    setStep(2);
  };

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;

    // Re-register with custom port names (unregister first if already exists)
    const typeId = 'CIC_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (gateRegistry.has(typeId)) gateRegistry.unregister(typeId);

    const updated = [...savedICs.filter((ic) => ic.name !== name), { name, circuit, portNames }];
    saveCustomICs(updated);
    setSavedICs(updated);
    registerCustomIC(name, circuit, portNames);
    setNewName('');
    setStep(1);
    alert('IC "' + name + '" gespeichert! Es erscheint in der Palette unter "Benutzerdefiniert".');
  };

  const handleDelete = (name: string) => {
    const typeId = 'CIC_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const instances = Object.values(circuit.gates).filter((g) => g.typeId === typeId);

    if (instances.length > 0) {
      const ok = window.confirm(
        `"${name}" wird auf ${instances.length} Instanz(en) auf der Leinwand verwendet.\n` +
        'Alle Instanzen werden ebenfalls gelöscht. Fortfahren?'
      );
      if (!ok) return;
      for (const g of instances) {
        dispatch({ type: 'GATE_DELETE', payload: { gateId: g.id } });
      }
    }

    gateRegistry.unregister(typeId);
    const updated = savedICs.filter((ic) => ic.name !== name);
    saveCustomICs(updated);
    setSavedICs(updated);
  };

  const inputStyle = {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
    padding: '5px 8px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}
      onClick={onClose}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:24, width:420, maxHeight:'80vh', overflow:'auto' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ margin:0, color:'#e2e8f0', fontSize:16, fontFamily:'monospace' }}>
            Custom IC{step === 2 ? ' — Port-Namen' : ''}
          </h2>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18 }}>×</button>
        </div>

        {step === 1 && (
          <>
            <p style={{ color:'#64748b', fontSize:11, fontFamily:'monospace', margin:'0 0 16px' }}>
              Aktuelle Schaltung als wiederverwendbares IC speichern. Schalter → Eingänge, LEDs → Ausgänge.
            </p>
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="IC-Name..." onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                style={{ flex:1, background:'#0f172a', border:'1px solid #334155', borderRadius:6, padding:'6px 10px', color:'#e2e8f0', fontFamily:'monospace', fontSize:12 }} />
              <button onClick={handleNext}
                style={{ background:'#1d4ed8', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontFamily:'monospace', fontSize:12 }}>
                Weiter →
              </button>
            </div>

            {/* Saved ICs list */}
            {savedICs.length === 0 ? (
              <p style={{ color:'#475569', fontSize:11, fontFamily:'monospace' }}>Noch keine Custom ICs gespeichert.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {savedICs.map((ic) => (
                  <div key={ic.name} style={{ display:'flex', alignItems:'center', background:'#0f172a', borderRadius:6, padding:'6px 10px', border:'1px solid #1e293b' }}>
                    <span style={{ color:'#94a3b8', fontFamily:'monospace', fontSize:12, flex:1 }}>{ic.name}</span>
                    <span style={{ color:'#475569', fontSize:10, fontFamily:'monospace', marginRight:10 }}>
                      {Object.values(ic.circuit.gates).filter((g) => g.typeId==='INPUT_SWITCH').length}→
                      {Object.values(ic.circuit.gates).filter((g) => g.typeId==='OUTPUT_LED').length}
                    </span>
                    <button onClick={() => handleDelete(ic.name)}
                      style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:12 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ color:'#64748b', fontSize:11, fontFamily:'monospace', margin:'0 0 12px' }}>
              Namen der Ein- und Ausgänge festlegen. Diese erscheinen als Port-Beschriftungen im platzierten IC.
            </p>

            {inputs.length > 0 && (
              <>
                <p style={{ color:'#94a3b8', fontSize:11, fontFamily:'monospace', margin:'0 0 6px' }}>Eingänge</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                  {inputs.map((_, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:'#475569', fontFamily:'monospace', fontSize:11, minWidth:24 }}>I{i}</span>
                      <input
                        value={portNames[i] ?? ''}
                        onChange={(e) => {
                          const next = [...portNames];
                          next[i] = e.target.value;
                          setPortNames(next);
                        }}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {outputs.length > 0 && (
              <>
                <p style={{ color:'#94a3b8', fontSize:11, fontFamily:'monospace', margin:'0 0 6px' }}>Ausgänge</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
                  {outputs.map((_, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:'#475569', fontFamily:'monospace', fontSize:11, minWidth:24 }}>O{i}</span>
                      <input
                        value={portNames[inputs.length + i] ?? ''}
                        onChange={(e) => {
                          const next = [...portNames];
                          next[inputs.length + i] = e.target.value;
                          setPortNames(next);
                        }}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setStep(1)}
                style={{ background:'#334155', color:'#e2e8f0', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontFamily:'monospace', fontSize:12 }}>
                ← Zurück
              </button>
              <button onClick={handleSave}
                style={{ background:'#1d4ed8', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontFamily:'monospace', fontSize:12 }}>
                IC erstellen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { FlipFlopShape } from '../../gates/shapes/FlipFlopShape';
import { runSimulation } from '../../core/simulation/engine';
import type { Circuit } from '../../core/types';

interface Props { onClose: () => void; }

const STORAGE_KEY = 'lgsim_custom_ics';

function loadCustomICs(): Array<{ name: string; circuit: Circuit }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveCustomICs(ics: Array<{ name: string; circuit: Circuit }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ics));
}

/** Register a saved custom IC into the gate registry */
export function registerCustomIC(name: string, subcircuit: Circuit) {
  const typeId = 'CIC_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  if (gateRegistry.has(typeId)) return; // already registered

  const inputGates  = Object.values(subcircuit.gates).filter((g) => g.typeId === 'INPUT_SWITCH');
  const outputGates = Object.values(subcircuit.gates).filter((g) => g.typeId === 'OUTPUT_LED');
  const nIn  = inputGates.length;
  const nOut = outputGates.length;
  const H = Math.max(60, Math.max(nIn, nOut) * 20 + 20);

  gateRegistry.register({
    typeId,
    label: name,
    category: 'custom',
    width: 100,
    height: H,
    inputs:  inputGates.map((g, i) => ({ id: 'i' + i, label: g.label || 'I' + i, relativeX: 0, relativeY: (i + 0.5) / Math.max(nIn, 1) })),
    outputs: outputGates.map((g, i) => ({ id: 'o' + i, label: g.label || 'O' + i, relativeX: 1, relativeY: (i + 0.5) / Math.max(nOut, 1) })),
    evaluate: (inputs) => {
      // Build a copy of the subcircuit with inputs set
      const copy: Circuit = {
        ...subcircuit,
        gates: Object.fromEntries(
          Object.entries(subcircuit.gates).map(([id, g]) => {
            const idx = inputGates.findIndex((ig) => ig.id === id);
            if (idx < 0) return [id, g];
            const val = (inputs['i' + idx] ?? 0) as 0|1;
            return [id, { ...g, customState: { ...g.customState, value: val } }];
          })
        ),
      };
      const result = runSimulation(copy);
      const out: Record<string, 0|1> = {};
      outputGates.forEach((led, i) => {
        const wire = Object.values(copy.wires).find((w) => w.to.gateId === led.id && w.to.portId === 'in');
        if (!wire) { out['o' + i] = 0; return; }
        out['o' + i] = (result.gateSignals[wire.from.gateId]?.[wire.from.portId]?.value ?? 0) as 0|1;
      });
      return out;
    },
    shapeComponent: FlipFlopShape,
    description: 'Benutzerdefiniertes IC: ' + name,
  });
}

/** Call on app start to reload all saved custom ICs */
export function reloadAllCustomICs() {
  for (const ic of loadCustomICs()) {
    registerCustomIC(ic.name, ic.circuit);
  }
}

export function CustomICModal({ onClose }: Props) {
  const { circuit } = useCircuitContext();
  const [savedICs, setSavedICs] = useState(() => loadCustomICs());
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;
    const inputs  = Object.values(circuit.gates).filter((g) => g.typeId === 'INPUT_SWITCH');
    const outputs = Object.values(circuit.gates).filter((g) => g.typeId === 'OUTPUT_LED');
    if (inputs.length === 0 || outputs.length === 0) {
      alert('Die aktuelle Schaltung braucht mind. einen Schalter und eine LED.');
      return;
    }
    const updated = [...savedICs.filter((ic) => ic.name !== name), { name, circuit }];
    saveCustomICs(updated);
    setSavedICs(updated);
    registerCustomIC(name, circuit);
    setNewName('');
    alert('IC "' + name + '" gespeichert! Es erscheint in der Palette unter "Benutzerdefiniert".');
  };

  const handleDelete = (name: string) => {
    const updated = savedICs.filter((ic) => ic.name !== name);
    saveCustomICs(updated);
    setSavedICs(updated);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}
      onClick={onClose}>
      <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:12, padding:24, width:420, maxHeight:'80vh', overflow:'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ margin:0, color:'#e2e8f0', fontSize:16, fontFamily:'monospace' }}>Custom IC</h2>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18 }}>×</button>
        </div>
        <p style={{ color:'#64748b', fontSize:11, fontFamily:'monospace', margin:'0 0 16px' }}>
          Aktuelle Schaltung als wiederverwendbares IC speichern. Schalter → Eingänge, LEDs → Ausgänge.
        </p>
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="IC-Name..." onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            style={{ flex:1, background:'#0f172a', border:'1px solid #334155', borderRadius:6, padding:'6px 10px', color:'#e2e8f0', fontFamily:'monospace', fontSize:12 }} />
          <button onClick={handleSave}
            style={{ background:'#1d4ed8', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontFamily:'monospace', fontSize:12 }}>
            Speichern
          </button>
        </div>
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
      </div>
    </div>
  );
}
import { useState } from 'react';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { GatePaletteItem } from './GatePaletteItem';

const CATEGORY_LABELS: Record<string, string> = {
  logic_basic:     'Grundgatter',
  logic_multi:     'Mehrfacheingänge',
  logic_special:   'Spezielle Treiber',
  logic_comp_out:  'Komplementärausgänge',
  mux:             'Multiplexer / Demultiplexer',
  bus:             'Bus & Splitter',
  arith:           'Vergleicher & Arithmetik',
  flipflop:        'Latches & Flip-Flops',
  register:        'Register',
  memory:          'Speicher (RAM / ROM)',
  input:           'Eingabe',
  output:          'Ausgabe',
  annotation:      'Anmerkungen',
  ic74:            '74xx ICs',
  custom:          'Benutzerdefiniert',
};

const ALL_CATEGORIES = [
  'logic_basic',
  'logic_multi',
  'logic_special',
  'logic_comp_out',
  'mux',
  'bus',
  'arith',
  'flipflop',
  'register',
  'memory',
  'input',
  'output',
  'annotation',
  'ic74',
  'custom',
] as const;

export function GatePalette() {
  const allGates = gateRegistry.getAll();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['ic74']));

  const toggle = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bauteile</h2>
        <p className="text-xs text-slate-600 mt-0.5">Ziehen zum Platzieren</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {ALL_CATEGORIES.map((cat) => {
          const gates = allGates.filter((g) => g.category === cat);
          if (gates.length === 0) return null;
          const isCollapsed = collapsed.has(cat);
          return (
            <div key={cat}>
              <button
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 px-1 hover:text-slate-300 transition-colors"
                onClick={() => toggle(cat)}
              >
                <span>{CATEGORY_LABELS[cat]}</span>
                <span style={{ fontSize: 9 }}>{isCollapsed ? '▶' : '▼'}</span>
              </button>
              {!isCollapsed && (
                <div className="space-y-1">
                  {gates.map((def) => <GatePaletteItem key={def.typeId} definition={def} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-slate-800 text-xs text-slate-600 space-y-0.5">
        <p>• Doppelklick: Umschalten / Umbenennen</p>
        <p>• R: Gatter drehen</p>
        <p>• Klick auf Port: Draht</p>
        <p>• Klick auf Canvas: Wegpunkt</p>
        <p>• Rechtsklick Draht: Farbe</p>
        <p>• Strg+Klick Draht: Löschen</p>
        <p>• Alt+Ziehen: Verschieben</p>
        <p>• Entf: Auswahl löschen</p>
      </div>
    </aside>
  );
}

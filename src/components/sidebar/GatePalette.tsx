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

interface Props {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function GatePalette({ isCollapsed = false, onToggleCollapse }: Props) {
  const allGates = gateRegistry.getAll();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set(['ic74']));
  const [search, setSearch] = useState('');

  const toggle = (cat: string) =>
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });

  const q = search.toLowerCase();
  const filteredGates = q
    ? allGates.filter(
        (g) =>
          g.label.toLowerCase().includes(q) ||
          g.typeId.toLowerCase().includes(q) ||
          (g.description?.toLowerCase().includes(q) ?? false)
      )
    : null;

  if (isCollapsed) {
    return (
      <aside className="w-12 bg-slate-900 border-r border-slate-700 flex flex-col items-center shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Bauteile & Hinweise ausklappen"
          className="mt-3 h-8 w-8 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-mono text-sm"
        >
          ▶
        </button>
        <div
          className="mt-6 text-[10px] font-semibold text-slate-500 uppercase tracking-[0.25em]"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Bauteile
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-700 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bauteile</h2>
          <p className="text-xs text-slate-600 mt-0.5">Ziehen zum Platzieren</p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Bauteile & Hinweise einklappen"
          className="h-7 w-7 rounded border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-mono text-xs shrink-0"
        >
          ◀
        </button>
      </div>

      <div className="px-2 pt-2">
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1e293b', border: '1px solid #334155', borderRadius: 5,
              color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace',
              padding: '4px 24px 4px 8px', outline: 'none',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                fontSize: 13, lineHeight: 1, padding: 0,
              }}
            >×</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredGates ? (
          filteredGates.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace', padding: '4px 4px' }}>Keine Treffer</p>
          ) : (
            <div className="space-y-1">
              {filteredGates.map((def) => <GatePaletteItem key={def.typeId} definition={def} />)}
            </div>
          )
        ) : (
          ALL_CATEGORIES.map((cat) => {
            const gates = allGates.filter((g) => g.category === cat);
            if (gates.length === 0) return null;
            const isCategoryCollapsed = collapsedCategories.has(cat);
            return (
              <div key={cat}>
                <button
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 px-1 hover:text-slate-300 transition-colors"
                  onClick={() => toggle(cat)}
                >
                  <span>{CATEGORY_LABELS[cat]}</span>
                  <span style={{ fontSize: 9 }}>{isCategoryCollapsed ? '▶' : '▼'}</span>
                </button>
                {!isCategoryCollapsed && (
                  <div className="space-y-1">
                    {gates.map((def) => <GatePaletteItem key={def.typeId} definition={def} />)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-2 border-t border-slate-800 text-xs text-slate-600 space-y-0.5">
        <p>• Doppelklick: Umschalten / Umbenennen</p>
        <p>• R: Gatter drehen</p>
        <p>• Strg+C/V: Kopieren / Einfügen</p>
        <p>• Lasso → Pfeiltasten: Gatter verschieben</p>
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

import { useState } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { downloadCircuit } from '../../core/io/serializer';
import { loadCircuitFromFile } from '../../core/io/deserializer';
import { ExportModal } from './ExportModal';
import { HelpModal } from './HelpModal';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { TruthTableModal } from '../panels/TruthTableModal';
import { CustomICModal } from '../panels/CustomICModal';
import { RacePanel } from '../panels/RacePanel';

interface Props {
  showTiming: boolean;
  onToggleTiming: () => void;
  onShowFsm?: () => void;
}

export function Toolbar({ showTiming, onToggleTiming, onShowFsm }: Props) {
  const {
    circuit, dispatch,
    isClockPaused, setIsClockPaused, stepOneClock,
    races,
  } = useCircuitContext();
  const [error, setError] = useState<string | null>(null);
  const [circuitName, setCircuitName] = useState(circuit.name);
  const [showExport, setShowExport] = useState(false);
  const [showTruth, setShowTruth] = useState(false);
  const [showCustomIC, setShowCustomIC] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRacePanel, setShowRacePanel] = useState(false);

  const handleSave = () => downloadCircuit(circuit);

  const handleLoad = async () => {
    try {
      const loaded = await loadCircuitFromFile();
      dispatch({ type: 'CIRCUIT_LOAD', payload: { circuit: loaded } });
      setCircuitName(loaded.name);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleReset = () => {
    const hasContent = gateCount > 0 || wireCount > 0;
    if (hasContent) {
      const msg =
        'Die aktuelle Schaltung enthält ' + gateCount + ' Bausteine und ' + wireCount + ' Verbindungen.\n\n' +
        'Nicht gespeicherte Änderungen gehen verloren!\n\nFortfahren und Schaltung löschen?';
      if (!confirm(msg)) return;
    }
    dispatch({ type: 'CIRCUIT_RESET' });
    setCircuitName('Unbenannte Schaltung');
  };

  const gateCount = Object.keys(circuit.gates).length;
  const wireCount = Object.keys(circuit.wires).length;

  // Critical path: show max propagation delay across all placed gates
  const maxDelay = Object.values(circuit.gates).reduce((acc, gate) => {
    try { return Math.max(acc, gateRegistry.get(gate.typeId).propagationDelay ?? 0); }
    catch { return acc; }
  }, 0);

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3 shrink-0">
      <div className="flex items-center gap-2 mr-1">
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-green-500">
          <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="0" y1="7" x2="4" y2="7" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="0" y1="13" x2="4" y2="13" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="16" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="10" cy="10" r="2" fill="currentColor"/>
        </svg>
        <span className="text-sm font-bold text-slate-200 font-mono">LogicSim</span>
      </div>

      <input
        type="text" value={circuitName}
        onChange={(e) => setCircuitName(e.target.value)}
        onBlur={() => dispatch({ type: 'CIRCUIT_LOAD', payload: { circuit: { ...circuit, name: circuitName } } })}
        className="bg-transparent text-sm text-slate-300 border-b border-transparent hover:border-slate-600 focus:border-green-500 outline-none px-1 py-0.5 w-44 font-mono transition-colors"
      />

      <div className="h-5 w-px bg-slate-700" />

      <span className="text-xs text-slate-500 font-mono hidden md:block">
        {gateCount}G · {wireCount}W{maxDelay > 0 && <span className="text-amber-600 ml-2" title="Max. Laufzeit">{maxDelay}ns</span>}

      </span>

      <div className="flex-1" />

      {error && <span className="text-xs text-red-400 bg-red-950 px-2 py-1 rounded">{error}</span>}

      <div className="flex items-center gap-1.5">
        <button onClick={handleLoad} className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono">Laden</button>
        <button onClick={handleSave} className="px-2.5 py-1 text-xs font-medium text-slate-900 bg-green-500 hover:bg-green-400 rounded transition-colors font-mono">Speichern</button>
        <div className="h-4 w-px bg-slate-700" />
        <button onClick={() => setShowExport(true)} title="Verilog/VHDL exportieren"
          className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono">
          HDL
        </button>
        <button onClick={() => setShowTruth(true)} title="Wahrheitstabelle"
          className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono">
          W-Tabelle
        </button>
        <button onClick={onToggleTiming} title="Zeitdiagramm"
          className={"px-2.5 py-1 text-xs font-medium border rounded transition-colors font-mono " + (showTiming ? "text-blue-300 bg-blue-900/40 border-blue-700" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600")}>
          Timing
        </button>
        <button onClick={() => setShowCustomIC(true)} title="Custom IC erstellen"
          className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono">
          IC
        </button>
        {races.length > 0 && (
          <button
            onClick={() => setShowRacePanel(true)}
            title={`Race-Historie: ${races.length} Einträge — Klick für Details`}
            className="px-2.5 py-1 text-xs font-medium text-red-300 bg-red-900/40 border border-red-700 rounded transition-colors font-mono animate-pulse"
          >
            ⚠ {races.length}
          </button>
        )}
        <div className="h-4 w-px bg-slate-700" />
        <button
          onClick={() => setIsClockPaused(!isClockPaused)}
          title={isClockPaused ? 'Simulation fortsetzen' : 'Simulation pausieren'}
          className={"px-2.5 py-1 text-xs font-medium border rounded transition-colors font-mono " + (isClockPaused ? "text-amber-300 bg-amber-900/40 border-amber-700" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600")}>
          {isClockPaused ? '▶' : '⏸'}
        </button>
        <button
          onClick={stepOneClock}
          disabled={!isClockPaused}
          title="Einen Takt weiterschalten"
          className={"px-2.5 py-1 text-xs font-medium border rounded transition-colors font-mono " + (!isClockPaused ? "text-slate-600 bg-slate-800 border-slate-700 cursor-not-allowed" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600 cursor-pointer")}>
          ⏭
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <button onClick={handleReset} className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors font-mono">Neu</button>
        <div className="h-4 w-px bg-slate-700" />
        <button onClick={onShowFsm} title="FSM-Editor öffnen"
          className="px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-700 rounded transition-colors font-mono">
          FSM
        </button>
        <button onClick={() => setShowHelp(true)} title="Hilfe & Tastenkürzel"
          className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono">
          ?
        </button>
      </div>

      {showExport    && <ExportModal onClose={() => setShowExport(false)} />}
      {showTruth     && <TruthTableModal onClose={() => setShowTruth(false)} />}
      {showCustomIC  && <CustomICModal onClose={() => setShowCustomIC(false)} />}
      {showHelp      && <HelpModal onClose={() => setShowHelp(false)} />}
      {showRacePanel && <RacePanel onClose={() => setShowRacePanel(false)} />}
    </header>
  );
}
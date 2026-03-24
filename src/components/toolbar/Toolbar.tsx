import { useCallback, useEffect, useRef, useState } from 'react';
import { useCircuitContext } from '../../store/CircuitContext';
import { downloadCircuit } from '../../core/io/serializer';
import { loadCircuitFromFile } from '../../core/io/deserializer';
import { ExportModal } from './ExportModal';
import { HelpModal } from './HelpModal';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { TruthTableModal } from '../panels/TruthTableModal';
import { useBackendBroker } from '../../hooks/useBackendBroker';
import { CustomICModal } from '../panels/CustomICModal';
import { RacePanel } from '../panels/RacePanel';
import { APP_NAME } from '../../core/branding';

interface Props {
  showTiming: boolean;
  onToggleTiming: () => void;
  onShowBroker?: () => void;
  onShowFsm?: () => void;
}

export function Toolbar({ showTiming, onToggleTiming, onShowBroker, onShowFsm }: Props) {
  const {
    circuit, dispatch,
    isClockPaused, setIsClockPaused, stepOneClock,
    races,
    undo, redo, canUndo, canRedo,
  } = useCircuitContext();
  const { hasActiveSession, phase: brokerPhase } = useBackendBroker();
  const headerRef = useRef<HTMLElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const overflowMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstOverflowItemRef = useRef<HTMLButtonElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [circuitName, setCircuitName] = useState(circuit.name);
  const [showExport, setShowExport] = useState(false);
  const [showTruth, setShowTruth] = useState(false);
  const [showCustomIC, setShowCustomIC] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRacePanel, setShowRacePanel] = useState(false);
  const [isCompactToolbar, setIsCompactToolbar] = useState(false);
  const [isTitleCondensed, setIsTitleCondensed] = useState(false);
  const [isUltraCompactToolbar, setIsUltraCompactToolbar] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);

  const handleSave = () => downloadCircuit(circuit);
  const closeOverflowMenu = useCallback((restoreFocus = false) => {
    setIsOverflowMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => overflowMenuButtonRef.current?.focus());
    }
  }, []);

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

  useEffect(() => {
    if (!headerRef.current || typeof ResizeObserver === 'undefined') return;

    const updateResponsiveMode = () => {
      const width = headerRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      const nextCompact = width < 1220;
      const nextCondensedTitle = width < 1480;
      const nextUltraCompact = width < 760;
      setIsCompactToolbar(nextCompact);
      setIsTitleCondensed(nextCondensedTitle);
      setIsUltraCompactToolbar(nextUltraCompact);
      if (!nextCompact) setIsOverflowMenuOpen(false);
    };

    updateResponsiveMode();
    const observer = new ResizeObserver(() => updateResponsiveMode());
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOverflowMenuOpen) return;

    window.requestAnimationFrame(() => firstOverflowItemRef.current?.focus());

    const handlePointerDown = (event: MouseEvent) => {
      if (!overflowMenuRef.current?.contains(event.target as Node)) {
        closeOverflowMenu();
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (!overflowMenuRef.current?.contains(event.target as Node)) {
        closeOverflowMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverflowMenu(true);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOverflowMenu, isOverflowMenuOpen]);

  return (
    <header ref={headerRef} className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3 shrink-0">
      <div className="flex items-center gap-2 mr-1">
        <svg width="20" height="20" viewBox="0 0 20 20" className="text-green-500">
          <rect x="2" y="2" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="0" y1="7" x2="4" y2="7" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="0" y1="13" x2="4" y2="13" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="16" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="10" cy="10" r="2" fill="currentColor"/>
        </svg>
        <span
          className={`font-bold text-slate-200 font-mono tracking-tight whitespace-nowrap leading-none ${
            isTitleCondensed ? 'text-[11px]' : 'text-xs md:text-sm'
          }`}
        >
          {isUltraCompactToolbar ? 'LSS' : APP_NAME}
        </span>
      </div>

      <input
        type="text" value={circuitName}
        onChange={(e) => setCircuitName(e.target.value)}
        onBlur={() => dispatch({ type: 'CIRCUIT_LOAD', payload: { circuit: { ...circuit, name: circuitName } } })}
        className={`bg-transparent text-sm text-slate-300 border-b border-transparent hover:border-slate-600 focus:border-green-500 outline-none px-1 py-0.5 font-mono transition-colors ${
          isUltraCompactToolbar ? 'w-20' : isCompactToolbar ? 'w-28 sm:w-32' : 'w-44'
        }`}
      />

      <div className="h-5 w-px bg-slate-700" />

      <span className="text-xs text-slate-500 font-mono hidden md:block">
        {gateCount}G · {wireCount}W{maxDelay > 0 && <span className="text-amber-600 ml-2" title="Max. Laufzeit">{maxDelay}ns</span>}

      </span>

      <div className="flex-1" />

      {error && <span className="text-xs text-red-400 bg-red-950 px-2 py-1 rounded">{error}</span>}

      {!isCompactToolbar ? (
        <div className="flex items-center gap-1.5">
          <button onClick={handleLoad} className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono">Laden</button>
          <button onClick={handleSave} className="px-2.5 py-1 text-xs font-medium text-slate-900 bg-green-500 hover:bg-green-400 rounded transition-colors font-mono">Speichern</button>
          <button onClick={undo} disabled={!canUndo} title="Rückgängig (Strg+Z)"
            className={"px-2.5 py-1 text-xs font-medium border rounded transition-colors font-mono " + (canUndo ? "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600" : "text-slate-600 bg-slate-800 border-slate-700 cursor-not-allowed")}>
            ↩
          </button>
          <button onClick={redo} disabled={!canRedo} title="Wiederholen (Strg+R)"
            className={"px-2.5 py-1 text-xs font-medium border rounded transition-colors font-mono " + (canRedo ? "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600" : "text-slate-600 bg-slate-800 border-slate-700 cursor-not-allowed")}>
            ↪
          </button>
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
          <button onClick={onShowBroker} title="Broker-Bridge fuer Key, Chat und Reset"
            data-testid="toolbar-broker-button"
            className={"px-2.5 py-1 text-xs font-medium border rounded transition-colors font-mono " + (hasActiveSession ? "text-cyan-200 bg-cyan-900/30 border-cyan-700" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600")}>
            Broker{hasActiveSession ? ' •' : ''}
          </button>
          <button onClick={onShowFsm} title="FSM-Editor öffnen"
            className="px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-700 rounded transition-colors font-mono">
            FSM
          </button>
          <button onClick={() => setShowHelp(true)} title="Hilfe & Tastenkürzel"
            className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono">
            ?
          </button>
        </div>
      ) : (
        <div ref={overflowMenuRef} className="relative">
          <button
            ref={overflowMenuButtonRef}
            type="button"
            data-testid="toolbar-overflow-button"
            onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isOverflowMenuOpen}
            aria-controls="toolbar-overflow-menu"
            className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded transition-colors font-mono"
          >
            Menü ▾
          </button>
          {isOverflowMenuOpen && (
            <div
              id="toolbar-overflow-menu"
              role="menu"
              aria-label="Toolbar Aktionen"
              className="absolute right-0 top-[calc(100%+8px)] z-20 rounded-lg border border-slate-700 bg-slate-900/95 p-2 shadow-2xl backdrop-blur"
              style={{
                width: 'min(20rem, calc(100vw - 24px))',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'min(70vh, 26rem)',
                overflowY: 'auto',
              }}
            >
              <div className="grid gap-1">
                <button ref={firstOverflowItemRef} role="menuitem" onClick={async () => { closeOverflowMenu(); await handleLoad(); }} className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-700 font-mono">Laden</button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); handleSave(); }} className="rounded bg-green-500 px-3 py-2 text-left text-xs font-medium text-slate-900 hover:bg-green-400 font-mono">Speichern</button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); undo(); }} disabled={!canUndo} title="Rückgängig (Strg+Z)"
                  className={"rounded border px-3 py-2 text-left text-xs font-medium font-mono transition-colors " + (canUndo ? "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600" : "text-slate-600 bg-slate-800 border-slate-700 cursor-not-allowed")}>
                  ↩ Rückgängig
                </button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); redo(); }} disabled={!canRedo} title="Wiederholen (Strg+R)"
                  className={"rounded border px-3 py-2 text-left text-xs font-medium font-mono transition-colors " + (canRedo ? "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600" : "text-slate-600 bg-slate-800 border-slate-700 cursor-not-allowed")}>
                  ↪ Wiederholen
                </button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); setShowExport(true); }} className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-700 font-mono">HDL</button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); setShowTruth(true); }} className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-700 font-mono">W-Tabelle</button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); onToggleTiming(); }} className={"rounded border px-3 py-2 text-left text-xs font-medium font-mono transition-colors " + (showTiming ? "text-blue-300 bg-blue-900/40 border-blue-700" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600")}>Timing</button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); setShowCustomIC(true); }} className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-700 font-mono">IC</button>
                {races.length > 0 && (
                  <button role="menuitem" onClick={() => { closeOverflowMenu(); setShowRacePanel(true); }} className="rounded border border-red-700 bg-red-900/40 px-3 py-2 text-left text-xs font-medium text-red-300 hover:bg-red-900/60 font-mono">
                    ⚠ Race-Monitor ({races.length})
                  </button>
                )}
                <div className="my-1 h-px bg-slate-800" />
                <button
                  role="menuitem"
                  onClick={() => { closeOverflowMenu(); setIsClockPaused(!isClockPaused); }}
                  className={"rounded border px-3 py-2 text-left text-xs font-medium font-mono transition-colors " + (isClockPaused ? "text-amber-300 bg-amber-900/40 border-amber-700" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600")}
                >
                  {isClockPaused ? '▶ Fortsetzen' : '⏸ Pausieren'}
                </button>
                <button
                  role="menuitem"
                  onClick={() => { closeOverflowMenu(); stepOneClock(); }}
                  disabled={!isClockPaused}
                  className={"rounded border px-3 py-2 text-left text-xs font-medium font-mono transition-colors " + (!isClockPaused ? "text-slate-600 bg-slate-800 border-slate-700 cursor-not-allowed" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600")}
                >
                  ⏭ Ein Takt
                </button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); handleReset(); }} className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-red-400 font-mono">Neu</button>
                  <button
                    role="menuitem"
                    data-testid="toolbar-broker-button"
                    onClick={() => { closeOverflowMenu(); onShowBroker?.(); }}
                    className={"rounded border px-3 py-2 text-left text-xs font-medium font-mono transition-colors " + (hasActiveSession ? "text-cyan-200 bg-cyan-900/30 border-cyan-700" : "text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-600")}
                  >
                    Broker ({brokerPhase})
                  </button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); onShowFsm?.(); }} className="rounded border border-purple-700 bg-purple-900/30 px-3 py-2 text-left text-xs font-medium text-purple-300 hover:bg-purple-800/40 font-mono">FSM</button>
                <button role="menuitem" onClick={() => { closeOverflowMenu(); setShowHelp(true); }} className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-700 font-mono">Hilfe</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showExport    && <ExportModal onClose={() => setShowExport(false)} />}
      {showTruth     && <TruthTableModal onClose={() => setShowTruth(false)} />}
      {showCustomIC  && <CustomICModal onClose={() => setShowCustomIC(false)} />}
      {showHelp      && <HelpModal onClose={() => setShowHelp(false)} />}
      {showRacePanel && <RacePanel onClose={() => setShowRacePanel(false)} />}
    </header>
  );
}

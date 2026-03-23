import './core/registry/index';
import { reloadAllCustomICs } from './components/panels/CustomICModal';
import { loadSavedCircuit } from './store/CircuitContext';

// Reload any previously saved custom ICs on startup
reloadAllCustomICs();

import { useState, useRef, useCallback, useEffect } from 'react';
import { CircuitProvider } from './store/CircuitContext';
import { useCircuitContext } from './store/CircuitContext';
import { CircuitCanvas } from './components/canvas/CircuitCanvas';
import { BackendBrokerModal } from './components/panels/BackendBrokerModal';
import { GatePalette } from './components/sidebar/GatePalette';
import { isBackendBrokerUiEnabled } from './core/backendBroker/featureFlags';
import { useBackendSandboxDebugBridge } from './hooks/useBackendSandboxDebugBridge';
import { BackendBrokerProvider } from './hooks/useBackendBroker';
import { Toolbar } from './components/toolbar/Toolbar';
import { TimingDiagram } from './components/panels/TimingDiagram';
import { FsmEditor } from './components/fsm/FsmEditor';
import { CanvasAnalysisBanner } from './components/panels/CanvasAnalysisBanner';

const TIMING_MIN_H = 100;
const TIMING_MAX_H = 600;
const PALETTE_COLLAPSED_STORAGE_KEY = 'logic-simulator-ui:palette-collapsed';
const BACKEND_BROKER_UI_ENABLED = isBackendBrokerUiEnabled();

function loadInitialPaletteCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PALETTE_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function AppInner() {
  useBackendSandboxDebugBridge();
  const { timingHistory, clearTimingHistory } = useCircuitContext();
  const [showTiming,   setShowTiming]   = useState(false);
  const [showFsm,      setShowFsm]      = useState(false);
  const [showBroker,   setShowBroker]   = useState(false);
  const [timingHeight, setTimingHeight] = useState(220);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(loadInitialPaletteCollapsed);

  // Ref hält immer die aktuelle Höhe – kein stale-closure-Problem im mousemove-Handler
  const timingHeightRef = useRef(timingHeight);

  useEffect(() => {
    timingHeightRef.current = timingHeight;
  }, [timingHeight]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PALETTE_COLLAPSED_STORAGE_KEY, isPaletteCollapsed ? '1' : '0');
    } catch {
      // Ignore localStorage failures and keep the in-memory UI state usable.
    }
  }, [isPaletteCollapsed]);

  const handleResizerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = timingHeightRef.current;

    const onMove = (me: MouseEvent) => {
      // Nach oben ziehen → Panel größer; nach unten → kleiner
      const delta  = startY - me.clientY;
      const newH   = Math.max(TIMING_MIN_H, Math.min(TIMING_MAX_H, startH + delta));
      setTimingHeight(newH);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, []);

  if (showFsm) {
    return <FsmEditor onBack={() => setShowFsm(false)} />;
  }

  return (
    <div className="flex flex-col h-full">
      <Toolbar showTiming={showTiming} onToggleTiming={() => setShowTiming((v) => !v)}
        onShowBroker={BACKEND_BROKER_UI_ENABLED ? () => setShowBroker(true) : undefined}
        onShowFsm={() => setShowFsm(true)} />
      <CanvasAnalysisBanner />
      <div className="flex flex-1 min-h-0">
        <GatePalette
          isCollapsed={isPaletteCollapsed}
          onToggleCollapse={() => setIsPaletteCollapsed((prev) => !prev)}
        />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <main className="flex-1 min-h-0 relative">
            <CircuitCanvas />
          </main>
          {showTiming && (
            <>
              {/* ── Resize-Handle ──────────────────────────────────────── */}
              <div
                onMouseDown={handleResizerMouseDown}
                style={{
                  height: 5, flexShrink: 0,
                  background: '#1e293b',
                  cursor: 'ns-resize',
                  borderTop: '1px solid #334155',
                }}
                title="Ziehen zum Vergrößern / Verkleinern"
              />
              {/* ── Timing-Panel ───────────────────────────────────────── */}
              <div style={{ height: timingHeight, flexShrink: 0 }}>
                <TimingDiagram
                  history={timingHistory}
                  onClose={() => { clearTimingHistory(); setShowTiming(false); }}
                />
              </div>
            </>
          )}
        </div>
      </div>
      {BACKEND_BROKER_UI_ENABLED && showBroker && (
        <BackendBrokerModal onClose={() => setShowBroker(false)} />
      )}
    </div>
  );
}

export default function App() {
  const savedCircuit = loadSavedCircuit();
  const appContent = <AppInner />;
  return (
    <CircuitProvider initialCircuit={savedCircuit ?? undefined}>
      {BACKEND_BROKER_UI_ENABLED ? (
        <BackendBrokerProvider>{appContent}</BackendBrokerProvider>
      ) : (
        appContent
      )}
    </CircuitProvider>
  );
}

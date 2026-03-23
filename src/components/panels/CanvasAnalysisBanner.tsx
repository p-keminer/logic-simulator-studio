import { useMemo, useState } from 'react';
import { buildAnalysisSubsystemOptions } from '../../core/analysis/sequentialProjection';
import { buildStaticAnalysisCircuit } from '../../core/analysis/stateTransitionTable';
import { useCircuitContext } from '../../store/CircuitContext';
import { buildCanvasAnalysisSemanticNotes } from './panelViewState';

export function CanvasAnalysisBanner() {
  const { circuit } = useCircuitContext();
  const analysisCircuit = useMemo(() => buildStaticAnalysisCircuit(circuit), [circuit]);
  const [dismissedNoteIds, setDismissedNoteIds] = useState<Set<string>>(() => new Set());

  const analysisSubsystemOptions = useMemo(
    () => buildAnalysisSubsystemOptions(analysisCircuit),
    [analysisCircuit],
  );
  const notes = useMemo(
    () => buildCanvasAnalysisSemanticNotes(analysisSubsystemOptions),
    [analysisSubsystemOptions],
  );
  const noteEntries = useMemo(
    () => notes.map((note) => ({
      ...note,
      id: `${circuit.id}:${note.key}:${note.message}`,
    })),
    [circuit.id, notes],
  );
  const visibleNotes = useMemo(
    () => noteEntries.filter((note) => !dismissedNoteIds.has(note.id)),
    [dismissedNoteIds, noteEntries],
  );

  if (visibleNotes.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 12px',
        borderBottom: '1px solid #1e293b',
        background: '#0b1220',
        flexShrink: 0,
      }}
    >
      {visibleNotes.map((note) => {
        const isWarning = note.tone === 'warning';
        return (
          <div
            key={note.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '7px 10px',
              borderRadius: 6,
              border: `1px solid ${isWarning ? '#7c2d12' : '#1d4ed8'}`,
              background: isWarning ? '#431407' : '#172554',
              color: isWarning ? '#fdba74' : '#bfdbfe',
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {note.message}
            </div>
            <button
              type="button"
              aria-label="Hinweis ausblenden"
              onClick={() => {
                setDismissedNoteIds((previous) => {
                  const next = new Set(previous);
                  next.add(note.id);
                  return next;
                });
              }}
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: 4,
                border: `1px solid ${isWarning ? '#9a3412' : '#2563eb'}`,
                background: isWarning ? '#7c2d12' : '#1d4ed8',
                color: isWarning ? '#ffedd5' : '#dbeafe',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'monospace',
                lineHeight: '20px',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

import type {
  AnalysisSubsystemOption,
  AnalysisSubsystemProjectionSemantics,
} from '../../core/analysis/sequentialProjection';
import type { Circuit } from '../../core/types';

export type PanelTimingViewMode = 'all' | 'selected';

export interface ResolvedAnalysisSubsystemState {
  activeAnalysisSubsystem: AnalysisSubsystemOption | null;
  showSubsystemSelector: boolean;
}

export interface AnalysisSubsystemSemanticNote {
  key: string;
  tone: 'info' | 'warning';
  message: string;
}

export type AnalysisPanelSemanticTarget = 'truth_table' | 'timing';

function formatSemanticLabels(labels: string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} und ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} und ${labels[labels.length - 1]}`;
}

function collectSemanticsLabels(
  analysisSubsystemOptions: AnalysisSubsystemOption[],
  projectionSemantics: AnalysisSubsystemProjectionSemantics,
): string[] {
  return [...new Set(
    analysisSubsystemOptions
      .filter((option) => option.projectionSemantics === projectionSemantics)
      .map((option) => option.label),
  )];
}

function getProjectionSemanticsNote(
  projectionSemantics: AnalysisSubsystemProjectionSemantics | undefined,
  target: AnalysisPanelSemanticTarget,
): AnalysisSubsystemSemanticNote | null {
  switch (projectionSemantics) {
    case 'legacy_projected_fsm':
      return {
        key: 'legacy_projected_fsm',
        tone: 'info',
        message: 'Dieser Altfall wird ueber die Legacy-Bruecke weiterhin kanonisch projiziert.',
      };
    case 'modified_projected_fsm':
      return {
        key: 'modified_projected_fsm',
        tone: 'warning',
        message: 'Synthetisierte FSM wurde nachtraeglich veraendert oder ergaenzt. Kompakte FSM-Sichten gelten dafuer nicht mehr; die Ansicht bleibt technisch.',
      };
    case 'mixed_projected_subsystem':
      return {
        key: 'mixed_projected_subsystem',
        tone: 'warning',
        message: target === 'truth_table'
          ? 'Dieses Sequential-Subsystem mischt projizierte und rohe Anteile. Eine kompakte FSM-STT waere hier halb-projiziert; die Analyse bleibt technisch.'
          : 'Dieses Sequential-Subsystem mischt projizierte und rohe Anteile. Kanonische FSM-Kanaele allein waeren hier halb-projiziert; das Timing bleibt technisch.',
      };
    default:
      return null;
  }
}

export function buildAnalysisSubsystemSemanticNotes(args: {
  analysisSubsystemOptions: AnalysisSubsystemOption[];
  activeAnalysisSubsystem: AnalysisSubsystemOption | null;
  target: AnalysisPanelSemanticTarget;
}): AnalysisSubsystemSemanticNote[] {
  const { analysisSubsystemOptions, activeAnalysisSubsystem, target } = args;
  if (!activeAnalysisSubsystem) return [];

  const notes: AnalysisSubsystemSemanticNote[] = [];
  const projectionSemanticsNote = getProjectionSemanticsNote(
    activeAnalysisSubsystem.projectionSemantics,
    target,
  );
  if (projectionSemanticsNote) notes.push(projectionSemanticsNote);

  if (analysisSubsystemOptions.length > 1 && activeAnalysisSubsystem.kind === 'projected_fsm') {
    notes.push({
      key: 'isolated_projected_fsm',
      tone: 'info',
      message: `${target === 'truth_table' ? 'Analysiert' : 'Zeigt'} isoliert das ausgewaehlte System ${activeAnalysisSubsystem.label}, damit getrennte FSM-Projektionsbatches nicht in eine gemeinsame technische Fallback-Sicht gedrueckt werden.`,
    });
  }

  return notes;
}

export function buildCanvasAnalysisSemanticNotes(
  analysisSubsystemOptions: AnalysisSubsystemOption[],
): AnalysisSubsystemSemanticNote[] {
  if (analysisSubsystemOptions.length === 0) return [];

  const notes: AnalysisSubsystemSemanticNote[] = [];
  const modifiedLabels = collectSemanticsLabels(analysisSubsystemOptions, 'modified_projected_fsm');
  const mixedLabels = collectSemanticsLabels(analysisSubsystemOptions, 'mixed_projected_subsystem');
  const legacyLabels = collectSemanticsLabels(analysisSubsystemOptions, 'legacy_projected_fsm');
  const projectedLabels = [...new Set(
    analysisSubsystemOptions
      .filter((option) => option.kind === 'projected_fsm')
      .map((option) => option.label),
  )];

  if (modifiedLabels.length > 0) {
    notes.push({
      key: 'canvas-modified-projected-fsm',
      tone: 'warning',
      message: `${modifiedLabels.length === 1 ? 'System' : 'Systeme'} ${formatSemanticLabels(modifiedLabels)} ${modifiedLabels.length === 1 ? 'wurde' : 'wurden'} nachtraeglich an der synthetisierten FSM-Struktur veraendert oder ergaenzt. Kompakte FSM-Sichten gelten dafuer nicht mehr.`,
    });
  }

  if (mixedLabels.length > 0) {
    notes.push({
      key: 'canvas-mixed-projected-subsystem',
      tone: 'warning',
      message: `${mixedLabels.length === 1 ? 'System' : 'Systeme'} ${formatSemanticLabels(mixedLabels)} ${mixedLabels.length === 1 ? 'mischt' : 'mischen'} projizierte und rohe oder direkt verkettete sequentielle Anteile. STT und Timing bleiben dafuer bewusst technisch.`,
    });
  }

  if (legacyLabels.length > 0) {
    notes.push({
      key: 'canvas-legacy-projected-fsm',
      tone: 'info',
      message: legacyLabels.length === 1
        ? `Legacy-System ${formatSemanticLabels(legacyLabels)} laeuft weiter ueber die Legacy-Bruecke und bleibt kanonisch projiziert.`
        : `Legacy-Systeme ${formatSemanticLabels(legacyLabels)} laufen weiter ueber die Legacy-Bruecke und bleiben kanonisch projiziert.`,
    });
  }

  if (projectedLabels.length > 1) {
    notes.push({
      key: 'canvas-multi-projected-fsm',
      tone: 'info',
      message: `Getrennte projizierte FSM-Systeme erkannt: ${formatSemanticLabels(projectedLabels)}. STT und Timing koennen diese Systeme isoliert auswaehlen.`,
    });
  }

  return notes;
}

export function resolveActiveAnalysisSubsystem(
  analysisSubsystemOptions: AnalysisSubsystemOption[],
  selectedSubsystemKey: string,
): AnalysisSubsystemOption | null {
  return analysisSubsystemOptions.find((option) => option.key === selectedSubsystemKey)
    ?? analysisSubsystemOptions[0]
    ?? null;
}

export function resolveAnalysisSubsystemState(
  analysisSubsystemOptions: AnalysisSubsystemOption[],
  selectedSubsystemKey: string,
): ResolvedAnalysisSubsystemState {
  const activeAnalysisSubsystem = resolveActiveAnalysisSubsystem(
    analysisSubsystemOptions,
    selectedSubsystemKey,
  );

  return {
    activeAnalysisSubsystem,
    showSubsystemSelector: analysisSubsystemOptions.length > 1 && activeAnalysisSubsystem !== null,
  };
}

export function resolveTruthTableAnalysisSourceCircuit(
  analysisCircuit: Circuit,
  activeAnalysisSubsystem: AnalysisSubsystemOption | null,
): Circuit {
  return activeAnalysisSubsystem?.circuit ?? analysisCircuit;
}

export function resolveTruthTablePanelState(
  analysisCircuit: Circuit,
  analysisSubsystemOptions: AnalysisSubsystemOption[],
  selectedSubsystemKey: string,
): ResolvedAnalysisSubsystemState & { analysisSourceCircuit: Circuit } {
  const subsystemState = resolveAnalysisSubsystemState(
    analysisSubsystemOptions,
    selectedSubsystemKey,
  );

  return {
    ...subsystemState,
    analysisSourceCircuit: resolveTruthTableAnalysisSourceCircuit(
      analysisCircuit,
      subsystemState.activeAnalysisSubsystem,
    ),
  };
}

export function resolveTimingAnalysisSourceCircuit(
  circuit: Circuit,
  activeAnalysisSubsystem: AnalysisSubsystemOption | null,
  viewMode: PanelTimingViewMode,
): Circuit {
  return viewMode === 'selected'
    ? (activeAnalysisSubsystem?.circuit ?? circuit)
    : circuit;
}

export function resolveTimingPanelState(
  circuit: Circuit,
  analysisSubsystemOptions: AnalysisSubsystemOption[],
  selectedSubsystemKey: string,
  viewMode: PanelTimingViewMode,
): ResolvedAnalysisSubsystemState & { analysisSourceCircuit: Circuit } {
  const subsystemState = resolveAnalysisSubsystemState(
    analysisSubsystemOptions,
    selectedSubsystemKey,
  );

  return {
    activeAnalysisSubsystem: subsystemState.activeAnalysisSubsystem,
    showSubsystemSelector: viewMode === 'selected' && subsystemState.showSubsystemSelector,
    analysisSourceCircuit: resolveTimingAnalysisSourceCircuit(
      circuit,
      subsystemState.activeAnalysisSubsystem,
      viewMode,
    ),
  };
}

export function shouldUseProjectedTimingChannels(viewMode: PanelTimingViewMode): boolean {
  return viewMode === 'selected';
}

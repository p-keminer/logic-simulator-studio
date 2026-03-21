import type { AnalysisSubsystemOption } from '../../core/analysis/sequentialProjection';
import type { Circuit } from '../../core/types';

export type PanelTimingViewMode = 'all' | 'selected';

export interface ResolvedAnalysisSubsystemState {
  activeAnalysisSubsystem: AnalysisSubsystemOption | null;
  showSubsystemSelector: boolean;
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

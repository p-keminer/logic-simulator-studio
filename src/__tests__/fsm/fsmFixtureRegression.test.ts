import { describe, expect, it } from 'vitest';
import '../../core/registry/index';
import legacyFsmExportFixture from '../../../validation/fsm-export-fixes/cases/downloads/2026-03-19/FSM_EXPORT_19.03.26.lgsc.json';
import chainedProjectedFixture from '../../../validation/manual-fixtures/fsm-chained/fsm0_direct_chained_batches_fixture.lgsc.json';
import mixedIslandsFixture from '../../../validation/manual-fixtures/fsm-islands/fsm0_multiple_mixed_islands_fixture.lgsc.json';
import mixedIslandsSharedObserverFixture from '../../../validation/manual-fixtures/fsm-islands/fsm0_mixed_islands_shared_observer_fixture.lgsc.json';
import sharedHelperIslandsFixture from '../../../validation/manual-fixtures/fsm-islands/fsm0_shared_helper_islands_fixture.lgsc.json';
import mixedProjectedRawFixture from '../../../validation/manual-fixtures/fsm-mixed/fsm0_projected_raw_modified_fixture.lgsc.json';
import observerSplitFixture from '../../../validation/manual-fixtures/fsm-observer/fsm0_observer_split_batches_fixture.lgsc.json';
import type { Circuit } from '../../core/types';
import {
  buildAnalysisSubsystemOptions,
  buildProjectedFsmSubsystemOptions,
  buildSequentialProjectionChannels,
} from '../../core/analysis/sequentialProjection';
import { buildStaticAnalysisCircuit } from '../../core/analysis/stateTransitionTable';
import { buildClipboardDataForSelection } from '../../store/clipboardSelection';
import { buildPastedClipboardContent } from '../../store/pasteClipboardProjection';

function cloneCircuit<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadLegacyFsmExportFixture(): Circuit {
  return cloneCircuit(legacyFsmExportFixture as Circuit);
}

function loadMixedProjectedRawFixture(): Circuit {
  return cloneCircuit(mixedProjectedRawFixture as Circuit);
}

function loadMixedIslandsFixture(): Circuit {
  return cloneCircuit(mixedIslandsFixture as Circuit);
}

function loadMixedIslandsSharedObserverFixture(): Circuit {
  return cloneCircuit(mixedIslandsSharedObserverFixture as Circuit);
}

function loadSharedHelperIslandsFixture(): Circuit {
  return cloneCircuit(sharedHelperIslandsFixture as Circuit);
}

function loadChainedProjectedFixture(): Circuit {
  return cloneCircuit(chainedProjectedFixture as Circuit);
}

function loadObserverSplitFixture(): Circuit {
  return cloneCircuit(observerSplitFixture as Circuit);
}

function makeCopiedLegacyFixtureCircuit(): Circuit {
  const base = loadLegacyFsmExportFixture();
  const clipboard = buildClipboardDataForSelection(
    base,
    new Set(Object.keys(base.gates)),
  );

  expect(clipboard).toBeTruthy();

  const pasted = buildPastedClipboardContent({
    clipboard: clipboard!,
    existingCircuit: base,
    offsetX: 24,
    offsetY: 24,
    createId: (() => {
      let index = 0;
      return () => `fixture-copy-${++index}`;
    })(),
  });

  return {
    ...base,
    gates: {
      ...base.gates,
      ...Object.fromEntries(pasted.gates.map((gate) => [gate.id, gate])),
    },
    wires: {
      ...base.wires,
      ...Object.fromEntries(pasted.wires.map((wire) => [wire.id, wire])),
    },
  };
}

describe('FSM fixture regressions', () => {
  it('keeps the stored legacy export fixture on the canonical legacy projected path', () => {
    const circuit = loadLegacyFsmExportFixture();

    const projectedOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(projectedOptions.map((option) => ({
      label: option.label,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', projectionSemantics: 'legacy_projected_fsm' },
    ]);

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'projected_fsm', projectionSemantics: 'legacy_projected_fsm' },
    ]);
  });

  it('keeps the stored legacy export fixture separately selectable after full copy/paste', () => {
    const circuit = makeCopiedLegacyFixtureCircuit();

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'projected_fsm', projectionSemantics: 'legacy_projected_fsm' },
      { label: 'Y_1', kind: 'projected_fsm', projectionSemantics: 'legacy_projected_fsm' },
    ]);
  });

  it('keeps the stored projected-plus-raw fixture on the modified projected fallback path', () => {
    const circuit = loadMixedProjectedRawFixture();

    const projectedOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(projectedOptions.map((option) => option.label)).toEqual(['Y']);
    expect(Object.keys(projectedOptions[0]!.circuit.gates)).toContain('raw-reg');
    expect(Object.keys(projectedOptions[0]!.circuit.gates)).toContain('raw-and');

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'generic', projectionSemantics: 'modified_projected_fsm' },
    ]);

    expect(buildSequentialProjectionChannels(analysisOptions[0]!.circuit)).toEqual([]);
  });

  it('keeps the stored directly chained projected fixture on the mixed-batches fallback path', () => {
    const circuit = loadChainedProjectedFixture();

    expect(buildProjectedFsmSubsystemOptions(circuit)).toHaveLength(0);

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'generic', projectionSemantics: 'mixed_projected_subsystem' },
    ]);

    expect(buildSequentialProjectionChannels(analysisOptions[0]!.circuit)).toEqual([]);
  });

  it('keeps the stored projected batches split when they only share a raw observer path', () => {
    const circuit = loadObserverSplitFixture();

    const projectedOptions = buildProjectedFsmSubsystemOptions(circuit);
    expect(projectedOptions.map((option) => ({
      label: option.label,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', projectionSemantics: 'clean_projected_fsm' },
      { label: 'Y_1', projectionSemantics: 'clean_projected_fsm' },
    ]);

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'projected_fsm', projectionSemantics: 'clean_projected_fsm' },
      { label: 'Y_1', kind: 'projected_fsm', projectionSemantics: 'clean_projected_fsm' },
    ]);
  });

  it('keeps multiple disconnected mixed projected islands separately selectable with unique labels', () => {
    const circuit = loadMixedIslandsFixture();

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'generic', projectionSemantics: 'modified_projected_fsm' },
      { label: 'Y_1', kind: 'generic', projectionSemantics: 'mixed_projected_subsystem' },
    ]);

    expect(buildSequentialProjectionChannels(analysisOptions[0]!.circuit)).toEqual([]);
    expect(buildSequentialProjectionChannels(analysisOptions[1]!.circuit)).toEqual([]);
  });

  it('keeps multiple mixed projected islands separately selectable when they only share a raw observer path', () => {
    const circuit = loadMixedIslandsSharedObserverFixture();

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'generic', projectionSemantics: 'modified_projected_fsm' },
      { label: 'Y_1', kind: 'generic', projectionSemantics: 'modified_projected_fsm' },
    ]);

    expect(buildSequentialProjectionChannels(analysisOptions[0]!.circuit)).toEqual([]);
    expect(buildSequentialProjectionChannels(analysisOptions[1]!.circuit)).toEqual([]);
  });

  it('keeps multiple mixed projected islands separately selectable when they only share raw feed-forward helper logic', () => {
    const circuit = loadSharedHelperIslandsFixture();

    const analysisOptions = buildAnalysisSubsystemOptions(buildStaticAnalysisCircuit(circuit));
    expect(analysisOptions.map((option) => ({
      label: option.label,
      kind: option.kind,
      projectionSemantics: option.projectionSemantics,
    }))).toEqual([
      { label: 'Y', kind: 'generic', projectionSemantics: 'modified_projected_fsm' },
      { label: 'Y_1', kind: 'generic', projectionSemantics: 'modified_projected_fsm' },
    ]);

    expect(buildSequentialProjectionChannels(analysisOptions[0]!.circuit)).toEqual([]);
    expect(buildSequentialProjectionChannels(analysisOptions[1]!.circuit)).toEqual([]);
  });
});

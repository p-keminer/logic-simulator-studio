import { gateRegistry } from '../registry/GateRegistry';
import type {
  Circuit,
  GateInstance,
  GateProjectionMetadata,
  ProjectionSignalRole,
  ProjectionVisibility,
} from '../types';
import {
  buildCircuitSubset,
  collectSequentialSubsystemBoundaries,
  getConnectedGateIds,
} from './sequentialSubsystemBoundaries';

const INPUT_TYPES = new Set(['INPUT_SWITCH', 'PUSH_BTN', 'CLOCK', 'CONST_HIGH', 'CONST_LOW']);
const OUTPUT_TYPES = new Set(['OUTPUT_LED', 'SEG7', 'SEG7_BCD']);
const SKIP_TYPES = new Set(['TEXT_NOTE', 'JUNCTION', 'ADC8']);

export interface ProjectedSignalChannel {
  key: string;
  label: string;
  color: string;
  gateId: string;
  portId: string;
  role: ProjectionSignalRole;
  visibility: ProjectionVisibility;
  groupKey: string;
}

export interface ProjectedSequentialSttGates {
  inputs: GateInstance[];
  outputs: GateInstance[];
}

export interface ProjectedFsmSubsystemOption {
  key: string;
  batchId: string;
  label: string;
  circuit: Circuit;
  inputLabels: string[];
  outputLabels: string[];
  projectionSemantics: Extract<AnalysisSubsystemProjectionSemantics, 'clean_projected_fsm' | 'legacy_projected_fsm'>;
}

export type AnalysisSubsystemProjectionSemantics =
  | 'clean_projected_fsm'
  | 'legacy_projected_fsm'
  | 'modified_projected_fsm'
  | 'mixed_projected_subsystem';

export interface AnalysisSubsystemOption {
  key: string;
  label: string;
  circuit: Circuit;
  kind: 'projected_fsm' | 'generic';
  projectionSemantics?: AnalysisSubsystemProjectionSemantics;
}

export interface StateTransitionProjectionStateVar {
  gateId: string;
  portId: string;
  stateKey: string;
  label: string;
}

export interface StateTransitionProjection {
  inputs: GateInstance[];
  inputRoles: Record<string, Extract<ProjectionSignalRole, 'clock' | 'reset' | 'input'>>;
  stateVars: StateTransitionProjectionStateVar[];
  outputGates: GateInstance[];
  isProjectedFsmView: boolean;
  projectionStatus: StateTransitionProjectionStatus;
}

type ProjectionLookup = Map<string, GateProjectionMetadata>;
type ProjectionBatchResolutionMode = 'annotated' | 'legacy' | 'mixed' | 'none';

export type StateTransitionProjectionStatus =
  | 'projected'
  | 'legacy_projected'
  | 'fallback_unprojected'
  | 'fallback_mixed_batches'
  | 'fallback_partial_state'
  | 'fallback_partial_inputs'
  | 'fallback_partial_outputs';

interface ProjectionBatchResolution {
  batchId: string | null;
  mode: ProjectionBatchResolutionMode;
}

function isTrimSafeNonProjectedLeafGate(
  gate: GateInstance,
  projectionLookup: ProjectionLookup,
  batchId: string,
): boolean {
  const projection = getResolvedProjection(projectionLookup, gate);
  if (projection?.sourceSystem === 'fsm_synth' && projection.projectionBatchId === batchId) {
    return false;
  }

  if (INPUT_TYPES.has(gate.typeId) || OUTPUT_TYPES.has(gate.typeId) || SKIP_TYPES.has(gate.typeId)) {
    return true;
  }

  try {
    const definition = gateRegistry.get(gate.typeId);
    return !definition.isSynchronous && typeof definition.stateUpdate !== 'function';
  } catch {
    return true;
  }
}

function isProjectedObserverBoundaryGate(
  gate: GateInstance,
  projectionLookup: ProjectionLookup,
  batchId: string,
): boolean {
  const projection = getResolvedProjection(projectionLookup, gate);
  return !!projection
    && projection.sourceSystem === 'fsm_synth'
    && projection.projectionBatchId === batchId
    && (projection.role === 'output' || projection.role === 'display_mirror');
}

function trimProjectedSubsystemGateIds(
  circuit: Circuit,
  gateIds: Set<string>,
  projectionLookup: ProjectionLookup,
  batchId: string,
): Set<string> {
  const remainingGateIds = new Set(gateIds);
  let changed = true;

  while (changed) {
    changed = false;
    const edgeCount = new Map<string, number>();
    for (const gateId of remainingGateIds) edgeCount.set(gateId, 0);

    for (const wire of Object.values(circuit.wires)) {
      if (!remainingGateIds.has(wire.from.gateId) || !remainingGateIds.has(wire.to.gateId)) continue;
      edgeCount.set(wire.from.gateId, (edgeCount.get(wire.from.gateId) ?? 0) + 1);
      edgeCount.set(wire.to.gateId, (edgeCount.get(wire.to.gateId) ?? 0) + 1);
    }

    for (const gateId of [...remainingGateIds]) {
      const gate = circuit.gates[gateId];
      if (!gate) continue;

      const projectedGate = { ...gate, projection: projectionLookup.get(gate.id) ?? gate.projection };
      if (matchesBatchId(projectedGate, batchId)) continue;
      const isLeafTrimSafe = (edgeCount.get(gateId) ?? 0) <= 1
        && isTrimSafeNonProjectedLeafGate(gate, projectionLookup, batchId);
      const hasRemainingOutgoingEdges = Object.values(circuit.wires).some((wire) =>
        wire.from.gateId === gateId
        && remainingGateIds.has(wire.from.gateId)
        && remainingGateIds.has(wire.to.gateId),
      );
      const hasProtectedOutgoingEdges = Object.values(circuit.wires).some((wire) => {
        if (wire.from.gateId !== gateId) return false;
        if (!remainingGateIds.has(wire.from.gateId) || !remainingGateIds.has(wire.to.gateId)) return false;
        const targetGate = circuit.gates[wire.to.gateId];
        if (!targetGate) return false;
        return !isProjectedObserverBoundaryGate(targetGate, projectionLookup, batchId);
      });
      if (hasProtectedOutgoingEdges) continue;
      if (!isLeafTrimSafe && hasRemainingOutgoingEdges) continue;

      remainingGateIds.delete(gateId);
      changed = true;
    }
  }

  return remainingGateIds;
}

function hasNonProjectedMixedCoreContent(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
  batchId: string,
): boolean {
  return Object.values(circuit.gates).some((gate) => {
    const projectedGate = { ...gate, projection: projectionLookup.get(gate.id) ?? gate.projection };
    if (matchesBatchId(projectedGate, batchId)) return false;
    if (USER_INPUT_TYPES.has(gate.typeId)) return true;

    try {
      const definition = gateRegistry.get(gate.typeId);
      return !!definition.isSynchronous || typeof definition.stateUpdate === 'function';
    } catch {
      return false;
    }
  });
}

function classifyLegacyControlPort(portId: string): 'clock' | 'reset' | null {
  const normalized = portId.trim().toLowerCase();
  if (normalized === 'clk' || normalized.endsWith('clk')) return 'clock';
  if (
    normalized === 'rst'
    || normalized === 'reset'
    || normalized === 'clr'
    || normalized.endsWith('rst')
    || normalized.endsWith('reset')
    || normalized.endsWith('clr')
  ) {
    return 'reset';
  }
  return null;
}

function hasLegacyProjectionContractViolation(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
  batchId: string,
): boolean {
  if (!isLegacyBatchId(batchId)) return false;

  const canonicalControls = Object.values(circuit.gates).filter((gate) => {
    const projection = getResolvedProjection(projectionLookup, gate);
    return !!projection
      && projection.sourceSystem === 'fsm_synth'
      && projection.visibility === 'canonical'
      && projection.projectionBatchId === batchId
      && (projection.role === 'clock' || projection.role === 'reset');
  });

  for (const controlGate of canonicalControls) {
    const controlRole = getResolvedProjection(projectionLookup, controlGate)?.role;
    if (controlRole !== 'clock' && controlRole !== 'reset') continue;

    for (const wire of Object.values(circuit.wires)) {
      if (wire.from.gateId !== controlGate.id) continue;

      const targetGate = circuit.gates[wire.to.gateId];
      if (!targetGate) return true;
      if (OUTPUT_TYPES.has(targetGate.typeId) || SKIP_TYPES.has(targetGate.typeId)) continue;

      const targetProjection = getResolvedProjection(projectionLookup, targetGate);
      if (
        targetProjection?.sourceSystem === 'fsm_synth'
        && targetProjection.visibility === 'canonical'
        && targetProjection.projectionBatchId === batchId
        && targetProjection.role === 'state'
        && classifyLegacyControlPort(wire.to.portId) === controlRole
      ) {
        continue;
      }

      return true;
    }
  }

  return false;
}

function trimLabel(gate: GateInstance): string {
  return gate.label?.trim() ?? '';
}

function fallbackGateLabel(gate: GateInstance): string {
  return gate.label || gate.typeId.replace(/_/g, '') + '_' + gate.id.slice(0, 4);
}

function channelColor(role: ProjectionSignalRole): string {
  if (role === 'clock' || role === 'reset' || role === 'input') return '#60a5fa';
  if (role === 'state') return '#f59e0b';
  if (role === 'output') return '#22c55e';
  return '#94a3b8';
}

function rolePriority(role: ProjectionSignalRole): number {
  switch (role) {
    case 'clock': return 0;
    case 'reset': return 1;
    case 'input': return 2;
    case 'state': return 3;
    case 'output': return 4;
    case 'state_inverted': return 5;
    case 'display_mirror': return 6;
    case 'internal_helper': return 7;
  }
}

function resolvedProjectionPriority(lookup: ProjectionLookup, gate: GateInstance): number {
  const role = getResolvedProjection(lookup, gate)?.role;
  if (!role) return 999;
  return rolePriority(role);
}

function resolvedProjectionRoleRank(lookup: ProjectionLookup, gate: GateInstance): number {
  const role = getResolvedProjection(lookup, gate)?.role;
  if (!role) return 99;
  return rolePriority(role);
}

function resolvedProjectedSignalLabel(lookup: ProjectionLookup, gate: GateInstance, fallback?: string): string {
  return getResolvedProjection(lookup, gate)?.signalLabel || fallback || fallbackGateLabel(gate);
}

function resolveProjectedPortId(gate: GateInstance, projection: GateProjectionMetadata): string | null {
  if (projection.signalPortId) return projection.signalPortId;
  if (OUTPUT_TYPES.has(gate.typeId)) return '_display';

  try {
    const def = gateRegistry.get(gate.typeId);
    return def.outputs[0]?.id ?? null;
  } catch {
    return null;
  }
}

export function getProjectedSignalLabel(gate: GateInstance, fallback?: string): string {
  return gate.projection?.signalLabel || fallback || fallbackGateLabel(gate);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLegacySuffix(label: string, baseLabel: string): string | null {
  const match = label.match(new RegExp(`^${escapeRegExp(baseLabel)}(?:_(\\d+))?$`, 'i'));
  if (!match) return null;
  return match[1] ? `_${match[1]}` : '';
}

function parseLegacyStateLabel(label: string): { index: number; suffix: string } | null {
  const match = label.match(/^Q(\d+)(?:_(\d+))?$/i);
  if (!match) return null;
  return {
    index: Number(match[1]),
    suffix: match[2] ? `_${match[2]}` : '',
  };
}

function parseLegacyInvertedStateLabel(label: string): { index: number; suffix: string } | null {
  const match = label.match(/^!Q(\d+)(?:_(\d+))?$/i);
  if (!match) return null;
  return {
    index: Number(match[1]),
    suffix: match[2] ? `_${match[2]}` : '',
  };
}

function collectConnectedComponents(circuit: Circuit): Set<string>[] {
  const connectedIds = [...getConnectedGateIds(circuit)];
  if (connectedIds.length === 0) return [];

  const adjacency = new Map<string, Set<string>>();
  const ensure = (gateId: string) => {
    if (!adjacency.has(gateId)) adjacency.set(gateId, new Set());
    return adjacency.get(gateId)!;
  };

  for (const gateId of connectedIds) ensure(gateId);
  for (const wire of Object.values(circuit.wires)) {
    ensure(wire.from.gateId).add(wire.to.gateId);
    ensure(wire.to.gateId).add(wire.from.gateId);
  }

  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const startId of connectedIds) {
    if (visited.has(startId)) continue;
    const stack = [startId];
    const component = new Set<string>();
    visited.add(startId);

    while (stack.length > 0) {
      const gateId = stack.pop()!;
      component.add(gateId);
      for (const nextId of adjacency.get(gateId) ?? []) {
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        stack.push(nextId);
      }
    }

    components.push(component);
  }

  return components;
}

function buildProjection(
  batchId: string,
  role: ProjectionSignalRole,
  visibility: ProjectionVisibility,
  signalLabel: string,
  groupKey: string,
  signalPortId?: string,
): GateProjectionMetadata {
  return {
    sourceSystem: 'fsm_synth',
    projectionBatchId: batchId,
    role,
    visibility,
    signalLabel,
    groupKey,
    signalPortId,
  };
}

const LEGACY_BATCH_PREFIX = 'legacy:fsm_synth';

interface LegacyComponentDescriptor {
  batchId: string;
  suffix: string;
  connectedGates: GateInstance[];
  clockGate: GateInstance;
  resetGate: GateInstance;
  stateEntries: Array<{ gate: GateInstance; index: number; label: string }>;
  inputGates: GateInstance[];
}

function analyzeLegacyFsmComponent(
  connectedGates: GateInstance[],
  fallbackIndex: number,
): LegacyComponentDescriptor | null {
  if (connectedGates.length === 0) return null;

  const clockEntries = connectedGates
    .map((gate) => ({ gate, suffix: gate.typeId === 'CLOCK' ? extractLegacySuffix(trimLabel(gate), 'CLK') : null }))
    .filter((entry): entry is { gate: GateInstance; suffix: string } => entry.suffix !== null);
  const resetEntries = connectedGates
    .map((gate) => ({ gate, suffix: gate.typeId === 'INPUT_SWITCH' ? extractLegacySuffix(trimLabel(gate), 'RST') : null }))
    .filter((entry): entry is { gate: GateInstance; suffix: string } => entry.suffix !== null);
  const stateEntries = connectedGates
    .map((gate) => ({ gate, parsed: gate.typeId === 'D_FF_R' ? parseLegacyStateLabel(trimLabel(gate)) : null }))
    .filter((entry): entry is { gate: GateInstance; parsed: { index: number; suffix: string } } => entry.parsed !== null)
    .map((entry) => ({
      gate: entry.gate,
      index: entry.parsed.index,
      suffix: entry.parsed.suffix,
      label: trimLabel(entry.gate),
    }))
    .sort((a, b) => a.index - b.index);

  if (clockEntries.length !== 1 || resetEntries.length !== 1 || stateEntries.length === 0) return null;
  if (stateEntries.some((entry, index) => entry.index !== index)) return null;

  const suffixes = new Set<string>([
    clockEntries[0].suffix,
    resetEntries[0].suffix,
    ...stateEntries.map((entry) => entry.suffix),
  ]);
  if (suffixes.size !== 1) return null;

  const suffix = [...suffixes][0] ?? '';
  const stateLabels = new Set(stateEntries.map((entry) => entry.label));
  const inputGates = connectedGates.filter((gate) =>
    gate.typeId === 'INPUT_SWITCH'
    && gate.id !== resetEntries[0].gate.id
    && !stateLabels.has(trimLabel(gate)),
  );
  if (inputGates.some((gate) => trimLabel(gate).length === 0)) return null;

  return {
    batchId: `${LEGACY_BATCH_PREFIX}:${suffix || fallbackIndex}`,
    suffix,
    connectedGates,
    clockGate: clockEntries[0].gate,
    resetGate: resetEntries[0].gate,
    stateEntries: stateEntries.map(({ gate, index, label }) => ({ gate, index, label })),
    inputGates,
  };
}

function buildLegacyFsmProjectionLookup(circuit: Circuit): ProjectionLookup {
  const explicitProjectedGates = Object.values(circuit.gates).filter(
    (gate) => gate.projection?.sourceSystem === 'fsm_synth',
  );
  if (explicitProjectedGates.length > 0) return new Map();

  const lookup: ProjectionLookup = new Map();
  let componentIndex = 1;

  for (const component of collectConnectedComponents(circuit)) {
    const connectedGates = [...component]
      .map((gateId) => circuit.gates[gateId])
      .filter((gate): gate is GateInstance => Boolean(gate));
    const legacyComponent = analyzeLegacyFsmComponent(connectedGates, componentIndex);
    componentIndex++;
    if (!legacyComponent) continue;

    const { batchId, clockGate, resetGate, stateEntries, inputGates } = legacyComponent;
    const stateLabelSet = new Set(stateEntries.map((entry) => entry.label));
    const stateEntryByIndex = new Map(stateEntries.map((entry) => [entry.index, entry]));

    lookup.set(clockGate.id, buildProjection(batchId, 'clock', 'canonical', trimLabel(clockGate), `clock:${trimLabel(clockGate)}`, 'clk'));
    lookup.set(resetGate.id, buildProjection(batchId, 'reset', 'canonical', trimLabel(resetGate), `reset:${trimLabel(resetGate)}`, 'out'));

    for (const gate of inputGates) {
      const label = trimLabel(gate);
      lookup.set(gate.id, buildProjection(batchId, 'input', 'canonical', label, `input:${label}`, 'out'));
    }

    for (const { gate, label } of stateEntries) {
      lookup.set(gate.id, buildProjection(batchId, 'state', 'canonical', label, `state:${label}`, 'q'));
    }

    for (const gate of connectedGates) {
      const label = trimLabel(gate);
      const invertedState = parseLegacyInvertedStateLabel(label);
      if (gate.typeId === 'NOT' && invertedState && stateLabelSet.has(`Q${invertedState.index}${invertedState.suffix}`)) {
        lookup.set(gate.id, buildProjection(batchId, 'state_inverted', 'derived', label, `state:Q${invertedState.index}${invertedState.suffix}`));
        continue;
      }

      if (gate.typeId !== 'OUTPUT_LED') continue;

      const stateLabel = parseLegacyStateLabel(label);
      const mirroredStateEntry = stateLabel ? stateEntryByIndex.get(stateLabel.index) : null;
      if (mirroredStateEntry && stateLabelSet.has(mirroredStateEntry.label)) {
        lookup.set(
          gate.id,
          buildProjection(
            batchId,
            'display_mirror',
            'derived',
            mirroredStateEntry.label,
            `state:${mirroredStateEntry.label}`,
            '_display',
          ),
        );
        continue;
      }

      if (label) {
        lookup.set(gate.id, buildProjection(batchId, 'output', 'canonical', label, `output:${label}`, '_display'));
      }
    }
  }

  return lookup;
}

function getProjectionLookup(circuit: Circuit): ProjectionLookup {
  const lookup: ProjectionLookup = new Map();
  for (const gate of Object.values(circuit.gates)) {
    if (gate.projection?.sourceSystem === 'fsm_synth') {
      lookup.set(gate.id, gate.projection);
    }
  }

  if (lookup.size > 0) return lookup;
  return buildLegacyFsmProjectionLookup(circuit);
}

function getResolvedProjection(lookup: ProjectionLookup, gate: GateInstance | undefined): GateProjectionMetadata | null {
  if (!gate) return null;
  return lookup.get(gate.id) ?? gate.projection ?? null;
}

function getAnnotatedConnectedGates(circuit: Circuit): GateInstance[] {
  const connectedIds = getConnectedGateIds(circuit);
  const projectionLookup = getProjectionLookup(circuit);
  const connectedAnnotated = Object.values(circuit.gates).filter((gate) =>
    connectedIds.has(gate.id)
    && projectionLookup.get(gate.id)?.sourceSystem === 'fsm_synth',
  );

  if (connectedAnnotated.length > 0) return connectedAnnotated;

  return Object.values(circuit.gates).filter((gate) => projectionLookup.get(gate.id)?.sourceSystem === 'fsm_synth');
}

const USER_INPUT_TYPES = new Set(['INPUT_SWITCH', 'PUSH_BTN', 'CLOCK']);

function isLegacyBatchId(batchId: string | undefined | null): boolean {
  return typeof batchId === 'string' && batchId.startsWith(LEGACY_BATCH_PREFIX);
}

function matchesBatchId(gate: GateInstance, batchId: string): boolean {
  const projection = gate.projection;
  if (!projection) return isLegacyBatchId(batchId);
  if (isLegacyBatchId(batchId)) {
    return !projection.projectionBatchId || projection.projectionBatchId === batchId;
  }
  return projection.projectionBatchId === batchId;
}

function isStateCarrierGate(gate: GateInstance, projectionLookup: ProjectionLookup, batchId: string): boolean {
  const resolvedProjection = getResolvedProjection(projectionLookup, gate);
  if (resolvedProjection?.role === 'state' && resolvedProjection.projectionBatchId === batchId) {
    return true;
  }

  if (USER_INPUT_TYPES.has(gate.typeId) || OUTPUT_TYPES.has(gate.typeId) || SKIP_TYPES.has(gate.typeId)) {
    return false;
  }

  try {
    const definition = gateRegistry.get(gate.typeId);
    return !!definition.isSynchronous || typeof definition.stateUpdate === 'function';
  } catch {
    return false;
  }
}

function isCanonicalInputProjection(
  projectionLookup: ProjectionLookup,
  gate: GateInstance,
  batchId: string,
): boolean {
  const projection = getResolvedProjection(projectionLookup, gate);
  return !!projection
    && projection.sourceSystem === 'fsm_synth'
    && projection.visibility === 'canonical'
    && projection.projectionBatchId === batchId
    && (projection.role === 'clock' || projection.role === 'reset' || projection.role === 'input');
}

function isCoveredOutputProjection(
  projectionLookup: ProjectionLookup,
  gate: GateInstance,
  batchId: string,
): boolean {
  const projection = getResolvedProjection(projectionLookup, gate);
  return !!projection
    && projection.sourceSystem === 'fsm_synth'
    && projection.projectionBatchId === batchId
    && (
      (projection.visibility === 'canonical' && projection.role === 'output')
      || projection.role === 'display_mirror'
    );
}

function getProjectionBatchResolution(circuit: Circuit, projectionLookup: ProjectionLookup): ProjectionBatchResolution {
  const annotatedGates = getAnnotatedConnectedGates(circuit);
  if (annotatedGates.length === 0) return { batchId: null, mode: 'none' };

  const hasExplicitProjection = Object.values(circuit.gates).some((gate) => gate.projection?.sourceSystem === 'fsm_synth');

  const batchIds = new Set<string>();
  let hasMissingBatchId = false;
  for (const gate of annotatedGates) {
    const batchId = projectionLookup.get(gate.id)?.projectionBatchId;
    if (batchId) batchIds.add(batchId);
    else hasMissingBatchId = true;
  }

  if (batchIds.size === 1 && !hasMissingBatchId) {
    return { batchId: [...batchIds][0] ?? null, mode: hasExplicitProjection ? 'annotated' : 'legacy' };
  }

  return { batchId: null, mode: 'mixed' };
}

export function getProjectedFsmBatchId(circuit: Circuit): string | null {
  const projectionLookup = getProjectionLookup(circuit);
  return getProjectionBatchResolution(circuit, projectionLookup).batchId;
}

function collectProjectionBoundaries(circuit: Circuit, projectionLookup: ProjectionLookup) {
  return collectSequentialSubsystemBoundaries(
    circuit,
    (gate) => projectionLookup.get(gate.id) ?? gate.projection,
  );
}

function getProjectedBatchId(
  projectionLookup: ProjectionLookup,
  gate: GateInstance | undefined,
): string | null {
  const projection = getResolvedProjection(projectionLookup, gate);
  if (!projection || projection.sourceSystem !== 'fsm_synth') return null;
  return projection.projectionBatchId ?? null;
}

interface UpstreamBatchInfluence {
  batchIds: Set<string>;
  hasUnsafeRoot: boolean;
}

function collectUpstreamBatchInfluence(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
  gateId: string,
  memo = new Map<string, UpstreamBatchInfluence>(),
  visiting = new Set<string>(),
): UpstreamBatchInfluence {
  const cached = memo.get(gateId);
  if (cached) return cached;
  if (visiting.has(gateId)) {
    return { batchIds: new Set(), hasUnsafeRoot: true };
  }

  const gate = circuit.gates[gateId];
  if (!gate) {
    return { batchIds: new Set(), hasUnsafeRoot: true };
  }

  const projectedBatchId = getProjectedBatchId(projectionLookup, gate);
  if (projectedBatchId) {
    const result = { batchIds: new Set([projectedBatchId]), hasUnsafeRoot: false };
    memo.set(gateId, result);
    return result;
  }

  if (USER_INPUT_TYPES.has(gate.typeId)) {
    const result = { batchIds: new Set<string>(), hasUnsafeRoot: true };
    memo.set(gateId, result);
    return result;
  }

  try {
    const definition = gateRegistry.get(gate.typeId);
    if (definition.isSynchronous || typeof definition.stateUpdate === 'function') {
      const result = { batchIds: new Set<string>(), hasUnsafeRoot: true };
      memo.set(gateId, result);
      return result;
    }
  } catch {
    const result = { batchIds: new Set<string>(), hasUnsafeRoot: true };
    memo.set(gateId, result);
    return result;
  }

  visiting.add(gateId);

  const batchIds = new Set<string>();
  let hasUnsafeRoot = false;
  for (const wire of Object.values(circuit.wires)) {
    if (wire.to.gateId !== gateId) continue;
    const upstream = collectUpstreamBatchInfluence(circuit, projectionLookup, wire.from.gateId, memo, visiting);
    upstream.batchIds.forEach((batchId) => batchIds.add(batchId));
    hasUnsafeRoot ||= upstream.hasUnsafeRoot;
  }

  visiting.delete(gateId);

  const result = { batchIds, hasUnsafeRoot };
  memo.set(gateId, result);
  return result;
}

function isPureProjectedObserverBoundary(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
): boolean {
  for (const gate of Object.values(circuit.gates)) {
    const batchId = getProjectedBatchId(projectionLookup, gate);
    if (batchId) continue;
    if (OUTPUT_TYPES.has(gate.typeId) || SKIP_TYPES.has(gate.typeId)) continue;
    if (USER_INPUT_TYPES.has(gate.typeId)) return false;

    try {
      const definition = gateRegistry.get(gate.typeId);
      if (definition.isSynchronous || typeof definition.stateUpdate === 'function') return false;
    } catch {
      return false;
    }
  }

  for (const wire of Object.values(circuit.wires)) {
    const sourceGate = circuit.gates[wire.from.gateId];
    const targetGate = circuit.gates[wire.to.gateId];
    const sourceBatchId = getProjectedBatchId(projectionLookup, sourceGate);
    const targetBatchId = getProjectedBatchId(projectionLookup, targetGate);

    if (!targetBatchId) continue;
    if (sourceBatchId) {
      if (sourceBatchId !== targetBatchId) return false;
      continue;
    }

    const upstreamInfluence = collectUpstreamBatchInfluence(circuit, projectionLookup, wire.from.gateId);
    if (upstreamInfluence.hasUnsafeRoot) return false;
    if ([...upstreamInfluence.batchIds].some((batchId) => batchId !== targetBatchId)) {
      return false;
    }
  }

  return true;
}

function isProtectedSequentialCoreGate(
  gate: GateInstance,
  projectionLookup: ProjectionLookup,
): boolean {
  if (getProjectedBatchId(projectionLookup, gate)) return true;
  if (USER_INPUT_TYPES.has(gate.typeId) || OUTPUT_TYPES.has(gate.typeId) || SKIP_TYPES.has(gate.typeId)) {
    return false;
  }

  try {
    const definition = gateRegistry.get(gate.typeId);
    return !!definition.isSynchronous || typeof definition.stateUpdate === 'function';
  } catch {
    return false;
  }
}

function isPotentialSharedObserverGate(
  gate: GateInstance,
  projectionLookup: ProjectionLookup,
): boolean {
  if (getProjectedBatchId(projectionLookup, gate)) return false;
  if (USER_INPUT_TYPES.has(gate.typeId)) return false;
  if (OUTPUT_TYPES.has(gate.typeId) || SKIP_TYPES.has(gate.typeId)) return true;

  try {
    const definition = gateRegistry.get(gate.typeId);
    return !definition.isSynchronous && typeof definition.stateUpdate !== 'function';
  } catch {
    return false;
  }
}

function collectSharedObserverRegion(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
  startGateId: string,
): Set<string> | null {
  const region = new Set<string>();
  const stack = [startGateId];

  while (stack.length > 0) {
    const gateId = stack.pop()!;
    if (region.has(gateId)) continue;

    const gate = circuit.gates[gateId];
    if (!gate || !isPotentialSharedObserverGate(gate, projectionLookup)) return null;
    region.add(gateId);

    for (const wire of Object.values(circuit.wires)) {
      if (wire.from.gateId !== gateId) continue;
      const targetGate = circuit.gates[wire.to.gateId];
      if (!targetGate) return null;
      if (isProtectedSequentialCoreGate(targetGate, projectionLookup)) return null;
      if (!isPotentialSharedObserverGate(targetGate, projectionLookup)) return null;
      stack.push(targetGate.id);
    }
  }

  return region;
}

function collectSharedObserverPrunableGateIds(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
): Set<string> {
  const prunableGateIds = new Set<string>();

  for (const gate of Object.values(circuit.gates)) {
    if (!isPotentialSharedObserverGate(gate, projectionLookup)) continue;

    const influence = collectUpstreamBatchInfluence(circuit, projectionLookup, gate.id);
    if (influence.hasUnsafeRoot || influence.batchIds.size < 2) continue;

    const region = collectSharedObserverRegion(circuit, projectionLookup, gate.id);
    if (!region) continue;
    region.forEach((gateId) => prunableGateIds.add(gateId));
  }

  return prunableGateIds;
}

function splitBoundaryBySharedObserverPruning(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
): Circuit[] {
  const prunableGateIds = collectSharedObserverPrunableGateIds(circuit, projectionLookup);
  if (prunableGateIds.size === 0) return [circuit];

  const remainingGateIds = new Set(
    Object.keys(circuit.gates).filter((gateId) => !prunableGateIds.has(gateId)),
  );
  const prunedCircuit = buildCircuitSubset(circuit, remainingGateIds);
  const components = collectConnectedComponents(prunedCircuit)
    .map((gateIds) => buildCircuitSubset(prunedCircuit, gateIds))
    .filter((component) => Object.keys(component.gates).length > 0);

  return components.length > 1 ? components : [circuit];
}

function isSafeFeedForwardRootGate(gate: GateInstance): boolean {
  return INPUT_TYPES.has(gate.typeId);
}

function isPotentialSharedFeedForwardHelperGate(
  gate: GateInstance,
  projectionLookup: ProjectionLookup,
): boolean {
  if (getProjectedBatchId(projectionLookup, gate)) return false;
  if (isSafeFeedForwardRootGate(gate)) return false;
  if (OUTPUT_TYPES.has(gate.typeId) || SKIP_TYPES.has(gate.typeId)) return false;

  try {
    const definition = gateRegistry.get(gate.typeId);
    return !definition.isSynchronous && typeof definition.stateUpdate !== 'function';
  } catch {
    return false;
  }
}

function hasSafeFeedForwardUpstream(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
  gateId: string,
  memo = new Map<string, boolean>(),
  visiting = new Set<string>(),
): boolean {
  const cached = memo.get(gateId);
  if (cached !== undefined) return cached;
  if (visiting.has(gateId)) return false;

  const gate = circuit.gates[gateId];
  if (!gate) return false;
  if (isSafeFeedForwardRootGate(gate)) {
    memo.set(gateId, true);
    return true;
  }
  if (!isPotentialSharedFeedForwardHelperGate(gate, projectionLookup)) {
    memo.set(gateId, false);
    return false;
  }

  visiting.add(gateId);
  const incomingWires = Object.values(circuit.wires).filter((wire) => wire.to.gateId === gateId);
  const isSafe = incomingWires.length > 0
    && incomingWires.every((wire) =>
      hasSafeFeedForwardUpstream(circuit, projectionLookup, wire.from.gateId, memo, visiting),
    );
  visiting.delete(gateId);
  memo.set(gateId, isSafe);
  return isSafe;
}

function collectDownstreamProtectedTargets(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
  gateId: string,
  memo = new Map<string, Set<string>>(),
  visiting = new Set<string>(),
): Set<string> {
  const cached = memo.get(gateId);
  if (cached) return new Set(cached);
  if (visiting.has(gateId)) return new Set();

  const gate = circuit.gates[gateId];
  if (!gate) return new Set();

  visiting.add(gateId);
  const targets = new Set<string>();
  for (const wire of Object.values(circuit.wires)) {
    if (wire.from.gateId !== gateId) continue;
    const targetGate = circuit.gates[wire.to.gateId];
    if (!targetGate) continue;

    const projectedBatchId = getProjectedBatchId(projectionLookup, targetGate);
    if (projectedBatchId) {
      targets.add(`batch:${projectedBatchId}`);
      continue;
    }

    if (isProtectedSequentialCoreGate(targetGate, projectionLookup)) {
      targets.add(`seq:${targetGate.id}`);
      continue;
    }

    if (OUTPUT_TYPES.has(targetGate.typeId) || SKIP_TYPES.has(targetGate.typeId)) continue;
    if (isPotentialSharedFeedForwardHelperGate(targetGate, projectionLookup)) {
      const nestedTargets = collectDownstreamProtectedTargets(circuit, projectionLookup, targetGate.id, memo, visiting);
      nestedTargets.forEach((target) => targets.add(target));
    }
  }
  visiting.delete(gateId);
  memo.set(gateId, new Set(targets));
  return targets;
}

function collectSharedFeedForwardHelperPrunableGateIds(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
): Set<string> {
  const prunableGateIds = new Set<string>();
  const safeUpstreamMemo = new Map<string, boolean>();
  const downstreamTargetMemo = new Map<string, Set<string>>();

  for (const gate of Object.values(circuit.gates)) {
    if (!isPotentialSharedFeedForwardHelperGate(gate, projectionLookup)) continue;
    if (!hasSafeFeedForwardUpstream(circuit, projectionLookup, gate.id, safeUpstreamMemo)) continue;

    const downstreamTargets = collectDownstreamProtectedTargets(
      circuit,
      projectionLookup,
      gate.id,
      downstreamTargetMemo,
    );
    if (downstreamTargets.size < 2) continue;
    prunableGateIds.add(gate.id);
  }

  return prunableGateIds;
}

function augmentSubcircuitWithUpstreamFeedForwardSupport(
  originalCircuit: Circuit,
  componentCircuit: Circuit,
  projectionLookup: ProjectionLookup,
): Circuit {
  const expandedGateIds = new Set(Object.keys(componentCircuit.gates));
  const stack = [...expandedGateIds];
  const safeUpstreamMemo = new Map<string, boolean>();

  while (stack.length > 0) {
    const gateId = stack.pop()!;
    for (const wire of Object.values(originalCircuit.wires)) {
      if (wire.to.gateId !== gateId) continue;

      const sourceGate = originalCircuit.gates[wire.from.gateId];
      if (!sourceGate || expandedGateIds.has(sourceGate.id)) continue;
      if (getProjectedBatchId(projectionLookup, sourceGate)) continue;
      if (isProtectedSequentialCoreGate(sourceGate, projectionLookup)) continue;

      const canInclude = isSafeFeedForwardRootGate(sourceGate)
        || (
          isPotentialSharedFeedForwardHelperGate(sourceGate, projectionLookup)
          && hasSafeFeedForwardUpstream(originalCircuit, projectionLookup, sourceGate.id, safeUpstreamMemo)
        );
      if (!canInclude) continue;

      expandedGateIds.add(sourceGate.id);
      stack.push(sourceGate.id);
    }
  }

  return buildCircuitSubset(originalCircuit, expandedGateIds);
}

function splitBoundaryBySharedFeedForwardHelperPruning(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
): Circuit[] {
  const prunableGateIds = collectSharedFeedForwardHelperPrunableGateIds(circuit, projectionLookup);
  if (prunableGateIds.size === 0) return [circuit];

  const remainingGateIds = new Set(
    Object.keys(circuit.gates).filter((gateId) => !prunableGateIds.has(gateId)),
  );
  const prunedCircuit = buildCircuitSubset(circuit, remainingGateIds);
  const components = collectConnectedComponents(prunedCircuit)
    .map((gateIds) => buildCircuitSubset(prunedCircuit, gateIds))
    .map((component) => augmentSubcircuitWithUpstreamFeedForwardSupport(circuit, component, projectionLookup))
    .filter((component) =>
      Object.values(component.gates).some((gate) =>
        getResolvedProjection(projectionLookup, gate)?.sourceSystem === 'fsm_synth',
      ),
    );

  return components.length > 1 ? components : [circuit];
}

function buildProjectedBatchSubsetCircuit(
  circuit: Circuit,
  projectionLookup: ProjectionLookup,
  batchId: string,
): Circuit | null {
  const batchGateIds = new Set(
    Object.values(circuit.gates)
      .filter((gate) => matchesBatchId({ ...gate, projection: projectionLookup.get(gate.id) ?? gate.projection }, batchId))
      .map((gate) => gate.id),
  );

  if (batchGateIds.size === 0) return null;
  return buildCircuitSubset(circuit, batchGateIds);
}

function createProjectedFsmSubsystemOption(
  subcircuit: Circuit,
  batchId: string,
  fallbackIndex: number,
): ProjectedFsmSubsystemOption | null {
  const projected = buildProjectedSequentialSttGates(subcircuit);
  if (!projected || projected.inputs.length === 0 || projected.outputs.length === 0) return null;

  const inputLabels = projected.inputs.map((gate) => getProjectedSignalLabel(gate));
  const outputLabels = projected.outputs.map((gate) => getProjectedSignalLabel(gate));
  const label = outputLabels[0]
    ?? inputLabels.find((entry) => entry !== 'CLK' && entry !== 'RST')
    ?? `FSM ${fallbackIndex}`;

  return {
    key: batchId,
    batchId,
    label,
    circuit: subcircuit,
    inputLabels,
    outputLabels,
    projectionSemantics: getProjectionBatchResolution(subcircuit, getProjectionLookup(subcircuit)).mode === 'legacy'
      ? 'legacy_projected_fsm'
      : 'clean_projected_fsm',
  };
}

export function buildProjectedFsmSubsystemOptions(circuit: Circuit): ProjectedFsmSubsystemOption[] {
  const projectionLookup = getProjectionLookup(circuit);
  const options: ProjectedFsmSubsystemOption[] = [];

  for (const boundary of collectProjectionBoundaries(circuit, projectionLookup)) {
    if (!boundary.hasProjectedContent) continue;

    const appendOption = (nextOption: ProjectedFsmSubsystemOption | null) => {
      if (!nextOption) return;

      const existingIndex = options.findIndex((option) => option.batchId === nextOption.batchId);
      if (existingIndex === -1) {
        options.push(nextOption);
        return;
      }

      const existingGateCount = Object.keys(options[existingIndex].circuit.gates).length;
      const nextGateCount = Object.keys(nextOption.circuit.gates).length;
      if (nextGateCount > existingGateCount) {
        options[existingIndex] = nextOption;
      }
    };

    if (boundary.singleProjectedBatchId) {
      const batchId = boundary.singleProjectedBatchId;
      const trimmedGateIds = trimProjectedSubsystemGateIds(circuit, boundary.gateIds, projectionLookup, batchId);
      let subcircuit = buildCircuitSubset(circuit, trimmedGateIds);
      const projected = buildProjectedSequentialSttGates(subcircuit);
      if ((!projected || projected.inputs.length === 0 || projected.outputs.length === 0) && trimmedGateIds.size !== boundary.gateIds.size) {
        subcircuit = boundary.circuit;
      }

      appendOption(createProjectedFsmSubsystemOption(subcircuit, batchId, options.length + 1));
      continue;
    }

    if (boundary.hasMissingProjectedBatchIds) continue;

    const boundaryLookup = getProjectionLookup(boundary.circuit);
    if (!isPureProjectedObserverBoundary(boundary.circuit, boundaryLookup)) continue;

    for (const batchId of boundary.projectedBatchIds) {
      const batchSubcircuit = buildProjectedBatchSubsetCircuit(boundary.circuit, boundaryLookup, batchId);
      appendOption(createProjectedFsmSubsystemOption(batchSubcircuit ?? boundary.circuit, batchId, options.length + 1));
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}
function buildGenericSubsystemLabel(circuit: Circuit, fallbackIndex: number): string {
  const connectedIds = getConnectedGateIds(circuit);
  const gates = Object.values(circuit.gates)
    .filter((gate) => connectedIds.has(gate.id))
    .sort((a, b) => {
      const xDiff = a.x - b.x;
      if (xDiff !== 0) return xDiff;
      return a.y - b.y;
    });

  const outputs = gates
    .filter((gate) => OUTPUT_TYPES.has(gate.typeId))
    .map((gate) => trimLabel(gate))
    .filter(Boolean);
  if (outputs.length > 0) return outputs[0];

  const namedInputs = gates
    .filter((gate) => INPUT_TYPES.has(gate.typeId))
    .map((gate) => trimLabel(gate))
    .filter((label) => label && label !== 'CLK' && label !== 'RST');
  if (namedInputs.length > 0) return namedInputs[0];

  const firstNamedGate = gates.map((gate) => trimLabel(gate)).find(Boolean);
  return firstNamedGate || `System ${fallbackIndex}`;
}

function disambiguateAnalysisSubsystemLabels(
  options: AnalysisSubsystemOption[],
): AnalysisSubsystemOption[] {
  const counts = new Map<string, number>();
  for (const option of options) {
    counts.set(option.label, (counts.get(option.label) ?? 0) + 1);
  }

  const reservedLabels = new Set(options.map((option) => option.label));
  const usedLabels = new Set<string>();
  const nextSuffixByBase = new Map<string, number>();

  return options.map((option) => {
    const duplicateCount = counts.get(option.label) ?? 0;
    if (duplicateCount <= 1 && !usedLabels.has(option.label)) {
      usedLabels.add(option.label);
      return option;
    }

    if (!usedLabels.has(option.label)) {
      usedLabels.add(option.label);
      nextSuffixByBase.set(option.label, 1);
      return option;
    }

    let suffix = nextSuffixByBase.get(option.label) ?? 1;
    let candidate = `${option.label}_${suffix}`;
    while (usedLabels.has(candidate) || reservedLabels.has(candidate)) {
      suffix++;
      candidate = `${option.label}_${suffix}`;
    }

    usedLabels.add(candidate);
    nextSuffixByBase.set(option.label, suffix + 1);
    return { ...option, label: candidate };
  });
}

export function buildAnalysisSubsystemOptions(circuit: Circuit): AnalysisSubsystemOption[] {
  const projectedOptions = buildProjectedFsmSubsystemOptions(circuit);
  const projectedOptionByBatchId = new Map(projectedOptions.map((option) => [option.batchId, option]));
  const projectionLookup = getProjectionLookup(circuit);
  const boundaries = collectProjectionBoundaries(circuit, projectionLookup);

  const options: AnalysisSubsystemOption[] = [];
  let genericIndex = 1;

  for (const boundary of boundaries) {
    let projectionSemantics: AnalysisSubsystemOption['projectionSemantics'];
    const boundaryLookup = getProjectionLookup(boundary.circuit);
    const canStaySplitProjected = boundary.hasProjectedContent
      && !boundary.singleProjectedBatchId
      && !boundary.hasMissingProjectedBatchIds
      && isPureProjectedObserverBoundary(boundary.circuit, boundaryLookup)
      && boundary.projectedBatchIds.every((batchId) => projectedOptionByBatchId.has(batchId));

    if (boundary.singleProjectedBatchId) {
      const batchId = boundary.singleProjectedBatchId;
      const projectedOption = projectedOptionByBatchId.get(batchId);
      const hasMixedCoreContent = projectedOption
        ? hasNonProjectedMixedCoreContent(projectedOption.circuit, projectionLookup, batchId)
        : false;
      const hasLegacyContractViolation = projectedOption
        ? hasLegacyProjectionContractViolation(projectedOption.circuit, getProjectionLookup(projectedOption.circuit), batchId)
        : false;
      if (projectedOption && !hasMixedCoreContent && !hasLegacyContractViolation) {
        if (options.some((option) => option.key === projectedOption.key)) {
          continue;
        }
        options.push({
          key: projectedOption.key,
          label: projectedOption.label,
          circuit: projectedOption.circuit,
          kind: 'projected_fsm',
          projectionSemantics: projectedOption.projectionSemantics,
        });
        continue;
      }
      if (projectedOption && (hasMixedCoreContent || hasLegacyContractViolation)) {
        projectionSemantics = 'modified_projected_fsm';
      } else if (boundary.hasProjectedContent) {
        projectionSemantics = 'mixed_projected_subsystem';
      }
    } else if (canStaySplitProjected) {
      for (const batchId of boundary.projectedBatchIds) {
        const projectedOption = projectedOptionByBatchId.get(batchId);
        if (!projectedOption || options.some((option) => option.key === projectedOption.key)) continue;
        options.push({
          key: projectedOption.key,
          label: projectedOption.label,
          circuit: projectedOption.circuit,
          kind: 'projected_fsm',
          projectionSemantics: projectedOption.projectionSemantics,
        });
      }
      continue;
    } else if (boundary.hasProjectedContent) {
      const observerPrunedSubcircuits = splitBoundaryBySharedObserverPruning(boundary.circuit, boundaryLookup);
      const supportPrunedSubcircuits = observerPrunedSubcircuits.length > 1
        ? observerPrunedSubcircuits
        : splitBoundaryBySharedFeedForwardHelperPruning(boundary.circuit, boundaryLookup);
      if (supportPrunedSubcircuits.length > 1) {
        for (const subcircuit of supportPrunedSubcircuits) {
          const subProjectionLookup = getProjectionLookup(subcircuit);
          const hasProjectedContent = Object.values(subcircuit.gates).some((gate) =>
            getResolvedProjection(subProjectionLookup, gate)?.sourceSystem === 'fsm_synth',
          );
          if (!hasProjectedContent) continue;
          for (const option of buildAnalysisSubsystemOptions(subcircuit)) {
            options.push(option);
          }
        }
        continue;
      }
      projectionSemantics = 'mixed_projected_subsystem';
    }

    options.push({
      key: `system:${genericIndex}`,
      label: buildGenericSubsystemLabel(boundary.circuit, genericIndex),
      circuit: boundary.circuit,
      kind: 'generic',
      projectionSemantics,
    });
    genericIndex++;
  }

  return disambiguateAnalysisSubsystemLabels(
    options.sort((a, b) => a.label.localeCompare(b.label)),
  );
}

export function buildProjectedSequentialSttGates(circuit: Circuit): ProjectedSequentialSttGates | null {
  const projectionLookup = getProjectionLookup(circuit);
  const batchResolution = getProjectionBatchResolution(circuit, projectionLookup);
  const batchId = batchResolution.batchId;
  if (!batchId) return null;

  const annotatedGates = getAnnotatedConnectedGates(circuit).filter((gate) =>
    matchesBatchId({ ...gate, projection: projectionLookup.get(gate.id) ?? gate.projection }, batchId),
  );
  if (annotatedGates.length === 0) return null;

  const canonicalGates = annotatedGates.filter((gate) =>
    (projectionLookup.get(gate.id) ?? gate.projection)?.visibility === 'canonical',
  );
  const inputs = canonicalGates
    .filter((gate) => {
      const role = (projectionLookup.get(gate.id) ?? gate.projection)?.role;
      return role === 'clock' || role === 'reset' || role === 'input';
    })
    .sort((a, b) => {
      const prio = resolvedProjectionPriority(projectionLookup, a) - resolvedProjectionPriority(projectionLookup, b);
      if (prio !== 0) return prio;
      return resolvedProjectedSignalLabel(projectionLookup, a).localeCompare(resolvedProjectedSignalLabel(projectionLookup, b));
    });

  const outputs = canonicalGates
    .filter((gate) => (projectionLookup.get(gate.id) ?? gate.projection)?.role === 'output')
    .sort((a, b) => resolvedProjectedSignalLabel(projectionLookup, a).localeCompare(resolvedProjectedSignalLabel(projectionLookup, b)));

  return { inputs, outputs };
}

export function buildStateTransitionProjection(
  circuit: Circuit,
  inputs: GateInstance[],
  stateVars: StateTransitionProjectionStateVar[],
  outputGates: GateInstance[],
): StateTransitionProjection {
  const projectionLookup = getProjectionLookup(circuit);
  const batchResolution = getProjectionBatchResolution(circuit, projectionLookup);
  const projectedBatchId = batchResolution.batchId;
  if (!projectedBatchId) {
    return {
      inputs,
      inputRoles: {},
      stateVars,
      outputGates,
      isProjectedFsmView: false,
      projectionStatus: batchResolution.mode === 'mixed' ? 'fallback_mixed_batches' : 'fallback_unprojected',
    };
  }

  if (hasLegacyProjectionContractViolation(circuit, projectionLookup, projectedBatchId)) {
    return {
      inputs,
      inputRoles: {},
      stateVars,
      outputGates,
      isProjectedFsmView: false,
      projectionStatus: 'fallback_partial_inputs',
    };
  }

  const isCanonicalProjectedGate = (gate: GateInstance | undefined, role?: NonNullable<GateInstance['projection']>['role']): boolean => {
    const projection = getResolvedProjection(projectionLookup, gate);
    if (!projection) return false;
    if (projection.sourceSystem !== 'fsm_synth') return false;
    if (projection.visibility !== 'canonical') return false;
    if (projection.projectionBatchId !== projectedBatchId) return false;
    return role ? projection.role === role : true;
  };

  const projectedStateVars = stateVars
    .filter((stateVar) => isCanonicalProjectedGate(circuit.gates[stateVar.gateId], 'state'))
    .map((stateVar) => {
      const gate = circuit.gates[stateVar.gateId];
      const label = getResolvedProjection(projectionLookup, gate)?.signalLabel ?? stateVar.label;
      return { ...stateVar, label };
    });

  if (projectedStateVars.length === 0 || projectedStateVars.length !== stateVars.length) {
    return {
      inputs,
      inputRoles: {},
      stateVars,
      outputGates,
      isProjectedFsmView: false,
      projectionStatus: 'fallback_partial_state',
    };
  }

  if (!inputs.every((gate) => isCanonicalProjectedGate(gate))) {
    return {
      inputs,
      inputRoles: {},
      stateVars,
      outputGates,
      isProjectedFsmView: false,
      projectionStatus: 'fallback_partial_inputs',
    };
  }

  if (!outputGates.every((gate) => isCoveredOutputProjection(projectionLookup, gate, projectedBatchId))) {
    return {
      inputs,
      inputRoles: {},
      stateVars,
      outputGates,
      isProjectedFsmView: false,
      projectionStatus: 'fallback_partial_outputs',
    };
  }

  const projectedInputs = inputs
    .filter((gate) => isCanonicalProjectedGate(gate))
    .sort((a, b) => {
      const rank = resolvedProjectionRoleRank(projectionLookup, a) - resolvedProjectionRoleRank(projectionLookup, b);
      if (rank !== 0) return rank;
      return resolvedProjectedSignalLabel(projectionLookup, a).localeCompare(resolvedProjectedSignalLabel(projectionLookup, b));
    });

  const inputRoles = Object.fromEntries(
    projectedInputs.flatMap((gate) => {
      const role = getResolvedProjection(projectionLookup, gate)?.role;
      return role === 'clock' || role === 'reset' || role === 'input'
        ? [[gate.id, role]]
        : [];
    }),
  ) as Record<string, Extract<ProjectionSignalRole, 'clock' | 'reset' | 'input'>>;

  const projectedOutputGates = outputGates
    .filter((gate) => isCanonicalProjectedGate(gate, 'output'))
    .sort((a, b) => resolvedProjectedSignalLabel(projectionLookup, a).localeCompare(resolvedProjectedSignalLabel(projectionLookup, b)));

  return {
    inputs: projectedInputs,
    inputRoles,
    stateVars: projectedStateVars,
    outputGates: projectedOutputGates,
    isProjectedFsmView: true,
    projectionStatus: batchResolution.mode === 'legacy' ? 'legacy_projected' : 'projected',
  };
}

export function buildSequentialProjectionChannels(circuit: Circuit): ProjectedSignalChannel[] {
  const projectionLookup = getProjectionLookup(circuit);
  const batchResolution = getProjectionBatchResolution(circuit, projectionLookup);
  const batchId = batchResolution.batchId;
  if (!batchId) return [];
  if (hasLegacyProjectionContractViolation(circuit, projectionLookup, batchId)) return [];

  const connectedIds = getConnectedGateIds(circuit);
  const connectedGates = Object.values(circuit.gates).filter((gate) => connectedIds.has(gate.id));
  const hasMixedUserInputs = connectedGates
    .filter((gate) => USER_INPUT_TYPES.has(gate.typeId))
    .some((gate) => !isCanonicalInputProjection(projectionLookup, gate, batchId));
  if (hasMixedUserInputs) return [];

  const hasMixedOutputs = connectedGates
    .filter((gate) => OUTPUT_TYPES.has(gate.typeId))
    .some((gate) => !isCoveredOutputProjection(projectionLookup, gate, batchId));
  if (hasMixedOutputs) return [];

  const hasMixedStatefulGates = connectedGates
    .filter((gate) => isStateCarrierGate(gate, projectionLookup, batchId))
    .some((gate) => {
      const projection = getResolvedProjection(projectionLookup, gate);
      return !projection
        || projection.sourceSystem !== 'fsm_synth'
        || projection.visibility !== 'canonical'
        || projection.role !== 'state'
        || projection.projectionBatchId !== batchId;
    });
  if (hasMixedStatefulGates) return [];

  const annotatedGates = getAnnotatedConnectedGates(circuit).filter((gate) =>
    matchesBatchId({ ...gate, projection: projectionLookup.get(gate.id) ?? gate.projection }, batchId),
  );
  if (annotatedGates.length === 0) return [];

  const channels: ProjectedSignalChannel[] = [];
  for (const gate of annotatedGates) {
    if (SKIP_TYPES.has(gate.typeId)) continue;
    const projection = projectionLookup.get(gate.id) ?? gate.projection;
    if (!(INPUT_TYPES.has(gate.typeId) || OUTPUT_TYPES.has(gate.typeId) || projection)) continue;
    if (!projection || projection.visibility !== 'canonical') continue;

    const portId = resolveProjectedPortId(gate, projection);
    if (!portId) continue;

    channels.push({
      key: `${gate.id}:${portId}`,
      label: projection.signalLabel || fallbackGateLabel(gate),
      color: channelColor(projection.role),
      gateId: gate.id,
      portId,
      role: projection.role,
      visibility: projection.visibility,
      groupKey: projection.groupKey,
    });
  }

  channels.sort((a, b) => {
    const prio = rolePriority(a.role) - rolePriority(b.role);
    if (prio !== 0) return prio;
    return a.label.localeCompare(b.label);
  });

  return channels;
}

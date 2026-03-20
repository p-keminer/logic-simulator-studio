import { gateRegistry } from '../registry/GateRegistry';
import type {
  Circuit,
  GateInstance,
  GateProjectionMetadata,
  ProjectionSignalRole,
  ProjectionVisibility,
} from '../types';

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
}
export interface AnalysisSubsystemOption {
  key: string;
  label: string;
  circuit: Circuit;
  kind: 'projected_fsm' | 'generic';
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

function getConnectedGateIds(circuit: Circuit): Set<string> {
  const ids = new Set<string>();
  for (const wire of Object.values(circuit.wires)) {
    ids.add(wire.from.gateId);
    ids.add(wire.to.gateId);
  }
  return ids;
}

function getConnectedComponents(circuit: Circuit): Set<string>[] {
  const connectedIds = [...getConnectedGateIds(circuit)];
  if (connectedIds.length === 0) return [];

  const adjacency = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    if (!adjacency.has(id)) adjacency.set(id, new Set());
    return adjacency.get(id)!;
  };

  for (const id of connectedIds) ensure(id);

  for (const wire of Object.values(circuit.wires)) {
    ensure(wire.from.gateId).add(wire.to.gateId);
    ensure(wire.to.gateId).add(wire.from.gateId);
  }

  const seen = new Set<string>();
  const components: Set<string>[] = [];
  for (const startId of connectedIds) {
    if (seen.has(startId)) continue;
    const component = new Set<string>();
    const stack = [startId];
    seen.add(startId);

    while (stack.length > 0) {
      const gateId = stack.pop()!;
      component.add(gateId);
      for (const nextId of adjacency.get(gateId) ?? []) {
        if (seen.has(nextId)) continue;
        seen.add(nextId);
        stack.push(nextId);
      }
    }

    components.push(component);
  }

  return components;
}

function buildCircuitSubset(circuit: Circuit, gateIds: Set<string>): Circuit {
  return {
    ...circuit,
    gates: Object.fromEntries(
      Object.entries(circuit.gates)
        .filter(([gateId]) => gateIds.has(gateId))
        .map(([gateId, gate]) => [gateId, { ...gate }]),
    ),
    wires: Object.fromEntries(
      Object.entries(circuit.wires)
        .filter(([, wire]) => gateIds.has(wire.from.gateId) && gateIds.has(wire.to.gateId))
        .map(([wireId, wire]) => [wireId, { ...wire }]),
    ),
  };
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

function parseStateLabel(label: string): number | null {
  const match = label.match(/^Q(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function parseInvertedStateLabel(label: string): number | null {
  const match = label.match(/^!Q(\d+)$/i);
  return match ? Number(match[1]) : null;
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

function buildLegacyFsmProjectionLookup(circuit: Circuit): ProjectionLookup {
  const explicitProjectedGates = Object.values(circuit.gates).filter(
    (gate) => gate.projection?.sourceSystem === 'fsm_synth',
  );
  if (explicitProjectedGates.length > 0) return new Map();

  const connectedIds = getConnectedGateIds(circuit);
  const connectedGates = Object.values(circuit.gates).filter((gate) => connectedIds.has(gate.id));
  if (connectedGates.length === 0) return new Map();

  const clockGates = connectedGates.filter((gate) => gate.typeId === 'CLOCK' && trimLabel(gate) === 'CLK');
  const resetGates = connectedGates.filter((gate) => gate.typeId === 'INPUT_SWITCH' && trimLabel(gate) === 'RST');
  if (clockGates.length !== 1 || resetGates.length !== 1) return new Map();

  const stateEntries = connectedGates
    .map((gate) => ({ gate, index: parseStateLabel(trimLabel(gate)) }))
    .filter((entry): entry is { gate: GateInstance; index: number } => entry.gate.typeId === 'D_FF_R' && entry.index !== null)
    .sort((a, b) => a.index - b.index);
  if (stateEntries.length === 0) return new Map();
  if (stateEntries.some((entry, index) => entry.index !== index)) return new Map();

  const stateLabelSet = new Set(stateEntries.map((entry) => `Q${entry.index}`));
  const inputGates = connectedGates.filter((gate) =>
    gate.typeId === 'INPUT_SWITCH'
    && trimLabel(gate) !== 'RST'
    && !stateLabelSet.has(trimLabel(gate)),
  );

  const lookup: ProjectionLookup = new Map();
  lookup.set(clockGates[0].id, buildProjection(LEGACY_BATCH_ID, 'clock', 'canonical', 'CLK', 'clock:CLK', 'clk'));
  lookup.set(resetGates[0].id, buildProjection(LEGACY_BATCH_ID, 'reset', 'canonical', 'RST', 'reset:RST', 'out'));

  for (const gate of inputGates) {
    const label = trimLabel(gate);
    if (!label) return new Map();
    lookup.set(gate.id, buildProjection(LEGACY_BATCH_ID, 'input', 'canonical', label, `input:${label}`, 'out'));
  }

  for (const { gate, index } of stateEntries) {
    const label = `Q${index}`;
    lookup.set(gate.id, buildProjection(LEGACY_BATCH_ID, 'state', 'canonical', label, `state:${label}`, 'q'));
  }

  for (const gate of connectedGates) {
    const label = trimLabel(gate);
    const invertedStateIndex = parseInvertedStateLabel(label);
    if (gate.typeId === 'NOT' && invertedStateIndex !== null && stateLabelSet.has(`Q${invertedStateIndex}`)) {
      lookup.set(gate.id, buildProjection(LEGACY_BATCH_ID, 'state_inverted', 'derived', label, `state:Q${invertedStateIndex}`));
      continue;
    }

    if (gate.typeId === 'OUTPUT_LED') {
      const stateIndex = parseStateLabel(label);
      if (stateIndex !== null && stateLabelSet.has(`Q${stateIndex}`)) {
        lookup.set(gate.id, buildProjection(LEGACY_BATCH_ID, 'display_mirror', 'derived', label, `state:${label}`, '_display'));
        continue;
      }

      if (label) {
        lookup.set(gate.id, buildProjection(LEGACY_BATCH_ID, 'output', 'canonical', label, `output:${label}`, '_display'));
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

const LEGACY_BATCH_ID = 'legacy:fsm_synth';

const USER_INPUT_TYPES = new Set(['INPUT_SWITCH', 'PUSH_BTN', 'CLOCK']);

function matchesBatchId(gate: GateInstance, batchId: string): boolean {
  const projection = gate.projection;
  if (!projection) return batchId === LEGACY_BATCH_ID;
  if (batchId === LEGACY_BATCH_ID) {
    return !projection.projectionBatchId || projection.projectionBatchId === LEGACY_BATCH_ID;
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

  if (batchIds.size === 0 && hasMissingBatchId) {
    return { batchId: LEGACY_BATCH_ID, mode: 'legacy' };
  }

  return { batchId: null, mode: 'mixed' };
}

export function getProjectedFsmBatchId(circuit: Circuit): string | null {
  const projectionLookup = getProjectionLookup(circuit);
  return getProjectionBatchResolution(circuit, projectionLookup).batchId;
}

export function buildProjectedFsmSubsystemOptions(circuit: Circuit): ProjectedFsmSubsystemOption[] {
  const projectionLookup = getProjectionLookup(circuit);
  const options: ProjectedFsmSubsystemOption[] = [];

  for (const gateIds of getConnectedComponents(circuit)) {
    const componentGates = [...gateIds]
      .map((gateId) => circuit.gates[gateId])
      .filter((gate): gate is GateInstance => Boolean(gate));

    const projectedGates = componentGates.filter((gate) => {
      const projection = projectionLookup.get(gate.id) ?? gate.projection;
      return projection?.sourceSystem === 'fsm_synth';
    });
    if (projectedGates.length === 0) continue;

    const batchIds = new Set(
      projectedGates
        .map((gate) => (projectionLookup.get(gate.id) ?? gate.projection)?.projectionBatchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    );
    const hasMissingBatchId = projectedGates.some((gate) => !((projectionLookup.get(gate.id) ?? gate.projection)?.projectionBatchId));
    if (batchIds.size !== 1 || hasMissingBatchId) continue;

    const batchId = [...batchIds][0]!;
    const subcircuit = buildCircuitSubset(circuit, gateIds);
    const projected = buildProjectedSequentialSttGates(subcircuit);
    if (!projected || projected.inputs.length === 0 || projected.outputs.length === 0) continue;

    const inputLabels = projected.inputs.map((gate) => getProjectedSignalLabel(gate));
    const outputLabels = projected.outputs.map((gate) => getProjectedSignalLabel(gate));
    const label = outputLabels[0]
      ?? inputLabels.find((entry) => entry !== 'CLK' && entry !== 'RST')
      ?? `FSM ${options.length + 1}`;

    const nextOption: ProjectedFsmSubsystemOption = {
      key: batchId,
      batchId,
      label,
      circuit: subcircuit,
      inputLabels,
      outputLabels,
    };

    const existingIndex = options.findIndex((option) => option.batchId === batchId);
    if (existingIndex === -1) {
      options.push(nextOption);
      continue;
    }

    const existingGateCount = Object.keys(options[existingIndex].circuit.gates).length;
    const nextGateCount = Object.keys(subcircuit.gates).length;
    if (nextGateCount > existingGateCount) {
      options[existingIndex] = nextOption;
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

export function buildAnalysisSubsystemOptions(circuit: Circuit): AnalysisSubsystemOption[] {
  const projectedOptions = buildProjectedFsmSubsystemOptions(circuit);
  const projectedOptionByBatchId = new Map(projectedOptions.map((option) => [option.batchId, option]));
  const projectionLookup = getProjectionLookup(circuit);

  const options: AnalysisSubsystemOption[] = [];
  let genericIndex = 1;

  for (const gateIds of getConnectedComponents(circuit)) {
    const subcircuit = buildCircuitSubset(circuit, gateIds);
    const connectedIds = getConnectedGateIds(subcircuit);
    const connectedGates = Object.values(subcircuit.gates).filter((gate) => connectedIds.has(gate.id));
    if (connectedGates.length === 0) continue;

    const batchIds = new Set(
      connectedGates
        .map((gate) => (projectionLookup.get(gate.id) ?? gate.projection)?.projectionBatchId)
        .filter((batchId): batchId is string => Boolean(batchId)),
    );

    if (batchIds.size === 1) {
      const projectedOption = projectedOptionByBatchId.get([...batchIds][0]!);
      if (projectedOption) {
        if (options.some((option) => option.key === projectedOption.key)) {
          continue;
        }
        options.push({
          key: projectedOption.key,
          label: projectedOption.label,
          circuit: projectedOption.circuit,
          kind: 'projected_fsm',
        });
        continue;
      }
    }

    options.push({
      key: `system:${genericIndex}`,
      label: buildGenericSubsystemLabel(subcircuit, genericIndex),
      circuit: subcircuit,
      kind: 'generic',
    });
    genericIndex++;
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
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

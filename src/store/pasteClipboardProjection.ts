import type { Circuit, GateInstance, GateProjectionMetadata, Wire } from '../core/types';
import type { ClipboardData, ClipboardProjectionBatchPolicy } from './clipboard';
import { generateId } from '../utils/idGenerator';

type IdFactory = () => string;

interface ProjectionLabelFamily {
  signalLabel: string;
  groupKey: string;
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

function createSignalLabelAllocator(existingCircuit: Circuit) {
  const usedLabels = new Set<string>();

  const remember = (label?: string | null) => {
    const trimmed = label?.trim();
    if (!trimmed) return;
    usedLabels.add(trimmed.toUpperCase());
  };

  for (const gate of Object.values(existingCircuit.gates)) {
    remember(gate.label);
    remember(gate.projection?.signalLabel);
  }

  return (
    baseLabel: string,
    relatedLabelsFactory: (candidate: string) => string[] = (candidate) => [candidate],
  ): string => {
    const trimmed = baseLabel.trim();
    let candidate = trimmed;
    let suffix = 1;

    while (relatedLabelsFactory(candidate).some((label) => usedLabels.has(label.toUpperCase()))) {
      candidate = `${trimmed}_${suffix}`;
      suffix++;
    }

    for (const label of relatedLabelsFactory(candidate)) {
      usedLabels.add(label.toUpperCase());
    }
    return candidate;
  };
}

function buildCanonicalGroupKey(role: GateProjectionMetadata['role'], signalLabel: string): string {
  switch (role) {
    case 'clock':
      return `clock:${signalLabel}`;
    case 'reset':
      return `reset:${signalLabel}`;
    case 'input':
      return `input:${signalLabel}`;
    case 'state':
    case 'state_inverted':
    case 'display_mirror':
      return `state:${signalLabel}`;
    case 'output':
      return `output:${signalLabel}`;
    case 'internal_helper':
      return signalLabel;
  }
}

function remapDerivedSignalLabel(projection: GateProjectionMetadata, canonicalLabel: string): string {
  if (projection.role === 'state_inverted') return `!${canonicalLabel}`;
  if (projection.role === 'internal_helper' && projection.signalLabel.startsWith('!')) return `!${canonicalLabel}`;
  return canonicalLabel;
}

function buildProjectionFamiliesForBatch(
  batchGates: GateInstance[],
  allocateLabel: ReturnType<typeof createSignalLabelAllocator>,
): Map<string, ProjectionLabelFamily> {
  const families = new Map<string, ProjectionLabelFamily>();
  const canonicalGates = batchGates
    .filter((gate) => gate.projection?.sourceSystem === 'fsm_synth' && gate.projection.visibility === 'canonical');

  for (const gate of canonicalGates) {
    const projection = gate.projection!;
    if (families.has(projection.groupKey)) continue;

    const needsInversionFamily = projection.role === 'input' || projection.role === 'state';
    const signalLabel = allocateLabel(
      projection.signalLabel,
      needsInversionFamily
        ? (candidate) => [candidate, `!${candidate}`]
        : (candidate) => [candidate],
    );
    families.set(projection.groupKey, {
      signalLabel,
      groupKey: buildCanonicalGroupKey(projection.role, signalLabel),
    });
  }

  return families;
}

export function buildClipboardProjectionBatchPolicies(
  circuit: Circuit,
  selectedGateIds: Set<string>,
): Record<string, ClipboardProjectionBatchPolicy> {
  const policies: Record<string, ClipboardProjectionBatchPolicy> = {};
  const componentByGateId = new Map<string, Set<string>>();

  for (const component of getConnectedComponents(circuit)) {
    for (const gateId of component) componentByGateId.set(gateId, component);
  }

  const selectedProjectedGates = Object.values(circuit.gates).filter((gate) =>
    selectedGateIds.has(gate.id) && gate.projection?.sourceSystem === 'fsm_synth' && gate.projection.projectionBatchId,
  );

  const selectedBatchIds = new Set(
    selectedProjectedGates
      .map((gate) => gate.projection?.projectionBatchId)
      .filter((batchId): batchId is string => Boolean(batchId)),
  );

  for (const batchId of selectedBatchIds) {
    const batchGate = selectedProjectedGates.find((gate) => gate.projection?.projectionBatchId === batchId);
    const component = batchGate ? componentByGateId.get(batchGate.id) : null;
    if (!component) {
      policies[batchId] = 'drop';
      continue;
    }

    const isFullComponentSelection = [...component].every((gateId) => selectedGateIds.has(gateId));
    policies[batchId] = isFullComponentSelection ? 'regenerate' : 'drop';
  }

  return policies;
}

function remapProjectionForPaste(args: {
  gate: GateInstance;
  allocateLabel: ReturnType<typeof createSignalLabelAllocator>;
  batchIdRemap: Map<string, string>;
  familyRemap: Map<string, Map<string, ProjectionLabelFamily>>;
  policies: Record<string, ClipboardProjectionBatchPolicy>;
}): Pick<GateInstance, 'label' | 'projection'> {
  const { gate, allocateLabel, batchIdRemap, familyRemap, policies } = args;
  const projection = gate.projection;
  if (!projection || projection.sourceSystem !== 'fsm_synth' || !projection.projectionBatchId) {
    return {
      label: gate.label?.trim() ? allocateLabel(gate.label) : gate.label,
      projection: gate.projection,
    };
  }

  const policy = policies[projection.projectionBatchId] ?? 'drop';
  if (policy !== 'regenerate') {
    const baseLabel = gate.label?.trim() || projection.signalLabel || gate.typeId;
    return {
      label: allocateLabel(baseLabel),
      projection: undefined,
    };
  }

  const nextBatchId = batchIdRemap.get(projection.projectionBatchId) ?? projection.projectionBatchId;
  const families = familyRemap.get(projection.projectionBatchId) ?? new Map();
  const canonicalFamily = families.get(projection.groupKey);

  const signalLabel = canonicalFamily
    ? remapDerivedSignalLabel(projection, canonicalFamily.signalLabel)
    : allocateLabel(projection.signalLabel || gate.label || gate.typeId);
  const groupKey = canonicalFamily?.groupKey ?? projection.groupKey;

  return {
    label: signalLabel,
    projection: {
      ...projection,
      projectionBatchId: nextBatchId,
      signalLabel,
      groupKey,
    },
  };
}

export function buildPastedClipboardContent(args: {
  clipboard: ClipboardData;
  existingCircuit: Circuit;
  offsetX: number;
  offsetY: number;
  createId?: IdFactory;
}): { gates: GateInstance[]; wires: Wire[] } {
  const { clipboard, existingCircuit, offsetX, offsetY } = args;
  const createId = args.createId ?? generateId;
  const allocateLabel = createSignalLabelAllocator(existingCircuit);
  const idMap = new Map<string, string>();
  for (const gate of clipboard.gates) idMap.set(gate.id, createId());

  const policies = clipboard.fsmProjectionBatchPolicies ?? {};
  const batchIdRemap = new Map<string, string>();
  const familyRemap = new Map<string, Map<string, ProjectionLabelFamily>>();

  const pastedProjectedBatches = new Set(
    clipboard.gates
      .map((gate) => gate.projection?.projectionBatchId)
      .filter((batchId): batchId is string => Boolean(batchId)),
  );

  for (const batchId of pastedProjectedBatches) {
    if ((policies[batchId] ?? 'drop') !== 'regenerate') continue;
    batchIdRemap.set(batchId, createId());
    const batchGates = clipboard.gates.filter((gate) => gate.projection?.projectionBatchId === batchId);
    familyRemap.set(batchId, buildProjectionFamiliesForBatch(batchGates, allocateLabel));
  }

  const gates = clipboard.gates.map((gate) => {
    const remapped = remapProjectionForPaste({
      gate,
      allocateLabel,
      batchIdRemap,
      familyRemap,
      policies,
    });
    return {
      ...gate,
      ...remapped,
      id: idMap.get(gate.id)!,
      x: gate.x + offsetX,
      y: gate.y + offsetY,
      isSelected: true,
      outputSignals: Object.fromEntries(
        Object.keys(gate.outputSignals).map((portId) => [portId, { value: 0 as 0 | 1, version: 0, lastChangedAt: 0 }]),
      ),
    };
  });

  const wires = clipboard.wires.map((wire) => ({
    ...wire,
    id: createId(),
    from: { ...wire.from, gateId: idMap.get(wire.from.gateId) ?? wire.from.gateId },
    to: { ...wire.to, gateId: idMap.get(wire.to.gateId) ?? wire.to.gateId },
    isSelected: false,
  }));

  return { gates, wires };
}

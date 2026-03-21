import { gateRegistry } from '../registry/GateRegistry';
import type { GateDefinition, GateInstance, GateTypeId } from '../types';

const SEQUENTIAL_CATEGORIES = new Set<GateDefinition['category']>([
  'flipflop',
  'register',
  'memory',
]);

const RESET_LIKE_PATTERN = /(rst|reset|clr|clear|mr|preset|pre|set)/i;

export type CustomIcExportPolicy =
  | 'flatten_one_level'
  | 'blocked_nested_custom_ic'
  | 'missing_registration'
  | 'missing_export_metadata';

export interface CustomIcInputFanoutTarget {
  innerGateId: string;
  innerGateTypeId: GateTypeId;
  innerPortId: string;
  clockRelevant: boolean;
  resetRelevant: boolean;
}

export interface CustomIcInputPortStructure {
  portId: string;
  inputGateId: string;
  fanout: CustomIcInputFanoutTarget[];
}

export interface CustomIcOutputPortStructure {
  portId: string;
  outputGateId: string;
  driverKind: 'inner_gate' | 'passthrough' | 'missing';
  innerDriverGateId?: string;
  innerDriverGateTypeId?: GateTypeId;
  innerDriverPortId?: string;
  passthroughInputPortId?: string;
}

export interface CustomIcDefinitionStructure {
  typeId: GateTypeId;
  label: string;
  inputGateIds: string[];
  outputGateIds: string[];
  inputPorts: CustomIcInputPortStructure[];
  outputPorts: CustomIcOutputPortStructure[];
  innerGateIds: string[];
  innerGateTypeIds: GateTypeId[];
  sequentialInnerGateIds: string[];
  nestedCustomGateIds: string[];
  nestedCustomTypeIds: GateTypeId[];
  clockRelevantInputPortIds: string[];
  resetRelevantInputPortIds: string[];
  stateful: boolean;
  maxHierarchyDepth: number;
  exportPolicy: CustomIcExportPolicy;
  exportBlockReason?: string;
}

export interface CustomIcGateStructure extends CustomIcDefinitionStructure {
  gateId: string;
  instanceLabel?: string;
}

function isIntrinsicStatefulDefinition(definition: GateDefinition): boolean {
  return (
    SEQUENTIAL_CATEGORIES.has(definition.category) ||
    Boolean(definition.stateKeys?.length) ||
    Boolean(definition.stateInit)
  );
}

function isResetLikeInput(definition: GateDefinition, portId: string): boolean {
  const port = definition.inputs.find((input) => input.id === portId);
  const probe = `${portId} ${port?.label ?? ''}`;
  return RESET_LIKE_PATTERN.test(probe);
}

function fallbackStructure(
  typeId: GateTypeId,
  label: string,
  exportPolicy: CustomIcExportPolicy,
  exportBlockReason?: string,
): CustomIcDefinitionStructure {
  return {
    typeId,
    label,
    inputGateIds: [],
    outputGateIds: [],
    inputPorts: [],
    outputPorts: [],
    innerGateIds: [],
    innerGateTypeIds: [],
    sequentialInnerGateIds: [],
    nestedCustomGateIds: [],
    nestedCustomTypeIds: [],
    clockRelevantInputPortIds: [],
    resetRelevantInputPortIds: [],
    stateful: false,
    maxHierarchyDepth: 1,
    exportPolicy,
    exportBlockReason,
  };
}

function analyzeCustomIcDefinitionInternal(
  definition: GateDefinition,
  ancestry: Set<GateTypeId>,
): CustomIcDefinitionStructure {
  const meta = definition.customIC;
  if (!meta) {
    return fallbackStructure(
      definition.typeId,
      definition.label,
      'missing_export_metadata',
      `Custom IC "${definition.typeId}" is missing export metadata.`,
    );
  }

  const nextAncestry = new Set(ancestry);
  nextAncestry.add(definition.typeId);

  const inputPortIdsByGateId = new Map<string, string>();
  meta.inputGateIds.forEach((inputGateId, index) => {
    inputPortIdsByGateId.set(inputGateId, `i${index}`);
  });

  const innerGateEntries = Object.entries(meta.subcircuit.gates).filter(([, gate]) => (
    gate.typeId !== 'INPUT_SWITCH' && gate.typeId !== 'OUTPUT_LED'
  ));

  const inputPorts: CustomIcInputPortStructure[] = [];
  const outputPorts: CustomIcOutputPortStructure[] = [];
  const sequentialInnerGateIds: string[] = [];
  const nestedCustomGateIds: string[] = [];
  const nestedCustomTypeIds: GateTypeId[] = [];
  const clockRelevantInputPortIds = new Set<string>();
  const resetRelevantInputPortIds = new Set<string>();
  const innerGateIds = innerGateEntries.map(([gateId]) => gateId);
  const innerGateTypeIds = innerGateEntries.map(([, gate]) => gate.typeId);

  let stateful = false;
  let maxHierarchyDepth = 1;

  for (const [innerGateId, innerGate] of innerGateEntries) {
    if (!gateRegistry.has(innerGate.typeId)) continue;
    const innerDefinition = gateRegistry.get(innerGate.typeId);

    if (innerDefinition.category === 'custom' && innerDefinition.customIC) {
      nestedCustomGateIds.push(innerGateId);
      nestedCustomTypeIds.push(innerGate.typeId);

      if (!nextAncestry.has(innerDefinition.typeId)) {
        const nestedStructure = analyzeCustomIcDefinitionInternal(innerDefinition, nextAncestry);
        stateful = stateful || nestedStructure.stateful;
        maxHierarchyDepth = Math.max(maxHierarchyDepth, nestedStructure.maxHierarchyDepth + 1);
      } else {
        maxHierarchyDepth = Math.max(maxHierarchyDepth, 2);
      }
      continue;
    }

    if (isIntrinsicStatefulDefinition(innerDefinition)) {
      stateful = true;
      sequentialInnerGateIds.push(innerGateId);
    }
  }

  meta.inputGateIds.forEach((inputGateId, index) => {
    const portId = `i${index}`;
    const fanout = Object.values(meta.subcircuit.wires)
      .filter((wire) => wire.from.gateId === inputGateId && wire.from.portId === 'out')
      .map((wire) => {
        const innerGate = meta.subcircuit.gates[wire.to.gateId];
        const innerDefinition = gateRegistry.has(innerGate.typeId)
          ? gateRegistry.get(innerGate.typeId)
          : null;
        let clockRelevant = innerDefinition?.clockInputId === wire.to.portId;
        let resetRelevant = innerDefinition ? isResetLikeInput(innerDefinition, wire.to.portId) : false;

        if (innerDefinition?.category === 'custom' && innerDefinition.customIC && !nextAncestry.has(innerDefinition.typeId)) {
          const nestedStructure = analyzeCustomIcDefinitionInternal(innerDefinition, nextAncestry);
          clockRelevant = clockRelevant || nestedStructure.clockRelevantInputPortIds.includes(wire.to.portId);
          resetRelevant = resetRelevant || nestedStructure.resetRelevantInputPortIds.includes(wire.to.portId);
          maxHierarchyDepth = Math.max(maxHierarchyDepth, nestedStructure.maxHierarchyDepth + 1);
        }

        if (clockRelevant) clockRelevantInputPortIds.add(portId);
        if (resetRelevant) resetRelevantInputPortIds.add(portId);

        return {
          innerGateId: wire.to.gateId,
          innerGateTypeId: innerGate.typeId,
          innerPortId: wire.to.portId,
          clockRelevant,
          resetRelevant,
        };
      })
      .filter((target) => target.innerGateTypeId !== 'OUTPUT_LED');

    inputPorts.push({
      portId,
      inputGateId,
      fanout,
    });
  });

  meta.outputGateIds.forEach((outputGateId, index) => {
    const portId = `o${index}`;
    const driver = Object.values(meta.subcircuit.wires).find((wire) => (
      wire.to.gateId === outputGateId && wire.to.portId === 'in'
    ));

    if (!driver) {
      outputPorts.push({
        portId,
        outputGateId,
        driverKind: 'missing',
      });
      return;
    }

    const passthroughInputPortId = inputPortIdsByGateId.get(driver.from.gateId);
    if (passthroughInputPortId) {
      outputPorts.push({
        portId,
        outputGateId,
        driverKind: 'passthrough',
        passthroughInputPortId,
      });
      return;
    }

    const sourceGate = meta.subcircuit.gates[driver.from.gateId];
    outputPorts.push({
      portId,
      outputGateId,
      driverKind: 'inner_gate',
      innerDriverGateId: driver.from.gateId,
      innerDriverGateTypeId: sourceGate?.typeId,
      innerDriverPortId: driver.from.portId,
    });
  });

  const uniqueNestedTypeIds = [...new Set(nestedCustomTypeIds)];
  const exportPolicy: CustomIcExportPolicy = uniqueNestedTypeIds.length > 0
    ? 'blocked_nested_custom_ic'
    : 'flatten_one_level';

  return {
    typeId: definition.typeId,
    label: definition.label,
    inputGateIds: [...meta.inputGateIds],
    outputGateIds: [...meta.outputGateIds],
    inputPorts,
    outputPorts,
    innerGateIds,
    innerGateTypeIds,
    sequentialInnerGateIds,
    nestedCustomGateIds,
    nestedCustomTypeIds: uniqueNestedTypeIds,
    clockRelevantInputPortIds: [...clockRelevantInputPortIds],
    resetRelevantInputPortIds: [...resetRelevantInputPortIds],
    stateful,
    maxHierarchyDepth,
    exportPolicy,
    exportBlockReason: uniqueNestedTypeIds.length > 0
      ? `Nested custom IC "${uniqueNestedTypeIds[0]}" inside "${definition.typeId}" is not supported for HDL export.`
      : undefined,
  };
}

export function analyzeCustomIcDefinition(definition: GateDefinition): CustomIcDefinitionStructure {
  return analyzeCustomIcDefinitionInternal(definition, new Set());
}

export function analyzeCustomIcGate(gate: GateInstance): CustomIcGateStructure {
  if (!gateRegistry.has(gate.typeId)) {
    return {
      gateId: gate.id,
      instanceLabel: gate.label,
      ...fallbackStructure(
        gate.typeId,
        gate.label ?? gate.typeId,
        'missing_registration',
        `Custom IC "${gate.typeId}" is not registered. Reload saved custom ICs before exporting.`,
      ),
    };
  }

  const definition = gateRegistry.get(gate.typeId);
  if (definition.category !== 'custom') {
    throw new Error(`Gate "${gate.typeId}" is not a custom IC.`);
  }

  return {
    gateId: gate.id,
    instanceLabel: gate.label,
    ...analyzeCustomIcDefinition(definition),
  };
}

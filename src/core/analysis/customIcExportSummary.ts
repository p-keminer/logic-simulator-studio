import { gateRegistry } from '../registry/GateRegistry';
import type { Circuit, GateInstance, GateTypeId } from '../types';
import { getCustomIcGatePolicy, type CustomIcBoundaryPolicy } from './customIcPolicy';
import { analyzeCustomIcGate } from './customIcStructure';

export interface CustomIcExportBoundarySummary {
  gateId: string;
  typeId: GateTypeId;
  instanceLabel?: string;
  boundaryPolicy: CustomIcBoundaryPolicy;
  exportAllowed: boolean;
  exportReason?: string;
  stateful: boolean;
  maxHierarchyDepth: number;
  nestedCustomTypeIds: GateTypeId[];
}

export interface CustomIcExportSummary {
  totalCustomIcInstances: number;
  exportableInstanceCount: number;
  blockedInstanceCount: number;
  statefulInstanceCount: number;
  combinationalInstanceCount: number;
  maxHierarchyDepth: number;
  nestedCustomTypeIds: GateTypeId[];
  blockedReasons: string[];
  boundaries: CustomIcExportBoundarySummary[];
}

function isCustomIcGate(gate: GateInstance): boolean {
  if (gate.typeId.startsWith('CIC_')) return true;
  if (!gateRegistry.has(gate.typeId)) return false;
  return gateRegistry.get(gate.typeId).category === 'custom';
}

export function analyzeCircuitCustomIcExportSummary(circuit: Circuit): CustomIcExportSummary {
  const boundaries = Object.values(circuit.gates)
    .filter(isCustomIcGate)
    .map((gate) => {
      const policy = getCustomIcGatePolicy(gate);
      const structure = analyzeCustomIcGate(gate);

      return {
        gateId: gate.id,
        typeId: gate.typeId,
        instanceLabel: gate.label?.trim() || undefined,
        boundaryPolicy: policy.boundaryPolicy,
        exportAllowed: policy.exportAllowed,
        exportReason: policy.exportReason,
        stateful: policy.stateful,
        maxHierarchyDepth: structure.maxHierarchyDepth,
        nestedCustomTypeIds: structure.nestedCustomTypeIds,
      } satisfies CustomIcExportBoundarySummary;
    })
    .sort((left, right) => left.gateId.localeCompare(right.gateId));

  const blockedReasons = [...new Set(
    boundaries
      .map((boundary) => boundary.exportReason)
      .filter((reason): reason is string => Boolean(reason)),
  )];

  const nestedCustomTypeIds = [...new Set(
    boundaries.flatMap((boundary) => boundary.nestedCustomTypeIds),
  )].sort((left, right) => left.localeCompare(right));

  return {
    totalCustomIcInstances: boundaries.length,
    exportableInstanceCount: boundaries.filter((boundary) => boundary.exportAllowed).length,
    blockedInstanceCount: boundaries.filter((boundary) => !boundary.exportAllowed).length,
    statefulInstanceCount: boundaries.filter((boundary) => boundary.stateful).length,
    combinationalInstanceCount: boundaries.filter((boundary) => !boundary.stateful).length,
    maxHierarchyDepth: boundaries.reduce(
      (maxDepth, boundary) => Math.max(maxDepth, boundary.maxHierarchyDepth),
      0,
    ),
    nestedCustomTypeIds,
    blockedReasons,
    boundaries,
  };
}

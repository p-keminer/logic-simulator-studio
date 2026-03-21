import { gateRegistry } from '../registry/GateRegistry';
import type { Circuit, GateInstance, GateTypeId } from '../types';
import { analyzeCustomIcGateContract } from './customIcContract';
import { analyzeCustomIcGate } from './customIcStructure';

export type CustomIcNestedReadiness =
  | 'eligible_combinational'
  | 'eligible_stateful'
  | 'degraded_contract'
  | 'blocked_contract'
  | 'blocked_existing_nested';

export interface CustomIcGateNestedReadiness {
  gateId: string;
  typeId: GateTypeId;
  instanceLabel?: string;
  readiness: CustomIcNestedReadiness;
  eligibleForFutureNesting: boolean;
  reason?: string;
  contractStatus: 'canonical' | 'degraded' | 'blocked';
  stateful: boolean;
  clockRelevantInputPortIds: string[];
  resetRelevantInputPortIds: string[];
  nestedCustomTypeIds: GateTypeId[];
}

export interface CustomIcNestedReadinessSummary {
  totalCustomIcInstances: number;
  eligibleCombinationalCount: number;
  eligibleStatefulCount: number;
  degradedCount: number;
  blockedContractCount: number;
  blockedExistingNestedCount: number;
  maxHierarchyDepth: number;
  degradedReasons: string[];
  blockedReasons: string[];
  boundaries: CustomIcGateNestedReadiness[];
}

function isCustomIcGate(gate: GateInstance): boolean {
  if (gate.typeId.startsWith('CIC_')) return true;
  if (!gateRegistry.has(gate.typeId)) return false;
  return gateRegistry.get(gate.typeId).category === 'custom';
}

function pickPrimaryReason(gate: GateInstance): string | undefined {
  const contract = analyzeCustomIcGateContract(gate);
  return contract.issues.find((issue) => issue.severity === 'error' || issue.severity === 'warning')?.message;
}

export function analyzeCustomIcGateNestingReadiness(gate: GateInstance): CustomIcGateNestedReadiness {
  const structure = analyzeCustomIcGate(gate);
  const contract = analyzeCustomIcGateContract(gate);

  let readiness: CustomIcNestedReadiness;
  if (structure.nestedCustomTypeIds.length > 0) {
    readiness = 'blocked_existing_nested';
  } else if (contract.status === 'blocked') {
    readiness = 'blocked_contract';
  } else if (contract.status === 'degraded') {
    readiness = 'degraded_contract';
  } else if (structure.stateful) {
    readiness = 'eligible_stateful';
  } else {
    readiness = 'eligible_combinational';
  }

  const reason = pickPrimaryReason(gate);

  return {
    gateId: gate.id,
    typeId: gate.typeId,
    instanceLabel: gate.label?.trim() || undefined,
    readiness,
    eligibleForFutureNesting: readiness === 'eligible_combinational' || readiness === 'eligible_stateful',
    reason,
    contractStatus: contract.status,
    stateful: structure.stateful,
    clockRelevantInputPortIds: structure.clockRelevantInputPortIds,
    resetRelevantInputPortIds: structure.resetRelevantInputPortIds,
    nestedCustomTypeIds: structure.nestedCustomTypeIds,
  };
}

export function analyzeCircuitCustomIcNestingReadiness(circuit: Circuit): CustomIcNestedReadinessSummary {
  const boundaries = Object.values(circuit.gates)
    .filter(isCustomIcGate)
    .map((gate) => analyzeCustomIcGateNestingReadiness(gate))
    .sort((left, right) => left.gateId.localeCompare(right.gateId));

  const degradedReasons = [...new Set(
    boundaries
      .filter((boundary) => boundary.readiness === 'degraded_contract')
      .map((boundary) => boundary.reason)
      .filter((reason): reason is string => Boolean(reason)),
  )];

  const blockedReasons = [...new Set(
    boundaries
      .filter((boundary) => boundary.readiness === 'blocked_contract' || boundary.readiness === 'blocked_existing_nested')
      .map((boundary) => boundary.reason)
      .filter((reason): reason is string => Boolean(reason)),
  )];

  const maxHierarchyDepth = Object.values(circuit.gates)
    .filter(isCustomIcGate)
    .reduce((maxDepth, gate) => Math.max(maxDepth, analyzeCustomIcGate(gate).maxHierarchyDepth), 0);

  return {
    totalCustomIcInstances: boundaries.length,
    eligibleCombinationalCount: boundaries.filter((boundary) => boundary.readiness === 'eligible_combinational').length,
    eligibleStatefulCount: boundaries.filter((boundary) => boundary.readiness === 'eligible_stateful').length,
    degradedCount: boundaries.filter((boundary) => boundary.readiness === 'degraded_contract').length,
    blockedContractCount: boundaries.filter((boundary) => boundary.readiness === 'blocked_contract').length,
    blockedExistingNestedCount: boundaries.filter((boundary) => boundary.readiness === 'blocked_existing_nested').length,
    maxHierarchyDepth,
    degradedReasons,
    blockedReasons,
    boundaries,
  };
}

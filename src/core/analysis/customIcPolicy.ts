import type { Circuit, GateInstance, GateTypeId } from '../types';
import { analyzeCustomIcGateContract } from './customIcContract';
import {
  analyzeCustomIcGateNestedAllowPolicy,
  type CustomIcFutureNestedPolicy,
} from './customIcNestedAllowPolicy';
import { analyzeCustomIcGateNestingReadiness, type CustomIcNestedReadiness } from './customIcNestingReadiness';
import { analyzeCustomIcGate, type CustomIcExportPolicy } from './customIcStructure';

export type CustomIcBoundaryPolicy =
  | 'one_level_combinational'
  | 'one_level_stateful'
  | 'nested_combinational'
  | 'nested_blocked'
  | 'contract_blocked';

export interface CustomIcGatePolicy {
  gateId: string;
  typeId: GateTypeId;
  runtimePolicy: 'recursive_subcircuit';
  boundaryPolicy: CustomIcBoundaryPolicy;
  exportPolicy: CustomIcExportPolicy;
  exportAllowed: boolean;
  exportReason?: string;
  nestedCustomTypeIds: GateTypeId[];
  stateful: boolean;
  nestedReadiness: CustomIcNestedReadiness;
  nestedReadinessReason?: string;
  futureNestedPolicy: CustomIcFutureNestedPolicy;
  futureNestedRegistrationAllowed: boolean;
  futureNestedExportAllowed: boolean;
  futureNestedReason?: string;
  requiresStatefulBoundaryHandling: boolean;
}

export interface CustomIcEditorSavePolicy {
  allowed: boolean;
  policy: 'allow_one_level' | 'allow_nested_combinational' | 'block_nested_custom_ic';
  reason?: string;
  customGateCount: number;
  customGateTypeIds: GateTypeId[];
}

export function getCustomIcGatePolicy(gate: GateInstance): CustomIcGatePolicy {
  const contract = analyzeCustomIcGateContract(gate);
  const nestedAllowPolicy = analyzeCustomIcGateNestedAllowPolicy(gate);
  const nestedReadiness = analyzeCustomIcGateNestingReadiness(gate);
  const structure = analyzeCustomIcGate(gate);
  const hasNestedCustomChildren = contract.nestedCustomTypeIds.length > 0;
  const boundaryPolicy: CustomIcBoundaryPolicy = hasNestedCustomChildren && contract.exportAllowed
    ? 'nested_combinational'
    : hasNestedCustomChildren
      ? 'nested_blocked'
    : !contract.exportAllowed
      ? 'contract_blocked'
    : structure.stateful
      ? 'one_level_stateful'
      : 'one_level_combinational';
  const exportAllowed = contract.exportAllowed && (
    structure.exportPolicy === 'flatten_one_level' ||
    boundaryPolicy === 'nested_combinational'
  );

  return {
    gateId: gate.id,
    typeId: gate.typeId,
    runtimePolicy: 'recursive_subcircuit',
    boundaryPolicy,
    exportPolicy: structure.exportPolicy,
    exportAllowed,
    exportReason: exportAllowed ? undefined : (contract.exportBlockReason ?? structure.exportBlockReason),
    nestedCustomTypeIds: structure.nestedCustomTypeIds,
    stateful: structure.stateful,
    nestedReadiness: nestedReadiness.readiness,
    nestedReadinessReason: nestedReadiness.reason,
    futureNestedPolicy: nestedAllowPolicy.futureNestedPolicy,
    futureNestedRegistrationAllowed: nestedAllowPolicy.futureNestedRegistrationAllowed,
    futureNestedExportAllowed: nestedAllowPolicy.futureNestedExportAllowed,
    futureNestedReason: nestedAllowPolicy.futureNestedReason,
    requiresStatefulBoundaryHandling: nestedAllowPolicy.requiresStatefulBoundaryHandling,
  };
}

export function getCustomIcEditorSavePolicy(circuit: Circuit): CustomIcEditorSavePolicy {
  const customGates = Object.values(circuit.gates).filter((gate) => gate.typeId.startsWith('CIC_'));
  const customGateTypeIds = [...new Set(customGates.map((gate) => gate.typeId))];

  if (customGateTypeIds.length === 0) {
    return {
      allowed: true,
      policy: 'allow_one_level',
      customGateCount: 0,
      customGateTypeIds: [],
    };
  }

  const gatePolicies = customGates.map((gate) => getCustomIcGatePolicy(gate));
  const statefulNestedCandidate = gatePolicies.find((policy) => policy.futureNestedPolicy === 'allow_stateful');
  if (statefulNestedCandidate) {
    return {
      allowed: false,
      policy: 'block_nested_custom_ic',
      reason: `Die Schaltung enthält mit "${statefulNestedCandidate.typeId}" bereits ein sequentielles Custom IC. Der aktuelle Nested-Rollout erlaubt nur kanonische kombinatorische Custom-IC-Kinder.`,
      customGateCount: customGateTypeIds.length,
      customGateTypeIds,
    };
  }

  const blockedNestedCandidate = gatePolicies.find((policy) => policy.futureNestedPolicy !== 'allow_combinational');
  if (blockedNestedCandidate) {
    return {
      allowed: false,
      policy: 'block_nested_custom_ic',
      reason: blockedNestedCandidate.futureNestedReason
        ? `Die Schaltung enthält mit "${blockedNestedCandidate.typeId}" kein kanonisches kombinatorisches Nested-Custom-IC. ${blockedNestedCandidate.futureNestedReason}`
        : 'Die Schaltung enthält bereits ein Custom IC, das nicht innerhalb des aktuellen Nested-Rollouts liegt. Freigegeben sind im Moment nur kanonische kombinatorische Nested-Custom-IC-Kinder.',
      customGateCount: customGateTypeIds.length,
      customGateTypeIds,
    };
  }

  return {
    allowed: true,
    policy: 'allow_nested_combinational',
    reason: 'Die Schaltung enthält nur kanonische kombinatorische Custom ICs. Genau dieser direkte Nested-Fall ist im aktuellen Rollout freigegeben und wird beim HDL-Export rekursiv strukturell aufgelöst.',
    customGateCount: customGateTypeIds.length,
    customGateTypeIds,
  };
}

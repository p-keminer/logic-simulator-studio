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
  policy: 'allow_one_level' | 'block_nested_custom_ic';
  reason?: string;
  customGateCount: number;
  customGateTypeIds: GateTypeId[];
}

export function getCustomIcGatePolicy(gate: GateInstance): CustomIcGatePolicy {
  const contract = analyzeCustomIcGateContract(gate);
  const nestedAllowPolicy = analyzeCustomIcGateNestedAllowPolicy(gate);
  const nestedReadiness = analyzeCustomIcGateNestingReadiness(gate);
  const structure = analyzeCustomIcGate(gate);
  const boundaryPolicy: CustomIcBoundaryPolicy = contract.nestedCustomTypeIds.length > 0
    ? 'nested_blocked'
    : !contract.exportAllowed
      ? 'contract_blocked'
    : structure.stateful
      ? 'one_level_stateful'
      : 'one_level_combinational';

  return {
    gateId: gate.id,
    typeId: gate.typeId,
    runtimePolicy: 'recursive_subcircuit',
    boundaryPolicy,
    exportPolicy: structure.exportPolicy,
    exportAllowed: contract.exportAllowed && structure.exportPolicy === 'flatten_one_level',
    exportReason: contract.exportBlockReason ?? structure.exportBlockReason,
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
  const customGateTypeIds = [...new Set(
    Object.values(circuit.gates)
      .filter((gate) => gate.typeId.startsWith('CIC_'))
      .map((gate) => gate.typeId),
  )];

  if (customGateTypeIds.length === 0) {
    return {
      allowed: true,
      policy: 'allow_one_level',
      customGateCount: 0,
      customGateTypeIds: [],
    };
  }

  return {
    allowed: false,
    policy: 'block_nested_custom_ic',
    reason: 'Die Schaltung enthält bereits ein Custom IC. Verschachtelte Custom ICs bleiben vorerst bewusst deaktiviert; kanonisch abgesichert sind aktuell nur one-level Custom-IC-Grenzen.',
    customGateCount: customGateTypeIds.length,
    customGateTypeIds,
  };
}

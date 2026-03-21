import { gateRegistry } from '../registry/GateRegistry';
import type { Circuit, GateInstance, GateTypeId } from '../types';
import {
  analyzeCircuitCustomIcNestingReadiness,
  analyzeCustomIcGateNestingReadiness,
  type CustomIcNestedReadiness,
} from './customIcNestingReadiness';

export type CustomIcFutureNestedPolicy =
  | 'allow_combinational'
  | 'allow_stateful'
  | 'block_degraded_contract'
  | 'block_contract'
  | 'block_existing_nested';

export interface CustomIcGateNestedAllowPolicy {
  gateId: string;
  typeId: GateTypeId;
  instanceLabel?: string;
  readiness: CustomIcNestedReadiness;
  futureNestedPolicy: CustomIcFutureNestedPolicy;
  futureNestedRegistrationAllowed: boolean;
  futureNestedExportAllowed: boolean;
  futureNestedReason?: string;
  requiresStatefulBoundaryHandling: boolean;
}

export interface CustomIcNestedAllowPolicySummary {
  totalCustomIcInstances: number;
  registrationAllowedCount: number;
  exportAllowedCount: number;
  allowCombinationalCount: number;
  allowStatefulCount: number;
  blockedDegradedCount: number;
  blockedContractCount: number;
  blockedExistingNestedCount: number;
  blockedReasons: string[];
  boundaries: CustomIcGateNestedAllowPolicy[];
}

function isCustomIcGate(gate: GateInstance): boolean {
  if (gate.typeId.startsWith('CIC_')) return true;
  if (!gateRegistry.has(gate.typeId)) return false;
  return gateRegistry.get(gate.typeId).category === 'custom';
}

export function analyzeCustomIcGateNestedAllowPolicy(gate: GateInstance): CustomIcGateNestedAllowPolicy {
  const readiness = analyzeCustomIcGateNestingReadiness(gate);

  let futureNestedPolicy: CustomIcFutureNestedPolicy;
  switch (readiness.readiness) {
    case 'eligible_combinational':
      futureNestedPolicy = 'allow_combinational';
      break;
    case 'eligible_stateful':
      futureNestedPolicy = 'allow_stateful';
      break;
    case 'degraded_contract':
      futureNestedPolicy = 'block_degraded_contract';
      break;
    case 'blocked_contract':
      futureNestedPolicy = 'block_contract';
      break;
    case 'blocked_existing_nested':
      futureNestedPolicy = 'block_existing_nested';
      break;
  }

  const futureNestedAllowed = futureNestedPolicy === 'allow_combinational' || futureNestedPolicy === 'allow_stateful';

  return {
    gateId: readiness.gateId,
    typeId: readiness.typeId,
    instanceLabel: readiness.instanceLabel,
    readiness: readiness.readiness,
    futureNestedPolicy,
    futureNestedRegistrationAllowed: futureNestedAllowed,
    futureNestedExportAllowed: futureNestedAllowed,
    futureNestedReason: readiness.reason,
    requiresStatefulBoundaryHandling: futureNestedPolicy === 'allow_stateful',
  };
}

export function analyzeCircuitCustomIcNestedAllowPolicy(circuit: Circuit): CustomIcNestedAllowPolicySummary {
  const readinessSummary = analyzeCircuitCustomIcNestingReadiness(circuit);

  const boundaries = Object.values(circuit.gates)
    .filter(isCustomIcGate)
    .map((gate) => analyzeCustomIcGateNestedAllowPolicy(gate))
    .sort((left, right) => left.gateId.localeCompare(right.gateId));

  const blockedReasons = [...new Set(
    boundaries
      .filter((boundary) => !boundary.futureNestedRegistrationAllowed)
      .map((boundary) => boundary.futureNestedReason)
      .filter((reason): reason is string => Boolean(reason)),
  )];

  return {
    totalCustomIcInstances: boundaries.length,
    registrationAllowedCount: boundaries.filter((boundary) => boundary.futureNestedRegistrationAllowed).length,
    exportAllowedCount: boundaries.filter((boundary) => boundary.futureNestedExportAllowed).length,
    allowCombinationalCount: boundaries.filter((boundary) => boundary.futureNestedPolicy === 'allow_combinational').length,
    allowStatefulCount: boundaries.filter((boundary) => boundary.futureNestedPolicy === 'allow_stateful').length,
    blockedDegradedCount: readinessSummary.degradedCount,
    blockedContractCount: readinessSummary.blockedContractCount,
    blockedExistingNestedCount: readinessSummary.blockedExistingNestedCount,
    blockedReasons,
    boundaries,
  };
}

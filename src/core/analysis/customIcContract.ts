import { gateRegistry } from '../registry/GateRegistry';
import type { GateInstance, GateTypeId } from '../types';
import { analyzeCustomIcGate } from './customIcStructure';

export type CustomIcContractStatus = 'canonical' | 'degraded' | 'blocked';

export type CustomIcContractIssueCode =
  | 'missing_registration'
  | 'missing_export_metadata'
  | 'nested_custom_ic'
  | 'dead_input_port'
  | 'passthrough_output'
  | 'missing_output_driver'
  | 'multiple_output_drivers';

export type CustomIcContractIssueSeverity = 'info' | 'warning' | 'error';

export interface CustomIcContractIssue {
  code: CustomIcContractIssueCode;
  severity: CustomIcContractIssueSeverity;
  message: string;
  portId?: string;
  nestedTypeId?: GateTypeId;
}

export interface CustomIcGateContract {
  gateId: string;
  typeId: GateTypeId;
  instanceLabel?: string;
  status: CustomIcContractStatus;
  exportAllowed: boolean;
  exportBlockReason?: string;
  issues: CustomIcContractIssue[];
  deadInputPortIds: string[];
  passthroughOutputPortIds: string[];
  missingOutputPortIds: string[];
  multiDriverOutputPortIds: string[];
  nestedCustomTypeIds: GateTypeId[];
}

function makeIssue(
  code: CustomIcContractIssueCode,
  severity: CustomIcContractIssueSeverity,
  message: string,
  details?: Pick<CustomIcContractIssue, 'portId' | 'nestedTypeId'>,
): CustomIcContractIssue {
  return {
    code,
    severity,
    message,
    portId: details?.portId,
    nestedTypeId: details?.nestedTypeId,
  };
}

export function analyzeCustomIcGateContract(gate: GateInstance): CustomIcGateContract {
  const structure = analyzeCustomIcGate(gate);
  const issues: CustomIcContractIssue[] = [];

  if (structure.exportPolicy === 'missing_registration' && structure.exportBlockReason) {
    issues.push(makeIssue('missing_registration', 'error', structure.exportBlockReason));
  }
  if (structure.exportPolicy === 'missing_export_metadata' && structure.exportBlockReason) {
    issues.push(makeIssue('missing_export_metadata', 'error', structure.exportBlockReason));
  }

  for (const nestedTypeId of structure.nestedCustomTypeIds) {
    issues.push(
      makeIssue(
        'nested_custom_ic',
        'error',
        `Nested custom IC "${nestedTypeId}" inside "${gate.typeId}" is not supported for HDL export.`,
        { nestedTypeId },
      ),
    );
  }

  const deadInputPortIds = structure.inputPorts
    .filter((port) => port.fanout.length === 0)
    .map((port) => port.portId);
  for (const portId of deadInputPortIds) {
    issues.push(
      makeIssue(
        'dead_input_port',
        'warning',
        `Custom IC "${gate.typeId}" input ${portId} has no fanout inside its subcircuit.`,
        { portId },
      ),
    );
  }

  const passthroughOutputPortIds = structure.outputPorts
    .filter((port) => port.driverKind === 'passthrough')
    .map((port) => port.portId);
  for (const portId of passthroughOutputPortIds) {
    issues.push(
      makeIssue(
        'passthrough_output',
        'info',
        `Custom IC "${gate.typeId}" output ${portId} is a direct passthrough from a boundary input.`,
        { portId },
      ),
    );
  }

  const missingOutputPortIds = structure.outputPorts
    .filter((port) => port.driverKind === 'missing')
    .map((port) => port.portId);
  for (const portId of missingOutputPortIds) {
    issues.push(
      makeIssue(
        'missing_output_driver',
        'error',
        `Custom IC "${gate.typeId}" output ${portId} has no driven OUTPUT_LED in its subcircuit.`,
        { portId },
      ),
    );
  }

  const multiDriverOutputPortIds: string[] = [];
  if (gateRegistry.has(gate.typeId)) {
    const definition = gateRegistry.get(gate.typeId);
    const meta = definition.customIC;
    if (definition.category === 'custom' && meta) {
      meta.outputGateIds.forEach((outputGateId, index) => {
        const driverCount = Object.values(meta.subcircuit.wires).filter((wire) => (
          wire.to.gateId === outputGateId && wire.to.portId === 'in'
        )).length;
        if (driverCount > 1) {
          const portId = `o${index}`;
          multiDriverOutputPortIds.push(portId);
          issues.push(
            makeIssue(
              'multiple_output_drivers',
              'error',
              `Custom IC "${gate.typeId}" output ${portId} has ${driverCount} internal drivers; boundary outputs must stay single-driver.`,
              { portId },
            ),
          );
        }
      });
    }
  }

  const hasError = issues.some((issue) => issue.severity === 'error');
  const hasWarning = issues.some((issue) => issue.severity === 'warning');
  const status: CustomIcContractStatus = hasError
    ? 'blocked'
    : hasWarning
      ? 'degraded'
      : 'canonical';
  const exportBlockReason = issues.find((issue) => issue.severity === 'error')?.message;

  return {
    gateId: gate.id,
    typeId: gate.typeId,
    instanceLabel: gate.label?.trim() || undefined,
    status,
    exportAllowed: !hasError,
    exportBlockReason,
    issues,
    deadInputPortIds,
    passthroughOutputPortIds,
    missingOutputPortIds,
    multiDriverOutputPortIds,
    nestedCustomTypeIds: structure.nestedCustomTypeIds,
  };
}

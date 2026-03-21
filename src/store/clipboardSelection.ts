import type { Circuit } from '../core/types';
import type { ClipboardData } from './clipboard';
import { buildClipboardProjectionBatchPolicies } from './pasteClipboardProjection';

export function buildClipboardDataForSelection(
  circuit: Circuit,
  selectedGateIds: Set<string>,
): ClipboardData | null {
  const gates = Object.values(circuit.gates).filter((gate) => selectedGateIds.has(gate.id));
  if (gates.length === 0) return null;

  const wires = Object.values(circuit.wires).filter((wire) =>
    selectedGateIds.has(wire.from.gateId) && selectedGateIds.has(wire.to.gateId),
  );

  return {
    gates,
    wires,
    fsmProjectionBatchPolicies: buildClipboardProjectionBatchPolicies(circuit, selectedGateIds),
  };
}

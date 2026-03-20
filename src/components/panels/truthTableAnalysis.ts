import type { Circuit, GateDefinition, GateInstance } from '../../core/types';
import {
  buildStateTransitionProjection,
  getProjectedSignalLabel,
  type StateTransitionProjection,
  type StateTransitionProjectionStateVar,
} from '../../core/analysis/sequentialProjection';
import {
  chooseRepresentativeStateVar,
  classifyInputs,
  classifyStateTransitionInputs,
  isDataPortId,
  stateVarPriority,
} from '../../core/analysis/stateTransitionTable';

export const INPUT_TYPES = new Set(['INPUT_SWITCH', 'PUSH_BTN', 'CLOCK']);
export const OUTPUT_TYPES = new Set(['OUTPUT_LED']);
export const SKIP_TYPES = new Set([
  'CONST_HIGH', 'CONST_LOW', 'ADC8', 'TEXT_NOTE', 'JUNCTION',
]);

export type StateVar = StateTransitionProjectionStateVar;

type GateDefLookup = (typeId: string) => GateDefinition;

export function gateLabel(g: GateInstance): string {
  return getProjectedSignalLabel(g, g.label || g.typeId.replace(/_/g, '') + '_' + g.id.slice(0, 4));
}

function numericSuffix(value: string): number {
  const match = value.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function isCanonicalProjectedStateGate(gate: GateInstance): boolean {
  return gate.projection?.sourceSystem === 'fsm_synth'
    && gate.projection?.role === 'state'
    && gate.projection?.visibility === 'canonical';
}

export function collectConnectedGateIds(circuit: Circuit): Set<string> {
  const connectedIds = new Set<string>();
  for (const w of Object.values(circuit.wires)) {
    connectedIds.add(w.from.gateId);
    connectedIds.add(w.to.gateId);
  }
  return connectedIds;
}

export function collectSttFeedbackGateIds(
  circuit: Circuit,
  connectedIds: Set<string>,
  cycles: string[][],
  getGateDefinition: GateDefLookup,
): Set<string> {
  const feedbackGateIds = new Set(cycles.flat());

  for (const g of Object.values(circuit.gates)) {
    if (!connectedIds.has(g.id)) continue;
    if (INPUT_TYPES.has(g.typeId)) continue;
    if (OUTPUT_TYPES.has(g.typeId)) continue;
    if (SKIP_TYPES.has(g.typeId)) continue;

    try {
      const def = getGateDefinition(g.typeId);
      if (def.isSynchronous || def.stateUpdate) feedbackGateIds.add(g.id);
    } catch {
      // ignore unknown types
    }
  }

  return feedbackGateIds;
}

export function collectStateVarsForStt(
  circuit: Circuit,
  connectedIds: Set<string>,
  feedbackGateIds: Set<string>,
  getGateDefinition: GateDefLookup,
): StateVar[] {
  const stateVars: StateVar[] = [];
  const feedbackGatesSorted = [...feedbackGateIds]
    .map(id => circuit.gates[id])
    .filter((g): g is GateInstance => Boolean(g))
    .filter(g => connectedIds.has(g.id))
    .sort((a, b) => {
      const aProjected = isCanonicalProjectedStateGate(a);
      const bProjected = isCanonicalProjectedStateGate(b);
      if (aProjected !== bProjected) return aProjected ? -1 : 1;

      if (aProjected && bProjected) {
        const suffix = numericSuffix(getProjectedSignalLabel(a)) - numericSuffix(getProjectedSignalLabel(b));
        if (suffix !== 0) return suffix;
      }

      const xDiff = a.x - b.x;
      if (xDiff !== 0) return xDiff;
      return a.y - b.y;
    });

  const hasStructuredStateGates = feedbackGatesSorted.some(g => {
    try {
      const def = getGateDefinition(g.typeId);
      return !!def.stateKeys || !!def.isSynchronous || typeof def.stateUpdate === 'function';
    } catch {
      return false;
    }
  });

  for (const gate of feedbackGatesSorted) {
    let def: GateDefinition;
    try {
      def = getGateDefinition(gate.typeId);
    } catch {
      continue;
    }

    const lbl = gateLabel(gate);

    if (hasStructuredStateGates && !def.stateKeys && !def.isSynchronous && !def.stateUpdate) {
      continue;
    }

    if (def.isSynchronous || def.stateKeys) {
      const keys = def.stateKeys ?? ['q'];
      for (const key of keys) {
        stateVars.push({
          gateId: gate.id,
          portId: key,
          stateKey: key,
          label: keys.length === 1 ? lbl : `${lbl}.${key}`,
        });
      }
      continue;
    }

    for (const p of def.outputs) {
      stateVars.push({
        gateId: gate.id,
        portId: p.id,
        stateKey: p.id,
        label: def.outputs.length === 1 ? lbl : `${lbl}.${p.label ?? p.id}`,
      });
    }
  }

  return stateVars;
}

export function projectStateTransitionView(
  circuit: Circuit,
  inputs: GateInstance[],
  stateVars: StateVar[],
  outputGates: GateInstance[],
): StateTransitionProjection {
  return buildStateTransitionProjection(circuit, inputs, stateVars, outputGates);
}

export {
  chooseRepresentativeStateVar,
  classifyInputs,
  classifyStateTransitionInputs,
  isDataPortId,
  stateVarPriority,
};

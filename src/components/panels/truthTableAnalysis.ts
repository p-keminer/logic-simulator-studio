import type { Circuit, GateDefinition, GateInstance } from '../../core/types';

export const INPUT_TYPES = new Set(['INPUT_SWITCH', 'PUSH_BTN', 'CLOCK']);
export const OUTPUT_TYPES = new Set(['OUTPUT_LED']);
export const SKIP_TYPES = new Set([
  'CONST_HIGH', 'CONST_LOW', 'ADC8', 'TEXT_NOTE', 'JUNCTION',
]);

export interface StateVar {
  gateId: string;
  portId: string;
  stateKey: string;
  label: string;
}

type GateDefLookup = (typeId: string) => GateDefinition;

export function gateLabel(g: GateInstance): string {
  return g.label || g.typeId.replace(/_/g, '') + '_' + g.id.slice(0, 4);
}

export function isDataPortId(portId: string): boolean {
  return /^d\d+$|^ds$/i.test(portId);
}

export function classifyInputs(
  inputGates: GateInstance[],
  circuit: Circuit,
): { controls: GateInstance[]; data: GateInstance[] } {
  const controls: GateInstance[] = [];
  const data: GateInstance[] = [];

  for (const g of inputGates) {
    const outWires = Object.values(circuit.wires).filter(w => w.from.gateId === g.id);
    const allData = outWires.length > 0 && outWires.every(w => isDataPortId(w.to.portId));
    (allData ? data : controls).push(g);
  }

  return { controls, data };
}

export function stateVarPriority(stateVar: StateVar): number {
  const key = stateVar.stateKey.toLowerCase();
  const label = stateVar.label.toLowerCase();

  if (/^(clk|clock|value|tickcounter|frequency|_paused)$/.test(key)) return -100;
  if (/(^|[_\W])(clk|clock|tick|freq|paused)([_\W]|$)/.test(label)) return -100;
  if (/^q$|^q\d+$|^qs$/.test(key)) return 100;
  if (/^cnt\d+$/.test(key)) return 95;
  if (/^bit\d+$|^b\d+$/.test(key)) return 90;
  if (/^reg\d+$/.test(key)) return 85;
  return 10;
}

function numericSuffix(value: string): number {
  const match = value.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function chooseRepresentativeStateVar(stateVars: StateVar[]): StateVar {
  return [...stateVars].sort((a, b) => {
    const prio = stateVarPriority(b) - stateVarPriority(a);
    if (prio !== 0) return prio;

    const suffix = numericSuffix(a.stateKey) - numericSuffix(b.stateKey);
    if (suffix !== 0) return suffix;

    return a.label.localeCompare(b.label);
  })[0];
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
    .sort((a, b) => a.x - b.x);

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

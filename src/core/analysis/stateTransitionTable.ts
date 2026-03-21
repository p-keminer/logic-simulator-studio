import { gateRegistry } from '../registry/GateRegistry';
import { buildWireMap, initBuffer, runOneTick, runUntilStable } from '../simulation/tickEngine';
import { resolveWiredValues } from '../simulation/signal';
import type { Circuit, GateInstance, ProjectionSignalRole, SignalState, SignalValue } from '../types';
import {
  getProjectedSignalLabel,
  type StateTransitionProjectionStateVar,
  type StateTransitionProjectionStatus,
} from './sequentialProjection';

export interface ReducedStateTransitionMeta {
  fixedDataLabels: string[];
  totalStateBits: number;
  controlCount: number;
  cappedControls: boolean;
}

export interface StaticStateTransitionRow {
  inputBits: number[];
  stateBits: number[];
  nextState: number[];
  outputBits: number[];
}

export interface StaticStateTransitionTable {
  inputs: GateInstance[];
  stateVars: StateTransitionProjectionStateVar[];
  outputGates: GateInstance[];
  rows: StaticStateTransitionRow[];
  tooMany: boolean;
  reducedMeta?: ReducedStateTransitionMeta;
}

export type StateTransitionDisplayMode = 'fsm_compact' | 'technical_full';
export type StateTransitionInputRole = Extract<ProjectionSignalRole, 'clock' | 'reset' | 'input'>;

export interface DisplayedStateTransitionTable {
  mode: StateTransitionDisplayMode;
  inputs: GateInstance[];
  stateVars: StateTransitionProjectionStateVar[];
  outputGates: GateInstance[];
  rows: StaticStateTransitionRow[];
  notes: string[];
}

export interface ResolvedStateTransitionViewState {
  availableModes: StateTransitionDisplayMode[];
  activeMode: StateTransitionDisplayMode;
  showModeSelect: boolean;
  showReducedCompactNote: boolean;
  fallbackNote: string;
}

export function getAvailableStateTransitionDisplayModes(args: {
  projectionStatus?: StateTransitionProjectionStatus;
  isProjectedFsmView: boolean;
  reducedMeta?: ReducedStateTransitionMeta;
  inputRoles?: Record<string, StateTransitionInputRole>;
}): StateTransitionDisplayMode[] {
  const { projectionStatus, isProjectedFsmView, reducedMeta, inputRoles = {} } = args;
  const isProjectedStatus = projectionStatus === 'projected' || projectionStatus === 'legacy_projected';
  if (!isProjectedFsmView || !isProjectedStatus) return ['technical_full'];
  if (reducedMeta) return ['fsm_compact'];

  const clockCount = Object.values(inputRoles).filter((role) => role === 'clock').length;
  if (clockCount !== 1) return ['technical_full'];

  return ['fsm_compact', 'technical_full'];
}

export function getStateTransitionFallbackNote(
  projectionStatus: StateTransitionProjectionStatus | undefined,
): string {
  switch (projectionStatus) {
    case 'fallback_partial_state':
      return 'FSM-Projektion unvollständig: nicht alle Zustandsbits sind kanonisch erfasst. Ansicht bleibt technisch voll.';
    case 'fallback_partial_inputs':
      return 'FSM-Projektion unvollständig: Eingänge sind nur teilweise projiziert. Ansicht bleibt technisch voll.';
    case 'fallback_partial_outputs':
      return 'FSM-Projektion unvollständig: Ausgänge sind gemischt oder nur teilweise projiziert. Ansicht bleibt technisch voll.';
    case 'fallback_mixed_batches':
      return 'Mehrere FSM-Projektionsbatches erkannt. Ansicht bleibt technisch voll, damit keine halb-projizierte STT entsteht.';
    default:
      return '';
  }
}

export function resolveStateTransitionViewState(args: {
  requestedMode: StateTransitionDisplayMode;
  projectionStatus?: StateTransitionProjectionStatus;
  isProjectedFsmView: boolean;
  reducedMeta?: ReducedStateTransitionMeta;
  inputRoles?: Record<string, StateTransitionInputRole>;
}): ResolvedStateTransitionViewState {
  const availableModes = getAvailableStateTransitionDisplayModes(args);
  const activeMode = availableModes.find((mode) => mode === args.requestedMode)
    ?? availableModes[0]
    ?? 'technical_full';

  return {
    availableModes,
    activeMode,
    showModeSelect: availableModes.length > 1,
    showReducedCompactNote: activeMode === 'fsm_compact' && args.isProjectedFsmView && Boolean(args.reducedMeta),
    fallbackNote: getStateTransitionFallbackNote(args.projectionStatus),
  };
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

  for (const gate of inputGates) {
    const outWires = Object.values(circuit.wires).filter((wire) => wire.from.gateId === gate.id);
    const allData = outWires.length > 0 && outWires.every((wire) => isDataPortId(wire.to.portId));
    (allData ? data : controls).push(gate);
  }

  return { controls, data };
}

export function classifyStateTransitionInputs(
  inputGates: GateInstance[],
  circuit: Circuit,
  opts?: { isProjectedFsmView?: boolean },
): { controls: GateInstance[]; data: GateInstance[] } {
  if (opts?.isProjectedFsmView) {
    return { controls: [...inputGates], data: [] };
  }
  return classifyInputs(inputGates, circuit);
}

export function stateVarPriority(stateVar: StateTransitionProjectionStateVar): number {
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

export function chooseRepresentativeStateVar(stateVars: StateTransitionProjectionStateVar[]): StateTransitionProjectionStateVar {
  return [...stateVars].sort((a, b) => {
    const prio = stateVarPriority(b) - stateVarPriority(a);
    if (prio !== 0) return prio;

    const suffix = numericSuffix(a.stateKey) - numericSuffix(b.stateKey);
    if (suffix !== 0) return suffix;

    return a.label.localeCompare(b.label);
  })[0];
}

function gateLabel(gate: GateInstance): string {
  return getProjectedSignalLabel(gate, gate.label || gate.typeId.replace(/_/g, '') + '_' + gate.id.slice(0, 4));
}

const ZERO_SIGNAL_STATE: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function normalizeSignatureValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => normalizeSignatureValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, normalizeSignatureValue(entry)]),
    );
  }
  return value;
}

function getStaticAnalysisCustomState(gate: GateInstance): Record<string, unknown> | undefined {
  const nextState: Record<string, unknown> = { ...(gate.customState ?? {}) };

  try {
    const definition = gateRegistry.get(gate.typeId);
    for (const key of definition.stateKeys ?? []) delete nextState[key];
    for (const key of definition.hiddenStateKeys ?? []) delete nextState[key];
  } catch {
    // ignore unknown gate types
  }

  if (gate.typeId === 'CLOCK') {
    delete nextState.value;
    delete nextState.tickCounter;
    delete nextState._paused;
  }
  if (gate.typeId === 'INPUT_SWITCH' || gate.typeId === 'PUSH_BTN') {
    delete nextState.value;
  }

  for (const key of Object.keys(nextState)) {
    if (/^(prevClk|q|q\d+|qM|qS|count|bit\d+|reg\d+)$/i.test(key)) {
      delete nextState[key];
    }
  }

  return Object.keys(nextState).length > 0 ? nextState : undefined;
}

function buildZeroedOutputSignals(gate: GateInstance): Record<string, SignalState> {
  const nextSignals: Record<string, SignalState> = {};
  try {
    for (const port of gateRegistry.get(gate.typeId).outputs) {
      nextSignals[port.id] = { ...ZERO_SIGNAL_STATE };
    }
  } catch {
    for (const portId of Object.keys(gate.outputSignals ?? {})) {
      nextSignals[portId] = { ...ZERO_SIGNAL_STATE };
    }
  }
  return nextSignals;
}

export function buildStaticAnalysisCircuit(circuit: Circuit): Circuit {
  return {
    ...circuit,
    gates: Object.fromEntries(
      Object.entries(circuit.gates).map(([id, gate]) => [id, {
        ...gate,
        outputSignals: buildZeroedOutputSignals(gate),
        customState: getStaticAnalysisCustomState(gate),
      }]),
    ),
    wires: Object.fromEntries(
      Object.entries(circuit.wires).map(([id, wire]) => [id, {
        ...wire,
        signal: { ...ZERO_SIGNAL_STATE },
      }]),
    ),
  };
}

export function buildStaticAnalysisKey(circuit: Circuit): string {
  const analysisCircuit = buildStaticAnalysisCircuit(circuit);
  const gates = Object.values(analysisCircuit.gates)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((gate) => ({
      id: gate.id,
      typeId: gate.typeId,
      x: gate.x,
      y: gate.y,
      label: gate.label ?? null,
      projection: gate.projection ? normalizeSignatureValue(gate.projection) : null,
      customState: gate.customState ? normalizeSignatureValue(gate.customState) : null,
    }));
  const wires = Object.values(analysisCircuit.wires)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((wire) => ({
      id: wire.id,
      fromGateId: wire.from.gateId,
      fromPortId: wire.from.portId,
      toGateId: wire.to.gateId,
      toPortId: wire.to.portId,
    }));

  return JSON.stringify({ gates, wires });
}

export function buildDisplayedStateTransitionTable(args: {
  table: StaticStateTransitionTable;
  mode: StateTransitionDisplayMode;
  isProjectedFsmView: boolean;
  inputRoles?: Record<string, StateTransitionInputRole>;
}): DisplayedStateTransitionTable {
  const { table, mode, isProjectedFsmView, inputRoles = {} } = args;

  if (mode !== 'fsm_compact' || !isProjectedFsmView) {
    return {
      mode: 'technical_full',
      inputs: table.inputs,
      stateVars: table.stateVars,
      outputGates: table.outputGates,
      rows: table.rows,
      notes: [],
    };
  }

  const visibleInputIndices: number[] = [];
  const hiddenClockLabels: string[] = [];
  const hiddenResetLabels: string[] = [];

  table.inputs.forEach((gate, index) => {
    const role = inputRoles[gate.id] ?? 'input';
    if (role === 'clock') {
      hiddenClockLabels.push(gateLabel(gate));
      return;
    }
    if (role === 'reset') {
      hiddenResetLabels.push(gateLabel(gate));
      return;
    }
    visibleInputIndices.push(index);
  });

  const rows = table.rows
    .filter((row) => table.inputs.every((gate, index) => {
      const role = inputRoles[gate.id];
      if (role === 'clock') return row.inputBits[index] === 1;
      if (role === 'reset') return row.inputBits[index] === 0;
      return true;
    }))
    .map((row) => ({
      ...row,
      inputBits: visibleInputIndices.map((index) => row.inputBits[index]),
    }));

  const notes: string[] = [];
  if (hiddenClockLabels.length > 0) {
    notes.push(`${hiddenClockLabels.join(', ')} wird als Übergangsereignis interpretiert.`);
  }
  if (hiddenResetLabels.length > 0) {
    notes.push(`${hiddenResetLabels.join(', ')}=1 ist im Modus "Technisch voll" sichtbar.`);
  }

  return {
    mode: 'fsm_compact',
    inputs: visibleInputIndices.map((index) => table.inputs[index]),
    stateVars: table.stateVars,
    outputGates: table.outputGates,
    rows,
    notes,
  };
}

function getHiddenStateInit(circuit: Circuit, stateVar: StateTransitionProjectionStateVar): Record<string, unknown> {
  try {
    const definition = gateRegistry.get(circuit.gates[stateVar.gateId].typeId);
    if (definition.stateInit) {
      const hiddenInit: Record<string, unknown> = {};
      for (const hiddenKey of definition.hiddenStateKeys ?? []) {
        if (hiddenKey in definition.stateInit) hiddenInit[hiddenKey] = definition.stateInit[hiddenKey];
      }
      return hiddenInit;
    }
  } catch {
    // fall through to legacy default
  }

  return { prevClk: 0 };
}

function forceInputValue(
  gate: GateInstance,
  value: SignalValue,
  customStates: Record<string, Record<string, unknown>>,
  outputs: Record<string, Record<string, SignalValue>>,
): void {
  customStates[gate.id] = { ...(customStates[gate.id] ?? {}), value };
  if (!outputs[gate.id]) outputs[gate.id] = {};
  try {
    for (const port of gateRegistry.get(gate.typeId).outputs) {
      outputs[gate.id][port.id] = value;
    }
  } catch {
    outputs[gate.id].out = value;
  }
}

export function buildStaticStateTransitionTable(args: {
  circuit: Circuit;
  feedbackGateIds: Set<string>;
  projectedInputs: GateInstance[];
  projectedStateVars: StateTransitionProjectionStateVar[];
  projectedOutputGates: GateInstance[];
  isProjectedFsmView: boolean;
}): StaticStateTransitionTable {
  const {
    circuit,
    feedbackGateIds,
    projectedInputs,
    projectedStateVars,
    projectedOutputGates,
    isProjectedFsmView,
  } = args;

  const totalVars = projectedInputs.length + projectedStateVars.length;
  let activeInputs = projectedInputs;
  let activeStateVars = projectedStateVars;
  let dataInputsToZero: GateInstance[] = [];
  let nonRepresentativeStateBits: StateTransitionProjectionStateVar[] = [];
  let reducedMeta: ReducedStateTransitionMeta | undefined;

  if (totalVars > 8) {
    const { controls, data } = classifyStateTransitionInputs(projectedInputs, circuit, {
      isProjectedFsmView,
    });
    const representative = chooseRepresentativeStateVar(projectedStateVars);
    const maxControls = 7;
    const cappedControls = controls.length > maxControls;
    activeInputs = cappedControls ? controls.slice(0, maxControls) : controls;
    activeStateVars = [representative];
    dataInputsToZero = data;
    nonRepresentativeStateBits = projectedStateVars.filter((stateVar) => stateVar !== representative);
    reducedMeta = {
      fixedDataLabels: data.map((gate) => gateLabel(gate)),
      totalStateBits: projectedStateVars.length,
      controlCount: activeInputs.length,
      cappedControls,
    };

    if (activeInputs.length + 1 > 8) {
      return {
        inputs: projectedInputs,
        stateVars: projectedStateVars,
        outputGates: projectedOutputGates,
        rows: [],
        tooMany: true,
      };
    }
  }

  const activeTotalVars = activeInputs.length + activeStateVars.length;
  const allGates = Object.values(circuit.gates);
  const wireMap = buildWireMap(circuit);
  const rows: StaticStateTransitionRow[] = [];
  const rowClockIndex = activeInputs.findIndex((gate) =>
    gate.projection?.role === 'clock' || gate.typeId === 'CLOCK',
  );

  for (let combo = 0; combo < (1 << activeTotalVars); combo++) {
    const inputBits = activeInputs.map((_, index) => (combo >> (activeTotalVars - 1 - index)) & 1);
    const stateBits = activeStateVars.map((_, index) => (combo >> (activeStateVars.length - 1 - index)) & 1);
    const clockLevel = rowClockIndex >= 0 ? (inputBits[rowClockIndex] as SignalValue) : 0;

    const buffer = initBuffer(circuit);
    const transitionStateSnapshots: Record<string, Record<string, unknown>> = {};

    for (let index = 0; index < activeInputs.length; index++) {
      forceInputValue(activeInputs[index], inputBits[index] as SignalValue, buffer.customStates, buffer.outputs);
    }

    for (const gate of dataInputsToZero) {
      forceInputValue(gate, 0, buffer.customStates, buffer.outputs);
    }

    for (const stateVar of nonRepresentativeStateBits) {
      const transitionState = {
        ...(buffer.customStates[stateVar.gateId] ?? {}),
        [stateVar.stateKey]: 0,
        ...getHiddenStateInit(circuit, stateVar),
      };
      transitionStateSnapshots[stateVar.gateId] = transitionState;
      buffer.customStates[stateVar.gateId] = {
        ...transitionState,
        prevClk: clockLevel,
      };
    }

    for (let index = 0; index < activeStateVars.length; index++) {
      const stateVar = activeStateVars[index];
      const transitionState = {
        ...(buffer.customStates[stateVar.gateId] ?? {}),
        [stateVar.stateKey]: stateBits[index] as SignalValue,
        ...getHiddenStateInit(circuit, stateVar),
      };
      transitionStateSnapshots[stateVar.gateId] = transitionState;
      buffer.customStates[stateVar.gateId] = {
        ...transitionState,
        prevClk: clockLevel,
      };
    }

    const forcedGateIds = new Set(projectedStateVars.map((stateVar) => stateVar.gateId));
    for (const gateId of forcedGateIds) {
      try {
        const definition = gateRegistry.get(circuit.gates[gateId].typeId);
        const gateInputs: Record<string, SignalValue> = {};
        for (const input of definition.inputs) {
          const upstream = wireMap.get(`${gateId}:${input.id}`) ?? [];
          gateInputs[input.id] = upstream.length > 0
            ? resolveWiredValues(
              upstream.map((source) => ((buffer.outputs[source.fromGateId]?.[source.fromPortId] ?? 0) as SignalValue)),
            )
            : (definition.defaultInputValues?.[input.id] ?? 0);
        }
        const evaluatedOutputs = definition.evaluate(
          gateInputs,
          buffer.customStates[gateId] as Record<string, unknown>,
        );
        if (!buffer.outputs[gateId]) buffer.outputs[gateId] = {};
        for (const [portId, value] of Object.entries(evaluatedOutputs)) {
          buffer.outputs[gateId][portId] = value as SignalValue;
        }
      } catch {
        // ignore unknown gate types
      }
    }

    for (const gate of allGates) {
      if (feedbackGateIds.has(gate.id)) continue;
      try {
        if (gateRegistry.get(gate.typeId).isSynchronous) {
          buffer.customStates[gate.id] = { ...(buffer.customStates[gate.id] ?? {}), prevClk: 0 };
        }
      } catch {
        // ignore unknown gate types
      }
    }

    // Build the STT from a settled present-state snapshot instead of the live
    // simulator buffer, so blinking outputs cannot leak into the analysis rows.
    const { buffer: settledBuffer } = runUntilStable(circuit, buffer, wireMap);
    const transitionBuffer = {
      ...settledBuffer,
      customStates: {
        ...settledBuffer.customStates,
        ...transitionStateSnapshots,
      },
    };
    const nextBuffer = runOneTick(circuit, transitionBuffer, wireMap, true);

    for (const gate of allGates) {
      let definition;
      try {
        definition = gateRegistry.get(gate.typeId);
      } catch {
        continue;
      }
      if (!definition.isSynchronous) continue;
      const newCustomState = nextBuffer.customStates[gate.id];
      if (!newCustomState) continue;

      const reevaluatedInputs: Record<string, SignalValue> = {};
      for (const input of definition.inputs) {
        const upstream = wireMap.get(`${gate.id}:${input.id}`) ?? [];
        reevaluatedInputs[input.id] = upstream.length > 0
          ? resolveWiredValues(
            upstream.map((source) => ((nextBuffer.outputs[source.fromGateId]?.[source.fromPortId] ?? 0) as SignalValue)),
          )
          : (definition.defaultInputValues?.[input.id] ?? 0);
      }
      const reevaluatedOutputs = definition.evaluate(
        reevaluatedInputs,
        newCustomState as Record<string, unknown>,
      );
      if (!nextBuffer.outputs[gate.id]) nextBuffer.outputs[gate.id] = {};
      for (const [portId, value] of Object.entries(reevaluatedOutputs)) {
        nextBuffer.outputs[gate.id][portId] = value as SignalValue;
      }
    }

    const { buffer: settledNextBuffer } = runUntilStable(circuit, nextBuffer, wireMap);

    const nextState = activeStateVars.map((stateVar) => {
      try {
        const gateTypeId = circuit.gates[stateVar.gateId]?.typeId ?? '';
        if (gateRegistry.get(gateTypeId).isSynchronous) {
          return (settledNextBuffer.customStates[stateVar.gateId]?.[stateVar.stateKey] ?? 0) as number;
        }
      } catch {
        // fall through to output-based fallback
      }
      return (settledNextBuffer.outputs[stateVar.gateId]?.[stateVar.portId] ?? 0) as number;
    });

    const outputBits = projectedOutputGates.map((gate) => {
      const wire = Object.values(circuit.wires).find((candidate) => candidate.to.gateId === gate.id);
      if (!wire) return 0;
      return (settledNextBuffer.outputs[wire.from.gateId]?.[wire.from.portId] ?? 0) as number;
    });

    rows.push({ inputBits, stateBits, nextState, outputBits });
  }

  return {
    inputs: activeInputs,
    stateVars: activeStateVars,
    outputGates: projectedOutputGates,
    rows,
    tooMany: false,
    reducedMeta,
  };
}


import type { FsmMachine, FsmStateNode, FsmTransition } from '../types';

export interface FsmStructureAnalysis {
  initialState: FsmStateNode | null;
  initialStateError: string | null;
  orderedStates: FsmStateNode[];
  orderedReachableStates: FsmStateNode[];
  reachableStates: FsmStateNode[];
  unreachableStates: FsmStateNode[];
  reachableStateIds: Set<string>;
  unreachableStateIds: Set<string>;
  encodingByStateId: Map<string, number>;
  effectiveStateCount: number;
  effectiveBitWidth: number;
  effectiveTransitions: FsmTransition[];
  synthesisFsm: FsmMachine;
}

function sortStatesByLabel(a: FsmStateNode, b: FsmStateNode) {
  return a.label.localeCompare(b.label);
}

function cloneFsm(fsm: FsmMachine): FsmMachine {
  return {
    ...fsm,
    states: { ...fsm.states },
    transitions: [...fsm.transitions],
  };
}

export function analyzeFsmStructure(fsm: FsmMachine): FsmStructureAnalysis {
  const allStates = Object.values(fsm.states);
  const initialStates = allStates.filter((state) => state.isInitial);

  if (initialStates.length === 0) {
    return {
      initialState: null,
      initialStateError: 'FSM hat keinen Startzustand',
      orderedStates: [...allStates].sort(sortStatesByLabel),
      orderedReachableStates: [],
      reachableStates: [],
      unreachableStates: [],
      reachableStateIds: new Set<string>(),
      unreachableStateIds: new Set<string>(),
      encodingByStateId: new Map<string, number>(),
      effectiveStateCount: 0,
      effectiveBitWidth: 0,
      effectiveTransitions: [],
      synthesisFsm: cloneFsm(fsm),
    };
  }

  if (initialStates.length > 1) {
    return {
      initialState: null,
      initialStateError: 'FSM hat mehrere Startzustände',
      orderedStates: [...allStates].sort(sortStatesByLabel),
      orderedReachableStates: [],
      reachableStates: [],
      unreachableStates: [],
      reachableStateIds: new Set<string>(),
      unreachableStateIds: new Set<string>(),
      encodingByStateId: new Map<string, number>(),
      effectiveStateCount: 0,
      effectiveBitWidth: 0,
      effectiveTransitions: [],
      synthesisFsm: cloneFsm(fsm),
    };
  }

  const initialState = initialStates[0];
  const reachableStateIds = new Set<string>([initialState.id]);
  const queue = [initialState.id];

  while (queue.length > 0) {
    const currentStateId = queue.shift();
    if (!currentStateId) continue;

    for (const transition of fsm.transitions) {
      if (transition.fromId !== currentStateId) continue;
      if (!fsm.states[transition.toId]) continue;
      if (reachableStateIds.has(transition.toId)) continue;
      reachableStateIds.add(transition.toId);
      queue.push(transition.toId);
    }
  }

  const orderedReachableStates = [
    initialState,
    ...allStates
      .filter((state) => reachableStateIds.has(state.id) && state.id !== initialState.id)
      .sort(sortStatesByLabel),
  ];
  const reachableStates = orderedReachableStates;
  const unreachableStates = allStates
    .filter((state) => !reachableStateIds.has(state.id))
    .sort(sortStatesByLabel);
  const orderedStates = [
    initialState,
    ...allStates
      .filter((state) => state.id !== initialState.id)
      .sort(sortStatesByLabel),
  ];
  const unreachableStateIds = new Set(unreachableStates.map((state) => state.id));
  const encodingByStateId = new Map<string, number>();
  const effectiveTransitions = fsm.transitions.filter((transition) => reachableStateIds.has(transition.fromId));

  orderedReachableStates.forEach((state, index) => {
    encodingByStateId.set(state.id, index);
  });

  return {
    initialState,
    initialStateError: null,
    orderedStates,
    orderedReachableStates,
    reachableStates,
    unreachableStates,
    reachableStateIds,
    unreachableStateIds,
    encodingByStateId,
    effectiveStateCount: orderedReachableStates.length,
    effectiveBitWidth: Math.ceil(Math.log2(Math.max(2, orderedReachableStates.length))),
    effectiveTransitions,
    synthesisFsm: {
      ...fsm,
      states: Object.fromEntries(orderedReachableStates.map((state) => [state.id, state])),
      transitions: effectiveTransitions,
    },
  };
}

export function requireFsmStructure(
  fsm: FsmMachine,
): FsmStructureAnalysis {
  const structure = analyzeFsmStructure(fsm);
  if (structure.initialStateError) throw new Error(structure.initialStateError);
  if (structure.effectiveStateCount === 0) {
    throw new Error('FSM hat keine erreichbaren Zustände für die Synthese');
  }
  return structure;
}

export function formatStateEncoding(
  analysis: Pick<FsmStructureAnalysis, 'encodingByStateId' | 'effectiveBitWidth'>,
  stateId: string,
): string | null {
  const encodedState = analysis.encodingByStateId.get(stateId);
  if (encodedState == null) return null;
  return encodedState.toString(2).padStart(analysis.effectiveBitWidth, '0');
}

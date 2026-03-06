import type { FsmMachine, FsmStateNode, FsmTransition, FsmArchType } from './types';
import { generateId } from '../utils/idGenerator';

/** Auto-place a new state away from existing ones */
function findFreePos(states: Record<string, FsmStateNode>): { x: number; y: number } {
  const placed = Object.values(states).map(s => ({x:s.x,y:s.y}));
  const gap = 140;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const x = 140 + col * gap, y = 150 + row * gap;
      if (placed.every(p => Math.hypot(p.x-x, p.y-y) > gap*0.7)) return {x,y};
    }
  }
  return { x: 300+Math.random()*200, y: 200+Math.random()*150 };
}

// ── Action union ──────────────────────────────────────────────────────────────
export type FsmAction =
  | { type:'ADD_STATE';          payload?: { x?: number; y?: number } }
  | { type:'UPDATE_STATE';       payload: { id: string } & Partial<Omit<FsmStateNode,'id'>> }
  | { type:'MOVE_STATE';         payload: { id: string; x: number; y: number } }
  | { type:'MOVE_STATES';        payload: { deltas: Record<string, { x: number; y: number }> } }
  | { type:'DELETE_STATE';       payload: { id: string } }
  | { type:'SET_INITIAL';        payload: { id: string } }
  | { type:'ADD_TRANSITION';     payload: Omit<FsmTransition,'id'> }
  | { type:'UPDATE_TRANSITION';  payload: { id: string } & Partial<Omit<FsmTransition,'id'>> }
  | { type:'DELETE_TRANSITION';  payload: { id: string } }
  | { type:'SET_ARCH';           payload: { archType: FsmArchType } }
  | { type:'SET_INPUT_COUNT';    payload: { count: number } }
  | { type:'SET_OUTPUT_COUNT';   payload: { count: number } }
  | { type:'SET_INPUT_NAME';     payload: { index: number; name: string } }
  | { type:'SET_OUTPUT_NAME';    payload: { index: number; name: string } }
  | { type:'RENAME';             payload: { name: string } }
  | { type:'RESET_FSM' }
  | { type:'LOAD_FSM';           payload: FsmMachine };

// ── Reducer ───────────────────────────────────────────────────────────────────
export function fsmReducer(state: FsmMachine, action: FsmAction): FsmMachine {
  switch (action.type) {

    case 'ADD_STATE': {
      const id  = generateId();
      const pos = (action.payload?.x != null)
        ? { x: action.payload.x!, y: action.payload.y! }
        : findFreePos(state.states);
      const idx = Object.keys(state.states).length;
      return {
        ...state,
        states: {
          ...state.states,
          [id]: { id, label: `S${idx}`, x: pos.x, y: pos.y, isInitial: idx===0, output: 0 },
        },
      };
    }

    case 'UPDATE_STATE': {
      const { id, ...rest } = action.payload;
      if (!state.states[id]) return state;

      // Ensure label uniqueness (case-insensitive)
      if (rest.label != null) {
        let candidate = rest.label;
        const otherLabels = Object.values(state.states)
          .filter(s => s.id !== id)
          .map(s => s.label.toUpperCase());

        if (otherLabels.includes(candidate.toUpperCase())) {
          let suffix = 1;
          while (otherLabels.includes(`${candidate}_${suffix}`.toUpperCase())) {
            suffix++;
          }
          candidate = `${candidate}_${suffix}`;
        }
        rest.label = candidate;
      }

      return { ...state, states: { ...state.states, [id]: { ...state.states[id], ...rest } } };
    }

    case 'MOVE_STATE': {
      const { id, x, y } = action.payload;
      if (!state.states[id]) return state;
      return { ...state, states: { ...state.states, [id]: { ...state.states[id], x, y } } };
    }

    case 'MOVE_STATES': {
      const ns = { ...state.states };
      for (const [id, pos] of Object.entries(action.payload.deltas)) {
        if (ns[id]) ns[id] = { ...ns[id], x: pos.x, y: pos.y };
      }
      return { ...state, states: ns };
    }

    case 'DELETE_STATE': {
      const { id } = action.payload;
      const ns = { ...state.states };
      delete ns[id];
      const rem = Object.values(ns);
      if (rem.length > 0 && !rem.some(s => s.isInitial)) {
        ns[rem[0].id] = { ...rem[0], isInitial: true };
      }
      return { ...state, states: ns, transitions: state.transitions.filter(t => t.fromId!==id && t.toId!==id) };
    }

    case 'SET_INITIAL': {
      const { id } = action.payload;
      const ns: Record<string,FsmStateNode> = {};
      for (const [sid,s] of Object.entries(state.states)) ns[sid] = { ...s, isInitial: sid===id };
      return { ...state, states: ns };
    }

    case 'ADD_TRANSITION': {
      const id = generateId();
      return { ...state, transitions: [...state.transitions, { id, ...action.payload }] };
    }

    case 'UPDATE_TRANSITION':
      return {
        ...state,
        transitions: state.transitions.map(t => t.id===action.payload.id ? { ...t, ...action.payload } : t),
      };

    case 'DELETE_TRANSITION':
      return { ...state, transitions: state.transitions.filter(t => t.id!==action.payload.id) };

    case 'SET_ARCH': return { ...state, archType: action.payload.archType };

    case 'SET_INPUT_COUNT': {
      const { count } = action.payload;
      const names = Array.from({length:count}, (_,i) => state.inputNames[i] ?? String.fromCharCode(65+i));
      return { ...state, inputCount: count, inputNames: names };
    }

    case 'SET_OUTPUT_COUNT': {
      const { count } = action.payload;
      const names = Array.from({length:count}, (_,i) => state.outputNames[i] ?? String.fromCharCode(89-i));
      const mask  = (1<<count)-1;
      const ns: Record<string,FsmStateNode> = {};
      for (const [id,s] of Object.entries(state.states)) ns[id] = { ...s, output: s.output & mask };
      const nt = state.transitions.map(t => ({ ...t, mealyOutput: t.mealyOutput & mask }));
      return { ...state, outputCount: count, outputNames: names, states: ns, transitions: nt };
    }

    case 'SET_INPUT_NAME': {
      const names = [...state.inputNames];
      if (action.payload.index >= 0 && action.payload.index < names.length) {
        const candidate = action.payload.name.toUpperCase().slice(0,4);
        // Reject names starting with a digit (V3-M5) – they are unusable in conditions
        if (/^[0-9]/.test(candidate)) return state;
        names[action.payload.index] = candidate;
      }
      return { ...state, inputNames: names };
    }

    case 'SET_OUTPUT_NAME': {
      const names = [...state.outputNames];
      if (action.payload.index >= 0 && action.payload.index < names.length)
        names[action.payload.index] = action.payload.name.toUpperCase().slice(0,4);
      return { ...state, outputNames: names };
    }

    case 'RENAME': return { ...state, name: action.payload.name };

    case 'RESET_FSM': return createDefaultFsm();

    case 'LOAD_FSM': return action.payload;

    default: return state;
  }
}

// ── Default machine ───────────────────────────────────────────────────────────
export function createDefaultFsm(): FsmMachine {
  const s0 = generateId(), s1 = generateId();
  return {
    id:          generateId(),
    name:        'Neue FSM',
    archType:    'moore',
    inputCount:  1,
    inputNames:  ['A'],
    outputCount: 1,
    outputNames: ['Y'],
    states: {
      [s0]: { id:s0, label:'S0', x:220, y:280, isInitial:true,  output:0 },
      [s1]: { id:s1, label:'S1', x:560, y:280, isInitial:false, output:1 },
    },
    transitions: [],
  };
}

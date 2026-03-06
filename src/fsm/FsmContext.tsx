import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type React from 'react';
import type { FsmMachine } from './types';
import { fsmReducer, createDefaultFsm } from './fsmReducer';
import type { FsmAction } from './fsmReducer';

interface FsmCtxValue {
  fsm: FsmMachine;
  dispatch: React.Dispatch<FsmAction>;
}

const FSM_KEY = 'logicsim_fsm_v1';

function loadFsm(): FsmMachine {
  try {
    const raw = localStorage.getItem(FSM_KEY);
    if (raw) return JSON.parse(raw) as FsmMachine;
  } catch { /* ignore */ }
  return createDefaultFsm();
}

const FsmContext = createContext<FsmCtxValue | null>(null);

export function FsmProvider({ children }: { children: React.ReactNode }) {
  const [fsm, dispatch] = useReducer(fsmReducer, undefined, loadFsm);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(FSM_KEY, JSON.stringify(fsm)); } catch { /* ignore */ }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fsm]);
  return <FsmContext.Provider value={{ fsm, dispatch }}>{children}</FsmContext.Provider>;
}

export function useFsm(): FsmCtxValue {
  const ctx = useContext(FsmContext);
  if (!ctx) throw new Error('useFsm must be inside FsmProvider');
  return ctx;
}

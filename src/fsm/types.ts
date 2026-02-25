export type FsmArchType = 'moore' | 'mealy';

export interface FsmStateNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isInitial: boolean;
  /** Binary output value for Moore machines (per-state) */
  output: number;
}

export interface FsmTransition {
  id: string;
  fromId: string;
  toId: string;
  /** Boolean expression, e.g. "A & !B", "1" (always), "A | B" */
  conditionText: string;
  /** Output on this transition – only used in Mealy mode */
  mealyOutput: number;
}

export interface FsmMachine {
  id: string;
  name: string;
  archType: FsmArchType;
  inputCount: number;
  inputNames: string[];
  outputCount: number;
  outputNames: string[];
  states: Record<string, FsmStateNode>;
  transitions: FsmTransition[];
}

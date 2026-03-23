import { generateId } from '../../utils/idGenerator';
import type { GateInstance, Wire, Circuit, GateProjectionMetadata } from '../../core/types';
import type { FsmMachine, FsmStateNode } from '../types';
import { parseCondition, evalCondition, validateVars } from '../conditionParser';
import type { Expr } from '../conditionParser';
import { requireFsmStructure } from '../analysis/structure';

// ── helpers ───────────────────────────────────────────────────────────────────
const SIG0 = { value: 0 as const, version: 0, lastChangedAt: 0 };

function snap(v: number, g = 20) { return Math.round(v / g) * g; }

function mkGate(
  typeId: string,
  x: number,
  y: number,
  label?: string,
  projection?: GateProjectionMetadata,
): GateInstance {
  return { id: generateId(), typeId, x, y, label, projection, outputSignals: {}, isSelected: false };
}
function mkWire(fromGateId: string, fromPortId: string, toGateId: string, toPortId: string): Wire {
  return { id: generateId(), from: { gateId: fromGateId, portId: fromPortId },
    to: { gateId: toGateId, portId: toPortId }, signal: SIG0, isSelected: false };
}

interface Sig { gateId: string; portId: string; }

function mkProjection(
  batchId: string,
  role: GateProjectionMetadata['role'],
  visibility: GateProjectionMetadata['visibility'],
  signalLabel: string,
  groupKey: string,
  signalPortId?: string,
): GateProjectionMetadata {
  return {
    sourceSystem: 'fsm_synth',
    projectionBatchId: batchId,
    role,
    visibility,
    signalLabel,
    groupKey,
    signalPortId,
  };
}

function createUniqueSignalLabelAllocator(existingCircuit: Circuit): (baseLabel: string) => string {
  const usedLabels = new Set<string>();

  const remember = (label?: string | null) => {
    const normalized = label?.trim();
    if (!normalized) return;
    usedLabels.add(normalized.toUpperCase());
  };

  for (const gate of Object.values(existingCircuit.gates)) {
    remember(gate.label);
    remember(gate.projection?.signalLabel);
  }

  return (baseLabel: string) => {
    const trimmed = baseLabel.trim();
    let candidate = trimmed;
    let suffix = 1;
    while (usedLabels.has(candidate.toUpperCase())) {
      candidate = `${trimmed}_${suffix}`;
      suffix++;
    }
    usedLabels.add(candidate.toUpperCase());
    return candidate;
  };
}

// ── overlap detection ─────────────────────────────────────────────────────────

export interface OverlapWarning {
  stateId: string;
  transitionIds: [string, string];
  inputCombo: string;
}

interface RawSopComplexityEstimate {
  gateCount: number;
  wireCount: number;
  maxFunctionMinterms: number;
  variableSpan: number;
}

export interface FsmSynthesisGuardrailInfo {
  blocked: boolean;
  message: string | null;
  estimate: RawSopComplexityEstimate | null;
  warnings: string[];
}

interface PreparedFsmSynthesisModel {
  structure: ReturnType<typeof requireFsmStructure>;
  inputCount: number;
  outputCount: number;
  inputNames: string[];
  outputNames: string[];
  archType: FsmMachine['archType'];
  stateBitCount: number;
  totalVariableCount: number;
  states: Record<string, FsmStateNode>;
  transitions: ReturnType<typeof requireFsmStructure>['effectiveTransitions'];
  mintSets: Set<number>[];
  warnings: string[];
  complexityEstimate: RawSopComplexityEstimate;
}

const MAX_RAW_SYNTHESIS_GATES = 240;
const MAX_RAW_SYNTHESIS_WIRES = 480;

function buildWideSynthesisBlockMessage(complexityEstimate: RawSopComplexityEstimate): string {
  return (
    `Breite FSM-Synthese ist aktuell bewusst blockiert: die unverdichtete SOP ` +
    `wuerde voraussichtlich ca. ${complexityEstimate.gateCount} Gatter und ` +
    `${complexityEstimate.wireCount} Leitungen erzeugen ` +
    `(max. ${complexityEstimate.maxFunctionMinterms} Minterme in einer Funktion ` +
    `bei ${complexityEstimate.variableSpan} Variablen). ` +
    `Bitte die reduzierte STT im FSM-Editor verwenden; eine verdichtete ` +
    `Synthese (z. B. Quine-McCluskey oder aequivalente Bool-Minimierung) ` +
    `ist dafuer noch ausstehend.`
  );
}

/**
 * Detect overlapping transitions: for each state, find pairs of outgoing
 * transitions whose conditions are simultaneously true for at least one
 * input combination.  Returns one warning per overlapping pair (with the
 * first conflicting input combination as example).
 */
export function detectOverlappingTransitions(fsm: FsmMachine): OverlapWarning[] {
  const { inputCount: M, inputNames, transitions, states } = fsm;
  const warnings: OverlapWarning[] = [];
  const seenPairs = new Set<string>();

  // Cache parsed ASTs to avoid re-parsing per input combo (FSM-L4)
  const astCache = new Map<string, Expr | null>();
  for (const t of transitions) {
    if (!astCache.has(t.id)) {
      const { ast, error } = parseCondition(t.conditionText);
      astCache.set(t.id, (!error && ast) ? ast : null);
    }
  }

  for (const state of Object.values(states)) {
    const outgoing = transitions.filter(t => t.fromId === state.id);
    if (outgoing.length < 2) continue;

    if (M > 15) return warnings; // Too many inputs for brute-force enumeration
    const combos = 1 << M;
    for (let x = 0; x < combos; x++) {
      const vals: Record<string, boolean> = {};
      for (let j = 0; j < M; j++) vals[inputNames[j]] = ((x >> j) & 1) === 1;

      // collect every transition whose condition is true for this combo
      const matching: typeof outgoing = [];
      for (const t of outgoing) {
        const ast = astCache.get(t.id);
        if (ast && evalCondition(ast, vals)) matching.push(t);
      }

      if (matching.length > 1) {
        for (let i = 0; i < matching.length; i++) {
          for (let j = i + 1; j < matching.length; j++) {
            const key = `${matching[i].id}|${matching[j].id}`;
            if (!seenPairs.has(key)) {
              seenPairs.add(key);
              const combo = inputNames.map(name => (vals[name] ? '1' : '0')).join('');
              warnings.push({
                stateId: state.id,
                transitionIds: [matching[i].id, matching[j].id],
                inputCombo: combo,
              });
            }
          }
        }
      }
    }
  }

  return warnings;
}

function estimateRawSopComplexity(
  mintSets: Set<number>[],
  inputCount: number,
  stateBitCount: number,
  outputCount: number,
  archType: FsmMachine['archType'],
  totalVariableCount: number,
): RawSopComplexityEstimate {
  let gateCount = 2 + (inputCount * 2) + (stateBitCount * 3) + outputCount;
  let wireCount = inputCount + (stateBitCount * 5) + outputCount;
  let maxFunctionMinterms = 0;
  let variableSpan = 0;

  for (let f = 0; f < stateBitCount + outputCount; f++) {
    const mintCount = mintSets[f].size;
    const isMooreOutput = f >= stateBitCount && archType === 'moore';
    const varCnt = isMooreOutput ? stateBitCount : totalVariableCount;
    const totalMintCount = 1 << varCnt;

    maxFunctionMinterms = Math.max(maxFunctionMinterms, mintCount);
    variableSpan = Math.max(variableSpan, varCnt);

    if (mintCount === 0 || mintCount === totalMintCount) {
      gateCount += 1;
      continue;
    }

    if (varCnt > 1) {
      const andGateCount = mintCount * (varCnt - 1);
      gateCount += andGateCount;
      wireCount += andGateCount * 2;
    }

    if (mintCount > 1) {
      const orGateCount = mintCount - 1;
      gateCount += orGateCount;
      wireCount += orGateCount * 2;
    }
  }

  return {
    gateCount,
    wireCount,
    maxFunctionMinterms,
    variableSpan,
  };
}

function prepareFsmSynthesisModel(fsm: FsmMachine): PreparedFsmSynthesisModel {
  const structure = requireFsmStructure(fsm);
  const warnings: string[] = [];

  if (structure.unreachableStates.length > 0) {
    warnings.push(
      `FSM: Unerreichbare Zustände werden nicht synthetisiert (${structure.unreachableStates.map((state) => state.label).join(', ')})`,
    );
  }

  for (const t of structure.effectiveTransitions) {
    const { ast, error } = parseCondition(t.conditionText);
    if (error) throw new Error(`Transition "${t.conditionText}": ${error}`);
    if (ast) {
      const varErr = validateVars(ast, fsm.inputNames);
      if (varErr) throw new Error(`Transition "${t.conditionText}": ${varErr}`);
    }
  }

  const { inputCount: M, outputCount: K, inputNames, outputNames, archType } = fsm;
  const states = Object.fromEntries(
    structure.reachableStates.map((state) => [state.id, state]),
  ) as Record<string, FsmStateNode>;
  const transitions = structure.effectiveTransitions;
  if (M > 15) throw new Error(`Zu viele Eingänge für Synthese (${M}). Maximum: 15.`);
  const encMap = structure.encodingByStateId;
  const N = structure.effectiveBitWidth;
  const V = N + M;

  const mintSets: Set<number>[] = Array.from({ length: N + K }, () => new Set<number>());
  const stateList = structure.reachableStates;
  const unmatchedStates = new Set<string>();
  const transAstMap = new Map<string, Expr | null>();
  for (const t of transitions) {
    const { ast, error } = parseCondition(t.conditionText);
    transAstMap.set(t.id, (!error && ast) ? ast : null);
  }

  for (const state of stateList) {
    const encInt = encMap.get(state.id) ?? 0;
    const inputCombos = 1 << M;

    for (let x = 0; x < inputCombos; x++) {
      const mintIdx = encInt | (x << N);
      const vals: Record<string, boolean> = {};
      for (let j = 0; j < M; j++) vals[inputNames[j]] = ((x >> j) & 1) === 1;

      let nextState: FsmStateNode | null = null;
      let mealyOut = 0;
      for (const t of transitions.filter((transition) => transition.fromId === state.id)) {
        const ast = transAstMap.get(t.id);
        if (ast && evalCondition(ast, vals)) {
          nextState = states[t.toId] ?? null;
          mealyOut = t.mealyOutput;
          break;
        }
      }

      if (!nextState && archType === 'mealy') {
        unmatchedStates.add(state.label);
      }

      const nsEnc = nextState ? (encMap.get(nextState.id) ?? 0) : encInt;
      for (let i = 0; i < N; i++) {
        if (((nsEnc >> i) & 1) === 1) mintSets[i].add(mintIdx);
      }

      if (archType === 'mealy') {
        for (let k = 0; k < K; k++) {
          if (((mealyOut >> (K - 1 - k)) & 1) === 1) mintSets[N + k].add(mintIdx);
        }
      }
    }

    if (archType === 'moore') {
      for (let k = 0; k < K; k++) {
        if (((state.output >> (K - 1 - k)) & 1) === 1) mintSets[N + k].add(encInt);
      }
    }
  }

  if (unmatchedStates.size > 0) {
    warnings.push(`Mealy: Unvollständige Transitions in ${[...unmatchedStates].join(', ')} — fehlende Kombinationen verwenden Output=0`);
  }

  const complexityEstimate = estimateRawSopComplexity(
    mintSets,
    M,
    N,
    K,
    archType,
    V,
  );

  return {
    structure,
    inputCount: M,
    outputCount: K,
    inputNames,
    outputNames,
    archType,
    stateBitCount: N,
    totalVariableCount: V,
    states,
    transitions,
    mintSets,
    warnings,
    complexityEstimate,
  };
}

export function analyzeFsmSynthesisGuardrail(fsm: FsmMachine): FsmSynthesisGuardrailInfo {
  try {
    const prepared = prepareFsmSynthesisModel(fsm);
    const blocked = (
      prepared.complexityEstimate.gateCount > MAX_RAW_SYNTHESIS_GATES
      || prepared.complexityEstimate.wireCount > MAX_RAW_SYNTHESIS_WIRES
    );
    return {
      blocked,
      message: blocked ? buildWideSynthesisBlockMessage(prepared.complexityEstimate) : null,
      estimate: prepared.complexityEstimate,
      warnings: prepared.warnings,
    };
  } catch {
    return {
      blocked: false,
      message: null,
      estimate: null,
      warnings: [],
    };
  }
}

// ── main synthesis ────────────────────────────────────────────────────────────
export function synthesizeFsm(
  fsm: FsmMachine,
  existingCircuit: Circuit,
): { gates: Record<string, GateInstance>; wires: Record<string, Wire>; warnings: string[] } {
  const prepared = prepareFsmSynthesisModel(fsm);
  const {
    inputCount: M,
    outputCount: K,
    inputNames,
    outputNames,
    archType,
    stateBitCount: N,
    totalVariableCount: V,
    mintSets,
    warnings: preparedWarnings,
    complexityEstimate,
  } = prepared;

  const gates: Record<string, GateInstance> = {};
  const wires: Record<string, Wire>         = {};
  const add  = (g: GateInstance) => { gates[g.id] = g; return g; };
  const conn = (a: Sig, b: Sig)  => { const w = mkWire(a.gateId, a.portId, b.gateId, b.portId); wires[w.id] = w; };
  const warnings: string[] = [...preparedWarnings];
  const projectionBatchId = generateId();
  const reserveSignalLabel = createUniqueSignalLabelAllocator(existingCircuit);
  const mkBatchProjection = (
    role: GateProjectionMetadata['role'],
    visibility: GateProjectionMetadata['visibility'],
    signalLabel: string,
    groupKey: string,
    signalPortId?: string,
  ): GateProjectionMetadata => mkProjection(
    projectionBatchId,
    role,
    visibility,
    signalLabel,
    groupKey,
    signalPortId,
  );

  // ── start position ──────────────────────────────────────────────────────────
  const xs = Object.values(existingCircuit.gates).map(g => g.x + 100);
  const startX = snap(Math.max(300, ...xs) + 200);
  const startY = 60;
  const SW = 140;                           // column stride

  const clockLabel = reserveSignalLabel('CLK');
  const resetLabel = reserveSignalLabel('RST');
  const inputLabels = inputNames.map((name) => reserveSignalLabel(name));
  const stateLabels = Array.from({ length: N }, (_, i) => reserveSignalLabel(`Q${i}`));
  const outputLabels = outputNames.map((name) => reserveSignalLabel(name));

  // ── Section A: control inputs (col 0) ──────────────────────────────────────
  const clkG  = add(mkGate('CLOCK',        startX, startY,        clockLabel, mkBatchProjection('clock', 'canonical', clockLabel, `clock:${clockLabel}`, 'clk')));
  const rstG  = add(mkGate('INPUT_SWITCH', startX, startY + 80,   resetLabel, mkBatchProjection('reset', 'canonical', resetLabel, `reset:${resetLabel}`, 'out')));
  const inGs  = inputLabels.map((label, i) =>
    add(mkGate('INPUT_SWITCH', startX, startY + 220 + i * 80, label, mkBatchProjection('input', 'canonical', label, `input:${label}`, 'out'))));

  // ── Section B: NOT gates for inputs (col 1) ────────────────────────────────
  const notInGs = inputLabels.map((label, i) =>
    add(mkGate('NOT', startX + SW, startY + 220 + i * 80, `!${label}`, mkBatchProjection('internal_helper', 'derived', `!${label}`, `input:${label}`))));
  inGs.forEach((g, i) => conn({ gateId: g.id, portId: 'out' }, { gateId: notInGs[i].id, portId: 'a' }));

  // ── Section C: D_FF_R gates (col 1, below inputs) ─────────────────────────
  const dffY0 = startY + 220 + M * 80 + 80;
  const dffGs = Array.from({ length: N }, (_, i) =>
    add(mkGate('D_FF_R', startX + SW, dffY0 + i * 120, stateLabels[i], mkBatchProjection('state', 'canonical', stateLabels[i], `state:${stateLabels[i]}`, 'q'))));
  dffGs.forEach(dff => {
    conn({ gateId: clkG.id,  portId: 'clk' }, { gateId: dff.id, portId: 'clk' });
    conn({ gateId: rstG.id,  portId: 'out' }, { gateId: dff.id, portId: 'rst' });
  });

  // ── Section D: NOT gates for Q (col 2) ────────────────────────────────────
  const notQGs = Array.from({ length: N }, (_, i) =>
    add(mkGate('NOT', startX + SW * 2, dffY0 + i * 120, `!${stateLabels[i]}`, mkBatchProjection('state_inverted', 'derived', `!${stateLabels[i]}`, `state:${stateLabels[i]}`))));
  dffGs.forEach((dff, i) =>
    conn({ gateId: dff.id, portId: 'q' }, { gateId: notQGs[i].id, portId: 'a' }));

  // ── Signal look-up ──────────────────────────────────────────────────────────
  // Index j: 0..N-1 = Q bits, N..N+M-1 = input bits
  const trueSig: Sig[] = [
    ...dffGs.map(g    => ({ gateId: g.id,    portId: 'q'   })),
    ...inGs.map(g     => ({ gateId: g.id,    portId: 'out' })),
  ];
  const invSig: Sig[] = [
    ...notQGs.map(g   => ({ gateId: g.id,    portId: 'out' })),
    ...notInGs.map(g  => ({ gateId: g.id,    portId: 'out' })),
  ];

  if (
    complexityEstimate.gateCount > MAX_RAW_SYNTHESIS_GATES ||
    complexityEstimate.wireCount > MAX_RAW_SYNTHESIS_WIRES
  ) {
    throw new Error(buildWideSynthesisBlockMessage(complexityEstimate));
  }

  // ── SOP circuit builder ───────────────────────────────────────────────────
  const sopX = startX + SW * 3;
  let   sopY = startY;
  const MROW = 80, SCOL = SW;

  const funcOutSigs: (Sig | null)[] = [];

  for (let f = 0; f < N + K; f++) {
    const mintList  = [...mintSets[f]].sort((a, b) => a - b);
    const isMooreOut = (f >= N && archType === 'moore');
    const varCnt    = isMooreOut ? N : V;   // Moore outputs: only state variables
    const funcLabel = f < N ? `D${f}` : outputNames[f - N];
    const totalMint = 1 << varCnt;

    if (mintList.length === 0) {
      // Always 0
      const g = add(mkGate('CONST_LOW',  sopX, sopY, `${funcLabel}≡0`));
      funcOutSigs.push({ gateId: g.id, portId: 'out' });
      sopY += 60;
      continue;
    }
    if (mintList.length === totalMint) {
      // Always 1
      const g = add(mkGate('CONST_HIGH', sopX, sopY, `${funcLabel}≡1`));
      funcOutSigs.push({ gateId: g.id, portId: 'out' });
      sopY += 60;
      continue;
    }

    // Build AND chains + OR tree
    const mintOuts: Sig[] = [];

    for (const m of mintList) {
      // Literal sources for this minterm
      const lits: Sig[] = [];
      for (let j = 0; j < varCnt; j++) {
        lits.push(((m >> j) & 1) === 1 ? trueSig[j] : invSig[j]);
      }

      let chainOut: Sig;
      if (lits.length === 1) {
        chainOut = lits[0];
      } else {
        let prev = lits[0];
        for (let s = 1; s < lits.length; s++) {
          const andG = add(mkGate('AND', sopX + (s - 1) * SCOL, sopY));
          conn(prev,    { gateId: andG.id, portId: 'a' });
          conn(lits[s], { gateId: andG.id, portId: 'b' });
          prev = { gateId: andG.id, portId: 'out' };
        }
        chainOut = prev;
      }
      mintOuts.push(chainOut);
      sopY += MROW;
    }

    // OR tree
    const orX = sopX + (varCnt - 1) * SCOL;
    let orOut: Sig;
    if (mintOuts.length === 1) {
      orOut = mintOuts[0];
    } else {
      let prev = mintOuts[0];
      for (let i = 1; i < mintOuts.length; i++) {
        const orG = add(mkGate('OR', orX, sopY));
        conn(prev,        { gateId: orG.id, portId: 'a' });
        conn(mintOuts[i], { gateId: orG.id, portId: 'b' });
        prev = { gateId: orG.id, portId: 'out' };
        sopY += MROW;
      }
      orOut = prev;
    }

    funcOutSigs.push(orOut);
    sopY += 60;   // gap between functions
  }

  // ── Wire D inputs ─────────────────────────────────────────────────────────
  for (let i = 0; i < N; i++) {
    const sig = funcOutSigs[i];
    if (sig) conn(sig, { gateId: dffGs[i].id, portId: 'd' });
  }

  // ── Output LEDs ───────────────────────────────────────────────────────────
  const ledX = snap(sopX + V * SCOL + 80);
  for (let k = 0; k < K; k++) {
    const led = add(mkGate('OUTPUT_LED', ledX, startY + k * 100, outputLabels[k], mkBatchProjection('output', 'canonical', outputLabels[k], `output:${outputLabels[k]}`, '_display')));
    const sig = funcOutSigs[N + k];
    if (sig) conn(sig, { gateId: led.id, portId: 'in' });
  }
  // State Q output LEDs
  for (let i = 0; i < N; i++) {
    const led = add(mkGate('OUTPUT_LED', ledX + 100, startY + i * 100, stateLabels[i], mkBatchProjection('display_mirror', 'derived', stateLabels[i], `state:${stateLabels[i]}`, '_display')));
    conn({ gateId: dffGs[i].id, portId: 'q' }, { gateId: led.id, portId: 'in' });
  }

  return { gates, wires, warnings };
}

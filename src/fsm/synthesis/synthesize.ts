import { generateId } from '../../utils/idGenerator';
import type { GateInstance, Wire, Circuit, GateProjectionMetadata } from '../../core/types';
import type { FsmMachine, FsmStateNode } from '../types';
import { parseCondition, evalCondition, validateVars } from '../conditionParser';
import type { Expr } from '../conditionParser';

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

// ── state encoding ─────────────────────────────────────────────────────────────
function getEncoding(fsm: FsmMachine): Map<string, number> {
  const list     = Object.values(fsm.states);
  const initials = list.filter(s => s.isInitial);
  if (initials.length === 0) throw new Error('FSM hat keinen Startzustand');
  if (initials.length > 1)   throw new Error('FSM hat mehrere Startzustände');
  const initial = initials[0];
  const others  = list.filter(s => !s.isInitial).sort((a, b) => a.label.localeCompare(b.label));
  const ordered = [initial, ...others];
  const enc     = new Map<string, number>();
  ordered.forEach((s, i) => enc.set(s.id, i));
  return enc;
}

// ── overlap detection ─────────────────────────────────────────────────────────

export interface OverlapWarning {
  stateId: string;
  transitionIds: [string, string];
  inputCombo: string;
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

// ── main synthesis ────────────────────────────────────────────────────────────
export function synthesizeFsm(
  fsm: FsmMachine,
  existingCircuit: Circuit,
): { gates: Record<string, GateInstance>; wires: Record<string, Wire>; warnings: string[] } {

  const gates: Record<string, GateInstance> = {};
  const wires: Record<string, Wire>         = {};
  const add  = (g: GateInstance) => { gates[g.id] = g; return g; };
  const conn = (a: Sig, b: Sig)  => { const w = mkWire(a.gateId, a.portId, b.gateId, b.portId); wires[w.id] = w; };
  const warnings: string[] = [];
  const projectionBatchId = generateId();
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

  // ── Pre-validate all transition conditions (V3-M7 + FSM-M7) ────────────────
  for (const t of fsm.transitions) {
    const { ast, error } = parseCondition(t.conditionText);
    if (error) throw new Error(`Transition "${t.conditionText}": ${error}`);
    if (ast) {
      const varErr = validateVars(ast, fsm.inputNames);
      if (varErr) throw new Error(`Transition "${t.conditionText}": ${varErr}`);
    }
  }

  const { inputCount: M, outputCount: K, inputNames, outputNames, archType, states } = fsm;
  if (M > 15) throw new Error(`Zu viele Eingänge für Synthese (${M}). Maximum: 15.`);
  const encMap = getEncoding(fsm);
  const N = Math.ceil(Math.log2(Math.max(2, Object.keys(states).length)));
  const V = N + M;                          // total variables for D functions

  // ── start position ──────────────────────────────────────────────────────────
  const xs = Object.values(existingCircuit.gates).map(g => g.x + 100);
  const startX = snap(Math.max(300, ...xs) + 200);
  const startY = 60;
  const SW = 140;                           // column stride

  // ── Section A: control inputs (col 0) ──────────────────────────────────────
  const clkG  = add(mkGate('CLOCK',        startX, startY,        'CLK', mkBatchProjection('clock', 'canonical', 'CLK', 'clock:CLK', 'clk')));
  const rstG  = add(mkGate('INPUT_SWITCH', startX, startY + 80,   'RST', mkBatchProjection('reset', 'canonical', 'RST', 'reset:RST', 'out')));
  const inGs  = inputNames.map((name, i) =>
    add(mkGate('INPUT_SWITCH', startX, startY + 220 + i * 80, name, mkBatchProjection('input', 'canonical', name, `input:${name}`, 'out'))));

  // ── Section B: NOT gates for inputs (col 1) ────────────────────────────────
  const notInGs = inputNames.map((name, i) =>
    add(mkGate('NOT', startX + SW, startY + 220 + i * 80, `!${name}`, mkBatchProjection('internal_helper', 'derived', `!${name}`, `input:${name}`))));
  inGs.forEach((g, i) => conn({ gateId: g.id, portId: 'out' }, { gateId: notInGs[i].id, portId: 'a' }));

  // ── Section C: D_FF_R gates (col 1, below inputs) ─────────────────────────
  const dffY0 = startY + 220 + M * 80 + 80;
  const dffGs = Array.from({ length: N }, (_, i) =>
    add(mkGate('D_FF_R', startX + SW, dffY0 + i * 120, `Q${i}`, mkBatchProjection('state', 'canonical', `Q${i}`, `state:Q${i}`, 'q'))));
  dffGs.forEach(dff => {
    conn({ gateId: clkG.id,  portId: 'clk' }, { gateId: dff.id, portId: 'clk' });
    conn({ gateId: rstG.id,  portId: 'out' }, { gateId: dff.id, portId: 'rst' });
  });

  // ── Section D: NOT gates for Q (col 2) ────────────────────────────────────
  const notQGs = Array.from({ length: N }, (_, i) =>
    add(mkGate('NOT', startX + SW * 2, dffY0 + i * 120, `!Q${i}`, mkBatchProjection('state_inverted', 'derived', `!Q${i}`, `state:Q${i}`))));
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

  // ── Truth table → minterms ────────────────────────────────────────────────
  // minterms[0..N-1] = D_i functions  (V = N+M variables)
  // minterms[N..N+K-1] = output functions
  const mintSets: Set<number>[] = Array.from({ length: N + K }, () => new Set<number>());

  const stateList = Object.values(states);
  const unmatchedStates = new Set<string>();

  // Pre-parse transition ASTs for O(1) lookup in the inner loop
  const transAstMap = new Map<string, Expr | null>();
  for (const t of fsm.transitions) {
    const { ast, error } = parseCondition(t.conditionText);
    transAstMap.set(t.id, (!error && ast) ? ast : null);
  }

  for (const state of stateList) {
    const encInt    = encMap.get(state.id) ?? 0;
    const inputCombos = 1 << M;

    for (let x = 0; x < inputCombos; x++) {
      // Minterm index: Q bits in positions 0..N-1, input bits in positions N..N+M-1
      const mintIdx = encInt | (x << N);

      // Build input value map for evalCondition
      const vals: Record<string, boolean> = {};
      for (let j = 0; j < M; j++) vals[inputNames[j]] = ((x >> j) & 1) === 1;

      // Find matching transition
      let nextState: FsmStateNode | null = null;
      let mealyOut  = 0;
      for (const t of fsm.transitions.filter(t => t.fromId === state.id)) {
        const ast = transAstMap.get(t.id);
        if (ast && evalCondition(ast, vals)) {
          nextState = states[t.toId] ?? null;
          mealyOut  = t.mealyOutput;
          break;
        }
      }

      if (!nextState && archType === 'mealy') {
        unmatchedStates.add(state.label);
      }

      // D_i: bit i of next-state encoding
      const nsEnc = nextState ? (encMap.get(nextState.id) ?? 0) : encInt;
      for (let i = 0; i < N; i++) {
        if (((nsEnc >> i) & 1) === 1) mintSets[i].add(mintIdx);
      }

      // Output: for Mealy, use per-row output
      if (archType === 'mealy') {
        for (let k = 0; k < K; k++) {
          if (((mealyOut >> (K - 1 - k)) & 1) === 1) mintSets[N + k].add(mintIdx);
        }
      }
    }

    // Moore output: depends only on current state (N variables only)
    if (archType === 'moore') {
      for (let k = 0; k < K; k++) {
        if (((state.output >> (K - 1 - k)) & 1) === 1) mintSets[N + k].add(encInt);
      }
    }
  }

  if (unmatchedStates.size > 0) {
    warnings.push(`Mealy: Unvollständige Transitions in ${[...unmatchedStates].join(', ')} — fehlende Kombinationen verwenden Output=0`);
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
    const led = add(mkGate('OUTPUT_LED', ledX, startY + k * 100, outputNames[k], mkBatchProjection('output', 'canonical', outputNames[k], `output:${outputNames[k]}`, '_display')));
    const sig = funcOutSigs[N + k];
    if (sig) conn(sig, { gateId: led.id, portId: 'in' });
  }
  // State Q output LEDs
  for (let i = 0; i < N; i++) {
    const led = add(mkGate('OUTPUT_LED', ledX + 100, startY + i * 100, `Q${i}`, mkBatchProjection('display_mirror', 'derived', `Q${i}`, `state:Q${i}`, '_display')));
    conn({ gateId: dffGs[i].id, portId: 'q' }, { gateId: led.id, portId: 'in' });
  }

  return { gates, wires, warnings };
}

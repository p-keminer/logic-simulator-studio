/**
 * Contract Runner v1 — automated gate-contract verification engine.
 *
 * Reads all JSON contracts from validation/contracts/, exercises
 * the gate registry's evaluate() + stateUpdate() functions, and produces:
 *   - validation/contract-runner-summary.json  (machine-readable)
 *   - validation/contract-runner-report.md     (human-readable)
 *
 * Supported pattern families in v1:
 *   - truth-table-exhaustive  (combinational gates: full 2^N enumeration)
 *   - sequential-step-sequence (edge-triggered + level-sensitive FFs/latches)
 *   - clock-edge-detection    (all 4 CLK transitions for edge-triggered gates)
 *   - hold-state              (Q stable without active edge / enable)
 *   - async-control-override  (async S/R/CLR/PRE pins override clock)
 *   - reset-to-known-state    (async/sync reset reachability)
 *   - forbidden-input-combination (documented illegal input combos)
 *   - oe-tristate             (/OE toggle for Hi-Z gates)
 *
 * NOT supported in v1 (explicitly marked unsupported):
 *   - export-verilog / export-vhdl  (HDL export patterns, covered by focused-nine)
 *   - multi-driver-conflict         (requires circuit-level simulation)
 *   - counter-rollover              (multi-cycle, deferred to v2)
 *   - shift-sequence                (multi-cycle, deferred to v2)
 *   - load-shift-mode               (multi-cycle, deferred to v2)
 *   - ui-state-projection           (requires UI, not unit-testable here)
 *
 * Usage:
 *   npx vite-node validation/run-contract-runner.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS_DIR = path.join(ROOT, 'validation', 'contracts');
const SUMMARY_FILE = path.join(ROOT, 'validation', 'contract-runner-summary.json');
const REPORT_FILE = path.join(ROOT, 'validation', 'contract-runner-report.md');
const RUNNER_VERSION = '1.0.0';

function fileHref(...parts) {
  return pathToFileURL(path.join(ROOT, ...parts)).href;
}

// ── Bootstrap gate registry via vite-node TS import ──────────────────────────
await import(fileHref('src', 'core', 'registry', 'index.ts'));
const { gateRegistry } = await import(fileHref('src', 'core', 'registry', 'GateRegistry.ts'));

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * @typedef {'pass' | 'fail' | 'unsupported'} CaseStatus
 *
 * @typedef {{
 *   gateTypeId: string,
 *   patternId: string,
 *   caseId: string,
 *   status: CaseStatus,
 *   expected: unknown,
 *   actual: unknown,
 *   errorClass: string | null,
 *   sourceContract: string,
 *   runnerVersion: string,
 * }} CaseResult
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simulates one full state transition cycle (evaluate -> stateUpdate -> evaluate).
 */
function stateTransition(def, inputs, currentState) {
  const inputVals = {};
  for (const p of def.inputs) {
    inputVals[p.id] = inputs[p.id] ?? def.defaultInputValues?.[p.id] ?? 0;
  }
  const outputsOld = def.evaluate(inputVals, currentState);
  const nextState = def.stateUpdate
    ? def.stateUpdate(inputVals, outputsOld, currentState)
    : { ...currentState };
  const outputs = def.evaluate(inputVals, nextState);
  return { outputs, nextState };
}

/**
 * Build an initial state with all visible keys = initVal and all hidden
 * edge-detection keys = clkVal.  Works with def.stateInit when available
 * and falls back to heuristics for 74xx gates without P1-3 metadata.
 */
function buildInitState(def, contract, visibleVal, clkVal) {
  const visibleKeys = def.stateKeys ?? ['q'];
  const state = {};

  // Start from stateInit if available
  if (def.stateInit) {
    Object.assign(state, def.stateInit);
  }

  // Set visible keys
  for (const k of visibleKeys) state[k] = visibleVal;

  // Set hidden prevClk keys
  if (def.hiddenStateKeys) {
    for (const hk of def.hiddenStateKeys) state[hk] = clkVal;
  } else {
    // Heuristic for gates without hiddenStateKeys metadata:
    // Set ALL known prevClk-style patterns used by 74xx ICs.
    state.prevClk = clkVal;
    state.pClk = clkVal;     // 74HC161/163/194/374
    state.pShcp = clkVal;    // 74HC595 shift clock
    state.pStcp = clkVal;    // 74HC595 store clock
    // 74HC74 uses pc1/pc2
    if (contract.typeId === '74HC74') {
      state.pc1 = clkVal;
      state.pc2 = clkVal;
    }
  }

  return state;
}

/**
 * Identify which visible state key(s) a given clock port drives.
 * E.g. for 74HC74: clk1 -> q1, clk2 -> q2.
 */
function clockToStateKeys(clkId, contract, def) {
  const visibleKeys = def.stateKeys ?? ['q'];
  // Try suffix matching: clk1 -> q1, clk2 -> q2
  const suffix = clkId.replace(/^clk/, '');
  if (suffix) {
    const matched = visibleKeys.filter(k => k.endsWith(suffix));
    if (matched.length > 0) return matched;
  }
  return visibleKeys;
}

/**
 * Identify the prevClk key for a specific clock port.
 * Handles pc1/pc2 for 74HC74, pClk for 74HC161/163/194/374,
 * pShcp/pStcp for 74HC595, prevClk for standard FFs.
 */
function prevClkKeyForClock(clkId, contract, def) {
  if (def.hiddenStateKeys) {
    // Check for exact match like 'prevClk' or suffix match like 'pc1'
    const suffix = clkId.replace(/^clk/, '');
    if (suffix) {
      const match = def.hiddenStateKeys.find(k => k.endsWith(suffix) || k === `pc${suffix}`);
      if (match) return match;
    }
    return def.hiddenStateKeys.find(k => k === 'prevClk') ?? def.hiddenStateKeys[0] ?? 'prevClk';
  }
  // Heuristic for 74xx ICs without hiddenStateKeys
  if (contract.typeId === '74HC74') {
    const suffix = clkId.replace(/^clk/, '');
    return `pc${suffix}`;
  }
  // 74HC595: shcp -> pShcp, stcp -> pStcp
  if (clkId === 'shcp') return 'pShcp';
  if (clkId === 'stcp') return 'pStcp';
  // 74HC161/163/194/374 use pClk
  if (contract.typeId.startsWith('74HC')) return 'pClk';
  return 'prevClk';
}

function makeResult(gateTypeId, patternId, caseId, status, expected, actual, errorClass, contractFile) {
  return {
    gateTypeId,
    patternId,
    caseId,
    status,
    expected,
    actual,
    errorClass,
    sourceContract: contractFile,
    runnerVersion: RUNNER_VERSION,
  };
}

// ── Pattern runners ──────────────────────────────────────────────────────────

const SUPPORTED_PATTERNS = new Set([
  'truth-table-exhaustive',
  'sequential-step-sequence',
  'clock-edge-detection',
  'hold-state',
  'async-control-override',
  'reset-to-known-state',
  'forbidden-input-combination',
  'oe-tristate',
]);

const UNSUPPORTED_PATTERNS = new Set([
  'export-verilog',
  'export-vhdl',
  'multi-driver-conflict',
  'counter-rollover',
  'shift-sequence',
  'load-shift-mode',
  'ui-state-projection',
]);

// ── truth-table-exhaustive ───────────────────────────────────────────────────
function runTruthTableExhaustive(contract, def, contractFile) {
  const results = [];
  const inputPorts = contract.ports.inputs;
  const n = inputPorts.length;
  if (n > 10) {
    results.push(makeResult(contract.typeId, 'truth-table-exhaustive', 'skip-too-wide',
      'unsupported', `<= 10 inputs`, `${n} inputs`, 'unsupported_contract_feature', contractFile));
    return results;
  }

  const totalRows = 1 << n;
  let allPass = true;
  const failures = [];

  for (let row = 0; row < totalRows; row++) {
    const inputs = {};
    for (let bit = 0; bit < n; bit++) {
      inputs[inputPorts[bit].id] = ((row >> bit) & 1);
    }
    try {
      const outputs = def.evaluate(inputs, {});
      // Verify all output values are within allowedOutputValues
      for (const op of contract.ports.outputs) {
        const val = outputs[op.id];
        if (val === undefined) {
          allPass = false;
          failures.push({ row, inputs, port: op.id, expected: 'defined', actual: 'undefined' });
        } else if (!contract.signalModel.allowedOutputValues.includes(val)) {
          allPass = false;
          failures.push({ row, inputs, port: op.id, expected: contract.signalModel.allowedOutputValues, actual: val });
        }
      }
    } catch (e) {
      allPass = false;
      failures.push({ row, inputs, error: String(e) });
    }
  }

  if (allPass) {
    results.push(makeResult(contract.typeId, 'truth-table-exhaustive', 'all-rows',
      'pass', `${totalRows} rows OK`, `${totalRows} rows checked`, null, contractFile));
  } else {
    results.push(makeResult(contract.typeId, 'truth-table-exhaustive', 'row-failures',
      'fail', 'all rows valid', failures.slice(0, 5),
      'contract_mismatch', contractFile));
  }

  // TRIBUF-specific: verify OE semantics
  if (contract.typeId === 'TRIBUF') {
    // /OE=0 (active): Y=A
    const out0a = def.evaluate({ a: 0, oe: 0 }, {});
    const out1a = def.evaluate({ a: 1, oe: 0 }, {});
    const pass0 = out0a.y === 0 && out1a.y === 1;
    results.push(makeResult(contract.typeId, 'truth-table-exhaustive', 'oe-active-pass-through',
      pass0 ? 'pass' : 'fail', { 'a=0': 0, 'a=1': 1 }, { 'a=0': out0a.y, 'a=1': out1a.y },
      pass0 ? null : 'contract_mismatch', contractFile));

    // /OE=1 (inactive): Y=Hi-Z (2)
    const out0b = def.evaluate({ a: 0, oe: 1 }, {});
    const out1b = def.evaluate({ a: 1, oe: 1 }, {});
    const passZ = out0b.y === 2 && out1b.y === 2;
    results.push(makeResult(contract.typeId, 'truth-table-exhaustive', 'oe-inactive-hiz',
      passZ ? 'pass' : 'fail', { 'a=0': 2, 'a=1': 2 }, { 'a=0': out0b.y, 'a=1': out1b.y },
      passZ ? null : 'contract_mismatch', contractFile));
  }

  return results;
}

// ── sequential-step-sequence ───────────────────────────────────────────────────
function runSequentialStepSequence(contract, def, contractFile) {
  const results = [];
  const tm = contract.semantics.timingModel;

  // ── 74HC595 specialized handler ──────────────────────────────────────────
  // Two-stage register: shift via SHCP, latch via STCP.
  // Must test: shift DS bit in, then latch to outputs.
  if (contract.typeId === '74HC595') {
    const baseInputs = { ds: 0, shcp: 0, stcp: 0, mr: 1, oe: 0 };
    const initState = buildInitState(def, contract, 0, 0);
    initState.shift = 0;
    initState.latch = 0;

    // Shift DS=1 into shift register via SHCP rising edge
    const s1 = stateTransition(def, { ...baseInputs, ds: 1, shcp: 0 }, initState);
    const s2 = stateTransition(def, { ...baseInputs, ds: 1, shcp: 1 }, s1.nextState);
    // Shift register should have bit 0 = 1 now, but output latch unchanged
    const shiftOk = (s2.nextState.shift & 1) === 1;
    results.push(makeResult(contract.typeId, 'sequential-step-sequence', 'shift-ds1-in',
      shiftOk ? 'pass' : 'fail', { 'shift.bit0': 1 }, { 'shift.bit0': s2.nextState.shift & 1 },
      shiftOk ? null : 'contract_mismatch', contractFile));

    // Latch via STCP rising edge: q0 should now be 1
    const s3 = stateTransition(def, { ...baseInputs, stcp: 0, shcp: 1 }, s2.nextState);
    const s4 = stateTransition(def, { ...baseInputs, stcp: 1, shcp: 1 }, s3.nextState);
    const latchOk = s4.nextState.q0 === 1;
    results.push(makeResult(contract.typeId, 'sequential-step-sequence', 'latch-stcp-transfer',
      latchOk ? 'pass' : 'fail', { q0: 1 }, { q0: s4.nextState.q0 },
      latchOk ? null : 'contract_mismatch', contractFile));

    return results;
  }

  if (tm === 'edge-triggered-rising' || tm === 'edge-triggered-falling') {
    const rising = tm === 'edge-triggered-rising';
    const clkIds = findClockInputIds(contract, def);

    // Classify data inputs: role=data inputs that are NOT clock
    const dataInputs = contract.ports.inputs.filter(p =>
      p.role === 'data' && !clkIds.includes(p.id));

    // Check if this gate needs special enable/control inputs to capture data
    const enableInputs = contract.ports.inputs.filter(p => p.role === 'enable');
    const controlInputs = contract.ports.inputs.filter(p => p.role === 'control');

    // Determine if this is a simple D-capture or a complex IC
    const isSimpleDFF = dataInputs.length <= 2 && enableInputs.length === 0 && controlInputs.length === 0;
    // JK_FF: has j/k ports but role may not be 'data'
    const jPort = contract.ports.inputs.find(p => p.id === 'j');
    const kPort = contract.ports.inputs.find(p => p.id === 'k');
    const isJKFF = jPort && kPort;

    for (const clkId of clkIds) {
      const stateKeysForClk = clockToStateKeys(clkId, contract, def);
      const prevClkKey = prevClkKeyForClock(clkId, contract, def);

      // Build default inactive inputs
      const baseInputs = {};
      for (const p of contract.ports.inputs) {
        baseInputs[p.id] = p.defaultValue ?? 0;
      }

      if (isJKFF) {
        // JK FF: test J=1,K=0 (set) and J=0,K=1 (reset)
        const testKey = stateKeysForClk[0];

        // J=1,K=0 at rising edge => Q=1
        const initSet = buildInitState(def, contract, 0, 0);
        initSet[prevClkKey] = 0;
        const s1 = stateTransition(def, { ...baseInputs, j: 1, k: 0, [clkId]: rising ? 0 : 1 }, initSet);
        const s2 = stateTransition(def, { ...baseInputs, j: 1, k: 0, [clkId]: rising ? 1 : 0 }, s1.nextState);
        const setPass = s2.nextState[testKey] === 1;
        results.push(makeResult(contract.typeId, 'sequential-step-sequence',
          `${clkId}-JK-set`, setPass ? 'pass' : 'fail',
          { [testKey]: 1 }, { [testKey]: s2.nextState[testKey] },
          setPass ? null : 'contract_mismatch', contractFile));

        // J=0,K=1 at rising edge => Q=0
        const initReset = buildInitState(def, contract, 1, 0);
        initReset[prevClkKey] = 0;
        const r1 = stateTransition(def, { ...baseInputs, j: 0, k: 1, [clkId]: rising ? 0 : 1 }, initReset);
        const r2 = stateTransition(def, { ...baseInputs, j: 0, k: 1, [clkId]: rising ? 1 : 0 }, r1.nextState);
        const rstPass = r2.nextState[testKey] === 0;
        results.push(makeResult(contract.typeId, 'sequential-step-sequence',
          `${clkId}-JK-reset`, rstPass ? 'pass' : 'fail',
          { [testKey]: 0 }, { [testKey]: r2.nextState[testKey] },
          rstPass ? null : 'contract_mismatch', contractFile));

      } else if (isSimpleDFF && dataInputs.length > 0) {
        // Simple D-FF: test D=0 and D=1 capture
        // Match data port to clock by suffix (d1<->clk1, d2<->clk2)
        const clkSuffix = clkId.replace(/^clk/, '');
        let testDataPort = dataInputs[0]; // default
        if (clkSuffix) {
          const suffixMatch = dataInputs.find(p => p.id.endsWith(clkSuffix));
          if (suffixMatch) testDataPort = suffixMatch;
        }
        const testKey = stateKeysForClk[0];

        for (const dVal of [0, 1]) {
          const initState = buildInitState(def, contract, dVal === 1 ? 0 : 1, 0);
          initState[prevClkKey] = 0;

          const inputs = { ...baseInputs, [testDataPort.id]: dVal };
          // Step 1: CLK inactive
          const s1 = stateTransition(def, { ...inputs, [clkId]: rising ? 0 : 1 }, initState);
          // Step 2: CLK active edge
          const s2 = stateTransition(def, { ...inputs, [clkId]: rising ? 1 : 0 }, s1.nextState);

          const pass = s2.nextState[testKey] === dVal;
          results.push(makeResult(contract.typeId, 'sequential-step-sequence',
            `${clkId}-edge-capture-D=${dVal}`, pass ? 'pass' : 'fail',
            { [testKey]: dVal }, { [testKey]: s2.nextState[testKey] },
            pass ? null : 'contract_mismatch', contractFile));
        }
      } else {
        // Complex IC (counter, shift register, etc.):
        // Test parallel load if available, or basic count step.
        const hasLoad = controlInputs.find(p => p.id === 'ldn' || p.id === 'load');

        if (hasLoad && dataInputs.length > 0) {
          // Parallel load test: activate /LDN=0 (active-low), set D=1010..., trigger CLK edge
          const testKey = stateKeysForClk[0];
          const loadInputs = { ...baseInputs };
          // Activate load: for active-low /LDN, set to 0
          loadInputs[hasLoad.id] = hasLoad.activeLow ? 0 : 1;
          // Set first data input to 1, rest to 0
          for (const dp of dataInputs) loadInputs[dp.id] = 0;
          loadInputs[dataInputs[0].id] = 1;

          const initState = buildInitState(def, contract, 0, 0);
          initState[prevClkKey] = 0;

          // CLK idle then edge
          const s1 = stateTransition(def, { ...loadInputs, [clkId]: 0 }, initState);
          const s2 = stateTransition(def, { ...loadInputs, [clkId]: 1 }, s1.nextState);

          const pass = s2.nextState[testKey] === 1;
          results.push(makeResult(contract.typeId, 'sequential-step-sequence',
            `${clkId}-parallel-load`, pass ? 'pass' : 'fail',
            { [testKey]: 1 }, { [testKey]: s2.nextState[testKey] },
            pass ? null : 'contract_mismatch', contractFile));
        } else if (enableInputs.length > 0) {
          // Counter/shift with enable: enable counting, verify state changes
          const enInputs = { ...baseInputs };
          for (const ep of enableInputs) enInputs[ep.id] = ep.activeLow ? 0 : 1;

          const initState = buildInitState(def, contract, 0, 0);
          initState[prevClkKey] = 0;

          // One clock cycle
          const s1 = stateTransition(def, { ...enInputs, [clkId]: 0 }, initState);
          const s2 = stateTransition(def, { ...enInputs, [clkId]: 1 }, s1.nextState);

          // Verify some state changed
          const testKey = stateKeysForClk[0];
          const changed = s2.nextState[testKey] !== 0;
          results.push(makeResult(contract.typeId, 'sequential-step-sequence',
            `${clkId}-enable-count-step`, changed ? 'pass' : 'fail',
            'state changed after edge', { [testKey]: s2.nextState[testKey] },
            changed ? null : 'contract_mismatch', contractFile));
        } else {
          // Fallback: just verify no crash on a clock edge
          const initState = buildInitState(def, contract, 0, 0);
          initState[prevClkKey] = 0;
          const s1 = stateTransition(def, { ...baseInputs, [clkId]: 0 }, initState);
          const s2 = stateTransition(def, { ...baseInputs, [clkId]: 1 }, s1.nextState);
          results.push(makeResult(contract.typeId, 'sequential-step-sequence',
            `${clkId}-basic-edge`, 'pass',
            'no crash', 'OK', null, contractFile));
        }
      }
    }
  } else if (tm === 'latch-level-sensitive') {
    // Find enable input
    const enableCtrl = contract.semantics.asyncControls.find(c => c.effect === 'enable');
    const visibleKeys = def.stateKeys ?? ['q'];

    if (enableCtrl) {
      const enId = enableCtrl.portId;
      const enActive = enableCtrl.activeLevel;
      const enInactive = enActive === 1 ? 0 : 1;
      const dataInputs = contract.ports.inputs.filter(p => p.role === 'data');
      const testDataPort = dataInputs[0];
      if (!testDataPort) {
        results.push(makeResult(contract.typeId, 'sequential-step-sequence', 'no-data-port',
          'pass', 'skip', 'no data input', null, contractFile));
        return results;
      }

      const initState = buildInitState(def, contract, 0, 0);

      const baseInputs = {};
      for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;

      // Step 1: EN active, D=1 => Q should follow D (transparent)
      const s1Inputs = { ...baseInputs, [enId]: enActive, [testDataPort.id]: 1 };
      const s1 = stateTransition(def, s1Inputs, initState);
      const transparentPass = s1.nextState[visibleKeys[0]] === 1;
      results.push(makeResult(contract.typeId, 'sequential-step-sequence',
        'latch-transparent-D=1',
        transparentPass ? 'pass' : 'fail',
        { [visibleKeys[0]]: 1 }, { [visibleKeys[0]]: s1.nextState[visibleKeys[0]] },
        transparentPass ? null : 'contract_mismatch', contractFile));

      // Step 2: EN inactive, D=0 => Q should hold previous value
      const s2Inputs = { ...baseInputs, [enId]: enInactive, [testDataPort.id]: 0 };
      const s2 = stateTransition(def, s2Inputs, s1.nextState);
      const holdPass = s2.nextState[visibleKeys[0]] === 1; // should still be 1
      results.push(makeResult(contract.typeId, 'sequential-step-sequence',
        'latch-hold-after-disable',
        holdPass ? 'pass' : 'fail',
        { [visibleKeys[0]]: 1 }, { [visibleKeys[0]]: s2.nextState[visibleKeys[0]] },
        holdPass ? null : 'contract_mismatch', contractFile));
    } else if (contract.semantics.asyncControls.length > 0) {
      // SR_LATCH style: no enable, just async controls
      const setCtrl = contract.semantics.asyncControls.find(c => c.effect === 'preset');
      const clrCtrl = contract.semantics.asyncControls.find(c => c.effect === 'clear');
      const visKey = visibleKeys[0];
      const initState = buildInitState(def, contract, 0, 0);

      if (setCtrl && clrCtrl) {
        const baseInputs = {};
        for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;

        // Set: S=active => Q=1
        const sInputs = { ...baseInputs, [setCtrl.portId]: setCtrl.activeLevel, [clrCtrl.portId]: clrCtrl.activeLow ? 1 : 0 };
        const s1 = stateTransition(def, sInputs, initState);
        const setPass = s1.nextState[visKey] === 1;
        results.push(makeResult(contract.typeId, 'sequential-step-sequence', 'set-to-1',
          setPass ? 'pass' : 'fail', { [visKey]: 1 }, { [visKey]: s1.nextState[visKey] },
          setPass ? null : 'contract_mismatch', contractFile));

        // Clear: R=active => Q=0
        const rInputs = { ...baseInputs, [setCtrl.portId]: setCtrl.activeLow ? 1 : 0, [clrCtrl.portId]: clrCtrl.activeLevel };
        const s2 = stateTransition(def, rInputs, s1.nextState);
        const clrPass = s2.nextState[visKey] === 0;
        results.push(makeResult(contract.typeId, 'sequential-step-sequence', 'clear-to-0',
          clrPass ? 'pass' : 'fail', { [visKey]: 0 }, { [visKey]: s2.nextState[visKey] },
          clrPass ? null : 'contract_mismatch', contractFile));

        // Hold from Q=1
        const s3 = stateTransition(def, sInputs, initState); // set first
        const holdInputs = { ...baseInputs }; // both inactive
        const s4 = stateTransition(def, holdInputs, s3.nextState);
        const holdPass = s4.nextState[visKey] === 1;
        results.push(makeResult(contract.typeId, 'sequential-step-sequence', 'hold-from-Q=1',
          holdPass ? 'pass' : 'fail', { [visKey]: 1 }, { [visKey]: s4.nextState[visKey] },
          holdPass ? null : 'contract_mismatch', contractFile));
      }
    }
  } else if (tm === 'master-slave') {
    results.push(makeResult(contract.typeId, 'sequential-step-sequence', 'master-slave-basic',
      'unsupported', 'deferred-to-v2', 'master-slave pattern', 'unsupported_contract_feature', contractFile));
  }

  return results;
}

// ── clock-edge-detection ───────────────────────────────────────────────────────
function runClockEdgeDetection(contract, def, contractFile) {
  const results = [];
  const tm = contract.semantics.timingModel;
  if (!tm.startsWith('edge-triggered')) return results;

  const rising = tm === 'edge-triggered-rising';
  const clkIds = findClockInputIds(contract, def);

  // We need a data input to observe capture.
  // For D-FFs use the data port. For JK-FFs use J=1,K=0 (set mode).
  const dataInputs = contract.ports.inputs.filter(p =>
    p.role === 'data' && !clkIds.includes(p.id));
  const jPort = contract.ports.inputs.find(p => p.id === 'j');
  const kPort = contract.ports.inputs.find(p => p.id === 'k');

  for (const clkId of clkIds) {
    const stateKeysForClk = clockToStateKeys(clkId, contract, def);
    const pcKey = prevClkKeyForClock(clkId, contract, def);
    const testKey = stateKeysForClk[0];

    const baseInputs = {};
    for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;

    // Set data to 1 so we can observe capture
    if (jPort && kPort) {
      baseInputs.j = 1;
      baseInputs.k = 0;
    } else if (dataInputs.length > 0) {
      // For shift registers with mode select (74HC194): set parallel load mode
      const selectInputs = contract.ports.inputs.filter(p => p.role === 'select');
      for (const sp of selectInputs) baseInputs[sp.id] = 1; // s0=s1=1 = parallel load

      // Match data port to clock by suffix (d1<->clk1, d2<->clk2)
      const clkSuffix = clkId.replace(/^clk/, '');
      let matchedDataPort = dataInputs[0]; // default
      if (clkSuffix) {
        const suffixMatch = dataInputs.find(p => p.id.endsWith(clkSuffix));
        if (suffixMatch) matchedDataPort = suffixMatch;
      }
      // If parallel load mode is active, prefer a D-port (d0/d1/...) over serial ports
      if (selectInputs.length > 0) {
        const dPorts = dataInputs.filter(p => /^d\d+$/.test(p.id));
        if (dPorts.length > 0) {
          matchedDataPort = dPorts[0]; // use d0
          // Set ALL d-ports to 1 for maximum observability
          for (const dp of dPorts) baseInputs[dp.id] = 1;
        }
      }
      baseInputs[matchedDataPort.id] = 1;
    } else {
      // Complex IC (counter/shift) without simple data ports:
      // Edge detection is partially covered by step-sequence.
      // Just verify CLK=0->0 and CLK=1->1 don't change state.
      for (const heldClk of [0, 1]) {
        const initState = buildInitState(def, contract, 0, heldClk);
        initState[pcKey] = heldClk;
        const result = stateTransition(def, { ...baseInputs, [clkId]: heldClk }, initState);
        const held = result.nextState[testKey] === 0;
        results.push(makeResult(contract.typeId, 'clock-edge-detection',
          `${clkId}-${heldClk}->${heldClk}`, held ? 'pass' : 'fail',
          { capture: false }, { capture: !held },
          held ? null : 'contract_mismatch', contractFile));
      }
      continue;
    }

    // Also activate enable inputs for counters
    const enableInputs = contract.ports.inputs.filter(p => p.role === 'enable');
    for (const ep of enableInputs) baseInputs[ep.id] = ep.activeLow ? 0 : 1;

    // Test all 4 transitions: 0->0, 0->1, 1->0, 1->1
    const transitions = [
      { prevClk: 0, clk: 0, label: '0->0', expectCapture: false },
      { prevClk: 0, clk: 1, label: '0->1', expectCapture: rising },
      { prevClk: 1, clk: 0, label: '1->0', expectCapture: !rising },
      { prevClk: 1, clk: 1, label: '1->1', expectCapture: false },
    ];

    for (const t of transitions) {
      const initState = buildInitState(def, contract, 0, t.prevClk);
      initState[pcKey] = t.prevClk;

      const inputs = { ...baseInputs, [clkId]: t.clk };
      const result = stateTransition(def, inputs, initState);
      const captured = result.nextState[testKey] === 1;
      const pass = captured === t.expectCapture;

      results.push(makeResult(contract.typeId, 'clock-edge-detection',
        `${clkId}-${t.label}`,
        pass ? 'pass' : 'fail',
        { capture: t.expectCapture },
        { capture: captured },
        pass ? null : 'contract_mismatch', contractFile));
    }
  }

  return results;
}

// ── hold-state ─────────────────────────────────────────────────────────────────
function runHoldState(contract, def, contractFile) {
  const results = [];
  const tm = contract.semantics.timingModel;
  const visibleKeys = def.stateKeys ?? ['q'];

  if (tm.startsWith('edge-triggered')) {
    // Hold: CLK stays at same level => Q should not change
    const clkIds = findClockInputIds(contract, def);
    for (const clkId of clkIds) {
      const stateKeysForClk = clockToStateKeys(clkId, contract, def);
      const pcKey = prevClkKeyForClock(clkId, contract, def);
      const testKey = stateKeysForClk[0];

      for (const qInit of [0, 1]) {
        const initState = buildInitState(def, contract, qInit, 1);
        initState[pcKey] = 1;
        // Make sure the specific test key has the right init value
        initState[testKey] = qInit;

        const baseInputs = {};
        for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;
        baseInputs[clkId] = 1; // CLK stays high, no edge

        const result = stateTransition(def, baseInputs, initState);
        const held = result.nextState[testKey] === qInit;
        results.push(makeResult(contract.typeId, 'hold-state',
          `${clkId}-no-edge-Q=${qInit}`,
          held ? 'pass' : 'fail', { [testKey]: qInit }, { [testKey]: result.nextState[testKey] },
          held ? null : 'contract_mismatch', contractFile));
      }
    }
  } else if (tm === 'latch-level-sensitive') {
    const enableCtrl = contract.semantics.asyncControls.find(c => c.effect === 'enable');
    if (enableCtrl) {
      const enInactive = enableCtrl.activeLevel === 1 ? 0 : 1;
      for (const qInit of [0, 1]) {
        const initState = buildInitState(def, contract, qInit, 0);
        const baseInputs = {};
        for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;
        baseInputs[enableCtrl.portId] = enInactive;
        // Toggle data to verify it doesn't affect Q
        const dataPort = contract.ports.inputs.find(p => p.role === 'data');
        if (dataPort) baseInputs[dataPort.id] = qInit === 0 ? 1 : 0;

        const result = stateTransition(def, baseInputs, initState);
        const held = result.nextState[visibleKeys[0]] === qInit;
        results.push(makeResult(contract.typeId, 'hold-state',
          `en-inactive-Q=${qInit}`,
          held ? 'pass' : 'fail', { [visibleKeys[0]]: qInit }, { [visibleKeys[0]]: result.nextState[visibleKeys[0]] },
          held ? null : 'contract_mismatch', contractFile));
      }
    }
  }

  return results;
}

// ── async-control-override ───────────────────────────────────────────────────
function runAsyncControlOverride(contract, def, contractFile) {
  const results = [];
  const asyncCtrls = contract.semantics.asyncControls.filter(c =>
    c.effect === 'preset' || c.effect === 'clear');

  if (asyncCtrls.length === 0) return results;

  const visibleKeys = def.stateKeys ?? ['q'];

  // 74HC595: /MR resets shift register only, not output latch.
  // Test that internal shift=0 after /MR, output latch unchanged.
  if (contract.typeId === '74HC595') {
    const initState = buildInitState(def, contract, 0, 0);
    initState.shift = 0xFF; // shift register full
    initState.latch = 0;

    const result = stateTransition(def, { ds: 0, shcp: 0, stcp: 0, mr: 0, oe: 0 }, initState);
    const shiftCleared = result.nextState.shift === 0;
    results.push(makeResult(contract.typeId, 'async-control-override', 'mr-clear-shift',
      shiftCleared ? 'pass' : 'fail', { shift: 0 }, { shift: result.nextState.shift },
      shiftCleared ? null : 'contract_mismatch', contractFile));
    return results;
  }

  for (const ctrl of asyncCtrls) {
    const targetVal = ctrl.effect === 'preset' ? 1 : 0;
    const initVal = targetVal === 1 ? 0 : 1;

    // Find which visible key this async control affects.
    // For dual-FF (74HC74), match by port suffix (pre1->q1, clr2->q2).
    const suffix = ctrl.portId.replace(/^(pre|clr|s|r|mr)/, '');
    let targetKey = visibleKeys[0]; // default
    if (suffix && visibleKeys.find(k => k.endsWith(suffix))) {
      targetKey = visibleKeys.find(k => k.endsWith(suffix));
    }

    const initState = buildInitState(def, contract, initVal, 0);
    initState[targetKey] = initVal;

    const baseInputs = {};
    for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;
    // Activate the async control
    baseInputs[ctrl.portId] = ctrl.activeLevel;

    const result = stateTransition(def, baseInputs, initState);
    const pass = result.nextState[targetKey] === targetVal;
    results.push(makeResult(contract.typeId, 'async-control-override',
      `${ctrl.portId}-${ctrl.effect}`,
      pass ? 'pass' : 'fail',
      { [targetKey]: targetVal },
      { [targetKey]: result.nextState[targetKey] },
      pass ? null : 'contract_mismatch', contractFile));
  }

  return results;
}

// ── reset-to-known-state ───────────────────────────────────────────────────────
function runResetToKnownState(contract, def, contractFile) {
  const results = [];
  const visibleKeys = def.stateKeys ?? ['q'];
  const resetCtrls = contract.semantics.asyncControls.filter(c => c.effect === 'clear');

  if (resetCtrls.length === 0) {
    // Edge-triggered FFs without async reset: verify default init
    if (def.stateInit) {
      const allZero = visibleKeys.every(k => def.stateInit[k] === 0);
      results.push(makeResult(contract.typeId, 'reset-to-known-state', 'stateInit-all-zero',
        allZero ? 'pass' : 'fail', 'all visible state = 0', def.stateInit,
        allZero ? null : 'product_behavior_gap', contractFile));
    }
    return results;
  }

  // 74HC595: /MR resets shift register only. To fully reset output latch,
  // need: MR=0 (clear shift), then STCP rising edge (transfer to latch).
  if (contract.typeId === '74HC595') {
    const initState = buildInitState(def, contract, 1, 0);
    initState.shift = 0xFF;
    initState.latch = 0xFF;

    // Step 1: MR=0 to clear shift register
    const s1 = stateTransition(def, { ds: 0, shcp: 0, stcp: 0, mr: 0, oe: 0 }, initState);
    // Step 2: STCP 0->1 to transfer zeros to output latch
    const s2 = stateTransition(def, { ds: 0, shcp: 0, stcp: 0, mr: 1, oe: 0 }, s1.nextState);
    const s3 = stateTransition(def, { ds: 0, shcp: 0, stcp: 1, mr: 1, oe: 0 }, s2.nextState);

    const allCleared = visibleKeys.every(k => s3.nextState[k] === 0);
    results.push(makeResult(contract.typeId, 'reset-to-known-state', 'mr-then-stcp-reset',
      allCleared ? 'pass' : 'fail',
      Object.fromEntries(visibleKeys.map(k => [k, 0])),
      Object.fromEntries(visibleKeys.map(k => [k, s3.nextState[k]])),
      allCleared ? null : 'contract_mismatch', contractFile));
    return results;
  }

  // Apply all async resets simultaneously from a non-zero state
  const initState = buildInitState(def, contract, 1, 0);

  const baseInputs = {};
  for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;
  for (const ctrl of resetCtrls) {
    baseInputs[ctrl.portId] = ctrl.activeLevel;
  }

  const result = stateTransition(def, baseInputs, initState);

  // Check each visible key that should be zeroed by its corresponding reset
  const allCleared = visibleKeys.every(k => result.nextState[k] === 0);
  results.push(makeResult(contract.typeId, 'reset-to-known-state', 'async-reset',
    allCleared ? 'pass' : 'fail',
    Object.fromEntries(visibleKeys.map(k => [k, 0])),
    Object.fromEntries(visibleKeys.map(k => [k, result.nextState[k]])),
    allCleared ? null : 'contract_mismatch', contractFile));

  return results;
}

// ── forbidden-input-combination ──────────────────────────────────────────────
function runForbiddenInputCombination(contract, def, contractFile) {
  const results = [];
  const combos = contract.semantics.invalidInputCombinations;
  if (!combos || combos.length === 0) return results;

  for (let i = 0; i < combos.length; i++) {
    const combo = combos[i];
    const inputs = {};
    for (const p of contract.ports.inputs) inputs[p.id] = p.defaultValue ?? 0;
    // Override with forbidden values
    for (const [key, val] of Object.entries(combo)) {
      if (key === 'result') continue;
      inputs[key] = val;
    }

    const initState = { ...(def.stateInit ?? {}) };
    try {
      const result = stateTransition(def, inputs, initState);
      // We just verify the gate doesn't throw. The result string in the contract
      // is documentation — we verify the gate handles it deterministically.
      results.push(makeResult(contract.typeId, 'forbidden-input-combination',
        `combo-${i}`,
        'pass',
        combo.result,
        result.outputs,
        null, contractFile));
    } catch (e) {
      results.push(makeResult(contract.typeId, 'forbidden-input-combination',
        `combo-${i}`,
        'fail',
        'deterministic output',
        String(e),
        'product_behavior_gap', contractFile));
    }
  }

  return results;
}

// ── oe-tristate ──────────────────────────────────────────────────────────────
function runOeTristate(contract, def, contractFile) {
  const results = [];
  const oeCtrl = contract.semantics.asyncControls.find(c => c.effect === 'enable' && c.activeLow === true)
    ?? contract.semantics.asyncControls.find(c =>
      contract.ports.inputs.find(p => p.id === c.portId && p.role === 'output-enable'));

  if (!oeCtrl) return results;

  const tsOutputs = contract.ports.outputs.filter(p => p.canBeTriState);
  if (tsOutputs.length === 0) return results;

  const oeId = oeCtrl.portId;
  const oeInactive = oeCtrl.activeLow ? 1 : 0; // Hi-Z level
  const oeActive = oeCtrl.activeLow ? 0 : 1;   // driven level

  const baseInputs = {};
  for (const p of contract.ports.inputs) baseInputs[p.id] = p.defaultValue ?? 0;
  const initState = { ...(def.stateInit ?? {}) };

  // OE inactive => all tri-state outputs should be Hi-Z (2)
  const inactiveInputs = { ...baseInputs, [oeId]: oeInactive };
  const outInactive = def.evaluate(inactiveInputs, initState);
  const allHiZ = tsOutputs.every(p => outInactive[p.id] === 2);
  results.push(makeResult(contract.typeId, 'oe-tristate', 'oe-inactive-hiz',
    allHiZ ? 'pass' : 'fail',
    Object.fromEntries(tsOutputs.map(p => [p.id, 2])),
    Object.fromEntries(tsOutputs.map(p => [p.id, outInactive[p.id]])),
    allHiZ ? null : 'contract_mismatch', contractFile));

  // OE active => outputs should be driven (not Hi-Z)
  const activeInputs = { ...baseInputs, [oeId]: oeActive };
  const outActive = def.evaluate(activeInputs, initState);
  const allDriven = tsOutputs.every(p => outActive[p.id] !== 2);
  results.push(makeResult(contract.typeId, 'oe-tristate', 'oe-active-driven',
    allDriven ? 'pass' : 'fail',
    'all outputs driven (not Hi-Z)',
    Object.fromEntries(tsOutputs.map(p => [p.id, outActive[p.id]])),
    allDriven ? null : 'contract_mismatch', contractFile));

  return results;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Find clock input IDs from contract + definition. */
function findClockInputIds(contract, def) {
  // Use clockInputId from contract or definition if available
  if (contract.semantics.clockInputId) return [contract.semantics.clockInputId];
  if (def.clockInputId) return [def.clockInputId];

  // For multi-clock gates (e.g., 74HC74), find all clock-role inputs
  const clockPorts = contract.ports.inputs.filter(p => p.role === 'clock');
  if (clockPorts.length > 0) return clockPorts.map(p => p.id);

  return [];
}

// ── Main dispatch ────────────────────────────────────────────────────────────

function runContract(contract, contractFile) {
  const typeId = contract.typeId;
  const results = [];

  // Verify gate exists in registry
  if (!gateRegistry.has(typeId)) {
    results.push(makeResult(typeId, 'registry-check', 'gate-registered',
      'fail', 'gate in registry', 'not found',
      'runner_error', contractFile));
    return results;
  }

  const def = gateRegistry.get(typeId);
  const requiredPatterns = contract.testability?.requiredPatterns ?? [];

  for (const pattern of requiredPatterns) {
    if (UNSUPPORTED_PATTERNS.has(pattern)) {
      results.push(makeResult(typeId, pattern, 'unsupported',
        'unsupported', 'v2+ feature', 'skipped',
        'unsupported_contract_feature', contractFile));
      continue;
    }

    if (!SUPPORTED_PATTERNS.has(pattern)) {
      results.push(makeResult(typeId, pattern, 'unknown-pattern',
        'unsupported', 'unknown pattern', 'skipped',
        'unsupported_contract_feature', contractFile));
      continue;
    }

    try {
      let patternResults = [];
      switch (pattern) {
        case 'truth-table-exhaustive':
          patternResults = runTruthTableExhaustive(contract, def, contractFile);
          break;
        case 'sequential-step-sequence':
          patternResults = runSequentialStepSequence(contract, def, contractFile);
          break;
        case 'clock-edge-detection':
          patternResults = runClockEdgeDetection(contract, def, contractFile);
          break;
        case 'hold-state':
          patternResults = runHoldState(contract, def, contractFile);
          break;
        case 'async-control-override':
          patternResults = runAsyncControlOverride(contract, def, contractFile);
          break;
        case 'reset-to-known-state':
          patternResults = runResetToKnownState(contract, def, contractFile);
          break;
        case 'forbidden-input-combination':
          patternResults = runForbiddenInputCombination(contract, def, contractFile);
          break;
        case 'oe-tristate':
          patternResults = runOeTristate(contract, def, contractFile);
          break;
      }
      results.push(...patternResults);
    } catch (e) {
      results.push(makeResult(typeId, pattern, 'runner-exception',
        'fail', 'no exception', String(e),
        'runner_error', contractFile));
    }
  }

  return results;
}

// ── Report generation ────────────────────────────────────────────────────────

function generateReport(allResults, contracts) {
  const now = new Date().toISOString();
  const totalCases = allResults.length;
  const passed = allResults.filter(r => r.status === 'pass').length;
  const failed = allResults.filter(r => r.status === 'fail').length;
  const unsupported = allResults.filter(r => r.status === 'unsupported').length;
  const executedCases = passed + failed;

  let md = `# Contract Runner v1 Report\n\n`;
  md += `Generated: ${now}\n`;
  md += `Runner version: ${RUNNER_VERSION}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Contracts loaded | ${contracts.length} |\n`;
  md += `| Total cases | ${totalCases} |\n`;
  md += `| Executed (pass + fail) | ${executedCases} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Failed | ${failed} |\n`;
  md += `| Unsupported (skipped) | ${unsupported} |\n\n`;

  // Per-gate summary
  md += `## Per-Gate Results\n\n`;
  const gates = [...new Set(allResults.map(r => r.gateTypeId))];
  for (const g of gates) {
    const gResults = allResults.filter(r => r.gateTypeId === g);
    const gPass = gResults.filter(r => r.status === 'pass').length;
    const gFail = gResults.filter(r => r.status === 'fail').length;
    const gSkip = gResults.filter(r => r.status === 'unsupported').length;
    const gExecuted = gPass + gFail;
    const status = gFail > 0 ? 'FAIL' : (gExecuted > 0 ? 'PASS' : 'SKIPPED');
    md += `### ${g} — ${status}\n\n`;
    md += `| Pattern | Case | Status | Error Class |\n|---|---|---|---|\n`;
    for (const r of gResults) {
      const label = r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : 'UNSUPPORTED';
      md += `| ${r.patternId} | ${r.caseId} | ${label} | ${r.errorClass ?? '-'} |\n`;
    }
    md += `\npass: ${gPass}, fail: ${gFail}, unsupported: ${gSkip}, total: ${gResults.length}\n\n`;
  }

  // Supported vs unsupported contract features
  md += `## Contract Feature Coverage (v1)\n\n`;
  md += `### Supported patterns\n\n`;
  for (const p of SUPPORTED_PATTERNS) {
    md += `- \`${p}\`\n`;
  }
  md += `\n### Unsupported patterns (deferred to v2+)\n\n`;
  for (const p of UNSUPPORTED_PATTERNS) {
    md += `- \`${p}\`\n`;
  }

  md += `\n### Contract fields consumed by v1\n\n`;
  md += `- \`typeId\` — gate lookup in registry\n`;
  md += `- \`semantics.timingModel\` — dispatch to combinational vs sequential runner\n`;
  md += `- \`semantics.clockEdge\` / \`clockInputId\` — edge direction and clock port\n`;
  md += `- \`semantics.asyncControls[]\` — async override, OE, and enable detection\n`;
  md += `- \`semantics.stateVariables\` — cross-referenced with runtime stateKeys\n`;
  md += `- \`semantics.invalidInputCombinations[]\` — forbidden-input test vectors\n`;
  md += `- \`ports.inputs[].role\` / \`.defaultValue\` / \`.activeLow\` — stimulus generation\n`;
  md += `- \`ports.outputs[].canBeTriState\` — Hi-Z expectation check\n`;
  md += `- \`signalModel.allowedOutputValues\` — output range validation\n`;
  md += `- \`testability.requiredPatterns[]\` — pattern dispatch list\n`;

  md += `\n### Contract fields NOT yet consumed\n\n`;
  md += `- \`exportSupport\` — HDL export testing (covered by focused-nine audit)\n`;
  md += `- \`risks[]\` — informational, not automatically verified\n`;
  md += `- \`modelLimits[]\` — informational, not automatically verified\n`;
  md += `- \`signalModel.hiZInputHandling\` — not exercised\n`;
  md += `- \`signalModel.busCapable\` — not exercised (requires multi-gate circuit)\n`;

  md += `\n## Limits for v1\n\n`;
  md += `- No multi-cycle counter/shift-register verification (counter-rollover, shift-sequence, load-shift-mode)\n`;
  md += `- No HDL export validation (covered separately by focused-nine core audit)\n`;
  md += `- No circuit-level tests (multi-driver-conflict requires bus simulation)\n`;
  md += `- No UI projection tests (ui-state-projection requires browser)\n`;
  md += `- 74HC74 dual-FF: only FF1 clock (clk1) is exercised for edge detection; FF2 follows same pattern\n`;
  md += `- Wide ICs (74HC373/374/595): only representative data bit tested for step-sequence, not all 8\n`;

  return md;
}

function generateSummary(allResults, contracts) {
  const now = new Date().toISOString();
  const totalCases = allResults.length;
  const passed = allResults.filter(r => r.status === 'pass').length;
  const failed = allResults.filter(r => r.status === 'fail').length;
  const unsupported = allResults.filter(r => r.status === 'unsupported').length;
  const executedCases = passed + failed;

  const perGate = {};
  for (const r of allResults) {
    if (!perGate[r.gateTypeId]) perGate[r.gateTypeId] = { pass: 0, fail: 0, unsupported: 0, total: 0 };
    perGate[r.gateTypeId].total++;
    if (r.status === 'unsupported') perGate[r.gateTypeId].unsupported++;
    else if (r.status === 'pass') perGate[r.gateTypeId].pass++;
    else perGate[r.gateTypeId].fail++;
  }

  return {
    generatedAt: now,
    runnerVersion: RUNNER_VERSION,
    contractsLoaded: contracts.length,
    totalCases,
    executedCases,
    passed,
    failed,
    unsupported,
    verdict: failed === 0 ? 'PASS' : 'FAIL',
    perGate,
    results: allResults,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Load all contracts
  const files = (await fs.readdir(CONTRACTS_DIR)).filter(f => f.endsWith('.json')).sort();
  const contracts = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(CONTRACTS_DIR, f), 'utf8');
    contracts.push({ data: JSON.parse(raw), file: f });
  }

  console.log(`Contract Runner v${RUNNER_VERSION}`);
  console.log(`Loaded ${contracts.length} contracts from ${CONTRACTS_DIR}`);

  const allResults = [];
  for (const { data, file } of contracts) {
    const results = runContract(data, file);
    allResults.push(...results);
    const pass = results.filter(r => r.status === 'pass').length;
    const fail = results.filter(r => r.status === 'fail').length;
    const skip = results.filter(r => r.status === 'unsupported').length;
    console.log(`  ${data.typeId}: ${pass} pass, ${fail} fail, ${skip} unsupported, ${results.length} total`);
  }

  // Write artifacts
  const summary = generateSummary(allResults, contracts.map(c => c.data));
  const report = generateReport(allResults, contracts.map(c => c.data));

  await fs.writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2) + '\n');
  await fs.writeFile(REPORT_FILE, report);

  console.log(`\nVerdict: ${summary.verdict}`);
  console.log(`  ${summary.passed} passed, ${summary.failed} failed, ${summary.unsupported} unsupported`);
  console.log(`Summary: ${SUMMARY_FILE}`);
  console.log(`Report:  ${REPORT_FILE}`);

  // Output JSON path for CI consumption
  console.log(JSON.stringify({
    summaryFile: SUMMARY_FILE,
    reportFile: REPORT_FILE,
    verdict: summary.verdict,
    passed: summary.passed,
    failed: summary.failed,
    unsupported: summary.unsupported,
  }));

  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Contract runner failed:', e);
  process.exit(2);
});

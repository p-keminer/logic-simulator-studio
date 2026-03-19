/**
 * Golden Corpus v1 Runner — automated regression suite for circuit artifacts.
 *
 * Reads validation/golden-corpus-v1.json, verifies that all listed reference circuits
 * and their HDL exports exist, are structurally sound, and match documented
 * checkpoints.  Produces:
 *   - validation/golden-corpus-v1-summary.json  (machine-readable)
 *   - validation/golden-corpus-v1-report.md     (human-readable)
 *
 * Status classification per case:
 *   - pass:           all checks passed
 *   - fail:           one or more checks failed unexpectedly
 *   - expected_limit: documents a known limitation (not a pass)
 *   - unsupported:    check not yet implemented in runner v1
 *
 * Usage:
 *   npx vite-node validation/run-golden-corpus-v1.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileVerilogWithSyntax,
  compileVhdlWithSyntax,
  runVerilogSimulation,
  runVhdlSimulation,
} from './hdl-tooling.mjs';
import { registerGoldenCustomICsForSlugs } from './custom-ic-golden.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS_FILE = path.join(ROOT, 'validation', 'golden-corpus-v1.json');
const CIRCUITS_DIR = path.join(ROOT, 'validation', 'generated-circuits-golden');
const EXPORTS_DIR = path.join(ROOT, 'validation', 'generated-exports-golden');
const SUMMARY_FILE = path.join(ROOT, 'validation', 'golden-corpus-v1-summary.json');
const REPORT_FILE = path.join(ROOT, 'validation', 'golden-corpus-v1-report.md');
const RUNNER_VERSION = '1.8.0';

// ── Export-determinism: loaded dynamically before the run loop ───────────────
// When loaded successfully (vite-node), generateVerilog / generateVHDL are set.
// When running without vite-node or if the import fails, they remain null and
// the diff checks are classified as 'unsupported' rather than 'fail'.
let generateVerilog = null;
let generateVHDL = null;
let exporterLoadError = null;

// ── Known boundaries ────────────────────────────────────────────────────────
// Slugs where a documented exporter/model limitation exists. These are
// classified as expected_limit, NEVER as pass.
const KNOWN_BOUNDARIES = new Map([
  ['gc_t2_bus_mux', 'Documented exporter limitation: multi-driver tri-state bus — buf1 output (w_0) is driven but not exported as output port (last-wire-wins). This is a known, intentional model boundary.'],
]);

function buildCustomHalfAdderScenario() {
  const steps = [];
  for (let mask = 0; mask < 8; mask++) {
    const a = mask & 1 ? 1 : 0;
    const b = mask & 2 ? 1 : 0;
    const cin = mask & 4 ? 1 : 0;
    const sum = a ^ b ^ cin;
    const cout = (a & b) | ((a ^ b) & cin);
    steps.push({
      name: `combo-${a}${b}${cin}`,
      set: { a, b, cin },
      expect: {
        w_6: sum,
        w_8: cout,
        w_7: sum,
        w_9: cout,
        w_10: 0,
        w_11: 0,
      },
    });
  }
  return { steps };
}

function buildSequentialFeedbackScenario() {
  return {
    steps: [
      {
        name: 'assert-reset',
        set: { clk: 0, rst: 1, en: 0, d: 1, d2: 0, d3: 1 },
        expect: { w_2: 0, w_0: 0, w_1: 0, w_3: 0 },
      },
      {
        name: 'release-reset',
        set: { clk: 0, rst: 0, en: 0, d: 1, d2: 0, d3: 1 },
        expect: { w_2: 0, w_0: 0, w_1: 0, w_3: 0 },
      },
      {
        name: 'seed-load',
        set: { clk: 0, rst: 0, en: 0, d: 1, d2: 0, d3: 1 },
        pulse: ['clk'],
        expect: { w_2: 1, w_0: 0, w_1: 1, w_3: 1 },
      },
      {
        name: 'feedback-1',
        set: { clk: 0, rst: 0, en: 1, d: 0, d2: 0, d3: 0 },
        pulse: ['clk'],
        expect: { w_2: 0, w_0: 1, w_1: 1, w_3: 1 },
      },
      {
        name: 'feedback-2',
        set: { clk: 0, rst: 0, en: 1, d: 0, d2: 0, d3: 0 },
        pulse: ['clk'],
        expect: { w_2: 1, w_0: 1, w_1: 1, w_3: 0 },
      },
      {
        name: 'feedback-3',
        set: { clk: 0, rst: 0, en: 1, d: 0, d2: 0, d3: 0 },
        pulse: ['clk'],
        expect: { w_2: 1, w_0: 1, w_1: 0, w_3: 0 },
      },
      {
        name: 'feedback-4',
        set: { clk: 0, rst: 0, en: 1, d: 0, d2: 0, d3: 0 },
        pulse: ['clk'],
        expect: { w_2: 1, w_0: 0, w_1: 0, w_3: 1 },
      },
      {
        name: 'feedback-5',
        set: { clk: 0, rst: 0, en: 1, d: 0, d2: 0, d3: 0 },
        pulse: ['clk'],
        expect: { w_2: 0, w_0: 0, w_1: 1, w_3: 0 },
      },
    ],
  };
}

function buildCustomReg4PipelineScenario() {
  return {
    steps: [
      {
        name: 'assert-reset',
        set: { d0: 1, d1: 0, d2: 1, d3: 0, en: 1, clk: 0, rst: 1 },
        expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0 },
      },
      {
        name: 'load-stage-a',
        set: { d0: 1, d1: 0, d2: 1, d3: 0, en: 1, clk: 0, rst: 0 },
        pulse: ['clk'],
        expect: { w_0: 1, w_1: 0, w_2: 1, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 1 },
      },
      {
        name: 'load-stage-b',
        set: { d0: 1, d1: 1, d2: 1, d3: 1, en: 1, clk: 0, rst: 0 },
        pulse: ['clk'],
        expect: { w_0: 1, w_1: 1, w_2: 1, w_3: 1, w_4: 1, w_5: 0, w_6: 1, w_7: 0, w_8: 0 },
      },
      {
        name: 'hold-disabled',
        set: { d0: 0, d1: 0, d2: 0, d3: 0, en: 0, clk: 0, rst: 0 },
        pulse: ['clk'],
        expect: { w_0: 1, w_1: 1, w_2: 1, w_3: 1, w_4: 1, w_5: 0, w_6: 1, w_7: 0, w_8: 0 },
      },
    ],
  };
}

const HDL_SIM_SCENARIOS = new Map([
  ['gc_c1_basic_gates', {
    steps: [
      { name: 'all-low', set: { a: 0, b: 0, c: 0 }, expect: { w_2: 1 } },
      { name: 'and-path-high', set: { a: 1, b: 1, c: 0 }, expect: { w_2: 0 } },
      { name: 'c-forces-low', set: { a: 1, b: 0, c: 1 }, expect: { w_2: 0 } },
    ],
  }],
  ['gc_c2_half_adder', {
    steps: [
      { name: 'zero-plus-zero', set: { a: 0, b: 0 }, expect: { w_0: 0, w_1: 0 } },
      { name: 'one-plus-zero', set: { a: 1, b: 0 }, expect: { w_0: 1, w_1: 0 } },
      { name: 'one-plus-one', set: { a: 1, b: 1 }, expect: { w_0: 0, w_1: 1 } },
    ],
  }],
  ['gc_c3_sr_latch', {
    steps: [
      { name: 'set', set: { s: 1, r: 0 }, expect: { w_0: 1, w_1: 0 } },
      { name: 'hold', set: { s: 0, r: 0 }, expect: { w_0: 1, w_1: 0 } },
      { name: 'reset', set: { s: 0, r: 1 }, expect: { w_0: 0, w_1: 1 } },
    ],
  }],
  ['gc_s1_dff_assr', {
    steps: [
      { name: 'assert-reset', set: { d: 1, clk: 0, s: 0, r: 1 }, expect: { w_0: 0 } },
      { name: 'release-controls', set: { d: 1, clk: 0, s: 0, r: 0 } },
      { name: 'assert-set', set: { d: 0, clk: 0, s: 1, r: 0 }, expect: { w_0: 1 } },
      { name: 'capture-low', set: { d: 0, clk: 0, s: 0, r: 0 }, pulse: ['clk'], expect: { w_0: 0 } },
    ],
  }],
  ['gc_s2_jkff_toggle', {
    steps: [
      { name: 'force-known-one', set: { j: 1, k: 0, clk: 0 }, pulse: ['clk'], expect: { w_0: 1 } },
      { name: 'toggle-low', set: { j: 1, k: 1, clk: 0 }, pulse: ['clk'], expect: { w_0: 0 } },
      { name: 'toggle-high', set: { j: 1, k: 1, clk: 0 }, pulse: ['clk'], expect: { w_0: 1 } },
    ],
  }],
  ['gc_s3_74hc74', {
    steps: [
      { name: 'prepare-controls', set: { pre1: 1, clr1: 1, d1: 0, clk1: 0, pre2: 1, clr2: 1, d2: 0, clk2: 0 } },
      { name: 'assert-preset-ff1', set: { pre1: 0, clr1: 1, d1: 0, clk1: 0, pre2: 1, clr2: 1, d2: 0, clk2: 0 }, expect: { w_0: 1 } },
      { name: 'release-ff1-controls', set: { pre1: 1, clr1: 1, d1: 0, clk1: 0, pre2: 1, clr2: 1, d2: 0, clk2: 0 } },
      { name: 'assert-clear-ff1', set: { pre1: 1, clr1: 0, d1: 0, clk1: 0, pre2: 1, clr2: 1, d2: 0, clk2: 0 }, expect: { w_0: 0 } },
      { name: 'clock-ff2-data', set: { pre1: 1, clr1: 1, d1: 0, clk1: 0, pre2: 1, clr2: 1, d2: 1, clk2: 0 }, pulse: ['clk2'], expect: { w_0: 0, w_1: 1 } },
    ],
  }],
  ['gc_s4_reg4_enable', {
    steps: [
      { name: 'assert-reset', set: { d0: 0, d1: 0, d2: 0, d3: 0, en: 0, clk: 0, rst: 1 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0 } },
      { name: 'release-reset', set: { d0: 0, d1: 0, d2: 0, d3: 0, en: 0, clk: 0, rst: 0 } },
      { name: 'load-1010', set: { d0: 1, d1: 0, d2: 1, d3: 0, en: 1, clk: 0, rst: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 0, w_2: 1, w_3: 0 } },
      { name: 'hold-when-disabled', set: { d0: 0, d1: 1, d2: 0, d3: 1, en: 0, clk: 0, rst: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 0, w_2: 1, w_3: 0 } },
    ],
  }],
  ['gc_t1_tribuf_direct', {
    steps: [
      { name: 'drive-one', set: { a: 1, oe: 0 }, expect: { w_0: 1 } },
      { name: 'drive-zero', set: { a: 0, oe: 0 }, expect: { w_0: 0 } },
      { name: 'high-z', set: { a: 1, oe: 1 }, expect: { w_0: 'Z' } },
    ],
  }],
  ['gc_m1_dff_chain', {
    steps: [
      { name: 'prime-stage-one', set: { d: 0, clk: 0 }, pulse: ['clk'] },
      { name: 'prime-stage-two', set: { d: 0, clk: 0 }, pulse: ['clk'], expect: { w_1: 0 } },
      { name: 'load-first-stage', set: { d: 1, clk: 0 }, pulse: ['clk'], expect: { w_1: 0 } },
      { name: 'transfer-second-stage', set: { d: 1, clk: 0 }, pulse: ['clk'], expect: { w_1: 1 } },
      { name: 'clear-first-stage', set: { d: 0, clk: 0 }, pulse: ['clk'], expect: { w_1: 1 } },
      { name: 'clear-second-stage', set: { d: 0, clk: 0 }, pulse: ['clk'], expect: { w_1: 0 } },
    ],
  }],
  ['gc_m2_283_adder', {
    steps: [
      { name: 'seven-plus-eight', set: { a1: 1, a2: 1, a3: 1, a4: 0, b1: 0, b2: 0, b3: 0, b4: 1, c0: 0 }, expect: { w_0: 1, w_1: 1, w_2: 1, w_3: 1, w_4: 0 } },
      { name: 'fifteen-plus-one', set: { a1: 1, a2: 1, a3: 1, a4: 1, b1: 1, b2: 0, b3: 0, b4: 0, c0: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 1 } },
    ],
  }],
  ['gc_m3_counter_gate', {
    steps: [
      { name: 'prepare-clear-edge', set: { clk: 0, clrn: 1, ldn: 1, enp: 0, ent: 0, d0: 0, d1: 0, d2: 0, d3: 0 } },
      { name: 'async-clear', set: { clk: 0, clrn: 0, ldn: 1, enp: 0, ent: 0, d0: 0, d1: 0, d2: 0, d3: 0 }, expect: { w_2: 0 } },
      { name: 'count-one', set: { clk: 0, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, pulse: ['clk'], expect: { w_2: 0 } },
      { name: 'count-two', set: { clk: 0, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, pulse: ['clk'], expect: { w_2: 0 } },
      { name: 'count-three-detect', set: { clk: 0, clrn: 1, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, pulse: ['clk'], expect: { w_2: 1 } },
    ],
  }],
  ['gc_s5_dff_basic', {
    steps: [
      { name: 'capture-high', set: { d: 1, clk: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 0 } },
      { name: 'hold-without-edge', set: { d: 0, clk: 0 }, expect: { w_0: 1, w_1: 0 } },
      { name: 'capture-low', set: { d: 0, clk: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 1 } },
    ],
  }],
  ['gc_s7_hc161_vs_hc163', {
    steps: [
      { name: 'sync-clear-both', set: { clk: 0, clrn: 0, enp: 0, ent: 0, ldn: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0 } },
      { name: 'count-once', set: { clk: 0, clrn: 1, enp: 1, ent: 1, ldn: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 0, w_2: 0, w_3: 0, w_4: 1, w_5: 0, w_6: 0, w_7: 0 } },
      { name: 'async-clear-difference', set: { clk: 0, clrn: 0, enp: 1, ent: 1, ldn: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 1, w_5: 0, w_6: 0, w_7: 0 } },
    ],
  }],
  ['gc_s8_hc194_modes', {
    steps: [
      { name: 'prepare-clear-edge', set: { clk: 0, clrn: 1, s0: 0, s1: 0, sr: 0, sl: 0, d0: 0, d1: 0, d2: 0, d3: 0 } },
      { name: 'async-clear', set: { clk: 0, clrn: 0, s0: 0, s1: 0, sr: 0, sl: 0, d0: 0, d1: 0, d2: 0, d3: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0 } },
      { name: 'parallel-load-1010', set: { clk: 0, clrn: 1, s0: 1, s1: 1, sr: 0, sl: 0, d0: 0, d1: 1, d2: 0, d3: 1 }, pulse: ['clk'], expect: { w_0: 0, w_1: 1, w_2: 0, w_3: 1 } },
      { name: 'hold', set: { clk: 0, clrn: 1, s0: 0, s1: 0, sr: 0, sl: 0, d0: 1, d1: 1, d2: 1, d3: 1 }, pulse: ['clk'], expect: { w_0: 0, w_1: 1, w_2: 0, w_3: 1 } },
      { name: 'shift-right', set: { clk: 0, clrn: 1, s0: 1, s1: 0, sr: 1, sl: 0, d0: 0, d1: 0, d2: 0, d3: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 0, w_2: 1, w_3: 1 } },
      { name: 'shift-left', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 1, w_2: 0, w_3: 1 } },
    ],
  }],
  ['gc_v2_1_mux_fabric', {
    steps: [
      { name: 'lower-bank-hit', set: { d0: 1, s0: 0, s1: 0, s2: 0, m0: 0, m1: 0 }, expect: { w_8: 1, w_9: 1 } },
      { name: 'upper-bank-hit', set: { d15: 1, s0: 1, s1: 1, s2: 1, m0: 1, m1: 0 }, expect: { w_8: 1, w_9: 0 } },
      { name: 'complement-bank-and-tap', set: { d2: 1, d8: 1, s0: 0, s1: 1, s2: 0, m0: 0, m1: 1 }, expect: { w_8: 0, w_9: 1 } },
    ],
  }],
  ['gc_v2_2_datapath_slice', {
    steps: [
      { name: 'assert-reset', set: { clk: 0, rst: 1, en: 1, b0: 1, b1: 1, b2: 0, b3: 0, cin: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_11: 0, w_12: 0 } },
      { name: 'release-reset', set: { clk: 0, rst: 0, en: 1, b0: 1, b1: 1, b2: 0, b3: 0, cin: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_11: 0, w_12: 0 } },
      { name: 'add-phase', set: { clk: 0, rst: 0, en: 1, b0: 1, b1: 1, b2: 0, b3: 0, cin: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 1, w_2: 0, w_3: 0, w_4: 1, w_5: 0, w_6: 0, w_11: 0, w_12: 0 } },
      { name: 'sub-phase', set: { clk: 0, rst: 0, en: 1, b0: 1, b1: 1, b2: 0, b3: 0, cin: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 1, w_6: 0, w_11: 0, w_12: 0 } },
      { name: 'and-phase', set: { clk: 0, rst: 0, en: 1, b0: 1, b1: 1, b2: 0, b3: 0, cin: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 1, w_5: 1, w_6: 0, w_11: 0, w_12: 0 } },
      { name: 'or-phase', set: { clk: 0, rst: 0, en: 1, b0: 1, b1: 1, b2: 0, b3: 0, cin: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 1, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 1, w_11: 0, w_12: 0 } },
    ],
  }],
  ['gc_v2_3_shift_pipeline', {
    steps: [
      { name: 'prepare-clear-edge', set: { clk: 0, clrn: 1, s0: 0, s1: 0, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 1 } },
      { name: 'assert-clears', set: { clk: 0, clrn: 0, s0: 0, s1: 0, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 0, oe: 1 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 'Z', w_5: 'Z', w_6: 'Z', w_7: 'Z', w_8: 'Z', w_9: 'Z', w_10: 'Z', w_11: 'Z' } },
      { name: 'latch-cleared-stage', set: { clk: 0, clrn: 1, s0: 0, s1: 0, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 1 }, pulse: ['stcp'], expect: { w_4: 'Z', w_11: 'Z' } },
      { name: 'enable-zero-outputs', set: { clk: 0, clrn: 1, s0: 0, s1: 0, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'parallel-load-1101', set: { clk: 0, clrn: 1, s0: 1, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 0, w_2: 1, w_3: 1, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'shift-left-1', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 1, w_2: 0, w_3: 1, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'shift-left-2', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 0, w_2: 1, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'shift-left-3', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 1, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'shift-left-4', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'latch-shifted-word', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, pulse: ['stcp'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 1, w_5: 0, w_6: 1, w_7: 1, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'oe-tristate', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 1 }, expect: { w_4: 'Z', w_5: 'Z', w_6: 'Z', w_7: 'Z', w_8: 'Z', w_9: 'Z', w_10: 'Z', w_11: 'Z' } },
      { name: 'oe-restore', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 1, oe: 0 }, expect: { w_4: 1, w_5: 0, w_6: 1, w_7: 1, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'mr-clears-hidden-shift-only', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 0, oe: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 1, w_5: 0, w_6: 1, w_7: 1, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
      { name: 'stcp-makes-mr-visible', set: { clk: 0, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 0, d0: 1, d1: 0, d2: 1, d3: 1, stcp: 0, mr: 0, oe: 0 }, pulse: ['stcp'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0, w_9: 0, w_10: 0, w_11: 0 } },
    ],
  }],
  ['gc_v2_4_ram_readback', {
    steps: [
      { name: 'reset-and-idle', set: { a0: 1, a1: 0, a2: 1, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0, di0: 1, di1: 0, di2: 1, di3: 0, di4: 0, di5: 1, di6: 0, di7: 1, we: 1, cs: 1, oe: 1, clk: 0, rst: 1 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 'Z' } },
      { name: 'release-reset', set: { rst: 0 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 'Z' } },
      { name: 'write-a5-into-addr5', set: { we: 0, cs: 0, oe: 1 }, expect: { w_8: 'Z' } },
      { name: 'read-live-bus', set: { we: 1, cs: 0, oe: 0 }, expect: { w_8: 1 } },
      { name: 'capture-a5', set: { clk: 0 }, pulse: ['clk'], expect: { w_0: 1, w_1: 0, w_2: 1, w_3: 0, w_4: 0, w_5: 1, w_6: 0, w_7: 1, w_8: 1 } },
      { name: 'switch-to-empty-addr0', set: { a0: 0, a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0, we: 1, cs: 0, oe: 0 }, expect: { w_8: 0 } },
      { name: 'capture-empty-read', set: { clk: 0 }, pulse: ['clk'], expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 0 } },
      { name: 'reassert-reset', set: { a0: 0, a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0, di0: 1, di1: 0, di2: 1, di3: 0, di4: 0, di5: 1, di6: 0, di7: 1, we: 1, cs: 1, oe: 1, clk: 0, rst: 1 }, expect: { w_0: 0, w_1: 0, w_2: 0, w_3: 0, w_4: 0, w_5: 0, w_6: 0, w_7: 0, w_8: 'Z' } },
    ],
  }],
  ['gc_v2_5_decode_tree', {
    steps: [
      { name: 'prime-373-hidden-addr2', set: { a: 0, b: 1, c: 0, g1: 1, g2a: 0, g2b: 0, ein: 0, le373: 1, oe373: 1, clk374: 0, oe374: 1 }, expect: { w_9: 'Z', w_10: 'Z', w_11: 'Z', w_12: 'Z', w_13: 'Z', w_14: 'Z', w_15: 'Z', w_16: 'Z', w_22: 'Z', w_23: 'Z', w_24: 'Z', w_25: 'Z', w_26: 'Z' } },
      { name: 'reveal-373-addr2', set: { a: 0, b: 1, c: 0, g1: 1, g2a: 0, g2b: 0, ein: 0, le373: 1, oe373: 0, clk374: 0, oe374: 1 }, expect: { w_9: 1, w_10: 1, w_11: 0, w_12: 1, w_13: 1, w_14: 1, w_15: 1, w_16: 1, w_22: 'Z', w_23: 'Z', w_24: 'Z', w_25: 'Z', w_26: 'Z' } },
      { name: 'transparent-follow-addr5', set: { a: 1, b: 0, c: 1, g1: 1, g2a: 0, g2b: 0, ein: 0, le373: 1, oe373: 0, clk374: 0, oe374: 1 }, expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 0, w_15: 1, w_16: 1, w_22: 'Z', w_23: 'Z', w_24: 'Z', w_25: 'Z', w_26: 'Z' } },
      { name: 'hold-373-while-addr3-live', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 0, g2b: 0, ein: 0, le373: 0, oe373: 0, clk374: 0, oe374: 1 }, expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 0, w_15: 1, w_16: 1, w_22: 'Z', w_23: 'Z', w_24: 'Z', w_25: 'Z', w_26: 'Z' } },
      { name: 'capture-374-hidden-addr3', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 0, g2b: 0, ein: 0, le373: 0, oe373: 0, clk374: 0, oe374: 1 }, pulse: ['clk374'], expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 0, w_15: 1, w_16: 1, w_22: 'Z', w_23: 'Z', w_24: 'Z', w_25: 'Z', w_26: 'Z' } },
      { name: 'reveal-374-addr3', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 0, g2b: 0, ein: 0, le373: 0, oe373: 0, clk374: 0, oe374: 0 }, expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 0, w_15: 1, w_16: 1, w_22: 0, w_23: 0, w_24: 1, w_25: 0, w_26: 1 } },
      { name: 'encoder-disable-capture', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 0, g2b: 0, ein: 1, le373: 0, oe373: 0, clk374: 0, oe374: 0 }, pulse: ['clk374'], expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 0, w_15: 1, w_16: 1, w_22: 1, w_23: 1, w_24: 1, w_25: 1, w_26: 1 } },
      { name: 'prime-disabled-decode-hidden', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 1, g2b: 0, ein: 0, le373: 1, oe373: 1, clk374: 0, oe374: 0 }, expect: { w_9: 'Z', w_10: 'Z', w_11: 'Z', w_12: 'Z', w_13: 'Z', w_14: 'Z', w_15: 'Z', w_16: 'Z', w_22: 1, w_23: 1, w_24: 1, w_25: 1, w_26: 1 } },
      { name: 'reveal-disabled-decode', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 1, g2b: 0, ein: 0, le373: 0, oe373: 0, clk374: 0, oe374: 0 }, expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 1, w_15: 1, w_16: 1, w_22: 1, w_23: 1, w_24: 1, w_25: 1, w_26: 1 } },
      { name: 'capture-no-active-status', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 1, g2b: 0, ein: 0, le373: 0, oe373: 0, clk374: 0, oe374: 0 }, pulse: ['clk374'], expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 1, w_15: 1, w_16: 1, w_22: 1, w_23: 1, w_24: 1, w_25: 1, w_26: 0 } },
      { name: '374-high-z', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 1, g2b: 0, ein: 0, le373: 0, oe373: 0, clk374: 0, oe374: 1 }, expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 1, w_15: 1, w_16: 1, w_22: 'Z', w_23: 'Z', w_24: 'Z', w_25: 'Z', w_26: 'Z' } },
      { name: '374-restore-held-status', set: { a: 1, b: 1, c: 0, g1: 1, g2a: 1, g2b: 0, ein: 0, le373: 0, oe373: 0, clk374: 0, oe374: 0 }, expect: { w_9: 1, w_10: 1, w_11: 1, w_12: 1, w_13: 1, w_14: 1, w_15: 1, w_16: 1, w_22: 1, w_23: 1, w_24: 1, w_25: 1, w_26: 0 } },
    ],
  }],
  ['gc_v2_6_custom_halfadder', buildCustomHalfAdderScenario()],
  ['gc_v2_7_bus_conflict_system', {
    steps: [
      { name: 'all-disabled', set: { a_clk: 0, a_oe: 1, a_d0: 1, a_d1: 0, b_clk: 0, b_oe: 1, b_d0: 0, b_d1: 1 }, expect: { w_3: 'Z', w_10: 0, w_12: 0 } },
      { name: 'load-a-shadow', set: { a_clk: 0, a_oe: 1, a_d0: 1, a_d1: 0 }, pulse: ['a_clk'], expect: { w_3: 'Z', w_4: 1, w_5: 0, w_10: 0, w_12: 0 } },
      { name: 'load-b-shadow', set: { b_clk: 0, b_oe: 1, b_d0: 0, b_d1: 1 }, pulse: ['b_clk'], expect: { w_3: 'Z', w_4: 1, w_5: 0, w_6: 0, w_7: 1, w_10: 0, w_12: 0 } },
      { name: 'enable-a-only', set: { a_oe: 0, b_oe: 1 }, expect: { w_3: 'Z', w_4: 1, w_5: 0, w_6: 0, w_7: 1, w_10: 0, w_12: 0 } },
      { name: 'overlap-conflict', set: { a_oe: 0, b_oe: 0 }, expect: { w_3: 0, w_4: 1, w_5: 0, w_6: 0, w_7: 1, w_10: 1, w_12: 1 } },
      { name: 'reload-b-align-bit0', set: { b_oe: 1, b_d0: 1, b_d1: 1, b_clk: 0 }, pulse: ['b_clk'], expect: { w_3: 'Z', w_4: 1, w_5: 0, w_6: 1, w_7: 1, w_10: 0, w_12: 0 } },
      { name: 'overlap-no-conflict', set: { a_oe: 0, b_oe: 0 }, expect: { w_3: 1, w_4: 1, w_5: 0, w_6: 1, w_7: 1, w_10: 1, w_12: 0 } },
    ],
  }],
  ['gc_v2_8_sequential_feedback', buildSequentialFeedbackScenario()],
  ['gc_v2_9_custom_reg4_pipeline', buildCustomReg4PipelineScenario()],
]);

function parseRunnerArgs(argv) {
  let slug = null;
  let writeArtifacts = true;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--no-write') {
      writeArtifacts = false;
      continue;
    }
    if (arg === '--slug' && i + 1 < argv.length) {
      slug = argv[++i];
      continue;
    }
    if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length);
    }
  }
  return { slug, writeArtifacts };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return { ok: true, data: JSON.parse(raw), raw };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function readTextSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return { ok: true, raw };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function displayPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sanitizeText(text) {
  return String(text)
    .split(ROOT).join('<repo>')
    .split(ROOT.replace(/\\/g, '/')).join('<repo>')
    .replace(/\/home\/p-keminer\/projects\/uni\/logic-gate-simulator/g, '<repo>')
    .replace(/C:\\Users\\pkemi\\logic-simulator-studio/gi, '<repo>');
}

function logicToken(value) {
  if (value === 0 || value === '0') return '0';
  if (value === 1 || value === '1') return '1';
  if (value === 2 || String(value).toUpperCase() === 'Z') return 'Z';
  if (value === 3 || String(value).toUpperCase() === 'X') return 'X';
  throw new Error(`Unsupported HDL logic value: ${value}`);
}

function toVerilogLiteral(value) {
  return `1'b${logicToken(value).toLowerCase()}`;
}

function toVhdlLiteral(value) {
  return `'${logicToken(value)}'`;
}

function formatToolDetail(successDetail, result) {
  if (result.status === 'pass') return successDetail;
  return result.error || result.output || 'No tool detail available';
}

function normalizeToolCheck(slug, checkId, result) {
  if (
    slug === 'gc_c3_sr_latch'
    && checkId === 'verilog-verilator-lint'
    && result.status === 'fail'
    && /UNOPTFLAT/.test(result.error || '')
  ) {
    return {
      ...result,
      status: 'pass',
      detailOverride: 'Verilator UNOPTFLAT waived for intentional cross-coupled NOR latch.',
    };
  }

  return result;
}

function pushToolCheck(checks, slug, checkId, successDetail, result) {
  const normalized = normalizeToolCheck(slug, checkId, result);
  checks.push({
    checkId,
    status: normalized.status,
    detail: normalized.detailOverride ?? formatToolDetail(successDetail, normalized),
  });
}

function buildVerilogTestbench(slug, entry, scenario) {
  const inputs = entry.inputs ?? [];
  const outputs = entry.outputs ?? [];
  const allPorts = [...inputs, ...outputs];
  const lines = [
    '`timescale 1ns/1ps',
    '',
    'module tb;',
    ...inputs.map(id => `  reg ${id} = 1'b0;`),
    ...outputs.map(id => `  wire ${id};`),
    '',
    `  ${slug} dut (`,
    allPorts.map((id, idx) => `    .${id}(${id})${idx < allPorts.length - 1 ? ',' : ''}`).join('\n'),
    '  );',
    '',
    '  initial begin',
  ];

  for (const step of scenario.steps) {
    lines.push(`    // ${step.name}`);
    for (const [signal, value] of Object.entries(step.set ?? {})) {
      lines.push(`    ${signal} = ${toVerilogLiteral(value)};`);
    }
    lines.push('    #1;');
    for (const signal of step.pulse ?? []) {
      lines.push(`    ${signal} = 1'b0;`);
      lines.push('    #1;');
      lines.push(`    ${signal} = 1'b1;`);
      lines.push('    #1;');
      lines.push(`    ${signal} = 1'b0;`);
      lines.push('    #1;');
    }
    for (const [signal, value] of Object.entries(step.expect ?? {})) {
      lines.push(`    if (${signal} !== ${toVerilogLiteral(value)}) begin`);
      lines.push(`      $display("FAIL ${slug}/${step.name}/${signal}: expected ${logicToken(value)} got=%b", ${signal});`);
      lines.push('      $fatal(1);');
      lines.push('    end');
    }
  }

  lines.push(`    $display("PASS ${slug}");`);
  lines.push('    $finish;');
  lines.push('  end');
  lines.push('endmodule');

  return lines.join('\n');
}

function buildVhdlTestbench(slug, entry, scenario) {
  const inputs = entry.inputs ?? [];
  const outputs = entry.outputs ?? [];
  const allPorts = [...inputs, ...outputs];
  const lines = [
    'library ieee;',
    'use ieee.std_logic_1164.all;',
    '',
    'entity tb is',
    'end entity tb;',
    '',
    'architecture sim of tb is',
    ...inputs.map(id => `  signal ${id} : std_logic := '0';`),
    ...outputs.map(id => `  signal ${id} : std_logic;`),
    'begin',
    '  dut: entity work.' + slug,
    '    port map (',
    allPorts.map((id, idx) => `      ${id} => ${id}${idx < allPorts.length - 1 ? ',' : ''}`).join('\n'),
    '    );',
    '',
    '  process',
    '  begin',
  ];

  for (const step of scenario.steps) {
    lines.push(`    -- ${step.name}`);
    for (const [signal, value] of Object.entries(step.set ?? {})) {
      lines.push(`    ${signal} <= ${toVhdlLiteral(value)};`);
    }
    lines.push('    wait for 1 ns;');
    for (const signal of step.pulse ?? []) {
      lines.push(`    ${signal} <= '0';`);
      lines.push('    wait for 1 ns;');
      lines.push(`    ${signal} <= '1';`);
      lines.push('    wait for 1 ns;');
      lines.push(`    ${signal} <= '0';`);
      lines.push('    wait for 1 ns;');
    }
    for (const [signal, value] of Object.entries(step.expect ?? {})) {
      lines.push(`    assert ${signal} = ${toVhdlLiteral(value)} report "FAIL ${slug}/${step.name}/${signal}: expected ${logicToken(value)}" severity failure;`);
    }
  }

  lines.push(`    report "PASS ${slug}" severity note;`);
  lines.push('    wait;');
  lines.push('  end process;');
  lines.push('end architecture sim;');

  return lines.join('\n');
}

/**
 * Compare two strings line-by-line and return info about the first difference.
 * Returns null when the strings are identical (after trailing-newline normalization).
 *
 * Normalization: trailing blank lines are stripped so that a file saved with or
 * without a final `\n` does not cause a spurious mismatch. Real content changes
 * are still caught.
 *
 * @param {string} golden  The stored reference text.
 * @param {string} actual  The freshly-generated text.
 */
function findFirstDiff(golden, actual) {
  // Normalize: ignore trailing blank lines and final-newline differences.
  const norm = (s) => s.replace(/\n+$/, '');
  const g = norm(golden);
  const a = norm(actual);
  if (g === a) return null;
  const goldenLines = g.split('\n');
  const actualLines = a.split('\n');
  const max = Math.max(goldenLines.length, actualLines.length);
  for (let i = 0; i < max; i++) {
    const gl = goldenLines[i] ?? '<line missing>';
    const al = actualLines[i] ?? '<line missing>';
    if (gl !== al) {
      return {
        lineNo: i + 1,
        golden: gl.slice(0, 120),
        actual: al.slice(0, 120),
      };
    }
  }
  return null;
}

// ── Per-case checks ─────────────────────────────────────────────────────────

/**
 * @typedef {'pass' | 'fail' | 'expected_limit' | 'unsupported'} CaseStatus
 *
 * @typedef {{
 *   checkId: string,
 *   status: CaseStatus,
 *   detail: string,
 * }} CheckResult
 *
 * @typedef {{
 *   slug: string,
 *   class: string,
 *   title: string,
 *   status: CaseStatus,
 *   checks: CheckResult[],
 *   reason: string,
 * }} CaseResult
 */

async function runCase(entry) {
  const slug = entry.slug;
  const checks = [];

  const circuitPath = path.join(CIRCUITS_DIR, `${slug}.lgsc.json`);
  const verilogPath = path.join(EXPORTS_DIR, `${slug}.v`);
  const vhdlPath = path.join(EXPORTS_DIR, `${slug}.vhd`);

  // ── Check 1: Circuit file exists ────────────────────────────────────────
  const circuitExists = await fileExists(circuitPath);
  checks.push({
    checkId: 'circuit-file-exists',
    status: circuitExists ? 'pass' : 'fail',
    detail: circuitExists ? displayPath(circuitPath) : `Missing: ${displayPath(circuitPath)}`,
  });

  // ── Check 2: Verilog export exists ──────────────────────────────────────
  const verilogExists = await fileExists(verilogPath);
  checks.push({
    checkId: 'verilog-export-exists',
    status: verilogExists ? 'pass' : 'fail',
    detail: verilogExists ? displayPath(verilogPath) : `Missing: ${displayPath(verilogPath)}`,
  });

  // ── Check 3: VHDL export exists ─────────────────────────────────────────
  const vhdlExists = await fileExists(vhdlPath);
  checks.push({
    checkId: 'vhdl-export-exists',
    status: vhdlExists ? 'pass' : 'fail',
    detail: vhdlExists ? displayPath(vhdlPath) : `Missing: ${displayPath(vhdlPath)}`,
  });

  // ── Check 4: Circuit JSON parseable ─────────────────────────────────────
  let circuitData = null;
  if (circuitExists) {
    const result = await readJsonSafe(circuitPath);
    checks.push({
      checkId: 'circuit-json-parseable',
      status: result.ok ? 'pass' : 'fail',
      detail: result.ok ? 'Valid JSON' : result.error,
    });
    if (result.ok) circuitData = result.data;
  }

  // ── Check 5: Circuit has expected id/name matching slug ─────────────────
  if (circuitData) {
    const idMatch = circuitData.id === slug || circuitData.name === slug;
    checks.push({
      checkId: 'circuit-slug-match',
      status: idMatch ? 'pass' : 'fail',
      detail: idMatch
        ? `id=${circuitData.id}, name=${circuitData.name}`
        : `Expected id or name = ${slug}, got id=${circuitData.id}, name=${circuitData.name}`,
    });
  }

  // ── Check 6: Circuit contains expected gate types ───────────────────────
  if (circuitData && entry.gates) {
    const gateTypes = new Set(
      Object.values(circuitData.gates || {}).map(g => g.typeId).filter(Boolean)
    );
    const expectedGates = entry.gates;
    // Compare directly — corpus and circuit files use the same naming
    // (e.g. IC_74HC74, AND, TRIBUF)
    const missing = expectedGates.filter(g => !gateTypes.has(g));
    checks.push({
      checkId: 'circuit-gate-types',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All expected gates found: ${expectedGates.join(', ')}`
        : `Missing gate types: ${missing.join(', ')}; found: ${[...gateTypes].join(', ')}`,
    });
  }

  // ── Check 7: Circuit has expected inputs ────────────────────────────────
  if (circuitData && entry.inputs) {
    const switchLabels = new Set(
      Object.values(circuitData.gates || {})
        .filter(g => g.typeId === 'INPUT_SWITCH')
        .map(g => g.label)
        .filter(Boolean)
    );
    const missing = entry.inputs.filter(inp => !switchLabels.has(inp));
    checks.push({
      checkId: 'circuit-inputs',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.inputs.length} inputs found`
        : `Missing inputs: ${missing.join(', ')}; found: ${[...switchLabels].join(', ')}`,
    });
  }

  // ── Check 8: Circuit has expected outputs ───────────────────────────────
  if (circuitData && entry.outputs) {
    const wires = circuitData.wires || {};
    const wireTargets = new Set();
    for (const w of Object.values(wires)) {
      // Wires going to LED/output components
      if (w.toGateId) {
        const targetGate = circuitData.gates?.[w.toGateId];
        if (targetGate?.typeId === 'OUTPUT_LED') {
          // The wire id or a derived name serves as output
          wireTargets.add(w.id);
        }
      }
    }
    // For outputs, just verify the count matches
    const ledCount = Object.values(circuitData.gates || {})
      .filter(g => g.typeId === 'OUTPUT_LED').length;
    checks.push({
      checkId: 'circuit-outputs',
      status: ledCount >= entry.outputs.length ? 'pass' : 'fail',
      detail: `Expected ${entry.outputs.length} output(s), found ${ledCount} LED(s)`,
    });
  }

  // ── Check 9: Verilog structural sanity ──────────────────────────────────
  let goldenVerilog = null;
  if (verilogExists) {
    const vResult = await readTextSafe(verilogPath);
    if (vResult.ok) {
      goldenVerilog = vResult.raw;
      const vChecks = checkVerilogStructure(goldenVerilog, slug, entry);
      checks.push(...vChecks);
      const syntaxResults = compileVerilogWithSyntax(verilogPath, sanitizeText);
      pushToolCheck(checks, slug, 'verilog-iverilog-syntax', `iverilog accepted ${displayPath(verilogPath)}`, syntaxResults.iverilog);
      pushToolCheck(checks, slug, 'verilog-verilator-lint', `verilator accepted ${displayPath(verilogPath)}`, syntaxResults.verilator);
      pushToolCheck(checks, slug, 'verilog-yosys-read', `yosys accepted ${displayPath(verilogPath)}`, syntaxResults.yosys);
    } else {
      checks.push({
        checkId: 'verilog-readable',
        status: 'fail',
        detail: vResult.error,
      });
    }
  }

  // ── Check 10: VHDL structural sanity ────────────────────────────────────
  let goldenVhdl = null;
  if (vhdlExists) {
    const vResult = await readTextSafe(vhdlPath);
    if (vResult.ok) {
      goldenVhdl = vResult.raw;
      const vChecks = checkVhdlStructure(goldenVhdl, slug, entry);
      checks.push(...vChecks);
      const syntaxResults = compileVhdlWithSyntax(vhdlPath, sanitizeText);
      pushToolCheck(checks, slug, 'vhdl-ghdl-analyze', `ghdl accepted ${displayPath(vhdlPath)}`, syntaxResults.ghdl);
    } else {
      checks.push({
        checkId: 'vhdl-readable',
        status: 'fail',
        detail: vResult.error,
      });
    }
  }

  const hdlScenario = HDL_SIM_SCENARIOS.get(slug);
  if (hdlScenario) {
    if (verilogExists) {
      const simResult = await runVerilogSimulation({
        designFile: verilogPath,
        testbenchSource: buildVerilogTestbench(slug, entry, hdlScenario),
      }, sanitizeText);
      pushToolCheck(checks, slug, 'verilog-external-sim', `${hdlScenario.steps.length} scenario step(s) passed with iverilog/vvp`, simResult);
    }
    if (vhdlExists) {
      const simResult = await runVhdlSimulation({
        designFile: vhdlPath,
        testbenchSource: buildVhdlTestbench(slug, entry, hdlScenario),
      }, sanitizeText);
      pushToolCheck(checks, slug, 'vhdl-external-sim', `${hdlScenario.steps.length} scenario step(s) passed with ghdl`, simResult);
    }
  } else if (KNOWN_BOUNDARIES.has(slug)) {
    checks.push({
      checkId: 'external-hdl-sim-scenario',
      status: 'expected_limit',
      detail: 'Skipped external HDL simulation for documented multi-driver boundary.',
    });
  } else {
    checks.push({
      checkId: 'external-hdl-sim-scenario',
      status: 'unsupported',
      detail: `No external HDL simulation scenario defined in runner ${RUNNER_VERSION}.`,
    });
  }

  // ── Check 12: Verilog re-export diff (export-determinism) ───────────────
  if (!generateVerilog) {
    checks.push({
      checkId: 'verilog-reexport-diff',
      status: 'unsupported',
      detail: exporterLoadError
        ? `Exporter not loaded: ${exporterLoadError.slice(0, 150)}`
        : 'Exporter not available (run via: npx vite-node validation/run-golden-corpus-v1.mjs)',
    });
  } else if (circuitData && goldenVerilog !== null) {
    try {
      const generated = generateVerilog(circuitData);
      const diff = findFirstDiff(goldenVerilog, generated);
      checks.push({
        checkId: 'verilog-reexport-diff',
        status: diff === null ? 'pass' : 'fail',
        detail: diff === null
          ? 'Re-exported Verilog matches golden artifact exactly'
          : `First diff at line ${diff.lineNo} — golden: "${diff.golden}" | actual: "${diff.actual}"`,
      });
    } catch (e) {
      checks.push({
        checkId: 'verilog-reexport-diff',
        status: 'fail',
        detail: `generateVerilog() threw: ${String(e).slice(0, 200)}`,
      });
    }
  }

  // ── Check 13: VHDL re-export diff (export-determinism) ──────────────────
  if (!generateVHDL) {
    checks.push({
      checkId: 'vhdl-reexport-diff',
      status: 'unsupported',
      detail: exporterLoadError
        ? `Exporter not loaded: ${exporterLoadError.slice(0, 150)}`
        : 'Exporter not available (run via: npx vite-node validation/run-golden-corpus-v1.mjs)',
    });
  } else if (circuitData && goldenVhdl !== null) {
    try {
      const generated = generateVHDL(circuitData);
      const diff = findFirstDiff(goldenVhdl, generated);
      checks.push({
        checkId: 'vhdl-reexport-diff',
        status: diff === null ? 'pass' : 'fail',
        detail: diff === null
          ? 'Re-exported VHDL matches golden artifact exactly'
          : `First diff at line ${diff.lineNo} — golden: "${diff.golden}" | actual: "${diff.actual}"`,
      });
    } catch (e) {
      checks.push({
        checkId: 'vhdl-reexport-diff',
        status: 'fail',
        detail: `generateVHDL() threw: ${String(e).slice(0, 200)}`,
      });
    }
  }

  // ── Check 11: Known boundary classification ─────────────────────────────
  if (KNOWN_BOUNDARIES.has(slug)) {
    checks.push({
      checkId: 'known-boundary',
      status: 'expected_limit',
      detail: KNOWN_BOUNDARIES.get(slug),
    });
  }

  // ── Aggregate status ────────────────────────────────────────────────────
  const sanitizedChecks = checks.map(c => ({ ...c, detail: sanitizeText(c.detail) }));
  const status = aggregateCaseStatus(sanitizedChecks, slug);
  const reason = sanitizeText(summarizeCaseReason(sanitizedChecks, status));

  return {
    slug,
    class: entry.class,
    title: entry.title,
    status,
    checks: sanitizedChecks,
    reason,
  };
}

// ── Verilog structural checks ────────────────────────────────────────────────

/**
 * Normalize whitespace for checkpoint comparison: collapse runs of
 * whitespace to single space, trim.
 */
function normalizeWS(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/** Check if source contains pattern after whitespace normalization. */
function sourceContainsNormalized(source, pattern) {
  return normalizeWS(source).includes(normalizeWS(pattern));
}

function checkVerilogStructure(source, slug, entry) {
  const checks = [];

  // Module declaration present
  const moduleMatch = source.match(/module\s+(\w+)/);
  const moduleOk = moduleMatch && moduleMatch[1] === slug;
  checks.push({
    checkId: 'verilog-module-name',
    status: moduleOk ? 'pass' : 'fail',
    detail: moduleOk
      ? `module ${slug} found`
      : `Expected module ${slug}, got ${moduleMatch?.[1] ?? 'none'}`,
  });

  // Has endmodule
  const hasEndmodule = source.includes('endmodule');
  checks.push({
    checkId: 'verilog-endmodule',
    status: hasEndmodule ? 'pass' : 'fail',
    detail: hasEndmodule ? 'endmodule found' : 'Missing endmodule',
  });

  // Expected inputs declared (use \s+ to handle multi-space formatting)
  if (entry.inputs) {
    const declaredInputs = [...source.matchAll(/input\s+wire\s+(\w+)/g)].map(m => m[1]);
    const missing = entry.inputs.filter(inp => !declaredInputs.includes(inp));
    checks.push({
      checkId: 'verilog-input-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.inputs.length} input ports declared`
        : `Missing input ports: ${missing.join(', ')}`,
    });
  }

  // Expected outputs declared
  if (entry.outputs) {
    const declaredOutputs = [...source.matchAll(/output\s+(?:wire|reg)\s+(\w+)/g)].map(m => m[1]);
    const missing = entry.outputs.filter(out => !declaredOutputs.includes(out));
    checks.push({
      checkId: 'verilog-output-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.outputs.length} output port(s) declared`
        : `Missing output ports: ${missing.join(', ')}`,
    });
  }

  // Checkpoint-specific Verilog checks — use normalized whitespace matching
  if (entry.checkPoints) {
    const cp = entry.checkPoints;

    // Check verilogPorts if specified
    if (cp.verilogPorts) {
      const allFound = cp.verilogPorts.every(p => sourceContainsNormalized(source, p));
      checks.push({
        checkId: 'verilog-checkpoint-ports',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.verilogPorts.length} checkpoint ports found`
          : `Some checkpoint ports missing from Verilog`,
      });
    }

    // Check internal wires if specified
    if (cp.internalWires) {
      const allFound = cp.internalWires.every(w => source.includes(w));
      checks.push({
        checkId: 'verilog-checkpoint-wires',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.internalWires.length} internal wires found`
          : `Some internal wires missing from Verilog`,
      });
    }

    // Check primitives if specified — use normalized whitespace
    if (cp.primitives) {
      const allFound = cp.primitives.every(p => sourceContainsNormalized(source, p));
      checks.push({
        checkId: 'verilog-checkpoint-primitives',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.primitives.length} primitives found`
          : `Some primitives missing from Verilog`,
      });
    }

    // Check verilog pattern if specified — use normalized whitespace
    if (cp.verilog) {
      const found = sourceContainsNormalized(source, cp.verilog);
      checks.push({
        checkId: 'verilog-checkpoint-pattern',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Checkpoint pattern found: ${cp.verilog.slice(0, 60)}`
          : `Checkpoint pattern NOT found: ${cp.verilog.slice(0, 60)}`,
      });
    }

    // Check verilogSens if specified — use normalized whitespace
    if (cp.verilogSens) {
      const found = sourceContainsNormalized(source, cp.verilogSens);
      checks.push({
        checkId: 'verilog-checkpoint-sensitivity',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Sensitivity list found: ${cp.verilogSens}`
          : `Sensitivity list NOT found: ${cp.verilogSens}`,
      });
    }

    // Check verilogBranches if specified — semantic description, not literal
    // These describe branch structure (e.g. "if (r) Q<=0") which may differ
    // from actual code formatting. Verify that branch-relevant keywords exist.
    // Note: "Q" is a symbolic register name in checkpoint descriptions; actual
    // code uses auto-generated names like w_0. Skip such abstract tokens.
    if (cp.verilogBranches) {
      const branchSkip = new Set(['Q', 'if', 'else', 'begin', 'end']);
      const allFound = cp.verilogBranches.every(b => {
        const tokens = b.match(/[a-zA-Z_]\w*/g) || [];
        const meaningful = tokens.filter(t => !branchSkip.has(t));
        return meaningful.every(t => source.includes(t));
      });
      checks.push({
        checkId: 'verilog-checkpoint-branches',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.verilogBranches.length} branch patterns verified`
          : `Some branch patterns missing from Verilog`,
      });
    }

    // Check verilogPattern if specified — use normalized whitespace
    if (cp.verilogPattern) {
      const found = sourceContainsNormalized(source, cp.verilogPattern);
      checks.push({
        checkId: 'verilog-checkpoint-always-pattern',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Always-block pattern found: ${cp.verilogPattern}`
          : `Always-block pattern NOT found: ${cp.verilogPattern}`,
      });
    }

    // Check verilogExtraReg if specified — just the reg name portion
    if (cp.verilogExtraReg) {
      // Extract the reg declaration part (e.g. "reg [3:0] cnt_ctr")
      const regMatch = cp.verilogExtraReg.match(/reg\s+\[[\d:]+\]\s+(\w+)/);
      const regName = regMatch ? regMatch[1] : null;
      const found = regName ? source.includes(regName) : source.includes(cp.verilogExtraReg);
      checks.push({
        checkId: 'verilog-checkpoint-extra-reg',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Extra reg ${regName ? `'${regName}'` : ''} found`
          : `Extra reg NOT found: ${cp.verilogExtraReg.slice(0, 60)}`,
      });
    }

    // Check verilogPrimitives if specified — use normalized whitespace
    if (cp.verilogPrimitives) {
      const allFound = cp.verilogPrimitives.every(p => sourceContainsNormalized(source, p));
      checks.push({
        checkId: 'verilog-checkpoint-gate-primitives',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.verilogPrimitives.length} gate primitives found`
          : `Some gate primitives missing from Verilog`,
      });
    }
  }

  return checks;
}

// ── VHDL structural checks ──────────────────────────────────────────────────

function checkVhdlStructure(source, slug, entry) {
  const checks = [];

  // Entity declaration present
  const entityMatch = source.match(/entity\s+(\w+)\s+is/);
  const entityOk = entityMatch && entityMatch[1] === slug;
  checks.push({
    checkId: 'vhdl-entity-name',
    status: entityOk ? 'pass' : 'fail',
    detail: entityOk
      ? `entity ${slug} found`
      : `Expected entity ${slug}, got ${entityMatch?.[1] ?? 'none'}`,
  });

  // Has architecture
  const hasArch = source.includes('architecture');
  checks.push({
    checkId: 'vhdl-architecture',
    status: hasArch ? 'pass' : 'fail',
    detail: hasArch ? 'architecture block found' : 'Missing architecture block',
  });

  // Expected inputs declared
  if (entry.inputs) {
    const declaredPorts = [...source.matchAll(/(\w+)\s*:\s*in\s+STD_LOGIC/gi)].map(m => m[1]);
    const missing = entry.inputs.filter(inp => !declaredPorts.includes(inp));
    checks.push({
      checkId: 'vhdl-input-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.inputs.length} input ports declared`
        : `Missing input ports: ${missing.join(', ')}`,
    });
  }

  // Expected outputs declared
  if (entry.outputs) {
    const declaredPorts = [...source.matchAll(/(\w+)\s*:\s*out\s+STD_LOGIC/gi)].map(m => m[1]);
    const missing = entry.outputs.filter(out => !declaredPorts.includes(out));
    checks.push({
      checkId: 'vhdl-output-ports',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0
        ? `All ${entry.outputs.length} output port(s) declared`
        : `Missing output ports: ${missing.join(', ')}`,
    });
  }

  // Checkpoint-specific VHDL checks
  if (entry.checkPoints) {
    const cp = entry.checkPoints;

    // Check vhdlShadow if specified
    if (cp.vhdlShadow) {
      const found = source.includes('_q');
      checks.push({
        checkId: 'vhdl-checkpoint-shadow',
        status: found ? 'pass' : 'fail',
        detail: found
          ? 'Shadow signal pattern (_q) found in VHDL'
          : 'Shadow signal pattern (_q) NOT found in VHDL',
      });
    }

    // Check vhdlBranches if specified — semantic, use token-level matching
    // Skip abstract/symbolic names (Q) and VHDL keywords already implied by structure
    if (cp.vhdlBranches) {
      const branchSkip = new Set(['Q', 'if', 'elsif', 'else', 'then', 'end']);
      const allFound = cp.vhdlBranches.every(b => {
        const tokens = b.match(/[a-zA-Z_]\w*/g) || [];
        const meaningful = tokens.filter(t => !branchSkip.has(t));
        return meaningful.every(t => source.includes(t));
      });
      checks.push({
        checkId: 'vhdl-checkpoint-branches',
        status: allFound ? 'pass' : 'fail',
        detail: allFound
          ? `All ${cp.vhdlBranches.length} VHDL branch patterns verified`
          : `Some VHDL branch patterns missing`,
      });
    }

    // Check vhdl pattern if specified — semantic description, extract key tokens
    if (cp.vhdl) {
      // Extract meaningful keywords/identifiers and check each is present
      const tokens = cp.vhdl.match(/[a-zA-Z_]\w*/g) || [];
      // Filter out very common words that aren't useful for matching
      const skipWords = new Set(['with', 'and', 'or', 'not', 'the', 'is', 'a', 'an', 'in', 'to', 'for', 'of', 'arithmetic']);
      const meaningfulTokens = tokens.filter(t => !skipWords.has(t.toLowerCase()) && t.length > 1);
      const found = meaningfulTokens.length > 0 && meaningfulTokens.every(t => source.includes(t));
      checks.push({
        checkId: 'vhdl-checkpoint-pattern',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `VHDL checkpoint tokens verified`
          : `VHDL checkpoint pattern NOT fully matched: ${cp.vhdl.slice(0, 60)}`,
      });
    }

    // Check vhdlExtraSignal if specified — extract signal name
    if (cp.vhdlExtraSignal) {
      const sigMatch = cp.vhdlExtraSignal.match(/signal\s+(\w+)/);
      const sigName = sigMatch ? sigMatch[1] : null;
      const found = sigName ? source.includes(sigName) : source.includes(cp.vhdlExtraSignal);
      checks.push({
        checkId: 'vhdl-checkpoint-extra-signal',
        status: found ? 'pass' : 'fail',
        detail: found
          ? `Extra signal ${sigName ? `'${sigName}'` : ''} found`
          : `Extra signal NOT found: ${cp.vhdlExtraSignal.slice(0, 60)}`,
      });
    }

    // Check outputShadows if specified
    if (cp.outputShadows) {
      const found = source.includes('_q');
      checks.push({
        checkId: 'vhdl-checkpoint-output-shadows',
        status: found ? 'pass' : 'fail',
        detail: found
          ? 'Output shadow signals (_q) found in VHDL'
          : 'Output shadow signals (_q) NOT found in VHDL',
      });
    }
  }

  return checks;
}

// ── Status aggregation ──────────────────────────────────────────────────────

function aggregateCaseStatus(checks, slug) {
  // If any check is expected_limit, the whole case is expected_limit
  // (never classified as clean pass)
  if (checks.some(c => c.status === 'expected_limit')) return 'expected_limit';
  // If any check failed, the case fails
  if (checks.some(c => c.status === 'fail')) return 'fail';
  // If all are unsupported, it's unsupported
  if (checks.every(c => c.status === 'unsupported')) return 'unsupported';
  return 'pass';
}

function summarizeCaseReason(checks, status) {
  if (status === 'expected_limit') {
    const limitCheck = checks.find(c => c.status === 'expected_limit');
    return limitCheck?.detail ?? 'Known boundary';
  }
  if (status === 'fail') {
    const fails = checks.filter(c => c.status === 'fail');
    return fails.map(f => `[${f.checkId}] ${f.detail}`).join('; ');
  }
  if (status === 'unsupported') {
    return 'All checks unsupported in v1';
  }
  const passCount = checks.filter(c => c.status === 'pass').length;
  return `${passCount} checks passed`;
}

// ── Report generation ───────────────────────────────────────────────────────

function generateReport(corpusVersion, caseResults) {
  const now = new Date().toISOString();
  const total = caseResults.length;
  const passed = caseResults.filter(r => r.status === 'pass').length;
  const failed = caseResults.filter(r => r.status === 'fail').length;
  const unsupported = caseResults.filter(r => r.status === 'unsupported').length;
  const expectedLimit = caseResults.filter(r => r.status === 'expected_limit').length;
  const executed = passed + failed + expectedLimit;

  let md = `# Golden Corpus v1 Report\n\n`;
  md += `Generated: ${now}\n`;
  md += `Runner version: ${RUNNER_VERSION}\n`;
  md += `Corpus version: ${corpusVersion}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total cases | ${total} |\n`;
  md += `| Executed | ${executed} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Failed | ${failed} |\n`;
  md += `| Expected limit | ${expectedLimit} |\n`;
  md += `| Unsupported | ${unsupported} |\n\n`;

  md += `**Verdict:** ${failed === 0 ? 'PASS' : 'FAIL'}`;
  if (expectedLimit > 0) {
    md += ` (${expectedLimit} known limit${expectedLimit > 1 ? 's' : ''})`;
  }
  md += `\n\n`;

  // Per-class breakdown
  md += `## Per-Class Summary\n\n`;
  md += `| Class | Pass | Fail | Expected Limit | Unsupported | Total |\n|---|---|---|---|---|---|\n`;
  const classes = [...new Set(caseResults.map(r => r.class))];
  for (const cls of classes) {
    const clsResults = caseResults.filter(r => r.class === cls);
    const cP = clsResults.filter(r => r.status === 'pass').length;
    const cF = clsResults.filter(r => r.status === 'fail').length;
    const cE = clsResults.filter(r => r.status === 'expected_limit').length;
    const cU = clsResults.filter(r => r.status === 'unsupported').length;
    md += `| ${cls} | ${cP} | ${cF} | ${cE} | ${cU} | ${clsResults.length} |\n`;
  }
  md += `\n`;

  // Per-case detail
  md += `## Per-Case Results\n\n`;
  for (const r of caseResults) {
    const statusLabel = r.status.toUpperCase().replace('_', ' ');
    md += `### ${r.slug} — ${statusLabel}\n\n`;
    md += `- **Class:** ${r.class}\n`;
    md += `- **Title:** ${r.title}\n`;
    md += `- **Reason:** ${r.reason}\n\n`;
    md += `| Check | Status | Detail |\n|---|---|---|\n`;
    for (const c of r.checks) {
      const label = c.status.toUpperCase().replace('_', ' ');
      // Truncate long details for readability
      const detailRaw = sanitizeText(c.detail);
      const detail = detailRaw.length > 120 ? detailRaw.slice(0, 117) + '...' : detailRaw;
      md += `| ${c.checkId} | ${label} | ${detail} |\n`;
    }
    md += `\n`;
  }

  // What v1 checks
  md += `## What v1 Checks\n\n`;
  md += `- Circuit file existence and JSON parseability\n`;
  md += `- Verilog export existence and structural sanity (module name, ports, endmodule)\n`;
  md += `- VHDL export existence and structural sanity (entity name, architecture, ports)\n`;
  md += `- Slug-to-file 1:1 mapping\n`;
  md += `- Gate type presence in circuit files\n`;
  md += `- Input/output port consistency between corpus index and artifacts\n`;
  md += `- Checkpoint string matching against Verilog/VHDL sources\n`;
  md += `- External HDL syntax/lint compilation (iverilog, verilator, yosys, ghdl) when toolchain is present\n`;
  md += `- Scenario-based external HDL simulation for all non-boundary cases (iverilog/vvp and ghdl)\n`;
  md += `- **Re-export + byte-accurate diff against golden .v/.vhd artifacts** (export-determinism, v1.1)\n`;
  md += `- Known boundary classification (gc_t2_bus_mux)\n\n`;

  const exporterStatus = generateVerilog
    ? `Exporters loaded — diff checks ran live`
    : `Exporters not loaded — diff checks classified as unsupported`;
  md += `**Export-determinism status:** ${exporterStatus}\n\n`;

  // What v1 does NOT check
  md += `## What v1 Does NOT Check (Gaps for v2)\n\n`;
  md += `- Exhaustive external HDL verification beyond the curated scenario traces\n`;
  md += `- Formal or property-based equivalence between runtime model and exported HDL\n`;
  md += `- Multi-driver bus behavior beyond the documented gc_t2_bus_mux boundary\n`;
  md += `- UI replay / visual regression\n`;

  // Known Boundaries section
  md += `\n## Known Boundaries\n\n`;
  for (const [slug, reason] of KNOWN_BOUNDARIES) {
    md += `- **${slug}**: ${reason}\n`;
  }
  md += `\n`;
  md += `Cases with expected_limit are *not* counted as pass. `;
  md += `They document intentional model boundaries that are verified to still exist.\n`;

  return md;
}

function generateSummary(corpusVersion, caseResults) {
  const now = new Date().toISOString();
  const total = caseResults.length;
  const passed = caseResults.filter(r => r.status === 'pass').length;
  const failed = caseResults.filter(r => r.status === 'fail').length;
  const unsupported = caseResults.filter(r => r.status === 'unsupported').length;
  const expectedLimit = caseResults.filter(r => r.status === 'expected_limit').length;

  // Per-class summary
  const perClass = {};
  for (const r of caseResults) {
    if (!perClass[r.class]) perClass[r.class] = { pass: 0, fail: 0, expected_limit: 0, unsupported: 0, total: 0 };
    perClass[r.class].total++;
    perClass[r.class][r.status]++;
  }

  return {
    generatedAt: now,
    runnerVersion: RUNNER_VERSION,
    corpusVersion,
    totalCases: total,
    passed,
    failed,
    expectedLimit,
    unsupported,
    verdict: failed === 0 ? 'PASS' : 'FAIL',
    perClass,
    perCase: caseResults.map(r => ({
      slug: r.slug,
      class: r.class,
      title: r.title,
      status: r.status,
      checksRun: r.checks.length,
      checksPassed: r.checks.filter(c => c.status === 'pass').length,
      checksFailed: r.checks.filter(c => c.status === 'fail').length,
      reason: r.reason,
    })),
    results: caseResults,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main({ slug = null, writeArtifacts = true } = {}) {
  // Load corpus index
  const corpusResult = await readJsonSafe(CORPUS_FILE);
  if (!corpusResult.ok) {
    console.error(`Failed to load corpus: ${corpusResult.error}`);
    process.exit(2);
  }
  const corpus = corpusResult.data;
  const corpusVersion = corpus.version ?? 'unknown';
  const entries = slug
    ? (corpus.circuits ?? []).filter((entry) => entry.slug === slug)
    : (corpus.circuits ?? []);
  if (slug && entries.length === 0) {
    console.error(`No corpus entry found for slug: ${slug}`);
    process.exit(2);
  }

  // ── Load TypeScript exporters (requires vite-node) ──────────────────────
  try {
    // Gate registry must be bootstrapped before calling generateVerilog/generateVHDL.
    // The registry uses side-effect imports; importing index.ts triggers all of them.
    await import(new URL('../src/core/registry/index.ts', import.meta.url).href);
    await registerGoldenCustomICsForSlugs(entries.map((entry) => entry.slug));
    const vMod = await import(new URL('../src/core/io/verilog.ts', import.meta.url).href);
    const hMod = await import(new URL('../src/core/io/vhdl.ts', import.meta.url).href);
    generateVerilog = vMod.generateVerilog;
    generateVHDL = hMod.generateVHDL;
    console.log('Export-determinism: exporters loaded — re-export diff checks ACTIVE');
  } catch (e) {
    exporterLoadError = String(e);
    console.warn(`Export-determinism: exporters NOT loaded (${exporterLoadError.slice(0, 120)})`);
    console.warn('Re-export diff checks will be classified as unsupported.');
  }

  console.log(`Golden Corpus v1 Runner v${RUNNER_VERSION}`);
  console.log(`Corpus version: ${corpusVersion}`);
  console.log(`Loaded ${entries.length} entries from ${displayPath(CORPUS_FILE)}`);

  const caseResults = [];
  for (const entry of entries) {
    const result = await runCase(entry);
    caseResults.push(result);
    const statusLabel = result.status.toUpperCase().replace('_', ' ');
    const checksSummary = `${result.checks.filter(c => c.status === 'pass').length}/${result.checks.length} checks`;
    console.log(`  ${entry.slug}: ${statusLabel} (${checksSummary})`);
  }

  const summary = generateSummary(corpusVersion, caseResults);
  const report = generateReport(corpusVersion, caseResults);

  if (writeArtifacts) {
    await fs.writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2) + '\n');
    await fs.writeFile(REPORT_FILE, report);
  } else {
    console.log('Artifact writes skipped (--no-write).');
  }

  console.log(`\nVerdict: ${summary.verdict}`);
  console.log(`  ${summary.passed} pass, ${summary.failed} fail, ${summary.expectedLimit} expected_limit, ${summary.unsupported} unsupported`);
  if (writeArtifacts) {
    console.log(`Summary: ${displayPath(SUMMARY_FILE)}`);
    console.log(`Report:  ${displayPath(REPORT_FILE)}`);
  }

  // CI-consumable JSON
  console.log(JSON.stringify({
    summaryFile: writeArtifacts ? displayPath(SUMMARY_FILE) : null,
    reportFile: writeArtifacts ? displayPath(REPORT_FILE) : null,
    slug: slug ?? null,
    verdict: summary.verdict,
    passed: summary.passed,
    failed: summary.failed,
    expectedLimit: summary.expectedLimit,
    unsupported: summary.unsupported,
  }));

  process.exit(summary.failed > 0 ? 1 : 0);
}

main(parseRunnerArgs(process.argv.slice(2))).catch(e => {
  console.error('Golden Corpus runner failed:', e);
  process.exit(2);
});

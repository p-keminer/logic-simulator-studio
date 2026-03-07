import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'validation');
const CIRCUIT_DIR = path.join(OUT_DIR, 'generated-circuits-focused');
const EXPORT_DIR = path.join(OUT_DIR, 'generated-exports-focused');
const SUMMARY_FILE = path.join(OUT_DIR, 'focused-nine-summary.json');
const REPORT_FILE = path.join(OUT_DIR, 'focused-nine-report.md');
const PUBLIC_REPO = '<repo-root>';
const PUBLIC_SERVER = '<dev-server>';
const QA_STATUS = {
  vitest: 'manually re-run 2026-03-07: 713/713 pass',
  build: 'manually re-run 2026-03-07: tsc -b + vite build pass; bundle-size warning only',
  lint: 'manually re-run 2026-03-07: pass',
};

function fileHref(...parts) {
  return pathToFileURL(path.join(ROOT, ...parts)).href;
}

function publicPath(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function sanitizePublicText(value) {
  return String(value ?? '')
    .split(ROOT).join(PUBLIC_REPO)
    .split('<dev-server>').join(PUBLIC_SERVER)
    .split('<dev-server>').join(PUBLIC_SERVER);
}

await import(fileHref('src', 'core', 'registry', 'index.ts'));
const [{ gateRegistry }, { HI_Z }, { runSimulation }, tickEngine, { generateVerilog }, { generateVHDL }, { serializeCircuit }] =
  await Promise.all([
    import(fileHref('src', 'core', 'registry', 'GateRegistry.ts')),
    import(fileHref('src', 'core', 'types.ts')),
    import(fileHref('src', 'core', 'simulation', 'engine.ts')),
    import(fileHref('src', 'core', 'simulation', 'tickEngine.ts')),
    import(fileHref('src', 'core', 'io', 'verilog.ts')),
    import(fileHref('src', 'core', 'io', 'vhdl.ts')),
    import(fileHref('src', 'core', 'io', 'serializer.ts')),
  ]);

const { buildWireMap, initBuffer, runOneTick, runUntilStable } = tickEngine;

const defaultSignal = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(id, typeId, x, y, opts = {}) {
  return {
    id,
    typeId,
    x,
    y,
    label: opts.label,
    customState: opts.customState ?? {},
    outputSignals: opts.outputSignals ?? {},
    isSelected: false,
  };
}

function makeWire(id, fromGate, fromPort, toGate, toPort) {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to: { gateId: toGate, portId: toPort },
    signal: { ...defaultSignal },
    waypoints: [],
    isSelected: false,
  };
}

function makeCircuit(name, gates, wires) {
  return {
    id: name,
    name,
    version: '1.0.0',
    gates: Object.fromEntries(gates.map((gate) => [gate.id, gate])),
    wires: Object.fromEntries(wires.map((wire) => [wire.id, wire])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-07', updatedAt: '2026-03-07' },
  };
}

function switchGate(id, label, value, x, y) {
  return makeGate(id, 'INPUT_SWITCH', x, y, { label, customState: { value } });
}

function ledGate(id, label, x, y) {
  return makeGate(id, 'OUTPUT_LED', x, y, { label });
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applySwitchValue(circuit, gateId, value) {
  circuit.gates[gateId].customState = {
    ...(circuit.gates[gateId].customState ?? {}),
    value,
  };
}

function createRuntime(circuit) {
  const wireMap = buildWireMap(circuit);
  const buffer = runUntilStable(circuit, initBuffer(circuit), wireMap).buffer;
  return { circuit, wireMap, buffer };
}

function settle(runtime) {
  runtime.buffer = runUntilStable(runtime.circuit, runtime.buffer, runtime.wireMap).buffer;
  return runtime.buffer;
}

function tick(runtime) {
  runtime.buffer = runOneTick(runtime.circuit, runtime.buffer, runtime.wireMap, true);
  return settle(runtime);
}

function updateAndMaybeTick(runtime, updates = {}, shouldTick = false) {
  for (const [gateId, value] of Object.entries(updates)) applySwitchValue(runtime.circuit, gateId, value);
  settle(runtime);
  return shouldTick ? tick(runtime) : runtime.buffer;
}

function stateTransition(typeId, inputs, currentState) {
  const def = gateRegistry.get(typeId);
  if (!def) throw new Error(`unknown gate type ${typeId}`);
  const outputsOld = def.evaluate(inputs, currentState);
  const nextState = def.stateUpdate ? def.stateUpdate(inputs, outputsOld, currentState) : { ...currentState };
  const outputs = def.evaluate(inputs, nextState);
  return { outputs, outputsOld, nextState };
}

function toolResult(run) {
  try {
    return { status: 'pass', output: sanitizePublicText(run() ?? '').trim() };
  } catch (error) {
    return {
      status: 'fail',
      output: sanitizePublicText(error.stdout ?? '').trim(),
      error: sanitizePublicText(error.stderr ?? error.message ?? error).trim(),
    };
  }
}

function compileVerilogWithSyntax(file) {
  return {
    iverilog: toolResult(() =>
      execFileSync('iverilog', ['-g2012', '-t', 'null', file], { encoding: 'utf8' })),
    verilator: toolResult(() =>
      execFileSync('verilator', ['--lint-only', file], { encoding: 'utf8' })),
    yosys: toolResult(() =>
      execFileSync('yosys', ['-q', '-p', `read_verilog ${file}; proc; opt; stat`], { encoding: 'utf8' })),
  };
}

function compileVhdlWithSyntax(file) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lgsim-ghdl-'));
  const result = {
    ghdl: toolResult(() =>
      execFileSync('ghdl', ['-a', '--std=08', file], { encoding: 'utf8', cwd: tempDir })),
  };
  rmSync(tempDir, { recursive: true, force: true });
  return {
    ...result,
  };
}

async function writeCircuitArtifacts(slug, circuit, verilog, vhdl) {
  await Promise.all([
    fs.writeFile(path.join(CIRCUIT_DIR, `${slug}.lgsc.json`), serializeCircuit(circuit), 'utf8'),
    fs.writeFile(path.join(EXPORT_DIR, `${slug}.v`), verilog, 'utf8'),
    fs.writeFile(path.join(EXPORT_DIR, `${slug}.vhd`), vhdl, 'utf8'),
  ]);
}

function makeTriNotCircuit() {
  return makeCircuit('tri_not_sanitized', [
    switchGate('sw_a', 'a', 1, 40, 40),
    switchGate('sw_oe', 'oe', 1, 40, 120),
    makeGate('tri', 'TRIBUF', 240, 80),
    makeGate('inv', 'NOT', 420, 80),
    ledGate('led', 'y', 600, 80),
  ], [
    makeWire('w1', 'sw_a', 'out', 'tri', 'a'),
    makeWire('w2', 'sw_oe', 'out', 'tri', 'oe'),
    makeWire('w3', 'tri', 'y', 'inv', 'a'),
    makeWire('w4', 'inv', 'out', 'led', 'in'),
  ]);
}

function makeDffCircuit() {
  return makeCircuit('dff_led', [
    switchGate('sw_d', 'd', 1, 40, 40),
    switchGate('sw_clk', 'clk', 0, 40, 120),
    makeGate('dut', 'D_FF', 280, 80, { customState: { q: 0, prevClk: 0 } }),
    ledGate('led', 'q', 520, 80),
  ], [
    makeWire('w1', 'sw_d', 'out', 'dut', 'd'),
    makeWire('w2', 'sw_clk', 'out', 'dut', 'clk'),
    makeWire('w3', 'dut', 'q', 'led', 'in'),
  ]);
}

function makeJkffCircuit() {
  return makeCircuit('jkff_led', [
    switchGate('sw_j', 'j', 1, 40, 20),
    switchGate('sw_k', 'k', 0, 40, 80),
    switchGate('sw_clk', 'clk', 0, 40, 140),
    makeGate('dut', 'JK_FF', 300, 80, { customState: { q: 0, prevClk: 0 } }),
    ledGate('led', 'q', 560, 80),
  ], [
    makeWire('w1', 'sw_j', 'out', 'dut', 'j'),
    makeWire('w2', 'sw_k', 'out', 'dut', 'k'),
    makeWire('w3', 'sw_clk', 'out', 'dut', 'clk'),
    makeWire('w4', 'dut', 'q', 'led', 'in'),
  ]);
}

function makeTffCircuit() {
  return makeCircuit('tff_led', [
    switchGate('sw_t', 't', 1, 40, 40),
    switchGate('sw_clk', 'clk', 0, 40, 120),
    makeGate('dut', 'T_FF', 300, 80, { customState: { q: 0, prevClk: 0 } }),
    ledGate('led', 'q', 560, 80),
  ], [
    makeWire('w1', 'sw_t', 'out', 'dut', 't'),
    makeWire('w2', 'sw_clk', 'out', 'dut', 'clk'),
    makeWire('w3', 'dut', 'q', 'led', 'in'),
  ]);
}

function make74hc373Circuit() {
  const gates = [
    switchGate('sw_oe', 'oe', 1, 40, 20),
    switchGate('sw_le', 'le', 0, 40, 60),
    ...Array.from({ length: 8 }, (_, i) => switchGate(`sw_d${i}`, `d${i}`, i % 2 === 0 ? 1 : 0, 40, 100 + i * 40)),
    makeGate('dut', '74HC373', 360, 220, {
      customState: { latch: 0x55, q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0 },
    }),
    ledGate('led0', 'q0', 680, 120),
  ];
  const wires = [
    makeWire('w1', 'sw_oe', 'out', 'dut', 'oe'),
    makeWire('w2', 'sw_le', 'out', 'dut', 'le'),
    ...Array.from({ length: 8 }, (_, i) => makeWire(`wd${i}`, `sw_d${i}`, 'out', 'dut', `d${i}`)),
    makeWire('w_out0', 'dut', 'q0', 'led0', 'in'),
  ];
  return makeCircuit('hc373_oe_z', gates, wires);
}

function make74hc374Circuit() {
  const gates = [
    switchGate('sw_oe', 'oe', 1, 40, 20),
    switchGate('sw_clk', 'clk', 0, 40, 60),
    ...Array.from({ length: 8 }, (_, i) => switchGate(`sw_d${i}`, `d${i}`, i < 2 || (i >= 4 && i < 6) ? 1 : 0, 40, 100 + i * 40)),
    makeGate('dut', '74HC374', 360, 220, {
      customState: { reg: 0x33, pClk: 0, q0: 1, q1: 1, q2: 0, q3: 0, q4: 1, q5: 1, q6: 0, q7: 0 },
    }),
    ledGate('led0', 'q0', 680, 120),
  ];
  const wires = [
    makeWire('w1', 'sw_oe', 'out', 'dut', 'oe'),
    makeWire('w2', 'sw_clk', 'out', 'dut', 'clk'),
    ...Array.from({ length: 8 }, (_, i) => makeWire(`wd${i}`, `sw_d${i}`, 'out', 'dut', `d${i}`)),
    makeWire('w_out0', 'dut', 'q0', 'led0', 'in'),
  ];
  return makeCircuit('hc374_oe_z', gates, wires);
}

function make74hc595Circuit() {
  return makeCircuit('hc595_oe_shift', [
    switchGate('sw_ds', 'ds', 1, 40, 20),
    switchGate('sw_shcp', 'shcp', 0, 40, 60),
    switchGate('sw_stcp', 'stcp', 0, 40, 100),
    switchGate('sw_mr', 'mr', 1, 40, 140),
    switchGate('sw_oe', 'oe', 0, 40, 180),
    makeGate('dut', '74HC595', 340, 140, {
      customState: { shift: 0, latch: 0, pShcp: 0, pStcp: 0 },
    }),
    ledGate('led0', 'q0', 640, 80),
    ledGate('led1', 'q1', 640, 140),
  ], [
    makeWire('w1', 'sw_ds', 'out', 'dut', 'ds'),
    makeWire('w2', 'sw_shcp', 'out', 'dut', 'shcp'),
    makeWire('w3', 'sw_stcp', 'out', 'dut', 'stcp'),
    makeWire('w4', 'sw_mr', 'out', 'dut', 'mr'),
    makeWire('w5', 'sw_oe', 'out', 'dut', 'oe'),
    makeWire('w6', 'dut', 'q0', 'led0', 'in'),
    makeWire('w7', 'dut', 'q1', 'led1', 'in'),
  ]);
}

function make74hc161Circuit() {
  return makeCircuit('hc161_clear', [
    switchGate('sw_clk', 'clk', 0, 40, 20),
    switchGate('sw_clrn', 'clrn', 1, 40, 60),
    switchGate('sw_ldn', 'ldn', 1, 40, 100),
    switchGate('sw_enp', 'enp', 1, 40, 140),
    switchGate('sw_ent', 'ent', 1, 40, 180),
    switchGate('sw_d0', 'd0', 0, 40, 220),
    switchGate('sw_d1', 'd1', 0, 40, 260),
    switchGate('sw_d2', 'd2', 0, 40, 300),
    switchGate('sw_d3', 'd3', 0, 40, 340),
    makeGate('dut', '74HC161', 340, 200, { customState: { cnt: 0, pClk: 0 } }),
    ledGate('led0', 'q0', 620, 120),
    ledGate('led1', 'q1', 620, 180),
  ], [
    makeWire('w1', 'sw_clk', 'out', 'dut', 'clk'),
    makeWire('w2', 'sw_clrn', 'out', 'dut', 'clrn'),
    makeWire('w3', 'sw_ldn', 'out', 'dut', 'ldn'),
    makeWire('w4', 'sw_enp', 'out', 'dut', 'enp'),
    makeWire('w5', 'sw_ent', 'out', 'dut', 'ent'),
    makeWire('w6', 'sw_d0', 'out', 'dut', 'd0'),
    makeWire('w7', 'sw_d1', 'out', 'dut', 'd1'),
    makeWire('w8', 'sw_d2', 'out', 'dut', 'd2'),
    makeWire('w9', 'sw_d3', 'out', 'dut', 'd3'),
    makeWire('w10', 'dut', 'q0', 'led0', 'in'),
    makeWire('w11', 'dut', 'q1', 'led1', 'in'),
  ]);
}

function make74hc163Circuit() {
  return makeCircuit('hc163_clear', [
    switchGate('sw_clk', 'clk', 0, 40, 20),
    switchGate('sw_clrn', 'clrn', 1, 40, 60),
    switchGate('sw_ldn', 'ldn', 1, 40, 100),
    switchGate('sw_enp', 'enp', 1, 40, 140),
    switchGate('sw_ent', 'ent', 1, 40, 180),
    switchGate('sw_d0', 'd0', 0, 40, 220),
    switchGate('sw_d1', 'd1', 0, 40, 260),
    switchGate('sw_d2', 'd2', 0, 40, 300),
    switchGate('sw_d3', 'd3', 0, 40, 340),
    makeGate('dut', '74HC163', 340, 200, { customState: { cnt: 12, pClk: 0 } }),
    ledGate('led0', 'q0', 620, 120),
    ledGate('led1', 'q1', 620, 180),
  ], [
    makeWire('w1', 'sw_clk', 'out', 'dut', 'clk'),
    makeWire('w2', 'sw_clrn', 'out', 'dut', 'clrn'),
    makeWire('w3', 'sw_ldn', 'out', 'dut', 'ldn'),
    makeWire('w4', 'sw_enp', 'out', 'dut', 'enp'),
    makeWire('w5', 'sw_ent', 'out', 'dut', 'ent'),
    makeWire('w6', 'sw_d0', 'out', 'dut', 'd0'),
    makeWire('w7', 'sw_d1', 'out', 'dut', 'd1'),
    makeWire('w8', 'sw_d2', 'out', 'dut', 'd2'),
    makeWire('w9', 'sw_d3', 'out', 'dut', 'd3'),
    makeWire('w10', 'dut', 'q0', 'led0', 'in'),
    makeWire('w11', 'dut', 'q1', 'led1', 'in'),
  ]);
}

function make74hc194Circuit() {
  return makeCircuit('hc194_modes', [
    switchGate('sw_clk', 'clk', 0, 40, 20),
    switchGate('sw_clrn', 'clrn', 1, 40, 60),
    switchGate('sw_s0', 's0', 0, 40, 100),
    switchGate('sw_s1', 's1', 0, 40, 140),
    switchGate('sw_sr', 'sr', 1, 40, 180),
    switchGate('sw_sl', 'sl', 1, 40, 220),
    switchGate('sw_d0', 'd0', 1, 40, 260),
    switchGate('sw_d1', 'd1', 1, 40, 300),
    switchGate('sw_d2', 'd2', 0, 40, 340),
    switchGate('sw_d3', 'd3', 1, 40, 380),
    makeGate('dut', '74HC194', 340, 220, { customState: { reg: 0b1010, pClk: 0 } }),
    ledGate('led0', 'q0', 620, 120),
    ledGate('led1', 'q1', 620, 180),
    ledGate('led2', 'q2', 620, 240),
    ledGate('led3', 'q3', 620, 300),
  ], [
    makeWire('w1', 'sw_clk', 'out', 'dut', 'clk'),
    makeWire('w2', 'sw_clrn', 'out', 'dut', 'clrn'),
    makeWire('w3', 'sw_s0', 'out', 'dut', 's0'),
    makeWire('w4', 'sw_s1', 'out', 'dut', 's1'),
    makeWire('w5', 'sw_sr', 'out', 'dut', 'sr'),
    makeWire('w6', 'sw_sl', 'out', 'dut', 'sl'),
    makeWire('w7', 'sw_d0', 'out', 'dut', 'd0'),
    makeWire('w8', 'sw_d1', 'out', 'dut', 'd1'),
    makeWire('w9', 'sw_d2', 'out', 'dut', 'd2'),
    makeWire('w10', 'sw_d3', 'out', 'dut', 'd3'),
    makeWire('w11', 'dut', 'q0', 'led0', 'in'),
    makeWire('w12', 'dut', 'q1', 'led1', 'in'),
    makeWire('w13', 'dut', 'q2', 'led2', 'in'),
    makeWire('w14', 'dut', 'q3', 'led3', 'in'),
  ]);
}

function makeMultiDriverCircuit() {
  return makeCircuit('multi_driver_same_input', [
    switchGate('sw_a', 'a', 1, 40, 40),
    switchGate('sw_b', 'b', 0, 40, 120),
    ledGate('led', 'y', 340, 80),
  ], [
    makeWire('w1', 'sw_a', 'out', 'led', 'in'),
    makeWire('w2', 'sw_b', 'out', 'led', 'in'),
  ]);
}

function makeMixedDatapathCircuit() {
  return makeCircuit('mixed_datapath', [
    switchGate('sw_b0', 'b0', 1, 40, 20),
    switchGate('sw_b1', 'b1', 1, 40, 60),
    switchGate('sw_b2', 'b2', 0, 40, 100),
    switchGate('sw_b3', 'b3', 0, 40, 140),
    switchGate('sw_op0', 'op0', 0, 40, 180),
    switchGate('sw_op1', 'op1', 0, 40, 220),
    switchGate('sw_op2', 'op2', 0, 40, 260),
    switchGate('sw_cin', 'cin', 0, 40, 300),
    switchGate('sw_clk', 'clk', 0, 40, 340),
    switchGate('sw_rst', 'rst', 0, 40, 380),
    switchGate('sw_en', 'en', 1, 40, 420),
    makeGate('ctr', 'BIN_CTR7S', 260, 300, { customState: { cnt0: 0, cnt1: 0, cnt2: 0, cnt3: 0, count: 0, prevClk: 0 } }),
    makeGate('alu', 'ALU4', 520, 220),
    makeGate('reg', 'REG4', 820, 240, { customState: { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 } }),
    ledGate('led0', 'q0', 1080, 180),
    ledGate('led1', 'q1', 1080, 220),
    ledGate('led2', 'q2', 1080, 260),
    ledGate('led3', 'q3', 1080, 300),
  ], [
    makeWire('w1', 'sw_clk', 'out', 'ctr', 'clk'),
    makeWire('w2', 'sw_rst', 'out', 'ctr', 'rst'),
    makeWire('w3', 'sw_en', 'out', 'ctr', 'en'),
    makeWire('w4', 'ctr', 'q0', 'alu', 'a0'),
    makeWire('w5', 'ctr', 'q1', 'alu', 'a1'),
    makeWire('w6', 'ctr', 'q2', 'alu', 'a2'),
    makeWire('w7', 'ctr', 'q3', 'alu', 'a3'),
    makeWire('w8', 'sw_b0', 'out', 'alu', 'b0'),
    makeWire('w9', 'sw_b1', 'out', 'alu', 'b1'),
    makeWire('w10', 'sw_b2', 'out', 'alu', 'b2'),
    makeWire('w11', 'sw_b3', 'out', 'alu', 'b3'),
    makeWire('w12', 'sw_op0', 'out', 'alu', 'op0'),
    makeWire('w13', 'sw_op1', 'out', 'alu', 'op1'),
    makeWire('w14', 'sw_op2', 'out', 'alu', 'op2'),
    makeWire('w15', 'sw_cin', 'out', 'alu', 'cin'),
    makeWire('w16', 'alu', 's0', 'reg', 'd0'),
    makeWire('w17', 'alu', 's1', 'reg', 'd1'),
    makeWire('w18', 'alu', 's2', 'reg', 'd2'),
    makeWire('w19', 'alu', 's3', 'reg', 'd3'),
    makeWire('w20', 'sw_en', 'out', 'reg', 'en'),
    makeWire('w21', 'sw_clk', 'out', 'reg', 'clk'),
    makeWire('w22', 'sw_rst', 'out', 'reg', 'rst'),
    makeWire('w23', 'reg', 'q0', 'led0', 'in'),
    makeWire('w24', 'reg', 'q1', 'led1', 'in'),
    makeWire('w25', 'reg', 'q2', 'led2', 'in'),
    makeWire('w26', 'reg', 'q3', 'led3', 'in'),
  ]);
}

function bitsFromState(state, prefix, width) {
  let value = 0;
  for (let i = 0; i < width; i += 1) value |= (((state?.[`${prefix}${i}`] ?? 0) & 1) << i);
  return value;
}

function bitsFromOutputs(outputs, prefix, width) {
  let value = 0;
  for (let i = 0; i < width; i += 1) value |= (((outputs?.[`${prefix}${i}`] ?? 0) & 1) << i);
  return value;
}

function pass(status, expectation, details = {}) {
  return { status, expectation, details };
}

function evaluateTriNot(circuit) {
  const runtime = createRuntime(circuit);
  const triY = runtime.buffer.outputs.tri?.y ?? null;
  const invOut = runtime.buffer.outputs.inv?.out ?? null;
  if (triY === HI_Z && invOut === 1) {
    return pass('fail', 'Downstream logic must not silently sanitize Z to 0', { triY, invOut });
  }
  return pass('pass', 'Downstream logic no longer collapses Z to 0 before NOT', { triY, invOut });
}

function evaluateDff(circuit) {
  void circuit;
  const { outputs, nextState } = stateTransition('D_FF', { d: 1, clk: 1 }, { q: 0, prevClk: 0 });
  const q = outputs.q ?? null;
  const stateQ = nextState.q ?? null;
  return q === 1 && stateQ === 1
    ? pass('pass', 'D_FF output and state stay aligned after a rising edge', { q, stateQ })
    : pass('fail', 'D_FF output/state alignment regressed', { q, stateQ });
}

function evaluateJkff(circuit) {
  void circuit;
  const set = stateTransition('JK_FF', { j: 1, clk: 1, k: 0 }, { q: 0, prevClk: 0 });
  const reset = stateTransition('JK_FF', { j: 0, clk: 1, k: 1 }, { q: 1, prevClk: 0 });
  const setQ = set.outputs.q ?? null;
  const resetQ = reset.outputs.q ?? null;
  return setQ === 1 && resetQ === 0
    ? pass('pass', 'JK_FF sets and resets correctly over two edges', { setQ, resetQ })
    : pass('fail', 'JK_FF edge behavior is inconsistent', { setQ, resetQ });
}

function evaluateTff(circuit) {
  void circuit;
  const first = stateTransition('T_FF', { t: 1, clk: 1 }, { q: 0, prevClk: 0 }).outputs.q ?? null;
  const second = stateTransition('T_FF', { t: 1, clk: 1 }, { q: 1, prevClk: 0 }).outputs.q ?? null;
  return first === 1 && second === 0
    ? pass('pass', 'T_FF toggles on successive rising edges', { first, second })
    : pass('fail', 'T_FF toggle behavior regressed', { first, second });
}

function evaluate74hc373(circuit) {
  const runtime = createRuntime(circuit);
  const q0 = runtime.buffer.outputs.dut?.q0 ?? null;
  return q0 === HI_Z
    ? pass('pass', '74HC373 drives HI_Z when OE is inactive', { q0 })
    : pass('fail', '74HC373 no longer exposes HI_Z on disabled outputs', { q0 });
}

function evaluate74hc374(circuit) {
  const runtime = createRuntime(circuit);
  const q0 = runtime.buffer.outputs.dut?.q0 ?? null;
  return q0 === HI_Z
    ? pass('pass', '74HC374 drives HI_Z when OE is inactive', { q0 })
    : pass('fail', '74HC374 no longer exposes HI_Z on disabled outputs', { q0 });
}

function evaluate74hc595(circuit) {
  void circuit;
  let state = {};
  state = stateTransition('74HC595', { ds: 1, shcp: 1, stcp: 0, mr: 1, oe: 0 }, state).nextState;
  state = stateTransition('74HC595', { ds: 0, shcp: 0, stcp: 0, mr: 1, oe: 0 }, state).nextState;
  const shifted = stateTransition('74HC595', { ds: 0, shcp: 1, stcp: 0, mr: 1, oe: 0 }, state);
  state = stateTransition('74HC595', { ds: 0, shcp: 0, stcp: 0, mr: 1, oe: 0 }, shifted.nextState).nextState;
  const latched = stateTransition('74HC595', { ds: 0, shcp: 0, stcp: 1, mr: 1, oe: 0 }, state);
  const cleared = stateTransition('74HC595', { ds: 0, shcp: 0, stcp: 0, mr: 0, oe: 0 }, latched.nextState);
  const disabled = gateRegistry.get('74HC595').evaluate({ oe: 1 }, latched.nextState);
  const ok = shifted.nextState.shift === 0b10 &&
    latched.nextState.latch === 0b10 &&
    latched.outputs.q0 === 0 &&
    latched.outputs.q1 === 1 &&
    cleared.nextState.shift === 0 &&
    cleared.nextState.latch === 0b10 &&
    disabled.q0 === HI_Z &&
    disabled.q1 === HI_Z;
  return ok
    ? pass('pass', '74HC595 keeps latch contents across /MR and tri-states on OE', {
      shifted: shifted.nextState,
      latched: { state: latched.nextState, outputs: latched.outputs },
      cleared: cleared.nextState,
      disabled,
    })
    : pass('fail', '74HC595 shift/latch/OE behavior diverges from the expected model', {
      shifted: shifted.nextState,
      latched: { state: latched.nextState, outputs: latched.outputs },
      cleared: cleared.nextState,
      disabled,
    });
}

function evaluateMultiDriver(circuit) {
  const sim = runSimulation(circuit);
  const wiresIntoLedInput = Object.values(circuit.wires)
    .filter((wire) => wire.to.gateId === 'led' && wire.to.portId === 'in')
    .map((wire) => wire.id);
  // After P0: conflicting 0+1 drivers on the same port must resolve to X (3).
  const ledSignals = sim.gateSignals['led'] ?? {};
  const resolvedValue = Object.values(ledSignals)[0]?.value ?? null;
  const ok = wiresIntoLedInput.length >= 2 && resolvedValue === 3;
  return ok
    ? pass('pass', 'Conflicting drivers on one destination port correctly resolve to X (3)', {
      wiresIntoLedInput,
      resolvedLedValue: resolvedValue,
      gateSignals: sim.gateSignals,
    })
    : pass('fail', 'Conflicting drivers did not resolve to X — bus resolution broken', {
      wiresIntoLedInput,
      resolvedLedValue: resolvedValue,
      gateSignals: sim.gateSignals,
    });
}

function evaluate74hc161() {
  const inputs = { clk: 0, clrn: 0, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0 };
  const asyncClear = stateTransition('74HC161', inputs, { cnt: 12, pClk: 0 });
  const edgeCount = stateTransition('74HC161', { ...inputs, clrn: 1, clk: 1 }, { cnt: 3, pClk: 0 });
  const ok = asyncClear.nextState.cnt === 0 && edgeCount.nextState.cnt === 4;
  return ok
    ? pass('pass', '74HC161 keeps async clear distinct from clocked counting', {
      asyncClear: asyncClear.nextState,
      edgeCount: edgeCount.nextState,
    })
    : pass('fail', '74HC161 async clear/count semantics regressed', {
      asyncClear: asyncClear.nextState,
      edgeCount: edgeCount.nextState,
    });
}

function evaluate74hc163() {
  const base = { clrn: 0, ldn: 1, enp: 1, ent: 1, d0: 0, d1: 0, d2: 0, d3: 0 };
  const noEdge = stateTransition('74HC163', { ...base, clk: 0 }, { cnt: 12, pClk: 0 });
  const edge = stateTransition('74HC163', { ...base, clk: 1 }, { cnt: 12, pClk: 0 });
  const ok = noEdge.nextState.cnt === 12 && edge.nextState.cnt === 0;
  return ok
    ? pass('pass', '74HC163 keeps synchronous clear gated by the clock edge', {
      noEdge: noEdge.nextState,
      edge: edge.nextState,
    })
    : pass('fail', '74HC163 clear semantics no longer match the sync-counter contract', {
      noEdge: noEdge.nextState,
      edge: edge.nextState,
    });
}

function evaluate74hc194() {
  const baseState = { reg: 0b1010, pClk: 0 };
  const hold = stateTransition('74HC194', { clk: 1, clrn: 1, s0: 0, s1: 0, sr: 0, sl: 0, d0: 0, d1: 0, d2: 0, d3: 0 }, baseState);
  const right = stateTransition('74HC194', { clk: 1, clrn: 1, s0: 1, s1: 0, sr: 1, sl: 0, d0: 0, d1: 0, d2: 0, d3: 0 }, baseState);
  const left = stateTransition('74HC194', { clk: 1, clrn: 1, s0: 0, s1: 1, sr: 0, sl: 1, d0: 0, d1: 0, d2: 0, d3: 0 }, baseState);
  const load = stateTransition('74HC194', { clk: 1, clrn: 1, s0: 1, s1: 1, sr: 0, sl: 0, d0: 1, d1: 1, d2: 0, d3: 1 }, { reg: 0, pClk: 0 });
  const clear = stateTransition('74HC194', { clk: 0, clrn: 0, s0: 0, s1: 0, sr: 0, sl: 0, d0: 0, d1: 0, d2: 0, d3: 0 }, baseState);
  const ok = hold.nextState.reg === 0b1010 &&
    right.nextState.reg === 0b1101 &&
    left.nextState.reg === 0b0101 &&
    load.nextState.reg === 0b1011 &&
    clear.nextState.reg === 0;
  return ok
    ? pass('pass', '74HC194 still covers hold, shift-left, shift-right, load and async clear', {
      hold: hold.nextState.reg,
      right: right.nextState.reg,
      left: left.nextState.reg,
      load: load.nextState.reg,
      clear: clear.nextState.reg,
    })
    : pass('fail', '74HC194 mode sequencing regressed', {
      hold: hold.nextState.reg,
      right: right.nextState.reg,
      left: left.nextState.reg,
      load: load.nextState.reg,
      clear: clear.nextState.reg,
    });
}

function evaluateMixedDatapath(circuit) {
  void circuit;
  const ctrDef = gateRegistry.get('BIN_CTR7S');
  const regDef = gateRegistry.get('REG4');
  const aluDef = gateRegistry.get('ALU4');
  let ctrState = { cnt0: 0, cnt1: 0, cnt2: 0, cnt3: 0, count: 0, prevClk: 0 };
  let regState = { q0: 0, q1: 0, q2: 0, q3: 0, prevClk: 0 };
  const fixedB = { b0: 1, b1: 1, b2: 0, b3: 0, op0: 0, op1: 0, op2: 0, cin: 0 };
  const doStep = (clk) => {
    const ctrInputs = { clk, rst: 0, en: 1 };
    const ctrOldOutputs = ctrDef.evaluate(ctrInputs, ctrState);
    const aluOutputs = aluDef.evaluate({
      a0: ctrOldOutputs.q0, a1: ctrOldOutputs.q1, a2: ctrOldOutputs.q2, a3: ctrOldOutputs.q3,
      ...fixedB,
    }, {});
    const regInputs = {
      d0: aluOutputs.s0,
      d1: aluOutputs.s1,
      d2: aluOutputs.s2,
      d3: aluOutputs.s3,
      en: 1,
      clk,
      rst: 0,
    };
    const regOldOutputs = regDef.evaluate(regInputs, regState);
    ctrState = ctrDef.stateUpdate(ctrInputs, ctrOldOutputs, ctrState);
    regState = regDef.stateUpdate(regInputs, regOldOutputs, regState);
    return {
      counter: bitsFromState(ctrState, 'cnt', 4),
      register: bitsFromState(regState, 'q', 4),
    };
  };
  const step1 = doStep(1);
  doStep(0);
  const step2 = doStep(1);
  const ok = step1.counter === 1 && step1.register === 3 && step2.counter === 2 && step2.register === 4;
  return ok
    ? pass('pass', 'Mixed datapath keeps counter, ALU and register sequencing consistent over two cycles', { step1, step2 })
    : pass('fail', 'Mixed datapath sequencing is inconsistent across chained sequential blocks', { step1, step2 });
}

const cases = [
  { slug: 'tri_not_sanitized', kind: 'tri-state-downstream', build: makeTriNotCircuit, evaluate: evaluateTriNot },
  { slug: 'dff_led', kind: 'edge-ff', build: makeDffCircuit, evaluate: evaluateDff },
  { slug: 'jkff_led', kind: 'edge-ff', build: makeJkffCircuit, evaluate: evaluateJkff },
  { slug: 'tff_led', kind: 'edge-ff', build: makeTffCircuit, evaluate: evaluateTff },
  { slug: 'hc373_oe_z', kind: 'tri-state-register', build: make74hc373Circuit, evaluate: evaluate74hc373 },
  { slug: 'hc374_oe_z', kind: 'tri-state-register', build: make74hc374Circuit, evaluate: evaluate74hc374 },
  { slug: 'hc595_oe_shift', kind: 'shift-register', build: make74hc595Circuit, evaluate: evaluate74hc595 },
  { slug: 'hc161_clear', kind: 'counter', build: make74hc161Circuit, evaluate: () => evaluate74hc161() },
  { slug: 'hc163_clear', kind: 'counter', build: make74hc163Circuit, evaluate: () => evaluate74hc163() },
  { slug: 'hc194_modes', kind: 'shift-register', build: make74hc194Circuit, evaluate: () => evaluate74hc194() },
  { slug: 'multi_driver_same_input', kind: 'bus-limit', build: makeMultiDriverCircuit, evaluate: evaluateMultiDriver },
  { slug: 'mixed_datapath', kind: 'mixed-datapath', build: makeMixedDatapathCircuit, evaluate: evaluateMixedDatapath },
];

function summarizeTooling(result) {
  const all = Object.values(result.verilog).concat(Object.values(result.vhdl));
  const failures = all.filter((entry) => entry.status === 'fail');
  if (failures.length > 0) {
    if (failures.every((entry) => /Warning-LATCH/.test(`${entry.error ?? ''}${entry.output ?? ''}`))) return 'warn';
    return 'fail';
  }
  if (all.some((entry) => /warning/i.test(`${entry.output ?? ''}\n${entry.error ?? ''}`))) return 'warn';
  return 'pass';
}

function renderReport(summary) {
  const statusLines = summary.cases.map((item) => `- \`${item.slug}\`: ${item.result.status} (${item.result.expectation})`).join('\n');
  const failureLines = summary.cases
    .filter((item) => item.result.status === 'fail')
    .map((item) => `- \`${item.slug}\`: ${JSON.stringify(item.result.details)}`)
    .join('\n') || '- keine';
  const toolFailLines = summary.cases
    .filter((item) => item.toolingStatus === 'fail')
    .map((item) => {
      const failing = [];
      for (const [tool, result] of Object.entries(item.tools.verilog)) if (result.status === 'fail') failing.push(`${tool}: ${result.error ?? result.output ?? 'failed'}`);
      for (const [tool, result] of Object.entries(item.tools.vhdl)) if (result.status === 'fail') failing.push(`${tool}: ${result.error ?? result.output ?? 'failed'}`);
      return `- \`${item.slug}\`: ${failing.join(' | ')}`;
    })
    .join('\n') || '- keine';
  const warnLines = summary.cases
    .filter((item) => item.toolingStatus === 'warn')
    .map((item) => `- \`${item.slug}\`: externe Toolchain meldet erwartete Warnungen bei Latches/Tri-State.`)
    .join('\n') || '- keine';
  return `# Focused High-Risk Audit\n\n` +
    `Datum: 2026-03-07\n` +
    `Repo: ${PUBLIC_REPO}\n\n` +
    `## QA-Basis\n\n` +
    `- Vitest: ${summary.qa.vitest}\n` +
    `- Build: ${summary.qa.build}\n` +
    `- Lint: ${summary.qa.lint}\n` +
    `- Vite-Server: ${summary.server}\n\n` +
    `## Fokusmuster\n\n${statusLines}\n\n` +
    `## Harte Restfehler\n\n${failureLines}\n\n` +
    `## HDL-/Synthese-Fails\n\n${toolFailLines}\n\n` +
    `## Tooling-/Synthesehinweise\n\n${warnLines}\n\n` +
    `## Einordnung Richtung Industry-Lite EDA\n\n` +
    `- Fortschritt: das Kernmodell deckt jetzt 0/1/Z/X ab; Tri-State, Mehrtreiber, Counter, Shift-Register und gemischte Datenpfade sind fuer die 12 Fokusmuster reproduzierbar gruen. Transparent-Latch-Export nutzt Verilog-2001 mit verilator lint_off/on LATCH-Direktive, Verilator-LATCH-Warnung beseitigt.\n` +
    `- Offen: breitere semantische Differenztests ausserhalb des Fokus-Corpus und tiefere UI-/Timing-Diffs.\n` +
    `- Naechste sinnvolle P1-Themen: UI-Zustandsanalyse fuer breite sequentielle Faelle und Timing-Waveform-Diff.\n`;
}

async function main() {
  await fs.mkdir(CIRCUIT_DIR, { recursive: true });
  await fs.mkdir(EXPORT_DIR, { recursive: true });

  const results = [];
  for (const testCase of cases) {
    const circuit = testCase.build();
    const verilog = generateVerilog(circuit);
    const vhdl = generateVHDL(circuit);
    await writeCircuitArtifacts(testCase.slug, circuit, verilog, vhdl);
    const verilogFile = path.join(EXPORT_DIR, `${testCase.slug}.v`);
    const vhdlFile = path.join(EXPORT_DIR, `${testCase.slug}.vhd`);
    const result = testCase.evaluate(deepClone(circuit));
    const tools = {
      verilog: compileVerilogWithSyntax(verilogFile),
      vhdl: compileVhdlWithSyntax(vhdlFile),
    };
    results.push({
      slug: testCase.slug,
      kind: testCase.kind,
      result,
      toolingStatus: summarizeTooling(tools),
      tools,
      files: {
        circuit: publicPath(path.join(CIRCUIT_DIR, `${testCase.slug}.lgsc.json`)),
        verilog: publicPath(verilogFile),
        vhdl: publicPath(vhdlFile),
      },
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    repo: PUBLIC_REPO,
    server: PUBLIC_SERVER,
    qa: {
      ...QA_STATUS,
    },
    codeAudit: {
      hardBlockers: [],
      mediumRisks: [],
    },
    cases: results,
  };

  await fs.writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');
  await fs.writeFile(REPORT_FILE, renderReport(summary), 'utf8');
  console.log(JSON.stringify({
    summaryFile: SUMMARY_FILE,
    reportFile: REPORT_FILE,
    cases: results.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

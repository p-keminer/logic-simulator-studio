import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import 'file://<repo-root>/src/core/registry/index.ts';
import { gateRegistry } from 'file://<repo-root>/src/core/registry/GateRegistry.ts';
import { HI_Z } from 'file://<repo-root>/src/core/types.ts';
import { runSimulation } from 'file://<repo-root>/src/core/simulation/engine.ts';
import {
  buildWireMap,
  initBuffer,
  runOneTick,
  runUntilStable,
} from 'file://<repo-root>/src/core/simulation/tickEngine.ts';
import { generateVerilog } from 'file://<repo-root>/src/core/io/verilog.ts';
import { generateVHDL } from 'file://<repo-root>/src/core/io/vhdl.ts';
import { serializeCircuit } from 'file://<repo-root>/src/core/io/serializer.ts';

const ROOT = '<repo-root>';
const OUT_DIR = path.join(ROOT, 'validation');
const CIRCUIT_DIR = path.join(OUT_DIR, 'generated-circuits-current');
const EXPORT_DIR = path.join(OUT_DIR, 'generated-exports-current');
const SUMMARY_FILE = path.join(OUT_DIR, 'fix-verification-summary.json');
const defaultSignal = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(id, typeId, x, y, opts = {}) {
  const outputSignals = opts.outputSignals ?? {};
  return {
    id,
    typeId,
    x,
    y,
    label: opts.label,
    customState: opts.customState ?? {},
    outputSignals,
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
    gates: Object.fromEntries(gates.map((g) => [g.id, g])),
    wires: Object.fromEntries(wires.map((w) => [w.id, w])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-07', updatedAt: '2026-03-07' },
  };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function applySwitchValue(circuit, gateId, value) {
  circuit.gates[gateId].customState = {
    ...(circuit.gates[gateId].customState ?? {}),
    value,
  };
}

function stabilize(circuit) {
  const wm = buildWireMap(circuit);
  return runUntilStable(circuit, initBuffer(circuit), wm).buffer;
}

function tickOnce(circuit) {
  const wm = buildWireMap(circuit);
  return runOneTick(circuit, initBuffer(circuit), wm, true);
}

function stabilizedThenTick(circuit) {
  const wm = buildWireMap(circuit);
  const settled = runUntilStable(circuit, initBuffer(circuit), wm).buffer;
  return runOneTick(circuit, settled, wm, true);
}

function writeCircuitArtifacts(slug, circuit, verilog, vhdl) {
  return Promise.all([
    fs.writeFile(path.join(CIRCUIT_DIR, `${slug}.lgsc.json`), serializeCircuit(circuit), 'utf8'),
    fs.writeFile(path.join(EXPORT_DIR, `${slug}.v`), verilog, 'utf8'),
    fs.writeFile(path.join(EXPORT_DIR, `${slug}.vhd`), vhdl, 'utf8'),
  ]);
}

function toolResult(name, fn) {
  try {
    const output = fn();
    return { status: 'pass', output: String(output ?? '').trim() };
  } catch (error) {
    return {
      status: 'fail',
      output: String(error.stdout ?? ''),
      error: String(error.stderr ?? error.message ?? error),
    };
  }
}

function compileVerilogWithSyntax(file) {
  return {
    iverilog: toolResult('iverilog', () =>
      execFileSync('iverilog', ['-g2012', '-t', 'null', file], { encoding: 'utf8' })),
    verilator: toolResult('verilator', () =>
      execFileSync('verilator', ['--lint-only', file], { encoding: 'utf8' })),
    yosys: toolResult('yosys', () =>
      execFileSync('yosys', ['-q', '-p', `read_verilog ${file}; proc; opt; stat`], { encoding: 'utf8' })),
  };
}

function compileVhdlWithSyntax(file) {
  return {
    ghdl: toolResult('ghdl', () =>
      execFileSync('ghdl', ['-a', '--std=08', file], { encoding: 'utf8', cwd: EXPORT_DIR })),
  };
}

function compileTestbench(tool, files, tbFile, top) {
  if (tool === 'iverilog') {
    return toolResult('iverilog-run', () =>
      execFileSync('iverilog', ['-g2012', '-o', `${tbFile}.out`, ...files, tbFile], { encoding: 'utf8', cwd: EXPORT_DIR }));
  }
  if (tool === 'vvp') {
    return toolResult('vvp', () =>
      execFileSync('vvp', [`${tbFile}.out`], { encoding: 'utf8', cwd: EXPORT_DIR }));
  }
  if (tool === 'ghdl-analyze') {
    return toolResult('ghdl-analyze', () =>
      execFileSync('ghdl', ['-a', '--std=08', ...files, tbFile], { encoding: 'utf8', cwd: EXPORT_DIR }));
  }
  if (tool === 'ghdl-elab') {
    return toolResult('ghdl-elab', () =>
      execFileSync('ghdl', ['-e', '--std=08', top], { encoding: 'utf8', cwd: EXPORT_DIR }));
  }
  if (tool === 'ghdl-run') {
    return toolResult('ghdl-run', () =>
      execFileSync('ghdl', ['-r', '--std=08', top, '--stop-time=2ns'], { encoding: 'utf8', cwd: EXPORT_DIR }));
  }
  throw new Error(`unknown tool ${tool}`);
}

function makeTriLedCircuit() {
  return makeCircuit('tri_led_z', [
    makeGate('sw_a', 'INPUT_SWITCH', 40, 40, { label: 'a', customState: { value: 1 } }),
    makeGate('sw_oe', 'INPUT_SWITCH', 40, 120, { label: 'oe', customState: { value: 1 } }),
    makeGate('tri', 'TRIBUF', 280, 80),
    makeGate('led', 'OUTPUT_LED', 520, 80, { label: 'y' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'tri', 'a'),
    makeWire('w2', 'sw_oe', 'out', 'tri', 'oe'),
    makeWire('w3', 'tri', 'y', 'led', 'in'),
  ]);
}

function makeTriNotCircuit() {
  return makeCircuit('tri_not_sanitized', [
    makeGate('sw_a', 'INPUT_SWITCH', 40, 40, { label: 'a', customState: { value: 1 } }),
    makeGate('sw_oe', 'INPUT_SWITCH', 40, 120, { label: 'oe', customState: { value: 1 } }),
    makeGate('tri', 'TRIBUF', 260, 80),
    makeGate('inv', 'NOT', 420, 80),
    makeGate('led', 'OUTPUT_LED', 580, 80, { label: 'y' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'tri', 'a'),
    makeWire('w2', 'sw_oe', 'out', 'tri', 'oe'),
    makeWire('w3', 'tri', 'y', 'inv', 'a'),
    makeWire('w4', 'inv', 'out', 'led', 'in'),
  ]);
}

function makeDffCircuit() {
  return makeCircuit('dff_led', [
    makeGate('sw_d', 'INPUT_SWITCH', 40, 40, { label: 'd', customState: { value: 1 } }),
    makeGate('sw_clk', 'INPUT_SWITCH', 40, 120, { label: 'clk', customState: { value: 1 } }),
    makeGate('dff', 'D_FF', 300, 80, { customState: { q: 0, prevClk: 0 } }),
    makeGate('led', 'OUTPUT_LED', 540, 80, { label: 'q' }),
  ], [
    makeWire('w1', 'sw_d', 'out', 'dff', 'd'),
    makeWire('w2', 'sw_clk', 'out', 'dff', 'clk'),
    makeWire('w3', 'dff', 'q', 'led', 'in'),
  ]);
}

function make74hc373Circuit() {
  return makeCircuit('hc373_oe_z', [
    makeGate('sw_oe', 'INPUT_SWITCH', 40, 20, { label: 'oe', customState: { value: 1 } }),
    makeGate('sw_le', 'INPUT_SWITCH', 40, 60, { label: 'le', customState: { value: 0 } }),
    makeGate('sw_d0', 'INPUT_SWITCH', 40, 100, { label: 'd0', customState: { value: 1 } }),
    makeGate('sw_d1', 'INPUT_SWITCH', 40, 140, { label: 'd1', customState: { value: 0 } }),
    makeGate('sw_d2', 'INPUT_SWITCH', 40, 180, { label: 'd2', customState: { value: 1 } }),
    makeGate('sw_d3', 'INPUT_SWITCH', 40, 220, { label: 'd3', customState: { value: 0 } }),
    makeGate('sw_d4', 'INPUT_SWITCH', 40, 260, { label: 'd4', customState: { value: 1 } }),
    makeGate('sw_d5', 'INPUT_SWITCH', 40, 300, { label: 'd5', customState: { value: 0 } }),
    makeGate('sw_d6', 'INPUT_SWITCH', 40, 340, { label: 'd6', customState: { value: 1 } }),
    makeGate('sw_d7', 'INPUT_SWITCH', 40, 380, { label: 'd7', customState: { value: 0 } }),
    makeGate('dut', '74HC373', 360, 200, {
      customState: { latch: 0x55, q0: 1, q1: 0, q2: 1, q3: 0, q4: 1, q5: 0, q6: 1, q7: 0 },
    }),
    makeGate('led', 'OUTPUT_LED', 660, 100, { label: 'q0' }),
  ], [
    makeWire('w1', 'sw_oe', 'out', 'dut', 'oe'),
    makeWire('w2', 'sw_le', 'out', 'dut', 'le'),
    makeWire('w3', 'sw_d0', 'out', 'dut', 'd0'),
    makeWire('w4', 'sw_d1', 'out', 'dut', 'd1'),
    makeWire('w5', 'sw_d2', 'out', 'dut', 'd2'),
    makeWire('w6', 'sw_d3', 'out', 'dut', 'd3'),
    makeWire('w7', 'sw_d4', 'out', 'dut', 'd4'),
    makeWire('w8', 'sw_d5', 'out', 'dut', 'd5'),
    makeWire('w9', 'sw_d6', 'out', 'dut', 'd6'),
    makeWire('w10', 'sw_d7', 'out', 'dut', 'd7'),
    makeWire('w11', 'dut', 'q0', 'led', 'in'),
  ]);
}

function make74hc374Circuit() {
  return makeCircuit('hc374_oe_z', [
    makeGate('sw_oe', 'INPUT_SWITCH', 40, 20, { label: 'oe', customState: { value: 1 } }),
    makeGate('sw_clk', 'INPUT_SWITCH', 40, 60, { label: 'clk', customState: { value: 0 } }),
    makeGate('sw_d0', 'INPUT_SWITCH', 40, 100, { label: 'd0', customState: { value: 1 } }),
    makeGate('sw_d1', 'INPUT_SWITCH', 40, 140, { label: 'd1', customState: { value: 1 } }),
    makeGate('sw_d2', 'INPUT_SWITCH', 40, 180, { label: 'd2', customState: { value: 0 } }),
    makeGate('sw_d3', 'INPUT_SWITCH', 40, 220, { label: 'd3', customState: { value: 0 } }),
    makeGate('sw_d4', 'INPUT_SWITCH', 40, 260, { label: 'd4', customState: { value: 1 } }),
    makeGate('sw_d5', 'INPUT_SWITCH', 40, 300, { label: 'd5', customState: { value: 1 } }),
    makeGate('sw_d6', 'INPUT_SWITCH', 40, 340, { label: 'd6', customState: { value: 0 } }),
    makeGate('sw_d7', 'INPUT_SWITCH', 40, 380, { label: 'd7', customState: { value: 0 } }),
    makeGate('dut', '74HC374', 360, 200, {
      customState: { reg: 0x33, pClk: 1, q0: 1, q1: 1, q2: 0, q3: 0, q4: 1, q5: 1, q6: 0, q7: 0 },
    }),
    makeGate('led', 'OUTPUT_LED', 660, 100, { label: 'q0' }),
  ], [
    makeWire('w1', 'sw_oe', 'out', 'dut', 'oe'),
    makeWire('w2', 'sw_clk', 'out', 'dut', 'clk'),
    makeWire('w3', 'sw_d0', 'out', 'dut', 'd0'),
    makeWire('w4', 'sw_d1', 'out', 'dut', 'd1'),
    makeWire('w5', 'sw_d2', 'out', 'dut', 'd2'),
    makeWire('w6', 'sw_d3', 'out', 'dut', 'd3'),
    makeWire('w7', 'sw_d4', 'out', 'dut', 'd4'),
    makeWire('w8', 'sw_d5', 'out', 'dut', 'd5'),
    makeWire('w9', 'sw_d6', 'out', 'dut', 'd6'),
    makeWire('w10', 'sw_d7', 'out', 'dut', 'd7'),
    makeWire('w11', 'dut', 'q0', 'led', 'in'),
  ]);
}

function makeMultiDriverCircuit() {
  return makeCircuit('multi_driver_same_input', [
    makeGate('sw_a', 'INPUT_SWITCH', 40, 40, { label: 'a', customState: { value: 1 } }),
    makeGate('sw_b', 'INPUT_SWITCH', 40, 120, { label: 'b', customState: { value: 0 } }),
    makeGate('led', 'OUTPUT_LED', 340, 80, { label: 'y' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'led', 'in'),
    makeWire('w2', 'sw_b', 'out', 'led', 'in'),
  ]);
}

const cases = [
  {
    slug: 'tri_led_z',
    kind: 'tri-state-direct',
    build: makeTriLedCircuit,
    evaluate(circuit) {
      const sim = stabilize(circuit);
      return {
        pass: sim.outputs.tri?.y === HI_Z,
        simulator: { triY: sim.outputs.tri?.y ?? null, ledSource: sim.outputs.tri?.y ?? null },
        expectation: 'TRIBUF direct output should be HI_Z when OE=1',
      };
    },
  },
  {
    slug: 'tri_not_sanitized',
    kind: 'tri-state-downstream',
    build: makeTriNotCircuit,
    evaluate(circuit) {
      const sim = stabilize(circuit);
      return {
        pass: sim.outputs.tri?.y === HI_Z && sim.outputs.inv?.out === 1,
        simulator: { triY: sim.outputs.tri?.y ?? null, invOut: sim.outputs.inv?.out ?? null },
        expectation: 'Current model sanitizes Z to 0 before NOT, so output becomes 1',
      };
    },
  },
  {
    slug: 'dff_led',
    kind: 'sequential-core',
    build: makeDffCircuit,
    evaluate(circuit) {
      const sim = stabilizedThenTick(circuit);
      return {
        pass: sim.customStates.dff?.q === 1 && sim.outputs.dff?.q === 1,
        simulator: {
          nextStateQ: sim.customStates.dff?.q ?? null,
          rawTickOutputQ: sim.outputs.dff?.q ?? null,
        },
        expectation: 'After settle plus one tick, D_FF exposes the captured state consistently in customState and output',
      };
    },
  },
  {
    slug: 'hc373_oe_z',
    kind: 'sequential-tri-state',
    build: make74hc373Circuit,
    evaluate(circuit) {
      const sim = stabilize(circuit);
      return {
        pass: sim.outputs.dut?.q0 === HI_Z,
        simulator: { q0: sim.outputs.dut?.q0 ?? null },
        expectation: '74HC373 q0 should be HI_Z when OE=1',
      };
    },
  },
  {
    slug: 'hc374_oe_z',
    kind: 'sequential-tri-state',
    build: make74hc374Circuit,
    evaluate(circuit) {
      const sim = stabilize(circuit);
      return {
        pass: sim.outputs.dut?.q0 === HI_Z,
        simulator: { q0: sim.outputs.dut?.q0 ?? null },
        expectation: '74HC374 q0 should be HI_Z when OE=1',
      };
    },
  },
  {
    slug: 'multi_driver_same_input',
    kind: 'architecture-limit',
    build: makeMultiDriverCircuit,
    evaluate(circuit) {
      const sim = runSimulation(circuit);
      const ledWire = Object.values(circuit.wires).find((w) => w.to.gateId === 'led' && w.to.portId === 'in');
      const inputWireMap = new Map();
      for (const wire of Object.values(circuit.wires)) inputWireMap.set(`${wire.to.gateId}:${wire.to.portId}`, wire.id);
      return {
        pass: false,
        simulator: {
          wiresIntoLedInput: Object.values(circuit.wires).filter((w) => w.to.gateId === 'led' && w.to.portId === 'in').map((w) => w.id),
          survivingWireInMap: inputWireMap.get('led:in'),
          ledValue: ledWire ? (sim.gateSignals[ledWire.from.gateId]?.[ledWire.from.portId]?.value ?? null) : null,
        },
        expectation: 'Only one upstream wire survives for a single destination input; true multi-driver nets are not modeled',
      };
    },
  },
];

function writeTb(file, content) {
  return fs.writeFile(path.join(EXPORT_DIR, file), content, 'utf8');
}

async function differentialChecks() {
  const verilogTriLedTb = `module tb;\n  reg a = 1'b1;\n  reg oe = 1'b1;\n  wire w_0;\n  tri_led_z dut(.a(a), .oe(oe), .w_0(w_0));\n  initial begin\n    #1;\n    $display("Y=%b", w_0);\n    $finish;\n  end\nendmodule\n`;
  const verilogTriNotTb = `module tb;\n  reg a = 1'b1;\n  reg oe = 1'b1;\n  wire w_1;\n  tri_not_sanitized dut(.a(a), .oe(oe), .w_1(w_1));\n  initial begin\n    #1;\n    $display("Y=%b", w_1);\n    $finish;\n  end\nendmodule\n`;
  const vhdlTriLedTb = `library ieee;\nuse ieee.std_logic_1164.all;\nentity tb_tri_led_z is end;\narchitecture sim of tb_tri_led_z is\n  signal a   : std_logic := '1';\n  signal oe  : std_logic := '1';\n  signal w_0 : std_logic;\nbegin\n  dut: entity work.tri_led_z port map (a => a, oe => oe, w_0 => w_0);\n  process\n  begin\n    wait for 1 ns;\n    report "Y=" & std_logic'image(w_0);\n    wait;\n  end process;\nend sim;\n`;
  const vhdlTriNotTb = `library ieee;\nuse ieee.std_logic_1164.all;\nentity tb_tri_not_sanitized is end;\narchitecture sim of tb_tri_not_sanitized is\n  signal a   : std_logic := '1';\n  signal oe  : std_logic := '1';\n  signal w_1 : std_logic;\nbegin\n  dut: entity work.tri_not_sanitized port map (a => a, oe => oe, w_1 => w_1);\n  process\n  begin\n    wait for 1 ns;\n    report "Y=" & std_logic'image(w_1);\n    wait;\n  end process;\nend sim;\n`;

  await writeTb('tb_tri_led_z.v', verilogTriLedTb);
  await writeTb('tb_tri_not_sanitized.v', verilogTriNotTb);
  await writeTb('tb_tri_led_z.vhd', vhdlTriLedTb);
  await writeTb('tb_tri_not_sanitized.vhd', vhdlTriNotTb);

  const verilogTriLed = compileTestbench(
    'iverilog',
    ['tri_led_z.v'],
    'tb_tri_led_z.v',
    'tb',
  );
  const verilogTriLedRun = verilogTriLed.status === 'pass'
    ? compileTestbench('vvp', [], 'tb_tri_led_z.v', 'tb')
    : { status: 'fail', skipped: true };

  const verilogTriNot = compileTestbench(
    'iverilog',
    ['tri_not_sanitized.v'],
    'tb_tri_not_sanitized.v',
    'tb',
  );
  const verilogTriNotRun = verilogTriNot.status === 'pass'
    ? compileTestbench('vvp', [], 'tb_tri_not_sanitized.v', 'tb')
    : { status: 'fail', skipped: true };

  const vhdlTriLedAnalyze = compileTestbench(
    'ghdl-analyze',
    ['tri_led_z.vhd'],
    'tb_tri_led_z.vhd',
    'tb_tri_led_z',
  );
  const vhdlTriLedElab = vhdlTriLedAnalyze.status === 'pass'
    ? compileTestbench('ghdl-elab', [], 'tb_tri_led_z.vhd', 'tb_tri_led_z')
    : { status: 'fail', skipped: true };
  const vhdlTriLedRun = vhdlTriLedElab.status === 'pass'
    ? compileTestbench('ghdl-run', [], 'tb_tri_led_z.vhd', 'tb_tri_led_z')
    : { status: 'fail', skipped: true };

  const vhdlTriNotAnalyze = compileTestbench(
    'ghdl-analyze',
    ['tri_not_sanitized.vhd'],
    'tb_tri_not_sanitized.vhd',
    'tb_tri_not_sanitized',
  );
  const vhdlTriNotElab = vhdlTriNotAnalyze.status === 'pass'
    ? compileTestbench('ghdl-elab', [], 'tb_tri_not_sanitized.vhd', 'tb_tri_not_sanitized')
    : { status: 'fail', skipped: true };
  const vhdlTriNotRun = vhdlTriNotElab.status === 'pass'
    ? compileTestbench('ghdl-run', [], 'tb_tri_not_sanitized.vhd', 'tb_tri_not_sanitized')
    : { status: 'fail', skipped: true };

  return {
    triLed: {
      simulator: { triY: 2 },
      verilog: { compile: verilogTriLed, run: verilogTriLedRun },
      vhdl: { analyze: vhdlTriLedAnalyze, elaborate: vhdlTriLedElab, run: vhdlTriLedRun },
    },
    triNot: {
      simulator: { triY: 2, notOut: 1 },
      verilog: { compile: verilogTriNot, run: verilogTriNotRun },
      vhdl: { analyze: vhdlTriNotAnalyze, elaborate: vhdlTriNotElab, run: vhdlTriNotRun },
    },
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(CIRCUIT_DIR, { recursive: true });
  await fs.mkdir(EXPORT_DIR, { recursive: true });

  const circuitResults = [];
  for (const testCase of cases) {
    const circuit = testCase.build();
    const verilog = generateVerilog(circuit);
    const vhdl = generateVHDL(circuit);
    await writeCircuitArtifacts(testCase.slug, circuit, verilog, vhdl);
    const verilogFile = path.join(EXPORT_DIR, `${testCase.slug}.v`);
    const vhdlFile = path.join(EXPORT_DIR, `${testCase.slug}.vhd`);
    circuitResults.push({
      slug: testCase.slug,
      kind: testCase.kind,
      internal: testCase.evaluate(deepClone(circuit)),
      tools: {
        verilog: compileVerilogWithSyntax(verilogFile),
        vhdl: compileVhdlWithSyntax(vhdlFile),
      },
      files: {
        circuit: path.join(CIRCUIT_DIR, `${testCase.slug}.lgsc.json`),
        verilog: verilogFile,
        vhdl: vhdlFile,
      },
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    repo: ROOT,
    fixClaims: {
      signalValueIncludesHiZ: true,
      hiZConstant: HI_Z,
      triStateGates: ['TRIBUF', '74HC595', '74HC373', '74HC374'],
      downstreamSanitizationToZero: true,
    },
    circuitResults,
    differentialChecks: await differentialChecks(),
    codeAudit: {
      gaps: [
        {
          id: 'no-x-value',
          status: 'fail',
          message: 'Signal model is 0|1|2 only; there is no X/unknown conflict value.',
          file: '<repo-root>/src/core/types.ts',
          line: 5,
        },
        {
          id: 'single-driver-input-map',
          status: 'fail',
          message: 'Destination inputs are mapped one-to-one, so multiple drivers on one net are structurally collapsed.',
          files: [
            { file: '<repo-root>/src/core/simulation/tickEngine.ts', line: 153 },
            { file: '<repo-root>/src/core/simulation/engine.ts', line: 23 },
            { file: '<repo-root>/src/core/io/verilog.ts', line: 71 },
            { file: '<repo-root>/src/core/io/vhdl.ts', line: 73 },
          ],
        },
        {
          id: 'event-conflict-collapses-to-zero',
          status: 'fail',
          message: 'When the event scheduler sees conflicting driver values it resolves to 0 rather than X.',
          file: '<repo-root>/src/core/simulation/eventScheduler.ts',
          line: 308,
        },
        {
          id: 'custom-ic-no-hdl-export',
          status: 'warn',
          message: 'Hierarchy/custom ICs exist for simulation but registerCustomIC does not define toVerilog/toVHDL, so HDL export is not first-class for hierarchical designs.',
          file: '<repo-root>/src/components/panels/CustomICModal.tsx',
          line: 69,
        },
      ],
    },
  };

  await fs.writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({
    summaryFile: SUMMARY_FILE,
    circuits: circuitResults.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

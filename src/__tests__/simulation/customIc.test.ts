import { describe, expect, it } from 'vitest';

import '../../core/registry/index';

import { registerCustomIC } from '../../core/customIc/registerCustomIC';
import { flattenCustomICs } from '../../core/io/flattenCustomIC';
import { generateVerilog } from '../../core/io/verilog';
import { generateVHDL } from '../../core/io/vhdl';
import { runSimulation } from '../../core/simulation/engine';
import { HI_Z } from '../../core/types';
import type { Circuit, GateInstance, SignalState, Wire } from '../../core/types';

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

function makeGate(
  id: string,
  typeId: string,
  opts?: { customState?: Record<string, unknown>; label?: string },
): GateInstance {
  return {
    id,
    typeId,
    x: 0,
    y: 0,
    outputSignals: {},
    customState: opts?.customState ?? {},
    isSelected: false,
    label: opts?.label,
  };
}

function makeWire(
  id: string,
  fromGate: string,
  fromPort: string,
  toGate: string,
  toPort: string,
): Wire {
  return {
    id,
    from: { gateId: fromGate, portId: fromPort },
    to: { gateId: toGate, portId: toPort },
    signal: { ...defaultSignal },
    waypoints: [],
    isSelected: false,
  };
}

function makeCircuit(name: string, gates: GateInstance[], wires: Wire[]): Circuit {
  return {
    id: `${name}-id`,
    name,
    version: '1.0.0',
    gates: Object.fromEntries(gates.map((gate) => [gate.id, gate])),
    wires: Object.fromEntries(wires.map((wire) => [wire.id, wire])),
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-03-19', updatedAt: '2026-03-19' },
  };
}

function makeHalfAdderSubcircuit(): Circuit {
  return makeCircuit('half_adder_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
    makeGate('xor1', 'XOR'),
    makeGate('and1', 'AND'),
    makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
    makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'xor1', 'a'),
    makeWire('w2', 'sw_b', 'out', 'xor1', 'b'),
    makeWire('w3', 'xor1', 'out', 'led_sum', 'in'),
    makeWire('w4', 'sw_a', 'out', 'and1', 'a'),
    makeWire('w5', 'sw_b', 'out', 'and1', 'b'),
    makeWire('w6', 'and1', 'out', 'led_carry', 'in'),
  ]);
}

function makeCustomTopLevel(a: 0 | 1, b: 0 | 1): Circuit {
  return makeCircuit('custom_half_adder_top', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: a }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: b }, label: 'b' }),
    makeGate('ha', 'CIC_TEST_HALF_ADDER'),
    makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
    makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'ha', 'i0'),
    makeWire('w2', 'sw_b', 'out', 'ha', 'i1'),
    makeWire('w3', 'ha', 'o0', 'led_sum', 'in'),
    makeWire('w4', 'ha', 'o1', 'led_carry', 'in'),
  ]);
}

function makeGoldenCustomTopLevel(a: 0 | 1, b: 0 | 1): Circuit {
  return makeCircuit('golden_custom_half_adder_top', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: a }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: b }, label: 'b' }),
    makeGate('ha', 'CIC_HALF_ADDER'),
    makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
    makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'ha', 'i0'),
    makeWire('w2', 'sw_b', 'out', 'ha', 'i1'),
    makeWire('w3', 'ha', 'o0', 'led_sum', 'in'),
    makeWire('w4', 'ha', 'o1', 'led_carry', 'in'),
  ]);
}

function makePassthroughSubcircuit(): Circuit {
  return makeCircuit('passthrough_sub', [
    makeGate('sw_in', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'in' }),
    makeGate('led_out', 'OUTPUT_LED', { label: 'out' }),
  ], [
    makeWire('w1', 'sw_in', 'out', 'led_out', 'in'),
  ]);
}

function makePassthroughTopLevel(value: 0 | 1): Circuit {
  return makeCircuit('passthrough_top', [
    makeGate('src', 'INPUT_SWITCH', { customState: { value }, label: 'src' }),
    makeGate('buf', 'CIC_TEST_PASSTHROUGH'),
    makeGate('inv', 'NOT'),
    makeGate('sink', 'OUTPUT_LED', { label: 'sink' }),
  ], [
    makeWire('w1', 'src', 'out', 'buf', 'i0'),
    makeWire('w2', 'buf', 'o0', 'inv', 'in'),
    makeWire('w3', 'inv', 'out', 'sink', 'in'),
  ]);
}

function makeTriBufSubcircuit(): Circuit {
  return makeCircuit('tribuf_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_oe', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'oe' }),
    makeGate('tri', 'TRIBUF'),
    makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'tri', 'a'),
    makeWire('w2', 'sw_oe', 'out', 'tri', 'oe'),
    makeWire('w3', 'tri', 'y', 'led_y', 'in'),
  ]);
}

function makeTriBufTopLevel(a: 0 | 1, oe: 0 | 1): Circuit {
  return makeCircuit('tribuf_top', [
    makeGate('src_a', 'INPUT_SWITCH', { customState: { value: a }, label: 'a' }),
    makeGate('src_oe', 'INPUT_SWITCH', { customState: { value: oe }, label: 'oe' }),
    makeGate('wrap', 'CIC_TEST_TRIBUF'),
    makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
  ], [
    makeWire('w1', 'src_a', 'out', 'wrap', 'i0'),
    makeWire('w2', 'src_oe', 'out', 'wrap', 'i1'),
    makeWire('w3', 'wrap', 'o0', 'led_y', 'in'),
  ]);
}

function makeBrokenOutputSubcircuit(): Circuit {
  return makeCircuit('broken_output_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('not1', 'NOT'),
    makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'not1', 'a'),
  ]);
}

function makeBrokenOutputTopLevel(value: 0 | 1): Circuit {
  return makeCircuit('broken_output_top', [
    makeGate('src_a', 'INPUT_SWITCH', { customState: { value }, label: 'a' }),
    makeGate('wrap', 'CIC_TEST_BROKEN_OUTPUT'),
    makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
  ], [
    makeWire('w1', 'src_a', 'out', 'wrap', 'i0'),
    makeWire('w2', 'wrap', 'o0', 'led_y', 'in'),
  ]);
}

function makeNestedHalfAdderSubcircuit(): Circuit {
  return makeCircuit('nested_half_adder_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
    makeGate('ha', 'CIC_TEST_HALF_ADDER'),
    makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
    makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'ha', 'i0'),
    makeWire('w2', 'sw_b', 'out', 'ha', 'i1'),
    makeWire('w3', 'ha', 'o0', 'led_sum', 'in'),
    makeWire('w4', 'ha', 'o1', 'led_carry', 'in'),
  ]);
}

function makeNestedHalfAdderTopLevel(a: 0 | 1, b: 0 | 1): Circuit {
  return makeCircuit('nested_half_adder_top', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: a }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: b }, label: 'b' }),
    makeGate('parent', 'CIC_TEST_PARENT_HALF_ADDER'),
    makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
    makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'parent', 'i0'),
    makeWire('w2', 'sw_b', 'out', 'parent', 'i1'),
    makeWire('w3', 'parent', 'o0', 'led_sum', 'in'),
    makeWire('w4', 'parent', 'o1', 'led_carry', 'in'),
  ]);
}

function makeNestedHc194Subcircuit(): Circuit {
  return makeCircuit('nested_hc194_sub', [
    makeGate('sw_clk', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'clk' }),
    makeGate('sw_clrn', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'clrn' }),
    makeGate('sw_s0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 's0' }),
    makeGate('sw_s1', 'INPUT_SWITCH', { customState: { value: 0 }, label: 's1' }),
    makeGate('sw_sr', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sr' }),
    makeGate('sw_sl', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sl' }),
    makeGate('sw_d0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd0' }),
    makeGate('sw_d1', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd1' }),
    makeGate('sw_d2', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd2' }),
    makeGate('sw_d3', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd3' }),
    makeGate('wrap', 'CIC_TEST_HC194'),
    makeGate('led_q0', 'OUTPUT_LED', { label: 'q0' }),
    makeGate('led_q1', 'OUTPUT_LED', { label: 'q1' }),
    makeGate('led_q2', 'OUTPUT_LED', { label: 'q2' }),
    makeGate('led_q3', 'OUTPUT_LED', { label: 'q3' }),
  ], [
    makeWire('w1', 'sw_clk', 'out', 'wrap', 'i0'),
    makeWire('w2', 'sw_clrn', 'out', 'wrap', 'i1'),
    makeWire('w3', 'sw_s0', 'out', 'wrap', 'i2'),
    makeWire('w4', 'sw_s1', 'out', 'wrap', 'i3'),
    makeWire('w5', 'sw_sr', 'out', 'wrap', 'i4'),
    makeWire('w6', 'sw_sl', 'out', 'wrap', 'i5'),
    makeWire('w7', 'sw_d0', 'out', 'wrap', 'i6'),
    makeWire('w8', 'sw_d1', 'out', 'wrap', 'i7'),
    makeWire('w9', 'sw_d2', 'out', 'wrap', 'i8'),
    makeWire('w10', 'sw_d3', 'out', 'wrap', 'i9'),
    makeWire('w11', 'wrap', 'o0', 'led_q0', 'in'),
    makeWire('w12', 'wrap', 'o1', 'led_q1', 'in'),
    makeWire('w13', 'wrap', 'o2', 'led_q2', 'in'),
    makeWire('w14', 'wrap', 'o3', 'led_q3', 'in'),
  ]);
}

function makeNestedHc194TopLevel(): Circuit {
  return makeCircuit('nested_hc194_top', [
    makeGate('src_clk', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'clk' }),
    makeGate('src_clrn', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'clrn' }),
    makeGate('src_s0', 'INPUT_SWITCH', { customState: { value: 1 }, label: 's0' }),
    makeGate('src_s1', 'INPUT_SWITCH', { customState: { value: 1 }, label: 's1' }),
    makeGate('src_sr', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sr' }),
    makeGate('src_sl', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sl' }),
    makeGate('src_d0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd0' }),
    makeGate('src_d1', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'd1' }),
    makeGate('src_d2', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd2' }),
    makeGate('src_d3', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'd3' }),
    makeGate('parent', 'CIC_TEST_PARENT_HC194'),
    makeGate('led_q0', 'OUTPUT_LED', { label: 'q0' }),
    makeGate('led_q1', 'OUTPUT_LED', { label: 'q1' }),
    makeGate('led_q2', 'OUTPUT_LED', { label: 'q2' }),
    makeGate('led_q3', 'OUTPUT_LED', { label: 'q3' }),
  ], [
    makeWire('w1', 'src_clk', 'out', 'parent', 'i0'),
    makeWire('w2', 'src_clrn', 'out', 'parent', 'i1'),
    makeWire('w3', 'src_s0', 'out', 'parent', 'i2'),
    makeWire('w4', 'src_s1', 'out', 'parent', 'i3'),
    makeWire('w5', 'src_sr', 'out', 'parent', 'i4'),
    makeWire('w6', 'src_sl', 'out', 'parent', 'i5'),
    makeWire('w7', 'src_d0', 'out', 'parent', 'i6'),
    makeWire('w8', 'src_d1', 'out', 'parent', 'i7'),
    makeWire('w9', 'src_d2', 'out', 'parent', 'i8'),
    makeWire('w10', 'src_d3', 'out', 'parent', 'i9'),
    makeWire('w11', 'parent', 'o0', 'led_q0', 'in'),
    makeWire('w12', 'parent', 'o1', 'led_q1', 'in'),
    makeWire('w13', 'parent', 'o2', 'led_q2', 'in'),
    makeWire('w14', 'parent', 'o3', 'led_q3', 'in'),
  ]);
}

function makeHc194Subcircuit(): Circuit {
  return makeCircuit('hc194_sub', [
    makeGate('sw_clk', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'clk' }),
    makeGate('sw_clrn', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'clrn' }),
    makeGate('sw_s0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 's0' }),
    makeGate('sw_s1', 'INPUT_SWITCH', { customState: { value: 0 }, label: 's1' }),
    makeGate('sw_sr', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sr' }),
    makeGate('sw_sl', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sl' }),
    makeGate('sw_d0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd0' }),
    makeGate('sw_d1', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd1' }),
    makeGate('sw_d2', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd2' }),
    makeGate('sw_d3', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd3' }),
    makeGate('dut', '74HC194'),
    makeGate('led_q0', 'OUTPUT_LED', { label: 'q0' }),
    makeGate('led_q1', 'OUTPUT_LED', { label: 'q1' }),
    makeGate('led_q2', 'OUTPUT_LED', { label: 'q2' }),
    makeGate('led_q3', 'OUTPUT_LED', { label: 'q3' }),
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
    makeWire('w11', 'dut', 'q0', 'led_q0', 'in'),
    makeWire('w12', 'dut', 'q1', 'led_q1', 'in'),
    makeWire('w13', 'dut', 'q2', 'led_q2', 'in'),
    makeWire('w14', 'dut', 'q3', 'led_q3', 'in'),
  ]);
}

function makeHc194TopLevel(): Circuit {
  return makeCircuit('hc194_top', [
    makeGate('src_clk', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'clk' }),
    makeGate('src_clrn', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'clrn' }),
    makeGate('src_s0', 'INPUT_SWITCH', { customState: { value: 1 }, label: 's0' }),
    makeGate('src_s1', 'INPUT_SWITCH', { customState: { value: 1 }, label: 's1' }),
    makeGate('src_sr', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sr' }),
    makeGate('src_sl', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'sl' }),
    makeGate('src_d0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd0' }),
    makeGate('src_d1', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'd1' }),
    makeGate('src_d2', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd2' }),
    makeGate('src_d3', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'd3' }),
    makeGate('wrap', 'CIC_TEST_HC194'),
    makeGate('led_q0', 'OUTPUT_LED', { label: 'q0' }),
    makeGate('led_q1', 'OUTPUT_LED', { label: 'q1' }),
    makeGate('led_q2', 'OUTPUT_LED', { label: 'q2' }),
    makeGate('led_q3', 'OUTPUT_LED', { label: 'q3' }),
  ], [
    makeWire('w1', 'src_clk', 'out', 'wrap', 'i0'),
    makeWire('w2', 'src_clrn', 'out', 'wrap', 'i1'),
    makeWire('w3', 'src_s0', 'out', 'wrap', 'i2'),
    makeWire('w4', 'src_s1', 'out', 'wrap', 'i3'),
    makeWire('w5', 'src_sr', 'out', 'wrap', 'i4'),
    makeWire('w6', 'src_sl', 'out', 'wrap', 'i5'),
    makeWire('w7', 'src_d0', 'out', 'wrap', 'i6'),
    makeWire('w8', 'src_d1', 'out', 'wrap', 'i7'),
    makeWire('w9', 'src_d2', 'out', 'wrap', 'i8'),
    makeWire('w10', 'src_d3', 'out', 'wrap', 'i9'),
    makeWire('w11', 'wrap', 'o0', 'led_q0', 'in'),
    makeWire('w12', 'wrap', 'o1', 'led_q1', 'in'),
    makeWire('w13', 'wrap', 'o2', 'led_q2', 'in'),
    makeWire('w14', 'wrap', 'o3', 'led_q3', 'in'),
  ]);
}

function makePisoSubcircuit(): Circuit {
  return makeCircuit('piso_sub', [
    makeGate('sw_p0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'p0' }),
    makeGate('sw_p1', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'p1' }),
    makeGate('sw_p2', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'p2' }),
    makeGate('sw_p3', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'p3' }),
    makeGate('sw_load', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'load' }),
    makeGate('sw_clk', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'clk' }),
    makeGate('piso', 'PISO4'),
    makeGate('led_q', 'OUTPUT_LED', { label: 'q' }),
  ], [
    makeWire('w1', 'sw_p0', 'out', 'piso', 'p0'),
    makeWire('w2', 'sw_p1', 'out', 'piso', 'p1'),
    makeWire('w3', 'sw_p2', 'out', 'piso', 'p2'),
    makeWire('w4', 'sw_p3', 'out', 'piso', 'p3'),
    makeWire('w5', 'sw_load', 'out', 'piso', 'load'),
    makeWire('w6', 'sw_clk', 'out', 'piso', 'clk'),
    makeWire('w7', 'piso', 'q', 'led_q', 'in'),
  ]);
}

function makePisoTopLevel(): Circuit {
  return makeCircuit('piso_top', [
    makeGate('src_p0', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'p0' }),
    makeGate('src_p1', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'p1' }),
    makeGate('src_p2', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'p2' }),
    makeGate('src_p3', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'p3' }),
    makeGate('src_load', 'INPUT_SWITCH', { customState: { value: 1 }, label: 'load' }),
    makeGate('src_clk', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'clk' }),
    makeGate('wrap', 'CIC_TEST_PISO'),
    makeGate('led_q', 'OUTPUT_LED', { label: 'q' }),
  ], [
    makeWire('w1', 'src_p0', 'out', 'wrap', 'i0'),
    makeWire('w2', 'src_p1', 'out', 'wrap', 'i1'),
    makeWire('w3', 'src_p2', 'out', 'wrap', 'i2'),
    makeWire('w4', 'src_p3', 'out', 'wrap', 'i3'),
    makeWire('w5', 'src_load', 'out', 'wrap', 'i4'),
    makeWire('w6', 'src_clk', 'out', 'wrap', 'i5'),
    makeWire('w7', 'wrap', 'o0', 'led_q', 'in'),
  ]);
}

registerCustomIC('TEST_HALF_ADDER', makeHalfAdderSubcircuit(), ['a', 'b', 'sum', 'carry']);
registerCustomIC('TEST_PASSTHROUGH', makePassthroughSubcircuit(), ['in', 'out']);
registerCustomIC('TEST_TRIBUF', makeTriBufSubcircuit(), ['a', 'oe', 'y']);
registerCustomIC('TEST_BROKEN_OUTPUT', makeBrokenOutputSubcircuit(), ['a', 'y']);
registerCustomIC('TEST_HC194', makeHc194Subcircuit(), ['clk', 'clrn', 's0', 's1', 'sr', 'sl', 'd0', 'd1', 'd2', 'd3', 'q0', 'q1', 'q2', 'q3']);
registerCustomIC('TEST_PISO', makePisoSubcircuit(), ['p0', 'p1', 'p2', 'p3', 'load', 'clk', 'q']);
registerCustomIC('TEST_PARENT_HALF_ADDER', makeNestedHalfAdderSubcircuit(), ['a', 'b', 'sum', 'carry']);
registerCustomIC('TEST_PARENT_HC194', makeNestedHc194Subcircuit(), ['clk', 'clrn', 's0', 's1', 'sr', 'sl', 'd0', 'd1', 'd2', 'd3', 'q0', 'q1', 'q2', 'q3']);

describe('Custom IC runtime and HDL export', () => {
  it.each([
    { a: 0 as const, b: 0 as const, sum: 0, carry: 0 },
    { a: 0 as const, b: 1 as const, sum: 1, carry: 0 },
    { a: 1 as const, b: 0 as const, sum: 1, carry: 0 },
    { a: 1 as const, b: 1 as const, sum: 0, carry: 1 },
  ])('simulates TEST_HALF_ADDER for a=$a b=$b', ({ a, b, sum, carry }) => {
    const result = runSimulation(makeCustomTopLevel(a, b));
    expect(result.gateSignals.led_sum._display.value).toBe(sum);
    expect(result.gateSignals.led_carry._display.value).toBe(carry);
  });

  it('flattens TEST_HALF_ADDER into primitive Verilog and VHDL', () => {
    const circuit = makeCustomTopLevel(1, 1);
    const verilog = generateVerilog(circuit);
    const vhdl = generateVHDL(circuit);

    expect(verilog).not.toContain('HDL EXPORT BLOCKED');
    expect(verilog).not.toContain('CIC_TEST_HALF_ADDER');
    expect(verilog).toContain('xor g_ha_flat_xor1');
    expect(verilog).toContain('and g_ha_flat_and1');

    expect(vhdl).not.toContain('HDL EXPORT BLOCKED');
    expect(vhdl).not.toContain('CIC_TEST_HALF_ADDER');
    expect(vhdl).toContain('-- ha_flat_xor1');
    expect(vhdl).toContain('-- ha_flat_and1');
  });

  it('loads golden custom ICs from the file-based manifest', async () => {
    const loaderPath = '../../../validation/custom-ic-golden.mjs';
    const { registerGoldenCustomICsForSlugs } = await import(loaderPath);
    await registerGoldenCustomICsForSlugs(['gc_v2_6_custom_halfadder']);

    const result = runSimulation(makeGoldenCustomTopLevel(1, 1));
    expect(result.gateSignals.led_sum._display.value).toBe(0);
    expect(result.gateSignals.led_carry._display.value).toBe(1);
  });

  it('flattens passthrough custom IC outputs to real source wires', () => {
    const circuit = makePassthroughTopLevel(1);
    const flattened = flattenCustomICs(circuit);
    const wires = Object.values(flattened.wires);
    const sourceToInv = wires.find((wire) => wire.from.gateId === 'src' && wire.to.gateId === 'inv');

    expect(flattened.gates.buf).toBeUndefined();
    expect(sourceToInv).toBeDefined();
    expect(sourceToInv?.from).toEqual({ gateId: 'src', portId: 'out' });
    expect(sourceToInv?.to).toEqual({ gateId: 'inv', portId: 'in' });

    const verilog = generateVerilog(circuit);
    const vhdl = generateVHDL(circuit);
    expect(verilog).not.toContain('HDL EXPORT BLOCKED');
    expect(verilog).not.toContain('undefined');
    expect(verilog).toContain('not g_inv');
    expect(vhdl).toContain('-- inv');
  });

  it('keeps inner verilogExtraRegs declarations after custom IC flattening', () => {
    const verilog = generateVerilog(makePisoTopLevel());

    expect(verilog).not.toContain('HDL EXPORT BLOCKED');
    expect(verilog).not.toContain('CIC_TEST_PISO');
    expect(verilog).toContain('reg [3:0] sr_wrap_flat_piso;');
    expect(verilog).toContain('always @(posedge clk)');
  });

  it('preserves tri-state semantics and HDL flattening for custom TRIBUF wrappers', () => {
    const result = runSimulation(makeTriBufTopLevel(1, 1));
    const verilog = generateVerilog(makeTriBufTopLevel(1, 0));
    const vhdl = generateVHDL(makeTriBufTopLevel(1, 0));

    expect(result.gateSignals.led_y._display.value).toBe(HI_Z);
    expect(verilog).not.toContain('HDL EXPORT BLOCKED');
    expect(verilog).not.toContain('CIC_TEST_TRIBUF');
    expect(verilog).toContain("assign w_0 = (~oe) ? a : 1'bz");
    expect(vhdl).toContain("w_0_q <= a when oe = '0' else 'Z'");
  });

  it('blocks malformed custom IC exports early when a boundary output is undriven', () => {
    const verilog = generateVerilog(makeBrokenOutputTopLevel(1));
    const vhdl = generateVHDL(makeBrokenOutputTopLevel(1));

    expect(verilog).toContain('HDL EXPORT BLOCKED');
    expect(verilog).toContain('output o0 has no driven OUTPUT_LED');
    expect(vhdl).toContain('HDL EXPORT BLOCKED');
    expect(vhdl).toContain('output o0 has no driven OUTPUT_LED');
  });

  it('keeps inner 74HC194 extra-reg declarations after custom IC flattening', () => {
    const verilog = generateVerilog(makeHc194TopLevel());
    const vhdl = generateVHDL(makeHc194TopLevel());

    expect(verilog).not.toContain('HDL EXPORT BLOCKED');
    expect(verilog).not.toContain('CIC_TEST_HC194');
    expect(verilog).toContain('reg [3:0] reg_wrap_flat_dut;');
    expect(verilog).toContain('always @(posedge clk or negedge clrn)');
    expect(vhdl).toContain('signal reg_wrap_flat_dut : STD_LOGIC_VECTOR(3 downto 0)');
    expect(vhdl).toContain("case STD_LOGIC_VECTOR'(s1 & s0) is");
  });

  it('recursively flattens direct canonical combinational nested custom ICs for HDL export', () => {
    const circuit = makeNestedHalfAdderTopLevel(1, 1);
    const flattened = flattenCustomICs(circuit);
    const result = runSimulation(circuit);
    const verilog = generateVerilog(circuit);
    const vhdl = generateVHDL(circuit);

    expect(result.gateSignals.led_sum._display.value).toBe(0);
    expect(result.gateSignals.led_carry._display.value).toBe(1);
    expect(Object.values(flattened.gates).some((gate) => gate.typeId.startsWith('CIC_'))).toBe(false);
    expect(verilog).not.toContain('HDL EXPORT BLOCKED');
    expect(verilog).not.toContain('CIC_TEST_PARENT_HALF_ADDER');
    expect(verilog).not.toContain('CIC_TEST_HALF_ADDER');
    expect(verilog).toContain('xor g_parent_flat_ha_flat_xor1');
    expect(verilog).toContain('and g_parent_flat_ha_flat_and1');
    expect(vhdl).not.toContain('HDL EXPORT BLOCKED');
    expect(vhdl).not.toContain('CIC_TEST_PARENT_HALF_ADDER');
    expect(vhdl).not.toContain('CIC_TEST_HALF_ADDER');
    expect(vhdl).toContain('-- parent_flat_ha_flat_xor1');
    expect(vhdl).toContain('-- parent_flat_ha_flat_and1');
  });

  it('keeps nested stateful custom IC HDL export blocked outside the current rollout', () => {
    const circuit = makeNestedHc194TopLevel();

    expect(generateVerilog(circuit)).toContain(
      'Nested custom IC "CIC_TEST_HC194" is stateful. The current nested rollout allows only canonical combinational children.',
    );
    expect(generateVHDL(circuit)).toContain(
      'Nested custom IC "CIC_TEST_HC194" is stateful. The current nested rollout allows only canonical combinational children.',
    );
  });
});

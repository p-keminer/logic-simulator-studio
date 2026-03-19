import { describe, expect, it } from 'vitest';

import '../../core/registry/index';

import { registerCustomIC } from '../../core/customIc/registerCustomIC';
import { flattenCustomICs } from '../../core/io/flattenCustomIC';
import { generateVerilog } from '../../core/io/verilog';
import { generateVHDL } from '../../core/io/vhdl';
import { runSimulation } from '../../core/simulation/engine';
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
registerCustomIC('TEST_PISO', makePisoSubcircuit(), ['p0', 'p1', 'p2', 'p3', 'load', 'clk', 'q']);

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
    expect(verilog).toContain('xor g_ha__xor1');
    expect(verilog).toContain('and g_ha__and1');

    expect(vhdl).not.toContain('HDL EXPORT BLOCKED');
    expect(vhdl).not.toContain('CIC_TEST_HALF_ADDER');
    expect(vhdl).toContain('-- ha__xor1');
    expect(vhdl).toContain('-- ha__and1');
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
    expect(verilog).toContain('reg [3:0] sr_wrap__piso;');
    expect(verilog).toContain('always @(posedge clk)');
  });
});

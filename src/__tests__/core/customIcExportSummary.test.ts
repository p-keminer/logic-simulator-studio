import { describe, expect, it } from 'vitest';

import '../../core/registry/index';

import { analyzeCircuitCustomIcExportSummary } from '../../core/analysis/customIcExportSummary';
import { registerCustomIC } from '../../core/customIc/registerCustomIC';
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
    metadata: { createdAt: '2026-03-21', updatedAt: '2026-03-21' },
  };
}

function makeHalfAdderSubcircuit(): Circuit {
  return makeCircuit(
    'summary_half_adder_sub',
    [
      makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
      makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
      makeGate('xor1', 'XOR'),
      makeGate('and1', 'AND'),
      makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
      makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
    ],
    [
      makeWire('w1', 'sw_a', 'out', 'xor1', 'a'),
      makeWire('w2', 'sw_b', 'out', 'xor1', 'b'),
      makeWire('w3', 'xor1', 'out', 'led_sum', 'in'),
      makeWire('w4', 'sw_a', 'out', 'and1', 'a'),
      makeWire('w5', 'sw_b', 'out', 'and1', 'b'),
      makeWire('w6', 'and1', 'out', 'led_carry', 'in'),
    ],
  );
}

function makeReg4Subcircuit(): Circuit {
  return makeCircuit(
    'summary_reg4_sub',
    [
      makeGate('sw_d0', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd0' }),
      makeGate('sw_d1', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd1' }),
      makeGate('sw_d2', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd2' }),
      makeGate('sw_d3', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'd3' }),
      makeGate('sw_en', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'en' }),
      makeGate('sw_clk', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'clk' }),
      makeGate('sw_rst', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'rst' }),
      makeGate('reg', 'REG4'),
      makeGate('led_q0', 'OUTPUT_LED', { label: 'q0' }),
      makeGate('led_q1', 'OUTPUT_LED', { label: 'q1' }),
      makeGate('led_q2', 'OUTPUT_LED', { label: 'q2' }),
      makeGate('led_q3', 'OUTPUT_LED', { label: 'q3' }),
    ],
    [
      makeWire('w1', 'sw_d0', 'out', 'reg', 'd0'),
      makeWire('w2', 'sw_d1', 'out', 'reg', 'd1'),
      makeWire('w3', 'sw_d2', 'out', 'reg', 'd2'),
      makeWire('w4', 'sw_d3', 'out', 'reg', 'd3'),
      makeWire('w5', 'sw_en', 'out', 'reg', 'en'),
      makeWire('w6', 'sw_clk', 'out', 'reg', 'clk'),
      makeWire('w7', 'sw_rst', 'out', 'reg', 'rst'),
      makeWire('w8', 'reg', 'q0', 'led_q0', 'in'),
      makeWire('w9', 'reg', 'q1', 'led_q1', 'in'),
      makeWire('w10', 'reg', 'q2', 'led_q2', 'in'),
      makeWire('w11', 'reg', 'q3', 'led_q3', 'in'),
    ],
  );
}

function makeNestedHalfAdderSubcircuit(): Circuit {
  return makeCircuit(
    'summary_nested_half_adder_sub',
    [
      makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
      makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
      makeGate('ha', 'CIC_SUMMARY_HALF_ADDER'),
      makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
      makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
    ],
    [
      makeWire('w1', 'sw_a', 'out', 'ha', 'i0'),
      makeWire('w2', 'sw_b', 'out', 'ha', 'i1'),
      makeWire('w3', 'ha', 'o0', 'led_sum', 'in'),
      makeWire('w4', 'ha', 'o1', 'led_carry', 'in'),
    ],
  );
}

registerCustomIC('SUMMARY_HALF_ADDER', makeHalfAdderSubcircuit(), ['a', 'b', 'sum', 'carry']);
registerCustomIC('SUMMARY_REG4', makeReg4Subcircuit(), ['d0', 'd1', 'd2', 'd3', 'en', 'clk', 'rst', 'q0', 'q1', 'q2', 'q3']);
registerCustomIC('SUMMARY_PARENT_HALF_ADDER', makeNestedHalfAdderSubcircuit(), ['a', 'b', 'sum', 'carry']);

describe('customIcExportSummary', () => {
  it('returns an empty summary when the circuit has no custom ICs', () => {
    const summary = analyzeCircuitCustomIcExportSummary(makeCircuit('plain', [], []));

    expect(summary.totalCustomIcInstances).toBe(0);
    expect(summary.exportableInstanceCount).toBe(0);
    expect(summary.blockedReasons).toEqual([]);
    expect(summary.boundaries).toEqual([]);
  });

  it('counts one-level combinational and sequential custom IC boundaries separately', () => {
    const circuit = makeCircuit(
      'summary_top',
      [
        makeGate('ha', 'CIC_SUMMARY_HALF_ADDER', { label: 'HA' }),
        makeGate('reg_wrap', 'CIC_SUMMARY_REG4', { label: 'REG' }),
      ],
      [],
    );

    const summary = analyzeCircuitCustomIcExportSummary(circuit);

    expect(summary.totalCustomIcInstances).toBe(2);
    expect(summary.exportableInstanceCount).toBe(2);
    expect(summary.blockedInstanceCount).toBe(0);
    expect(summary.combinationalInstanceCount).toBe(1);
    expect(summary.statefulInstanceCount).toBe(1);
    expect(summary.maxHierarchyDepth).toBe(1);
    expect(summary.boundaries.map((boundary) => boundary.boundaryPolicy)).toEqual([
      'one_level_combinational',
      'one_level_stateful',
    ]);
  });

  it('surfaces blocked nested custom IC boundaries with deduplicated reasons', () => {
    const circuit = makeCircuit(
      'summary_nested_top',
      [
        makeGate('parent_a', 'CIC_SUMMARY_PARENT_HALF_ADDER'),
        makeGate('parent_b', 'CIC_SUMMARY_PARENT_HALF_ADDER'),
      ],
      [],
    );

    const summary = analyzeCircuitCustomIcExportSummary(circuit);

    expect(summary.totalCustomIcInstances).toBe(2);
    expect(summary.exportableInstanceCount).toBe(0);
    expect(summary.blockedInstanceCount).toBe(2);
    expect(summary.maxHierarchyDepth).toBeGreaterThanOrEqual(2);
    expect(summary.nestedCustomTypeIds).toEqual(['CIC_SUMMARY_HALF_ADDER']);
    expect(summary.blockedReasons).toHaveLength(1);
    expect(summary.blockedReasons[0]).toContain('Nested custom IC "CIC_SUMMARY_HALF_ADDER"');
    expect(summary.boundaries.every((boundary) => boundary.boundaryPolicy === 'nested_blocked')).toBe(true);
  });
});

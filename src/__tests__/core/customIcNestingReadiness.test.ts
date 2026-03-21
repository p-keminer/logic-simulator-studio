import { describe, expect, it } from 'vitest';

import '../../core/registry/index';

import {
  analyzeCircuitCustomIcNestingReadiness,
  analyzeCustomIcGateNestingReadiness,
} from '../../core/analysis/customIcNestingReadiness';
import { getCustomIcGatePolicy } from '../../core/analysis/customIcPolicy';
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
  return makeCircuit('readiness_half_adder_sub', [
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

function makeReg4Subcircuit(): Circuit {
  return makeCircuit('readiness_reg4_sub', [
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
  ], [
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
  ]);
}

function makeDeadInputSubcircuit(): Circuit {
  return makeCircuit('readiness_dead_input_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_unused', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'unused' }),
    makeGate('not1', 'NOT'),
    makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'not1', 'a'),
    makeWire('w2', 'not1', 'out', 'led_y', 'in'),
  ]);
}

function makeMissingOutputDriverSubcircuit(): Circuit {
  return makeCircuit('readiness_missing_output_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('not1', 'NOT'),
    makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'not1', 'a'),
  ]);
}

function makeNestedHalfAdderSubcircuit(): Circuit {
  return makeCircuit('readiness_nested_half_adder_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
    makeGate('ha', 'CIC_READINESS_HALF_ADDER'),
    makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
    makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'ha', 'i0'),
    makeWire('w2', 'sw_b', 'out', 'ha', 'i1'),
    makeWire('w3', 'ha', 'o0', 'led_sum', 'in'),
    makeWire('w4', 'ha', 'o1', 'led_carry', 'in'),
  ]);
}

registerCustomIC('READINESS_HALF_ADDER', makeHalfAdderSubcircuit(), ['a', 'b', 'sum', 'carry']);
registerCustomIC('READINESS_REG4', makeReg4Subcircuit(), ['d0', 'd1', 'd2', 'd3', 'en', 'clk', 'rst', 'q0', 'q1', 'q2', 'q3']);
registerCustomIC('READINESS_DEAD_INPUT', makeDeadInputSubcircuit(), ['a', 'unused', 'y']);
registerCustomIC('READINESS_MISSING_OUTPUT', makeMissingOutputDriverSubcircuit(), ['a', 'y']);
registerCustomIC('READINESS_PARENT_HALF_ADDER', makeNestedHalfAdderSubcircuit(), ['a', 'b', 'sum', 'carry']);

describe('customIcNestingReadiness', () => {
  it('classifies canonical one-level combinational custom ICs as nesting-eligible', () => {
    const readiness = analyzeCustomIcGateNestingReadiness(makeGate('ha', 'CIC_READINESS_HALF_ADDER'));
    const policy = getCustomIcGatePolicy(makeGate('ha', 'CIC_READINESS_HALF_ADDER'));

    expect(readiness.readiness).toBe('eligible_combinational');
    expect(readiness.eligibleForFutureNesting).toBe(true);
    expect(policy.nestedReadiness).toBe('eligible_combinational');
  });

  it('classifies canonical one-level sequential custom ICs as stateful nesting candidates', () => {
    const readiness = analyzeCustomIcGateNestingReadiness(makeGate('reg_wrap', 'CIC_READINESS_REG4'));

    expect(readiness.readiness).toBe('eligible_stateful');
    expect(readiness.clockRelevantInputPortIds).toEqual(['i5']);
    expect(readiness.resetRelevantInputPortIds).toEqual(['i6']);
  });

  it('keeps degraded one-level custom ICs out of nested-eligible candidates', () => {
    const readiness = analyzeCustomIcGateNestingReadiness(makeGate('dead_wrap', 'CIC_READINESS_DEAD_INPUT'));

    expect(readiness.readiness).toBe('degraded_contract');
    expect(readiness.eligibleForFutureNesting).toBe(false);
    expect(readiness.reason).toContain('input i1 has no fanout');
  });

  it('keeps blocked one-level contract failures out of nested-eligible candidates', () => {
    const readiness = analyzeCustomIcGateNestingReadiness(makeGate('broken_wrap', 'CIC_READINESS_MISSING_OUTPUT'));
    const policy = getCustomIcGatePolicy(makeGate('broken_wrap', 'CIC_READINESS_MISSING_OUTPUT'));

    expect(readiness.readiness).toBe('blocked_contract');
    expect(readiness.eligibleForFutureNesting).toBe(false);
    expect(policy.nestedReadiness).toBe('blocked_contract');
  });

  it('keeps already nested custom ICs in their own blocked-existing bucket', () => {
    const readiness = analyzeCustomIcGateNestingReadiness(makeGate('parent', 'CIC_READINESS_PARENT_HALF_ADDER'));

    expect(readiness.readiness).toBe('blocked_existing_nested');
    expect(readiness.nestedCustomTypeIds).toEqual(['CIC_READINESS_HALF_ADDER']);
    expect(readiness.eligibleForFutureNesting).toBe(false);
  });

  it('summarizes the circuit-wide nesting readiness mix for later planning cuts', () => {
    const circuit = makeCircuit('readiness_summary_top', [
      makeGate('ha', 'CIC_READINESS_HALF_ADDER'),
      makeGate('reg', 'CIC_READINESS_REG4'),
      makeGate('dead', 'CIC_READINESS_DEAD_INPUT'),
      makeGate('broken', 'CIC_READINESS_MISSING_OUTPUT'),
      makeGate('parent', 'CIC_READINESS_PARENT_HALF_ADDER'),
    ], []);

    const summary = analyzeCircuitCustomIcNestingReadiness(circuit);

    expect(summary.totalCustomIcInstances).toBe(5);
    expect(summary.eligibleCombinationalCount).toBe(1);
    expect(summary.eligibleStatefulCount).toBe(1);
    expect(summary.degradedCount).toBe(1);
    expect(summary.blockedContractCount).toBe(1);
    expect(summary.blockedExistingNestedCount).toBe(1);
    expect(summary.degradedReasons[0]).toContain('input i1 has no fanout');
    expect(summary.blockedReasons.some((reason) => reason.includes('output o0 has no driven OUTPUT_LED'))).toBe(true);
    expect(summary.blockedReasons.some((reason) => reason.includes('Nested custom IC "CIC_READINESS_HALF_ADDER"'))).toBe(true);
  });
});

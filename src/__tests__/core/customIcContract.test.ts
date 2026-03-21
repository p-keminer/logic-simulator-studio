import { describe, expect, it } from 'vitest';

import '../../core/registry/index';

import { analyzeCustomIcGateContract } from '../../core/analysis/customIcContract';
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

function makeDeadInputSubcircuit(): Circuit {
  return makeCircuit(
    'contract_dead_input_sub',
    [
      makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
      makeGate('sw_unused', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'unused' }),
      makeGate('not1', 'NOT'),
      makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
    ],
    [
      makeWire('w1', 'sw_a', 'out', 'not1', 'a'),
      makeWire('w2', 'not1', 'out', 'led_y', 'in'),
    ],
  );
}

function makeMissingOutputDriverSubcircuit(): Circuit {
  return makeCircuit(
    'contract_missing_output_sub',
    [
      makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
      makeGate('not1', 'NOT'),
      makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
    ],
    [
      makeWire('w1', 'sw_a', 'out', 'not1', 'a'),
    ],
  );
}

function makeMultiDriverOutputSubcircuit(): Circuit {
  return makeCircuit(
    'contract_multi_driver_sub',
    [
      makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
      makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
      makeGate('and1', 'AND'),
      makeGate('or1', 'OR'),
      makeGate('led_y', 'OUTPUT_LED', { label: 'y' }),
    ],
    [
      makeWire('w1', 'sw_a', 'out', 'and1', 'a'),
      makeWire('w2', 'sw_b', 'out', 'and1', 'b'),
      makeWire('w3', 'sw_a', 'out', 'or1', 'a'),
      makeWire('w4', 'sw_b', 'out', 'or1', 'b'),
      makeWire('w5', 'and1', 'out', 'led_y', 'in'),
      makeWire('w6', 'or1', 'out', 'led_y', 'in'),
    ],
  );
}

registerCustomIC('CONTRACT_DEAD_INPUT', makeDeadInputSubcircuit(), ['a', 'unused', 'y']);
registerCustomIC('CONTRACT_MISSING_OUTPUT', makeMissingOutputDriverSubcircuit(), ['a', 'y']);
registerCustomIC('CONTRACT_MULTI_OUTPUT', makeMultiDriverOutputSubcircuit(), ['a', 'b', 'y']);

describe('customIcContract', () => {
  it('marks dead exported inputs as degraded, but not export-blocking', () => {
    const contract = analyzeCustomIcGateContract(makeGate('dead_wrap', 'CIC_CONTRACT_DEAD_INPUT'));
    const policy = getCustomIcGatePolicy(makeGate('dead_wrap', 'CIC_CONTRACT_DEAD_INPUT'));

    expect(contract.status).toBe('degraded');
    expect(contract.exportAllowed).toBe(true);
    expect(contract.deadInputPortIds).toEqual(['i1']);
    expect(policy.boundaryPolicy).toBe('one_level_combinational');
  });

  it('blocks undriven boundary outputs before flattening with a central contract reason', () => {
    const contract = analyzeCustomIcGateContract(makeGate('broken_wrap', 'CIC_CONTRACT_MISSING_OUTPUT'));
    const policy = getCustomIcGatePolicy(makeGate('broken_wrap', 'CIC_CONTRACT_MISSING_OUTPUT'));

    expect(contract.status).toBe('blocked');
    expect(contract.exportAllowed).toBe(false);
    expect(contract.missingOutputPortIds).toEqual(['o0']);
    expect(contract.exportBlockReason).toContain('output o0 has no driven OUTPUT_LED');
    expect(policy.boundaryPolicy).toBe('contract_blocked');
    expect(policy.exportReason).toContain('output o0 has no driven OUTPUT_LED');
  });

  it('blocks multi-driver boundary outputs before flattening selects an arbitrary source', () => {
    const contract = analyzeCustomIcGateContract(makeGate('multi_wrap', 'CIC_CONTRACT_MULTI_OUTPUT'));
    const policy = getCustomIcGatePolicy(makeGate('multi_wrap', 'CIC_CONTRACT_MULTI_OUTPUT'));

    expect(contract.status).toBe('blocked');
    expect(contract.multiDriverOutputPortIds).toEqual(['o0']);
    expect(contract.exportBlockReason).toContain('output o0 has 2 internal drivers');
    expect(policy.boundaryPolicy).toBe('contract_blocked');
    expect(policy.exportAllowed).toBe(false);
  });
});

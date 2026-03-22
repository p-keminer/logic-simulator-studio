import '../setup';
import '../../core/registry/index';

import { describe, expect, it } from 'vitest';

import { registerCustomIC } from '../../core/customIc/registerCustomIC';
import { gateRegistry } from '../../core/registry/GateRegistry';
import { deserializeCircuit } from '../../core/io/deserializer';
import { serializeCircuit } from '../../core/io/serializer';
import { generateVerilog } from '../../core/io/verilog';
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
  return makeCircuit('embedded_half_adder_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
    makeGate('xor_sum', 'XOR'),
    makeGate('and_carry', 'AND'),
    makeGate('led_sum', 'OUTPUT_LED', { label: 'sum' }),
    makeGate('led_carry', 'OUTPUT_LED', { label: 'carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'xor_sum', 'a'),
    makeWire('w2', 'sw_b', 'out', 'xor_sum', 'b'),
    makeWire('w3', 'xor_sum', 'out', 'led_sum', 'in'),
    makeWire('w4', 'sw_a', 'out', 'and_carry', 'a'),
    makeWire('w5', 'sw_b', 'out', 'and_carry', 'b'),
    makeWire('w6', 'and_carry', 'out', 'led_carry', 'in'),
  ]);
}

function makeNestedParentSubcircuit(): Circuit {
  return makeCircuit('embedded_parent_half_adder_sub', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
    makeGate('ha0', 'CIC_EMBED_HALF_ADDER'),
    makeGate('or_any', 'OR'),
    makeGate('led_any', 'OUTPUT_LED', { label: 'sum_or_carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'ha0', 'i0'),
    makeWire('w2', 'sw_b', 'out', 'ha0', 'i1'),
    makeWire('w3', 'ha0', 'o0', 'or_any', 'a'),
    makeWire('w4', 'ha0', 'o1', 'or_any', 'b'),
    makeWire('w5', 'or_any', 'out', 'led_any', 'in'),
  ]);
}

function makeNestedHostCircuit(): Circuit {
  return makeCircuit('embedded_nested_host', [
    makeGate('sw_a', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'a' }),
    makeGate('sw_b', 'INPUT_SWITCH', { customState: { value: 0 }, label: 'b' }),
    makeGate('parent', 'CIC_EMBED_PARENT_HALF_ADDER'),
    makeGate('led_any', 'OUTPUT_LED', { label: 'sum_or_carry' }),
  ], [
    makeWire('w1', 'sw_a', 'out', 'parent', 'i0'),
    makeWire('w2', 'sw_b', 'out', 'parent', 'i1'),
    makeWire('w3', 'parent', 'o0', 'led_any', 'in'),
  ]);
}

describe('custom IC embedded circuit library', () => {
  it('serializes used custom IC dependencies into the circuit file and rehydrates them on load', () => {
    registerCustomIC('EMBED_HALF_ADDER', makeHalfAdderSubcircuit(), ['a', 'b', 'sum', 'carry']);
    registerCustomIC('EMBED_PARENT_HALF_ADDER', makeNestedParentSubcircuit(), ['a', 'b', 'sum_or_carry']);

    try {
      const serialized = serializeCircuit(makeNestedHostCircuit());
      const parsed = JSON.parse(serialized) as Circuit;

      expect(parsed.customIcLibrary?.map((entry) => entry.name)).toEqual([
        'EMBED_HALF_ADDER',
        'EMBED_PARENT_HALF_ADDER',
      ]);
      expect(parsed.customIcLibrary?.[1]?.portNames).toEqual(['a', 'b', 'sum_or_carry']);

      gateRegistry.unregister('CIC_EMBED_PARENT_HALF_ADDER');
      gateRegistry.unregister('CIC_EMBED_HALF_ADDER');

      const deserialized = deserializeCircuit(serialized);

      expect(deserialized.gates.parent.typeId).toBe('CIC_EMBED_PARENT_HALF_ADDER');
      expect(gateRegistry.has('CIC_EMBED_HALF_ADDER')).toBe(true);
      expect(gateRegistry.has('CIC_EMBED_PARENT_HALF_ADDER')).toBe(true);
      expect(gateRegistry.get('CIC_EMBED_PARENT_HALF_ADDER').outputs.map((port) => port.label)).toEqual([
        'sum_or_carry',
      ]);

      const verilog = generateVerilog(deserialized);
      expect(verilog).not.toContain('CIC_EMBED_PARENT_HALF_ADDER');
      expect(verilog).not.toContain('CIC_EMBED_HALF_ADDER');
      expect(verilog).toContain('or g_parent_flat_or_any');
    } finally {
      gateRegistry.unregister('CIC_EMBED_PARENT_HALF_ADDER');
      gateRegistry.unregister('CIC_EMBED_HALF_ADDER');
    }
  });
});

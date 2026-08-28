import '../setup';
import '../../core/registry/index';

import { describe, expect, it } from 'vitest';

import { deserializeCircuit } from '../../core/io/deserializer';
import { gateRegistry } from '../../core/registry/GateRegistry';

const fsmCircuitFixtures = import.meta.glob<string>(
  '../../../validation/fixtures/fsm/*.lgsc.json',
  { eager: true, import: 'default', query: '?raw' },
);

function baseCircuit() {
  return {
    id: 'circuit-1',
    name: 'Import test',
    version: '1.0.0',
    gates: {
      input: {
        id: 'input',
        typeId: 'INPUT_SWITCH',
        x: 20,
        y: 40,
        label: '',
        outputSignals: { out: { value: 0, version: 0, lastChangedAt: 0 } },
        customState: { value: 1 } as Record<string, unknown>,
        isSelected: false,
      },
      output: {
        id: 'output',
        typeId: 'OUTPUT_LED',
        x: 240,
        y: 40,
        outputSignals: {},
        customState: {} as Record<string, unknown>,
        isSelected: false,
      },
    },
    wires: {
      wire: {
        id: 'wire',
        from: { gateId: 'input', portId: 'out' },
        to: { gateId: 'output', portId: 'in' },
        signal: { value: 0, version: 0, lastChangedAt: 0 },
        color: '',
        isSelected: false,
      },
    },
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  };
}

describe('circuit deserializer compatibility and custom-state validation', () => {
  it('imports every active FSM circuit fixture', () => {
    expect(Object.keys(fsmCircuitFixtures).length).toBeGreaterThan(0);
    for (const [fixture, json] of Object.entries(fsmCircuitFixtures)) {
      expect(() => deserializeCircuit(json), fixture).not.toThrow();
    }
  });

  it('accepts empty labels and reset wire colors emitted by the app', () => {
    const circuit = deserializeCircuit(JSON.stringify(baseCircuit()));

    expect(circuit.gates.input.label).toBe('');
    expect(circuit.wires.wire.color).toBe('');
  });

  it('normalizes empty names and timestamps emitted by existing project data', () => {
    const payload = baseCircuit();
    payload.name = '';
    payload.metadata.createdAt = '';
    payload.metadata.updatedAt = '';

    const circuit = deserializeCircuit(JSON.stringify(payload));

    expect(circuit.name).toBe('Importierte Schaltung');
    expect(circuit.metadata.createdAt).not.toBe('');
    expect(circuit.metadata.updatedAt).not.toBe('');
  });

  it('round-trips empty custom-IC port labels emitted by the editor', () => {
    const payload = {
      ...baseCircuit(),
      customIcLibrary: [{
        name: 'EMPTY_PORT_LABELS',
        typeId: 'CIC_EMPTY_PORT_LABELS',
        circuit: baseCircuit(),
        portNames: ['', ''],
      }],
    };

    gateRegistry.unregister('CIC_EMPTY_PORT_LABELS');
    try {
      const circuit = deserializeCircuit(JSON.stringify(payload));
      expect(circuit.customIcLibrary?.[0].portNames).toEqual(['', '']);
    } finally {
      gateRegistry.unregister('CIC_EMPTY_PORT_LABELS');
    }
  });

  it('rejects custom-state values that would crash or corrupt gate rendering', () => {
    const invalidText = baseCircuit();
    invalidText.gates.input.customState = { text: 42 };
    expect(() => deserializeCircuit(JSON.stringify(invalidText))).toThrow(/customState\.text.*Zeichenkette/);

    const invalidNumber = baseCircuit();
    invalidNumber.gates.input.customState = { frequency: 'fast' };
    expect(() => deserializeCircuit(JSON.stringify(invalidNumber))).toThrow(/customState\.frequency.*endliche Zahl/);

    const invalidInnerState = baseCircuit();
    invalidInnerState.gates.input.customState = { innerStates: { nested: 'invalid' } };
    expect(() => deserializeCircuit(JSON.stringify(invalidInnerState))).toThrow(/innerStates\.nested.*Objekt/);
  });

  it('rejects external-resource colors in wires and LED state', () => {
    const invalidWireColor = baseCircuit();
    invalidWireColor.wires.wire.color = 'url(https://example.invalid/track)';
    expect(() => deserializeCircuit(JSON.stringify(invalidWireColor))).toThrow(/Hex-Farbe|länger als 7/);

    const invalidLedColor = baseCircuit();
    invalidLedColor.gates.output.customState = { ledColor: 'url(https://example.invalid/track)' };
    expect(() => deserializeCircuit(JSON.stringify(invalidLedColor))).toThrow(/Hex-Farbe|länger als 7/);
  });

  it('rejects inherited object-property names as missing wire endpoints', () => {
    const invalidEndpoint = baseCircuit();
    invalidEndpoint.wires.wire.to.gateId = 'toString';

    expect(() => deserializeCircuit(JSON.stringify(invalidEndpoint))).toThrow(/nicht vorhandenes Gatter/);
  });

  it('accepts safe colors and validates memory contents byte by byte', () => {
    const valid = baseCircuit();
    valid.wires.wire.color = '#22c55e';
    valid.gates.output.customState = { ledColor: '#ef4444' };
    valid.gates.input.customState = { data: [0, 127, 255] };
    expect(() => deserializeCircuit(JSON.stringify(valid))).not.toThrow();

    const invalidData = baseCircuit();
    invalidData.gates.input.customState = { data: [256] };
    expect(() => deserializeCircuit(JSON.stringify(invalidData))).toThrow(/zwischen 0 und 255/);

    const oversizedData = baseCircuit();
    oversizedData.gates.input.customState = { data: new Array(257).fill(0) };
    expect(() => deserializeCircuit(JSON.stringify(oversizedData))).toThrow(/höchstens 256 Bytes/);
  });
});

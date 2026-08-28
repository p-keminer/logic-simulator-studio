import '../setup';
import '../../core/registry/index';

import { describe, expect, it } from 'vitest';

import {
  deserializeCircuit,
  MAX_CIRCUIT_FILE_BYTES,
} from '../../core/io/deserializer';
import { gateRegistry } from '../../core/registry/GateRegistry';

const goldenCircuits = import.meta.glob<string>(
  '../../../validation/fixtures/golden-corpus/*.lgsc.json',
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
        outputSignals: { out: { value: 1, version: 99, lastChangedAt: 123 } },
        customState: { value: 1 },
        isSelected: true,
      },
      output: {
        id: 'output',
        typeId: 'OUTPUT_LED',
        x: 240,
        y: 40,
        outputSignals: {},
        isSelected: true,
      },
    },
    wires: {
      wire: {
        id: 'wire',
        from: { gateId: 'input', portId: 'out' },
        to: { gateId: 'output', portId: 'in' },
        signal: { value: 1, version: 12, lastChangedAt: 45 },
        isSelected: true,
      },
    },
    viewport: { panX: 0, panY: 0, zoom: 1 },
    metadata: { createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  };
}

describe('circuit deserializer security boundaries', () => {
  it('accepts every self-contained tracked golden circuit fixture', () => {
    expect(Object.keys(goldenCircuits).length).toBeGreaterThan(0);
    let checked = 0;
    for (const [fixture, json] of Object.entries(goldenCircuits)) {
      const raw = JSON.parse(json) as ReturnType<typeof baseCircuit>;
      const requiresExternalCustomDefinition = Object.values(raw.gates)
        .some((gate) => gate.typeId.startsWith('CIC_'));
      if (requiresExternalCustomDefinition && !('customIcLibrary' in raw)) continue;
      expect(() => deserializeCircuit(json), fixture).not.toThrow();
      checked += 1;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('normalizes volatile signal and selection state from a valid circuit', () => {
    const circuit = deserializeCircuit(JSON.stringify(baseCircuit()));

    expect(circuit.gates.input.isSelected).toBe(false);
    expect(circuit.gates.input.outputSignals.out).toEqual({
      value: 0,
      version: 0,
      lastChangedAt: 0,
    });
    expect(circuit.wires.wire.isSelected).toBe(false);
    expect(circuit.wires.wire.signal).toEqual({ value: 0, version: 0, lastChangedAt: 0 });
  });

  it('rejects files before parsing when they exceed the byte limit', () => {
    expect(() => deserializeCircuit(' '.repeat(MAX_CIRCUIT_FILE_BYTES + 1))).toThrow(/größer als 5 MiB/);
  });

  it('rejects non-finite coordinates and invalid wire ports', () => {
    const invalidCoordinate = baseCircuit();
    invalidCoordinate.gates.input.x = Number.POSITIVE_INFINITY;
    expect(() => deserializeCircuit(JSON.stringify(invalidCoordinate))).toThrow(/endliche Zahl/);

    const invalidPort = baseCircuit();
    invalidPort.wires.wire.from.portId = 'not-an-output';
    expect(() => deserializeCircuit(JSON.stringify(invalidPort))).toThrow(/nicht auf einen Ausgang/);
  });

  it('rejects cyclic embedded custom ICs before mutating the gate registry', () => {
    const payload = baseCircuit() as ReturnType<typeof baseCircuit> & {
      customIcLibrary: unknown[];
    };
    payload.customIcLibrary = [{
      name: 'SELF',
      typeId: 'CIC_SELF',
      circuit: {
        ...baseCircuit(),
        id: 'self-subcircuit',
        gates: {
          input: baseCircuit().gates.input,
          self: {
            id: 'self',
            typeId: 'CIC_SELF',
            x: 120,
            y: 40,
            outputSignals: {},
            isSelected: false,
          },
          output: baseCircuit().gates.output,
        },
        wires: {},
      },
      portNames: ['in', 'out'],
    }];

    gateRegistry.unregister('CIC_SELF');
    expect(() => deserializeCircuit(JSON.stringify(payload))).toThrow(/nicht selbst enthalten|Zyklische/);
    expect(gateRegistry.has('CIC_SELF')).toBe(false);
  });

  it('does not register a valid embedded definition when the host circuit is invalid', () => {
    const payload = baseCircuit() as ReturnType<typeof baseCircuit> & {
      customIcLibrary: unknown[];
    };
    payload.customIcLibrary = [{
      name: 'SAFE_IMPORT',
      typeId: 'CIC_SAFE_IMPORT',
      circuit: {
        ...baseCircuit(),
        id: 'safe-subcircuit',
      },
      portNames: ['in', 'out'],
    }];
    payload.wires.wire.to.gateId = 'missing-gate';

    gateRegistry.unregister('CIC_SAFE_IMPORT');
    expect(() => deserializeCircuit(JSON.stringify(payload))).toThrow(/nicht vorhandenes Gatter/);
    expect(gateRegistry.has('CIC_SAFE_IMPORT')).toBe(false);
  });
});

import '../setup';
import { describe, expect, it } from 'vitest';
import {
  BACKEND_SANDBOX_BRIDGE_VERSION,
  type BackendSandboxCurrentCircuitSnapshot,
} from '../../core/io/backendSandboxSnapshot';
import {
  BackendBrokerCircuitContextError,
  createBackendBrokerCircuitContext,
} from '../../core/backendBroker/circuitContext';

function makeSnapshot(
  overrides: Partial<BackendSandboxCurrentCircuitSnapshot['openCircuit']> = {},
): BackendSandboxCurrentCircuitSnapshot {
  return {
    bridgeVersion: BACKEND_SANDBOX_BRIDGE_VERSION,
    openCircuit: {
      circuitId: 'broker-circuit-1',
      title: 'Broker Demo',
      selection: {
        activeElementIds: ['gate-a', 'wire-1', 'gate-a'],
      },
      elements: {
        nodes: [
          { id: 'node-in', nodeType: 'INPUT_SWITCH', displayName: 'A' },
          { id: 'node-out', nodeType: 'OUTPUT_LED', displayName: 'Y' },
        ],
        gates: [
          {
            id: 'gate-a',
            gateType: 'AND',
            displayName: 'AND',
            pins: {
              inputs: [{ gateId: 'gate-a', port: 'a' }, { gateId: 'gate-a', port: 'b' }],
              outputs: [{ gateId: 'gate-a', port: 'out' }],
            },
          },
        ],
        wires: [
          {
            source: { gateId: 'node-in', port: 'out' },
            target: { gateId: 'gate-a', port: 'a' },
          },
        ],
      },
      annotations: {
        notes: '   keep this note trimmed   ',
      },
      ...overrides,
    },
  };
}

describe('backend broker circuit context adapter', () => {
  it('maps the current-circuit snapshot onto the broker chat contract shape', () => {
    const context = createBackendBrokerCircuitContext(makeSnapshot());

    expect(context).toMatchObject({
      scope: 'active-circuit',
      version: 'v1',
      circuitId: 'broker-circuit-1',
      circuitName: 'Broker Demo',
      selectedElementIds: ['gate-a'],
      nodes: [
        { id: 'node-in', kind: 'INPUT_SWITCH', label: 'A' },
        { id: 'node-out', kind: 'OUTPUT_LED', label: 'Y' },
      ],
      gates: [
        {
          id: 'gate-a',
          type: 'AND',
          label: 'AND',
        },
      ],
      connections: [
        {
          from: { gateId: 'node-in', port: 'out' },
          to: { gateId: 'gate-a', port: 'a' },
        },
      ],
      notes: 'keep this note trimmed',
      reduction: expect.objectContaining({
        original: {
          selectedElementIds: 2,
          nodes: 2,
          gates: 1,
          connections: 1,
        },
      }),
    });
    expect(context.reduction.serializedBytes).toBeGreaterThan(0);
    expect(context.reduction.reasons).toContain('selected-elements-trimmed');
  });

  it('caps oversized payloads and reports reduction reasons for the broker path', () => {
    const gates = Array.from({ length: 8 }, (_, index) => ({
      id: `gate-${index + 1}`,
      gateType: 'AND',
      displayName: `Very long gate label ${index + 1}`,
      pins: {
        inputs: [
          { gateId: `gate-${index + 1}`, port: 'a' },
          { gateId: `gate-${index + 1}`, port: 'b' },
        ],
        outputs: [{ gateId: `gate-${index + 1}`, port: 'out' }],
      },
    }));
    const snapshot = makeSnapshot({
      elements: {
        nodes: [],
        gates,
        wires: gates.slice(1).map((gate, index) => ({
          source: { gateId: `gate-${index + 1}`, port: 'out' },
          target: { gateId: gate.id, port: 'a' },
        })),
      },
      selection: {
        activeElementIds: gates.map((gate) => gate.id),
      },
    });
    const context = createBackendBrokerCircuitContext(snapshot, {
      limits: {
        maxConnections: 3,
        maxGates: 3,
        maxSelectedElementIds: 2,
      },
    });

    expect(context.gates).toHaveLength(3);
    expect(context.connections).toHaveLength(2);
    expect(context.selectedElementIds).toHaveLength(2);
    expect(context.reduction.reasons).toEqual(
      expect.arrayContaining(['gates-trimmed', 'selected-elements-trimmed']),
    );
  });

  it('fails early when the reduced broker payload still exceeds the configured byte budget', () => {
    expect(() =>
      createBackendBrokerCircuitContext(makeSnapshot(), {
        limits: {
          maxSerializedBytes: 24,
        },
      }),
    ).toThrowError(BackendBrokerCircuitContextError);
  });
});

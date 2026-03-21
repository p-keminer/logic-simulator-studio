import '../setup';
import '../../core/registry/index';
import { describe, expect, it } from 'vitest';
import {
  BACKEND_SANDBOX_BRIDGE_VERSION,
  createBackendSandboxCurrentCircuitSnapshot,
  summarizeBackendSandboxCurrentCircuitSnapshot,
} from '../../core/io/backendSandboxSnapshot';
import type { Circuit, GateInstance, SignalState, Wire } from '../../core/types';

const defaultSignal: SignalState = { value: 0, version: 0, lastChangedAt: 0 };

const makeGate = (
  id: string,
  typeId: string,
  overrides: Partial<GateInstance> = {},
): GateInstance => ({
  id,
  typeId,
  x: 0,
  y: 0,
  outputSignals: {},
  customState: {},
  isSelected: false,
  ...overrides,
});

const makeWire = (
  id: string,
  fromGateId: string,
  fromPortId: string,
  toGateId: string,
  toPortId: string,
  overrides: Partial<Wire> = {},
): Wire => ({
  id,
  from: { gateId: fromGateId, portId: fromPortId },
  to: { gateId: toGateId, portId: toPortId },
  signal: { ...defaultSignal },
  isSelected: false,
  ...overrides,
});

const makeCircuit = (
  gates: GateInstance[],
  wires: Wire[] = [],
  overrides: Partial<Circuit> = {},
): Circuit => ({
  id: 'circuit-backend-sandbox-1',
  name: 'Backend sandbox demo',
  version: '1.0.0',
  gates: Object.fromEntries(gates.map((gate) => [gate.id, gate])),
  wires: Object.fromEntries(wires.map((wire) => [wire.id, wire])),
  viewport: { panX: 0, panY: 0, zoom: 1 },
  metadata: { createdAt: '2026-03-21', updatedAt: '2026-03-21' },
  ...overrides,
});

describe('backend sandbox current-circuit snapshot', () => {
  it('maps the live circuit state onto the sandbox bridge snapshot shape', () => {
    const circuit = makeCircuit(
      [
        makeGate('input-a', 'INPUT_SWITCH', { label: 'A' }),
        makeGate('logic-and-1', 'AND', { isSelected: true }),
        makeGate('output-y', 'OUTPUT_LED', { label: 'Y' }),
        makeGate('note-1', 'TEXT_NOTE'),
      ],
      [
        makeWire('wire-a', 'input-a', 'out', 'logic-and-1', 'a'),
        makeWire('wire-y', 'logic-and-1', 'out', 'output-y', 'in', {
          isSelected: true,
        }),
      ],
    );

    const snapshot = createBackendSandboxCurrentCircuitSnapshot(circuit);
    const summary = summarizeBackendSandboxCurrentCircuitSnapshot(snapshot);

    expect(snapshot).toEqual({
      bridgeVersion: BACKEND_SANDBOX_BRIDGE_VERSION,
      openCircuit: {
        circuitId: 'circuit-backend-sandbox-1',
        title: 'Backend sandbox demo',
        selection: {
          activeElementIds: ['logic-and-1', 'wire-y'],
        },
        elements: {
          nodes: [
            {
              id: 'input-a',
              nodeType: 'INPUT_SWITCH',
              displayName: 'A',
            },
            {
              id: 'note-1',
              nodeType: 'TEXT_NOTE',
              displayName: 'Notiz',
            },
            {
              id: 'output-y',
              nodeType: 'OUTPUT_LED',
              displayName: 'Y',
            },
          ],
          gates: [
            {
              id: 'logic-and-1',
              gateType: 'AND',
              displayName: 'AND',
              pins: {
                inputs: [
                  { gateId: 'logic-and-1', port: 'a' },
                  { gateId: 'logic-and-1', port: 'b' },
                ],
                outputs: [{ gateId: 'logic-and-1', port: 'out' }],
              },
            },
          ],
          wires: [
            {
              source: { gateId: 'input-a', port: 'out' },
              target: { gateId: 'logic-and-1', port: 'a' },
            },
            {
              source: { gateId: 'logic-and-1', port: 'out' },
              target: { gateId: 'output-y', port: 'in' },
            },
          ],
        },
        annotations: {},
      },
    });
    expect(summary).toEqual({
      bridgeVersion: BACKEND_SANDBOX_BRIDGE_VERSION,
      circuitId: 'circuit-backend-sandbox-1',
      gateCount: 1,
      nodeCount: 3,
      selectedElementCount: 2,
      snapshotFingerprint:
        'circuit-backend-sandbox-1|logic-and-1,wire-y|input-a,note-1,output-y|logic-and-1|input-a:out->logic-and-1:a,logic-and-1:out->output-y:in|0',
      unresolvedGateTypeCount: 0,
      wireCount: 2,
    });
    expect(JSON.stringify(snapshot)).not.toContain('outputSignals');
    expect(JSON.stringify(snapshot)).not.toContain('customState');
  });

  it('falls back to a safe gate stub and debug count when a gate type is unresolved', () => {
    const circuit = makeCircuit([
      makeGate('unknown-1', 'UNKNOWN_GATE', {
        label: 'Unbekannt',
        isSelected: true,
      }),
    ]);

    const snapshot = createBackendSandboxCurrentCircuitSnapshot(circuit);
    const summary = summarizeBackendSandboxCurrentCircuitSnapshot(snapshot);

    expect(snapshot.openCircuit.elements.nodes).toEqual([]);
    expect(snapshot.openCircuit.elements.gates).toEqual([
      {
        id: 'unknown-1',
        gateType: 'UNKNOWN_GATE',
        displayName: 'Unbekannt',
        pins: {
          inputs: [],
          outputs: [],
        },
      },
    ]);
    expect(summary.unresolvedGateTypeCount).toBe(1);
    expect(summary.snapshotFingerprint).toContain('|1');
  });
});

import { describe, expect, it } from 'vitest';
import { circuitContextSchema } from '../../src/contracts/circuit-context';
import {
  defaultCircuitContextLimits,
  reduceCircuitContext,
} from '../../src/modules/circuit-context/circuit-context-reducer';
import {
  createManipulatedCircuitFixture,
  createOversizedCircuitFixture,
  createWhitelistedCircuitFixture,
} from './fixtures';

describe('circuit context pipeline', () => {
  it('maps only the whitelisted active circuit fields', () => {
    const result = reduceCircuitContext(createWhitelistedCircuitFixture());

    expect(result).not.toBeNull();
    expect(result?.scope).toBe('active-circuit');
    expect(result?.circuitId).toBe('active-demo');
    expect(result?.circuitName).toBe('Demo Circuit With Extra UI State');
    expect(result?.selectedElementIds).toEqual(['gate-a', 'node-in']);
    expect(result?.nodes[0]).toEqual({
      id: 'node-in',
      kind: 'input-pin',
      label: 'Input A',
    });
    expect(result?.gates[0]).toEqual({
      id: 'gate-a',
      type: 'and',
      label: 'Main And Gate',
      inputs: [
        { gateId: 'gate-a', port: 'in-1' },
        { gateId: 'gate-a', port: 'in-2' },
      ],
      outputs: [{ gateId: 'gate-a', port: 'out' }],
    });
    expect(result?.connections[0]).toEqual({
      from: { gateId: 'gate-a', port: 'out' },
      to: { gateId: 'gate-a', port: 'in-1' },
    });
    expect(result?.notes).toBe(
      'Explain only the active circuit, not project-wide state.',
    );
    expect(circuitContextSchema.safeParse(result).success).toBe(true);
    expect(JSON.stringify(result)).not.toContain('uiPanelState');
    expect(JSON.stringify(result)).not.toContain('debugOnlyColor');
  });

  it('normalizes manipulated circuit input and records reduction reasons', () => {
    const result = reduceCircuitContext(createManipulatedCircuitFixture(), {
      limits: {
        ...defaultCircuitContextLimits,
        maxLabelLength: 48,
        maxNotesLength: 120,
      },
    });

    expect(result).not.toBeNull();
    expect(result?.selectedElementIds).toEqual(['gate-1']);
    expect(result?.nodes).toHaveLength(1);
    expect(result?.gates).toHaveLength(1);
    expect(result?.connections).toHaveLength(1);
    expect(result?.gates[0]?.label?.length).toBeLessThanOrEqual(48);
    expect(result?.notes?.length).toBeLessThanOrEqual(120);
    expect(result?.reduction?.wasReduced).toBe(true);
    expect(result?.reduction?.reasons).toEqual(
      expect.arrayContaining([
        'invalid-entries-removed',
        'duplicate-entries-removed',
        'selected-elements-trimmed',
      ]),
    );
  });

  it('reduces oversized circuit payloads deterministically to configured limits', () => {
    const limits = {
      ...defaultCircuitContextLimits,
      maxNodes: 8,
      maxGates: 6,
      maxConnections: 10,
      maxSelectedElementIds: 5,
      maxNotesLength: 180,
      maxSerializedBytes: 3_000,
    };
    const result = reduceCircuitContext(createOversizedCircuitFixture(), {
      limits,
    });

    expect(result).not.toBeNull();
    expect(result?.nodes.length).toBeLessThanOrEqual(limits.maxNodes);
    expect(result?.gates.length).toBeLessThanOrEqual(limits.maxGates);
    expect(result?.connections.length).toBeLessThanOrEqual(
      limits.maxConnections,
    );
    expect(result?.selectedElementIds.length).toBeLessThanOrEqual(
      limits.maxSelectedElementIds,
    );
    expect(result?.reduction?.wasReduced).toBe(true);
    expect(result?.reduction?.reasons).toEqual(
      expect.arrayContaining([
        'nodes-trimmed',
        'gates-trimmed',
        'connections-trimmed',
        'selected-elements-trimmed',
      ]),
    );
    expect(result?.reduction?.serializedBytes).toBeLessThanOrEqual(
      limits.maxSerializedBytes,
    );
    expect(Buffer.byteLength(JSON.stringify(result), 'utf8')).toBeLessThanOrEqual(
      limits.maxSerializedBytes,
    );
  });

  it('rejects payloads that remain oversized after the sandbox reduction fallback', () => {
    expect(() =>
      reduceCircuitContext(createOversizedCircuitFixture(2, 2, 2), {
        limits: {
          ...defaultCircuitContextLimits,
          maxNodes: 0,
          maxGates: 0,
          maxConnections: 0,
          maxSelectedElementIds: 0,
          maxNotesLength: 0,
          maxSerializedBytes: 8,
        },
      }),
    ).toThrow(/remains too large after sandbox reduction/i);
  });
});

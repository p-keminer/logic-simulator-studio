import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const loadProviderModule = () =>
  import('../../src/modules/circuit-context/file-current-circuit-snapshot-provider');

afterEach(() => {
  vi.doUnmock('node:fs/promises');
  vi.resetModules();
});

describe('file current circuit snapshot provider', () => {
  it('reads a valid current-circuit snapshot from a local sandbox JSON file', async () => {
    const { FileCurrentCircuitSnapshotProvider } = await loadProviderModule();
    const provider = new FileCurrentCircuitSnapshotProvider({
      snapshotPath: 'fixtures/current-circuit.snapshot.json',
    });

    await expect(provider.getCurrentCircuit()).resolves.toEqual(
      expect.objectContaining({
        bridgeVersion: 'sandbox-app-bridge-v1',
        openCircuit: expect.objectContaining({
          circuitId: 'file-circuit-1',
        }),
      }),
    );
    expect(provider.describe()).toEqual({
      bridgeVersion: 'sandbox-app-bridge-v1',
      providerId: 'file-current-circuit-snapshot-provider',
      providerMode: 'adapter',
      supportsCurrentCircuit: true,
    });
  });

  it('returns null when the configured sandbox snapshot file does not exist', async () => {
    const { FileCurrentCircuitSnapshotProvider } = await loadProviderModule();
    const provider = new FileCurrentCircuitSnapshotProvider({
      snapshotPath: 'fixtures/current-circuit.missing.json',
    });

    await expect(provider.getCurrentCircuit()).resolves.toBeNull();
  });

  it('rejects snapshot paths that would leave the sandbox', async () => {
    const { FileCurrentCircuitSnapshotProvider } = await loadProviderModule();
    expect(
      () =>
        new FileCurrentCircuitSnapshotProvider({
          snapshotPath: '../README.md',
        }),
    ).toThrowError(/must stay inside the sandbox/i);
  });

  it('fails with a sandbox error when the snapshot file contains invalid JSON', async () => {
    const { FileCurrentCircuitSnapshotProvider } = await loadProviderModule();
    const provider = new FileCurrentCircuitSnapshotProvider({
      snapshotPath: 'fixtures/current-circuit.invalid-json.json',
    });

    await expect(provider.getCurrentCircuit()).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });
  });

  it('fails with validation details when the snapshot file does not match the bridge contract', async () => {
    const { FileCurrentCircuitSnapshotProvider } = await loadProviderModule();
    const provider = new FileCurrentCircuitSnapshotProvider({
      snapshotPath: 'fixtures/current-circuit.invalid-shape.json',
    });

    await expect(provider.getCurrentCircuit()).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      details: expect.objectContaining({
        issues: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
          }),
        ]),
      }),
    });
  });

  it('rejects snapshot files whose real path escapes outside the sandbox root', async () => {
    const outsideResolvedPath = resolve(process.cwd(), '..', 'README.md');

    vi.doMock('node:fs/promises', async () => {
      const actual = await vi.importActual<typeof import('node:fs/promises')>(
        'node:fs/promises',
      );
      const sandboxFixtureSuffix = `${resolve(
        'fixtures',
        'current-circuit.snapshot.json',
      )}`;

      return {
        ...actual,
        realpath: vi.fn(async (targetPath: string) => {
          if (
            targetPath.endsWith(sandboxFixtureSuffix) ||
            targetPath.endsWith('fixtures/current-circuit.snapshot.json') ||
            targetPath.endsWith('fixtures\\current-circuit.snapshot.json')
          ) {
            return outsideResolvedPath;
          }

          return actual.realpath(targetPath);
        }),
      };
    });

    const { FileCurrentCircuitSnapshotProvider } = await loadProviderModule();
    const provider = new FileCurrentCircuitSnapshotProvider({
      snapshotPath: 'fixtures/current-circuit.snapshot.json',
    });

    await expect(provider.getCurrentCircuit()).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
    });
  });
});

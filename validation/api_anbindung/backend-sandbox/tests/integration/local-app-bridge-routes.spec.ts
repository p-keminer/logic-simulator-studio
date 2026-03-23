import { Writable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/create-app';
import { FixtureCurrentCircuitSnapshotProvider } from '../../src/modules/circuit-context/fixture-current-circuit-snapshot-provider';
import type { CurrentCircuitSnapshotProvider } from '../../src/modules/circuit-context/current-circuit-snapshot-provider';

class MemoryLogStream extends Writable {
  private readonly chunks: string[] = [];

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }

  public dump(): string {
    return this.chunks.join('');
  }
}

const appsToClose = new Set<Awaited<ReturnType<typeof createApp>>>();

afterEach(async () => {
  for (const app of appsToClose) {
    await app.close();
  }

  appsToClose.clear();
});

const issueSession = async (app: Awaited<ReturnType<typeof createApp>>) => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/session/key',
    payload: {
      apiKey: 'sk-local-app-bridge-1234567890',
    },
  });

  expect(response.statusCode).toBe(201);

  return response.json<{ sessionId: string }>().sessionId;
};

const createRouteApp = async () => {
  const loggerStream = new MemoryLogStream();
  const app = createApp({
    config: {
      devResponseDelayMs: 0,
      host: '127.0.0.1',
      logLevel: 'debug',
      port: 8787,
      sessionTtlSeconds: 300,
    },
    currentCircuitSnapshotProvider: new FixtureCurrentCircuitSnapshotProvider(),
    enableLocalAppBridgeRoutes: true,
    loggerStream,
  });

  appsToClose.add(app);

  return {
    app,
    loggerStream,
    sessionId: await issueSession(app),
  };
};

const createUnavailableProvider = (): CurrentCircuitSnapshotProvider => ({
  describe() {
    return {
      providerId: 'unconfigured-current-circuit-provider',
      providerMode: 'unconfigured',
      bridgeVersion: 'sandbox-app-bridge-v1',
      supportsCurrentCircuit: false,
    };
  },
  async getCurrentCircuit() {
    return null;
  },
});

describe('local app bridge routes', () => {
  it('exposes fixture-backed bridge capabilities only for an active session', async () => {
    const { app, loggerStream, sessionId } = await createRouteApp();
    const response = await app.inject({
      headers: {
        'x-session-id': sessionId,
      },
      method: 'GET',
      url: '/v1/local-app-bridge/capabilities',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      bridgeVersion: 'sandbox-app-bridge-v1',
      providerId: 'fixture-current-circuit-snapshot-provider',
      providerMode: 'fixture',
      supportsCurrentCircuit: true,
      endpoints: {
        capabilities: '/v1/local-app-bridge/capabilities',
        currentCircuit: '/v1/local-app-bridge/current-circuit',
      },
    });
    expect(loggerStream.dump()).toContain(
      'local app bridge capabilities requested',
    );
  }, 15_000);

  it('rejects local app bridge reads when no active session header is present', async () => {
    const { app } = await createRouteApp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/local-app-bridge/capabilities',
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toContain('UNAUTHORIZED');
  }, 15_000);

  it('returns the current circuit snapshot through the fixture provider route', async () => {
    const { app, loggerStream, sessionId } = await createRouteApp();
    const response = await app.inject({
      headers: {
        'x-session-id': sessionId,
      },
      method: 'GET',
      url: '/v1/local-app-bridge/current-circuit',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('fixture-circuit-1');
    expect(response.body).toContain('sandbox-app-bridge-v1');
    expect(response.body).not.toContain('apiKey');
    expect(loggerStream.dump()).toContain(
      'local app bridge current circuit requested',
    );
  }, 15_000);

  it('serves the current circuit snapshot from the sandbox file adapter when configured', async () => {
    const loggerStream = new MemoryLogStream();
    const app = createApp({
      config: {
        devResponseDelayMs: 0,
        host: '127.0.0.1',
        logLevel: 'debug',
        port: 8787,
        sessionTtlSeconds: 300,
      },
      currentCircuitSnapshotFilePath: 'fixtures/current-circuit.snapshot.json',
      enableLocalAppBridgeRoutes: true,
      loggerStream,
    });

    appsToClose.add(app);
    const sessionId = await issueSession(app);

    const capabilitiesResponse = await app.inject({
      headers: {
        'x-session-id': sessionId,
      },
      method: 'GET',
      url: '/v1/local-app-bridge/capabilities',
    });
    const currentCircuitResponse = await app.inject({
      headers: {
        'x-session-id': sessionId,
      },
      method: 'GET',
      url: '/v1/local-app-bridge/current-circuit',
    });

    expect(capabilitiesResponse.statusCode).toBe(200);
    expect(capabilitiesResponse.json()).toEqual({
      bridgeVersion: 'sandbox-app-bridge-v1',
      providerId: 'file-current-circuit-snapshot-provider',
      providerMode: 'adapter',
      supportsCurrentCircuit: true,
      endpoints: {
        capabilities: '/v1/local-app-bridge/capabilities',
        currentCircuit: '/v1/local-app-bridge/current-circuit',
      },
    });
    expect(currentCircuitResponse.statusCode).toBe(200);
    expect(currentCircuitResponse.body).toContain('file-circuit-1');
    expect(currentCircuitResponse.body).toContain('"providerMode":"adapter"');
    expect(loggerStream.dump()).toContain(
      'local app bridge current circuit requested',
    );
  }, 15_000);

  it('returns not found when the provider reports no current circuit snapshot', async () => {
    const loggerStream = new MemoryLogStream();
    const app = createApp({
      config: {
        devResponseDelayMs: 0,
        host: '127.0.0.1',
        logLevel: 'debug',
        port: 8787,
        sessionTtlSeconds: 300,
      },
      currentCircuitSnapshotProvider: createUnavailableProvider(),
      enableLocalAppBridgeRoutes: true,
      loggerStream,
    });

    appsToClose.add(app);
    const sessionId = await issueSession(app);

    const response = await app.inject({
      headers: {
        'x-session-id': sessionId,
      },
      method: 'GET',
      url: '/v1/local-app-bridge/current-circuit',
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain('NOT_FOUND');
  }, 15_000);

  it('rejects local app bridge reads when the provided session is no longer active', async () => {
    const loggerStream = new MemoryLogStream();
    const app = createApp({
      config: {
        devResponseDelayMs: 0,
        host: '127.0.0.1',
        logLevel: 'debug',
        port: 8787,
        sessionTtlSeconds: 300,
      },
      currentCircuitSnapshotProvider: new FixtureCurrentCircuitSnapshotProvider(),
      enableLocalAppBridgeRoutes: true,
      loggerStream,
    });

    appsToClose.add(app);

    const sessionId = await issueSession(app);
    const deletionResponse = await app.inject({
      method: 'DELETE',
      url: '/v1/session/key',
      payload: { sessionId },
    });

    expect(deletionResponse.statusCode).toBe(200);

    const response = await app.inject({
      headers: {
        'x-session-id': sessionId,
      },
      method: 'GET',
      url: '/v1/local-app-bridge/current-circuit',
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toContain('UNAUTHORIZED');
  }, 15_000);

  it('does not expose local app bridge routes when they are not enabled', async () => {
    const loggerStream = new MemoryLogStream();
    const app = createApp({
      config: {
        devResponseDelayMs: 0,
        host: '127.0.0.1',
        logLevel: 'debug',
        port: 8787,
        sessionTtlSeconds: 300,
      },
      loggerStream,
    });

    appsToClose.add(app);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/local-app-bridge/capabilities',
    });

    expect(response.statusCode).toBe(404);
  }, 15_000);
});

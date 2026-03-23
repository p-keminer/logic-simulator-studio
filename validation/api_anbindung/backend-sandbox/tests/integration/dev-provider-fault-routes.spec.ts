import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/create-app';
import {
  defaultCircuitContextLimits,
  reduceCircuitContext,
} from '../../src/modules/circuit-context/circuit-context-reducer';
import { createOversizedCircuitFixture } from '../circuit-context/fixtures';

const appsToClose = new Set<Awaited<ReturnType<typeof createApp>>>();

afterEach(async () => {
  for (const app of appsToClose) {
    await app.close();
  }

  appsToClose.clear();
});

const createReducedCircuitContext = () =>
  reduceCircuitContext(createOversizedCircuitFixture(), {
    limits: {
      ...defaultCircuitContextLimits,
      maxNodes: 6,
      maxGates: 5,
      maxConnections: 8,
      maxSelectedElementIds: 4,
      maxNotesLength: 160,
      maxSerializedBytes: 2_400,
    },
  })!;

describe('dev provider fault routes', () => {
  it('injects a one-shot provider timeout that is consumed by the next chat request', async () => {
    const app = createApp({
      config: {
        devResponseDelayMs: 0,
        host: '127.0.0.1',
        logLevel: 'info',
        port: 8787,
        sessionTtlSeconds: 300,
      },
    });
    appsToClose.add(app);

    const createSessionResponse = await app.inject({
      method: 'POST',
      url: '/v1/session/key',
      payload: {
        apiKey: 'sk-dev-provider-fault-1234567890abcd',
      },
    });
    const created = createSessionResponse.json<{
      sessionId: string;
    }>();

    const armFaultResponse = await app.inject({
      method: 'POST',
      url: '/v1/dev/provider-fault',
      payload: {
        mode: 'timeout',
      },
    });

    expect(armFaultResponse.statusCode).toBe(200);
    expect(armFaultResponse.json()).toEqual({
      armed: true,
      mode: 'timeout',
      ok: true,
    });

    const firstChatResponse = await app.inject({
      method: 'POST',
      url: '/v1/chat/request',
      payload: {
        sessionId: created.sessionId,
        message: 'Explain the active circuit timing.',
        circuitContext: createReducedCircuitContext(),
      },
    });

    expect(firstChatResponse.statusCode).toBe(504);
    expect(firstChatResponse.body).toContain('UPSTREAM_UNAVAILABLE');
    expect(firstChatResponse.body).toContain('"providerCode":"timeout"');

    const secondChatResponse = await app.inject({
      method: 'POST',
      url: '/v1/chat/request',
      payload: {
        sessionId: created.sessionId,
        message: 'Explain the active circuit timing again.',
        circuitContext: createReducedCircuitContext(),
      },
    });

    expect(secondChatResponse.statusCode).toBe(202);
    expect(secondChatResponse.body).toContain('"circuitContextVersion":"v1"');
  });
});

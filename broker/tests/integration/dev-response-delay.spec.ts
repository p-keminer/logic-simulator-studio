import { performance } from 'node:perf_hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/create-app';

const appsToClose = new Set<Awaited<ReturnType<typeof createApp>>>();

afterEach(async () => {
  for (const app of appsToClose) {
    await app.close();
  }

  appsToClose.clear();
});

const createDelayedApp = (delayMs: number) => {
  const app = createApp({
    config: {
      devResponseDelayMs: delayMs,
      host: '127.0.0.1',
      logLevel: 'silent',
      port: 8787,
      sessionTtlSeconds: 300,
    },
  });

  appsToClose.add(app);
  return app;
};

describe('sandbox dev response delay', () => {
  it('delays broker routes when a dev response delay is configured', async () => {
    const app = createDelayedApp(40);
    const startedAt = performance.now();

    const response = await app.inject({
      method: 'POST',
      payload: {
        apiKey: 'sk-delay-test-1234567890abcd',
      },
      url: '/v1/session/key',
    });

    const elapsedMs = performance.now() - startedAt;

    expect(response.statusCode).toBe(201);
    expect(elapsedMs).toBeGreaterThanOrEqual(30);
  });

  it('does not delay non-broker health routes', async () => {
    const app = createDelayedApp(40);
    const startedAt = performance.now();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const elapsedMs = performance.now() - startedAt;

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: 'logic-simulator-broker',
      status: 'healthy',
    });
    expect(elapsedMs).toBeLessThan(30);
  });
});

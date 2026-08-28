import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/create-app';

const appsToClose = new Set<Awaited<ReturnType<typeof createApp>>>();

afterEach(async () => {
  for (const app of appsToClose) {
    await app.close();
  }

  appsToClose.clear();
});

const createCorsTestApp = () => {
  const app = createApp({
    config: {
      devResponseDelayMs: 0,
      host: '127.0.0.1',
      logLevel: 'silent',
      port: 8787,
      sessionTtlSeconds: 300,
    },
  });

  appsToClose.add(app);
  return app;
};

describe('sandbox local cors policy', () => {
  it('answers browser preflight for localhost app origins on broker routes', async () => {
    const app = createCorsTestApp();

    const response = await app.inject({
      headers: {
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
        origin: 'http://127.0.0.1:5173',
      },
      method: 'OPTIONS',
      url: '/v1/session/key',
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://127.0.0.1:5173',
    );
    expect(String(response.headers['access-control-allow-methods'])).toContain(
      'POST',
    );
    expect(String(response.headers['access-control-allow-headers'])).toContain(
      'content-type',
    );
  });

  it('does not grant browser cors access to non-local origins', async () => {
    const app = createCorsTestApp();

    const response = await app.inject({
      headers: {
        'access-control-request-method': 'POST',
        origin: 'https://evil.example.com',
      },
      method: 'OPTIONS',
      url: '/v1/session/key',
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

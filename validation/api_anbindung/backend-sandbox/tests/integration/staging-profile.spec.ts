import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/create-app';
import { loadConfig } from '../../src/shared/config';

const appsToClose = new Set<ReturnType<typeof createApp>>();

afterEach(async () => {
  for (const app of appsToClose) {
    await app.close();
  }

  appsToClose.clear();
});

describe('staging profile', () => {
  it('requires explicit allowed origins outside development', () => {
    expect(() =>
      loadConfig({
        APP_ENV: 'staging',
      }),
    ).toThrow('ALLOWED_ORIGINS must be configured');
  });

  it('exposes environment metadata, respects configured origins, and disables dev fault routes in staging', async () => {
    const app = createApp({
      config: loadConfig({
        ALLOWED_ORIGINS: 'https://staging.logic-simulator.example',
        APP_ENV: 'staging',
        HOST: '0.0.0.0',
        PORT: '8787',
      }),
    });
    appsToClose.add(app);

    const healthResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });
    const readyResponse = await app.inject({
      method: 'GET',
      url: '/ready',
    });
    const corsResponse = await app.inject({
      method: 'OPTIONS',
      url: '/v1/session/key',
      headers: {
        origin: 'https://staging.logic-simulator.example',
        'access-control-request-method': 'POST',
      },
    });
    const rejectedCorsResponse = await app.inject({
      method: 'OPTIONS',
      url: '/v1/session/key',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
      },
    });
    const devFaultResponse = await app.inject({
      method: 'POST',
      url: '/v1/dev/provider-fault',
      payload: {
        mode: 'timeout',
      },
    });

    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json()).toEqual({
      devEndpointsEnabled: false,
      environment: 'staging',
      ok: true,
      service: 'backend-sandbox',
      status: 'healthy',
    });
    expect(readyResponse.statusCode).toBe(200);
    expect(readyResponse.json()).toEqual({
      devEndpointsEnabled: false,
      environment: 'staging',
      ok: true,
      service: 'backend-sandbox',
      status: 'ready',
    });
    expect(corsResponse.statusCode).toBe(204);
    expect(corsResponse.headers['access-control-allow-origin']).toBe(
      'https://staging.logic-simulator.example',
    );
    expect(rejectedCorsResponse.headers['access-control-allow-origin']).toBeUndefined();
    expect(devFaultResponse.statusCode).toBe(404);
  });
});

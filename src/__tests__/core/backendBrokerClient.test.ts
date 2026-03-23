import '../setup';
import { describe, expect, it, vi } from 'vitest';
import {
  BackendBrokerClient,
  DEFAULT_BACKEND_BROKER_BASE_URL,
  normalizeBackendBrokerBaseUrl,
} from '../../core/backendBroker/client';
import { BackendBrokerApiError } from '../../core/backendBroker/errors';

describe('backend broker client', () => {
  it('binds the default browser fetch before storing it for later requests', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn(function (this: typeof globalThis) {
      expect(this).toBe(globalThis);

      return Promise.resolve(
        new Response(
          JSON.stringify({
            sessionId: 'bound-fetch-session',
            issuedAt: '2026-03-23T04:00:00.000Z',
            expiresAt: '2026-03-23T04:05:00.000Z',
            status: 'active',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
            },
            status: 201,
          },
        ),
      );
    }) as typeof fetch;

    globalThis.fetch = fetchSpy;

    try {
      const client = new BackendBrokerClient();

      await expect(
        client.registerSessionKey('sk-broker-test-1234567890'),
      ).resolves.toEqual({
        sessionId: 'bound-fetch-session',
        issuedAt: '2026-03-23T04:00:00.000Z',
        expiresAt: '2026-03-23T04:05:00.000Z',
        status: 'active',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('normalizes root and v1-prefixed broker base urls', () => {
    expect(normalizeBackendBrokerBaseUrl('http://127.0.0.1:8787')).toBe(
      DEFAULT_BACKEND_BROKER_BASE_URL,
    );
    expect(normalizeBackendBrokerBaseUrl('http://127.0.0.1:8787/v1/')).toBe(
      DEFAULT_BACKEND_BROKER_BASE_URL,
    );
    expect(normalizeBackendBrokerBaseUrl('http://127.0.0.1:8787/api')).toBe(
      'http://127.0.0.1:8787/api/v1',
    );
  });

  it('posts session registration and parses the broker response', async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('http://127.0.0.1:8787/v1/session/key');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        apiKey: 'sk-broker-test-1234567890',
      });

      return new Response(
        JSON.stringify({
          sessionId: 'f8566fef-908d-427c-b38f-bcbaf8f4ec4b',
          issuedAt: '2026-03-21T11:00:00.000Z',
          expiresAt: '2026-03-21T11:05:00.000Z',
          status: 'active',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 201,
        },
      );
    }) as typeof fetch;
    const client = new BackendBrokerClient({ fetchFn });

    await expect(
      client.registerSessionKey('sk-broker-test-1234567890'),
    ).resolves.toEqual({
      sessionId: 'f8566fef-908d-427c-b38f-bcbaf8f4ec4b',
      issuedAt: '2026-03-21T11:00:00.000Z',
      expiresAt: '2026-03-21T11:05:00.000Z',
      status: 'active',
    });
  });

  it('surfaces broker error envelopes as typed api errors', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 'RATE_LIMITED',
            message: 'Session key registration is rate limited in the sandbox.',
            requestId: 'req-rate-1',
            details: {
              retryAfterSeconds: 42,
            },
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 429,
        },
      ),
    ) as typeof fetch;
    const client = new BackendBrokerClient({ fetchFn });

    await expect(
      client.registerSessionKey('sk-broker-rate-limit-1234567890'),
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      requestId: 'req-rate-1',
      statusCode: 429,
    });
  });

  it('throws a typed api error when the broker returns a non-success response', async () => {
    const fetchFn = vi.fn(async () => new Response('boom', { status: 503 })) as typeof fetch;
    const client = new BackendBrokerClient({ fetchFn });

    await expect(
      client.resetChat({
        sessionId: 'f8566fef-908d-427c-b38f-bcbaf8f4ec4b',
      }),
    ).rejects.toBeInstanceOf(BackendBrokerApiError);
  });
});

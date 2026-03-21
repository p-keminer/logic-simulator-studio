import { Writable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/create-app';
import { InMemoryAuditSink } from '../../src/modules/audit-and-observability/audit-events';
import { InMemoryMetricsSink } from '../../src/modules/audit-and-observability/metrics';
import type { RateLimitConfig } from '../../src/modules/policy-guardrails/policy-types';

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

const createTestApp = (options?: {
  sessionKeyRateLimit?: RateLimitConfig;
}) => {
  const loggerStream = new MemoryLogStream();
  const auditSink = new InMemoryAuditSink();
  const metricsSink = new InMemoryMetricsSink();
  const app = createApp({
    auditSink,
    config: {
      host: '127.0.0.1',
      logLevel: 'info',
      port: 8787,
      sessionTtlSeconds: 300,
    },
    loggerStream,
    metricsSink,
    sessionKeyRateLimit: options?.sessionKeyRateLimit,
  });

  appsToClose.add(app);

  return { app, auditSink, loggerStream, metricsSink };
};

describe('session route security', () => {
  it(
    'does not echo or log the raw key when registering a session',
    async () => {
      const rawKey = 'sk-route-secret-1234567890abcd';
      const { app, loggerStream } = createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/v1/session/key',
        payload: {
          apiKey: rawKey,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.body).not.toContain(rawKey);
      expect(loggerStream.dump()).not.toContain(rawKey);
    },
    15_000,
  );

  it('does not echo or log the raw key when validation fails', async () => {
    const rawKey = 'leaky-short-key';
    const { app, loggerStream } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/session/key',
      payload: {
        apiKey: rawKey,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).not.toContain(rawKey);
    expect(loggerStream.dump()).not.toContain(rawKey);
  });

  it('deletes a session through the route without ever requiring the raw key again', async () => {
    const { app, auditSink, loggerStream, metricsSink } = createTestApp();
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/session/key',
      payload: {
        apiKey: 'sk-route-delete-1234567890abcd',
      },
    });
    const created = createResponse.json<{
      sessionId: string;
    }>();

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/v1/session/key',
      payload: {
        sessionId: created.sessionId,
      },
    });

    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteResponse.body).toContain(created.sessionId);
    expect(deleteResponse.body).not.toContain('sk-route-delete-1234567890abcd');
    expect(loggerStream.dump()).not.toContain('sk-route-delete-1234567890abcd');
    expect(auditSink.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'session.key.registered',
          sessionId: created.sessionId,
        }),
        expect.objectContaining({
          type: 'session.key.deleted',
          sessionId: created.sessionId,
        }),
      ]),
    );
    expect([...metricsSink.counts.keys()].join('\n')).toContain(
      'session_key_registered_total',
    );
    expect([...metricsSink.counts.keys()].join('\n')).toContain(
      'session_key_deleted_total',
    );
  });

  it('rate limits repeated session key registrations without exposing the raw key', async () => {
    const rawKey = 'sk-route-rate-limit-1234567890abcd';
    const { app, auditSink, loggerStream, metricsSink } = createTestApp({
      sessionKeyRateLimit: {
        maxRequests: 1,
        name: 'session-key',
        windowMs: 60_000,
      },
    });

    const first = await app.inject({
      method: 'POST',
      url: '/v1/session/key',
      payload: {
        apiKey: rawKey,
      },
    });
    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/session/key',
      payload: {
        apiKey: rawKey,
      },
    });

    expect(first.statusCode).toBe(201);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).not.toContain(rawKey);
    expect(loggerStream.dump()).not.toContain(rawKey);
    expect(blocked.body).toContain('RATE_LIMITED');
    expect(auditSink.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'rate-limit.blocked',
        }),
      ]),
    );
    expect([...metricsSink.counts.keys()].join('\n')).toContain(
      'rate_limit_blocked_total',
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  InMemoryAuditSink,
  type AuditEvent,
} from '../../src/modules/audit-and-observability/audit-events';
import { InMemoryMetricsSink } from '../../src/modules/audit-and-observability/metrics';
import {
  redactSensitiveText,
  redactSensitiveValue,
} from '../../src/modules/audit-and-observability/redaction';

describe('audit and observability scaffold', () => {
  it('keeps redaction, audit, and metrics isolated from secrets', () => {
    const auditSink = new InMemoryAuditSink();
    const metricsSink = new InMemoryMetricsSink();
    const event: AuditEvent = {
      type: 'provider.requested',
      at: '2026-03-21T00:00:00.000Z',
      sessionId: 'session-1',
      details: {
        provider: 'sandbox-noop',
        requestId: 'req-1',
      },
    };

    auditSink.record(event);
    metricsSink.increment('provider_gateway_requests_total', {
      provider: 'sandbox-noop',
    });
    metricsSink.observe({
      name: 'provider_gateway_latency_ms',
      value: 12,
      tags: {
        provider: 'sandbox-noop',
      },
    });

    expect(
      redactSensitiveText(
        'apiKey=sk-secret-1234567890abcd requestId=req-1 provider=sandbox-noop',
      ),
    ).toContain('[REDACTED]');
    expect(
      redactSensitiveValue({
        apiKey: 'sk-secret-1234567890abcd',
        auth: {
          authorization: 'Bearer header.payload.signature',
        },
        nested: [
          {
            url: 'https://user:super-secret@example.invalid?token=abc123',
          },
        ],
      }),
    ).toEqual({
      apiKey: '[REDACTED]',
      auth: {
        authorization: '[REDACTED]',
      },
      nested: [
        {
          url: 'https://[REDACTED]@example.invalid?token=[REDACTED]',
        },
      ],
    });
    expect(auditSink.events).toEqual([event]);
    expect([...metricsSink.counts.values()]).toEqual([1]);
    expect(metricsSink.samples).toEqual([
      expect.objectContaining({
        name: 'provider_gateway_latency_ms',
      }),
    ]);
  });
});

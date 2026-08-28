import { describe, expect, it } from 'vitest';
import { InMemoryAuditSink } from '../../src/modules/audit-and-observability/audit-events';
import { InMemoryMetricsSink } from '../../src/modules/audit-and-observability/metrics';
import {
  MockFailingProviderClient,
  NoopProviderClient,
} from '../../src/modules/provider-gateway/provider-client';
import { ProviderGatewayError } from '../../src/modules/provider-gateway/provider-error';
import { DefaultProviderGateway } from '../../src/modules/provider-gateway/provider-gateway';

const createPrompt = () => ({
  templateVersion: 'sandbox-chat-v1' as const,
  system: [{ title: 'sandbox-boundary', content: 'Only active circuit.' }],
  circuit: [{ title: 'active-circuit-summary', content: 'gate-count=5' }],
  history: [{ title: 'history-turn-1', content: 'Earlier turn.' }],
  user: [{ title: 'active-user-request', content: 'Explain the circuit.' }],
  renderedPrompt:
    '# SANDBOX CHAT TEMPLATE sandbox-chat-v1\nconversationId=sandbox-conversation-1',
});

const createLogger = () => {
  const entries: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    bindings: Record<string, unknown>;
    message: string;
  }> = [];

  return {
    entries,
    logger: {
      debug(bindings: Record<string, unknown>, message: string) {
        entries.push({ level: 'debug', bindings, message });
      },
      info(bindings: Record<string, unknown>, message: string) {
        entries.push({ level: 'info', bindings, message });
      },
      warn(bindings: Record<string, unknown>, message: string) {
        entries.push({ level: 'warn', bindings, message });
      },
      error(bindings: Record<string, unknown>, message: string) {
        entries.push({ level: 'error', bindings, message });
      },
    },
  };
};

describe('provider gateway sandbox flow', () => {
  it('stays provider-neutral while emitting structured debug, audit, and metrics data', async () => {
    const auditSink = new InMemoryAuditSink();
    const metricsSink = new InMemoryMetricsSink();
    const logger = createLogger();
    const gateway = new DefaultProviderGateway(new NoopProviderClient(), {
      auditSink,
      metricsSink,
      logger: logger.logger,
      runtime: {
        allowedHosts: ['sandbox.invalid'],
        maxAttempts: 1,
        model: 'sandbox-stub',
        provider: 'sandbox-noop',
        retryBackoffMs: 250,
        timeoutMs: 1_500,
      },
    });

    const response = await gateway.send({
      requestId: 'req-provider-1',
      sessionId: 'session-1',
      conversationId: 'sandbox-conversation-1',
      prompt: createPrompt(),
    });

    expect(response.status).toBe('stubbed');
    expect(response.provider).toBe('sandbox-noop');
    expect(response.debug).toEqual(
      expect.objectContaining({
        client: 'noop-provider-client',
        requestId: 'req-provider-1',
        dispatchMode: 'noop',
        maxAttempts: 1,
        timeoutMs: 1_500,
        allowedHosts: ['sandbox.invalid'],
        templateVersion: 'sandbox-chat-v1',
      }),
    );
    expect(response.debug.promptFingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(auditSink.events).toEqual([
      expect.objectContaining({
        type: 'provider.requested',
        sessionId: 'session-1',
      }),
      expect.objectContaining({
        type: 'provider.responded',
        sessionId: 'session-1',
      }),
    ]);
    expect([...metricsSink.counts.keys()].join('\n')).toContain(
      'provider_gateway_requests_total',
    );
    expect([...metricsSink.counts.keys()].join('\n')).toContain(
      'provider_gateway_success_total',
    );
    expect(metricsSink.samples).toEqual([
      expect.objectContaining({
        name: 'provider_gateway_latency_ms',
      }),
    ]);
    expect(
      logger.entries.some(
        (entry) =>
          entry.message === 'provider gateway request staged' &&
          entry.bindings.promptFingerprint === response.debug.promptFingerprint,
      ),
    ).toBe(true);
    expect(
      logger.entries.some(
        (entry) => entry.message === 'provider gateway debug summary',
      ),
    ).toBe(true);
  });

  it('logs retry diagnostics and surfaces normalized timeout failures with debug context', async () => {
    const logger = createLogger();
    const gateway = new DefaultProviderGateway(
      new MockFailingProviderClient(
        new ProviderGatewayError(
          'timeout',
          'Provider request timed out.',
          504,
          true,
        ),
      ),
      {
        logger: logger.logger,
        runtime: {
          allowedHosts: ['sandbox.invalid'],
          maxAttempts: 2,
          provider: 'sandbox-noop',
        },
      },
    );

    await expect(
      gateway.send({
        requestId: 'req-provider-timeout',
        sessionId: 'session-1',
        conversationId: 'sandbox-conversation-1',
        prompt: createPrompt(),
      }),
    ).rejects.toMatchObject({
      code: 'timeout',
      retryable: true,
      details: expect.objectContaining({
        attemptCount: 2,
        requestId: 'req-provider-timeout',
      }),
    });

    expect(
      logger.entries.filter(
        (entry) =>
          entry.message ===
          'provider gateway dispatch attempt failed and will be retried',
      ),
    ).toHaveLength(1);
    expect(
      logger.entries.some(
        (entry) =>
          entry.message === 'provider gateway dispatch failed' &&
          entry.bindings.code === 'timeout',
      ),
    ).toBe(true);
  });
});

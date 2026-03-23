import { createHash } from 'node:crypto';
import type { AuditSink } from '../audit-and-observability/audit-events.js';
import type { MetricsSink } from '../audit-and-observability/metrics.js';
import {
  redactSensitiveText,
  redactSensitiveValue,
} from '../audit-and-observability/redaction.js';
import type { PromptEnvelope } from '../prompt-orchestrator/prompt-types.js';
import type { ProviderClient } from './provider-client.js';
import {
  ProviderGatewayError,
  normalizeProviderGatewayError,
} from './provider-error.js';
import type {
  ProviderGatewayLogger,
  ProviderGatewayRequest,
  ProviderGatewayResponse,
  ProviderGatewayRuntime,
} from './provider-types.js';
export type { ProviderGatewayResponse } from './provider-types.js';

export interface ProviderGatewaySendInput {
  readonly requestId?: string;
  readonly sessionId: string;
  readonly conversationId: string;
  readonly prompt: PromptEnvelope;
}

export interface ProviderGateway {
  send(input: ProviderGatewaySendInput): Promise<ProviderGatewayResponse>;
}

export interface ProviderGatewayOptions {
  readonly runtime?: Partial<ProviderGatewayRuntime>;
  readonly logger?: ProviderGatewayLogger;
  readonly clock?: () => Date;
  readonly auditSink?: AuditSink;
  readonly metricsSink?: MetricsSink;
}

const defaultRuntime: ProviderGatewayRuntime = {
  provider: 'sandbox-noop',
  model: 'sandbox-stub',
  allowedHosts: ['sandbox.invalid'],
  timeoutMs: 1_500,
  maxAttempts: 1,
  retryBackoffMs: 250,
};

const noopLogger: ProviderGatewayLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

const isHostAllowedShape = (host: string) =>
  host.length > 0 && !host.includes('://') && !host.includes('/');

const inferDispatchMode = (
  clientName: string,
): 'noop' | 'mock' | 'disconnected' => {
  const normalized = clientName.toLowerCase();

  if (normalized.includes('noop')) {
    return 'noop';
  }

  if (normalized.includes('mock')) {
    return 'mock';
  }

  return 'disconnected';
};

const createPromptFingerprint = (prompt: string) =>
  createHash('sha256').update(prompt).digest('hex').slice(0, 16);

const createRequest = (
  input: ProviderGatewaySendInput,
  runtime: ProviderGatewayRuntime,
): ProviderGatewayRequest => ({
  requestId: input.requestId,
  sessionId: input.sessionId,
  conversationId: input.conversationId,
  prompt: input.prompt,
  runtime,
  debug: {
    renderedBytes: Buffer.byteLength(input.prompt.renderedPrompt, 'utf8'),
    promptFingerprint: createPromptFingerprint(input.prompt.renderedPrompt),
    sectionCounts: {
      system: input.prompt.system.length,
      circuit: input.prompt.circuit.length,
      history: input.prompt.history.length,
      user: input.prompt.user.length,
    },
    templateVersion: input.prompt.templateVersion,
  },
});

export class DefaultProviderGateway implements ProviderGateway {
  private readonly logger: ProviderGatewayLogger;
  private readonly clock: () => Date;
  private readonly runtime: ProviderGatewayRuntime;
  private readonly dispatchMode: 'noop' | 'mock' | 'disconnected';
  private readonly auditSink?: AuditSink;
  private readonly metricsSink?: MetricsSink;

  constructor(
    private readonly client: ProviderClient,
    options: ProviderGatewayOptions = {},
  ) {
    this.logger = options.logger ?? noopLogger;
    this.clock = options.clock ?? (() => new Date());
    this.runtime = {
      ...defaultRuntime,
      ...options.runtime,
    };
    this.dispatchMode = inferDispatchMode(client.name);
    this.auditSink = options.auditSink;
    this.metricsSink = options.metricsSink;
  }

  private validateRuntime(): void {
    if (!this.runtime.provider.trim() || !this.runtime.model.trim()) {
      throw new ProviderGatewayError(
        'config',
        'Provider runtime is missing provider or model information.',
        500,
      );
    }

    if (this.runtime.allowedHosts.length === 0) {
      throw new ProviderGatewayError(
        'host-denied',
        'Provider runtime has no allowlisted hosts.',
        500,
      );
    }

    const invalidHost = this.runtime.allowedHosts.find(
      (host) => !isHostAllowedShape(host.trim()),
    );

    if (invalidHost) {
      throw new ProviderGatewayError(
        'host-denied',
        'Provider runtime contains a non-allowlisted host shape.',
        500,
        false,
        {
          host: invalidHost,
        },
      );
    }

    if (this.runtime.timeoutMs <= 0 || this.runtime.maxAttempts <= 0) {
      throw new ProviderGatewayError(
        'config',
        'Provider runtime timeout and retry settings must be positive.',
        500,
      );
    }
  }

  async send(input: ProviderGatewaySendInput): Promise<ProviderGatewayResponse> {
    this.validateRuntime();
    const request = createRequest(input, this.runtime);

    this.auditSink?.record({
      type: 'provider.requested',
      at: this.clock().toISOString(),
      sessionId: request.sessionId,
      details: {
        provider: request.runtime.provider,
        requestId: request.requestId ?? 'n/a',
        dispatchMode: this.dispatchMode,
      },
    });
    this.metricsSink?.increment('provider_gateway_requests_total', {
      dispatchMode: this.dispatchMode,
      provider: request.runtime.provider,
    });

    this.logger.info(
      {
        allowedHosts: request.runtime.allowedHosts,
        conversationId: request.conversationId,
        maxAttempts: request.runtime.maxAttempts,
        model: request.runtime.model,
        promptRenderedBytes: request.debug.renderedBytes,
        provider: request.runtime.provider,
        requestId: request.requestId,
        retryBackoffMs: request.runtime.retryBackoffMs,
        sectionCounts: request.debug.sectionCounts,
        sessionId: request.sessionId,
        templateVersion: request.debug.templateVersion,
        promptFingerprint: request.debug.promptFingerprint,
        timeoutMs: request.runtime.timeoutMs,
      },
      'provider gateway request staged',
    );

    for (let attempt = 1; attempt <= request.runtime.maxAttempts; attempt += 1) {
      const attemptStartedAt = this.clock().getTime();

      this.logger.debug(
        {
          attempt,
          client: this.client.name,
          conversationId: request.conversationId,
          dispatchMode: this.dispatchMode,
          host: request.runtime.allowedHosts[0],
          promptFingerprint: request.debug.promptFingerprint,
          requestId: request.requestId,
          sessionId: request.sessionId,
          timeoutMs: request.runtime.timeoutMs,
        },
        'provider gateway dispatch attempt starting',
      );

      try {
        const response = await this.client.send(request);
        const latencyMs = this.clock().getTime() - attemptStartedAt;
        const normalizedResponse: ProviderGatewayResponse = {
          ...response,
          debug: {
            ...response.debug,
            latencyMs,
            requestId: request.requestId,
            dispatchMode: this.dispatchMode,
            promptFingerprint: request.debug.promptFingerprint,
            renderedBytes: request.debug.renderedBytes,
            templateVersion: request.debug.templateVersion,
            maxAttempts: request.runtime.maxAttempts,
            timeoutMs: request.runtime.timeoutMs,
            allowedHosts: [...request.runtime.allowedHosts],
            retryBackoffMs: request.runtime.retryBackoffMs,
          },
        };

        this.metricsSink?.increment('provider_gateway_success_total', {
          dispatchMode: this.dispatchMode,
          provider: normalizedResponse.provider,
          status: normalizedResponse.status,
        });
        this.metricsSink?.observe({
          name: 'provider_gateway_latency_ms',
          value: latencyMs,
          tags: {
            dispatchMode: this.dispatchMode,
            provider: normalizedResponse.provider,
            status: normalizedResponse.status,
          },
        });
        this.auditSink?.record({
          type: 'provider.responded',
          at: this.clock().toISOString(),
          sessionId: request.sessionId,
          details: {
            provider: normalizedResponse.provider,
            requestId: request.requestId ?? 'n/a',
            providerStatus: normalizedResponse.status,
            attemptCount: normalizedResponse.debug.attemptCount,
          },
        });

        this.logger.info(
          {
            attempt,
            conversationId: request.conversationId,
            latencyMs,
            model: normalizedResponse.model,
            provider: normalizedResponse.provider,
            providerRequestId: normalizedResponse.providerRequestId,
            requestId: request.requestId,
            sessionId: request.sessionId,
            status: normalizedResponse.status,
            usage: normalizedResponse.usage,
          },
          'provider gateway response received',
        );

        this.logger.debug(
          {
            providerDebug: normalizedResponse.debug,
            requestId: request.requestId,
          },
          'provider gateway debug summary',
        );

        return normalizedResponse;
      } catch (error) {
        const normalizedError = normalizeProviderGatewayError(error, {
          attemptCount: attempt,
          maxAttempts: request.runtime.maxAttempts,
          host: request.runtime.allowedHosts[0],
          requestId: request.requestId,
          sessionId: request.sessionId,
          conversationId: request.conversationId,
          client: this.client.name,
          dispatchMode: this.dispatchMode,
          promptFingerprint: request.debug.promptFingerprint,
          timeoutMs: request.runtime.timeoutMs,
          allowedHosts: [...request.runtime.allowedHosts],
        });
        const latencyMs = this.clock().getTime() - attemptStartedAt;

        this.auditSink?.record({
          type: 'provider.failed',
          at: this.clock().toISOString(),
          sessionId: request.sessionId,
          details: {
            provider: request.runtime.provider,
            requestId: request.requestId ?? 'n/a',
            providerErrorCode: normalizedError.code,
            attemptCount: attempt,
          },
        });
        this.metricsSink?.increment('provider_gateway_failures_total', {
          dispatchMode: this.dispatchMode,
          provider: request.runtime.provider,
          providerErrorCode: normalizedError.code,
        });

        if (attempt < request.runtime.maxAttempts && normalizedError.retryable) {
          this.logger.warn(
            {
              attempt,
              code: normalizedError.code,
              latencyMs,
              nextAttempt: attempt + 1,
              requestId: request.requestId,
              retryBackoffMs: request.runtime.retryBackoffMs,
            },
            'provider gateway dispatch attempt failed and will be retried',
          );
          continue;
        }

        this.logger.error(
          {
            code: normalizedError.code,
            conversationId: request.conversationId,
            details: redactSensitiveValue(normalizedError.details),
            latencyMs,
            message: redactSensitiveText(normalizedError.message),
            requestId: request.requestId,
            retryable: normalizedError.retryable,
            sessionId: request.sessionId,
            statusCode: normalizedError.statusCode,
          },
          'provider gateway dispatch failed',
        );

        throw normalizedError;
      }
    }

    throw new ProviderGatewayError(
      'unavailable',
      'Provider gateway ended without a successful dispatch result.',
      503,
    );
  }
}

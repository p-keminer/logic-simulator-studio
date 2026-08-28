import { randomUUID } from 'node:crypto';
import type {
  ChatRequest,
  ChatResetRequest,
  ChatResetResponse,
  ChatResponse,
} from '../../contracts/chat.js';
import { createSandboxError } from '../../shared/errors.js';
import type { AuditSink } from '../audit-and-observability/audit-events.js';
import type { MetricsSink } from '../audit-and-observability/metrics.js';
import type { SessionService } from '../auth/session-service.js';
import type { PolicyEngine } from '../policy-guardrails/policy-engine.js';
import type { PolicyViolation } from '../policy-guardrails/policy-types.js';
import type { PromptOrchestrator } from '../prompt-orchestrator/prompt-orchestrator.js';
import type { ConversationHistoryStore } from '../prompt-orchestrator/conversation-history-store.js';
import type { ProviderGateway } from '../provider-gateway/provider-gateway.js';
import { ProviderGatewayError } from '../provider-gateway/provider-error.js';
import type { ProviderGatewayResponse } from '../provider-gateway/provider-types.js';
import type {
  PromptEnvelope,
} from '../prompt-orchestrator/prompt-types.js';

export interface ChatRequestHandlerResult {
  readonly prompt: PromptEnvelope;
  readonly provider: ProviderGatewayResponse;
  readonly response: ChatResponse;
}

export interface ChatRequestHandler {
  handle(
    input: ChatRequest,
    context?: ChatRequestHandlingContext,
  ): Promise<ChatRequestHandlerResult>;
  reset(
    input: ChatResetRequest,
    context?: ChatRequestHandlingContext,
  ): Promise<ChatResetResponse>;
}

export interface SandboxChatRequestHandlerOptions {
  conversationIdFactory?: () => string;
  clock?: () => Date;
  maxHistoryTurns?: number;
  auditSink?: AuditSink;
  metricsSink?: MetricsSink;
  logger?: ChatRequestHandlerLogger;
}

export interface ChatRequestHandlingContext {
  readonly requestId?: string;
  readonly clientIp?: string;
}

export interface ChatRequestHandlerLogger {
  debug(bindings: Record<string, unknown>, message: string): void;
  info(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
  error(bindings: Record<string, unknown>, message: string): void;
}

export class SandboxChatRequestHandler implements ChatRequestHandler {
  private readonly conversationIdFactory: () => string;
  private readonly clock: () => Date;
  private readonly maxHistoryTurns: number;
  private readonly auditSink?: AuditSink;
  private readonly metricsSink?: MetricsSink;
  private readonly logger: ChatRequestHandlerLogger;

  constructor(
    private readonly sessionService: SessionService,
    private readonly policyEngine: PolicyEngine,
    private readonly promptOrchestrator: PromptOrchestrator,
    private readonly conversationHistoryStore: ConversationHistoryStore,
    private readonly providerGateway: ProviderGateway,
    options: SandboxChatRequestHandlerOptions = {},
  ) {
    this.conversationIdFactory =
      options.conversationIdFactory ?? (() => randomUUID());
    this.clock = options.clock ?? (() => new Date());
    this.maxHistoryTurns = options.maxHistoryTurns ?? 8;
    this.auditSink = options.auditSink;
    this.metricsSink = options.metricsSink;
    this.logger = options.logger ?? {
      debug() {},
      info() {},
      warn() {},
      error() {},
    };
  }

  private nowIso(): string {
    return this.clock().toISOString();
  }

  private extractStringDetail(
    details: Record<string, unknown> | undefined,
    key: string,
  ): string | undefined {
    const value = details?.[key];

    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private extractNumberDetail(
    details: Record<string, unknown> | undefined,
    key: string,
  ): number | undefined {
    const value = details?.[key];

    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private createSafeProviderErrorDetails(error: ProviderGatewayError) {
    return {
      attemptCount:
        this.extractNumberDetail(error.details, 'attemptCount') ?? null,
      dispatchMode:
        this.extractStringDetail(error.details, 'dispatchMode') ?? null,
      maxAttempts:
        this.extractNumberDetail(error.details, 'maxAttempts') ?? null,
      providerCode: error.code,
      providerStatusCode: error.statusCode ?? null,
      requestKind: 'chat-request',
      retryAfterSeconds:
        this.extractNumberDetail(error.details, 'retryAfterSeconds') ?? null,
      retryable: error.retryable,
      timeoutMs: this.extractNumberDetail(error.details, 'timeoutMs') ?? null,
    };
  }

  private createSafeViolations(violations: PolicyViolation[]) {
    return violations.map((violation) => ({
      code: violation.code,
      message: violation.message,
    }));
  }

  private findRateLimitViolation(
    violations: PolicyViolation[],
  ): PolicyViolation | undefined {
    return violations.find((violation) => violation.code === 'rate-limit-exceeded');
  }

  private createPolicyBlockError(
    requestKind: 'chat-request' | 'chat-reset',
    violations: PolicyViolation[],
  ) {
    const rateLimitViolation = this.findRateLimitViolation(violations);
    const actionLabel = requestKind === 'chat-reset' ? 'Chat reset' : 'Chat request';

    if (rateLimitViolation) {
      return createSandboxError(
        'RATE_LIMITED',
        `${actionLabel} was rate limited by sandbox policy.`,
        429,
        {
          limit:
            this.extractNumberDetail(rateLimitViolation.details, 'limit') ??
            null,
          remaining:
            this.extractNumberDetail(rateLimitViolation.details, 'remaining') ??
            null,
          requestKind,
          resetAt:
            this.extractStringDetail(rateLimitViolation.details, 'resetAt') ??
            null,
          retryAfterSeconds:
            this.extractNumberDetail(
              rateLimitViolation.details,
              'retryAfterSeconds',
            ) ?? null,
          violations: this.createSafeViolations(violations),
          windowMs:
            this.extractNumberDetail(rateLimitViolation.details, 'windowMs') ??
            null,
        },
      );
    }

    return createSandboxError(
      'FORBIDDEN',
      `${actionLabel} was blocked by sandbox policy.`,
      403,
      {
        violations: this.createSafeViolations(violations),
      },
    );
  }

  private recordPolicyBlock(
    requestKind: 'chat-request' | 'chat-reset',
    sessionId: string,
    conversationId: string | undefined,
    context: ChatRequestHandlingContext,
    violations: PolicyViolation[],
  ): void {
    const rateLimitViolation = this.findRateLimitViolation(violations);
    const violationCodes = violations.map((violation) => violation.code).join(',');
    const retryAfterSeconds =
      this.extractNumberDetail(rateLimitViolation?.details, 'retryAfterSeconds') ??
      null;
    const bucket =
      this.extractStringDetail(rateLimitViolation?.details, 'bucket') ?? 'n/a';

    this.auditSink?.record({
      type: 'policy.blocked',
      at: this.nowIso(),
      sessionId,
      actor: 'edge-api',
      details: {
        clientIp: context.clientIp ?? 'n/a',
        conversationId: conversationId ?? 'n/a',
        requestId: context.requestId ?? 'n/a',
        requestKind,
        violationCodes,
      },
    });
    this.metricsSink?.increment('policy_blocked_total', {
      rateLimited: rateLimitViolation ? 'true' : 'false',
      requestKind,
    });

    if (rateLimitViolation) {
      this.auditSink?.record({
        type: 'rate-limit.blocked',
        at: this.nowIso(),
        sessionId,
        actor: 'edge-api',
        details: {
          bucket,
          clientIp: context.clientIp ?? 'n/a',
          requestId: context.requestId ?? 'n/a',
          requestKind,
          retryAfterSeconds,
        },
      });
      this.metricsSink?.increment('rate_limit_blocked_total', {
        requestKind,
      });
    }

    this.logger.warn(
      {
        bucket,
        clientIp: context.clientIp,
        conversationId,
        rateLimited: Boolean(rateLimitViolation),
        requestId: context.requestId,
        requestKind,
        retryAfterSeconds,
        sessionId,
        violationCodes,
      },
      'sandbox policy blocked request',
    );
  }

  private mapProviderError(error: ProviderGatewayError) {
    const safeProviderDetails = this.createSafeProviderErrorDetails(error);

    switch (error.code) {
      case 'rate-limit':
        return createSandboxError(
          'RATE_LIMITED',
          'Provider gateway is rate limited in the sandbox.',
          429,
          safeProviderDetails,
        );
      case 'config':
        // Konfigurationsfehler des Gateways – z. B. Prompt-Groessenlimit ueberschritten.
        // Wird als 400 zurueckgegeben damit das Frontend einen erkennbaren Nutzerfehler anzeigt.
        return createSandboxError(
          'PROMPT_TOO_LARGE',
          'Der gesendete Prompt ueberschreitet das erlaubte Maximum des Brokers.',
          400,
          safeProviderDetails,
        );
      case 'timeout':
      case 'unavailable':
        return createSandboxError(
          'UPSTREAM_UNAVAILABLE',
          'Provider gateway is unavailable in the sandbox.',
          error.statusCode ?? 503,
          safeProviderDetails,
        );
      default:
        return createSandboxError(
          'INTERNAL_ERROR',
          'Provider gateway dispatch failed inside the sandbox.',
          error.statusCode ?? 500,
          safeProviderDetails,
        );
    }
  }

  async handle(
    input: ChatRequest,
    context: ChatRequestHandlingContext = {},
  ): Promise<ChatRequestHandlerResult> {
    await this.sessionService.assertActiveSession(input.sessionId);
    const conversationId = input.conversationId ?? this.conversationIdFactory();
    const storedHistory = await this.conversationHistoryStore.get(
      input.sessionId,
      conversationId,
    );
    const history = storedHistory
      ? storedHistory.turns.slice(-this.maxHistoryTurns)
      : [];

    const policyOutcome = await this.policyEngine.evaluate({
      clientIp: context.clientIp,
      sessionId: input.sessionId,
      requestKind: 'chat-request',
      promptText: input.message,
      circuitContextVersion: input.circuitContext.version,
      conversationId,
      historyTurnCount: history.length,
      requestId: context.requestId,
      rateLimitBucket: input.sessionId,
    });

    if (policyOutcome.decision === 'block') {
      this.recordPolicyBlock(
        'chat-request',
        input.sessionId,
        conversationId,
        context,
        policyOutcome.violations,
      );
      throw this.createPolicyBlockError(
        'chat-request',
        policyOutcome.violations,
      );
    }

    this.auditSink?.record({
      type: 'chat.requested',
      at: this.nowIso(),
      sessionId: input.sessionId,
      actor: 'edge-api',
      details: {
        circuitContextVersion: input.circuitContext.version,
        clientIp: context.clientIp ?? 'n/a',
        conversationId,
        historyTurnCount: history.length,
        reduced: input.circuitContext.reduction?.wasReduced ?? false,
        requestId: context.requestId ?? 'n/a',
      },
    });
    this.metricsSink?.increment('chat_requests_total', {
      requestKind: 'chat-request',
    });
    this.logger.debug(
      {
        clientIp: context.clientIp,
        conversationId,
        historyTurnCount: history.length,
        requestId: context.requestId,
        sessionId: input.sessionId,
      },
      'chat request passed sandbox policy',
    );

    const prompt = await this.promptOrchestrator.build({
      conversationId,
      circuitContext: input.circuitContext,
      history,
      userMessage: input.message,
    });
    let providerResponse: ProviderGatewayResponse;

    try {
      providerResponse = await this.providerGateway.send({
        requestId: context.requestId,
        sessionId: input.sessionId,
        conversationId,
        prompt,
      });
    } catch (error) {
      if (error instanceof ProviderGatewayError) {
        throw this.mapProviderError(error);
      }

      throw error;
    }

    const response: ChatResponse = {
      message: providerResponse.message,
      conversationId,
      model: providerResponse.model,
      circuitContextVersion: input.circuitContext.version,
    };
    const recordedAt = this.nowIso();

    await this.conversationHistoryStore.appendTurns(
      input.sessionId,
      conversationId,
      [
        {
          role: 'user',
          content: input.message,
          createdAt: recordedAt,
        },
        {
          role: 'assistant',
          content: response.message,
          createdAt: recordedAt,
        },
      ],
    );
    this.auditSink?.record({
      type: 'chat.completed',
      at: recordedAt,
      sessionId: input.sessionId,
      actor: 'edge-api',
      details: {
        conversationId,
        model: providerResponse.model,
        provider: providerResponse.provider,
        providerStatus: providerResponse.status,
        requestId: context.requestId ?? 'n/a',
      },
    });
    this.metricsSink?.increment('chat_completed_total', {
      provider: providerResponse.provider,
      providerStatus: providerResponse.status,
    });
    this.logger.info(
      {
        conversationId,
        model: providerResponse.model,
        provider: providerResponse.provider,
        providerStatus: providerResponse.status,
        requestId: context.requestId,
        sessionId: input.sessionId,
      },
      'sandbox chat request completed',
    );

    return {
      prompt,
      provider: providerResponse,
      response,
    };
  }

  async reset(
    input: ChatResetRequest,
    context: ChatRequestHandlingContext = {},
  ): Promise<ChatResetResponse> {
    await this.sessionService.assertActiveSession(input.sessionId);

    const policyOutcome = await this.policyEngine.evaluate({
      clientIp: context.clientIp,
      sessionId: input.sessionId,
      requestKind: 'chat-reset',
      reasonText: input.reason,
      conversationId: input.conversationId,
      requestId: context.requestId,
      rateLimitBucket: input.sessionId,
    });

    if (policyOutcome.decision === 'block') {
      this.recordPolicyBlock(
        'chat-reset',
        input.sessionId,
        input.conversationId,
        context,
        policyOutcome.violations,
      );
      throw this.createPolicyBlockError('chat-reset', policyOutcome.violations);
    }

    const resetResult = await this.conversationHistoryStore.reset(
      input.sessionId,
      input.conversationId,
    );
    const resetAt = this.nowIso();

    this.auditSink?.record({
      type: 'chat.reset',
      at: resetAt,
      sessionId: input.sessionId,
      actor: 'edge-api',
      details: {
        clearedConversationCount: resetResult.clearedConversationIds.length,
        clearedTurns: resetResult.clearedTurns,
        conversationId: input.conversationId ?? 'all-conversations',
        requestId: context.requestId ?? 'n/a',
      },
    });
    this.metricsSink?.increment('chat_resets_total', {
      scope: input.conversationId ? 'conversation' : 'session',
    });
    this.logger.info(
      {
        clearedConversationCount: resetResult.clearedConversationIds.length,
        clearedTurns: resetResult.clearedTurns,
        conversationId: input.conversationId,
        requestId: context.requestId,
        sessionId: input.sessionId,
      },
      'sandbox chat reset completed',
    );

    return {
      reset: true,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      clearedConversationIds: resetResult.clearedConversationIds,
      clearedTurns: resetResult.clearedTurns,
      resetAt,
    };
  }
}

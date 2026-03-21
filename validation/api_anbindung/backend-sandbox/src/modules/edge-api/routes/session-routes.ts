import type { FastifyPluginAsync } from 'fastify';
import {
  sessionKeyDeleteRequestSchema,
  sessionKeyDeleteResponseSchema,
  sessionKeyRequestSchema,
  sessionKeyResponseSchema,
} from '../../../contracts/session';
import type { AuditSink } from '../../audit-and-observability/audit-events';
import type { MetricsSink } from '../../audit-and-observability/metrics';
import type { SessionService } from '../../auth/session-service';
import type { RateLimitConfig } from '../../policy-guardrails/policy-types';
import type { RateLimitDecision, RateLimitStore } from '../../policy-guardrails/rate-limit-store';
import { createSandboxError } from '../../../shared/errors';
import { createRequestContext } from '../../../shared/request-context';

export interface SessionRoutesOptions {
  sessionService: SessionService;
  auditSink?: AuditSink;
  metricsSink?: MetricsSink;
  sessionKeyRateLimit?: RateLimitConfig;
  rateLimitStore?: RateLimitStore;
}

const createValidationError = (message: string, details: unknown) =>
  createSandboxError(message === 'Session was not found.' ? 'NOT_FOUND' : 'BAD_REQUEST', message, message === 'Session was not found.' ? 404 : 400, {
    issues: details,
  });

const createRateLimitError = (decision: RateLimitDecision) =>
  createSandboxError(
    'RATE_LIMITED',
    'Session key registration is rate limited in the sandbox.',
    429,
    {
      limit: decision.limit,
      remaining: decision.remaining,
      resetAt: decision.resetAt,
      retryAfterSeconds: decision.retryAfterSeconds,
      windowMs: decision.windowMs,
    },
  );

export const sessionRoutes: FastifyPluginAsync<SessionRoutesOptions> = async (
  app,
  options,
) => {
  app.post('/session/key', async (request, reply) => {
    const context = createRequestContext(request);
    const clientIp = request.ip;

    if (options.sessionKeyRateLimit && options.rateLimitStore) {
      const bucket = [
        options.sessionKeyRateLimit.name,
        'session-key',
        clientIp || 'unknown-ip',
      ].join(':');
      const decision = await options.rateLimitStore.take(
        bucket,
        options.sessionKeyRateLimit,
      );

      request.log.debug(
        {
          bucket,
          clientIp,
          limit: decision.limit,
          remaining: decision.remaining,
          requestId: context.requestId,
          retryAfterSeconds: decision.retryAfterSeconds,
          route: context.route,
        },
        'session key rate limit evaluated',
      );

      if (!decision.allowed) {
        options.auditSink?.record({
          type: 'rate-limit.blocked',
          at: context.receivedAt,
          actor: 'edge-api',
          details: {
            bucket: decision.bucket,
            clientIp,
            requestId: context.requestId,
            requestKind: 'session-key',
            retryAfterSeconds: decision.retryAfterSeconds,
          },
        });
        options.metricsSink?.increment('rate_limit_blocked_total', {
          requestKind: 'session-key',
        });
        request.log.warn(
          {
            bucket,
            clientIp,
            count: decision.count,
            limit: decision.limit,
            requestId: context.requestId,
            retryAfterSeconds: decision.retryAfterSeconds,
            route: context.route,
          },
          'session key registration blocked by sandbox rate limit',
        );
        throw createRateLimitError(decision);
      }
    }

    const parsedBody = sessionKeyRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw createValidationError(
        'Session key payload is invalid.',
        parsedBody.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          reason: issue.message,
        })),
      );
    }

    const registration = await options.sessionService.registerSessionKey(
      parsedBody.data.apiKey,
    );

    request.log.info(
      {
        clientIp,
        expiresAt: registration.expiresAt,
        requestId: context.requestId,
        route: context.route,
        sessionId: registration.sessionId,
      },
      'session key registered',
    );
    options.auditSink?.record({
      type: 'session.key.registered',
      at: registration.issuedAt,
      sessionId: registration.sessionId,
      actor: 'edge-api',
      details: {
        clientIp,
        expiresAt: registration.expiresAt,
        requestId: context.requestId,
      },
    });
    options.metricsSink?.increment('session_key_registered_total', {
      route: 'session-key',
    });

    return reply.code(201).send(sessionKeyResponseSchema.parse(registration));
  });

  app.delete('/session/key', async (request, reply) => {
    const context = createRequestContext(request);
    const parsedBody = sessionKeyDeleteRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw createValidationError(
        'Session delete payload is invalid.',
        parsedBody.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          reason: issue.message,
        })),
      );
    }

    const deletion = await options.sessionService.deleteSessionKey(
      parsedBody.data.sessionId,
    );

    request.log.info(
      {
        clientIp: request.ip,
        deletedAt: deletion.deletedAt,
        requestId: context.requestId,
        route: context.route,
        sessionId: deletion.sessionId,
      },
      'session key deleted',
    );
    options.auditSink?.record({
      type: 'session.key.deleted',
      at: deletion.deletedAt,
      sessionId: deletion.sessionId,
      actor: 'edge-api',
      details: {
        requestId: context.requestId,
        route: context.route ?? '/session/key',
      },
    });
    options.metricsSink?.increment('session_key_deleted_total', {
      route: 'session-key',
    });

    return reply.code(200).send(sessionKeyDeleteResponseSchema.parse(deletion));
  });
};

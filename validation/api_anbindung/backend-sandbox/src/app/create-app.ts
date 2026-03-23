import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  DefaultSessionService,
  type SessionService,
} from '../modules/auth/session-service';
import { InMemoryKeyReferenceStore } from '../modules/auth/key-reference-store';
import { InMemorySessionStore } from '../modules/auth/session-store';
import {
  InMemoryAuditSink,
  type AuditSink,
} from '../modules/audit-and-observability/audit-events';
import {
  InMemoryMetricsSink,
  type MetricsSink,
} from '../modules/audit-and-observability/metrics';
import {
  redactSensitiveText,
  redactSensitiveValue,
} from '../modules/audit-and-observability/redaction';
import { FileCurrentCircuitSnapshotProvider } from '../modules/circuit-context/file-current-circuit-snapshot-provider';
import { FixtureCurrentCircuitSnapshotProvider } from '../modules/circuit-context/fixture-current-circuit-snapshot-provider';
import type { CurrentCircuitSnapshotProvider } from '../modules/circuit-context/current-circuit-snapshot-provider';
import {
  SandboxChatRequestHandler,
  type ChatRequestHandler,
} from '../modules/edge-api/chat-request-handler';
import { localAppBridgeRoutes } from '../modules/edge-api/routes/local-app-bridge-routes';
import { devProviderFaultRoutes } from '../modules/edge-api/routes/dev-provider-fault-routes';
import { mapErrorToHttpResponse } from '../modules/edge-api/http-error-mapper';
import { chatRoutes } from '../modules/edge-api/routes/chat-routes';
import { sessionRoutes } from '../modules/edge-api/routes/session-routes';
import {
  DefaultPolicyEngine,
  type PolicyEngine,
} from '../modules/policy-guardrails/policy-engine';
import {
  InMemoryRateLimitStore,
  type RateLimitStore,
} from '../modules/policy-guardrails/rate-limit-store';
import type { RateLimitConfig } from '../modules/policy-guardrails/policy-types';
import {
  DefaultPromptOrchestrator,
  type PromptOrchestrator,
} from '../modules/prompt-orchestrator/prompt-orchestrator';
import {
  InMemoryConversationHistoryStore,
  type ConversationHistoryStore,
} from '../modules/prompt-orchestrator/conversation-history-store';
import {
  DevFaultInjectingProviderGateway,
} from '../modules/provider-gateway/dev-fault-injecting-provider-gateway';
import {
  DefaultProviderGateway,
  type ProviderGateway,
} from '../modules/provider-gateway/provider-gateway';
import { InMemoryDevProviderFaultController } from '../modules/provider-gateway/dev-provider-fault-controller';
import { NoopProviderClient } from '../modules/provider-gateway/provider-client';
import { isSandboxError } from '../shared/errors';
import { loadConfig } from '../shared/config';
import { createLoggerOptions } from '../shared/logger';

export interface CreateAppOptions {
  config?: Partial<ReturnType<typeof loadConfig>>;
  sessionService?: SessionService;
  policyEngine?: PolicyEngine;
  promptOrchestrator?: PromptOrchestrator;
  conversationHistoryStore?: ConversationHistoryStore;
  auditSink?: AuditSink;
  metricsSink?: MetricsSink;
  rateLimitStore?: RateLimitStore;
  sessionKeyRateLimit?: RateLimitConfig;
  currentCircuitSnapshotProvider?: CurrentCircuitSnapshotProvider;
  currentCircuitSnapshotFilePath?: string;
  enableLocalAppBridgeRoutes?: boolean;
  providerGateway?: ProviderGateway;
  chatRequestHandler?: ChatRequestHandler;
  loggerStream?: Writable;
}

export const createApp = (
  options: CreateAppOptions = {},
): FastifyInstance => {
  const config = {
    ...loadConfig(),
    ...options.config,
  };
  const devEndpointsEnabled = config.appEnv === 'development';
  const sessionService =
    options.sessionService ??
    new DefaultSessionService(
      new InMemorySessionStore(),
      new InMemoryKeyReferenceStore(),
      { ttlSeconds: config.sessionTtlSeconds },
    );
  const rateLimitStore = options.rateLimitStore ?? new InMemoryRateLimitStore();
  const policyEngine =
    options.policyEngine ??
    new DefaultPolicyEngine({
      rateLimitStore,
      rateLimits: {
        'chat-request': {
          burst: 4,
          maxRequests: 12,
          name: 'chat-request',
          windowMs: 60_000,
        },
        'chat-reset': {
          burst: 1,
          maxRequests: 4,
          name: 'chat-reset',
          windowMs: 60_000,
        },
      },
    });
  const promptOrchestrator =
    options.promptOrchestrator ?? new DefaultPromptOrchestrator();
  const conversationHistoryStore =
    options.conversationHistoryStore ?? new InMemoryConversationHistoryStore();
  const auditSink = options.auditSink ?? new InMemoryAuditSink();
  const metricsSink = options.metricsSink ?? new InMemoryMetricsSink();
  const currentCircuitSnapshotProvider =
    options.currentCircuitSnapshotProvider ??
    (options.currentCircuitSnapshotFilePath
      ? new FileCurrentCircuitSnapshotProvider({
          snapshotPath: options.currentCircuitSnapshotFilePath,
        })
      : undefined) ??
    (options.enableLocalAppBridgeRoutes
      ? new FixtureCurrentCircuitSnapshotProvider()
      : undefined);

  const app = fastify({
    logger: createLoggerOptions(config, options.loggerStream),
    requestIdHeader: 'x-request-id',
    genReqId: (request) => {
      const header = request.headers['x-request-id'];

      if (typeof header === 'string' && header.trim().length > 0) {
        return header.trim();
      }

      return randomUUID();
    },
  });

  const applyDevResponseDelay = async (requestUrl: string, method: string) => {
    if (!devEndpointsEnabled || config.devResponseDelayMs <= 0) {
      return;
    }

    if (method === 'OPTIONS') {
      return;
    }

    if (!requestUrl.startsWith('/v1/')) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, config.devResponseDelayMs);
    });
  };

  void app.register(cors, {
    allowedHeaders: ['content-type', 'x-request-id', 'x-session-id'],
    credentials: false,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, config.allowedOrigins.includes(origin));
    },
  });
  const devProviderFaultController = new InMemoryDevProviderFaultController();
  const providerGateway =
    options.providerGateway ??
    new DefaultProviderGateway(new NoopProviderClient(), {
      auditSink,
      logger: app.log,
      metricsSink,
    });
  const effectiveProviderGateway = new DevFaultInjectingProviderGateway(
    providerGateway,
    devProviderFaultController,
  );
  const chatRequestHandler =
    options.chatRequestHandler ??
    new SandboxChatRequestHandler(
      sessionService,
      policyEngine,
      promptOrchestrator,
      conversationHistoryStore,
      effectiveProviderGateway,
      {
        auditSink,
        logger: app.log,
        metricsSink,
      },
    );

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    request.log.info({ requestId: request.id }, 'request received');
  });

  app.addHook('preHandler', async (request) => {
    await applyDevResponseDelay(request.url, request.method);
  });

  app.get('/health', async () => ({
    environment: config.appEnv,
    devEndpointsEnabled,
    ok: true,
    service: 'backend-sandbox',
    status: 'healthy',
  }));

  app.get('/ready', async () => ({
    environment: config.appEnv,
    devEndpointsEnabled,
    ok: true,
    service: 'backend-sandbox',
    status: 'ready',
  }));

  app.setErrorHandler((error, request, reply) => {
    const mapped = mapErrorToHttpResponse(error, request.id);
    const errorForLog = isSandboxError(error)
        ? {
          code: error.code,
          details: error.details
            ? redactSensitiveValue(error.details)
            : undefined,
          message: redactSensitiveText(error.message),
          name: error.name,
          statusCode: error.statusCode,
        }
      : error instanceof Error
        ? {
            message: redactSensitiveText(error.message),
            name: error.name,
          }
        : {
            message: 'Unknown non-error value thrown.',
            name: 'UnknownError',
          };

    request.log.error(
      { error: errorForLog, requestId: request.id },
      'request failed',
    );
    reply.code(mapped.statusCode).send(mapped.body);
  });

  app.register(sessionRoutes, {
    prefix: '/v1',
    auditSink,
    metricsSink,
    rateLimitStore,
    sessionKeyRateLimit: options.sessionKeyRateLimit ?? {
      burst: 1,
      maxRequests: 3,
      name: 'session-key',
      windowMs: 60_000,
    },
    sessionService,
  });
  app.register(chatRoutes, {
    prefix: '/v1',
    chatRequestHandler,
  });
  if (devEndpointsEnabled) {
    app.register(devProviderFaultRoutes, {
      prefix: '/v1',
      auditSink,
      controller: devProviderFaultController,
    });
  }
  if (options.enableLocalAppBridgeRoutes && currentCircuitSnapshotProvider) {
    app.register(localAppBridgeRoutes, {
      prefix: '/v1',
      currentCircuitSnapshotProvider,
      sessionService,
    });
  }

  return app;
};

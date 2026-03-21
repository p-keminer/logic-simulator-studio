import type { FastifyPluginAsync } from 'fastify';
import {
  chatRequestSchema,
  chatResetRequestSchema,
  chatResetResponseSchema,
  chatResponseSchema,
} from '../../../contracts/chat';
import { createSandboxError } from '../../../shared/errors';
import { createRequestContext } from '../../../shared/request-context';
import type { ChatRequestHandler } from '../chat-request-handler';

export interface ChatRoutesOptions {
  chatRequestHandler: ChatRequestHandler;
}

const createSafeRouteProviderDebugSummary = (
  providerDebug: Awaited<
    ReturnType<ChatRequestHandler['handle']>
  >['provider']['debug'],
) => ({
  promptFingerprint: providerDebug.promptFingerprint,
  promptRenderedBytes: providerDebug.renderedBytes,
  promptTemplateVersion: providerDebug.templateVersion,
  providerAttemptCount: providerDebug.attemptCount,
  providerClient: providerDebug.client,
  providerDispatchMode: providerDebug.dispatchMode,
  providerLatencyMs: providerDebug.latencyMs,
  providerMaxAttempts: providerDebug.maxAttempts,
  providerRetryBackoffMs: providerDebug.retryBackoffMs,
  providerTimeoutMs: providerDebug.timeoutMs,
});

const createValidationError = (message: string, details: unknown) =>
  createSandboxError('BAD_REQUEST', message, 400, {
    issues: details,
  });

export const chatRoutes: FastifyPluginAsync<ChatRoutesOptions> = async (
  app,
  options,
) => {
  app.post('/chat/request', async (request, reply) => {
    const context = createRequestContext(request);
    const parsedBody = chatRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw createValidationError(
        'Chat request payload is invalid.',
        parsedBody.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          reason: issue.message,
        })),
      );
    }

    request.log.info(
      {
        clientIp: request.ip,
        requestId: context.requestId,
        route: context.route,
        sessionId: parsedBody.data.sessionId,
        conversationId: parsedBody.data.conversationId,
        circuitContextVersion: parsedBody.data.circuitContext.version,
        selectedElementCount:
          parsedBody.data.circuitContext.selectedElementIds.length,
        reduced:
          parsedBody.data.circuitContext.reduction?.wasReduced ?? false,
      },
      'chat request entering sandbox dispatch flow',
    );

    const result = await options.chatRequestHandler.handle(parsedBody.data, {
      clientIp: request.ip,
      requestId: context.requestId,
    });

    request.log.info(
      {
        client: result.provider.debug.client,
        requestId: context.requestId,
        route: context.route,
        sessionId: parsedBody.data.sessionId,
        conversationId: result.response.conversationId,
        circuitContextVersion: parsedBody.data.circuitContext.version,
        provider: result.provider.provider,
        providerStatus: result.provider.status,
      },
      'chat request prepared in sandbox',
    );
    request.log.debug(
      {
        ...createSafeRouteProviderDebugSummary(result.provider.debug),
        providerRequestIdPresent: Boolean(result.provider.providerRequestId),
        requestId: context.requestId,
        route: context.route,
      },
      'chat route provider debug trail',
    );

    return reply.code(202).send(chatResponseSchema.parse(result.response));
  });

  app.post('/chat/reset', async (request, reply) => {
    const context = createRequestContext(request);
    const parsedBody = chatResetRequestSchema.safeParse(request.body ?? {});

    if (!parsedBody.success) {
      throw createValidationError(
        'Chat reset payload is invalid.',
        parsedBody.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          reason: issue.message,
        })),
      );
    }

    const resetResult = await options.chatRequestHandler.reset(parsedBody.data, {
      clientIp: request.ip,
      requestId: context.requestId,
    });

    request.log.info(
      {
        requestId: context.requestId,
        route: context.route,
        sessionId: parsedBody.data.sessionId,
        conversationId: parsedBody.data.conversationId,
        clearedConversationIds: resetResult.clearedConversationIds,
        clearedTurns: resetResult.clearedTurns,
      },
      'chat reset handled in sandbox',
    );

    return reply.code(200).send(chatResetResponseSchema.parse(resetResult));
  });
};

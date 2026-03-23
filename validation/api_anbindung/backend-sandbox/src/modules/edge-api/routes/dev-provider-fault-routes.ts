import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { AuditSink } from '../../audit-and-observability/audit-events';
import type { DevProviderFaultController } from '../../provider-gateway/dev-provider-fault-controller';
import { createSandboxError } from '../../../shared/errors';
import { createRequestContext } from '../../../shared/request-context';

const requestSchema = z.object({
  mode: z.enum(['timeout', 'unavailable', 'clear']),
});

const responseSchema = z.object({
  armed: z.boolean(),
  mode: z.enum(['timeout', 'unavailable']).optional(),
  ok: z.literal(true),
});

export interface DevProviderFaultRoutesOptions {
  controller: DevProviderFaultController;
  auditSink?: AuditSink;
}

const createValidationError = (message: string, details: unknown) =>
  createSandboxError('BAD_REQUEST', message, 400, {
    issues: details,
  });

export const devProviderFaultRoutes: FastifyPluginAsync<
  DevProviderFaultRoutesOptions
> = async (app, options) => {
  app.post('/dev/provider-fault', async (request, reply) => {
    const context = createRequestContext(request);
    const parsedBody = requestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw createValidationError(
        'Dev provider fault payload is invalid.',
        parsedBody.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          reason: issue.message,
        })),
      );
    }

    if (parsedBody.data.mode === 'clear') {
      options.controller.clear();
      request.log.info(
        {
          requestId: context.requestId,
          route: context.route,
        },
        'dev provider fault cleared',
      );
      return reply.code(200).send(
        responseSchema.parse({
          armed: false,
          ok: true,
        }),
      );
    }

    options.controller.arm(parsedBody.data.mode);
    options.auditSink?.record({
      type: 'provider.requested',
      at: new Date().toISOString(),
      actor: 'edge-api',
      details: {
        devFaultMode: parsedBody.data.mode,
        requestId: context.requestId,
        route: context.route ?? '/v1/dev/provider-fault',
      },
    });
    request.log.info(
      {
        mode: parsedBody.data.mode,
        requestId: context.requestId,
        route: context.route,
      },
      'dev provider fault armed',
    );

    return reply.code(200).send(
      responseSchema.parse({
        armed: true,
        mode: parsedBody.data.mode,
        ok: true,
      }),
    );
  });
};

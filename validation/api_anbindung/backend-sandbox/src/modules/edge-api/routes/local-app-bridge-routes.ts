import type { FastifyPluginAsync } from 'fastify';
import {
  appBridgeCapabilitiesSchema,
  appBridgeCurrentCircuitResponseSchema,
} from '../../../contracts/app-bridge';
import { sessionIdSchema } from '../../../contracts/session';
import { createSandboxError } from '../../../shared/errors';
import { createRequestContext } from '../../../shared/request-context';
import type { SessionService } from '../../auth/session-service';
import type { CurrentCircuitSnapshotProvider } from '../../circuit-context/current-circuit-snapshot-provider';

export interface LocalAppBridgeRoutesOptions {
  currentCircuitSnapshotProvider: CurrentCircuitSnapshotProvider;
  sessionService: SessionService;
}

export const localAppBridgeRoutes: FastifyPluginAsync<
  LocalAppBridgeRoutesOptions
> = async (app, options) => {
  const assertAuthorizedBridgeSession = async (request: Parameters<
    typeof createRequestContext
  >[0]) => {
    const rawSessionId = request.headers['x-session-id'];

    if (typeof rawSessionId !== 'string') {
      throw createSandboxError(
        'UNAUTHORIZED',
        'An active session is required for local app bridge access.',
        401,
      );
    }

    const parsedSessionId = sessionIdSchema.safeParse(rawSessionId.trim());

    if (!parsedSessionId.success) {
      throw createSandboxError(
        'UNAUTHORIZED',
        'An active session is required for local app bridge access.',
        401,
      );
    }

    return options.sessionService.assertActiveSession(parsedSessionId.data);
  };

  app.get('/local-app-bridge/capabilities', async (request, reply) => {
    const context = createRequestContext(request);
    const session = await assertAuthorizedBridgeSession(request);
    const provider = options.currentCircuitSnapshotProvider.describe();

    request.log.debug(
      {
        providerId: provider.providerId,
        providerMode: provider.providerMode,
        requestId: context.requestId,
        route: context.route,
        sessionId: session.sessionId,
        supportsCurrentCircuit: provider.supportsCurrentCircuit,
      },
      'local app bridge capabilities requested',
    );

    return reply.code(200).send(
      appBridgeCapabilitiesSchema.parse({
        bridgeVersion: provider.bridgeVersion,
        providerId: provider.providerId,
        providerMode: provider.providerMode,
        supportsCurrentCircuit: provider.supportsCurrentCircuit,
        endpoints: {
          capabilities: '/v1/local-app-bridge/capabilities',
          currentCircuit: '/v1/local-app-bridge/current-circuit',
        },
      }),
    );
  });

  app.get('/local-app-bridge/current-circuit', async (request, reply) => {
    const context = createRequestContext(request);
    const session = await assertAuthorizedBridgeSession(request);
    const provider = options.currentCircuitSnapshotProvider.describe();
    const snapshot = await options.currentCircuitSnapshotProvider.getCurrentCircuit();

    if (!snapshot) {
      throw createSandboxError(
        'NOT_FOUND',
        'Current-circuit snapshot is not available in the sandbox.',
        404,
      );
    }

    request.log.debug(
      {
        circuitId: snapshot.openCircuit.circuitId,
        providerId: provider.providerId,
        providerMode: provider.providerMode,
        requestId: context.requestId,
        route: context.route,
        sessionId: session.sessionId,
        selectedElementCount:
          snapshot.openCircuit.selection.activeElementIds.length,
      },
      'local app bridge current circuit requested',
    );

    return reply.code(200).send(
      appBridgeCurrentCircuitResponseSchema.parse({
        bridgeVersion: provider.bridgeVersion,
        providerId: provider.providerId,
        providerMode: provider.providerMode,
        fetchedAt: context.receivedAt,
        snapshot,
      }),
    );
  });
};

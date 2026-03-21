import { describe, expect, it } from 'vitest';
import { FixtureCurrentCircuitSnapshotProvider } from '../../src/modules/circuit-context/fixture-current-circuit-snapshot-provider';
import { InMemoryKeyReferenceStore } from '../../src/modules/auth/key-reference-store';
import { DefaultSessionService } from '../../src/modules/auth/session-service';
import { InMemorySessionStore } from '../../src/modules/auth/session-store';
import { LocalAppBridgeHarness } from '../../src/modules/edge-api/app-bridge-harness';
import { SandboxChatRequestHandler } from '../../src/modules/edge-api/chat-request-handler';
import { DefaultPolicyEngine } from '../../src/modules/policy-guardrails/policy-engine';
import { InMemoryRateLimitStore } from '../../src/modules/policy-guardrails/rate-limit-store';
import { InMemoryConversationHistoryStore } from '../../src/modules/prompt-orchestrator/conversation-history-store';
import { DefaultPromptOrchestrator } from '../../src/modules/prompt-orchestrator/prompt-orchestrator';
import { NoopProviderClient } from '../../src/modules/provider-gateway/provider-client';
import { DefaultProviderGateway } from '../../src/modules/provider-gateway/provider-gateway';
import {
  createAppBridgeChatRequest,
  createAppBridgeChatResetRequest,
} from './fixtures';

const createHarness = async () => {
  const sessionService = new DefaultSessionService(
    new InMemorySessionStore(),
    new InMemoryKeyReferenceStore(),
    {
      ttlSeconds: 300,
    },
  );
  const session = await sessionService.registerSessionKey(
    'sk-app-bridge-session-1234567890abcd',
  );
  const chatRequestHandler = new SandboxChatRequestHandler(
    sessionService,
    new DefaultPolicyEngine({
      rateLimitStore: new InMemoryRateLimitStore(),
      rateLimits: {
        'chat-request': {
          maxRequests: 12,
          name: 'chat-request',
          windowMs: 60_000,
        },
        'chat-reset': {
          maxRequests: 4,
          name: 'chat-reset',
          windowMs: 60_000,
        },
      },
    }),
    new DefaultPromptOrchestrator(),
    new InMemoryConversationHistoryStore(),
    new DefaultProviderGateway(new NoopProviderClient()),
  );

  return {
    harness: new LocalAppBridgeHarness(chatRequestHandler),
    providerBackedHarness: new LocalAppBridgeHarness(chatRequestHandler, {
      currentCircuitSnapshotProvider:
        new FixtureCurrentCircuitSnapshotProvider(),
    }),
    sessionId: session.sessionId,
  };
};

describe('local app bridge harness', () => {
  it('maps an app-near open-circuit snapshot onto the existing sandbox chat flow', async () => {
    const { harness, sessionId } = await createHarness();
    const request = createAppBridgeChatRequest(sessionId);
    const { prepared, result } = await harness.handleChat(request, {
      clientIp: '127.0.0.1',
      requestId: 'req-app-bridge-1',
    });

    expect(prepared.bridgeVersion).toBe('sandbox-app-bridge-v1');
    expect(prepared.circuitSource).toEqual(
      expect.objectContaining({
        id: 'bridge-circuit-1',
        name: 'Bridge fixture circuit',
      }),
    );
    expect(prepared.chatRequest.circuitContext.scope).toBe('active-circuit');
    expect(prepared.chatRequest.circuitContext.circuitId).toBe('bridge-circuit-1');
    expect(result.response).toEqual(
      expect.objectContaining({
        conversationId: 'bridge-conversation-1',
        circuitContextVersion:
          prepared.chatRequest.circuitContext.version,
      }),
    );
    expect(result.provider.status).toBe('stubbed');
  });

  it('can hydrate the current circuit through the provider port instead of receiving a snapshot inline', async () => {
    const { providerBackedHarness, sessionId } = await createHarness();
    const { prepared, result } =
      await providerBackedHarness.handleChatFromCurrentCircuit(
        {
          sessionId,
          userMessage:
            'Explain the currently open circuit from the configured provider.',
          conversation: {
            conversationId: 'bridge-conversation-provider-1',
          },
        },
        {
          clientIp: '127.0.0.1',
          requestId: 'req-app-bridge-provider-1',
        },
      );

    expect(prepared.providerId).toBe(
      'fixture-current-circuit-snapshot-provider',
    );
    expect(prepared.providerMode).toBe('fixture');
    expect(prepared.chatRequest.circuitContext.circuitId).toBe(
      'fixture-circuit-1',
    );
    expect(result.response.conversationId).toBe(
      'bridge-conversation-provider-1',
    );
  });

  it('returns a sandbox conflict when the current-circuit provider is not configured', async () => {
    const { harness, sessionId } = await createHarness();

    await expect(
      harness.handleChatFromCurrentCircuit({
        sessionId,
        userMessage: 'Explain the current circuit without a provider.',
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
    });
  });

  it('prepares and dispatches a local reset request through the same bridge seam', async () => {
    const { harness, sessionId } = await createHarness();
    const chatRequest = createAppBridgeChatRequest(sessionId);

    await harness.handleChat(chatRequest, {
      requestId: 'req-app-bridge-chat',
    });

    const reset = await harness.handleReset(
      createAppBridgeChatResetRequest(sessionId),
      {
        requestId: 'req-app-bridge-reset',
      },
    );

    expect(reset.prepared.chatResetRequest).toEqual(
      expect.objectContaining({
        sessionId,
        conversationId: 'bridge-conversation-1',
      }),
    );
    expect(reset.result).toEqual(
      expect.objectContaining({
        reset: true,
        sessionId,
        conversationId: 'bridge-conversation-1',
      }),
    );
  });
});

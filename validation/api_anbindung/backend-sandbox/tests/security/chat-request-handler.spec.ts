import { describe, expect, it, vi } from 'vitest';
import type {
  ChatRequest,
  ChatResetResponse,
  ChatResponse,
} from '../../src/contracts/chat';
import {
  defaultCircuitContextLimits,
  reduceCircuitContext,
} from '../../src/modules/circuit-context/circuit-context-reducer';
import {
  SandboxChatRequestHandler,
  type ChatRequestHandlerResult,
} from '../../src/modules/edge-api/chat-request-handler';
import type { SessionService } from '../../src/modules/auth/session-service';
import type { PolicyEngine } from '../../src/modules/policy-guardrails/policy-engine';
import {
  InMemoryConversationHistoryStore,
  type ConversationHistoryStore,
} from '../../src/modules/prompt-orchestrator/conversation-history-store';
import type { PromptOrchestrator } from '../../src/modules/prompt-orchestrator/prompt-orchestrator';
import type {
  ProviderGateway,
  ProviderGatewaySendInput,
} from '../../src/modules/provider-gateway/provider-gateway';
import type { ProviderGatewayResponse } from '../../src/modules/provider-gateway/provider-types';
import { createOversizedCircuitFixture } from '../circuit-context/fixtures';

const createChatRequest = (): ChatRequest => ({
  sessionId: '11111111-1111-4111-8111-111111111111',
  message: 'Explain the currently open circuit.',
  circuitContext: reduceCircuitContext(createOversizedCircuitFixture(), {
    limits: {
      ...defaultCircuitContextLimits,
      maxNodes: 6,
      maxGates: 5,
      maxConnections: 8,
      maxSelectedElementIds: 4,
      maxNotesLength: 160,
      maxSerializedBytes: 2_400,
    },
  })!,
});

const createHarness = (options?: {
  policyDecision?: 'allow' | 'block';
}) => {
  const conversationHistoryStore: ConversationHistoryStore =
    new InMemoryConversationHistoryStore();
  const resolveActiveSessionKey = vi.fn(async (sessionId: string) => ({
    sessionId,
    keyReferenceId: 'key-ref-1',
    apiKey: 'sk-handler-secret-1234567890abcd',
    expiresAt: '2026-03-21T00:15:00.000Z',
  }));
  const assertActiveSession = vi.fn(async () => ({
    sessionId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-03-21T00:00:00.000Z',
    expiresAt: '2026-03-21T00:15:00.000Z',
    keyReferenceId: 'key-ref-1',
    status: 'active' as const,
  }));
  const evaluate = vi.fn(async () => {
    if (options?.policyDecision === 'block') {
      return {
        decision: 'block' as const,
        violations: [
          {
            code: 'prompt-injection-attempt' as const,
            message: 'Prompt override attempt detected.',
          },
        ],
      };
    }

    return {
      decision: 'allow' as const,
      violations: [],
    };
  });
  const build = vi.fn(
    async (
      input: Parameters<PromptOrchestrator['build']>[0],
    ): Promise<ChatRequestHandlerResult['prompt']> => ({
      templateVersion: 'sandbox-chat-v1',
      system: [
        {
          title: 'sandbox-boundary',
          content: 'Only the active circuit is in scope.',
        },
      ],
      circuit: [
        {
          title: 'active-circuit-summary',
          content: input.circuitContext.circuitId,
        },
      ],
      history: input.history.map((turn: { content: string }, index: number) => ({
        title: `history-turn-${index + 1}`,
        content: turn.content,
      })),
      user: [
        {
          title: 'active-user-request',
          content: input.userMessage,
        },
      ],
      renderedPrompt: `conversationId=${input.conversationId}\nhistoryTurns=${input.history.length}`,
    }),
  );
  const providerGateway: ProviderGateway = {
    send: vi.fn(
      async ({
        requestId,
        conversationId,
        prompt,
      }: ProviderGatewaySendInput): Promise<ProviderGatewayResponse> => ({
        status: 'stubbed' as const,
        provider: 'sandbox-noop',
        model: 'sandbox-stub',
        message:
          'Chat request accepted by the sandbox broker. No provider request was made.',
        providerRequestId: `stub-${conversationId}`,
        usage: {
          inputBytes: prompt.renderedPrompt.length,
          outputBytes: 0,
        },
        debug: {
          client: 'provider-gateway-stub',
          attemptCount: 1,
          latencyMs: 0,
          requestId,
          dispatchMode: 'noop',
          promptFingerprint: 'deadbeefdeadbeef',
          renderedBytes: prompt.renderedPrompt.length,
          templateVersion: prompt.templateVersion,
          maxAttempts: 1,
          timeoutMs: 1_500,
          allowedHosts: ['sandbox.invalid'],
          retryBackoffMs: 250,
        },
      }),
    ),
  };

  const sessionService: SessionService = {
    registerSessionKey: vi.fn(async () => {
      throw new Error('registerSessionKey is not used in this test.');
    }),
    deleteSessionKey: vi.fn(async () => {
      throw new Error('deleteSessionKey is not used in this test.');
    }),
    resetSession: vi.fn(async () => {}),
    assertActiveSession,
    resolveActiveSessionKey,
  };
  const policyEngine: PolicyEngine = {
    evaluate,
  };
  const promptOrchestrator: PromptOrchestrator = {
    build,
  };

  return {
    build,
    conversationHistoryStore,
    evaluate,
    handler: new SandboxChatRequestHandler(
      sessionService,
      policyEngine,
      promptOrchestrator,
      conversationHistoryStore,
      providerGateway,
      {
        conversationIdFactory: () => 'sandbox-conversation-1',
        clock: () => new Date('2026-03-21T00:00:00.000Z'),
      },
    ),
    assertActiveSession,
    providerGateway,
    resolveActiveSessionKey,
  };
};

describe('chat request handler', () => {
  it('builds a sandbox prompt, records provider debug data, reuses local history, and clears it on reset', async () => {
    const request = createChatRequest();
    const harness = createHarness();

    const firstResult = await harness.handler.handle(request);
    const secondResult = await harness.handler.handle({
      ...request,
      conversationId: firstResult.response.conversationId,
      message: 'Now explain the reduced node and gate counts.',
    });
    const resetResult = await harness.handler.reset({
      sessionId: request.sessionId,
      conversationId: firstResult.response.conversationId,
      reason: 'Clear sandbox-only history.',
    });

    expect(harness.assertActiveSession).toHaveBeenCalledWith(
      request.sessionId,
    );
    expect(harness.resolveActiveSessionKey).not.toHaveBeenCalled();
    expect(harness.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: request.sessionId,
        requestKind: 'chat-request',
        promptText: request.message,
        circuitContextVersion: request.circuitContext.version,
        rateLimitBucket: request.sessionId,
      }),
    );
    expect(harness.build).toHaveBeenCalledTimes(2);
    expect(firstResult.response).toEqual<ChatResponse>({
      message:
        'Chat request accepted by the sandbox broker. No provider request was made.',
      conversationId: 'sandbox-conversation-1',
      model: 'sandbox-stub',
      circuitContextVersion: request.circuitContext.version,
    });
    expect(firstResult.provider.debug).toEqual(
      expect.objectContaining({
        requestId: undefined,
        dispatchMode: 'noop',
        promptFingerprint: 'deadbeefdeadbeef',
      }),
    );
    expect(secondResult.response.conversationId).toBe('sandbox-conversation-1');
    expect(resetResult).toEqual<ChatResetResponse>({
      reset: true,
      sessionId: request.sessionId,
      conversationId: 'sandbox-conversation-1',
      clearedConversationIds: ['sandbox-conversation-1'],
      clearedTurns: 4,
      resetAt: '2026-03-21T00:00:00.000Z',
    });

    const firstPromptInput = harness.build.mock.calls[0]?.[0];
    const secondPromptInput = harness.build.mock.calls[1]?.[0];

    expect(firstPromptInput?.conversationId).toBe('sandbox-conversation-1');
    expect(firstPromptInput?.circuitContext.circuitId).toBe(
      request.circuitContext.circuitId,
    );
    expect(firstPromptInput?.history).toHaveLength(0);
    expect(firstResult.prompt.renderedPrompt).toContain(
      'conversationId=sandbox-conversation-1',
    );

    expect(secondPromptInput?.history).toHaveLength(2);
    expect(secondPromptInput?.history[0]).toMatchObject({
      role: 'user',
      content: request.message,
    });
    expect(secondPromptInput?.history[1]).toMatchObject({
      role: 'assistant',
      content: firstResult.response.message,
    });
    await expect(
      harness.conversationHistoryStore.get(
        request.sessionId,
        'sandbox-conversation-1',
      ),
    ).resolves.toBeNull();
  });

  it('blocks the request before prompt construction when policy rejects it', async () => {
    const request = createChatRequest();
    const harness = createHarness({ policyDecision: 'block' });

    await expect(harness.handler.handle(request)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      statusCode: 403,
    });
    expect(harness.assertActiveSession).toHaveBeenCalledWith(
      request.sessionId,
    );
    expect(harness.resolveActiveSessionKey).not.toHaveBeenCalled();
    expect(harness.build).not.toHaveBeenCalled();
    await expect(
      harness.conversationHistoryStore.get(
        request.sessionId,
        'sandbox-conversation-1',
      ),
    ).resolves.toBeNull();
  });
});

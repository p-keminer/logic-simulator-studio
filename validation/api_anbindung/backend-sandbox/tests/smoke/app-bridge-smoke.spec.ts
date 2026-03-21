import { describe, expect, it } from 'vitest';
import { LocalAppBridgeHarness } from '../../src/modules/edge-api/app-bridge-harness';
import type { ChatRequestHandler } from '../../src/modules/edge-api/chat-request-handler';
import {
  createAppBridgeChatRequest,
  createAppBridgeChatResetRequest,
} from '../integration/fixtures';

const smokeHandler: ChatRequestHandler = {
  async handle(input) {
    return {
      prompt: {
        templateVersion: 'sandbox-chat-v1',
        system: [],
        circuit: [],
        history: [],
        user: [],
        renderedPrompt: `conversationId=${input.conversationId ?? 'n/a'}`,
      },
      provider: {
        status: 'stubbed',
        provider: 'sandbox-noop',
        model: 'sandbox-stub',
        message: 'Smoke bridge response.',
        debug: {
          client: 'smoke-handler',
          attemptCount: 1,
          latencyMs: 0,
        },
      },
      response: {
        message: 'Smoke bridge response.',
        conversationId: input.conversationId,
        model: 'sandbox-stub',
        circuitContextVersion: input.circuitContext.version,
      },
    };
  },
  async reset(input) {
    return {
      reset: true,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      clearedConversationIds: input.conversationId
        ? [input.conversationId]
        : [],
      clearedTurns: 0,
      resetAt: '2026-03-21T00:00:00.000Z',
    };
  },
};

describe('app bridge smoke flow', () => {
  it('runs the local app bridge seam without touching the active app', async () => {
    const harness = new LocalAppBridgeHarness(smokeHandler);
    const sessionId = '11111111-1111-4111-8111-111111111111';
    const chatResult = await harness.handleChat(
      createAppBridgeChatRequest(sessionId),
    );
    const resetResult = await harness.handleReset(
      createAppBridgeChatResetRequest(sessionId),
    );

    expect(chatResult.prepared.chatRequest.circuitContext.scope).toBe(
      'active-circuit',
    );
    expect(chatResult.result.response.message).toBe('Smoke bridge response.');
    expect(resetResult.result.reset).toBe(true);
  });
});

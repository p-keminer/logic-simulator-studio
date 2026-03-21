import { describe, expect, it } from 'vitest';
import {
  chatRequestSchema,
  chatResetRequestSchema,
  chatResetResponseSchema,
  chatResponseSchema,
} from '../../src/contracts/chat';
import { reduceCircuitContext } from '../../src/modules/circuit-context/circuit-context-reducer';
import { createWhitelistedCircuitFixture } from '../circuit-context/fixtures';

const activeCircuitContext = reduceCircuitContext(
  createWhitelistedCircuitFixture(),
);

describe('chat contracts', () => {
  it('accepts valid chat request and reset payloads for the active-circuit sandbox flow', () => {
    expect(activeCircuitContext).not.toBeNull();

    expect(
      chatRequestSchema.safeParse({
        sessionId: '11111111-1111-4111-8111-111111111111',
        message: 'Explain the currently open circuit.',
        circuitContext: activeCircuitContext,
        conversationId: 'sandbox-conversation-1',
      }).success,
    ).toBe(true);

    expect(
      chatResponseSchema.safeParse({
        message:
          'Chat request accepted by the sandbox broker. No provider request was made.',
        conversationId: 'sandbox-conversation-1',
        model: 'sandbox-stub',
        circuitContextVersion: activeCircuitContext?.version,
      }).success,
    ).toBe(true);

    expect(
      chatResetRequestSchema.safeParse({
        sessionId: '11111111-1111-4111-8111-111111111111',
        conversationId: 'sandbox-conversation-1',
        reason: 'Clear sandbox-only history.',
      }).success,
    ).toBe(true);

    expect(
      chatResetResponseSchema.safeParse({
        reset: true,
        sessionId: '11111111-1111-4111-8111-111111111111',
        conversationId: 'sandbox-conversation-1',
        clearedConversationIds: ['sandbox-conversation-1'],
        clearedTurns: 4,
        resetAt: '2026-03-21T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects chat payloads with missing session binding, blank message text, or unknown fields', () => {
    expect(
      chatRequestSchema.safeParse({
        sessionId: '11111111-1111-4111-8111-111111111111',
        message: '   ',
        circuitContext: activeCircuitContext,
      }).success,
    ).toBe(false);

    expect(
      chatRequestSchema.safeParse({
        message: 'Explain the open circuit.',
        circuitContext: activeCircuitContext,
      }).success,
    ).toBe(false);

    expect(
      chatRequestSchema.safeParse({
        sessionId: '11111111-1111-4111-8111-111111111111',
        message: 'Explain the open circuit.',
        circuitContext: activeCircuitContext,
        debugOnly: true,
      }).success,
    ).toBe(false);

    expect(
      chatResetRequestSchema.safeParse({
        conversationId: 'sandbox-conversation-1',
      }).success,
    ).toBe(false);
  });
});

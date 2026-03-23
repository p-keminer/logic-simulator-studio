import '../setup';
import { describe, expect, it } from 'vitest';
import type {
  BackendBrokerConversationMessage,
  BackendBrokerSessionRegistration,
} from '../../core/backendBroker/contracts';
import type { BackendBrokerUiError } from '../../core/backendBroker/errors';
import {
  backendBrokerUiStateReducer,
  createInitialBackendBrokerUiState,
} from '../../core/backendBroker/uiState';

const activeSession: BackendBrokerSessionRegistration = {
  sessionId: 'session-1',
  issuedAt: '2026-03-23T10:00:00.000Z',
  expiresAt: '2026-03-23T10:05:00.000Z',
  status: 'active',
};

const userTurn = (
  overrides: Partial<BackendBrokerConversationMessage> = {},
): BackendBrokerConversationMessage => ({
  id: 'msg-user-1',
  role: 'user',
  content: 'Explain this circuit.',
  createdAt: '2026-03-23T10:01:00.000Z',
  ...overrides,
});

const assistantTurn = (
  overrides: Partial<BackendBrokerConversationMessage> = {},
): BackendBrokerConversationMessage => ({
  id: 'msg-assistant-1',
  role: 'assistant',
  content: 'The circuit behaves as a latch.',
  createdAt: '2026-03-23T10:01:01.000Z',
  model: 'sandbox-noop',
  ...overrides,
});

const sessionError: BackendBrokerUiError = {
  kind: 'session',
  title: 'Broker-Sitzung ist nicht mehr gueltig',
  message: 'Bitte den Broker-Key neu setzen.',
};

const rateLimitError: BackendBrokerUiError = {
  kind: 'rate-limit',
  title: 'Broker-Limit erreicht',
  message: 'Bitte spaeter erneut versuchen.',
  retryAfterSeconds: 9,
};

describe('backend broker ui state reducer', () => {
  it('clears session, conversation and optimistic turns on session-invalidated chat failure', () => {
    let state = createInitialBackendBrokerUiState();
    state = backendBrokerUiStateReducer(state, {
      type: 'connect-success',
      session: activeSession,
    });
    state = backendBrokerUiStateReducer(state, {
      type: 'send-start',
      userTurn: userTurn(),
    });

    state = backendBrokerUiStateReducer(state, {
      type: 'send-failure',
      error: sessionError,
      sessionInvalidated: true,
    });

    expect(state).toEqual({
      phase: 'idle',
      session: null,
      conversationId: undefined,
      messages: [],
      lastError: sessionError,
    });
  });

  it('keeps the optimistic user turn on non-session chat failures', () => {
    let state = createInitialBackendBrokerUiState();
    state = backendBrokerUiStateReducer(state, {
      type: 'connect-success',
      session: activeSession,
    });
    state = backendBrokerUiStateReducer(state, {
      type: 'send-start',
      userTurn: userTurn(),
    });

    state = backendBrokerUiStateReducer(state, {
      type: 'send-failure',
      error: rateLimitError,
      sessionInvalidated: false,
    });

    expect(state.phase).toBe('active');
    expect(state.session).toEqual(activeSession);
    expect(state.messages).toEqual([userTurn()]);
    expect(state.lastError).toEqual(rateLimitError);
  });

  it('uses the same clear-session behavior for reset and disconnect session failures', () => {
    let state = createInitialBackendBrokerUiState();
    state = backendBrokerUiStateReducer(state, {
      type: 'connect-success',
      session: activeSession,
    });
    state = backendBrokerUiStateReducer(state, {
      type: 'send-start',
      userTurn: userTurn(),
    });
    state = backendBrokerUiStateReducer(state, {
      type: 'send-success',
      assistantTurn: assistantTurn(),
      conversationId: 'conversation-1',
    });

    const resetFailureState = backendBrokerUiStateReducer(state, {
      type: 'reset-failure',
      error: sessionError,
      sessionInvalidated: true,
    });

    const disconnectFailureState = backendBrokerUiStateReducer(state, {
      type: 'disconnect-failure',
      error: sessionError,
      sessionInvalidated: true,
    });

    expect(resetFailureState).toEqual({
      phase: 'idle',
      session: null,
      conversationId: undefined,
      messages: [],
      lastError: sessionError,
    });
    expect(disconnectFailureState).toEqual(resetFailureState);
  });
});

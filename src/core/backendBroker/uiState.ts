import type {
  BackendBrokerConversationMessage,
  BackendBrokerSessionRegistration,
} from './contracts';
import type {
  BackendBrokerRateLimitRequestKind,
  BackendBrokerUiError,
} from './errors';

export type BackendBrokerPhase =
  | 'idle'
  | 'connecting'
  | 'active'
  | 'sending'
  | 'resetting'
  | 'disconnecting';

export interface BackendBrokerUiState {
  phase: BackendBrokerPhase;
  session: BackendBrokerSessionRegistration | null;
  conversationId?: string;
  messages: BackendBrokerConversationMessage[];
  lastError: BackendBrokerUiError | null;
  pendingUserTurnId?: string;
  rateLimitCooldownUntilByRequestKind: Partial<
    Record<BackendBrokerRateLimitRequestKind, number>
  >;
}

type BackendBrokerUiStateAction =
  | { type: 'clear-local-state' }
  | { type: 'clear-error' }
  | { type: 'set-error'; error: BackendBrokerUiError }
  | { type: 'connect-start' }
  | { type: 'connect-success'; session: BackendBrokerSessionRegistration }
  | { type: 'connect-failure'; error: BackendBrokerUiError; nowMs: number }
  | { type: 'disconnect-no-session' }
  | { type: 'disconnect-start' }
  | {
      type: 'disconnect-failure';
      error: BackendBrokerUiError;
      nowMs: number;
      sessionInvalidated: boolean;
    }
  | { type: 'disconnect-success' }
  | { type: 'send-start'; userTurn: BackendBrokerConversationMessage }
  | {
      type: 'send-success';
      assistantTurn: BackendBrokerConversationMessage;
      conversationId: string;
    }
  | {
      type: 'send-failure';
      error: BackendBrokerUiError;
      nowMs: number;
      sessionInvalidated: boolean;
    }
  | { type: 'reset-start' }
  | {
      type: 'reset-failure';
      error: BackendBrokerUiError;
      nowMs: number;
      sessionInvalidated: boolean;
    }
  | { type: 'reset-success' };

export const createInitialBackendBrokerUiState = (): BackendBrokerUiState => ({
  phase: 'idle',
  session: null,
  conversationId: undefined,
  messages: [],
  lastError: null,
  pendingUserTurnId: undefined,
  rateLimitCooldownUntilByRequestKind: {},
});

const clearSessionScopedRateLimitCooldowns = (
  cooldowns: BackendBrokerUiState['rateLimitCooldownUntilByRequestKind'],
): BackendBrokerUiState['rateLimitCooldownUntilByRequestKind'] => {
  const sessionKeyCooldown = cooldowns['session-key'];

  return typeof sessionKeyCooldown === 'number'
    ? { 'session-key': sessionKeyCooldown }
    : {};
};

const clearSessionState = (
  state: BackendBrokerUiState,
  error: BackendBrokerUiError | null,
): BackendBrokerUiState => ({
  ...state,
  phase: 'idle',
  session: null,
  conversationId: undefined,
  messages: [],
  lastError: error,
  pendingUserTurnId: undefined,
  rateLimitCooldownUntilByRequestKind: clearSessionScopedRateLimitCooldowns(
    state.rateLimitCooldownUntilByRequestKind,
  ),
});

const applyRateLimitCooldown = (
  cooldowns: BackendBrokerUiState['rateLimitCooldownUntilByRequestKind'],
  error: BackendBrokerUiError,
  nowMs: number,
): BackendBrokerUiState['rateLimitCooldownUntilByRequestKind'] => {
  if (
    error.kind !== 'rate-limit' ||
    !error.requestKind ||
    typeof error.retryAfterSeconds !== 'number' ||
    error.retryAfterSeconds <= 0
  ) {
    return cooldowns;
  }

  return {
    ...cooldowns,
    [error.requestKind]: nowMs + error.retryAfterSeconds * 1000,
  };
};

const clearRateLimitCooldown = (
  cooldowns: BackendBrokerUiState['rateLimitCooldownUntilByRequestKind'],
  requestKind: BackendBrokerRateLimitRequestKind,
): BackendBrokerUiState['rateLimitCooldownUntilByRequestKind'] => {
  const nextCooldowns = { ...cooldowns };

  delete nextCooldowns[requestKind];

  return nextCooldowns;
};

const createFailureState = (
  state: BackendBrokerUiState,
  action: {
    type: 'connect-failure' | 'disconnect-failure' | 'send-failure' | 'reset-failure';
    error: BackendBrokerUiError;
    nowMs: number;
    sessionInvalidated?: boolean;
  },
): BackendBrokerUiState => {
  if (action.sessionInvalidated) {
    return clearSessionState(state, action.error);
  }

  return {
    ...state,
    phase: action.type === 'connect-failure' ? 'idle' : 'active',
    lastError: action.error,
    pendingUserTurnId:
      action.type === 'send-failure' ? undefined : state.pendingUserTurnId,
    messages:
      action.type === 'send-failure' && state.pendingUserTurnId
        ? state.messages.filter((message) => message.id !== state.pendingUserTurnId)
        : state.messages,
    rateLimitCooldownUntilByRequestKind: applyRateLimitCooldown(
      state.rateLimitCooldownUntilByRequestKind,
      action.error,
      action.nowMs,
    ),
  };
};

export function backendBrokerUiStateReducer(
  state: BackendBrokerUiState,
  action: BackendBrokerUiStateAction,
): BackendBrokerUiState {
  switch (action.type) {
    case 'clear-local-state':
      return clearSessionState(state, null);
    case 'clear-error':
      return {
        ...state,
        lastError: null,
      };
    case 'set-error':
      return {
        ...state,
        lastError: action.error,
      };
    case 'connect-start':
      return {
        ...state,
        phase: 'connecting',
        lastError: null,
      };
    case 'connect-success':
      return {
        phase: 'active',
        session: action.session,
        conversationId: undefined,
        messages: [],
        lastError: null,
        pendingUserTurnId: undefined,
        rateLimitCooldownUntilByRequestKind: {},
      };
    case 'connect-failure':
      return createFailureState(state, action);
    case 'disconnect-no-session':
      return {
        ...state,
        phase: 'idle',
        conversationId: undefined,
        messages: [],
        rateLimitCooldownUntilByRequestKind: clearSessionScopedRateLimitCooldowns(
          state.rateLimitCooldownUntilByRequestKind,
        ),
      };
    case 'disconnect-start':
      return {
        ...state,
        phase: 'disconnecting',
        lastError: null,
      };
    case 'disconnect-failure':
      return createFailureState(state, action);
    case 'disconnect-success':
      return clearSessionState(state, null);
    case 'send-start':
      return {
        ...state,
        phase: 'sending',
        lastError: null,
        messages: [...state.messages, action.userTurn],
        pendingUserTurnId: action.userTurn.id,
      };
    case 'send-success':
      return {
        ...state,
        phase: 'active',
        conversationId: action.conversationId,
        messages: [...state.messages, action.assistantTurn],
        pendingUserTurnId: undefined,
        rateLimitCooldownUntilByRequestKind: clearRateLimitCooldown(
          state.rateLimitCooldownUntilByRequestKind,
          'chat-request',
        ),
      };
    case 'send-failure':
      return createFailureState(state, action);
    case 'reset-start':
      return {
        ...state,
        phase: 'resetting',
        lastError: null,
      };
    case 'reset-failure':
      return createFailureState(state, action);
    case 'reset-success':
      return {
        ...state,
        phase: 'active',
        conversationId: undefined,
        messages: [],
        pendingUserTurnId: undefined,
        rateLimitCooldownUntilByRequestKind: clearRateLimitCooldown(
          state.rateLimitCooldownUntilByRequestKind,
          'chat-reset',
        ),
      };
    default:
      return state;
  }
}

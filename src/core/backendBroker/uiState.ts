import type {
  BackendBrokerConversationMessage,
  BackendBrokerSessionRegistration,
} from './contracts';
import type { BackendBrokerUiError } from './errors';

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
}

type BackendBrokerUiStateAction =
  | { type: 'clear-error' }
  | { type: 'set-error'; error: BackendBrokerUiError }
  | { type: 'connect-start' }
  | { type: 'connect-success'; session: BackendBrokerSessionRegistration }
  | { type: 'connect-failure'; error: BackendBrokerUiError }
  | { type: 'disconnect-no-session' }
  | { type: 'disconnect-start' }
  | {
      type: 'disconnect-failure';
      error: BackendBrokerUiError;
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
      sessionInvalidated: boolean;
    }
  | { type: 'reset-start' }
  | {
      type: 'reset-failure';
      error: BackendBrokerUiError;
      sessionInvalidated: boolean;
    }
  | { type: 'reset-success' };

export const createInitialBackendBrokerUiState = (): BackendBrokerUiState => ({
  phase: 'idle',
  session: null,
  conversationId: undefined,
  messages: [],
  lastError: null,
});

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
});

const createFailureState = (
  state: BackendBrokerUiState,
  action: {
    type: 'connect-failure' | 'disconnect-failure' | 'send-failure' | 'reset-failure';
    error: BackendBrokerUiError;
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
  };
};

export function backendBrokerUiStateReducer(
  state: BackendBrokerUiState,
  action: BackendBrokerUiStateAction,
): BackendBrokerUiState {
  switch (action.type) {
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
      };
    case 'connect-failure':
      return {
        ...state,
        phase: 'idle',
        lastError: action.error,
      };
    case 'disconnect-no-session':
      return {
        ...state,
        phase: 'idle',
        conversationId: undefined,
        messages: [],
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
      };
    case 'send-success':
      return {
        ...state,
        phase: 'active',
        conversationId: action.conversationId,
        messages: [...state.messages, action.assistantTurn],
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
      };
    default:
      return state;
  }
}

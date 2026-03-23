/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  startTransition,
  useContext,
  useReducer,
  useState,
} from 'react';
import type {
  BackendBrokerConversationMessage,
  BackendBrokerChatResetResponse,
  BackendBrokerChatResponse,
  BackendBrokerSessionDeletion,
  BackendBrokerSessionRegistration,
} from '../core/backendBroker/contracts';
import {
  BackendBrokerClient,
  DEFAULT_BACKEND_BROKER_BASE_URL,
  normalizeBackendBrokerBaseUrl,
} from '../core/backendBroker/client';
import { createBackendBrokerCircuitContext } from '../core/backendBroker/circuitContext';
import { isBackendBrokerUiEnabled } from '../core/backendBroker/featureFlags';
import {
  toBackendBrokerUiError,
  type BackendBrokerUiError,
} from '../core/backendBroker/errors';
import {
  backendBrokerUiStateReducer,
  createInitialBackendBrokerUiState,
  type BackendBrokerPhase,
} from '../core/backendBroker/uiState';
import type {
  BackendSandboxCurrentCircuitSnapshot,
  BackendSandboxCurrentCircuitSnapshotSummary,
} from '../core/io/backendSandboxSnapshot';

export interface BackendBrokerContextValue {
  brokerBaseUrl: string;
  setBrokerBaseUrl: (nextBaseUrl: string) => void;
  phase: BackendBrokerPhase;
  hasActiveSession: boolean;
  session: BackendBrokerSessionRegistration | null;
  conversationId?: string;
  messages: BackendBrokerConversationMessage[];
  lastError: BackendBrokerUiError | null;
  clearError: () => void;
  connect: (apiKey: string) => Promise<BackendBrokerSessionRegistration>;
  disconnect: () => Promise<BackendBrokerSessionDeletion | null>;
  resetConversation: (
    reason?: string,
  ) => Promise<BackendBrokerChatResetResponse | null>;
  sendMessage: (
    message: string,
    snapshot: BackendSandboxCurrentCircuitSnapshot,
    snapshotSummary: BackendSandboxCurrentCircuitSnapshotSummary,
  ) => Promise<BackendBrokerChatResponse>;
}

interface BackendBrokerProviderProps {
  children: React.ReactNode;
}

const BackendBrokerContext = createContext<BackendBrokerContextValue | null>(
  null,
);

const createDisabledFeatureError = () =>
  new Error(
    'Backend broker UI ist in diesem Build nicht verfuegbar.',
  );

const DISABLED_BACKEND_BROKER_CONTEXT: BackendBrokerContextValue = {
  brokerBaseUrl: DEFAULT_BACKEND_BROKER_BASE_URL,
  setBrokerBaseUrl: () => undefined,
  phase: 'idle',
  hasActiveSession: false,
  session: null,
  conversationId: undefined,
  messages: [],
  lastError: null,
  clearError: () => undefined,
  connect: async () => {
    throw createDisabledFeatureError();
  },
  disconnect: async () => {
    throw createDisabledFeatureError();
  },
  resetConversation: async () => {
    throw createDisabledFeatureError();
  },
  sendMessage: async () => {
    throw createDisabledFeatureError();
  },
};

const createConversationMessage = (
  role: BackendBrokerConversationMessage['role'],
  content: string,
  options: {
    createdAt?: string;
    model?: string;
  } = {},
): BackendBrokerConversationMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: options.createdAt ?? new Date().toISOString(),
  model: options.model,
});

const createMissingSessionError = (): BackendBrokerUiError => ({
  kind: 'session',
  title: 'Broker-Key fehlt',
  message:
    'Bevor Chat oder Reset ueber den Broker laufen koennen, muss zuerst ein gueltiger Broker-Key gesetzt werden.',
});

const resolveInitialBaseUrl = () => {
  const envValue = import.meta.env.VITE_BACKEND_BROKER_BASE_URL;

  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return normalizeBackendBrokerBaseUrl(envValue);
  }

  return DEFAULT_BACKEND_BROKER_BASE_URL;
};

const logBackendBrokerDebug = (
  message: string,
  details: Record<string, unknown>,
) => {
  console.debug(`[backend-broker-ui] ${message}`, details);
};

export function BackendBrokerProvider({
  children,
}: BackendBrokerProviderProps): React.JSX.Element {
  const [brokerBaseUrl, setBrokerBaseUrlState] = useState(resolveInitialBaseUrl);
  const [uiState, dispatchUiState] = useReducer(
    backendBrokerUiStateReducer,
    undefined,
    createInitialBackendBrokerUiState,
  );
  const { phase, session, conversationId, messages, lastError } = uiState;
  const createClient = () => new BackendBrokerClient({ baseUrl: brokerBaseUrl });

  const setBrokerBaseUrl = (nextBaseUrl: string) => {
    const normalized = normalizeBackendBrokerBaseUrl(nextBaseUrl);
    setBrokerBaseUrlState(normalized);

    logBackendBrokerDebug('broker base url updated', {
      brokerBaseUrl: normalized,
    });
  };

  const clearError = () => {
    dispatchUiState({ type: 'clear-error' });
  };

  const connect = async (apiKey: string) => {
    dispatchUiState({ type: 'connect-start' });

    try {
      const client = createClient();
      const nextSession = await client.registerSessionKey(apiKey);

      startTransition(() => {
        dispatchUiState({ type: 'connect-success', session: nextSession });
      });

      logBackendBrokerDebug('broker session established', {
        brokerBaseUrl: client.getBaseUrl(),
        expiresAt: nextSession.expiresAt,
        sessionId: nextSession.sessionId,
      });

      return nextSession;
    } catch (error) {
      const mappedError = toBackendBrokerUiError(error);
      dispatchUiState({ type: 'connect-failure', error: mappedError });
      throw error;
    }
  };

  const disconnect = async () => {
    if (!session) {
      startTransition(() => {
        dispatchUiState({ type: 'disconnect-no-session' });
      });

      return null;
    }

    dispatchUiState({ type: 'disconnect-start' });

    try {
      const client = createClient();
      const result = await client.deleteSessionKey(session.sessionId);

      startTransition(() => {
        dispatchUiState({ type: 'disconnect-success' });
      });

      logBackendBrokerDebug('broker session deleted', {
        brokerBaseUrl: client.getBaseUrl(),
        deletedAt: result.deletedAt,
        sessionId: result.sessionId,
      });

      return result;
    } catch (error) {
      const mappedError = toBackendBrokerUiError(error);

      dispatchUiState({
        type: 'disconnect-failure',
        error: mappedError,
        sessionInvalidated: mappedError.kind === 'session',
      });

      throw error;
    }
  };

  const sendMessage = async (
    rawMessage: string,
    snapshot: BackendSandboxCurrentCircuitSnapshot,
    snapshotSummary: BackendSandboxCurrentCircuitSnapshotSummary,
  ) => {
    const message = rawMessage.trim();

    if (!session) {
      const missingSessionError = createMissingSessionError();
      dispatchUiState({ type: 'set-error', error: missingSessionError });
      throw new Error(missingSessionError.message);
    }

    if (message.length === 0) {
      throw new Error('Broker chat requests require a non-empty user message.');
    }

    const nextConversationId = conversationId ?? crypto.randomUUID();
    const userTurn = createConversationMessage('user', message);

    dispatchUiState({ type: 'send-start', userTurn });

    try {
      const client = createClient();
      const circuitContext = createBackendBrokerCircuitContext(snapshot);
      const response = await client.sendChatRequest({
        sessionId: session.sessionId,
        message,
        conversationId: nextConversationId,
        circuitContext,
      });
      const assistantTurn = createConversationMessage('assistant', response.message, {
        model: response.model,
      });

      startTransition(() => {
        dispatchUiState({
          type: 'send-success',
          assistantTurn,
          conversationId: response.conversationId ?? nextConversationId,
        });
      });

      logBackendBrokerDebug('broker chat response received', {
        brokerBaseUrl: client.getBaseUrl(),
        circuitContextVersion: response.circuitContextVersion,
        conversationId: response.conversationId ?? nextConversationId,
        model: response.model,
        selectedElementCount: snapshotSummary.selectedElementCount,
        sessionId: session.sessionId,
        snapshotFingerprint: snapshotSummary.snapshotFingerprint,
      });

      return response;
    } catch (error) {
      const mappedError = toBackendBrokerUiError(error);

      dispatchUiState({
        type: 'send-failure',
        error: mappedError,
        sessionInvalidated: mappedError.kind === 'session',
      });

      throw error;
    }
  };

  const resetConversation = async (reason?: string) => {
    if (!session) {
      const missingSessionError = createMissingSessionError();
      dispatchUiState({ type: 'set-error', error: missingSessionError });
      throw new Error(missingSessionError.message);
    }

    dispatchUiState({ type: 'reset-start' });

    try {
      const client = createClient();
      const response = await client.resetChat({
        sessionId: session.sessionId,
        conversationId,
        reason,
      });

      startTransition(() => {
        dispatchUiState({ type: 'reset-success' });
      });

      logBackendBrokerDebug('broker conversation reset', {
        brokerBaseUrl: client.getBaseUrl(),
        clearedConversationIds: response.clearedConversationIds,
        clearedTurns: response.clearedTurns,
        sessionId: response.sessionId,
      });

      return response;
    } catch (error) {
      const mappedError = toBackendBrokerUiError(error);

      dispatchUiState({
        type: 'reset-failure',
        error: mappedError,
        sessionInvalidated: mappedError.kind === 'session',
      });

      throw error;
    }
  };

  return (
    <BackendBrokerContext.Provider
      value={{
        brokerBaseUrl,
        setBrokerBaseUrl,
        phase,
        hasActiveSession: Boolean(session),
        session,
        conversationId,
        messages,
        lastError,
        clearError,
        connect,
        disconnect,
        resetConversation,
        sendMessage,
      }}
    >
      {children}
    </BackendBrokerContext.Provider>
  );
}

export function useBackendBroker(): BackendBrokerContextValue {
  const context = useContext(BackendBrokerContext);

  if (!context) {
    throw new Error('useBackendBroker must be used within BackendBrokerProvider');
  }

  return context;
}

export function useOptionalBackendBroker(): BackendBrokerContextValue {
  const context = useContext(BackendBrokerContext);

  if (context) {
    return context;
  }

  if (!isBackendBrokerUiEnabled()) {
    return DISABLED_BACKEND_BROKER_CONTEXT;
  }

  throw new Error('useOptionalBackendBroker must be used within BackendBrokerProvider');
}

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  startTransition,
  useEffect,
  useContext,
  useMemo,
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
import {
  applyBackendBrokerUiActionContext,
  shouldAutoClearBackendBrokerUiError,
  toBackendBrokerUiError,
  type BackendBrokerUiError,
} from '../core/backendBroker/errors';
import {
  backendBrokerUiStateReducer,
  createInitialBackendBrokerUiState,
  type BackendBrokerPhase,
} from '../core/backendBroker/uiState';
import { useBackendBrokerDebugBridge } from './useBackendBrokerDebugBridge';
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
  rateLimitCooldownRemainingSeconds: {
    sessionKey: number;
    chatRequest: number;
    chatReset: number;
  };
  lastError: BackendBrokerUiError | null;
  clearError: () => void;
  clearLocalState: () => void;
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
    try {
      return normalizeBackendBrokerBaseUrl(envValue);
    } catch {
      return envValue.trim();
    }
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
  const [cooldownClockMs, setCooldownClockMs] = useState(() => Date.now());
  const [uiState, dispatchUiState] = useReducer(
    backendBrokerUiStateReducer,
    undefined,
    createInitialBackendBrokerUiState,
  );
  const {
    phase,
    session,
    conversationId,
    messages,
    lastError,
    rateLimitCooldownUntilByRequestKind,
  } = uiState;
  useBackendBrokerDebugBridge({
    brokerBaseUrl,
    conversationId,
    hasActiveSession: Boolean(session),
    lastErrorKind: lastError?.kind,
    lastErrorTitle: lastError?.title,
    messageCount: messages.length,
    phase,
    sessionId: session?.sessionId,
  });
  const createClient = () => new BackendBrokerClient({ baseUrl: brokerBaseUrl });

  useEffect(() => {
    const hasActiveCooldown = Object.values(
      rateLimitCooldownUntilByRequestKind,
    ).some((value) => typeof value === 'number' && value > Date.now());

    if (!hasActiveCooldown) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCooldownClockMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [rateLimitCooldownUntilByRequestKind]);

  const rateLimitCooldownRemainingSeconds = useMemo(
    () => ({
      sessionKey: Math.max(
        0,
        Math.ceil(
          ((rateLimitCooldownUntilByRequestKind['session-key'] ?? 0) -
            cooldownClockMs) /
            1000,
        ),
      ),
      chatRequest: Math.max(
        0,
        Math.ceil(
          ((rateLimitCooldownUntilByRequestKind['chat-request'] ?? 0) -
            cooldownClockMs) /
            1000,
        ),
      ),
      chatReset: Math.max(
        0,
        Math.ceil(
          ((rateLimitCooldownUntilByRequestKind['chat-reset'] ?? 0) -
            cooldownClockMs) /
            1000,
        ),
      ),
    }),
    [cooldownClockMs, rateLimitCooldownUntilByRequestKind],
  );

  useEffect(() => {
    if (
      !shouldAutoClearBackendBrokerUiError(
        lastError,
        rateLimitCooldownRemainingSeconds,
      )
    ) {
      return;
    }

    dispatchUiState({ type: 'clear-error' });
  }, [lastError, rateLimitCooldownRemainingSeconds]);

  const setBrokerBaseUrl = (nextBaseUrl: string) => {
    setBrokerBaseUrlState(nextBaseUrl);

    logBackendBrokerDebug('broker base url updated', {
      brokerBaseUrl: nextBaseUrl,
    });
  };

  const clearError = () => {
    dispatchUiState({ type: 'clear-error' });
  };

  const clearLocalState = () => {
    dispatchUiState({ type: 'clear-local-state' });
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
      const mappedError = applyBackendBrokerUiActionContext(
        toBackendBrokerUiError(error),
        'connect',
      );
      dispatchUiState({
        type: 'connect-failure',
        error: mappedError,
        nowMs: Date.now(),
      });
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
      const mappedError = applyBackendBrokerUiActionContext(
        toBackendBrokerUiError(error),
        'disconnect',
      );

      dispatchUiState({
        type: 'disconnect-failure',
        error: mappedError,
        nowMs: Date.now(),
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
      const mappedError = applyBackendBrokerUiActionContext(
        toBackendBrokerUiError(error),
        'send',
      );

      dispatchUiState({
        type: 'send-failure',
        error: mappedError,
        nowMs: Date.now(),
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
      const mappedError = applyBackendBrokerUiActionContext(
        toBackendBrokerUiError(error),
        'reset',
      );

      dispatchUiState({
        type: 'reset-failure',
        error: mappedError,
        nowMs: Date.now(),
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
        rateLimitCooldownRemainingSeconds,
        lastError,
        clearError,
        clearLocalState,
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

import {
  createContext,
  startTransition,
  useContext,
  useMemo,
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
import type {
  BackendSandboxCurrentCircuitSnapshot,
  BackendSandboxCurrentCircuitSnapshotSummary,
} from '../core/io/backendSandboxSnapshot';

export type BackendBrokerPhase =
  | 'idle'
  | 'connecting'
  | 'active'
  | 'sending'
  | 'resetting'
  | 'disconnecting';

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
    'Backend broker UI is disabled. Set VITE_ENABLE_BACKEND_BROKER_UI=1 in a dev build to enable it.',
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
  const [phase, setPhase] = useState<BackendBrokerPhase>('idle');
  const [session, setSession] = useState<BackendBrokerSessionRegistration | null>(
    null,
  );
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<BackendBrokerConversationMessage[]>([]);
  const [lastError, setLastError] = useState<BackendBrokerUiError | null>(null);

  const client = useMemo(
    () => new BackendBrokerClient({ baseUrl: brokerBaseUrl }),
    [brokerBaseUrl],
  );

  const setBrokerBaseUrl = (nextBaseUrl: string) => {
    const normalized = normalizeBackendBrokerBaseUrl(nextBaseUrl);
    setBrokerBaseUrlState(normalized);

    logBackendBrokerDebug('broker base url updated', {
      brokerBaseUrl: normalized,
    });
  };

  const clearError = () => {
    setLastError(null);
  };

  const connect = async (apiKey: string) => {
    setLastError(null);
    setPhase('connecting');

    try {
      const nextSession = await client.registerSessionKey(apiKey);

      startTransition(() => {
        setSession(nextSession);
        setConversationId(undefined);
        setMessages([]);
        setPhase('active');
      });

      logBackendBrokerDebug('broker session established', {
        brokerBaseUrl: client.getBaseUrl(),
        expiresAt: nextSession.expiresAt,
        sessionId: nextSession.sessionId,
      });

      return nextSession;
    } catch (error) {
      const mappedError = toBackendBrokerUiError(error);
      setLastError(mappedError);
      setPhase('idle');
      throw error;
    }
  };

  const disconnect = async () => {
    if (!session) {
      startTransition(() => {
        setConversationId(undefined);
        setMessages([]);
        setPhase('idle');
      });

      return null;
    }

    setLastError(null);
    setPhase('disconnecting');

    try {
      const result = await client.deleteSessionKey(session.sessionId);

      startTransition(() => {
        setSession(null);
        setConversationId(undefined);
        setMessages([]);
        setPhase('idle');
      });

      logBackendBrokerDebug('broker session deleted', {
        brokerBaseUrl: client.getBaseUrl(),
        deletedAt: result.deletedAt,
        sessionId: result.sessionId,
      });

      return result;
    } catch (error) {
      const mappedError = toBackendBrokerUiError(error);

      setLastError(mappedError);
      if (mappedError.kind === 'session') {
        startTransition(() => {
          setSession(null);
          setConversationId(undefined);
          setMessages([]);
          setPhase('idle');
        });
      } else {
        setPhase('active');
      }

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
      setLastError(missingSessionError);
      throw new Error(missingSessionError.message);
    }

    if (message.length === 0) {
      throw new Error('Broker chat requests require a non-empty user message.');
    }

    setLastError(null);
    setPhase('sending');

    const nextConversationId = conversationId ?? crypto.randomUUID();
    const userTurn = createConversationMessage('user', message);

    startTransition(() => {
      setMessages((currentMessages) => [...currentMessages, userTurn]);
    });

    try {
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
        setConversationId(response.conversationId ?? nextConversationId);
        setMessages((currentMessages) => [...currentMessages, assistantTurn]);
        setPhase('active');
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

      setLastError(mappedError);
      if (mappedError.kind === 'session') {
        startTransition(() => {
          setSession(null);
          setConversationId(undefined);
          setPhase('idle');
        });
      } else {
        setPhase('active');
      }

      throw error;
    }
  };

  const resetConversation = async (reason?: string) => {
    if (!session) {
      const missingSessionError = createMissingSessionError();
      setLastError(missingSessionError);
      throw new Error(missingSessionError.message);
    }

    setLastError(null);
    setPhase('resetting');

    try {
      const response = await client.resetChat({
        sessionId: session.sessionId,
        conversationId,
        reason,
      });

      startTransition(() => {
        setConversationId(undefined);
        setMessages([]);
        setPhase('active');
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

      setLastError(mappedError);
      if (mappedError.kind === 'session') {
        startTransition(() => {
          setSession(null);
          setConversationId(undefined);
          setMessages([]);
          setPhase('idle');
        });
      } else {
        setPhase('active');
      }

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

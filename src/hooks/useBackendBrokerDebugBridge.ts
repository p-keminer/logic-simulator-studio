import { useEffect, useMemo, useRef } from 'react';
import type { BackendBrokerUiError } from '../core/backendBroker/errors';
import type { BackendBrokerPhase } from '../core/backendBroker/uiState';

export interface BackendBrokerDebugBridgeState {
  brokerBaseUrl: string;
  conversationId?: string;
  hasActiveSession: boolean;
  lastErrorKind?: BackendBrokerUiError['kind'];
  lastErrorTitle?: string;
  messageCount: number;
  phase: BackendBrokerPhase;
  sessionId?: string;
}

export interface BackendBrokerDebugBridgeHandle {
  getState: () => BackendBrokerDebugBridgeState;
}

declare global {
  interface Window {
    __LGSIM_BACKEND_BROKER__?: BackendBrokerDebugBridgeHandle;
  }
}

function logBrokerDebugState(message: string, state: BackendBrokerDebugBridgeState) {
  console.debug(`[backend-broker-bridge] ${message}`, {
    brokerBaseUrl: state.brokerBaseUrl,
    conversationId: state.conversationId,
    hasActiveSession: state.hasActiveSession,
    lastErrorKind: state.lastErrorKind,
    lastErrorTitle: state.lastErrorTitle,
    messageCount: state.messageCount,
    phase: state.phase,
    sessionId: state.sessionId,
  });
}

interface UseBackendBrokerDebugBridgeInput {
  brokerBaseUrl: string;
  conversationId?: string;
  hasActiveSession: boolean;
  lastErrorTitle?: string;
  lastErrorKind?: BackendBrokerUiError['kind'];
  messageCount: number;
  phase: BackendBrokerPhase;
  sessionId?: string;
}

export function useBackendBrokerDebugBridge(
  input: UseBackendBrokerDebugBridgeInput,
): void {
  const state = useMemo<BackendBrokerDebugBridgeState>(
    () => ({
      brokerBaseUrl: input.brokerBaseUrl,
      conversationId: input.conversationId,
      hasActiveSession: input.hasActiveSession,
      lastErrorKind: input.lastErrorKind,
      lastErrorTitle: input.lastErrorTitle,
      messageCount: input.messageCount,
      phase: input.phase,
      sessionId: input.sessionId,
    }),
    [
      input.brokerBaseUrl,
      input.conversationId,
      input.hasActiveSession,
      input.lastErrorKind,
      input.lastErrorTitle,
      input.messageCount,
      input.phase,
      input.sessionId,
    ],
  );
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    const handle: BackendBrokerDebugBridgeHandle = {
      getState: () => stateRef.current,
    };

    window.__LGSIM_BACKEND_BROKER__ = handle;
    logBrokerDebugState('debug handle attached', stateRef.current);

    return () => {
      if (window.__LGSIM_BACKEND_BROKER__ === handle) {
        delete window.__LGSIM_BACKEND_BROKER__;
      }

      console.debug('[backend-broker-bridge] debug handle detached');
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') {
      return;
    }

    logBrokerDebugState('broker ui state updated', stateRef.current);
  }, [state]);
}

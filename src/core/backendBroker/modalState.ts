import type { BackendBrokerPhase } from './uiState';

export interface BackendBrokerModalControlStateInput {
  phase: BackendBrokerPhase;
  hasActiveSession: boolean;
  apiKeyInput: string;
  draftMessage: string;
  sessionKeyCooldownRemainingSeconds: number;
  chatRequestCooldownRemainingSeconds: number;
  chatResetCooldownRemainingSeconds: number;
}

export interface BackendBrokerModalControlState {
  baseUrlDisabled: boolean;
  apiKeyDisabled: boolean;
  connectDisabled: boolean;
  connectLabel: string;
  disconnectDisabled: boolean;
  disconnectLabel: string;
  draftMessageDisabled: boolean;
  draftResetReasonDisabled: boolean;
  phaseLabel: string;
  resetDisabled: boolean;
  resetLabel: string;
  sendDisabled: boolean;
  sendLabel: string;
}

export function getBackendBrokerModalControlState(
  input: BackendBrokerModalControlStateInput,
): BackendBrokerModalControlState {
  const trimmedApiKeyLength = input.apiKeyInput.trim().length;
  const trimmedDraftMessageLength = input.draftMessage.trim().length;
  const sessionActionBusy =
    input.phase === 'sending' ||
    input.phase === 'resetting' ||
    input.phase === 'disconnecting';
  const chatControlsDisabled = !input.hasActiveSession || input.phase !== 'active';
  const phaseLabel =
    input.phase === 'connecting'
      ? 'verbinde'
      : input.phase === 'sending'
        ? 'sende'
        : input.phase === 'resetting'
          ? 'reset'
          : input.phase === 'disconnecting'
            ? 'loesche'
            : input.phase;
  const connectLabel =
    input.phase === 'connecting'
      ? 'Verbinde...'
      : input.sessionKeyCooldownRemainingSeconds > 0
        ? `Warte ${input.sessionKeyCooldownRemainingSeconds}s`
        : 'Broker-Key setzen';
  const disconnectLabel =
    input.phase === 'disconnecting'
      ? 'Loesche...'
      : 'Broker-Key loeschen';
  const resetLabel =
    input.phase === 'resetting'
      ? 'Reset laeuft...'
      : input.chatResetCooldownRemainingSeconds > 0
        ? `Reset in ${input.chatResetCooldownRemainingSeconds}s`
        : 'Broker-Reset';
  const sendLabel =
    input.phase === 'sending'
      ? 'Sende...'
      : input.chatRequestCooldownRemainingSeconds > 0
        ? `Sende in ${input.chatRequestCooldownRemainingSeconds}s`
        : 'Nachricht senden';

  return {
    baseUrlDisabled: input.hasActiveSession || input.phase === 'connecting',
    apiKeyDisabled: input.phase === 'connecting',
    connectDisabled:
      input.phase === 'connecting' ||
      trimmedApiKeyLength < 16 ||
      input.sessionKeyCooldownRemainingSeconds > 0,
    connectLabel,
    disconnectDisabled: !input.hasActiveSession || sessionActionBusy,
    disconnectLabel,
    draftMessageDisabled: chatControlsDisabled,
    draftResetReasonDisabled: chatControlsDisabled,
    phaseLabel,
    resetDisabled:
      chatControlsDisabled || input.chatResetCooldownRemainingSeconds > 0,
    resetLabel,
    sendDisabled:
      chatControlsDisabled ||
      trimmedDraftMessageLength === 0 ||
      input.chatRequestCooldownRemainingSeconds > 0,
    sendLabel,
  };
}

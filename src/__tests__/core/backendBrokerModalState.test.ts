import '../setup';
import { describe, expect, it } from 'vitest';
import { getBackendBrokerModalControlState } from '../../core/backendBroker/modalState';

describe('backend broker modal control state', () => {
  it('locks connection config while a connect attempt is running', () => {
    const state = getBackendBrokerModalControlState({
      phase: 'connecting',
      hasActiveSession: false,
      apiKeyInput: 'sk-broker-test-1234567890',
      draftMessage: '',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 0,
    });

    expect(state.baseUrlDisabled).toBe(true);
    expect(state.apiKeyDisabled).toBe(true);
    expect(state.connectDisabled).toBe(true);
    expect(state.phaseLabel).toBe('verbinde');
    expect(state.connectLabel).toBe('Verbinde...');
  });

  it('keeps broker chat actions disabled without an active session', () => {
    const state = getBackendBrokerModalControlState({
      phase: 'idle',
      hasActiveSession: false,
      apiKeyInput: '',
      draftMessage: 'Explain this circuit.',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 0,
    });

    expect(state.draftMessageDisabled).toBe(true);
    expect(state.draftResetReasonDisabled).toBe(true);
    expect(state.resetDisabled).toBe(true);
    expect(state.sendDisabled).toBe(true);
    expect(state.phaseLabel).toBe('idle');
  });

  it('keeps send enabled only for active sessions with non-empty draft text', () => {
    const activeState = getBackendBrokerModalControlState({
      phase: 'active',
      hasActiveSession: true,
      apiKeyInput: '',
      draftMessage: 'Explain this circuit.',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 0,
    });
    const emptyDraftState = getBackendBrokerModalControlState({
      phase: 'active',
      hasActiveSession: true,
      apiKeyInput: '',
      draftMessage: '   ',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 0,
    });

    expect(activeState.sendDisabled).toBe(false);
    expect(activeState.draftMessageDisabled).toBe(false);
    expect(emptyDraftState.sendDisabled).toBe(true);
    expect(activeState.sendLabel).toBe('Nachricht senden');
    expect(activeState.resetLabel).toBe('Broker-Reset');
  });

  it('locks conflicting active-session actions while a send is running', () => {
    const state = getBackendBrokerModalControlState({
      phase: 'sending',
      hasActiveSession: true,
      apiKeyInput: '',
      draftMessage: 'Explain this circuit.',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 0,
    });

    expect(state.disconnectDisabled).toBe(true);
    expect(state.draftMessageDisabled).toBe(true);
    expect(state.draftResetReasonDisabled).toBe(true);
    expect(state.resetDisabled).toBe(true);
    expect(state.sendDisabled).toBe(true);
    expect(state.phaseLabel).toBe('sende');
    expect(state.sendLabel).toBe('Sende...');
    expect(state.disconnectLabel).toBe('Broker-Key loeschen');
  });

  it('locks conflicting active-session actions while a reset is running', () => {
    const state = getBackendBrokerModalControlState({
      phase: 'resetting',
      hasActiveSession: true,
      apiKeyInput: '',
      draftMessage: 'Explain this circuit.',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 0,
    });

    expect(state.disconnectDisabled).toBe(true);
    expect(state.draftMessageDisabled).toBe(true);
    expect(state.draftResetReasonDisabled).toBe(true);
    expect(state.resetDisabled).toBe(true);
    expect(state.sendDisabled).toBe(true);
    expect(state.phaseLabel).toBe('reset');
    expect(state.resetLabel).toBe('Reset laeuft...');
  });

  it('locks route-specific actions while a rate-limit cooldown is active', () => {
    const connectCooldownState = getBackendBrokerModalControlState({
      phase: 'idle',
      hasActiveSession: false,
      apiKeyInput: 'sk-broker-test-1234567890',
      draftMessage: '',
      sessionKeyCooldownRemainingSeconds: 7,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 0,
    });
    const chatCooldownState = getBackendBrokerModalControlState({
      phase: 'active',
      hasActiveSession: true,
      apiKeyInput: '',
      draftMessage: 'Explain this circuit.',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 7,
      chatResetCooldownRemainingSeconds: 0,
    });
    const resetCooldownState = getBackendBrokerModalControlState({
      phase: 'active',
      hasActiveSession: true,
      apiKeyInput: '',
      draftMessage: 'Explain this circuit.',
      sessionKeyCooldownRemainingSeconds: 0,
      chatRequestCooldownRemainingSeconds: 0,
      chatResetCooldownRemainingSeconds: 7,
    });

    expect(connectCooldownState.connectDisabled).toBe(true);
    expect(connectCooldownState.connectLabel).toBe('Warte 7s');
    expect(chatCooldownState.draftMessageDisabled).toBe(false);
    expect(chatCooldownState.sendDisabled).toBe(true);
    expect(chatCooldownState.sendLabel).toBe('Sende in 7s');
    expect(resetCooldownState.draftResetReasonDisabled).toBe(false);
    expect(resetCooldownState.resetDisabled).toBe(true);
    expect(resetCooldownState.resetLabel).toBe('Reset in 7s');
  });
});

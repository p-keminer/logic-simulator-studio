import '../setup';
import { describe, expect, it } from 'vitest';
import { BackendBrokerCircuitContextError } from '../../core/backendBroker/circuitContext';
import {
  applyBackendBrokerUiActionContext,
  BackendBrokerApiError,
  BackendBrokerConfigurationError,
  shouldClearBackendBrokerUiErrorOnUserEdit,
  shouldAutoClearBackendBrokerUiError,
  toBackendBrokerUiError,
} from '../../core/backendBroker/errors';

describe('backend broker ui error mapping', () => {
  it('maps rate-limit envelopes to a dedicated ui state', () => {
    const mapped = toBackendBrokerUiError(
      new BackendBrokerApiError(429, 'rate limited', {
        code: 'RATE_LIMITED',
        details: {
          requestKind: 'chat-request',
          retryAfterSeconds: 9,
        },
        requestId: 'req-42',
      }),
    );

    expect(mapped).toEqual({
      kind: 'rate-limit',
      title: 'Broker-Chat-Limit erreicht',
      message:
        'Der Broker blockiert den Broker-Chat temporaer. Bitte in etwa 9s erneut versuchen.',
      code: 'RATE_LIMITED',
      requestId: 'req-42',
      requestKind: 'chat-request',
      retryAfterSeconds: 9,
    });
  });

  it('uses route-specific titles for session-key and reset rate limits', () => {
    const sessionKeyMapped = toBackendBrokerUiError(
      new BackendBrokerApiError(429, 'rate limited', {
        code: 'RATE_LIMITED',
        details: {
          requestKind: 'session-key',
          retryAfterSeconds: 4,
        },
      }),
    );
    const resetMapped = toBackendBrokerUiError(
      new BackendBrokerApiError(429, 'rate limited', {
        code: 'RATE_LIMITED',
        details: {
          requestKind: 'chat-reset',
          retryAfterSeconds: 5,
        },
      }),
    );

    expect(sessionKeyMapped.title).toBe('Broker-Key-Limit erreicht');
    expect(sessionKeyMapped.message).toContain('den Broker-Key');
    expect(resetMapped.title).toBe('Broker-Reset-Limit erreicht');
    expect(resetMapped.message).toContain('den Broker-Reset');
  });

  it('auto-clears rate-limit errors once the matching cooldown reached zero', () => {
    const mapped = toBackendBrokerUiError(
      new BackendBrokerApiError(429, 'rate limited', {
        code: 'RATE_LIMITED',
        details: {
          requestKind: 'chat-request',
          retryAfterSeconds: 9,
        },
      }),
    );

    expect(
      shouldAutoClearBackendBrokerUiError(mapped, {
        sessionKey: 0,
        chatRequest: 3,
        chatReset: 0,
      }),
    ).toBe(false);
    expect(
      shouldAutoClearBackendBrokerUiError(mapped, {
        sessionKey: 0,
        chatRequest: 0,
        chatReset: 0,
      }),
    ).toBe(true);
  });

  it('maps session-related broker failures to a reconnect prompt', () => {
    const mapped = toBackendBrokerUiError(
      new BackendBrokerApiError(401, 'unauthorized', {
        code: 'UNAUTHORIZED',
        requestId: 'req-auth',
      }),
    );

    expect(mapped.kind).toBe('session');
    expect(mapped.title).toBe('Broker-Sitzung ist nicht mehr gueltig');
    expect(mapped.requestId).toBe('req-auth');
  });

  it('treats stale-session not-found responses as session invalidation, not as a generic request error', () => {
    const mapped = toBackendBrokerUiError(
      new BackendBrokerApiError(404, 'Session was not found.', {
        code: 'NOT_FOUND',
        requestId: 'req-stale',
      }),
    );

    expect(mapped.kind).toBe('session');
    expect(mapped.title).toBe('Broker-Sitzung ist nicht mehr gueltig');
    expect(mapped.requestId).toBe('req-stale');
  });

  it('maps local circuit-context build failures before the request leaves the app', () => {
    const mapped = toBackendBrokerUiError(
      new BackendBrokerCircuitContextError(
        'CIRCUIT_CONTEXT_TOO_LARGE',
        'too large',
      ),
    );

    expect(mapped).toEqual({
      kind: 'request',
      title: 'Schaltung zu gross fuer den Broker',
      message:
        'Die aktuell geoeffnete Schaltung bleibt selbst nach lokaler Reduktion noch zu gross fuer den Broker-Request.',
    });
  });

  it('maps invalid broker base urls to a dedicated configuration error', () => {
    const mapped = toBackendBrokerUiError(
      new BackendBrokerConfigurationError(
        'Die Broker-Base-URL ist ungueltig.',
      ),
    );

    expect(mapped).toEqual({
      kind: 'request',
      title: 'Broker-Base-URL ist ungueltig',
      message: 'Die Broker-Base-URL ist ungueltig.',
    });
  });

  it('clears visible broker errors once the user edits recovery inputs', () => {
    const requestError = toBackendBrokerUiError(
      new BackendBrokerConfigurationError(
        'Die Broker-Base-URL ist ungueltig.',
      ),
    );
    const sessionError = toBackendBrokerUiError(
      new BackendBrokerApiError(401, 'unauthorized', {
        code: 'UNAUTHORIZED',
      }),
    );

    expect(shouldClearBackendBrokerUiErrorOnUserEdit(requestError)).toBe(true);
    expect(shouldClearBackendBrokerUiErrorOnUserEdit(sessionError)).toBe(true);
    expect(shouldClearBackendBrokerUiErrorOnUserEdit(null)).toBe(false);
  });

  it('adds action-specific titles for connect, send, reset and disconnect failures', () => {
    const networkError = toBackendBrokerUiError(new TypeError('fetch failed'));
    const requestError = toBackendBrokerUiError(
      new BackendBrokerApiError(403, 'forbidden', {
        code: 'FORBIDDEN',
      }),
    );
    const providerError = toBackendBrokerUiError(
      new BackendBrokerApiError(503, 'upstream unavailable', {
        code: 'UPSTREAM_UNAVAILABLE',
      }),
    );

    expect(applyBackendBrokerUiActionContext(networkError, 'connect').title).toBe(
      'Broker-Verbindung fehlgeschlagen',
    );
    expect(applyBackendBrokerUiActionContext(networkError, 'send').title).toBe(
      'Broker-Chat fehlgeschlagen',
    );
    expect(applyBackendBrokerUiActionContext(requestError, 'reset').title).toBe(
      'Broker-Reset wurde abgelehnt',
    );
    expect(
      applyBackendBrokerUiActionContext(providerError, 'disconnect').title,
    ).toBe('Broker-Key konnte nicht geloescht werden');
  });
});

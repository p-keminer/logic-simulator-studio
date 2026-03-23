import '../setup';
import { describe, expect, it } from 'vitest';
import { BackendBrokerCircuitContextError } from '../../core/backendBroker/circuitContext';
import {
  BackendBrokerApiError,
  toBackendBrokerUiError,
} from '../../core/backendBroker/errors';

describe('backend broker ui error mapping', () => {
  it('maps rate-limit envelopes to a dedicated ui state', () => {
    const mapped = toBackendBrokerUiError(
      new BackendBrokerApiError(429, 'rate limited', {
        code: 'RATE_LIMITED',
        details: {
          retryAfterSeconds: 9,
        },
        requestId: 'req-42',
      }),
    );

    expect(mapped).toEqual({
      kind: 'rate-limit',
      title: 'Broker-Limit erreicht',
      message:
        'Der Broker blockiert die Anfrage temporaer. Bitte in etwa 9s erneut versuchen.',
      code: 'RATE_LIMITED',
      requestId: 'req-42',
      retryAfterSeconds: 9,
    });
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
});

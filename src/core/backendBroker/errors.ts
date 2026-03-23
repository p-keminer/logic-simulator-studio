import type {
  BackendBrokerErrorCode,
  BackendBrokerErrorEnvelope,
} from './contracts';
import { BackendBrokerCircuitContextError } from './circuitContext';

export type BackendBrokerUiErrorKind =
  | 'rate-limit'
  | 'session'
  | 'provider'
  | 'request'
  | 'network'
  | 'unknown';

export interface BackendBrokerUiError {
  kind: BackendBrokerUiErrorKind;
  title: string;
  message: string;
  code?: BackendBrokerErrorCode;
  requestId?: string;
  retryAfterSeconds?: number;
}

export class BackendBrokerApiError extends Error {
  readonly statusCode: number;
  readonly code?: BackendBrokerErrorCode;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    options: {
      code?: BackendBrokerErrorCode;
      details?: Record<string, unknown>;
      requestId?: string;
    } = {},
  ) {
    super(message);
    this.name = 'BackendBrokerApiError';
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const isBackendBrokerErrorEnvelope = (
  value: unknown,
): value is BackendBrokerErrorEnvelope => {
  const record = asRecord(value);
  const errorRecord = asRecord(record?.error);

  return Boolean(
    errorRecord &&
      typeof errorRecord.code === 'string' &&
      typeof errorRecord.message === 'string',
  );
};

export const createBackendBrokerApiError = (
  statusCode: number,
  payload: unknown,
): BackendBrokerApiError => {
  if (isBackendBrokerErrorEnvelope(payload)) {
    return new BackendBrokerApiError(statusCode, payload.error.message, {
      code: payload.error.code,
      details: payload.error.details,
      requestId: payload.error.requestId,
    });
  }

  return new BackendBrokerApiError(
    statusCode,
    `Backend broker request failed with status ${statusCode}.`,
  );
};

export const toBackendBrokerUiError = (
  error: unknown,
): BackendBrokerUiError => {
  if (error instanceof BackendBrokerCircuitContextError) {
    if (error.code === 'CIRCUIT_CONTEXT_TOO_LARGE') {
      return {
        kind: 'request',
        title: 'Schaltung zu gross fuer den Broker',
        message:
          'Die aktuell geoeffnete Schaltung bleibt selbst nach lokaler Reduktion noch zu gross fuer den Broker-Request.',
      };
    }

    return {
      kind: 'request',
      title: 'Schaltung konnte nicht vorbereitet werden',
      message: error.message,
    };
  }

  if (error instanceof BackendBrokerApiError) {
    const retryAfterSeconds =
      typeof error.details?.retryAfterSeconds === 'number'
        ? error.details.retryAfterSeconds
        : undefined;
    const staleSessionNotFound =
      error.code === 'NOT_FOUND' &&
      error.message.trim().toLowerCase() === 'session was not found.';

    switch (error.code) {
      case 'RATE_LIMITED':
        return {
          kind: 'rate-limit',
          title: 'Broker-Limit erreicht',
          message:
            retryAfterSeconds && retryAfterSeconds > 0
              ? `Der Broker blockiert die Anfrage temporaer. Bitte in etwa ${retryAfterSeconds}s erneut versuchen.`
              : 'Der Broker blockiert die Anfrage temporaer. Bitte spaeter erneut versuchen.',
          code: error.code,
          requestId: error.requestId,
          retryAfterSeconds,
        };
      case 'UNAUTHORIZED':
      case 'CONFLICT':
      case 'NOT_FOUND':
        if (!staleSessionNotFound && error.code === 'NOT_FOUND') {
          return {
            kind: 'request',
            title: 'Broker-Anfrage wurde abgelehnt',
            message: error.message,
            code: error.code,
            requestId: error.requestId,
          };
        }

        return {
          kind: 'session',
          title: 'Broker-Sitzung ist nicht mehr gueltig',
          message:
            'Die aktive Broker-Sitzung ist abgelaufen oder wurde ungueltig. Setze den Key bitte erneut.',
          code: error.code,
          requestId: error.requestId,
        };
      case 'UPSTREAM_UNAVAILABLE':
        return {
          kind: 'provider',
          title: 'Broker konnte den Provider nicht erreichen',
          message:
            'Der Broker hat die Anfrage angenommen, aber der nachgelagerte Provider war nicht verfuegbar.',
          code: error.code,
          requestId: error.requestId,
        };
      case 'BAD_REQUEST':
      case 'UNPROCESSABLE_ENTITY':
      case 'FORBIDDEN':
        return {
          kind: 'request',
          title: 'Broker-Anfrage wurde abgelehnt',
          message: error.message,
          code: error.code,
          requestId: error.requestId,
        };
      default:
        return {
          kind: 'unknown',
          title: 'Broker-Fehler',
          message: error.message,
          code: error.code,
          requestId: error.requestId,
        };
    }
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return {
      kind: 'network',
      title: 'Broker-Request lief in ein Timeout',
      message:
        'Die App hat vom Broker nicht rechtzeitig eine Antwort erhalten. Pruefe Erreichbarkeit und Logs.',
    };
  }

  if (error instanceof TypeError) {
    return {
      kind: 'network',
      title: 'Broker ist nicht erreichbar',
      message:
        'Die App konnte den Broker nicht erreichen. Pruefe Basis-URL, Port und lokalen Broker-Start.',
    };
  }

  if (error instanceof Error) {
    return {
      kind: 'unknown',
      title: 'Unbekannter Broker-Fehler',
      message: error.message,
    };
  }

  return {
    kind: 'unknown',
    title: 'Unbekannter Broker-Fehler',
    message: 'Die Broker-Anfrage ist mit einem nicht klassifizierten Fehler fehlgeschlagen.',
  };
};

import { isSandboxError, type SandboxError } from '../../shared/errors.js';
import { redactSensitiveValue } from '../audit-and-observability/redaction.js';

export interface HttpErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

export interface HttpErrorResponse {
  statusCode: number;
  body: HttpErrorBody;
}

const PUBLIC_ERROR_DETAIL_KEYS = new Set([
  'attemptCount',
  'dispatchMode',
  'issues',
  'limit',
  'maxAttempts',
  'maxSerializedBytes',
  'providerCode',
  'providerStatusCode',
  'remaining',
  'requestKind',
  'resetAt',
  'retryAfterSeconds',
  'retryable',
  'serializedBytes',
  'timeoutMs',
  'violations',
  'windowMs',
]);

const createPublicErrorDetails = (
  details?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!details) {
    return undefined;
  }

  const filteredEntries = Object.entries(details).flatMap(([key, value]) =>
    PUBLIC_ERROR_DETAIL_KEYS.has(key)
      ? [[key, redactSensitiveValue(value)] as const]
      : [],
  );

  return filteredEntries.length > 0
    ? Object.fromEntries(filteredEntries)
    : undefined;
};

const createUnknownErrorResponse = (requestId?: string): HttpErrorResponse => ({
  statusCode: 500,
  body: {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred in the sandbox broker.',
      requestId,
    },
  },
});

const createSandboxErrorResponse = (
  error: SandboxError,
  requestId?: string,
): HttpErrorResponse => ({
  statusCode: error.statusCode,
  body: {
    error: {
      code: error.code,
      message: error.message,
      requestId,
      details: createPublicErrorDetails(error.details),
    },
  },
});

export const mapErrorToHttpResponse = (
  error: unknown,
  requestId?: string,
): HttpErrorResponse => {
  if (isSandboxError(error)) {
    return createSandboxErrorResponse(error, requestId);
  }

  return createUnknownErrorResponse(requestId);
};

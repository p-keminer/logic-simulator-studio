export type ProviderErrorCode =
  | 'auth'
  | 'timeout'
  | 'rate-limit'
  | 'unavailable'
  | 'host-denied'
  | 'config'
  | 'serialization'
  | 'unknown';

export class ProviderGatewayError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    readonly statusCode?: number,
    readonly retryable = false,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ProviderGatewayError';
  }
}

export const normalizeProviderGatewayError = (
  error: unknown,
  details?: Record<string, unknown>,
): ProviderGatewayError => {
  if (error instanceof ProviderGatewayError) {
    return new ProviderGatewayError(
      error.code,
      error.message,
      error.statusCode,
      error.retryable,
      {
        ...details,
        ...error.details,
      },
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return new ProviderGatewayError(
        'timeout',
        'Provider request timed out in the sandbox gateway.',
        504,
        true,
        {
          ...details,
          name: error.name,
        },
      );
    }

    if (message.includes('rate limit')) {
      return new ProviderGatewayError(
        'rate-limit',
        'Provider rate limit was reached in the sandbox gateway.',
        429,
        true,
        {
          ...details,
          name: error.name,
        },
      );
    }

    if (message.includes('auth') || message.includes('unauthorized')) {
      return new ProviderGatewayError(
        'auth',
        'Provider authentication failed in the sandbox gateway.',
        401,
        false,
        {
          ...details,
          name: error.name,
        },
      );
    }

    return new ProviderGatewayError(
      'unknown',
      'Provider dispatch failed with an unknown sandbox gateway error.',
      502,
      false,
      {
        ...details,
        name: error.name,
      },
    );
  }

  return new ProviderGatewayError(
    'unknown',
    'Unknown provider gateway failure.',
    502,
    false,
    details,
  );
};

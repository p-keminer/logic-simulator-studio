import { describe, expect, it } from 'vitest';
import { errorResponseSchema } from '../../src/contracts/error';
import { mapErrorToHttpResponse } from '../../src/modules/edge-api/http-error-mapper';
import { createSandboxError } from '../../src/shared/errors';

describe('error contracts', () => {
  it('accepts the normalized sandbox HTTP error format', () => {
    const mappedValidationError = mapErrorToHttpResponse(
      createSandboxError(
        'BAD_REQUEST',
        'Chat request payload is invalid.',
        400,
        {
          issues: [
            {
              field: 'message',
              reason: 'Too small: expected string to have >=1 characters',
            },
          ],
        },
      ),
      'req-chat-1',
    );
    const mappedOversizeError = mapErrorToHttpResponse(
      createSandboxError(
        'UNPROCESSABLE_ENTITY',
        'The active-circuit payload remains too large after sandbox reduction.',
        422,
        {
          serializedBytes: 2048,
          maxSerializedBytes: 1024,
        },
      ),
      'req-circuit-1',
    );

    expect(errorResponseSchema.safeParse(mappedValidationError.body).success).toBe(
      true,
    );
    expect(errorResponseSchema.safeParse(mappedOversizeError.body).success).toBe(
      true,
    );
  });

  it('rejects unknown error codes and the legacy flat error shape', () => {
    expect(
      errorResponseSchema.safeParse({
        error: {
          code: 'UPSTREAM_TIMEOUT',
          message: 'Provider timed out.',
          requestId: 'req-provider-1',
        },
      }).success,
    ).toBe(false);

    expect(
      errorResponseSchema.safeParse({
        code: 'BAD_REQUEST',
        message: 'Legacy flat response.',
        correlationId: 'legacy-req-1',
      }).success,
    ).toBe(false);
  });

  it('exposes only the public error detail subset to clients', () => {
    const mappedProviderError = mapErrorToHttpResponse(
      createSandboxError(
        'UPSTREAM_UNAVAILABLE',
        'Provider gateway is unavailable in the sandbox.',
        503,
        {
          allowedHosts: ['private.internal'],
          apiKey: 'sk-error-test-secret-1234567890abcd',
          attemptCount: 2,
          authorization: 'Bearer hidden-secret',
          providerCode: 'timeout',
          providerRequestId: 'provider-request-secret',
          retryAfterSeconds: 12,
          timeoutMs: 1_500,
        },
      ),
      'req-provider-2',
    );

    expect(mappedProviderError.body).toEqual({
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Provider gateway is unavailable in the sandbox.',
        requestId: 'req-provider-2',
        details: {
          attemptCount: 2,
          providerCode: 'timeout',
          retryAfterSeconds: 12,
          timeoutMs: 1_500,
        },
      },
    });
  });
});

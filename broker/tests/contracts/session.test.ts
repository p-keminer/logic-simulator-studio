import { describe, expect, it } from 'vitest';
import {
  sessionKeyDeleteRequestSchema,
  sessionKeyResponseSchema,
  sessionKeyRequestSchema,
} from '../../src/contracts/session';

describe('session contracts', () => {
  it('accepts a valid registration payload and safe response shape', () => {
    expect(
      sessionKeyRequestSchema.safeParse({
        apiKey: 'sk-session-1234567890abcdef',
      }).success,
    ).toBe(true);

    expect(
      sessionKeyResponseSchema.safeParse({
        sessionId: '11111111-1111-4111-8111-111111111111',
        status: 'active',
        issuedAt: '2026-03-21T00:00:00.000Z',
        expiresAt: '2026-03-21T00:15:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects payloads that leak or misuse the raw key in public contracts', () => {
    expect(
      sessionKeyResponseSchema.safeParse({
        apiKey: 'sk-session-1234567890abcdef',
        sessionId: '11111111-1111-4111-8111-111111111111',
        status: 'active',
        issuedAt: '2026-03-21T00:00:00.000Z',
        expiresAt: '2026-03-21T00:15:00.000Z',
      }).success,
    ).toBe(false);

    expect(
      sessionKeyDeleteRequestSchema.safeParse({
        apiKey: 'sk-session-1234567890abcdef',
      }).success,
    ).toBe(false);
  });
});

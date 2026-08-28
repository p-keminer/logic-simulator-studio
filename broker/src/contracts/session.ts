import { z } from 'zod';

export const apiKeySchema = z.string().min(16).max(256);
export const sessionIdSchema = z.string().uuid();

export const sessionKeyRequestSchema = z
  .object({
    apiKey: apiKeySchema,
  })
  .strict();

export const sessionKeyResponseSchema = z
  .object({
    sessionId: sessionIdSchema,
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    status: z.literal('active'),
  })
  .strict();

export const sessionKeyDeleteRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
  })
  .strict();

export const sessionKeyDeleteResponseSchema = z
  .object({
    deleted: z.literal(true),
    sessionId: sessionIdSchema,
    deletedAt: z.string().datetime(),
  })
  .strict();

export type ApiKey = z.infer<typeof apiKeySchema>;
export type SessionIdContract = z.infer<typeof sessionIdSchema>;
export type SessionKeyRequest = z.infer<typeof sessionKeyRequestSchema>;
export type SessionKeyResponse = z.infer<typeof sessionKeyResponseSchema>;
export type SessionKeyDeleteRequest = z.infer<typeof sessionKeyDeleteRequestSchema>;
export type SessionKeyDeleteResponse = z.infer<
  typeof sessionKeyDeleteResponseSchema
>;

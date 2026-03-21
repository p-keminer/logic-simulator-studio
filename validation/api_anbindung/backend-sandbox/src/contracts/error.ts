import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE_ENTITY',
  'RATE_LIMITED',
  'UPSTREAM_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

export const errorDetailsSchema = z.record(z.string(), z.unknown());

export const errorBodySchema = z
  .object({
    code: errorCodeSchema,
    message: z.string().min(1).max(512),
    requestId: z.string().min(1).max(128).optional(),
    details: errorDetailsSchema.optional(),
  })
  .strict();

export const errorResponseSchema = z
  .object({
    error: errorBodySchema,
  })
  .strict();

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorBody = z.infer<typeof errorBodySchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

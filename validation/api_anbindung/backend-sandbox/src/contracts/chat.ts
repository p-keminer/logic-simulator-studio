import { z } from 'zod';
import { circuitContextSchema } from './circuit-context.js';
import { sessionIdSchema } from './session.js';

export const chatMessageSchema = z
  .string()
  .trim()
  .min(1)
  .max(20_000);

export const chatRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
    message: chatMessageSchema,
    circuitContext: circuitContextSchema,
    conversationId: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

export const chatResponseSchema = z
  .object({
    message: z.string().min(1),
    conversationId: z.string().min(1).max(128).optional(),
    model: z.string().min(1).max(128).optional(),
    circuitContextVersion: z.string().min(1).max(64),
  })
  .strict();

export const chatResetRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
    conversationId: z.string().trim().min(1).max(128).optional(),
    reason: z.string().trim().min(1).max(512).optional(),
  })
  .strict();

export const chatResetResponseSchema = z
  .object({
    reset: z.literal(true),
    sessionId: sessionIdSchema,
    conversationId: z.string().min(1).max(128).optional(),
    clearedConversationIds: z.array(z.string().min(1).max(128)).default([]),
    clearedTurns: z.number().int().nonnegative(),
    resetAt: z.string().datetime(),
  })
  .strict();

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type ChatResetRequest = z.infer<typeof chatResetRequestSchema>;
export type ChatResetResponse = z.infer<typeof chatResetResponseSchema>;

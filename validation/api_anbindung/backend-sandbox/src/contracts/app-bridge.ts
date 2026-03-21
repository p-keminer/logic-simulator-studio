import { z } from 'zod';
import { chatMessageSchema } from './chat';
import { sessionIdSchema } from './session';

export const appBridgeVersionSchema = z.literal('sandbox-app-bridge-v1');

export const appBridgePortSchema = z
  .object({
    gateId: z.string().min(1).max(128),
    port: z.string().min(1).max(64),
  })
  .strict();

export const appBridgeNodeSchema = z
  .object({
    id: z.string().min(1).max(128),
    nodeType: z.string().min(1).max(128),
    displayName: z.string().min(1).max(256).optional(),
  })
  .strict();

export const appBridgeGateSchema = z
  .object({
    id: z.string().min(1).max(128),
    gateType: z.string().min(1).max(128),
    displayName: z.string().min(1).max(256).optional(),
    pins: z
      .object({
        inputs: z.array(appBridgePortSchema).default([]),
        outputs: z.array(appBridgePortSchema).default([]),
      })
      .strict(),
  })
  .strict();

export const appBridgeWireSchema = z
  .object({
    source: appBridgePortSchema,
    target: appBridgePortSchema,
  })
  .strict();

export const appBridgeSnapshotSchema = z
  .object({
    bridgeVersion: appBridgeVersionSchema,
    openCircuit: z
      .object({
        circuitId: z.string().min(1).max(128),
        title: z.string().min(1).max(256).optional(),
        selection: z
          .object({
            activeElementIds: z.array(z.string().min(1).max(128)).default([]),
          })
          .strict(),
        elements: z
          .object({
            nodes: z.array(appBridgeNodeSchema).default([]),
            gates: z.array(appBridgeGateSchema).default([]),
            wires: z.array(appBridgeWireSchema).default([]),
          })
          .strict(),
        annotations: z
          .object({
            notes: z.string().min(1).max(4_096).optional(),
          })
          .strict()
          .default({}),
      })
      .strict(),
  })
  .strict();

export const appBridgeConversationSchema = z
  .object({
    conversationId: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

export const appBridgeProviderModeSchema = z.enum([
  'fixture',
  'adapter',
  'unconfigured',
]);

export const appBridgeChatRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
    userMessage: chatMessageSchema,
    conversation: appBridgeConversationSchema.optional(),
    snapshot: appBridgeSnapshotSchema,
  })
  .strict();

export const appBridgeCurrentCircuitChatRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
    userMessage: chatMessageSchema,
    conversation: appBridgeConversationSchema.optional(),
  })
  .strict();

export const appBridgeChatResetRequestSchema = z
  .object({
    sessionId: sessionIdSchema,
    conversation: appBridgeConversationSchema.optional(),
    resetReason: z.string().trim().min(1).max(512).optional(),
  })
  .strict();

export const appBridgeCapabilitiesSchema = z
  .object({
    bridgeVersion: appBridgeVersionSchema,
    providerId: z.string().min(1).max(128),
    providerMode: appBridgeProviderModeSchema,
    supportsCurrentCircuit: z.boolean(),
    endpoints: z
      .object({
        capabilities: z.string().min(1).max(128),
        currentCircuit: z.string().min(1).max(128),
      })
      .strict(),
  })
  .strict();

export const appBridgeCurrentCircuitResponseSchema = z
  .object({
    bridgeVersion: appBridgeVersionSchema,
    providerId: z.string().min(1).max(128),
    providerMode: appBridgeProviderModeSchema,
    fetchedAt: z.string().datetime(),
    snapshot: appBridgeSnapshotSchema,
  })
  .strict();

export type AppBridgeVersion = z.infer<typeof appBridgeVersionSchema>;
export type AppBridgePort = z.infer<typeof appBridgePortSchema>;
export type AppBridgeNode = z.infer<typeof appBridgeNodeSchema>;
export type AppBridgeGate = z.infer<typeof appBridgeGateSchema>;
export type AppBridgeWire = z.infer<typeof appBridgeWireSchema>;
export type AppBridgeSnapshot = z.infer<typeof appBridgeSnapshotSchema>;
export type AppBridgeConversation = z.infer<typeof appBridgeConversationSchema>;
export type AppBridgeProviderMode = z.infer<typeof appBridgeProviderModeSchema>;
export type AppBridgeChatRequest = z.infer<typeof appBridgeChatRequestSchema>;
export type AppBridgeCurrentCircuitChatRequest = z.infer<
  typeof appBridgeCurrentCircuitChatRequestSchema
>;
export type AppBridgeChatResetRequest = z.infer<
  typeof appBridgeChatResetRequestSchema
>;
export type AppBridgeCapabilities = z.infer<
  typeof appBridgeCapabilitiesSchema
>;
export type AppBridgeCurrentCircuitResponse = z.infer<
  typeof appBridgeCurrentCircuitResponseSchema
>;

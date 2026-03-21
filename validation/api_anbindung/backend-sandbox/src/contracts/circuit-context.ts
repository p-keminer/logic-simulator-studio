import { z } from 'zod';

export const circuitContextVersionSchema = z.string().regex(/^v\d+$/);

export const circuitReductionReasonSchema = z.enum([
  'invalid-entries-removed',
  'duplicate-entries-removed',
  'selected-elements-trimmed',
  'nodes-trimmed',
  'gates-trimmed',
  'connections-trimmed',
  'notes-trimmed',
  'payload-size-capped',
]);

const connectionEndpointSchema = z
  .object({
    gateId: z.string().min(1).max(128),
    port: z.string().min(1).max(64),
  })
  .strict();

const gateSchema = z
  .object({
    id: z.string().min(1).max(128),
    type: z.string().min(1).max(128),
    label: z.string().min(1).max(256).optional(),
    inputs: z.array(connectionEndpointSchema).default([]),
    outputs: z.array(connectionEndpointSchema).default([]),
  })
  .strict();

const circuitNodeSchema = z
  .object({
    id: z.string().min(1).max(128),
    kind: z.string().min(1).max(128),
    label: z.string().min(1).max(256).optional(),
  })
  .strict();

const circuitConnectionSchema = z
  .object({
    from: connectionEndpointSchema,
    to: connectionEndpointSchema,
  })
  .strict();

const circuitCountSummarySchema = z
  .object({
    selectedElementIds: z.number().int().nonnegative(),
    nodes: z.number().int().nonnegative(),
    gates: z.number().int().nonnegative(),
    connections: z.number().int().nonnegative(),
  })
  .strict();

export const circuitContextReductionSchema = z
  .object({
    wasReduced: z.boolean(),
    reasons: z.array(circuitReductionReasonSchema).default([]),
    original: circuitCountSummarySchema,
    retained: circuitCountSummarySchema,
    notesIncluded: z.boolean(),
    serializedBytes: z.number().int().nonnegative(),
    maxSerializedBytes: z.number().int().positive(),
  })
  .strict();

export const circuitContextSchema = z
  .object({
    scope: z.literal('active-circuit'),
    version: circuitContextVersionSchema,
    circuitId: z.string().min(1).max(128),
    circuitName: z.string().min(1).max(256).optional(),
    selectedElementIds: z.array(z.string().min(1).max(128)).default([]),
    nodes: z.array(circuitNodeSchema).default([]),
    gates: z.array(gateSchema).default([]),
    connections: z.array(circuitConnectionSchema).default([]),
    notes: z.string().min(1).max(4_096).optional(),
    reduction: circuitContextReductionSchema.optional(),
  })
  .strict();

export type CircuitContextVersion = z.infer<typeof circuitContextVersionSchema>;
export type CircuitReductionReason = z.infer<
  typeof circuitReductionReasonSchema
>;
export type CircuitContextReduction = z.infer<
  typeof circuitContextReductionSchema
>;
export type CircuitContext = z.infer<typeof circuitContextSchema>;

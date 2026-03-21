import {
  circuitContextSchema,
  type CircuitContext,
  type CircuitContextReduction,
  type CircuitReductionReason,
} from '../../contracts/circuit-context';
import { createSandboxError } from '../../shared/errors';
import { mapCircuitSourceToContextDraft } from './circuit-context-mapper';
import {
  normalizeCircuitContext,
  type CircuitContextNormalizationResult,
} from './circuit-context-normalizer';
import type {
  CircuitContextBuildOptions,
  CircuitCountSummary,
  CircuitSource,
} from './types';

export const defaultCircuitContextLimits: CircuitContextBuildOptions['limits'] = {
  maxNodes: 120,
  maxGates: 120,
  maxConnections: 240,
  maxSelectedElementIds: 40,
  maxCircuitNameLength: 160,
  maxLabelLength: 96,
  maxNotesLength: 1_024,
  maxSerializedBytes: 18_000,
};

const countSummaryFromContext = (
  draft: CircuitContextNormalizationResult['draft'],
): CircuitCountSummary => ({
  selectedElementIds: draft.selectedElementIds.length,
  nodes: draft.nodes.length,
  gates: draft.gates.length,
  connections: draft.connections.length,
});

const addReason = (
  reasons: CircuitReductionReason[],
  reason: CircuitReductionReason,
) => {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
};

const serializeBytes = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value), 'utf8');

export function reduceCircuitContext(
  source: CircuitSource | null | undefined,
  options: Partial<CircuitContextBuildOptions> = {},
): CircuitContext | null {
  const buildOptions: CircuitContextBuildOptions = {
    version: options.version ?? 'v1',
    limits: {
      ...defaultCircuitContextLimits,
      ...options.limits,
    },
  };

  const draft = mapCircuitSourceToContextDraft(source, buildOptions);
  const normalized = normalizeCircuitContext(draft, buildOptions.limits);

  if (!normalized) {
    return null;
  }

  const originalCounts = countSummaryFromContext(normalized.draft);
  const reasons: CircuitReductionReason[] = [];

  if (normalized.invalidEntriesRemoved) {
    addReason(reasons, 'invalid-entries-removed');
  }

  if (normalized.duplicateEntriesRemoved) {
    addReason(reasons, 'duplicate-entries-removed');
  }

  if (normalized.notesTrimmed) {
    addReason(reasons, 'notes-trimmed');
  }

  let reduced = {
    ...normalized.draft,
    selectedElementIds: normalized.draft.selectedElementIds.slice(
      0,
      buildOptions.limits.maxSelectedElementIds,
    ),
    nodes: normalized.draft.nodes.slice(0, buildOptions.limits.maxNodes),
    gates: normalized.draft.gates.slice(0, buildOptions.limits.maxGates),
    connections: normalized.draft.connections.slice(
      0,
      buildOptions.limits.maxConnections,
    ),
  };

  if (reduced.selectedElementIds.length < normalized.draft.selectedElementIds.length) {
    addReason(reasons, 'selected-elements-trimmed');
  }

  if (reduced.nodes.length < normalized.draft.nodes.length) {
    addReason(reasons, 'nodes-trimmed');
  }

  if (reduced.gates.length < normalized.draft.gates.length) {
    addReason(reasons, 'gates-trimmed');
  }

  if (reduced.connections.length < normalized.draft.connections.length) {
    addReason(reasons, 'connections-trimmed');
  }

  const keptGateIds = new Set(reduced.gates.map((gate) => gate.id));
  reduced = {
    ...reduced,
    selectedElementIds: reduced.selectedElementIds.filter((id) => {
      const keep =
        reduced.nodes.some((node) => node.id === id) || keptGateIds.has(id);

      if (!keep) {
        addReason(reasons, 'selected-elements-trimmed');
      }

      return keep;
    }),
    connections: reduced.connections.filter((connection) => {
      const keep =
        keptGateIds.has(connection.from.gateId) &&
        keptGateIds.has(connection.to.gateId);

      if (!keep) {
        addReason(reasons, 'connections-trimmed');
      }

      return keep;
    }),
  };

  const hadNotes = Boolean(reduced.notes);
  let finalizedDraft = { ...reduced };

  const buildReduction = (): CircuitContextReduction => {
    const retainedCounts = countSummaryFromContext(finalizedDraft);
    let serializedBytes = 0;

    for (let index = 0; index < 3; index += 1) {
      const preview = {
        ...finalizedDraft,
        reduction: {
          wasReduced: reasons.length > 0,
          reasons,
          original: originalCounts,
          retained: retainedCounts,
          notesIncluded: Boolean(finalizedDraft.notes),
          serializedBytes,
          maxSerializedBytes: buildOptions.limits.maxSerializedBytes,
        },
      };
      const nextSerializedBytes = serializeBytes(preview);

      if (nextSerializedBytes === serializedBytes) {
        break;
      }

      serializedBytes = nextSerializedBytes;
    }

    return {
      wasReduced: reasons.length > 0,
      reasons,
      original: originalCounts,
      retained: retainedCounts,
      notesIncluded: Boolean(finalizedDraft.notes),
      serializedBytes,
      maxSerializedBytes: buildOptions.limits.maxSerializedBytes,
    };
  };

  let reduction = buildReduction();

  if (hadNotes && !finalizedDraft.notes) {
    addReason(reasons, 'notes-trimmed');
    reduction = buildReduction();
  }

  while (reduction.serializedBytes > buildOptions.limits.maxSerializedBytes) {
    addReason(reasons, 'payload-size-capped');

    if (finalizedDraft.notes) {
      finalizedDraft = {
        ...finalizedDraft,
        notes: undefined,
      };
      addReason(reasons, 'notes-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalizedDraft.connections.length > 0) {
      finalizedDraft = {
        ...finalizedDraft,
        connections: finalizedDraft.connections.slice(0, -1),
      };
      addReason(reasons, 'connections-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalizedDraft.selectedElementIds.length > 0) {
      finalizedDraft = {
        ...finalizedDraft,
        selectedElementIds: finalizedDraft.selectedElementIds.slice(0, -1),
      };
      addReason(reasons, 'selected-elements-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalizedDraft.nodes.length > 0) {
      finalizedDraft = {
        ...finalizedDraft,
        nodes: finalizedDraft.nodes.slice(0, -1),
      };
      addReason(reasons, 'nodes-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalizedDraft.gates.length > 0) {
      const remainingGates = finalizedDraft.gates.slice(0, -1);
      const remainingGateIds = new Set(remainingGates.map((gate) => gate.id));
      finalizedDraft = {
        ...finalizedDraft,
        gates: remainingGates,
        connections: finalizedDraft.connections.filter(
          (connection) =>
            remainingGateIds.has(connection.from.gateId) &&
            remainingGateIds.has(connection.to.gateId),
        ),
        selectedElementIds: finalizedDraft.selectedElementIds.filter(
          (id) =>
            remainingGateIds.has(id) ||
            finalizedDraft.nodes.some((node) => node.id === id),
        ),
      };
      addReason(reasons, 'gates-trimmed');
      addReason(reasons, 'connections-trimmed');
      addReason(reasons, 'selected-elements-trimmed');
      reduction = buildReduction();
      continue;
    }

    break;
  }

  if (reduction.serializedBytes > buildOptions.limits.maxSerializedBytes) {
    throw createSandboxError(
      'UNPROCESSABLE_ENTITY',
      'The active-circuit payload remains too large after sandbox reduction.',
      422,
      {
        maxSerializedBytes: buildOptions.limits.maxSerializedBytes,
        serializedBytes: reduction.serializedBytes,
      },
    );
  }

  return circuitContextSchema.parse({
    ...finalizedDraft,
    reduction,
  });
}

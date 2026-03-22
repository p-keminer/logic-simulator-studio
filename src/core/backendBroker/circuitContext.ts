import type {
  BackendBrokerCircuitConnection,
  BackendBrokerCircuitContext,
  BackendBrokerCircuitCountSummary,
  BackendBrokerCircuitGate,
  BackendBrokerCircuitNode,
  BackendBrokerCircuitPort,
  BackendBrokerCircuitReduction,
  BackendBrokerCircuitReductionReason,
} from './contracts';
import type { BackendSandboxCurrentCircuitSnapshot } from '../io/backendSandboxSnapshot';

export interface BackendBrokerCircuitContextLimits {
  maxNodes: number;
  maxGates: number;
  maxConnections: number;
  maxSelectedElementIds: number;
  maxCircuitNameLength: number;
  maxLabelLength: number;
  maxNotesLength: number;
  maxSerializedBytes: number;
}

export interface BackendBrokerCircuitContextBuildOptions {
  version?: string;
  limits?: Partial<BackendBrokerCircuitContextLimits>;
}

export type BackendBrokerCircuitContextBuildErrorCode =
  | 'INVALID_ACTIVE_CIRCUIT'
  | 'CIRCUIT_CONTEXT_TOO_LARGE';

export class BackendBrokerCircuitContextError extends Error {
  readonly code: BackendBrokerCircuitContextBuildErrorCode;
  readonly details?: Record<string, number | string>;

  constructor(
    code: BackendBrokerCircuitContextBuildErrorCode,
    message: string,
    details?: Record<string, number | string>,
  ) {
    super(message);
    this.name = 'BackendBrokerCircuitContextError';
    this.code = code;
    this.details = details;
  }
}

interface BackendBrokerCircuitContextDraft {
  scope: 'active-circuit';
  version: string;
  circuitId: string;
  circuitName?: string;
  selectedElementIds: string[];
  nodes: BackendBrokerCircuitNode[];
  gates: BackendBrokerCircuitGate[];
  connections: BackendBrokerCircuitConnection[];
  notes?: string;
}

const textEncoder = new TextEncoder();
const PORT_KEY_SEPARATOR = '\u0000';
const CONNECTION_KEY_SEPARATOR = '\u0001';

export const DEFAULT_BACKEND_BROKER_CIRCUIT_LIMITS: BackendBrokerCircuitContextLimits =
  {
    maxNodes: 120,
    maxGates: 120,
    maxConnections: 240,
    maxSelectedElementIds: 40,
    maxCircuitNameLength: 160,
    maxLabelLength: 96,
    maxNotesLength: 1_024,
    maxSerializedBytes: 18_000,
  };

const trimToLength = (value: string | undefined, maxLength: number) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || maxLength <= 0) {
    return undefined;
  }

  const sliced = trimmed.slice(0, maxLength);
  return sliced.length > 0 ? sliced : undefined;
};

const countSummaryFromDraft = (
  draft: BackendBrokerCircuitContextDraft,
): BackendBrokerCircuitCountSummary => ({
  selectedElementIds: draft.selectedElementIds.length,
  nodes: draft.nodes.length,
  gates: draft.gates.length,
  connections: draft.connections.length,
});

const serializeBytes = (value: unknown) =>
  textEncoder.encode(JSON.stringify(value)).length;

const addReason = (
  reasons: BackendBrokerCircuitReductionReason[],
  reason: BackendBrokerCircuitReductionReason,
) => {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
};

const buildRetainedElementIdSet = (
  nodeIds: Iterable<string>,
  gateIds: Iterable<string>,
) => new Set<string>([...nodeIds, ...gateIds]);

const dedupeStrings = (values: string[]) => {
  const unique: string[] = [];
  const seen = new Set<string>();
  let duplicateEntriesRemoved = false;

  for (const value of values) {
    if (seen.has(value)) {
      duplicateEntriesRemoved = true;
      continue;
    }

    seen.add(value);
    unique.push(value);
  }

  return {
    duplicateEntriesRemoved,
    values: unique,
  };
};

const toPort = (gateId: string, port: string): BackendBrokerCircuitPort => ({
  gateId,
  port,
});

const createDraftFromSnapshot = (
  snapshot: BackendSandboxCurrentCircuitSnapshot,
  version: string,
): BackendBrokerCircuitContextDraft => ({
  scope: 'active-circuit',
  version,
  circuitId: snapshot.openCircuit.circuitId,
  circuitName: snapshot.openCircuit.title,
  selectedElementIds: [...snapshot.openCircuit.selection.activeElementIds],
  nodes: snapshot.openCircuit.elements.nodes.map((node) => ({
    id: node.id,
    kind: node.nodeType,
    label: node.displayName,
  })),
  gates: snapshot.openCircuit.elements.gates.map((gate) => ({
    id: gate.id,
    type: gate.gateType,
    label: gate.displayName,
    inputs: gate.pins.inputs.map((port) => toPort(port.gateId, port.port)),
    outputs: gate.pins.outputs.map((port) => toPort(port.gateId, port.port)),
  })),
  connections: snapshot.openCircuit.elements.wires.map((wire) => ({
    from: toPort(wire.source.gateId, wire.source.port),
    to: toPort(wire.target.gateId, wire.target.port),
  })),
  notes: snapshot.openCircuit.annotations.notes,
});

const normalizeDraft = (
  draft: BackendBrokerCircuitContextDraft,
  limits: BackendBrokerCircuitContextLimits,
) => {
  let invalidEntriesRemoved = false;
  let duplicateEntriesRemoved = false;

  const circuitId = draft.circuitId.trim();
  if (circuitId.length === 0 || circuitId.length > 128) {
    throw new BackendBrokerCircuitContextError(
      'INVALID_ACTIVE_CIRCUIT',
      'The active circuit is missing a valid circuitId for the broker request.',
    );
  }

  const selectedElementIds = dedupeStrings(
    draft.selectedElementIds
      .map((id) => id.trim())
      .filter((id) => id.length > 0 && id.length <= 128),
  );
  duplicateEntriesRemoved ||= selectedElementIds.duplicateEntriesRemoved;
  invalidEntriesRemoved ||= selectedElementIds.values.length !== draft.selectedElementIds.length;

  const nodes = draft.nodes.flatMap((node) => {
    const id = node.id.trim();
    const kind = node.kind.trim();

    if (id.length === 0 || id.length > 128 || kind.length === 0 || kind.length > 128) {
      invalidEntriesRemoved = true;
      return [];
    }

    return [
      {
        id,
        kind,
        label: trimToLength(node.label, limits.maxLabelLength),
      },
    ];
  });
  const uniqueNodes = dedupeStrings(nodes.map((node) => node.id)).values.map(
    (id) => nodes.find((node) => node.id === id)!,
  );
  duplicateEntriesRemoved ||= uniqueNodes.length !== nodes.length;

  const gates = draft.gates.flatMap((gate) => {
    const id = gate.id.trim();
    const type = gate.type.trim();

    if (id.length === 0 || id.length > 128 || type.length === 0 || type.length > 128) {
      invalidEntriesRemoved = true;
      return [];
    }

    const normalizePorts = (ports: BackendBrokerCircuitPort[]) => {
      const normalizedPorts = ports
        .map((port) => ({
          gateId: port.gateId.trim(),
          port: port.port.trim(),
        }))
        .filter((port) => {
          const valid =
            port.gateId.length > 0 &&
            port.gateId.length <= 128 &&
            port.port.length > 0 &&
            port.port.length <= 64;

          if (!valid) {
            invalidEntriesRemoved = true;
          }

          return valid;
        });
      const uniquePortKeys = dedupeStrings(
        normalizedPorts.map(
          (port) => `${port.gateId}${PORT_KEY_SEPARATOR}${port.port}`,
        ),
      ).values;
      const portMap = new Map(
        normalizedPorts.map((port) => [
          `${port.gateId}${PORT_KEY_SEPARATOR}${port.port}`,
          port,
        ]),
      );

      return uniquePortKeys.flatMap((key) => {
        const value = portMap.get(key);
        return value ? [value] : [];
      });
    };

    return [
      {
        id,
        type,
        label: trimToLength(gate.label, limits.maxLabelLength),
        inputs: normalizePorts(gate.inputs),
        outputs: normalizePorts(gate.outputs),
      },
    ];
  });
  const uniqueGates = dedupeStrings(gates.map((gate) => gate.id)).values.map(
    (id) => gates.find((gate) => gate.id === id)!,
  );
  duplicateEntriesRemoved ||= uniqueGates.length !== gates.length;

  const connections = draft.connections.flatMap((connection) => {
    const normalized = {
      from: {
        gateId: connection.from.gateId.trim(),
        port: connection.from.port.trim(),
      },
      to: {
        gateId: connection.to.gateId.trim(),
        port: connection.to.port.trim(),
      },
    };

    const valid =
      normalized.from.gateId.length > 0 &&
      normalized.from.gateId.length <= 128 &&
      normalized.from.port.length > 0 &&
      normalized.from.port.length <= 64 &&
      normalized.to.gateId.length > 0 &&
      normalized.to.gateId.length <= 128 &&
      normalized.to.port.length > 0 &&
      normalized.to.port.length <= 64;

    if (!valid) {
      invalidEntriesRemoved = true;
      return [];
    }

    return [normalized];
  });
  const connectionMap = new Map(
    connections.map((connection) => [
      [
        connection.from.gateId,
        connection.from.port,
        connection.to.gateId,
        connection.to.port,
      ].join(CONNECTION_KEY_SEPARATOR),
      connection,
    ]),
  );
  const uniqueConnections = dedupeStrings([...connectionMap.keys()]).values.flatMap(
    (key) => {
      const value = connectionMap.get(key);
      return value ? [value] : [];
    },
  );
  duplicateEntriesRemoved ||= uniqueConnections.length !== connections.length;

  const trimmedNotes = trimToLength(draft.notes, limits.maxNotesLength);
  const notesTrimmed =
    typeof draft.notes === 'string' &&
    draft.notes.trim().length > 0 &&
    trimmedNotes !== draft.notes.trim();

  return {
    draft: {
      ...draft,
      circuitId,
      circuitName: trimToLength(draft.circuitName, limits.maxCircuitNameLength),
      selectedElementIds: selectedElementIds.values,
      nodes: uniqueNodes,
      gates: uniqueGates,
      connections: uniqueConnections,
      notes: trimmedNotes,
    },
    duplicateEntriesRemoved,
    invalidEntriesRemoved,
    notesTrimmed,
  };
};

export function createBackendBrokerCircuitContext(
  snapshot: BackendSandboxCurrentCircuitSnapshot,
  options: BackendBrokerCircuitContextBuildOptions = {},
): BackendBrokerCircuitContext {
  const version = options.version ?? 'v1';
  const limits = {
    ...DEFAULT_BACKEND_BROKER_CIRCUIT_LIMITS,
    ...options.limits,
  };
  const normalized = normalizeDraft(
    createDraftFromSnapshot(snapshot, version),
    limits,
  );
  const reasons: BackendBrokerCircuitReductionReason[] = [];

  if (normalized.invalidEntriesRemoved) {
    addReason(reasons, 'invalid-entries-removed');
  }
  if (normalized.duplicateEntriesRemoved) {
    addReason(reasons, 'duplicate-entries-removed');
  }
  if (normalized.notesTrimmed) {
    addReason(reasons, 'notes-trimmed');
  }

  const original = countSummaryFromDraft(normalized.draft);

  let reduced: BackendBrokerCircuitContextDraft = {
    ...normalized.draft,
    selectedElementIds: normalized.draft.selectedElementIds.slice(
      0,
      limits.maxSelectedElementIds,
    ),
    nodes: normalized.draft.nodes.slice(0, limits.maxNodes),
    gates: normalized.draft.gates.slice(0, limits.maxGates),
    connections: normalized.draft.connections.slice(0, limits.maxConnections),
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

  const retainedGateIds = new Set(reduced.gates.map((gate) => gate.id));
  const retainedNodeIds = new Set(reduced.nodes.map((node) => node.id));
  const retainedElementIds = buildRetainedElementIdSet(
    retainedNodeIds,
    retainedGateIds,
  );
  reduced = {
    ...reduced,
    selectedElementIds: reduced.selectedElementIds.filter((id) => {
      const keep = retainedElementIds.has(id);
      if (!keep) {
        addReason(reasons, 'selected-elements-trimmed');
      }
      return keep;
    }),
    connections: reduced.connections.filter((connection) => {
      const keep =
        retainedElementIds.has(connection.from.gateId) &&
        retainedElementIds.has(connection.to.gateId);

      if (!keep) {
        addReason(reasons, 'connections-trimmed');
      }

      return keep;
    }),
  };

  let finalized = { ...reduced };

  const buildReduction = (): BackendBrokerCircuitReduction => {
    const retained = countSummaryFromDraft(finalized);
    let serializedBytes = 0;

    for (let index = 0; index < 3; index += 1) {
      const preview = {
        ...finalized,
        reduction: {
          wasReduced: reasons.length > 0,
          reasons,
          original,
          retained,
          notesIncluded: Boolean(finalized.notes),
          serializedBytes,
          maxSerializedBytes: limits.maxSerializedBytes,
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
      original,
      retained,
      notesIncluded: Boolean(finalized.notes),
      serializedBytes,
      maxSerializedBytes: limits.maxSerializedBytes,
    };
  };

  let reduction = buildReduction();

  while (reduction.serializedBytes > limits.maxSerializedBytes) {
    addReason(reasons, 'payload-size-capped');

    if (finalized.notes) {
      finalized = {
        ...finalized,
        notes: undefined,
      };
      addReason(reasons, 'notes-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalized.connections.length > 0) {
      finalized = {
        ...finalized,
        connections: finalized.connections.slice(0, -1),
      };
      addReason(reasons, 'connections-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalized.selectedElementIds.length > 0) {
      finalized = {
        ...finalized,
        selectedElementIds: finalized.selectedElementIds.slice(0, -1),
      };
      addReason(reasons, 'selected-elements-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalized.nodes.length > 0) {
      const remainingNodes = finalized.nodes.slice(0, -1);
      const remainingNodeIds = new Set(remainingNodes.map((node) => node.id));
      const remainingGateIds = new Set(finalized.gates.map((gate) => gate.id));
      const remainingElementIds = buildRetainedElementIdSet(
        remainingNodeIds,
        remainingGateIds,
      );
      finalized = {
        ...finalized,
        nodes: remainingNodes,
        connections: finalized.connections.filter(
          (connection) =>
            remainingElementIds.has(connection.from.gateId) &&
            remainingElementIds.has(connection.to.gateId),
        ),
        selectedElementIds: finalized.selectedElementIds.filter((id) =>
          remainingElementIds.has(id),
        ),
      };
      addReason(reasons, 'nodes-trimmed');
      addReason(reasons, 'connections-trimmed');
      addReason(reasons, 'selected-elements-trimmed');
      reduction = buildReduction();
      continue;
    }

    if (finalized.gates.length > 0) {
      const remainingGates = finalized.gates.slice(0, -1);
      const remainingGateIds = new Set(remainingGates.map((gate) => gate.id));
      const remainingNodeIds = new Set(finalized.nodes.map((node) => node.id));
      const remainingElementIds = buildRetainedElementIdSet(
        remainingNodeIds,
        remainingGateIds,
      );
      finalized = {
        ...finalized,
        gates: remainingGates,
        connections: finalized.connections.filter(
          (connection) =>
            remainingElementIds.has(connection.from.gateId) &&
            remainingElementIds.has(connection.to.gateId),
        ),
        selectedElementIds: finalized.selectedElementIds.filter(
          (id) => remainingElementIds.has(id),
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

  if (reduction.serializedBytes > limits.maxSerializedBytes) {
    throw new BackendBrokerCircuitContextError(
      'CIRCUIT_CONTEXT_TOO_LARGE',
      'The current circuit still exceeds the broker payload budget after local reduction.',
      {
        maxSerializedBytes: limits.maxSerializedBytes,
        serializedBytes: reduction.serializedBytes,
      },
    );
  }

  return {
    ...finalized,
    reduction,
  };
}

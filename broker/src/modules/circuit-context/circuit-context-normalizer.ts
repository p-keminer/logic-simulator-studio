import { circuitContextSchema } from '../../contracts/circuit-context.js';
import type { CircuitContextDraft } from './circuit-context-mapper.js';
import type { CircuitContextLimits } from './types.js';

export interface CircuitContextNormalizationResult {
  readonly draft: CircuitContextDraft;
  readonly invalidEntriesRemoved: boolean;
  readonly duplicateEntriesRemoved: boolean;
  readonly notesTrimmed: boolean;
}

const trimToLength = (value: string | undefined, maxLength: number) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (maxLength <= 0) {
    return undefined;
  }

  const sliced = trimmed.slice(0, maxLength);

  return sliced.length > 0 ? sliced : undefined;
};

const PORT_KEY_SEPARATOR = '\u0000';
const CONNECTION_KEY_SEPARATOR = '\u0001';

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

export function normalizeCircuitContext(
  draft: CircuitContextDraft | null,
  limits: CircuitContextLimits,
): CircuitContextNormalizationResult | null {
  if (!draft) {
    return null;
  }

  let invalidEntriesRemoved = false;
  let duplicateEntriesRemoved = false;
  const trimmedNotes = trimToLength(draft.notes, limits.maxNotesLength);
  const notesTrimmed =
    typeof draft.notes === 'string' &&
    draft.notes.trim().length > 0 &&
    trimmedNotes !== draft.notes.trim();

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

    const normalizePorts = (
      ports: Array<{ gateId: string; port: string }>,
    ) => {
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
      const portEntries = normalizedPorts.map((port) => ({
        key: `${port.gateId}${PORT_KEY_SEPARATOR}${port.port}`,
        value: port,
      }));
      const uniqueKeys = dedupeStrings(portEntries.map((entry) => entry.key)).values;
      const portMap = new Map(portEntries.map((entry) => [entry.key, entry.value]));

      return uniqueKeys.flatMap((key) => {
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
  const connectionEntries = connections.map((connection) => ({
    key: [
      connection.from.gateId,
      connection.from.port,
      connection.to.gateId,
      connection.to.port,
    ].join(CONNECTION_KEY_SEPARATOR),
    value: connection,
  }));
  const connectionMap = new Map(
    connectionEntries.map((entry) => [entry.key, entry.value]),
  );
  const uniqueConnections = dedupeStrings(
    connectionEntries.map((entry) => entry.key),
  ).values.flatMap((key) => {
    const value = connectionMap.get(key);

    return value ? [value] : [];
  });
  duplicateEntriesRemoved ||= uniqueConnections.length !== connections.length;

  const sanitizedDraft: CircuitContextDraft = {
    ...draft,
    circuitId: draft.circuitId.trim(),
    circuitName: trimToLength(draft.circuitName, limits.maxCircuitNameLength),
    selectedElementIds: selectedElementIds.values,
    nodes: uniqueNodes,
    gates: uniqueGates,
    connections: uniqueConnections,
    notes: trimmedNotes,
  };

  circuitContextSchema
    .omit({ reduction: true })
    .parse({
      ...sanitizedDraft,
      scope: 'active-circuit',
    });

  return {
    draft: sanitizedDraft,
    invalidEntriesRemoved,
    duplicateEntriesRemoved,
    notesTrimmed,
  };
}

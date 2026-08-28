import { gateRegistry } from '../registry/GateRegistry';
import type { Circuit, GateDefinition, GateTypeId, WireEndpoint } from '../types';
import type { CircuitAction, CircuitActionsMutation } from '../../store/actions';
import { generateId } from '../../utils/idGenerator';

export const CIRCUIT_ACTIONS_PROTOCOL_VERSION = 1;
export const MAX_CIRCUIT_ACTIONS = 64;

const MAX_BLOCK_CHARACTERS = 32_000;
const MAX_ID_LENGTH = 128;
const MAX_LABEL_LENGTH = 128;
const MAX_TOKEN_LENGTH = 64;
const FENCE_SOURCE = '```circuit-actions[ \\t]*\\r?\\n([\\s\\S]*?)\\r?\\n```';
const REF_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const TOKEN_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

const ALLOWED_GATE_TYPES = new Set([
  'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', 'NOT', 'BUFFER',
  'SR_LATCH', 'D_FF', 'JK_FF',
]);
const ALLOWED_INPUT_TYPES = new Set(['INPUT_SWITCH', 'CLOCK']);
const ALLOWED_OUTPUT_TYPES = new Set(['OUTPUT_LED']);

const COL_WIDTH = 200;
const ROW_HEIGHT = 130;
const ORIGIN_X = 320;
const ORIGIN_Y = 280;
const COLS = 3;

type JsonRecord = Record<string, unknown>;

interface ResolvedEndpoint {
  gateId: string;
  portId: string;
  typeId: GateTypeId;
  displayName: string;
}

interface VirtualGate {
  id: string;
  typeId: GateTypeId;
}

interface ResolvedTargetGate extends VirtualGate {
  displayName: string;
}

interface VirtualConnection {
  from: WireEndpoint;
  to: WireEndpoint;
}

export interface CircuitActionsPreviewItem {
  index: number;
  type: string;
  description: string;
  destructive: boolean;
}

export interface PreparedCircuitActions {
  sourceText: string;
  cleanText: string;
  actionCount: number;
  destructive: boolean;
  preview: CircuitActionsPreviewItem[];
  mutations: CircuitActionsMutation[];
}

export type CircuitActionsProposalResult =
  | { status: 'none'; cleanText: string }
  | { status: 'invalid'; cleanText: string; errors: string[] }
  | { status: 'ready'; cleanText: string; proposal: PreparedCircuitActions };

class CircuitActionsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitActionsValidationError';
  }
}

function fail(message: string): never {
  throw new CircuitActionsValidationError(message);
}

const createFenceRegex = () => new RegExp(FENCE_SOURCE, 'g');
const containsControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireRecord = (value: unknown, path: string): JsonRecord => {
  if (!isRecord(value)) fail(`${path} muss ein JSON-Objekt sein.`);
  return value;
};

const requireExactKeys = (
  record: JsonRecord,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): void => {
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(record).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    fail(`${path} enthaelt unbekannte Felder: ${unknown.join(', ')}.`);
  }
  const missing = required.filter((key) => !Object.hasOwn(record, key));
  if (missing.length > 0) {
    fail(`${path} fehlen Pflichtfelder: ${missing.join(', ')}.`);
  }
};

const requireString = (
  record: JsonRecord,
  key: string,
  path: string,
  options: { maxLength: number; pattern?: RegExp },
): string => {
  const value = record[key];
  if (typeof value !== 'string') fail(`${path}.${key} muss ein String sein.`);
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > options.maxLength) {
    fail(`${path}.${key} muss 1 bis ${options.maxLength} Zeichen enthalten.`);
  }
  if (containsControlCharacter(normalized)) {
    fail(`${path}.${key} darf keine Steuerzeichen enthalten.`);
  }
  if (options.pattern && !options.pattern.test(normalized)) {
    fail(`${path}.${key} hat ein ungueltiges Format.`);
  }
  return normalized;
};

const getDefinition = (typeId: string, path: string): GateDefinition => {
  if (!gateRegistry.has(typeId)) fail(`${path}: unbekannter Gate-Typ "${typeId}".`);
  return gateRegistry.get(typeId);
};

const createUniqueGateId = (gates: Map<string, VirtualGate>): string => {
  let id = generateId();
  while (gates.has(id)) id = generateId();
  return id;
};

const computeLayoutStartY = (circuit: Circuit): number => {
  const gates = Object.values(circuit.gates);
  if (gates.length === 0) return ORIGIN_Y;
  return Math.max(...gates.map((gate) => gate.y)) + ROW_HEIGHT;
};

const autoPosition = (index: number, startY: number) => ({
  x: ORIGIN_X + (index % COLS) * COL_WIDTH,
  y: startY + Math.floor(index / COLS) * ROW_HEIGHT,
});

const removeGateConnections = (
  connections: VirtualConnection[],
  gateId: string,
): VirtualConnection[] =>
  connections.filter(
    (connection) =>
      connection.from.gateId !== gateId && connection.to.gateId !== gateId,
  );

/** Removes every valid circuit-actions block from text shown in the chat. */
export function stripCircuitActionsBlock(responseText: string): string {
  return responseText
    .replace(createFenceRegex(), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Parses and fully validates a model proposal without mutating the circuit. */
export function prepareCircuitActionsProposal(
  responseText: string,
  circuit: Circuit,
): CircuitActionsProposalResult {
  const cleanText = stripCircuitActionsBlock(responseText);
  const matches = [...responseText.matchAll(createFenceRegex())];
  if (matches.length === 0) return { status: 'none', cleanText };
  if (matches.length > 1) {
    return {
      status: 'invalid',
      cleanText,
      errors: ['Eine Antwort darf hoechstens einen circuit-actions-Block enthalten.'],
    };
  }

  try {
    const rawBlock = matches[0][1];
    if (rawBlock.length > MAX_BLOCK_CHARACTERS) {
      fail(`Der circuit-actions-Block ist groesser als ${MAX_BLOCK_CHARACTERS} Zeichen.`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBlock);
    } catch {
      fail('Der circuit-actions-Block enthaelt kein gueltiges JSON.');
    }

    const block = requireRecord(parsed, 'circuit-actions');
    requireExactKeys(block, ['version', 'actions'], [], 'circuit-actions');
    if (block.version !== CIRCUIT_ACTIONS_PROTOCOL_VERSION) {
      fail(`circuit-actions.version muss exakt ${CIRCUIT_ACTIONS_PROTOCOL_VERSION} sein.`);
    }
    if (!Array.isArray(block.actions)) {
      fail('circuit-actions.actions muss ein Array sein.');
    }
    if (block.actions.length === 0 || block.actions.length > MAX_CIRCUIT_ACTIONS) {
      fail(`circuit-actions.actions muss 1 bis ${MAX_CIRCUIT_ACTIONS} Eintraege enthalten.`);
    }

    const virtualGates = new Map<string, VirtualGate>(
      Object.values(circuit.gates).map((gate) => [
        gate.id,
        { id: gate.id, typeId: gate.typeId },
      ]),
    );
    let virtualConnections: VirtualConnection[] = Object.values(circuit.wires).map(
      (wire) => ({ from: { ...wire.from }, to: { ...wire.to } }),
    );
    const refs = new Map<string, VirtualGate>();
    const mutations: CircuitActionsMutation[] = [];
    const preview: CircuitActionsPreviewItem[] = [];
    let layoutStartY = computeLayoutStartY(circuit);
    let newGateIndex = 0;
    let clearSeen = false;

    const resolveEndpoint = (value: unknown, path: string): ResolvedEndpoint => {
      const endpoint = requireRecord(value, path);
      requireExactKeys(endpoint, ['port'], ['ref', 'id'], path);
      const hasRef = Object.hasOwn(endpoint, 'ref');
      const hasId = Object.hasOwn(endpoint, 'id');
      if (hasRef === hasId) fail(`${path} muss exakt eines von ref oder id enthalten.`);
      const portId = requireString(endpoint, 'port', path, {
        maxLength: MAX_TOKEN_LENGTH,
        pattern: TOKEN_PATTERN,
      });
      const selector = hasRef
        ? requireString(endpoint, 'ref', path, {
            maxLength: MAX_TOKEN_LENGTH,
            pattern: REF_PATTERN,
          })
        : requireString(endpoint, 'id', path, {
            maxLength: MAX_ID_LENGTH,
          });
      const gate = hasRef ? refs.get(selector) : virtualGates.get(selector);
      if (!gate) fail(`${path} verweist auf kein aktuell vorhandenes Gate.`);
      return {
        gateId: gate.id,
        portId,
        typeId: gate.typeId,
        displayName: `${hasRef ? 'ref' : 'id'}:${selector}`,
      };
    };

    const resolveTargetGate = (
      action: JsonRecord,
      path: string,
    ): ResolvedTargetGate => {
      const hasRef = Object.hasOwn(action, 'ref');
      const hasId = Object.hasOwn(action, 'id');
      if (hasRef === hasId) fail(`${path} muss exakt eines von ref oder id enthalten.`);
      const selector = hasRef
        ? requireString(action, 'ref', path, {
            maxLength: MAX_TOKEN_LENGTH,
            pattern: REF_PATTERN,
          })
        : requireString(action, 'id', path, {
            maxLength: MAX_ID_LENGTH,
          });
      const gate = hasRef ? refs.get(selector) : virtualGates.get(selector);
      if (!gate) fail(`${path} verweist auf kein aktuell vorhandenes Gate.`);
      return {
        ...gate,
        displayName: `${hasRef ? 'ref' : 'id'}:${selector}`,
      };
    };

    for (let index = 0; index < block.actions.length; index += 1) {
      const path = `circuit-actions.actions[${index}]`;
      const action = requireRecord(block.actions[index], path);
      const type = requireString(action, 'type', path, {
        maxLength: MAX_TOKEN_LENGTH,
        pattern: TOKEN_PATTERN,
      });

      if (type === 'ADD_GATE' || type === 'ADD_INPUT' || type === 'ADD_OUTPUT') {
        const typeField = type === 'ADD_GATE' ? 'gateType' : 'nodeType';
        requireExactKeys(action, ['type', typeField, 'ref'], [], path);
        const requestedType = requireString(action, typeField, path, {
          maxLength: MAX_TOKEN_LENGTH,
          pattern: TOKEN_PATTERN,
        });
        const allowedSet = type === 'ADD_GATE'
          ? ALLOWED_GATE_TYPES
          : type === 'ADD_INPUT'
            ? ALLOWED_INPUT_TYPES
            : ALLOWED_OUTPUT_TYPES;
        if (!allowedSet.has(requestedType)) {
          fail(`${path}.${typeField}: Gate-Typ "${requestedType}" ist fuer ${type} nicht freigegeben.`);
        }
        getDefinition(requestedType, `${path}.${typeField}`);
        const ref = requireString(action, 'ref', path, {
          maxLength: MAX_TOKEN_LENGTH,
          pattern: REF_PATTERN,
        });
        if (refs.has(ref)) fail(`${path}.ref "${ref}" wurde bereits definiert.`);

        const id = createUniqueGateId(virtualGates);
        const gate = { id, typeId: requestedType };
        const position = autoPosition(newGateIndex, layoutStartY);
        newGateIndex += 1;
        refs.set(ref, gate);
        virtualGates.set(id, gate);
        mutations.push({
          type: 'GATE_ADD',
          payload: { id, typeId: requestedType, ...position },
        });
        preview.push({
          index,
          type,
          description: `${requestedType} als "${ref}" hinzufuegen`,
          destructive: false,
        });
        continue;
      }

      if (type === 'CONNECT') {
        requireExactKeys(action, ['type', 'from', 'to'], [], path);
        const from = resolveEndpoint(action.from, `${path}.from`);
        const to = resolveEndpoint(action.to, `${path}.to`);
        if (from.gateId === to.gateId) fail(`${path} darf ein Gate nicht mit sich selbst verbinden.`);
        const fromDefinition = getDefinition(from.typeId, `${path}.from`);
        const toDefinition = getDefinition(to.typeId, `${path}.to`);
        if (!fromDefinition.outputs.some((port) => port.id === from.portId)) {
          fail(`${path}.from.port "${from.portId}" ist kein Ausgang von ${from.typeId}.`);
        }
        if (!toDefinition.inputs.some((port) => port.id === to.portId)) {
          fail(`${path}.to.port "${to.portId}" ist kein Eingang von ${to.typeId}.`);
        }
        if (virtualConnections.some((connection) =>
          connection.to.gateId === to.gateId && connection.to.portId === to.portId
        )) {
          fail(`${path}.to ist bereits mit einer Quelle verbunden.`);
        }
        const connection = {
          from: { gateId: from.gateId, portId: from.portId },
          to: { gateId: to.gateId, portId: to.portId },
        };
        virtualConnections.push(connection);
        mutations.push({ type: 'WIRE_ADD', payload: connection });
        preview.push({
          index,
          type,
          description: `${from.displayName}:${from.portId} mit ${to.displayName}:${to.portId} verbinden`,
          destructive: false,
        });
        continue;
      }

      if (type === 'SET_LABEL') {
        requireExactKeys(action, ['type', 'label'], ['ref', 'id'], path);
        const gate = resolveTargetGate(action, path);
        const label = requireString(action, 'label', path, {
          maxLength: MAX_LABEL_LENGTH,
        });
        mutations.push({
          type: 'GATE_SET_LABEL',
          payload: { gateId: gate.id, label },
        });
        preview.push({
          index,
          type,
          description: `Label von ${gate.displayName} auf "${label}" setzen`,
          destructive: false,
        });
        continue;
      }

      if (type === 'DELETE_NODE') {
        requireExactKeys(action, ['type', 'id'], [], path);
        const id = requireString(action, 'id', path, { maxLength: MAX_ID_LENGTH });
        if (!virtualGates.has(id)) fail(`${path}.id verweist auf kein aktuell vorhandenes Gate.`);
        virtualGates.delete(id);
        virtualConnections = removeGateConnections(virtualConnections, id);
        mutations.push({ type: 'GATE_DELETE', payload: { gateId: id } });
        preview.push({
          index,
          type,
          description: `Gate ${id} samt Verbindungen loeschen`,
          destructive: true,
        });
        continue;
      }

      if (type === 'CLEAR') {
        requireExactKeys(action, ['type'], [], path);
        if (index !== 0 || clearSeen) {
          fail(`${path}: CLEAR ist hoechstens einmal und nur als erste Aktion erlaubt.`);
        }
        clearSeen = true;
        virtualGates.clear();
        virtualConnections = [];
        refs.clear();
        layoutStartY = ORIGIN_Y;
        newGateIndex = 0;
        mutations.push({ type: 'CIRCUIT_CLEAR_CONTENT' });
        preview.push({
          index,
          type,
          description: 'Alle Gates und Verbindungen der aktuellen Schaltung loeschen',
          destructive: true,
        });
        continue;
      }

      fail(`${path}.type "${type}" ist nicht erlaubt.`);
    }

    const proposal: PreparedCircuitActions = {
      sourceText: responseText,
      cleanText,
      actionCount: mutations.length,
      destructive: preview.some((item) => item.destructive),
      preview,
      mutations,
    };
    return { status: 'ready', cleanText, proposal };
  } catch (error) {
    const message = error instanceof CircuitActionsValidationError
      ? error.message
      : 'Der circuit-actions-Block konnte nicht sicher validiert werden.';
    return { status: 'invalid', cleanText, errors: [message] };
  }
}

/** Applies an already validated proposal as exactly one history-aware dispatch. */
export function applyCircuitActionsProposal(
  proposal: PreparedCircuitActions,
  dispatch: (action: CircuitAction) => void,
): { executed: number } {
  dispatch({
    type: 'CIRCUIT_ACTIONS_APPLY_BATCH',
    payload: { actions: [...proposal.mutations] },
  });
  return { executed: proposal.actionCount };
}

import { registerCustomIC } from '../customIc/registerCustomIC';
import { toCustomIcTypeId } from '../customIc/customIcTypeId';
import { gateRegistry } from '../registry/GateRegistry';
import type {
  Circuit,
  CircuitMetadata,
  GateDefinition,
  GateInstance,
  GateProjectionMetadata,
  SerializedCustomICDefinition,
  SignalState,
  ViewportState,
  Wire,
} from '../types';

export const MAX_CIRCUIT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CIRCUIT_GATES = 5_000;
export const MAX_CIRCUIT_WIRES = 10_000;
export const MAX_EMBEDDED_CUSTOM_ICS = 64;

const MAX_JSON_DEPTH = 64;
const MAX_JSON_NODES = 250_000;
const MAX_CUSTOM_IC_DEPTH = 8;
const MAX_WAYPOINTS_PER_WIRE = 512;
const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 200;
const MAX_LABEL_LENGTH = 256;
const MAX_CUSTOM_STATE_STRING_LENGTH = 10_000;
const MAX_CUSTOM_STATE_COLLECTION_ITEMS = 5_000;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SAFE_HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const NUMERIC_CUSTOM_STATE_KEY = /^(?:angle|b\d+|bit\d+|cnt\d*|count|frequency|latch|pClk\d*|pc\d+|prevClk\d*|pShcp|pStcp|q(?:M|S|\d+)?|reg|shift|tickCounter|value)$/;

type JsonRecord = Record<string, unknown>;

interface PortCatalogEntry {
  inputs: Set<string>;
  outputs: Set<string>;
}

interface EmbeddedSkeleton {
  name: string;
  typeId: string;
  portNames?: string[];
  circuitRaw: JsonRecord;
  dependencies: string[];
}

export class DeserializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeserializationError';
  }
}

function fail(message: string): never {
  throw new DeserializationError(message);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) fail(`${path} muss ein Objekt sein`);
  return value;
}

function requireString(
  value: unknown,
  path: string,
  options: { allowEmpty?: boolean; max?: number; optional?: boolean } = {},
): string | undefined {
  if (value === undefined && options.optional) return undefined;
  if (typeof value !== 'string') fail(`${path} muss eine Zeichenkette sein`);
  if (!options.allowEmpty && value.trim().length === 0) fail(`${path} darf nicht leer sein`);
  const max = options.max ?? MAX_NAME_LENGTH;
  if (value.length > max) fail(`${path} ist länger als ${max} Zeichen`);
  return value;
}

function requireId(value: unknown, path: string): string {
  const id = requireString(value, path, { max: MAX_ID_LENGTH })!;
  const hasControlCharacter = [...id].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
  if (hasControlCharacter || FORBIDDEN_KEYS.has(id)) {
    fail(`${path} enthält unzulässige Zeichen oder einen reservierten Namen`);
  }
  return id;
}

function requireFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${path} muss eine endliche Zahl sein`);
  }
  return value;
}

function requireSafeColor(
  value: unknown,
  path: string,
  options: { allowEmpty?: boolean; optional?: boolean } = {},
): string | undefined {
  const color = requireString(value, path, {
    allowEmpty: options.allowEmpty,
    max: 7,
    optional: options.optional,
  });
  if (color === undefined || (options.allowEmpty && color === '')) return color;
  if (!SAFE_HEX_COLOR.test(color)) fail(`${path} muss eine sechsstellige Hex-Farbe sein`);
  return color;
}

function normalizeCustomStateValue(value: unknown, path: string, depth: number): unknown {
  if (depth > MAX_JSON_DEPTH) fail(`${path} überschreitet die maximale JSON-Tiefe ${MAX_JSON_DEPTH}`);
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return requireFiniteNumber(value, path);
  if (typeof value === 'string') {
    return requireString(value, path, { allowEmpty: true, max: MAX_CUSTOM_STATE_STRING_LENGTH });
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_CUSTOM_STATE_COLLECTION_ITEMS) {
      fail(`${path} enthält mehr als ${MAX_CUSTOM_STATE_COLLECTION_ITEMS} Einträge`);
    }
    return value.map((entry, index) => normalizeCustomStateValue(entry, `${path}[${index}]`, depth + 1));
  }
  return normalizeCustomStateRecord(value, path, depth + 1);
}

function normalizeCustomStateRecord(value: unknown, path: string, depth = 0): Record<string, unknown> {
  if (depth > MAX_JSON_DEPTH) fail(`${path} überschreitet die maximale JSON-Tiefe ${MAX_JSON_DEPTH}`);
  const record = requireRecord(value, path);
  const entries = Object.entries(record);
  if (entries.length > MAX_CUSTOM_STATE_COLLECTION_ITEMS) {
    fail(`${path} enthält mehr als ${MAX_CUSTOM_STATE_COLLECTION_ITEMS} Einträge`);
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, current] of entries) {
    const fieldPath = `${path}.${key}`;
    if (key === 'text') {
      normalized[key] = requireString(current, fieldPath, {
        allowEmpty: true,
        max: MAX_CUSTOM_STATE_STRING_LENGTH,
      })!;
      continue;
    }
    if (key === 'ledColor') {
      normalized[key] = requireSafeColor(current, fieldPath)!;
      continue;
    }
    if (key === 'data') {
      if (!Array.isArray(current) || current.length > 256) {
        fail(`${fieldPath} muss ein Array mit höchstens 256 Bytes sein`);
      }
      normalized[key] = current.map((byte, index) => {
        const numericByte = requireFiniteNumber(byte, `${fieldPath}[${index}]`);
        if (!Number.isInteger(numericByte) || numericByte < 0 || numericByte > 255) {
          fail(`${fieldPath}[${index}] muss eine Ganzzahl zwischen 0 und 255 sein`);
        }
        return numericByte;
      });
      continue;
    }
    if (key === 'prevABCD') {
      const sequence = requireString(current, fieldPath, { max: 4 })!;
      if (!/^[01]{4}$/.test(sequence)) fail(`${fieldPath} muss aus genau vier Binärstellen bestehen`);
      normalized[key] = sequence;
      continue;
    }
    if (key === '_paused') {
      if (typeof current !== 'boolean') fail(`${fieldPath} muss ein boolescher Wert sein`);
      normalized[key] = current;
      continue;
    }
    if (key === 'innerStates') {
      const states = requireRecord(current, fieldPath);
      const stateEntries = Object.entries(states);
      if (stateEntries.length > MAX_CIRCUIT_GATES) {
        fail(`${fieldPath} enthält mehr als ${MAX_CIRCUIT_GATES} Gatterzustände`);
      }
      normalized[key] = Object.fromEntries(stateEntries.map(([gateId, state]) => [
        requireId(gateId, `${fieldPath}.${gateId}`),
        normalizeCustomStateRecord(state, `${fieldPath}.${gateId}`, depth + 1),
      ]));
      continue;
    }
    if (NUMERIC_CUSTOM_STATE_KEY.test(key)) {
      normalized[key] = requireFiniteNumber(current, fieldPath);
      continue;
    }
    normalized[key] = normalizeCustomStateValue(current, fieldPath, depth + 1);
  }
  return normalized;
}

function normalizeCustomState(value: unknown, path: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  return normalizeCustomStateRecord(value, path);
}

function assertSafeJsonTree(root: unknown): void {
  const stack: Array<{ value: unknown; depth: number; path: string }> = [
    { value: root, depth: 0, path: 'Circuit' },
  ];
  let nodes = 0;

  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > MAX_JSON_NODES) fail(`Circuit überschreitet das Struktur-Limit von ${MAX_JSON_NODES} Werten`);
    if (current.depth > MAX_JSON_DEPTH) fail(`Circuit überschreitet die maximale JSON-Tiefe ${MAX_JSON_DEPTH}`);

    if (typeof current.value === 'number' && !Number.isFinite(current.value)) {
      fail(`${current.path} enthält eine nicht endliche Zahl`);
    }
    if (current.value === null || typeof current.value !== 'object') continue;

    if (Array.isArray(current.value)) {
      current.value.forEach((value, index) => {
        stack.push({ value, depth: current.depth + 1, path: `${current.path}[${index}]` });
      });
      continue;
    }

    for (const [key, value] of Object.entries(current.value as JsonRecord)) {
      if (FORBIDDEN_KEYS.has(key)) fail(`${current.path} enthält den reservierten Schlüssel "${key}"`);
      stack.push({ value, depth: current.depth + 1, path: `${current.path}.${key}` });
    }
  }
}

function buildPortCatalog(): Map<string, PortCatalogEntry> {
  return new Map(
    gateRegistry.getAll().map((definition) => [
      definition.typeId,
      {
        inputs: new Set(definition.inputs.map((port) => port.id)),
        outputs: new Set(definition.outputs.map((port) => port.id)),
      },
    ]),
  );
}

function readRawGates(circuitRaw: JsonRecord, path: string): Array<[string, JsonRecord]> {
  const gates = requireRecord(circuitRaw.gates, `${path}.gates`);
  const entries = Object.entries(gates);
  if (entries.length > MAX_CIRCUIT_GATES) {
    fail(`${path} enthält mehr als ${MAX_CIRCUIT_GATES} Gatter`);
  }
  return entries.map(([key, value]) => [key, requireRecord(value, `${path}.gates.${key}`)]);
}

function buildEmbeddedSkeletons(
  root: JsonRecord,
  catalog: Map<string, PortCatalogEntry>,
): { skeletons: Map<string, EmbeddedSkeleton>; order: string[] } {
  if (root.customIcLibrary === undefined) return { skeletons: new Map(), order: [] };
  if (!Array.isArray(root.customIcLibrary)) fail('Circuit.customIcLibrary muss ein Array sein');
  if (root.customIcLibrary.length > MAX_EMBEDDED_CUSTOM_ICS) {
    fail(`Circuit enthält mehr als ${MAX_EMBEDDED_CUSTOM_ICS} eingebettete Custom-ICs`);
  }

  const skeletons = new Map<string, EmbeddedSkeleton>();
  root.customIcLibrary.forEach((rawEntry, index) => {
    const path = `Circuit.customIcLibrary[${index}]`;
    const entry = requireRecord(rawEntry, path);
    const name = requireString(entry.name, `${path}.name`, { max: 80 })!;
    const typeId = requireId(entry.typeId, `${path}.typeId`);
    const expectedTypeId = toCustomIcTypeId(name);
    if (typeId !== expectedTypeId) {
      fail(`${path}.typeId muss für "${name}" den Wert "${expectedTypeId}" haben`);
    }
    if (skeletons.has(typeId)) fail(`Custom-IC-Typ "${typeId}" ist doppelt definiert`);

    const circuitRaw = requireRecord(entry.circuit, `${path}.circuit`);
    if (circuitRaw.customIcLibrary !== undefined) {
      fail(`${path}.circuit darf keine weitere eingebettete Bibliothek enthalten`);
    }
    const rawGates = readRawGates(circuitRaw, `${path}.circuit`);
    const inputCount = rawGates.filter(([, gate]) => gate.typeId === 'INPUT_SWITCH').length;
    const outputCount = rawGates.filter(([, gate]) => gate.typeId === 'OUTPUT_LED').length;
    if (inputCount > 64 || outputCount > 64) fail(`${path} überschreitet das Port-Limit von 64 Ein-/Ausgängen`);

    let portNames: string[] | undefined;
    if (entry.portNames !== undefined) {
      if (!Array.isArray(entry.portNames) || entry.portNames.length !== inputCount + outputCount) {
        fail(`${path}.portNames muss genau ${inputCount + outputCount} Einträge enthalten`);
      }
      portNames = entry.portNames.map((value, portIndex) =>
        requireString(value, `${path}.portNames[${portIndex}]`, { allowEmpty: true, max: 80 })!,
      );
    }

    catalog.set(typeId, {
      inputs: new Set(Array.from({ length: inputCount }, (_, portIndex) => `i${portIndex}`)),
      outputs: new Set(Array.from({ length: outputCount }, (_, portIndex) => `o${portIndex}`)),
    });

    skeletons.set(typeId, {
      name,
      typeId,
      portNames,
      circuitRaw,
      dependencies: rawGates
        .map(([, gate]) => gate.typeId)
        .filter((value): value is string => typeof value === 'string' && value.startsWith('CIC_')),
    });
  });

  const state = new Map<string, 'visiting' | 'visited'>();
  const order: string[] = [];
  const visit = (typeId: string, depth: number) => {
    if (depth > MAX_CUSTOM_IC_DEPTH) fail(`Custom-IC-Abhängigkeit überschreitet die maximale Tiefe ${MAX_CUSTOM_IC_DEPTH}`);
    const current = state.get(typeId);
    if (current === 'visiting') fail(`Zyklische Custom-IC-Abhängigkeit bei "${typeId}"`);
    if (current === 'visited') return;
    state.set(typeId, 'visiting');
    const skeleton = skeletons.get(typeId)!;
    for (const dependency of new Set(skeleton.dependencies)) {
      if (dependency === typeId) fail(`Custom-IC "${typeId}" darf sich nicht selbst enthalten`);
      if (skeletons.has(dependency)) visit(dependency, depth + 1);
      else if (!catalog.has(dependency)) fail(`Custom-IC "${typeId}" verweist auf den unbekannten Typ "${dependency}"`);
    }
    state.set(typeId, 'visited');
    order.push(typeId);
  };

  for (const typeId of skeletons.keys()) visit(typeId, 1);
  return { skeletons, order };
}

function normalizeProjection(value: unknown, path: string): GateProjectionMetadata | undefined {
  if (value === undefined) return undefined;
  const projection = requireRecord(value, path);
  const role = projection.role;
  const visibility = projection.visibility;
  const validRoles = new Set([
    'state', 'state_inverted', 'output', 'input', 'clock', 'reset', 'display_mirror', 'internal_helper',
  ]);
  const validVisibility = new Set(['canonical', 'derived', 'debug']);
  if (projection.sourceSystem !== 'fsm_synth' || typeof role !== 'string' || !validRoles.has(role)) {
    fail(`${path} enthält ungültige Projektionsmetadaten`);
  }
  if (typeof visibility !== 'string' || !validVisibility.has(visibility)) {
    fail(`${path}.visibility ist ungültig`);
  }
  return {
    sourceSystem: 'fsm_synth',
    projectionBatchId: requireId(projection.projectionBatchId, `${path}.projectionBatchId`),
    role: role as GateProjectionMetadata['role'],
    visibility: visibility as GateProjectionMetadata['visibility'],
    signalLabel: requireString(projection.signalLabel, `${path}.signalLabel`, { max: MAX_LABEL_LENGTH })!,
    groupKey: requireId(projection.groupKey, `${path}.groupKey`),
    signalPortId: requireString(projection.signalPortId, `${path}.signalPortId`, {
      max: MAX_ID_LENGTH,
      optional: true,
    }),
  };
}

function normalizeMetadata(value: unknown, path: string): CircuitMetadata {
  const metadata = value === undefined ? {} : requireRecord(value, `${path}.metadata`);
  const now = new Date().toISOString();
  return {
    createdAt: requireString(metadata.createdAt, `${path}.metadata.createdAt`, {
      allowEmpty: true,
      max: 100,
      optional: true,
    }) || now,
    updatedAt: requireString(metadata.updatedAt, `${path}.metadata.updatedAt`, {
      allowEmpty: true,
      max: 100,
      optional: true,
    }) || now,
    description: requireString(metadata.description, `${path}.metadata.description`, {
      allowEmpty: true,
      max: 2_000,
      optional: true,
    }),
    author: requireString(metadata.author, `${path}.metadata.author`, {
      allowEmpty: true,
      max: 200,
      optional: true,
    }),
  };
}

function normalizeViewport(value: unknown, path: string): ViewportState {
  if (value === undefined) return { panX: 0, panY: 0, zoom: 1 };
  const viewport = requireRecord(value, `${path}.viewport`);
  const zoom = requireFiniteNumber(viewport.zoom, `${path}.viewport.zoom`);
  if (zoom <= 0 || zoom > 20) fail(`${path}.viewport.zoom muss größer als 0 und höchstens 20 sein`);
  return {
    panX: requireFiniteNumber(viewport.panX, `${path}.viewport.panX`),
    panY: requireFiniteNumber(viewport.panY, `${path}.viewport.panY`),
    zoom,
  };
}

function initialSignal(): SignalState {
  return { value: 0, version: 0, lastChangedAt: 0 };
}

function normalizeCircuit(
  rawValue: unknown,
  path: string,
  catalog: Map<string, PortCatalogEntry>,
): Circuit {
  const raw = requireRecord(rawValue, path);
  const gateEntries = readRawGates(raw, path);
  const wiresRaw = requireRecord(raw.wires, `${path}.wires`);
  const wireEntries = Object.entries(wiresRaw);
  if (wireEntries.length > MAX_CIRCUIT_WIRES) fail(`${path} enthält mehr als ${MAX_CIRCUIT_WIRES} Leitungen`);

  const gates: Record<string, GateInstance> = {};
  for (const [key, value] of gateEntries) {
    const gatePath = `${path}.gates.${key}`;
    const id = requireId(value.id, `${gatePath}.id`);
    if (key !== id) fail(`${gatePath}.id stimmt nicht mit dem Objektschlüssel überein`);
    const typeId = requireId(value.typeId, `${gatePath}.typeId`);
    const ports = catalog.get(typeId);
    if (!ports) fail(`Unbekannter Gattertyp "${typeId}" in ${gatePath}`);

    const rotation = value.rotation === undefined
      ? undefined
      : requireFiniteNumber(value.rotation, `${gatePath}.rotation`);
    if (rotation !== undefined && ![0, 90, 180, 270].includes(rotation)) {
      fail(`${gatePath}.rotation muss 0, 90, 180 oder 270 sein`);
    }

    const outputSignals = Object.fromEntries(
      Array.from(ports.outputs, (portId) => [portId, initialSignal()]),
    );
    gates[id] = {
      id,
      typeId,
      x: requireFiniteNumber(value.x, `${gatePath}.x`),
      y: requireFiniteNumber(value.y, `${gatePath}.y`),
      rotation,
      label: requireString(value.label, `${gatePath}.label`, {
        allowEmpty: true,
        max: MAX_LABEL_LENGTH,
        optional: true,
      }),
      outputSignals,
      customState: normalizeCustomState(value.customState, `${gatePath}.customState`),
      projection: normalizeProjection(value.projection, `${gatePath}.projection`),
      isSelected: false,
    };
  }

  const wires: Record<string, Wire> = {};
  for (const [key, rawWire] of wireEntries) {
    const wirePath = `${path}.wires.${key}`;
    const value = requireRecord(rawWire, wirePath);
    const id = requireId(value.id, `${wirePath}.id`);
    if (key !== id) fail(`${wirePath}.id stimmt nicht mit dem Objektschlüssel überein`);
    const from = requireRecord(value.from, `${wirePath}.from`);
    const to = requireRecord(value.to, `${wirePath}.to`);
    const fromGateId = requireId(from.gateId, `${wirePath}.from.gateId`);
    const toGateId = requireId(to.gateId, `${wirePath}.to.gateId`);
    const fromPortId = requireId(from.portId, `${wirePath}.from.portId`);
    const toPortId = requireId(to.portId, `${wirePath}.to.portId`);
    if (!Object.hasOwn(gates, fromGateId) || !Object.hasOwn(gates, toGateId)) {
      fail(`${wirePath} verweist auf ein nicht vorhandenes Gatter`);
    }
    const fromGate = gates[fromGateId];
    const toGate = gates[toGateId];
    if (!catalog.get(fromGate.typeId)!.outputs.has(fromPortId)) {
      fail(`${wirePath}.from verweist nicht auf einen Ausgang von "${fromGate.typeId}"`);
    }
    if (!catalog.get(toGate.typeId)!.inputs.has(toPortId)) {
      fail(`${wirePath}.to verweist nicht auf einen Eingang von "${toGate.typeId}"`);
    }

    let waypoints: Array<{ x: number; y: number }> | undefined;
    if (value.waypoints !== undefined) {
      if (!Array.isArray(value.waypoints) || value.waypoints.length > MAX_WAYPOINTS_PER_WIRE) {
        fail(`${wirePath}.waypoints überschreitet das Limit von ${MAX_WAYPOINTS_PER_WIRE}`);
      }
      waypoints = value.waypoints.map((waypoint, waypointIndex) => {
        const point = requireRecord(waypoint, `${wirePath}.waypoints[${waypointIndex}]`);
        return {
          x: requireFiniteNumber(point.x, `${wirePath}.waypoints[${waypointIndex}].x`),
          y: requireFiniteNumber(point.y, `${wirePath}.waypoints[${waypointIndex}].y`),
        };
      });
    }

    wires[id] = {
      id,
      from: { gateId: fromGateId, portId: fromPortId },
      to: { gateId: toGateId, portId: toPortId },
      signal: initialSignal(),
      waypoints,
      color: requireSafeColor(value.color, `${wirePath}.color`, { allowEmpty: true, optional: true }),
      isSelected: false,
    };
  }

  return {
    id: requireId(raw.id, `${path}.id`),
    name: requireString(raw.name, `${path}.name`, {
      allowEmpty: true,
      max: MAX_NAME_LENGTH,
      optional: true,
    }) || 'Importierte Schaltung',
    version: requireString(raw.version, `${path}.version`, { max: 50, optional: true }) ?? '1.0.0',
    gates,
    wires,
    viewport: normalizeViewport(raw.viewport, path),
    metadata: normalizeMetadata(raw.metadata, path),
  };
}

function registerEmbeddedLibrary(entries: SerializedCustomICDefinition[]): void {
  const previous = new Map<string, GateDefinition>();
  for (const entry of entries) {
    if (gateRegistry.has(entry.typeId)) previous.set(entry.typeId, gateRegistry.get(entry.typeId));
  }

  try {
    for (const entry of entries) {
      registerCustomIC(entry.name, entry.circuit, entry.portNames, { replace: true });
    }
  } catch (error) {
    for (const entry of entries) gateRegistry.unregister(entry.typeId);
    for (const definition of previous.values()) gateRegistry.registerOrReplace(definition);
    fail(`Eingebettete Custom-IC-Bibliothek konnte nicht geladen werden: ${String(error)}`);
  }
}

export function deserializeCircuit(json: string): Circuit {
  const byteLength = new TextEncoder().encode(json).byteLength;
  if (byteLength > MAX_CIRCUIT_FILE_BYTES) {
    fail(`Circuit-Datei ist größer als ${Math.floor(MAX_CIRCUIT_FILE_BYTES / 1024 / 1024)} MiB`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    fail('Ungültiges JSON-Format');
  }
  assertSafeJsonTree(parsed);

  const root = requireRecord(parsed, 'Circuit');
  const catalog = buildPortCatalog();
  const { skeletons, order } = buildEmbeddedSkeletons(root, catalog);
  const embedded = order.map((typeId): SerializedCustomICDefinition => {
    const skeleton = skeletons.get(typeId)!;
    return {
      name: skeleton.name,
      typeId,
      portNames: skeleton.portNames,
      circuit: normalizeCircuit(skeleton.circuitRaw, `Custom-IC ${typeId}`, catalog),
    };
  });

  const circuit = normalizeCircuit(root, 'Circuit', catalog);
  if (embedded.length > 0) circuit.customIcLibrary = embedded;

  // Erst nach vollständiger Validierung global registrieren. Dadurch kann eine
  // ungültige Datei keine teilweise geladene Custom-IC-Bibliothek hinterlassen.
  registerEmbeddedLibrary(embedded);
  return circuit;
}

export function loadCircuitFromFile(): Promise<Circuit> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.lgsc.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('Keine Datei ausgewählt'));
      if (file.size > MAX_CIRCUIT_FILE_BYTES) {
        return reject(new DeserializationError(
          `Circuit-Datei ist größer als ${Math.floor(MAX_CIRCUIT_FILE_BYTES / 1024 / 1024)} MiB`,
        ));
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const circuit = deserializeCircuit(reader.result as string);
          resolve(circuit);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new DeserializationError('Circuit-Datei konnte nicht gelesen werden'));
      reader.readAsText(file);
    };
    input.click();
  });
}

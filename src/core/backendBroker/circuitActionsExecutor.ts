/**
 * circuitActionsExecutor.ts
 *
 * Parst circuit-actions-Blöcke aus Broker-Antworten und führt die enthaltenen
 * Befehle gegen den Circuit-Store aus (API2-03).
 *
 * Architektur: Option A (MVP) – der Broker leitet den Antworttext unverändert
 * weiter; dieses Modul extrahiert den Block clientseitig.
 */

import type { CircuitAction } from '../../store/actions';
import type { GateTypeId } from '../types';
import { generateId } from '../../utils/idGenerator';

// ── Interne Protokoll-Typen ──────────────────────────────────────────────────

interface RefEndpoint {
  ref: string;
  id?: never;
  port: string;
}

interface IdEndpoint {
  id: string;
  ref?: never;
  port: string;
}

type ConnectEndpoint = RefEndpoint | IdEndpoint;

type ProtocolAction =
  | { type: 'ADD_GATE';    gateType: string; ref: string }
  | { type: 'ADD_INPUT';   nodeType: string; ref: string }
  | { type: 'ADD_OUTPUT';  nodeType: string; ref: string }
  | { type: 'CONNECT';     from: ConnectEndpoint; to: ConnectEndpoint }
  | { type: 'SET_LABEL';   ref?: string; id?: string; label: string }
  | { type: 'DELETE_NODE'; id: string }
  | { type: 'CLEAR' };

interface CircuitActionsBlock {
  version: number;
  actions: ProtocolAction[];
}

// ── Öffentliches Ergebnis-Interface ─────────────────────────────────────────

export interface CircuitActionsExecutionResult {
  /** Anzahl erfolgreich verarbeiteter Befehle. */
  executed: number;
  /** Fehler mit Index und Meldung (für Console-Ausgabe). */
  errors: Array<{ index: number; message: string }>;
  /** Antworttext ohne den circuit-actions-Block (für die Chat-Anzeige). */
  cleanText: string;
}

// ── Regex für den Code-Fence-Block ──────────────────────────────────────────

// Matcht ```circuit-actions\n<inhalt>\n``` (auch mit CRLF)
const FENCE_RE = /```circuit-actions\s*\n([\s\S]*?)\n```/;

// ── Auto-Layout ──────────────────────────────────────────────────────────────

const COL_WIDTH  = 200; // px zwischen Gate-Mittelpunkten horizontal
const ROW_HEIGHT = 130; // px zwischen Gate-Mittelpunkten vertikal
const ORIGIN_X   = 320; // Startposition X (Canvas-Koordinate, Mittelpunkt)
const ORIGIN_Y   = 280; // Startposition Y
const COLS       = 3;   // Gates pro Zeile

function autoPos(index: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (index % COLS) * COL_WIDTH,
    y: ORIGIN_Y + Math.floor(index / COLS) * ROW_HEIGHT,
  };
}

// ── Parser ───────────────────────────────────────────────────────────────────

function parseBlock(responseText: string): CircuitActionsBlock | null {
  const match = FENCE_RE.exec(responseText);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch (err) {
    console.warn('[circuit-actions] JSON-Syntaxfehler im Block:', err);
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)['version'] !== 'number' ||
    !Array.isArray((parsed as Record<string, unknown>)['actions'])
  ) {
    console.warn('[circuit-actions] Fehlende Felder: version oder actions');
    return null;
  }

  return parsed as CircuitActionsBlock;
}

/** Entfernt den circuit-actions-Block aus dem Antworttext. */
export function stripCircuitActionsBlock(responseText: string): string {
  return responseText.replace(FENCE_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Executor ─────────────────────────────────────────────────────────────────

/**
 * Parst den circuit-actions-Block aus responseText und dispatcht alle Befehle
 * an den Circuit-Store. Gibt ein Ergebnisobjekt mit cleanText zurück.
 *
 * @param responseText      - Roher Antworttext des Modells (kann Block enthalten)
 * @param dispatch          - Circuit-Store-Dispatch-Funktion
 * @param existingGateCount - Anzahl der bereits im Store vorhandenen Gates (für B3-Layout-Offset)
 */
export function executeCircuitActions(
  responseText: string,
  dispatch: (action: CircuitAction) => void,
  existingGateCount = 0,
): CircuitActionsExecutionResult {
  const cleanText = stripCircuitActionsBlock(responseText);
  const block = parseBlock(responseText);

  if (!block) {
    // Kein Block vorhanden → rein erklärender Antworttext, kein Fehler.
    console.debug('[circuit-actions] Kein Block in Antwort gefunden.');
    return { executed: 0, errors: [], cleanText };
  }

  // Diagnose: rohen Block-Inhalt ausgeben damit Port-IDs und Gate-Typen
  // des Modells im nächsten Verifikationsdurchlauf sichtbar sind.
  console.group('[circuit-actions] Block empfangen');
  console.debug('version:', block.version);
  console.debug('actions (%d):', block.actions.length, block.actions);
  console.groupEnd();

  // ref → gateId Mapping: gilt nur innerhalb dieses Blocks.
  const refMap = new Map<string, string>();
  const errors: Array<{ index: number; message: string }> = [];
  let executed = 0;
  // Neue Gates werden nach den bereits vorhandenen platziert (B3-Fix).
  let layoutIndex = existingGateCount;

  const resolveId = (
    endpoint: { ref?: string; id?: string },
    actionIndex: number,
  ): string | null => {
    if (endpoint.ref !== undefined) {
      const resolved = refMap.get(endpoint.ref);
      if (resolved === undefined) {
        errors.push({
          index: actionIndex,
          message: `ref "${endpoint.ref}" wurde in diesem Block nicht definiert`,
        });
        return null;
      }
      return resolved;
    }
    if (endpoint.id !== undefined) {
      return endpoint.id;
    }
    errors.push({ index: actionIndex, message: 'Weder ref noch id angegeben' });
    return null;
  };

  for (let i = 0; i < block.actions.length; i++) {
    const action = block.actions[i];
    if (!action || typeof action.type !== 'string') {
      errors.push({ index: i, message: 'Befehl ohne type-Feld' });
      continue;
    }

    try {
      switch (action.type) {
        case 'ADD_GATE':
        case 'ADD_INPUT':
        case 'ADD_OUTPUT': {
          // ADD_INPUT und ADD_OUTPUT sind syntaktischer Zucker – im Store sind
          // alle Gates gleich (typeId bestimmt ob es ein Input/Output-Node ist).
          const gateType =
            action.type === 'ADD_GATE' ? action.gateType : action.nodeType;
          const gateId = generateId();
          const pos = autoPos(layoutIndex++);

          refMap.set(action.ref, gateId);
          dispatch({
            type: 'GATE_ADD',
            payload: { typeId: gateType as GateTypeId, ...pos, id: gateId },
          });
          executed++;
          break;
        }

        case 'CONNECT': {
          const fromGateId = resolveId(action.from, i);
          const toGateId = resolveId(action.to, i);
          if (fromGateId === null || toGateId === null) break;

          dispatch({
            type: 'WIRE_ADD',
            payload: {
              from: { gateId: fromGateId, portId: action.from.port },
              to:   { gateId: toGateId,   portId: action.to.port   },
            },
          });
          executed++;
          break;
        }

        case 'SET_LABEL': {
          const gateId = resolveId(action, i);
          if (gateId === null) break;

          dispatch({
            type: 'GATE_SET_LABEL',
            payload: { gateId, label: action.label },
          });
          executed++;
          break;
        }

        case 'DELETE_NODE': {
          dispatch({
            type: 'GATE_DELETE',
            payload: { gateId: action.id },
          });
          executed++;
          break;
        }

        case 'CLEAR': {
          dispatch({ type: 'CIRCUIT_RESET' });
          // Nach CLEAR ist der Canvas leer → Layout-Index zurücksetzen (B3-Fix).
          layoutIndex = 0;
          executed++;
          break;
        }

        default: {
          errors.push({
            index: i,
            message: `Unbekannter Befehlstyp: "${(action as { type: string }).type}"`,
          });
        }
      }
    } catch (err) {
      errors.push({ index: i, message: `Laufzeitfehler: ${String(err)}` });
    }
  }

  if (errors.length > 0) {
    console.group(`[circuit-actions] ${errors.length} Fehler bei der Ausführung`);
    errors.forEach(({ index, message }) => {
      console.warn(`  [${index}]`, message, '→ action:', block.actions[index]);
    });
    console.groupEnd();
  }

  console.debug(
    `[circuit-actions] Ergebnis: ${executed} ausgeführt, ${errors.length} Fehler`,
  );

  return { executed, errors, cleanText };
}

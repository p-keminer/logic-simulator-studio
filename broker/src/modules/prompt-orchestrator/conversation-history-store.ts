import { assertPositiveInteger } from '../../shared/store-limits.js';
import type { ConversationTurn } from './prompt-types.js';

export interface ConversationHistoryRecord {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly turns: ConversationTurn[];
}

export interface ConversationResetResult {
  readonly clearedConversationIds: string[];
  readonly clearedTurns: number;
}

export interface ConversationHistoryStore {
  get(
    sessionId: string,
    conversationId: string,
  ): Promise<ConversationHistoryRecord | null>;
  appendTurns(
    sessionId: string,
    conversationId: string,
    turns: ConversationTurn[],
  ): Promise<ConversationHistoryRecord>;
  reset(
    sessionId: string,
    conversationId?: string,
  ): Promise<ConversationResetResult>;
}

export interface ConversationHistoryStoreClock {
  now(): Date;
}

const KEY_SEPARATOR = '\u0000';

const createStoreKey = (sessionId: string, conversationId: string) =>
  `${sessionId}${KEY_SEPARATOR}${conversationId}`;

const cloneTurn = (turn: ConversationTurn): ConversationTurn => ({
  role: turn.role,
  content: turn.content,
  createdAt: turn.createdAt,
});

const cloneRecord = (
  record: ConversationHistoryRecord,
): ConversationHistoryRecord => ({
  sessionId: record.sessionId,
  conversationId: record.conversationId,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  turns: record.turns.map(cloneTurn),
});

export interface InMemoryConversationHistoryStoreOptions {
  clock?: ConversationHistoryStoreClock;
  maxRecords?: number;
  maxStoredBytesPerConversation?: number;
  maxStoredTurnsPerConversation?: number;
  idleTtlMs?: number;
}

export const DEFAULT_MAX_STORED_TURNS = 32;
export const DEFAULT_MAX_STORED_BYTES_PER_CONVERSATION = 256 * 1_024;
export const DEFAULT_MAX_CONVERSATION_RECORDS = 256;
export const DEFAULT_CONVERSATION_IDLE_TTL_MS = 60 * 60 * 1_000;

const truncateUtf8Prefix = (value: string, maxBytes: number): string => {
  const retained: string[] = [];
  let retainedBytes = 0;

  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, 'utf8');

    if (retainedBytes + characterBytes > maxBytes) {
      break;
    }

    retained.push(character);
    retainedBytes += characterBytes;
  }

  return retained.join('');
};

const capTurnsByContentBytes = (
  turns: ConversationTurn[],
  maxBytes: number,
): ConversationTurn[] => {
  const retained: ConversationTurn[] = [];
  let remainingBytes = maxBytes;

  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]!;
    const content = truncateUtf8Prefix(turn.content, remainingBytes);

    if (turn.content.length > 0 && content.length === 0) {
      break;
    }

    retained.unshift({ ...turn, content });
    remainingBytes -= Buffer.byteLength(content, 'utf8');

    if (content.length < turn.content.length || remainingBytes === 0) {
      break;
    }
  }

  return retained;
};

export class InMemoryConversationHistoryStore
  implements ConversationHistoryStore
{
  private readonly records = new Map<string, ConversationHistoryRecord>();
  private readonly touchedAtMs = new Map<string, number>();
  private readonly touchOrder = new Map<string, number>();
  private nextTouchOrder = 0;
  private readonly clock: ConversationHistoryStoreClock;
  private readonly maxRecords: number;
  private readonly maxStoredBytesPerConversation: number;
  private readonly maxStoredTurnsPerConversation: number;
  private readonly idleTtlMs: number;

  constructor(options: InMemoryConversationHistoryStoreOptions = {}) {
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxRecords = assertPositiveInteger(
      'maxRecords',
      options.maxRecords ?? DEFAULT_MAX_CONVERSATION_RECORDS,
    );
    this.maxStoredTurnsPerConversation = assertPositiveInteger(
      'maxStoredTurnsPerConversation',
      options.maxStoredTurnsPerConversation ?? DEFAULT_MAX_STORED_TURNS,
    );
    this.maxStoredBytesPerConversation = assertPositiveInteger(
      'maxStoredBytesPerConversation',
      options.maxStoredBytesPerConversation ??
        DEFAULT_MAX_STORED_BYTES_PER_CONVERSATION,
    );
    this.idleTtlMs = assertPositiveInteger(
      'idleTtlMs',
      options.idleTtlMs ?? DEFAULT_CONVERSATION_IDLE_TTL_MS,
    );
  }

  private deleteRecord(key: string): void {
    this.records.delete(key);
    this.touchedAtMs.delete(key);
    this.touchOrder.delete(key);
  }

  private touch(key: string, nowMs: number): void {
    this.nextTouchOrder += 1;
    this.touchedAtMs.set(key, nowMs);
    this.touchOrder.set(key, this.nextTouchOrder);
  }

  private cleanUpExpired(nowMs: number): void {
    for (const [key, touchedAtMs] of this.touchedAtMs) {
      if (touchedAtMs + this.idleTtlMs <= nowMs) {
        this.deleteRecord(key);
      }
    }
  }

  private enforceCapacity(): void {
    while (this.records.size > this.maxRecords) {
      const candidate = [...this.records.keys()].sort((left, right) => {
        const leftTouchedAt =
          this.touchedAtMs.get(left) ?? Number.NEGATIVE_INFINITY;
        const rightTouchedAt =
          this.touchedAtMs.get(right) ?? Number.NEGATIVE_INFINITY;
        const leftOrder =
          this.touchOrder.get(left) ?? Number.NEGATIVE_INFINITY;
        const rightOrder =
          this.touchOrder.get(right) ?? Number.NEGATIVE_INFINITY;

        return (
          leftTouchedAt - rightTouchedAt ||
          leftOrder - rightOrder ||
          left.localeCompare(right)
        );
      })[0];

      if (!candidate) {
        return;
      }

      this.deleteRecord(candidate);
    }
  }

  async get(
    sessionId: string,
    conversationId: string,
  ): Promise<ConversationHistoryRecord | null> {
    const nowMs = this.clock.now().getTime();
    this.cleanUpExpired(nowMs);
    const key = createStoreKey(sessionId, conversationId);
    const record = this.records.get(key);

    if (!record) {
      return null;
    }

    this.touch(key, nowMs);
    return cloneRecord(record);
  }

  async appendTurns(
    sessionId: string,
    conversationId: string,
    turns: ConversationTurn[],
  ): Promise<ConversationHistoryRecord> {
    const nowMs = this.clock.now().getTime();
    this.cleanUpExpired(nowMs);
    const key = createStoreKey(sessionId, conversationId);
    const existing = this.records.get(key);
    const appendedTurns = turns.map(cloneTurn);
    const mergedTurns = existing
      ? [...existing.turns.map(cloneTurn), ...appendedTurns]
      : appendedTurns;
    const turnCapped =
      mergedTurns.length > this.maxStoredTurnsPerConversation
        ? mergedTurns.slice(-this.maxStoredTurnsPerConversation)
        : mergedTurns;
    const cappedTurns = capTurnsByContentBytes(
      turnCapped,
      this.maxStoredBytesPerConversation,
    );

    const nextRecord: ConversationHistoryRecord = existing
      ? {
          ...existing,
          updatedAt: appendedTurns.at(-1)?.createdAt ?? existing.updatedAt,
          turns: cappedTurns,
        }
      : {
          sessionId,
          conversationId,
          createdAt: appendedTurns[0]?.createdAt ?? new Date(0).toISOString(),
          updatedAt:
            appendedTurns.at(-1)?.createdAt ??
            appendedTurns[0]?.createdAt ??
            new Date(0).toISOString(),
          turns: cappedTurns,
        };

    this.records.set(key, nextRecord);
    this.touch(key, nowMs);
    this.enforceCapacity();

    return cloneRecord(nextRecord);
  }

  async reset(
    sessionId: string,
    conversationId?: string,
  ): Promise<ConversationResetResult> {
    this.cleanUpExpired(this.clock.now().getTime());

    if (conversationId) {
      const key = createStoreKey(sessionId, conversationId);
      const existing = this.records.get(key);

      this.deleteRecord(key);

      return {
        clearedConversationIds: existing ? [conversationId] : [],
        clearedTurns: existing?.turns.length ?? 0,
      };
    }

    const clearedConversationIds: string[] = [];
    let clearedTurns = 0;

    for (const [key, record] of this.records) {
      if (record.sessionId !== sessionId) {
        continue;
      }

      this.deleteRecord(key);
      clearedConversationIds.push(record.conversationId);
      clearedTurns += record.turns.length;
    }

    return {
      clearedConversationIds,
      clearedTurns,
    };
  }
}

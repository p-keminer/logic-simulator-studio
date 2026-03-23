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

export class InMemoryConversationHistoryStore
  implements ConversationHistoryStore
{
  private readonly records = new Map<string, ConversationHistoryRecord>();

  async get(
    sessionId: string,
    conversationId: string,
  ): Promise<ConversationHistoryRecord | null> {
    const record = this.records.get(createStoreKey(sessionId, conversationId));

    return record ? cloneRecord(record) : null;
  }

  async appendTurns(
    sessionId: string,
    conversationId: string,
    turns: ConversationTurn[],
  ): Promise<ConversationHistoryRecord> {
    const key = createStoreKey(sessionId, conversationId);
    const existing = this.records.get(key);
    const appendedTurns = turns.map(cloneTurn);
    const nextRecord: ConversationHistoryRecord = existing
      ? {
          ...existing,
          updatedAt:
            appendedTurns.at(-1)?.createdAt ?? existing.updatedAt,
          turns: [...existing.turns.map(cloneTurn), ...appendedTurns],
        }
      : {
          sessionId,
          conversationId,
          createdAt: appendedTurns[0]?.createdAt ?? new Date(0).toISOString(),
          updatedAt:
            appendedTurns.at(-1)?.createdAt ??
            appendedTurns[0]?.createdAt ??
            new Date(0).toISOString(),
          turns: appendedTurns,
        };

    this.records.set(key, nextRecord);

    return cloneRecord(nextRecord);
  }

  async reset(
    sessionId: string,
    conversationId?: string,
  ): Promise<ConversationResetResult> {
    if (conversationId) {
      const key = createStoreKey(sessionId, conversationId);
      const existing = this.records.get(key);

      this.records.delete(key);

      return {
        clearedConversationIds: existing ? [conversationId] : [],
        clearedTurns: existing?.turns.length ?? 0,
      };
    }

    const clearedConversationIds: string[] = [];
    let clearedTurns = 0;

    for (const [key, record] of this.records.entries()) {
      if (record.sessionId !== sessionId) {
        continue;
      }

      this.records.delete(key);
      clearedConversationIds.push(record.conversationId);
      clearedTurns += record.turns.length;
    }

    return {
      clearedConversationIds,
      clearedTurns,
    };
  }
}

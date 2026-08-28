import { assertPositiveInteger } from '../../shared/store-limits.js';

export type SessionId = string;
export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface SessionStoreClock {
  now(): Date;
}

export interface SessionRecord {
  readonly sessionId: SessionId;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly expiredAt?: string;
  readonly revokedAt?: string;
  readonly keyReferenceId?: string;
  readonly status: SessionStatus;
}

export interface SessionStore {
  get(sessionId: SessionId): Promise<SessionRecord | null>;
  put(record: SessionRecord): Promise<void>;
  delete(sessionId: SessionId): Promise<void>;
  listActive(): Promise<SessionRecord[]>;
}

export type SessionEvictionReason = 'capacity' | 'retention';

export type SessionEvictionListener = (
  record: SessionRecord,
  reason: SessionEvictionReason,
) => void | Promise<void>;

export interface SessionEvictionSource {
  addEvictionListener(listener: SessionEvictionListener): void;
}

export interface InMemorySessionStoreOptions {
  clock?: SessionStoreClock;
  maxRecords?: number;
  inactiveRetentionMs?: number;
}

export const DEFAULT_MAX_SESSION_RECORDS = 1_024;
export const DEFAULT_INACTIVE_SESSION_RETENTION_MS = 60 * 60 * 1_000;

const parseTimestamp = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : fallback;
};

export class InMemorySessionStore
  implements SessionStore, SessionEvictionSource
{
  private readonly sessions = new Map<SessionId, SessionRecord>();
  private readonly insertedOrder = new Map<SessionId, number>();
  private nextInsertedOrder = 0;
  private readonly clock: SessionStoreClock;
  private readonly maxRecords: number;
  private readonly inactiveRetentionMs: number;
  private readonly evictionListeners = new Set<SessionEvictionListener>();

  constructor(options: InMemorySessionStoreOptions = {}) {
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxRecords = assertPositiveInteger(
      'maxRecords',
      options.maxRecords ?? DEFAULT_MAX_SESSION_RECORDS,
    );
    this.inactiveRetentionMs = assertPositiveInteger(
      'inactiveRetentionMs',
      options.inactiveRetentionMs ?? DEFAULT_INACTIVE_SESSION_RETENTION_MS,
    );
  }

  addEvictionListener(listener: SessionEvictionListener): void {
    this.evictionListeners.add(listener);
  }

  private materializeRecord(
    record: SessionRecord,
    nowMs: number,
  ): SessionRecord {
    if (record.status !== 'active') {
      return record;
    }

    if (parseTimestamp(record.expiresAt, Number.POSITIVE_INFINITY) > nowMs) {
      return record;
    }

    return {
      ...record,
      status: 'expired',
      expiredAt: record.expiredAt ?? new Date(nowMs).toISOString(),
    };
  }

  private async notifyEviction(
    record: SessionRecord,
    reason: SessionEvictionReason,
  ): Promise<void> {
    for (const listener of this.evictionListeners) {
      await listener(record, reason);
    }
  }

  private terminalTimestamp(record: SessionRecord): number {
    return record.status === 'revoked'
      ? parseTimestamp(record.revokedAt, Number.POSITIVE_INFINITY)
      : parseTimestamp(record.expiredAt, Number.POSITIVE_INFINITY);
  }

  private async cleanUp(nowMs: number): Promise<void> {
    const retainedAfterMs = nowMs - this.inactiveRetentionMs;

    for (const [sessionId, storedRecord] of this.sessions) {
      const record = this.materializeRecord(storedRecord, nowMs);
      this.sessions.set(sessionId, record);

      if (
        record.status !== 'active' &&
        this.terminalTimestamp(record) <= retainedAfterMs
      ) {
        this.sessions.delete(sessionId);
        this.insertedOrder.delete(sessionId);
        await this.notifyEviction(record, 'retention');
      }
    }
  }

  private evictionOrder(
    record: SessionRecord,
  ): readonly [number, number, number, string] {
    const inactivePriority = record.status === 'active' ? 1 : 0;
    const timestamp =
      record.status === 'active'
        ? parseTimestamp(
            record.expiresAt,
            parseTimestamp(record.createdAt, Number.POSITIVE_INFINITY),
          )
        : this.terminalTimestamp(record);

    return [
      inactivePriority,
      timestamp,
      this.insertedOrder.get(record.sessionId) ?? Number.POSITIVE_INFINITY,
      record.sessionId,
    ];
  }

  private async enforceCapacity(): Promise<void> {
    while (this.sessions.size > this.maxRecords) {
      const candidate = [...this.sessions.values()].sort((left, right) => {
        const leftOrder = this.evictionOrder(left);
        const rightOrder = this.evictionOrder(right);

        return (
          leftOrder[0] - rightOrder[0] ||
          leftOrder[1] - rightOrder[1] ||
          leftOrder[2] - rightOrder[2] ||
          leftOrder[3].localeCompare(rightOrder[3])
        );
      })[0];

      if (!candidate) {
        return;
      }

      this.sessions.delete(candidate.sessionId);
      this.insertedOrder.delete(candidate.sessionId);
      await this.notifyEviction(candidate, 'capacity');
    }
  }

  async get(sessionId: SessionId): Promise<SessionRecord | null> {
    const nowMs = this.clock.now().getTime();
    await this.cleanUp(nowMs);

    return this.sessions.get(sessionId) ?? null;
  }

  async put(record: SessionRecord): Promise<void> {
    const nowMs = this.clock.now().getTime();
    await this.cleanUp(nowMs);
    if (!this.sessions.has(record.sessionId)) {
      this.nextInsertedOrder += 1;
      this.insertedOrder.set(record.sessionId, this.nextInsertedOrder);
    }
    this.sessions.set(record.sessionId, this.materializeRecord(record, nowMs));
    await this.enforceCapacity();
  }

  async delete(sessionId: SessionId): Promise<void> {
    await this.cleanUp(this.clock.now().getTime());
    this.sessions.delete(sessionId);
    this.insertedOrder.delete(sessionId);
  }

  async listActive(): Promise<SessionRecord[]> {
    await this.cleanUp(this.clock.now().getTime());
    return [...this.sessions.values()].filter(
      (session) => session.status === 'active',
    );
  }
}

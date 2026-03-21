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

export interface InMemorySessionStoreOptions {
  clock?: SessionStoreClock;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<SessionId, SessionRecord>();
  private readonly clock: SessionStoreClock;

  constructor(options: InMemorySessionStoreOptions = {}) {
    this.clock = options.clock ?? { now: () => new Date() };
  }

  private materializeRecord(record: SessionRecord): SessionRecord {
    if (record.status !== 'active') {
      return record;
    }

    if (Date.parse(record.expiresAt) > this.clock.now().getTime()) {
      return record;
    }

    const expiredRecord: SessionRecord = {
      ...record,
      status: 'expired',
      expiredAt: record.expiredAt ?? this.clock.now().toISOString(),
    };

    this.sessions.set(record.sessionId, expiredRecord);
    return expiredRecord;
  }

  async get(sessionId: SessionId): Promise<SessionRecord | null> {
    const record = this.sessions.get(sessionId);
    return record ? this.materializeRecord(record) : null;
  }

  async put(record: SessionRecord): Promise<void> {
    this.sessions.set(record.sessionId, this.materializeRecord(record));
  }

  async delete(sessionId: SessionId): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async listActive(): Promise<SessionRecord[]> {
    return [...this.sessions.values()]
      .map((session) => this.materializeRecord(session))
      .filter((session) => session.status === 'active');
  }
}

import { assertPositiveInteger } from '../../shared/store-limits.js';

export type KeyReferenceId = string;

export interface KeyReferenceRecord {
  readonly keyReferenceId: KeyReferenceId;
  readonly sessionId: string;
  readonly createdAt: string;
  readonly keyFingerprint: string;
  readonly keyMaterial: string;
  readonly revokedAt?: string;
}

export interface KeyReferenceStore {
  get(keyReferenceId: KeyReferenceId): Promise<KeyReferenceRecord | null>;
  put(record: KeyReferenceRecord): Promise<void>;
  revoke(
    keyReferenceId: KeyReferenceId,
    revokedAt: string,
  ): Promise<KeyReferenceRecord | null>;
  delete(keyReferenceId: KeyReferenceId): Promise<void>;
}

export interface KeyReferenceStoreClock {
  now(): Date;
}

export interface InMemoryKeyReferenceStoreOptions {
  clock?: KeyReferenceStoreClock;
  maxRecords?: number;
  revokedRetentionMs?: number;
}

export const DEFAULT_MAX_KEY_REFERENCES = 1_024;
export const DEFAULT_REVOKED_KEY_RETENTION_MS = 60 * 60 * 1_000;

export class InMemoryKeyReferenceStore implements KeyReferenceStore {
  private readonly references = new Map<KeyReferenceId, KeyReferenceRecord>();
  private readonly insertedOrder = new Map<KeyReferenceId, number>();
  private readonly revokedAtMs = new Map<KeyReferenceId, number>();
  private nextInsertedOrder = 0;
  private readonly clock: KeyReferenceStoreClock;
  private readonly maxRecords: number;
  private readonly revokedRetentionMs: number;

  constructor(options: InMemoryKeyReferenceStoreOptions = {}) {
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxRecords = assertPositiveInteger(
      'maxRecords',
      options.maxRecords ?? DEFAULT_MAX_KEY_REFERENCES,
    );
    this.revokedRetentionMs = assertPositiveInteger(
      'revokedRetentionMs',
      options.revokedRetentionMs ?? DEFAULT_REVOKED_KEY_RETENTION_MS,
    );
  }

  private cleanUp(): void {
    const retainedAfterMs = this.clock.now().getTime() - this.revokedRetentionMs;

    for (const [keyReferenceId, recordedAtMs] of this.revokedAtMs) {
      if (recordedAtMs <= retainedAfterMs) {
        this.references.delete(keyReferenceId);
        this.insertedOrder.delete(keyReferenceId);
        this.revokedAtMs.delete(keyReferenceId);
      }
    }
  }

  private enforceCapacity(): void {
    while (this.references.size > this.maxRecords) {
      const candidate = [...this.references.values()].sort((left, right) => {
        const leftRevokedPriority = left.revokedAt ? 0 : 1;
        const rightRevokedPriority = right.revokedAt ? 0 : 1;
        const leftOrder =
          this.insertedOrder.get(left.keyReferenceId) ??
          Number.POSITIVE_INFINITY;
        const rightOrder =
          this.insertedOrder.get(right.keyReferenceId) ??
          Number.POSITIVE_INFINITY;

        return (
          leftRevokedPriority - rightRevokedPriority ||
          leftOrder - rightOrder ||
          left.keyReferenceId.localeCompare(right.keyReferenceId)
        );
      })[0];

      if (!candidate) {
        return;
      }

      this.references.delete(candidate.keyReferenceId);
      this.insertedOrder.delete(candidate.keyReferenceId);
      this.revokedAtMs.delete(candidate.keyReferenceId);
    }
  }

  async get(keyReferenceId: KeyReferenceId): Promise<KeyReferenceRecord | null> {
    this.cleanUp();
    return this.references.get(keyReferenceId) ?? null;
  }

  async put(record: KeyReferenceRecord): Promise<void> {
    this.cleanUp();
    if (!this.references.has(record.keyReferenceId)) {
      this.nextInsertedOrder += 1;
      this.insertedOrder.set(record.keyReferenceId, this.nextInsertedOrder);
    }
    this.references.set(record.keyReferenceId, { ...record });
    if (record.revokedAt) {
      this.revokedAtMs.set(
        record.keyReferenceId,
        this.clock.now().getTime(),
      );
    } else {
      this.revokedAtMs.delete(record.keyReferenceId);
    }
    this.enforceCapacity();
  }

  async revoke(
    keyReferenceId: KeyReferenceId,
    revokedAt: string,
  ): Promise<KeyReferenceRecord | null> {
    this.cleanUp();
    const existing = this.references.get(keyReferenceId);

    if (!existing) {
      return null;
    }

    const revokedRecord: KeyReferenceRecord = {
      ...existing,
      keyMaterial: '[REDACTED]',
      revokedAt,
    };

    this.references.set(keyReferenceId, revokedRecord);
    this.revokedAtMs.set(keyReferenceId, this.clock.now().getTime());
    return revokedRecord;
  }

  async delete(keyReferenceId: KeyReferenceId): Promise<void> {
    this.cleanUp();
    this.references.delete(keyReferenceId);
    this.insertedOrder.delete(keyReferenceId);
    this.revokedAtMs.delete(keyReferenceId);
  }
}

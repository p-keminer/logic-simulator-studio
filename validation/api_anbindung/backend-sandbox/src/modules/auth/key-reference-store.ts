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

export class InMemoryKeyReferenceStore implements KeyReferenceStore {
  private readonly references = new Map<KeyReferenceId, KeyReferenceRecord>();

  async get(keyReferenceId: KeyReferenceId): Promise<KeyReferenceRecord | null> {
    return this.references.get(keyReferenceId) ?? null;
  }

  async put(record: KeyReferenceRecord): Promise<void> {
    this.references.set(record.keyReferenceId, record);
  }

  async revoke(
    keyReferenceId: KeyReferenceId,
    revokedAt: string,
  ): Promise<KeyReferenceRecord | null> {
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
    return revokedRecord;
  }

  async delete(keyReferenceId: KeyReferenceId): Promise<void> {
    this.references.delete(keyReferenceId);
  }
}

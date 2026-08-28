import { createHash, randomUUID } from 'node:crypto';
import { createSandboxError } from '../../shared/errors.js';
import type { KeyReferenceStore } from './key-reference-store.js';
import type {
  SessionId,
  SessionEvictionSource,
  SessionRecord,
  SessionStore,
  SessionStoreClock,
} from './session-store.js';

export interface SessionKeyRegistration {
  readonly sessionId: SessionId;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly status: 'active';
}

export interface SessionKeyDeletion {
  readonly deleted: true;
  readonly sessionId: SessionId;
  readonly deletedAt: string;
}

export interface ResolvedSessionKey {
  readonly sessionId: SessionId;
  readonly keyReferenceId: string;
  readonly apiKey: string;
  readonly expiresAt: string;
}

export interface SessionServiceOptions {
  ttlSeconds?: number;
  clock?: SessionStoreClock;
  sessionIdFactory?: () => SessionId;
  keyReferenceIdFactory?: () => string;
  expiryScheduler?: SessionExpiryScheduler;
}

export interface SessionService {
  registerSessionKey(apiKey: string): Promise<SessionKeyRegistration>;
  deleteSessionKey(sessionId: SessionId): Promise<SessionKeyDeletion>;
  resetSession(sessionId: SessionId): Promise<void>;
  assertActiveSession(sessionId: SessionId): Promise<SessionRecord>;
  resolveActiveSessionKey(sessionId: SessionId): Promise<ResolvedSessionKey>;
}

export interface SessionExpiryScheduler {
  schedule(
    sessionId: SessionId,
    delayMs: number,
    task: () => Promise<void>,
  ): void;
  cancel(sessionId: SessionId): void;
}

class TimeoutSessionExpiryScheduler implements SessionExpiryScheduler {
  private readonly timers = new Map<SessionId, ReturnType<typeof setTimeout>>();

  schedule(
    sessionId: SessionId,
    delayMs: number,
    task: () => Promise<void>,
  ): void {
    this.cancel(sessionId);

    const timeout = setTimeout(() => {
      this.timers.delete(sessionId);
      void task();
    }, Math.max(0, delayMs));

    this.timers.set(sessionId, timeout);
  }

  cancel(sessionId: SessionId): void {
    const existing = this.timers.get(sessionId);

    if (!existing) {
      return;
    }

    clearTimeout(existing);
    this.timers.delete(sessionId);
  }
}

const supportsEvictionListeners = (
  store: SessionStore,
): store is SessionStore & SessionEvictionSource =>
  'addEvictionListener' in store &&
  typeof store.addEvictionListener === 'function';

export class DefaultSessionService implements SessionService {
  private readonly ttlSeconds: number;
  private readonly clock: SessionStoreClock;
  private readonly sessionIdFactory: () => SessionId;
  private readonly keyReferenceIdFactory: () => string;
  private readonly expiryScheduler: SessionExpiryScheduler;

  constructor(
    private readonly sessionStore: SessionStore,
    private readonly keyReferenceStore: KeyReferenceStore,
    options: SessionServiceOptions = {},
  ) {
    this.ttlSeconds = options.ttlSeconds ?? 900;
    this.clock = options.clock ?? { now: () => new Date() };
    this.sessionIdFactory = options.sessionIdFactory ?? randomUUID;
    this.keyReferenceIdFactory = options.keyReferenceIdFactory ?? randomUUID;
    this.expiryScheduler =
      options.expiryScheduler ?? new TimeoutSessionExpiryScheduler();

    if (supportsEvictionListeners(this.sessionStore)) {
      this.sessionStore.addEvictionListener(async (session) => {
        this.expiryScheduler.cancel(session.sessionId);

        if (session.keyReferenceId) {
          await this.keyReferenceStore.revoke(
            session.keyReferenceId,
            session.revokedAt ?? session.expiredAt ?? this.now().toISOString(),
          );
        }
      });
    }
  }

  private now(): Date {
    return this.clock.now();
  }

  private createExpiresAt(issuedAt: Date): string {
    return new Date(issuedAt.getTime() + this.ttlSeconds * 1000).toISOString();
  }

  private createKeyFingerprint(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
  }

  private scheduleExpiry(session: SessionRecord): void {
    const delayMs = Date.parse(session.expiresAt) - this.now().getTime();

    this.expiryScheduler.schedule(session.sessionId, delayMs, async () => {
      const current = await this.sessionStore.get(session.sessionId);

      if (!current || current.status === 'revoked') {
        return;
      }

      await this.expireSession(
        current,
        current.expiredAt ?? current.expiresAt,
      );
    });
  }

  private async loadSessionOrThrow(sessionId: SessionId): Promise<SessionRecord> {
    const session = await this.sessionStore.get(sessionId);

    if (!session) {
      throw createSandboxError('NOT_FOUND', 'Session was not found.', 404);
    }

    return session;
  }

  private async expireSession(
    session: SessionRecord,
    expiredAt: string,
  ): Promise<SessionRecord> {
    this.expiryScheduler.cancel(session.sessionId);

    if (session.keyReferenceId) {
      await this.keyReferenceStore.revoke(session.keyReferenceId, expiredAt);
    }

    const expiredSession: SessionRecord = {
      ...session,
      status: 'expired',
      expiredAt,
    };

    await this.sessionStore.put(expiredSession);
    return expiredSession;
  }

  async registerSessionKey(apiKey: string): Promise<SessionKeyRegistration> {
    const trimmedApiKey = apiKey.trim();

    if (trimmedApiKey.length === 0) {
      throw createSandboxError(
        'BAD_REQUEST',
        'API key must not be empty.',
        400,
      );
    }

    const issuedAtDate = this.now();
    const issuedAt = issuedAtDate.toISOString();
    const sessionId = this.sessionIdFactory();
    const keyReferenceId = this.keyReferenceIdFactory();
    const session: SessionRecord = {
      sessionId,
      createdAt: issuedAt,
      expiresAt: this.createExpiresAt(issuedAtDate),
      keyReferenceId,
      status: 'active',
    };

    await this.keyReferenceStore.put({
      keyReferenceId,
      sessionId,
      createdAt: issuedAt,
      keyFingerprint: this.createKeyFingerprint(trimmedApiKey),
      keyMaterial: trimmedApiKey,
    });
    this.scheduleExpiry(session);

    try {
      await this.sessionStore.put(session);
    } catch (error) {
      this.expiryScheduler.cancel(sessionId);
      await this.keyReferenceStore.revoke(
        keyReferenceId,
        this.now().toISOString(),
      );
      throw error;
    }

    return {
      sessionId,
      issuedAt,
      expiresAt: session.expiresAt,
      status: 'active',
    };
  }

  async deleteSessionKey(sessionId: SessionId): Promise<SessionKeyDeletion> {
    const session = await this.loadSessionOrThrow(sessionId);
    const deletedAt = this.now().toISOString();

    this.expiryScheduler.cancel(sessionId);

    if (session.status === 'revoked') {
      return {
        deleted: true,
        sessionId,
        deletedAt: session.revokedAt ?? deletedAt,
      };
    }

    if (session.keyReferenceId) {
      await this.keyReferenceStore.revoke(session.keyReferenceId, deletedAt);
    }

    await this.sessionStore.put({
      ...session,
      status: 'revoked',
      revokedAt: deletedAt,
    });

    return {
      deleted: true,
      sessionId,
      deletedAt,
    };
  }

  async resetSession(sessionId: SessionId): Promise<void> {
    await this.deleteSessionKey(sessionId);
  }

  async assertActiveSession(sessionId: SessionId): Promise<SessionRecord> {
    const session = await this.loadSessionOrThrow(sessionId);

    if (session.status === 'revoked') {
      throw createSandboxError(
        'UNAUTHORIZED',
        'Session is no longer active.',
        401,
      );
    }

    const nowIso = this.now().toISOString();
    const isExpired = Date.parse(session.expiresAt) <= Date.parse(nowIso);

    if (session.status === 'expired' || isExpired) {
      await this.expireSession(session, nowIso);
      throw createSandboxError('UNAUTHORIZED', 'Session has expired.', 401);
    }

    return session;
  }

  async resolveActiveSessionKey(
    sessionId: SessionId,
  ): Promise<ResolvedSessionKey> {
    const session = await this.assertActiveSession(sessionId);

    if (!session.keyReferenceId) {
      throw createSandboxError(
        'UNAUTHORIZED',
        'No API key is registered for this session.',
        401,
      );
    }

    const keyReference = await this.keyReferenceStore.get(session.keyReferenceId);

    if (
      !keyReference ||
      keyReference.revokedAt ||
      keyReference.keyMaterial === '[REDACTED]'
    ) {
      throw createSandboxError(
        'UNAUTHORIZED',
        'Session key material is no longer available.',
        401,
      );
    }

    return {
      sessionId: session.sessionId,
      keyReferenceId: keyReference.keyReferenceId,
      apiKey: keyReference.keyMaterial,
      expiresAt: session.expiresAt,
    };
  }
}

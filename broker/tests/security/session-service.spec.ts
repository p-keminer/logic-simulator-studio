import { describe, expect, it } from 'vitest';
import {
  InMemoryKeyReferenceStore,
} from '../../src/modules/auth/key-reference-store';
import {
  DefaultSessionService,
  type SessionExpiryScheduler,
} from '../../src/modules/auth/session-service';
import {
  InMemorySessionStore,
  type SessionStoreClock,
} from '../../src/modules/auth/session-store';

const createClockHarness = () => {
  let current = new Date('2026-03-21T00:00:00.000Z');

  const clock: SessionStoreClock = {
    now: () => new Date(current),
  };

  return {
    advanceMs: (value: number) => {
      current = new Date(current.getTime() + value);
    },
    clock,
  };
};

const createManualExpiryScheduler = (clock: SessionStoreClock) => {
  const tasks = new Map<
    string,
    {
      runAtMs: number;
      task: () => Promise<void>;
    }
  >();

  const scheduler: SessionExpiryScheduler = {
    cancel: (sessionId) => {
      tasks.delete(sessionId);
    },
    schedule: (sessionId, delayMs, task) => {
      tasks.set(sessionId, {
        runAtMs: clock.now().getTime() + Math.max(0, delayMs),
        task,
      });
    },
  };

  return {
    async runDueTasks() {
      const nowMs = clock.now().getTime();
      const dueTasks = [...tasks.entries()]
        .filter(([, value]) => value.runAtMs <= nowMs)
        .sort((left, right) => left[1].runAtMs - right[1].runAtMs);

      for (const [sessionId, value] of dueTasks) {
        tasks.delete(sessionId);
        await value.task();
      }
    },
    scheduler,
  };
};

const createSessionHarness = () => {
  const clockHarness = createClockHarness();
  const expiryScheduler = createManualExpiryScheduler(clockHarness.clock);
  const sessionStore = new InMemorySessionStore({
    clock: clockHarness.clock,
  });
  const keyReferenceStore = new InMemoryKeyReferenceStore();
  const sessionService = new DefaultSessionService(
    sessionStore,
    keyReferenceStore,
    {
      clock: clockHarness.clock,
      expiryScheduler: expiryScheduler.scheduler,
      ttlSeconds: 5 * 60,
    },
  );

  return {
    advanceMs: clockHarness.advanceMs,
    keyReferenceStore,
    runDueExpiryTasks: expiryScheduler.runDueTasks,
    sessionService,
    sessionStore,
  };
};

describe('session service security flow', () => {
  it('keeps the public registration result free of the raw key while resolving it internally', async () => {
    const harness = createSessionHarness();
    const rawKey = 'sk-session-1234567890abcdef';
    const registration = await harness.sessionService.registerSessionKey(rawKey);

    expect(registration.status).toBe('active');
    expect(registration.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect('sessionKey' in registration).toBe(false);

    const resolved = await harness.sessionService.resolveActiveSessionKey(
      registration.sessionId,
    );

    expect(resolved.apiKey).toBe(rawKey);
  });

  it('keeps the stored key internal to its session record', async () => {
    const harness = createSessionHarness();
    const registration = await harness.sessionService.registerSessionKey(
      'sk-session-first-1234567890',
    );
    const storedSession = await harness.sessionStore.get(registration.sessionId);
    const resolved = await harness.sessionService.resolveActiveSessionKey(
      registration.sessionId,
    );
    const storedReference = storedSession?.keyReferenceId
      ? await harness.keyReferenceStore.get(storedSession.keyReferenceId)
      : null;

    expect(storedReference?.keyMaterial).toBe('sk-session-first-1234567890');
    expect(resolved.keyReferenceId).toBe(storedSession?.keyReferenceId);
    expect('apiKey' in registration).toBe(false);
  });

  it('expires sessions and internal keys after the configured ttl', async () => {
    const harness = createSessionHarness();
    const registration = await harness.sessionService.registerSessionKey(
      'sk-session-expiring-1234567',
    );

    harness.advanceMs(5 * 60 * 1000 + 1);

    await expect(
      harness.sessionService.resolveActiveSessionKey(registration.sessionId),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });

    const expiredSession = await harness.sessionStore.get(registration.sessionId);

    expect(expiredSession?.status).toBe('expired');
  });

  it('redacts abandoned key material when the ttl elapses without a follow-up read', async () => {
    const harness = createSessionHarness();
    const registration = await harness.sessionService.registerSessionKey(
      'sk-session-abandoned-123456',
    );
    const storedSession = await harness.sessionStore.get(registration.sessionId);

    harness.advanceMs(5 * 60 * 1000 + 1);
    await harness.runDueExpiryTasks();

    const expiredSession = await harness.sessionStore.get(registration.sessionId);
    const revokedReference = storedSession?.keyReferenceId
      ? await harness.keyReferenceStore.get(storedSession.keyReferenceId)
      : null;

    expect(expiredSession?.status).toBe('expired');
    expect(revokedReference?.keyMaterial).toBe('[REDACTED]');
    expect(revokedReference?.revokedAt).toBe(expiredSession?.expiredAt);
  });

  it('revokes the session and key reference on deletion', async () => {
    const harness = createSessionHarness();
    const registration = await harness.sessionService.registerSessionKey(
      'sk-session-delete-1234567890',
    );
    const resolution = await harness.sessionService.resolveActiveSessionKey(
      registration.sessionId,
    );

    const deletion = await harness.sessionService.deleteSessionKey(
      registration.sessionId,
    );
    const revokedSession = await harness.sessionStore.get(registration.sessionId);
    const revokedReference = await harness.keyReferenceStore.get(
      resolution.keyReferenceId,
    );

    expect(deletion.deleted).toBe(true);
    expect(revokedSession?.status).toBe('revoked');
    expect(revokedReference?.revokedAt).toBeDefined();
    expect(revokedReference?.keyMaterial).toBe('[REDACTED]');

    await expect(
      harness.sessionService.resolveActiveSessionKey(registration.sessionId),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

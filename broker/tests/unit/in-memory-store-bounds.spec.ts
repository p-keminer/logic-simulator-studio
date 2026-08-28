import { describe, expect, it } from 'vitest';
import { InMemoryAuditSink } from '../../src/modules/audit-and-observability/audit-events';
import { InMemoryMetricsSink } from '../../src/modules/audit-and-observability/metrics';
import { InMemoryKeyReferenceStore } from '../../src/modules/auth/key-reference-store';
import {
  DefaultSessionService,
  type SessionExpiryScheduler,
} from '../../src/modules/auth/session-service';
import {
  InMemorySessionStore,
  type SessionRecord,
} from '../../src/modules/auth/session-store';
import { InMemoryRateLimitStore } from '../../src/modules/policy-guardrails/rate-limit-store';
import { InMemoryConversationHistoryStore } from '../../src/modules/prompt-orchestrator/conversation-history-store';
import { loadConfig } from '../../src/shared/config';

const createClock = () => {
  let nowMs = Date.parse('2026-03-21T00:00:00.000Z');

  return {
    advanceMs(value: number) {
      nowMs += value;
    },
    clock: {
      now: () => new Date(nowMs),
    },
    now: () => new Date(nowMs),
  };
};

const createSessionRecord = (
  sessionId: string,
  expiresAt: Date,
): SessionRecord => ({
  sessionId,
  createdAt: '2026-03-21T00:00:00.000Z',
  expiresAt: expiresAt.toISOString(),
  keyReferenceId: `key-${sessionId}`,
  status: 'active',
});

const createTurn = (index: number) => ({
  role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
  content: `Turn ${index}`,
  createdAt: `2026-03-21T00:00:${index.toString().padStart(2, '0')}.000Z`,
});

describe('bounded in-memory broker stores', () => {
  it('cleans expired rate-limit buckets and evicts the earliest reset deterministically', async () => {
    const harness = createClock();
    const store = new InMemoryRateLimitStore({
      clock: harness.clock,
      maxBuckets: 2,
    });

    const shortWindow = {
      burst: 0,
      maxRequests: 2,
      name: 'short',
      windowMs: 1_000,
    };

    expect((await store.take('alpha', shortWindow)).count).toBe(1);
    expect((await store.take('alpha', shortWindow)).count).toBe(2);

    harness.advanceMs(100);
    await store.take('beta', { ...shortWindow, windowMs: 2_000 });
    harness.advanceMs(100);
    await store.take('gamma', { ...shortWindow, windowMs: 3_000 });

    expect((await store.take('alpha', shortWindow)).count).toBe(1);

    harness.advanceMs(1_000);
    expect((await store.take('alpha', shortWindow)).count).toBe(1);
  });

  it('caps session records, retains terminal state briefly, and reports evictions', async () => {
    const harness = createClock();
    const store = new InMemorySessionStore({
      clock: harness.clock,
      inactiveRetentionMs: 1_000,
      maxRecords: 2,
    });
    const evictions: Array<{ id: string; reason: string }> = [];
    store.addEvictionListener((record, reason) => {
      evictions.push({ id: record.sessionId, reason });
    });

    await store.put(
      createSessionRecord('session-a', new Date(harness.now().getTime() + 500)),
    );
    await store.put(
      createSessionRecord('session-b', new Date(harness.now().getTime() + 2_000)),
    );
    await store.put(
      createSessionRecord('session-c', new Date(harness.now().getTime() + 3_000)),
    );

    expect(await store.get('session-a')).toBeNull();
    expect(evictions).toContainEqual({
      id: 'session-a',
      reason: 'capacity',
    });

    harness.advanceMs(2_001);
    expect(await store.get('session-b')).toMatchObject({ status: 'expired' });
    harness.advanceMs(1_000);
    expect(await store.get('session-b')).toBeNull();
    expect(evictions).toContainEqual({
      id: 'session-b',
      reason: 'retention',
    });
  });

  it('redacts key material and cancels expiry work when session capacity evicts a record', async () => {
    const harness = createClock();
    const sessionStore = new InMemorySessionStore({
      clock: harness.clock,
      inactiveRetentionMs: 60_000,
      maxRecords: 1,
    });
    const keyReferenceStore = new InMemoryKeyReferenceStore({
      clock: harness.clock,
      maxRecords: 2,
      revokedRetentionMs: 60_000,
    });
    const cancelledSessionIds: string[] = [];
    const scheduler: SessionExpiryScheduler = {
      cancel: (sessionId) => cancelledSessionIds.push(sessionId),
      schedule: () => undefined,
    };
    const sessionIds = ['session-a', 'session-b'];
    const keyReferenceIds = ['key-a', 'key-b'];
    const service = new DefaultSessionService(
      sessionStore,
      keyReferenceStore,
      {
        clock: harness.clock,
        expiryScheduler: scheduler,
        keyReferenceIdFactory: () => keyReferenceIds.shift()!,
        sessionIdFactory: () => sessionIds.shift()!,
        ttlSeconds: 300,
      },
    );

    await service.registerSessionKey('sk-first-secret-123456789');
    await service.registerSessionKey('sk-second-secret-12345678');

    expect(await sessionStore.get('session-a')).toBeNull();
    expect(await keyReferenceStore.get('key-a')).toMatchObject({
      keyMaterial: '[REDACTED]',
      revokedAt: harness.now().toISOString(),
    });
    expect(cancelledSessionIds).toContain('session-a');
  });

  it('uses insertion order when session expiry timestamps are identical', async () => {
    const harness = createClock();
    const store = new InMemorySessionStore({
      clock: harness.clock,
      inactiveRetentionMs: 1_000,
      maxRecords: 1,
    });
    const expiresAt = new Date(harness.now().getTime() + 1_000);

    await store.put(createSessionRecord('session-z', expiresAt));
    await store.put(createSessionRecord('session-a', expiresAt));

    expect(await store.get('session-z')).toBeNull();
    expect(await store.get('session-a')).not.toBeNull();
  });

  it('prefers revoked key references for capacity eviction and expires them after retention', async () => {
    const harness = createClock();
    const store = new InMemoryKeyReferenceStore({
      clock: harness.clock,
      maxRecords: 2,
      revokedRetentionMs: 1_000,
    });
    const createReference = (id: string) => ({
      keyReferenceId: id,
      sessionId: `session-${id}`,
      createdAt: harness.now().toISOString(),
      keyFingerprint: `fingerprint-${id}`,
      keyMaterial: `secret-${id}`,
    });

    await store.put(createReference('a'));
    await store.put(createReference('b'));
    await store.revoke('b', harness.now().toISOString());
    await store.put(createReference('c'));

    expect(await store.get('a')).not.toBeNull();
    expect(await store.get('b')).toBeNull();
    expect(await store.get('c')).not.toBeNull();

    await store.revoke('a', harness.now().toISOString());
    harness.advanceMs(1_000);
    expect(await store.get('a')).toBeNull();
  });

  it('caps turns and conversation records with LRU eviction and idle expiry', async () => {
    const harness = createClock();
    const store = new InMemoryConversationHistoryStore({
      clock: harness.clock,
      idleTtlMs: 1_000,
      maxRecords: 2,
      maxStoredTurnsPerConversation: 2,
    });

    await store.appendTurns('session', 'conversation-a', [
      createTurn(0),
      createTurn(1),
      createTurn(2),
    ]);
    expect((await store.get('session', 'conversation-a'))?.turns).toEqual([
      createTurn(1),
      createTurn(2),
    ]);

    harness.advanceMs(10);
    await store.appendTurns('session', 'conversation-b', [createTurn(3)]);
    harness.advanceMs(10);
    await store.get('session', 'conversation-a');
    await store.appendTurns('session', 'conversation-c', [createTurn(4)]);

    expect(await store.get('session', 'conversation-b')).toBeNull();
    expect(await store.get('session', 'conversation-a')).not.toBeNull();
    expect(await store.get('session', 'conversation-c')).not.toBeNull();

    harness.advanceMs(1_000);
    expect(await store.get('session', 'conversation-a')).toBeNull();
    expect(await store.get('session', 'conversation-c')).toBeNull();
  });

  it('bounds stored conversation content by UTF-8 bytes while keeping newest turns', async () => {
    const store = new InMemoryConversationHistoryStore({
      idleTtlMs: 1_000,
      maxRecords: 1,
      maxStoredBytesPerConversation: 5,
      maxStoredTurnsPerConversation: 4,
    });

    const record = await store.appendTurns('session', 'conversation', [
      { ...createTurn(0), content: 'abcd' },
      { ...createTurn(1), content: 'wxyz' },
    ]);

    expect(record.turns.map((turn) => turn.content)).toEqual(['a', 'wxyz']);
  });

  it('caps and expires audit events using insertion time rather than event input', () => {
    const harness = createClock();
    const sink = new InMemoryAuditSink({
      clock: harness.clock,
      maxEvents: 2,
      retentionMs: 1_000,
    });

    sink.record({ type: 'chat.requested', at: '1900-01-01T00:00:00.000Z' });
    harness.advanceMs(1);
    sink.record({ type: 'chat.completed', at: '2100-01-01T00:00:00.000Z' });
    sink.record({ type: 'chat.reset', at: '2026-03-21T00:00:00.000Z' });

    expect(sink.events.map((event) => event.type)).toEqual([
      'chat.completed',
      'chat.reset',
    ]);

    harness.advanceMs(1_000);
    expect(sink.events).toEqual([]);
  });

  it('bounds metric tag-series cardinality and sample retention', () => {
    const harness = createClock();
    const sink = new InMemoryMetricsSink({
      clock: harness.clock,
      maxSamples: 2,
      maxSeries: 2,
      sampleRetentionMs: 1_000,
    });

    sink.increment('requests', { provider: 'noop', result: 'ok' });
    sink.increment('requests', { result: 'ok', provider: 'noop' });
    expect([...sink.counts.values()]).toEqual([2]);

    sink.increment('requests', { provider: 'openai' });
    sink.increment('requests', { provider: 'anthropic' });
    expect(sink.counts.size).toBe(2);
    expect([...sink.counts.keys()].join(' ')).not.toContain('"result":"ok"');

    sink.observe({ name: 'latency', value: 1 });
    sink.observe({ name: 'latency', value: 2 });
    sink.observe({ name: 'latency', value: 3 });
    expect(sink.samples.map((sample) => sample.value)).toEqual([2, 3]);

    harness.advanceMs(1_000);
    expect(sink.samples).toEqual([]);
  });

  it('rejects invalid limits instead of silently disabling bounds', () => {
    expect(() => new InMemoryRateLimitStore({ maxBuckets: 0 })).toThrow(
      RangeError,
    );
    expect(() => new InMemorySessionStore({ maxRecords: -1 })).toThrow(
      RangeError,
    );
    expect(() => new InMemoryKeyReferenceStore({ maxRecords: 1.5 })).toThrow(
      RangeError,
    );
    expect(
      () =>
        new InMemoryConversationHistoryStore({
          maxStoredTurnsPerConversation: Number.NaN,
        }),
    ).toThrow(RangeError);
    expect(() => new InMemoryAuditSink({ maxEvents: 0 })).toThrow(RangeError);
    expect(() => new InMemoryMetricsSink({ maxSamples: 0 })).toThrow(
      RangeError,
    );
  });

  it('loads conservative store defaults and rejects invalid environment overrides', () => {
    const config = loadConfig({});

    expect(config).toMatchObject({
      auditStoreMaxEvents: 2_048,
      auditStoreRetentionSeconds: 86_400,
      conversationIdleTtlSeconds: 3_600,
      conversationMaxStoredBytes: 262_144,
      conversationStoreMaxRecords: 256,
      metricsSampleRetentionSeconds: 3_600,
      metricsStoreMaxSamples: 2_048,
      metricsStoreMaxSeries: 512,
      rateLimitMaxBuckets: 10_000,
      sessionStoreInactiveRetentionSeconds: 3_600,
      sessionStoreMaxRecords: 1_024,
    });
    expect(() => loadConfig({ RATE_LIMIT_MAX_BUCKETS: '0' })).toThrow();
    expect(() =>
      loadConfig({ CONVERSATION_IDLE_TTL_SECONDS: 'not-a-number' }),
    ).toThrow();
    expect(() =>
      loadConfig({ CONVERSATION_MAX_STORED_BYTES: '512' }),
    ).toThrow();
  });
});

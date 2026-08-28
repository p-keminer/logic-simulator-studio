import { assertPositiveInteger } from '../../shared/store-limits.js';

export type AuditEventType =
  | 'session.key.registered'
  | 'session.key.deleted'
  | 'session.reset'
  | 'chat.requested'
  | 'chat.completed'
  | 'chat.reset'
  | 'policy.blocked'
  | 'rate-limit.blocked'
  | 'provider.requested'
  | 'provider.responded'
  | 'provider.failed';

export interface AuditEvent {
  readonly type: AuditEventType;
  readonly at: string;
  readonly sessionId?: string;
  readonly actor?: string;
  readonly details?: Record<string, string | number | boolean | null>;
}

export interface AuditSink {
  record(event: AuditEvent): void;
}

export interface AuditSinkClock {
  now(): Date;
}

export interface InMemoryAuditSinkOptions {
  clock?: AuditSinkClock;
  maxEvents?: number;
  retentionMs?: number;
}

export const DEFAULT_MAX_AUDIT_EVENTS = 2_048;
export const DEFAULT_AUDIT_RETENTION_MS = 24 * 60 * 60 * 1_000;

interface StoredAuditEvent {
  event: AuditEvent;
  recordedAtMs: number;
}

const cloneEvent = (event: AuditEvent): AuditEvent => ({
  ...event,
  details: event.details ? { ...event.details } : undefined,
});

export class InMemoryAuditSink implements AuditSink {
  private readonly storedEvents: StoredAuditEvent[] = [];
  private readonly clock: AuditSinkClock;
  private readonly maxEvents: number;
  private readonly retentionMs: number;

  constructor(options: InMemoryAuditSinkOptions = {}) {
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxEvents = assertPositiveInteger(
      'maxEvents',
      options.maxEvents ?? DEFAULT_MAX_AUDIT_EVENTS,
    );
    this.retentionMs = assertPositiveInteger(
      'retentionMs',
      options.retentionMs ?? DEFAULT_AUDIT_RETENTION_MS,
    );
  }

  get events(): AuditEvent[] {
    this.cleanUp(this.clock.now().getTime());
    return this.storedEvents.map(({ event }) => cloneEvent(event));
  }

  private cleanUp(nowMs: number): void {
    const retainedAfterMs = nowMs - this.retentionMs;

    for (let index = this.storedEvents.length - 1; index >= 0; index -= 1) {
      if (this.storedEvents[index]!.recordedAtMs <= retainedAfterMs) {
        this.storedEvents.splice(index, 1);
      }
    }
  }

  record(event: AuditEvent): void {
    const nowMs = this.clock.now().getTime();
    this.cleanUp(nowMs);
    this.storedEvents.push({
      event: cloneEvent(event),
      recordedAtMs: nowMs,
    });

    if (this.storedEvents.length > this.maxEvents) {
      this.storedEvents.splice(0, this.storedEvents.length - this.maxEvents);
    }
  }
}

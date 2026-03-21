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

export class InMemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];

  record(event: AuditEvent): void {
    this.events.push({
      ...event,
      details: event.details ? { ...event.details } : undefined,
    });
  }
}

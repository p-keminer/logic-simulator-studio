export type PolicyDecision = 'allow' | 'block';

export type PolicyViolationCode =
  | 'empty-prompt'
  | 'missing-session'
  | 'missing-circuit-context-version'
  | 'scope-escape-attempt'
  | 'prompt-injection-attempt'
  | 'provider-override-attempt'
  | 'rate-limit-exceeded'
  | 'invalid-rate-limit';

export interface PolicyViolation {
  readonly code: PolicyViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface PolicyInput {
  readonly sessionId: string;
  readonly requestKind: 'session-key' | 'chat-request' | 'chat-reset';
  readonly promptText?: string;
  readonly reasonText?: string;
  readonly circuitContextVersion?: string;
  readonly conversationId?: string;
  readonly historyTurnCount?: number;
  readonly rateLimitBucket?: string;
  readonly clientIp?: string;
  readonly requestId?: string;
}

export interface PolicyOutcome {
  readonly decision: PolicyDecision;
  readonly violations: PolicyViolation[];
}

export interface RateLimitConfig {
  readonly name: string;
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly burst?: number;
}

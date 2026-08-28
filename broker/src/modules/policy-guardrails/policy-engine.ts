import type {
  PolicyInput,
  PolicyOutcome,
  PolicyViolation,
  RateLimitConfig,
} from './policy-types.js';
import type { RateLimitStore } from './rate-limit-store.js';

export interface PolicyEngine {
  evaluate(input: PolicyInput): Promise<PolicyOutcome>;
}

export interface PolicyEngineOptions {
  readonly rateLimits?: Partial<Record<PolicyInput['requestKind'], RateLimitConfig>>;
  readonly rateLimitStore?: RateLimitStore;
}

const SCOPE_ESCAPE_PATTERNS = [
  /\b(all|other|multiple)\s+(projects|circuits)\b/i,
  /\b(project|workspace|repository|repo)[-\s]?wide\b/i,
  /\b(scan|search|inspect|list|read|open)\b.{0,40}\b(files|filesystem|repository|repo|workspace|project)\b/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /\bignore\b.{0,40}\b(previous|prior|system|developer|sandbox)\b.{0,40}\b(instructions|rules|prompt)\b/i,
  /\bforget\b.{0,40}\b(instructions|rules|system prompt)\b/i,
  /\breveal\b.{0,40}\b(system prompt|hidden instructions|developer message)\b/i,
  /\byou are now\b.{0,40}\b(admin|developer|system)\b/i,
  /\bact as\b.{0,40}\b(system|developer|admin)\b/i,
];

const PROVIDER_OVERRIDE_PATTERNS = [
  /\b(use|switch to|set|override|change)\b.{0,40}\b(gpt|claude|gemini|model|temperature|top[-\s]?p|max tokens?)\b/i,
  /\b(provider|base url|endpoint|api key)\b.{0,40}\b(use|set|override|change|replace)\b/i,
];

const matchesAny = (value: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(value));

export class DefaultPolicyEngine implements PolicyEngine {
  constructor(private readonly options: PolicyEngineOptions = {}) {}

  async evaluate(input: PolicyInput): Promise<PolicyOutcome> {
    const violations: PolicyViolation[] = [];
    const promptText = input.promptText?.trim() ?? '';
    const requiresSession = input.requestKind !== 'session-key';

    if (input.requestKind === 'chat-request' && promptText.length === 0) {
      violations.push({
        code: 'empty-prompt',
        message: 'Chat requests need a non-empty user prompt.',
      });
    }

    if (requiresSession && !input.sessionId.trim()) {
      violations.push({
        code: 'missing-session',
        message: 'Session context is required for brokered requests.',
      });
    }

    if (
      input.requestKind === 'chat-request' &&
      !input.circuitContextVersion?.trim()
    ) {
      violations.push({
        code: 'missing-circuit-context-version',
        message: 'Chat requests need a versioned active-circuit payload.',
      });
    }

    if (
      promptText.length > 0 &&
      matchesAny(promptText, SCOPE_ESCAPE_PATTERNS)
    ) {
      violations.push({
        code: 'scope-escape-attempt',
        message:
          'Requests must stay inside the currently open circuit and may not expand to the wider workspace.',
      });
    }

    if (
      promptText.length > 0 &&
      matchesAny(promptText, PROMPT_INJECTION_PATTERNS)
    ) {
      violations.push({
        code: 'prompt-injection-attempt',
        message:
          'Requests may not override sandbox instructions or request hidden system behavior.',
      });
    }

    if (
      promptText.length > 0 &&
      matchesAny(promptText, PROVIDER_OVERRIDE_PATTERNS)
    ) {
      violations.push({
        code: 'provider-override-attempt',
        message:
          'Requests may not force provider, model, or low-level generation settings in the sandbox.',
      });
    }

    const rateLimit = this.options.rateLimits?.[input.requestKind];

    if (rateLimit && rateLimit.maxRequests <= 0) {
      violations.push({
        code: 'invalid-rate-limit',
        message: 'Rate-limit configuration is not usable.',
      });
    }

    if (
      rateLimit &&
      this.options.rateLimitStore &&
      input.rateLimitBucket?.trim().length
    ) {
      const bucket = [
        rateLimit.name,
        input.requestKind,
        input.rateLimitBucket.trim(),
        input.clientIp?.trim() || 'unknown-ip',
      ].join(':');
      const decision = await this.options.rateLimitStore.take(bucket, rateLimit);

      if (!decision.allowed) {
        violations.push({
          code: 'rate-limit-exceeded',
          message: 'Sandbox request rate limit was exceeded.',
          details: {
            bucket: decision.bucket,
            count: decision.count,
            limit: decision.limit,
            remaining: decision.remaining,
            requestId: input.requestId,
            resetAt: decision.resetAt,
            retryAfterSeconds: decision.retryAfterSeconds,
            windowMs: decision.windowMs,
          },
        });
      }
    }

    return {
      decision: violations.length === 0 ? 'allow' : 'block',
      violations,
    };
  }
}

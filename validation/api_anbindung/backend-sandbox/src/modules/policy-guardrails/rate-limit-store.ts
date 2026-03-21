import type { RateLimitConfig } from './policy-types';

export interface RateLimitClock {
  now(): Date;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly bucket: string;
  readonly count: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: string;
  readonly retryAfterSeconds: number;
  readonly windowMs: number;
}

export interface RateLimitStore {
  take(bucket: string, config: RateLimitConfig): Promise<RateLimitDecision>;
}

interface RateLimitRecord {
  count: number;
  resetAtMs: number;
}

const toLimit = (config: RateLimitConfig) =>
  config.maxRequests + Math.max(0, config.burst ?? 0);

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly records = new Map<string, RateLimitRecord>();
  private readonly clock: RateLimitClock;

  constructor(clock: RateLimitClock = { now: () => new Date() }) {
    this.clock = clock;
  }

  async take(
    bucket: string,
    config: RateLimitConfig,
  ): Promise<RateLimitDecision> {
    const nowMs = this.clock.now().getTime();
    const current = this.records.get(bucket);
    const effectiveLimit = toLimit(config);
    const resetAtMs =
      !current || current.resetAtMs <= nowMs
        ? nowMs + config.windowMs
        : current.resetAtMs;
    const nextCount =
      !current || current.resetAtMs <= nowMs ? 1 : current.count + 1;
    const remaining = Math.max(0, effectiveLimit - nextCount);
    const allowed = nextCount <= effectiveLimit;

    this.records.set(bucket, {
      count: nextCount,
      resetAtMs,
    });

    return {
      allowed,
      bucket,
      count: nextCount,
      limit: effectiveLimit,
      remaining,
      resetAt: new Date(resetAtMs).toISOString(),
      retryAfterSeconds: Math.max(0, Math.ceil((resetAtMs - nowMs) / 1000)),
      windowMs: config.windowMs,
    };
  }
}

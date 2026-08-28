import type { RateLimitConfig } from './policy-types.js';
import { assertPositiveInteger } from '../../shared/store-limits.js';

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

export interface InMemoryRateLimitStoreOptions {
  clock?: RateLimitClock;
  maxBuckets?: number;
}

export const DEFAULT_MAX_RATE_LIMIT_BUCKETS = 10_000;

const toLimit = (config: RateLimitConfig) =>
  config.maxRequests + Math.max(0, config.burst ?? 0);

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly records = new Map<string, RateLimitRecord>();
  private readonly clock: RateLimitClock;
  private readonly maxBuckets: number;

  constructor(
    clockOrOptions: RateLimitClock | InMemoryRateLimitStoreOptions = {},
  ) {
    const options =
      'now' in clockOrOptions ? { clock: clockOrOptions } : clockOrOptions;

    this.clock = options.clock ?? { now: () => new Date() };
    this.maxBuckets = assertPositiveInteger(
      'maxBuckets',
      options.maxBuckets ?? DEFAULT_MAX_RATE_LIMIT_BUCKETS,
    );
  }

  private removeExpired(nowMs: number): void {
    for (const [bucket, record] of this.records) {
      if (record.resetAtMs <= nowMs) {
        this.records.delete(bucket);
      }
    }
  }

  private evictNextBucket(): void {
    const candidate = [...this.records.entries()].sort(
      ([leftBucket, left], [rightBucket, right]) =>
        left.resetAtMs - right.resetAtMs ||
        leftBucket.localeCompare(rightBucket),
    )[0];

    if (candidate) {
      this.records.delete(candidate[0]);
    }
  }

  async take(
    bucket: string,
    config: RateLimitConfig,
  ): Promise<RateLimitDecision> {
    const nowMs = this.clock.now().getTime();
    this.removeExpired(nowMs);
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

    if (!current && this.records.size >= this.maxBuckets) {
      this.evictNextBucket();
    }

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

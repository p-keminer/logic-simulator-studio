import { assertPositiveInteger } from '../../shared/store-limits.js';

export interface MetricSample {
  readonly name: string;
  readonly value: number;
  readonly tags?: Record<string, string>;
}

export interface MetricsSink {
  increment(name: string, tags?: Record<string, string>): void;
  observe(sample: MetricSample): void;
}

export interface MetricsSinkClock {
  now(): Date;
}

export interface InMemoryMetricsSinkOptions {
  clock?: MetricsSinkClock;
  maxSeries?: number;
  maxSamples?: number;
  sampleRetentionMs?: number;
}

export const DEFAULT_MAX_METRIC_SERIES = 512;
export const DEFAULT_MAX_METRIC_SAMPLES = 2_048;
export const DEFAULT_METRIC_SAMPLE_RETENTION_MS = 60 * 60 * 1_000;

interface StoredMetricSample {
  sample: MetricSample;
  recordedAtMs: number;
}

const normalizeTags = (tags: Record<string, string> | undefined) =>
  Object.fromEntries(
    Object.entries(tags ?? {}).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

const cloneSample = (sample: MetricSample): MetricSample => ({
  name: sample.name,
  value: sample.value,
  tags: sample.tags ? { ...sample.tags } : undefined,
});

export class InMemoryMetricsSink implements MetricsSink {
  readonly counts = new Map<string, number>();
  private readonly storedSamples: StoredMetricSample[] = [];
  private readonly clock: MetricsSinkClock;
  private readonly maxSeries: number;
  private readonly maxSamples: number;
  private readonly sampleRetentionMs: number;

  constructor(options: InMemoryMetricsSinkOptions = {}) {
    this.clock = options.clock ?? { now: () => new Date() };
    this.maxSeries = assertPositiveInteger(
      'maxSeries',
      options.maxSeries ?? DEFAULT_MAX_METRIC_SERIES,
    );
    this.maxSamples = assertPositiveInteger(
      'maxSamples',
      options.maxSamples ?? DEFAULT_MAX_METRIC_SAMPLES,
    );
    this.sampleRetentionMs = assertPositiveInteger(
      'sampleRetentionMs',
      options.sampleRetentionMs ?? DEFAULT_METRIC_SAMPLE_RETENTION_MS,
    );
  }

  get samples(): MetricSample[] {
    this.cleanUpSamples(this.clock.now().getTime());
    return this.storedSamples.map(({ sample }) => cloneSample(sample));
  }

  private cleanUpSamples(nowMs: number): void {
    const retainedAfterMs = nowMs - this.sampleRetentionMs;

    for (let index = this.storedSamples.length - 1; index >= 0; index -= 1) {
      if (this.storedSamples[index]!.recordedAtMs <= retainedAfterMs) {
        this.storedSamples.splice(index, 1);
      }
    }
  }

  increment(name: string, tags?: Record<string, string>): void {
    const key = JSON.stringify({ name, tags: normalizeTags(tags) });
    const existingCount = this.counts.get(key);

    if (existingCount !== undefined) {
      this.counts.set(key, existingCount + 1);
      return;
    }

    if (this.counts.size >= this.maxSeries) {
      const oldestKey = this.counts.keys().next().value as string | undefined;

      if (oldestKey !== undefined) {
        this.counts.delete(oldestKey);
      }
    }

    this.counts.set(key, 1);
  }

  observe(sample: MetricSample): void {
    const nowMs = this.clock.now().getTime();
    this.cleanUpSamples(nowMs);
    this.storedSamples.push({
      sample: cloneSample({
        ...sample,
        tags: sample.tags ? normalizeTags(sample.tags) : undefined,
      }),
      recordedAtMs: nowMs,
    });

    if (this.storedSamples.length > this.maxSamples) {
      this.storedSamples.splice(
        0,
        this.storedSamples.length - this.maxSamples,
      );
    }
  }
}

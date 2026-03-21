export interface MetricSample {
  readonly name: string;
  readonly value: number;
  readonly tags?: Record<string, string>;
}

export interface MetricsSink {
  increment(name: string, tags?: Record<string, string>): void;
  observe(sample: MetricSample): void;
}

export class InMemoryMetricsSink implements MetricsSink {
  readonly counts = new Map<string, number>();
  readonly samples: MetricSample[] = [];

  increment(name: string, tags?: Record<string, string>): void {
    const key = JSON.stringify({ name, tags: tags ?? {} });
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  observe(sample: MetricSample): void {
    this.samples.push(sample);
  }
}

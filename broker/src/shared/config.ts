import { z } from 'zod';

const configSchema = z.object({
  ALLOWED_ORIGINS: z.string().optional(),
  APP_ENV: z.enum(['development', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  RATE_LIMIT_MAX_BUCKETS: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .default(10_000),
  SESSION_STORE_MAX_RECORDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(1_024),
  SESSION_STORE_INACTIVE_RETENTION_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(604_800)
    .default(3_600),
  CONVERSATION_STORE_MAX_RECORDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(256),
  CONVERSATION_MAX_STORED_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(16_777_216)
    .default(262_144),
  CONVERSATION_IDLE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(604_800)
    .default(3_600),
  AUDIT_STORE_MAX_EVENTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(2_048),
  AUDIT_STORE_RETENTION_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(2_592_000)
    .default(86_400),
  METRICS_STORE_MAX_SERIES: z.coerce
    .number()
    .int()
    .min(1)
    .max(100_000)
    .default(512),
  METRICS_STORE_MAX_SAMPLES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1_000_000)
    .default(2_048),
  METRICS_SAMPLE_RETENTION_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(604_800)
    .default(3_600),
  DEV_RESPONSE_DELAY_MS: z.coerce.number().int().min(0).max(10_000).default(0),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  // ── Provider-Konfiguration ────────────────────────────────────────────────
  // Der API-Key des Nutzers kommt NICHT aus Env-Vars, sondern zur Laufzeit
  // aus der Session (Nutzer traegt ihn im Frontend-Broker-Modal ein).
  // Env-Vars steuern nur: welcher Provider-Typ, welche Base-URL, welches Modell.

  // Welcher Provider-Client aktiv ist.
  // 'noop'              → kein echter Provider-Call (Standard, sicher fuer Entwicklung)
  // 'anthropic'         → direkte Anthropic API (api.anthropic.com)
  // 'openai-compatible' → OpenAI-Format, konfigurierbare Base-URL (OpenAI, OpenRouter, Ollama, …)
  PROVIDER: z.enum(['noop', 'anthropic', 'openai-compatible']).default('noop'),

  // Pflicht fuer PROVIDER=openai-compatible. Beispiele:
  //   OpenAI:     https://api.openai.com
  //   OpenRouter: https://openrouter.ai
  //   Ollama:     http://localhost:11434
  PROVIDER_BASE_URL: z.string().url().optional(),

  // Standard-Modell das an den Provider gesendet wird. Beispiele:
  //   Anthropic:    claude-opus-4-6
  //   OpenAI:       gpt-4o
  //   OpenRouter:   anthropic/claude-opus-4-6
  PROVIDER_DEFAULT_MODEL: z.string().min(1).optional(),

  // HTTP-Timeout pro Provider-Request in Millisekunden.
  // Echte API-Calls brauchen deutlich laenger als interne Sandbox-Calls.
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),

  // Maximale Retry-Versuche im Provider-Gateway bei transienten Fehlern.
  PROVIDER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(2),
});

export interface SandboxConfig {
  allowedOrigins: string[];
  appEnv: 'development' | 'production';
  host: string;
  port: number;
  sessionTtlSeconds: number;
  rateLimitMaxBuckets: number;
  sessionStoreMaxRecords: number;
  sessionStoreInactiveRetentionSeconds: number;
  conversationStoreMaxRecords: number;
  conversationMaxStoredBytes: number;
  conversationIdleTtlSeconds: number;
  auditStoreMaxEvents: number;
  auditStoreRetentionSeconds: number;
  metricsStoreMaxSeries: number;
  metricsStoreMaxSamples: number;
  metricsSampleRetentionSeconds: number;
  devResponseDelayMs: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  // Provider-Konfiguration
  providerType: 'noop' | 'anthropic' | 'openai-compatible';
  providerBaseUrl: string | undefined;
  providerDefaultModel: string | undefined;
  providerTimeoutMs: number;
  providerMaxAttempts: number;
}

const DEFAULT_DEVELOPMENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const parseAllowedOrigins = (
  rawValue: string | undefined,
  appEnv: 'development' | 'production',
) => {
  const parsed = (rawValue ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (parsed.length > 0) {
    return parsed;
  }

  if (appEnv === 'development') {
    return DEFAULT_DEVELOPMENT_ORIGINS;
  }

  throw new Error(
    'ALLOWED_ORIGINS must be configured for production environments.',
  );
};

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): SandboxConfig => {
  const parsed = configSchema.parse(env);

  return {
    allowedOrigins: parseAllowedOrigins(parsed.ALLOWED_ORIGINS, parsed.APP_ENV),
    appEnv: parsed.APP_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    sessionTtlSeconds: parsed.SESSION_TTL_SECONDS,
    rateLimitMaxBuckets: parsed.RATE_LIMIT_MAX_BUCKETS,
    sessionStoreMaxRecords: parsed.SESSION_STORE_MAX_RECORDS,
    sessionStoreInactiveRetentionSeconds:
      parsed.SESSION_STORE_INACTIVE_RETENTION_SECONDS,
    conversationStoreMaxRecords: parsed.CONVERSATION_STORE_MAX_RECORDS,
    conversationMaxStoredBytes: parsed.CONVERSATION_MAX_STORED_BYTES,
    conversationIdleTtlSeconds: parsed.CONVERSATION_IDLE_TTL_SECONDS,
    auditStoreMaxEvents: parsed.AUDIT_STORE_MAX_EVENTS,
    auditStoreRetentionSeconds: parsed.AUDIT_STORE_RETENTION_SECONDS,
    metricsStoreMaxSeries: parsed.METRICS_STORE_MAX_SERIES,
    metricsStoreMaxSamples: parsed.METRICS_STORE_MAX_SAMPLES,
    metricsSampleRetentionSeconds:
      parsed.METRICS_SAMPLE_RETENTION_SECONDS,
    devResponseDelayMs: parsed.DEV_RESPONSE_DELAY_MS,
    logLevel: parsed.LOG_LEVEL,
    providerType: parsed.PROVIDER,
    providerBaseUrl: parsed.PROVIDER_BASE_URL,
    providerDefaultModel: parsed.PROVIDER_DEFAULT_MODEL,
    providerTimeoutMs: parsed.PROVIDER_TIMEOUT_MS,
    providerMaxAttempts: parsed.PROVIDER_MAX_ATTEMPTS,
  };
};

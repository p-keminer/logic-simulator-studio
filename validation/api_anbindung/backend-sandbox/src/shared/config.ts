import { z } from 'zod';

const configSchema = z.object({
  ALLOWED_ORIGINS: z.string().optional(),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  DEV_RESPONSE_DELAY_MS: z.coerce.number().int().min(0).max(10_000).default(0),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  // Staging-Access-Gate: statisches Token, das alle /v1/*-Routen in staging schuetzt.
  // Mindestlaenge 32 Zeichen, damit Brute-Force unpraktikabel bleibt.
  // Darf nicht hartcodiert werden – nur als Render-Secret oder lokale Env-Var setzen.
  STAGING_ACCESS_TOKEN: z.string().min(32).optional(),

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
  appEnv: 'development' | 'staging' | 'production';
  host: string;
  port: number;
  sessionTtlSeconds: number;
  devResponseDelayMs: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  /** Nur gesetzt wenn STAGING_ACCESS_TOKEN konfiguriert ist. Bewacht alle /v1/*-Routen in staging. */
  stagingAccessToken: string | undefined;
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
  appEnv: 'development' | 'staging' | 'production',
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
    'ALLOWED_ORIGINS must be configured for staging and production environments.',
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
    devResponseDelayMs: parsed.DEV_RESPONSE_DELAY_MS,
    logLevel: parsed.LOG_LEVEL,
    stagingAccessToken: parsed.STAGING_ACCESS_TOKEN,
    providerType: parsed.PROVIDER,
    providerBaseUrl: parsed.PROVIDER_BASE_URL,
    providerDefaultModel: parsed.PROVIDER_DEFAULT_MODEL,
    providerTimeoutMs: parsed.PROVIDER_TIMEOUT_MS,
    providerMaxAttempts: parsed.PROVIDER_MAX_ATTEMPTS,
  };
};

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
});

export interface SandboxConfig {
  allowedOrigins: string[];
  appEnv: 'development' | 'staging' | 'production';
  host: string;
  port: number;
  sessionTtlSeconds: number;
  devResponseDelayMs: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
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
  };
};

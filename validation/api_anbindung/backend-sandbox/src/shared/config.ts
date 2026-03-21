import { z } from 'zod';

const configSchema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export interface SandboxConfig {
  host: string;
  port: number;
  sessionTtlSeconds: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
}

export const loadConfig = (
  env: NodeJS.ProcessEnv = process.env,
): SandboxConfig => {
  const parsed = configSchema.parse(env);

  return {
    host: parsed.HOST,
    port: parsed.PORT,
    sessionTtlSeconds: parsed.SESSION_TTL_SECONDS,
    logLevel: parsed.LOG_LEVEL,
  };
};

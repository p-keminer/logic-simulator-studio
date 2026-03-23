const DEFAULT_ALLOWED_ORIGIN = 'https://staging.logic-simulator.example';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = '8787';

export const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');

export const getStagingAllowedOrigin = (env = process.env) =>
  env.STAGING_ALLOWED_ORIGIN?.trim() || DEFAULT_ALLOWED_ORIGIN;

export const getStagingHost = (env = process.env) =>
  env.STAGING_HOST?.trim() || DEFAULT_HOST;

export const getStagingPort = (env = process.env) =>
  env.STAGING_PORT?.trim() || DEFAULT_PORT;

export const getStagingBaseUrl = (env = process.env) =>
  normalizeBaseUrl(
    env.STAGING_BASE_URL?.trim() ||
      `http://${getStagingHost(env)}:${getStagingPort(env)}`,
  );

export const getStagingRuntimeEnv = (env = process.env) => ({
  ...env,
  ALLOWED_ORIGINS:
    env.ALLOWED_ORIGINS?.trim() || getStagingAllowedOrigin(env),
  APP_ENV: 'staging',
  HOST: getStagingHost(env),
  PORT: getStagingPort(env),
});

// Staging-Access-Token fuer den X-Staging-Token Header.
// Leer-String bedeutet: Gate nicht konfiguriert, Smoke ueberspringt Gate-Checks.
export const getStagingAccessToken = (env = process.env) =>
  env.STAGING_ACCESS_TOKEN?.trim() ?? '';

const REDACTED = '[REDACTED]';
const SECRET_PATTERNS = [
  /sk-(?:proj-|ant-)?[a-zA-Z0-9_-]{10,}/g,
  /AIza[0-9A-Za-z\-_]{20,}/g,
  /api[_-]?key[\s:=]+[^\s&]+/gi,
  /bearer\s+[a-z0-9._-]+/gi,
];
const QUERY_SECRET_PATTERN =
  /([?&](?:api[_-]?key|token|access_token|refresh_token|client_secret)=)[^&\s]+/gi;
const URL_CREDENTIALS_PATTERN = /(https?:\/\/)([^/\s:@]+):([^@\s]+)@/gi;
const SENSITIVE_FIELD_NAMES = new Set([
  'apiKey',
  'api_key',
  'authorization',
  'x-api-key',
  'access_token',
  'refresh_token',
  'client_secret',
  'token',
  'bearer',
  'cookie',
  'set-cookie',
]);

export function redactSensitiveText(input: string): string {
  let output = input;

  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, REDACTED);
  }

  output = output.replace(QUERY_SECRET_PATTERN, `$1${REDACTED}`);
  output = output.replace(URL_CREDENTIALS_PATTERN, `$1${REDACTED}@`);

  return output;
}

export function redactSensitiveValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactSensitiveText(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_FIELD_NAMES.has(key) ? REDACTED : redactSensitiveValue(entry),
      ]),
    );
  }

  return value;
}

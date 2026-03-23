import {
  getStagingAccessToken,
  getStagingAllowedOrigin,
  getStagingBaseUrl,
} from './staging-runtime-defaults.mjs';

const baseUrl = getStagingBaseUrl();
const allowedOrigin = getStagingAllowedOrigin();
const stagingToken = getStagingAccessToken();

// Fuegt den Staging-Access-Token-Header hinzu, sofern konfiguriert.
const withToken = (headers = {}) =>
  stagingToken ? { ...headers, 'x-staging-token': stagingToken } : headers;

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let json;

  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }

  return {
    headers: Object.fromEntries(response.headers.entries()),
    json,
    status: response.status,
    text,
  };
};

const assert = (condition, message, details) => {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
};

const main = async () => {
  // /health und /ready brauchen keinen Token (Render-Health-Check-Pfade)
  const health = await request('/health');
  const ready = await request('/ready');

  // CORS-Preflight: kein Token noetig, OPTIONS-Requests sind vom Gate ausgenommen
  const allowedPreflight = await request('/v1/session/key', {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'POST',
    },
  });

  // Alle /v1/*-Requests tragen den Staging-Token, sofern konfiguriert
  const devFault = await request('/v1/dev/provider-fault', {
    method: 'POST',
    headers: withToken({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ mode: 'timeout' }),
  });

  // Staging-Access-Gate-Check: Request ohne Token muss 401 liefern.
  // Nur pruefen wenn STAGING_ACCESS_TOKEN gesetzt ist (Gate aktiv).
  let noTokenResponse;
  if (stagingToken) {
    noTokenResponse = await request('/v1/session/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      // kein x-staging-token Header
    });
  }

  assert(health.status === 200, 'health endpoint is not healthy.', health);
  assert(ready.status === 200, 'ready endpoint is not ready.', ready);
  assert(
    health.json?.environment === 'staging',
    'health endpoint does not report staging environment.',
    health,
  );
  assert(
    ready.json?.devEndpointsEnabled === false,
    'ready endpoint still reports dev endpoints enabled.',
    ready,
  );
  assert(
    allowedPreflight.status === 204,
    'allowed staging preflight did not succeed.',
    allowedPreflight,
  );
  assert(
    allowedPreflight.headers['access-control-allow-origin'] === allowedOrigin,
    'allowed staging origin was not echoed back by CORS.',
    allowedPreflight,
  );
  assert(
    devFault.status === 404,
    'dev fault route is still reachable in staging.',
    devFault,
  );
  if (stagingToken && noTokenResponse) {
    assert(
      noTokenResponse.status === 401,
      'staging access gate did not reject unauthenticated request.',
      noTokenResponse,
    );
    assert(
      noTokenResponse.json?.error === 'staging_access_denied',
      'staging access gate returned unexpected error code.',
      noTokenResponse,
    );
  }

  console.log(
    JSON.stringify(
      {
        allowedOrigin,
        baseUrl,
        checks: {
          devFaultRouteDisabled: true,
          health: 'ok',
          ready: 'ok',
          stagingAccessGate: stagingToken ? 'ok' : 'skipped (no token configured)',
          stagingCors: 'ok',
        },
        ok: true,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        cause: error.cause?.message ?? null,
        details: error.details ?? null,
        message: error.message,
        ok: false,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

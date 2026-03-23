import {
  getStagingAllowedOrigin,
  getStagingBaseUrl,
} from './staging-runtime-defaults.mjs';

const baseUrl = getStagingBaseUrl();
const allowedOrigin = getStagingAllowedOrigin();

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
  const health = await request('/health');
  const ready = await request('/ready');
  const allowedPreflight = await request('/v1/session/key', {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'POST',
    },
  });
  const devFault = await request('/v1/dev/provider-fault', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'timeout',
    }),
  });

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

  console.log(
    JSON.stringify(
      {
        allowedOrigin,
        baseUrl,
        checks: {
          devFaultRouteDisabled: true,
          health: 'ok',
          ready: 'ok',
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

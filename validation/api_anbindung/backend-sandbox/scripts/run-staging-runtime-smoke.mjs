import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  getStagingAllowedOrigin,
  getStagingBaseUrl,
  getStagingRuntimeEnv,
} from './staging-runtime-defaults.mjs';

const READY_TIMEOUT_MS = 15_000;
const READY_POLL_MS = 250;

const formatOutput = (chunks) => Buffer.concat(chunks).toString('utf8').trim();

const waitForReady = async (baseUrl) => {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < READY_TIMEOUT_MS) {
    try {
      const response = await fetch(`${baseUrl}/ready`);

      if (response.ok) {
        return;
      }

      lastError = new Error(`ready endpoint returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(READY_POLL_MS);
  }

  const timeoutError = new Error('staging runtime did not become ready in time.');
  timeoutError.cause = lastError;
  throw timeoutError;
};

const run = async () => {
  const runtimeEnv = getStagingRuntimeEnv();
  const baseUrl = getStagingBaseUrl(runtimeEnv);
  const allowedOrigin = getStagingAllowedOrigin(runtimeEnv);
  const stdoutChunks = [];
  const stderrChunks = [];
  const child = spawn(
    process.execPath,
    ['./node_modules/tsx/dist/cli.mjs', 'src/app/server.ts'],
    {
      env: runtimeEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  child.stdout.on('data', (chunk) => {
    stdoutChunks.push(Buffer.from(chunk));
  });
  child.stderr.on('data', (chunk) => {
    stderrChunks.push(Buffer.from(chunk));
  });

  try {
    await waitForReady(baseUrl);

    const smokeExitCode = await new Promise((resolve, reject) => {
      const smoke = spawn(
        process.execPath,
        ['./scripts/run-staging-url-smoke.mjs'],
        {
          env: {
            ...process.env,
            STAGING_ALLOWED_ORIGIN: allowedOrigin,
            STAGING_BASE_URL: baseUrl,
          },
          stdio: 'inherit',
        },
      );

      smoke.on('error', reject);
      smoke.on('exit', (code) => resolve(code ?? 1));
    });

    if (smokeExitCode !== 0) {
      throw new Error(`staging url smoke failed with exit code ${smokeExitCode}.`);
    }
  } catch (error) {
    error.runtimeStdout = formatOutput(stdoutChunks);
    error.runtimeStderr = formatOutput(stderrChunks);
    throw error;
  } finally {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      delay(2_000).then(() => {
        child.kill('SIGKILL');
      }),
    ]);
  }

  console.log(
    JSON.stringify(
      {
        allowedOrigin,
        baseUrl,
        ok: true,
        runtime: 'staging-local',
      },
      null,
      2,
    ),
  );
};

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        cause: error.cause?.message ?? null,
        message: error.message,
        ok: false,
        runtimeStderr: error.runtimeStderr || null,
        runtimeStdout: error.runtimeStdout || null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});

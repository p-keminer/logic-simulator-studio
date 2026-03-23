import { spawn } from 'node:child_process';
import { getStagingRuntimeEnv } from './staging-runtime-defaults.mjs';

const child = spawn(
  process.execPath,
  ['./node_modules/tsx/dist/cli.mjs', 'watch', 'src/app/server.ts'],
  {
    env: getStagingRuntimeEnv(),
    stdio: 'inherit',
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 0;
});

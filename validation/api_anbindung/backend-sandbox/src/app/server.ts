import { fileURLToPath } from 'node:url';
import { createApp } from './create-app.js';
import { loadConfig } from '../shared/config.js';

export const startServer = async () => {
  const config = loadConfig();
  const app = createApp({ config });

  await app.listen({
    host: config.host,
    port: config.port,
  });

  return app;
};

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  startServer().catch((error) => {
    console.error('backend-sandbox failed to start', error);
    process.exitCode = 1;
  });
}


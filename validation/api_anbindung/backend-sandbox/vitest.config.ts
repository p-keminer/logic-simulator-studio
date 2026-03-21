import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  test: {
    environment: 'node',
    include: ['tests/**/*.ts'],
    exclude: ['dist/**', 'node_modules/**', 'tests/**/fixtures.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});

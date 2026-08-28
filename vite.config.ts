/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Loopback by default. For an explicitly trusted LAN session, start with
    // `npm run dev -- --host 0.0.0.0` instead of exposing every local run.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['.claude/**', 'validation/**', 'dist/**', 'node_modules/**'],
  },
})

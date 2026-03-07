/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Bindet an 0.0.0.0 → aus Windows via localhost erreichbar (WSL2)
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['.claude/**', 'validation/**', 'dist/**', 'node_modules/**'],
  },
})

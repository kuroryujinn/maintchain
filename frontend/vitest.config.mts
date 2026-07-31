// frontend/vitest.config.ts
// Minimal Vitest setup for unit tests. Uses jsdom because React hook/component
// tests (@testing-library/react renderHook) need a DOM. Tests live alongside
// source in src/**/*.test.{ts,tsx} and import describe/it/expect from 'vitest'
// explicitly (no globals), so no tsconfig types change is required.
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Match the tsconfig "@/*" → "src/*" path so tests can import app
      // modules (e.g. @/hooks/useTransactionState) with the same alias the
      // pages use.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

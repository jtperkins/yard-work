import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite (app) + Vitest (tests) config.
 *
 * Test projects:
 *  - `unit`   — pure TS (src/shared, src/domain) in Node.
 *  - `web`    — React/DOM tests for the rest of src/ in jsdom.
 *  - `server` — Pages Functions + server/lib + test/** in Node, so tests can use
 *               `getPlatformProxy()` from wrangler for a real local D1 (Miniflare).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8788', changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Third-party code in its own long-cached chunk; app code changes don't bust it.
        codeSplitting: { groups: [{ name: 'vendor', test: /[\\/]node_modules[\\/]/ }] },
      },
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**/*.{ts,tsx}', 'server/**/*.ts', 'functions/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', 'src/i18n/{en,es}/**', 'src/test-setup.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/shared/**/*.test.ts', 'src/domain/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/shared/**', 'src/domain/**'],
          setupFiles: ['./src/test-setup.ts'],
          css: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/**/*.test.ts', 'functions/**/*.test.ts', 'test/**/*.test.ts'],
          // Miniflare startup is slow-ish; keep generous timeouts for D1-backed tests.
          testTimeout: 20_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});

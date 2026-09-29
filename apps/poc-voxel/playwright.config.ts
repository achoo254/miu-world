import { defineConfig } from '@playwright/test';

const PORT = 4173; // fixed: a stale preview server shows up with `lsof -i :4173`

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // New headless mode uses the machine GPU (old headless shell falls back to SwiftShader).
    channel: 'chromium',
  },
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    { name: 'poc', testMatch: 'poc.spec.ts' },
    { name: 'perf', testMatch: 'perf.spec.ts', timeout: 30 * 60_000 },
  ],
});

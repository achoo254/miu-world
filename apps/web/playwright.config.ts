import { defineConfig } from '@playwright/test';

// Fixed ports: a stale server shows up with `netstat -ano | findstr :4173` (web) or `:8787` (API).
const WEB_PORT = 4173;
const API_PORT = 8787;
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
export const PARENT_STATE = 'playwright/.auth/parent.json';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    // New headless mode uses the machine GPU (old headless shell falls back to SwiftShader).
    channel: 'chromium',
  },
  webServer: [
    {
      // In-memory PGlite: every run starts from an empty database, no real data involved.
      command: 'pnpm --filter @miu/server start',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { NODE_ENV: 'test', PORT: String(API_PORT), PGLITE_DIR: 'memory', ALLOWED_ORIGINS: BASE_URL },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'pnpm build && pnpm preview --host 127.0.0.1',
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
  projects: [
    { name: 'setup', testMatch: 'parent-session.setup.ts' },
    { name: 'account', testMatch: 'account-flow.spec.ts' },
    { name: 'play', testMatch: 'play.spec.ts', dependencies: ['setup'], use: { storageState: PARENT_STATE } },
    { name: 'perf', testMatch: 'perf.spec.ts', dependencies: ['setup'], use: { storageState: PARENT_STATE }, timeout: 30 * 60_000 },
  ],
});

import { defineConfig } from '@playwright/test';

// Fixed ports: a stale server shows up with `netstat -ano | findstr :4173` (web) or `:8787` (API).
const WEB_PORT = 4173;
const API_PORT = 8787;
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
const FAKE_GOOGLE = 'http://127.0.0.1:8788';
export const PARENT_STATE = 'playwright/.auth/parent.json';

/** Signed-in journeys: one project per `e2e/<name>.spec.ts`, all starting from the parent session. */
const SIGNED_IN = ['play', 'creator', 'home', 'quest-flow', 'challenges', 'mvp-loop'] as const;

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  workers: 1,
  // Long journeys on software-GL CI runners: one retry, and a trace only for the runs that failed.
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // New headless mode uses the machine GPU (old headless shell falls back to SwiftShader).
    channel: 'chromium',
  },
  webServer: [
    {
      // Local stand-in for Google's OAuth endpoints (test-only override; refused in production).
      command: 'pnpm exec tsx e2e/fake-google-server.ts',
      url: `${FAKE_GOOGLE}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // In-memory PGlite: every run starts from an empty database, no real data involved.
      command: 'pnpm --filter @miu/server start',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        PGLITE_DIR: 'memory',
        // The setup project creates its fake parent through the dev/test password route.
        PASSWORD_LOGIN: '1',
        ALLOWED_ORIGINS: BASE_URL,
        GOOGLE_CLIENT_ID: 'e2e-client-id',
        GOOGLE_CLIENT_SECRET: 'test-secret-e2e',
        GOOGLE_REDIRECT_URI: `${BASE_URL}/api/auth/google/callback`,
        GOOGLE_AUTH_URL: `${FAKE_GOOGLE}/authorize`,
        GOOGLE_TOKEN_URL: `${FAKE_GOOGLE}/token`,
      },
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
    ...SIGNED_IN.map((name) => ({ name, testMatch: `${name}.spec.ts`, dependencies: ['setup'], use: { storageState: PARENT_STATE } })),
    { name: 'perf', testMatch: 'perf.spec.ts', dependencies: ['setup'], use: { storageState: PARENT_STATE }, timeout: 30 * 60_000 },
  ],
});

import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { DEFAULT_TEST_TIMEOUT_MS } from './e2e/time-budget-reporter';

// Fixed ports: a stale server shows up with `netstat -ano | findstr :4173` (web) or `:8787` (API).
const WEB_PORT = 4173;
const API_PORT = 8787;
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;
const FAKE_GOOGLE = 'http://127.0.0.1:8788';
export const PARENT_STATE = 'playwright/.auth/parent.json';

/**
 * The smoke suite (docs/code-standards.md "Kiểm thử"): one project per `e2e/<name>.spec.ts`, each a main journey that
 * stays green and holds every release; checks that grow with content live in Node. All start from the parent session.
 */
const SIGNED_IN = ['play', 'quest-flow', 'sgk-mechanics', 'worksheets', 'maps', 'coop', 'bosses', 'shop'] as const;

export default defineConfig({
  testDir: 'e2e',
  // Time budget (docs/code-standards.md): a test fails fast at 45s unless it declares a longer timeout;
  // the reporter lists the slowest tests and fails one over 30s that did not declare itself long. One
  // worker on purpose: parallel browsers freeze the dev machine (shard on CI instead, never locally).
  timeout: DEFAULT_TEST_TIMEOUT_MS,
  workers: 1,
  // No retry (CI included, see playwright.ci.config.ts); a trace only for the runs that failed.
  retries: 0,
  reporter: [['list'], ['./e2e/time-budget-reporter.ts']],
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
        // Each spec signs up its own fake parent from one IP, and retries sign up again: 10 an hour is too few.
        REGISTER_LIMIT_PER_HOUR: '1000',
        ALLOWED_ORIGINS: BASE_URL,
        GOOGLE_CLIENT_ID: 'e2e-client-id',
        GOOGLE_CLIENT_SECRET: 'test-secret-e2e',
        GOOGLE_REDIRECT_URI: `${BASE_URL}/api/auth/google/callback`,
        GOOGLE_AUTH_URL: `${FAKE_GOOGLE}/authorize`,
        GOOGLE_TOKEN_URL: `${FAKE_GOOGLE}/token`,
        // Test-only quests (every textbook mechanic), loaded after the shipped ones.
        EXTRA_QUEST_DIR: fileURLToPath(new URL('./e2e/fixtures/quests', import.meta.url)),
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // vite build only: the typecheck is its own gate (pnpm typecheck), and tsc doubled the build's time and memory.
      command: 'pnpm exec vite build && pnpm preview --host 127.0.0.1',
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

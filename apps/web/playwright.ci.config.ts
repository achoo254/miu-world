import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// CI runs every project except `perf` (up to ~30 min, rewrites the committed perf report), so a new
// spec with its own project joins CI without touching the workflow. The CI job splits the run over
// several GitHub runners (`--shard=i/n`, see .github/workflows/ci.yml); each runner still uses one worker.
/** One shard's budget (docs/code-standards.md "Ngân sách thời gian test"): over it, the shard fails. */
export const E2E_SUITE_BUDGET_SECONDS = 480;

export default defineConfig({
  ...base,
  reporter: [['list'], ['./e2e/time-budget-reporter.ts', { suiteBudgetSeconds: E2E_SUITE_BUDGET_SECONDS }]],
  // Shard by test, not by file, so one long spec does not leave one runner with most of the work.
  fullyParallel: true,
  // A broken build fails fast instead of waiting out every test's timeout. No blanket retry: a failure
  // is a bug (or a flaky test to fix), and a retry doubled the time of every real failure.
  retries: 0,
  maxFailures: 10,
  projects: (base.projects ?? []).filter((project) => project.name !== 'perf'),
});

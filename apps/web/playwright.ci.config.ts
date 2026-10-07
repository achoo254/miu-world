import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// CI runs the smoke suite: every project except `perf` (up to ~30 min, rewrites the committed perf report) and
// `screens` (pictures before a release, taken on the dev machine). The CI job splits the run over two GitHub
// runners (`--shard=i/n`, see .github/workflows/ci.yml); each runner still uses one worker.
/** One shard's budget (docs/code-standards.md "Ngân sách thời gian test"): over it, the shard fails. */
export const E2E_SUITE_BUDGET_SECONDS = 240;

/** Projects run by hand, never on CI. */
const MANUAL_PROJECTS = new Set(['perf', 'screens']);

export default defineConfig({
  ...base,
  reporter: [['list'], ['./e2e/time-budget-reporter.ts', { suiteBudgetSeconds: E2E_SUITE_BUDGET_SECONDS }]],
  // Shard by test, not by file, so one long spec does not leave one runner with most of the work.
  fullyParallel: true,
  // No retry: a failure is a bug (or a flaky test to fix), and a retry doubled the time of every real failure.
  // No cap on failures either: every smoke journey runs and reports, none is left "did not run".
  retries: 0,
  projects: (base.projects ?? []).filter((project) => !MANUAL_PROJECTS.has(project.name ?? '')),
});

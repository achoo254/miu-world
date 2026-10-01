import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// CI runs every project except `perf` (up to ~30 min, rewrites the committed perf report), so a new
// spec with its own project joins CI without touching the workflow.
/** The whole run's budget (docs/code-standards.md "Ngân sách thời gian test"): over it, the run fails. */
export const E2E_SUITE_BUDGET_SECONDS = 480;

export default defineConfig({
  ...base,
  reporter: [['list'], ['./e2e/time-budget-reporter.ts', { suiteBudgetSeconds: E2E_SUITE_BUDGET_SECONDS }]],
  projects: (base.projects ?? []).filter((project) => project.name !== 'perf'),
});

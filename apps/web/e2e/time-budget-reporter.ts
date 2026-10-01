// Keeps the E2E run inside its time budget (docs/code-standards.md, "Ngân sách thời gian test"), whatever
// the game grows into: it lists the slowest tests after every run, fails a test that ran longer than
// SLOW_TEST_MS without declaring itself long (`test.setTimeout` above the default, with a comment saying
// why), and, when given a suite budget (the full `e2e:ci` run), fails the run that took longer.
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/** A test longer than this must declare a longer timeout of its own. */
export const SLOW_TEST_MS = 30_000;
/** The default per-test timeout of playwright.config.ts; a test that keeps it has not declared itself long. */
export const DEFAULT_TEST_TIMEOUT_MS = 45_000;

interface Options {
  /** Whole-run budget in seconds; absent for focused runs of a few projects. */
  suiteBudgetSeconds?: number;
}

export default class TimeBudgetReporter implements Reporter {
  private readonly runs: Array<{ title: string; ms: number; declared: boolean }> = [];
  private readonly overruns: string[] = [];
  private started = Date.now();

  constructor(private readonly options: Options = {}) {}

  onBegin(): void {
    this.started = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'skipped') return;
    const title = `${test.parent.project()?.name ?? ''} › ${test.title}`;
    const declared = test.timeout > DEFAULT_TEST_TIMEOUT_MS;
    this.runs.push({ title, ms: result.duration, declared });
    if (result.duration > SLOW_TEST_MS && !declared) this.overruns.push(`${title}: ${Math.round(result.duration / 1000)}s`);
  }

  async onEnd(result: FullResult): Promise<{ status?: FullResult['status'] } | undefined> {
    const seconds = Math.round((Date.now() - this.started) / 1000);
    const slowest = [...this.runs].sort((a, b) => b.ms - a.ms).slice(0, 10);
    console.log(`\nE2E time: ${seconds}s for ${this.runs.length} tests. Slowest:`);
    for (const r of slowest) console.log(`  ${String(Math.round(r.ms / 1000)).padStart(3)}s  ${r.title}${r.declared ? '  (declared long)' : ''}`);
    let failed = false;
    if (this.overruns.length > 0) {
      failed = true;
      console.error(`\n${this.overruns.length} test(s) ran over ${SLOW_TEST_MS / 1000}s without declaring a longer timeout (split it, cut its waits, or move the check to a Node test):`);
      for (const o of this.overruns) console.error(`  - ${o}`);
    }
    const budget = this.options.suiteBudgetSeconds;
    if (budget !== undefined && seconds > budget) {
      failed = true;
      console.error(`\nThe E2E run took ${seconds}s, over its ${budget}s budget: see docs/code-standards.md "Ngân sách thời gian test".`);
    }
    return failed && result.status === 'passed' ? { status: 'failed' } : undefined;
  }
}

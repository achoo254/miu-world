import { expect, test, type Page } from '@playwright/test';
import type { MiuStats } from '../src/game/debug/stats-overlay';

export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__miuStats?.ready === true, null, { timeout: 90_000 });
}

export async function readStats(page: Page): Promise<MiuStats> {
  const stats = await page.evaluate(() => window.__miuStats);
  if (!stats) throw new Error('window.__miuStats missing');
  return stats;
}

/**
 * The draw-call budget is measured against CI's software GL, the reference renderer: a dev machine's GPU
 * draws a scene in more calls (a Mac counts some 25 more at the play spawn), so there an overrun is noted on
 * the test instead of failing it. CI still fails on it.
 */
export function expectDrawCalls(calls: number, budget: number, what = 'draw calls'): void {
  if (process.env.CI) {
    expect(calls, what).toBeLessThanOrEqual(budget);
  } else if (calls > budget) {
    test.info().annotations.push({ type: 'draw-call budget (checked on CI)', description: `${what}: ${calls} > ${budget} on this GPU` });
  }
}

import type { Page } from '@playwright/test';
import type { MiuStats } from '../src/game/debug/stats-overlay';

export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__miuStats?.ready === true, null, { timeout: 90_000 });
}

export async function readStats(page: Page): Promise<MiuStats> {
  const stats = await page.evaluate(() => window.__miuStats);
  if (!stats) throw new Error('window.__miuStats missing');
  return stats;
}

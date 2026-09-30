// Touch input for E2E on the iPad viewport: taps through page.touchscreen, and real touch drags through
// CDP (page.touchscreen can only tap), so pointer capture and touch-action behave as on a device.
import type { Page } from '@playwright/test';

/** Taps the element, at its centre or at a point given as fractions of its size (to miss its children). */
export async function tap(page: Page, selector: string, at: { x: number; y: number } = { x: 0.5, y: 0.5 }): Promise<void> {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded(); // a tap lands on screen coordinates: bring it into view first
  const box = await target.boundingBox();
  if (!box) throw new Error(`${selector} not visible`);
  await page.touchscreen.tap(box.x + box.width * at.x, box.y + box.height * at.y);
}

export async function touchDrag(page: Page, from: string, to: string): Promise<void> {
  await page.locator(from).first().scrollIntoViewIfNeeded();
  const a = await page.locator(from).first().boundingBox();
  const b = await page.locator(to).first().boundingBox();
  if (!a || !b) throw new Error(`cannot drag ${from} → ${to}`);
  const cdp = await page.context().newCDPSession(page);
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let i = 1; i <= 6; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + ((end.x - start.x) * i) / 6, y: start.y + ((end.y - start.y) * i) / 6 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

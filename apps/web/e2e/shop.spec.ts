// Buying and wearing (mock panel 7 "Cửa hàng" over Home): the child earns coins by playing, opens the shop from Home,
// buys the cheapest thing to wear at the server's price, puts it on, and the game shows her wearing it.
import { expect, test, type Page } from '@playwright/test';
import { CH1_PLAY, freshChild } from './quest-api';
import { readStats, waitReady } from './stats';

// Its own parent and child: the coins and what she owns start from nothing.
test.use({ storageState: { cookies: [], origins: [] } });

interface ShopState {
  coins: number;
  items: Array<{ id: string; kind: string; price: number; level: number | null; category: string; slot: string | null }>;
}

const shopState = async (page: Page): Promise<ShopState> => (await (await page.context().request.get('/api/shop')).json()) as ShopState;

/** Plays chapter 1 through the API again and again (every run pays, owner 03/10/2026) until she has `coins`. */
async function earn(page: Page, baseURL: string, coins: number): Promise<number> {
  const headers = { Origin: new URL(baseURL).origin };
  for (let run = 1; run <= 10; run += 1) {
    const now = (await shopState(page)).coins;
    if (now >= coins) return now;
    for (const [step, body] of CH1_PLAY) {
      const res = await page.context().request.post(`/api/quests/forest-ch1/steps/${step}/complete`, { headers, data: { ...body, run } });
      expect(res.status(), `run ${run} ${step}: ${await res.text()}`).toBe(200);
    }
  }
  throw new Error(`ten runs of chapter 1 did not pay ${coins} coins`);
}

test('earns coins by playing, buys something to wear in the shop and wears it in the game', async ({ page, baseURL }) => {
  await freshChild(page, baseURL ?? '');
  // The cheapest thing to wear open from level 1, as the server sells it (a vehicle waits under Lái xe, not on her).
  const wearable = (await shopState(page)).items.filter((i) => i.kind === 'wearable' && i.slot !== null && i.slot !== 'vehicle' && i.level === null).sort((a, b) => a.price - b.price)[0];
  if (!wearable) throw new Error('the shop sells nothing to wear from level 1');
  const coins = await earn(page, baseURL ?? '', wearable.price);

  await page.goto('/home');
  await page.locator('[data-id="home-nav-shop"]').click();
  const shop = page.locator('[data-id="shop"]');
  await expect(shop.locator('[data-id="shop-coins"]')).toHaveText(String(coins));
  await shop.locator(`[data-id="shop-tab-${wearable.category}"]`).click();
  await shop.locator(`[data-id="shop-item-${wearable.id}"]`).click();
  await expect(shop.locator('[data-id="shop-detail"]')).toHaveAttribute('data-item', wearable.id);
  await shop.locator('[data-id="shop-buy"]').click();
  // The server took its price, and the coins on screen are the server's.
  await expect(shop.locator('[data-id="shop-coins"]')).toHaveText(String(coins - wearable.price));
  expect((await shopState(page)).coins).toBe(coins - wearable.price);
  await shop.locator('[data-id="shop-wear"]').click();
  await expect(shop.locator('[data-id="shop-notice"]')).toBeVisible();
  // Bought once: buying it again is refused by the server.
  const again = await page.context().request.post('/api/shop/buy', { headers: { Origin: new URL(baseURL ?? '').origin }, data: { itemId: wearable.id, purchaseId: crypto.randomUUID() } });
  expect(again.status()).toBe(409);

  await page.goto('/play?quality=low');
  await waitReady(page);
  expect((await readStats(page)).outfit).toContain(wearable.id);
});

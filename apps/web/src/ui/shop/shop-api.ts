// The selected child's shop on the server: what is for sale, her coins and what she owns; buying; using a
// minigame booster. Prices, balance and ownership are always the server's answer.
import { ShopBuyResponse, ShopResponse, ShopState } from '@miu/schema/shop';
import { ApiError, api, errorMessage } from '../api-client';
import { t, type TextKey } from '../i18n/i18n';

export function loadShop(): Promise<ShopResponse> {
  return api('GET', '/shop', ShopResponse);
}

/** Buys one thing; `purchaseId` is made once per tap (`requestId`) so a resend never buys twice. */
export function buyItem(itemId: string, purchaseId: string): Promise<ShopBuyResponse> {
  return api('POST', '/shop/buy', ShopBuyResponse, { itemId, purchaseId });
}

/** Uses up one booster for the round about to start; `useId` is made once per round. */
export function spendBooster(itemId: string, useId: string): Promise<ShopState> {
  return api('POST', '/shop/use', ShopState, { itemId, useId });
}

/**
 * A random version-4 UUID. `crypto.randomUUID` exists only on secure origins (not a LAN review over plain
 * http), `crypto.getRandomValues` everywhere.
 */
export function requestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** What the shop's refusals say to a child (everything else: the app's usual messages). */
const SHOP_MESSAGES: Readonly<Record<string, TextKey>> = {
  'not-enough-coins': 'shop.err.notEnough',
  'already-owned': 'shop.err.owned',
  'shop-level-locked': 'shop.err.level',
  'too-many': 'shop.err.tooMany',
  'not-owned': 'shop.err.notOwned',
  'decor-locked': 'shop.err.decor',
};

export function shopErrorMessage(err: unknown): string {
  const key = err instanceof ApiError ? SHOP_MESSAGES[err.code] : undefined;
  return key ? t(key) : errorMessage(err);
}

import { describe, expect, it } from 'vitest';
import { ShopBuyRequest, ShopFile, buildShopCatalog, type ShopContext } from './shop';

const context: ShopContext = {
  wearables: new Map([
    ['hat-night', { shopOnly: true }],
    ['hat-free', { shopOnly: false }],
  ]),
  decor: new Map([
    ['bed-pink', { isDefault: true }],
    ['bed-rainbow', { isDefault: false }],
  ]),
  icons: new Set(['heart', 'gift']),
};

const heart = { kind: 'booster', id: 'them-mot-tim', name: 'Thêm một tim', description: 'Một tim nữa.', icon: 'heart', effect: { lives: 1 }, price: 50 } as const;
const files = (...extra: unknown[]): ShopFile[] =>
  [
    { category: 'trang-phuc', items: [{ kind: 'wearable', id: 'hat-night', price: 150 }] },
    { category: 'nha-cua', items: [{ kind: 'decor', id: 'bed-rainbow', price: 120 }] },
    { category: 'tieu-hao', items: [heart] },
    ...extra,
  ].map((f) => ShopFile.parse(f));

describe('shop catalogue', () => {
  it('lists every thing with its category when it fits the content', () => {
    const bundle = { kind: 'bundle', id: 'goi-thu', name: 'Gói thử', description: 'Rẻ hơn.', icon: 'gift', contains: { 'hat-night': 1, 'them-mot-tim': 2 }, price: 200 };
    const { listings, issues } = buildShopCatalog(files({ category: 'goi-dac-biet', items: [bundle] }), context);
    expect(issues).toEqual([]);
    expect([...listings.values()].map((l) => [l.id, l.category])).toEqual([
      ['hat-night', 'trang-phuc'],
      ['bed-rainbow', 'nha-cua'],
      ['them-mot-tim', 'tieu-hao'],
      ['goi-thu', 'goi-dac-biet'],
    ]);
  });

  it.each([
    ['a free wearable', { category: 'phu-kien', items: [{ kind: 'wearable', id: 'hat-free', price: 80 }] }, /must say "unlock": \{ "shop": true \}/],
    ['an unknown wearable', { category: 'phu-kien', items: [{ kind: 'wearable', id: 'hat-ghost', price: 80 }] }, /not a wearable/],
    ['a default home style', { category: 'nha-cua', items: [{ kind: 'decor', id: 'bed-pink', price: 80 }] }, /default style, which stays free/],
    ['a thing under the wrong tab', { category: 'phu-kien', items: [{ kind: 'decor', id: 'bed-pink', price: 80 }] }, /cannot be sold under phu-kien/],
    ['an id twice', { category: 'tieu-hao', items: [heart] }, /listed twice/],
    ['an unknown picture', { category: 'tieu-hao', items: [{ ...heart, id: 'them-gio', icon: 'rocket' }] }, /unknown picture rocket/],
    ['a bundle that costs as much as its things', { category: 'goi-dac-biet', items: [{ kind: 'bundle', id: 'g', name: 'G', description: 'G', icon: 'gift', contains: { 'hat-night': 1, 'them-mot-tim': 1 }, price: 200 }] }, /not less than/],
    ['a bundle of two hats alike', { category: 'goi-dac-biet', items: [{ kind: 'bundle', id: 'g', name: 'G', description: 'G', icon: 'gift', contains: { 'hat-night': 2, 'them-mot-tim': 1 }, price: 60 }] }, /owned once/],
    ['a bundle of something not for sale', { category: 'goi-dac-biet', items: [{ kind: 'bundle', id: 'g', name: 'G', description: 'G', icon: 'gift', contains: { 'hat-free': 1, 'them-mot-tim': 1 }, price: 60 }] }, /does not sell/],
  ])('reports %s', (_, extra, message) => {
    expect(buildShopCatalog(files(extra), context).issues.join('\n')).toMatch(message);
  });

  it('reports a shop-only wearable the shop forgot to sell', () => {
    const issues = buildShopCatalog(files().slice(1), context).issues;
    expect(issues).toEqual(['accessory hat-night opens in the shop but the shop does not sell it']);
  });

  it('keeps prices between 50 and 500 Xu', () => {
    expect(() => ShopFile.parse({ category: 'tieu-hao', items: [{ ...heart, price: 10 }] })).toThrow();
    expect(() => ShopFile.parse({ category: 'tieu-hao', items: [{ ...heart, price: 600 }] })).toThrow();
  });
});

describe('buy request', () => {
  it('takes the item and a purchase id, and drops whatever price the client adds', () => {
    const purchaseId = '3f2b8c1e-5d4a-4b6f-9e2d-1a2b3c4d5e6f';
    expect(ShopBuyRequest.parse({ itemId: 'hat-night', purchaseId, price: 1 })).toEqual({ itemId: 'hat-night', purchaseId });
    expect(() => ShopBuyRequest.parse({ itemId: 'hat-night', purchaseId: 'once' })).toThrow();
  });
});

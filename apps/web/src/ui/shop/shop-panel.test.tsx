import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShopItemDto } from '@miu/schema/shop';
import type { GameStore } from '../../game-bridge/game-store';
import { ShopPanel } from './shop-panel';

// jsdom has no WebGL: the 3D preview is a stand-in that only says it is ready.
vi.mock('../../game/preview/character-preview', () => ({
  EMOTES: ['wave', 'jump', 'yawn', 'cheer'],
  CharacterPreview: class {
    constructor(
      _host: HTMLElement,
      private readonly options: { store: GameStore },
    ) {}
    async start() {
      this.options.store.emit({ type: 'ready' });
    }
    playEmote() {}
    dispose() {}
  },
}));

const item = (over: Partial<ShopItemDto> & Pick<ShopItemDto, 'id' | 'kind' | 'category' | 'price'>): ShopItemDto => ({
  name: over.id,
  description: null,
  level: null,
  featured: false,
  slot: null,
  swatch: null,
  icon: null,
  effect: null,
  contains: null,
  ...over,
});
const HAT = item({ id: 'hat-witch-galaxy', kind: 'wearable', category: 'trang-phuc', price: 160, slot: 'hat', name: 'Mũ phù thủy ngân hà', featured: true, description: 'Hợp với {name} lắm!' });
const WINGS = item({ id: 'wings-butterfly-galaxy', kind: 'wearable', category: 'phu-kien', price: 300, slot: 'wings', name: 'Cánh bướm ngân hà' });
const BED = item({ id: 'bed-rainbow', kind: 'decor', category: 'nha-cua', price: 120, slot: 'bed', swatch: ['#ef6f6c', '#f2d14c'], name: 'Cầu vồng' });
const HEART = item({ id: 'them-mot-tim', kind: 'booster', category: 'tieu-hao', price: 50, icon: 'heart', effect: { lives: 1 }, name: 'Thêm một tim', featured: true });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function shopApi({ coins = 500, owned = {} as Record<string, number>, buyStatus = 200 } = {}) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  let state = { coins, level: 3, owned };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, body });
      if (url === '/api/shop') return json({ ...state, items: [HAT, WINGS, BED, HEART] });
      if (url === '/api/character' && method === 'PUT') return json({ species: 'cat', pet: null, ...(body as object) });
      if (url === '/api/character') return json({ species: 'cat', name: 'Mun', equipped: ['clothes-tshirt'], pet: null });
      if (url === '/api/shop/buy') {
        if (buyStatus !== 200) return json({ error: 'not-enough-coins' }, buyStatus);
        const { itemId } = body as { itemId: string };
        const price = [HAT, WINGS, BED, HEART].find((i) => i.id === itemId)?.price ?? 0;
        state = { ...state, coins: state.coins - price, owned: { ...state.owned, [itemId]: (state.owned[itemId] ?? 0) + 1 } };
        return json({ ...state, bought: itemId });
      }
      return json({ error: 'not-found' }, 404);
    }),
  );
  return { calls };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const byId = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
  if (!el) throw new Error(`no element with data-id ${id}`);
  return el;
};

describe('ShopPanel', () => {
  it('opens on the featured things with her coins, and each tab lists its category with prices', async () => {
    shopApi({ coins: 420 });
    render(<ShopPanel onClose={() => undefined} />);
    expect(await screen.findByText('Cửa hàng của Mun')).toBeTruthy();
    expect(byId('shop-coins').textContent).toContain('420');
    expect(byId('shop-grid').querySelectorAll('.shop-card')).toHaveLength(2);
    fireEvent.click(byId('shop-tab-nha-cua'));
    expect(byId('shop-item-bed-rainbow').textContent).toContain('120');
    expect(document.querySelector('[data-id="shop-item-hat-witch-galaxy"]')).toBeNull();
  });

  it('buys at the tap of "Mua ngay" with a purchase id and no price, then offers to wear it', async () => {
    const { calls } = shopApi({ coins: 500 });
    const onCoins = vi.fn();
    const onWear = vi.fn();
    render(<ShopPanel onClose={() => undefined} onCoins={onCoins} onWear={onWear} />);
    fireEvent.click(await screen.findByText('Mũ phù thủy ngân hà'));
    expect(byId('shop-detail').textContent).toContain('Hợp với Mun lắm!');
    fireEvent.click(byId('shop-buy'));
    await vi.waitFor(() => expect(onCoins).toHaveBeenCalledWith(340));
    const buy = calls.find((c) => c.url === '/api/shop/buy');
    expect(buy?.body).toEqual({ itemId: HAT.id, purchaseId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/) as unknown });
    expect(byId('shop-coins').textContent).toContain('340');
    expect(byId('shop-detail-owned')).toBeTruthy();
    fireEvent.click(byId('shop-wear'));
    await vi.waitFor(() => expect(onWear).toHaveBeenCalledWith(['clothes-tshirt', HAT.id]));
    expect(calls.find((c) => c.url === '/api/character' && c.method === 'PUT')?.body).toEqual({ name: 'Mun', equipped: ['clothes-tshirt', HAT.id] });
  });

  it('says kindly how to earn more when the coins are short, without asking the server', async () => {
    const { calls } = shopApi({ coins: 100 });
    render(<ShopPanel onClose={() => undefined} />);
    fireEvent.click(await screen.findByText('Phụ kiện'));
    fireEvent.click(byId('shop-item-wings-butterfly-galaxy'));
    fireEvent.click(byId('shop-buy'));
    expect(byId('shop-notice').textContent).toContain('còn thiếu 200 xu');
    expect(byId('shop-notice').textContent).toContain('nhiệm vụ');
    expect(calls.some((c) => c.url === '/api/shop/buy')).toBe(false);
  });

  it('shows what she owns as owned, boosters by how many she has, and the server refusing kindly', async () => {
    shopApi({ coins: 500, owned: { [HAT.id]: 1, [HEART.id]: 2 }, buyStatus: 409 });
    render(<ShopPanel onClose={() => undefined} />);
    expect((await screen.findByText('Mũ phù thủy ngân hà')).closest('button')?.textContent).toContain('Đã có');
    expect(byId('shop-item-them-mot-tim').textContent).toContain('Có 2');
    fireEvent.click(byId('shop-item-them-mot-tim'));
    fireEvent.click(byId('shop-buy'));
    expect(await screen.findByText(/Chưa đủ xu rồi/)).toBeTruthy();
  });
});

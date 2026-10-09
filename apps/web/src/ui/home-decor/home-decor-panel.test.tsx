import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDecor } from '@miu/schema/home-decor';
import { DECOR_CATALOG, changedPicks } from './decor-catalog';
import { HomeDecorPanel } from './home-decor-panel';

const DEFAULTS = resolveDecor(DECOR_CATALOG);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Answers GET /api/home-decor with `stored` and every PUT as the server would (merged, every slot named). */
function decorApi(stored: Record<string, string> | (() => Response), shop?: { prices: Record<string, number>; owned: string[] }) {
  const puts: unknown[] = [];
  let now = typeof stored === 'function' ? DEFAULTS : stored;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/shop' && shop) {
        const items = Object.entries(shop.prices).map(([id, price]) => ({ id, kind: 'decor', category: 'nha-cua', name: id, description: null, price, level: null, featured: false, slot: null, swatch: null, icon: null, effect: null, contains: null }));
        return json({ coins: 0, level: 1, owned: Object.fromEntries(shop.owned.map((id) => [id, 1])), items });
      }
      if (url !== '/api/home-decor') return json({ error: 'not-found' }, 404);
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as { choices: Record<string, string> };
        puts.push(body);
        now = { ...now, ...body.choices };
        return json({ choices: now });
      }
      return typeof stored === 'function' ? stored() : json({ choices: now });
    }),
  );
  return { puts };
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
const firstOther = (slotId: string): string => {
  const slot = DECOR_CATALOG.slots.find((s) => s.id === slotId);
  const option = slot?.options.find((o) => o.id !== slot.default);
  if (!option) throw new Error(`no other option for ${slotId}`);
  return option.id;
};

describe('HomeDecorPanel', () => {
  it('shows the inside pieces first, each with its styles, the saved pick marked and the house style labelled', async () => {
    decorApi({ ...DEFAULTS, bed: firstOther('bed') });
    render(<HomeDecorPanel onClose={() => undefined} onSaved={() => undefined} />);
    expect(await screen.findByRole('dialog', { name: 'Trang trí nhà' })).toBeTruthy();
    await screen.findByText('Giường');
    const inside = DECOR_CATALOG.slots.filter((s) => s.side === 'inside');
    for (const slot of inside) expect(byId(`decor-slot-${slot.id}`).textContent).toBe(slot.name);
    expect(document.querySelector('[data-id="decor-slot-house"]')).toBeNull();
    expect(byId(`decor-option-${firstOther('bed')}`).getAttribute('aria-pressed')).toBe('true');
    expect(byId('decor-option-bed-pink').getAttribute('aria-pressed')).toBe('false');
    expect(byId('decor-option-bed-pink').textContent).toContain('Kiểu có sẵn');
    expect(byId('decor-options-bed').querySelectorAll('button').length).toBeGreaterThanOrEqual(6);
  });

  it('saves only the pieces changed, outside ones too, then hands back what the server kept', async () => {
    const { puts } = decorApi(DEFAULTS);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<HomeDecorPanel onClose={onClose} onSaved={onSaved} />);
    await screen.findByText('Giường');
    fireEvent.click(byId('decor-slot-rug'));
    fireEvent.click(byId(`decor-option-${firstOther('rug')}`));
    fireEvent.click(byId('decor-side-outside'));
    fireEvent.click(byId('decor-slot-house'));
    fireEvent.click(byId(`decor-option-${firstOther('house')}`));
    expect(byId('decor-save').textContent).toBe('Lưu');
    fireEvent.click(byId('decor-save'));
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(puts).toEqual([{ choices: { rug: firstOther('rug'), house: firstOther('house') } }]);
    expect(onSaved).toHaveBeenCalledWith({ ...DEFAULTS, rug: firstOther('rug'), house: firstOther('house') });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes without a save when nothing changed, and keeps the picks to retry when saving fails', async () => {
    const { puts } = decorApi(DEFAULTS);
    const onClose = vi.fn();
    render(<HomeDecorPanel onClose={onClose} onSaved={() => undefined} />);
    await screen.findByText('Giường');
    expect(byId('decor-save').textContent).toBe('Xong');
    fireEvent.click(byId('decor-save'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(puts).toEqual([]);
    cleanup();

    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'PUT' ? json({ error: 'internal' }, 500) : json({ choices: DEFAULTS }))),
    );
    const onSaved = vi.fn();
    render(<HomeDecorPanel onClose={() => undefined} onSaved={onSaved} />);
    await screen.findByText('Giường');
    fireEvent.click(byId(`decor-option-${firstOther('bed')}`));
    fireEvent.click(byId('decor-save'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
    expect(byId(`decor-option-${firstOther('bed')}`).getAttribute('aria-pressed')).toBe('true');
  });

  it('shows the styles sold in the shop locked with their price until bought; a saved one stays hers', async () => {
    const bed = DECOR_CATALOG.slots.find((s) => s.id === 'bed')?.options.filter((o) => o.souvenir === undefined) ?? [];
    const [sold, bought, kept] = bed.slice(-3).map((o) => o.id);
    if (!sold || !bought || !kept) throw new Error('the bed needs three styles');
    const { puts } = decorApi({ ...DEFAULTS, bed: kept }, { prices: { [sold]: 120, [bought]: 100, [kept]: 80 }, owned: [bought] });
    render(<HomeDecorPanel onClose={() => undefined} onSaved={() => undefined} />);
    await screen.findByText('Giường');
    await vi.waitFor(() => expect(byId(`decor-price-${sold}`).textContent).toContain('120'));
    expect(document.querySelector(`[data-id="decor-price-${bought}"]`)).toBeNull();
    expect(document.querySelector(`[data-id="decor-price-${kept}"]`)).toBeNull();
    fireEvent.click(byId(`decor-option-${sold}`));
    expect(byId(`decor-option-${sold}`).getAttribute('aria-pressed')).toBe('false');
    expect(byId('decor-hint').textContent).toContain('Cửa hàng');
    fireEvent.click(byId(`decor-option-${bought}`));
    fireEvent.click(byId('decor-save'));
    await vi.waitFor(() => expect(puts).toEqual([{ choices: { bed: bought } }]));
  });

  it("shows another map's souvenir locked with the map's name until brought home, and the way there", async () => {
    const slot = DECOR_CATALOG.slots.find((s) => s.side === 'inside' && s.options.some((o) => o.souvenir !== undefined));
    const souvenir = slot?.options.find((o) => o.souvenir !== undefined);
    if (!slot || !souvenir?.souvenir) throw new Error('no inside piece has a souvenir');
    decorApi(DEFAULTS, { prices: {}, owned: [] });
    render(
      <MemoryRouter>
        <HomeDecorPanel onClose={() => undefined} onSaved={() => undefined} />
      </MemoryRouter>,
    );
    await screen.findByText('Giường');
    fireEvent.click(byId(`decor-slot-${slot.id}`));
    await vi.waitFor(() => expect(document.querySelector(`[data-id="decor-souvenir-${souvenir.id}"]`)).toBeTruthy());
    fireEvent.click(byId(`decor-option-${souvenir.id}`));
    expect(byId(`decor-option-${souvenir.id}`).getAttribute('aria-pressed')).toBe('false');
    expect(byId('decor-hint').textContent).toContain('rương nửa đường');
    expect(byId('decor-souvenir-go').getAttribute('href')).toBe(`/region/${souvenir.souvenir}`);
  });

  it('lets her pick a souvenir she brought home', async () => {
    const slot = DECOR_CATALOG.slots.find((s) => s.side === 'inside' && s.options.some((o) => o.souvenir !== undefined));
    const souvenir = slot?.options.find((o) => o.souvenir !== undefined);
    if (!slot || !souvenir) throw new Error('no inside piece has a souvenir');
    const { puts } = decorApi(DEFAULTS, { prices: {}, owned: [souvenir.id] });
    render(<HomeDecorPanel onClose={() => undefined} onSaved={() => undefined} />);
    await screen.findByText('Giường');
    fireEvent.click(byId(`decor-slot-${slot.id}`));
    await vi.waitFor(() => expect(document.querySelector(`[data-id="decor-souvenir-${souvenir.id}"]`)).toBeNull());
    fireEvent.click(byId(`decor-option-${souvenir.id}`));
    fireEvent.click(byId('decor-save'));
    await vi.waitFor(() => expect(puts).toEqual([{ choices: { [slot.id]: souvenir.id } }]));
  });

  it('offers a retry when the picks cannot be read', async () => {
    let fail = true;
    decorApi(() => (fail ? json({ error: 'internal' }, 500) : json({ choices: DEFAULTS })));
    render(<HomeDecorPanel onClose={() => undefined} onSaved={() => undefined} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    fail = false;
    fireEvent.click(byId('decor-retry'));
    expect(await screen.findByText('Giường')).toBeTruthy();
  });
});

describe('changedPicks', () => {
  it('keeps only the slots whose pick differs from what is saved', () => {
    expect(changedPicks({ bed: 'a', rug: 'b' }, { bed: 'a', rug: 'c', lamp: 'd' })).toEqual({ rug: 'c', lamp: 'd' });
  });
});

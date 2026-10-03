import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDecor } from '@miu/schema/home-decor';
import { DECOR_CATALOG, changedPicks } from './decor-catalog';
import { HomeDecorPanel } from './home-decor-panel';

const DEFAULTS = resolveDecor(DECOR_CATALOG);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Answers GET /api/home-decor with `stored` and every PUT as the server would (merged, every slot named). */
function decorApi(stored: Record<string, string> | (() => Response)) {
  const puts: unknown[] = [];
  let now = typeof stored === 'function' ? DEFAULTS : stored;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
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

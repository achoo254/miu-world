import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameCommand, GameStore } from '../../game-bridge/game-store';
import { CreatorScreen } from './creator-screen';

// jsdom has no WebGL: the preview is replaced by a stand-in that records its life and commands.
const previews = vi.hoisted(() => ({ live: 0, commands: [] as GameCommand[], emotes: [] as string[], species: [] as string[] }));
vi.mock('../../game/preview/character-preview', () => ({
  EMOTES: ['wave', 'jump', 'yawn', 'cheer'],
  CharacterPreview: class {
    private off: (() => void) | null = null;
    constructor(
      _host: HTMLElement,
      private readonly options: { store: GameStore; species: string },
    ) {}
    async start() {
      previews.live += 1;
      previews.species.push(this.options.species);
      this.off = this.options.store.onCommand((c) => previews.commands.push(c));
      this.options.store.emit({ type: 'ready' });
    }
    playEmote(emote: string) {
      previews.emotes.push(emote);
    }
    dispose() {
      if (this.off) previews.live -= 1;
      this.off?.();
      this.off = null;
    }
  },
}));

const puts: unknown[] = [];
function stubApi({ level = 1, completed = [] as string[] } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
      if (url === '/api/character' && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as { name: string; equipped: string[] };
        puts.push(body);
        return json({ species: 'cat', ...body });
      }
      if (url === '/api/character') return json({ species: 'cat', name: 'Miu', equipped: [], pet: null });
      if (url === '/api/progress') {
        return json({
          quests: completed.map((questId) => ({ questId, completedSteps: [], completed: true, found: {}, stars: 3 })),
          xp: 0, level, xpIntoLevel: 0, xpForNextLevel: 100, coins: 0, skillXp: {}, items: {}, subjects: [],
        });
      }
      if (url === '/api/quests') return json({ quests: [] });
      return json({ error: 'not-found' }, 404);
    }),
  );
}

function renderCreator() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={['/create']}>
        <Routes>
          <Route path="/create" element={<CreatorScreen />} />
          <Route path="/home" element={<p>Trang chủ</p>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  previews.commands.length = 0;
  previews.emotes.length = 0;
  previews.species.length = 0;
  puts.length = 0;
});

describe('Character Creator', () => {
  it('offers every species from content, marking the one the character already is', async () => {
    stubApi();
    renderCreator();
    expect(await screen.findByRole('button', { name: /Mèo/ })).toBeTruthy();
    for (const [name, trait] of [['Mèo', 'Dễ thương'], ['Thỏ', 'Nhanh nhẹn'], ['Cáo', 'Thông minh'], ['Gấu', 'Hiền lành']] as const) {
      const card = screen.getByRole('button', { name: new RegExp(name) });
      expect((card as HTMLButtonElement).disabled).toBe(false);
      expect(card.textContent).toContain(trait);
    }
    expect(screen.getByRole('button', { name: /Mèo/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Cáo/ }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByText('Sắp có')).toBeNull();
  });

  it('previews the picked animal, keeps name and outfit when going back to pick another, and saves the species', async () => {
    stubApi();
    renderCreator();
    fireEvent.click(await screen.findByRole('button', { name: /Thỏ/ }));
    await vi.waitFor(() => expect(previews.species.at(-1)).toBe('rabbit'));
    fireEvent.click(screen.getByRole('button', { name: /Mũ lưỡi trai vàng/ }));
    fireEvent.change(screen.getByLabelText('Tên nhân vật'), { target: { value: 'Bo' } });

    fireEvent.click(screen.getByRole('button', { name: 'Đổi nhân vật' }));
    fireEvent.click(await screen.findByRole('button', { name: /Gấu/ }));
    await vi.waitFor(() => expect(previews.species.at(-1)).toBe('bear'));
    expect((screen.getByLabelText('Tên nhân vật') as HTMLSelectElement).value).toBe('Bo');
    expect(screen.getByRole('button', { name: /Mũ lưỡi trai vàng/ }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /Vào thế giới/ }));
    expect(await screen.findByText('Trang chủ')).toBeTruthy();
    expect(puts).toEqual([{ name: 'Bo', equipped: ['hat-cap-yellow'], species: 'bear', pet: null }]);
  });

  it('sends every outfit change to the one live preview, locks what is not earned, and saves name and outfit', async () => {
    stubApi();
    const view = renderCreator();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo/ }));
    await vi.waitFor(() => expect(previews.live).toBe(1)); // StrictMode mounted twice; one survives

    fireEvent.click(screen.getByRole('button', { name: /Mũ lưỡi trai vàng/ }));
    expect(previews.commands.at(-1)).toEqual({ type: 'set-outfit', equipped: ['hat-cap-yellow'] });
    fireEvent.click(screen.getByRole('button', { name: /Mũ phù thủy hồng/ }));
    expect(previews.commands.at(-1)).toEqual({ type: 'set-outfit', equipped: ['hat-witch-pink'] }); // one hat at a time

    const night = screen.getByRole('button', { name: /Mũ phù thủy đêm sao/ });
    expect((night as HTMLButtonElement).disabled).toBe(true);
    expect(night.textContent).toContain('Cần Lv.2');
    expect(screen.getByRole('button', { name: /Vòng hoa/ }).textContent).toContain('Xong “forest-ch1”');

    fireEvent.click(screen.getByRole('tab', { name: 'Balo' }));
    fireEvent.click(screen.getByRole('button', { name: /Balo xanh lá/ }));
    expect(previews.commands.at(-1)).toEqual({ type: 'set-outfit', equipped: ['hat-witch-pink', 'backpack-green'] });
    expect(document.querySelector('[data-id^="creator-slot-coming"]')).toBeNull(); // every tab works, clothes too

    fireEvent.click(screen.getByRole('button', { name: 'Vui mừng' }));
    expect(previews.emotes).toEqual(['cheer']);
    expect(screen.getByText('Nhà thám hiểm')).toBeTruthy();

    // A fresh character has no name yet ("Miu" is the game's name): saving waits for a pick.
    expect((screen.getByLabelText('Tên nhân vật') as HTMLSelectElement).value).toBe('');
    expect((screen.getByRole('button', { name: /Vào thế giới/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Tên nhân vật'), { target: { value: 'Mochi' } });
    fireEvent.click(screen.getByRole('button', { name: /Vào thế giới/ }));
    expect(await screen.findByText('Trang chủ')).toBeTruthy();
    expect(puts).toEqual([{ name: 'Mochi', equipped: ['hat-witch-pink', 'backpack-green'], species: 'cat', pet: null }]);
    view.unmount();
    expect(previews.live).toBe(0);
  });

  it('offers at least 20 open items with a picture in every slot from level 1, and wears one of each', async () => {
    stubApi();
    renderCreator();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo/ }));
    const picks: Record<string, RegExp> = {
      Mũ: /Nón lá nơ đỏ/,
      Kính: /Kính tròn đen/,
      Khăn: /Khăn quàng đỏ/,
      Balo: /Cặp sách xanh/,
      Cánh: /Cánh bướm hồng/,
      Giày: /Giày thể thao đỏ/,
      'Cầm tay': /Đèn ông sao đỏ/,
    };
    for (const [tab, item] of Object.entries(picks)) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      const tiles = screen.getAllByRole('button').filter((b) => b.dataset.id?.startsWith('creator-item-') && !b.dataset.id.startsWith('creator-item-none'));
      expect(tiles.filter((t) => !(t as HTMLButtonElement).disabled).length).toBeGreaterThanOrEqual(20);
      expect(tiles.every((t) => t.querySelector('img.item-art')?.getAttribute('src')?.startsWith('/game-assets/generated/accessories/'))).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: item }));
    }
    expect(previews.commands.at(-1)).toEqual({
      type: 'set-outfit',
      equipped: ['hat-non-la-red', 'glasses-round-black', 'scarf-pioneer', 'back-school-blue', 'wings-butterfly-pink', 'shoes-sneaker-red', 'hand-lantern-red'],
    });
  });

  it('dresses the animal in its own clothes until the child picks others, and never leaves it without clothes', async () => {
    stubApi();
    renderCreator();
    fireEvent.click(await screen.findByRole('button', { name: /Thỏ/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Quần áo' }));
    expect(document.querySelector('[data-id="creator-item-none-clothes"]')).toBeNull();
    expect(screen.getByRole('button', { name: /Quần yếm xanh dương/ }).getAttribute('aria-pressed')).toBe('true');
    const tiles = screen.getAllByRole('button').filter((b) => b.dataset.id?.startsWith('creator-item-clothes-'));
    expect(tiles.filter((t) => !(t as HTMLButtonElement).disabled).length).toBeGreaterThanOrEqual(10);
    expect(tiles.every((t) => t.querySelector('img.item-art')?.getAttribute('src')?.startsWith('/game-assets/generated/accessories/clothes-'))).toBe(true);
    const aoDai = screen.getByRole('button', { name: /Áo dài cách tân đỏ/ });
    expect((aoDai as HTMLButtonElement).disabled).toBe(true);
    expect(aoDai.textContent).toContain('Cần Lv.5');

    fireEvent.click(screen.getByRole('button', { name: /Đồng phục học sinh/ }));
    expect(previews.commands.at(-1)).toEqual({ type: 'set-outfit', equipped: ['clothes-school-uniform'] });
    expect(screen.getByRole('button', { name: /Đồng phục học sinh/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Quần yếm xanh dương/ }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.change(screen.getByLabelText('Tên nhân vật'), { target: { value: 'Bo' } });
    fireEvent.click(screen.getByRole('button', { name: /Vào thế giới/ }));
    expect(await screen.findByText('Trang chủ')).toBeTruthy();
    expect(puts).toEqual([{ name: 'Bo', equipped: ['clothes-school-uniform'], species: 'rabbit', pet: null }]);
  });

  it('opens items once the level or quest is reached', async () => {
    stubApi({ level: 2, completed: ['forest-ch1'] });
    renderCreator();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo/ }));
    expect((screen.getByRole('button', { name: /Mũ phù thủy đêm sao/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /Vòng hoa/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

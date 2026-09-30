import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameCommand, GameStore } from '../../game-bridge/game-store';
import { CreatorScreen } from './creator-screen';

// jsdom has no WebGL: the preview is replaced by a stand-in that records its life and commands.
const previews = vi.hoisted(() => ({ live: 0, commands: [] as GameCommand[], emotes: [] as string[] }));
vi.mock('../../game/preview/character-preview', () => ({
  EMOTES: ['wave', 'jump', 'yawn', 'cheer'],
  CharacterPreview: class {
    private off: (() => void) | null = null;
    constructor(
      _host: HTMLElement,
      private readonly options: { store: GameStore },
    ) {}
    async start() {
      previews.live += 1;
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
      if (url === '/api/character') return json({ species: 'cat', name: 'Miu', equipped: [] });
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
  puts.length = 0;
});

describe('Character Creator', () => {
  it('opens only the cat; the other species say "Sắp có"', async () => {
    stubApi();
    renderCreator();
    expect(await screen.findByRole('button', { name: /Mèo/ })).toBeTruthy();
    for (const locked of ['rabbit', 'fox', 'bear']) {
      expect(document.querySelector(`[data-id="creator-species-${locked}"]`)?.getAttribute('aria-disabled')).toBe('true');
    }
    expect(screen.getAllByText('Sắp có')).toHaveLength(3);
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
    expect(document.querySelector('[data-id="creator-slot-coming-Cánh"]')?.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Vui mừng' }));
    expect(previews.emotes).toEqual(['cheer']);
    expect(screen.getByText('Nhà thám hiểm')).toBeTruthy();

    // A fresh character has no name yet ("Miu" is the game's name): saving waits for a pick.
    expect((screen.getByLabelText('Tên nhân vật') as HTMLSelectElement).value).toBe('');
    expect((screen.getByRole('button', { name: /Vào thế giới/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Tên nhân vật'), { target: { value: 'Mochi' } });
    fireEvent.click(screen.getByRole('button', { name: /Vào thế giới/ }));
    expect(await screen.findByText('Trang chủ')).toBeTruthy();
    expect(puts).toEqual([{ name: 'Mochi', equipped: ['hat-witch-pink', 'backpack-green'] }]);
    view.unmount();
    expect(previews.live).toBe(0);
  });

  it('opens items once the level or quest is reached', async () => {
    stubApi({ level: 2, completed: ['forest-ch1'] });
    renderCreator();
    fireEvent.click(await screen.findByRole('button', { name: /Mèo/ }));
    expect((screen.getByRole('button', { name: /Mũ phù thủy đêm sao/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /Vòng hoa/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

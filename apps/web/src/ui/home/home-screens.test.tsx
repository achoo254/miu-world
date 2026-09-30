import { Profiler, act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterDto } from '@miu/schema/game';
import { createGameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { Hud } from '../hud/hud';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { RegionMapScreen, RegionScreen } from '../region/region-screens';
import { HomeScreen } from './home-screen';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [] };

function stubServer(done = 1) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = url === '/api/character' ? CHARACTER : url === '/api/progress' ? PROGRESS : url === '/api/quests' ? questList(done) : null;
      return new Response(JSON.stringify(body ?? { error: 'not-found' }), { status: body ? 200 : 404 });
    }),
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/map" element={<RegionMapScreen />} />
        <Route path="/region/:regionId" element={<RegionScreen />} />
        <Route path="/play" element={<p>Trong game</p>} />
        <Route path="/create" element={<p>Tạo nhân vật</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Home', () => {
  it('shows the server numbers, today\'s quest in the child\'s name, and which regions are open', async () => {
    stubServer(1);
    renderAt('/home');
    expect(await screen.findByText('Mochi')).toBeTruthy();
    expect(screen.getByText('Lv.1')).toBeTruthy();
    expect(screen.getByText('40/100 XP')).toBeTruthy();
    expect(document.querySelector('[data-id="player-coins"]')?.textContent).toContain('12');
    expect(document.querySelector('[data-id="home-today-quest"]')?.textContent).toBe('Chương 1: Cứu cây cổ thụ');
    expect(screen.getByText('Mochi đi tìm Lá thần.')).toBeTruthy();
    expect(screen.getByText('Hoàn thành 1/2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Chơi tiếp' }).getAttribute('href')).toBe('/play?region=khu-rung-bi-mat&quest=forest-ch1');

    // Region hotspots: the forest opens; "Nhà của {name}" uses the character name; others are locked.
    expect((screen.getByRole('button', { name: /Khu rừng bí mật/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /Nhà của Mochi/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Đảo bí ẩn/ }).textContent).toContain('Cần Lv.15');
    expect(document.body.textContent).not.toMatch(/Kim cương|chuỗi ngày/i);
  });

  it('opens settings with sound and a way back to the Character Creator', async () => {
    stubServer();
    renderAt('/home');
    fireEvent.click(await screen.findByRole('button', { name: /Cài đặt/ }));
    expect(screen.getByRole('dialog', { name: 'Cài đặt' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: /Sửa nhân vật/ }));
    expect(await screen.findByText('Tạo nhân vật')).toBeTruthy();
  });
});

describe('Map and region', () => {
  it('lists regions, with the locked ones not clickable', async () => {
    stubServer();
    renderAt('/map');
    expect(await screen.findByRole('link', { name: /Khu rừng bí mật/ })).toBeTruthy();
    expect(document.querySelector('[data-id="map-region-truong-hoc"]')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('shows chapters with progress: chapter 1 playable, chapter 2 coming soon until chapter 1 is done', async () => {
    stubServer(1);
    renderAt('/region/khu-rung-bi-mat');
    expect(await screen.findByRole('heading', { name: 'Chương 1' })).toBeTruthy();
    expect(screen.getByText('Đang làm · Hoàn thành 1/2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Khám phá ngay' }).getAttribute('href')).toBe('/play?region=khu-rung-bi-mat&quest=forest-ch1');
    expect(document.querySelector('[data-id="region-quest-forest-ch2"]')?.textContent).toContain('Sắp có');
    fireEvent.click(screen.getByRole('link', { name: 'Khám phá ngay' }));
    expect(await screen.findByText('Trong game')).toBeTruthy();
  });

  it('refuses a region that is not open', async () => {
    stubServer();
    renderAt('/region/lau-dai');
    expect(await screen.findByText('Khu vực này chưa mở.')).toBeTruthy();
  });
});

describe('HUD', () => {
  const data: PlayerData = { character: CHARACTER, progress: PROGRESS, quests: questList(1).quests };

  it('offers "Quay lại" only while Miu is stuck, and sends the rescue', () => {
    const store = createGameStore();
    const sent: string[] = [];
    store.onCommand((c) => sent.push(c.type));
    render(
      <MemoryRouter>
        <GameStoreContext.Provider value={store}>
          <Hud data={data} quest={data.quests[0] ?? null} onMenu={() => undefined} onBackpack={() => undefined} />
        </GameStoreContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /Quay lại/ })).toBeNull();
    act(() => store.emit({ type: 'stuck', stuck: true }));
    fireEvent.click(screen.getByRole('button', { name: /Quay lại/ }));
    expect(sent).toEqual(['rescue']);
    act(() => store.emit({ type: 'stuck', stuck: false }));
    expect(screen.queryByRole('button', { name: /Quay lại/ })).toBeNull();
  });

  it('says where to walk when the next step waits at another place', () => {
    const [first, ...rest] = questList(1).quests;
    if (!first || first.quest.status !== 'active') throw new Error('fixture has an active first quest');
    const steps = first.quest.steps.map((step, i) => (i === 1 ? { ...step, goTo: 'Ra bãi cỏ tìm manh mối cùng {name}' } : step));
    const quest = { ...first, quest: { ...first.quest, steps } };
    render(
      <MemoryRouter>
        <GameStoreContext.Provider value={createGameStore()}>
          <Hud data={{ ...data, quests: [quest, ...rest] }} quest={quest} onMenu={() => undefined} onBackpack={() => undefined} />
        </GameStoreContext.Provider>
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-id="hud-tracker-step"]')?.textContent).toBe(`Ra bãi cỏ tìm manh mối cùng ${CHARACTER.name} 0/1`);
  });

  it('tracks the current step, shows Interact only near a target, and does not re-render for events it does not use', () => {
    const store = createGameStore();
    const sent: string[] = [];
    store.onCommand((c) => sent.push(c.type));
    let trackerRenders = 0;
    render(
      <MemoryRouter>
        <GameStoreContext.Provider value={store}>
          <Profiler id="hud" onRender={() => (trackerRenders += 1)}>
            <Hud data={data} quest={data.quests[0] ?? null} onMenu={() => undefined} onBackpack={() => undefined} />
          </Profiler>
        </GameStoreContext.Provider>
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-id="hud-tracker-step"]')?.textContent).toBe('Tìm manh mối 0/1');
    expect(screen.queryByRole('button', { name: /Tương tác/ })).toBeNull();
    const before = trackerRenders;
    // Loading steps and repeated identical prompts (what moving around produces) cause no HUD work.
    act(() => {
      for (let i = 0; i < 20; i += 1) store.emit({ type: 'loading-progress', done: i, total: 20 });
      store.emit({ type: 'ready' });
    });
    expect(trackerRenders).toBe(before);
    const prompt = { targetId: 'parrot-guide', kind: 'npc', name: 'Vẹt', label: 'Nói chuyện' } as const;
    act(() => {
      for (let i = 0; i < 20; i += 1) store.emit({ type: 'interaction-prompt', prompt: { ...prompt } });
    });
    expect(trackerRenders).toBe(before + 1); // one change: the Interact button appears
    fireEvent.click(screen.getByRole('button', { name: /Tương tác/ }));
    expect(sent).toEqual(['interact']);
  });
});

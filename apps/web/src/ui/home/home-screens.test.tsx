import { Profiler, act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterDto, QuestSummary } from '@miu/schema/game';
import { createGameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { Hud } from '../hud/hud';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList, questListWithLesson } from '../player/test-fixtures';
import { RegionMapScreen, RegionScreen } from '../region/region-screens';
import { HomeScreen } from './home-screen';
import { todayQuests } from './today-quests';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };

function stubServer(done = 1, list = questList) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = url === '/api/character' ? CHARACTER : url === '/api/progress' ? PROGRESS : url === '/api/quests' ? list(done) : null;
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
  it("names the textbook lesson and its printed pages in today's quests", async () => {
    stubServer(0, questListWithLesson);
    renderAt('/home');
    const pages = await screen.findByText('Trang 10–12');
    expect(pages.closest('[data-id="home-today-textbook-tv2-t01-b01"]')?.textContent).toBe('Tiếng Việt 2, tập một · Bài 1. Tôi là học sinh lớp 2Trang 10–12');
  });

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

    // Today's quests: one row per playable quest, the current one first, each with its XP from the server.
    const rows = [...document.querySelectorAll('[data-id^="home-today-quest-"]')];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.length).toBeLessThanOrEqual(3);
    expect(rows[0]?.getAttribute('data-id')).toBe('home-today-quest-forest-ch1');
    expect(rows[0]?.textContent).toContain('+100 XP');

    // Region cards: the open forest with its subject; locked regions named with their state for screen readers.
    expect(screen.getByRole('button', { name: /Khu rừng bí mật/ }).textContent).toBe('Khu rừng bí mậtTiếng Việt');
    expect(screen.getByRole('button', { name: 'Nhà của Mochi: Sắp mở' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đảo bí ẩn: Sắp mở' })).toBeTruthy();
    // The rail of the mock, without the MVP's missing pieces (events, diamonds, streak).
    for (const name of ['Nhiệm vụ', 'Bản đồ', 'Ba lô']) expect(screen.getByRole('link', { name })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Kim cương|chuỗi ngày|Sự kiện|TIMO/i);
  });

  it("shows a locked region's name in a bubble on tap, stays on Home, and hides the bubble again", async () => {
    stubServer();
    renderAt('/home');
    const pin = await screen.findByRole('button', { name: 'Núi tuyết: Sắp mở' });
    vi.useFakeTimers();
    try {
      const bubbles = () => [...document.querySelectorAll('[data-id^="home-region-bubble-"]')].map((b) => b.textContent);
      fireEvent.click(pin);
      expect(bubbles()).toEqual(['Núi tuyếtSắp mở']);
      expect(document.querySelector('[data-id="home"]')).toBeTruthy(); // no navigation to a locked region
      // Another pin replaces the bubble; the bubble leaves on its own after a moment.
      fireEvent.click(screen.getByRole('button', { name: 'Đảo bí ẩn: Sắp mở' }));
      expect(bubbles()).toEqual(['Đảo bí ẩnSắp mở']);
      act(() => vi.advanceTimersByTime(3000));
      expect(bubbles()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens settings with sound and a way back to the Character Creator', async () => {
    stubServer();
    renderAt('/home');
    fireEvent.click(await screen.findByRole('button', { name: /Cài đặt/ }));
    expect(screen.getByRole('dialog', { name: 'Cài đặt' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: /Đổi nhân vật/ }));
    expect(await screen.findByText('Tạo nhân vật')).toBeTruthy();
  });
});

describe("today's quests", () => {
  const summary = (id: string, state: QuestSummary['state'], status: 'active' | 'stub' = 'active'): QuestSummary => {
    const base = questList(0).quests[0];
    if (!base || base.quest.status !== 'active') throw new Error('fixture has no active quest');
    return { ...base, state, quest: status === 'active' ? { ...base.quest, id } : { id, region: base.quest.region, chapter: 9, title: id, status: 'stub' } };
  };

  it('lists the quest in progress first, then open ones in catalogue order, at most three, never done or stub', () => {
    const quests = [summary('a', 'open'), summary('b', 'completed'), summary('c', 'in-progress'), summary('e', 'open', 'stub'), summary('f', 'open'), summary('g', 'open')];
    expect(todayQuests(quests).map((q) => q.quest.id)).toEqual(['c', 'a', 'f']);
    expect(todayQuests([summary('b', 'completed')])).toEqual([]);
  });
});

describe('Map and region', () => {
  it('shows every region on the world map: the open one leads to its chapters, a locked one stays on the map', async () => {
    stubServer();
    renderAt('/map');
    expect(await screen.findByRole('heading', { name: /Bản đồ thế giới/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Núi tuyết: Sắp mở' }));
    expect(screen.getByRole('heading', { name: /Bản đồ thế giới/ })).toBeTruthy();
    fireEvent.click(document.querySelector('[data-id="map-region-khu-rung-bi-mat"]') as HTMLElement);
    expect(await screen.findByRole('heading', { name: 'Chương 1' })).toBeTruthy();
  });

  it('shows the region as in the mock: its sign, words, progress with the chest, and the quest under way', async () => {
    stubServer(1);
    renderAt('/region/khu-rung-bi-mat');
    expect(await screen.findByRole('heading', { name: /Khu rừng bí mật/ })).toBeTruthy();
    expect(document.querySelector('[data-id="region-backdrop"]')).toBeTruthy();
    expect(document.querySelector('[data-id="region-description"]')?.textContent).toBe('Một khu rừng đầy những câu chuyện thú vị đang chờ Mochi khám phá!');
    // Chapter 2 is still a stub: only chapter 1 counts, and it is not finished yet.
    expect(document.querySelector('[data-id="region-progress"]')?.textContent).toContain('Hoàn thành: 0/1');
    fireEvent.click(screen.getByRole('link', { name: 'Khám phá ngay →' }));
    expect(await screen.findByText('Trong game')).toBeTruthy();
  });

  it('lists every chapter and quest on the board: progress or stars, the way in, or the lock', async () => {
    stubServer(1);
    renderAt('/region/khu-rung-bi-mat');
    expect(await screen.findByRole('heading', { name: 'Chương 1' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Các nhiệm vụ trong khu vực' })).toBeTruthy();
    expect(screen.getByText('Đang làm · Hoàn thành 1/2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Khám phá Chương 1: Cứu cây cổ thụ' }).getAttribute('href')).toBe('/play?region=khu-rung-bi-mat&quest=forest-ch1');
    expect(document.querySelector('[data-id="region-quest-forest-ch2"]')?.textContent).toContain('Sắp có');
    expect(document.querySelector('[data-id="region-play-forest-ch2"]')).toBeNull();
  });

  it('names the book, lesson and printed pages of a textbook quest, open from the start', async () => {
    stubServer(0, questListWithLesson);
    renderAt('/region/khu-rung-bi-mat');
    const ref = await screen.findByText('Trang 10–12');
    expect(ref.closest('[data-id="region-quest-textbook-tv2-t01-b01"]')?.textContent).toBe('Tiếng Việt 2, tập một · Bài 1. Tôi là học sinh lớp 2Trang 10–12');
    expect(document.querySelector('[data-id="region-quest-tv2-t01-b01"]')?.getAttribute('data-state')).toBe('open');
    expect(document.querySelector('[data-id="region-play-tv2-t01-b01"]')?.getAttribute('href')).toBe('/play?region=khu-rung-bi-mat&quest=tv2-t01-b01');
    // Quests outside the textbook show no page line.
    expect(document.querySelector('[data-id="region-quest-textbook-forest-ch1"]')).toBeNull();
  });

  it('refuses a region that is not open', async () => {
    stubServer();
    renderAt('/region/nui-tuyet');
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
          <Hud data={data} quest={data.quests[0] ?? null} onMenu={() => undefined} onQuests={() => undefined} onBackpack={() => undefined} />
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

  it('names the lesson and pages of a textbook quest under its title', () => {
    const lesson = questListWithLesson().quests.at(-1) ?? null;
    render(
      <MemoryRouter>
        <GameStoreContext.Provider value={createGameStore()}>
          <Hud data={data} quest={lesson} onMenu={() => undefined} onQuests={() => undefined} onBackpack={() => undefined} />
        </GameStoreContext.Provider>
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-id="hud-tracker-textbook"]')?.textContent).toBe('Bài 1. Tôi là học sinh lớp 2Trang 10–12');
  });

  it('says where to walk when the next step waits at another place', () => {
    const [first, ...rest] = questList(1).quests;
    if (!first || first.quest.status !== 'active') throw new Error('fixture has an active first quest');
    const steps = first.quest.steps.map((step, i) => (i === 1 ? { ...step, goTo: 'Ra bãi cỏ tìm manh mối cùng {name}' } : step));
    const quest = { ...first, quest: { ...first.quest, steps } };
    render(
      <MemoryRouter>
        <GameStoreContext.Provider value={createGameStore()}>
          <Hud data={{ ...data, quests: [quest, ...rest] }} quest={quest} onMenu={() => undefined} onQuests={() => undefined} onBackpack={() => undefined} />
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
            <Hud data={data} quest={data.quests[0] ?? null} onMenu={() => undefined} onQuests={() => undefined} onBackpack={() => undefined} />
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

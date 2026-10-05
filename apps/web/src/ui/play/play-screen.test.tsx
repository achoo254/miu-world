import { StrictMode, act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyTimetable } from '@miu/schema/timetable';
import type { GameStore } from '../../game-bridge/game-store';
import { AccountProvider } from '../account/account-context';
import { PROGRESS, questList } from '../player/test-fixtures';
import { QuestStepPublic } from '@miu/schema/content';
import type { QuestSummary } from '@miu/schema/game';
import { PlayScreen, mapBossesOf } from './play-screen';

const SCHOOL_SPOT = { map: 'truong-hoc', position: [60, 9, 70], facing: 0.5 };
const FOREST_SPOT = { map: 'forest-ch1', position: [40, 12, 88], facing: -1 };

/** The reads /play makes, answered like the server; `character` may fail to simulate the network. */
function playApi(character: () => Response = () => json({ species: 'cat', name: 'Mochi', equipped: [], pet: null })) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (url === '/api/character') return character();
    if (url === '/api/progress') return json(PROGRESS);
    if (url === '/api/quests') return json(questList(1));
    if (url === '/api/player-positions' && init?.method === 'GET') return json({ positions: [SCHOOL_SPOT, FOREST_SPOT] });
    if (url === '/api/player-positions' && init?.method === 'PUT') return new Response(null, { status: 204 });
    if (url === '/api/timetable') return json(emptyTimetable());
    return json({ error: 'unauthenticated' }, 401);
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// jsdom has no WebGL; the runtime itself is covered by Playwright. Here: lifecycle under StrictMode.
const games = vi.hoisted(() => ({ live: 0, started: 0, stops: 0, resumes: 0, savedSpot: undefined as unknown, decor: undefined as unknown, spot: null as unknown, store: null as GameStore | null }));
vi.mock('../../game/game', () => ({
  Game: class {
    private alive = true;
    private readonly options: { store: GameStore };
    constructor(_host: HTMLElement, options: { store: GameStore; savedSpot?: unknown; decor?: unknown }) {
      this.options = options;
      games.savedSpot = options.savedSpot;
      games.decor = options.decor;
      games.store = options.store;
    }
    currentSpot() {
      return this.alive ? games.spot : null;
    }
    async start() {
      games.started += 1;
      games.live += 1;
      this.options.store.emit({ type: 'ready' });
    }
    stop() {
      games.stops += 1;
    }
    resume() {
      games.resumes += 1;
    }
    dispose() {
      if (this.alive && games.started > 0) games.live -= 1;
      this.alive = false;
    }
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PlayScreen under React StrictMode', () => {
  it('ends with exactly one live game and none after unmount', async () => {
    vi.stubGlobal('fetch', playApi());
    const view = render(
      <StrictMode>
        <MemoryRouter>
          <AccountProvider>
            <PlayScreen />
          </AccountProvider>
        </MemoryRouter>
      </StrictMode>,
    );
    expect(await screen.findByRole('button', { name: /Menu/ })).toBeTruthy();
    await vi.waitFor(() => expect(games.started).toBeGreaterThanOrEqual(2)); // StrictMode mounted twice
    expect(games.live).toBe(1);
    view.unmount();
    expect(games.live).toBe(0);
  });

  it('starts the game at the saved spot of its own map, and saves where the child stands on leaving', async () => {
    const fetchMock = playApi();
    vi.stubGlobal('fetch', fetchMock);
    const view = render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: /Menu/ })).toBeTruthy();
    expect(games.savedSpot).toEqual(FOREST_SPOT); // the fixture quests play in the forest
    games.spot = { map: 'forest-ch1', position: [55, 12, 90], facing: 2 };
    view.unmount();
    const put = fetchMock.mock.calls.find(([url, init]) => url === '/api/player-positions' && init?.method === 'PUT');
    expect(put?.[1]).toMatchObject({ keepalive: true, body: JSON.stringify(games.spot) });
    games.spot = null;
  });

  it('stops the game while Pause is open and resumes it after', async () => {
    vi.stubGlobal('fetch', playApi());
    render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Menu/ }));
    expect(screen.getByRole('dialog', { name: 'Tạm dừng' })).toBeTruthy();
    const stops = games.stops;
    expect(stops).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục chơi/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(games.resumes).toBeGreaterThan(0);
    // Esc opens it again.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Tạm dừng' })).toBeTruthy();
  });

  it('opens the timetable board from the timetable on the wall and from the uniform calendar, and only from them', async () => {
    vi.stubGlobal('fetch', playApi());
    games.store = null;
    render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    // The game starts once the player data and the saved spots are in; it hands over this screen's store.
    await vi.waitFor(() => expect(games.store).not.toBeNull());
    const touch = (targetId: string): void => act(() => games.store?.emit({ type: 'interaction', targetId }));

    touch('clue-box');
    expect(screen.queryByRole('dialog', { name: 'Thời khóa biểu' })).toBeNull();

    const stops = games.stops;
    touch('nha-thoi-khoa-bieu');
    expect(screen.getByRole('dialog', { name: 'Thời khóa biểu' })).toBeTruthy();
    expect(games.stops).toBeGreaterThan(stops); // the game pauses behind the board
    expect(await screen.findByText(/Chưa có thời khóa biểu/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    touch('nha-lich-dong-phuc');
    expect(screen.getByRole('dialog', { name: 'Lịch mặc đồng phục' })).toBeTruthy();
  });

  it('opens the shop from the shopkeeper in Trung tâm, pauses the game, and the HUD shows the coins left after buying', async () => {
    const heart = { id: 'them-mot-tim', kind: 'booster', category: 'tieu-hao', name: 'Thêm một tim', description: 'Một tim nữa.', price: 50, level: null, featured: true, slot: null, swatch: null, icon: 'heart', effect: { lives: 1 }, contains: null };
    const base = playApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/shop') return json({ coins: 120, level: 1, owned: {}, items: [heart] });
        if (url === '/api/shop/buy') return json({ coins: 70, level: 1, owned: { [heart.id]: 1 }, bought: heart.id });
        return base(url, init);
      }),
    );
    games.store = null;
    render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    await vi.waitFor(() => expect(games.store).not.toBeNull());
    const stops = games.stops;
    act(() => games.store?.emit({ type: 'interaction', targetId: 'tt-quay-cua-hang' }));
    expect(screen.getByRole('dialog', { name: 'Cửa hàng' })).toBeTruthy();
    expect(games.stops).toBeGreaterThan(stops);
    fireEvent.click(await screen.findByText('Thêm một tim'));
    fireEvent.click(screen.getByRole('button', { name: 'Mua ngay' }));
    await vi.waitFor(() => expect(document.querySelector('[data-id="player-coins"]')?.textContent).toContain('70'));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng cửa hàng' }));
    expect(screen.queryByRole('dialog', { name: 'Cửa hàng' })).toBeNull();
  });

  it("builds the child's home in her picks, opens the decorating screen from the notebook and rebuilds where she stands", async () => {
    const atHome = questList(1);
    const first = atHome.quests[0];
    if (!first) throw new Error('no fixture quest');
    const home = { ...atHome, quests: [{ ...first, quest: { ...first.quest, id: 'nha-cua-be-ch1', region: 'nha-cua-be' } }] };
    let picks: Record<string, string> = { bed: 'bed-pink', rug: 'rug-cat' };
    const base = playApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/quests') return json(home);
        if (url === '/api/home-decor' && init?.method === 'PUT') {
          picks = { ...picks, ...(JSON.parse(String(init.body)) as { choices: Record<string, string> }).choices };
          return json({ choices: picks });
        }
        if (url === '/api/home-decor') return json({ choices: picks });
        return base(url, init);
      }),
    );
    games.store = null;
    render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    await vi.waitFor(() => expect(games.store).not.toBeNull());
    expect(games.decor).toEqual({ bed: 'bed-pink', rug: 'rug-cat' });
    const started = games.started;
    games.spot = { map: 'nha-cua-be', position: [81, 13, 66], facing: 1 };
    act(() => games.store?.emit({ type: 'interaction', targetId: 'nha-trang-tri' }));
    expect(screen.getByRole('dialog', { name: 'Trang trí nhà' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Xanh ngôi sao/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await vi.waitFor(() => expect(games.started).toBeGreaterThan(started));
    expect(games.decor).toEqual({ bed: 'bed-blue', rug: 'rug-cat' });
    expect(games.savedSpot).toEqual(games.spot);
    expect(screen.queryByRole('dialog', { name: 'Trang trí nhà' })).toBeNull();
    games.spot = null;
  });

  it('offers a retry when the network is down, and starts the game once it is back', async () => {
    let online = false;
    vi.stubGlobal(
      'fetch',
      playApi(() => {
        if (!online) throw new TypeError('Failed to fetch');
        return json({ species: 'cat', name: 'Mochi', equipped: [], pet: null });
      }),
    );
    const started = games.started;
    render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('dialog', { name: 'Mất kết nối mạng' })).toBeTruthy();
    online = true;
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại' }));
    await vi.waitFor(() => expect(games.started).toBeGreaterThan(started));
    expect(screen.queryByRole('dialog', { name: 'Mất kết nối mạng' })).toBeNull();
  });
});

describe('the bosses on the minimap', () => {
  it("lists the region's big boss and zone guardians where they stand, named for the player, and nothing else", () => {
    const [lesson] = questList(0).quests;
    if (!lesson || lesson.quest.status !== 'active') throw new Error('fixture');
    const base = lesson.quest;
    const boss = (target: string, name: string) =>
      QuestStepPublic.parse({ id: 'dau', title: 'Đấu', kind: 'boss', trigger: 'auto', target, bossId: target, bossName: name, introDialogue: 'Nào!', winDialogue: 'Thua!', turns: [{ id: 'a', prompt: '?', skill: 'logic', choices: [{ id: 'x', text: 'X' }, { id: 'y', text: 'Y' }] }, { id: 'b', prompt: '?', skill: 'logic', choices: [{ id: 'x', text: 'X' }, { id: 'y', text: 'Y' }] }] });
    const quest = (id: string, category: 'main' | 'guardian' | 'story', steps: QuestStepPublic[], region = base.region): QuestSummary => ({ ...lesson, quest: { ...base, id, region, category, title: `Bài ${id}`, steps } });
    const quests = [
      lesson,
      quest('vuot-ai-thu', 'main', [boss('than-rung', 'Thần Rừng của {name}')]),
      quest('ward-thu', 'guardian', [boss('rai-ca', 'Rái Cá')]),
      quest('yarn-thu', 'story', [boss('khac', 'Khác')]),
      quest('ward-noi-khac', 'guardian', [boss('xa', 'Xa')], 'cho-phien'),
    ];
    expect(mapBossesOf(quests, lesson.quest.region, (t) => t.replace('{name}', 'Mochi'))).toEqual([
      { questId: 'vuot-ai-thu', targetId: 'than-rung', name: 'Thần Rừng của Mochi', title: 'Bài vuot-ai-thu', big: true },
      { questId: 'ward-thu', targetId: 'rai-ca', name: 'Rái Cá', title: 'Bài ward-thu', big: false },
    ]);
  });
});

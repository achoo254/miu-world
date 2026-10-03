import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CharacterDto, QuestCompletion } from '@miu/schema/game';
import type { RegionRewardClaimResponse, RegionRewardsDto, RegionRewardTier, RegionRewardTierDto } from '@miu/schema/region-reward';
import { HomeScreen } from '../home/home-screen';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import type { ActiveQuestView } from '../quest/quest-flow';
import { CompletionSequence } from '../rewards/completion-sequence';
import { RegionMapScreen, RegionScreen } from './region-screens';
import { claimableTiers, regionGoalLine, tierAsk } from './region-rewards';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };
const FOREST = 'khu-rung-bi-mat';
const HAT = { id: 'hat-ruong-khu-rung-bi-mat', name: 'Mũ nấm rừng thần', slot: 'hat' };
const WINGS = { id: 'wings-ruong-sao-khu-rung-bi-mat', name: 'Cánh lá vàng rừng thần', slot: 'wings' };

/** The forest's tiers with 9 lessons, `done` of them finished (`stars` with three stars), `claimed` taken. */
function forest(done: number, claimed: RegionRewardTier[] = [], stars = 0, sideRuns = 0): RegionRewardsDto {
  const tier = (name: RegionRewardTier, goal: number, progress: number, extra: Partial<RegionRewardTierDto> = {}): RegionRewardTierDto => ({
    tier: name,
    goal,
    progress: Math.min(progress, goal),
    reached: progress >= goal,
    claimed: claimed.includes(name),
    coin: 50,
    xp: 60,
    item: null,
    title: null,
    ...extra,
  });
  return {
    region: FOREST,
    title: 'Nhà thám hiểm rừng xanh',
    lessons: 9,
    lessonsDone: done,
    lessonsThreeStar: stars,
    sideRuns,
    tiers: [
      tier('half', 5, done),
      tier('full', 9, done, { coin: 170, xp: 235, item: HAT, title: 'Nhà thám hiểm rừng xanh' }),
      tier('stars', 9, stars, { item: WINGS }),
      tier('minigames', 10, sideRuns),
    ],
  };
}

function stubServer(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const body = key in routes ? routes[key] : { 'GET /api/character': CHARACTER, 'GET /api/progress': PROGRESS, 'GET /api/quests': questList(2) }[key];
    return new Response(JSON.stringify(body ?? { error: 'not-found' }), { status: body ? 200 : 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/map" element={<RegionMapScreen />} />
        <Route path="/region/:regionId" element={<RegionScreen />} />
        <Route path="/create" element={<p>Tủ đồ</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('region reward words', () => {
  it('says what each tier asks', () => {
    expect(forest(0).tiers.map((tier) => tierAsk(tier).vi)).toEqual(['Xong 5 nhiệm vụ', 'Xong cả 9 nhiệm vụ', '9 nhiệm vụ đều 3 sao', 'Chơi 10 lượt trò chơi']);
    expect(forest(0).tiers.map((tier) => tierAsk(tier).en)).toEqual(['Finish 5 quests', 'Finish all 9 quests', '9 quests with 3 stars each', 'Play 10 game rounds']);
  });

  it('points at the next goal: a tier to open, the lessons missing, then the stars', () => {
    expect(regionGoalLine(forest(3))?.vi).toBe('Còn 2 nhiệm vụ nữa tới quà nửa chặng!');
    expect(regionGoalLine(forest(5))).toEqual({ vi: 'Quà nửa chặng đã sẵn sàng, mở ngay nào!', en: 'Halfway gift is ready, open it now!' });
    expect(regionGoalLine(forest(7, ['half']))?.vi).toBe('Còn 2 nhiệm vụ nữa tới rương!');
    expect(regionGoalLine(forest(9, ['half', 'full'], 6))?.vi).toBe('Còn 3 nhiệm vụ chưa đủ 3 sao để nhận quà ba sao!');
    expect(regionGoalLine(forest(9, ['half', 'full', 'stars'], 9))).toBeNull();
    expect(claimableTiers(forest(9, ['half'], 0, 12)).map((t) => t.tier)).toEqual(['full', 'minigames']);
  });
});

describe('the region chest', () => {
  it('shows the tiers on the region screen and opens the chest when claimed, with the item and the title', async () => {
    const after = forest(9, ['full']);
    const claim: RegionRewardClaimResponse = { ...after, claimed: 'full', granted: true, levelBefore: 1, levelAfter: 2, progress: { ...PROGRESS, coins: 182, level: 2 } };
    const fetchMock = stubServer({ [`GET /api/regions/${FOREST}/rewards`]: forest(9), [`POST /api/regions/${FOREST}/rewards/claim`]: claim });
    renderAt(`/region/${FOREST}`);
    const tiers = await screen.findByRole('list', { name: 'Phần thưởng của khu vực' });
    expect(within(tiers).getAllByRole('listitem').map((li) => li.getAttribute('data-state'))).toEqual(['ready', 'ready', 'locked', 'locked']);
    expect(document.querySelector('[data-id="region-goal"]')?.textContent).toBe('Quà nửa chặng đã sẵn sàng, mở ngay nào!');
    expect(document.querySelector('[data-id="region-progress"]')?.textContent).toContain('Hoàn thành: 1/1');

    fireEvent.click(screen.getByRole('button', { name: 'Mở rương khu vực' }));
    const card = await screen.findByRole('dialog', { name: 'Chúc mừng!' });
    // The client names the tier only; what it pays is the server's.
    expect(fetchMock).toHaveBeenCalledWith(`/api/regions/${FOREST}/rewards/claim`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ tier: 'full' }) }));
    expect(within(card).getByText('Mochi mở rương khu vực!')).toBeTruthy();
    expect(card.querySelector('[data-id="region-claim-coin"]')?.textContent).toBe('+170 Xu');
    expect(card.querySelector('[data-id="region-claim-item"]')?.textContent).toContain('Mũ nấm rừng thần');
    expect(card.querySelector('[data-id="region-claim-title"]')?.textContent).toBe('Danh hiệu mới: Nhà thám hiểm rừng xanh');
    expect(card.querySelector('[data-id="region-claim-level"]')?.textContent).toBe('Lên cấp Lv.2!');
    expect(within(card).getByRole('link', { name: 'Mặc thử ngay' }).getAttribute('href')).toBe('/create');
    // The badge shows the server's new coins at once.
    expect(document.querySelector('[data-id="player-coins"]')?.textContent).toContain('182');

    fireEvent.click(within(card).getByRole('button', { name: 'Tuyệt quá!' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('[data-id="region-tier-full"]')?.getAttribute('data-state')).toBe('claimed');
    expect(document.querySelector('[data-id="region-title"]')?.textContent).toBe('Nhà thám hiểm rừng xanh');
    expect(screen.queryByRole('button', { name: 'Mở rương khu vực' })).toBeNull();
  });

  it('says so kindly when the chest cannot be opened, and keeps the tiers', async () => {
    stubServer({ [`GET /api/regions/${FOREST}/rewards`]: forest(5) });
    renderAt(`/region/${FOREST}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Nhận thưởng' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Chưa mở được rương, thử lại nhé.');
    expect(document.querySelector('[data-id="region-tier-half"]')?.getAttribute('data-state')).toBe('ready');
  });

  it('keeps the plain chest card when the chests cannot be read', async () => {
    stubServer({});
    renderAt(`/region/${FOREST}`);
    expect(await screen.findByRole('heading', { name: /Khu rừng bí mật/ })).toBeTruthy();
    expect(document.querySelector('.region-chest')).toBeTruthy();
    expect(document.querySelector('[data-id="region-tiers"]')).toBeNull();
  });
});

describe('Home and the world map', () => {
  const list = { regions: [forest(9, ['half', 'full']), { ...forest(0), region: 'nui-tuyet' }, { ...forest(5), region: 'nha-cua-be' }], titles: ['Bạn thân của dòng sông', 'Nhà thám hiểm rừng xanh'] };

  it('marks the regions with a tier to open and shows her latest title', async () => {
    stubServer({ 'GET /api/region-rewards': list });
    renderAt('/home');
    const badge = await screen.findByRole('link', { name: 'Nhận thưởng ở Nhà của Mochi: 1 phần quà' });
    expect(badge.getAttribute('href')).toBe('/region/nha-cua-be');
    // The forest's lesson tiers are claimed and the island has none reached: no badge there.
    expect(document.querySelector('[data-id="home-region-reward-khu-rung-bi-mat"]')).toBeNull();
    expect(document.querySelector('[data-id="home-region-reward-nui-tuyet"]')).toBeNull();
    expect(document.querySelector('[data-id="home-title"]')?.textContent).toBe('Danh hiệu: Nhà thám hiểm rừng xanh+1');
  });

  it('marks them on the world map too', async () => {
    stubServer({ 'GET /api/region-rewards': list });
    renderAt('/map');
    expect((await screen.findByRole('link', { name: /^Nhận thưởng ở Nhà của Mochi/ })).getAttribute('data-id')).toBe('map-region-reward-nha-cua-be');
  });
});

describe('after a lesson', () => {
  const QUEST = questList(2).quests[0]?.quest as ActiveQuestView;
  const DATA: PlayerData = { character: CHARACTER, progress: PROGRESS, quests: questList(2).quests };
  const completion: QuestCompletion = { stars: 3, xpAwarded: 100, levelBefore: 1, levelAfter: 1, skillLevels: [] };
  const show = () => render(<CompletionSequence completion={completion} reward={{ xp: 100, coin: 20, skillXp: {}, items: {} }} quest={QUEST} data={DATA} onMap={() => undefined} onExplore={() => undefined} />);

  it('tells how far the region chest is', async () => {
    stubServer({ [`GET /api/regions/${FOREST}/rewards`]: forest(7, ['half']) });
    show();
    expect((await screen.findByText('Còn 2 nhiệm vụ nữa tới rương!')).closest('[data-id="reward-region-goal"]')?.textContent).toContain('Khu rừng bí mật');
  });

  it('says nothing about it when the chest cannot be read', async () => {
    stubServer({});
    show();
    expect(await screen.findByRole('dialog', { name: 'Hoàn thành nhiệm vụ!' })).toBeTruthy();
    expect(document.querySelector('[data-id="reward-region-goal"]')).toBeNull();
  });
});

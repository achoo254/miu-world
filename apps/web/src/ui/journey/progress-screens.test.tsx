import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AchievementDto } from '@miu/schema/achievement';
import type { CharacterDto } from '@miu/schema/game';
import type { JourneyResponse } from '@miu/schema/journey';
import { PROGRESS, questList } from '../player/test-fixtures';
import { AchievementsScreen } from './achievements-screen';
import { JourneyScreen } from './journey-screen';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };

const event = (over: Partial<JourneyResponse['events'][number]>): JourneyResponse['events'][number] => ({
  at: '2026-10-05T03:00:00.000Z',
  kind: 'quest',
  ref: null,
  label: null,
  itemId: null,
  itemName: null,
  level: null,
  xp: 0,
  coin: 0,
  ...over,
});

const JOURNEY: JourneyResponse = {
  regions: [
    { region: 'truong-hoc', lessons: 14, lessonsDone: 0, threeStars: 0, minigameRuns: 0, chestTiers: 0 },
    { region: 'khu-rung-bi-mat', lessons: 11, lessonsDone: 11, threeStars: 4, minigameRuns: 3, chestTiers: 2 },
  ],
  events: [
    event({ kind: 'skill-up', ref: 'phep-cong', label: 'Phép cộng', level: 2 }),
    event({ kind: 'level-up', level: 3 }),
    event({ kind: 'item', itemId: 'la-than' }),
    event({ kind: 'quest', ref: 'forest-ch1', label: 'Lá thần của {name}', xp: 80, coin: 20 }),
  ],
};

const achievement = (over: Partial<AchievementDto>): AchievementDto => ({
  id: 'bai-hoc-dau-tien',
  category: 'hoc-tap',
  name: 'Bài học đầu tiên',
  description: '{name} hoàn thành bài học đầu tiên của mình.',
  icon: 'books',
  progress: 1,
  goal: 1,
  reached: true,
  claimed: false,
  reward: { xp: 20, coin: 20, item: null },
  ...over,
});

const ACHIEVEMENTS: AchievementDto[] = [
  achievement({}),
  achievement({ id: 'mot-chong-sach', name: 'Một chồng sách', description: 'Hoàn thành mười bài học.', progress: 1, goal: 10, reached: false }),
  achievement({ id: 'khap-muon-noi', category: 'kham-pha', name: 'Khắp muôn nơi', description: 'Học ở cả mười hai vùng đất.', icon: 'airplane', progress: 2, goal: 12, reached: false, reward: { xp: 100, coin: 100, item: { id: 'hand-thanh-tich-kinh-vien-vong', name: 'Kính viễn vọng khám phá', slot: 'hand' } } }),
];

/** `extra`: a body for one call (`FAIL`: the server answers 500), undefined to keep the default. */
const FAIL = Symbol('fail');
function stubServer(extra: (url: string, init?: RequestInit) => unknown = () => undefined) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const custom = extra(url, init);
    if (custom === FAIL) return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
    const body =
      custom ??
      (url === '/api/character'
        ? CHARACTER
        : url === '/api/progress'
          ? PROGRESS
          : url === '/api/quests'
            ? questList(1)
            : url === '/api/journey'
              ? JOURNEY
              : url === '/api/achievements'
                ? { achievements: ACHIEVEMENTS }
                : null);
    return new Response(JSON.stringify(body), { status: body === null ? 404 : 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const renderAt = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('journey screen', () => {
  it('shows each region in the world order with its lessons, and the timeline newest first', async () => {
    stubServer();
    renderAt(<JourneyScreen />);
    expect(await screen.findByText('Hành trình của Mochi')).toBeTruthy();
    const forest = await screen.findByText('Khu rừng bí mật');
    expect(forest.closest('a')?.getAttribute('href')).toBe('/region/khu-rung-bi-mat');
    const regions = [...document.querySelectorAll('[data-id^="journey-region-"]')].map((el) => el.getAttribute('data-id'));
    expect(regions.indexOf('journey-region-khu-rung-bi-mat')).toBeLessThan(regions.indexOf('journey-region-truong-hoc'));
    expect(document.querySelector('[data-id="journey-region-truong-hoc"]')?.textContent).toContain('Chưa ghé thăm');
    const rows = [...document.querySelectorAll('.journey-event')].map((el) => el.getAttribute('data-id'));
    expect(rows).toEqual(['journey-event-skill-up', 'journey-event-level-up', 'journey-event-item', 'journey-event-quest']);
    expect(document.querySelector('[data-id="journey-event-quest"]')?.textContent).toContain('Lá thần của Mochi');
    expect(document.querySelector('[data-id="journey-event-level-up"]')?.textContent).toContain('Mochi đạt Lv.3');
  });

  it('filters the timeline by tab', async () => {
    stubServer();
    renderAt(<JourneyScreen />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Phát triển' }));
    expect([...document.querySelectorAll('.journey-event')].map((el) => el.getAttribute('data-id'))).toEqual(['journey-event-skill-up', 'journey-event-level-up']);
    fireEvent.click(screen.getByRole('tab', { name: 'Nhiệm vụ' }));
    expect([...document.querySelectorAll('.journey-event')].map((el) => el.getAttribute('data-id'))).toEqual(['journey-event-quest']);
  });

  it('says what to do when nothing has happened yet, and offers a retry when the server fails', async () => {
    stubServer((url) => (url === '/api/journey' ? { regions: [], events: [] } : undefined));
    renderAt(<JourneyScreen />);
    expect(await screen.findByText('Chưa có gì ở đây. Cùng Mochi bắt đầu chuyến phiêu lưu nào!')).toBeTruthy();
    cleanup();
    stubServer((url) => (url === '/api/journey' ? FAIL : undefined));
    renderAt(<JourneyScreen />);
    expect(await screen.findByText(/Chưa tải được hành trình/)).toBeTruthy();
  });
});

describe('achievements screen', () => {
  it('shows how many are claimed, ready ones first, and the chosen one with its reward', async () => {
    stubServer();
    renderAt(<AchievementsScreen />);
    expect(await screen.findByText('Thành tích của Mochi')).toBeTruthy();
    expect(await screen.findByText('1 thành tích chờ nhận thưởng')).toBeTruthy();
    expect(document.querySelector('[data-id="achievement-summary"]')?.textContent).toContain('0/3');
    const card = document.querySelector('[data-id="achievement-card"]');
    expect(card?.getAttribute('data-achievement')).toBe('bai-hoc-dau-tien');
    expect(card?.textContent).toContain('Mochi hoàn thành bài học đầu tiên của mình.');
    fireEvent.click(screen.getByRole('tab', { name: /Khám phá/ }));
    expect(document.querySelector('[data-id="achievement-card"]')?.getAttribute('data-achievement')).toBe('khap-muon-noi');
    expect(document.querySelector('[data-id="achievement-gift-hand-thanh-tich-kinh-vien-vong"]')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Chưa hoàn thành' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('claims with the id only and celebrates with what the server paid', async () => {
    const fetchMock = stubServer((url, init) =>
      url === '/api/achievements/bai-hoc-dau-tien/claim' && init?.method === 'POST'
        ? { achievement: achievement({ claimed: true }), granted: true, levelBefore: 1, levelAfter: 2, progress: { ...PROGRESS, coins: 120 } }
        : undefined,
    );
    renderAt(<AchievementsScreen />);
    await screen.findByText('1 thành tích chờ nhận thưởng');
    const claimButton = document.querySelector('[data-id="achievement-claim"]');
    if (!claimButton) throw new Error('the ready achievement offers its claim');
    fireEvent.click(claimButton);
    const card = await screen.findByRole('dialog', { name: 'Chúc mừng!' });
    expect(within(card).getByText('Mochi đã hoàn thành thành tích')).toBeTruthy();
    expect(within(card).getByText('Lên cấp Lv.2!')).toBeTruthy();
    const claim = fetchMock.mock.calls.find(([url]) => url === '/api/achievements/bai-hoc-dau-tien/claim');
    expect(claim?.[1]?.body).toBeUndefined();
    fireEvent.click(within(card).getByRole('button', { name: 'Tuyệt quá!' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('[data-id="achievement-bai-hoc-dau-tien"]')?.getAttribute('data-state')).toBe('claimed');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSideGivers } from './side-givers';

const list = {
  quests: [
    {
      quest: {
        id: 'side-archery-wind',
        region: 'lau-dai',
        chapter: 1,
        title: 'Bắn cung trong gió cùng Cáo Cung Thủ',
        status: 'active',
        summary: '',
        category: 'side',
        texts: {},
        steps: [
          { id: 'ask', title: 'Lời mời', kind: 'dialogue', target: 'cao-cung-thu', lines: [{ speaker: 'Cáo Cung Thủ', text: 'Chào {name}!' }], choices: [{ text: 'Đưa cây cung cho tớ!' }] },
          { id: 'play', title: 'Bắn cung có gió', kind: 'challenge', mechanic: 'minigame', trigger: 'auto', prompt: 'Bắn được bốn mươi điểm trên bia nhé!', game: 'archery-wind', goal: 40 },
        ],
        reward: { xp: 15, coin: 5 },
      },
      state: 'open',
      progress: { questId: 'side-archery-wind', completedSteps: [], completed: false, found: {}, stars: null },
    },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchSideGivers', () => {
  it("reads the region's side quests once, asking by region", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(list), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const givers = await fetchSideGivers('lau-dai');
    expect(fetchMock).toHaveBeenCalledWith('/api/quests?category=side&region=lau-dai', expect.objectContaining({ method: 'GET' }));
    expect(givers).toEqual([{ targetId: 'cao-cung-thu', games: ['Bắn cung có gió'] }]);
  });

  it('shows no givers when signed out or offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })));
    expect(await fetchSideGivers('lau-dai')).toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    expect(await fetchSideGivers('lau-dai')).toEqual([]);
  });
});

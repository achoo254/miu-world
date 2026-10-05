import { act } from 'react';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestStepPublic } from '@miu/schema/content';
import type { StepCompleteResponse } from '@miu/schema/game';
import { createGameStore } from '../../game-bridge/game-store';
import type { PlayerData } from '../player/player-data';
import { PROGRESS } from '../player/test-fixtures';
import { QuestLayer } from './quest-layer';
import type { PartyPlay } from './use-quest-controller';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const STEPS = [
  QuestStepPublic.parse({ id: 'gap', title: 'Gặp', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chào!' }] }),
  QuestStepPublic.parse({ id: 'do', title: 'Đố', kind: 'riddle', target: 'riddle-tree', question: 'Ba cộng bốn?', skill: 'phep-cong' }),
  QuestStepPublic.parse({ id: 'thuong', title: 'Thưởng', kind: 'reward', trigger: 'auto', text: 'Thưởng.' }),
  QuestStepPublic.parse({ id: 'tiep', title: 'Tiếp', kind: 'next', trigger: 'auto', text: 'Tiếp.' }),
];

function dataWith(done: string[]): PlayerData {
  return {
    character: { species: 'cat', name: 'Mochi', equipped: [], pet: null },
    progress: PROGRESS,
    quests: [
      {
        quest: { id: 'party-q', region: 'khu-rung-bi-mat', chapter: 1, title: 'Cả đội', status: 'active', summary: 'Cả đội.', texts: {}, steps: STEPS, reward: { xp: 10, coin: 1, skillXp: {}, items: {} } },
        state: 'in-progress',
        progress: { questId: 'party-q', completedSteps: done, completed: false, found: {}, stars: null, run: 1 },
      },
    ],
  };
}

function setup(party: PartyPlay, done: string[]) {
  const posts: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('category=side')) return new Response(JSON.stringify({ quests: [] }));
      if (url.startsWith('/api/npcs')) return new Response(JSON.stringify({ npcs: [] }));
      posts.push(url);
      // While a teammate still answers, the party refuses the step that starts by itself.
      if (current.waiting) return new Response(JSON.stringify({ error: 'party-waiting' }), { status: 409 });
      const body: StepCompleteResponse = { correct: true, feedback: null, quest: { questId: 'party-q', completedSteps: [...done, 'thuong'], completed: false, found: {}, stars: null, run: 1 }, reward: null, repeated: false, completion: null, progress: PROGRESS };
      return new Response(JSON.stringify(body));
    }),
  );
  let current = party;
  let data = dataWith(done);
  const store = createGameStore();
  const layer = () => (
    <MemoryRouter>
      <QuestLayer store={store} data={data} questId="party-q" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={() => undefined} party={current} />
    </MemoryRouter>
  );
  const view = render(layer());
  return {
    posts,
    store,
    update(next: PartyPlay, nextDone?: string[]) {
      current = next;
      if (nextDone) data = dataWith(nextDone);
      view.rerender(layer());
    },
  };
}

describe('a quest played with the party', () => {
  it('starts a step refused while a teammate answered, once the party goes on', async () => {
    const { posts, store, update } = setup({ progressSeq: 0, waiting: true }, ['gap', 'do']);
    act(() => store.emit({ type: 'ready' }));
    await vi.waitFor(() => expect(posts).toEqual(['/api/quests/party-q/steps/thuong/complete']));
    // The teammate answers: nobody is waited for any more, and the reward step goes again by itself.
    update({ progressSeq: 0, waiting: false });
    await vi.waitFor(() => expect(posts.filter((url) => url.endsWith('/thuong/complete'))).toHaveLength(2));
  });

  it('follows a push of the server (a teammate did a step for her), not a reload of her data', async () => {
    const { posts, update } = setup({ progressSeq: 0, waiting: false }, ['gap']);
    // Her data read again with nothing new from the party: no step starts.
    update({ progressSeq: 0, waiting: false }, ['gap']);
    expect(posts).toEqual([]);
    // The party moved her past the question (a team boss, say): the step that starts by itself starts.
    update({ progressSeq: 1, waiting: false }, ['gap', 'do']);
    await vi.waitFor(() => expect(posts[0]).toBe('/api/quests/party-q/steps/thuong/complete'));
  });
});

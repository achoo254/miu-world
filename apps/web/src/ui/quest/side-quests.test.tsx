import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto, QuestProgressDto, StepCompleteResponse } from '@miu/schema/game';
import { createGameStore, type GameCommand } from '../../game-bridge/game-store';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import type { ActiveQuestView } from './quest-flow';
import { QuestLayer } from './quest-layer';
import { sendWonRun } from './side-quests';

const CHARACTER: CharacterDto = { species: 'rabbit', name: 'Mochi', equipped: [], pet: null };

const SIDE: ActiveQuestView = {
  id: 'side-egg-catch',
  region: 'khu-rung-bi-mat',
  chapter: 1,
  title: 'Hứng trứng giúp Hải ly',
  status: 'active',
  category: 'side',
  summary: 'Hứng trứng rơi.',
  texts: {},
  steps: [
    QuestStepPublic.parse({ id: 'ask', title: 'Hải ly nhờ', kind: 'dialogue', target: 'animal-beaver', lines: [{ speaker: 'Hải ly', text: 'Hứng giúp tớ nhé {name}!' }] }),
    QuestStepPublic.parse({ id: 'catch', title: 'Hứng trứng', kind: 'challenge', mechanic: 'minigame', trigger: 'auto', prompt: 'Hứng hai mươi điểm!', game: 'egg-catch', goal: 20 }),
    QuestStepPublic.parse({ id: 'thanks', title: 'Cảm ơn', kind: 'reward', trigger: 'auto', text: 'Cảm ơn {name}!' }),
    QuestStepPublic.parse({ id: 'bye', title: 'Hẹn gặp', kind: 'next', trigger: 'auto', text: 'Hẹn gặp lại.' }),
  ],
  reward: { xp: 15, coin: 5, skillXp: {}, items: {} },
};
const progress = (completedSteps: string[], run: number, completed = false): QuestProgressDto => ({ questId: SIDE.id, completedSteps, completed, found: {}, stars: completed ? 3 : null, run });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A server that records each step request and answers like the real one. */
function sideServer(start: QuestProgressDto) {
  const posts: Array<{ step: string; body: Record<string, unknown> }> = [];
  let state = start;
  const order = SIDE.steps.map((s) => s.id);
  const respond = (step: string, body: Record<string, unknown>): StepCompleteResponse => {
    posts.push({ step, body });
    const finishedBefore = state.completed && state.completedSteps.length === order.length;
    const steps = finishedBefore ? [] : state.completedSteps;
    const run = finishedBefore ? (state.run ?? 1) + 1 : (state.run ?? 1);
    const completedSteps = [...steps, step];
    const done = completedSteps.length === order.length;
    state = { ...state, completedSteps, completed: state.completed || done, run };
    return {
      correct: true,
      feedback: null,
      quest: state,
      reward: done ? SIDE.reward : null,
      repeated: false,
      completion: done ? { stars: 3, xpAwarded: 15, levelBefore: 1, levelAfter: 2, skillLevels: [] } : null,
      progress: PROGRESS,
    };
  };
  return { posts, respond };
}

describe('sending a won minigame run', () => {
  it('sends every step of the run in order, the score with the game, all named with the run', async () => {
    const server = sideServer(progress([], 1));
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => json(server.respond(url.split('/').at(-2) ?? '', JSON.parse(String(init?.body))))));
    const seen: StepCompleteResponse[] = [];
    const sent = await sendWonRun({ quest: SIDE, progress: progress([], 1) }, 23, (r) => seen.push(r));
    expect(server.posts).toEqual([
      { step: 'ask', body: { run: 1 } },
      { step: 'catch', body: { answer: { score: 23 }, run: 1 } },
      { step: 'thanks', body: { run: 1 } },
      { step: 'bye', body: { run: 1 } },
    ]);
    expect(seen).toHaveLength(4);
    expect(sent?.outcome).toEqual({ reward: SIDE.reward, levelUp: 2, collectible: null });
  });

  it('plays a finished side quest again as its next run, which pays again', async () => {
    const finished = progress(['ask', 'catch', 'thanks', 'bye'], 1, true);
    const server = sideServer(finished);
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => json(server.respond(url.split('/').at(-2) ?? '', JSON.parse(String(init?.body))))));
    const sent = await sendWonRun({ quest: SIDE, progress: finished }, 20, () => undefined);
    expect(server.posts.map((p) => p.body.run)).toEqual([2, 2, 2, 2]);
    expect(sent?.outcome.reward).toEqual(SIDE.reward);
    expect(sent?.progress.run).toBe(2);
  });

  it('gives up (and offers to send again) when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await sendWonRun({ quest: SIDE, progress: progress([], 1) }, 20, () => undefined)).toBeNull();
  });
});

describe('side quests on the map', () => {
  function setup() {
    const posts: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('category=side')) return json({ quests: [{ quest: SIDE, state: 'open', progress: progress([], 1) }] });
        if (url.startsWith('/api/npcs')) return json({ npcs: [] });
        // The how-to card looks up the child's boosters (the shop): a read, not a result sent.
        if (url.includes('/shop')) return json({ items: [], coins: 0, level: 1, owned: {} });
        if (url.includes('skill-check')) return json({ hasSkillCheck: false, passed: true, targetId: '', targetName: '' });
        posts.push(url);
        return json({});
      }),
    );
    const store = createGameStore();
    const commands: GameCommand[] = [];
    store.onCommand((c) => commands.push(c));
    const data: PlayerData = { character: CHARACTER, progress: PROGRESS, quests: questList(0).quests };
    const overlay = vi.fn();
    render(
      <MemoryRouter>
        <QuestLayer store={store} data={data} questId="forest-ch1" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={overlay} />
      </MemoryRouter>,
    );
    const touch = (targetId: string, name: string) =>
      act(async () => {
        store.emit({ type: 'interaction-prompt', prompt: { targetId, kind: 'npc', name, label: 'Nói chuyện' } });
        store.emit({ type: 'interaction', targetId });
      });
    return { posts, commands, overlay, touch };
  }

  it('offers the game when the child talks to its character, without taking over the lesson', async () => {
    const { posts, commands, overlay, touch } = setup();
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/quests?category=side&region=khu-rung-bi-mat', expect.anything()));
    await act(async () => undefined);
    await touch('animal-beaver', 'Hải ly');
    expect(screen.getByText('Hứng giúp tớ nhé Mochi!')).toBeTruthy();
    expect(overlay).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(document.querySelector('[data-id="minigame"]')?.getAttribute('data-game')).toBe('egg-catch');
    // Nothing is sent before a round is won, and the arrow still points at the lesson.
    expect(posts).toEqual([]);
    expect(commands.filter((c) => c.type === 'set-target-hint').every((c) => c.type === 'set-target-hint' && c.targetId !== 'animal-beaver')).toBe(true);
  });

  it('leaves the lesson its own character: the lesson step comes first', async () => {
    const { touch } = setup();
    await act(async () => undefined);
    await touch('parrot-guide', 'Vẹt');
    expect(screen.getByText('Chào Mochi!')).toBeTruthy();
  });
});

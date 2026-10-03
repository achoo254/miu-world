import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto, StepCompleteResponse } from '@miu/schema/game';
import { createGameStore, type GameCommand } from '../../game-bridge/game-store';
import { DialogueScreen } from '../dialogue/dialogue-screen';
import { localVietnameseVoice } from '../dialogue/speech';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { QuestLayer } from './quest-layer';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('speech', () => {
  it('reads only with an on-device Vietnamese voice, never a remote one', () => {
    const remote = { lang: 'vi-VN', localService: false, name: 'Google Tiếng Việt' };
    const english = { lang: 'en-US', localService: true, name: 'Samantha' };
    const local = { lang: 'vi-VN', localService: true, name: 'Linh' };
    expect(localVietnameseVoice([remote, english])).toBeNull();
    expect(localVietnameseVoice([remote, english, local])).toBe(local);
  });
});

describe('DialogueScreen', () => {
  const step = QuestStepPublic.parse({
    id: 'meet-parrot',
    title: 'Gặp Vẹt',
    kind: 'dialogue',
    target: 'parrot-guide',
    lines: [
      { speaker: 'Vẹt', text: 'Chào {name}!' },
      { speaker: 'Vẹt', text: 'Giúp tớ tìm Lá thần nhé?' },
    ],
    choices: [{ text: 'Tớ sẽ giúp!' }, { text: 'Lá thần là gì vậy?', reply: 'Là chiếc lá chữa được cây, {name} ạ.' }],
  });
  if (step.kind !== 'dialogue') throw new Error('expected a dialogue');

  it('shows one line at a time in the player\'s name, a reply to a question, then completes', () => {
    const onDone = vi.fn();
    render(<DialogueScreen step={step} character={CHARACTER} questSummary="Mochi đi tìm Lá thần." busy={false} onDone={onDone} onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Vẹt' })).toBeTruthy();
    expect(screen.getByText('Chào Mochi!')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Nghe lại/ })).toBeNull(); // jsdom has no local voice
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem nhiệm vụ' }));
    expect(screen.getByText('Mochi đi tìm Lá thần.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lá thần là gì vậy?' }));
    expect(screen.getByText('Là chiếc lá chữa được cây, Mochi ạ.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('quest controller', () => {
  function response(completedSteps: string[], found: Record<string, string[]> = {}, feedback: string | null = null): StepCompleteResponse {
    return {
      correct: true,
      feedback,
      quest: { questId: 'forest-ch1', completedSteps, completed: false, found, stars: null },
      reward: null,
      repeated: false,
      completion: null,
      progress: PROGRESS,
    };
  }

  function setup(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>, sideQuests: unknown[] = []) {
    // The map's minigame side quests are listed on their own; the tests below watch the lesson's calls.
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => (url.includes('category=side') ? json({ quests: sideQuests }) : fetchImpl(url, init))));
    const store = createGameStore();
    const commands: GameCommand[] = [];
    store.onCommand((c) => commands.push(c));
    let data: PlayerData = { character: CHARACTER, progress: PROGRESS, quests: questList(0).quests };
    const onResponse = (r: StepCompleteResponse) => {
      data = { ...data, quests: data.quests.map((q) => (q.quest.id === r.quest.questId ? { ...q, progress: r.quest, state: 'in-progress' } : q)) };
      view.rerender(layer());
    };
    const overlay = vi.fn();
    const layer = () => (
      <MemoryRouter>
        <QuestLayer store={store} data={data} questId="forest-ch1" region="khu-rung-bi-mat" onResponse={onResponse} onOverlayChange={overlay} />
      </MemoryRouter>
    );
    const view = render(layer());
    const touch = (targetId: string, name: string, kind: 'npc' | 'object') =>
      act(() => {
        store.emit({ type: 'interaction-prompt', prompt: { targetId, kind, name, label: 'x' } });
        store.emit({ type: 'interaction', targetId });
      });
    return { store, commands, overlay, touch };
  }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  it('talks to the parrot, completes the step on the server, then finds a clue and points the arrow on', async () => {
    const posts: Array<{ url: string; body: unknown }> = [];
    const { store, commands, overlay, touch } = setup(async (url, init) => {
      posts.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
      return url.endsWith('/meet-parrot/complete') ? json(response(['meet-parrot'])) : json(response(['meet-parrot', 'find-clues'], { 'find-clues': ['clue-box'] }));
    });
    act(() => store.emit({ type: 'ready' }));
    expect(commands).toContainEqual({ type: 'set-target-hint', targetId: 'parrot-guide' });

    touch('clue-box', 'Chiếc hộp', 'object'); // not yet: the parrot comes first
    expect(screen.getByRole('status').textContent).toMatch(/Chiếc hộp|Mochi/);
    expect(posts).toEqual([]);

    touch('parrot-guide', 'Vẹt', 'npc');
    expect(screen.getByText('Chào Mochi!')).toBeTruthy();
    expect(overlay).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(overlay).toHaveBeenLastCalledWith(false);
    expect(posts[0]).toEqual({ url: '/api/quests/forest-ch1/steps/meet-parrot/complete', body: { run: 1 } });
    expect(commands).toContainEqual({ type: 'set-target-hint', targetId: 'clue-box' });

    touch('clue-box', 'Chiếc hộp', 'object');
    await vi.waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual({ url: '/api/quests/forest-ch1/steps/find-clues/complete', body: { target: 'clue-box', run: 1 } });
    await vi.waitFor(() => expect(commands).toContainEqual({ type: 'set-world-state', state: { 'clue-box': 'found' } }));
    expect(screen.getByRole('status').textContent).toContain('Chiếc hộp');
  });

  it('never says the same "not now" line twice in a row', () => {
    const { touch } = setup(async () => json(response([])));
    const said: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      touch('clue-box', 'Chiếc hộp', 'object');
      said.push(screen.getByRole('status').textContent ?? '');
    }
    for (let i = 1; i < said.length; i += 1) expect(said[i]).not.toBe(said[i - 1]);
  });

  it('leaves the timetable board and the uniform calendar at home to their own screen: no quest line, no call', () => {
    const posts: string[] = [];
    const { touch } = setup(async (url) => {
      posts.push(url);
      return json(response([]));
    });
    touch('nha-thoi-khoa-bieu', 'Thời khóa biểu', 'object');
    touch('nha-lich-dong-phuc', 'Lịch đồng phục', 'object');
    expect(screen.queryByRole('status')).toBeNull();
    expect(posts).toEqual([]);
  });

  it('shows the server\'s feedback line, and on a lost network blocks with a retry that re-sends the same call', async () => {
    let online = false;
    const posts: string[] = [];
    const { touch } = setup(async (url) => {
      posts.push(url);
      if (!online) throw new TypeError('Failed to fetch');
      return json(response(['meet-parrot'], {}, 'Cảm ơn {name} nhiều nhé!'));
    });
    touch('parrot-guide', 'Vẹt', 'npc');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(await screen.findByRole('dialog', { name: 'Mất kết nối mạng' })).toBeTruthy();
    online = true;
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mất kết nối mạng' })).toBeNull());
    expect(posts).toEqual(['/api/quests/forest-ch1/steps/meet-parrot/complete', '/api/quests/forest-ch1/steps/meet-parrot/complete']);
    expect(screen.getByRole('status').textContent).toBe('Cảm ơn Mochi nhiều nhé!');
  });
});

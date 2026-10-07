import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto, StepCompleteResponse } from '@miu/schema/game';
import { createGameStore, type GameCommand } from '../../game-bridge/game-store';
import { DialogueScreen } from '../dialogue/dialogue-screen';
import { bestVoice, linesToRead } from '../dialogue/speech';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { QuestLayer, guardianFightAt } from './quest-layer';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('speech', () => {
  it('reads only with an on-device voice of the language, never a remote one', () => {
    const remote = { lang: 'vi-VN', localService: false, name: 'Google Tiếng Việt' };
    const english = { lang: 'en-US', localService: true, name: 'Samantha' };
    const local = { lang: 'vi-VN', localService: true, name: 'Linh' };
    expect(bestVoice([remote, english], 'vi')).toBeNull();
    expect(bestVoice([remote, english, local], 'vi')).toBe(local);
    expect(bestVoice([remote, english, local], 'en')).toBe(english);
  });

  it('picks the exact locale, then a richer voice, then the default', () => {
    const british = { lang: 'en-GB', localService: true, name: 'Daniel', default: true };
    const basic = { lang: 'en-US', localService: true, name: 'Fred' };
    const rich = { lang: 'en_US', localService: true, name: 'Ava (Premium)' };
    expect(bestVoice([british, basic], 'en')).toBe(basic);
    expect(bestVoice([british, basic, rich], 'en')).toBe(rich);
    expect(bestVoice([british], 'en')).toBe(british);
  });

  it('reads the line shown: Vietnamese, English, or both in turn; untranslated text in Vietnamese', () => {
    const line = { vi: 'Xin chào', en: 'Hello' };
    expect(linesToRead(line, 'vi')).toEqual([{ text: 'Xin chào', lang: 'vi' }]);
    expect(linesToRead(line, 'en')).toEqual([{ text: 'Hello', lang: 'en' }]);
    expect(linesToRead(line, 'both')).toEqual([
      { text: 'Xin chào', lang: 'vi' },
      { text: 'Hello', lang: 'en' },
    ]);
    expect(linesToRead({ vi: 'Bài đọc' }, 'en')).toEqual([{ text: 'Bài đọc', lang: 'vi' }]);
    expect(linesToRead({ vi: 'Bài đọc', en: 'Bài đọc' }, 'both')).toEqual([{ text: 'Bài đọc', lang: 'vi' }]);
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
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('category=side')) return json({ quests: sideQuests });
        // The map's characters (their cards) are read on their own too.
        if (url.startsWith('/api/npcs')) return json({ npcs: [] });
        if (url.includes('skill-check')) return json({ hasSkillCheck: false, passed: true, targetId: '', targetName: '' });
        return fetchImpl(url, init);
      }),
    );
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
      act(async () => {
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

    await touch('clue-box', 'Chiếc hộp', 'object'); // not yet: the parrot comes first
    expect(screen.getByRole('status').textContent).toMatch(/Chiếc hộp|Mochi/);
    expect(posts).toEqual([]);

    await touch('parrot-guide', 'Vẹt', 'npc');
    expect(screen.getByText('Chào Mochi!')).toBeTruthy();
    expect(overlay).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(overlay).toHaveBeenLastCalledWith(false);
    expect(posts[0]).toEqual({ url: '/api/quests/forest-ch1/steps/meet-parrot/complete', body: { run: 1 } });
    expect(commands).toContainEqual({ type: 'set-target-hint', targetId: 'clue-box' });

    await touch('clue-box', 'Chiếc hộp', 'object');
    await vi.waitFor(() => expect(posts).toHaveLength(2));
    expect(posts[1]).toEqual({ url: '/api/quests/forest-ch1/steps/find-clues/complete', body: { target: 'clue-box', run: 1 } });
    await vi.waitFor(() => expect(commands).toContainEqual({ type: 'set-world-state', state: { 'clue-box': 'hidden' } }));
    expect(screen.getByRole('status').textContent).toContain('Chiếc hộp');
  });

  it('never says the same "not now" line twice in a row', async () => {
    const { touch } = setup(async () => json(response([])));
    const said: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      await touch('clue-box', 'Chiếc hộp', 'object');
      said.push(screen.getByRole('status').textContent ?? '');
    }
    for (let i = 1; i < said.length; i += 1) expect(said[i]).not.toBe(said[i - 1]);
  });

  it('leaves the timetable board and the uniform calendar at home to their own screen: no quest line, no call', async () => {
    const posts: string[] = [];
    const { touch } = setup(async (url) => {
      posts.push(url);
      return json(response([]));
    });
    await touch('nha-thoi-khoa-bieu', 'Thời khóa biểu', 'object');
    await touch('nha-lich-dong-phuc', 'Lịch đồng phục', 'object');
    expect(screen.queryByRole('status')).toBeNull();
    expect(posts).toEqual([]);
  });

  it('leaves the pet and the kitchen to their own screens: no "nothing here" line, no call', async () => {
    const posts: string[] = [];
    const { touch } = setup(async (url) => {
      posts.push(url);
      return json(response([]));
    });
    await touch('pet-care', 'Thú cưng', 'object');
    await touch('cooking', 'Bếp', 'object');
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
    await touch('parrot-guide', 'Vẹt', 'npc');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(await screen.findByRole('dialog', { name: 'Mất kết nối mạng' })).toBeTruthy();
    online = true;
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mất kết nối mạng' })).toBeNull());
    expect(posts).toEqual(['/api/quests/forest-ch1/steps/meet-parrot/complete', '/api/quests/forest-ch1/steps/meet-parrot/complete']);
    expect(screen.getByRole('status').textContent).toBe('Cảm ơn Mochi nhiều nhé!');
  });

  it("takes up a zone guardian's fight when the child talks to the guardian during a lesson (no \"not now\" line)", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.startsWith('/api/npcs') ? json({ npcs: [] }) : json({ quests: [] }))),
    );
    const [lesson] = questList(0).quests;
    if (!lesson || lesson.quest.status !== 'active') throw new Error('fixture');
    const fight = {
      ...lesson,
      quest: {
        ...lesson.quest,
        id: 'ward-khu-rung-suoi',
        category: 'guardian' as const,
        steps: [QuestStepPublic.parse({ id: 'gap', title: 'Gặp', kind: 'dialogue', target: 'rai-ca-canh-suoi', lines: [{ speaker: 'Rái Cá', text: 'Đấu không?' }] })],
      },
    };
    expect(guardianFightAt([lesson, fight], 'rai-ca-canh-suoi')?.quest.id).toBe('ward-khu-rung-suoi');
    expect(guardianFightAt([lesson, fight], 'parrot-guide')).toBeNull();
    const store = createGameStore();
    const onPlayQuest = vi.fn();
    render(
      <MemoryRouter>
        <QuestLayer store={store} data={{ character: CHARACTER, progress: PROGRESS, quests: [lesson, fight] }} questId="forest-ch1" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={() => undefined} onPlayQuest={onPlayQuest} />
      </MemoryRouter>,
    );
    await act(async () => {
      store.emit({ type: 'interaction-prompt', prompt: { targetId: 'rai-ca-canh-suoi', kind: 'npc', name: 'Rái Cá', label: 'Thách đấu' } });
      store.emit({ type: 'interaction', targetId: 'rai-ca-canh-suoi' });
    });
    expect(onPlayQuest).toHaveBeenCalledWith('ward-khu-rung-suoi', 'rai-ca-canh-suoi');
    expect(screen.queryByRole('status')).toBeNull();
  });

  /** A zone guardian's fight of two blows, its server answering each blow in turn (the second wins). */
  function guardianFight(copy: { question: string; answer: string } | null = null, extra: { reward?: boolean; offlineFirst?: boolean } = {}) {
    const boss = QuestStepPublic.parse({
      id: 'dau',
      title: 'Đấu trí',
      kind: 'boss',
      trigger: 'auto',
      target: 'rai-ca',
      bossId: 'rai-ca',
      bossName: 'Rái Cá',
      introDialogue: 'Đấu nào!',
      winDialogue: 'Ta thua rồi!',
      maxHp: 200,
      damagePerTurn: 100,
      turns: [
        { id: 't1', prompt: 'Một cộng một?', skill: 'phep-cong', move: 'fling', damage: 100, choices: [{ id: 'a', text: '2' }, { id: 'b', text: '3' }] },
        { id: 't2', prompt: 'Hai cộng hai?', skill: 'phep-cong', move: 'orbs', damage: 100, choices: [{ id: 'a', text: '4' }, { id: 'b', text: '5' }] },
      ],
    });
    const [lesson] = questList(0).quests;
    if (!lesson || lesson.quest.status !== 'active') throw new Error('fixture');
    const gift = QuestStepPublic.parse({ id: 'qua', title: 'Quà', kind: 'reward', trigger: 'auto', text: 'Quà của Rái Cá.' });
    const fight = { ...lesson, quest: { ...lesson.quest, id: 'ward-thu', category: 'guardian' as const, steps: extra.reward ? [boss, gift] : [boss] }, progress: { ...lesson.progress, questId: 'ward-thu' } };
    let blows = 0;
    const calls = { reward: 0 };
    let offline = extra.offlineFirst ?? false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.startsWith('/api/npcs')) return json({ npcs: [] });
        if (url.includes('/steps/qua/complete')) {
          calls.reward += 1;
          return json({ ...response([]), quest: { questId: 'ward-thu', completedSteps: ['dau', 'qua'], completed: true, found: {}, stars: null } });
        }
        if (!url.includes('/steps/dau/complete')) return json({ quests: [] });
        if (offline) {
          offline = false;
          throw new TypeError('offline');
        }
        blows += 1;
        const won = blows === 2;
        const progress = { questId: 'ward-thu', completedSteps: won ? ['dau'] : [], completed: won, found: { dau: won ? ['t1', 't2'] : ['t1'] }, stars: null };
        return json({ ...response([]), quest: progress, feedback: won ? 'Ta thua rồi!' : 'Úi, trúng rồi!', feedbackEn: null, copy: copy ? { step: 'dau', ...copy } : null });
      }),
    );
    return { fight, calls };
  }

  /** A game that stages every fight asked for (or cannot: `unavailable`), as the running world answers. */
  function gameThatStages(answer: 'staged' | 'unavailable') {
    const store = createGameStore();
    const sent: GameCommand[] = [];
    store.onCommand((command) => {
      sent.push(command);
      if (command.type === 'duel-open') store.emit({ type: 'duel', state: answer });
      if (command.type === 'duel-close') store.emit({ type: 'duel', state: null });
    });
    return { store, sent };
  }

  it("keeps a boss's screen open between blows, its line in its bubble, and closes it on the blow that wins", async () => {
    const { fight } = guardianFight();
    const store = createGameStore();
    render(
      <MemoryRouter>
        <QuestLayer store={store} data={{ character: CHARACTER, progress: PROGRESS, quests: [fight] }} questId="ward-thu" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={() => undefined} />
      </MemoryRouter>,
    );
    act(() => store.emit({ type: 'ready' }));
    await screen.findByText('Một cộng một?');
    // Each blow is a play move: tapping the shield with "2" throws the charm at it.
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    // Still in the fight: the line is in the boss's bubble, not a toast over the question.
    expect(await screen.findByText('Úi, trúng rồi!')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('[data-id="boss-battle"]')).not.toBeNull();
    await vi.waitFor(() => expect((screen.getByRole('button', { name: '2' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    // The winning blow: the fight closes and its win line is said over the world.
    await vi.waitFor(() => expect(document.querySelector('[data-id="boss-battle"]')).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('Ta thua rồi!');
  });

  it('plays the fight out in the running world when the game stages it: the screen covers nothing, the HUD steps aside', async () => {
    for (const answer of ['staged', 'unavailable'] as const) {
      const { fight } = guardianFight();
      const { store, sent } = gameThatStages(answer);
      const onOverlayChange = vi.fn();
      const onDuelChange = vi.fn();
      const { unmount } = render(
        <MemoryRouter>
          <QuestLayer store={store} data={{ character: CHARACTER, progress: PROGRESS, quests: [fight] }} questId="ward-thu" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={onOverlayChange} onDuelChange={onDuelChange} />
        </MemoryRouter>,
      );
      act(() => store.emit({ type: 'ready' }));
      await screen.findByText('Một cộng một?');
      expect(sent).toContainEqual({ type: 'duel-open', targetId: 'rai-ca', calm: false });
      // Staged: the game runs on (nothing covers it), the HUD steps aside. Unavailable: a card over the paused game.
      expect(onOverlayChange).toHaveBeenLastCalledWith(answer === 'unavailable');
      expect(onDuelChange).toHaveBeenLastCalledWith(answer === 'staged');
      expect((document.querySelector('[data-id="boss-move"]') as HTMLElement).dataset.mode).toBe(answer === 'staged' ? 'stage' : 'card');
      unmount();
      expect(sent.at(-1)).toEqual({ type: 'duel-close' });
      cleanup();
    }
  });

  it('in the world, lands a right blow before its vở card (the card covers the game a moment), and lets a won boss bow out first', async () => {
    const { fight } = guardianFight({ question: 'Một cộng một?', answer: '2' });
    const { store, sent } = gameThatStages('staged');
    const onOverlayChange = vi.fn();
    render(
      <MemoryRouter>
        <QuestLayer store={store} data={{ character: CHARACTER, progress: PROGRESS, quests: [fight] }} questId="ward-thu" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={onOverlayChange} />
      </MemoryRouter>,
    );
    act(() => store.emit({ type: 'ready' }));
    await screen.findByText('Một cộng một?');
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await vi.waitFor(() => expect(sent).toContainEqual({ type: 'duel-cue', cue: 'hit' }));
    // The blow lands first: no vở card yet, the fight still up.
    expect(screen.queryByRole('dialog', { name: 'Chép vào vở' })).toBeNull();
    fireEvent.click(screen.getByLabelText('Chạm để tiếp tục'));
    expect(await screen.findByRole('dialog', { name: 'Chép vào vở' })).toBeTruthy();
    expect(onOverlayChange).toHaveBeenLastCalledWith(true);
    // The card does not end the fight in the world: it is staged still, and back once the card is put away.
    expect(sent.filter((c) => c.type === 'duel-close')).toEqual([]);
    fireEvent.click(document.querySelector('[data-id="notebook-done"]') as HTMLElement);
    await screen.findByText('Một cộng một?');
    expect(onOverlayChange).toHaveBeenLastCalledWith(false);
    // The winning blow: the boss bows out on its screen (its line in its bubble, no toast), then the quest goes on.
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await vi.waitFor(() => expect(sent).toContainEqual({ type: 'duel-cue', cue: 'win' }));
    expect(document.querySelector('[data-id="boss-battle"]')).not.toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByLabelText('Chạm để tiếp tục'));
    await vi.waitFor(() => expect(document.querySelector('[data-id="boss-battle"]')).toBeNull());
    expect(sent.at(-1)).toEqual({ type: 'duel-close' });
  });

  it('goes on to the reward exactly once after a boss bows out in the world, closed with ✕ before the end of its bow', async () => {
    const { fight, calls } = guardianFight(null, { reward: true });
    const { store, sent } = gameThatStages('staged');
    render(
      <MemoryRouter>
        <QuestLayer store={store} data={{ character: CHARACTER, progress: PROGRESS, quests: [fight] }} questId="ward-thu" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={() => undefined} />
      </MemoryRouter>,
    );
    act(() => store.emit({ type: 'ready' }));
    await screen.findByText('Một cộng một?');
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await vi.waitFor(() => expect(sent).toContainEqual({ type: 'duel-cue', cue: 'hit' }));
    fireEvent.click(screen.getByLabelText('Chạm để tiếp tục'));
    await vi.waitFor(() => expect((screen.getByRole('button', { name: '2' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await vi.waitFor(() => expect(sent).toContainEqual({ type: 'duel-cue', cue: 'win' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await vi.waitFor(() => expect(calls.reward).toBe(1));
    expect(document.querySelector('[data-id="boss-battle"]')).toBeNull();
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.reward).toBe(1);
  });

  it('shows the vở card for a right blow sent again from the offline banner', async () => {
    const { fight } = guardianFight({ question: 'Một cộng một?', answer: '2' }, { offlineFirst: true });
    const store = createGameStore();
    render(
      <MemoryRouter>
        <QuestLayer store={store} data={{ character: CHARACTER, progress: PROGRESS, quests: [fight] }} questId="ward-thu" region="khu-rung-bi-mat" onResponse={() => undefined} onOverlayChange={() => undefined} />
      </MemoryRouter>,
    );
    act(() => store.emit({ type: 'ready' }));
    await screen.findByText('Một cộng một?');
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await vi.waitFor(() => expect(document.querySelector('[data-id="offline-retry"]')).not.toBeNull());
    fireEvent.click(document.querySelector('[data-id="offline-retry"]') as HTMLElement);
    expect(await screen.findByRole('dialog', { name: 'Chép vào vở' })).toBeTruthy();
  });
});

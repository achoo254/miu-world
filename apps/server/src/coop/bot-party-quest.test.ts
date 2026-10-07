import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SharedGoal } from '../multiplayer/bot-brain/brain';
import { seeded } from '../multiplayer/bot-persona';
import type { BotQuest, QuestBook } from '../multiplayer/bot-brain/quest-plan';
import {
  BOT_QUEST_MAX_WRONG,
  BOT_QUEST_RETRY_MS,
  BOT_QUEST_RETRY_SPREAD_MS,
  BOT_QUEST_THINK_MAX_MS,
  BOT_QUEST_THINK_MIN_MS,
  BotPartyQuestPlayer,
  chooseBotPartyQuest,
  type PartyQuestBotSituation,
} from './bot-party-quest';
import { PARTY_QUEST } from './party-quest-fixtures';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const BOT = 'bot-tt-1';
const INFO = { skill: 'phep-cong', subject: 'toan', difficulty: 0.35, medianMs: 8_000 };

/** A bot's party-quest player with fixed dice: thinking `think` ms, right as often as `chance`. */
function harness(options: { think?: number; chance?: number } = {}) {
  const shares: Array<SharedGoal | null> = [];
  const learnt: boolean[] = [];
  const ended: string[] = [];
  const finished: Array<[string, string, readonly string[]]> = [];
  const player = new BotPartyQuestPlayer({
    random: () => 0.5,
    thinkMs: () => options.think ?? 6_000,
    chance: async () => options.chance ?? 1,
    learnt: (_bot, _info, right) => learnt.push(right),
    share: (_bot, goal) => shares.push(goal),
    finished: (bot, quest, players) => finished.push([bot, quest, players]),
    ended: (bot) => ended.push(bot),
  });
  const moves = { done: vi.fn<(stepId: string) => void>(), blow: vi.fn<(stepId: string, turnId: string) => void>(), question: vi.fn(() => INFO) };
  const play = (done: readonly string[], front: number, blow: PartyQuestBotSituation['blow'] = null): void =>
    player.play(BOT, { quest: PARTY_QUEST, front, done: new Set(done), blow }, moves);
  return { player, moves, play, shares, learnt, ended, finished };
}

describe('the quest a bot asks its party to play', () => {
  const quest = (id: string): BotQuest => ({ id, steps: [{ id: 's1', targets: [], question: false }] });
  const book: QuestBook = { questsOn: (mapId) => (mapId === 'lau-dai' ? ['a', 'b', 'c'].map(quest) : mapId === 'cho-phien' ? [quest('d')] : []) };

  it('is one of its map, each as likely, and none on a map without quests', () => {
    const random = seeded(7);
    const counts = new Map<string, number>();
    for (let i = 0; i < 3_000; i++) {
      const id = chooseBotPartyQuest(book, 'lau-dai', new Date(), random) ?? 'none';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual(['a', 'b', 'c']);
    for (const n of counts.values()) expect(Math.abs(n - 1_000)).toBeLessThan(100);
    expect(chooseBotPartyQuest(book, 'cho-phien', new Date(), () => 0.99)).toBe('d');
    expect(chooseBotPartyQuest(book, 'nui-tuyet', new Date(), () => 0.5)).toBeNull();
  });
});

describe('a companion bot playing its part in a party quest', () => {
  it('heads for a shared step\'s place and never does the step itself: it follows the players', async () => {
    const { play, moves, shares } = harness();
    play([], 0);
    expect(shares).toEqual([{ quest: PARTY_QUEST.id, targets: ['parrot-guide'] }]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(moves.done).not.toHaveBeenCalled();
    // The same step again: the same goal stays (its mind is not told twice).
    play([], 1);
    expect(shares).toHaveLength(1);
  });

  it('answers a question only once a player reached it, after thinking 4 to 12 seconds', async () => {
    const { play, moves, shares } = harness({ think: 1_000 });
    play(['gap'], 0);
    expect(shares.at(-1)).toEqual({ quest: PARTY_QUEST.id, targets: ['riddle-tree'] });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(moves.done).not.toHaveBeenCalled();

    play(['gap'], 1);
    await vi.advanceTimersByTimeAsync(BOT_QUEST_THINK_MIN_MS - 1);
    expect(moves.done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(moves.done).toHaveBeenCalledWith('do');
    expect(moves.question).toHaveBeenCalledWith('do', undefined);

    const slow = harness({ think: 60_000 });
    slow.play(['gap'], 1);
    await vi.advanceTimersByTimeAsync(BOT_QUEST_THINK_MAX_MS - 1);
    expect(slow.moves.done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(slow.moves.done).toHaveBeenCalledWith('do');
  });

  it('slips at most twice on a question, trying again a few seconds after each slip, and learns from every answer', async () => {
    const { play, moves, learnt } = harness({ chance: 0 });
    play(['gap'], 1);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(learnt).toEqual([false]);
    // Each try again comes 2 to 5 seconds later (dice at the middle: 3.5 s).
    const retry = BOT_QUEST_RETRY_MS + BOT_QUEST_RETRY_SPREAD_MS * 0.5;
    await vi.advanceTimersByTimeAsync(retry);
    expect(learnt).toEqual([false, false]);
    expect(moves.done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(retry);
    expect(learnt).toHaveLength(BOT_QUEST_MAX_WRONG + 1);
    expect(learnt.at(-1)).toBe(true);
    expect(moves.done).toHaveBeenCalledTimes(1);
  });

  it('strikes the boss only on its turn, the turn it was given, and tries again on its turn after a slip', async () => {
    const { play, moves } = harness({ chance: 0 });
    play(['gap', 'do', 'sau'], 3);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(moves.blow).not.toHaveBeenCalled();

    play(['gap', 'do', 'sau'], 3, { stepId: 'trum', turnId: 't1' });
    await vi.advanceTimersByTimeAsync(6_000 + 2 * (BOT_QUEST_RETRY_MS + BOT_QUEST_RETRY_SPREAD_MS));
    expect(moves.blow).toHaveBeenCalledTimes(1);
    expect(moves.blow).toHaveBeenCalledWith('trum', 't1');
    expect(moves.question).toHaveBeenCalledWith('trum', 't1');
    expect(moves.done).not.toHaveBeenCalled();
  });

  it('drops a question the run moved past while it thought, and forgets everything once out of the run', async () => {
    const { play, moves, player, shares, ended } = harness();
    play(['gap'], 1);
    await vi.advanceTimersByTimeAsync(3_000);
    // The turn went elsewhere (another member's blow, say): nothing to answer now.
    play(['gap', 'do', 'sau'], 3);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(moves.done).not.toHaveBeenCalled();
    expect(player.plays(BOT)).toBe(true);

    play(['gap', 'do', 'sau'], 3, { stepId: 'trum', turnId: 't2' });
    player.forget([BOT]);
    expect(player.plays(BOT)).toBe(false);
    expect(shares.at(-1)).toBeNull();
    expect(ended).toEqual([BOT]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(moves.blow).not.toHaveBeenCalled();
    // Told the run ended even when it never saw it.
    player.forget(['bot-tt-2']);
    expect(ended).toEqual([BOT, 'bot-tt-2']);
  });

  it('is done with a run once it has every step, or once the players finished it', () => {
    const all = PARTY_QUEST.steps.map((s) => s.id);
    const { play, player, ended, finished, shares } = harness();
    play(['gap'], 1);
    play(all, all.length);
    expect(player.plays(BOT)).toBe(false);
    expect(shares.at(-1)).toBeNull();
    expect(ended).toEqual([BOT]);
    // Shown it again, it does not take it up.
    play(all, all.length);
    expect(player.plays(BOT)).toBe(false);
    expect(ended).toEqual([BOT]);

    play(['gap'], 1);
    player.finished(BOT, PARTY_QUEST.id, ['p-a']);
    expect(finished).toEqual([[BOT, PARTY_QUEST.id, ['p-a']]]);
    expect(player.plays(BOT)).toBe(false);
    expect(ended).toEqual([BOT, BOT]);
  });
});

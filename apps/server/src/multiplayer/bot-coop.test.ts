import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoopAction, CoopStateView } from '@miu/schema/coop';
import { hubHarness } from '../../test/hub-harness';
import { BOT_MAP_CONFIGS, BotRunner } from './bot-runner';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const BASE: CoopStateView = {
  questId: 'with-test-pieces',
  mode: 'pieces',
  self: 'bot-1@c1',
  status: 'playing',
  waitingFor: null,
  round: 0,
  rounds: 2,
  seats: [
    { id: 'p-a', displayName: 'A', isBot: false, species: 'cat', standIn: null, away: false, greeting: null },
    { id: 'bot-1@c1', displayName: 'Máy', isBot: true, species: 'fox', standIn: null, away: false, greeting: null },
  ],
  turn: 'p-a',
  task: { id: 't1', prompt: 'Câu?', choices: [{ id: 'a', text: 'Một' }, { id: 'b', text: 'Hai' }, { id: 'c', text: 'Ba' }] },
  pieces: [
    { index: 0, seat: 'p-a', shared: true, text: 'Mảnh một', en: null },
    { index: 1, seat: 'bot-1@c1', shared: false, text: 'Mảnh hai', en: null },
  ],
  title: null,
  tasks: [],
  holds: [],
  boss: null,
  last: null,
};

function runner(options: { random?: number; accuracy?: number } = {}) {
  const { hub } = hubHarness();
  const bots = new BotRunner(hub, { random: () => options.random ?? 0, coopAccuracy: options.accuracy, coopThinkMs: 1_000 });
  const acts: CoopAction[] = [];
  const moves = { act: (a: CoopAction) => void acts.push(a), answerOf: () => 'a', question: () => ({ skill: 'phep-cong', subject: 'toan', difficulty: 0.35, medianMs: 6_000 }) };
  return { driver: bots.coopDriver(), acts, moves, stop: () => bots.stop() };
}

describe('companion bots in a co-op challenge', () => {
  it('fill free places with bots of the map, none already in the team, always as bots', () => {
    const { driver } = runner();
    const local = (BOT_MAP_CONFIGS['cho-phien'] ?? []).map((b) => b.id);
    const picked = driver.pick('cho-phien', 2, new Set([local[0] ?? '']));
    expect(picked).toHaveLength(2);
    expect(picked.every((p) => p.isBot && local.includes(p.id) && p.id !== local[0])).toBe(true);
  });

  it('share their clue after a moment, then answer on their turn: right as often as set, never all wrong for good', async () => {
    const { driver, acts, moves } = runner();
    driver.play('bot-1@c1', BASE, moves);
    expect(acts).toEqual([]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(acts).toEqual([{ kind: 'share', piece: 1 }]);
    driver.play('bot-1@c1', { ...BASE, turn: 'bot-1@c1', pieces: BASE.pieces.map((p) => ({ ...p, shared: true })) }, moves);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(acts.at(-1)).toEqual({ kind: 'answer', task: 't1', choice: 'a' });

    const wrongBot = runner({ random: 0.5, accuracy: 0.2 });
    wrongBot.driver.play('bot-1@c1', { ...BASE, turn: 'bot-1@c1', pieces: BASE.pieces.map((p) => ({ ...p, shared: true })) }, wrongBot.moves);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(wrongBot.acts.at(-1)).toMatchObject({ kind: 'answer', task: 't1' });
    expect(wrongBot.acts.at(-1)).not.toMatchObject({ choice: 'a' });
  });

  it('pull their rope in a together round and pull again before letting go; forgotten, they do nothing', async () => {
    const { driver, acts, moves } = runner();
    const together: CoopStateView = { ...BASE, mode: 'together', pieces: [], task: null, turn: null, tasks: [{ id: 't1', seat: 'p-a', done: false, task: null }], holds: [{ seat: 'p-a', msLeft: 0 }, { seat: 'bot-1@c1', msLeft: 0 }] };
    driver.play('bot-1@c1', together, moves);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(acts).toEqual([{ kind: 'hold' }]);
    driver.play('bot-1@c1', { ...together, holds: [{ seat: 'p-a', msLeft: 0 }, { seat: 'bot-1@c1', msLeft: 15_000 }] }, moves);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(acts).toHaveLength(1);
    driver.play('bot-1@c1', { ...together, holds: [{ seat: 'p-a', msLeft: 0 }, { seat: 'bot-1@c1', msLeft: 2_000 }] }, moves);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(acts).toEqual([{ kind: 'hold' }, { kind: 'hold' }]);
    driver.play('bot-1@c1', { ...together, holds: [{ seat: 'p-a', msLeft: 0 }, { seat: 'bot-1@c1', msLeft: 0 }] }, moves);
    driver.forget(['bot-1@c1']);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(acts).toHaveLength(2);
  });
});

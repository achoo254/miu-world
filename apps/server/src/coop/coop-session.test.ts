import { describe, expect, it } from 'vitest';
import type { CoopStep } from '@miu/schema/content';
import { COOP_HOLD_MS, COOP_PAUSE_MS } from '@miu/schema/coop';
import { coopQuest } from '../../test/coop-fixture';
import { CoopSession, type CoopPerson } from './coop-session';

const stepOf = (mode: 'pieces' | 'together' | 'team-boss'): CoopStep => {
  const step = coopQuest(mode).steps.find((s): s is CoopStep => s.kind === 'coop');
  if (!step) throw new Error('no co-op step');
  return step;
};
const person = (id: string, isBot = false): CoopPerson => ({ id, displayName: `Bạn ${id}`, species: 'cat', isBot });
const A = person('p-a');
const B = person('p-b');
const BOT = person('bot-1@c1', true);

describe('pieces: each holds a clue, the answer needs them all', () => {
  it('shows each player only her clues until shared, takes the answer only when all are shared, from whose turn it is', () => {
    const s = new CoopSession('with-test-pieces', stepOf('pieces'), [A, B, BOT]);
    const a = s.view('p-a', 0);
    expect(a.pieces.map((p) => p.text)).toEqual(['Mảnh một', null, null]);
    expect(a.turn).toBe('p-a');
    expect(a.task?.choices.map((c) => c.id)).toEqual(['a', 'b']);
    // The answer is never in a view.
    expect(JSON.stringify(a)).not.toContain('"answer"');
    expect(s.act('p-a', { kind: 'answer', task: 't1', choice: 'a' }, 0)).toEqual({ ok: false, error: 'not-ready' });
    expect(s.act('p-a', { kind: 'share', piece: 1 }, 0)).toEqual({ ok: false, error: 'not-yours' });
    for (const [who, piece] of [['p-a', 0], ['p-b', 1], ['bot-1@c1', 2]] as const) expect(s.act(who, { kind: 'share', piece }, 0)).toEqual({ ok: true });
    expect(s.view('p-b', 0).pieces.map((p) => p.text)).toEqual(['Mảnh một', 'Mảnh hai', 'Mảnh ba']);
    expect(s.act('p-b', { kind: 'answer', task: 't1', choice: 'a' }, 0)).toEqual({ ok: false, error: 'not-yours' });
    // A wrong answer loses nothing: a line, and the same question waits.
    s.act('p-a', { kind: 'answer', task: 't1', choice: 'b' }, 0);
    expect(s.view('p-a', 0)).toMatchObject({ round: 0, last: { kind: 'wrong', line: 'Chưa đúng, thử lại nhé!' } });
    s.act('p-a', { kind: 'answer', task: 't1', choice: 'a' }, 0);
    const next = s.view('p-a', 0);
    expect(next.round).toBe(1);
    expect(next.turn).toBe('p-b');
    // The right answer's question and answer, to copy into the vở.
    expect(next.last).toMatchObject({ kind: 'right', by: 'p-a', copy: { step: 't1', question: 'Câu một?', answer: 'Một' } });
  });

  it('is won when every round is answered, and pays only the players who played a part', () => {
    const s = new CoopSession('with-test-pieces', stepOf('pieces'), [A, B, BOT]);
    for (const [who, piece] of [['p-a', 0], ['p-b', 1], ['bot-1@c1', 2]] as const) s.act(who, { kind: 'share', piece }, 0);
    s.act('p-a', { kind: 'answer', task: 't1', choice: 'a' }, 0);
    s.act('p-a', { kind: 'share', piece: 0 }, 0);
    s.act('p-b', { kind: 'share', piece: 1 }, 0);
    s.act('p-b', { kind: 'answer', task: 't2', choice: 'a' }, 0);
    expect(s.done).toBe(true);
    expect(s.view('p-a', 0)).toMatchObject({ status: 'done', last: { kind: 'won' } });
    expect(s.paidPlayers().sort()).toEqual(['p-a', 'p-b']);
    expect(s.act('p-a', { kind: 'share', piece: 0 }, 0)).toEqual({ ok: false, error: 'done' });
  });
});

describe('together: everyone holds at once', () => {
  it('lets a player hold once her questions are answered; the round goes on only while all hold together', () => {
    const s = new CoopSession('with-test-together', stepOf('together'), [A, B, BOT]);
    const a = s.view('p-a', 0);
    expect(a.tasks.map((t) => [t.id, t.seat, t.task?.id ?? null])).toEqual([
      ['t1', 'p-a', 't1'],
      ['t2', 'p-b', null],
    ]);
    expect(s.act('p-a', { kind: 'hold' }, 0)).toEqual({ ok: false, error: 'not-ready' });
    s.act('p-a', { kind: 'answer', task: 't1', choice: 'a' }, 0);
    s.act('p-b', { kind: 'answer', task: 't2', choice: 'a' }, 0);
    // The bot has no question this round: it only pulls.
    s.act('bot-1@c1', { kind: 'hold' }, 0);
    s.act('p-a', { kind: 'hold' }, 1_000);
    // The bot let go before the last one held: not yet.
    s.act('p-b', { kind: 'hold' }, COOP_HOLD_MS + 10);
    expect(s.view('p-a', COOP_HOLD_MS + 10).round).toBe(0);
    s.act('bot-1@c1', { kind: 'hold' }, COOP_HOLD_MS + 20);
    expect(s.view('p-a', COOP_HOLD_MS + 20).round).toBe(1);
  });
});

describe('team-boss: one shared HP, blows in turn', () => {
  it('takes HP for each right blow, passes the turn on, and wins at zero', () => {
    const s = new CoopSession('with-test-team-boss', stepOf('team-boss'), [A, B]);
    expect(s.view('p-a', 0)).toMatchObject({ turn: 'p-a', boss: { hp: 300, maxHp: 300 } });
    s.act('p-a', { kind: 'answer', task: 't1', choice: 'a' }, 0);
    expect(s.view('p-a', 0)).toMatchObject({ turn: 'p-b', boss: { hp: 200 } });
    s.act('p-b', { kind: 'answer', task: 't2', choice: 'b' }, 0);
    expect(s.view('p-a', 0)).toMatchObject({ turn: 'p-b', boss: { hp: 200 } });
    s.act('p-b', { kind: 'answer', task: 't2', choice: 'a' }, 0);
    s.act('p-a', { kind: 'answer', task: 't3', choice: 'a' }, 0);
    expect(s.done).toBe(true);
    expect(s.view('p-b', 0)).toMatchObject({ status: 'done', boss: { hp: 0 }, last: { kind: 'won', line: 'Trùm chịu thua!' } });
  });

  it('gives the hint and the explained answer only for a question she can see', () => {
    const s = new CoopSession('with-test-team-boss', stepOf('team-boss'), [A, B]);
    expect(s.help('p-b', 't1', 'hint')).toMatchObject({ text: 'Gợi ý cho t1' });
    expect(s.help('p-a', 't1', 'answer')).toEqual({ text: 'Một', textEn: 'Một (en)', explanation: 'Giải thích cho t1', explanationEn: 'Why for t1' });
    expect(s.help('p-a', 't3', 'answer')).toBeNull();
    expect(s.help('p-x', 't1', 'answer')).toBeNull();
  });
});

describe('a player drops out or steps out', () => {
  it('pauses a minute for her, then the next player plays her place; back, she plays it again', () => {
    const s = new CoopSession('with-test-team-boss', stepOf('team-boss'), [A, B]);
    s.away('p-a', 0, null);
    expect(s.view('p-b', 1_000)).toMatchObject({ status: 'paused', waitingFor: { id: 'p-a', msLeft: COOP_PAUSE_MS - 1_000 } });
    expect(s.act('p-b', { kind: 'answer', task: 't1', choice: 'a' }, 1_000)).toEqual({ ok: false, error: 'paused' });
    // The minute is over: B plays A's turn, and keeps what the team did.
    expect(s.view('p-b', COOP_PAUSE_MS)).toMatchObject({ status: 'playing', turn: 'p-b' });
    s.act('p-b', { kind: 'answer', task: 't1', choice: 'a' }, COOP_PAUSE_MS);
    expect(s.back('p-a')).toBe(true);
    expect(s.view('p-a', COOP_PAUSE_MS)).toMatchObject({ turn: 'p-b', boss: { hp: 200 } });
  });

  it('lets a bot stand in at once instead of pausing, and gives the place back', () => {
    const s = new CoopSession('with-test-team-boss', stepOf('team-boss'), [A, B]);
    s.away('p-a', 0, BOT);
    expect(s.view('p-b', 0)).toMatchObject({ status: 'playing', turn: 'bot-1@c1', seats: [{ id: 'p-a', standIn: { id: 'bot-1@c1' }, away: false }, { id: 'p-b' }] });
    expect(s.audience().map((p) => p.id).sort()).toEqual(['bot-1@c1', 'p-a', 'p-b']);
    s.back('p-a');
    expect(s.view('p-b', 0).turn).toBe('p-a');
  });

  it('never pays a player who stepped out, and goes on without her', () => {
    const s = new CoopSession('with-test-team-boss', stepOf('team-boss'), [A, B]);
    s.act('p-a', { kind: 'answer', task: 't1', choice: 'a' }, 0);
    s.leave('p-a', null);
    expect(s.has('p-a')).toBe(false);
    expect(s.playersIn()).toEqual(['p-b']);
    s.act('p-b', { kind: 'answer', task: 't2', choice: 'a' }, 0);
    s.act('p-b', { kind: 'answer', task: 't3', choice: 'a' }, 0);
    expect(s.done).toBe(true);
    expect(s.paidPlayers()).toEqual(['p-b']);
  });

  it('pays nobody for a challenge a bot played alone in her place', () => {
    const s = new CoopSession('with-test-team-boss', stepOf('team-boss'), [A, BOT]);
    s.away('p-a', 0, person('bot-2@c1', true));
    for (const [who, task] of [['bot-2@c1', 't1'], ['bot-1@c1', 't2'], ['bot-2@c1', 't3']] as const) s.act(who, { kind: 'answer', task, choice: 'a' }, 0);
    expect(s.done).toBe(true);
    expect(s.paidPlayers()).toEqual([]);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActiveQuest } from '@miu/schema/content';
import { COOP_COUNTDOWN_MS, COOP_PAUSE_MS, type CoopResult, type CoopStateView } from '@miu/schema/coop';
import { coopQuest } from '../../test/coop-fixture';
import { hubHarness, settle, type Client } from '../../test/hub-harness';
import { CoopService, type CoopBotDriver, type CoopBotMoves } from './coop-service';

const QUESTS = new Map(['pieces', 'together', 'team-boss'].map((mode) => [`with-test-${mode}`, coopQuest(mode as 'pieces')]));

/** Bots that play only when the test says, always answering right. */
function testBots() {
  const seen = new Map<string, { state: CoopStateView; moves: CoopBotMoves }>();
  const driver: CoopBotDriver = {
    pick: (_mapId, count, exclude) =>
      ['bot-tt-1', 'bot-tt-2', 'bot-tt-3'].filter((id) => !exclude.has(id)).slice(0, count).map((id) => ({ id, displayName: `Máy ${id}`, species: 'fox', isBot: true })),
    play: (botId, state, moves) => void seen.set(botId, { state, moves }),
    forget: (ids) => ids.forEach((id) => seen.delete(id)),
  };
  /** Every bot whose turn it is answers right; each shares its clue. */
  const playAll = (): void => {
    for (const [, { state, moves }] of [...seen]) {
      const clue = state.pieces.find((p) => p.text !== null && !p.shared);
      if (clue) moves.act({ kind: 'share', piece: clue.index });
      else if (state.task && state.turn === state.self && state.pieces.every((p) => p.shared)) moves.act({ kind: 'answer', task: state.task.id, choice: moves.answerOf(state.task.id) ?? '' });
    }
  };
  return { driver, seen, playAll };
}

function setup() {
  const h = hubHarness();
  const paid: Array<{ child: string; quest: string }> = [];
  const bots = testBots();
  const coop = new CoopService({
    host: h.hub.coopHost(),
    quest: (id) => QUESTS.get(id) ?? null,
    rewards: {
      pay: async (child: string, quest: ActiveQuest): Promise<CoopResult> => {
        paid.push({ child, quest: quest.id });
        return { reward: structuredClone(quest.reward), completion: null, unpaid: null };
      },
    },
    bots: bots.driver,
    now: () => h.clock.now,
  });
  h.hub.setCoop(coop);
  return { ...h, coop, paid, bots };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const state = (c: Client): CoopStateView | undefined => c.last('coop-state')?.state;

async function party(h: ReturnType<typeof setup>, ...ids: string[]): Promise<Client[]> {
  const clients = [];
  for (const id of ids) clients.push(await h.joined(id));
  await settle();
  const [leader, ...rest] = clients;
  if (!leader) throw new Error('no leader');
  for (const member of rest) {
    leader.send({ type: 'party-invite', to: member.id });
    member.send({ type: 'party-reply', from: leader.id, accept: true });
  }
  return clients;
}

async function startAndWait(h: ReturnType<typeof setup>, leader: Client): Promise<void> {
  leader.send({ type: 'coop-start' });
  h.clock.now += COOP_COUNTDOWN_MS;
  await vi.advanceTimersByTimeAsync(COOP_COUNTDOWN_MS);
}

describe('the lobby', () => {
  it('opens at the leader for the whole party; the others say they are in; the countdown opens the challenge', async () => {
    const h = setup();
    const [a, b] = await party(h, 'child-a', 'child-b');
    if (!a || !b) throw new Error('no party');
    // Only the leader picks.
    b.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    expect(b.last('notice')).toMatchObject({ code: 'not-leader' });
    a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    expect(b.last('coop-lobby')?.lobby).toMatchObject({ questId: 'with-test-team-boss', leader: a.id, botsFill: 0, startsInMs: null, members: [{ id: a.id, ready: true }, { id: b.id, ready: false }] });
    b.send({ type: 'coop-ready', ready: true });
    expect(a.last('coop-lobby')?.lobby?.members[1]).toMatchObject({ id: b.id, ready: true });
    a.send({ type: 'coop-start' });
    expect(b.last('coop-lobby')?.lobby?.startsInMs).toBe(COOP_COUNTDOWN_MS);
    h.clock.now += COOP_COUNTDOWN_MS;
    await vi.advanceTimersByTimeAsync(COOP_COUNTDOWN_MS);
    expect(a.last('coop-lobby')?.lobby).toBeNull();
    expect(state(b)).toMatchObject({ mode: 'team-boss', self: b.id, turn: a.id, seats: [{ id: a.id }, { id: b.id }] });
  });

  it('loses nothing when a player steps out before the start: the countdown stops, the leader may start again', async () => {
    const h = setup();
    const [a, b] = await party(h, 'child-a', 'child-b');
    if (!a || !b) throw new Error('no party');
    a.send({ type: 'coop-open', questId: 'with-test-pieces' });
    b.send({ type: 'coop-ready', ready: true });
    a.send({ type: 'coop-start' });
    b.send({ type: 'coop-leave' });
    expect(a.last('coop-lobby')?.lobby).toMatchObject({ startsInMs: null, members: [{ ready: true }, { ready: false }] });
    await vi.advanceTimersByTimeAsync(COOP_COUNTDOWN_MS);
    expect(a.all('coop-state')).toHaveLength(0);
    // The leader stepping out closes it for everyone.
    a.send({ type: 'coop-leave' });
    expect(b.last('coop-lobby')?.lobby).toBeNull();
  });

  it('refuses a challenge that is not a co-op one, and a start beyond the limit', async () => {
    const h = setup();
    const a = await h.joined('child-a');
    await settle();
    a.send({ type: 'coop-open', questId: 'tv2-t1-b01' });
    expect(a.last('notice')).toMatchObject({ code: 'coop-unknown' });
    for (let i = 0; i < 8; i++) {
      a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
      a.send({ type: 'coop-start' });
      h.clock.now += COOP_COUNTDOWN_MS;
      await vi.advanceTimersByTimeAsync(COOP_COUNTDOWN_MS);
      a.send({ type: 'coop-leave' });
    }
    a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    a.send({ type: 'coop-start' });
    expect(a.last('notice')).toMatchObject({ code: 'rate-limited' });
  });
});

describe('playing together', () => {
  it('two players each play a part and are each paid once by the server; a reward sent by a client is refused', async () => {
    const h = setup();
    const [a, b] = await party(h, 'child-a', 'child-b');
    if (!a || !b) throw new Error('no party');
    a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    b.send({ type: 'coop-ready', ready: true });
    await startAndWait(h, a);
    // Not hers to answer, and no field beyond the action is taken.
    b.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } });
    b.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' }, reward: { xp: 9999 } });
    expect(state(a)?.boss?.hp).toBe(300);
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } });
    b.send({ type: 'coop-act', action: { kind: 'answer', task: 't2', choice: 'a' } });
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't3', choice: 'a' } });
    await settle();
    expect(h.paid.sort((x, y) => x.child.localeCompare(y.child))).toEqual([
      { child: 'child-a', quest: 'with-test-team-boss' },
      { child: 'child-b', quest: 'with-test-team-boss' },
    ]);
    for (const c of [a, b]) expect(c.last('coop-end')).toMatchObject({ reason: 'done', result: { reward: { xp: 40, coin: 15 }, unpaid: null } });
    // Over: another answer changes and pays nothing.
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't4', choice: 'a' } });
    await settle();
    expect(h.paid).toHaveLength(2);
  });

  it('fills the free places of a player alone with labelled bots when her switch is on; only she is paid', async () => {
    const h = setup();
    const a = await h.joined('child-a');
    await settle();
    a.send({ type: 'coop-open', questId: 'with-test-pieces' });
    expect(a.last('coop-lobby')?.lobby).toMatchObject({ botsFill: 2, seats: 3 });
    await startAndWait(h, a);
    const seats = state(a)?.seats ?? [];
    expect(seats.map((s) => s.isBot)).toEqual([false, true, true]);
    expect(seats.every((s) => !s.isBot || s.id.includes('@'))).toBe(true);
    a.send({ type: 'coop-act', action: { kind: 'share', piece: 0 } });
    h.bots.playAll();
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } });
    a.send({ type: 'coop-act', action: { kind: 'share', piece: 0 } });
    h.bots.playAll();
    h.bots.playAll();
    await settle();
    expect(h.paid).toEqual([{ child: 'child-a', quest: 'with-test-pieces' }]);
    expect(h.bots.seen.size).toBe(0);
  });

  it('plays alone, every place hers, when her bot switch is off', async () => {
    const h = setup();
    h.db.settings.set('child-a', { botsEnabled: false });
    const a = await h.joined('child-a');
    await settle();
    a.send({ type: 'coop-open', questId: 'with-test-pieces' });
    expect(a.last('coop-lobby')?.lobby?.botsFill).toBe(0);
    await startAndWait(h, a);
    expect(state(a)?.seats).toHaveLength(1);
    expect(state(a)?.pieces.every((p) => p.text !== null)).toBe(true);
  });
});

describe('dropping out, stepping out, blocking', () => {
  it('waits a minute for a player who dropped out (bots off), keeping what was done; back, she goes on', async () => {
    const h = setup();
    h.db.settings.set('child-a', { botsEnabled: false });
    h.db.settings.set('child-b', { botsEnabled: false });
    const [a, b] = await party(h, 'child-a', 'child-b');
    if (!a || !b) throw new Error('no party');
    a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    b.send({ type: 'coop-ready', ready: true });
    await startAndWait(h, a);
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } });
    b.conn.close();
    expect(state(a)).toMatchObject({ status: 'paused', waitingFor: { id: b.id, msLeft: COOP_PAUSE_MS }, boss: { hp: 200 } });
    const back = await h.joined('child-b');
    await settle();
    expect(state(back)).toMatchObject({ status: 'playing', turn: back.id, boss: { hp: 200 } });
  });

  it('lets a bot stand in at once for a player who dropped out when bots may play', async () => {
    const h = setup();
    const [a, b] = await party(h, 'child-a', 'child-b');
    if (!a || !b) throw new Error('no party');
    a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    b.send({ type: 'coop-ready', ready: true });
    await startAndWait(h, a);
    a.send({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } });
    b.conn.close();
    expect(state(a)).toMatchObject({ status: 'playing', seats: [{ id: a.id }, { id: b.id, standIn: { displayName: 'Máy bot-tt-1' } }] });
    h.bots.playAll();
    expect(state(a)).toMatchObject({ turn: a.id, boss: { hp: 100 } });
  });

  it('ends it gently for a player who leaves the party or blocks a teammate; the team goes on', async () => {
    const h = setup();
    h.db.settings.set('child-a', { botsEnabled: false });
    const [a, b, c] = await party(h, 'child-a', 'child-b', 'child-c');
    if (!a || !b || !c) throw new Error('no party');
    a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    b.send({ type: 'coop-ready', ready: true });
    c.send({ type: 'coop-ready', ready: true });
    await startAndWait(h, a);
    b.send({ type: 'party-leave' });
    expect(b.last('coop-end')).toMatchObject({ reason: 'left', result: null });
    c.send({ type: 'block', id: a.id });
    await settle();
    expect(c.last('coop-end')).toMatchObject({ reason: 'left' });
    // A plays on alone (her switch is off: no bot), every place hers.
    expect(state(a)).toMatchObject({ status: 'playing', turn: a.id });
    for (const task of ['t1', 't2', 't3']) a.send({ type: 'coop-act', action: { kind: 'answer', task, choice: 'a' } });
    await settle();
    expect(h.paid.map((p) => p.child)).toEqual(['child-a']);
  });
});

describe('a full team, a lobby left behind, a block after the party is gone', () => {
  it('takes no more players than the challenge has places: the last one in is told the team is full', async () => {
    const h = setup();
    const [a, b, c, d] = await party(h, 'child-a', 'child-b', 'child-c', 'child-d');
    if (!a || !b || !c || !d) throw new Error('no party');
    a.send({ type: 'coop-open', questId: 'with-test-pieces' });
    for (const m of [b, c, d]) m.send({ type: 'coop-ready', ready: true });
    await startAndWait(h, a);
    expect(state(a)?.seats.map((s) => s.id)).toEqual([a.id, b.id, c.id]);
    expect(d.last('notice')).toMatchObject({ code: 'party-full' });
    expect(d.all('coop-state')).toHaveLength(0);
  });

  it('closes the lobby of a leader who drops out, so it never comes back later', async () => {
    const h = setup();
    const a = await h.joined('child-a');
    await settle();
    a.send({ type: 'coop-open', questId: 'with-test-pieces' });
    a.conn.close();
    const back = await h.joined('child-a');
    await settle();
    expect(back.all('coop-lobby').filter((m) => m.lobby !== null)).toHaveLength(0);
  });

  it('takes a player out of a challenge when she blocks a teammate, even after their party is gone', async () => {
    const h = setup();
    h.db.settings.set('child-a', { botsEnabled: false });
    h.db.settings.set('child-b', { botsEnabled: false });
    const [a, b] = await party(h, 'child-a', 'child-b');
    if (!a || !b) throw new Error('no party');
    a.send({ type: 'coop-open', questId: 'with-test-team-boss' });
    b.send({ type: 'coop-ready', ready: true });
    await startAndWait(h, a);
    // B drops out long enough for the party to let her go; she comes back to her place in the challenge.
    b.conn.close();
    h.clock.now += 31_000;
    await vi.advanceTimersByTimeAsync(31_000);
    expect(a.last('party-state')?.party).toBeNull();
    const back = await h.joined('child-b');
    await settle();
    expect(state(back)?.status).toBe('playing');
    back.send({ type: 'block', id: a.id });
    await settle();
    expect(back.last('coop-end')).toMatchObject({ reason: 'left' });
  });
});

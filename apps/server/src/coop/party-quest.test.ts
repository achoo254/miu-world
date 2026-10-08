import { and, asc, eq, like, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, FIXTURE_CONTENT, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { hubHarness, type Client } from '../../test/hub-harness';
import { questProgress, rewardLedger } from '../db/schema';
import { paidRuns } from '../reward/reward-ledger';
import type { PartyQuestBotDriver, PartyQuestBotMoves, PartyQuestBotSituation } from './bot-party-quest';
import { BOT_MOVE_TRIES, PartyQuestService, type PartyQuestHooks, type PartyQuestOptions } from './party-quest';
import { PARTY_QUEST as QUEST } from './party-quest-fixtures';

const CONTENT = { ...FIXTURE_CONTENT, quests: new Map([...FIXTURE_CONTENT.quests, [QUEST.id, QUEST]]) };

let app: TestApp;
let service: PartyQuestService | null = null;
const hooks: PartyQuestHooks = {
  gate: async (...args) => (service ? service.gate(...args) : 'ok'),
  recorded: async (...args) => service?.recorded(...args),
};
beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, {}, undefined, CONTENT, { partyQuests: hooks });
});
afterAll(async () => {
  await app.handle.close();
});

async function party(): Promise<{ h: ReturnType<typeof hubHarness>; a: Client; b: Client; agentA: Agent; agentB: Agent; childA: string; childB: string }> {
  const h = hubHarness();
  service = new PartyQuestService({ db: app.db, content: CONTENT, host: h.hub.coopHost() });
  h.hub.setPartyQuests(service);
  const [{ agent: agentA, childId: childA }, { agent: agentB, childId: childB }] = await Promise.all([parentWithChild(app), parentWithChild(app)]);
  const a = await h.joined(childA);
  const b = await h.joined(childB);
  await vi.waitFor(() => expect(a.last('party-state')).toBeDefined());
  a.send({ type: 'party-invite', to: b.id });
  b.send({ type: 'party-reply', from: a.id, accept: true });
  return { h, a, b, agentA, agentB, childA, childB };
}

const step = (agent: Agent, id: string, body: object = {}) => agent.post(`/api/quests/${QUEST.id}/steps/${id}/complete`).send(body);
const doneOf = async (childId: string): Promise<string[]> =>
  (await app.db.select().from(questProgress).where(and(eq(questProgress.childId, childId), eq(questProgress.questId, QUEST.id))))[0]?.completedSteps ?? [];

describe('a quest played by a party', () => {
  it('shares the talks, waits for every answer, plays the boss as a team, and pays each member once', async () => {
    const { a, b, agentA, agentB, childA, childB } = await party();
    a.send({ type: 'party-quest-start', questId: QUEST.id });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).toMatchObject({ questId: QUEST.id, leader: a.id, members: [{ id: a.id, joined: true }, { id: b.id, joined: false }] }));
    b.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));

    // A talks to the parrot: B's own progress moves too.
    await step(agentA, 'gap').expect(200);
    await vi.waitFor(async () => expect(await doneOf(childB)).toEqual(['gap']));
    await vi.waitFor(() => expect(b.last('party-quest-progress')?.progress.completedSteps).toEqual(['gap']));

    // A answers the riddle; she may not go on before B has answered it too.
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    expect((await step(agentA, 'sau').expect(409)).body).toEqual({ error: 'party-waiting' });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.find((m) => m.id === b.id)?.waiting).toBe(true));
    await step(agentB, 'do', { answer: { value: 7 } }).expect(200);
    await step(agentA, 'sau').expect(200);
    await vi.waitFor(async () => expect(await doneOf(childB)).toEqual(['gap', 'do', 'sau']));

    // The boss: one HP for the party, blows in turn (A first).
    await vi.waitFor(() => expect(b.last('party-quest')?.quest?.turn).toBe(a.id));
    expect((await step(agentB, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(409)).body).toEqual({ error: 'not-your-turn' });
    await step(agentA, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(200);
    await vi.waitFor(() => expect(b.last('party-quest-progress')?.progress.bossState?.trum?.hp).toBe(100));
    await step(agentB, 'trum', { answer: { turnId: 't2', choice: 'b' } }).expect(200);
    for (const child of [childA, childB]) await vi.waitFor(async () => expect(await doneOf(child)).toContain('trum'));

    // Each plays her own ending and is paid her own run, once.
    for (const agent of [agentA, agentB]) {
      await step(agent, 'thuong').expect(200);
      const last = await step(agent, 'tiep').expect(200);
      expect(last.body.reward).toMatchObject({ xp: expect.any(Number), coin: 10 });
    }
    for (const child of [childA, childB]) {
      const rows = await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, child), like(rewardLedger.source, `quest:${QUEST.id}%`)));
      expect(rows.map((r) => r.source)).toEqual([`quest:${QUEST.id}`]);
    }

    // B leaves the party: the party's quest is over for her, her progress stays.
    b.send({ type: 'party-leave' });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).toBeNull());
  });

  it('plays a replay for a member who finished the quest before, and leaves solo play as it was', async () => {
    const { a, b, agentA, agentB, childA } = await party();
    // A finishes it alone first (no party quest yet: nothing waits).
    await step(agentA, 'gap').expect(200);
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    await step(agentA, 'sau').expect(200);
    await step(agentA, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(200);
    await step(agentA, 'trum', { answer: { turnId: 't2', choice: 'b' } }).expect(200);
    await step(agentA, 'thuong', { run: 1 }).expect(200);
    await step(agentA, 'tiep', { run: 1 }).expect(200);
    a.send({ type: 'party-quest-start', questId: QUEST.id });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).not.toBeNull());
    b.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));
    // B talks: A's second run starts with it.
    await step(agentB, 'gap').expect(200);
    await vi.waitFor(async () => expect(await doneOf(childA)).toEqual(['gap']));
    // The progress goes out once the catch-up has run through (after the step is saved): wait for it too.
    await vi.waitFor(() => expect(a.last('party-quest-progress')?.progress.run).toBe(2));
  });
});

describe('a member out of the party', () => {
  it('holds nobody back once the party lets her go', async () => {
    const { a, b, agentA } = await party();
    a.send({ type: 'party-quest-start', questId: QUEST.id });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).not.toBeNull());
    b.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));
    await step(agentA, 'gap').expect(200);
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    expect((await step(agentA, 'sau').expect(409)).body).toEqual({ error: 'party-waiting' });
    // B drops out: while she is away she holds nobody back.
    b.conn.close();
    await step(agentA, 'sau').expect(200);
  });
});

const BOT = 'bot-tt-1';

/** Bots' play as the test drives it: what each bot was last shown, and what it was told. */
function scriptedBots() {
  const seen = new Map<string, { situation: PartyQuestBotSituation; moves: PartyQuestBotMoves }>();
  const finished: Array<{ bot: string; quest: string; players: readonly string[] }> = [];
  const forgot: string[] = [];
  const alone: Array<{ player: string; finished: boolean }> = [];
  const driver: PartyQuestBotDriver = {
    play: (bot, situation, moves) => void seen.set(bot, { situation, moves }),
    finished: (bot, quest, players) => void finished.push({ bot, quest, players }),
    forget: (ids) => void forgot.push(...ids),
    playedAlone: (player, done) => void alone.push({ player, finished: done }),
  };
  const of = (bot: string): { situation: PartyQuestBotSituation; moves: PartyQuestBotMoves } => {
    const last = seen.get(bot);
    if (!last) throw new Error(`${bot} was shown nothing`);
    return last;
  };
  return { driver, seen, finished, forgot, alone, of };
}

/** A player on the map with a companion bot beside her that asked her into its party; she said yes and leads it. */
async function withBot(options: Pick<PartyQuestOptions, 'botMoveRetryMs'> = {}) {
  const h = hubHarness();
  service = new PartyQuestService({ db: app.db, content: CONTENT, host: h.hub.coopHost(), ...options });
  h.hub.setPartyQuests(service);
  const bots = scriptedBots();
  h.hub.setPartyQuestBots(bots.driver);
  const { agent: agentA, childId: childA } = await parentWithChild(app);
  const a = await h.joined(childA);
  const room = h.hub.getOrCreateRoom('trung-tam');
  h.bot(room, BOT, [12, 5, 10]);
  await vi.waitFor(() => expect(h.hub.botMayInvite(BOT, a.id)).toBe(true));
  expect(h.hub.botPartyInvite(BOT, a.id)).toBe(true);
  a.send({ type: 'party-reply', from: BOT, accept: true });
  await vi.waitFor(() => expect(a.last('party-state')?.party).toMatchObject({ leader: a.id, members: [{ id: a.id }, { id: BOT, isBot: true }] }));
  return { h, a, agentA, childA, bots, room };
}

const memberOf = (client: Client, id: string) => client.last('party-quest')?.quest?.members.find((m) => m.id === id);

/** Every step of the quest by one player alone, right the first time. */
async function playAlone(agent: Agent): Promise<void> {
  await step(agent, 'gap').expect(200);
  await step(agent, 'do', { answer: { value: 7 } }).expect(200);
  await step(agent, 'sau').expect(200);
  await step(agent, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(200);
  await step(agent, 'trum', { answer: { turnId: 't2', choice: 'b' } }).expect(200);
  await step(agent, 'thuong').expect(200);
  await step(agent, 'tiep').expect(200);
}

/** What a player was paid (every ledger row, all sources) and what her progress on the quest holds. */
async function paidTo(childId: string) {
  const ledger = await app.db
    .select({ source: rewardLedger.source, xp: rewardLedger.xp, coins: rewardLedger.coins, skillXp: rewardLedger.skillXp, items: rewardLedger.items })
    .from(rewardLedger)
    .where(eq(rewardLedger.childId, childId))
    .orderBy(asc(rewardLedger.source));
  // A run's collectible drop is picked from the player's own id: which thing differs between two players, not how
  // many.
  const paid = ledger.map((row) => (row.source.startsWith('drop:') ? { ...row, items: { things: Object.values(row.items).reduce((a, b) => a + b, 0) } } : row));
  const [progress] = await app.db
    .select({ completedSteps: questProgress.completedSteps, found: questProgress.found, stars: questProgress.stars, finished: sql<boolean>`${questProgress.completedAt} is not null` })
    .from(questProgress)
    .where(and(eq(questProgress.childId, childId), eq(questProgress.questId, QUEST.id)));
  return { ledger: paid, progress, runs: await paidRuns(app.db, childId, QUEST.id) };
}

/** Rows in the whole database: a bot that wrote anything would add some of its own. */
async function rowCounts(): Promise<{ progress: number; ledger: number }> {
  const [progress] = await app.db.select({ n: sql<number>`count(*)::int` }).from(questProgress);
  const [ledger] = await app.db.select({ n: sql<number>`count(*)::int` }).from(rewardLedger);
  return { progress: progress?.n ?? 0, ledger: ledger?.n ?? 0 };
}

describe('a quest a companion bot asks its party to play', () => {
  it('has the bot follow on shared steps, the party wait for its answers, its boss blow count for her, and pays her exactly as alone', async () => {
    // Another player plays the quest alone: what one run pays with nobody else.
    const solo = await parentWithChild(app);
    await playAlone(solo.agent);

    const { h, a, agentA, childA, bots } = await withBot();
    const before = await rowCounts();
    expect(h.hub.botProposeQuest(BOT, a.id, QUEST.id)).toBe(true);
    await vi.waitFor(() =>
      expect(a.last('party-quest')?.quest).toMatchObject({ questId: QUEST.id, leader: BOT, members: [{ id: BOT, displayName: `Bot ${BOT}`, joined: true }, { id: a.id, joined: false }] }),
    );
    // One quest at a time, and only a bot asks this way.
    expect(h.hub.botProposeQuest(BOT, a.id, QUEST.id)).toBe(false);
    expect(h.hub.botProposeQuest(a.id, a.id, QUEST.id)).toBe(false);
    a.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));
    await vi.waitFor(() => expect(bots.of(BOT).situation.front).toBe(0));
    expect(bots.of(BOT).situation.done.size).toBe(0);

    // She talks to the parrot: the bot follows (it never does a shared step first).
    await step(agentA, 'gap').expect(200);
    await vi.waitFor(() => expect(memberOf(a, BOT)?.done).toBe(1));

    // She answers the riddle; the party waits for the bot's own answer.
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    expect((await step(agentA, 'sau').expect(409)).body).toEqual({ error: 'party-waiting' });
    await vi.waitFor(() => expect(memberOf(a, BOT)?.waiting).toBe(true));
    // A move out of turn changes nothing; its answer to its own question lets her on.
    bots.of(BOT).moves.done('sau');
    bots.of(BOT).moves.blow('trum', 't1');
    await vi.waitFor(() => expect(bots.of(BOT).situation.front).toBe(2));
    expect([...bots.of(BOT).situation.done]).toEqual(['gap']);
    bots.of(BOT).moves.done('do');
    await vi.waitFor(() => expect(memberOf(a, BOT)?.waiting).toBe(false));
    await step(agentA, 'sau').expect(200);

    // The boss: the bot asked, so its blow comes first; its right blow counts for her.
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.turn).toBe(BOT));
    expect((await step(agentA, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(409)).body).toEqual({ error: 'not-your-turn' });
    await vi.waitFor(() => expect(bots.of(BOT).situation.blow).toEqual({ stepId: 'trum', turnId: 't1' }));
    bots.of(BOT).moves.blow('trum', 't1');
    await vi.waitFor(() => expect(a.last('party-quest-progress')?.progress.bossState?.trum?.hp).toBe(100));
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.turn).toBe(a.id));
    await step(agentA, 'trum', { answer: { turnId: 't2', choice: 'b' } }).expect(200);
    await step(agentA, 'thuong').expect(200);
    const last = await step(agentA, 'tiep').expect(200);
    expect(last.body.reward).toMatchObject({ coin: 10 });

    // The bot played it through with her, and is told so once.
    await vi.waitFor(() => expect(bots.finished).toEqual([{ bot: BOT, quest: QUEST.id, players: [a.id] }]));
    await vi.waitFor(() => expect(memberOf(a, BOT)).toMatchObject({ done: QUEST.steps.length, finished: true }));

    // Paid exactly as alone: the same runs, ledger rows (XP, coins, skill XP, items) and progress.
    const alone = await paidTo(solo.childId);
    const withTheBot = await paidTo(childA);
    expect(alone.runs).toBe(1);
    expect(alone.ledger.map((r) => r.source)).toContain(`quest:${QUEST.id}`);
    expect(alone.progress?.finished).toBe(true);
    expect(withTheBot).toEqual(alone);
    // Nothing of the bot's was written: the only new rows are hers.
    const after = await rowCounts();
    expect(after.progress - before.progress).toBe(1);
    expect(after.ledger - before.ledger).toBe(withTheBot.ledger.length);
  });

  it('strikes the boss again after a database read failed, so one failure never leaves the party stuck on its turn', async () => {
    const { h, a, agentA, bots } = await withBot({ botMoveRetryMs: 20 });
    expect(h.hub.botProposeQuest(BOT, a.id, QUEST.id)).toBe(true);
    a.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));
    await step(agentA, 'gap').expect(200);
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    await vi.waitFor(() => expect(memberOf(a, BOT)?.waiting).toBe(true));
    bots.of(BOT).moves.done('do');
    await vi.waitFor(() => expect(memberOf(a, BOT)?.waiting).toBe(false));
    await step(agentA, 'sau').expect(200);
    await vi.waitFor(() => expect(bots.of(BOT).situation.blow).toEqual({ stepId: 'trum', turnId: 't1' }));

    // The database does not answer the read its blow makes, once.
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const states = vi.spyOn(service as unknown as { states: (run: unknown) => Promise<unknown> }, 'states').mockRejectedValueOnce(new Error('connection lost'));
    bots.of(BOT).moves.blow('trum', 't1');
    await vi.waitFor(() => expect(a.last('party-quest-progress')?.progress.bossState?.trum?.hp).toBe(100));
    expect(logged).toHaveBeenCalledWith('party quest bot move failed', 'Error', `try 1 of ${BOT_MOVE_TRIES}`);
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.turn).toBe(a.id));
    states.mockRestore();
    logged.mockRestore();
  });

  it('ends when she says "later", and a bot gone from the map holds nobody back', async () => {
    const { h, a, agentA, bots, room } = await withBot();
    expect(h.hub.botProposeQuest(BOT, a.id, QUEST.id)).toBe(true);
    await vi.waitFor(() => expect(a.last('party-quest')?.quest).not.toBeNull());
    a.send({ type: 'party-quest-leave' });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest).toBeNull());
    expect(bots.forgot).toEqual([BOT]);

    // Asked again, she plays; the bot leaves the map before it answers the riddle.
    expect(h.hub.botProposeQuest(BOT, a.id, QUEST.id)).toBe(true);
    await vi.waitFor(() => expect(a.last('party-quest')?.quest).not.toBeNull());
    a.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));
    await step(agentA, 'gap').expect(200);
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    expect((await step(agentA, 'sau').expect(409)).body).toEqual({ error: 'party-waiting' });
    room.leave(BOT);
    await step(agentA, 'sau').expect(200);
    // The bot leaving the party ends its quest.
    h.hub.botLeaveParty(BOT);
    await vi.waitFor(() => expect(a.last('party-quest')?.quest).toBeNull());
    expect(bots.forgot).toEqual([BOT, BOT]);
  });

  it('tells the party\'s bots of a quest she plays on her own: each step she tries, and once when she finishes it', async () => {
    const { a, agentA, bots } = await withBot();
    await playAlone(agentA);
    await vi.waitFor(() => expect(bots.alone.filter((t) => t.finished)).toEqual([{ player: a.id, finished: true }]));
    // Every step tried (the boss twice), then the finish; nothing played as a party.
    expect(bots.alone).toHaveLength(QUEST.steps.length + 2);
    expect(bots.alone.slice(0, -1).every((t) => t.player === a.id && !t.finished)).toBe(true);
    expect(bots.seen.size).toBe(0);
  });

  it('has the party\'s bots play along in a quest a player starts', async () => {
    const { h, a, b } = await party();
    const bots = scriptedBots();
    h.hub.setPartyQuestBots(bots.driver);
    const bot = h.bot(h.hub.getOrCreateRoom('trung-tam'), BOT, [12, 5, 10]);
    await vi.waitFor(() => expect(a.last('party-state')?.party?.members).toHaveLength(2));
    a.send({ type: 'party-invite', to: BOT });
    await vi.waitFor(() => expect(bot.inbox.some((m) => m.type === 'party-invite')).toBe(true));
    h.hub.answerPartyInvite(BOT, a.id, true);
    await vi.waitFor(() => expect(a.last('party-state')?.party?.members).toHaveLength(3));
    a.send({ type: 'party-quest-start', questId: QUEST.id });
    await vi.waitFor(() =>
      expect(b.last('party-quest')?.quest).toMatchObject({ leader: a.id, members: [{ id: a.id, joined: true }, { id: BOT, joined: true }, { id: b.id, joined: false }] }),
    );
    await vi.waitFor(() => expect(bots.of(BOT).situation.quest.id).toBe(QUEST.id));
  });
});

// The whole way from a companion bot meeting a player to a quest played together, with every real part in it (in
// place of a browser test): the hub, the bot runner with its bots' minds on the school's real walk grid, the party
// and party quest services, the server's quest routes and their database (PGlite), on the test's clock. A bot sees
// her and chooses to go and meet her; it talks to her, and once they have met again it asks her into a party; she
// says yes and leads it; it asks the party to play a quest and leads that run; she joins and plays every step
// through the server's routes while the bot plays its own part; she is paid exactly what one run alone pays, nothing
// is written for the bot, and it remembers her, waves goodbye and leaves the party.
import { and, asc, eq, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { INTERACT_RANGE, type ServerWsMessage } from '@miu/schema/multiplayer';
import { createTestApp, FIXTURE_CONTENT, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { hubHarness, type Client } from '../../test/hub-harness';
import { PartyQuestService, type PartyQuestHooks } from '../coop/party-quest';
import { PARTY_QUEST as QUEST } from '../coop/party-quest-fixtures';
import { questProgress, rewardLedger } from '../db/schema';
import { paidRuns } from '../reward/reward-ledger';
import { BOT_TEAM_LEAVE_MS, BotRunner } from './bot-runner';
import { BOT_MAP_CONFIGS } from './bot-profiles';
import { memoryBotStore } from './bot-store';
import { PartyService } from './party-service';
import { Brain } from './bot-brain/brain';
import { contentQuestBook, type BotQuest } from './bot-brain/quest-plan';
import { WalkStore } from './bot-brain/walk-store';

const SCHOOL = 'truong-hoc';
const CONTENT = { ...FIXTURE_CONTENT, quests: new Map([...FIXTURE_CONTENT.quests, [QUEST.id, QUEST]]) };
/** Four of the school's bots (homes around x 380…410, z 310…340), on the school's real walk grid. */
const SCHOOL_BOTS = (BOT_MAP_CONFIGS[SCHOOL] ?? []).slice(0, 4);
const walk = new WalkStore();
const schoolGrid = walk.get(SCHOOL);
/** A day the school's quests are what they are every day (no event on). */
const DAY = new Date(Date.UTC(2026, 9, 7, 3));
/**
 * What the school's bots play: the test content's party quest by its id (the quest they ask a party to play, which
 * the party quest service knows), over the steps of a real quest of the school, so that on their own they walk to
 * real places of its grid as they do in the game.
 */
function schoolQuest(): BotQuest {
  const real = contentQuestBook().questsOn(SCHOOL, DAY).find((q) => q.steps.some((s) => s.targets.length > 0));
  if (!real) throw new Error(`no quest with places on ${SCHOOL}`);
  return { id: QUEST.id, steps: real.steps };
}

let app: TestApp;
let service: PartyQuestService | null = null;
let runner: BotRunner | null = null;
let hub: { close(): Promise<void> } | null = null;
const hooks: PartyQuestHooks = {
  gate: async (...args) => (service ? service.gate(...args) : 'ok'),
  recorded: async (...args) => service?.recorded(...args),
};

beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, {}, undefined, CONTENT, { partyQuests: hooks });
});
afterEach(async () => {
  runner?.stop();
  runner = null;
  await hub?.close();
  hub = null;
  service = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});
afterAll(async () => {
  await app.handle.close();
});

const step = (agent: Agent, id: string, body: object = {}) => agent.post(`/api/quests/${QUEST.id}/steps/${id}/complete`).send(body);

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

/** What a player was paid (every ledger row) and what her progress on the quest holds. */
async function paidTo(childId: string) {
  const ledger = await app.db
    .select({ source: rewardLedger.source, xp: rewardLedger.xp, coins: rewardLedger.coins, skillXp: rewardLedger.skillXp, items: rewardLedger.items })
    .from(rewardLedger)
    .where(eq(rewardLedger.childId, childId))
    .orderBy(asc(rewardLedger.source));
  // A run's collectible drop is picked from the player's own id: which thing differs between two players, not how many.
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

/**
 * Moves the test's clock on a tenth of a second at a time (the bots' ticks run) until `holds`, letting the
 * database's and the routes' own work through between steps; fails after `withinMs`.
 */
async function until(what: string, holds: () => boolean, withinMs: number): Promise<void> {
  for (let waited = 0; waited <= withinMs; waited += 100) {
    if (holds()) return;
    await vi.advanceTimersByTimeAsync(100);
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error(`not within ${withinMs} ms: ${what}`);
}

const spotNear = (x: number, z: number): [number, number, number] => {
  const spot = schoolGrid?.snap({ x, y: 13, z }, 8);
  if (!spot) throw new Error(`no standing spot near ${x}, ${z} on ${SCHOOL}`);
  return [spot.x + 0.5, spot.y, spot.z + 0.5];
};

describe('a companion bot from meeting a player to a party quest played together', () => {
  it('meets her, talks, asks her into a party she leads, leads a quest run with her, plays its part, and leaves her paid as alone', { timeout: 60_000 }, async () => {
    expect(schoolGrid).not.toBeNull();
    // Another player plays the quest alone first: what one run pays with nobody else.
    const solo = await parentWithChild(app);
    await playAlone(solo.agent);
    const { agent, childId } = await parentWithChild(app);

    // From here the test's clock runs the hub, the parties and the bots (the database and the routes keep real I/O).
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    const h = hubHarness({ now: () => Date.now(), parties: new PartyService({ now: () => Date.now(), inviteGapMs: 0, isPlayer: (id) => id.startsWith('p-') }) });
    hub = h.hub;
    service = new PartyQuestService({ db: app.db, content: CONTENT, host: h.hub.coopHost() });
    h.hub.setPartyQuests(service);
    const store = memoryBotStore();
    // Seeded dice: with these, one of the four bots that sees her chooses to walk over and meet her.
    let seed = 2;
    const random = (): number => ((seed = (seed * 16_807) % 2_147_483_647) - 1) / 2_147_483_646;
    const quest = schoolQuest();
    runner = new BotRunner(h.hub, { random, store, walk: { get: (mapId) => (mapId === SCHOOL ? schoolGrid : null) }, quests: { questsOn: (mapId) => (mapId === SCHOOL ? [quest] : []) }, profiles: { [SCHOOL]: SCHOOL_BOTS } });
    const approaching = vi.spyOn(Brain.prototype, 'approaching', 'get');
    runner.start();
    const room = h.hub.getOrCreateRoom(SCHOOL);
    const where = (id: string): [number, number, number] => {
      const p = room.members.get(id)?.presence;
      return p ? [p.x, p.y, p.z] : [0, 0, 0];
    };
    const away = (id: string, at: readonly number[]): number => {
      const [x, y, z] = where(id);
      return Math.hypot(x - (at[0] ?? 0), y - (at[1] ?? 0), z - (at[2] ?? 0));
    };

    // 1. She stands among the bots' homes, out of every bot's reach: one sees her and chooses to walk over to meet her.
    const here = spotNear(400, 328);
    const a: Client = await h.joined(childId, here, SCHOOL);
    expect(Math.min(...SCHOOL_BOTS.map((b) => away(b.id, here)))).toBeGreaterThan(INTERACT_RANGE);
    const toHer = (): Array<Extract<ServerWsMessage, { type: 'bot-say' }>> => a.all('bot-say').filter((l) => l.to === a.id);
    // A bot cheering at its own quest from afar (`found`, `done`) is not a meeting: a meeting's line comes from beside her.
    const meetLines = (): Array<Extract<ServerWsMessage, { type: 'bot-say' }>> => toHer().filter((l) => l.key !== 'found' && l.key !== 'done');
    // A bot's mind says whom it is walking over to meet (read as it comes within her reach).
    const walkedOver = (): boolean => approaching.mock.results.some((r) => r.type === 'return' && r.value === a.id);
    await until('a bot chooses to walk over to meet her', walkedOver, 4 * 60_000);
    // 2. Once there it talks to her from beside her, and waves.
    const heard = meetLines().length;
    await until('the bot that walked over talks to her', () => meetLines().length > heard, 60_000);
    const met = meetLines()[heard]?.id ?? '';
    expect(SCHOOL_BOTS.map((b) => b.id)).toContain(met);
    expect(away(met, here)).toBeLessThanOrEqual(INTERACT_RANGE);
    expect(a.all('emote').some((e) => e.id === met && e.emote === 'wave')).toBe(true);

    // She goes off and comes back to the bots now and then: from their second meeting, once she has been around three
    // minutes, a bot asks her into a party with the invite card a player gets.
    const far = spotNear(250, 200);
    const move = (to: readonly number[]): void => a.send({ type: 'update', x: to[0], y: to[1], z: to[2], yaw: 0, speed: 0 });
    for (let cycle = 0; cycle < 20 && !a.last('party-invite'); cycle++) {
      move(far);
      await vi.advanceTimersByTimeAsync(65_000);
      for (let t = 0; t < 30_000 && !a.last('party-invite'); t += 100) {
        const [x, y, z] = where(met);
        move([x + 2, y, z]);
        await vi.advanceTimersByTimeAsync(100);
      }
    }
    const invite = a.last('party-invite');
    expect(invite?.from.isBot).toBe(true);
    const inviter = invite?.from.id ?? '';
    expect(SCHOOL_BOTS.map((b) => b.id)).toContain(inviter);
    expect(toHer().some((l) => l.id === inviter && l.key === 'invite')).toBe(true);
    // She stays by it from now on.
    const [ix, iy, iz] = where(inviter);
    move([ix + 2, iy, iz]);

    // 3. She says yes: she leads the party, the bot is a member.
    a.send({ type: 'party-reply', from: inviter, accept: true });
    await until('the party forms', () => a.last('party-state')?.party?.members.length === 2, 2_000);
    expect(a.last('party-state')?.party).toMatchObject({ leader: a.id, members: [{ id: a.id, isBot: false }, { id: inviter, isBot: true }] });

    // 4. A moment later it asks the party to play a quest of its map: it leads the run, she is asked.
    const before = await rowCounts();
    await until('the bot asks the party to play a quest', () => Boolean(a.last('party-quest')?.quest), 5_000);
    expect(a.last('party-quest')?.quest).toMatchObject({ questId: QUEST.id, leader: inviter, members: [{ id: inviter, joined: true }, { id: a.id, joined: false }] });
    const botDone = (): number => a.last('party-quest')?.quest?.members.find((m) => m.id === inviter)?.done ?? -1;
    expect(botDone()).toBe(0);

    // 5. She joins and plays every step through the quest routes; the bot plays its part.
    a.send({ type: 'party-quest-join', questId: QUEST.id });
    await until('she is in the run', () => a.last('party-quest')?.quest?.members.every((m) => m.joined) === true, 2_000);
    await step(agent, 'gap').expect(200);
    // It follows on a step the party shares, never first.
    await until('the bot follows her talk', () => botDone() === 1, 5_000);
    await step(agent, 'do', { answer: { value: 7 } }).expect(200);
    // It answers its own question after thinking it over (4 to 12 s a try, three tries at most); she waits for it.
    await until('the bot answers its question', () => botDone() === 2, 60_000);
    await step(agent, 'sau').expect(200);
    await until('the bot follows her second talk', () => botDone() === 3, 5_000);
    // The boss: the bot asked, so its blow comes first; its right blow counts for her.
    await until('the bot lands its blow', () => a.last('party-quest-progress')?.progress.bossState?.trum?.hp === 100, 60_000);
    await until('her turn', () => a.last('party-quest')?.quest?.turn === a.id, 5_000);
    await step(agent, 'trum', { answer: { turnId: 't2', choice: 'b' } }).expect(200);
    await step(agent, 'thuong').expect(200);
    const last = await step(agent, 'tiep').expect(200);
    expect(last.body.reward).toMatchObject({ coin: 10 });
    await until('the bot played it through', () => a.last('party-quest')?.quest?.members.find((m) => m.id === inviter)?.finished === true, 5_000);
    expect(botDone()).toBe(QUEST.steps.length);

    // Paid exactly as alone: the same runs, ledger rows (XP, coins, skill XP, items) and progress; nothing of the bot's.
    const alone = await paidTo(solo.childId);
    const withTheBot = await paidTo(childId);
    expect(alone.runs).toBe(1);
    expect(withTheBot).toEqual(alone);
    const after = await rowCounts();
    expect(after.progress - before.progress).toBe(1);
    expect(after.ledger - before.ledger).toBe(withTheBot.ledger.length);

    // It remembers her, and 5 to 10 seconds after the run waves goodbye and leaves the party.
    expect(store.memories.get(`${inviter}|${childId}`)).toEqual({ runs: 1, lastQuestId: QUEST.id });
    await until('the bot leaves the party', () => h.hub.parties.partyOf(inviter) === null, 2 * BOT_TEAM_LEAVE_MS + 1_000);
    expect(toHer().filter((l) => l.key === 'bye').map((l) => l.id)).toEqual([inviter]);
    expect(a.all('emote').some((e) => e.id === inviter && e.emote === 'wave')).toBe(true);
    expect(a.last('party-state')?.party).toBeNull();
  });
});

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LiveEventDto, LiveEventListResponse } from '@miu/schema/live-event';
import { ExamSubmitResponse } from '@miu/schema/olympiad';
import { QuestListResponse, StepCompleteResponse } from '@miu/schema/game';
import { createTestApp, EVENT_CONTENT, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { loadOlympiadCatalog } from '../olympiad/olympiad-catalog';

// The fixture event (test/fixtures/events): live 2030-01-01 → 2030-02-01, commemorative 2031-01-01 → 2031-02-01,
// announced 7 days ahead, one quest (`wonder-fixture-gate`), rewards for finishing it and for a mock exam ≥ 20.
const EVENT = 'fixture-fair';
const QUEST = 'wonder-fixture-gate';

let app: TestApp;
/** Where the injected clock stands, as an offset from the real time. */
let offset = 0;
beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, {}, undefined, EVENT_CONTENT);
});
afterAll(async () => {
  await app.handle.close();
});

/** Puts the server clock at a Vietnam time (the device's clock plays no part anywhere). */
function at(time: string): void {
  const target = Date.parse(time) - Date.now();
  app.advance(target - offset);
  offset = target;
}

async function playingChild(): Promise<Agent> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return agent;
}

const PLAY: Array<[string, object]> = [
  ['gap', {}],
  ['xep', { answer: { order: ['mot', 'hai', 'ba'] } }],
  ['hoi', { answer: { choice: 'b' } }],
  ['thuong', {}],
  ['tiep', {}],
];

async function playQuest(agent: Agent, run?: number): Promise<StepCompleteResponse> {
  let last: unknown;
  for (const [stepId, body] of PLAY) last = (await agent.post(`/api/quests/${QUEST}/steps/${stepId}/complete`).send({ ...body, ...(run ? { run } : {}) }).expect(200)).body;
  return StepCompleteResponse.parse(last);
}

async function eventOf(agent: Agent): Promise<LiveEventDto | undefined> {
  return LiveEventListResponse.parse((await agent.get('/api/events').expect(200)).body).events.find((e) => e.id === EVENT);
}

describe('limited-time events by the server clock', () => {
  it('stays hidden long before it opens', async () => {
    at('2029-11-01T12:00:00+07:00');
    const agent = await playingChild();
    expect(await eventOf(agent)).toBeUndefined();
    await agent.get(`/api/events/${EVENT}`).expect(404);
    await agent.get('/api/events/not-an-event').expect(404);
  });

  it('shows "coming soon" in the days before, with its quests closed whatever the device says', async () => {
    at('2029-12-28T09:00:00+07:00');
    const agent = await playingChild();
    const event = await eventOf(agent);
    expect(event).toMatchObject({ state: 'upcoming', firstDay: '2030-01-01', lastDay: '2030-01-31', daysUntilStart: 4, daysLeft: null });
    const list = QuestListResponse.parse((await agent.get('/api/quests').expect(200)).body);
    expect(list.quests.some((q) => q.quest.id === QUEST)).toBe(false);
    // A device clock set inside the window changes nothing: the server's clock decides.
    const res = await agent.post(`/api/quests/${QUEST}/steps/gap/complete`).set('Date', 'Tue, 15 Jan 2030 10:00:00 GMT').send({}).expect(409);
    expect(res.body).toEqual({ error: 'event-closed' });
    await agent.post(`/api/quests/${QUEST}/steps/hoi/support`).send({ layer: 'hint' }).expect(409);
  });

  it('opens its quests while live, pays the limited rewards once, and every run its quest reward', async () => {
    at('2030-01-15T10:00:00+07:00');
    const agent = await playingChild();
    const event = await eventOf(agent);
    expect(event).toMatchObject({ state: 'live', daysLeft: 17, quests: [{ id: QUEST, done: false, keeperId: 'fixture-fair-fox' }] });
    expect(event?.scene.characters.map((c) => c.id)).toEqual(['fixture-fair-fox']);
    const list = QuestListResponse.parse((await agent.get('/api/quests').expect(200)).body);
    expect(list.quests.find((q) => q.quest.id === QUEST)?.quest).toMatchObject({ category: 'event' });

    const first = await playQuest(agent);
    expect(first.reward).toMatchObject({ xp: 40, coin: 10 });
    const grants = first.completion?.eventRewards ?? [];
    expect(grants.map((g) => [g.rewardId, g.item, g.commemorative])).toEqual([
      ['huy-hieu-cong', 'ban-do-sao-dem', false],
      ['mu-hoi-cho', 'back-thanh-tich-ten-lua', false],
    ]);
    // The badge is in the backpack, the wearable in the wardrobe.
    const inventory = (await agent.get('/api/inventory').expect(200)).body as { items: Array<{ itemId: string; qty: number }> };
    expect(inventory.items).toContainEqual({ itemId: 'ban-do-sao-dem', qty: 1 });
    const shop = (await agent.get('/api/shop').expect(200)).body as { owned: Record<string, number> };
    expect(shop.owned['back-thanh-tich-ten-lua']).toBe(1);

    // A replay pays the quest again, never the limited rewards.
    const replay = await playQuest(agent, 2);
    expect(replay.reward).toMatchObject({ xp: 40, coin: 10 });
    expect(replay.completion?.eventRewards).toBeUndefined();
    const after = await eventOf(agent);
    expect(after?.quests[0]?.done).toBe(true);
    expect(after?.rewards.filter((r) => r.earned).map((r) => r.id)).toEqual(['huy-hieu-cong', 'mu-hoi-cho']);
    expect(after?.rewards.find((r) => r.id === 'huy-hieu-thi')).toMatchObject({ earned: false, progress: 0, target: 20 });
  });

  it('pays the exam badge from a mock exam run inside the window', async () => {
    at('2030-01-20T10:00:00+07:00');
    const agent = await playingChild();
    const catalog = loadOlympiadCatalog();
    const answers = Object.fromEntries(catalog.examQuestions.slice(0, 6).map((q) => [q.id, q.answer]));
    const exam = ExamSubmitResponse.parse((await agent.post('/api/olympiad/submit').send({ runId: randomUUID(), answers }).expect(200)).body);
    expect(exam.score).toBe(24);
    expect(exam.eventRewards.map((g) => g.rewardId)).toEqual(['huy-hieu-thi']);
    expect((await eventOf(agent))?.rewards.find((r) => r.id === 'huy-hieu-thi')).toMatchObject({ earned: true, progress: 20 });
    // Each player's rewards are her own.
    const other = await playingChild();
    expect((await eventOf(other))?.rewards.every((r) => !r.earned)).toBe(true);
  });

  it('closes once over: the banner is gone, the quests close, what was received stays', async () => {
    at('2030-01-30T10:00:00+07:00');
    const agent = await playingChild();
    await playQuest(agent);
    at('2030-02-01T00:00:00+07:00');
    expect(await eventOf(agent)).toBeUndefined();
    const list = QuestListResponse.parse((await agent.get('/api/quests').expect(200)).body);
    expect(list.quests.some((q) => q.quest.id === QUEST)).toBe(false);
    await agent.post(`/api/quests/${QUEST}/steps/gap/complete`).send({ run: 2 }).expect(409);
    const inventory = (await agent.get('/api/inventory').expect(200)).body as { items: Array<{ itemId: string; qty: number }> };
    expect(inventory.items).toContainEqual({ itemId: 'ban-do-sao-dem', qty: 1 });
  });

  it('pays a limited reward once when the last step is sent twice at the same moment', async () => {
    at('2030-01-25T10:00:00+07:00');
    const agent = await playingChild();
    for (const [stepId, body] of PLAY.slice(0, -1)) await agent.post(`/api/quests/${QUEST}/steps/${stepId}/complete`).send(body).expect(200);
    const [stepId, body] = PLAY.at(-1) ?? ['tiep', {}];
    const both = await Promise.all([0, 1].map(() => agent.post(`/api/quests/${QUEST}/steps/${stepId}/complete`).send(body).expect(200)));
    const grants = both.flatMap((r) => StepCompleteResponse.parse(r.body).completion?.eventRewards ?? []);
    expect(grants.map((g) => g.rewardId).sort()).toEqual(['huy-hieu-cong', 'mu-hoi-cho']);
    const inventory = (await agent.get('/api/inventory').expect(200)).body as { items: Array<{ itemId: string; qty: number }> };
    expect(inventory.items).toContainEqual({ itemId: 'ban-do-sao-dem', qty: 1 });
  });

  it('needs a signed-in account with a player chosen', async () => {
    await app.request().get('/api/events').expect(401);
    await app.request().get(`/api/events/${EVENT}`).expect(401);
  });

  it('reopens as a commemorative window that gives the commemorative editions', async () => {
    at('2031-01-10T10:00:00+07:00');
    const agent = await playingChild();
    expect(await eventOf(agent)).toMatchObject({ state: 'commemorative', firstDay: '2031-01-01', lastDay: '2031-01-31' });
    const done = await playQuest(agent);
    expect((done.completion?.eventRewards ?? []).map((g) => [g.item, g.commemorative])).toEqual([
      ['bang-pha-mau', true],
      ['back-thanh-tich-ngoi-sao', true],
    ]);
  });
});

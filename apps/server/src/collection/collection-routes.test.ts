import { and, eq, like } from 'drizzle-orm';
import { CollectionClaimResponse, CollectionResponse, type CollectibleSet } from '@miu/schema/collectible';
import { ProgressResponse, StepCompleteResponse } from '@miu/schema/game';
import { pickCollectible } from '@miu/quest/collectible-drop';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { solution } from '../../test/quest-solution';
import { TEST_PIN, createTestApp, parentWithChild, type Agent, type TestApp, signedInWithoutPlayer } from '../../test/test-app';
import { childProfiles, inventoryItems, rewardLedger } from '../db/schema';

// Fixture quests of the forest (khu-rung-bi-mat): side-egg is its minigame side quest, quest-c a lesson.
const FOREST = 'khu-rung-bi-mat';

let app: TestApp;
let forest: CollectibleSet;
beforeAll(async () => {
  app = await createTestApp();
  const set = app.content.collectibles.get(FOREST);
  if (!set) throw new Error('the forest has no collectible set');
  forest = set;
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return { agent, childId };
}

/** Plays every step of a fixture quest's run through the quest route; the last response. */
async function playRun(agent: Agent, questId: string, run?: number): Promise<StepCompleteResponse> {
  const quest = app.content.quests.get(questId);
  if (quest?.status !== 'active') throw new Error(`${questId} must be an active fixture quest`);
  let last: StepCompleteResponse | null = null;
  for (const [stepId, body] of solution(quest)) {
    last = StepCompleteResponse.parse((await agent.post(`/api/quests/${questId}/steps/${stepId}/complete`).send({ ...body, ...(run ? { run } : {}) }).expect(200)).body);
  }
  if (!last) throw new Error(`${questId} has no steps`);
  return last;
}

/** Things of the forest set straight into her inventory, as drops would have left them. */
async function own(childId: string, ids: readonly string[]): Promise<void> {
  for (const itemId of ids) await app.db.insert(inventoryItems).values({ childId, itemId, qty: 1 });
}
const allOfForest = (): string[] => forest.items.map((e) => e.id);

const collection = async (agent: Agent): Promise<CollectionResponse> => CollectionResponse.parse((await agent.get('/api/collection').expect(200)).body);
const forestOf = (list: CollectionResponse) => list.sets.find((s) => s.mapId === FOREST);
const claim = (agent: Agent, body: object = { mapId: FOREST }) => agent.post('/api/collection/claim').send(body);
const drops = (childId: string) =>
  app.db
    .select({ source: rewardLedger.source, items: rewardLedger.items, xp: rewardLedger.xp, coins: rewardLedger.coins })
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'drop:%')));

describe('collectible drops', () => {
  it('drops one thing of the region set per paid run, the same thing the run names, in its own ledger row', async () => {
    const { agent, childId } = await playingChild();
    const res = await playRun(agent, 'side-egg');
    const expected = pickCollectible(forest.items, new Map(), `${childId}|quest:side-egg`);
    expect(res.completion?.collectible).toEqual({ itemId: expected, mapId: FOREST, owned: 1 });
    // The quest's own reward is untouched: the thing has its own row, worth no XP or coins.
    expect(res.reward).toMatchObject({ xp: 12, coin: 3, items: {} });
    expect(await drops(childId)).toEqual([{ source: 'drop:quest:side-egg', items: { [expected ?? '']: 1 }, xp: 0, coins: 0 }]);
    expect(res.progress.items).toEqual({ [expected ?? '']: 1 });
    expect(forestOf(await collection(agent))).toMatchObject({ owned: { [expected ?? '']: 1 }, found: 1, total: 10, complete: false, claimed: false });
  });

  it('drops once per run: a resent last step drops nothing more, and a new run may drop again', async () => {
    const { agent, childId } = await playingChild();
    await playRun(agent, 'side-egg');
    const quest = app.content.quests.get('side-egg');
    if (quest?.status !== 'active') throw new Error('side-egg must be active');
    const [lastStep, lastBody] = solution(quest).at(-1) ?? ['', {}];
    const resent = StepCompleteResponse.parse((await agent.post(`/api/quests/side-egg/steps/${lastStep}/complete`).send(lastBody).expect(200)).body);
    expect(resent).toMatchObject({ repeated: true, completion: null });
    expect(await drops(childId)).toHaveLength(1);
    const second = await playRun(agent, 'side-egg', 2);
    expect(second.completion?.collectible?.mapId).toBe(FOREST);
    expect((await drops(childId)).map((d) => d.source).sort()).toEqual(['drop:quest:side-egg', 'drop:quest:side-egg#2']);
    // Doubles count: the inventory holds as many as were dropped.
    const total = Object.values(second.progress.items).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(2);
  });

  it('drops for lessons too', async () => {
    const { agent } = await playingChild();
    const res = await playRun(agent, 'quest-c');
    expect(forest.items.map((e) => e.id)).toContain(res.completion?.collectible?.itemId);
  });
});

describe('the collection', () => {
  it('lists every set with nothing owned at first, and its reward', async () => {
    const { agent } = await playingChild();
    const list = await collection(agent);
    expect(list.sets.map((s) => s.mapId)).toEqual([...app.content.collectibles.keys()]);
    expect(list.titles).toEqual([]);
    expect(forestOf(list)).toEqual({ mapId: FOREST, owned: {}, found: 0, total: 10, complete: false, claimed: false, reward: forest.reward });
  });

  it('refuses a set not complete yet, then pays a full set once at its own price, with its title', async () => {
    const { agent, childId } = await playingChild();
    await own(childId, allOfForest().slice(1));
    expect((await claim(agent).expect(409)).body).toEqual({ error: 'set-not-complete' });
    await own(childId, allOfForest().slice(0, 1));
    const res = CollectionClaimResponse.parse((await claim(agent, { mapId: FOREST }).expect(200)).body);
    expect(res).toMatchObject({ granted: true, coins: forest.reward.coins, title: forest.reward.title, set: { complete: true, claimed: true, found: 10 } });
    expect(res.progress.coins).toBe(forest.reward.coins);
    // A second claim pays nothing; the things stay hers.
    const again = CollectionClaimResponse.parse((await claim(agent).expect(200)).body);
    expect(again).toMatchObject({ granted: false, coins: 0 });
    expect(again.progress.coins).toBe(forest.reward.coins);
    expect(Object.keys(again.progress.items)).toHaveLength(10);
    expect((await collection(agent)).titles).toEqual([forest.reward.title]);
  });

  it('pays once when claims race', async () => {
    const { agent, childId } = await playingChild();
    await own(childId, allOfForest());
    const results = await Promise.all(Array.from({ length: 5 }, () => claim(agent).expect(200)));
    expect(results.map((r) => CollectionClaimResponse.parse(r.body).granted).filter(Boolean)).toHaveLength(1);
    expect(ProgressResponse.parse((await agent.get('/api/progress').expect(200)).body).coins).toBe(forest.reward.coins);
    const rows = await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'collection:%')));
    expect(rows.map((r) => r.source)).toEqual([`collection:${FOREST}`]);
  });

  it('refuses unknown sets and malformed requests, and ignores what the client says the reward is', async () => {
    const { agent, childId } = await playingChild();
    expect((await claim(agent, { mapId: 'no-such-land' }).expect(404)).body).toEqual({ error: 'collection-not-found' });
    for (const body of [{}, { mapId: 'Bad Id' }, { mapId: FOREST, coins: 9999 }]) expect((await claim(agent, body).expect(400)).body).toEqual({ error: 'invalid-input' });
    await own(childId, allOfForest());
    const res = CollectionClaimResponse.parse((await claim(agent).expect(200)).body);
    expect(res.progress.coins).toBe(forest.reward.coins);
  });

  it("keeps each family's collection apart (IDOR): another child neither sees nor claims her set", async () => {
    const a = await playingChild();
    const b = await playingChild();
    await own(a.childId, allOfForest());
    expect(forestOf(await collection(b.agent))).toMatchObject({ owned: {}, found: 0 });
    expect((await claim(b.agent).expect(409)).body).toEqual({ error: 'set-not-complete' });
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    expect(forestOf(await collection(a.agent))).toMatchObject({ found: 10, claimed: false });
  });

  it('needs a signed-in parent with a selected child, and an allowed origin to claim', async () => {
    await app.agent().get('/api/collection').expect(401);
    const agent = await signedInWithoutPlayer(app);
    expect((await agent.get('/api/collection').expect(401)).body).toEqual({ error: 'no-active-child' });
    const { agent: playing } = await playingChild();
    await claim(playing.set('Origin', 'https://evil.example')).expect(403);
  });
});

describe("the child's data", () => {
  it('is in the family export and goes with the profile', async () => {
    const { agent, childId } = await playingChild();
    const res = await playRun(agent, 'side-egg');
    const itemId = res.completion?.collectible?.itemId;
    await own(childId, allOfForest().filter((id) => id !== itemId));
    await claim(agent).expect(200);
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    const exported = (await agent.get('/api/account/export').expect(200)).body as { players: Array<{ inventory: Array<{ itemId: string }>; rewards: Array<{ source: string }> }> };
    const child = exported.players[0];
    expect(child?.inventory.map((i) => i.itemId).sort()).toEqual(allOfForest().sort());
    expect(child?.rewards.map((r) => r.source)).toEqual(expect.arrayContaining(['drop:quest:side-egg', `collection:${FOREST}`]));
    // The primary player goes only with the account.
    await agent.delete('/api/account').expect(204);
    expect(await app.db.select().from(childProfiles).where(eq(childProfiles.id, childId))).toEqual([]);
    expect(await app.db.select().from(inventoryItems).where(eq(inventoryItems.childId, childId))).toEqual([]);
    expect(await app.db.select().from(rewardLedger).where(eq(rewardLedger.childId, childId))).toEqual([]);
  });
});

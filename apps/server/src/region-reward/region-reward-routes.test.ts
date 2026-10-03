import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { and, eq, like } from 'drizzle-orm';
import type request from 'supertest';
import { ProgressResponse } from '@miu/schema/game';
import { ShopState } from '@miu/schema/shop';
import { RegionRewardClaimResponse, RegionRewardsDto, RegionRewardsList, type RegionRewardEntry, type RegionRewardTier } from '@miu/schema/region-reward';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { solution } from '../../test/quest-solution';
import { TEST_PIN, createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { CONTENT_DIR } from '../content/content-dir';
import { childProfiles, questProgress, rewardLedger, shopInventory } from '../db/schema';
import { loadRegionRewards, type RegionRewards } from './region-reward-catalog';

// Fixture quests: the forest (khu-rung-bi-mat) has three lessons (quest-a, quest-b, quest-c; quest-soon is a
// stub and does not count) and one side quest (side-egg); the school (truong-hoc) one lesson; other regions none.
const FOREST = 'khu-rung-bi-mat';
const LESSONS = ['quest-a', 'quest-b', 'quest-c'];

let app: TestApp;
let rewards: RegionRewards;
let forest: RegionRewardEntry;
beforeAll(async () => {
  app = await createTestApp();
  rewards = loadRegionRewards(app.content.accessories);
  const entry = rewards.entries.get(FOREST);
  if (!entry) throw new Error('the forest has no chest');
  forest = entry;
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/children/${childId}/select`).expect(200);
  return { agent, childId };
}

/** Lessons finished as the quest route would have left them, with their best stars. */
async function finish(childId: string, quests: readonly string[], stars = 3): Promise<void> {
  for (const questId of quests) await app.db.insert(questProgress).values({ childId, questId, completedSteps: [], completedAt: new Date(), stars, xpAwarded: 10 });
}

/** Paid runs `from`…`to` of the forest's side quest (replays count). */
async function playSide(childId: string, from: number, to: number): Promise<void> {
  for (let run = from; run <= to; run += 1) {
    await app.db.insert(rewardLedger).values({ id: randomUUID(), childId, source: run === 1 ? 'quest:side-egg' : `quest:side-egg#${run}`, xp: 12, coins: 3 });
  }
}

const claim = (agent: Agent, tier: RegionRewardTier, region = FOREST, extra: object = {}): request.Test => agent.post(`/api/regions/${region}/rewards/claim`).send({ tier, ...extra });
const state = async (agent: Agent, region = FOREST): Promise<RegionRewardsDto> => RegionRewardsDto.parse((await agent.get(`/api/regions/${region}/rewards`).expect(200)).body);
const tier = (dto: RegionRewardsDto, name: RegionRewardTier) => dto.tiers.find((t) => t.tier === name);
const coins = async (agent: Agent): Promise<number> => ProgressResponse.parse((await agent.get('/api/progress').expect(200)).body).coins;

describe('region rewards', () => {
  it('lists every region with its tiers, nothing reached at first', async () => {
    const { agent } = await playingChild();
    const list = RegionRewardsList.parse((await agent.get('/api/region-rewards').expect(200)).body);
    expect(list.regions.map((r) => r.region)).toEqual([...rewards.entries.keys()]);
    expect(list.titles).toEqual([]);
    const dto = await state(agent);
    expect(dto).toMatchObject({ region: FOREST, title: forest.title, lessons: 3, lessonsDone: 0, lessonsThreeStar: 0, sideRuns: 0 });
    expect(dto.tiers.map((t) => [t.tier, t.goal, t.reached, t.claimed])).toEqual([
      ['half', 2, false, false],
      ['full', 3, false, false],
      ['stars', 3, false, false],
      ['minigames', rewards.minigameGoal, false, false],
    ]);
    expect(tier(dto, 'full')).toMatchObject({ coin: forest.full.coin, xp: forest.full.xp, title: forest.title, item: { id: forest.full.item } });
    expect(tier(dto, 'stars')?.item?.id).toBe(forest.stars.item);
  });

  it('counts a lesson played through the quest route', async () => {
    const { agent } = await playingChild();
    const quest = app.content.quests.get('quest-c');
    if (quest?.status !== 'active') throw new Error('quest-c must be an active fixture quest');
    for (const [stepId, body] of solution(quest)) await agent.post(`/api/quests/quest-c/steps/${stepId}/complete`).send(body).expect(200);
    expect(await state(agent)).toMatchObject({ lessonsDone: 1 });
  });

  it('pays the half tier once half the lessons are done, at its own price whatever the client sends', async () => {
    const { agent, childId } = await playingChild();
    await finish(childId, ['quest-a']);
    expect((await claim(agent, 'half').expect(409)).body).toEqual({ error: 'tier-not-reached' });
    await finish(childId, ['quest-b'], 1);
    const res = RegionRewardClaimResponse.parse((await claim(agent, 'half', FOREST, { coin: 9999, xp: 9999, item: 'hat-crown-gold' }).expect(200)).body);
    expect(res).toMatchObject({ claimed: 'half', granted: true });
    expect(tier(res, 'half')).toMatchObject({ reached: true, claimed: true });
    expect(res.progress.coins).toBe(forest.half.coin);
    expect(res.progress.xp).toBe(forest.half.xp);
    const rows = await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'region:%')));
    expect(rows.map((r) => ({ source: r.source, coins: r.coins, xp: r.xp, items: r.items }))).toEqual([{ source: `region:${FOREST}:half`, coins: forest.half.coin, xp: forest.half.xp, items: {} }]);
    // Not the chest yet: one lesson is missing.
    expect((await claim(agent, 'full').expect(409)).body).toEqual({ error: 'tier-not-reached' });
  });

  it('opens the chest with all the lessons: coins, XP, the exclusive wearable she may now wear, and the title', async () => {
    const { agent, childId } = await playingChild();
    const wear = () => agent.put('/api/character').send({ name: 'Miu', equipped: [forest.full.item] });
    expect((await wear().expect(403)).body).toEqual({ error: 'equipment-locked' });
    await finish(childId, LESSONS, 2);
    const res = RegionRewardClaimResponse.parse((await claim(agent, 'full').expect(200)).body);
    expect(res).toMatchObject({ claimed: 'full', granted: true });
    expect(res.levelAfter).toBeGreaterThanOrEqual(res.levelBefore);
    expect(res.progress.coins).toBe(forest.full.coin);
    expect(await app.db.select({ itemId: shopInventory.itemId, qty: shopInventory.qty }).from(shopInventory).where(eq(shopInventory.childId, childId))).toEqual([{ itemId: forest.full.item, qty: 1 }]);
    // The wardrobe (it reads the shop's cupboard) shows it as hers, and the server lets her wear it.
    expect(ShopState.parse((await agent.get('/api/shop').expect(200)).body).owned).toEqual({ [forest.full.item]: 1 });
    expect((await wear().expect(200)).body).toMatchObject({ equipped: [forest.full.item] });
    expect(RegionRewardsList.parse((await agent.get('/api/region-rewards').expect(200)).body).titles).toEqual([forest.title]);
    // The bag of story items stays as it was: a wearable is not a backpack item.
    expect(ProgressResponse.parse((await agent.get('/api/progress').expect(200)).body).items).toEqual({});
  });

  it('pays the stars tier only when every lesson has three stars', async () => {
    const { agent, childId } = await playingChild();
    await finish(childId, ['quest-a', 'quest-b']);
    await finish(childId, ['quest-c'], 2);
    expect((await claim(agent, 'stars').expect(409)).body).toEqual({ error: 'tier-not-reached' });
    await app.db.update(questProgress).set({ stars: 3 }).where(and(eq(questProgress.childId, childId), eq(questProgress.questId, 'quest-c')));
    const res = RegionRewardClaimResponse.parse((await claim(agent, 'stars').expect(200)).body);
    expect(res.progress.coins).toBe(forest.stars.coin);
    expect(ShopState.parse((await agent.get('/api/shop').expect(200)).body).owned).toEqual({ [forest.stars.item]: 1 });
  });

  it('pays the minigame bonus after enough side-quest runs in the region, replays included', async () => {
    const { agent, childId } = await playingChild();
    await playSide(childId, 1, rewards.minigameGoal - 1);
    expect((await claim(agent, 'minigames').expect(409)).body).toEqual({ error: 'tier-not-reached' });
    await playSide(childId, rewards.minigameGoal, rewards.minigameGoal + 2);
    expect(tier(await state(agent), 'minigames')).toMatchObject({ progress: rewards.minigameGoal, reached: true });
    const before = await coins(agent);
    await claim(agent, 'minigames').expect(200);
    expect(await coins(agent)).toBe(before + (rewards.entries.get(FOREST)?.minigames.coin ?? 0));
  });

  it('pays a tier once: a resent claim pays nothing more, and racing claims pay one', async () => {
    const { agent, childId } = await playingChild();
    await finish(childId, LESSONS);
    const results = await Promise.all(Array.from({ length: 5 }, () => claim(agent, 'full')));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(results.filter((r) => (r.body as { granted: boolean }).granted)).toHaveLength(1);
    const again = RegionRewardClaimResponse.parse((await claim(agent, 'full').expect(200)).body);
    expect(again).toMatchObject({ granted: false, levelBefore: again.levelAfter });
    expect(await coins(agent)).toBe(forest.full.coin);
    expect(await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), eq(rewardLedger.source, `region:${FOREST}:full`)))).toHaveLength(1);
    expect(await app.db.select().from(shopInventory).where(eq(shopInventory.childId, childId))).toHaveLength(1);
  });

  it('refuses unknown regions and tiers, and never opens a region without lessons', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/regions/khu-khong-co/rewards').expect(404)).body).toEqual({ error: 'region-not-found' });
    expect((await agent.get('/api/regions/Khu%20Rung/rewards').expect(404)).body).toEqual({ error: 'region-not-found' });
    expect((await claim(agent, 'half', 'khu-khong-co').expect(404)).body).toEqual({ error: 'region-not-found' });
    for (const body of [{}, { tier: 'gold' }, { tier: 1 }]) {
      expect((await agent.post(`/api/regions/${FOREST}/rewards/claim`).send(body).expect(400)).body).toEqual({ error: 'invalid-input' });
    }
    // The fixture quests leave the island without lessons: its lesson tiers ask for nothing and never open.
    expect(tier(await state(agent, 'dao-bi-an'), 'half')).toMatchObject({ goal: 0, reached: false });
    expect((await claim(agent, 'full', 'dao-bi-an').expect(409)).body).toEqual({ error: 'tier-not-reached' });
  });

  it("keeps each family's chests apart (IDOR): another child neither sees nor claims her progress", async () => {
    const a = await playingChild();
    const b = await playingChild();
    await finish(a.childId, LESSONS);
    expect(await state(b.agent)).toMatchObject({ lessonsDone: 0 });
    expect((await claim(b.agent, 'full').expect(409)).body).toEqual({ error: 'tier-not-reached' });
    await b.agent.post(`/api/children/${a.childId}/select`).expect(404);
    expect(tier(await state(a.agent), 'full')).toMatchObject({ reached: true, claimed: false });
    await claim(a.agent, 'full').expect(200);
    expect(RegionRewardsList.parse((await b.agent.get('/api/region-rewards').expect(200)).body).titles).toEqual([]);
    expect(await coins(b.agent)).toBe(0);
  });

  it('needs a signed-in parent with a selected child, and an allowed origin to claim', async () => {
    await app.agent().get('/api/region-rewards').expect(401);
    await app.agent().get(`/api/regions/${FOREST}/rewards`).expect(401);
    await claim(app.agent(), 'half').expect(401);
    const { agent } = await parentWithChild(app);
    expect((await agent.get(`/api/regions/${FOREST}/rewards`).expect(401)).body).toEqual({ error: 'no-active-child' });
    const { agent: playing } = await playingChild();
    await claim(playing.set('Origin', 'https://evil.example'), 'half').expect(403);
  });
});

describe("the child's chests in her data", () => {
  it('are in the family export and go with the profile', async () => {
    const { agent, childId } = await playingChild();
    await finish(childId, LESSONS);
    await claim(agent, 'full').expect(200);
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    const exported = (await agent.get('/api/account/export').expect(200)).body as { children: Array<{ shop: unknown; rewards: Array<{ source: string }> }> };
    expect(exported.children[0]?.shop).toEqual([{ itemId: forest.full.item, qty: 1 }]);
    expect(exported.children[0]?.rewards.map((r) => r.source)).toContain(`region:${FOREST}:full`);
    await agent.delete(`/api/children/${childId}`).expect(204);
    expect(await app.db.select().from(childProfiles).where(eq(childProfiles.id, childId))).toEqual([]);
    expect(await app.db.select().from(shopInventory).where(eq(shopInventory.childId, childId))).toEqual([]);
    expect(await app.db.select().from(rewardLedger).where(eq(rewardLedger.childId, childId))).toEqual([]);
  });
});

describe('region reward catalogue', () => {
  function contentWith(rewardsJson: unknown): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'miu-region-rewards-'));
    mkdirSync(path.join(dir, 'world'));
    copyFileSync(path.join(CONTENT_DIR, 'world/regions.json'), path.join(dir, 'world/regions.json'));
    writeFileSync(path.join(dir, 'region-rewards.json'), JSON.stringify(rewardsJson));
    return dir;
  }
  const shipped = JSON.parse(readFileSync(path.join(CONTENT_DIR, 'region-rewards.json'), 'utf8')) as { regions: RegionRewardEntry[] };

  it('loads the shipped chests: one per open region, each with two wearables of its own', () => {
    const lessons = new Map([...rewards.entries.keys()].map((id) => [id, 1]));
    expect(() => loadRegionRewards(app.content.accessories, CONTENT_DIR, lessons)).not.toThrow();
    for (const entry of rewards.entries.values()) {
      for (const item of [entry.full.item, entry.stars.item]) expect(app.content.accessories.get(item)?.unlock).toEqual({ region: entry.region });
    }
  });

  it('fails loudly when a chest gives a wearable that is not its own, or a region has no chest', () => {
    const [first, second, ...rest] = shipped.regions;
    if (!first || !second) throw new Error('the catalogue has fewer than two regions');
    const swapped = { ...first, full: { ...first.full, item: second.full.item } };
    expect(() => loadRegionRewards(app.content.accessories, contentWith({ ...shipped, regions: [swapped, second, ...rest] }))).toThrow(/must say "unlock": \{ "region"/);
    expect(() => loadRegionRewards(app.content.accessories, contentWith({ ...shipped, regions: [second, ...rest] }))).toThrow(new RegExp(`open region ${first.region} has no chest`));
    expect(() => loadRegionRewards(app.content.accessories, contentWith({ ...shipped, regions: [{ ...first, full: { ...first.full, coin: 9000 } }, second, ...rest] }))).toThrow(/invalid content file/);
  });

  it('refuses a chest for a region without a lesson when lessons are counted', () => {
    expect(() => loadRegionRewards(app.content.accessories, CONTENT_DIR, new Map())).toThrow(/has a chest but no lesson quest/);
  });
});

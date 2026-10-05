import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AchievementClaimResponse, AchievementListResponse, type AchievementDto } from '@miu/schema/achievement';
import { collectionSource } from '@miu/schema/collectible';
import { ProgressResponse } from '@miu/schema/game';
import { ShopState } from '@miu/schema/shop';
import { solution } from '../../test/quest-solution';
import { createTestApp, parentWithChild, signedInWithoutPlayer, type Agent, type TestApp } from '../../test/test-app';
import { rewardLedger } from '../db/schema';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return { agent, childId };
}

async function play(agent: Agent, questId: string): Promise<void> {
  const quest = app.content.quests.get(questId);
  if (quest?.status !== 'active') throw new Error(`${questId} must be an active fixture quest`);
  for (const [stepId, body] of solution(quest)) await agent.post(`/api/quests/${questId}/steps/${stepId}/complete`).send(body).expect(200);
}

const list = async (agent: Agent): Promise<AchievementDto[]> => AchievementListResponse.parse((await agent.get('/api/achievements').expect(200)).body).achievements;
const one = async (agent: Agent, id: string): Promise<AchievementDto | undefined> => (await list(agent)).find((a) => a.id === id);
const claim = (agent: Agent, id: string, extra: object = {}) => agent.post(`/api/achievements/${id}/claim`).send(extra);
const coins = async (agent: Agent): Promise<number> => ProgressResponse.parse((await agent.get('/api/progress').expect(200)).body).coins;
const rows = (childId: string, id: string) => app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), eq(rewardLedger.source, `achievement:${id}`)));

/** Full collectible sets `from`…`to - 1` claimed, as the collection route would have recorded them. */
async function claimSets(childId: string, from: number, to: number): Promise<void> {
  for (const mapId of [...app.content.collectibles.keys()].slice(from, to)) {
    await app.db.insert(rewardLedger).values({ id: randomUUID(), childId, source: collectionSource(mapId), coins: 1 });
  }
}

describe('achievements', () => {
  it('lists every achievement of the catalogue with nothing reached at first', async () => {
    const { agent } = await playingChild();
    const all = await list(agent);
    expect(all.map((a) => a.id)).toEqual([...app.content.achievements.keys()]);
    expect(all.length).toBeGreaterThanOrEqual(60);
    expect(new Set(all.map((a) => a.category))).toEqual(new Set(['kham-pha', 'hoc-tap', 'minigame', 'suu-tam', 'su-kien']));
    expect(all.filter((a) => a.reached || a.claimed)).toEqual([]);
    expect(all.find((a) => a.id === 'len-cap-nam')).toMatchObject({ progress: 1, goal: 5 });
  });

  it('counts a lesson played through the quest route and pays its achievement at the server price', async () => {
    const { agent, childId } = await playingChild();
    expect((await claim(agent, 'bai-hoc-dau-tien').expect(409)).body).toEqual({ error: 'achievement-not-reached' });
    await play(agent, 'quest-a');
    expect(await one(agent, 'bai-hoc-dau-tien')).toMatchObject({ progress: 1, reached: true, claimed: false });
    expect(await one(agent, 'buoc-chan-dau-tien')).toMatchObject({ reached: true });
    expect(await one(agent, 'mot-chong-sach')).toMatchObject({ progress: 1, goal: 10, reached: false });
    const before = await coins(agent);
    const res = AchievementClaimResponse.parse((await claim(agent, 'bai-hoc-dau-tien', { xp: 9999, coin: 9999, item: 'hat-crown-diamond' }).expect(200)).body);
    const entry = app.content.achievements.get('bai-hoc-dau-tien');
    expect(res).toMatchObject({ granted: true, achievement: { claimed: true, reached: true } });
    expect(res.progress.coins).toBe(before + (entry?.reward.coin ?? 0));
    expect((await rows(childId, 'bai-hoc-dau-tien')).map((r) => [r.coins, r.xp, r.items])).toEqual([[entry?.reward.coin, entry?.reward.xp, {}]]);
  });

  it('pays once: a resent claim pays nothing more, and racing claims pay one', async () => {
    const { agent, childId } = await playingChild();
    await play(agent, 'quest-a');
    const results = await Promise.all(Array.from({ length: 5 }, () => claim(agent, 'buoc-chan-dau-tien')));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(results.filter((r) => (r.body as { granted: boolean }).granted)).toHaveLength(1);
    const again = AchievementClaimResponse.parse((await claim(agent, 'buoc-chan-dau-tien').expect(200)).body);
    expect(again).toMatchObject({ granted: false, levelBefore: again.levelAfter });
    expect(await rows(childId, 'buoc-chan-dau-tien')).toHaveLength(1);
  });

  it('gives an exclusive wearable into the wardrobe, worn once received', async () => {
    const { agent, childId } = await playingChild();
    const item = app.content.achievements.get('nam-bo-suu-tap')?.reward.item;
    if (!item) throw new Error('nam-bo-suu-tap gives an item');
    const wear = () => agent.put('/api/character').send({ name: 'Miu', equipped: [item] });
    expect((await wear().expect(403)).body).toEqual({ error: 'equipment-locked' });
    await claimSets(childId, 0, 4);
    expect(await one(agent, 'nam-bo-suu-tap')).toMatchObject({ progress: 4, goal: 5, reached: false, reward: { item: { id: item } } });
    await claim(agent, 'nam-bo-suu-tap').expect(409);
    await claimSets(childId, 4, 5);
    const res = AchievementClaimResponse.parse((await claim(agent, 'nam-bo-suu-tap').expect(200)).body);
    expect(res.granted).toBe(true);
    expect(ShopState.parse((await agent.get('/api/shop').expect(200)).body).owned).toEqual({ [item]: 1 });
    expect((await wear().expect(200)).body).toMatchObject({ equipped: [item] });
  });

  it('refuses unknown achievements', async () => {
    const { agent } = await playingChild();
    expect((await claim(agent, 'khong-co').expect(404)).body).toEqual({ error: 'achievement-not-found' });
    expect((await claim(agent, 'Bai%20Hoc').expect(404)).body).toEqual({ error: 'achievement-not-found' });
  });

  it("keeps each player's achievements apart (IDOR): another account's player is not hers to read or claim", async () => {
    const a = await playingChild();
    const b = await playingChild();
    await play(a.agent, 'quest-a');
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    expect(await one(b.agent, 'bai-hoc-dau-tien')).toMatchObject({ progress: 0, reached: false });
    expect((await claim(b.agent, 'bai-hoc-dau-tien').expect(409)).body).toEqual({ error: 'achievement-not-reached' });
    await claim(a.agent, 'bai-hoc-dau-tien').expect(200);
    expect(await one(b.agent, 'bai-hoc-dau-tien')).toMatchObject({ claimed: false });
    expect(await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, b.childId), like(rewardLedger.source, 'achievement:%')))).toEqual([]);
  });

  it('needs a signed-in account with a selected player, and an allowed origin to claim', async () => {
    await app.agent().get('/api/achievements').expect(401);
    await claim(app.agent(), 'bai-hoc-dau-tien').expect(401);
    expect((await (await signedInWithoutPlayer(app)).get('/api/achievements').expect(401)).body).toEqual({ error: 'no-active-child' });
    const { agent } = await playingChild();
    await claim(agent.set('Origin', 'https://evil.example'), 'bai-hoc-dau-tien').expect(403);
  });
});

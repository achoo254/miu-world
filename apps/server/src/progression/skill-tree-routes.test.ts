import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProgressResponse, StepCompleteResponse } from '@miu/schema/game';
import { SkillTreeResponse } from '@miu/schema/progression';
import { ShopState } from '@miu/schema/shop';
import { solution } from '../../test/quest-solution';
import { createTestApp, parentWithChild, signedInWithoutPlayer, type Agent, type TestApp } from '../../test/test-app';
import { rewardLedger, shopInventory, skillProgress } from '../db/schema';

// Fixture quests: quest-a pays doc-hieu 1 skill XP, quest-b phep-cong 2 and doc-hieu 1. The skill curve opens
// level 2 at 2 XP and level 3 at 5; the shipped gift table gives "Kính đọc sách" at Đọc hiểu level 3.
const READING_GLASSES = 'glasses-ky-nang-doc-sach';

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

/** Plays every step of a fixture quest (run 1 unless given); returns the last step's response. */
async function play(agent: Agent, questId: string, run?: number): Promise<StepCompleteResponse> {
  const quest = app.content.quests.get(questId);
  if (quest?.status !== 'active') throw new Error(`${questId} must be an active fixture quest`);
  let last: unknown = null;
  for (const [stepId, body] of solution(quest)) last = (await agent.post(`/api/quests/${questId}/steps/${stepId}/complete`).send(run ? { ...body, run } : body).expect(200)).body;
  return StepCompleteResponse.parse(last);
}

const tree = async (agent: Agent): Promise<SkillTreeResponse> => SkillTreeResponse.parse((await agent.get('/api/skill-tree').expect(200)).body);
const skillOf = (body: SkillTreeResponse, id: string) => body.subjects.flatMap((s) => s.skills).find((k) => k.skillId === id);
const giftRows = (childId: string) => app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'skill-gift:%')));

describe('skill tree', () => {
  it('lists every skill by subject at level 1 with the gift of each level, none received yet', async () => {
    const { agent } = await playingChild();
    const body = await tree(agent);
    expect(body.subjects.map((s) => s.subjectId)).toEqual(app.content.subjects.map((s) => s.id));
    const reading = skillOf(body, 'doc-hieu');
    expect(reading).toMatchObject({ level: 1, xp: 0, xpIntoLevel: 0, xpForNextLevel: 2, maxLevel: app.content.skillCurve.thresholds.length });
    expect(reading?.gifts.map((g) => g.level)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(reading?.gifts.every((g) => !g.received && g.coin > 0)).toBe(true);
    expect(reading?.gifts.find((g) => g.level === 3)?.item).toMatchObject({ id: READING_GLASSES, slot: 'glasses' });
  });

  it('pays a skill level gift once with the run that reaches it, shown on the Skill Up screen', async () => {
    const { agent, childId } = await playingChild();
    const first = await play(agent, 'quest-b');
    // Phép cộng reaches level 2 (2 XP): its coins come with the run.
    expect(first.completion?.skillGifts).toEqual([{ skillId: 'phep-cong', level: 2, coin: app.content.skillGifts.coins['2'], item: null }]);
    expect(first.progress.coins).toBe(20 + (app.content.skillGifts.coins['2'] ?? 0));
    // The next run: Phép cộng 4 XP (still level 2, no gift again), Đọc hiểu 2 XP (level 2: its gift).
    const second = await play(agent, 'quest-b', 2);
    expect(second.completion?.skillGifts?.map((g) => [g.skillId, g.level])).toEqual([['doc-hieu', 2]]);
    expect((await giftRows(childId)).map((r) => r.source).sort()).toEqual(['skill-gift:doc-hieu:2', 'skill-gift:phep-cong:2']);
    expect(skillOf(await tree(agent), 'phep-cong')?.gifts.filter((g) => g.received).map((g) => g.level)).toEqual([2]);
  });

  it('gives the themed wearable of a level into the wardrobe, and catches up levels reached before', async () => {
    const { agent, childId } = await playingChild();
    // Reached before gifts existed: 4 XP of Đọc hiểu (level 2), no gift paid yet.
    await app.db.insert(skillProgress).values({ childId, skillId: 'doc-hieu', xp: 4 });
    const wear = () => agent.put('/api/character').send({ name: 'Miu', equipped: [READING_GLASSES] });
    expect((await wear().expect(403)).body).toEqual({ error: 'equipment-locked' });
    const done = await play(agent, 'quest-a');
    expect(done.completion?.skillGifts?.map((g) => [g.skillId, g.level, g.item?.id ?? null])).toEqual([
      ['doc-hieu', 2, null],
      ['doc-hieu', 3, READING_GLASSES],
    ]);
    expect(ShopState.parse((await agent.get('/api/shop').expect(200)).body).owned).toEqual({ [READING_GLASSES]: 1 });
    expect((await wear().expect(200)).body).toMatchObject({ equipped: [READING_GLASSES] });
    const coins = ProgressResponse.parse((await agent.get('/api/progress').expect(200)).body).coins;
    expect(coins).toBe(10 + (app.content.skillGifts.coins['2'] ?? 0) + (app.content.skillGifts.coins['3'] ?? 0));
    expect(await app.db.select().from(shopInventory).where(eq(shopInventory.childId, childId))).toHaveLength(1);
  });

  it('pays nothing for a resent last step, even sent many times at once', async () => {
    const { agent, childId } = await playingChild();
    const quest = app.content.quests.get('quest-b');
    if (quest?.status !== 'active') throw new Error('quest-b must be active');
    const moves = solution(quest);
    const last = moves.pop();
    if (!last) throw new Error('quest-b has steps');
    for (const [stepId, body] of moves) await agent.post(`/api/quests/quest-b/steps/${stepId}/complete`).send(body).expect(200);
    const results = await Promise.all(Array.from({ length: 4 }, () => agent.post(`/api/quests/quest-b/steps/${last[0]}/complete`).send({ ...last[1], skillGifts: [{ skillId: 'logic', level: 10 }] })));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    expect((await giftRows(childId)).map((r) => r.source)).toEqual(['skill-gift:phep-cong:2']);
  });

  it("keeps each player's tree apart and needs a selected player", async () => {
    const a = await playingChild();
    const b = await playingChild();
    await play(a.agent, 'quest-b');
    expect(skillOf(await tree(b.agent), 'phep-cong')).toMatchObject({ level: 1, xp: 0 });
    expect(skillOf(await tree(b.agent), 'phep-cong')?.gifts.some((g) => g.received)).toBe(false);
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    await app.agent().get('/api/skill-tree').expect(401);
    expect((await (await signedInWithoutPlayer(app)).get('/api/skill-tree').expect(401)).body).toEqual({ error: 'no-active-child' });
  });
});

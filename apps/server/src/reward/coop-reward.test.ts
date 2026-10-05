import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QuestListResponse } from '@miu/schema/game';
import { coopQuest } from '../../test/coop-fixture';
import { createTestApp, FIXTURE_CONTENT, parentWithChild, type TestApp } from '../../test/test-app';
import { questProgress, rewardLedger } from '../db/schema';
import { dbCoopRewards } from './coop-reward';

const QUEST = coopQuest('team-boss');
const CONTENT = { ...FIXTURE_CONTENT, quests: new Map([...FIXTURE_CONTENT.quests, [QUEST.id, QUEST]]) };

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, {}, undefined, CONTENT);
});
afterAll(async () => {
  await app.handle.close();
});

const ledgerOf = (childId: string) =>
  app.db
    .select({ source: rewardLedger.source, xp: rewardLedger.xp, coins: rewardLedger.coins })
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, `quest:${QUEST.id}%`)));

describe('paying a won co-op challenge', () => {
  it('pays each run the catalogue reward once, finishes the quest and gives every question for the vở', async () => {
    const { childId } = await parentWithChild(app);
    const rewards = dbCoopRewards(app.db, CONTENT);
    const first = await rewards.pay(childId, QUEST);
    expect(first).toMatchObject({ reward: { xp: 40, coin: 15, skillXp: { 'cong-tru-pham-vi-100': 10 } }, unpaid: null });
    expect((first.completion?.notebook ?? []).map((l) => [l.step, l.answer])).toEqual([
      ['t1', 'Một'],
      ['t2', 'Hai'],
      ['t3', 'Ba'],
      ['t4', 'Bốn'],
    ]);
    // A replay is a new run and pays again (owner rule), under its own ledger source.
    await rewards.pay(childId, QUEST);
    expect((await ledgerOf(childId)).map((r) => r.source).sort()).toEqual([`quest:${QUEST.id}`, `quest:${QUEST.id}#2`]);
    const [row] = await app.db.select().from(questProgress).where(and(eq(questProgress.childId, childId), eq(questProgress.questId, QUEST.id)));
    expect(row?.completedAt).not.toBeNull();
    expect(row?.completedSteps).toEqual(QUEST.steps.map((s) => s.id));
  });

  it('pays two payments at once as two runs, never one run twice', async () => {
    const { childId } = await parentWithChild(app);
    const rewards = dbCoopRewards(app.db, CONTENT);
    await Promise.all([rewards.pay(childId, QUEST), rewards.pay(childId, QUEST)]);
    const rows = await ledgerOf(childId);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.source)).size).toBe(2);
    expect(rows.every((r) => r.xp === 40 && r.coins === 15)).toBe(true);
  });
});

describe('a co-op challenge over the API', () => {
  it('is listed only when asked for, and can never be played or paid step by step', async () => {
    const { agent } = await parentWithChild(app);
    const all = QuestListResponse.parse((await agent.get('/api/quests').expect(200)).body);
    expect(all.quests.some((q) => q.quest.id === QUEST.id)).toBe(false);
    const coop = QuestListResponse.parse((await agent.get('/api/quests?category=coop').expect(200)).body);
    expect(coop.quests.map((q) => q.quest.id)).toEqual([QUEST.id]);
    // Its questions stay on the server: the list shows how it is played, never a round or an answer.
    expect(JSON.stringify(coop)).not.toContain('Đòn một');
    await agent.post(`/api/quests/${QUEST.id}/steps/gap/complete`).send({ reward: { xp: 9999 } }).expect(404);
    await agent.post(`/api/quests/${QUEST.id}/steps/cung-choi/support`).send({ layer: 'answer' }).expect(404);
  });
});

import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, parentWithChild, type TestApp } from '../../test/test-app';
import { botMemories, childProfiles, questionStats } from '../db/schema';
import { dbBotStore, difficultyOf, medianMs } from './bot-store';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

describe('what bots keep in the database', () => {
  it('grows a bot\'s own skill XP', async () => {
    const store = dbBotStore(app.db);
    await store.addSkillXp('bot-db-1', 'phep-cong', 6);
    await store.addSkillXp('bot-db-1', 'phep-cong', 2);
    expect(await store.skills('bot-db-1')).toEqual({ 'phep-cong': 8 });
  });

  it('counts answers per question without anyone: answers, right ones, seconds', async () => {
    const store = dbBotStore(app.db);
    await Promise.all([store.recordAnswer('with-x/t1', true, 3.2), store.recordAnswer('with-x/t1', false, 9), store.recordAnswer('with-x/t1', true, 3.9)]);
    const numbers = (await store.questionNumbers(['with-x/t1', 'with-x/t2'])).get('with-x/t1');
    expect(numbers).toMatchObject({ answers: 3, rights: 2 });
    expect(medianMs(numbers?.times ?? [])).toBe(3_500);
    expect(difficultyOf(numbers)).toBe(0.35);
    const [row] = await app.db.select().from(questionStats).where(eq(questionStats.questionKey, 'with-x/t1'));
    expect(Object.keys(row ?? {}).sort()).toEqual(['answers', 'questionKey', 'rights', 'times', 'updatedAt']);
  });

  it('remembers whom a bot won with, and forgets her with her player', async () => {
    const store = dbBotStore(app.db);
    const { childId } = await parentWithChild(app);
    await store.remember('bot-db-2', childId, 'with-a', new Date());
    await store.remember('bot-db-2', childId, 'with-b', new Date());
    expect(await store.recall('bot-db-2', childId)).toEqual({ runs: 2, lastQuestId: 'with-b' });
    await app.db.delete(childProfiles).where(eq(childProfiles.id, childId));
    expect(await app.db.select().from(botMemories).where(eq(botMemories.childId, childId))).toEqual([]);
  });
});

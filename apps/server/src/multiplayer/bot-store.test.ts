import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, parentWithChild, type TestApp } from '../../test/test-app';
import { botMemories, botWorldMemories, childProfiles, questionStats } from '../db/schema';
import { decodeMemory, encodeMemory, MEMORY_BYTES_MAX } from './bot-brain/memory-codec';
import { schoolFleet } from './bot-brain/school-fleet';
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
    expect(Object.keys(row ?? {}).sort()).toEqual(['answers', 'questionKey', 'rights', 'times']);
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

  it("keeps what a bot learnt of each map, one row per bot and map, written over each time", async () => {
    const store = dbBotStore(app.db);
    expect(await store.worldMemory('bot-db-3', 'truong-hoc')).toBeNull();
    const fleet = schoolFleet(1);
    fleet.run(20);
    const brain = fleet.bots[0]?.brain;
    if (!brain) throw new Error('no bot');
    const first = encodeMemory(brain.snapshot());
    await store.saveWorldMemory('bot-db-3', 'truong-hoc', 'grid-1', first);
    fleet.run(10);
    const second = encodeMemory(brain.snapshot());
    await store.saveWorldMemory('bot-db-3', 'truong-hoc', 'grid-2', second);
    await store.saveWorldMemory('bot-db-3', 'lau-dai', 'grid-1', first);
    const row = await store.worldMemory('bot-db-3', 'truong-hoc');
    expect(row?.gridVersion).toBe('grid-2');
    expect(row?.memory).toEqual(second);
    expect(decodeMemory(row?.memory).graph.places.length).toBe(brain.memory.places.size);
    expect((await store.worldMemory('bot-db-3', 'lau-dai'))?.memory).toEqual(first);
    // Stored, it is as small as it was written (jsonb's text adds a space or two).
    const [size] = await app.db
      .select({ bytes: sql<number>`octet_length(${botWorldMemories.memory}::text)` })
      .from(botWorldMemories)
      .where(and(eq(botWorldMemories.botId, 'bot-db-3'), eq(botWorldMemories.mapId, 'truong-hoc')));
    expect(size?.bytes).toBeLessThanOrEqual(MEMORY_BYTES_MAX + 16);
    // Only the bot, the map, the grid, the memory and when.
    const [stored] = await app.db.select().from(botWorldMemories).where(eq(botWorldMemories.botId, 'bot-db-3')).limit(1);
    expect(Object.keys(stored ?? {}).sort()).toEqual(['botId', 'gridVersion', 'mapId', 'memory', 'updatedAt']);
  });

  it('refuses a memory larger than 64 KB', async () => {
    const store = dbBotStore(app.db);
    await expect(store.saveWorldMemory('bot-db-4', 'truong-hoc', 'grid-1', { v: 1, z: 'A'.repeat(70_000) })).rejects.toThrow();
    expect(await store.worldMemory('bot-db-4', 'truong-hoc')).toBeNull();
  });
});

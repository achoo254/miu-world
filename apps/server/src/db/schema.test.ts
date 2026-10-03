import { randomUUID } from 'node:crypto';
import { eq, getTableColumns, sql } from 'drizzle-orm';
import { emptyTimetable } from '@miu/schema/timetable';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type Db, type DbHandle } from './client';
import * as t from './schema';

let handle: DbHandle;
let db: Db;

beforeAll(async () => {
  handle = await createTestDb();
  db = handle.db;
});
afterAll(async () => {
  await handle.close();
});

const CHILD_TABLES = [t.characters, t.questProgress, t.rewardLedger, t.inventoryItems, t.skillProgress, t.stepAttempts, t.timetables] as const;

async function seedParentWithChild(): Promise<{ parentId: string; childId: string }> {
  const parentId = randomUUID();
  const childId = randomUUID();
  await db.insert(t.parents).values({ id: parentId, email: `${parentId}@example.vn`, passwordHash: 'h', pinHash: 'h' });
  await db.insert(t.childProfiles).values({ id: childId, parentId, displayName: 'Mèo Mây' });
  await db.insert(t.characters).values({ childId, name: 'Miu' });
  await db.insert(t.questProgress).values({ childId, questId: 'q', completedSteps: ['s1'] });
  await db.insert(t.rewardLedger).values({ id: randomUUID(), childId, source: 'quest-step:q/s1', xp: 5 });
  await db.insert(t.inventoryItems).values({ childId, itemId: 'la-than', qty: 1 });
  await db.insert(t.skillProgress).values({ childId, skillId: 'doc-hieu', xp: 1 });
  await db.insert(t.stepAttempts).values({ childId, questId: 'q', stepId: 's1', wrongCount: 2, answerViews: 1 });
  await db.insert(t.timetables).values({ childId, timetable: emptyTimetable() });
  await db.insert(t.sessions).values({ id: randomUUID(), parentId, activeChildId: childId, expiresAt: new Date(Date.now() + 60_000) });
  await db.insert(t.consents).values({ id: randomUUID(), parentId, policyVersion: 'draft-1' });
  return { parentId, childId };
}

async function countFor(childId: string): Promise<number[]> {
  return Promise.all(
    CHILD_TABLES.map(async (table) => {
      const rows = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(table.childId, childId));
      return rows[0]?.n ?? -1;
    }),
  );
}

describe('database schema', () => {
  beforeEach(async () => {
    await db.delete(t.parents);
  });

  it('rejects a duplicate parent email', async () => {
    await db.insert(t.parents).values({ id: randomUUID(), email: 'a@example.vn', passwordHash: 'h', pinHash: 'h' });
    await expect(
      db.insert(t.parents).values({ id: randomUUID(), email: 'a@example.vn', passwordHash: 'h', pinHash: 'h' }),
    ).rejects.toThrow();
  });

  it('keeps step attempts as counters only: no answer content, no per-event time', async () => {
    const columns = Object.keys(getTableColumns(t.stepAttempts));
    expect(columns.sort()).toEqual(['answerViews', 'childId', 'questId', 'stepId', 'wrongCount'].sort());
  });

  it('allows one ledger row per child and source', async () => {
    const { childId } = await seedParentWithChild();
    await expect(
      db.insert(t.rewardLedger).values({ id: randomUUID(), childId, source: 'quest-step:q/s1', xp: 5 }),
    ).rejects.toThrow();
    const skipped = await db
      .insert(t.rewardLedger)
      .values({ id: randomUUID(), childId, source: 'quest-step:q/s1', xp: 5 })
      .onConflictDoNothing()
      .returning();
    expect(skipped).toHaveLength(0);
  });

  it('deleting a child profile removes every row that belongs to it and clears the session pointer', async () => {
    const { parentId, childId } = await seedParentWithChild();
    expect(await countFor(childId)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    await db.delete(t.childProfiles).where(eq(t.childProfiles.id, childId));
    expect(await countFor(childId)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    const [session] = await db.select().from(t.sessions).where(eq(t.sessions.parentId, parentId));
    expect(session?.activeChildId).toBeNull();
  });

  it('deleting a parent removes profiles, sessions, consents and all child data', async () => {
    const { parentId, childId } = await seedParentWithChild();
    await db.delete(t.parents).where(eq(t.parents.id, parentId));
    expect(await countFor(childId)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    for (const table of [t.childProfiles, t.sessions, t.consents]) {
      const rows = await db.select().from(table).where(eq(table.parentId, parentId));
      expect(rows).toHaveLength(0);
    }
  });
});

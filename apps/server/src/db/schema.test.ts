import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

const CHILD_TABLES = [t.characters, t.questProgress, t.rewardLedger, t.inventoryItems, t.skillProgress, t.stepAttempts, t.timetables, t.homeDecor, t.homeObjects, t.petBonds] as const;

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
  await db.insert(t.homeDecor).values({ childId, choices: { bed: 'bed-blue' } });
  await db.insert(t.homeObjects).values({ childId, states: { 'lamp-toggle@lamp#0': true } });
  await db.insert(t.petBonds).values({ childId, petId: 'meo-xam', happiness: 80, fullness: 75, cleanliness: 85, statsAt: new Date() });
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

  it('backfills one primary player per account (oldest, ties by id) and refuses a second primary', async () => {
    const migration = readFileSync(fileURLToPath(new URL('../../drizzle/0010_primary-player.sql', import.meta.url)), 'utf8');
    const backfill = migration.split('--> statement-breakpoint').map((part) => part.trim()).find((part) => part.startsWith('UPDATE'));
    if (!backfill) throw new Error('the primary-player migration has no backfill statement');
    const a = randomUUID();
    const b = randomUUID();
    for (const id of [a, b]) await db.insert(t.parents).values({ id, email: `${id}@example.vn`, passwordHash: 'h' });
    const at = new Date('2026-10-01T00:00:00Z');
    const later = new Date('2026-10-02T00:00:00Z');
    const [aOld, aNew] = [randomUUID(), randomUUID()];
    const [bLow, bHigh] = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
    await db.insert(t.childProfiles).values([
      { id: aNew, parentId: a, displayName: 'Thỏ Bông', createdAt: later },
      { id: aOld, parentId: a, displayName: 'Mèo Mây', createdAt: at },
      { id: bHigh, parentId: b, displayName: 'Cáo Nhỏ', createdAt: at },
      { id: bLow, parentId: b, displayName: 'Gấu Mật', createdAt: at },
    ]);
    await db.execute(sql.raw(backfill));
    await db.execute(sql.raw(backfill)); // idempotent: a second run changes nothing
    const primaries = await db.select({ id: t.childProfiles.id }).from(t.childProfiles).where(eq(t.childProfiles.isPrimary, true));
    expect(primaries.map((r) => r.id).sort()).toEqual([aOld, bLow].sort());
    await expect(db.update(t.childProfiles).set({ isPrimary: true }).where(eq(t.childProfiles.id, aNew))).rejects.toThrow();
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
    expect(await countFor(childId)).toEqual(CHILD_TABLES.map(() => 1));
    await db.delete(t.childProfiles).where(eq(t.childProfiles.id, childId));
    expect(await countFor(childId)).toEqual(CHILD_TABLES.map(() => 0));
    const [session] = await db.select().from(t.sessions).where(eq(t.sessions.parentId, parentId));
    expect(session?.activeChildId).toBeNull();
  });

  it('deleting a parent removes profiles, sessions, consents and all child data', async () => {
    const { parentId, childId } = await seedParentWithChild();
    await db.delete(t.parents).where(eq(t.parents.id, parentId));
    expect(await countFor(childId)).toEqual(CHILD_TABLES.map(() => 0));
    for (const table of [t.childProfiles, t.sessions, t.consents]) {
      const rows = await db.select().from(table).where(eq(table.parentId, parentId));
      expect(rows).toHaveLength(0);
    }
  });
});

/** What the companion bots learnt: kept for good, so no migration may take any of it away. */
const BOT_LEARNING_TABLES = ['bot_world_memories', 'bot_skills'];

/** The statements of a migration that touch a bot-learning table and are not one of the few that only add. */
function takingAway(migration: string): string[] {
  return migration
    .split(/--> statement-breakpoint|;/)
    .map((statement) => statement.trim())
    .filter((statement) => BOT_LEARNING_TABLES.some((table) => statement.includes(`"${table}"`)))
    .filter((statement) => !/^(CREATE TABLE|CREATE (UNIQUE )?INDEX|ALTER TABLE "[a-z_]+" ADD (CONSTRAINT|COLUMN) )/i.test(statement));
}

describe('migrations', () => {
  it('never drop, empty, rewrite or narrow what the companion bots learnt', () => {
    expect(takingAway('DELETE FROM "bot_world_memories"')).toHaveLength(1);
    expect(takingAway('ALTER TABLE "bot_skills" DROP COLUMN "xp"')).toHaveLength(1);
    const folder = new URL('../../drizzle/', import.meta.url);
    const files = readdirSync(folder).filter((name) => name.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(20);
    for (const name of files) expect([name, takingAway(readFileSync(new URL(name, folder), 'utf8'))]).toEqual([name, []]);
  });
});

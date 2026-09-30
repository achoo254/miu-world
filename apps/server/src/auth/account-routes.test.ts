import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccountExport } from '@miu/schema/account';
import { TEST_PIN, createTestApp, parentWithChild, type TestApp } from '../../test/test-app';
import * as schema from '../db/schema';

const t = schema;
const tables = Object.values(schema as Record<string, unknown>).filter((v): v is PgTable => typeof v === 'object' && v !== null && Symbol.for('drizzle:IsDrizzleTable') in v);

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

/** A parent with one profile that has played: a finished quest, a quest in progress, rewards. */
async function playedFamily() {
  const family = await parentWithChild(app);
  const { childId } = family;
  await app.db.insert(t.questProgress).values([
    { childId, questId: 'q-done', completedSteps: ['a', 'b'], completedAt: new Date(), stars: 3, xpAwarded: 40 },
    { childId, questId: 'q-open', completedSteps: ['a'], found: { b: ['bush-1'] } },
  ]);
  await app.db.insert(t.stepAttempts).values({ childId, questId: 'q-open', stepId: 'b', wrongCount: 2, answerViews: 1 });
  await app.db.insert(t.rewardLedger).values({ id: randomUUID(), childId, source: 'quest:q-done', xp: 40, coins: 5, skillXp: { 'doc-hieu': 10 }, items: { 'la-than': 1 } });
  await app.db.insert(t.inventoryItems).values({ childId, itemId: 'la-than', qty: 1 });
  await app.db.insert(t.skillProgress).values({ childId, skillId: 'doc-hieu', xp: 10 });
  const me = (await family.agent.get('/api/auth/me').expect(200)).body as { parent: { id: string } };
  return { ...family, parentId: me.parent.id };
}

/** Rows in every table that belong to this parent or its children. */
async function rowsOf(parentId: string, childIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const config = getTableConfig(table);
    const byParent = config.columns.find((c) => c.name === 'parent_id');
    const byChild = config.columns.find((c) => c.name === 'child_id');
    const byId = config.name === 'parents' ? config.columns.find((c) => c.name === 'id') : undefined;
    const column = byParent ?? byChild ?? byId;
    if (!column) throw new Error(`table ${config.name} is not linked to a parent or a child: extend this test`);
    const values = column === byChild ? childIds : [parentId];
    let n = 0;
    for (const value of values) {
      const [row] = await app.db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(column, value));
      n += row?.n ?? 0;
    }
    counts[config.name] = n;
  }
  return counts;
}

describe('account export', () => {
  it('gives the parent every row kept about the account, without secret hashes', async () => {
    const { agent, childId, parent } = await playedFamily();
    const res = await agent.get('/api/account/export').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const data = AccountExport.parse(res.body);
    expect(data.parent).toMatchObject({ email: parent.email, signIn: 'password' });
    expect(data.consents).toEqual([{ policyVersion: app.content.consent.version, acceptedAt: expect.any(String) }]);
    expect(data.sessions).toHaveLength(1);
    expect(data.children).toHaveLength(1);
    const [child] = data.children;
    expect(child).toMatchObject({
      displayName: 'Mèo Mây',
      character: { species: 'cat', name: 'Miu', equipped: [] },
      stepCounters: [{ questId: 'q-open', stepId: 'b', wrongCount: 2, answerViews: 1 }],
      inventory: [{ itemId: 'la-than', qty: 1 }],
      skills: [{ skillId: 'doc-hieu', xp: 10 }],
    });
    expect(child?.quests.map((q) => q.questId).sort()).toEqual(['q-done', 'q-open']);
    expect(child?.rewards).toEqual([{ source: 'quest:q-done', xp: 40, coins: 5, skillXp: { 'doc-hieu': 10 }, items: { 'la-than': 1 }, createdAt: expect.any(String) }]);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/hash|scrypt|\$/i);
    expect(raw).not.toContain(childId);
  });

  it('returns an empty list of children for a parent with none', async () => {
    const { agent } = await parentWithChild(app, false);
    expect(AccountExport.parse((await agent.get('/api/account/export').expect(200)).body).children).toEqual([]);
  });

  it('needs the PIN, and never includes another family', async () => {
    const a = await playedFamily();
    const b = await parentWithChild(app, false);
    const exported = AccountExport.parse((await b.agent.get('/api/account/export').expect(200)).body);
    expect(exported.children).toEqual([]);
    expect(JSON.stringify(exported)).not.toContain(a.parent.email);
    await a.agent.post('/api/parent-gate/lock').expect(200);
    await a.agent.get('/api/account/export').expect(403, { error: 'parent-gate-closed' });
  });
});

describe('account deletion', () => {
  it('hard-deletes the parent and every row of every table, then signs out', async () => {
    const { agent, childId, parentId } = await playedFamily();
    const second = (await agent.post('/api/children').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string };
    const before = await rowsOf(parentId, [childId, second.id]);
    // Every table holds something of this family, so a table the delete misses fails below.
    expect(Object.entries(before).filter(([, n]) => n === 0)).toEqual([]);
    expect(before).toMatchObject({ parents: 1, child_profiles: 2, sessions: 1, consents: 1, characters: 2, quest_progress: 2, step_attempts: 1 });

    const res = await agent.delete('/api/account').expect(204);
    expect(String(res.headers['set-cookie'])).toMatch(/Expires=Thu, 01 Jan 1970/);

    const after = await rowsOf(parentId, [childId, second.id]);
    expect(Object.entries(after).filter(([, n]) => n > 0)).toEqual([]);
    await agent.get('/api/auth/me').expect(401);
  });

  it('needs the PIN, and leaves other families untouched', async () => {
    const a = await playedFamily();
    const b = await playedFamily();
    await a.agent.post('/api/parent-gate/lock').expect(200);
    await a.agent.delete('/api/account').expect(403, { error: 'parent-gate-closed' });
    await a.agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    await a.agent.delete('/api/account').expect(204);
    expect(await rowsOf(b.parentId, [b.childId])).toMatchObject({ parents: 1, child_profiles: 1, quest_progress: 2, reward_ledger: 1 });
    await b.agent.get('/api/children').expect(200);
  });

  it('ends every session of the account, not only the one that asked', async () => {
    const { agent, parent, parentId } = await playedFamily();
    const other = app.agent();
    await other.post('/api/auth/login').send({ email: parent.email, ['password']: parent.password }).expect(200);
    await agent.delete('/api/account').expect(204);
    await other.get('/api/auth/me').expect(401);
    expect((await rowsOf(parentId, [])).sessions).toBe(0);
  });
});

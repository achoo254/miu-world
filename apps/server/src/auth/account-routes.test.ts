import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccountExport } from '@miu/schema/account';
import { emptyTimetable } from '@miu/schema/timetable';
import { TEST_PIN, createTestApp, parentWithChild, type TestApp, signedInWithoutPlayer } from '../../test/test-app';
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
  await app.db.insert(t.playerPositions).values({ childId, mapId: 'forest-ch1', x: 40.5, y: 12, z: 88, facing: 1.5 });
  await app.db.insert(t.timetables).values({ childId, timetable: { ...emptyTimetable(), uniform: { ...emptyTimetable().uniform, mon: 'Bộ sơ mi trắng' } } });
  await app.db.insert(t.homeDecor).values({ childId, choices: { bed: 'bed-blue', house: 'house-green' } });
  await app.db.insert(t.homeObjects).values({ childId, states: { 'lamp-toggle@lamp#0': true } });
  await app.db.insert(t.shopInventory).values({ childId, itemId: 'them-mot-tim', qty: 2 });
  await app.db.insert(t.mail).values({ id: randomUUID(), childId, templateId: 'welcome-gift', category: 'system' });
  await app.db.insert(t.npcFriendships).values({ childId, npcId: 'hoa-mi-rung', talkPoints: 2, giftPoints: 3, lastTalkOn: '2026-10-05' });
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
    expect(data.players).toHaveLength(1);
    const [child] = data.players;
    expect(child).toMatchObject({
      displayName: 'Mèo Mây',
      primary: true,
      character: { species: 'cat', name: 'Miu', equipped: [], pet: null },
      stepCounters: [{ questId: 'q-open', stepId: 'b', wrongCount: 2, answerViews: 1 }],
      inventory: [{ itemId: 'la-than', qty: 1 }],
      skills: [{ skillId: 'doc-hieu', xp: 10 }],
      positions: [{ map: 'forest-ch1', position: [40.5, 12, 88], facing: 1.5, updatedAt: expect.any(String) }],
      timetable: { uniform: { mon: 'Bộ sơ mi trắng' } },
      homeDecor: { bed: 'bed-blue', house: 'house-green' },
      homeObjects: { 'lamp-toggle@lamp#0': true },
      shop: [{ itemId: 'them-mot-tim', qty: 2 }],
    });
    expect(child?.quests.map((q) => q.questId).sort()).toEqual(['q-done', 'q-open']);
    expect(child?.settings).toEqual({ botsEnabled: true });
    expect(child?.mail).toEqual([{ templateId: 'welcome-gift', category: 'system', read: false, claimed: false, claimedAt: null, createdAt: expect.any(String) }]);
    expect(child).toMatchObject({ friends: [], friendRequests: { received: [], sent: [] }, blocks: [], reports: [], playTime: [] });
    expect(child?.rewards).toEqual([{ source: 'quest:q-done', xp: 40, coins: 5, skillXp: { 'doc-hieu': 10 }, items: { 'la-than': 1 }, createdAt: expect.any(String) }]);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/hash|scrypt|\$/i);
    expect(raw).not.toContain(childId);
  });

  it('includes each player\'s friends, requests, blocks, reports and weekly play time, others by character name only', async () => {
    const { agent, childId } = await playedFamily();
    const other = await parentWithChild(app);
    await app.db.update(t.characters).set({ name: 'Cáo Cam' }).where(eq(t.characters.childId, other.childId));
    await app.db.insert(t.friendships).values([
      { id: randomUUID(), childId, friendChildId: other.childId },
      { id: randomUUID(), childId, botId: 'bot-tt-1' },
    ]);
    await app.db.insert(t.friendRequests).values({ id: randomUUID(), childId: other.childId, fromChildId: childId });
    await app.db.insert(t.playerBlocks).values({ id: randomUUID(), childId, blockedChildId: other.childId });
    await app.db.insert(t.playerReports).values({ id: randomUUID(), childId, reportedChildId: other.childId, reason: 'name', mapId: 'trung-tam' });
    await app.db.insert(t.playTime).values({ childId, weekStart: '2026-09-28', seconds: 900 });
    const res = await agent.get('/api/account/export').expect(200);
    const [child] = AccountExport.parse(res.body).players;
    // Made in one statement: same instant, so no order between them.
    expect(child?.friends).toHaveLength(2);
    expect(child?.friends).toEqual(
      expect.arrayContaining([
        { displayName: 'Cáo Cam', isBot: false, since: expect.any(String) },
        { displayName: 'Bé Bông', isBot: true, since: expect.any(String) },
      ]),
    );
    expect(child?.friendRequests.sent).toEqual([{ displayName: 'Cáo Cam', sentAt: expect.any(String) }]);
    expect(child?.blocks).toEqual([{ displayName: 'Cáo Cam', since: expect.any(String) }]);
    expect(child?.reports).toEqual([{ displayName: 'Cáo Cam', reason: 'name', map: 'trung-tam', createdAt: expect.any(String) }]);
    expect(child?.playTime).toEqual([{ weekStart: '2026-09-28', seconds: 900, updatedAt: expect.any(String) }]);
    expect(child?.npcFriendships).toEqual([{ npcId: 'hoa-mi-rung', talkPoints: 2, giftPoints: 3, lastTalkOn: '2026-10-05', lastGiftOn: null }]);
    expect(JSON.stringify(res.body)).not.toContain(other.childId);
    expect(JSON.stringify(res.body)).not.toContain(other.parent.email);
  });

  it('returns no players before the policy is accepted', async () => {
    const agent = await signedInWithoutPlayer(app);
    expect(AccountExport.parse((await agent.get('/api/account/export').expect(200)).body).players).toEqual([]);
  });

  it('needs the PIN, and never includes another family', async () => {
    const a = await playedFamily();
    const b = await parentWithChild(app, false);
    const exported = AccountExport.parse((await b.agent.get('/api/account/export').expect(200)).body);
    // Only B's own primary player, fresh: nothing of A's.
    expect(exported.players).toHaveLength(1);
    expect(exported.players[0]).toMatchObject({ primary: true, quests: [], rewards: [] });
    expect(JSON.stringify(exported)).not.toContain(a.parent.email);
    await a.agent.post('/api/parent-gate/lock').expect(200);
    await a.agent.get('/api/account/export').expect(403, { error: 'parent-gate-closed' });
  });
});

describe('account deletion', () => {
  it('hard-deletes the parent and every row of every table, then signs out', async () => {
    const { agent, childId, parentId } = await playedFamily();
    const second = (await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string };
    // Online: one player of the family blocked and reported the other (the rows go with either of them).
    await app.db.insert(t.playerBlocks).values({ childId, blockedChildId: second.id });
    await app.db.insert(t.playerReports).values({ id: randomUUID(), childId, reportedChildId: second.id, reason: 'spam', mapId: 'trung-tam' });
    // Friends: with each other and with a companion bot, a request waiting, and the weekly play time.
    await app.db.insert(t.friendships).values([
      { id: randomUUID(), childId, friendChildId: second.id },
      { id: randomUUID(), childId, botId: 'bot-tt-1' },
    ]);
    await app.db.insert(t.friendRequests).values({ id: randomUUID(), childId: second.id, fromChildId: childId });
    await app.db.insert(t.playTime).values({ childId, weekStart: '2026-09-28', seconds: 600 });
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
    await b.agent.get('/api/players').expect(200);
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

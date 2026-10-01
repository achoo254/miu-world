import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_PIN, createTestApp, fakeParent, parentWithChild, type TestApp } from '../../test/test-app';
import * as t from '../db/schema';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

describe('child profiles', () => {
  it('requires consent before the first profile', async () => {
    const agent = app.agent();
    await agent.post('/api/auth/register').send(fakeParent()).expect(201);
    await agent.post('/api/children').send({ displayName: 'Mèo Mây' }).expect(403, { error: 'consent-required' });
  });

  it('only accepts names from the list and never free text', async () => {
    const { agent } = await parentWithChild(app, false);
    await agent.post('/api/children').send({ displayName: 'Nguyễn Văn A' }).expect(400, { error: 'invalid-display-name' });
    await agent.post('/api/children').send({ displayName: 'Mèo Mây', age: 7, school: 'x' }).expect(201);
    const [row] = await app.db.select().from(t.childProfiles).orderBy(sql`created_at desc`).limit(1);
    expect(Object.keys(row ?? {}).sort()).toEqual(['createdAt', 'displayName', 'id', 'parentId']);
  });

  it('accepts a decomposed (NFD) spelling of a listed name', async () => {
    const { agent } = await parentWithChild(app, false);
    const res = await agent.post('/api/children').send({ displayName: 'Mèo Mây'.normalize('NFD') }).expect(201);
    expect(res.body.displayName).toBe('Mèo Mây'.normalize('NFC'));
  });

  it('caps profiles at 3, also under concurrent requests', async () => {
    const { agent } = await parentWithChild(app, false);
    const results = await Promise.all(
      ['Mèo Mây', 'Thỏ Bông', 'Cáo Nhỏ', 'Gấu Mật'].map((displayName) => agent.post('/api/children').send({ displayName })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 201, 201, 409]);
    expect((await agent.get('/api/children').expect(200)).body).toHaveLength(3);
  });

  it('creates a default character with each profile', async () => {
    const { childId } = await parentWithChild(app);
    const [character] = await app.db.select().from(t.characters).where(eq(t.characters.childId, childId));
    expect(character).toMatchObject({ species: 'cat', name: 'Miu', equipped: [], pet: null });
  });

  it('selects a profile for play', async () => {
    const { agent, childId } = await parentWithChild(app);
    await agent.post(`/api/children/${childId}/select`).expect(200, { activeChildId: childId });
    expect((await agent.get('/api/auth/me').expect(200)).body.activeChildId).toBe(childId);
  });

  it('needs the parent gate to rename or delete, but not for the child to pick a profile', async () => {
    const { agent, childId } = await parentWithChild(app);
    await agent.post('/api/parent-gate/lock').expect(200);
    await agent.patch(`/api/children/${childId}`).send({ displayName: 'Sao Nhỏ' }).expect(403, { error: 'parent-gate-closed' });
    await agent.delete(`/api/children/${childId}`).expect(403, { error: 'parent-gate-closed' });
    await agent.post(`/api/children/${childId}/select`).expect(200);
    await agent.get('/api/children').expect(200);
  });

  it('closes the parent area when a profile is picked for play', async () => {
    const { agent, childId } = await parentWithChild(app);
    expect((await agent.get('/api/auth/me').expect(200)).body.parentGateOpen).toBe(true);
    const me = await agent.post(`/api/children/${childId}/select`).expect(200);
    expect(me.body.activeChildId).toBe(childId);
    expect((await agent.get('/api/auth/me').expect(200)).body.parentGateOpen).toBe(false);
    await agent.delete(`/api/children/${childId}`).expect(403, { error: 'parent-gate-closed' });
  });

  it('refuses play when the parent has not accepted the current policy version', async () => {
    const { agent, childId } = await parentWithChild(app);
    const me = (await agent.get('/api/auth/me').expect(200)).body as { parent: { id: string } };
    await app.db.delete(t.consents).where(eq(t.consents.parentId, me.parent.id));
    await agent.post(`/api/children/${childId}/select`).expect(403, { error: 'consent-required' });
  });

  it('renames within the list', async () => {
    const { agent, childId } = await parentWithChild(app);
    await agent.patch(`/api/children/${childId}`).send({ displayName: 'Sao Nhỏ' }).expect(200, { id: childId, displayName: 'Sao Nhỏ', species: 'cat' });
    await agent.patch(`/api/children/${childId}`).send({ displayName: 'Bé Na' }).expect(400);
  });

  it('hard-deletes a profile and every row that belongs to it', async () => {
    const { agent, childId } = await parentWithChild(app);
    await agent.post(`/api/children/${childId}/select`).expect(200);
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    await app.db.insert(t.questProgress).values({ childId, questId: 'q', completedSteps: ['s'] });
    await app.db.insert(t.rewardLedger).values({ id: randomUUID(), childId, source: 'quest-step:q/s', xp: 1 });
    await app.db.insert(t.inventoryItems).values({ childId, itemId: 'la-than', qty: 1 });
    await app.db.insert(t.skillProgress).values({ childId, skillId: 'doc-hieu', xp: 1 });

    await agent.delete(`/api/children/${childId}`).expect(204);

    for (const table of [t.characters, t.questProgress, t.rewardLedger, t.inventoryItems, t.skillProgress]) {
      const [row] = await app.db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(table.childId, childId));
      expect(row?.n).toBe(0);
    }
    expect(await app.db.select().from(t.childProfiles).where(eq(t.childProfiles.id, childId))).toHaveLength(0);
    expect((await agent.get('/api/auth/me').expect(200)).body.activeChildId).toBeNull();
  });
});

describe('IDOR: one family can never reach another family\'s profiles', () => {
  it('hides, and refuses to change, select or delete, a foreign profile with 404', async () => {
    const a = await parentWithChild(app);
    const b = await parentWithChild(app);

    const listed = (await b.agent.get('/api/children').expect(200)).body as Array<{ id: string }>;
    expect(listed.map((c) => c.id)).not.toContain(a.childId);

    await b.agent.patch(`/api/children/${a.childId}`).send({ displayName: 'Sao Nhỏ' }).expect(404, { error: 'not-found' });
    await b.agent.post(`/api/children/${a.childId}/select`).expect(404, { error: 'not-found' });
    await b.agent.delete(`/api/children/${a.childId}`).expect(404, { error: 'not-found' });

    const [still] = await app.db.select().from(t.childProfiles).where(eq(t.childProfiles.id, a.childId));
    expect(still?.displayName).toBe('Mèo Mây');
    expect((await b.agent.get('/api/auth/me').expect(200)).body.activeChildId).toBeNull();
  });

  it('answers 404 for malformed and unknown ids', async () => {
    const { agent } = await parentWithChild(app);
    await agent.delete('/api/children/not-a-uuid').expect(404);
    await agent.post(`/api/children/${randomUUID()}/select`).expect(404);
  });

  it('requires a parent session for every profile route', async () => {
    const anon = app.agent();
    const id = randomUUID();
    await anon.get('/api/children').expect(401);
    await anon.post('/api/children').send({ displayName: 'Mèo Mây' }).expect(401);
    await anon.patch(`/api/children/${id}`).send({ displayName: 'Mèo Mây' }).expect(401);
    await anon.delete(`/api/children/${id}`).expect(401);
    await anon.post(`/api/children/${id}/select`).expect(401);
    await anon.post('/api/consents').send({ policyVersion: app.content.consent.version }).expect(401);
    await anon.post('/api/parent-gate/unlock').send({ pin: '1234' }).expect(401);
  });
});

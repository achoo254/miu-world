import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { FIXTURE_CONTENT, ORIGIN, createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import * as t from '../db/schema';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/children/${childId}/select`).expect(200);
  return { agent, childId };
}

const step = (agent: Agent, quest: string, stepId: string, body: unknown = {}) =>
  agent.post(`/api/quests/${quest}/steps/${stepId}/complete`).send(body as object);

describe('quest progress and rewards (server is the source of truth)', () => {
  it('pays the catalogue reward on the last step and reports totals', async () => {
    const { agent } = await playingChild();
    const first = await step(agent, 'quest-a', 'meet-vet').expect(200);
    expect(first.body).toMatchObject({ reward: null, repeated: false, quest: { completedSteps: ['meet-vet'], completed: false } });
    const last = await step(agent, 'quest-a', 'find-letter').expect(200);
    expect(last.body.reward).toEqual({ xp: 60, coin: 10, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } });
    expect(last.body.progress).toMatchObject({ xp: 60, coins: 10, level: 1, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } });
    const progress = await agent.get('/api/progress').expect(200);
    expect(progress.body.quests).toEqual([{ questId: 'quest-a', completedSteps: ['meet-vet', 'find-letter'], completed: true }]);
    expect((await agent.get('/api/inventory').expect(200)).body).toEqual({ items: [{ itemId: 'la-than', qty: 1 }] });
  });

  it('ignores reward values sent by the client', async () => {
    const { agent } = await playingChild();
    const res = await step(agent, 'quest-c', 'say-hello', { xp: 999_999, reward: { coin: 5000 }, items: { 'chia-khoa': 99 } }).expect(200);
    expect(res.body.reward).toEqual({ xp: 5, coin: 0, skillXp: {}, items: {} });
    expect(res.body.progress).toMatchObject({ xp: 5, coins: 0, items: {} });
  });

  it('is idempotent: repeating a step returns the old result and grants nothing more', async () => {
    const { agent, childId } = await playingChild();
    await step(agent, 'quest-c', 'say-hello').expect(200);
    const again = await step(agent, 'quest-c', 'say-hello').expect(200);
    expect(again.body).toMatchObject({ repeated: true, reward: { xp: 5 }, progress: { xp: 5 } });
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows).toHaveLength(1);
  });

  it('rejects skipping steps with 409', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-a', 'find-letter').expect(409, { error: 'out-of-order' });
    expect((await agent.get('/api/progress').expect(200)).body.xp).toBe(0);
  });

  it('rejects a locked quest with 409 until its prerequisite is finished', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-b', 'open-gate').expect(409, { error: 'quest-locked' });
    await step(agent, 'quest-a', 'meet-vet').expect(200);
    await step(agent, 'quest-b', 'open-gate').expect(409, { error: 'quest-locked' });
    await step(agent, 'quest-a', 'find-letter').expect(200);
    await step(agent, 'quest-b', 'open-gate').expect(200);
  });

  it('answers 404 for unknown quests and steps', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-zzz', 'meet-vet').expect(404, { error: 'quest-not-found' });
    await step(agent, 'quest-a', 'fly-away').expect(404, { error: 'step-not-found' });
    await step(agent, 'Quest A', 'meet-vet').expect(404);
  });

  it('writes a single ledger row when the same step is completed concurrently', async () => {
    const { agent, childId } = await playingChild();
    const results = await Promise.all(Array.from({ length: 5 }, () => step(agent, 'quest-c', 'say-hello')));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r.body.repeated === false)).toHaveLength(1);
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows).toHaveLength(1);
    expect((await agent.get('/api/progress').expect(200)).body.xp).toBe(5);
  });

  it('keeps inventory and skill aggregates equal to the ledger after a seeded random run', async () => {
    const { agent, childId } = await playingChild();
    const moves: Array<[string, string]> = [
      ['quest-a', 'meet-vet'], ['quest-a', 'find-letter'], ['quest-b', 'open-gate'], ['quest-b', 'count-apples'],
      ['quest-b', 'solve-tree'], ['quest-c', 'say-hello'], ['quest-b', 'unknown'],
    ];
    let seed = 20260929;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let i = 0; i < 60; i += 1) {
      const [quest, stepId] = moves[Math.floor(random() * moves.length)] ?? ['quest-c', 'say-hello'];
      const res = await step(agent, quest, stepId, { xp: 1000 });
      expect([200, 404, 409]).toContain(res.status);
    }
    const ledger = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    const expectedItems: Record<string, number> = {};
    const expectedSkills: Record<string, number> = {};
    for (const row of ledger) {
      for (const [k, v] of Object.entries(row.items)) expectedItems[k] = (expectedItems[k] ?? 0) + v;
      for (const [k, v] of Object.entries(row.skillXp)) expectedSkills[k] = (expectedSkills[k] ?? 0) + v;
    }
    const progress = (await agent.get('/api/progress').expect(200)).body;
    expect(progress.items).toEqual(expectedItems);
    expect(progress.skillXp).toEqual(expectedSkills);
    expect(progress.xp).toBe(ledger.reduce((s, r) => s + r.xp, 0));
    expect(ledger.length).toBeLessThanOrEqual(3);
  });

  it('never pays a finished quest twice, even when its content later gains a step', async () => {
    const { agent, parent, childId } = await parentWithChild(app);
    await agent.post(`/api/children/${childId}/select`).expect(200);
    await step(agent, 'quest-c', 'say-hello').expect(200);
    // Same database, new content release where quest-c has a second step.
    const quests = new Map(FIXTURE_CONTENT.quests);
    quests.set('quest-c', {
      id: 'quest-c',
      region: 'khu-rung-bi-mat',
      steps: [{ id: 'say-hello' }, { id: 'wave-back' }],
      reward: { xp: 5, coin: 0, skillXp: {}, items: {} },
      unlock: [],
    });
    const v2 = request.agent(createApp({ config: app.config, db: app.db, content: { ...FIXTURE_CONTENT, quests } })).set('Origin', ORIGIN);
    await v2.post('/api/auth/login').send(parent).expect(200);
    await v2.post(`/api/children/${childId}/select`).expect(200);
    const res = await step(v2, 'quest-c', 'wave-back').expect(200);
    expect(res.body.repeated).toBe(true);
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows.map((r) => r.source)).toEqual(['quest:quest-c']);
  });

  it('stops play (403) as soon as the consent version on file is no longer current', async () => {
    const { agent } = await playingChild();
    const me = (await agent.get('/api/auth/me').expect(200)).body as { parent: { id: string } };
    await app.db.delete(t.consents).where(eq(t.consents.parentId, me.parent.id));
    await agent.get('/api/progress').expect(403, { error: 'consent-required' });
    await agent.get('/api/character').expect(403, { error: 'consent-required' });
    await step(agent, 'quest-c', 'say-hello').expect(403, { error: 'consent-required' });
  });

  it('never exposes diamonds', async () => {
    const { agent } = await playingChild();
    const text = (await agent.get('/api/progress').expect(200)).text + (await step(agent, 'quest-c', 'say-hello')).text;
    expect(text).not.toMatch(/diamond|gem|kim-cuong/i);
  });
});

describe('character', () => {
  it('reads and updates name and equipment within the catalogue', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/character').expect(200)).body).toEqual({ species: 'cat', name: 'Miu', equipped: [] });
    const updated = await agent.put('/api/character').send({ name: 'Mochi', equipped: ['hat-witch-pink', 'backpack-brown'] }).expect(200);
    expect(updated.body).toEqual({ species: 'cat', name: 'Mochi', equipped: ['hat-witch-pink', 'backpack-brown'] });
  });

  it('rejects free-text names, unknown or doubled-up equipment, and ignores species', async () => {
    const { agent } = await playingChild();
    await agent.put('/api/character').send({ name: 'Tên Thật', equipped: [] }).expect(400, { error: 'invalid-character-name' });
    await agent.put('/api/character').send({ name: 'Miu', equipped: ['golden-crown'] }).expect(400, { error: 'invalid-equipment' });
    await agent.put('/api/character').send({ name: 'Miu', equipped: ['hat-witch-pink', 'hat-witch-pink'] }).expect(400);
    const res = await agent.put('/api/character').send({ name: 'Miu', equipped: [], species: 'dragon' }).expect(200);
    expect(res.body.species).toBe('cat');
  });
});

describe('IDOR and session rules for game routes', () => {
  it('needs a selected profile (401) and a parent session (401)', async () => {
    const { agent } = await parentWithChild(app);
    for (const res of [
      await agent.get('/api/character'),
      await agent.put('/api/character').send({ name: 'Miu', equipped: [] }),
      await agent.get('/api/progress'),
      await agent.get('/api/inventory'),
      await step(agent, 'quest-c', 'say-hello'),
    ]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'no-active-child' });
    }
    const anon = app.agent();
    await anon.get('/api/progress').expect(401, { error: 'unauthenticated' });
    await step(anon, 'quest-c', 'say-hello').expect(401);
  });

  it('keeps each family on its own child: another parent cannot read or change it', async () => {
    const a = await playingChild();
    const b = await playingChild();
    await step(a.agent, 'quest-c', 'say-hello').expect(200);
    await a.agent.put('/api/character').send({ name: 'Mochi', equipped: [] }).expect(200);

    // B's session can only ever point at B's child; forging the pointer to A's child is refused.
    await b.agent.post(`/api/children/${a.childId}/select`).expect(404);
    const [bSession] = await app.db.select().from(t.sessions).where(eq(t.sessions.activeChildId, b.childId));
    if (!bSession) throw new Error('missing session');
    await app.db.update(t.sessions).set({ activeChildId: a.childId }).where(eq(t.sessions.id, bSession.id));
    await b.agent.get('/api/character').expect(401, { error: 'no-active-child' });
    await b.agent.get('/api/progress').expect(401);
    await step(b.agent, 'quest-c', 'say-hello').expect(401);

    const [aCharacter] = await app.db.select().from(t.characters).where(eq(t.characters.childId, a.childId));
    expect(aCharacter?.name).toBe('Mochi');
    const [aLedger] = await app.db
      .select({ n: sql<number>`count(*)::int` })
      .from(t.rewardLedger)
      .where(eq(t.rewardLedger.childId, a.childId));
    expect(aLedger?.n).toBe(1);
  });
});

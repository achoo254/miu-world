import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { QuestStep } from '@miu/schema/content';
import { createApp } from '../app';
import { loadContentCatalog } from '../content/content-catalog';
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

/** Correct play-through of each fixture quest: step id and what the child sends for it. */
const PLAY: Record<string, Array<[string, object]>> = {
  'quest-a': [['meet-vet', {}], ['find-letter', { target: 'clue-letter' }], ['solve-tree', { answer: { value: 5 } }]],
  'quest-b': [['open-gate', { target: 'gate-ch2' }], ['count-apples', { answer: { placed: ['apple-1', 'apple-3'] } }], ['solve-tree', { answer: { value: 8 } }]],
  'quest-c': [['say-hello', {}], ['pick-flower', { target: 'flower' }], ['add-flowers', { answer: { value: 2 } }]],
};

async function finish(agent: Agent, quest: string, extra: object = {}): Promise<request.Response> {
  let last: request.Response | undefined;
  for (const [stepId, body] of PLAY[quest] ?? []) last = await step(agent, quest, stepId, { ...extra, ...body }).expect(200);
  if (!last) throw new Error(`no play-through for ${quest}`);
  return last;
}

describe('quest progress and rewards (server is the source of truth)', () => {
  it('pays the catalogue reward on the last step and reports totals', async () => {
    const { agent } = await playingChild();
    const first = await step(agent, 'quest-a', 'meet-vet').expect(200);
    expect(first.body).toMatchObject({ reward: null, repeated: false, quest: { completedSteps: ['meet-vet'], completed: false } });
    const last = await finish(agent, 'quest-a');
    expect(last.body.reward).toEqual({ xp: 60, coin: 10, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } });
    expect(last.body.progress).toMatchObject({ xp: 60, coins: 10, level: 1, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } });
    const progress = await agent.get('/api/progress').expect(200);
    expect(progress.body.quests).toEqual([{ questId: 'quest-a', completedSteps: ['meet-vet', 'find-letter', 'solve-tree'], completed: true }]);
    expect((await agent.get('/api/inventory').expect(200)).body).toEqual({ items: [{ itemId: 'la-than', qty: 1 }] });
  });

  it('ignores reward values sent by the client', async () => {
    const { agent } = await playingChild();
    const res = await finish(agent, 'quest-c', { xp: 999_999, reward: { coin: 5000 }, items: { 'chia-khoa': 99 } });
    expect(res.body.reward).toEqual({ xp: 5, coin: 0, skillXp: {}, items: {} });
    expect(res.body.progress).toMatchObject({ xp: 5, coins: 0, items: {} });
  });

  it('grades answers on the server: a wrong answer records nothing, the right one advances', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-c', 'say-hello').expect(200);
    await step(agent, 'quest-c', 'pick-flower', { target: 'flower' }).expect(200);
    await step(agent, 'quest-c', 'add-flowers').expect(400, { error: 'answer-required' });
    await step(agent, 'quest-c', 'add-flowers', { answer: { value: 3 } }).expect(422, { error: 'wrong-answer' });
    await step(agent, 'quest-c', 'add-flowers', { answer: { choice: 'a' } }).expect(422, { error: 'wrong-answer' });
    await step(agent, 'quest-c', 'add-flowers', { answer: { value: 'two' } }).expect(400, { error: 'invalid-step-input' });
    expect((await agent.get('/api/progress').expect(200)).body).toMatchObject({
      xp: 0,
      quests: [{ questId: 'quest-c', completedSteps: ['say-hello', 'pick-flower'], completed: false }],
    });
    const res = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(res.body).toMatchObject({ repeated: false, reward: { xp: 5 }, quest: { completed: true } });
  });

  it('needs a known target for search steps', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-c', 'say-hello').expect(200);
    await step(agent, 'quest-c', 'pick-flower').expect(400, { error: 'target-required' });
    await step(agent, 'quest-c', 'pick-flower', { target: 'dragon' }).expect(400, { error: 'unknown-target' });
    await step(agent, 'quest-c', 'pick-flower', { target: 'flower' }).expect(200);
  });

  it('is idempotent: repeating a step returns the old result and grants nothing more', async () => {
    const { agent, childId } = await playingChild();
    await finish(agent, 'quest-c');
    const again = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(again.body).toMatchObject({ repeated: true, reward: { xp: 5 }, progress: { xp: 5 } });
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows).toHaveLength(1);
  });

  it('rejects skipping steps with 409', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-a', 'find-letter', { target: 'clue-letter' }).expect(409, { error: 'out-of-order' });
    expect((await agent.get('/api/progress').expect(200)).body.xp).toBe(0);
  });

  it('rejects a locked quest with 409 until its prerequisite is finished', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-b', 'open-gate', { target: 'gate-ch2' }).expect(409, { error: 'quest-locked' });
    await step(agent, 'quest-a', 'meet-vet').expect(200);
    await step(agent, 'quest-b', 'open-gate', { target: 'gate-ch2' }).expect(409, { error: 'quest-locked' });
    await finish(agent, 'quest-a');
    await step(agent, 'quest-b', 'open-gate', { target: 'gate-ch2' }).expect(200);
  });

  it('shows a stub quest as coming soon once unlocked, and never lets it be played', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-soon', 'anything').expect(409, { error: 'quest-locked' });
    await finish(agent, 'quest-c');
    await step(agent, 'quest-soon', 'anything').expect(409, { error: 'quest-coming-soon' });
  });

  it('answers 404 for unknown quests and steps', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-zzz', 'meet-vet').expect(404, { error: 'quest-not-found' });
    await step(agent, 'quest-a', 'fly-away').expect(404, { error: 'step-not-found' });
    await step(agent, 'Quest A', 'meet-vet').expect(404);
  });

  it('writes a single ledger row when the same step is completed concurrently', async () => {
    const { agent, childId } = await playingChild();
    await step(agent, 'quest-c', 'say-hello').expect(200);
    await step(agent, 'quest-c', 'pick-flower', { target: 'flower' }).expect(200);
    const results = await Promise.all(Array.from({ length: 5 }, () => step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } })));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r.body.repeated === false)).toHaveLength(1);
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows).toHaveLength(1);
    expect((await agent.get('/api/progress').expect(200)).body.xp).toBe(5);
  });

  it('keeps inventory and skill aggregates equal to the ledger after a seeded random run', async () => {
    const { agent, childId } = await playingChild();
    const moves: Array<[string, string, object]> = [
      ...Object.entries(PLAY).flatMap(([quest, steps]) => steps.map(([stepId, body]): [string, string, object] => [quest, stepId, body])),
      ['quest-b', 'solve-tree', { answer: { value: 7 } }],
      ['quest-b', 'unknown', {}],
    ];
    let seed = 20260929;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let i = 0; i < 80; i += 1) {
      const [quest, stepId, body] = moves[Math.floor(random() * moves.length)] ?? ['quest-c', 'say-hello', {}];
      const res = await step(agent, quest, stepId, { xp: 1000, ...body });
      expect([200, 404, 409, 422]).toContain(res.status);
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
    await finish(agent, 'quest-c');
    // Same database, new content release where quest-c has one more step.
    const questC = FIXTURE_CONTENT.quests.get('quest-c');
    if (questC?.status !== 'active') throw new Error('expected quest-c to be active');
    const quests = new Map(FIXTURE_CONTENT.quests);
    const waveBack = QuestStep.parse({ id: 'wave-back', title: 'Vẫy tay', kind: 'dialogue', target: 'animal-beaver', lines: [{ speaker: 'Hải ly', text: 'Tạm biệt!' }] });
    quests.set('quest-c', { ...questC, steps: [...questC.steps, waveBack] });
    const v2 = request.agent(createApp({ config: app.config, db: app.db, content: { ...FIXTURE_CONTENT, quests } })).set('Origin', ORIGIN);
    await v2.post('/api/auth/login').send(parent).expect(200);
    await v2.post(`/api/children/${childId}/select`).expect(200);
    const res = await step(v2, 'quest-c', 'wave-back').expect(200);
    expect(res.body.repeated).toBe(true);
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows.map((r) => r.source)).toEqual(['quest:quest-c']);
  });

  it('plays a quest that was added only as a JSON file', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'miu-new-quest-'));
    const fixture = JSON.parse(readFileSync(new URL('../../test/fixtures/quests/quest-c.json', import.meta.url), 'utf8')) as object;
    writeFileSync(path.join(dir, 'lake.json'), JSON.stringify({ ...fixture, id: 'lake-walk', title: 'Dạo hồ', unlock: [], reward: { xp: 7, coin: 3 } }));
    const content = loadContentCatalog({ questDir: dir });
    const { parent, childId } = await parentWithChild(app);
    const agent = request.agent(createApp({ config: app.config, db: app.db, content })).set('Origin', ORIGIN);
    await agent.post('/api/auth/login').send(parent).expect(200);
    await agent.post(`/api/children/${childId}/select`).expect(200);
    let last: request.Response | undefined;
    for (const [stepId, body] of PLAY['quest-c'] ?? []) last = await step(agent, 'lake-walk', stepId, body).expect(200);
    expect(last?.body).toMatchObject({ reward: { xp: 7, coin: 3 }, quest: { completed: true } });
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
    await finish(a.agent, 'quest-c');
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

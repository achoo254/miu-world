import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { QuestStep } from '@miu/schema/content';
import { createApp } from '../app';
import { loadContentCatalog } from '../content/content-catalog';
import { solution } from '../../test/quest-solution';
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
  'side-egg': [['ask', {}], ['play', { answer: { score: 8 } }], ['thanks', {}], ['bye', {}]],
  'quest-a': [['meet-vet', {}], ['find-letter', { target: 'clue-letter' }], ['solve-tree', { answer: { value: 5 } }]],
  'quest-b': [['open-gate', { target: 'gate-ch2' }], ['count-apples', { answer: { placed: ['apple-1', 'apple-3'] } }], ['solve-tree', { answer: { value: 8 } }]],
  'quest-c': [['say-hello', {}], ['pick-flower', { target: 'mushroom' }], ['pick-flower', { target: 'flower' }], ['add-flowers', { answer: { value: 2 } }]],
};

/** Plays the first `count` moves of a fixture quest. */
async function playFirst(agent: Agent, quest: string, count: number): Promise<void> {
  for (const [stepId, body] of (PLAY[quest] ?? []).slice(0, count)) await step(agent, quest, stepId, body).expect(200);
}

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
    expect(progress.body.quests).toEqual([
      {
        questId: 'quest-a',
        completedSteps: ['meet-vet', 'find-letter', 'solve-tree'],
        completed: true,
        found: { 'find-letter': ['clue-letter'] },
        stars: 3,
        run: 1,
      },
    ]);
    // The quest's Lá thần, and the forest collectible the run dropped.
    const bag = (await agent.get('/api/inventory').expect(200)).body as { items: Array<{ itemId: string; qty: number }> };
    expect(bag.items).toHaveLength(2);
    expect(bag.items).toEqual(expect.arrayContaining([{ itemId: 'la-than', qty: 1 }]));
    expect(FIXTURE_CONTENT.collectibles.get('khu-rung-bi-mat')?.items.map((e) => e.id)).toContain(bag.items.find((i) => i.itemId !== 'la-than')?.itemId);
  });

  it('ignores reward values sent by the client', async () => {
    const { agent } = await playingChild();
    const res = await finish(agent, 'quest-c', { xp: 999_999, reward: { coin: 5000 }, items: { 'chia-khoa': 99 } });
    expect(res.body.reward).toEqual({ xp: 5, coin: 0, skillXp: {}, items: {} });
    expect(res.body.progress).toMatchObject({ xp: 5, coins: 0, items: {} });
  });

  it('grades answers on the server: a wrong answer records only a count, the right one advances', async () => {
    const { agent, childId } = await playingChild();
    await playFirst(agent, 'quest-c', 3);
    await step(agent, 'quest-c', 'add-flowers').expect(400, { error: 'answer-required' });
    const wrong = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 3 } }).expect(200);
    expect(wrong.body).toMatchObject({ correct: false, reward: null, completion: null, quest: { completed: false } });
    await step(agent, 'quest-c', 'add-flowers', { answer: { choice: 'a' } }).expect(200, /"correct":false/);
    await step(agent, 'quest-c', 'add-flowers', { answer: { value: 'two' } }).expect(400, { error: 'invalid-step-input' });
    expect((await agent.get('/api/progress').expect(200)).body).toMatchObject({
      xp: 0,
      quests: [{ questId: 'quest-c', completedSteps: ['say-hello', 'pick-flower'], completed: false }],
    });
    const [counts] = await app.db.select().from(t.stepAttempts).where(eq(t.stepAttempts.childId, childId));
    expect(counts).toEqual({ childId, questId: 'quest-c', stepId: 'add-flowers', wrongCount: 2, answerViews: 0 });
    const res = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(res.body).toMatchObject({ correct: true, repeated: false, reward: { xp: 5 }, quest: { completed: true } });
  });

  it('keeps search progress between calls: any order, finding one again changes nothing', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-c', 'say-hello').expect(200);
    const first = await step(agent, 'quest-c', 'pick-flower', { target: 'mushroom' }).expect(200);
    expect(first.body.quest).toMatchObject({ completedSteps: ['say-hello'], found: { 'pick-flower': ['mushroom'] } });
    const again = await step(agent, 'quest-c', 'pick-flower', { target: 'mushroom' }).expect(200);
    expect(again.body.quest).toMatchObject({ completedSteps: ['say-hello'], found: { 'pick-flower': ['mushroom'] } });
    const done = await step(agent, 'quest-c', 'pick-flower', { target: 'flower' }).expect(200);
    expect(done.body.quest).toMatchObject({ completedSteps: ['say-hello', 'pick-flower'], found: { 'pick-flower': ['mushroom', 'flower'] } });
  });

  it('needs a known target for search steps', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-c', 'say-hello').expect(200);
    await step(agent, 'quest-c', 'pick-flower').expect(400, { error: 'target-required' });
    await step(agent, 'quest-c', 'pick-flower', { target: 'dragon' }).expect(400, { error: 'unknown-target' });
    await step(agent, 'quest-c', 'pick-flower', { target: 'flower' }).expect(200);
    await step(agent, 'quest-c', 'pick-flower', { target: 'mushroom' }).expect(200);
    await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
  });

  it('is idempotent: repeating a step returns the old result and grants nothing more', async () => {
    const { agent, childId } = await playingChild();
    await finish(agent, 'quest-c');
    const again = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(again.body).toMatchObject({ repeated: true, reward: { xp: 5 }, progress: { xp: 5 } });
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows.map((r) => r.source).sort()).toEqual(['drop:quest:quest-c', 'quest:quest-c']);
  });

  it('rejects skipping steps with 409', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-a', 'find-letter', { target: 'clue-letter' }).expect(409, { error: 'out-of-order' });
    expect((await agent.get('/api/progress').expect(200)).body.xp).toBe(0);
  });

  it('plays any quest from the start: none waits for another to be finished', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-b', 'open-gate', { target: 'gate-ch2' }).expect(200);
  });

  it('shows a stub quest as coming soon, and never lets it be played', async () => {
    const { agent } = await playingChild();
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
    await playFirst(agent, 'quest-c', 3);
    const results = await Promise.all(Array.from({ length: 5 }, () => step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } })));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r.body.repeated === false)).toHaveLength(1);
    const rows = await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId));
    expect(rows.map((r) => r.source).sort()).toEqual(['drop:quest:quest-c', 'quest:quest-c']);
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
    // No move names a run, so no quest is played twice: at most one reward per quest.
    expect(ledger.filter((r) => r.source.startsWith('quest:')).length).toBeLessThanOrEqual(Object.keys(PLAY).length);
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
    expect(rows.map((r) => r.source).sort()).toEqual(['drop:quest:quest-c', 'quest:quest-c']);
  });

  it('plays a quest that was added only as a JSON file', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'miu-new-quest-'));
    const fixture = JSON.parse(readFileSync(new URL('../../test/fixtures/quests/quest-c.json', import.meta.url), 'utf8')) as object;
    writeFileSync(path.join(dir, 'lake.json'), JSON.stringify({ ...fixture, id: 'lake-walk', title: 'Dạo hồ', reward: { xp: 7, coin: 3 } }));
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

describe('scoring a finished quest', () => {
  const support = (agent: Agent, quest: string, stepId: string, layer: string) =>
    agent.post(`/api/quests/${quest}/steps/${stepId}/support`).send({ layer });

  it('pays full XP with 3 stars, reports Level Up and Skill Up', async () => {
    const { agent } = await playingChild();
    const a = await finish(agent, 'quest-a');
    expect(a.body.completion).toEqual({
      stars: 3,
      xpAwarded: 60,
      levelBefore: 1,
      levelAfter: 1,
      skillLevels: [{ skillId: 'doc-hieu', levelBefore: 1, levelAfter: 1 }],
      notebook: [{ step: 'solve-tree', question: '2 + 3 = ?', answer: '5' }],
      collectible: expect.objectContaining({ mapId: 'khu-rung-bi-mat', owned: 1 }) as unknown,
    });
    const b = await finish(agent, 'quest-b');
    expect(b.body.completion).toMatchObject({
      stars: 3,
      xpAwarded: 100,
      levelBefore: 1,
      levelAfter: 2,
      skillLevels: [
        { skillId: 'doc-hieu', levelBefore: 1, levelAfter: 2 },
        { skillId: 'phep-cong', levelBefore: 1, levelAfter: 2 },
      ],
    });
    const math = b.body.progress.subjects.find((s: { subjectId: string }) => s.subjectId === 'toan');
    expect(math).toMatchObject({ xp: 2, level: 2, skills: expect.arrayContaining([{ skillId: 'phep-cong', name: 'Phép cộng', xp: 2, level: 2 }]) });
  });

  it('keeps 90% of the quest XP and one star less after the answer layer, but full coins, skills and items', async () => {
    const { agent } = await playingChild();
    await finish(agent, 'quest-a');
    await playFirst(agent, 'quest-b', 2);
    const answer = await support(agent, 'quest-b', 'solve-tree', 'answer').expect(200);
    expect(answer.body).toEqual({ layer: 'answer', text: '8', explanation: '4 + 4 = ?' });
    const last = await step(agent, 'quest-b', 'solve-tree', { answer: { value: 8 } }).expect(200);
    expect(last.body.reward).toEqual({ xp: 90, coin: 20, skillXp: { 'phep-cong': 2, 'doc-hieu': 1 }, items: { 'chia-khoa': 1, 'la-than': 2 } });
    expect(last.body.completion).toMatchObject({ stars: 2, xpAwarded: 90, levelBefore: 1, levelAfter: 2 });
    expect(last.body.progress.xp).toBe(150);
  });

  it('takes a star at five mistakes, never below one, and fixes the result once stored', async () => {
    const { agent, childId } = await playingChild();
    await playFirst(agent, 'quest-c', 3);
    for (let i = 0; i < 5; i += 1) await step(agent, 'quest-c', 'add-flowers', { answer: { value: 9 } }).expect(200);
    await support(agent, 'quest-c', 'add-flowers', 'answer').expect(200);
    const last = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(last.body.completion).toMatchObject({ stars: 1, xpAwarded: 4 });
    // Later counter changes (more wrong tries, more views) never rewrite the stored result.
    await support(agent, 'quest-c', 'add-flowers', 'hint').expect(200);
    const again = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(again.body).toMatchObject({ repeated: true, completion: null, reward: { xp: 4 }, quest: { stars: 1 } });
    const [row] = await app.db.select().from(t.questProgress).where(eq(t.questProgress.childId, childId));
    expect(row).toMatchObject({ stars: 1, xpAwarded: 4 });
  });
});

describe('learning support', () => {
  const support = (agent: Agent, quest: string, stepId: string, body: object) => agent.post(`/api/quests/${quest}/steps/${stepId}/support`).send(body);

  it('hands out each layer on request and counts only the answer on the unsolved step', async () => {
    const { agent, childId } = await playingChild();
    await playFirst(agent, 'quest-c', 3);
    expect((await support(agent, 'quest-c', 'add-flowers', { layer: 'guide' }).expect(200)).body).toEqual({ layer: 'guide', steps: ['Đếm từng bước.'] });
    expect((await support(agent, 'quest-c', 'add-flowers', { layer: 'hint' }).expect(200)).body).toEqual({ layer: 'hint', text: 'Đếm chậm lại.' });
    expect(await app.db.select().from(t.stepAttempts).where(eq(t.stepAttempts.childId, childId))).toEqual([]);
    await support(agent, 'quest-c', 'add-flowers', { layer: 'answer' }).expect(200);
    const [counts] = await app.db.select().from(t.stepAttempts).where(eq(t.stepAttempts.childId, childId));
    expect(counts).toMatchObject({ answerViews: 1, wrongCount: 0 });
  });

  it('lets a child review the answer of a solved step for free, and forgets the counters once scored', async () => {
    const { agent, childId } = await playingChild();
    await finish(agent, 'quest-a');
    await playFirst(agent, 'quest-b', 2);
    // count-apples is already solved: reading its answer now costs nothing.
    await support(agent, 'quest-b', 'count-apples', { layer: 'answer' }).expect(200);
    const last = await step(agent, 'quest-b', 'solve-tree', { answer: { value: 8 } }).expect(200);
    expect(last.body.completion).toMatchObject({ stars: 3, xpAwarded: 100 });
    expect(await app.db.select().from(t.stepAttempts).where(eq(t.stepAttempts.childId, childId))).toEqual([]);
    // After the quest is scored, support views are not counted any more.
    await support(agent, 'quest-b', 'solve-tree', { layer: 'answer' }).expect(200);
    expect(await app.db.select().from(t.stepAttempts).where(eq(t.stepAttempts.childId, childId))).toEqual([]);
  });

  it('refuses unknown layers, steps without support and steps ahead', async () => {
    const { agent } = await playingChild();
    await support(agent, 'quest-c', 'add-flowers', { layer: 'everything' }).expect(400, { error: 'invalid-support-layer' });
    await support(agent, 'quest-c', 'say-hello', { layer: 'hint' }).expect(404, { error: 'support-not-found' });
    await support(agent, 'quest-c', 'add-flowers', { layer: 'answer' }).expect(409, { error: 'out-of-order' });
    await support(agent, 'quest-c', 'fly-away', { layer: 'hint' }).expect(404, { error: 'step-not-found' });
  });

  it('never sends answers or support text anywhere except the support endpoint and the vở lines of done steps', async () => {
    const { agent } = await playingChild();
    const finished = (await finish(agent, 'quest-c')).body as { completion: { notebook?: unknown[] }; copy?: unknown };
    // The quest's end lists its questions with the book's answers, to copy into the vở: every step is done by then.
    const { notebook, ...completion } = finished.completion;
    expect(notebook?.length).toBeGreaterThan(0);
    const bodies = [
      (await agent.get('/api/quests').expect(200)).text,
      (await agent.get('/api/quests/quest-b').expect(200)).text,
      JSON.stringify({ ...finished, completion, copy: null }),
      (await agent.get('/api/progress').expect(200)).text,
    ];
    for (const text of bodies) {
      expect(text).not.toMatch(/"(answer|support|guide|hint|explanation)"/);
      expect(text).not.toContain('Đếm chậm lại.');
    }
  });

  it('sends the vở line of a step only once it is answered right: its question and the book\'s answer', async () => {
    const { agent } = await playingChild();
    await playFirst(agent, 'quest-c', 3);
    const wrong = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 3 } }).expect(200);
    expect(wrong.body.copy ?? null).toBeNull();
    const quest = FIXTURE_CONTENT.quests.get('quest-c');
    const def = quest?.status === 'active' ? quest.steps.find((s) => s.id === 'add-flowers') : undefined;
    if (!def || !('support' in def)) throw new Error('add-flowers must be an answerable fixture step');
    const right = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(right.body.copy).toEqual({ step: 'add-flowers', question: 'question' in def ? def.question : def.prompt, answer: def.support.answer.text });
    // The last step finished the quest: every answerable step's line, in order, before the reward.
    expect(right.body.completion.notebook).toEqual([right.body.copy]);
    // Done again: nothing new to copy.
    const again = await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(200);
    expect(again.body.copy ?? null).toBeNull();
  });
});

describe('textbook mechanics over the API', () => {
  const sgk = FIXTURE_CONTENT.quests.get('quest-sgk');
  if (sgk?.status !== 'active') throw new Error('quest-sgk must be an active fixture quest');

  it('grades every new mechanic on the server and finishes the quest', async () => {
    const { agent } = await playingChild();
    let last: request.Response | undefined;
    for (const [stepId, body] of solution(sgk)) last = await step(agent, 'quest-sgk', stepId, body).expect(200, /"correct":true/);
    expect(last?.body).toMatchObject({ quest: { completed: true }, reward: { xp: 20 } });
  });

  it('marks wrong answers of each shape as wrong without advancing', async () => {
    const { agent } = await playingChild();
    const moves = solution(sgk);
    const wrong: Record<string, object> = {
      'read-text': { choice: 'ban' },
      'sort-words': { assignment: { sach: 'hoat-dong', doc: 'hoat-dong', but: 'su-vat' } },
      fill: { fills: { b1: 'be' } },
      'pick-even': { choices: ['p1'] },
      'read-clock': { hour: 4, minute: 0 },
      calendar: { weekday: 'thu-nam' },
      draw: { edges: [['a', 'c']] },
      'order-pictures': { order: ['t2', 't1'] },
    };
    for (const [stepId, body] of moves) {
      const bad = wrong[stepId];
      if (bad) {
        const res = await step(agent, 'quest-sgk', stepId, { answer: bad }).expect(200);
        expect(res.body).toMatchObject({ correct: false, quest: { completed: false } });
      }
      await step(agent, 'quest-sgk', stepId, body).expect(200, /"correct":true/);
    }
  });

  it('accepts the clock read as morning or afternoon on an analog face, and edges in any direction', async () => {
    const { agent } = await playingChild();
    for (const [stepId, body] of solution(sgk)) {
      const alt: Record<string, object> = { 'read-clock': { answer: { hour: 3, minute: 0 } }, draw: { answer: { edges: [['c', 'b'], ['b', 'a']] } } };
      await step(agent, 'quest-sgk', stepId, alt[stepId] ?? body).expect(200, /"correct":true/);
    }
  });

  it('answers with a new feedback line on every try, never the previous one', async () => {
    const { agent } = await playingChild();
    const moves = solution(sgk);
    const upTo = moves.findIndex(([id]) => id === 'fill');
    for (const [stepId, body] of moves.slice(0, upTo)) await step(agent, 'quest-sgk', stepId, body).expect(200);
    const lines: string[] = [];
    for (let i = 0; i < 4; i += 1) lines.push((await step(agent, 'quest-sgk', 'fill', { answer: { fills: { b1: 'be' } } }).expect(200)).body.feedback);
    expect(lines).toEqual(['Nhìn lại hai số nhé.', 'Số nào nhiều chục hơn?', 'Gần đúng rồi, thử dấu khác xem.', 'Nhìn lại hai số nhé.']);
    lines.forEach((line, i) => expect(line).not.toBe(lines[i - 1]));
    const right = await step(agent, 'quest-sgk', 'fill', { answer: { fills: { b1: 'lon' } } }).expect(200);
    expect(right.body).toMatchObject({ correct: true, feedback: 'Tuyệt, đúng dấu rồi!' });
    const noLines = await step(agent, 'quest-sgk', 'pick-even', { answer: { choices: ['p1', 'p3'] } }).expect(200);
    expect(noLines.body.feedback).toBeNull();
  });

  it('rejects oversized or malformed answers before grading', async () => {
    const { agent } = await playingChild();
    await step(agent, 'quest-sgk', 'hello').expect(200);
    await step(agent, 'quest-sgk', 'read-text', { answer: { choice: 'toi' } }).expect(200);
    const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`w${i}`, 'su-vat']));
    await step(agent, 'quest-sgk', 'sort-words', { answer: { assignment: many } }).expect(400, { error: 'invalid-step-input' });
    await step(agent, 'quest-sgk', 'sort-words', { answer: { assignment: { sach: 'su-vat' }, choice: 'x' } }).expect(400, { error: 'invalid-step-input' });
  });

  it('shows passages but no answers in the quest view', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/quests/quest-sgk').expect(200);
    expect(res.body.quest.texts).toEqual({ 'bai-doc': { title: 'Bài đọc thử', author: 'Tác giả thử', body: 'Ngày khai trường đã đến.\n\nTôi chào mẹ.' } });
    expect(res.text).not.toMatch(/"(answer|support|assignment|fills|edges|curriculumRef|feedback)"/);
  });

  it('names the textbook lesson and its printed pages, for homework set by page or title', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/quests?region=truong-hoc').expect(200);
    const sgkView = (res.body as { quests: { quest: { id: string; textbook?: unknown } }[] }).quests.find((q) => q.quest.id === 'quest-sgk');
    expect(sgkView?.quest.textbook).toEqual({ book: 'Tiếng Việt 2, tập một', lesson: 'Bài 1. Tôi là học sinh lớp 2', pages: [10, 12] });
  });
});

describe('playing a finished quest again (every run pays, owner 03/10/2026)', () => {
  /** Plays a whole fixture quest as run `run`. */
  const replay = (agent: Agent, quest: string, run: number) => finish(agent, quest, { run });
  /** Quest reward rows of the ledger (each paid run also has its collectible's `drop:` row). */
  const ledgerOf = async (childId: string) =>
    (await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId))).map((r) => r.source).filter((s) => s.startsWith('quest:')).sort();

  it('pays a lesson again for a full second run, and says which run the steps belong to', async () => {
    const { agent, childId } = await playingChild();
    const first = await finish(agent, 'quest-a');
    expect(first.body.quest).toMatchObject({ completed: true, run: 1 });
    const second = await replay(agent, 'quest-a', 2);
    expect(second.body).toMatchObject({ repeated: false, reward: { xp: 60, coin: 10 }, completion: { stars: 3 }, quest: { completed: true, run: 2 } });
    expect(second.body.progress).toMatchObject({ xp: 120, coins: 20, items: { 'la-than': 2 }, skillXp: { 'doc-hieu': 2 } });
    expect(await ledgerOf(childId)).toEqual(['quest:quest-a', 'quest:quest-a#2']);
  });

  it('starts the next run at its first step, keeps the quest finished meanwhile, and plays it in order', async () => {
    const { agent } = await playingChild();
    await finish(agent, 'quest-c');
    await step(agent, 'quest-c', 'add-flowers', { run: 2, answer: { value: 2 } }).expect(409, { error: 'out-of-order' });
    const started = await step(agent, 'quest-c', 'say-hello', { run: 2 }).expect(200);
    expect(started.body).toMatchObject({ repeated: false, reward: null, quest: { completedSteps: ['say-hello'], found: {}, completed: true, run: 2 } });
    const list = (await agent.get('/api/quests').expect(200)).body.quests as Array<{ quest: { id: string }; state: string }>;
    expect(list.find((q) => q.quest.id === 'quest-c')?.state).toBe('completed');
    await step(agent, 'quest-c', 'add-flowers', { run: 2, answer: { value: 2 } }).expect(409, { error: 'out-of-order' });
  });

  it('pays one run once: the final step sent twice, a stale run or no run at all grant nothing more', async () => {
    const { agent, childId } = await playingChild();
    await finish(agent, 'quest-c');
    const paid = await replay(agent, 'quest-c', 2);
    expect(paid.body).toMatchObject({ repeated: false, reward: { xp: 5 } });
    const again = await step(agent, 'quest-c', 'add-flowers', { run: 2, answer: { value: 2 } }).expect(200);
    expect(again.body).toMatchObject({ repeated: true, completion: null, reward: { xp: 5 }, quest: { run: 2 } });
    await step(agent, 'quest-c', 'add-flowers', { run: 1, answer: { value: 2 } }).expect(200, /"repeated":true/);
    await step(agent, 'quest-c', 'say-hello').expect(200, /"repeated":true/);
    expect(await ledgerOf(childId)).toEqual(['quest:quest-c', 'quest:quest-c#2']);
    expect((await agent.get('/api/progress').expect(200)).body.xp).toBe(10);
  });

  it('pays a run once when its last step is sent concurrently', async () => {
    const { agent, childId } = await playingChild();
    await finish(agent, 'quest-c');
    for (const [stepId, body] of (PLAY['quest-c'] ?? []).slice(0, 3)) await step(agent, 'quest-c', stepId, { run: 2, ...body }).expect(200);
    const results = await Promise.all(Array.from({ length: 5 }, () => step(agent, 'quest-c', 'add-flowers', { run: 2, answer: { value: 2 } })));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r.body.repeated === false)).toHaveLength(1);
    expect(await ledgerOf(childId)).toEqual(['quest:quest-c', 'quest:quest-c#2']);
  });

  it('keeps the best stars of all runs', async () => {
    const { agent } = await playingChild();
    await finish(agent, 'quest-c');
    for (const [stepId, body] of (PLAY['quest-c'] ?? []).slice(0, 3)) await step(agent, 'quest-c', stepId, { run: 2, ...body }).expect(200);
    for (let i = 0; i < 5; i += 1) await step(agent, 'quest-c', 'add-flowers', { run: 2, answer: { value: 9 } }).expect(200);
    const worse = await step(agent, 'quest-c', 'add-flowers', { run: 2, answer: { value: 2 } }).expect(200);
    expect(worse.body).toMatchObject({ completion: { stars: 2 }, reward: { xp: 5 }, quest: { stars: 3, run: 2 } });
  });

  it('counts answer views on the run under way, not only on the first one', async () => {
    const { agent } = await playingChild();
    await finish(agent, 'quest-c');
    for (const [stepId, body] of (PLAY['quest-c'] ?? []).slice(0, 3)) await step(agent, 'quest-c', stepId, { run: 2, ...body }).expect(200);
    await agent.post('/api/quests/quest-c/steps/add-flowers/support').send({ layer: 'answer' }).expect(200);
    const last = await step(agent, 'quest-c', 'add-flowers', { run: 2, answer: { value: 2 } }).expect(200);
    expect(last.body.completion).toMatchObject({ stars: 2, xpAwarded: 4 });
  });
});

describe('minigame side quests', () => {
  it('lists side quests apart from the lessons', async () => {
    const { agent } = await playingChild();
    const lessons = (await agent.get('/api/quests').expect(200)).body.quests as Array<{ quest: { id: string } }>;
    expect(lessons.map((q) => q.quest.id)).not.toContain('side-egg');
    const side = (await agent.get('/api/quests?category=side&region=khu-rung-bi-mat').expect(200)).body.quests as Array<{ quest: { id: string; category: string; steps: unknown[] } }>;
    expect(side.map((q) => q.quest.id)).toEqual(['side-egg']);
    expect(side[0]?.quest).toMatchObject({ category: 'side', steps: expect.arrayContaining([expect.objectContaining({ mechanic: 'minigame', game: 'egg-catch', goal: 8 })]) });
    expect((await agent.get('/api/quests?category=side&region=nui-tuyet').expect(200)).body.quests).toEqual([]);
    await agent.get('/api/quests?category=bonus').expect(400, { error: 'invalid-category' });
  });

  it('grades the score against the goal: short of it, the round is simply not won', async () => {
    const { agent } = await playingChild();
    await step(agent, 'side-egg', 'ask').expect(200);
    await step(agent, 'side-egg', 'play').expect(400, { error: 'answer-required' });
    await step(agent, 'side-egg', 'play', { answer: { choice: 'egg' } }).expect(200, /"correct":false/);
    const short = await step(agent, 'side-egg', 'play', { answer: { score: 7 } }).expect(200);
    expect(short.body).toMatchObject({ correct: false, reward: null, quest: { completedSteps: ['ask'] } });
    await step(agent, 'side-egg', 'play', { answer: { score: 99_999 } }).expect(400, { error: 'invalid-step-input' });
    const won = await step(agent, 'side-egg', 'play', { answer: { score: 30 } }).expect(200);
    expect(won.body).toMatchObject({ correct: true, copy: null, quest: { completedSteps: ['ask', 'play'] } });
  });

  it('pays the side quest reward on its last step, and again on every replay', async () => {
    const { agent, childId } = await playingChild();
    const first = await finish(agent, 'side-egg');
    expect(first.body).toMatchObject({ reward: { xp: 12, coin: 3 }, completion: { stars: 3 }, quest: { completed: true, run: 1 } });
    const second = await finish(agent, 'side-egg', { run: 2 });
    expect(second.body).toMatchObject({ repeated: false, reward: { xp: 12, coin: 3 }, quest: { run: 2 } });
    const resent = await step(agent, 'side-egg', 'bye', { run: 2 }).expect(200);
    expect(resent.body).toMatchObject({ repeated: true, completion: null });
    const sources = (await app.db.select().from(t.rewardLedger).where(eq(t.rewardLedger.childId, childId))).map((r) => r.source).sort();
    expect(sources).toEqual(['drop:quest:side-egg', 'drop:quest:side-egg#2', 'quest:side-egg', 'quest:side-egg#2']);
    expect((await agent.get('/api/progress').expect(200)).body).toMatchObject({ xp: 24, coins: 6 });
  });
});

describe('quest list and detail', () => {
  it('lists every quest with its state and answer-free content', async () => {
    const { agent } = await playingChild();
    const states = async () =>
      Object.fromEntries(((await agent.get('/api/quests').expect(200)).body.quests as Array<{ quest: { id: string }; state: string }>).map((q) => [q.quest.id, q.state]));
    expect(await states()).toEqual({ 'quest-a': 'open', 'quest-b': 'open', 'quest-c': 'open', 'quest-sgk': 'open', 'quest-soon': 'open' });
    await step(agent, 'quest-c', 'say-hello').expect(200);
    await finish(agent, 'quest-a');
    expect(await states()).toEqual({ 'quest-a': 'completed', 'quest-b': 'open', 'quest-c': 'in-progress', 'quest-sgk': 'open', 'quest-soon': 'open' });
    const detail = (await agent.get('/api/quests/quest-a').expect(200)).body;
    expect(detail).toMatchObject({ state: 'completed', progress: { stars: 3, completed: true }, quest: { id: 'quest-a', status: 'active' } });
    expect(detail.quest.steps.map((s: { id: string }) => s.id)).toEqual(['meet-vet', 'find-letter', 'solve-tree']);
  });

  it('shows a stub as coming soon, filters by region and rejects bad ids', async () => {
    const { agent } = await playingChild();
    await finish(agent, 'quest-c');
    expect((await agent.get('/api/quests/quest-soon').expect(200)).body).toMatchObject({
      state: 'open',
      quest: { id: 'quest-soon', status: 'stub', title: 'Sắp có' },
    });
    expect((await agent.get('/api/quests?region=khu-rung-bi-mat').expect(200)).body.quests).toHaveLength(4);
    expect((await agent.get('/api/quests?region=dao-bien').expect(200)).body.quests).toEqual([]);
    await agent.get('/api/quests?region=Đảo').expect(400, { error: 'invalid-region' });
    await agent.get('/api/quests/quest-zzz').expect(404, { error: 'quest-not-found' });
  });
});

describe('rate limits per child and step', () => {
  it('answers 429 after 30 completions of one step in a minute, other steps unaffected', async () => {
    const { agent } = await playingChild();
    await playFirst(agent, 'quest-c', 3);
    for (let i = 0; i < 30; i += 1) await step(agent, 'quest-c', 'add-flowers', { answer: { value: 9 } }).expect(200);
    await step(agent, 'quest-c', 'add-flowers', { answer: { value: 2 } }).expect(429, { error: 'rate-limited' });
    await step(agent, 'quest-a', 'meet-vet').expect(200);
    const other = await playingChild();
    await step(other.agent, 'quest-c', 'say-hello').expect(200);
  });

  it('answers 429 after 20 support requests for one step in a minute', async () => {
    const { agent } = await playingChild();
    await playFirst(agent, 'quest-c', 3);
    for (let i = 0; i < 20; i += 1) await agent.post('/api/quests/quest-c/steps/add-flowers/support').send({ layer: 'hint' }).expect(200);
    await agent.post('/api/quests/quest-c/steps/add-flowers/support').send({ layer: 'hint' }).expect(429);
  });
});

describe('the shipped forest chapter 1', () => {
  const real = loadContentCatalog();

  async function realChild(): Promise<Agent> {
    const { parent, childId } = await parentWithChild(app);
    const agent = request.agent(createApp({ config: app.config, db: app.db, content: real })).set('Origin', ORIGIN);
    await agent.post('/api/auth/login').send(parent).expect(200);
    await agent.post(`/api/children/${childId}/select`).expect(200);
    return agent;
  }

  const ch1 = real.quests.get('forest-ch1');
  if (ch1?.status !== 'active') throw new Error('forest-ch1 must be an active quest');

  it('finishing without the answer layer levels up to 2; the textbook lessons were open all along', async () => {
    const agent = await realChild();
    expect((await agent.get('/api/quests/tv2-t01-b01').expect(200)).body).toMatchObject({ state: 'open', quest: { status: 'active' } });
    let last: request.Response | undefined;
    for (const [stepId, body] of solution(ch1)) last = await step(agent, 'forest-ch1', stepId, body).expect(200);
    expect(last?.body.completion).toMatchObject({ stars: 3, xpAwarded: 100, levelBefore: 1, levelAfter: 2 });
    expect(last?.body.reward).toMatchObject({ xp: 100, coin: 20, items: { 'la-than': 1 } });
    expect((await agent.get('/api/quests/toan2-cd1-b01').expect(200)).body).toMatchObject({ state: 'open' });
  });

  it('viewing an answer keeps 90 XP, so the same run stays at level 1', async () => {
    const agent = await realChild();
    let last: request.Response | undefined;
    for (const [stepId, body] of solution(ch1)) {
      if (stepId === 'tree-riddle') await agent.post('/api/quests/forest-ch1/steps/tree-riddle/support').send({ layer: 'answer' }).expect(200);
      last = await step(agent, 'forest-ch1', stepId, body).expect(200);
    }
    expect(last?.body.completion).toMatchObject({ stars: 2, xpAwarded: 90, levelBefore: 1, levelAfter: 1 });
  });
});

describe('character', () => {
  it('reads and updates name and equipment within the catalogue', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/character').expect(200)).body).toEqual({ species: 'cat', name: 'Miu', equipped: [], pet: null });
    const updated = await agent.put('/api/character').send({ name: 'Mochi', equipped: ['hat-witch-pink', 'backpack-brown'] }).expect(200);
    expect(updated.body).toEqual({ species: 'cat', name: 'Mochi', equipped: ['hat-witch-pink', 'backpack-brown'], pet: null });
  });

  it('rejects free-text names, unknown or doubled-up equipment, and species outside content', async () => {
    const { agent } = await playingChild();
    await agent.put('/api/character').send({ name: 'Tên Thật', equipped: [] }).expect(400, { error: 'invalid-character-name' });
    await agent.put('/api/character').send({ name: 'Miu', equipped: ['golden-crown'] }).expect(400, { error: 'invalid-equipment' });
    await agent.put('/api/character').send({ name: 'Miu', equipped: ['hat-witch-pink', 'hat-witch-pink'] }).expect(400);
    await agent.put('/api/character').send({ name: 'Miu', equipped: [], species: 'dragon' }).expect(400, { error: 'invalid-species' });
    expect((await agent.get('/api/character').expect(200)).body.species).toBe('cat');
  });

  it('changes species only when one is sent, and shows it on the profile list', async () => {
    const { agent } = await playingChild();
    expect((await agent.put('/api/character').send({ name: 'Bo', equipped: [], species: 'fox' }).expect(200)).body.species).toBe('fox');
    expect((await agent.put('/api/character').send({ name: 'Bo', equipped: [] }).expect(200)).body.species).toBe('fox');
    expect((await agent.get('/api/children').expect(200)).body.map((p: { species: string }) => p.species)).toEqual(['fox']);
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
      await agent.get('/api/quests'),
      await agent.get('/api/quests/quest-c'),
      await agent.post('/api/quests/quest-c/steps/add-flowers/support').send({ layer: 'hint' }),
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
    await b.agent.get('/api/quests').expect(401, { error: 'no-active-child' });
    await b.agent.get('/api/quests/quest-c').expect(401, { error: 'no-active-child' });
    await b.agent.post('/api/quests/quest-c/steps/add-flowers/support').send({ layer: 'answer' }).expect(401, { error: 'no-active-child' });
    const aCounts = await app.db.select().from(t.stepAttempts).where(eq(t.stepAttempts.childId, a.childId));
    expect(aCounts).toEqual([]);

    const [aCharacter] = await app.db.select().from(t.characters).where(eq(t.characters.childId, a.childId));
    expect(aCharacter?.name).toBe('Mochi');
    const [aLedger] = await app.db
      .select({ n: sql<number>`count(*)::int` })
      .from(t.rewardLedger)
      .where(eq(t.rewardLedger.childId, a.childId));
    // Her quest's reward and the collectible it dropped.
    expect(aLedger?.n).toBe(2);
  });
});

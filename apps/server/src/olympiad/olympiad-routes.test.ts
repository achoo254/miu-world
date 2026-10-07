import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ExamResponse, ExamSubmitResponse, OlympiadStatusResponse, PracticeCheckResponse, PracticeFinishResponse, PracticeResponse, PracticeSupportResponse } from '@miu/schema/olympiad';
import { createTestApp, ORIGIN, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { loadOlympiadCatalog } from './olympiad-catalog';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return { agent, childId };
}

const catalog = loadOlympiadCatalog();
const logic = catalog.practiceQuestions.filter((q) => q.topicId === 'logic');
const rightAnswers = (count: number): Record<string, string> => Object.fromEntries(catalog.examQuestions.slice(0, count).map((q) => [q.id, q.answer]));

describe('olympiad practice routes', () => {
  it('lists the topics in both languages with no stars and no best score yet', async () => {
    const { agent } = await playingChild();
    const body = OlympiadStatusResponse.parse((await agent.get('/api/olympiad/status').expect(200)).body);
    expect(body.title.vi).toBe('Thử thách Olympic Toán');
    expect(body.title.en).toBe('Olympic Math Challenge');
    expect(body.topics.map((t) => t.stars)).toEqual([0, 0, 0, 0, 0]);
    expect(body.best).toEqual({ score: null, award: null, runs: 0 });
  });

  it('hands out practice questions without their answers or support layers', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/olympiad/practice/logic').expect(200);
    const body = PracticeResponse.parse(res.body);
    expect(body.questions).toHaveLength(10);
    const text = JSON.stringify(res.body);
    for (const q of logic) {
      expect(text).not.toContain(q.explanation.vi);
      expect(text).not.toContain(q.hint.vi);
    }
    expect(text).not.toContain('"answer"');
    await agent.get('/api/olympiad/practice/not-a-topic').expect(404);
  });

  it('grades a practice answer on the server: a wrong one tells nothing, a right one explains', async () => {
    const { agent } = await playingChild();
    const [q] = logic;
    if (!q) throw new Error('no logic question');
    const runId = randomUUID();
    const wrong = q.choices.find((c) => c.id !== q.answer)?.id ?? 'A';
    const no = PracticeCheckResponse.parse((await agent.post(`/api/olympiad/practice/${q.id}/check`).send({ runId, choice: wrong }).expect(200)).body);
    expect(no).toEqual({ correct: false, explanation: null });
    const yes = PracticeCheckResponse.parse((await agent.post(`/api/olympiad/practice/${q.id}/check`).send({ runId, choice: q.answer }).expect(200)).body);
    expect(yes.correct).toBe(true);
    expect(yes.explanation).toEqual(q.explanation);
    await agent.post('/api/olympiad/practice/unknown-question/check').send({ runId, choice: 'A' }).expect(404);
    await agent.post(`/api/olympiad/practice/${q.id}/check`).send({ runId: 'not-a-uuid', choice: 'A' }).expect(400);
  });

  it('gives each support layer on request, the answer layer with its explanation', async () => {
    const { agent } = await playingChild();
    const [q] = logic;
    if (!q) throw new Error('no logic question');
    const guide = PracticeSupportResponse.parse((await agent.post(`/api/olympiad/practice/${q.id}/support`).send({ layer: 'guide' }).expect(200)).body);
    expect(guide).toEqual({ layer: 'guide', text: q.guide });
    const answer = PracticeSupportResponse.parse((await agent.post(`/api/olympiad/practice/${q.id}/support`).send({ layer: 'answer' }).expect(200)).body);
    expect(answer).toEqual({ layer: 'answer', choice: q.answer, explanation: q.explanation });
  });

  it('pays a finished practice run for what the server graded right, once, and gives the topic its stars', async () => {
    const { agent } = await playingChild();
    const runId = randomUUID();
    for (const q of logic.slice(0, 6)) await agent.post(`/api/olympiad/practice/${q.id}/check`).send({ runId, choice: q.answer }).expect(200);
    // A question of another topic does not count in a logic run.
    const other = catalog.practiceQuestions.find((q) => q.topicId === 'geometry');
    if (other) await agent.post(`/api/olympiad/practice/${other.id}/check`).send({ runId, choice: other.answer }).expect(200);
    const before = (await agent.get('/api/progress').expect(200)).body as { xp: number; coins: number };
    const done = PracticeFinishResponse.parse((await agent.post('/api/olympiad/practice/logic/finish').send({ runId }).expect(200)).body);
    expect(done).toEqual({ correct: 6, questions: 10, stars: 3, rewards: { xp: 30, coin: 6 }, repeated: false });
    // At least the run's own pay (a skill level it reaches pays its gift too).
    const paid = (await agent.get('/api/progress').expect(200)).body as { xp: number; coins: number };
    expect(paid.xp - before.xp).toBeGreaterThanOrEqual(30);
    expect(paid.coins - before.coins).toBeGreaterThanOrEqual(6);
    const again = PracticeFinishResponse.parse((await agent.post('/api/olympiad/practice/logic/finish').send({ runId }).expect(200)).body);
    expect(again).toMatchObject({ correct: 6, repeated: true });
    expect((await agent.get('/api/progress').expect(200)).body).toMatchObject({ xp: paid.xp, coins: paid.coins });
    const status = OlympiadStatusResponse.parse((await agent.get('/api/olympiad/status').expect(200)).body);
    expect(status.topics.find((t) => t.id === 'logic')?.stars).toBe(3);
    // A run the server never graded pays nothing.
    const empty = PracticeFinishResponse.parse((await agent.post('/api/olympiad/practice/logic/finish').send({ runId: randomUUID() }).expect(200)).body);
    expect(empty.rewards).toEqual({ xp: 0, coin: 0 });
  });
});

describe('olympiad mock exam routes', () => {
  it('hands out the 25 exam questions without answers', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/olympiad/exam').expect(200);
    const body = ExamResponse.parse(res.body);
    expect(body.questions).toHaveLength(25);
    expect(body.minutes).toBe(60);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('"answer"');
    for (const q of catalog.examQuestions) expect(text).not.toContain(q.explanation.vi);
  });

  it('grades a full run as gold, pays it once by its run id, and keeps the best score', async () => {
    const { agent } = await playingChild();
    const runId = randomUUID();
    const body = ExamSubmitResponse.parse((await agent.post('/api/olympiad/submit').send({ runId, answers: rightAnswers(25), elapsedSeconds: 1800 }).expect(200)).body);
    expect(body).toMatchObject({ score: 100, correctCount: 25, award: 'gold', isNewBest: true, bestScore: 100, rewards: { xp: 300, coin: 60 }, repeated: false });
    expect(body.review.every((r) => r.correct)).toBe(true);
    // Resent (a double tap, a retry): graded again, paid nothing more.
    const xp = ((await agent.get('/api/progress').expect(200)).body as { xp: number }).xp;
    const again = ExamSubmitResponse.parse((await agent.post('/api/olympiad/submit').send({ runId, answers: {}, elapsedSeconds: 10 }).expect(200)).body);
    expect(again.repeated).toBe(true);
    expect(again.rewards).toEqual({ xp: 300, coin: 60 });
    expect(((await agent.get('/api/progress').expect(200)).body as { xp: number }).xp).toBe(xp);
    const status = OlympiadStatusResponse.parse((await agent.get('/api/olympiad/status').expect(200)).body);
    expect(status.best).toEqual({ score: 100, award: 'gold', runs: 1 });
  });

  it('gives each award line its tier, and every new run pays again', async () => {
    const { agent } = await playingChild();
    const cases: Array<[number, string | null]> = [[15, 'silver'], [10, 'bronze'], [5, 'consolation'], [0, null]];
    for (const [right, award] of cases) {
      const body = ExamSubmitResponse.parse((await agent.post('/api/olympiad/submit').send({ runId: randomUUID(), answers: rightAnswers(right) }).expect(200)).body);
      expect(body.score).toBe(right * 4);
      expect(body.award).toBe(award);
      expect(body.repeated).toBe(false);
      expect(body.rewards.xp).toBeGreaterThan(0);
    }
    expect(OlympiadStatusResponse.parse((await agent.get('/api/olympiad/status').expect(200)).body).best.runs).toBe(4);
  });

  it('refuses reward fields from the client and an answer that is not a choice', async () => {
    const { agent } = await playingChild();
    await agent.post('/api/olympiad/submit').send({ runId: randomUUID(), answers: {}, xp: 99999 }).expect(400);
    const [q] = catalog.examQuestions;
    if (q) await agent.post('/api/olympiad/submit').send({ runId: randomUUID(), answers: { [q.id]: 'Z' } }).expect(400);
    expect(OlympiadStatusResponse.parse((await agent.get('/api/olympiad/status').expect(200)).body).best.runs).toBe(0);
  });

  it('pays a run sent twice at the same moment once', async () => {
    const { agent } = await playingChild();
    const runId = randomUUID();
    const before = ((await agent.get('/api/progress').expect(200)).body as { xp: number }).xp;
    const both = await Promise.all([0, 1].map(() => agent.post('/api/olympiad/submit').send({ runId, answers: rightAnswers(25) }).expect(200)));
    expect(both.map((r) => ExamSubmitResponse.parse(r.body).repeated).sort()).toEqual([false, true]);
    const paid = ((await agent.get('/api/progress').expect(200)).body as { xp: number }).xp - before;
    // The run's 300 XP once (a skill level it reaches adds its gift's XP, never a second run).
    expect(paid).toBeGreaterThanOrEqual(300);
    expect(paid).toBeLessThan(600);
    expect(OlympiadStatusResponse.parse((await agent.get('/api/olympiad/status').expect(200)).body).best.runs).toBe(1);
  });

  it('needs a signed-in account with a player chosen', async () => {
    await app.request().get('/api/olympiad/status').expect(401);
    await app.request().post('/api/olympiad/submit').set('Origin', ORIGIN).send({ runId: randomUUID(), answers: {} }).expect(401);
  });

  it('keeps one player out of another one\'s runs', async () => {
    const first = await playingChild();
    const second = await playingChild();
    const runId = randomUUID();
    await first.agent.post('/api/olympiad/submit').send({ runId, answers: rightAnswers(25) }).expect(200);
    // The same run id from another player is her own run: paid to her, and the first player's best is untouched.
    const theirs = ExamSubmitResponse.parse((await second.agent.post('/api/olympiad/submit').send({ runId, answers: {} }).expect(200)).body);
    expect(theirs.repeated).toBe(false);
    expect(theirs.score).toBe(0);
    const status = OlympiadStatusResponse.parse((await first.agent.get('/api/olympiad/status').expect(200)).body);
    expect(status.best.score).toBe(100);
  });
});

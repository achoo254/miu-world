import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ExamSubmitResponse, OlympiadStatusResponse } from '@miu/schema/olympiad';
import { createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
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
  await agent.post(`/api/children/${childId}/select`).expect(200);
  return { agent, childId };
}

describe('olympiad routes', () => {
  const catalog = loadOlympiadCatalog();

  it('gets event overview status', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/olympiad/status').expect(200);
    const body = OlympiadStatusResponse.parse(res.body);

    expect(body.id).toBe('olympic-math');
    expect(body.title).toContain('Olympic Toán');
    expect(body.topics.length).toBe(5);
    expect(body.examQuestionsCount).toBe(25);
    expect(body.userBest.score).toBeNull();
    expect(body.userBest.award).toBeNull();
  });

  it('gets practice questions for a topic with guidance and hints', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/olympiad/practice/logic').expect(200);
    expect(res.body.topicId).toBe('logic');
    expect(res.body.questions.length).toBe(10);

    const first = res.body.questions[0];
    expect(first.guide).toBeTruthy();
    expect(first.hint).toBeTruthy();
    expect(first.explanation).toBeTruthy();
  });

  it('gets mock exam questions without leaking answers', async () => {
    const { agent } = await playingChild();
    const res = await agent.get('/api/olympiad/exam').expect(200);
    expect(res.body.totalQuestions).toBe(25);
    expect(res.body.timeLimitMinutes).toBe(60);
    expect(res.body.questions.length).toBe(25);

    // CRITICAL: verify no answers or explanations leak to client in exam mode
    for (const q of res.body.questions) {
      expect(q.correctAnswer).toBeUndefined();
      expect(q.explanation).toBeUndefined();
      expect(q.choices.length).toBe(4);
    }
  });

  it('submits exam with 100% correct answers and achieves Gold award', async () => {
    const { agent } = await playingChild();

    // Prepare all correct answers from server catalog
    const allCorrectAnswers: Record<string, string> = {};
    for (const q of catalog.examQuestions) {
      allCorrectAnswers[q.id] = q.correctAnswer;
    }

    const res = await agent
      .post('/api/olympiad/submit')
      .send({ answers: allCorrectAnswers, elapsedSeconds: 1800 })
      .expect(200);

    const body = ExamSubmitResponse.parse(res.body);
    expect(body.score).toBe(100);
    expect(body.correctCount).toBe(25);
    expect(body.award).toBe('gold');
    expect(body.awardTitle).toContain('Giải Vàng');
    expect(body.isNewBest).toBe(true);
    expect(body.bestScore).toBe(100);
    expect(body.rewards.xp).toBe(300);
    expect(body.rewards.coin).toBe(60);
    expect(body.review.length).toBe(25);
    expect(body.review.every((r) => r.isCorrect)).toBe(true);

    // Verify user best score is now 100 in status endpoint
    const statusRes = await agent.get('/api/olympiad/status').expect(200);
    const status = OlympiadStatusResponse.parse(statusRes.body);
    expect(status.userBest.score).toBe(100);
    expect(status.userBest.award).toBe('gold');
    expect(status.userBest.attemptsCount).toBe(1);
  });

  it('submits partial exam achieving Silver, Bronze, Consolation, and empty answers', async () => {
    const { agent } = await playingChild();

    // 15 correct answers = 60 points -> Silver
    const silverAnswers: Record<string, string> = {};
    for (let i = 0; i < 15; i++) {
      const q = catalog.examQuestions[i];
      if (q) silverAnswers[q.id] = q.correctAnswer;
    }
    const resSilver = await agent
      .post('/api/olympiad/submit')
      .send({ answers: silverAnswers, elapsedSeconds: 2100 })
      .expect(200);
    const bodySilver = ExamSubmitResponse.parse(resSilver.body);
    expect(bodySilver.score).toBe(60);
    expect(bodySilver.correctCount).toBe(15);
    expect(bodySilver.award).toBe('silver');

    // 10 correct answers = 40 points -> Bronze
    const bronzeAnswers: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      const q = catalog.examQuestions[i];
      if (q) bronzeAnswers[q.id] = q.correctAnswer;
    }
    const resBronze = await agent
      .post('/api/olympiad/submit')
      .send({ answers: bronzeAnswers, elapsedSeconds: 2400 })
      .expect(200);
    const bodyBronze = ExamSubmitResponse.parse(resBronze.body);
    expect(bodyBronze.score).toBe(40);
    expect(bodyBronze.correctCount).toBe(10);
    expect(bodyBronze.award).toBe('bronze');

    // 5 correct answers = 20 points -> Consolation
    const consolationAnswers: Record<string, string> = {};
    for (let i = 0; i < 5; i++) {
      const q = catalog.examQuestions[i];
      if (q) consolationAnswers[q.id] = q.correctAnswer;
    }
    const resConsolation = await agent
      .post('/api/olympiad/submit')
      .send({ answers: consolationAnswers, elapsedSeconds: 1200 })
      .expect(200);
    const bodyConsolation = ExamSubmitResponse.parse(resConsolation.body);
    expect(bodyConsolation.score).toBe(20);
    expect(bodyConsolation.correctCount).toBe(5);
    expect(bodyConsolation.award).toBe('consolation');

    // 0 correct / empty answers = 0 points -> null award
    const resEmpty = await agent
      .post('/api/olympiad/submit')
      .send({ answers: {}, elapsedSeconds: 3600 })
      .expect(200);
    const bodyEmpty = ExamSubmitResponse.parse(resEmpty.body);
    expect(bodyEmpty.score).toBe(0);
    expect(bodyEmpty.correctCount).toBe(0);
    expect(bodyEmpty.award).toBeNull();
  });
});

import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Ga4Hit } from '@miu/schema/analytics';
import { createTestApp, fakeParent, type Agent, type TestApp } from '../../test/test-app';
import { AnalyticsSessions } from '../analytics/analytics-session';
import { ServerEvents, installServerEvents, questLabels } from '../analytics/server-events';
import { finishQuest } from './quest-completion';
import * as usage from './quest-usage';

// The real implementation by default; a test swaps it for one that fails.
vi.mock('./quest-usage', async (importOriginal) => {
  const real = await importOriginal<typeof import('./quest-usage')>();
  return { ...real, firstQuestEver: vi.fn(real.firstQuestEver) };
});

let app: TestApp;
const sent: Ga4Hit[] = [];
let sinkFails = false;
const sink = {
  send: (hit: Ga4Hit): void => {
    if (sinkFails) throw new Error('sink down');
    sent.push(hit);
  },
};

beforeAll(async () => {
  const sessions = new AnalyticsSessions();
  app = await createTestApp(undefined, undefined, undefined, undefined, { analytics: { sink, sessions } });
  installServerEvents(new ServerEvents({ sink, sessions, labels: questLabels(app.content) }));
});
afterEach(() => {
  sent.length = 0;
  sinkFails = false;
  vi.mocked(usage.firstQuestEver).mockClear();
});
afterAll(async () => {
  installServerEvents(null);
  await app.handle.close();
});

const names = (): string[] => sent.map((hit) => hit.event.name).sort();

async function player(): Promise<{ agent: Agent; childId: string }> {
  const agent = app.agent();
  await agent.post('/api/auth/register').send(fakeParent()).expect(201);
  await agent.post('/api/consents').send({ policyVersion: app.content.consent.version }).expect(201);
  const me = (await agent.get('/api/auth/me').expect(200)).body as { activePlayerId: string };
  sent.length = 0; // the sign-up is not what these tests look at
  return { agent, childId: me.activePlayerId };
}

/** Correct play-through of the fixture quests (see quest-routes.test.ts). */
const PLAY: Record<string, Array<[string, object]>> = {
  'quest-a': [['meet-vet', {}], ['find-letter', { target: 'clue-letter' }], ['solve-tree', { answer: { value: 5 } }]],
  'quest-c': [['say-hello', {}], ['pick-flower', { target: 'mushroom' }], ['pick-flower', { target: 'flower' }], ['add-flowers', { answer: { value: 2 } }]],
};

function step(agent: Agent, quest: string, index: number): Promise<unknown> {
  const [stepId, body] = PLAY[quest]?.[index] ?? ['missing', {}];
  return agent.post(`/api/quests/${quest}/steps/${stepId}/complete`).send({ ...body, run: 1 }).expect(200);
}

async function playUpToLastStep(agent: Agent, quest: string): Promise<void> {
  const steps = PLAY[quest] ?? [];
  for (let i = 0; i < steps.length - 1; i++) await step(agent, quest, i);
}

const lastStep = (agent: Agent, quest: string): Promise<unknown> => step(agent, quest, (PLAY[quest]?.length ?? 1) - 1);

describe('usage events of a finished quest', () => {
  it('leave nothing when the transaction that paid the quest rolls back', async () => {
    const { childId } = await player();
    const quest = app.content.quests.get('quest-a');
    if (quest?.status !== 'active') throw new Error('fixture quest-a missing');
    const queue = usage.commitQueue();
    await expect(
      app.db.transaction(async (tx) => {
        const finished = await finishQuest(tx, app.content, childId, quest, new Date(), 1, queue);
        expect(finished.reward).not.toBeNull();
        throw new Error('rollback after finishQuest');
      }),
    ).rejects.toThrow('rollback after finishQuest');
    // The caller runs the queue only after a commit, and its throw skipped that: nothing was announced.
    expect(sent).toEqual([]);
    // The payment was undone too, so the same run can still be paid and reported.
    const again = usage.commitQueue();
    await app.db.transaction((tx) => finishQuest(tx, app.content, childId, quest, new Date(), 1, again));
    expect(sent).toEqual([]);
    again.run();
    expect(names()).toEqual(['level_end', 'tutorial_complete']);
  });

  it('send tutorial_complete once when the first two quests finish at the same time', async () => {
    const { agent } = await player();
    await playUpToLastStep(agent, 'quest-a');
    await playUpToLastStep(agent, 'quest-c');
    await Promise.all([lastStep(agent, 'quest-a'), lastStep(agent, 'quest-c')]);
    expect(names()).toEqual(['level_end', 'level_end', 'tutorial_complete']);
  });

  it('never fail the quest step when asking whether it is the first one fails in the database', async () => {
    const { agent } = await player();
    // A real database error: it would abort the payment's transaction were it not asked inside a savepoint.
    vi.mocked(usage.firstQuestEver).mockImplementationOnce(async (tx) => {
      await tx.execute(sql`select * from no_such_table_for_the_test`);
      return true;
    });
    await playUpToLastStep(agent, 'quest-a');
    const res = (await agent.post('/api/quests/quest-a/steps/solve-tree/complete').send({ answer: { value: 5 }, run: 1 }).expect(200)).body as { reward: unknown };
    expect(res.reward).not.toBeNull();
    expect(sent).toEqual([]);
    const progress = (await agent.get('/api/progress').expect(200)).body as { xp: number };
    expect(progress.xp).toBeGreaterThan(0);
  });

  it('never fail the quest step when the sink throws after the commit', async () => {
    const { agent } = await player();
    await playUpToLastStep(agent, 'quest-a');
    sinkFails = true;
    const res = (await agent.post('/api/quests/quest-a/steps/solve-tree/complete').send({ answer: { value: 5 }, run: 1 }).expect(200)).body as { reward: unknown };
    expect(res.reward).not.toBeNull();
    expect(sent).toEqual([]);
  });
});

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ANALYTICS_HEADER, GA_CLIENT_ID, type Ga4Hit } from '@miu/schema/analytics';
import { createTestApp, fakeParent, type Agent, type TestApp } from '../../test/test-app';
import * as t from '../db/schema';
import { APP_ORIGINS } from '../auth/app-cors';
import { createSession } from '../auth/session-store';
import { AnalyticsSessions, asAppRequest } from './analytics-session';
import { ServerEvents, installServerEvents, questLabels, randomGaIds } from './server-events';

const CLIENT = '1234567890.1760000000';
const SESSION = 1_760_000_000;
const HEADER = `${CLIENT};${SESSION}`;

let app: TestApp;
let sessions: AnalyticsSessions;
const sent: Ga4Hit[] = [];
const sink = { send: (hit: Ga4Hit) => void sent.push(hit) };

beforeAll(async () => {
  sessions = new AnalyticsSessions();
  app = await createTestApp(undefined, undefined, undefined, undefined, { analytics: { sink, sessions } });
  installServerEvents(new ServerEvents({ sink, sessions, labels: questLabels(app.content) }));
});
afterEach(() => {
  sent.length = 0;
});
afterAll(async () => {
  installServerEvents(null);
  await app.handle.close();
});

const names = (): string[] => sent.map((hit) => hit.event.name);

async function registered(header: string | null = HEADER): Promise<Agent> {
  const agent = app.agent();
  if (header) agent.set(ANALYTICS_HEADER, header);
  await agent.post('/api/auth/register').send(fakeParent()).expect(201);
  return agent;
}

const consent = (agent: Agent) => agent.post('/api/consents').send({ policyVersion: app.content.consent.version }).expect(201);

/** Correct play-through of the fixture quests used here (see quest-routes.test.ts). */
const PLAY: Record<string, Array<[string, object]>> = {
  'quest-a': [['meet-vet', {}], ['find-letter', { target: 'clue-letter' }], ['solve-tree', { answer: { value: 5 } }]],
  'quest-c': [['say-hello', {}], ['pick-flower', { target: 'mushroom' }], ['pick-flower', { target: 'flower' }], ['add-flowers', { answer: { value: 2 } }]],
};

async function finish(agent: Agent, quest: string, run = 1): Promise<void> {
  for (const [stepId, body] of PLAY[quest] ?? []) await agent.post(`/api/quests/${quest}/steps/${stepId}/complete`).send({ ...body, run }).expect(200);
}

describe('sign_up', () => {
  it('is sent once, on the account’s first consent, under the web app’s GA ids', async () => {
    const agent = await registered();
    await consent(agent);
    await consent(agent);
    expect(sent).toEqual([{ clientId: CLIENT, event: { name: 'sign_up', params: { method: 'password', session_id: SESSION, engagement_time_msec: 1 } } }]);
  });

  it('is not sent when an account that accepted an older policy accepts the new one', async () => {
    const agent = await registered();
    const me = (await agent.get('/api/auth/me').expect(200)).body as { parent: { id: string } };
    await app.db.insert(t.consents).values({ id: randomUUID(), parentId: me.parent.id, policyVersion: 'v3', acceptedAt: new Date() });
    expect(((await agent.get('/api/auth/me').expect(200)).body as { consentAccepted: boolean }).consentAccepted).toBe(false);
    await consent(agent);
    expect(((await agent.get('/api/auth/me').expect(200)).body as { consentAccepted: boolean }).consentAccepted).toBe(true);
    expect(names()).toEqual([]);
  });

  it('goes under a random GA id when the web app sent none, never an account id or email', async () => {
    const parent = fakeParent();
    const agent = app.agent();
    await agent.post('/api/auth/register').send(parent).expect(201);
    await consent(agent);
    const [hit] = sent;
    expect(hit?.event.name).toBe('sign_up');
    expect(hit?.clientId).toMatch(GA_CLIENT_ID);
    expect(hit?.clientId).not.toBe(CLIENT);
    const [row] = await app.db.select({ id: t.parents.id }).from(t.parents).where(eq(t.parents.email, parent.email));
    expect(JSON.stringify(sent)).not.toContain(parent.email);
    expect(JSON.stringify(sent)).not.toContain(row?.id ?? 'missing');
  });

  it('ignores a malformed ids header', async () => {
    const agent = await registered('parent@example.vn;1');
    await consent(agent);
    expect(sent[0]?.clientId).not.toContain('example');
    expect(sent[0]?.clientId).toMatch(GA_CLIENT_ID);
  });
});

describe('quest events', () => {
  async function playing(): Promise<{ agent: Agent; childId: string }> {
    const agent = await registered();
    await consent(agent);
    const me = (await agent.get('/api/auth/me').expect(200)).body as { activePlayerId: string };
    sent.length = 0;
    return { agent, childId: me.activePlayerId };
  }

  it('sends tutorial_complete on the first quest only and level_end on every run, with lesson and subject from the catalogue', async () => {
    const { agent, childId } = await playing();
    await finish(agent, 'quest-a');
    expect(names()).toEqual(['tutorial_complete', 'level_end']);
    expect(sent.every((hit) => hit.clientId === CLIENT && hit.event.params.session_id === SESSION)).toBe(true);
    expect(sent[1]?.event.params).toEqual({ subject: 'tieng-viet', session_id: SESSION, engagement_time_msec: 1 });
    sent.length = 0;
    await finish(agent, 'quest-a', 2);
    await finish(agent, 'quest-c');
    expect(names()).toEqual(['level_end', 'level_end']);
    expect(JSON.stringify(sent)).not.toContain(childId);
  });

  it('sends nothing for a step repeated after the quest was paid', async () => {
    const { agent } = await playing();
    await finish(agent, 'quest-c');
    sent.length = 0;
    await agent.post('/api/quests/quest-c/steps/add-flowers/complete').send({ answer: { value: 2 } }).expect(200);
    expect(names()).toEqual([]);
  });

  it('names a lesson only when the catalogue has it', () => {
    const local: Ga4Hit[] = [];
    const events = new ServerEvents({ sink: { send: (hit) => void local.push(hit) }, sessions: new AnalyticsSessions(), labels: { lessons: new Set(['tv2-t1-b01']), subjectOfSkill: new Map([['doc-hieu', 'tieng-viet']]) } });
    events.questFinished('child', { lesson: 'tv2-t1-b01', reward: { xp: 1, coin: 0, skillXp: { 'doc-hieu': 1 }, items: {} } }, false);
    events.questFinished('child', { lesson: 'made-up', reward: { xp: 1, coin: 0, skillXp: { unknown: 1 }, items: {} } }, false);
    expect(local.map((hit) => hit.event.params)).toEqual([
      { lesson_id: 'tv2-t1-b01', subject: 'tieng-viet', session_id: expect.any(Number), engagement_time_msec: 1 },
      { session_id: expect.any(Number), engagement_time_msec: 1 },
    ]);
  });
});

describe('the iPhone/Android app', () => {
  it('sends no sign_up and no quest events for what an app session does, while the same account on the web still counts', async () => {
    const appAgent = async (parentId: string): Promise<Agent> => {
      // An app session plays as the account's primary player once there is one (it is made by the consent).
      const { token } = await createSession(app.db, parentId, new Date(), { openParentGate: true, kind: 'native' });
      return app.agent().set('Origin', APP_ORIGINS[0] ?? '').set('Authorization', `Bearer ${token}`).set(ANALYTICS_HEADER, HEADER);
    };
    const parentOf = async (agent: Agent): Promise<string> => ((await agent.get('/api/auth/me').expect(200)).body as { parent: { id: string } }).parent.id;
    // An account's first consent given in the app: no sign_up.
    const fresh = await registered();
    const res = await (await appAgent(await parentOf(fresh))).post('/api/consents').send({ policyVersion: app.content.consent.version });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(names()).toEqual([]);
    // Quests played in the app: nothing; the same account's web play still counts.
    const web = await registered();
    await consent(web);
    sent.length = 0;
    await finish(await appAgent(await parentOf(web)), 'quest-a');
    expect(names()).toEqual([]);
    await finish(web, 'quest-c');
    // Her first quest was the app's, so the web run is only a level_end.
    expect(names()).toEqual(['level_end']);
  });

  it('sends nothing for work marked as the app’s outside a request (a co-op win paid over the WebSocket)', () => {
    const local: Ga4Hit[] = [];
    const events = new ServerEvents({ sink: { send: (hit) => void local.push(hit) }, sessions: new AnalyticsSessions(), labels: { lessons: new Set(), subjectOfSkill: new Map() } });
    const quest = { reward: { xp: 1, coin: 0, skillXp: {}, items: {} } };
    asAppRequest(true, () => events.questFinished('child', quest, false));
    expect(local).toEqual([]);
    asAppRequest(false, () => events.questFinished('child', quest, false));
    events.ccuPeak(2);
    expect(local.map((hit) => hit.event.name)).toEqual(['level_end', 'ccu_peak']);
  });
});

describe('ccu_peak', () => {
  it('sends a whole number of players under the server’s own GA id', () => {
    const local: Ga4Hit[] = [];
    const events = new ServerEvents({ sink: { send: (hit) => void local.push(hit) }, sessions: new AnalyticsSessions(), labels: { lessons: new Set(), subjectOfSkill: new Map() } });
    events.ccuPeak(4);
    events.ccuPeak(0);
    events.ccuPeak(-1);
    events.ccuPeak(1.5);
    expect(local.map((hit) => hit.event)).toEqual([
      { name: 'ccu_peak', params: { ccu: 4, session_id: expect.any(Number), engagement_time_msec: 1 } },
      { name: 'ccu_peak', params: { ccu: 0, session_id: expect.any(Number), engagement_time_msec: 1 } },
    ]);
    expect(local[0]?.clientId).toBe(local[1]?.clientId);
  });
});

describe('random GA ids', () => {
  it('have the web app’s shape', () => {
    const ids = randomGaIds(1_760_000_000_123);
    expect(ids.clientId).toMatch(GA_CLIENT_ID);
    expect(ids.clientId.endsWith('.1760000000')).toBe(true);
    expect(ids.sessionId).toBe(1_760_000_000);
  });
});

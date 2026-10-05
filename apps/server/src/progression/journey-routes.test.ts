import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JourneyResponse } from '@miu/schema/journey';
import { solution } from '../../test/quest-solution';
import { FIXTURE_CONTENT, createTestApp, parentWithChild, signedInWithoutPlayer, type Agent, type TestApp } from '../../test/test-app';
import { journeyEvents } from './journey-routes';

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

async function play(agent: Agent, questId: string): Promise<void> {
  const quest = app.content.quests.get(questId);
  if (quest?.status !== 'active') throw new Error(`${questId} must be an active fixture quest`);
  for (const [stepId, body] of solution(quest)) await agent.post(`/api/quests/${questId}/steps/${stepId}/complete`).send(body).expect(200);
}

const journey = async (agent: Agent): Promise<JourneyResponse> => JourneyResponse.parse((await agent.get('/api/journey').expect(200)).body);

describe('journey', () => {
  it('shows every region with its lessons and an empty timeline at first', async () => {
    const { agent } = await playingChild();
    const body = await journey(agent);
    expect(body.events).toEqual([]);
    expect(body.regions.find((r) => r.region === 'khu-rung-bi-mat')).toEqual({ region: 'khu-rung-bi-mat', lessons: 3, lessonsDone: 0, threeStars: 0, minigameRuns: 0, chestTiers: 0 });
  });

  it('tells what she did, newest first: the quest, what it dropped and the level it reached', async () => {
    const { agent } = await playingChild();
    await play(agent, 'quest-b');
    await play(agent, 'side-egg');
    const body = await journey(agent);
    expect(body.regions.find((r) => r.region === 'khu-rung-bi-mat')).toMatchObject({ lessonsDone: 1, minigameRuns: 1 });
    const kinds = body.events.map((e) => e.kind);
    expect(kinds[0]).toBe('minigame');
    expect(kinds).toContain('quest');
    expect(body.events.find((e) => e.kind === 'quest')).toMatchObject({ ref: 'quest-b', label: app.content.quests.get('quest-b')?.title, xp: 100, coin: 20 });
    // quest-b's 100 XP reach level 2, and Phép cộng's 2 skill XP its level 2.
    expect(body.events.find((e) => e.kind === 'level-up')).toMatchObject({ level: 2 });
    expect(body.events.find((e) => e.kind === 'skill-up')).toMatchObject({ ref: 'phep-cong', label: 'Phép cộng', level: 2 });
    expect(body.events.find((e) => e.kind === 'gift')).toMatchObject({ ref: 'phep-cong', level: 2 });
    for (const event of body.events) expect(Number.isNaN(Date.parse(event.at))).toBe(false);
  });

  it("keeps each player's journey apart and needs a selected player", async () => {
    const a = await playingChild();
    const b = await playingChild();
    await play(a.agent, 'quest-a');
    expect((await journey(b.agent)).events).toEqual([]);
    await b.agent.post(`/api/players/${a.childId}/select`).expect(404);
    await app.agent().get('/api/journey').expect(401);
    expect((await (await signedInWithoutPlayer(app)).get('/api/journey').expect(401)).body).toEqual({ error: 'no-active-child' });
  });
});

describe('journey timeline', () => {
  const row = (source: string, at: number, extra: Partial<{ xp: number; coins: number; skillXp: Record<string, number>; items: Record<string, number> }> = {}) => ({
    source,
    xp: 0,
    coins: 0,
    skillXp: {},
    items: {},
    createdAt: new Date(Date.UTC(2026, 9, 1, 8, at)),
    ...extra,
  });

  it('leaves out boosters used up and keeps the newest events within the limit', () => {
    const ledger = [row('use:1', 0, { items: { 'them-mot-tim': -1 } }), ...Array.from({ length: 70 }, (_, i) => row(`shop:${i}`, i + 1, { coins: -50, items: { 'them-mot-tim': 1 } }))];
    const events = journeyEvents(FIXTURE_CONTENT, ledger);
    expect(events).toHaveLength(60);
    expect(events[0]).toMatchObject({ kind: 'item', itemId: 'them-mot-tim', coin: -50 });
    expect(journeyEvents(FIXTURE_CONTENT, ledger, new Map([['them-mot-tim', 'Thêm một tim']]))[0]?.itemName).toBe('Thêm một tim');
    expect(events.every((e) => e.kind === 'item')).toBe(true);
  });

  it('names chests, collections, achievements and gates from the content', () => {
    const events = journeyEvents(FIXTURE_CONTENT, [
      row('region:khu-rung-bi-mat:full', 1, { items: { 'hat-ruong-khu-rung-bi-mat': 1 } }),
      row('achievement:bai-hoc-dau-tien', 2),
      row('gate:dba-ruong-vui-cat@quest:kho-bau-dao-ch1#3', 3),
      row('olympiad:exam:80:gold:abc', 4),
    ]);
    expect(events.find((e) => e.kind === 'chest')?.itemName).toBe(FIXTURE_CONTENT.accessories.get('hat-ruong-khu-rung-bi-mat')?.name);
    expect(events.map((e) => [e.kind, e.ref, e.itemId])).toEqual([
      ['olympiad', null, null],
      ['gate', 'dba-ruong-vui-cat', null],
      ['achievement', 'bai-hoc-dau-tien', null],
      ['chest', 'khu-rung-bi-mat', 'hat-ruong-khu-rung-bi-mat'],
    ]);
    expect(events[1]?.label).toBe('Rương vùi trong cát');
    expect(events[2]?.label).toBe(FIXTURE_CONTENT.achievements.get('bai-hoc-dau-tien')?.name);
  });
});

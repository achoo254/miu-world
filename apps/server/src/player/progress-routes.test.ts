import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PlayerProgressDto, recentWeeks, weekStartOf } from '@miu/schema/progress';
import { TEST_PIN, createTestApp, parentWithChild, type TestApp } from '../../test/test-app';
import * as t from '../db/schema';
import type { PlayerRecord } from '../progression/player-facts';
import { computeProgress } from './player-progress';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.handle.close();
});

const emptyRecord = (patch: Partial<PlayerRecord> = {}): PlayerRecord => ({ quests: [], ledger: [], skills: new Map(), inventory: new Map(), cupboard: new Map(), ...patch });
const done = (questId: string, stars: number) => ({ questId, completedAt: new Date('2026-10-01T03:00:00Z'), stars });

describe('progress rules', () => {
  const now = new Date('2026-10-05T10:00:00Z');

  it('starts with no strong skill, the practised skills as weak, and the first lessons to play', () => {
    const progress = computeProgress(app.content, emptyRecord(), new Map(), now, 'Miu');
    expect(PlayerProgressDto.parse(progress)).toEqual(progress);
    expect(progress.strong).toEqual([]);
    expect(progress.weak.map((s) => s.skillId).sort()).toEqual(['doc-hieu', 'phep-cong']);
    expect(progress.suggestions.map((s) => s.reason)).toEqual(['new', 'new', 'new']);
    expect(progress.counts).toMatchObject({ lessonsDone: 0, lessonsTotal: 4, threeStars: 0, playerLevel: 1 });
    // Only lessons count, never the side quest or the "coming soon" stub.
    expect(progress.suggestions.map((s) => s.questId)).not.toContain('side-egg');
    expect(progress.suggestions.map((s) => s.questId)).not.toContain('quest-soon');
  });

  it('ranks skills by XP and suggests a new lesson for the weak skill before replays short of three stars', () => {
    const record = emptyRecord({
      quests: [done('quest-a', 1), done('quest-b', 3)],
      skills: new Map([
        ['doc-hieu', 120],
        ['phep-cong', 10],
      ]),
    });
    const progress = computeProgress(app.content, record, new Map(), now, 'Miu');
    expect(progress.strong.map((s) => s.skillId)).toEqual(['doc-hieu', 'phep-cong']);
    // Every practised skill is strong already: nothing left to call weak.
    expect(progress.weak).toEqual([]);
    expect(progress.suggestions[0]).toMatchObject({ questId: 'quest-a', reason: 'improve', stars: 1 });
    expect(progress.suggestions.slice(1).map((s) => s.reason)).toEqual(['new', 'new']);
    expect(progress.counts).toMatchObject({ lessonsDone: 2, threeStars: 1 });
    const reading = progress.subjects.find((s) => s.lessonsTotal > 0 && s.lessonsDone > 0);
    expect(reading).toBeDefined();
  });

  it('turns the weekly seconds into minutes for the last four weeks, oldest first', () => {
    const weeks = recentWeeks(now, 4);
    const progress = computeProgress(app.content, emptyRecord(), new Map([[weeks[3] ?? '', 3_000], [weeks[0] ?? '', 89]]), now, 'Miu');
    expect(progress.weeks).toEqual([
      { weekStart: weeks[0], minutes: 1 },
      { weekStart: weeks[1], minutes: 0 },
      { weekStart: weeks[2], minutes: 0 },
      { weekStart: weeks[3], minutes: 50 },
    ]);
  });

  it('starts weeks on Monday, Vietnam time', () => {
    // Sunday 23:30 in Hanoi is still last week; Monday 00:30 in Hanoi (Sunday 17:30 UTC) is the new one.
    expect(weekStartOf(new Date('2026-10-04T16:30:00Z'))).toBe('2026-09-28');
    expect(weekStartOf(new Date('2026-10-04T17:30:00Z'))).toBe('2026-10-05');
  });
});

describe('GET /learning-progress', () => {
  it('shows the selected player her own progress', async () => {
    const { agent, childId } = await parentWithChild(app);
    await app.db.insert(t.skillProgress).values({ childId, skillId: 'phep-cong', xp: 40 });
    const body = PlayerProgressDto.parse((await agent.get('/api/learning-progress').expect(200)).body);
    expect(body.strong.map((s) => s.skillId)).toEqual(['phep-cong']);
  });

  it('needs a signed-in player', async () => {
    await app.agent().get('/api/learning-progress').expect(401);
  });
});

describe('GET /players/:id/learning-progress', () => {
  it('shows the account owner any player of the account', async () => {
    const { agent } = await parentWithChild(app);
    const extra = ((await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string }).id;
    await app.db.insert(t.skillProgress).values({ childId: extra, skillId: 'doc-hieu', xp: 25 });
    const body = PlayerProgressDto.parse((await agent.get(`/api/players/${extra}/learning-progress`).expect(200)).body);
    expect(body.strong.map((s) => s.skillId)).toEqual(['doc-hieu']);
  });

  it('never shows another account’s player, nor a malformed id (404)', async () => {
    const a = await parentWithChild(app);
    const b = await parentWithChild(app);
    await b.agent.get(`/api/players/${a.childId}/learning-progress`).expect(404);
    await b.agent.get('/api/players/not-a-uuid/learning-progress').expect(404);
  });

  it('stays behind the account PIN once the area is locked', async () => {
    const { agent, childId } = await parentWithChild(app);
    // Choosing who plays closes the account area.
    await agent.post(`/api/players/${childId}/select`).expect(200);
    await agent.get(`/api/players/${childId}/learning-progress`).expect(403, { error: 'parent-gate-closed' });
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    await agent.get(`/api/players/${childId}/learning-progress`).expect(200);
  });
});

describe('POST /play-time', () => {
  const secondsOf = async (childId: string): Promise<number> => {
    const [row] = await app.db
      .select({ seconds: t.playTime.seconds })
      .from(t.playTime)
      .where(and(eq(t.playTime.childId, childId), eq(t.playTime.weekStart, weekStartOf(new Date(Date.now())))));
    return row?.seconds ?? 0;
  };

  it('adds a report to this week once per half beat, and shows it as minutes', async () => {
    const { agent, childId } = await parentWithChild(app);
    const before = await secondsOf(childId);
    await agent.post('/api/play-time').send({ seconds: 60 }).expect(204);
    // Too soon after the last one: counted once.
    await agent.post('/api/play-time').send({ seconds: 60 }).expect(204);
    expect((await secondsOf(childId)) - before).toBe(60);
    const week = PlayerProgressDto.parse((await agent.get('/api/learning-progress').expect(200)).body).weeks.at(-1);
    expect(week?.minutes).toBe(1);
  });

  it('never adds more than the time since the last report', async () => {
    const { agent, childId } = await parentWithChild(app);
    await agent.post('/api/play-time').send({ seconds: 60 }).expect(204);
    // Reports every 40 s claiming a minute each count 40 s each.
    app.advance(40_000);
    await agent.post('/api/play-time').send({ seconds: 60 }).expect(204);
    app.advance(40_000);
    await agent.post('/api/play-time').send({ seconds: 60 }).expect(204);
    const [row] = await app.db.select({ seconds: t.playTime.seconds }).from(t.playTime).where(eq(t.playTime.childId, childId));
    expect(row?.seconds).toBe(140);
  });

  it('counts a burst of first reports once', async () => {
    const { agent, childId } = await parentWithChild(app);
    await Promise.all([1, 2, 3].map(() => agent.post('/api/play-time').send({ seconds: 60 }).expect(204)));
    expect(await secondsOf(childId)).toBe(60);
  });

  it('refuses a report longer than a beat or not a whole number of seconds', async () => {
    const { agent } = await parentWithChild(app);
    await agent.post('/api/play-time').send({ seconds: 3_600 }).expect(400);
    await agent.post('/api/play-time').send({ seconds: 1.5 }).expect(400);
    await agent.post('/api/play-time').send({}).expect(400);
  });

  it('drops weeks older than it keeps', async () => {
    const { agent, childId } = await parentWithChild(app);
    await app.db.insert(t.playTime).values({ childId, weekStart: '2020-01-06', seconds: 600 });
    await agent.post('/api/play-time').send({ seconds: 30 }).expect(204);
    const rows = await app.db.select().from(t.playTime).where(eq(t.playTime.childId, childId));
    expect(rows.map((r) => r.weekStart)).not.toContain('2020-01-06');
  });
});

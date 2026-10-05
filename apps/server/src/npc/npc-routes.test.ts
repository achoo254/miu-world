import { and, eq } from 'drizzle-orm';
import { afterAll, assert, beforeAll, describe, expect, it } from 'vitest';
import { MailListResponse } from '@miu/schema/mail';
import { FRIENDSHIP_POINTS, NpcGiftResponse, NpcListResponse, NpcTalkResponse, type NpcDto } from '@miu/schema/npc';
import { QuestListResponse, StepCompleteResponse } from '@miu/schema/game';
import { createTestApp, parentWithChild, STORY_CONTENT, type Agent, type TestApp } from '../../test/test-app';
import { solution } from '../../test/quest-solution';
import { inventoryItems, mail, npcFriendships, rewardLedger } from '../db/schema';
import { giftSource } from './npc-friendship';

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, {}, undefined, STORY_CONTENT);
});
afterAll(async () => {
  await app.handle.close();
});

const DAY = 24 * 3_600_000;

async function player(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  return { agent, childId };
}

async function npc(agent: Agent, id: string): Promise<NpcDto> {
  const list = NpcListResponse.parse((await agent.get('/api/npcs').expect(200)).body);
  const found = list.npcs.find((n) => n.id === id);
  assert(found, `npc ${id} is listed`);
  return found;
}

async function give(childId: string, itemId: string, qty: number): Promise<void> {
  await app.db.insert(inventoryItems).values({ childId, itemId, qty }).onConflictDoUpdate({ target: [inventoryItems.childId, inventoryItems.itemId], set: { qty } });
}

async function qtyOf(childId: string, itemId: string): Promise<number> {
  const [row] = await app.db.select().from(inventoryItems).where(and(eq(inventoryItems.childId, childId), eq(inventoryItems.itemId, itemId)));
  return row?.qty ?? 0;
}

/** Plays a story chapter through on the server; the last response (the one that finished it). */
async function playChapter(agent: Agent, questId: string, run?: number): Promise<StepCompleteResponse> {
  const quest = STORY_CONTENT.quests.get(questId);
  assert(quest?.status === 'active');
  let last: StepCompleteResponse | null = null;
  for (const [stepId, body] of solution(quest)) {
    last = StepCompleteResponse.parse((await agent.post(`/api/quests/${questId}/steps/${stepId}/complete`).send({ ...body, ...(run ? { run } : {}) }).expect(200)).body);
  }
  assert(last);
  return last;
}

describe('npc routes', () => {
  it('lists the characters with their lines, relations and stories, and no friendship yet', async () => {
    const { agent } = await player();
    const list = NpcListResponse.parse((await agent.get('/api/npcs').expect(200)).body);
    expect(list.npcs.map((n) => n.id).sort()).toEqual(['cun-lua', 'doi-hang-sau', 'hoa-mi-rung', 'meo-dam-sen']);
    const hoaMi = list.npcs.find((n) => n.id === 'hoa-mi-rung');
    assert(hoaMi);
    expect(hoaMi.friendship).toMatchObject({ points: 0, hearts: 0, nextHeartAt: 2, talkedToday: false, giftedToday: false });
    // A stranger is told neither the fear nor the secret.
    expect(hoaMi.fear).toBeNull();
    expect(hoaMi.secret).toBeNull();
    // A stranger hears the everyday lines, not the three kept for close friends.
    expect(hoaMi.lines.length).toBe(10);
    expect(hoaMi.relations.map((r) => r.npc).sort()).toEqual(['cun-lua', 'doi-hang-sau']);
    expect(hoaMi.arcs[0]?.chapters.map((c) => [c.questId, c.hearts, c.state])).toEqual([
      ['yarn-fixture-song-1', 0, 'open'],
      ['yarn-fixture-song-2', 1, 'open'],
      ['yarn-fixture-song-3', 2, 'open'],
    ]);
    // The first chapter is told to anyone.
    expect(hoaMi.offer).toEqual({ questId: 'yarn-fixture-song-1', arcId: 'fixture-song', part: 1, ready: true, hearts: 0 });
    const forest = NpcListResponse.parse((await agent.get('/api/npcs?region=lang-ven-song').expect(200)).body);
    expect(forest.npcs.map((n) => n.id).sort()).toEqual(['cun-lua', 'meo-dam-sen']);
    await agent.get('/api/npcs?region=Not A Region').expect(400);
  });

  it('counts one chat a day, whatever the client sends', async () => {
    const { agent } = await player();
    const first = NpcTalkResponse.parse((await agent.post('/api/npcs/hoa-mi-rung/talk').send({ points: 99 }).expect(200)).body);
    expect(first).toMatchObject({ raised: true, friendship: { points: FRIENDSHIP_POINTS.talk, talkedToday: true } });
    const again = NpcTalkResponse.parse((await agent.post('/api/npcs/hoa-mi-rung/talk').expect(200)).body);
    expect(again).toMatchObject({ raised: false, friendship: { points: FRIENDSHIP_POINTS.talk } });
    app.advance(DAY);
    const tomorrow = NpcTalkResponse.parse((await agent.post('/api/npcs/hoa-mi-rung/talk').expect(200)).body);
    expect(tomorrow).toMatchObject({ raised: true, friendship: { points: 2 * FRIENDSHIP_POINTS.talk, hearts: 1 } });
    // One heart: the second chapter is offered now.
    expect(tomorrow.offer).toMatchObject({ questId: 'yarn-fixture-song-1', ready: true });
  });

  it('counts a chat once when several arrive at the same time', async () => {
    const { agent, childId } = await player();
    const replies = await Promise.all(Array.from({ length: 6 }, () => agent.post('/api/npcs/doi-hang-sau/talk').expect(200)));
    expect(replies.filter((r) => (r.body as { raised: boolean }).raised)).toHaveLength(1);
    const [row] = await app.db.select().from(npcFriendships).where(and(eq(npcFriendships.childId, childId), eq(npcFriendships.npcId, 'doi-hang-sau')));
    expect(row?.talkPoints).toBe(FRIENDSHIP_POINTS.talk);
  });

  it('takes one gift a day of something liked and spare, from the backpack', async () => {
    const { agent, childId } = await player();
    // Not something Họa Mi likes.
    await agent.post('/api/npcs/hoa-mi-rung/gift').send({ itemId: 'vay-ca-bac' }).expect(400, { error: 'gift-not-liked' });
    await agent.post('/api/npcs/hoa-mi-rung/gift').send({ itemId: 'Not An Id' }).expect(400);
    // A collectible keeps one in the collection: the only one is not a spare.
    await give(childId, 'hat-de-rung', 1);
    await agent.post('/api/npcs/hoa-mi-rung/gift').send({ itemId: 'hat-de-rung' }).expect(409, { error: 'no-spare-item' });
    expect(await qtyOf(childId, 'hat-de-rung')).toBe(1);
    await give(childId, 'hat-de-rung', 3);
    const given = NpcGiftResponse.parse((await agent.post('/api/npcs/hoa-mi-rung/gift').send({ itemId: 'hat-de-rung' }).expect(200)).body);
    expect(given).toMatchObject({ itemId: 'hat-de-rung', left: 2, friendship: { points: FRIENDSHIP_POINTS.gift, giftedToday: true } });
    // The day's second gift changes nothing.
    await agent.post('/api/npcs/hoa-mi-rung/gift').send({ itemId: 'la-phong-do' }).expect(409, { error: 'gift-today' });
    expect(await qtyOf(childId, 'hat-de-rung')).toBe(2);
    const ledger = await app.db.select().from(rewardLedger).where(eq(rewardLedger.childId, childId));
    expect(ledger.filter((r) => r.source.startsWith('npc-gift:')).map((r) => r.items)).toEqual([{ 'hat-de-rung': -1 }]);
  });

  it('takes one gift when several arrive at the same time', async () => {
    const { agent, childId } = await player();
    await give(childId, 'reu-xanh-co-thu', 6);
    const replies = await Promise.all(Array.from({ length: 5 }, () => agent.post('/api/npcs/doi-hang-sau/gift').send({ itemId: 'reu-xanh-co-thu' })));
    expect(replies.filter((r) => r.status === 200)).toHaveLength(1);
    expect(replies.filter((r) => r.status !== 200).every((r) => r.status === 409)).toBe(true);
    expect(await qtyOf(childId, 'reu-xanh-co-thu')).toBe(5);
    app.advance(DAY);
    await agent.post('/api/npcs/doi-hang-sau/gift').send({ itemId: 'reu-xanh-co-thu' }).expect(200);
    expect(await qtyOf(childId, 'reu-xanh-co-thu')).toBe(4);
  });

  it('keeps each player to her own friendships (another account cannot read or change them)', async () => {
    const a = await player();
    const b = await player();
    await a.agent.post('/api/npcs/cun-lua/talk').expect(200);
    expect((await npc(a.agent, 'cun-lua')).friendship.points).toBe(FRIENDSHIP_POINTS.talk);
    expect((await npc(b.agent, 'cun-lua')).friendship.points).toBe(0);
    // No player id is ever taken from the request: the body names none, and unknown characters are not found.
    await b.agent.post('/api/npcs/cun-lua/talk').send({ childId: a.childId }).expect(200);
    expect((await npc(a.agent, 'cun-lua')).friendship.points).toBe(FRIENDSHIP_POINTS.talk);
    await a.agent.post('/api/npcs/no-such-npc/talk').expect(404, { error: 'npc-not-found' });
    await a.agent.post('/api/npcs/no-such-npc/gift').send({ itemId: 'hat-de-rung' }).expect(404, { error: 'npc-not-found' });
    await app.request().get('/api/npcs').expect(401);
  });

  it('lists the story chapters after the lessons, with their story, and one kind on request', async () => {
    const { agent } = await player();
    const all = QuestListResponse.parse((await agent.get('/api/quests?region=khu-rung-bi-mat').expect(200)).body).quests.map((q) => q.quest.id);
    expect(all).toEqual(['quest-a', 'quest-b', 'quest-c', 'quest-soon', 'yarn-fixture-song-1', 'yarn-fixture-song-2', 'yarn-fixture-song-3']);
    const lessons = QuestListResponse.parse((await agent.get('/api/quests?category=main&region=khu-rung-bi-mat').expect(200)).body).quests.map((q) => q.quest.id);
    expect(lessons).toEqual(['quest-a', 'quest-b', 'quest-c', 'quest-soon']);
    const stories = QuestListResponse.parse((await agent.get('/api/quests?category=story').expect(200)).body).quests;
    expect(stories.map((q) => q.quest.id)).toEqual(['yarn-fixture-song-1', 'yarn-fixture-song-2', 'yarn-fixture-song-3']);
    const [first] = stories;
    assert(first?.quest.status === 'active');
    expect(first.quest.story).toEqual({ npc: 'hoa-mi-rung', npcName: 'Họa Mi Rừng Xanh', arc: 'fixture-song', arcTitle: { vi: 'Tiếng hát thử', en: 'A test song' }, part: 1, parts: 3, hearts: 0 });
    expect(first.quest.en?.title).toBe("Họa Mi's story, chapter 1");
    expect(first.quest.steps[0]).toMatchObject({ en: { lines: ['{name}, chapter 1 begins!'] } });
  });

  it('sends the chapter letter once, raises the friendship and shows the hearts on finishing', async () => {
    const { agent, childId } = await player();
    const done = await playChapter(agent, 'yarn-fixture-song-1');
    expect(done.completion?.story).toEqual({ npc: 'hoa-mi-rung', npcName: 'Họa Mi Rừng Xanh', heartsBefore: 0, heartsAfter: 1, letter: true });
    const friend = await npc(agent, 'hoa-mi-rung');
    expect(friend.friendship.points).toBe(FRIENDSHIP_POINTS.chapter);
    expect(friend.arcs[0]?.chapters[0]?.state).toBe('completed');
    // One heart: the next chapter is ready.
    expect(friend.offer).toMatchObject({ questId: 'yarn-fixture-song-2', ready: true, hearts: 1 });
    const box = MailListResponse.parse((await agent.get('/api/mail').expect(200)).body);
    const letters = box.mail.filter((m) => m.templateId === 'letter-yarn-fixture-song-1');
    expect(letters).toHaveLength(1);
    expect(letters[0]).toMatchObject({ sender: 'Họa Mi Rừng Xanh', category: 'npc', reward: { coins: 10, xp: 10 } });
    // The seeded welcome mail is still there although a letter arrived first.
    expect(box.mail.some((m) => m.templateId === 'welcome-gift')).toBe(true);
    // Played again: paid again, no second letter, no chapter points twice.
    const replay = await playChapter(agent, 'yarn-fixture-song-1', 2);
    expect(replay.completion?.story).toMatchObject({ heartsBefore: 1, heartsAfter: 1, letter: false });
    expect((await npc(agent, 'hoa-mi-rung')).friendship.points).toBe(FRIENDSHIP_POINTS.chapter);
    const rows = await app.db.select().from(mail).where(and(eq(mail.childId, childId), eq(mail.templateId, 'letter-yarn-fixture-song-1')));
    expect(rows).toHaveLength(1);
  });

  it('answers the English feedback line of a story step with its Vietnamese one', async () => {
    const { agent } = await player();
    await agent.post('/api/quests/yarn-fixture-song-2/steps/gap/complete').send({}).expect(200);
    await agent.post('/api/quests/yarn-fixture-song-2/steps/tim/complete').send({ target: 'st-fixture-feather-2' }).expect(200);
    const wrong = StepCompleteResponse.parse((await agent.post('/api/quests/yarn-fixture-song-2/steps/do/complete').send({ answer: { value: 4 } }).expect(200)).body);
    expect(wrong).toMatchObject({ correct: false, feedback: 'Thử lại 2a', feedbackEn: 'Try again 2a' });
    const hint = (await agent.post('/api/quests/yarn-fixture-song-2/steps/do/support').send({ layer: 'hint' }).expect(200)).body as { text: string; textEn?: string };
    expect(hint).toEqual({ layer: 'hint', text: 'Bắt đầu từ hai', textEn: 'Start from two' });
  });

  it('leaves the gift of the day open when there was nothing to spare, and takes it once there is', async () => {
    const { agent, childId } = await player();
    await give(childId, 'la-phong-do', 1);
    await agent.post('/api/npcs/hoa-mi-rung/gift').send({ itemId: 'la-phong-do' }).expect(409, { error: 'no-spare-item' });
    const ledger = async () => (await app.db.select().from(rewardLedger).where(eq(rewardLedger.childId, childId))).map((r) => r.source);
    expect(await ledger()).toEqual([]);
    await give(childId, 'la-phong-do', 2);
    await agent.post('/api/npcs/hoa-mi-rung/gift').send({ itemId: 'la-phong-do' }).expect(200);
    const [today] = (await ledger()).filter((s) => s.startsWith('npc-gift:'));
    expect(today).toBe(giftSource('hoa-mi-rung', today?.slice(-10) ?? ''));
    expect(today).toMatch(/^npc-gift:hoa-mi-rung:\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps a close friend's lines for a close friend", async () => {
    const { agent } = await player();
    const stranger = await npc(agent, 'hoa-mi-rung');
    expect(stranger.lines.every((l) => (l.hearts ?? 0) === 0)).toBe(true);
    expect(stranger.lines.length).toBeLessThan((STORY_CONTENT.npcs.npcs.get('hoa-mi-rung')?.profile.lines.length ?? 0));
  });
});

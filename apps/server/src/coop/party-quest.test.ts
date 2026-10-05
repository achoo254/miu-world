import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { QuestDefinition, type ActiveQuest } from '@miu/schema/content';
import { createTestApp, FIXTURE_CONTENT, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { hubHarness, type Client } from '../../test/hub-harness';
import { questProgress, rewardLedger } from '../db/schema';
import { PartyQuestService, type PartyQuestHooks } from './party-quest';

/** A lesson with every kind of step a party meets: a shared talk, a question each answers, another talk, a boss, the end. */
const QUEST = QuestDefinition.parse({
  id: 'party-test',
  region: 'khu-rung-bi-mat',
  chapter: 1,
  title: 'Cả đội',
  summary: 'Cả đội cùng chơi.',
  status: 'active',
  review: 'teacher-pending',
  sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
  phases: { hook: 'gap', explore: 'gap', learn: 'do', challenge: 'do', decision: 'sau', finale: 'trum', reward: 'thuong', next: 'tiep' },
  steps: [
    { id: 'gap', title: 'Gặp', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chào cả đội!' }] },
    {
      id: 'do',
      title: 'Đố',
      kind: 'riddle',
      target: 'riddle-tree',
      question: 'Ba cộng bốn bằng mấy?',
      skill: 'phep-cong',
      answer: { value: 7 },
      support: { guide: ['Đếm'], hint: 'Cộng', answer: { text: '7', explanation: '3 + 4 = 7' } },
    },
    { id: 'sau', title: 'Sau', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Giỏi!' }] },
    {
      id: 'trum',
      title: 'Trùm',
      kind: 'boss',
      target: 'parrot-guide',
      bossId: 'trum-thu',
      bossName: 'Trùm',
      introDialogue: 'Tới đây!',
      winDialogue: 'Thua rồi!',
      maxHp: 200,
      damagePerTurn: 100,
      turns: [
        { id: 't1', prompt: 'Một?', skill: 'phep-cong', damage: 100, choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], answer: { choice: 'a' } },
        { id: 't2', prompt: 'Hai?', skill: 'phep-cong', damage: 100, choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], answer: { choice: 'b' } },
      ],
    },
    { id: 'thuong', title: 'Thưởng', kind: 'reward', trigger: 'auto', text: 'Thưởng.' },
    { id: 'tiep', title: 'Tiếp', kind: 'next', trigger: 'auto', text: 'Tiếp.' },
  ],
  reward: { xp: 30, coin: 10 },
}) as ActiveQuest;
const CONTENT = { ...FIXTURE_CONTENT, quests: new Map([...FIXTURE_CONTENT.quests, [QUEST.id, QUEST]]) };

let app: TestApp;
let service: PartyQuestService | null = null;
const hooks: PartyQuestHooks = {
  gate: async (...args) => (service ? service.gate(...args) : 'ok'),
  recorded: async (...args) => service?.recorded(...args),
};
beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, {}, undefined, CONTENT, { partyQuests: hooks });
});
afterAll(async () => {
  await app.handle.close();
});

async function party(): Promise<{ a: Client; b: Client; agentA: Agent; agentB: Agent; childA: string; childB: string }> {
  const h = hubHarness();
  service = new PartyQuestService({ db: app.db, content: CONTENT, host: h.hub.coopHost() });
  h.hub.setPartyQuests(service);
  const [{ agent: agentA, childId: childA }, { agent: agentB, childId: childB }] = await Promise.all([parentWithChild(app), parentWithChild(app)]);
  const a = await h.joined(childA);
  const b = await h.joined(childB);
  await vi.waitFor(() => expect(a.last('party-state')).toBeDefined());
  a.send({ type: 'party-invite', to: b.id });
  b.send({ type: 'party-reply', from: a.id, accept: true });
  return { a, b, agentA, agentB, childA, childB };
}

const step = (agent: Agent, id: string, body: object = {}) => agent.post(`/api/quests/${QUEST.id}/steps/${id}/complete`).send(body);
const doneOf = async (childId: string): Promise<string[]> =>
  (await app.db.select().from(questProgress).where(and(eq(questProgress.childId, childId), eq(questProgress.questId, QUEST.id))))[0]?.completedSteps ?? [];

describe('a quest played by a party', () => {
  it('shares the talks, waits for every answer, plays the boss as a team, and pays each member once', async () => {
    const { a, b, agentA, agentB, childA, childB } = await party();
    a.send({ type: 'party-quest-start', questId: QUEST.id });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).toMatchObject({ questId: QUEST.id, leader: a.id, members: [{ id: a.id, joined: true }, { id: b.id, joined: false }] }));
    b.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));

    // A talks to the parrot: B's own progress moves too.
    await step(agentA, 'gap').expect(200);
    await vi.waitFor(async () => expect(await doneOf(childB)).toEqual(['gap']));
    expect(b.last('party-quest-progress')?.progress.completedSteps).toEqual(['gap']);

    // A answers the riddle; she may not go on before B has answered it too.
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    expect((await step(agentA, 'sau').expect(409)).body).toEqual({ error: 'party-waiting' });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.find((m) => m.id === b.id)?.waiting).toBe(true));
    await step(agentB, 'do', { answer: { value: 7 } }).expect(200);
    await step(agentA, 'sau').expect(200);
    await vi.waitFor(async () => expect(await doneOf(childB)).toEqual(['gap', 'do', 'sau']));

    // The boss: one HP for the party, blows in turn (A first).
    await vi.waitFor(() => expect(b.last('party-quest')?.quest?.turn).toBe(a.id));
    expect((await step(agentB, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(409)).body).toEqual({ error: 'not-your-turn' });
    await step(agentA, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(200);
    await vi.waitFor(() => expect(b.last('party-quest-progress')?.progress.bossState?.trum?.hp).toBe(100));
    await step(agentB, 'trum', { answer: { turnId: 't2', choice: 'b' } }).expect(200);
    for (const child of [childA, childB]) await vi.waitFor(async () => expect(await doneOf(child)).toContain('trum'));

    // Each plays her own ending and is paid her own run, once.
    for (const agent of [agentA, agentB]) {
      await step(agent, 'thuong').expect(200);
      const last = await step(agent, 'tiep').expect(200);
      expect(last.body.reward).toMatchObject({ xp: expect.any(Number), coin: 10 });
    }
    for (const child of [childA, childB]) {
      const rows = await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, child), like(rewardLedger.source, `quest:${QUEST.id}%`)));
      expect(rows.map((r) => r.source)).toEqual([`quest:${QUEST.id}`]);
    }

    // B leaves the party: the party's quest is over for her, her progress stays.
    b.send({ type: 'party-leave' });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).toBeNull());
  });

  it('plays a replay for a member who finished the quest before, and leaves solo play as it was', async () => {
    const { a, b, agentA, agentB, childA } = await party();
    // A finishes it alone first (no party quest yet: nothing waits).
    await step(agentA, 'gap').expect(200);
    await step(agentA, 'do', { answer: { value: 7 } }).expect(200);
    await step(agentA, 'sau').expect(200);
    await step(agentA, 'trum', { answer: { turnId: 't1', choice: 'a' } }).expect(200);
    await step(agentA, 'trum', { answer: { turnId: 't2', choice: 'b' } }).expect(200);
    await step(agentA, 'thuong', { run: 1 }).expect(200);
    await step(agentA, 'tiep', { run: 1 }).expect(200);
    a.send({ type: 'party-quest-start', questId: QUEST.id });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).not.toBeNull());
    b.send({ type: 'party-quest-join', questId: QUEST.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));
    // B talks: A's second run starts with it.
    await step(agentB, 'gap').expect(200);
    await vi.waitFor(async () => expect(await doneOf(childA)).toEqual(['gap']));
    expect(a.last('party-quest-progress')?.progress.run).toBe(2);
  });
});

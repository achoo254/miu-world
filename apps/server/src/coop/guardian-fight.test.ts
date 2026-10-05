import { readFileSync } from 'node:fs';
import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { QuestDefinition, type ActiveQuest } from '@miu/schema/content';
import { createTestApp, FIXTURE_CONTENT, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { hubHarness, type Client } from '../../test/hub-harness';
import { questProgress, rewardLedger } from '../db/schema';
import { PartyQuestService, type PartyQuestHooks } from './party-quest';

/** A zone guardian as shipped (content/quests), so the test plays the real fight. */
const GUARDIAN = QuestDefinition.parse(JSON.parse(readFileSync(new URL('../../../../content/quests/ward-khu-rung-trang-tay-bac.json', import.meta.url), 'utf8'))) as ActiveQuest;
const CONTENT = { ...FIXTURE_CONTENT, quests: new Map([...FIXTURE_CONTENT.quests, [GUARDIAN.id, GUARDIAN]]) };
const BOSS = GUARDIAN.steps.find((s) => s.kind === 'boss');
if (BOSS?.kind !== 'boss' || !BOSS.feedback?.en || !BOSS.en) throw new Error('the guardian fixture has no boss with its lines');
const boss = BOSS;
const feedback = BOSS.feedback;
const lines = BOSS.feedback.en;
const winEn = BOSS.en.winDialogue;
const [opening] = GUARDIAN.steps;
const wrongChoice = (turnId: string): string => boss.turns.find((t) => t.id === turnId)?.choices.find((c) => c.id !== boss.turns.find((t) => t.id === turnId)?.answer.choice)?.id ?? '';
const blow = (turn: (typeof boss.turns)[number]) => ({ answer: { turnId: turn.id, choice: turn.answer.choice } });

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

const step = (agent: Agent, id: string, body: object = {}) => agent.post(`/api/quests/${GUARDIAN.id}/steps/${id}/complete`).send(body);
const paidRuns = async (childId: string): Promise<string[]> =>
  (await app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, `quest:${GUARDIAN.id}%`)))).map((r) => r.source).sort();

describe('a zone guardian', () => {
  it('is in the quest list as a guardian, without its answers or its lines', async () => {
    const { agent } = await parentWithChild(app);
    const list = (await agent.get('/api/quests').expect(200)).body as { quests: Array<{ quest: { id: string; category?: string } }> };
    const listed = list.quests.find((q) => q.quest.id === GUARDIAN.id);
    expect(listed?.quest.category).toBe('guardian');
    const only = (await agent.get('/api/quests?category=guardian').expect(200)).body as { quests: Array<{ quest: { id: string } }> };
    expect(only.quests.map((q) => q.quest.id)).toEqual([GUARDIAN.id]);
    const text = JSON.stringify(listed);
    expect(text).not.toContain('"answer"');
    for (const line of [...feedback.right, ...feedback.wrong]) expect(text).not.toContain(line);
  });

  it('says a fresh line after every miss and every blow, its win line on the last, and pays every won fight', async () => {
    const { agent, childId } = await parentWithChild(app);
    await step(agent, opening?.id ?? '').expect(200);
    const [first, ...rest] = boss.turns;
    if (!first) throw new Error('no turns');
    // Two misses in a row: two different lines, both languages; nothing is lost.
    const miss1 = (await step(agent, boss.id, { answer: { turnId: first.id, choice: wrongChoice(first.id) } }).expect(200)).body;
    const miss2 = (await step(agent, boss.id, { answer: { turnId: first.id, choice: wrongChoice(first.id) } }).expect(200)).body;
    expect([miss1.correct, miss2.correct]).toEqual([false, false]);
    expect([miss1.feedback, miss2.feedback]).toEqual([feedback.wrong[0], feedback.wrong[1]]);
    expect([miss1.feedbackEn, miss2.feedbackEn]).toEqual([lines.wrong[0], lines.wrong[1]]);
    // Each blow that lands hears the next line; no two blows in a row hear the same one.
    const said: string[] = [];
    const firstBlow = (await step(agent, boss.id, blow(first)).expect(200)).body;
    said.push(firstBlow.feedback);
    for (const [i, turn] of rest.slice(0, -1).entries()) {
      // Misses between two blows never bring the last blow's line back.
      if (i === 0) for (let miss = 0; miss < 2; miss++) await step(agent, boss.id, { answer: { turnId: turn.id, choice: wrongChoice(turn.id) } }).expect(200);
      said.push((await step(agent, boss.id, blow(turn)).expect(200)).body.feedback);
    }
    for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1]);
    for (const line of said) expect(feedback.right).toContain(line);
    const last = rest.at(-1);
    if (!last) throw new Error('no last turn');
    const won = (await step(agent, boss.id, blow(last)).expect(200)).body;
    expect([won.feedback, won.feedbackEn]).toEqual([boss.winDialogue, winEn]);
    // The closing beats pay the run (the server's reward, never the client's).
    for (const s of GUARDIAN.steps.slice(2)) await step(agent, s.id, { run: 1, reward: { xp: 9999 } }).expect(200);
    expect(await paidRuns(childId)).toEqual([`quest:${GUARDIAN.id}`]);
    // Fought again: paid again, once more only.
    await step(agent, opening?.id ?? '', { run: 2 }).expect(200);
    for (const turn of boss.turns) await step(agent, boss.id, { ...blow(turn), run: 2 }).expect(200);
    for (const s of GUARDIAN.steps.slice(2)) await step(agent, s.id, { run: 2 }).expect(200);
    await step(agent, GUARDIAN.steps.at(-1)?.id ?? '', { run: 2 }).expect(200);
    expect(await paidRuns(childId)).toEqual([`quest:${GUARDIAN.id}`, `quest:${GUARDIAN.id}#2`]);
  });

  it('is a team boss for a party: one HP, blows in turn, each member paid once', async () => {
    const h = hubHarness();
    service = new PartyQuestService({ db: app.db, content: CONTENT, host: h.hub.coopHost() });
    h.hub.setPartyQuests(service);
    const [{ agent: agentA, childId: childA }, { agent: agentB, childId: childB }] = await Promise.all([parentWithChild(app), parentWithChild(app)]);
    const a: Client = await h.joined(childA);
    const b: Client = await h.joined(childB);
    await vi.waitFor(() => expect(a.last('party-state')).toBeDefined());
    a.send({ type: 'party-invite', to: b.id });
    b.send({ type: 'party-reply', from: a.id, accept: true });
    a.send({ type: 'party-quest-start', questId: GUARDIAN.id });
    await vi.waitFor(() => expect(b.last('party-quest')?.quest).toMatchObject({ questId: GUARDIAN.id, leader: a.id }));
    b.send({ type: 'party-quest-join', questId: GUARDIAN.id });
    await vi.waitFor(() => expect(a.last('party-quest')?.quest?.members.every((m) => m.joined)).toBe(true));

    // A greets the guardian for both.
    await step(agentA, opening?.id ?? '').expect(200);
    await vi.waitFor(async () => {
      const [row] = await app.db.select().from(questProgress).where(and(eq(questProgress.childId, childB), eq(questProgress.questId, GUARDIAN.id)));
      expect(row?.completedSteps).toEqual([opening?.id]);
    });
    // Blows in turn: A, B, A, B…; the guardian's HP is the party's.
    const agents = [agentA, agentB];
    for (const [i, turn] of boss.turns.entries()) {
      const mine = agents[i % 2] as Agent;
      const other = agents[(i + 1) % 2] as Agent;
      const ownerId = i % 2 === 0 ? a.id : b.id;
      await vi.waitFor(() => expect(a.last('party-quest')?.quest?.turn).toBe(ownerId));
      expect((await step(other, boss.id, blow(turn)).expect(409)).body).toEqual({ error: 'not-your-turn' });
      await step(mine, boss.id, blow(turn)).expect(200);
    }
    for (const agent of agents) for (const s of GUARDIAN.steps.slice(2)) await step(agent, s.id).expect(200);
    for (const child of [childA, childB]) expect(await paidRuns(child)).toEqual([`quest:${GUARDIAN.id}`]);
  });
});

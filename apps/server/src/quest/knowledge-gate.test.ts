import { and, eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SkillCheckResult, StepCompleteResponse } from '@miu/schema/game';
import type { QuestTarget } from '@miu/schema/world-target';
import { solution } from '../../test/quest-solution';
import { FIXTURE_CONTENT, createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { rewardLedger, skillProgress } from '../db/schema';

// A knowledge gate on the beaver, whom quest-c's first step (say-hello) talks to and quest-b's count-apples asks
// for help: Phép cộng level 2 (2 XP) opens its treasure.
const GATE: QuestTarget = {
  name: 'Hải Ly',
  look: 'animal-beaver',
  skillCheck: { skill: 'phep-cong', level: 2, hintQuest: 'quest-b', reward: { coin: 30, xp: 20 } },
};

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, {}, undefined, { ...FIXTURE_CONTENT, targets: new Map([...FIXTURE_CONTENT.targets, ['animal-beaver', GATE]]) });
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/players/${childId}/select`).expect(200);
  return { agent, childId };
}

const moves = (questId: string) => {
  const quest = app.content.quests.get(questId);
  if (quest?.status !== 'active') throw new Error(`${questId} must be an active fixture quest`);
  return solution(quest);
};
const step = async (agent: Agent, questId: string, stepId: string, body: object): Promise<StepCompleteResponse> =>
  StepCompleteResponse.parse((await agent.post(`/api/quests/${questId}/steps/${stepId}/complete`).send(body).expect(200)).body);
const gateRows = (childId: string) => app.db.select().from(rewardLedger).where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'gate:%')));

describe('knowledge gates', () => {
  it('tells the skill and level a gate needs, its practice quest and its treasure', async () => {
    const { agent, childId } = await playingChild();
    const short = SkillCheckResult.parse((await agent.get('/api/skill-check/animal-beaver').expect(200)).body);
    expect(short).toMatchObject({ hasSkillCheck: true, passed: false, skill: 'phep-cong', skillName: 'Phép cộng', currentLevel: 1, requiredLevel: 2, hintQuestId: 'quest-b', reward: { coin: 30, xp: 20 } });
    await app.db.insert(skillProgress).values({ childId, skillId: 'phep-cong', xp: 2 });
    expect(SkillCheckResult.parse((await agent.get('/api/skill-check/animal-beaver').expect(200)).body)).toMatchObject({ passed: true, currentLevel: 2 });
  });

  it('lets a player short of the level go on with the lesson, with the treasure left shut', async () => {
    const { agent, childId } = await playingChild();
    const [first] = moves('quest-c');
    if (!first) throw new Error('quest-c has steps');
    const res = await step(agent, 'quest-c', first[0], first[1]);
    expect(res.quest.completedSteps).toEqual([first[0]]);
    expect(res.gates).toEqual([]);
    expect(await gateRows(childId)).toEqual([]);
  });

  it('pays the treasure once per run to a player with the level, whatever the client sends', async () => {
    const { agent, childId } = await playingChild();
    await app.db.insert(skillProgress).values({ childId, skillId: 'phep-cong', xp: 2 });
    const [first, ...rest] = moves('quest-c');
    if (!first) throw new Error('quest-c has steps');
    const opened = await step(agent, 'quest-c', first[0], { ...first[1], coin: 9999, reward: { coin: 9999 } });
    expect(opened.gates).toEqual([{ targetId: 'animal-beaver', skill: 'phep-cong', level: 2, coin: 30, xp: 20 }]);
    expect(opened.progress.coins).toBe(30);
    // Sent again (a repeat) and raced: nothing more.
    const again = await Promise.all(Array.from({ length: 3 }, () => agent.post(`/api/quests/quest-c/steps/${first[0]}/complete`).send(first[1])));
    expect(again.map((r) => r.status)).toEqual([200, 200, 200]);
    expect((await gateRows(childId)).map((r) => [r.source, r.coins, r.xp])).toEqual([['gate:animal-beaver@quest:quest-c', 30, 20]]);
    for (const [stepId, body] of rest) await step(agent, 'quest-c', stepId, body);
    // The next run of the lesson opens it again.
    const replay = await step(agent, 'quest-c', first[0], { ...first[1], run: 2 });
    expect(replay.gates?.map((g) => g.targetId)).toEqual(['animal-beaver']);
    expect((await gateRows(childId)).map((r) => r.source).sort()).toEqual(['gate:animal-beaver@quest:quest-c', 'gate:animal-beaver@quest:quest-c#2']);
  });

  it('opens nothing for a gate the client names outside the step', async () => {
    const { agent, childId } = await playingChild();
    await app.db.insert(skillProgress).values({ childId, skillId: 'phep-cong', xp: 2 });
    // quest-a's first step talks to the parrot, not the beaver.
    const [first] = moves('quest-a');
    if (!first) throw new Error('quest-a has steps');
    const res = await step(agent, 'quest-a', first[0], { ...first[1], target: 'animal-beaver' });
    expect(res.gates).toEqual([]);
    expect(await gateRows(childId)).toEqual([]);
  });

  it("keeps each player's gates apart: another player's level opens nothing for her", async () => {
    const a = await playingChild();
    const b = await playingChild();
    await app.db.insert(skillProgress).values({ childId: a.childId, skillId: 'phep-cong', xp: 9 });
    expect(SkillCheckResult.parse((await b.agent.get('/api/skill-check/animal-beaver').expect(200)).body)).toMatchObject({ passed: false, currentLevel: 1 });
    const [first] = moves('quest-c');
    if (!first) throw new Error('quest-c has steps');
    expect((await step(b.agent, 'quest-c', first[0], first[1])).gates).toEqual([]);
    await app.agent().get('/api/skill-check/animal-beaver').expect(401);
  });
});

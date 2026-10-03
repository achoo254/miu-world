import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildAccessoryCatalog, isAccessoryOpen } from '@miu/voxel/accessory-schema';
import { FIXTURE_CONTENT, createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { DEFAULT_CHARACTER_NAME as WEB_DEFAULT_NAME } from '../../../web/src/ui/creator/fresh-character';
import { DEFAULT_CHARACTER_NAME } from '../child-profile/child-profile-routes';
import * as t from '../db/schema';

// Real accessories plus two locked test items keyed to the fixture quests (quest-a: 60 XP, then quest-b: 100 XP → Lv.2).
const content = {
  ...FIXTURE_CONTENT,
  accessories: new Map([
    ...FIXTURE_CONTENT.accessories,
    ...buildAccessoryCatalog([
      ...[...FIXTURE_CONTENT.accessories.values()].filter((item) => !item.variant).map((item) => item.def),
      { id: 'hat-after-quest-a', name: 'Món thử', variantOf: 'hat-witch-pink', variant: 'mint', unlock: { quest: 'quest-a' } },
      { id: 'hat-at-level-2', name: 'Món thử', variantOf: 'hat-witch-pink', variant: 'night', unlock: { level: 2 } },
      { id: 'pack-at-level-9', name: 'Món thử', variantOf: 'backpack-brown', variant: 'red', unlock: { level: 9 } },
      { id: 'clothes-at-level-2', name: 'Món thử', variantOf: 'clothes-tshirt', variant: 'red', unlock: { level: 2 } },
    ]),
  ]),
};

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp(undefined, undefined, undefined, content);
});
afterAll(async () => {
  await app.handle.close();
});

async function playingChild(): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await agent.post(`/api/children/${childId}/select`).expect(200);
  return { agent, childId };
}

const complete = (agent: Agent, quest: string, stepId: string, body: object = {}) =>
  agent.post(`/api/quests/${quest}/steps/${stepId}/complete`).send(body).expect(200);

async function finishQuestA(agent: Agent): Promise<void> {
  await complete(agent, 'quest-a', 'meet-vet');
  await complete(agent, 'quest-a', 'find-letter', { target: 'clue-letter' });
  await complete(agent, 'quest-a', 'solve-tree', { answer: { value: 5 } });
}

async function finishQuestB(agent: Agent): Promise<void> {
  await complete(agent, 'quest-b', 'open-gate', { target: 'gate-ch2' });
  await complete(agent, 'quest-b', 'count-apples', { answer: { placed: ['apple-1', 'apple-3'] } });
  await complete(agent, 'quest-b', 'solve-tree', { answer: { value: 8 } });
}

const wear = (agent: Agent, equipped: string[]) => agent.put('/api/character').send({ name: 'Miu', equipped });

it('the web app knows the default character name, to send a fresh profile to the Character Creator', () => {
  expect(WEB_DEFAULT_NAME).toBe(DEFAULT_CHARACTER_NAME);
});

describe('isAccessoryOpen', () => {
  it('needs both the level and the quest when both are set', () => {
    const done = new Set(['quest-a']);
    expect(isAccessoryOpen(undefined, 1, new Set())).toBe(true);
    expect(isAccessoryOpen({ level: 2 }, 1, done)).toBe(false);
    expect(isAccessoryOpen({ level: 2 }, 2, done)).toBe(true);
    expect(isAccessoryOpen({ quest: 'quest-b' }, 5, done)).toBe(false);
    expect(isAccessoryOpen({ level: 2, quest: 'quest-a' }, 1, done)).toBe(false);
    expect(isAccessoryOpen({ level: 2, quest: 'quest-a' }, 2, done)).toBe(true);
  });
});

describe('PUT /api/character equipment rules (server is the source of truth)', () => {
  it('wears open colour variants as their own items', async () => {
    const { agent } = await playingChild();
    const res = await wear(agent, ['hat-witch-mint', 'backpack-green']).expect(200);
    expect(res.body.equipped).toEqual(['hat-witch-mint', 'backpack-green']);
  });

  it('refuses locked items until the quest is finished or the level reached', async () => {
    const { agent } = await playingChild();
    await wear(agent, ['hat-after-quest-a']).expect(403, { error: 'equipment-locked' });
    await wear(agent, ['hat-at-level-2']).expect(403, { error: 'equipment-locked' });
    await finishQuestA(agent);
    await wear(agent, ['hat-after-quest-a']).expect(200);
    await wear(agent, ['hat-at-level-2']).expect(403, { error: 'equipment-locked' });
    await finishQuestB(agent); // 160 XP → Lv.2
    await wear(agent, ['hat-at-level-2']).expect(200);
    await wear(agent, ['pack-at-level-9']).expect(403, { error: 'equipment-locked' });
  });

  it('dresses the child in clothes like any slot: open ones at once, locked ones from their level, one set at a time', async () => {
    const { agent } = await playingChild();
    const res = await wear(agent, ['clothes-tshirt', 'hat-witch-pink']).expect(200);
    expect(res.body.equipped).toEqual(['clothes-tshirt', 'hat-witch-pink']);
    await wear(agent, ['clothes-at-level-2']).expect(403, { error: 'equipment-locked' });
    await wear(agent, ['clothes-tshirt', 'clothes-dress']).expect(400, { error: 'invalid-equipment' });
    await finishQuestA(agent);
    await finishQuestB(agent); // 160 XP → Lv.2
    await wear(agent, ['clothes-at-level-2', 'hat-witch-pink']).expect(200);
  });

  it('takes an open vehicle with the outfit, and refuses one that opens at a higher level', async () => {
    const { agent } = await playingChild();
    const res = await wear(agent, ['hat-witch-pink', 'vehicle-skateboard-red']).expect(200);
    expect(res.body.equipped).toEqual(['hat-witch-pink', 'vehicle-skateboard-red']);
    await wear(agent, ['vehicle-tractor-red']).expect(403, { error: 'equipment-locked' });
    await wear(agent, ['vehicle-skateboard-red', 'vehicle-toy-car-red']).expect(400, { error: 'invalid-equipment' });
  });

  it('refuses unknown items and two items in one slot, even among open colours', async () => {
    const { agent } = await playingChild();
    await wear(agent, ['golden-crown']).expect(400, { error: 'invalid-equipment' });
    await wear(agent, ['hat-witch-pink', 'hat-witch-mint']).expect(400, { error: 'invalid-equipment' });
  });

  it('keeps reading an item worn before it became locked; it can stay on but not come back once removed', async () => {
    const { agent, childId } = await playingChild();
    // Content tightened after the child put it on: simulate by writing the row directly.
    await app.db.update(t.characters).set({ equipped: ['pack-at-level-9'] }).where(eq(t.characters.childId, childId));
    expect((await agent.get('/api/character').expect(200)).body.equipped).toEqual(['pack-at-level-9']);
    await wear(agent, ['pack-at-level-9', 'hat-witch-pink']).expect(200);
    await wear(agent, ['hat-witch-pink']).expect(200);
    await wear(agent, ['pack-at-level-9']).expect(403, { error: 'equipment-locked' });
  });
});

describe('PUT /api/character pet', () => {
  const put = (agent: Agent, body: object) => agent.put('/api/character').send({ name: 'Miu', equipped: [], ...body });

  it('takes a pet from the catalogue, keeps it when left out, drops it with null, and refuses an unknown one', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/character').expect(200)).body.pet).toBeNull();
    expect((await put(agent, { pet: 'cun-con' }).expect(200)).body.pet).toBe('cun-con');
    expect((await put(agent, {}).expect(200)).body.pet).toBe('cun-con');
    expect((await put(agent, { pet: null }).expect(200)).body.pet).toBeNull();
    expect((await put(agent, { pet: 'rong-lua' }).expect(400)).body.error).toBe('invalid-pet');
  });
});

describe('PUT /api/character species', () => {
  it('switches to another animal and keeps every reward, item and quest the child earned', async () => {
    const { agent } = await playingChild();
    await finishQuestA(agent);
    const before = { progress: (await agent.get('/api/progress').expect(200)).body, quests: (await agent.get('/api/quests').expect(200)).body };
    const switched = await agent.put('/api/character').send({ name: 'Miu', equipped: [], species: 'fox' }).expect(200);
    expect(switched.body.species).toBe('fox');
    expect((await agent.get('/api/progress').expect(200)).body).toEqual(before.progress);
    expect((await agent.get('/api/quests').expect(200)).body).toEqual(before.quests);
    expect(before.progress.xp).toBeGreaterThan(0);
  });
});

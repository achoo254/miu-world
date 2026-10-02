import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';

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

const forest = { map: 'forest-ch1', position: [40.5, 12, 88.25], facing: 1.5 };

describe('player positions', () => {
  it('starts empty, keeps one spot per map and replaces it on the next save', async () => {
    const { agent } = await playingChild();
    expect((await agent.get('/api/player-positions').expect(200)).body).toEqual({ positions: [] });

    await agent.put('/api/player-positions').send(forest).expect(204);
    await agent.put('/api/player-positions').send({ map: 'truong-hoc', position: [10, 8, 20], facing: 0 }).expect(204);
    const moved = { ...forest, position: [41, 12, 90], facing: -0.5 };
    await agent.put('/api/player-positions').send(moved).expect(204);

    const { positions } = (await agent.get('/api/player-positions').expect(200)).body as { positions: Array<{ map: string }> };
    expect(positions.sort((a, b) => a.map.localeCompare(b.map))).toEqual([moved, { map: 'truong-hoc', position: [10, 8, 20], facing: 0 }]);
  });

  it('belongs to the selected child: a sibling starts from nothing', async () => {
    const { agent, childId } = await parentWithChild(app);
    const sibling = await agent.post('/api/children').send({ displayName: 'Thỏ Bông' }).expect(201);
    await agent.post(`/api/children/${childId}/select`).expect(200);
    await agent.put('/api/player-positions').send(forest).expect(204);
    await agent.post(`/api/children/${(sibling.body as { id: string }).id}/select`).expect(200);
    expect((await agent.get('/api/player-positions').expect(200)).body).toEqual({ positions: [] });
  });

  it('refuses an unknown map and coordinates that are not a sane number', async () => {
    const { agent } = await playingChild();
    expect((await agent.put('/api/player-positions').send({ ...forest, map: 'moon-base' }).expect(400)).body).toEqual({ error: 'invalid-map' });
    for (const position of [[1, 2], [1e9, 2, 3], ['1', 2, 3], [1, null, 3]]) {
      await agent.put('/api/player-positions').send({ ...forest, position }).expect(400);
    }
    await agent.put('/api/player-positions').send({ ...forest, extra: true }).expect(400);
  });

  it('keeps a spot out on the land round the map (negative and far coordinates)', async () => {
    const { agent } = await playingChild();
    for (const position of [[-2400.5, 14, 3300.25], [3200, 15, -2000]]) await agent.put('/api/player-positions').send({ ...forest, position }).expect(204);
    await agent.put('/api/player-positions').send({ ...forest, position: [-4000, 14, 10] }).expect(400);
  });

  it('needs a signed-in parent with a selected child', async () => {
    await app.agent().get('/api/player-positions').expect(401);
    const { agent } = await parentWithChild(app);
    expect((await agent.put('/api/player-positions').send(forest).expect(401)).body).toEqual({ error: 'no-active-child' });
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_PIN, createTestApp, parentWithChild, type TestApp } from '../../test/test-app';
import { PlayerEvents, type PlayerEvent } from './player-events';

let app: TestApp;
const events: PlayerEvent[] = [];
beforeAll(async () => {
  const playerEvents = new PlayerEvents();
  playerEvents.on((event) => events.push(event));
  app = await createTestApp(undefined, undefined, undefined, undefined, { playerEvents });
});
afterAll(async () => {
  await app.handle.close();
});

describe('a player’s own bot switch', () => {
  it('is on by default, and she changes it herself, without the PIN', async () => {
    const { agent, childId } = await parentWithChild(app);
    // Choosing who plays closes the account area: her own setting still changes.
    await agent.post(`/api/players/${childId}/select`).expect(200);
    await agent.get('/api/player-settings').expect(200, { botsEnabled: true });
    await agent.put('/api/player-settings').send({ botsEnabled: false }).expect(200, { botsEnabled: false });
    await agent.get('/api/player-settings').expect(200, { botsEnabled: false });
    expect(events.at(-1)).toEqual({ type: 'settings', childId, settings: { botsEnabled: false } });
  });

  it('refuses an empty change, an online switch (online is always on) or anything else', async () => {
    const { agent } = await parentWithChild(app);
    await agent.put('/api/player-settings').send({}).expect(400);
    await agent.put('/api/player-settings').send({ onlineEnabled: false }).expect(400);
    await agent.put('/api/player-settings').send({ botsEnabled: 'yes' }).expect(400);
    await agent.put('/api/player-settings').send({ botsEnabled: true, chat: true }).expect(400);
  });

  it('is listed with each player for the account owner', async () => {
    const { agent } = await parentWithChild(app);
    await agent.put('/api/player-settings').send({ botsEnabled: false }).expect(200);
    const [player] = (await agent.get('/api/players').expect(200)).body as Array<Record<string, unknown>>;
    expect(player).toMatchObject({ botsEnabled: false });
    expect(player).not.toHaveProperty('onlineEnabled');
  });
});

describe('the account owner changes a player’s bot switch', () => {
  it('for an extra player of the account', async () => {
    const { agent } = await parentWithChild(app);
    const extra = ((await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string }).id;
    await agent.patch(`/api/players/${extra}/settings`).send({ botsEnabled: false }).expect(200, { botsEnabled: false });
    expect(events.at(-1)).toEqual({ type: 'settings', childId: extra, settings: { botsEnabled: false } });
    await agent.post(`/api/players/${extra}/select`).expect(200);
    await agent.get('/api/player-settings').expect(200, { botsEnabled: false });
  });

  it('only behind the PIN once the area is locked', async () => {
    const { agent, childId } = await parentWithChild(app);
    await agent.post(`/api/players/${childId}/select`).expect(200);
    await agent.patch(`/api/players/${childId}/settings`).send({ botsEnabled: false }).expect(403, { error: 'parent-gate-closed' });
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    await agent.patch(`/api/players/${childId}/settings`).send({ botsEnabled: false }).expect(200);
  });

  it('never for another account’s player (404)', async () => {
    const a = await parentWithChild(app);
    const b = await parentWithChild(app);
    const before = events.length;
    await b.agent.patch(`/api/players/${a.childId}/settings`).send({ botsEnabled: false }).expect(404);
    expect(events.length).toBe(before);
    await a.agent.get('/api/player-settings').expect(200, { botsEnabled: true });
  });
});

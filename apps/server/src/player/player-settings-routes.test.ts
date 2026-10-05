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

describe('a player’s own switches', () => {
  it('are on by default, and she changes them herself, without the PIN', async () => {
    const { agent, childId } = await parentWithChild(app);
    // Choosing who plays closes the account area: her own settings still change.
    await agent.post(`/api/players/${childId}/select`).expect(200);
    await agent.get('/api/player-settings').expect(200, { onlineEnabled: true, botsEnabled: true });
    await agent.put('/api/player-settings').send({ botsEnabled: false }).expect(200, { onlineEnabled: true, botsEnabled: false });
    await agent.put('/api/player-settings').send({ onlineEnabled: false }).expect(200, { onlineEnabled: false, botsEnabled: false });
    await agent.get('/api/player-settings').expect(200, { onlineEnabled: false, botsEnabled: false });
    expect(events.at(-1)).toEqual({ type: 'settings', childId, settings: { onlineEnabled: false, botsEnabled: false } });
  });

  it('refuses an empty change or anything else', async () => {
    const { agent } = await parentWithChild(app);
    await agent.put('/api/player-settings').send({}).expect(400);
    await agent.put('/api/player-settings').send({ onlineEnabled: 'yes' }).expect(400);
    await agent.put('/api/player-settings').send({ onlineEnabled: true, chat: true }).expect(400);
  });

  it('are listed with each player for the account owner', async () => {
    const { agent } = await parentWithChild(app);
    await agent.put('/api/player-settings').send({ onlineEnabled: false }).expect(200);
    const [player] = (await agent.get('/api/players').expect(200)).body as Array<{ onlineEnabled: boolean; botsEnabled: boolean }>;
    expect(player).toMatchObject({ onlineEnabled: false, botsEnabled: true });
  });
});

describe('the account owner changes a player’s switches', () => {
  it('for an extra player of the account', async () => {
    const { agent } = await parentWithChild(app);
    const extra = ((await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string }).id;
    await agent.patch(`/api/players/${extra}/settings`).send({ onlineEnabled: false }).expect(200, { onlineEnabled: false, botsEnabled: true });
    expect(events.at(-1)).toEqual({ type: 'settings', childId: extra, settings: { onlineEnabled: false, botsEnabled: true } });
    await agent.post(`/api/players/${extra}/select`).expect(200);
    await agent.get('/api/player-settings').expect(200, { onlineEnabled: false, botsEnabled: true });
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
    await b.agent.patch(`/api/players/${a.childId}/settings`).send({ onlineEnabled: false }).expect(404);
    expect(events.length).toBe(before);
    await a.agent.get('/api/player-settings').expect(200, { onlineEnabled: true, botsEnabled: true });
  });
});

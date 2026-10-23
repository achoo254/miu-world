import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { ORIGIN, TEST_PIN, createTestApp, parentWithChild, type TestApp } from '../../test/test-app';
import * as t from '../db/schema';
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
    await agent.get('/api/player-settings').expect(200, { botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false });
    await agent.put('/api/player-settings').send({ botsEnabled: false }).expect(200, { ...{ botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false }, botsEnabled: false });
    await agent.get('/api/player-settings').expect(200, { ...{ botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false }, botsEnabled: false });
    expect(events.at(-1)).toEqual({ type: 'settings', childId, settings: { botsEnabled: false } });
  });

  it('refuses an empty change, the account owner’s switches (not hers to change) or anything else', async () => {
    const { agent } = await parentWithChild(app);
    await agent.put('/api/player-settings').send({}).expect(400);
    await agent.put('/api/player-settings').send({ onlineEnabled: false }).expect(400);
    await agent.put('/api/player-settings').send({ voiceChatAllowed: true }).expect(400);
    await agent.put('/api/player-settings').send({ botsEnabled: true, onlineAllowed: true }).expect(400);
    await agent.put('/api/player-settings').send({ botsEnabled: 'yes' }).expect(400);
    await agent.put('/api/player-settings').send({ botsEnabled: true, chat: true }).expect(400);
  });

  it('is listed with each player for the account owner', async () => {
    const { agent } = await parentWithChild(app);
    await agent.put('/api/player-settings').send({ botsEnabled: false }).expect(200);
    const [player] = (await agent.get('/api/players').expect(200)).body as Array<Record<string, unknown>>;
    expect(player).toMatchObject({ botsEnabled: false, voiceChatAllowed: true, onlineAllowed: true });
    expect(player).not.toHaveProperty('voiceSafetySeenAt');
  });
});

describe('the account owner changes a player’s bot switch', () => {
  it('for an extra player of the account', async () => {
    const { agent } = await parentWithChild(app);
    const extra = ((await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string }).id;
    await agent.patch(`/api/players/${extra}/settings`).send({ botsEnabled: false }).expect(200, { botsEnabled: false, voiceChatAllowed: true, onlineAllowed: true });
    expect(events.at(-1)).toEqual({ type: 'settings', childId: extra, settings: { botsEnabled: false } });
    await agent.post(`/api/players/${extra}/select`).expect(200);
    await agent.get('/api/player-settings').expect(200, { ...{ botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false }, botsEnabled: false });
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
    await a.agent.get('/api/player-settings').expect(200, { botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false });
  });
});

describe('the account owner’s voice chat and online switches', () => {
  it('turn voice chat and online play off for one player, tell the online rooms, and show in her settings', async () => {
    const { agent } = await parentWithChild(app);
    const extra = ((await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string }).id;
    await agent.patch(`/api/players/${extra}/settings`).send({ voiceChatAllowed: false }).expect(200, { botsEnabled: true, voiceChatAllowed: false, onlineAllowed: true });
    expect(events.at(-1)).toEqual({ type: 'controls', childId: extra, controls: { voiceChatAllowed: false, onlineAllowed: true } });
    await agent.patch(`/api/players/${extra}/settings`).send({ onlineAllowed: false }).expect(200, { botsEnabled: true, voiceChatAllowed: false, onlineAllowed: false });
    expect(events.at(-1)).toEqual({ type: 'controls', childId: extra, controls: { voiceChatAllowed: false, onlineAllowed: false } });
    const players = (await agent.get('/api/players').expect(200)).body as Array<{ id: string; voiceChatAllowed: boolean; onlineAllowed: boolean }>;
    expect(players.find((p) => p.id === extra)).toMatchObject({ voiceChatAllowed: false, onlineAllowed: false });
    await agent.post(`/api/players/${extra}/select`).expect(200);
    await agent.get('/api/player-settings').expect(200, { ...{ botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false }, voiceChatAllowed: false, onlineAllowed: false });
  });

  it('refuse an empty or unknown change, and another account’s player (404)', async () => {
    const a = await parentWithChild(app);
    const b = await parentWithChild(app);
    await a.agent.patch(`/api/players/${a.childId}/settings`).send({}).expect(400);
    await a.agent.patch(`/api/players/${a.childId}/settings`).send({ chatAllowed: false }).expect(400);
    await b.agent.patch(`/api/players/${a.childId}/settings`).send({ onlineAllowed: false }).expect(404);
    await a.agent.get('/api/player-settings').expect(200, { botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false });
  });

  it('online off: no ticket for the multiplayer connection, with the reason; on again, a ticket', async () => {
    const { agent, childId } = await parentWithChild(app);
    await agent.post('/api/online-ticket').expect(200);
    await agent.patch(`/api/players/${childId}/settings`).send({ onlineAllowed: false }).expect(200);
    await agent.post('/api/online-ticket').expect(403, { error: 'online-off' });
    await agent.patch(`/api/players/${childId}/settings`).send({ onlineAllowed: true }).expect(200);
    await agent.post('/api/online-ticket').expect(200);
  });
});

describe('the reminder before her first voice chat', () => {
  it('is confirmed once per player and kept, by her, without the PIN', async () => {
    const { agent, childId } = await parentWithChild(app);
    const extra = ((await agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string }).id;
    await agent.post(`/api/players/${childId}/select`).expect(200);
    await agent.post('/api/player-settings/voice-safety').expect(200, { ...{ botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false }, voiceSafetySeen: true });
    const [first] = await app.db.select({ at: t.childProfiles.voiceSafetySeenAt }).from(t.childProfiles).where(eq(t.childProfiles.id, childId));
    expect(first?.at).toBeInstanceOf(Date);
    await agent.post('/api/player-settings/voice-safety').expect(200);
    const [again] = await app.db.select({ at: t.childProfiles.voiceSafetySeenAt }).from(t.childProfiles).where(eq(t.childProfiles.id, childId));
    expect(again?.at?.getTime()).toBe(first?.at?.getTime());
    // Another player of the account has not seen it.
    await agent.post(`/api/players/${extra}/select`).expect(200);
    await agent.get('/api/player-settings').expect(200, { botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, voiceSafetySeen: false });
  });

  it('needs a signed-in player', async () => {
    await app.request().post('/api/player-settings/voice-safety').set('Origin', ORIGIN).expect(401);
  });
});

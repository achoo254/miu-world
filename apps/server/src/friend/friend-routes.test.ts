import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FRIENDS_MAX, FriendDto, SocialView } from '@miu/schema/friends';
import { TEST_PIN, createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import * as t from '../db/schema';
import { dbMultiplayerStore } from '../multiplayer/multiplayer-store';
import { PlayerEvents, type PlayerEvent } from '../player/player-events';
import { dbFriendStore, type OnlineLookup } from './friend-store';

let app: TestApp;
const events: PlayerEvent[] = [];
/** Who the fake hub says is online. */
const onlineNow = new Map<string, { publicId: string; mapId: string }>();
const online: OnlineLookup = { player: (id) => onlineNow.get(id) ?? null, bot: (id) => (id === 'bot-tt-1' ? { mapId: 'trung-tam' } : null) };

beforeAll(async () => {
  const playerEvents = new PlayerEvents();
  playerEvents.on((event) => events.push(event));
  app = await createTestApp(undefined, undefined, undefined, undefined, { playerEvents, online });
});
afterAll(async () => {
  await app.handle.close();
});

const store = () => dbFriendStore(app.db);
const social = async (agent: Agent, path = '/api/friends'): Promise<SocialView> => SocialView.parse((await agent.get(path).expect(200)).body);

/** A player with a named character, signed in. */
async function player(name: string): Promise<{ agent: Agent; childId: string; email: string }> {
  const { agent, childId, parent } = await parentWithChild(app);
  await app.db.update(t.characters).set({ name, species: 'fox' }).where(eq(t.characters.childId, childId));
  return { agent, childId, email: parent.email };
}

describe('friend requests', () => {
  it('waits for the one asked, who sees who asked by character only, and accepts', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const sent = await store().request(a.childId, b.childId);
    expect(sent.kind).toBe('sent');
    const forB = await social(b.agent);
    expect(forB.incoming).toEqual([expect.objectContaining({ displayName: 'Cáo Cam', species: 'fox', isBot: false })]);
    expect((await social(a.agent)).outgoing.map((r) => r.displayName)).toEqual(['Thỏ Bông']);

    const requestId = forB.incoming[0]?.id ?? '';
    const after = SocialView.parse((await b.agent.post(`/api/friends/requests/${requestId}`).send({ accept: true }).expect(200)).body);
    expect(after.friends.map((f) => f.displayName)).toEqual(['Cáo Cam']);
    expect(after.incoming).toEqual([]);
    expect((await social(a.agent)).friends.map((f) => f.displayName)).toEqual(['Thỏ Bông']);
    expect(events.at(-1)).toEqual({ type: 'friend-answered', childId: b.childId, who: { displayName: 'Thỏ Bông', species: 'fox' }, fromChildId: a.childId, fromBotId: null, accepted: true });
    expect((await store().request(a.childId, b.childId)).kind).toBe('already-friends');
  });

  it('says nothing that identifies another player: no profile id, account or email', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await store().request(a.childId, b.childId);
    const body = JSON.stringify((await b.agent.get('/api/friends').expect(200)).body);
    expect(body).not.toContain(a.childId);
    expect(body).not.toContain(a.email);
    const keys = new Set([...body.matchAll(/"(\w+)":/g)].map((m) => m[1]));
    expect([...keys].filter((k) => k && /email|parent|child|account|profile|age|school|real/i.test(k))).toEqual([]);
    // Every field of a friend is one the schema names, no more.
    expect(Object.keys(FriendDto.shape).sort()).toEqual(['displayName', 'id', 'isBot', 'mapId', 'online', 'publicId', 'since', 'species']);
  });

  it('makes friends at once when both asked, and declining leaves no friendship', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const c = await player('Gấu Con');
    await store().request(a.childId, b.childId);
    expect((await store().request(b.childId, a.childId)).kind).toBe('befriended');
    expect((await social(a.agent)).friends).toHaveLength(1);

    await store().request(c.childId, a.childId);
    const requestId = (await social(a.agent)).incoming[0]?.id ?? '';
    await a.agent.post(`/api/friends/requests/${requestId}`).send({ accept: false }).expect(200);
    expect((await social(a.agent)).friends.map((f) => f.displayName)).toEqual(['Thỏ Bông']);
    expect((await social(c.agent)).outgoing).toEqual([]);
    // Answered once: gone.
    await a.agent.post(`/api/friends/requests/${requestId}`).send({ accept: true }).expect(404);
  });

  it('lets the sender take a request back', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await store().request(a.childId, b.childId);
    const id = (await social(a.agent)).outgoing[0]?.id ?? '';
    await b.agent.delete(`/api/friends/requests/${id}`).expect(404);
    await a.agent.delete(`/api/friends/requests/${id}`).expect(204);
    expect((await social(b.agent)).incoming).toEqual([]);
  });

  it('never between blocked players, and a block ends a friendship and its requests', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await store().request(a.childId, b.childId);
    await store().request(b.childId, a.childId);
    await dbMultiplayerStore(app.db).block(a.childId, b.childId);
    expect((await social(a.agent)).friends).toEqual([]);
    expect((await social(b.agent)).friends).toEqual([]);
    expect((await store().request(b.childId, a.childId)).kind).toBe('blocked');
  });

  it('caps friends and waiting requests', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await app.db.insert(t.friendships).values(Array.from({ length: FRIENDS_MAX }, (_, i) => ({ id: crypto.randomUUID(), childId: a.childId, botId: `bot-x-${i}` })));
    expect((await store().request(a.childId, b.childId)).kind).toBe('friends-full');
    expect((await store().request(b.childId, a.childId)).kind).toBe('friends-full');
    const c = await player('Gấu Con');
    for (let i = 0; i < 20; i += 1) {
      const other = await player('Mèo Mun');
      expect((await store().request(c.childId, other.childId)).kind).toBe('sent');
    }
    expect((await store().request(c.childId, b.childId)).kind).toBe('friend-limit');
  });

  it('refuses an answer that is not a yes or a no', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await store().request(a.childId, b.childId);
    const id = (await social(b.agent)).incoming[0]?.id ?? '';
    await b.agent.post(`/api/friends/requests/${id}`).send({ accept: 'ok' }).expect(400);
    await b.agent.post(`/api/friends/requests/${id}`).send({}).expect(400);
  });
});

describe('friends', () => {
  it('shows who is online and where, and lets either side end the friendship (both ways)', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await store().request(a.childId, b.childId);
    await store().request(b.childId, a.childId);
    onlineNow.set(b.childId, { publicId: 'p-abc', mapId: 'cho-phien' });
    const [friend] = (await social(a.agent)).friends;
    expect(friend).toMatchObject({ displayName: 'Thỏ Bông', online: true, publicId: 'p-abc', mapId: 'cho-phien' });
    await b.agent.delete(`/api/friends/${friend?.id ?? ''}`).expect(404);
    await a.agent.delete(`/api/friends/${friend?.id ?? ''}`).expect(204);
    expect((await social(b.agent)).friends).toEqual([]);
    expect(events.at(-1)).toEqual({ type: 'unfriended', childId: a.childId, otherChildId: b.childId, botId: null });
  });

  it('keeps companion bots labelled', async () => {
    const a = await player('Cáo Cam');
    expect((await store().botRequest('bot-tt-1', a.childId)).kind).toBe('sent');
    const request = (await social(a.agent)).incoming[0];
    expect(request).toMatchObject({ displayName: 'Bé Bông', isBot: true });
    await a.agent.post(`/api/friends/requests/${request?.id ?? ''}`).send({ accept: true }).expect(200);
    const [friend] = (await social(a.agent)).friends;
    expect(friend).toMatchObject({ displayName: 'Bé Bông', isBot: true, online: true, mapId: 'trung-tam' });
    expect(await store().botFriends(a.childId)).toEqual(new Set(['bot-tt-1']));
    expect(events.at(-1)).toMatchObject({ type: 'friend-answered', fromBotId: 'bot-tt-1', accepted: true });
  });
});

describe('blocks', () => {
  it('lists whom she blocked, by character, and lifts a block', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await dbMultiplayerStore(app.db).block(a.childId, b.childId);
    const [block] = (await social(a.agent)).blocks;
    expect(block).toMatchObject({ displayName: 'Thỏ Bông' });
    expect((await social(b.agent)).blocks).toEqual([]);
    await b.agent.delete(`/api/blocks/${block?.id ?? ''}`).expect(404);
    await a.agent.delete(`/api/blocks/${block?.id ?? ''}`).expect(204);
    expect(events.at(-1)).toEqual({ type: 'unblocked', childId: a.childId, otherChildId: b.childId });
    expect((await social(a.agent)).blocks).toEqual([]);
  });
});

describe('the account owner looks after a player’s friends and blocks', () => {
  it('sees them, removes a friend and lifts a block of an extra player', async () => {
    const owner = await player('Cáo Cam');
    const extra = ((await owner.agent.post('/api/players').send({ displayName: 'Thỏ Bông' }).expect(201)).body as { id: string }).id;
    const other = await player('Gấu Con');
    await store().request(extra, other.childId);
    await store().request(other.childId, extra);
    await dbMultiplayerStore(app.db).block(extra, (await player('Mèo Mun')).childId);
    const view = await social(owner.agent, `/api/players/${extra}/friends`);
    expect(view.friends.map((f) => f.displayName)).toEqual(['Gấu Con']);
    expect(view.blocks.map((b) => b.displayName)).toEqual(['Mèo Mun']);
    await owner.agent.delete(`/api/players/${extra}/friends/${view.friends[0]?.id ?? ''}`).expect(204);
    await owner.agent.delete(`/api/players/${extra}/blocks/${view.blocks[0]?.id ?? ''}`).expect(204);
    const after = await social(owner.agent, `/api/players/${extra}/friends`);
    expect(after.friends).toEqual([]);
    expect(after.blocks).toEqual([]);
    expect((await social(other.agent)).friends).toEqual([]);
  });

  it('never for another account’s player (404), and only behind the PIN once locked', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await store().request(a.childId, b.childId);
    await store().request(b.childId, a.childId);
    const friendId = (await social(a.agent)).friends[0]?.id ?? '';
    await b.agent.get(`/api/players/${a.childId}/friends`).expect(404);
    await b.agent.delete(`/api/players/${a.childId}/friends/${friendId}`).expect(404);
    await b.agent.delete(`/api/players/${b.childId}/friends/${friendId}`).expect(404);
    await a.agent.post(`/api/players/${a.childId}/select`).expect(200);
    await a.agent.get(`/api/players/${a.childId}/friends`).expect(403, { error: 'parent-gate-closed' });
    await a.agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    await a.agent.get(`/api/players/${a.childId}/friends`).expect(200);
  });
});

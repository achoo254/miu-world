import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Ga4Hit } from '@miu/schema/analytics';
import { FRIENDS_MAX, SocialView } from '@miu/schema/friends';
import { CreatedInviteDto, INVITES_MAX, INVITE_CODE, INVITE_TTL_DAYS, InviteAcceptedDto, InviteList } from '@miu/schema/invites';
import { createTestApp, parentWithChild, type Agent, type TestApp } from '../../test/test-app';
import { AnalyticsSessions } from '../analytics/analytics-session';
import { ServerEvents, installServerEvents, questLabels } from '../analytics/server-events';
import * as t from '../db/schema';
import { blockPlayer, dbFriendStore, unblock } from '../friend/friend-store';
import { PlayerEvents, type PlayerEvent } from '../player/player-events';

let app: TestApp;
const events: PlayerEvent[] = [];
const sent: Ga4Hit[] = [];
const sink = { send: (hit: Ga4Hit) => void sent.push(hit) };
const DAY_MS = 86_400_000;

/** The invite events the usage numbers got (an account's sign-up goes out too). */
const accepted = (): Ga4Hit[] => sent.filter((hit) => hit.event.name === 'invite_accepted');

/** Makes an invite's week run out now (the session clock is left alone: a session idle for a week ends). */
const expire = (id: string) => app.db.update(t.playerInvites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(t.playerInvites.id, id));

beforeAll(async () => {
  const playerEvents = new PlayerEvents();
  playerEvents.on((event) => events.push(event));
  app = await createTestApp(undefined, undefined, undefined, undefined, { playerEvents, analytics: { sink, sessions: new AnalyticsSessions() } });
  installServerEvents(new ServerEvents({ sink, sessions: new AnalyticsSessions(), labels: questLabels(app.content) }));
});
afterEach(() => {
  events.length = 0;
  sent.length = 0;
});
afterAll(async () => {
  installServerEvents(null);
  await app.handle.close();
});

/** A player with a named character, signed in. */
async function player(name: string): Promise<{ agent: Agent; childId: string }> {
  const { agent, childId } = await parentWithChild(app);
  await app.db.update(t.characters).set({ name, species: 'fox' }).where(eq(t.characters.childId, childId));
  return { agent, childId };
}

const make = async (agent: Agent): Promise<CreatedInviteDto> => CreatedInviteDto.parse((await agent.post('/api/invites').expect(201)).body);
const live = async (agent: Agent) => InviteList.parse((await agent.get('/api/invites').expect(200)).body).invites;
const friendsOf = async (agent: Agent): Promise<string[]> => SocialView.parse((await agent.get('/api/friends').expect(200)).body).friends.map((f) => f.displayName);

describe('making and withdrawing invites', () => {
  it('tells the random code once and keeps only its hash, good for a week', async () => {
    const a = await player('Cáo Cam');
    const invite = await make(a.agent);
    expect(invite.code).toMatch(INVITE_CODE);
    expect(Date.parse(invite.expiresAt) - Date.parse(invite.createdAt)).toBe(INVITE_TTL_DAYS * DAY_MS);

    const [row] = await app.db.select().from(t.playerInvites).where(eq(t.playerInvites.id, invite.id));
    expect(row?.codeHash).toBe(createHash('sha256').update(invite.code).digest('hex'));
    expect(JSON.stringify(row)).not.toContain(invite.code);

    const listed = await a.agent.get('/api/invites').expect(200);
    expect(listed.body).toEqual({ invites: [{ id: invite.id, createdAt: invite.createdAt, expiresAt: invite.expiresAt }], max: INVITES_MAX });
    expect(JSON.stringify(listed.body)).not.toContain(invite.code);
    expect(JSON.stringify(listed.body)).not.toContain(a.childId);
  });

  it('allows five live invites, and a withdrawn, spent or expired one frees its place', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const made: CreatedInviteDto[] = [];
    for (let i = 0; i < INVITES_MAX; i += 1) made.push(await make(a.agent));
    expect((await a.agent.post('/api/invites').expect(409)).body).toEqual({ error: 'invite-limit' });

    await a.agent.delete(`/api/invites/${made[0]?.id ?? ''}`).expect(204);
    await make(a.agent);
    expect((await a.agent.post('/api/invites').expect(409)).body).toEqual({ error: 'invite-limit' });

    await b.agent.post(`/api/invites/${made[1]?.code ?? ''}/accept`).expect(200);
    await make(a.agent);
    expect(await live(a.agent)).toHaveLength(INVITES_MAX);

    for (const invite of await live(a.agent)) await expire(invite.id);
    expect(await live(a.agent)).toEqual([]);
    await make(a.agent);
  });

  it('counts the limit under concurrent makes', async () => {
    const a = await player('Cáo Cam');
    const results = await Promise.all(Array.from({ length: INVITES_MAX + 3 }, () => a.agent.post('/api/invites')));
    expect(results.filter((r) => r.status === 201)).toHaveLength(INVITES_MAX);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
  });

  it('needs a signed-in player', async () => {
    await app.agent().post('/api/invites').expect(401);
    await app.agent().get('/api/invites').expect(401);
    await app.agent().post(`/api/invites/${'a'.repeat(22)}/accept`).expect(401);
  });

  it('answers 404 for another player’s invite: she can neither withdraw nor see it', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const invite = await make(a.agent);
    await b.agent.delete(`/api/invites/${invite.id}`).expect(404);
    await b.agent.delete(`/api/invites/${randomUUID()}`).expect(404);
    await b.agent.delete('/api/invites/not-an-id').expect(404);
    expect(await live(b.agent)).toEqual([]);
    expect(await live(a.agent)).toHaveLength(1);
    // The owner can; and a second withdrawal is "not found" like any invite that is no longer live.
    await a.agent.delete(`/api/invites/${invite.id}`).expect(204);
    await a.agent.delete(`/api/invites/${invite.id}`).expect(404);
  });
});

describe('using an invite', () => {
  it('makes the two friends, tells the one who made it, clears requests between them and counts it once', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await dbFriendStore(app.db).request(a.childId, b.childId);
    const invite = await make(a.agent);

    const res = await b.agent.post(`/api/invites/${invite.code}/accept`).expect(200);
    expect(InviteAcceptedDto.parse(res.body)).toEqual({ friend: { displayName: 'Cáo Cam', species: 'fox' }, already: false });
    expect(await friendsOf(b.agent)).toEqual(['Cáo Cam']);
    expect(await friendsOf(a.agent)).toEqual(['Thỏ Bông']);
    expect(await app.db.select().from(t.friendRequests).where(eq(t.friendRequests.childId, b.childId))).toEqual([]);
    expect(events).toEqual([{ type: 'friend-answered', childId: b.childId, who: { displayName: 'Thỏ Bông', species: 'fox' }, fromChildId: a.childId, fromBotId: null, accepted: true }]);
    expect(accepted()).toHaveLength(1);
    expect(JSON.stringify(accepted())).not.toMatch(/Cáo|Thỏ|child/);
    expect(await live(a.agent)).toEqual([]);

    // The same player using it again changes nothing and says so.
    const again = await b.agent.post(`/api/invites/${invite.code}/accept`).expect(200);
    expect(InviteAcceptedDto.parse(again.body).already).toBe(true);
    expect(events).toHaveLength(1);
    expect(accepted()).toHaveLength(1);
    expect(await friendsOf(b.agent)).toEqual(['Cáo Cam']);
  });

  it('is spent for everyone else after one use', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const c = await player('Gấu Con');
    const invite = await make(a.agent);
    await b.agent.post(`/api/invites/${invite.code}/accept`).expect(200);
    expect((await c.agent.post(`/api/invites/${invite.code}/accept`).expect(404)).body).toEqual({ error: 'not-found' });
    expect(await friendsOf(c.agent)).toEqual([]);
  });

  it('lets only one of two simultaneous uses of one code succeed', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const c = await player('Gấu Con');
    const invite = await make(a.agent);
    const results = await Promise.all([b.agent.post(`/api/invites/${invite.code}/accept`), c.agent.post(`/api/invites/${invite.code}/accept`)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
    expect(await friendsOf(a.agent)).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(accepted()).toHaveLength(1);
    const [row] = await app.db.select().from(t.playerInvites).where(eq(t.playerInvites.id, invite.id));
    expect(row?.acceptedBy).toBe(results[0]?.status === 200 ? b.childId : c.childId);
  });

  it('counts two simultaneous uses by the same player as one friendship', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const invite = await make(a.agent);
    const results = await Promise.all([b.agent.post(`/api/invites/${invite.code}/accept`), b.agent.post(`/api/invites/${invite.code}/accept`)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results.map((r) => (r.body as { already: boolean }).already).sort()).toEqual([false, true]);
    expect(events).toHaveLength(1);
    expect(await friendsOf(a.agent)).toEqual(['Thỏ Bông']);
  });

  it('answers 404 to a code that was never made, is malformed, expired, withdrawn or her own', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const accept = (code: string) => b.agent.post(`/api/invites/${code}/accept`);
    await accept('A'.repeat(22)).expect(404);
    await accept('short').expect(404);
    await accept(`${'A'.repeat(21)}.`).expect(404);

    const expired = await make(a.agent);
    await expire(expired.id);
    await accept(expired.code).expect(404);

    const withdrawn = await make(a.agent);
    await a.agent.delete(`/api/invites/${withdrawn.id}`).expect(204);
    await accept(withdrawn.code).expect(404);

    const own = await make(a.agent);
    await a.agent.post(`/api/invites/${own.code}/accept`).expect(404);
    expect(await live(a.agent)).toHaveLength(1);
  });

  it('does not work between players who blocked each other, and does not say why; the code stays good', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const invite = await make(a.agent);
    await blockPlayer(app.db, a.childId, b.childId);
    expect((await b.agent.post(`/api/invites/${invite.code}/accept`).expect(404)).body).toEqual({ error: 'not-found' });
    expect(await friendsOf(a.agent)).toEqual([]);
    expect(await live(a.agent)).toHaveLength(1);

    const [block] = await app.db.select().from(t.playerBlocks).where(eq(t.playerBlocks.childId, a.childId));
    await unblock(app.db, a.childId, block?.id ?? '');
    await blockPlayer(app.db, b.childId, a.childId);
    await b.agent.post(`/api/invites/${invite.code}/accept`).expect(404);
  });

  it('leaves the code unspent when either friends list is full', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const c = await player('Gấu Con');
    await app.db.insert(t.friendships).values(Array.from({ length: FRIENDS_MAX }, (_, i) => ({ id: randomUUID(), childId: a.childId, botId: `full-${i}` })));
    const invite = await make(a.agent);
    expect((await b.agent.post(`/api/invites/${invite.code}/accept`).expect(409)).body).toEqual({ error: 'friends-full' });
    expect(await live(a.agent)).toHaveLength(1);

    await app.db.delete(t.friendships).where(eq(t.friendships.childId, a.childId));
    await app.db.insert(t.friendships).values(Array.from({ length: FRIENDS_MAX }, (_, i) => ({ id: randomUUID(), childId: c.childId, botId: `full-${i}` })));
    await c.agent.post(`/api/invites/${invite.code}/accept`).expect(409);
    await b.agent.post(`/api/invites/${invite.code}/accept`).expect(200);
  });

  it('spends the code without a second friendship when the two are friends already', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    await dbFriendStore(app.db).request(a.childId, b.childId);
    await dbFriendStore(app.db).request(b.childId, a.childId);
    const invite = await make(a.agent);
    const res = await b.agent.post(`/api/invites/${invite.code}/accept`).expect(200);
    expect(InviteAcceptedDto.parse(res.body).already).toBe(true);
    expect(events).toEqual([]);
    expect(accepted()).toEqual([]);
    expect(await app.db.select().from(t.friendships).where(eq(t.friendships.childId, b.childId))).toHaveLength(1);
    expect(await live(a.agent)).toEqual([]);
  });

  it('limits how often one account may try codes', async () => {
    const b = await player('Thỏ Bông');
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await b.agent.post(`/api/invites/${'B'.repeat(22)}/accept`)).status);
    expect(statuses.slice(0, 10)).toEqual(Array<number>(10).fill(404));
    expect(statuses[10]).toBe(429);
  });
});

describe('when a player is deleted', () => {
  it('takes the invites she made with her, and only forgets who used them when that one goes', async () => {
    const a = await player('Cáo Cam');
    const b = await player('Thỏ Bông');
    const spent = await make(a.agent);
    await b.agent.post(`/api/invites/${spent.code}/accept`).expect(200);
    await make(a.agent);

    await app.db.delete(t.childProfiles).where(eq(t.childProfiles.id, b.childId));
    const [row] = await app.db.select().from(t.playerInvites).where(eq(t.playerInvites.id, spent.id));
    expect(row).toMatchObject({ acceptedBy: null });
    expect(row?.acceptedAt).toBeInstanceOf(Date);

    await app.db.delete(t.childProfiles).where(eq(t.childProfiles.id, a.childId));
    expect(await app.db.select().from(t.playerInvites).where(eq(t.playerInvites.childId, a.childId))).toEqual([]);
  });
});

describe('a player whose online play the account owner turned off', () => {
  const onlineOff = (childId: string) => app.db.update(t.childProfiles).set({ onlineAllowed: false }).where(eq(t.childProfiles.id, childId));

  it('makes no invite link', async () => {
    const { agent, childId } = await parentWithChild(app);
    await onlineOff(childId);
    await agent.post('/api/invites').expect(403, { error: 'online-off' });
    expect(await app.db.select().from(t.playerInvites).where(eq(t.playerInvites.childId, childId))).toEqual([]);
  });

  it('cannot use one: no friendship is made, and the link stays good for her later', async () => {
    const inviter = await parentWithChild(app);
    const { code } = CreatedInviteDto.parse((await inviter.agent.post('/api/invites').expect(201)).body);
    const guest = await parentWithChild(app);
    await onlineOff(guest.childId);
    await guest.agent.post(`/api/invites/${code}/accept`).expect(403, { error: 'online-off' });
    expect(await app.db.select().from(t.friendships).where(eq(t.friendships.childId, guest.childId))).toEqual([]);
    await app.db.update(t.childProfiles).set({ onlineAllowed: true }).where(eq(t.childProfiles.id, guest.childId));
    await guest.agent.post(`/api/invites/${code}/accept`).expect(200);
  });
});

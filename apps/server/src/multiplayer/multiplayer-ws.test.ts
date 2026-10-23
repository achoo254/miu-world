// The multiplayer connection over a real socket: who may open one (a one-use ticket issued to the session whose
// cookie comes with it, or to the app's Bearer session, from an allowed origin), and that what others see of a player is her saved character, kept
// up to date when she saves new clothes.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { ServerWsMessage } from '@miu/schema/multiplayer';
import { FIXTURE_CONTENT, ORIGIN, createTestApp, fakeParent, type TestApp } from '../../test/test-app';
import { CharacterEvents } from '../character/character-events';
import { playerBlocks, playerRestrictions, sessions } from '../db/schema';
import { createSession, hashToken } from '../auth/session-store';
import { APP_ORIGINS } from '../auth/app-cors';
import { MultiplayerHub, WS_CLOSE } from './multiplayer-hub';
import { dbMultiplayerStore, ticketAuthenticator } from './multiplayer-store';
import { OnlineSwitch } from './online-switch';
import { TICKET_TTL_MS, WsTickets } from './online-tickets';

let t: TestApp;
let server: Server;
let hub: MultiplayerHub;
let url: string;
const sockets: WebSocket[] = [];
let clock = Date.now();
const tickets = new WsTickets(() => clock);
const online = new OnlineSwitch();

beforeAll(async () => {
  const events = new CharacterEvents();
  t = await createTestApp(undefined, undefined, undefined, FIXTURE_CONTENT, { characterEvents: events, wsTickets: tickets, onlineSwitch: online });
  server = createServer(t.app);
  hub = new MultiplayerHub(server, {
    store: dbMultiplayerStore(t.db),
    authenticate: ticketAuthenticator(t.db, tickets, t.config, FIXTURE_CONTENT.consent.version, () => new Date()),
    allowedOrigins: [...t.config.allowedOrigins, ...APP_ORIGINS],
    onlineSwitch: online,
  });
  events.on((childId, character) => hub.characterSaved(childId, character));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/ws`;
});

afterAll(async () => {
  for (const ws of sockets) ws.terminate();
  await hub.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await t.handle.close();
});

/** A signed-up account with the policy accepted (its primary player selected); returns its cookie and player id. */
async function player(consent = true): Promise<{ cookie: string; childId: string }> {
  const res = await t.request().post('/api/auth/register').set('Origin', ORIGIN).send(fakeParent()).expect(201);
  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = (setCookie?.[0] ?? '').split(';')[0] ?? '';
  if (!consent) return { cookie, childId: '' };
  await t.request().post('/api/consents').set('Origin', ORIGIN).set('Cookie', cookie).send({ policyVersion: FIXTURE_CONTENT.consent.version }).expect(201);
  const me = await t.request().get('/api/auth/me').set('Cookie', cookie).expect(200);
  return { cookie, childId: (me.body as { activePlayerId: string }).activePlayerId };
}

const dress = (cookie: string, body: object) => t.request().put('/api/character').set('Origin', ORIGIN).set('Cookie', cookie).send(body).expect(200);

/** A ticket for this session's player (the call the web app makes right before it connects). */
async function ticketFor(cookie: string): Promise<string> {
  const res = await t.request().post('/api/online-ticket').set('Origin', ORIGIN).set('Cookie', cookie).expect(200);
  return (res.body as { ticket: string }).ticket;
}

/** Opens a socket; resolves with it once open, or with the HTTP status the upgrade was refused with. */
function open(headers: Record<string, string>, ticket?: string): Promise<{ ws: WebSocket; inbox: ServerWsMessage[]; closed: Promise<number> } | { status: number }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(ticket ? `${url}?ticket=${encodeURIComponent(ticket)}` : url, { headers });
    const closed = new Promise<number>((done) => ws.on('close', (code) => done(code)));
    sockets.push(ws);
    const inbox: ServerWsMessage[] = [];
    ws.on('message', (raw: Buffer) => inbox.push(JSON.parse(raw.toString()) as ServerWsMessage));
    ws.on('open', () => resolve({ ws, inbox, closed }));
    ws.on('unexpected-response', (_req, res) => resolve({ status: res.statusCode ?? 0 }));
    ws.on('error', reject);
  });
}

async function connected(cookie: string) {
  const opened = await open({ Cookie: cookie, Origin: ORIGIN }, await ticketFor(cookie));
  if (!('ws' in opened)) throw new Error(`refused with ${opened.status}`);
  return opened;
}

async function until<T>(read: () => T | undefined, ms = 3_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const value = read();
    if (value !== undefined) return value;
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

type Message<T extends ServerWsMessage['type']> = Extract<ServerWsMessage, { type: T }>;
/** The first message of `type` to arrive. */
const first = <T extends ServerWsMessage['type']>(inbox: ServerWsMessage[], type: T) => until(() => inbox.find((m): m is Message<T> => m.type === type));

const join = (ws: WebSocket, mapId = 'trung-tam') => ws.send(JSON.stringify({ type: 'join', mapId, x: 10, y: 5, z: 10, yaw: 0 }));

/** An app (Bearer) session of the same account as `cookie`'s, as the native sign-in makes it. */
async function appSession(cookie: string): Promise<string> {
  const me = await t.request().get('/api/auth/me').set('Cookie', cookie).expect(200);
  const parentId = (me.body as { parent: { id: string } }).parent.id;
  return (await createSession(t.db, parentId, new Date(), { openParentGate: false, kind: 'native' })).token;
}

describe('opening a multiplayer connection', () => {
  it('lets the app connect with a ticket its Bearer session asked for, and only while that session lives', async () => {
    const { cookie, childId } = await player();
    const token = await appSession(cookie);
    const [appOrigin = ''] = APP_ORIGINS;
    const ask = () => t.request().post('/api/online-ticket').set('Origin', appOrigin).set('Authorization', `Bearer ${token}`);
    const ticket = ((await ask().expect(200)).body as { ticket: string }).ticket;
    // The app's WebSocket carries no cookie and no header: the ticket alone opens it.
    const opened = await open({ Origin: appOrigin }, ticket);
    expect('ws' in opened).toBe(true);
    // The app token is no cookie, and a web cookie is no Bearer token.
    await t.request().post('/api/online-ticket').set('Origin', ORIGIN).set('Cookie', `miu_session=${token}`).expect(401);
    await t.request().post('/api/online-ticket').set('Origin', appOrigin).set('Authorization', `Bearer ${cookie.split('=')[1] ?? ''}`).expect(401);
    // Signed out on the app: its tickets no longer open anything.
    const spare = ((await ask().expect(200)).body as { ticket: string }).ticket;
    await t.db.delete(sessions).where(eq(sessions.id, hashToken(token)));
    expect(await open({ Origin: appOrigin }, spare)).toEqual({ status: 401 });
    expect(childId).not.toBe('');
  });

  it('refuses without a session, from another origin, and without a player (no consent yet)', async () => {
    const { cookie } = await player();
    expect(await open({ Origin: ORIGIN }, await ticketFor(cookie))).toEqual({ status: 401 });
    expect(await open({ Cookie: cookie, Origin: 'https://evil.example' }, await ticketFor(cookie))).toEqual({ status: 403 });
    expect(await open({ Cookie: cookie }, await ticketFor(cookie))).toEqual({ status: 403 });
    expect(await open({ Cookie: 'miu_session=forgedforgedforgedforged', Origin: ORIGIN }, await ticketFor(cookie))).toEqual({ status: 401 });
    const noConsent = await player(false);
    await t.request().post('/api/online-ticket').set('Origin', ORIGIN).set('Cookie', noConsent.cookie).expect(401);
    await t.request().post('/api/online-ticket').set('Origin', ORIGIN).expect(401);
    await t.request().post('/api/online-ticket').set('Origin', 'https://evil.example').set('Cookie', cookie).expect(403);
  });

  it('needs a ticket: none, a made-up one, a spent one, a stale one or one issued to another session is refused', async () => {
    const a = await player();
    const b = await player();
    const headers = { Cookie: a.cookie, Origin: ORIGIN };
    expect(await open(headers)).toEqual({ status: 401 });
    expect(await open(headers, 'A'.repeat(43))).toEqual({ status: 401 });
    const ticket = await ticketFor(a.cookie);
    const first = await open(headers, ticket);
    expect('ws' in first).toBe(true);
    expect(await open(headers, ticket)).toEqual({ status: 401 });
    expect(await open(headers, await ticketFor(b.cookie))).toEqual({ status: 401 });
    const stale = await ticketFor(a.cookie);
    clock += TICKET_TTL_MS + 1;
    expect(await open(headers, stale)).toEqual({ status: 401 });
    clock = Date.now();
  });

  it('gives no ticket while the emergency switch is off or her online play is locked, and closes her connection', async () => {
    const a = await player();
    const sa = await connected(a.cookie);
    join(sa.ws);
    await first(sa.inbox, 'welcome');
    online.set('off');
    expect(await sa.closed).toBe(WS_CLOSE.paused);
    const paused = await t.request().post('/api/online-ticket').set('Origin', ORIGIN).set('Cookie', a.cookie).expect(503);
    expect(paused.body).toEqual({ error: 'online-paused' });
    online.set('on');
    await t.db.insert(playerRestrictions).values({ childId: a.childId, kind: 'locked', until: null });
    const refused = await t.request().post('/api/online-ticket').set('Origin', ORIGIN).set('Cookie', a.cookie).expect(403);
    expect(refused.body).toEqual({ error: 'online-restricted' });
    await t.db.delete(playerRestrictions).where(eq(playerRestrictions.childId, a.childId));
    await ticketFor(a.cookie);
  });

  it('shows the others her saved character, and her new clothes as soon as she saves them', async () => {
    const a = await player();
    const b = await player();
    await dress(a.cookie, { name: 'Bông', equipped: ['backpack-green'], species: 'fox', pet: 'cun-con' });
    const sa = await connected(a.cookie);
    join(sa.ws);
    const { selfId } = await first(sa.inbox, 'welcome');
    expect(selfId).toMatch(/^p-/);
    expect(selfId).not.toBe(a.childId);

    const sb = await connected(b.cookie);
    join(sb.ws);
    const welcome = await first(sb.inbox, 'welcome');
    expect(welcome.players.find((p) => p.id === selfId)).toMatchObject({ displayName: 'Bông', species: 'fox', outfit: ['backpack-green'], pet: 'cun-con', isBot: false });

    await dress(a.cookie, { name: 'Bông', equipped: ['hat-witch-mint', 'backpack-green'] });
    const changed = await first(sb.inbox, 'appearance');
    expect(changed).toEqual({ type: 'appearance', id: selfId, appearance: { displayName: 'Bông', species: 'fox', outfit: ['hat-witch-mint', 'backpack-green'], pet: 'cun-con', petGear: [] } });
  });

  it('saves a block made over the connection', async () => {
    const a = await player();
    const b = await player();
    const sa = await connected(a.cookie);
    const sb = await connected(b.cookie);
    join(sa.ws, 'cho-phien');
    const { selfId: aId } = await first(sa.inbox, 'welcome');
    join(sb.ws, 'cho-phien');
    await first(sb.inbox, 'welcome');
    sb.ws.send(JSON.stringify({ type: 'block', id: aId }));
    await until(() => sb.inbox.find((m) => m.type === 'notice' && m.code === 'blocked'));
    const rows = await t.db.select().from(playerBlocks).where(and(eq(playerBlocks.childId, b.childId), eq(playerBlocks.blockedChildId, a.childId)));
    expect(rows).toHaveLength(1);
  });
});

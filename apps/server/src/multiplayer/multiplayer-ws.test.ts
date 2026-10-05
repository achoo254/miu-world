// The multiplayer connection over a real socket: who may open one (session cookie + allowed origin), and that what
// others see of a player is her saved character, kept up to date when she saves new clothes.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { ServerWsMessage } from '@miu/schema/multiplayer';
import { FIXTURE_CONTENT, ORIGIN, createTestApp, fakeParent, type TestApp } from '../../test/test-app';
import { CharacterEvents } from '../character/character-events';
import { playerBlocks } from '../db/schema';
import { MultiplayerHub } from './multiplayer-hub';
import { dbMultiplayerStore, sessionAuthenticator } from './multiplayer-store';

let t: TestApp;
let server: Server;
let hub: MultiplayerHub;
let url: string;
const sockets: WebSocket[] = [];

beforeAll(async () => {
  const events = new CharacterEvents();
  t = await createTestApp(undefined, undefined, undefined, FIXTURE_CONTENT, { characterEvents: events });
  server = createServer(t.app);
  hub = new MultiplayerHub(server, {
    store: dbMultiplayerStore(t.db),
    authenticate: sessionAuthenticator(t.db, t.config, FIXTURE_CONTENT.consent.version, () => new Date()),
    allowedOrigins: t.config.allowedOrigins,
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
  const res = await request(t.app).post('/api/auth/register').set('Origin', ORIGIN).send(fakeParent()).expect(201);
  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = (setCookie?.[0] ?? '').split(';')[0] ?? '';
  if (!consent) return { cookie, childId: '' };
  await request(t.app).post('/api/consents').set('Origin', ORIGIN).set('Cookie', cookie).send({ policyVersion: FIXTURE_CONTENT.consent.version }).expect(201);
  const me = await request(t.app).get('/api/auth/me').set('Cookie', cookie).expect(200);
  return { cookie, childId: (me.body as { activePlayerId: string }).activePlayerId };
}

const dress = (cookie: string, body: object) => request(t.app).put('/api/character').set('Origin', ORIGIN).set('Cookie', cookie).send(body).expect(200);

/** Opens a socket; resolves with it once open, or with the HTTP status the upgrade was refused with. */
function open(headers: Record<string, string>): Promise<{ ws: WebSocket; inbox: ServerWsMessage[] } | { status: number }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { headers });
    sockets.push(ws);
    const inbox: ServerWsMessage[] = [];
    ws.on('message', (raw: Buffer) => inbox.push(JSON.parse(raw.toString()) as ServerWsMessage));
    ws.on('open', () => resolve({ ws, inbox }));
    ws.on('unexpected-response', (_req, res) => resolve({ status: res.statusCode ?? 0 }));
    ws.on('error', reject);
  });
}

async function connected(cookie: string) {
  const opened = await open({ Cookie: cookie, Origin: ORIGIN });
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

describe('opening a multiplayer connection', () => {
  it('refuses without a session, from another origin, and without a player (no consent yet)', async () => {
    const { cookie } = await player();
    expect(await open({ Origin: ORIGIN })).toEqual({ status: 401 });
    expect(await open({ Cookie: cookie, Origin: 'https://evil.example' })).toEqual({ status: 403 });
    expect(await open({ Cookie: cookie })).toEqual({ status: 403 });
    expect(await open({ Cookie: 'miu_session=forgedforgedforgedforged', Origin: ORIGIN })).toEqual({ status: 401 });
    const noConsent = await player(false);
    expect(await open({ Cookie: noConsent.cookie, Origin: ORIGIN })).toEqual({ status: 401 });
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
    expect(changed).toEqual({ type: 'appearance', id: selfId, appearance: { displayName: 'Bông', species: 'fox', outfit: ['hat-witch-mint', 'backpack-green'], pet: 'cun-con' } });
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

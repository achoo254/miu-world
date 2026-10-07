import { createServer, type Server } from 'node:http';
import type { Express } from 'express';
import request from 'supertest';
import type { RegisterRequest } from '@miu/schema/account';
import { fileURLToPath } from 'node:url';
import { createApp, type AppDeps } from '../src/app';
import { loadContentCatalog } from '../src/content/content-catalog';
import { loadConfig, type ServerConfig } from '../src/config';
import { createTestDb, type Db, type DbHandle } from '../src/db/client';
import { loadWorksheets } from '../src/worksheet/worksheet-builder';

export const ORIGIN = 'http://localhost:5173';
/** Low scrypt cost keeps the suite fast; production cost has its own test in secret-hashing.test.ts. */
const FAST_SCRYPT = { logN: 10, r: 8, p: 1 };
/**
 * Real content with fixture quests in place of the shipped ones, so tests do not change when content does. The
 * shipped characters tell shipped stories, so this catalogue has none (`STORY_CONTENT` has fixture ones).
 */
export const FIXTURE_CONTENT = loadContentCatalog({ questDir: fileURLToPath(new URL('./fixtures/quests', import.meta.url)), npcsDir: null, eventsDir: null });
/** `FIXTURE_CONTENT` with fixture characters and the chapters of their story (fixtures/npcs, fixtures/story-quests). */
export const STORY_CONTENT = loadContentCatalog({
  questDir: fileURLToPath(new URL('./fixtures/quests', import.meta.url)),
  extraQuestDir: fileURLToPath(new URL('./fixtures/story-quests', import.meta.url)),
  npcsDir: fileURLToPath(new URL('./fixtures/npcs', import.meta.url)),
  eventsDir: null,
});
/**
 * `FIXTURE_CONTENT` with a fixture event (fixtures/events) and its quest (fixtures/event-quests): its windows are
 * fixed dates, so tests set the server clock before, inside and after them.
 */
export const EVENT_CONTENT = loadContentCatalog({
  questDir: fileURLToPath(new URL('./fixtures/quests', import.meta.url)),
  extraQuestDir: fileURLToPath(new URL('./fixtures/event-quests', import.meta.url)),
  npcsDir: null,
  eventsDir: fileURLToPath(new URL('./fixtures/events', import.meta.url)),
});
/** Worksheets from a small fixture inventory, for the same reason. */
export const FIXTURE_WORKSHEETS = loadWorksheets(fileURLToPath(new URL('./fixtures/curriculum', import.meta.url)));

export type Agent = ReturnType<typeof request.agent>;

/**
 * Serves an app on 127.0.0.1 for supertest. Given a bare app, supertest calls `listen(0)`, which binds the
 * IPv6 wildcard, and then connects to 127.0.0.1: on macOS that bind succeeds on a port another program
 * already listens on at 127.0.0.1, and the request reaches that program instead (a stray 403, 404 or 503
 * failing whichever test was running). Binding 127.0.0.1 itself makes the kernel refuse such a port.
 */
export async function listenOnLoopback(app: Express, port = 0): Promise<Server> {
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  return server;
}

async function closeServer(server: Server): Promise<void> {
  // Supertest's keep-alive sockets would otherwise hold `close` open.
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

export interface TestApp {
  app: Express;
  /** The app listening on 127.0.0.1: what every test request goes to (see `listenOnLoopback`). */
  server: Server;
  db: Db;
  /** Closing it also closes the servers the test app opened. */
  handle: DbHandle;
  config: ServerConfig;
  content: typeof FIXTURE_CONTENT;
  /** Moves the injected clock forward. */
  advance(ms: number): void;
  /** A cookie-keeping client whose state-changing requests carry an allowed Origin. */
  agent(): Agent;
  /** A one-off request without cookies or Origin, for checks that set their own headers. */
  request(): ReturnType<typeof request>;
  /** An `agent()` for another app over the same database (other content, say), closed with this one. */
  agentFor(other: Express): Promise<Agent>;
}

export async function createTestApp(
  env: Record<string, string> = { NODE_ENV: 'test' },
  overrides: Partial<ServerConfig> = {},
  fetchImpl?: typeof fetch,
  content: typeof FIXTURE_CONTENT = FIXTURE_CONTENT,
  deps: Pick<AppDeps, 'characterEvents' | 'playerEvents' | 'online' | 'partyQuests' | 'turnFetch'> = {},
): Promise<TestApp> {
  const dbHandle = await createTestDb();
  // Every test agent shares one loopback IP, so the per-IP register cap is lifted; its own test lowers it.
  const config = { ...loadConfig(env), scrypt: FAST_SCRYPT, registerLimitPerHour: 10_000, googleLimitPer15Min: 10_000, passwordLogin: true, ...overrides };
  let offset = 0;
  const app = createApp({ config, db: dbHandle.db, content, worksheets: FIXTURE_WORKSHEETS, clock: () => new Date(Date.now() + offset), fetchImpl, ...deps });
  const server = await listenOnLoopback(app);
  const servers = [server];
  return {
    app,
    server,
    db: dbHandle.db,
    handle: {
      db: dbHandle.db,
      async close() {
        await Promise.all(servers.map(closeServer));
        await dbHandle.close();
      },
    },
    config,
    content,
    advance(ms) {
      offset += ms;
    },
    agent() {
      return request.agent(server).set('Origin', ORIGIN);
    },
    request() {
      return request(server);
    },
    async agentFor(other) {
      const otherServer = await listenOnLoopback(other);
      servers.push(otherServer);
      return request.agent(otherServer).set('Origin', ORIGIN);
    },
  };
}

export const TEST_PIN = '2468';

let seq = 0;
/** Unique fake parent; secret values use the scanner-safe `test-password` prefix. */
export function fakeParent(): RegisterRequest {
  seq += 1;
  return { email: `parent-${seq}-${Date.now()}@example.vn`, ['password']: `test-password-${seq}`, pin: TEST_PIN };
}

/** Registers, accepts consent and (optionally) creates one profile. Returns the logged-in agent. */
export async function parentWithChild(t: TestApp, withChild = true): Promise<{ agent: Agent; parent: RegisterRequest; childId: string }> {
  const agent = t.agent();
  const parent = fakeParent();
  await agent.post('/api/auth/register').send(parent).expect(201);
  await agent.post('/api/consents').send({ policyVersion: FIXTURE_CONTENT.consent.version }).expect(201);
  // Accepting the policy made the account's own (primary) player and selected it.
  const me = (await agent.get('/api/auth/me').expect(200)).body as { activePlayerId: string };
  return { agent, parent, childId: withChild ? me.activePlayerId : '' };
}

/** Signed in but without a player yet (policy not accepted), for "no active player" checks. */
export async function signedInWithoutPlayer(t: TestApp): Promise<Agent> {
  const agent = t.agent();
  await agent.post('/api/auth/register').send(fakeParent()).expect(201);
  return agent;
}

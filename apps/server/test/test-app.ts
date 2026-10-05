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
/** Real content with fixture quests in place of the shipped ones, so tests do not change when content does. */
export const FIXTURE_CONTENT = loadContentCatalog({ questDir: fileURLToPath(new URL('./fixtures/quests', import.meta.url)) });
/** Worksheets from a small fixture inventory, for the same reason. */
export const FIXTURE_WORKSHEETS = loadWorksheets(fileURLToPath(new URL('./fixtures/curriculum', import.meta.url)));

export type Agent = ReturnType<typeof request.agent>;

export interface TestApp {
  app: Express;
  db: Db;
  handle: DbHandle;
  config: ServerConfig;
  content: typeof FIXTURE_CONTENT;
  /** Moves the injected clock forward. */
  advance(ms: number): void;
  /** A cookie-keeping client whose state-changing requests carry an allowed Origin. */
  agent(): Agent;
}

export async function createTestApp(
  env: Record<string, string> = { NODE_ENV: 'test' },
  overrides: Partial<ServerConfig> = {},
  fetchImpl?: typeof fetch,
  content: typeof FIXTURE_CONTENT = FIXTURE_CONTENT,
  deps: Pick<AppDeps, 'characterEvents' | 'playerEvents' | 'online'> = {},
): Promise<TestApp> {
  const handle = await createTestDb();
  // Every test agent shares one loopback IP, so the per-IP register cap is lifted; its own test lowers it.
  const config = { ...loadConfig(env), scrypt: FAST_SCRYPT, registerLimitPerHour: 10_000, googleLimitPer15Min: 10_000, passwordLogin: true, ...overrides };
  let offset = 0;
  const app = createApp({ config, db: handle.db, content, worksheets: FIXTURE_WORKSHEETS, clock: () => new Date(Date.now() + offset), fetchImpl, ...deps });
  return {
    app,
    db: handle.db,
    handle,
    config,
    content,
    advance(ms) {
      offset += ms;
    },
    agent() {
      return request.agent(app).set('Origin', ORIGIN);
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

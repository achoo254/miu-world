import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig, type GoogleConfig } from '../config';
import * as t from '../db/schema';
import { TEST_PIN, createTestApp, fakeParent, type Agent, type TestApp } from '../../test/test-app';

const GOOGLE: GoogleConfig = {
  clientId: 'test-client-id.apps.googleusercontent.com',
  clientSecret: 'test-secret-google',
  redirectUri: 'http://localhost:4173/api/auth/google/callback',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
};

/** What the fake Google token endpoint will answer next, and what it received. */
const fake = {
  claims: {} as Record<string, unknown>,
  status: 200,
  lastBody: null as URLSearchParams | null,
};

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit) => {
  fake.lastBody = new URLSearchParams(String(init?.body ?? ''));
  const idToken = `${b64({ alg: 'RS256' })}.${b64(fake.claims)}.sig`;
  return new Response(JSON.stringify({ id_token: idToken, access_token: 'unused' }), { status: fake.status });
}) as typeof fetch;

let app: TestApp;
beforeAll(async () => {
  app = await createTestApp({ NODE_ENV: 'test' }, { google: GOOGLE }, fakeFetch);
});
afterAll(async () => {
  await app.handle.close();
});

let seq = 0;
function googleUser(over: Record<string, unknown> = {}): Record<string, unknown> {
  seq += 1;
  return { sub: `google-sub-${seq}`, email: `g${seq}@example.vn`, email_verified: true, aud: GOOGLE.clientId, iss: 'https://accounts.google.com', exp: Math.floor(Date.now() / 1000) + 600, ...over };
}

/** Runs /start and returns the authorize URL; the agent keeps the state cookie. */
async function start(agent: Agent, intent?: string): Promise<URL> {
  const res = await agent.get(`/api/auth/google/start${intent ? `?intent=${intent}` : ''}`).expect(303);
  return new URL(res.headers.location ?? '');
}

/** Full round trip as Google would do it: /start, then /callback with the same state and nonce. */
async function signInWithGoogle(agent: Agent, claims: Record<string, unknown>, tamper: (q: URLSearchParams, nonce: string) => void = () => undefined) {
  const authorize = await start(agent);
  const state = authorize.searchParams.get('state') ?? '';
  const nonce = authorize.searchParams.get('nonce') ?? '';
  fake.claims = { nonce, ...claims };
  const query = new URLSearchParams({ code: 'auth-code-1', state });
  tamper(query, nonce);
  return agent.get(`/api/auth/google/callback?${query.toString()}`);
}

beforeEach(() => {
  fake.status = 200;
  fake.lastBody = null;
});

describe('Google sign-in', () => {
  it('sends the parent to Google with PKCE, state, nonce and only the openid email scope', async () => {
    const url = await start(app.agent());
    expect(url.origin + url.pathname).toBe(GOOGLE.authUrl);
    const q = url.searchParams;
    expect(q.get('scope')).toBe('openid email');
    expect(q.get('client_id')).toBe(GOOGLE.clientId);
    expect(q.get('redirect_uri')).toBe(GOOGLE.redirectUri);
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('state')?.length).toBeGreaterThanOrEqual(40);
    expect(q.get('nonce')).toBeTruthy();
    expect(q.get('prompt')).toBe('select_account');
    expect((await start(app.agent(), 'reauth')).searchParams.get('prompt')).toBe('login');
  });

  it('creates the parent on first sign-in, stores only sub + email, and requires a PIN before the parent area', async () => {
    const agent = app.agent();
    const user = googleUser();
    const res = await signInWithGoogle(agent, user);
    expect(res.status).toBe(303);
    expect(res.headers.location).toBe('/');

    // The token request proved possession of the PKCE verifier and used the server-side secret.
    const body = fake.lastBody;
    const challenge = createHash('sha256').update(body?.get('code_verifier') ?? '').digest('base64url');
    expect(challenge).toHaveLength(43);
    expect(body?.get('client_secret')).toBe(GOOGLE.clientSecret);
    expect(body?.get('grant_type')).toBe('authorization_code');

    const me = (await agent.get('/api/auth/me').expect(200)).body;
    expect(me).toMatchObject({ parent: { email: user.email }, pinSet: false, parentGateOpen: false });
    const [row] = await app.db.select().from(t.parents).where(eq(t.parents.email, user.email as string));
    expect(row).toMatchObject({ googleSub: user.sub, passwordHash: null, pinHash: null });

    await agent.post('/api/consents').send({ policyVersion: app.content.consent.version }).expect(403, { error: 'parent-gate-closed' });
    const withPin = await agent.post('/api/auth/pin').send({ pin: TEST_PIN }).expect(200);
    expect(withPin.body).toMatchObject({ pinSet: true, parentGateOpen: true });
    await agent.post('/api/auth/pin').send({ pin: '9999' }).expect(409, { error: 'pin-already-set' });
    await agent.post('/api/consents').send({ policyVersion: app.content.consent.version }).expect(201);
  });

  it('signs the same Google account back into the same parent', async () => {
    const user = googleUser();
    await signInWithGoogle(app.agent(), user);
    const again = app.agent();
    expect((await signInWithGoogle(again, { ...user, email: String(user.email).toUpperCase() })).headers.location).toBe('/');
    const rows = await app.db.select().from(t.parents).where(eq(t.parents.googleSub, user.sub as string));
    expect(rows).toHaveLength(1);
  });

  it('links a verified email to an existing dev password account instead of duplicating it', async () => {
    const parent = fakeParent();
    await app.agent().post('/api/auth/register').send(parent).expect(201);
    await signInWithGoogle(app.agent(), googleUser({ email: parent.email }));
    const rows = await app.db.select().from(t.parents).where(eq(t.parents.email, parent.email));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.googleSub).toBeTruthy();
  });

  it('reopens a locked PIN when the parent signs in with Google again', async () => {
    const agent = app.agent();
    const user = googleUser();
    await signInWithGoogle(agent, user);
    await agent.post('/api/auth/pin').send({ pin: TEST_PIN }).expect(200);
    await agent.post('/api/parent-gate/lock').expect(200);
    for (let i = 0; i < 4; i += 1) await agent.post('/api/parent-gate/unlock').send({ pin: '0000' }).expect(401);
    await agent.post('/api/parent-gate/unlock').send({ pin: '0000' }).expect(423);
    await signInWithGoogle(agent, user);
    expect((await agent.get('/api/auth/me').expect(200)).body).toMatchObject({ pinLocked: false, parentGateOpen: true });
  });

  it.each([
    ['a different state', (q: URLSearchParams) => q.set('state', 'forged-state')],
    ['no code', (q: URLSearchParams) => q.delete('code')],
  ])('refuses a callback with %s', async (_name, tamper) => {
    const agent = app.agent();
    const res = await signInWithGoogle(agent, googleUser(), tamper);
    expect(res.headers.location).toBe('/login?error=google');
    await agent.get('/api/auth/me').expect(401);
  });

  it.each([
    ['wrong audience', { aud: 'someone-else' }],
    ['wrong issuer', { iss: 'https://evil.example' }],
    ['expired token', { exp: Math.floor(Date.now() / 1000) - 5 }],
    ['unverified email', { email_verified: false }],
    ['wrong nonce', { nonce: 'replayed-nonce' }],
  ])('refuses an ID token with %s', async (_name, bad) => {
    const agent = app.agent();
    const authorize = await start(agent);
    const state = authorize.searchParams.get('state') ?? '';
    fake.claims = { ...googleUser(), nonce: authorize.searchParams.get('nonce'), ...bad };
    const res = await agent.get(`/api/auth/google/callback?code=c&state=${state}`);
    expect(res.headers.location).toBe('/login?error=google');
    await agent.get('/api/auth/me').expect(401);
  });

  it('refuses a replayed state and a failed token exchange', async () => {
    const agent = app.agent();
    const authorize = await start(agent);
    const state = authorize.searchParams.get('state') ?? '';
    const cookie = `miu_oauth_state=${state}`;
    fake.claims = { ...googleUser(), nonce: authorize.searchParams.get('nonce') };
    fake.status = 400;
    const failed = await app.agent().get(`/api/auth/google/callback?code=c&state=${state}`).set('Cookie', cookie);
    expect(failed.headers.location).toBe('/login?error=google');
    fake.status = 200;
    const replay = await app.agent().get(`/api/auth/google/callback?code=c&state=${state}`).set('Cookie', cookie);
    expect(replay.headers.location).toBe('/login?error=google');
  });

  it('reports Google as unavailable when it is not configured', async () => {
    const bare = await createTestApp();
    try {
      const res = await bare.agent().get('/api/auth/google/start').expect(303);
      expect(res.headers.location).toBe('/login?error=google-unavailable');
    } finally {
      await bare.handle.close();
    }
  });
});

describe('dev/test password sign-in', () => {
  it('does not exist when switched off', async () => {
    const off = await createTestApp({ NODE_ENV: 'test' }, { passwordLogin: false });
    try {
      await off.agent().post('/api/auth/register').send(fakeParent()).expect(404);
      await off.agent().post('/api/auth/login').send(fakeParent()).expect(404);
    } finally {
      await off.handle.close();
    }
  });

  it('can never be enabled in production, nor can the Google endpoints be redirected', () => {
    const prod = {
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://miu.example',
      DATABASE_URL: 'postgres://db.invalid/miu',
      GOOGLE_CLIENT_ID: GOOGLE.clientId,
      GOOGLE_CLIENT_SECRET: GOOGLE.clientSecret,
      GOOGLE_REDIRECT_URI: 'https://miu.example/api/auth/google/callback',
    };
    expect(loadConfig(prod).passwordLogin).toBe(false);
    expect(() => loadConfig({ ...prod, PASSWORD_LOGIN: '1' })).toThrow(/PASSWORD_LOGIN/);
    expect(() => loadConfig({ ...prod, GOOGLE_TOKEN_URL: 'https://evil.example/token' })).toThrow(/test-only/);
    expect(() => loadConfig({ ...prod, GOOGLE_CLIENT_ID: undefined })).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('does not let a password log into a Google-only account', async () => {
    const agent = app.agent();
    const user = googleUser();
    await signInWithGoogle(agent, user);
    await app.agent().post('/api/auth/login').send({ email: user.email, ['password']: 'test-password-guess' }).expect(401, { error: 'invalid-credentials' });
  });
});

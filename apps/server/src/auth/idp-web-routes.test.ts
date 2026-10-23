import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../config';
import * as t from '../db/schema';
import { TEST_PIN, createTestApp, fakeParent, type Agent, type TestApp } from '../../test/test-app';
import { FAKE_ISSUER, FakeIdp, IDP_ENV, WEB_CLIENT } from '../../test/fake-idp';
import { accountForIdentity } from './idp-account-link';
import { createSession } from './session-store';

const idp = new FakeIdp();
let app: TestApp;
beforeAll(async () => {
  app = await createTestApp(IDP_ENV, {}, idp.fetch);
});
afterAll(async () => {
  await app.handle.close();
});
beforeEach(() => {
  idp.status = 200;
  idp.lastTokenRequest = null;
});

let seq = 0;
function person(over: Record<string, unknown> = {}): Record<string, unknown> {
  seq += 1;
  return { sub: `idp-sub-${seq}-${Date.now()}`, email: `p${seq}-${Date.now()}@example.vn`, email_verified: true, sid: `idp-sid-${seq}`, ...over };
}

async function start(agent: Agent, intent?: string): Promise<URL> {
  const res = await agent.get(`/api/auth/start${intent ? `?intent=${intent}` : ''}`).expect(303);
  return new URL(res.headers.location ?? '');
}

/** The whole round trip as the IdP does it: /start, then /callback with the same state and the request's nonce. */
async function signIn(agent: Agent, claims: Record<string, unknown>, options: { intent?: string; state?: string; code?: string | null } = {}) {
  const authorize = await start(agent, options.intent);
  idp.claims = { nonce: authorize.searchParams.get('nonce'), ...claims };
  const query = new URLSearchParams({ state: options.state ?? authorize.searchParams.get('state') ?? '' });
  if (options.code !== null) query.set('code', options.code ?? 'auth-code');
  const res = await agent.get(`/api/auth/callback?${query.toString()}`);
  return { res, authorize };
}

const parentByEmail = async (email: unknown) => (await app.db.select().from(t.parents).where(eq(t.parents.email, String(email))))[0];
const linkOf = async (parentId: string) => (await app.db.select().from(t.parentIdpLinks).where(eq(t.parentIdpLinks.parentId, parentId)))[0];

describe('signing in through the account service (web)', () => {
  it('sends the parent to the IdP with PKCE, state, nonce and only the openid email scope; reauth asks for a fresh login', async () => {
    const url = await start(app.agent());
    expect(url.origin + url.pathname).toBe(`${FAKE_ISSUER}/auth`);
    const q = url.searchParams;
    expect(Object.fromEntries(q)).toMatchObject({ client_id: WEB_CLIENT.id, redirect_uri: WEB_CLIENT.redirect, response_type: 'code', scope: 'openid email', code_challenge_method: 'S256' });
    expect(q.get('state')?.length).toBeGreaterThanOrEqual(40);
    expect(q.get('nonce')).toBeTruthy();
    expect(q.has('prompt')).toBe(false);
    const reauth = (await start(app.agent(), 'reauth')).searchParams;
    expect([reauth.get('prompt'), reauth.get('max_age')]).toEqual(['login', '0']);
  });

  it('creates a new empty account for an unknown verified email, stores the link, and redeems the code with the secret and verifier', async () => {
    const agent = app.agent();
    const user = person();
    const { res, authorize } = await signIn(agent, user);
    expect(res.headers.location).toBe('/');
    const token = idp.lastTokenRequest;
    expect(createHash('sha256').update(token?.body.get('code_verifier') ?? '').digest('base64url')).toBe(authorize.searchParams.get('code_challenge'));
    expect(token?.authorization).toBe(`Basic ${Buffer.from(`${WEB_CLIENT.id}:${WEB_CLIENT.secret}`).toString('base64')}`);
    expect(token?.body.get('redirect_uri')).toBe(WEB_CLIENT.redirect);
    const parent = await parentByEmail(user.email);
    expect(parent).toMatchObject({ googleSub: null, passwordHash: null, pinHash: null });
    expect(await linkOf(parent?.id ?? '')).toMatchObject({ issuer: FAKE_ISSUER, subject: user.sub });
    expect((await agent.get('/api/auth/me').expect(200)).body).toMatchObject({ parent: { email: user.email }, pinSet: false, parentGateOpen: true, players: [] });
  });

  it('signs an already linked identity back into the same account, whatever email it now has', async () => {
    const user = person();
    await signIn(app.agent(), user);
    const first = await parentByEmail(user.email);
    const again = app.agent();
    expect((await signIn(again, { ...user, email: 'changed@example.vn' })).res.headers.location).toBe('/');
    expect((await again.get('/api/auth/me').expect(200)).body).toMatchObject({ parent: { id: first?.id, email: user.email } });
  });

  const legacyParent = async (email: unknown, googleSub: string) =>
    (await app.db.insert(t.parents).values({ id: crypto.randomUUID(), email: String(email), googleSub, pinHash: 'x' }).returning())[0]?.id ?? '';

  it('links a parent of the former Google sign-in only through that same Google account at the IdP', async () => {
    const user = person({ amr: ['fed', 'google'], google_sub: 'google-sub-legacy' });
    const legacyId = await legacyParent(user.email, 'google-sub-legacy');
    // Same email, but through GitHub, or through another Google account: refused, nothing linked.
    for (const other of [{ amr: ['fed', 'github'] }, { google_sub: 'google-sub-other' }]) {
      expect((await signIn(app.agent(), { ...user, ...other })).res.headers.location).toBe('/login?error=idp-google-mismatch');
    }
    expect(await linkOf(legacyId)).toBeUndefined();
    const agent = app.agent();
    expect((await signIn(agent, user)).res.headers.location).toBe('/');
    expect(await linkOf(legacyId)).toMatchObject({ subject: user.sub });
    expect(await parentByEmail(user.email)).toMatchObject({ id: legacyId, googleSub: 'google-sub-legacy', pinHash: 'x' });
    // A PIN exists: signing in does not open the parent area.
    expect((await agent.get('/api/auth/me').expect(200)).body).toMatchObject({ parent: { id: legacyId }, pinSet: true, parentGateOpen: false });
  });

  it('never links or creates an account on an unverified email', async () => {
    const existing = person();
    await app.db.insert(t.parents).values({ id: crypto.randomUUID(), email: String(existing.email) });
    const agent = app.agent();
    const res = (await signIn(agent, { ...person(), email: existing.email, email_verified: false })).res;
    expect(res.headers.location).toBe('/login?error=idp-email-unverified');
    expect(await linkOf((await parentByEmail(existing.email))?.id ?? '')).toBeUndefined();
    const stranger = person({ email_verified: false });
    expect((await signIn(app.agent(), stranger)).res.headers.location).toBe('/login?error=idp-email-unverified');
    expect(await parentByEmail(stranger.email)).toBeUndefined();
    await agent.get('/api/auth/me').expect(401);
  });

  it('refuses a second identity with the email of an account already linked to another one', async () => {
    const user = person();
    await signIn(app.agent(), user);
    const res = (await signIn(app.agent(), person({ email: user.email }))).res;
    expect(res.headers.location).toBe('/login?error=idp-conflict');
    expect((await app.db.select().from(t.parentIdpLinks).where(eq(t.parentIdpLinks.subject, String(user.sub)))).length).toBe(1);
  });

  it('links a dev password account by verified email, dropping its password, PIN and sessions', async () => {
    const parent = fakeParent();
    const squatter = app.agent();
    await squatter.post('/api/auth/register').send(parent).expect(201);
    await signIn(app.agent(), person({ email: parent.email }));
    expect(await parentByEmail(parent.email)).toMatchObject({ passwordHash: null, pinHash: null });
    await squatter.get('/api/auth/me').expect(401);
    await app.agent().post('/api/auth/login').send(parent).expect(401);
  });

  it('does not let a plain sign-in skip a PIN, and reopens a locked PIN only after a fresh re-authentication', async () => {
    const agent = app.agent();
    const user = person();
    await signIn(agent, user);
    await agent.post('/api/auth/pin').send({ pin: TEST_PIN }).expect(200);
    await agent.post('/api/parent-gate/lock').expect(200);
    for (let i = 0; i < 4; i += 1) await agent.post('/api/parent-gate/unlock').send({ pin: '0000' }).expect(401);
    await agent.post('/api/parent-gate/unlock').send({ pin: '0000' }).expect(423);
    const nowS = Math.floor(Date.now() / 1000);
    const reauth = ['fed', 'google', 'reauth'];
    await signIn(agent, { ...user, auth_time: nowS - 3600 });
    expect((await agent.get('/api/auth/me').expect(200)).body).toMatchObject({ pinLocked: true, parentGateOpen: false });
    // Stale, or fresh but not proven by a provider that asked again (amr without "reauth", e.g. GitHub): refused.
    expect((await signIn(agent, { ...user, auth_time: nowS - 3600, amr: reauth }, { intent: 'reauth' })).res.headers.location).toBe('/login?error=idp-reauth');
    expect((await signIn(agent, { ...user, auth_time: nowS - 5, amr: ['fed', 'github'] }, { intent: 'reauth' })).res.headers.location).toBe('/login?error=idp-reauth');
    expect((await agent.get('/api/auth/me').expect(200)).body).toMatchObject({ pinLocked: true });
    expect((await signIn(agent, { ...user, auth_time: nowS - 5, amr: reauth }, { intent: 'reauth' })).res.headers.location).toBe('/');
    expect((await agent.get('/api/auth/me').expect(200)).body).toMatchObject({ pinLocked: false, parentGateOpen: true });
  });

  it.each([
    ['another audience', { aud: 'someone-else' }],
    ['another issuer', { iss: 'https://evil.example' }],
    ['an expired token', { exp: Math.floor(Date.now() / 1000) - 120 }],
    ['another nonce', { nonce: 'replayed-nonce-value' }],
    ['no subject', { sub: '' }],
  ])('refuses an ID token with %s', async (_name, bad) => {
    const agent = app.agent();
    const authorize = await start(agent);
    idp.claims = { ...person(), nonce: authorize.searchParams.get('nonce'), ...bad };
    const res = await agent.get(`/api/auth/callback?code=c&state=${authorize.searchParams.get('state') ?? ''}`);
    expect(res.headers.location).toBe('/login?error=idp');
    await agent.get('/api/auth/me').expect(401);
  });

  it('refuses an email that userinfo gives for another person', async () => {
    idp.userinfoSub = 'someone-else';
    try {
      expect((await signIn(app.agent(), person())).res.headers.location).toBe('/login?error=idp');
    } finally {
      idp.userinfoSub = null;
    }
  });

  it('refuses a bad state, no code, a failed exchange and a replayed state', async () => {
    expect((await signIn(app.agent(), person(), { state: 'forged-state' })).res.headers.location).toBe('/login?error=idp');
    expect((await signIn(app.agent(), person(), { code: null })).res.headers.location).toBe('/login?error=idp');
    idp.status = 400;
    const agent = app.agent();
    const { authorize } = await signIn(agent, person());
    idp.status = 200;
    // The callback cleared the state cookie: the same state cannot be replayed from this browser.
    const replay = await agent.get(`/api/auth/callback?code=c&state=${authorize.searchParams.get('state') ?? ''}`);
    expect(replay.headers.location).toBe('/login?error=idp');
  });

  it('reports sign-in as unavailable when it is not configured', async () => {
    const bare = await createTestApp();
    try {
      expect((await bare.agent().get('/api/auth/start').expect(303)).headers.location).toBe('/login?error=idp-unavailable');
    } finally {
      await bare.handle.close();
    }
  });
});

describe('linking under concurrent first sign-ins', () => {
  it('signs both into the same account instead of reporting a conflict', async () => {
    const user = person();
    const parentId = crypto.randomUUID();
    await app.db.insert(t.parents).values({ id: parentId, email: String(user.email) });
    const identity = { sub: String(user.sub), email: String(user.email), emailVerified: true, authTime: null, sid: null, amr: ['fed', 'google'], googleSub: null };
    const results = await Promise.all([1, 2, 3].map(() => accountForIdentity(app.db, FAKE_ISSUER, identity, new Date())));
    expect(results.map((r) => (r.ok ? r.parentId : r.reason))).toEqual([parentId, parentId, parentId]);
  });
});

describe('back-channel logout from the IdP', () => {
  const post = (body: string) => app.request().post('/api/auth/backchannel-logout').type('form').send(body);

  it('ends the web sessions of the IdP session, without an Origin, and leaves the app sessions alone', async () => {
    const agent = app.agent();
    const user = person();
    await signIn(agent, user);
    const parentId = (await parentByEmail(user.email))?.id ?? '';
    const appSession = await createSession(app.db, parentId, new Date(), { openParentGate: false, kind: 'native' });
    const res = await post(`logout_token=${idp.logoutToken({ sid: user.sid, sub: user.sub })}`).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    await agent.get('/api/auth/me').expect(401);
    await app.request().get('/api/auth/me').set('Authorization', `Bearer ${appSession.token}`).expect(200);
  });

  it('ends every web session of the account when the token names only the subject', async () => {
    const user = person();
    const [a, b] = [app.agent(), app.agent()];
    await signIn(a, user);
    await signIn(b, { ...user, sid: 'another-sid' });
    await post(`logout_token=${idp.logoutToken({ sub: user.sub })}`).expect(200);
    await a.get('/api/auth/me').expect(401);
    await b.get('/api/auth/me').expect(401);
  });

  it('has its own wide limit, not the sign-in one', async () => {
    const tight = await createTestApp(IDP_ENV, { signInLimitPer15Min: 1 }, idp.fetch);
    try {
      for (let i = 0; i < 5; i += 1) {
        await tight.request().post('/api/auth/backchannel-logout').type('form').send(`logout_token=${idp.logoutToken({ sid: `none-${i}` })}`).expect(200);
      }
    } finally {
      await tight.handle.close();
    }
  });

  it.each([
    ['a stranger key', () => idp.logoutToken({ sid: 's' }, 'stranger')],
    ['alg none', () => idp.logoutToken({ sid: 's' }, 'none')],
    ['a nonce', () => idp.logoutToken({ sid: 's', nonce: 'n' })],
    ['no event', () => idp.logoutToken({ sid: 's', events: {} })],
    ['another audience', () => idp.logoutToken({ sid: 's', aud: 'chat-web' })],
    ['an old iat', () => idp.logoutToken({ sid: 's', iat: Math.floor(Date.now() / 1000) - 3600 })],
    ['neither sid nor sub', () => idp.logoutToken({})],
  ])('refuses a logout token with %s', async (_name, token) => {
    const agent = app.agent();
    const user = person({ sid: 's' });
    await signIn(agent, user);
    await post(`logout_token=${token()}`).expect(400);
    await agent.get('/api/auth/me').expect(200);
  });
});

describe('sign-in configuration', () => {
  const prod = { NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://miu.example', DATABASE_URL: 'postgres://db.invalid/miu', OIDC_WEB_CLIENT_SECRET: WEB_CLIENT.secret, OIDC_REDIRECT_URI: 'https://miu.example/api/auth/callback' };

  it('needs the web client in production, on https, with TLS checks on', () => {
    expect(loadConfig(prod).idp).toMatchObject({ issuer: 'https://auth.hoandat.com', web: { clientId: 'miu-web' }, mobile: { clientId: 'miu-mobile', redirectUri: 'com.hoandat.miu:/auth/callback' } });
    expect(() => loadConfig({ ...prod, OIDC_WEB_CLIENT_SECRET: undefined })).toThrow(/OIDC_WEB_CLIENT_SECRET/);
    expect(() => loadConfig({ ...prod, OIDC_ISSUER: 'http://127.0.0.1:4500' })).toThrow(/OIDC_ISSUER/);
    expect(() => loadConfig({ ...prod, NODE_TLS_REJECT_UNAUTHORIZED: '0' })).toThrow(/NODE_TLS_REJECT_UNAUTHORIZED/);
    expect(() => loadConfig({ ...prod, OIDC_WEB_CLIENT_SECRET: 'short' })).toThrow(/OIDC_WEB_CLIENT_SECRET/);
  });

  it('lets a plain-http IdP run only on loopback outside production, and needs the secret and redirect together', () => {
    expect(loadConfig({ ...IDP_ENV, OIDC_ISSUER: 'http://127.0.0.1:8788' }).idp?.issuer).toBe('http://127.0.0.1:8788');
    expect(() => loadConfig({ ...IDP_ENV, OIDC_ISSUER: 'http://evil.example' })).toThrow(/OIDC_ISSUER/);
    expect(() => loadConfig({ NODE_ENV: 'test', OIDC_REDIRECT_URI: WEB_CLIENT.redirect })).toThrow(/go together/);
    expect(loadConfig({ NODE_ENV: 'test' }).idp).toBeNull();
  });

  it('keeps password sign-in out of production', () => {
    expect(loadConfig(prod).passwordLogin).toBe(false);
    expect(() => loadConfig({ ...prod, PASSWORD_LOGIN: '1' })).toThrow(/PASSWORD_LOGIN/);
  });
});

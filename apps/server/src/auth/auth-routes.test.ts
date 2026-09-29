import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { consents } from '../db/schema';
import { ORIGIN, TEST_PIN, createTestApp, fakeParent, parentWithChild, type TestApp } from '../../test/test-app';

const DAY = 24 * 60 * 60 * 1000;

let t: TestApp;
beforeAll(async () => {
  t = await createTestApp();
});
afterAll(async () => {
  await t.handle.close();
});

function sessionCookie(res: request.Response): string {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const found = cookies.find((c) => c.includes('miu_session='));
  if (!found) throw new Error('no session cookie');
  return found;
}

describe('register / login / logout', () => {
  it('registers, sets an httpOnly lax cookie and never returns secrets', async () => {
    const agent = t.agent();
    const parent = fakeParent();
    const res = await agent.post('/api/auth/register').send({ ...parent, email: parent.email.toUpperCase() }).expect(201);
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/^miu_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/);
    expect(res.body.parent.email).toBe(parent.email);
    expect(res.body).toMatchObject({ consentAccepted: false, activeChildId: null, parentGateOpen: true, pinLocked: false });
    const token = cookie.split(';')[0]?.split('=')[1] ?? '';
    for (const body of [res.text, (await agent.get('/api/auth/me').expect(200)).text]) {
      expect(body).not.toContain('scrypt$');
      expect(body).not.toContain(token);
      expect(body).not.toMatch(/hash/i);
    }
  });

  it('rejects a duplicate email and invalid input', async () => {
    const parent = fakeParent();
    await t.agent().post('/api/auth/register').send(parent).expect(201);
    await t.agent().post('/api/auth/register').send(parent).expect(409, { error: 'email-taken' });
    await t.agent().post('/api/auth/register').send({ ...fakeParent(), pin: '12' }).expect(400, { error: 'invalid-input' });
    await t.agent().post('/api/auth/register').send({ ...fakeParent(), ['password']: 'short' }).expect(400);
  });

  it('gives the same answer for an unknown email and a wrong password', async () => {
    const parent = fakeParent();
    await t.agent().post('/api/auth/register').send(parent).expect(201);
    const wrong = await t.agent().post('/api/auth/login').send({ email: parent.email, ['password']: 'test-password-wrong' });
    const unknown = await t.agent().post('/api/auth/login').send({ email: `nobody-${parent.email}`, ['password']: 'test-password-wrong' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('rotates the session token on login and revokes it on logout', async () => {
    const parent = fakeParent();
    const agent = t.agent();
    const first = sessionCookie(await agent.post('/api/auth/register').send(parent).expect(201));
    const second = sessionCookie(await agent.post('/api/auth/login').send(parent).expect(200));
    expect(second.split(';')[0]).not.toBe(first.split(';')[0]);
    await request(t.app).get('/api/auth/me').set('Cookie', first.split(';')[0] ?? '').expect(401);
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
    await request(t.app).get('/api/auth/me').set('Cookie', second.split(';')[0] ?? '').expect(401);
  });

  it('expires sessions after 7 idle days and 30 days absolute', async () => {
    const idle = t.agent();
    await idle.post('/api/auth/register').send(fakeParent()).expect(201);
    t.advance(8 * DAY);
    await idle.get('/api/auth/me').expect(401);

    const active = t.agent();
    await active.post('/api/auth/register').send(fakeParent()).expect(201);
    // Active every 6 days (never idle): alive at day 29, gone past the 30-day absolute limit.
    for (const step of [6, 6, 6, 6, 5]) {
      t.advance(step * DAY);
      await active.get('/api/auth/me').expect(200);
    }
    t.advance(2 * DAY);
    await active.get('/api/auth/me').expect(401);
  });
});

describe('CSRF origin check', () => {
  it('rejects state-changing requests with a missing or foreign Origin', async () => {
    await request(t.app).post('/api/auth/register').send(fakeParent()).expect(403, { error: 'forbidden-origin' });
    await request(t.app)
      .post('/api/auth/register')
      .set('Origin', 'https://evil.example')
      .send(fakeParent())
      .expect(403, { error: 'forbidden-origin' });
    await request(t.app).get('/api/health').expect(200);
  });
});

describe('rate limiting', () => {
  it('throttles repeated logins for the same email', async () => {
    const parent = fakeParent();
    await t.agent().post('/api/auth/register').send(parent).expect(201);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await t.agent().post('/api/auth/login').send({ email: parent.email, ['password']: 'test-password-wrong' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('register rate limit', () => {
  it('caps account creation per IP', async () => {
    const limited = await createTestApp({ NODE_ENV: 'test' }, { registerLimitPerHour: 2 });
    try {
      await limited.agent().post('/api/auth/register').send(fakeParent()).expect(201);
      await limited.agent().post('/api/auth/register').send(fakeParent()).expect(201);
      await limited.agent().post('/api/auth/register').send(fakeParent()).expect(429, { error: 'rate-limited' });
    } finally {
      await limited.handle.close();
    }
  });
});

describe('parent gate (PIN)', () => {
  it('guards the parent area and reopens for 15 minutes with the right PIN', async () => {
    const { agent } = await parentWithChild(t, false);
    await agent.post('/api/parent-gate/lock').expect(200);
    await agent.post('/api/children').send({ displayName: 'Thỏ Bông' }).expect(403, { error: 'parent-gate-closed' });
    const unlocked = await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(200);
    expect(unlocked.body.parentGateOpen).toBe(true);
    await agent.post('/api/children').send({ displayName: 'Thỏ Bông' }).expect(201);
    t.advance(16 * 60 * 1000);
    await agent.post('/api/children').send({ displayName: 'Cáo Nhỏ' }).expect(403, { error: 'parent-gate-closed' });
  });

  it('locks the PIN after 5 wrong tries until a password login', async () => {
    const { agent, parent } = await parentWithChild(t, false);
    await agent.post('/api/parent-gate/lock').expect(200);
    for (let i = 0; i < 4; i += 1) {
      await agent.post('/api/parent-gate/unlock').send({ pin: '0000' }).expect(401, { error: 'invalid-pin' });
    }
    await agent.post('/api/parent-gate/unlock').send({ pin: '0000' }).expect(423, { error: 'pin-locked' });
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(423, { error: 'pin-locked' });
    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body).toMatchObject({ pinLocked: true, parentGateOpen: false });
    await agent.post('/api/children').send({ displayName: 'Cáo Nhỏ' }).expect(403);

    const relogged = await agent.post('/api/auth/login').send(parent).expect(200);
    expect(relogged.body).toMatchObject({ pinLocked: false, parentGateOpen: true });
  });

  it('cannot be out-guessed by parallel requests: at most 5 PIN checks before the lock', async () => {
    const { agent } = await parentWithChild(t, false);
    await agent.post('/api/parent-gate/lock').expect(200);
    const results = await Promise.all(Array.from({ length: 9 }, () => agent.post('/api/parent-gate/unlock').send({ pin: '0000' })));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 401)).toHaveLength(4);
    expect(statuses.filter((s) => s === 423)).toHaveLength(5);
    await agent.post('/api/parent-gate/unlock').send({ pin: TEST_PIN }).expect(423);
  });

  it('records one consent row per policy version', async () => {
    const agent = t.agent();
    const res = await agent.post('/api/auth/register').send(fakeParent()).expect(201);
    await agent.post('/api/consents').send({ policyVersion: t.content.consent.version }).expect(201);
    await agent.post('/api/consents').send({ policyVersion: t.content.consent.version }).expect(201);
    const rows = await t.db.select().from(consents).where(eq(consents.parentId, res.body.parent.id as string));
    expect(rows).toHaveLength(1);
  });

  it('requires the gate and the current policy version for consent', async () => {
    const agent = t.agent();
    await agent.post('/api/auth/register').send(fakeParent()).expect(201);
    await agent.post('/api/consents').send({ policyVersion: 'draft-0' }).expect(400, { error: 'policy-version-mismatch' });
    await agent.post('/api/parent-gate/lock').expect(200);
    await agent.post('/api/consents').send({ policyVersion: t.content.consent.version }).expect(403);
    const policy = await agent.get('/api/consents/policy').expect(200);
    expect(policy.body).toMatchObject({ version: t.content.consent.version, requiresLegalReview: true });
  });
});

describe('production cookie', () => {
  it('always uses __Host- with Secure in production', async () => {
    const prod = await createTestApp(
      {
        NODE_ENV: 'production',
        ALLOWED_ORIGINS: ORIGIN,
        DATABASE_URL: 'postgres://db.invalid/unused',
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-secret-google',
        GOOGLE_REDIRECT_URI: 'https://miu.example/api/auth/google/callback',
      },
      // Test-only override: the cookie flags are shared by every sign-in; password is the easy way in here.
      { passwordLogin: true },
    );
    try {
      const res = await prod.agent().post('/api/auth/register').send(fakeParent()).expect(201);
      const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).join('\n');
      expect(cookie).toMatch(/^__Host-miu_session=/);
      expect(cookie).toMatch(/; Secure/);
      expect(cookie).toMatch(/; HttpOnly/);
      expect(cookie).toMatch(/; Path=\//);
      expect(cookie).not.toMatch(/Domain=/i);
    } finally {
      await prod.handle.close();
    }
  });
});

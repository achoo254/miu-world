import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, parentWithChild, signedInWithoutPlayer, type TestApp } from '../../test/test-app';
import { CLOUDFLARE_TURN_API, IceServerSource, STUN_ONLY, TURN_CACHE_MS, TURN_TTL_S } from './ice-servers';

const KEY_ID = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
const TOKEN = 'test-turn-token-0123456789abcdef';
const TURN = { keyId: KEY_ID, apiToken: TOKEN };

/** What Cloudflare answers: a STUN entry and a TURN entry with credentials (a port-53 URL among them). */
const CLOUDFLARE = {
  iceServers: [
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
    {
      urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'],
      username: 'test-user-0001',
      credential: 'test-credential-0001',
    },
  ],
};

function fakeCloudflare(answer: () => Response | Promise<Response> = () => Response.json(CLOUDFLARE, { status: 201 })) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return answer();
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('voice relay credentials', () => {
  it('are STUN only without a key, and Cloudflare is never asked', async () => {
    const cf = fakeCloudflare();
    const source = new IceServerSource({ turn: null, fetchImpl: cf.impl });
    expect(await source.servers()).toEqual(STUN_ONLY);
    expect(cf.calls).toHaveLength(0);
  });

  it('come from Cloudflare with the key, without port 53, and are kept a while for everyone', async () => {
    const cf = fakeCloudflare();
    let now = 1_000_000;
    const source = new IceServerSource({ turn: TURN, fetchImpl: cf.impl, now: () => now });
    const [first, second] = await Promise.all([source.servers(), source.servers()]);
    expect(cf.calls).toHaveLength(1);
    expect(first).toEqual(second);
    const call = cf.calls[0];
    expect(call?.url).toBe(`${CLOUDFLARE_TURN_API}/${KEY_ID}/credentials/generate-ice-servers`);
    expect(call?.init?.method).toBe('POST');
    expect((call?.init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(String(call?.init?.body))).toEqual({ ttl: TURN_TTL_S });
    expect(first.iceServers).toEqual([
      { urls: ['stun:stun.cloudflare.com:3478'] },
      { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'test-user-0001', credential: 'test-credential-0001' },
    ]);
    expect(first.ttlSeconds).toBe(TURN_TTL_S);
    now += 5 * 60_000;
    expect((await source.servers()).ttlSeconds).toBe(TURN_TTL_S - 300);
    expect(cf.calls).toHaveLength(1);
    now += TURN_CACHE_MS;
    await source.servers();
    expect(cf.calls).toHaveLength(2);
  });

  it('fall back to STUN when Cloudflare fails, logging neither the token nor the key, and wait before asking again', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let status = 500;
    const cf = fakeCloudflare(() => new Response('{"error":"nope"}', { status }));
    let now = 1_000_000;
    const source = new IceServerSource({ turn: TURN, fetchImpl: cf.impl, now: () => now });
    expect(await source.servers()).toEqual(STUN_ONLY);
    expect(await source.servers()).toEqual(STUN_ONLY);
    expect(cf.calls).toHaveLength(1);
    const logged = JSON.stringify(errors.mock.calls);
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(KEY_ID);
    now += 61_000;
    status = 201;
    const bad = new IceServerSource({ turn: TURN, fetchImpl: fakeCloudflare(() => Response.json({ iceServers: 'x' })).impl });
    expect(await bad.servers()).toEqual(STUN_ONLY);
    const thrown = new IceServerSource({
      turn: TURN,
      fetchImpl: (async () => {
        throw new TypeError('network down');
      }) as unknown as typeof fetch,
    });
    expect(await thrown.servers()).toEqual(STUN_ONLY);
  });
});

describe('GET /api/voice/ice-servers', () => {
  let app: TestApp;
  let stunApp: TestApp;
  const cf = fakeCloudflare();
  beforeAll(async () => {
    app = await createTestApp(undefined, { turn: TURN }, undefined, undefined, { turnFetch: cf.impl });
    stunApp = await createTestApp();
  });
  afterAll(async () => {
    await app.handle.close();
    await stunApp.handle.close();
  });

  it('gives a signed-in player the relay servers, never cached on the way', async () => {
    const { agent } = await parentWithChild(app);
    const res = await agent.get('/api/voice/ice-servers').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.iceServers).toHaveLength(2);
    expect(res.body.iceServers[1]).toMatchObject({ username: 'test-user-0001' });
  });

  it('refuses anyone not signed in, or without a player to play as', async () => {
    await app.request().get('/api/voice/ice-servers').expect(401);
    const noPlayer = await signedInWithoutPlayer(app);
    const res = await noPlayer.get('/api/voice/ice-servers');
    expect([401, 403]).toContain(res.status);
    expect(JSON.stringify(res.body)).not.toContain('turn:');
  });

  it('holds back a player who asks too often', async () => {
    const { agent } = await parentWithChild(app);
    for (let i = 0; i < 30; i += 1) await agent.get('/api/voice/ice-servers').expect(200);
    await agent.get('/api/voice/ice-servers').expect(429, { error: 'rate-limited' });
    // Another player is not held back by her.
    const other = await parentWithChild(app);
    await other.agent.get('/api/voice/ice-servers').expect(200);
    app.advance(10 * 60_000 + 1);
    await agent.get('/api/voice/ice-servers').expect(200);
  });

  it('is STUN only on a server without a key', async () => {
    const { agent } = await parentWithChild(stunApp);
    const res = await agent.get('/api/voice/ice-servers').expect(200);
    expect(res.body).toEqual(STUN_ONLY);
  });
});

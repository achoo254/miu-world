import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { NativeSignInError, authorizationUrl, callbackCode, pkcePair, redirectScheme, signInNative, type NativeSignInDeps } from './native-sign-in';

const CONFIG = { authorizationEndpoint: 'https://auth.example.vn/auth', clientId: 'miu-mobile', redirectUri: 'com.hoandat.miu:/auth/callback', scope: 'openid email' };
/** Deterministic "random" bytes, so a test knows the verifier, state and nonce. */
const counting = (bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => bytes.map((_, i) => i);

function deps(over: Partial<NativeSignInDeps> = {}): NativeSignInDeps & { saved: string[]; exchanged: unknown[]; opened: string[] } {
  const saved: string[] = [];
  const exchanged: unknown[] = [];
  const opened: string[] = [];
  return {
    saved,
    exchanged,
    opened,
    random: counting,
    config: async () => CONFIG,
    authenticate: async (url, scheme) => {
      opened.push(url, scheme);
      return `com.hoandat.miu:/auth/callback?code=the-code&state=${new URL(url).searchParams.get('state') ?? ''}`;
    },
    exchange: async (body) => {
      exchanged.push(body);
      return { token: 'session-token-abcdefghijk' };
    },
    saveToken: async (token) => {
      saved.push(token);
    },
    ...over,
  };
}

describe('native sign-in helpers', () => {
  it('makes an RFC 7636 verifier and its S256 challenge', async () => {
    const { verifier, challenge } = await pkcePair(counting);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });

  it('builds the authorization request, with a fresh login for a re-authentication', () => {
    const q = new URL(authorizationUrl(CONFIG, { state: 's', nonce: 'n', challenge: 'c', reauth: false })).searchParams;
    expect(Object.fromEntries(q)).toEqual({ client_id: 'miu-mobile', redirect_uri: CONFIG.redirectUri, response_type: 'code', scope: 'openid email', state: 's', nonce: 'n', code_challenge: 'c', code_challenge_method: 'S256' });
    const re = new URL(authorizationUrl(CONFIG, { state: 's', nonce: 'n', challenge: 'c', reauth: true })).searchParams;
    expect([re.get('prompt'), re.get('max_age')]).toEqual(['login', '0']);
    expect(redirectScheme(CONFIG.redirectUri)).toBe('com.hoandat.miu');
  });

  it('takes the code only from a callback of this sign-in', () => {
    expect(callbackCode('com.hoandat.miu:/auth/callback?code=c1&state=s', CONFIG.redirectUri, 's')).toBe('c1');
    for (const url of ['com.hoandat.miu:/auth/callback?code=c1&state=other', 'com.evil:/auth/callback?code=c1&state=s', 'com.hoandat.miu:/elsewhere?code=c1&state=s', 'com.hoandat.miu:/auth/callback?error=access_denied&state=s', 'com.hoandat.miu:/auth/callback?state=s', 'not a url']) {
      expect(() => callbackCode(url, CONFIG.redirectUri, 's')).toThrow(NativeSignInError);
    }
  });
});

describe('signInNative', () => {
  it('runs the browser round trip, exchanges code, verifier and nonce, and keeps the token', async () => {
    const d = deps();
    expect(await signInNative(d, { reauth: false })).toBe(true);
    const url = new URL(d.opened[0] ?? '');
    expect(d.opened[1]).toBe('com.hoandat.miu');
    const sent = d.exchanged[0] as { code: string; codeVerifier: string; nonce: string; redirectUri: string; reauth: boolean };
    expect(sent).toMatchObject({ code: 'the-code', redirectUri: CONFIG.redirectUri, reauth: false, nonce: url.searchParams.get('nonce') });
    expect(createHash('sha256').update(sent.codeVerifier).digest('base64url')).toBe(url.searchParams.get('code_challenge'));
    expect(d.saved).toEqual(['session-token-abcdefghijk']);
  });

  it('resolves false when the person closes the browser, and saves nothing', async () => {
    const d = deps({ authenticate: () => Promise.reject(Object.assign(new Error('closed'), { code: 'CANCELLED' })) });
    expect(await signInNative(d, { reauth: true })).toBe(false);
    expect(d.saved).toEqual([]);
  });

  it('fails on incomplete parameters, a forged callback or no session, and saves nothing', async () => {
    const forged = deps({ authenticate: async () => 'com.hoandat.miu:/auth/callback?code=x&state=forged' });
    await expect(signInNative(forged, { reauth: false })).rejects.toThrow(/state/);
    await expect(signInNative(deps({ config: async () => ({ clientId: 'miu-mobile' }) }), { reauth: false })).rejects.toThrow(NativeSignInError);
    const empty = deps({ exchange: async () => ({}) });
    await expect(signInNative(empty, { reauth: false })).rejects.toThrow(/no session/);
    expect([...forged.saved, ...empty.saved]).toEqual([]);
  });
});

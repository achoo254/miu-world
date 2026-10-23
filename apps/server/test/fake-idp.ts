// A stand-in for the account service (auth-next) in server tests: its discovery document, its signing keys and its
// token and userinfo endpoints, answered through an injected `fetch`, so no test reaches the network. Tokens are really
// signed (ES256), so the server's signature checks run as in production. Like auth-next, the ID token carries no email:
// `email`, `email_verified` and `google_sub` of `claims` are answered by userinfo only.
import { generateKeyPairSync, randomUUID, sign, type KeyObject } from 'node:crypto';

export const FAKE_ISSUER = 'https://auth.test.example';
export const WEB_CLIENT = { id: 'miu-web', secret: 'test-secret-web-client-0123456789abcdef', redirect: 'http://localhost:4173/api/auth/callback' };
export const MOBILE_CLIENT = { id: 'miu-mobile', redirect: 'com.hoandat.miu:/auth/callback' };

/** The env that turns sign-in on against the fake IdP. */
export const IDP_ENV = {
  NODE_ENV: 'test',
  OIDC_ISSUER: FAKE_ISSUER,
  OIDC_WEB_CLIENT_SECRET: WEB_CLIENT.secret,
  OIDC_REDIRECT_URI: WEB_CLIENT.redirect,
};

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

function newKey(): { privateKey: KeyObject; jwk: Record<string, unknown> } {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { privateKey, jwk: { ...publicKey.export({ format: 'jwk' }), kid: randomUUID(), alg: 'ES256', use: 'sig' } };
}

export class FakeIdp {
  readonly key = newKey();
  /** A key the IdP never published: tokens signed with it must be refused. */
  readonly strangerKey = newKey();
  /** Claims of the next ID token (merged over valid defaults). */
  claims: Record<string, unknown> = {};
  status = 200;
  lastTokenRequest: { body: URLSearchParams; authorization: string | null } | null = null;
  /** userinfo answers about another person (a token mix-up the server must catch). */
  userinfoSub: string | null = null;
  private readonly userinfoOf = new Map<string, Record<string, unknown>>();

  /** A compact JWS of `payload`; `alg: none` and a stranger's key make tokens the server must refuse. */
  sign(payload: Record<string, unknown>, how: 'valid' | 'stranger' | 'none' = 'valid', header: Record<string, unknown> = {}): string {
    const key = how === 'stranger' ? this.strangerKey : this.key;
    const head = b64({ alg: how === 'none' ? 'none' : 'ES256', kid: key.jwk.kid, ...header });
    const body = b64(payload);
    if (how === 'none') return `${head}.${body}.`;
    const signature = sign('sha256', Buffer.from(`${head}.${body}`), { key: key.privateKey, dsaEncoding: 'ieee-p1363' });
    return `${head}.${body}.${signature.toString('base64url')}`;
  }

  idToken(clientId: string, nonce: string, how: 'valid' | 'stranger' | 'none' = 'valid'): string {
    const now = Math.floor(Date.now() / 1000);
    // Generous expiry: some tests move the injected clock.
    const { email: _email, email_verified: _verified, google_sub: _googleSub, ...idClaims } = this.claims;
    return this.sign({ iss: FAKE_ISSUER, aud: clientId, iat: now, exp: now + 86_400, nonce, ...idClaims }, how);
  }

  logoutToken(claims: Record<string, unknown>, how: 'valid' | 'stranger' | 'none' = 'valid'): string {
    const now = Math.floor(Date.now() / 1000);
    const events = { 'http://schemas.openid.net/event/backchannel-logout': {} };
    return this.sign({ iss: FAKE_ISSUER, aud: WEB_CLIENT.id, iat: now, jti: randomUUID(), events, ...claims }, how, { typ: 'logout+jwt' });
  }

  /** The `fetch` the app gets: discovery, keys and the token endpoint, which signs `claims` with the request's nonce. */
  readonly fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.pathname === '/.well-known/openid-configuration') {
      return json({ issuer: FAKE_ISSUER, authorization_endpoint: `${FAKE_ISSUER}/auth`, token_endpoint: `${FAKE_ISSUER}/token`, userinfo_endpoint: `${FAKE_ISSUER}/me`, jwks_uri: `${FAKE_ISSUER}/jwks` });
    }
    if (url.pathname === '/me') {
      const bearer = /^Bearer (.+)$/.exec(new Headers(init?.headers).get('authorization') ?? '')?.[1];
      const info = bearer ? this.userinfoOf.get(bearer) : undefined;
      return info ? json(info) : json({ error: 'invalid_token' }, 401);
    }
    if (url.pathname === '/jwks') return json({ keys: [this.key.jwk] });
    if (url.pathname === '/token' && init?.method === 'POST') {
      const body = new URLSearchParams(String(init.body ?? ''));
      const headers = new Headers(init.headers);
      this.lastTokenRequest = { body, authorization: headers.get('authorization') };
      if (this.status !== 200) return json({ error: 'invalid_grant' }, this.status);
      const clientId = body.get('client_id') ?? WEB_CLIENT.id;
      const accessToken = randomUUID();
      this.userinfoOf.set(accessToken, {
        sub: this.userinfoSub ?? this.claims.sub,
        email: this.claims.email,
        email_verified: this.claims.email_verified ?? true,
        google_sub: this.claims.google_sub,
      });
      return json({ id_token: this.idToken(clientId, String(this.claims.nonce ?? '')), access_token: accessToken, token_type: 'Bearer' });
    }
    return json({ error: 'not_found' }, 404);
  }) as typeof fetch;
}

// Stand-in for the account service (auth-next) during E2E: OpenID Connect discovery, signing keys, /authorize (signs a
// fresh fake person in at once and redirects back with a code), /token (checks PKCE and the client's Basic secret, then
// signs an ES256 ID token with the request's nonce, without email, as auth-next does) and /me (userinfo: the verified
// email). Plain http on loopback, which the server accepts only outside production.
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_IDP_PORT ?? 8788);
const ISSUER = `http://127.0.0.1:${PORT}`;
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const KID = randomUUID();
const JWK = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'ES256', use: 'sig' };

interface Pending {
  clientId: string;
  redirectUri: string;
  challenge: string;
  nonce: string;
  sub: string;
  email: string;
}
const codes = new Map<string, Pending>();
const userinfo = new Map<string, { sub: string; email: string; email_verified: true }>();
let people = 0;

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');
function signJwt(payload: Record<string, unknown>): string {
  const input = `${b64({ alg: 'ES256', kid: KID })}.${b64(payload)}`;
  return `${input}.${sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', ISSUER);
  const json = (status: number, body: unknown) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  if (url.pathname === '/.well-known/openid-configuration') {
    return json(200, { issuer: ISSUER, authorization_endpoint: `${ISSUER}/authorize`, token_endpoint: `${ISSUER}/token`, userinfo_endpoint: `${ISSUER}/me`, jwks_uri: `${ISSUER}/jwks` });
  }
  if (url.pathname === '/jwks') return json(200, { keys: [JWK] });
  if (url.pathname === '/health') return res.writeHead(200).end('ok');
  if (req.method === 'GET' && url.pathname === '/authorize') {
    const q = url.searchParams;
    const redirectUri = q.get('redirect_uri');
    if (!redirectUri || q.get('code_challenge_method') !== 'S256' || q.get('scope') !== 'openid email' || !q.get('nonce')) {
      return res.writeHead(400).end('bad authorize request');
    }
    people += 1;
    const code = randomUUID();
    codes.set(code, { clientId: q.get('client_id') ?? '', redirectUri, challenge: q.get('code_challenge') ?? '', nonce: q.get('nonce') ?? '', sub: `fake-sub-${people}-${Date.now()}`, email: `idp-${people}-${Date.now()}@example.vn` });
    const back = new URL(redirectUri);
    back.searchParams.set('code', code);
    back.searchParams.set('state', q.get('state') ?? '');
    return res.writeHead(302, { Location: back.toString() }).end();
  }
  if (req.method === 'POST' && url.pathname === '/token') {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => {
      const form = new URLSearchParams(body);
      const entry = codes.get(form.get('code') ?? '');
      codes.delete(form.get('code') ?? '');
      const pkceOk = entry !== undefined && createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url') === entry.challenge;
      const basic = req.headers.authorization?.startsWith('Basic ') ?? false;
      if (!entry || !pkceOk || !basic || form.get('redirect_uri') !== entry.redirectUri) return json(400, { error: 'invalid_grant' });
      const now = Math.floor(Date.now() / 1000);
      const accessToken = randomUUID();
      userinfo.set(accessToken, { sub: entry.sub, email: entry.email, email_verified: true });
      json(200, {
        id_token: signJwt({ iss: ISSUER, aud: entry.clientId, sub: entry.sub, nonce: entry.nonce, iat: now, exp: now + 600, auth_time: now, sid: randomUUID(), amr: ['fed', 'google'] }),
        access_token: accessToken,
        token_type: 'Bearer',
      });
    });
    return;
  }
  if (url.pathname === '/me') {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
    const info = token ? userinfo.get(token) : undefined;
    return info ? json(200, info) : json(401, { error: 'invalid_token' });
  }
  res.writeHead(404).end();
}).listen(PORT, '127.0.0.1');

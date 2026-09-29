// Stand-in for Google's OAuth endpoints during E2E (the server refuses these overrides in production).
// /authorize immediately "signs in" a fresh fake user and redirects back with a code; /token answers
// with an ID token carrying the nonce, audience and verified email the server checks.
import { createServer } from 'node:http';

const PORT = Number(process.env.FAKE_GOOGLE_PORT ?? 8788);
const codes = new Map<string, { nonce: string; clientId: string; sub: string; email: string }>();
let users = 0;

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/authorize') {
    const q = url.searchParams;
    const redirect = q.get('redirect_uri');
    if (!redirect || q.get('code_challenge_method') !== 'S256' || q.get('scope') !== 'openid email') {
      res.writeHead(400).end('bad authorize request');
      return;
    }
    users += 1;
    const code = `fake-code-${users}-${Date.now()}`;
    codes.set(code, { nonce: q.get('nonce') ?? '', clientId: q.get('client_id') ?? '', sub: `fake-sub-${users}-${Date.now()}`, email: `google-${users}-${Date.now()}@example.vn` });
    const back = new URL(redirect);
    back.searchParams.set('code', code);
    back.searchParams.set('state', q.get('state') ?? '');
    res.writeHead(302, { Location: back.toString() }).end();
    return;
  }
  if (req.method === 'POST' && url.pathname === '/token') {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => {
      const form = new URLSearchParams(body);
      const entry = codes.get(form.get('code') ?? '');
      codes.delete(form.get('code') ?? '');
      if (!entry || !form.get('code_verifier') || !form.get('client_secret')) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end('{"error":"invalid_grant"}');
        return;
      }
      const claims = {
        iss: 'https://accounts.google.com',
        aud: entry.clientId,
        sub: entry.sub,
        email: entry.email,
        email_verified: true,
        nonce: entry.nonce,
        exp: Math.floor(Date.now() / 1000) + 600,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id_token: `${b64({ alg: 'none' })}.${b64(claims)}.`, access_token: 'unused' }));
    });
    return;
  }
  if (url.pathname === '/health') {
    res.writeHead(200).end('ok');
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, '127.0.0.1');

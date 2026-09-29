// Google sign-in for parents: OAuth 2.0 authorization code flow with PKCE (S256), `state` bound to a
// short-lived cookie and a `nonce` checked in the ID token. Server-side only: the browser just follows
// redirects, so no Google script runs in the app and the CSP stays same-origin.
// Scope is `openid email`: only Google's account id (`sub`) and the verified email are kept.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { GoogleConfig, ServerConfig } from '../config';
import type { Db } from '../db/client';
import { parents } from '../db/schema';
import { createSignIn } from './sign-in';

export interface GoogleAuthDeps {
  db: Db;
  config: ServerConfig;
  clock: () => Date;
  /** Token endpoint call; injectable so tests never reach Google. */
  fetchImpl?: typeof fetch;
}

const STATE_COOKIE = 'miu_oauth_state';
const COOKIE_PATH = '/api/auth/google';
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING = 1000;
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

interface Pending {
  verifier: string;
  nonce: string;
  expiresAt: number;
}

const b64url = (bytes: Buffer): string => bytes.toString('base64url');

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const eqAt = part.indexOf('=');
    if (eqAt > 0 && part.slice(0, eqAt).trim() === name) return part.slice(eqAt + 1).trim();
  }
  return null;
}

export interface GoogleIdClaims {
  sub: string;
  email: string;
}

/**
 * Checks the ID token Google returned from its token endpoint. It arrives directly from Google over
 * TLS in exchange for our client secret, so (per Google's OpenID Connect guidance) the signature need
 * not be re-verified; issuer, audience, expiry, nonce and email verification still are.
 */
export function checkIdToken(idToken: unknown, google: GoogleConfig, nonce: string, now: Date): GoogleIdClaims | null {
  if (typeof idToken !== 'string') return null;
  const [, payload] = idToken.split('.');
  if (!payload) return null;
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
  const aud = claims.aud;
  const audOk = aud === google.clientId || (Array.isArray(aud) && aud.includes(google.clientId));
  const { iss, exp, sub, email, email_verified: verified } = claims;
  if (typeof iss !== 'string' || !GOOGLE_ISSUERS.has(iss) || !audOk) return null;
  if (typeof exp !== 'number' || exp * 1000 <= now.getTime()) return null;
  if (claims.nonce !== nonce) return null;
  if (typeof sub !== 'string' || !sub || typeof email !== 'string' || !email) return null;
  if (verified !== true && verified !== 'true') return null;
  return { sub, email: email.trim().toLowerCase() };
}

export function googleAuthRoutes({ db, config, clock, fetchImpl = fetch }: GoogleAuthDeps): Router {
  const router = Router();
  const pending = new Map<string, Pending>();
  const signIn = createSignIn({ db, config, clock });
  const limit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.googleLimitPer15Min,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (_req, res) => res.redirect(303, '/login?error=rate-limited'),
  });
  const cookieOptions = { httpOnly: true, secure: config.nodeEnv === 'production', sameSite: 'lax' as const, path: COOKIE_PATH };
  const fail = (res: Response, code = 'google'): void => res.redirect(303, `/login?error=${code}`);

  function prune(now: number): void {
    for (const [key, value] of pending) if (value.expiresAt <= now) pending.delete(key);
  }

  router.get('/auth/google/start', limit, (req, res) => {
    const google = config.google;
    if (!google) return fail(res, 'google-unavailable');
    const now = clock().getTime();
    prune(now);
    if (pending.size >= MAX_PENDING) return fail(res, 'rate-limited');
    const state = b64url(randomBytes(32));
    const verifier = b64url(randomBytes(32));
    const nonce = b64url(randomBytes(16));
    pending.set(state, { verifier, nonce, expiresAt: now + STATE_TTL_MS });
    res.cookie(STATE_COOKIE, state, { ...cookieOptions, maxAge: STATE_TTL_MS });
    const url = new URL(google.authUrl);
    url.search = new URLSearchParams({
      client_id: google.clientId,
      redirect_uri: google.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state,
      nonce,
      code_challenge: b64url(createHash('sha256').update(verifier).digest()),
      code_challenge_method: 'S256',
      // Re-authentication (e.g. after a PIN lock-out) must show Google's sign-in again.
      prompt: req.query.intent === 'reauth' ? 'login' : 'select_account',
    }).toString();
    res.redirect(303, url.toString());
  });

  router.get('/auth/google/callback', limit, async (req, res) => {
    const google = config.google;
    const cookieState = readCookie(req, STATE_COOKIE);
    res.clearCookie(STATE_COOKIE, cookieOptions);
    const { code, state } = req.query;
    if (!google || typeof code !== 'string' || typeof state !== 'string' || !cookieState || state !== cookieState) return fail(res);
    const entry = pending.get(state);
    pending.delete(state); // one-time
    if (!entry || entry.expiresAt <= clock().getTime()) return fail(res);

    let idToken: unknown;
    try {
      const tokenRes = await fetchImpl(google.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: google.clientId,
          client_secret: google.clientSecret,
          redirect_uri: google.redirectUri,
          grant_type: 'authorization_code',
          code_verifier: entry.verifier,
        }).toString(),
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenRes.ok) return fail(res);
      idToken = ((await tokenRes.json()) as { id_token?: unknown }).id_token;
    } catch {
      return fail(res);
    }
    const claims = checkIdToken(idToken, google, entry.nonce, clock());
    if (!claims) return fail(res);

    const parentId = await db.transaction(async (tx) => {
      const [byGoogle] = await tx.select({ id: parents.id }).from(parents).where(eq(parents.googleSub, claims.sub));
      if (byGoogle) return byGoogle.id;
      // Same verified email as an existing (dev/test password) account: link instead of duplicating.
      const [byEmail] = await tx.select().from(parents).where(eq(parents.email, claims.email)).for('update');
      if (byEmail) {
        if (byEmail.googleSub && byEmail.googleSub !== claims.sub) return null; // email now owned by another Google account
        await tx.update(parents).set({ googleSub: claims.sub }).where(eq(parents.id, byEmail.id));
        return byEmail.id;
      }
      const id = randomUUID();
      await tx.insert(parents).values({ id, email: claims.email, googleSub: claims.sub });
      console.info('parent registered', id);
      return id;
    });
    if (!parentId) return fail(res, 'google-conflict');
    await signIn(res, parentId);
    res.redirect(303, '/');
  });

  return router;
}

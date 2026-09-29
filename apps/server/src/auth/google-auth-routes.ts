// Google sign-in for parents: OAuth 2.0 authorization code flow with PKCE (S256), `state` + `nonce`.
// The per-login secrets live in a short-lived httpOnly cookie (no server memory to fill up or lose on
// restart). Server-side only: the browser just follows redirects, so no Google script runs in the app.
// Scope is `openid email`: only Google's account id (`sub`) and the verified email are kept.
//
// Signing in with Google does NOT open the parent area once a PIN exists: a child on a device where the
// parent's Gmail is remembered could otherwise skip the PIN. Only a server-requested re-authentication
// (`prompt=login`, fresh `auth_time`) clears a PIN lock-out and opens the area.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { GoogleConfig, ServerConfig } from '../config';
import type { Db } from '../db/client';
import { parents, sessions } from '../db/schema';
import { createSignIn } from './sign-in';

export interface GoogleAuthDeps {
  db: Db;
  config: ServerConfig;
  clock: () => Date;
  /** Token endpoint call; injectable so tests never reach Google. */
  fetchImpl?: typeof fetch;
}

const STATE_TTL_MS = 10 * 60 * 1000;
/** A re-authentication must have happened at Google within this window. */
export const REAUTH_MAX_AGE_S = 5 * 60;
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

const b64url = (bytes: Buffer): string => bytes.toString('base64url');

/** Per-login secrets carried by the state cookie (httpOnly; only ever read by this server). */
const PendingLogin = z.object({ state: z.string().min(20), verifier: z.string().min(40), nonce: z.string().min(10), reauth: z.boolean(), exp: z.number() });
type PendingLogin = z.infer<typeof PendingLogin>;

function parsePending(raw: string | null): PendingLogin | null {
  if (!raw) return null;
  try {
    return PendingLogin.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
  } catch {
    return null; // tampered or truncated cookie
  }
}

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
  /** Seconds since epoch of the Google authentication; null when Google did not send it. */
  authTime: number | null;
}

/**
 * Checks the ID token Google returned from its token endpoint. It arrives directly from Google over
 * TLS in exchange for our client secret (the endpoint is fixed in production and TLS verification is
 * enforced at startup), so per Google's OpenID Connect guidance the signature need not be re-verified;
 * issuer, audience/azp, expiry, nonce and email verification still are.
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
  const { aud, azp, iss, exp, sub, email, email_verified: verified, auth_time: authTime } = claims;
  const audOk = aud === google.clientId || (Array.isArray(aud) && aud.includes(google.clientId) && azp === google.clientId);
  if (typeof iss !== 'string' || !GOOGLE_ISSUERS.has(iss) || !audOk) return null;
  if (typeof exp !== 'number' || exp * 1000 <= now.getTime()) return null;
  if (claims.nonce !== nonce) return null;
  if (typeof sub !== 'string' || !sub || typeof email !== 'string' || !email) return null;
  if (verified !== true && verified !== 'true') return null;
  return { sub, email: email.trim().toLowerCase(), authTime: typeof authTime === 'number' ? authTime : null };
}

export function googleAuthRoutes({ db, config, clock, fetchImpl = fetch }: GoogleAuthDeps): Router {
  const router = Router();
  const signIn = createSignIn({ db, config, clock });
  const production = config.nodeEnv === 'production';
  // `__Host-` in production: Secure, host-only, Path=/ (a sibling subdomain cannot plant the state).
  const stateCookie = production ? '__Host-miu_oauth' : 'miu_oauth';
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'lax' as const, path: '/' };
  const limiter = (name: string) =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: config.googleLimitPer15Min,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: (req) => `${name}|${ipKeyGenerator(req.ip ?? 'unknown')}`,
      handler: (_req, res) => res.redirect(303, '/login?error=rate-limited'),
    });
  const fail = (res: Response, code = 'google'): void => res.redirect(303, `/login?error=${code}`);

  router.get('/auth/google/start', limiter('start'), (req, res) => {
    const google = config.google;
    if (!google) return fail(res, 'google-unavailable');
    const pending: PendingLogin = {
      state: b64url(randomBytes(32)),
      verifier: b64url(randomBytes(32)),
      nonce: b64url(randomBytes(16)),
      reauth: req.query.intent === 'reauth',
      exp: clock().getTime() + STATE_TTL_MS,
    };
    res.cookie(stateCookie, b64url(Buffer.from(JSON.stringify(pending))), { ...cookieOptions, maxAge: STATE_TTL_MS });
    const params: Record<string, string> = {
      client_id: google.clientId,
      redirect_uri: google.redirectUri,
      response_type: 'code',
      scope: 'openid email',
      state: pending.state,
      nonce: pending.nonce,
      code_challenge: b64url(createHash('sha256').update(pending.verifier).digest()),
      code_challenge_method: 'S256',
      prompt: pending.reauth ? 'login' : 'select_account',
    };
    // Re-authentication: Google must ask for the password again; auth_time is checked on return.
    if (pending.reauth) params.max_age = '0';
    const url = new URL(google.authUrl);
    url.search = new URLSearchParams(params).toString();
    res.redirect(303, url.toString());
  });

  router.get('/auth/google/callback', limiter('callback'), async (req, res) => {
    const google = config.google;
    const raw = readCookie(req, stateCookie);
    res.clearCookie(stateCookie, cookieOptions); // one-time
    const pending = parsePending(raw);
    const { code, state } = req.query;
    if (!google || !pending || typeof code !== 'string' || state !== pending.state || pending.exp <= clock().getTime()) return fail(res);

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
          code_verifier: pending.verifier,
        }).toString(),
        signal: AbortSignal.timeout(10_000),
      });
      if (!tokenRes.ok) return fail(res);
      idToken = ((await tokenRes.json()) as { id_token?: unknown }).id_token;
    } catch {
      return fail(res);
    }
    const claims = checkIdToken(idToken, google, pending.nonce, clock());
    if (!claims) return fail(res);
    const nowS = Math.floor(clock().getTime() / 1000);
    const freshReauth = pending.reauth && claims.authTime !== null && nowS - claims.authTime <= REAUTH_MAX_AGE_S;
    if (pending.reauth && !freshReauth) return fail(res, 'google-reauth');

    const findBySub = async () => (await db.select().from(parents).where(eq(parents.googleSub, claims.sub)))[0];
    let parent = await findBySub();
    if (!parent) {
      try {
        parent = await db.transaction(async (tx) => {
          const [byEmail] = await tx.select().from(parents).where(eq(parents.email, claims.email)).for('update');
          if (byEmail) {
            if (byEmail.googleSub && byEmail.googleSub !== claims.sub) return undefined; // email owned by another Google account
            // Linking a dev/test password account to Google: whoever set that password or PIN may not be
            // this Google user, so both are dropped and every older session is signed out.
            const [linked] = await tx
              .update(parents)
              .set({ googleSub: claims.sub, passwordHash: null, pinHash: null, pinFailedCount: 0 })
              .where(eq(parents.id, byEmail.id))
              .returning();
            await tx.delete(sessions).where(eq(sessions.parentId, byEmail.id));
            return linked;
          }
          const [created] = await tx.insert(parents).values({ id: randomUUID(), email: claims.email, googleSub: claims.sub }).returning();
          if (created) console.info('parent registered', created.id);
          return created;
        });
      } catch {
        parent = await findBySub(); // a concurrent callback for the same new account won the insert
      }
    }
    if (!parent) return fail(res, 'google-conflict');
    await signIn(res, parent.id, {
      // The parent area opens only to set the first PIN, or after a real re-authentication.
      openParentGate: parent.pinHash === null || freshReauth,
      clearPinLock: freshReauth,
    });
    res.redirect(303, '/');
  });

  return router;
}

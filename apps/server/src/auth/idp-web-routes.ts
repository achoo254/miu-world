// Parent sign-in on the web through the shared account service (auth-next, OpenID Connect), with this server as the
// confidential client (`miu-web`): authorization code flow with PKCE (S256), `state` and `nonce`. The per-login
// secrets live in a short-lived httpOnly cookie (no server memory to fill up or lose on restart). The browser only
// follows redirects: no IdP token ever reaches the page, and the client secret stays in the server's env. Scope is
// `openid email`: only the IdP's subject id and verified email are used (and its session id, for its logout).
import { createHash, randomBytes } from 'node:crypto';
import express, { Router, type Request, type Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { parentIdpLinks } from '../db/schema';
import { IdpError, type IdpClient, type IdpIdentity, type LogoutClaims } from './idp-client';
import { signInWithIdentity } from './idp-sign-in';
import { deleteWebSessionsByIdpSid, deleteWebSessionsOf } from './session-store';
import { createSignIn } from './sign-in';

export const IDP_SCOPE = 'openid email';
const STATE_TTL_MS = 10 * 60 * 1000;

export interface IdpRouteDeps {
  db: Db;
  config: ServerConfig;
  clock: () => Date;
  /** Null when sign-in is not configured. */
  idp: IdpClient | null;
}

const b64url = (bytes: Buffer): string => bytes.toString('base64url');
export const pkceChallenge = (verifier: string): string => b64url(createHash('sha256').update(verifier).digest());

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

/** What a failed call to the IdP says in the log: its own message (a status, never a token), or the error's class. */
export function idpFailure(err: unknown): string {
  return err instanceof IdpError ? err.message : err instanceof Error ? err.name : typeof err;
}

/**
 * Back-channel logouts per 15 minutes from one address: wide, since they all come from the IdP's own server (one
 * address) whenever its users sign out; the signed logout token is the real check, this only caps a flood.
 */
const BACKCHANNEL_LIMIT_PER_15_MIN = 3_000;

export function signInLimiter(config: ServerConfig, name: string, onLimit: (res: Response) => void) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.signInLimitPer15Min,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `${name}|${ipKeyGenerator(req.ip ?? 'unknown')}`,
    handler: (_req, res) => onLimit(res),
  });
}

export function idpWebRoutes({ db, config, clock, idp }: IdpRouteDeps): Router {
  const router = Router();
  const signIn = createSignIn({ db, config, clock });
  const production = config.nodeEnv === 'production';
  // `__Host-` in production: Secure, host-only, Path=/ (a sibling subdomain cannot plant the state).
  const stateCookie = production ? '__Host-miu_oauth' : 'miu_oauth';
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'lax' as const, path: '/' };
  const fail = (res: Response, code = 'idp'): void => res.redirect(303, `/login?error=${code}`);
  const limiter = (name: string) => signInLimiter(config, name, (res) => fail(res, 'rate-limited'));

  router.get('/auth/start', limiter('start'), async (req, res) => {
    const web = config.idp?.web;
    if (!idp || !web) return fail(res, 'idp-unavailable');
    let authorizationEndpoint: string;
    try {
      authorizationEndpoint = (await idp.discovery()).authorizationEndpoint;
    } catch (err) {
      console.warn('sign-in start failed:', idpFailure(err));
      return fail(res, 'idp-unavailable');
    }
    const pending: PendingLogin = {
      state: b64url(randomBytes(32)),
      verifier: b64url(randomBytes(32)),
      nonce: b64url(randomBytes(16)),
      reauth: req.query.intent === 'reauth',
      exp: clock().getTime() + STATE_TTL_MS,
    };
    res.cookie(stateCookie, b64url(Buffer.from(JSON.stringify(pending))), { ...cookieOptions, maxAge: STATE_TTL_MS });
    const url = new URL(authorizationEndpoint);
    url.search = new URLSearchParams({
      client_id: web.clientId,
      redirect_uri: web.redirectUri,
      response_type: 'code',
      scope: IDP_SCOPE,
      state: pending.state,
      nonce: pending.nonce,
      code_challenge: pkceChallenge(pending.verifier),
      code_challenge_method: 'S256',
      // Re-authentication: the IdP must sign the person in again; auth_time is checked on return.
      ...(pending.reauth ? { prompt: 'login', max_age: '0' } : {}),
    }).toString();
    res.redirect(303, url.toString());
  });

  router.get('/auth/callback', limiter('callback'), async (req, res) => {
    const web = config.idp?.web;
    const raw = readCookie(req, stateCookie);
    res.clearCookie(stateCookie, cookieOptions); // one-time
    const pending = parsePending(raw);
    const { code, state } = req.query;
    if (!idp || !web || !pending || typeof code !== 'string' || state !== pending.state || pending.exp <= clock().getTime()) return fail(res);
    let identity: IdpIdentity | null;
    try {
      const tokens = await idp.exchangeCode({ clientId: web.clientId, clientSecret: web.clientSecret, code, codeVerifier: pending.verifier, redirectUri: web.redirectUri });
      identity = await idp.identity(tokens, web.clientId, pending.nonce);
    } catch (err) {
      console.warn('sign-in callback failed:', idpFailure(err));
      return fail(res);
    }
    const result = await signInWithIdentity({ db, issuer: idp.issuer, clock, signIn }, res, identity, { reauth: pending.reauth, kind: 'web' });
    if (!result.ok) return fail(res, result.code);
    res.redirect(303, '/');
  });

  return router;
}

/**
 * `POST /api/auth/backchannel-logout` (OpenID Connect Back-Channel Logout 1.0): the IdP says its session ended, so the
 * web sessions signed in through it end too (the app's sessions belong to the device and stay). The IdP calls it
 * server to server, without an Origin, so it is mounted ahead of the CSRF check; the signed logout token is the proof.
 */
export function idpBackchannelRoute({ db, config, idp }: Omit<IdpRouteDeps, 'clock'>): Router {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: BACKCHANNEL_LIMIT_PER_15_MIN,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `backchannel|${ipKeyGenerator(req.ip ?? 'unknown')}`,
    handler: (_req, res) => res.status(429).end(),
  });
  router.post('/auth/backchannel-logout', limiter, express.urlencoded({ extended: false, limit: '8kb' }), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const web = config.idp?.web;
    const body: unknown = req.body;
    const token = typeof body === 'object' && body !== null && 'logout_token' in body ? body.logout_token : undefined;
    let claims: LogoutClaims | null;
    try {
      claims = idp && web ? await idp.logoutClaims(token, web.clientId) : null;
    } catch (err) {
      console.warn('back-channel logout check failed:', idpFailure(err));
      return res.status(503).end();
    }
    if (!idp || !claims) return res.status(400).json({ error: 'invalid_request' });
    let ended = 0;
    if (claims.sid) ended = await deleteWebSessionsByIdpSid(db, claims.sid);
    else if (claims.sub) {
      const [link] = await db
        .select({ parentId: parentIdpLinks.parentId })
        .from(parentIdpLinks)
        .where(and(eq(parentIdpLinks.issuer, idp.issuer), eq(parentIdpLinks.subject, claims.sub)));
      if (link) ended = await deleteWebSessionsOf(db, link.parentId);
    }
    console.info('back-channel logout: web sessions ended', ended);
    res.status(200).end();
  });
  return router;
}

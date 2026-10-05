import { randomUUID } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import { Router, type Request, type RequestHandler } from 'express';
import { ConsentRequest, LoginRequest, ParentGateUnlockRequest, RegisterRequest, SetPinRequest } from '@miu/schema/account';
import type { ServerConfig } from '../config';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { consents, parents, sessions } from '../db/schema';
import { HttpError, parseInput } from '../http-error';
import { ipKey, limiter } from '../rate-limit';
import { accountSummary } from './account-summary';
import { PIN_MAX_FAILS, auth, optionalAuth, requireParent, requireParentGate, type AuthContext } from './auth-context';
import { decoyHash, hashSecret, verifySecret } from './secret-hashing';
import { clearSessionCookie, setSessionCookie } from './session-cookie';
import { PARENT_GATE_MS, createSession, deleteSession } from './session-store';
import { createSignIn } from './sign-in';

export interface AuthRouteDeps {
  db: Db;
  config: ServerConfig;
  content: ContentCatalog;
  clock: () => Date;
}

const FIFTEEN_MIN = 15 * 60 * 1000;

function bodyEmail(req: Request): string {
  const body: unknown = req.body;
  const email = typeof body === 'object' && body !== null && 'email' in body ? body.email : '';
  return typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '';
}

export function authRoutes({ db, config, content, clock }: AuthRouteDeps): Router {
  const router = Router();
  const policyVersion = content.consent.version;
  let decoy: Promise<string> | undefined;

  const registerLimit = limiter(60 * 60 * 1000, config.registerLimitPerHour, ipKey);
  // Keyed by IP + email so one attacker cannot lock every account, and one account cannot be sprayed.
  const loginLimit = limiter(FIFTEEN_MIN, 10, (req) => `${ipKey(req)}|${bodyEmail(req)}`);
  // Per IP across all emails: stops spraying one password over many accounts.
  const loginIpLimit = limiter(FIFTEEN_MIN, 50, ipKey);
  // Per session: the PIN is short, so guesses are throttled on top of the 5-strike lock.
  const pinLimit = limiter(FIFTEEN_MIN, 10, (req) => (req.res && optionalAuth(req.res)?.session.id) || ipKey(req));

  const summary = (ctx: AuthContext) => accountSummary(db, ctx, clock(), policyVersion);

  /** Drops the session the request came with, so every login starts from a fresh token. */
  async function rotateOut(res: Parameters<typeof optionalAuth>[0]): Promise<void> {
    const current = optionalAuth(res);
    if (current) await deleteSession(db, current.session.id);
  }

  const signIn = createSignIn({ db, config, clock });

  /** Email+password is dev/test tooling only (Google is the sign-in); in production the routes do not exist. */
  const passwordRoutes: RequestHandler = (_req, _res, next) => {
    if (!config.passwordLogin) throw new HttpError(404, 'not-found');
    next();
  };

  router.post('/auth/register', passwordRoutes, registerLimit, async (req, res) => {
    const input = parseInput(RegisterRequest, req.body);
    const [existing] = await db.select({ id: parents.id }).from(parents).where(eq(parents.email, input.email));
    if (existing) throw new HttpError(409, 'email-taken');
    const parentId = randomUUID();
    const [parent] = await db
      .insert(parents)
      .values({
        id: parentId,
        email: input.email,
        passwordHash: await hashSecret(input.password, config.scrypt),
        pinHash: await hashSecret(input.pin, config.scrypt),
      })
      .onConflictDoNothing()
      .returning();
    if (!parent) throw new HttpError(409, 'email-taken');
    await rotateOut(res);
    // The parent has just set the PIN, so the parent area opens straight away for consent + first profile.
    const { token, session } = await createSession(db, parent.id, clock(), { openParentGate: true });
    setSessionCookie(res, config, token);
    console.info('parent registered', parent.id);
    res.status(201).json(await summary({ session, parent }));
  });

  router.post('/auth/login', passwordRoutes, loginIpLimit, loginLimit, async (req, res) => {
    const input = parseInput(LoginRequest, req.body);
    const [parent] = await db.select().from(parents).where(eq(parents.email, input.email));
    if (!parent?.passwordHash) {
      // Unknown email, or a Google account (no password): same answer and same cost as a wrong password.
      decoy ??= decoyHash(config.scrypt).catch((err: unknown) => {
        decoy = undefined; // never cache a failure: retry on the next unknown-email login
        throw err;
      });
      await verifySecret(input.password, await decoy);
      throw new HttpError(401, 'invalid-credentials');
    }
    if (!(await verifySecret(input.password, parent.passwordHash))) throw new HttpError(401, 'invalid-credentials');
    // Proving the account also clears a PIN lock-out.
    res.json(await summary(await signIn(res, parent.id, { openParentGate: true, clearPinLock: true })));
  });

  router.post('/auth/logout', async (_req, res) => {
    await rotateOut(res);
    clearSessionCookie(res, config);
    res.status(204).end();
  });

  router.get('/auth/me', requireParent, async (_req, res) => {
    res.json(await summary(auth(res)));
  });

  router.get('/consents/policy', (_req, res) => {
    res.json(content.consent);
  });

  router.post('/consents', requireParent, requireParentGate(clock), async (req, res) => {
    const { policyVersion: accepted } = parseInput(ConsentRequest, req.body);
    if (accepted !== policyVersion) throw new HttpError(400, 'policy-version-mismatch');
    const ctx = auth(res);
    await db.insert(consents).values({ id: randomUUID(), parentId: ctx.parent.id, policyVersion, acceptedAt: clock() }).onConflictDoNothing();
    res.status(201).json(await summary(ctx));
  });

  /**
   * Optional PIN for the parent area: set, change or remove it from there. Without a PIN the gate is
   * open; with one, changing or removing it needs the area unlocked first, so only who knows it can.
   */
  router.post('/auth/pin', requireParent, requireParentGate(clock), pinLimit, async (req, res) => {
    const { pin } = parseInput(SetPinRequest, req.body);
    const ctx = auth(res);
    const pinHash = await hashSecret(pin, config.scrypt);
    const [parent] = await db.update(parents).set({ pinHash, pinFailedCount: 0 }).where(eq(parents.id, ctx.parent.id)).returning();
    // The one who just chose the PIN knows it: keep the parent area open for this session's window.
    const [session] = await db
      .update(sessions)
      .set({ parentGateUntil: new Date(clock().getTime() + PARENT_GATE_MS) })
      .where(eq(sessions.id, ctx.session.id))
      .returning();
    res.json(await summary({ parent: parent ?? ctx.parent, session: session ?? ctx.session }));
  });

  router.delete('/auth/pin', requireParent, requireParentGate(clock), async (_req, res) => {
    const ctx = auth(res);
    const [parent] = await db.update(parents).set({ pinHash: null, pinFailedCount: 0 }).where(eq(parents.id, ctx.parent.id)).returning();
    res.json(await summary({ parent: parent ?? ctx.parent, session: ctx.session }));
  });

  router.post('/parent-gate/unlock', requireParent, pinLimit, async (req, res) => {
    const { pin } = parseInput(ParentGateUnlockRequest, req.body);
    const ctx = auth(res);
    if (!ctx.parent.pinHash) throw new HttpError(409, 'pin-not-set');
    const pinHash = ctx.parent.pinHash;
    // Reserve the attempt atomically before verifying, so parallel guesses cannot exceed the limit.
    const [reserved] = await db
      .update(parents)
      .set({ pinFailedCount: sql`${parents.pinFailedCount} + 1` })
      .where(and(eq(parents.id, ctx.parent.id), lt(parents.pinFailedCount, PIN_MAX_FAILS)))
      .returning({ fails: parents.pinFailedCount });
    if (!reserved) throw new HttpError(423, 'pin-locked');
    if (!(await verifySecret(pin, pinHash))) {
      if (reserved.fails >= PIN_MAX_FAILS) throw new HttpError(423, 'pin-locked');
      throw new HttpError(401, 'invalid-pin');
    }
    const gateUntil = new Date(clock().getTime() + PARENT_GATE_MS);
    const [parent] = await db.update(parents).set({ pinFailedCount: 0 }).where(eq(parents.id, ctx.parent.id)).returning();
    const [session] = await db
      .update(sessions)
      .set({ parentGateUntil: gateUntil })
      .where(eq(sessions.id, ctx.session.id))
      .returning();
    res.json(await summary({ parent: parent ?? ctx.parent, session: session ?? ctx.session }));
  });

  router.post('/parent-gate/lock', requireParent, async (_req, res) => {
    const ctx = auth(res);
    const [session] = await db.update(sessions).set({ parentGateUntil: null }).where(eq(sessions.id, ctx.session.id)).returning();
    res.json(await summary({ parent: ctx.parent, session: session ?? ctx.session }));
  });

  return router;
}

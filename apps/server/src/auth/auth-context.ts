import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { childProfiles, parents } from '../db/schema';
import { HttpError } from '../http-error';
import { hasCurrentConsent } from './consent-store';
import { readSessionToken } from './session-cookie';
import { findSession, type SessionRow } from './session-store';

export const PIN_MAX_FAILS = 5;

export interface AuthContext {
  session: SessionRow;
  parent: typeof parents.$inferSelect;
}

const AUTH = Symbol('auth');

type WithAuth = Response & { locals: { [AUTH]?: AuthContext } };

/** Loads the session for every request; routes decide whether it is required. */
export function loadSession(db: Db, config: ServerConfig, clock: () => Date): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = readSessionToken(req, config);
    if (token) {
      const session = await findSession(db, token, clock());
      if (session) {
        const [parent] = await db.select().from(parents).where(eq(parents.id, session.parentId));
        if (parent) (res as WithAuth).locals[AUTH] = { session, parent };
      }
    }
    next();
  };
}

export function optionalAuth(res: Response): AuthContext | undefined {
  return (res as WithAuth).locals[AUTH];
}

export function auth(res: Response): AuthContext {
  const ctx = optionalAuth(res);
  if (!ctx) throw new HttpError(401, 'unauthenticated');
  return ctx;
}

/** The PIN is optional: without one the account owner is trusted and the gate is always open. */
export function isParentGateOpen(ctx: AuthContext, now: Date): boolean {
  if (ctx.parent.pinHash === null) return true;
  return (
    ctx.parent.pinFailedCount < PIN_MAX_FAILS &&
    ctx.session.parentGateUntil !== null &&
    ctx.session.parentGateUntil.getTime() > now.getTime()
  );
}

export const requireParent: RequestHandler = (_req, res, next) => {
  auth(res);
  next();
};

/** Parent area (create/edit/delete profiles, consent) needs a PIN unlock within the last 15 minutes, when a PIN is set. */
export function requireParentGate(clock: () => Date): RequestHandler {
  return (_req, res, next) => {
    if (!isParentGateOpen(auth(res), clock())) throw new HttpError(403, 'parent-gate-closed');
    next();
  };
}

export type ActivePlayer = { ok: true; childId: string } | { ok: false; code: 'no-active-child' | 'consent-required' };

/**
 * The player a session plays as. The player is re-checked against the account so a stale or forged session
 * pointer can never reach another account's data, and play stops as soon as the consent policy version
 * changes (not only at the next player pick). Shared by the game routes and the multiplayer connection.
 */
export async function findActivePlayer(db: Db, session: SessionRow, policyVersion: string): Promise<ActivePlayer> {
  if (!session.activeChildId) return { ok: false, code: 'no-active-child' };
  const [child] = await db
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(and(eq(childProfiles.id, session.activeChildId), eq(childProfiles.parentId, session.parentId)));
  if (!child) return { ok: false, code: 'no-active-child' };
  if (!(await hasCurrentConsent(db, session.parentId, policyVersion))) return { ok: false, code: 'consent-required' };
  return { ok: true, childId: child.id };
}

/** Game routes act on the selected player (see `findActivePlayer`). */
export async function activePlayerId(db: Db, res: Response, policyVersion: string): Promise<string> {
  const player = await findActivePlayer(db, auth(res).session, policyVersion);
  if (!player.ok) throw new HttpError(player.code === 'consent-required' ? 403 : 401, player.code);
  return player.childId;
}

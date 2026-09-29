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

export function isParentGateOpen(ctx: AuthContext, now: Date): boolean {
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

/** Parent area (create/edit/delete profiles, consent) needs a PIN unlock within the last 15 minutes. */
export function requireParentGate(clock: () => Date): RequestHandler {
  return (_req, res, next) => {
    if (!isParentGateOpen(auth(res), clock())) throw new HttpError(403, 'parent-gate-closed');
    next();
  };
}

/**
 * Game routes act on the selected child profile. The profile is re-checked against the parent so a
 * stale or forged session pointer can never reach another family's data, and play stops as soon as
 * the consent policy version changes (not only at the next profile pick).
 */
export async function activeChildId(db: Db, res: Response, policyVersion: string): Promise<string> {
  const { session, parent } = auth(res);
  if (!session.activeChildId) throw new HttpError(401, 'no-active-child');
  const [child] = await db
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(and(eq(childProfiles.id, session.activeChildId), eq(childProfiles.parentId, parent.id)));
  if (!child) throw new HttpError(401, 'no-active-child');
  if (!(await hasCurrentConsent(db, parent.id, policyVersion))) throw new HttpError(403, 'consent-required');
  return child.id;
}

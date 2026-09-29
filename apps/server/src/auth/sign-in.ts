import { and, eq, lt } from 'drizzle-orm';
import type { Response } from 'express';
import type { ServerConfig } from '../config';
import type { Db } from '../db/client';
import { parents, sessions } from '../db/schema';
import { optionalAuth, type AuthContext } from './auth-context';
import { setSessionCookie } from './session-cookie';
import { createSession, deleteSession } from './session-store';

export interface SignInDeps {
  db: Db;
  config: ServerConfig;
  clock: () => Date;
}

export interface SignInOptions {
  /** Open the parent area for 15 minutes (first PIN, or a proven re-authentication). */
  openParentGate: boolean;
  /** Reset a PIN lock-out (only after a proven re-authentication). */
  clearPinLock: boolean;
}

/**
 * Starts a fresh session for a parent who just signed in: drops the session the request came with
 * and prunes expired ones. Whether the parent area opens is the caller's decision, never implied by
 * signing in (see google-auth-routes.ts).
 */
export function createSignIn({ db, config, clock }: SignInDeps) {
  return async function signIn(res: Response, parentId: string, options: SignInOptions): Promise<AuthContext> {
    const current = optionalAuth(res);
    if (current) await deleteSession(db, current.session.id);
    await db.delete(sessions).where(and(eq(sessions.parentId, parentId), lt(sessions.expiresAt, clock())));
    const [parent] = options.clearPinLock
      ? await db.update(parents).set({ pinFailedCount: 0 }).where(eq(parents.id, parentId)).returning()
      : await db.select().from(parents).where(eq(parents.id, parentId));
    if (!parent) throw new Error('signed-in parent vanished');
    const { token, session } = await createSession(db, parent.id, clock(), { openParentGate: options.openParentGate });
    setSessionCookie(res, config, token);
    return { parent, session };
  };
}

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

/**
 * Starts a fresh session for a parent who just proved who they are (Google or dev password):
 * drops the session the request came with, prunes expired ones, clears a PIN lock-out and opens the
 * parent area. Shared by every sign-in method so they cannot drift apart.
 */
export function createSignIn({ db, config, clock }: SignInDeps) {
  return async function signIn(res: Response, parentId: string): Promise<AuthContext> {
    const current = optionalAuth(res);
    if (current) await deleteSession(db, current.session.id);
    await db.delete(sessions).where(and(eq(sessions.parentId, parentId), lt(sessions.expiresAt, clock())));
    const [parent] = await db.update(parents).set({ pinFailedCount: 0 }).where(eq(parents.id, parentId)).returning();
    if (!parent) throw new Error('signed-in parent vanished');
    const { token, session } = await createSession(db, parent.id, clock(), { openParentGate: true });
    setSessionCookie(res, config, token);
    return { parent, session };
  };
}

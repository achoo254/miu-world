import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { childProfiles, sessions } from '../db/schema';

export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
export const PARENT_GATE_MS = 15 * 60 * 1000;
/** Refresh `last_seen_at` at most this often to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export type SessionRow = typeof sessions.$inferSelect;

/** Only the sha256 of the cookie token is stored, so a DB leak does not hand out live sessions. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  db: Db,
  parentId: string,
  now: Date,
  options: { openParentGate: boolean },
): Promise<{ token: string; session: SessionRow }> {
  const token = randomBytes(32).toString('base64url');
  // A new session plays as the account's own (primary) player; extra players pick themselves later.
  const [primary] = await db
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(and(eq(childProfiles.parentId, parentId), eq(childProfiles.isPrimary, true)));
  const [session] = await db
    .insert(sessions)
    .values({
      id: hashToken(token),
      parentId,
      activeChildId: primary?.id ?? null,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
      parentGateUntil: options.openParentGate ? new Date(now.getTime() + PARENT_GATE_MS) : null,
    })
    .returning();
  if (!session) throw new Error('session insert returned no row');
  return { token, session };
}

/** Resolves a cookie token to a live session; expired (absolute or idle) sessions are deleted. */
export async function findSession(db: Db, token: string, now: Date): Promise<SessionRow | null> {
  const id = hashToken(token);
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) return null;
  const idleExpired = now.getTime() - session.lastSeenAt.getTime() > SESSION_IDLE_MS;
  if (session.expiresAt.getTime() <= now.getTime() || idleExpired) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id));
  }
  return session;
}

export async function deleteSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { childProfiles, sessions, type SessionKind } from '../db/schema';

export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
export const PARENT_GATE_MS = 15 * 60 * 1000;
/** Refresh `last_seen_at` at most this often to avoid a write on every request. */
const TOUCH_INTERVAL_MS = 60 * 1000;

export type SessionRow = typeof sessions.$inferSelect;

/** Only the sha256 of the session token is stored, so a DB leak does not hand out live sessions. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  db: Db,
  parentId: string,
  now: Date,
  options: { openParentGate: boolean; kind: SessionKind; idpSid?: string | null },
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
      kind: options.kind,
      idpSid: options.idpSid ?? null,
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

/**
 * Resolves a token to a live session of `kind`: a web session only from the cookie, an app session only from the
 * Bearer header, so one kind's token is worthless in the other's place. Expired (absolute or idle) sessions are deleted.
 */
export async function findSession(db: Db, token: string, kind: SessionKind, now: Date): Promise<SessionRow | null> {
  const session = await findSessionById(db, hashToken(token), now);
  return session?.kind === kind ? session : null;
}

/** A live session by its stored id (the token's sha256); expired ones are deleted. */
export async function findSessionById(db: Db, id: string, now: Date): Promise<SessionRow | null> {
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

/** The IdP ended its session `sid` (back-channel logout): the web sessions signed in through it end too. */
export async function deleteWebSessionsByIdpSid(db: Db, sid: string): Promise<number> {
  const removed = await db.delete(sessions).where(and(eq(sessions.kind, 'web'), eq(sessions.idpSid, sid))).returning({ id: sessions.id });
  return removed.length;
}

/** The IdP signed the person out everywhere (a logout token without `sid`): every web session of the account ends. */
export async function deleteWebSessionsOf(db: Db, parentId: string): Promise<number> {
  const removed = await db.delete(sessions).where(and(eq(sessions.kind, 'web'), eq(sessions.parentId, parentId))).returning({ id: sessions.id });
  return removed.length;
}

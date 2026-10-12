// Invite links in the database: a player makes one (a random code, only its hash kept), lists and withdraws her live
// ones, and another player uses one to become her friend. A link is one use, good for a week; whatever is wrong with
// a code (never made, used, withdrawn, expired, her own, a block between the two) is the same answer: not found.
import { randomBytes, randomUUID } from 'node:crypto';
import { and, asc, count, eq, gt, isNull } from 'drizzle-orm';
import { INVITES_MAX, INVITE_TTL_DAYS, type CreatedInviteDto, type InviteDto } from '@miu/schema/invites';
import { hashToken } from '../auth/session-store';
import type { Db } from '../db/client';
import { playerInvites } from '../db/schema';
import { befriendByInvite, lockPlayers } from '../friend/friend-store';

const DAY_MS = 86_400_000;

/** A new random code: 128 bits as base64url (22 characters). */
export const newInviteCode = (): string => randomBytes(16).toString('base64url');

/** An invite that is still good: not used, not withdrawn, not past its time. */
const live = (now: Date) => and(isNull(playerInvites.acceptedAt), isNull(playerInvites.revokedAt), gt(playerInvites.expiresAt, now));

const dto = (row: { id: string; createdAt: Date; expiresAt: Date }): InviteDto => ({ id: row.id, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString() });

/** Makes an invite for `childId`; null when she already has `INVITES_MAX` live ones (checked under her row lock). */
export function createInvite(db: Db, childId: string, now: Date): Promise<CreatedInviteDto | null> {
  return db.transaction(async (tx) => {
    await lockPlayers(tx, [childId]);
    const [row] = await tx.select({ n: count() }).from(playerInvites).where(and(eq(playerInvites.childId, childId), live(now)));
    if ((row?.n ?? 0) >= INVITES_MAX) return null;
    const code = newInviteCode();
    const invite = { id: randomUUID(), codeHash: hashToken(code), childId, createdAt: now, expiresAt: new Date(now.getTime() + INVITE_TTL_DAYS * DAY_MS) };
    await tx.insert(playerInvites).values(invite);
    return { ...dto(invite), code };
  });
}

/** Her live invites, oldest first. */
export async function listInvites(db: Db, childId: string, now: Date): Promise<InviteDto[]> {
  const rows = await db
    .select({ id: playerInvites.id, createdAt: playerInvites.createdAt, expiresAt: playerInvites.expiresAt })
    .from(playerInvites)
    .where(and(eq(playerInvites.childId, childId), live(now)))
    .orderBy(asc(playerInvites.createdAt));
  return rows.map(dto);
}

/** Withdraws one of her live invites; false when there is no such live invite of hers. */
export async function revokeInvite(db: Db, childId: string, inviteId: string, now: Date): Promise<boolean> {
  const rows = await db
    .update(playerInvites)
    .set({ revokedAt: now })
    .where(and(eq(playerInvites.id, inviteId), eq(playerInvites.childId, childId), live(now)))
    .returning({ id: playerInvites.id });
  return rows.length > 0;
}

export type AcceptOutcome =
  /** `inviterId` made the link. `fresh`: the two became friends now (false: they were, or she used this link before). */
  | { kind: 'accepted'; inviterId: string; fresh: boolean }
  | { kind: 'friends-full' }
  | { kind: 'not-found' };

/**
 * `childId` uses the invite with this code: she and the one who made it become friends, and the code is spent. Both
 * players' rows are locked first (as a friend request does), then the invite is read again, so two uses of one code
 * run one after the other and only the first finds it unspent. Using the same code again as the same player says so
 * without changing anything; a full friends list on either side leaves the code unspent.
 */
export async function acceptInvite(db: Db, childId: string, code: string, now: Date): Promise<AcceptOutcome> {
  const codeHash = hashToken(code);
  const [seen] = await db.select({ id: playerInvites.id, makerId: playerInvites.childId }).from(playerInvites).where(eq(playerInvites.codeHash, codeHash));
  if (!seen || seen.makerId === childId) return { kind: 'not-found' };
  return db.transaction(async (tx): Promise<AcceptOutcome> => {
    await lockPlayers(tx, [seen.makerId, childId]);
    const [invite] = await tx.select().from(playerInvites).where(eq(playerInvites.id, seen.id)).for('update');
    if (!invite || invite.revokedAt) return { kind: 'not-found' };
    if (invite.acceptedAt) return invite.acceptedBy === childId ? { kind: 'accepted', inviterId: invite.childId, fresh: false } : { kind: 'not-found' };
    if (invite.expiresAt.getTime() <= now.getTime()) return { kind: 'not-found' };
    const outcome = await befriendByInvite(tx, invite.childId, childId);
    // A block is not told to the one blocked: the link simply does not work.
    if (outcome === 'blocked') return { kind: 'not-found' };
    if (outcome === 'friends-full') return { kind: 'friends-full' };
    await tx.update(playerInvites).set({ acceptedAt: now, acceptedBy: childId }).where(eq(playerInvites.id, invite.id));
    return { kind: 'accepted', inviterId: invite.childId, fresh: outcome === 'befriended' };
  });
}

// A player's friendship with the characters of the maps, counted on the server: the chats and gifts kept in
// npc_friendships and every story chapter finished (read from quest_progress, never stored twice).
import { and, eq } from 'drizzle-orm';
import { FRIENDSHIP_POINTS, heartsFor, nextHeartAt, type NpcFriendshipDto } from '@miu/schema/npc';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { npcFriendships, questProgress } from '../db/schema';
import type { Tx } from '../reward/reward-ledger';

type BondRow = typeof npcFriendships.$inferSelect;
export type ProgressRow = typeof questProgress.$inferSelect;

/** The ledger source of a day's gift to a character: one a day (the ledger's unique key keeps it so). */
export const giftSource = (npcId: string, day: string): string => `npc-gift:${npcId}:${day}`;

/** Story chapters of a character the player has finished at least once. */
function finishedChapters(content: ContentCatalog, npcId: string, finished: ReadonlySet<string>): number {
  return (content.npcs.arcsOf.get(npcId) ?? []).reduce((n, arc) => n + arc.chapters.filter((c) => finished.has(c.quest)).length, 0);
}

/** Friendship points: the chats and gifts kept for her, and every chapter finished. */
export function friendshipPoints(content: ContentCatalog, npcId: string, bond: Pick<BondRow, 'talkPoints' | 'giftPoints'> | undefined, finished: ReadonlySet<string>): number {
  return (bond?.talkPoints ?? 0) + (bond?.giftPoints ?? 0) + FRIENDSHIP_POINTS.chapter * finishedChapters(content, npcId, finished);
}

export function friendshipDto(content: ContentCatalog, npcId: string, bond: BondRow | undefined, finished: ReadonlySet<string>, today: string): NpcFriendshipDto {
  const points = friendshipPoints(content, npcId, bond, finished);
  return { npc: npcId, points, hearts: heartsFor(points), nextHeartAt: nextHeartAt(points), talkedToday: bond?.lastTalkOn === today, giftedToday: bond?.lastGiftOn === today };
}

export async function bondsOf(db: Db | Tx, childId: string): Promise<Map<string, BondRow>> {
  const rows = await db.select().from(npcFriendships).where(eq(npcFriendships.childId, childId));
  return new Map(rows.map((r) => [r.npcId, r]));
}

export async function progressOf(db: Db | Tx, childId: string): Promise<Map<string, ProgressRow>> {
  const rows = await db.select().from(questProgress).where(eq(questProgress.childId, childId));
  return new Map(rows.map((r) => [r.questId, r]));
}

export const finishedOf = (progress: ReadonlyMap<string, ProgressRow>): Set<string> => new Set([...progress.values()].filter((r) => r.completedAt !== null).map((r) => r.questId));

/**
 * The storyteller's hearts around a chapter just finished, in the caller's transaction (the chapter's progress row
 * already finished): `first` when this is its first finish, whose points the hearts before it leave out.
 */
export async function chapterHearts(tx: Tx, content: ContentCatalog, childId: string, npcId: string, first: boolean): Promise<{ before: number; after: number }> {
  const [bond] = await tx.select().from(npcFriendships).where(and(eq(npcFriendships.childId, childId), eq(npcFriendships.npcId, npcId)));
  const finished = finishedOf(await progressOf(tx, childId));
  const after = friendshipPoints(content, npcId, bond, finished);
  const before = first ? after - FRIENDSHIP_POINTS.chapter : after;
  return { before: heartsFor(before), after: heartsFor(after) };
}

// The map's characters for the active player (content/npcs): who they are, what they say on an ordinary day, their
// stories and the player's friendship with each, kept on the server. A chat raises it once a day, a gift the
// character likes once a day, every story chapter finished once (read from quest_progress, never stored twice).
// Every route acts on the active player only: no player id is ever taken from the request.
import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import { ContentId } from '@miu/schema/content';
import {
  FEAR_HEARTS,
  FRIENDSHIP_POINTS,
  NpcGiftRequest,
  NpcGiftResponse,
  NpcListResponse,
  NpcTalkResponse,
  SECRET_HEARTS,
  heartsFor,
  nextHeartAt,
  vietnamDay,
  type NpcDto,
  type NpcFriendshipDto,
} from '@miu/schema/npc';
import type { QuestState } from '@miu/schema/game';
import { storyOffer } from '@miu/quest/friendship';
import { activePlayerId, optionalAuth, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { inventoryItems, npcFriendships, questProgress, rewardLedger } from '../db/schema';
import { HttpError } from '../http-error';
import { ipKey, limiter } from '../rate-limit';
import type { Tx } from '../reward/reward-ledger';
import { questState } from '../quest/quest-access';
import type { NpcEntry } from './npc-catalog';

export interface NpcRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

type BondRow = typeof npcFriendships.$inferSelect;
type ProgressRow = typeof questProgress.$inferSelect;

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

function friendshipDto(content: ContentCatalog, npcId: string, bond: BondRow | undefined, finished: ReadonlySet<string>, today: string): NpcFriendshipDto {
  const points = friendshipPoints(content, npcId, bond, finished);
  return { npc: npcId, points, hearts: heartsFor(points), nextHeartAt: nextHeartAt(points), talkedToday: bond?.lastTalkOn === today, giftedToday: bond?.lastGiftOn === today };
}

async function bondsOf(db: Db | Tx, childId: string): Promise<Map<string, BondRow>> {
  const rows = await db.select().from(npcFriendships).where(eq(npcFriendships.childId, childId));
  return new Map(rows.map((r) => [r.npcId, r]));
}

async function progressOf(db: Db | Tx, childId: string): Promise<Map<string, ProgressRow>> {
  const rows = await db.select().from(questProgress).where(eq(questProgress.childId, childId));
  return new Map(rows.map((r) => [r.questId, r]));
}

const finishedOf = (progress: ReadonlyMap<string, ProgressRow>): Set<string> => new Set([...progress.values()].filter((r) => r.completedAt !== null).map((r) => r.questId));

/** A character the catalogue profiles, by the id in the path (404 for anything else). */
function npcOf(content: ContentCatalog, raw: unknown): NpcEntry & { id: string } {
  const id = ContentId.safeParse(raw);
  const entry = id.success ? content.npcs.npcs.get(id.data) : undefined;
  if (!id.success || !entry) throw new HttpError(404, 'npc-not-found');
  return { ...entry, id: id.data };
}

function npcDto(content: ContentCatalog, id: string, entry: NpcEntry, friendship: NpcFriendshipDto, progress: ReadonlyMap<string, ProgressRow>, finished: ReadonlySet<string>): NpcDto {
  const { profile } = entry;
  const arcs = content.npcs.arcsOf.get(id) ?? [];
  const stateOf = (questId: string): QuestState => questState(progress.get(questId));
  return {
    id,
    name: profile.name,
    region: entry.region,
    targets: entry.targets,
    role: profile.role,
    personality: profile.personality,
    voice: profile.voice,
    dream: profile.dream,
    habit: profile.habit,
    fear: friendship.hearts >= FEAR_HEARTS ? profile.fear : null,
    secret: friendship.hearts >= SECRET_HEARTS ? profile.secret : null,
    likes: profile.likes,
    climate: entry.climate,
    lines: profile.lines,
    relations: content.npcs.relations.flatMap((rel) => {
      const other = rel.a === id ? rel.b : rel.b === id ? rel.a : null;
      const known = other ? content.npcs.npcs.get(other) : undefined;
      return other && known ? [{ npc: other, name: known.profile.name, region: known.region, kind: rel.kind, note: rel.note }] : [];
    }),
    arcs: arcs.map((arc) => ({
      id: arc.id,
      title: arc.title,
      teaser: arc.teaser,
      chapters: arc.chapters.map((chapter, i) => {
        const quest = content.quests.get(chapter.quest);
        const title = quest ? { vi: quest.title, en: (quest.status === 'active' ? quest.en?.title : undefined) ?? quest.title } : { vi: chapter.quest, en: chapter.quest };
        return { questId: chapter.quest, part: i + 1, title, hearts: chapter.hearts, state: stateOf(chapter.quest) };
      }),
    })),
    friendship,
    offer: storyOffer(arcs, finished, friendship.hearts),
  };
}

const MINUTE = 60 * 1000;
/** Anti-spam per player and character (a chat or a gift counts once a day anyway). */
const perNpc = (req: Request): string => {
  const session = req.res ? optionalAuth(req.res)?.session : undefined;
  return `${session?.activeChildId || ipKey(req)}|${String(req.params.npcId)}`;
};

export function npcRoutes({ db, content, clock }: NpcRouteDeps): Router {
  const router = Router();
  const writeLimit = limiter(MINUTE, 30, perNpc);

  // Every profiled character, or one region's (`?region=`): the "Bạn bè trong làng" page and the dialogue card.
  router.get('/npcs', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const region = req.query.region === undefined ? undefined : ContentId.safeParse(req.query.region);
    if (region && !region.success) throw new HttpError(400, 'invalid-region');
    const [bonds, progress] = await Promise.all([bondsOf(db, childId), progressOf(db, childId)]);
    const finished = finishedOf(progress);
    const today = vietnamDay(clock());
    const npcs = [...content.npcs.npcs]
      .filter(([, entry]) => !region || entry.region === region.data)
      .map(([id, entry]) => npcDto(content, id, entry, friendshipDto(content, id, bonds.get(id), finished, today), progress, finished));
    res.json(NpcListResponse.parse({ npcs }));
  });

  // A chat with the character: the first of the day raises the friendship. Repeating it (the same day, or two at
  // once) changes nothing: the day's mark is set in the same conditional update that adds the point.
  router.post('/npcs/:npcId/talk', requireParent, writeLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const npc = npcOf(content, req.params.npcId);
    const today = vietnamDay(clock());
    const raised = await db.transaction(async (tx) => {
      await tx.insert(npcFriendships).values({ childId, npcId: npc.id }).onConflictDoNothing();
      const updated = await tx
        .update(npcFriendships)
        .set({ talkPoints: sql`${npcFriendships.talkPoints} + ${FRIENDSHIP_POINTS.talk}`, lastTalkOn: today })
        .where(and(eq(npcFriendships.childId, childId), eq(npcFriendships.npcId, npc.id), or(isNull(npcFriendships.lastTalkOn), ne(npcFriendships.lastTalkOn, today))))
        .returning({ npcId: npcFriendships.npcId });
      return updated.length > 0;
    });
    const [bonds, progress] = await Promise.all([bondsOf(db, childId), progressOf(db, childId)]);
    const finished = finishedOf(progress);
    const friendship = friendshipDto(content, npc.id, bonds.get(npc.id), finished, today);
    res.json(NpcTalkResponse.parse({ friendship, raised, offer: storyOffer(content.npcs.arcsOf.get(npc.id) ?? [], finished, friendship.hearts) }));
  });

  // A gift of something the character likes, from her backpack: one a day. A collectible keeps one in her collection
  // (only a spare can be given). The item leaves the inventory with a ledger row (−1, like a booster used up),
  // whose unique key makes the day's second gift, a resend or a concurrent one, a refusal that changes nothing.
  router.post('/npcs/:npcId/gift', requireParent, writeLimit, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const npc = npcOf(content, req.params.npcId);
    const body = NpcGiftRequest.safeParse(req.body ?? {});
    if (!body.success) throw new HttpError(400, 'invalid-gift');
    const { itemId } = body.data;
    if (!npc.profile.likes.includes(itemId)) throw new HttpError(400, 'gift-not-liked');
    const keep = content.items.get(itemId)?.kind === 'collectible' ? 1 : 0;
    const now = clock();
    const today = vietnamDay(now);
    const left = await db.transaction(async (tx) => {
      await tx.insert(npcFriendships).values({ childId, npcId: npc.id }).onConflictDoNothing();
      const recorded = await tx
        .insert(rewardLedger)
        .values({ id: randomUUID(), childId, source: giftSource(npc.id, today), items: { [itemId]: -1 }, createdAt: now })
        .onConflictDoNothing()
        .returning({ id: rewardLedger.id });
      if (recorded.length === 0) throw new HttpError(409, 'gift-today');
      const [spent] = await tx
        .update(inventoryItems)
        .set({ qty: sql`${inventoryItems.qty} - 1` })
        .where(and(eq(inventoryItems.childId, childId), eq(inventoryItems.itemId, itemId), sql`${inventoryItems.qty} > ${keep}`))
        .returning({ qty: inventoryItems.qty });
      // Nothing to spare: the transaction rolls back, the day's gift stays open.
      if (!spent) throw new HttpError(409, 'no-spare-item');
      await tx
        .update(npcFriendships)
        .set({ giftPoints: sql`${npcFriendships.giftPoints} + ${FRIENDSHIP_POINTS.gift}`, lastGiftOn: today })
        .where(and(eq(npcFriendships.childId, childId), eq(npcFriendships.npcId, npc.id)));
      return spent.qty;
    });
    const [bonds, progress] = await Promise.all([bondsOf(db, childId), progressOf(db, childId)]);
    const finished = finishedOf(progress);
    const friendship = friendshipDto(content, npc.id, bonds.get(npc.id), finished, today);
    res.json(NpcGiftResponse.parse({ friendship, itemId, left, offer: storyOffer(content.npcs.arcsOf.get(npc.id) ?? [], finished, friendship.hearts) }));
  });

  return router;
}

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

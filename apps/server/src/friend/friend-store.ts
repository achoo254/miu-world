// Friends and blocks in the database: requests between players (or from a companion bot), friendships (a row each
// way between players, one row with a bot), and the lists a player and the account owner see. Other players are
// named by their character only; rows are named by their own ids, never by a profile id.
import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { FRIEND_PENDING_MAX, FRIENDS_MAX, type BlockDto, type FriendDto, type FriendRequestDto, type SocialView } from '@miu/schema/friends';
import type { Db } from '../db/client';
import { characters, childProfiles, friendRequests, friendships, playerBlocks } from '../db/schema';
import { findBot } from '../multiplayer/bot-runner';
import { DEFAULT_CHARACTER_NAME } from '../player/player-routes';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type RequestOutcome =
  | { kind: 'sent'; requestId: string }
  /** The one asked had asked her already: friends at once. */
  | { kind: 'befriended' }
  | { kind: 'already-friends' }
  | { kind: 'already-sent' }
  | { kind: 'friends-full' }
  | { kind: 'friend-limit' }
  | { kind: 'blocked' };

/** What the multiplayer hub asks of the friends store; the hub's tests use an in-memory one. */
export interface FriendStore {
  request(fromChildId: string, toChildId: string): Promise<RequestOutcome>;
  botRequest(botId: string, childId: string): Promise<RequestOutcome>;
  addBot(childId: string, botId: string): Promise<'added' | 'already-friends' | 'friends-full'>;
  areFriends(a: string, b: string): Promise<boolean>;
  botFriends(childId: string): Promise<Set<string>>;
}

/** Where players and bots are now, for the "online" of a friends list (the hub knows; without it, nobody is). */
export interface OnlineLookup {
  player(childId: string): { publicId: string; mapId: string } | null;
  bot(botId: string): { mapId: string } | null;
}

export const NOBODY_ONLINE: OnlineLookup = { player: () => null, bot: () => null };

const BOT_FALLBACK = { displayName: 'Bạn máy', species: 'cat' };

const botLook = (botId: string): { displayName: string; species: string } => {
  const bot = findBot(botId)?.profile;
  return bot ? { displayName: bot.displayName, species: bot.species } : BOT_FALLBACK;
};

/** Locks both players' rows, in a fixed order, so two requests between the same pair run one after the other. */
async function lockPlayers(tx: Tx, ids: string[]): Promise<void> {
  for (const id of [...ids].sort()) await tx.select({ id: childProfiles.id }).from(childProfiles).where(eq(childProfiles.id, id)).for('update');
}

async function friendCount(tx: Tx, childId: string): Promise<number> {
  const [row] = await tx.select({ n: count() }).from(friendships).where(eq(friendships.childId, childId));
  return row?.n ?? 0;
}

async function blockedEitherWay(tx: Tx, a: string, b: string): Promise<boolean> {
  const rows = await tx
    .select({ id: playerBlocks.id })
    .from(playerBlocks)
    .where(or(and(eq(playerBlocks.childId, a), eq(playerBlocks.blockedChildId, b)), and(eq(playerBlocks.childId, b), eq(playerBlocks.blockedChildId, a))));
  return rows.length > 0;
}

/** Friends both ways between two players; any request between them is answered by it. */
async function befriend(tx: Tx, a: string, b: string): Promise<void> {
  await tx
    .insert(friendships)
    .values([
      { id: randomUUID(), childId: a, friendChildId: b },
      { id: randomUUID(), childId: b, friendChildId: a },
    ])
    .onConflictDoNothing();
  await tx
    .delete(friendRequests)
    .where(or(and(eq(friendRequests.childId, a), eq(friendRequests.fromChildId, b)), and(eq(friendRequests.childId, b), eq(friendRequests.fromChildId, a))));
}

async function isFriend(tx: Tx | Db, childId: string, friendChildId: string): Promise<boolean> {
  const rows = await tx
    .select({ id: friendships.id })
    .from(friendships)
    .where(and(eq(friendships.childId, childId), eq(friendships.friendChildId, friendChildId)));
  return rows.length > 0;
}

export function dbFriendStore(db: Db): FriendStore {
  return {
    request: (from, to) =>
      db.transaction(async (tx): Promise<RequestOutcome> => {
        await lockPlayers(tx, [from, to]);
        if (await blockedEitherWay(tx, from, to)) return { kind: 'blocked' };
        if (await isFriend(tx, from, to)) return { kind: 'already-friends' };
        const full = (await friendCount(tx, from)) >= FRIENDS_MAX || (await friendCount(tx, to)) >= FRIENDS_MAX;
        const [asked] = await tx
          .select({ id: friendRequests.id })
          .from(friendRequests)
          .where(and(eq(friendRequests.childId, from), eq(friendRequests.fromChildId, to)));
        if (asked) {
          if (full) return { kind: 'friends-full' };
          await befriend(tx, from, to);
          return { kind: 'befriended' };
        }
        const [sent] = await tx
          .select({ id: friendRequests.id })
          .from(friendRequests)
          .where(and(eq(friendRequests.childId, to), eq(friendRequests.fromChildId, from)));
        if (sent) return { kind: 'already-sent' };
        if (full) return { kind: 'friends-full' };
        const [pending] = await tx.select({ n: count() }).from(friendRequests).where(eq(friendRequests.fromChildId, from));
        if ((pending?.n ?? 0) >= FRIEND_PENDING_MAX) return { kind: 'friend-limit' };
        const requestId = randomUUID();
        await tx.insert(friendRequests).values({ id: requestId, childId: to, fromChildId: from });
        return { kind: 'sent', requestId };
      }),

    botRequest: (botId, childId) =>
      db.transaction(async (tx): Promise<RequestOutcome> => {
        await lockPlayers(tx, [childId]);
        const [friend] = await tx.select({ id: friendships.id }).from(friendships).where(and(eq(friendships.childId, childId), eq(friendships.botId, botId)));
        if (friend) return { kind: 'already-friends' };
        const [sent] = await tx.select({ id: friendRequests.id }).from(friendRequests).where(and(eq(friendRequests.childId, childId), eq(friendRequests.fromBotId, botId)));
        if (sent) return { kind: 'already-sent' };
        if ((await friendCount(tx, childId)) >= FRIENDS_MAX) return { kind: 'friends-full' };
        const requestId = randomUUID();
        await tx.insert(friendRequests).values({ id: requestId, childId, fromBotId: botId });
        return { kind: 'sent', requestId };
      }),

    addBot: (childId, botId) =>
      db.transaction(async (tx) => {
        await lockPlayers(tx, [childId]);
        const [friend] = await tx.select({ id: friendships.id }).from(friendships).where(and(eq(friendships.childId, childId), eq(friendships.botId, botId)));
        if (friend) return 'already-friends' as const;
        if ((await friendCount(tx, childId)) >= FRIENDS_MAX) return 'friends-full' as const;
        await tx.insert(friendships).values({ id: randomUUID(), childId, botId });
        await tx.delete(friendRequests).where(and(eq(friendRequests.childId, childId), eq(friendRequests.fromBotId, botId)));
        return 'added' as const;
      }),

    areFriends: (a, b) => isFriend(db, a, b),

    async botFriends(childId) {
      const rows = await db
        .select({ botId: friendships.botId })
        .from(friendships)
        .where(and(eq(friendships.childId, childId), isNotNull(friendships.botId)));
      return new Set(rows.flatMap((r) => (r.botId ? [r.botId] : [])));
    },
  };
}

/** Character name and species of some players, by profile id. */
async function looksOf(db: Db, ids: string[]): Promise<Map<string, { displayName: string; species: string }>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select({ childId: characters.childId, name: characters.name, species: characters.species }).from(characters).where(inArray(characters.childId, ids));
  return new Map(rows.map((r) => [r.childId, { displayName: r.name, species: r.species }]));
}

const lookOf = (looks: Map<string, { displayName: string; species: string }>, id: string | null) =>
  (id ? looks.get(id) : undefined) ?? { displayName: DEFAULT_CHARACTER_NAME, species: 'cat' };

/** A player's friends, the requests for her and from her, and the players she blocked. */
export async function socialView(db: Db, childId: string, lookup: OnlineLookup): Promise<SocialView> {
  const [[viewer], blockedWith] = await Promise.all([
    db.select({ onlineEnabled: childProfiles.onlineEnabled }).from(childProfiles).where(eq(childProfiles.id, childId)),
    db
      .select({ a: playerBlocks.childId, b: playerBlocks.blockedChildId })
      .from(playerBlocks)
      .where(or(eq(playerBlocks.childId, childId), eq(playerBlocks.blockedChildId, childId))),
  ]);
  // Playing offline, she sees nobody online; and never someone blocked either way.
  const hidden = new Set(blockedWith.map((r) => (r.a === childId ? r.b : r.a)));
  const online: OnlineLookup = viewer?.onlineEnabled ? { player: (id) => (hidden.has(id) ? null : lookup.player(id)), bot: lookup.bot } : NOBODY_ONLINE;
  const [friendRows, incomingRows, outgoingRows, blockRows] = await Promise.all([
    db.select().from(friendships).where(eq(friendships.childId, childId)).orderBy(asc(friendships.createdAt)),
    db.select().from(friendRequests).where(eq(friendRequests.childId, childId)).orderBy(asc(friendRequests.createdAt)),
    db.select().from(friendRequests).where(eq(friendRequests.fromChildId, childId)).orderBy(asc(friendRequests.createdAt)),
    db.select().from(playerBlocks).where(eq(playerBlocks.childId, childId)).orderBy(asc(playerBlocks.createdAt)),
  ]);
  const others = [
    ...friendRows.map((r) => r.friendChildId),
    ...incomingRows.map((r) => r.fromChildId),
    ...outgoingRows.map((r) => r.childId),
    ...blockRows.map((r) => r.blockedChildId),
  ].filter((id): id is string => id !== null);
  const looks = await looksOf(db, [...new Set(others)]);

  const friends: FriendDto[] = friendRows.map((row) => {
    if (row.botId) {
      const where = online.bot(row.botId);
      return { id: row.id, ...botLook(row.botId), isBot: true, since: row.createdAt.toISOString(), online: where !== null, publicId: where ? row.botId : null, mapId: where?.mapId ?? null };
    }
    const where = row.friendChildId ? online.player(row.friendChildId) : null;
    return { id: row.id, ...lookOf(looks, row.friendChildId), isBot: false, since: row.createdAt.toISOString(), online: where !== null, publicId: where?.publicId ?? null, mapId: where?.mapId ?? null };
  });
  const incoming: FriendRequestDto[] = incomingRows.map((row) => ({
    id: row.id,
    ...(row.fromBotId ? botLook(row.fromBotId) : lookOf(looks, row.fromChildId)),
    isBot: row.fromBotId !== null,
    sentAt: row.createdAt.toISOString(),
  }));
  const outgoing: FriendRequestDto[] = outgoingRows.map((row) => ({ id: row.id, ...lookOf(looks, row.childId), isBot: false, sentAt: row.createdAt.toISOString() }));
  const blocks: BlockDto[] = blockRows.map((row) => ({ id: row.id, ...lookOf(looks, row.blockedChildId), since: row.createdAt.toISOString() }));
  return { friends, incoming, outgoing, blocks, max: FRIENDS_MAX };
}

/** Whether a request for her with this id is waiting. */
export async function hasRequest(db: Db, childId: string, requestId: string): Promise<boolean> {
  const rows = await db.select({ id: friendRequests.id }).from(friendRequests).where(and(eq(friendRequests.id, requestId), eq(friendRequests.childId, childId)));
  return rows.length > 0;
}

export type AnswerOutcome =
  | { kind: 'answered'; fromChildId: string | null; fromBotId: string | null; accepted: boolean }
  | { kind: 'friends-full' }
  | { kind: 'not-found' };

/**
 * She answers a request for her. Accepted: friends with the sender (both ways with a player). A request from a
 * player she or who blocked her since is simply gone.
 */
export function answerRequest(db: Db, childId: string, requestId: string, accept: boolean): Promise<AnswerOutcome> {
  return db.transaction(async (tx): Promise<AnswerOutcome> => {
    const [seen] = await tx.select().from(friendRequests).where(and(eq(friendRequests.id, requestId), eq(friendRequests.childId, childId)));
    if (!seen) return { kind: 'not-found' };
    // The same locks as a block and a request take, then the request read again: a block, a take-back or another
    // answer that came first wins.
    await lockPlayers(tx, seen.fromChildId ? [childId, seen.fromChildId] : [childId]);
    const [request] = await tx.select().from(friendRequests).where(and(eq(friendRequests.id, requestId), eq(friendRequests.childId, childId))).for('update');
    if (!request) return { kind: 'not-found' };
    const { fromChildId, fromBotId } = request;
    if (fromChildId && (await blockedEitherWay(tx, childId, fromChildId))) {
      await tx.delete(friendRequests).where(eq(friendRequests.id, requestId));
      return { kind: 'not-found' };
    }
    if (accept) {
      const full = (await friendCount(tx, childId)) >= FRIENDS_MAX || (fromChildId !== null && (await friendCount(tx, fromChildId)) >= FRIENDS_MAX);
      if (full) return { kind: 'friends-full' };
      if (fromChildId) await befriend(tx, childId, fromChildId);
      else if (fromBotId) await tx.insert(friendships).values({ id: randomUUID(), childId, botId: fromBotId }).onConflictDoNothing();
    }
    await tx.delete(friendRequests).where(eq(friendRequests.id, requestId));
    return { kind: 'answered', fromChildId, fromBotId, accepted: accept };
  });
}

/** She takes back a request of hers; the player it was for, or null when there is no such request of hers. */
export function cancelRequest(db: Db, childId: string, requestId: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [seen] = await tx.select({ to: friendRequests.childId }).from(friendRequests).where(and(eq(friendRequests.id, requestId), eq(friendRequests.fromChildId, childId)));
    if (!seen) return null;
    await lockPlayers(tx, [childId, seen.to]);
    const [row] = await tx
      .delete(friendRequests)
      .where(and(eq(friendRequests.id, requestId), eq(friendRequests.fromChildId, childId)))
      .returning({ childId: friendRequests.childId });
    return row?.childId ?? null;
  });
}

/** Ends one of her friendships (both ways with a player); who it was with, or null when it is not hers. */
export function removeFriend(db: Db, childId: string, friendshipId: string): Promise<{ otherChildId: string | null; botId: string | null } | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .delete(friendships)
      .where(and(eq(friendships.id, friendshipId), eq(friendships.childId, childId)))
      .returning({ friendChildId: friendships.friendChildId, botId: friendships.botId });
    if (!row) return null;
    if (row.friendChildId) await tx.delete(friendships).where(and(eq(friendships.childId, row.friendChildId), eq(friendships.friendChildId, childId)));
    return { otherChildId: row.friendChildId, botId: row.botId };
  });
}

/** Lifts one of her blocks; the player it was about, or null when it is not hers. */
export async function unblock(db: Db, childId: string, blockId: string): Promise<string | null> {
  const [row] = await db
    .delete(playerBlocks)
    .where(and(eq(playerBlocks.id, blockId), eq(playerBlocks.childId, childId)))
    .returning({ blockedChildId: playerBlocks.blockedChildId });
  return row?.blockedChildId ?? null;
}

/**
 * `childId` blocks `blockedChildId`: the block, and the end of any friendship and request between the two, in one
 * transaction under the same locks a request and an answer take, so no answer can make them friends meanwhile.
 */
export function blockPlayer(db: Db, childId: string, blockedChildId: string): Promise<void> {
  return db.transaction(async (tx) => {
    await lockPlayers(tx, [childId, blockedChildId]);
    await tx.insert(playerBlocks).values({ id: randomUUID(), childId, blockedChildId }).onConflictDoNothing();
    const [a, b] = [childId, blockedChildId];
    await tx.delete(friendships).where(or(and(eq(friendships.childId, a), eq(friendships.friendChildId, b)), and(eq(friendships.childId, b), eq(friendships.friendChildId, a))));
    await tx.delete(friendRequests).where(or(and(eq(friendRequests.childId, a), eq(friendRequests.fromChildId, b)), and(eq(friendRequests.childId, b), eq(friendRequests.fromChildId, a))));
  });
}

// Phòng truyền thống: the trophy room of the child's home, read from the ledger and the inventory.
import { Router } from 'express';
import { ACHIEVEMENT_CATEGORIES, achievementOfSource } from '@miu/schema/achievement';
import { collectionOfSource } from '@miu/schema/collectible';
import { plaqueStars, type TrophyRoomResponse } from '@miu/schema/trophy-room';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { loadPlayerRecord, type PlayerRecord } from './player-facts';

export interface TrophyRoomRouteDeps {
  db: Db;
  content: ContentCatalog;
}

const iso = (at: Date | undefined): string | null => (at ? at.toISOString() : null);

/** Her trophy room from what the server already keeps: her badges, her claimed sets and achievements, their dates. */
export function trophyRoom(content: ContentCatalog, record: PlayerRecord): TrophyRoomResponse {
  // The ledger is oldest first: the first row giving an item is when she earned it.
  const firstGiven = new Map<string, Date>();
  const sets = new Map<string, Date>();
  const achievements = new Map<string, Date>();
  for (const row of record.ledger) {
    for (const [itemId, qty] of Object.entries(row.items)) if (qty > 0 && !firstGiven.has(itemId)) firstGiven.set(itemId, row.createdAt);
    const set = collectionOfSource(row.source);
    if (set) sets.set(set, row.createdAt);
    const achievement = achievementOfSource(row.source);
    if (achievement) achievements.set(achievement, row.createdAt);
  }
  const badges = [...content.items.values()]
    .filter((item) => item.kind === 'badge')
    .map((item) => ({ itemId: item.id, earnedAt: record.inventory.has(item.id) ? iso(firstGiven.get(item.id)) : null }));
  const cups = [...content.collectibles.values()].map((set) => ({ mapId: set.mapId, earnedAt: iso(sets.get(set.mapId)) }));
  const plaques = ACHIEVEMENT_CATEGORIES.map((category) => {
    const entries = [...content.achievements.values()].filter((entry) => entry.category === category);
    const dates = entries.flatMap((entry) => achievements.get(entry.id) ?? []);
    const latest = dates.reduce<Date | undefined>((a, b) => (a && a > b ? a : b), undefined);
    return { category, claimed: dates.length, total: entries.length, stars: plaqueStars(dates.length, entries.length), lastAt: iso(latest) };
  });
  return { badges, cups, plaques };
}

/**
 * The trophy room of the selected player (Phòng truyền thống in her home): `GET /trophies` lists every event badge,
 * every collection set's cup and every achievement category's plaque, with what is hers and when she earned it.
 * Read only: nothing here pays or changes anything.
 */
export function trophyRoomRoutes({ db, content }: TrophyRoomRouteDeps): Router {
  const router = Router();
  router.get('/trophies', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const body: TrophyRoomResponse = trophyRoom(content, await loadPlayerRecord(db, childId));
    res.json(body);
  });
  return router;
}

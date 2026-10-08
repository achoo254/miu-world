// The trophy room of the child's home (Phòng truyền thống): what she has earned, as the server keeps it, and the
// keys of the display spots the home map writes for each piece (world-entities.ts `trophies`). The server says
// what is hers (`GET /api/trophies`); the game shows a spot's piece only when its key is among hers, its empty
// stand otherwise.
import { z } from 'zod';
import { AchievementCategory } from './achievement';
import { ContentId } from './content';

/** Stars on an achievement category's plaque. */
export const PLAQUE_STARS = 3;

/**
 * Stars a category's plaque shows for the achievements claimed of it: one for the first, two from half of them,
 * all three once every one is claimed.
 */
export function plaqueStars(claimed: number, total: number): number {
  if (claimed <= 0 || total <= 0) return 0;
  if (claimed >= total) return PLAQUE_STARS;
  return claimed * 2 >= total ? 2 : 1;
}

/** Display spot keys: an event badge (item id), a collection set's cup (its map id), a plaque's nth star. */
export const trophyKey = {
  badge: (itemId: string): string => `badge:${itemId}`,
  cup: (mapId: string): string => `cup:${mapId}`,
  star: (category: AchievementCategory, n: number): string => `star:${category}:${n}`,
};

/** When it was earned, ISO; null while not earned yet. */
const EarnedAt = z.iso.datetime({ offset: true }).nullable();

export const TrophyRoomResponse = z.strictObject({
  /** Every event badge of the catalogue (content/items, kind `badge`), hers or not. */
  badges: z.array(z.strictObject({ itemId: ContentId, earnedAt: EarnedAt })),
  /** Every collection set: its cup is hers once she claimed the full set. */
  cups: z.array(z.strictObject({ mapId: ContentId, earnedAt: EarnedAt })),
  /** One plaque per achievement category: how many she claimed of how many, its stars, the latest claim. */
  plaques: z.array(
    z.strictObject({
      category: AchievementCategory,
      claimed: z.number().int().min(0),
      total: z.number().int().min(0),
      stars: z.number().int().min(0).max(PLAQUE_STARS),
      lastAt: EarnedAt,
    }),
  ),
});
export type TrophyRoomResponse = z.infer<typeof TrophyRoomResponse>;

/** The display keys of everything she has: the spots whose pieces stand in her trophy room. */
export function earnedTrophyKeys(room: TrophyRoomResponse): Set<string> {
  const keys = new Set<string>();
  for (const b of room.badges) if (b.earnedAt) keys.add(trophyKey.badge(b.itemId));
  for (const c of room.cups) if (c.earnedAt) keys.add(trophyKey.cup(c.mapId));
  for (const p of room.plaques) for (let n = 1; n <= p.stars; n++) keys.add(trophyKey.star(p.category, n));
  return keys;
}


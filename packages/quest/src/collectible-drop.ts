// Which collectible a paid quest or minigame run drops (content/collectibles.json): one thing of the region's
// set, picked from a roll seeded by the run's own key, so the same run always names the same thing. Things she
// does not own yet come first (a set fills up in a dozen or so runs, never a hunt for the last one); a quarter
// of the runs pick from the whole set instead, so doubles happen and add to her count. Rarer things weigh less.
// Pure, so the server decides with it and tests can replay a run.
import type { CollectibleEntry, CollectibleRarity } from '@miu/schema/collectible';

export const RARITY_WEIGHT: Readonly<Record<CollectibleRarity, number>> = { common: 6, uncommon: 3, rare: 1 };
/** Share of runs that pick from the whole set (a double is possible) even while things are missing. */
export const WHOLE_SET_SHARE = 0.25;

/** A number in [0, 1) from a string (FNV-1a 32-bit): stable across runs, machines and releases. */
export function seededRoll(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0x1_0000_0000;
}

function weightedPick(entries: readonly CollectibleEntry[], roll: number): CollectibleEntry | undefined {
  const total = entries.reduce((sum, e) => sum + RARITY_WEIGHT[e.rarity], 0);
  let left = roll * total;
  for (const entry of entries) {
    left -= RARITY_WEIGHT[entry.rarity];
    if (left < 0) return entry;
  }
  return entries[entries.length - 1];
}

/**
 * The thing a run drops: `key` names the run (the same key, the same thing for the same collection), `owned`
 * how many of each she has before it. Null for an empty set.
 */
export function pickCollectible(entries: readonly CollectibleEntry[], owned: ReadonlyMap<string, number>, key: string): string | null {
  const missing = entries.filter((e) => (owned.get(e.id) ?? 0) < 1);
  const pool = missing.length > 0 && seededRoll(`${key}|pool`) >= WHOLE_SET_SHARE ? missing : entries;
  return weightedPick(pool, seededRoll(`${key}|item`))?.id ?? null;
}

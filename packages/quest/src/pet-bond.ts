// The pet's needs and bond, shared by the server (which counts them) and the tests. Pure: time comes in as
// milliseconds, nothing is read from a clock here.
//
// Needs drift down slowly while the player is away and stop at a cheerful floor; each care scene lifts the need it
// answers. Bond XP comes from care (a care pays once in a while, not on every tap) and from time walking together,
// and its level opens the tricks.
import {
  PET_LEVEL_XP,
  PET_STAT_FLOOR,
  PET_TRICKS,
  type PetCareAction,
  type PetCareStats,
  type PetTrick,
} from '@miu/schema/pet-care';

/** A new pet's needs: content, a little peckish. */
export const STARTING_STATS: Readonly<PetCareStats> = { happiness: 80, fullness: 75, cleanliness: 85 };

/** Points each need loses per hour while nobody cares for it (down to `PET_STAT_FLOOR`, never lower). */
export const DECAY_PER_HOUR: Readonly<PetCareStats> = { happiness: 2, fullness: 3, cleanliness: 2 };

/** Bond XP of a care scene, paid when the same care was last paid at least `CARE_XP_GAP_MS` ago. */
export const CARE_XP = 10;
export const CARE_XP_GAP_MS = 30_000;

/** The play screen reports a walk together about once a minute; one report counts at most this many seconds. */
export const WALK_BEAT_SECONDS = 60;
/** Seconds of walking together per bond XP. */
export const WALK_SECONDS_PER_XP = 30;

/** What each care scene does to the needs (a play tires it a little: hungrier, dustier, never below the floor). */
const CARE_EFFECTS: Readonly<Record<PetCareAction, Partial<PetCareStats>>> = {
  feed: { fullness: 35, happiness: 5 },
  pet: { happiness: 20 },
  bath: { cleanliness: 40, happiness: 5 },
  play: { happiness: 25, fullness: -5, cleanliness: -5 },
  nap: { happiness: 15 },
};

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/** The needs `elapsedMs` after they were `stats`: each lower by its hourly drift, none below the floor (or below where it already was). */
export function decayedStats(stats: PetCareStats, elapsedMs: number): PetCareStats {
  const hours = Math.max(0, elapsedMs) / 3_600_000;
  const drift = (key: keyof PetCareStats): number => {
    const now = stats[key];
    if (now <= PET_STAT_FLOOR) return now;
    return clamp(Math.max(PET_STAT_FLOOR, now - DECAY_PER_HOUR[key] * hours));
  };
  return { happiness: drift('happiness'), fullness: drift('fullness'), cleanliness: drift('cleanliness') };
}

/**
 * The needs after a care scene. `dish`: a cooked dish fed instead of the pet's own food (its own fullness and
 * happiness). A need a scene lowers stops at the floor.
 */
export function applyCare(stats: PetCareStats, action: PetCareAction, dish?: { fullness: number; happiness: number }): PetCareStats {
  const effect = action === 'feed' && dish ? { fullness: dish.fullness, happiness: dish.happiness } : CARE_EFFECTS[action];
  const next = (key: keyof PetCareStats): number => {
    const delta = effect[key] ?? 0;
    if (delta >= 0) return clamp(stats[key] + delta);
    return clamp(Math.max(Math.min(stats[key], PET_STAT_FLOOR), stats[key] + delta));
  };
  return { happiness: next('happiness'), fullness: next('fullness'), cleanliness: next('cleanliness') };
}

export interface PetLevelInfo {
  level: number;
  /** XP where this level started. */
  levelXp: number;
  /** XP where the next level starts; null at the top. */
  nextLevelXp: number | null;
}

export function petLevel(xp: number): PetLevelInfo {
  if (!Number.isInteger(xp) || xp < 0) throw new RangeError('pet xp must be a non-negative integer');
  let index = 0;
  while (index + 1 < PET_LEVEL_XP.length && (PET_LEVEL_XP[index + 1] ?? Infinity) <= xp) index += 1;
  return { level: index + 1, levelXp: PET_LEVEL_XP[index] ?? 0, nextLevelXp: PET_LEVEL_XP[index + 1] ?? null };
}

/** The tricks open at `level`, in the order they open. */
export function unlockedTricks(level: number): PetTrick[] {
  return PET_TRICKS.filter((t) => t.level <= level).map((t) => t.id);
}

/** Whether a care paid at `lastPaidAt` (ms, or never) may pay again at `now`. */
export function careXpDue(lastPaidAt: number | undefined, now: number): boolean {
  return lastPaidAt === undefined || now - lastPaidAt >= CARE_XP_GAP_MS;
}

/**
 * Seconds of walking together a report at `now` counts: the time since the last counted report, at most one beat
 * (a first report, or one after a break, counts one beat). Reports sent faster than the clock count no faster.
 */
export function walkCredit(lastWalkAt: number | null, now: number): number {
  if (lastWalkAt === null) return WALK_BEAT_SECONDS;
  return Math.max(0, Math.min(WALK_BEAT_SECONDS, Math.floor((now - lastWalkAt) / 1000)));
}

/** Total bond XP from care XP and seconds walked together. */
export function bondXp(careXp: number, walkSeconds: number): number {
  return careXp + Math.floor(walkSeconds / WALK_SECONDS_PER_XP);
}

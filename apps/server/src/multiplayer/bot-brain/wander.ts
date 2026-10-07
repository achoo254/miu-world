// Where a companion bot goes next is its own choice. A chooser is asked each time it stands free (it arrived, rested,
// rode, got stuck, or just came in) and answers with what it does: walk to a place or in a direction, stay a while
// (working at a place, or resting), or ride from a stop. The chooser here only wanders: a place it sees, else a
// spot it sees off in some direction, kept within reach of its home; a chooser that learns where to go takes its place.
import type { WalkPlace } from '@miu/voxel/walk-cells';
import type { PathGoal } from './local-path';
import { seePlaces } from './sight';
import type { Spot, WalkMap } from './walk-store';

/** What just happened to it. */
export type Outcome =
  | { kind: 'start' }
  | { kind: 'arrived'; place: WalkPlace | null }
  | { kind: 'rested' }
  /** `seconds`: from its last headway to giving up, as its feet count it. */
  | { kind: 'stuck'; seconds?: number }
  | { kind: 'rode'; stop: WalkPlace }
  /** Its chooser ended what it was doing (`GoalChooser.sense`). */
  | { kind: 'enough' };

/** What it does next. */
export type Choice =
  /** `via`: a way it knows, walked point by point on the way to `goal` (each point a column it stood on). */
  | { kind: 'go'; goal: PathGoal; place: WalkPlace | null; via?: readonly Spot[] }
  /** Busy at a place (`work`) or idling (`rest`) for a while. */
  | { kind: 'work' | 'rest'; seconds: number }
  | { kind: 'ride'; stop: WalkPlace; to: Spot }
  /** Stuck for good: put back at `to` (a standing spot it knows). */
  | { kind: 'reset'; to: Spot };

/** What a chooser knows of the bot: where it is and what it sees, never the whole map. */
export interface BotView {
  readonly map: WalkMap;
  readonly at: Spot;
  readonly home: Spot;
  readonly sight: number;
}

export interface GoalChooser {
  next(view: BotView, last: Outcome): Choice;
  /**
   * Told every tick what the bot walked (columns, in order) over `dt` seconds and whether it is on its way somewhere;
   * true ends what it is doing now (`next` is then asked with `enough`).
   */
  sense?(view: BotView, walked: readonly Spot[], dt: number, walking: boolean): boolean;
}

/** A place this close counts as reached (every quest target has a standing spot this near, walk-export test). */
export const PLACE_REACH = 3;
/** Exploring, it walks to a spot it sees this far off, in sights (one within a few columns of the point it looks at). */
const EXPLORE_MIN = 0.6;
const EXPLORE_MAX = 1;
const EXPLORE_SNAP = 4;
const EXPLORE_TRIES = 4;
const EXPLORE_REACH = 2;
/** Wandering further from home than this, it turns back towards it. */
export const HOME_LEASH = 160;
/** How often it walks to a place it sees rather than off in a direction. */
const PLACE_CHANCE = 0.6;
/** How often it takes a ride from a stop it reached. */
const RIDE_CHANCE = 0.3;

/** The wandering chooser: random by `random`, nothing learnt. */
export function wanderChooser(random: () => number): GoalChooser {
  let lastPlace: string | null = null;
  const pause = (min: number, max: number): number => min + (max - min) * random();
  const pick = <T>(list: readonly T[]): T | undefined => list[Math.floor(random() * list.length)];

  const goSomewhere = (view: BotView): Choice => {
    const { at, home, map, sight } = view;
    const fromHome = Math.hypot(at.x - home.x, at.z - home.z);
    if (fromHome <= HOME_LEASH && random() < PLACE_CHANCE) {
      const seen = seePlaces(map, at, sight).filter((p) => p.id !== lastPlace && Math.hypot(p.at[0] - at.x, p.at[2] - at.z) > PLACE_REACH + 1);
      const place = pick(seen);
      if (place) {
        lastPlace = place.id;
        return { kind: 'go', goal: { x: place.at[0], y: place.at[1], z: place.at[2], reach: PLACE_REACH }, place };
      }
    }
    // A direction: anywhere while near home, back towards it when far; walked to a spot it sees that way.
    for (let tries = 0; tries < EXPLORE_TRIES; tries++) {
      const angle = fromHome > HOME_LEASH ? Math.atan2(home.x - at.x, home.z - at.z) + (random() - 0.5) : random() * 2 * Math.PI;
      const far = sight * (EXPLORE_MIN + (EXPLORE_MAX - EXPLORE_MIN) * random());
      const there = map.snap({ x: at.x + 0.5 + Math.sin(angle) * far, y: at.y, z: at.z + 0.5 + Math.cos(angle) * far }, EXPLORE_SNAP);
      if (!there || Math.max(Math.abs(there.x - at.x), Math.abs(there.z - at.z)) > sight) continue;
      return { kind: 'go', goal: { x: there.x + 0.5, y: there.y, z: there.z + 0.5, reach: EXPLORE_REACH }, place: null };
    }
    return { kind: 'rest', seconds: pause(1, 3) };
  };

  return {
    next(view, last) {
      if (last.kind === 'arrived') {
        const place = last.place;
        const arrival = place?.kind === 'stop' && place.ride ? view.map.snap({ x: place.ride[0], y: place.ride[1], z: place.ride[2] }, 4) : null;
        if (place && arrival && random() < RIDE_CHANCE) return { kind: 'ride', stop: place, to: arrival };
        if (place?.kind === 'npc' || place?.kind === 'object') return { kind: 'work', seconds: pause(3, 7) };
        return { kind: 'rest', seconds: pause(2.5, 6) };
      }
      if (last.kind === 'rode') return { kind: 'rest', seconds: pause(1, 3) };
      if (last.kind === 'start') return { kind: 'rest', seconds: pause(0.5, 3) };
      return goSomewhere(view);
    },
  };
}

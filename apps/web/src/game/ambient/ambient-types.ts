// Vocabulary of ambient life scripts: a routine is a set of chores, a chore a list of beats. Pure data
// types shared by the routines, the actor state machine and the three.js layer.

export type Vec3 = readonly [number, number, number];
/** Inclusive range a beat draws a value from (seconds, loops, hops). */
export type Range = readonly [number, number];

/**
 * Hand-made movement layered on top of the model's clip, on its own parts: an arm to the forehead,
 * both arms up, the head turning, a cup to the mouth, a raised waving arm, a rod held out or jerked.
 */
export type Pose = 'none' | 'wipe-sweat' | 'stretch' | 'look-around' | 'drink' | 'wave' | 'rod-hold' | 'rod-reel' | 'sleepy';

/** What the wings do this frame: folded, spread for a glide, beating, or a bee's fast buzz. */
export type Wings = 'folded' | 'glide' | 'flap' | 'buzz';

/** A named place from the map (`spots`), or `home` where the character was placed. */
export type SpotRef = string;

export type Beat =
  /** Walk (or run, with `clip`) to a place; `sideways` for a crab. */
  | { readonly do: 'walk'; readonly to: SpotRef; readonly speed?: number; readonly clip?: string; readonly sideways?: boolean }
  /** Walk to a random point within `radius` of home. */
  | { readonly do: 'wander'; readonly radius: number; readonly speed?: number; readonly clip?: string; readonly sideways?: boolean }
  /** Hop in small arcs towards a place or a random point near home. */
  | { readonly do: 'hop'; readonly to: SpotRef | 'wander'; readonly hops: Range; readonly radius?: number }
  /** Play a clip in place for `seconds` or `loops` times, facing a place, with a pose on top. */
  | { readonly do: 'act'; readonly clip: string; readonly seconds?: Range; readonly loops?: Range; readonly face?: SpotRef; readonly pose?: Pose; readonly speed?: number }
  /** Take the n-th `held` item in the right hand, or empty it. */
  | { readonly do: 'hold'; readonly item: number | null }
  /** Say a line from a pool; the nearest villager in earshot may answer from `reply`. */
  | { readonly do: 'say'; readonly pool: string; readonly reply?: string }
  /** Fly in an arc to a place (a tree top, a flower), wings beating up and gliding down. */
  | { readonly do: 'fly'; readonly to: SpotRef; readonly height: number }
  /** Fly loops around a place in the sky. */
  | { readonly do: 'circle'; readonly around: SpotRef; readonly radius: number; readonly height: number; readonly seconds: Range }
  /** A fish leaping out of the water at a place and back in; hidden otherwise. */
  | { readonly do: 'leap'; readonly at: SpotRef; readonly height: number; readonly after: Range };

export interface Chore {
  readonly id: string;
  readonly weight: number;
  readonly beats: readonly Beat[];
  /** Big movement (flights, hops, leaps, runs): skipped when the device asks for reduced motion. */
  readonly lively?: boolean;
}

export interface RoutineSpec {
  /** People hold tools and talk; flyers and swimmers never stop for the child. */
  readonly kind: 'person' | 'animal' | 'flyer' | 'swimmer';
  /** Walking speed in blocks per second. */
  readonly walkSpeed: number;
  readonly chores: readonly Chore[];
  /** The child within this distance: the character stops its chore, turns and greets (0: never). */
  readonly noticeRadius: number;
  /** Interaction radius for "Trò chuyện" / "Vuốt ve" (0: cannot be tapped). */
  readonly reach: number;
  /** Prompt action, e.g. "Trò chuyện". */
  readonly label: string;
  /** Played once when the child comes near: a clip and a greeting pool. */
  readonly greet: { readonly clip: string; readonly pool: string };
  /** Played when the child taps it; then the character goes back to its chore. */
  readonly react: readonly Chore[];
  /** Played when the child finishes a quest nearby: the world cheers (lively chores skipped under reduced motion; empty: it carries on). */
  readonly celebrate: readonly Chore[];
  /** Clip while it watches the child (people idle; a sleepy fox keeps dozing). */
  readonly watchClip?: string;
  /** Wings the three.js layer moves: a bird's beat in flight, a bee's never-ending buzz. */
  readonly wings?: 'bird' | 'bee';
  /** A swimmer is hidden between leaps; everyone else is always shown. */
  readonly hiddenAtRest?: boolean;
}

/** Everything the three.js layer needs to draw one actor this frame. */
export interface ActorFrame {
  readonly position: Vec3;
  readonly yaw: number;
  /** Nose up (+) or down (−), for flights and leaps. */
  readonly pitch: number;
  readonly clip: string;
  readonly clipSpeed: number;
  readonly pose: Pose;
  /** Seconds the pose has run, for its rhythm. */
  readonly poseTime: number;
  readonly wings: Wings;
  /** Index into `held`, or null for empty hands. */
  readonly held: number | null;
  readonly visible: boolean;
}

/** A line spoken this frame, and the pool a nearby villager may answer from. */
export interface Speech {
  readonly pool: string;
  readonly reply?: string;
}

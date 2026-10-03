// The minigame API every game folder implements (docs/minigames.md). A game is a pure logic module (no DOM,
// no canvas: the bot tests run it in Node) and a draw function the host calls every frame with a 2D context
// already scaled to the arena. Coordinates are arena units: the shorter side of the screen is always
// ARENA_SHORT_SIDE units, the longer one grows with the screen's shape.
import type { MinigameParams } from '@miu/schema/content';
import type { Rng } from './rng';
import type { SpriteRef, Sprites } from './sprites';
import type { Theme } from './theme';
import type { NoteVoice } from '../sound/sfx';

/** Units across the shorter side of the play area, whatever the screen. */
export const ARENA_SHORT_SIDE = 600;
/** The top band (arena units) the HUD covers: keep what matters below it. */
export const HUD_SAFE_TOP = 110;
/**
 * Smallest radius of anything the child touches, in arena units: on a 390-px-wide phone it is still
 * 52 CSS px across (touch targets ≥ 48 px).
 */
export const TOUCH_RADIUS = 40;

export interface Point {
  x: number;
  y: number;
}

/** The play area in arena units; `width` ≥ `height` on a landscape screen. */
export interface Arena {
  width: number;
  height: number;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface Swipe {
  direction: SwipeDirection;
  /** Where the finger went down. */
  from: Point;
  /** Movement from start to release, in arena units. */
  dx: number;
  dy: number;
  /** Arena units per second over the whole gesture. */
  speed: number;
}

/** One step's view of the single finger (or mouse) the games read. */
export interface GameInput {
  /** Where the finger is while it touches the screen; null when it does not. */
  pointer: Point | null;
  /** The finger went down during this step. */
  pressed: boolean;
  /** The finger left the screen during this step. */
  released: boolean;
  /** Seconds the current touch has lasted (0 when nothing touches): hold mechanics. */
  holdTime: number;
  /** Short touches that ended near where they began, since the last step. */
  taps: Point[];
  /** Quick flicks since the last step. */
  swipes: Swipe[];
}

export const NO_INPUT: GameInput = { pointer: null, pressed: false, released: false, holdTime: 0, taps: [], swipes: [] };

/**
 * Something that happened, for the host to make felt: a sound and a burst on screen. Games only emit; the host
 * plays the same sounds and effects for every game, so the 100 games feel like one family.
 * - `score`: points won (a star picked up, a goal): sparkle, "+n", bright sound.
 * - `hit`: bumped into something bad: shake, soft sound.
 * - `miss`: something good got away: small puff, no sound.
 * - `action`: the child's own move (jump, kick, throw): dust, a click.
 */
export interface GameEvent {
  type: 'score' | 'hit' | 'miss' | 'action';
  x: number;
  y: number;
  /** Points shown floating up on `score` (default 1). */
  points?: number;
  /**
   * A pitched note to sound with the event instead of its usual cue (piano tiles, a drum, a call to answer):
   * a MIDI note number (60 = middle C), played by a short synthesised `voice` (default 'piano').
   */
  note?: number;
  voice?: NoteVoice;
  /**
   * With `note`: `hold` starts a sustained note under `holdId` until a later event with `release` and the same
   * `holdId`; `bend` glides a held note to `note` (fractional MIDI allowed). Held notes also stop when the round ends.
   */
  hold?: 'start' | 'bend' | 'release';
  holdId?: string;
}

/** Synthesised voices for `GameEvent.note` (no sound files: made in the browser with Web Audio). */
export type { NoteVoice };

/** Everything a round starts from; the same setup and the same inputs always give the same round. */
export interface GameSetup {
  arena: Arena;
  /** Score that wins (the host and the server compare `score >= goal`). */
  goal: number;
  /** Seconds the round lasts; the host ends it then. Games use it to ramp difficulty. */
  duration: number;
  /** The game file's defaults, overridden by the quest step's. */
  params: MinigameParams;
  rng: Rng;
}

/** A running round. `state` is read by `draw` and by the bot; it may be mutated in place by `step`. */
export interface MinigameLogic<S> {
  readonly state: S;
  /** Advances one fixed step (`dt` seconds, 1/60) with this step's input. */
  step(dt: number, input: GameInput): void;
  /** Points so far: the number sent to the server. */
  readonly score: number;
  /** True once the round cannot go on (out of lives, nothing left to do); the host also ends it on time. */
  readonly done: boolean;
  /** Tries left, for games that have them: the HUD shows them as hearts. */
  readonly lives?: number;
  /** Events since the last call. */
  drainEvents(): GameEvent[];
}

/** What `draw` gets besides the state. The context is scaled so one unit is one arena unit. */
export interface DrawView {
  arena: Arena;
  /** Seconds since the round started (idle animations: bobbing, twinkling). */
  time: number;
  sprites: Sprites;
  theme: Theme;
  /** The child's own character as a picture (cat, rabbit, fox, bear), for games where she plays herself. */
  player: SpriteRef;
  /** The child asked for less motion: no shaking, no big bounces. */
  reducedMotion: boolean;
}

/**
 * The bot's move for one decision: where its finger is (held down), or a tap, or a swipe. Bots decide ten
 * times a second, like a quick child, and a held finger stays down until the next decision.
 */
export interface BotMove {
  touch?: Point | null;
  tap?: Point;
  swipe?: { from: Point; dx: number; dy: number };
}

export interface BotContext {
  arena: Arena;
  /** Seconds since the round started. */
  time: number;
  goal: number;
}

/** One game: what a game folder's `index.ts` passes to `defineMinigame`. */
export interface MinigameDefinition<S> {
  /** Every picture `draw` uses, loaded before the countdown. */
  sprites: readonly SpriteRef[];
  createGame(setup: GameSetup): MinigameLogic<S>;
  draw(ctx: CanvasRenderingContext2D, state: S, view: DrawView): void;
  /** Good play, for the bot test (it must win) and the dev page's demo. */
  bot(state: S, context: BotContext): BotMove;
}

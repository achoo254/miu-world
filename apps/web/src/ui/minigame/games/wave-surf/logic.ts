// Wave surf: the child rides a surfboard over rolling waves (like Tiny Wings). Holding the finger down makes
// her heavy: on a wave's downslope that speeds her up, on an upslope it slows her down. Let go before the
// crest and she flies off it; land on the next downslope for a boost, on an upslope and she splashes and
// slows. Every island she sails past is a point. Nothing is lost: a slow ride only passes fewer islands.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

/** One wave: from crest to crest over `width` units, `depth` units deep in the middle. */
export interface Wave {
  start: number;
  width: number;
  depth: number;
}

export interface WaveSurfState {
  /** Distance travelled along the sea (world units) and height above the crest line. */
  x: number;
  y: number;
  /** Speed along the sea and, in the air, upward speed. */
  speed: number;
  vy: number;
  airborne: boolean;
  holding: boolean;
  waves: Wave[];
  /** World x of every island, in order; the next one to pass is `islands[passed]`. */
  islands: number[];
  passed: number;
  /** Seconds since the last landing, and whether it was a good one (a boost) or a splash. */
  landedAgo: number;
  landedWell: boolean;
  /** Seconds since the last island was passed (a cheer). */
  islandAgo: number;
  time: number;
  /** Where she rides on screen: the camera keeps her at this x; the crest line is at screen y `baseY`. */
  screenX: number;
  baseY: number;
}

const GRAVITY = 1100;
/** Lighter in the air than on the water: long, floaty flights. */
const AIR_GRAVITY = 700;
/** Holding makes her this much heavier. */
const HEAVY = 3;
const DRAG = 0.0011;
const MIN_SPEED = 110;
const MAX_SPEED = 620;
const START_SPEED = 210;
export const ISLAND_GAP = 3400;
const FIRST_ISLAND = 1800;
/** A landing this close to the slope (rise per unit) is smooth. */
const SMOOTH_LANDING = 0.7;
/** The sea must fall away this much faster than she would fall before she leaves it (no hops on every ripple). */
const TAKEOFF_MARGIN = 1.15;

function makeWaves(rng: GameSetup['rng'], length: number, factor: number): Wave[] {
  const waves: Wave[] = [];
  // A flat start so the round opens calmly.
  let start = 400;
  while (start < length) {
    const ramp = Math.min(1, start / 20000);
    const width = rng.range(340, 520);
    const depth = rng.range(70, 105 + 40 * ramp) * factor;
    waves.push({ start, width, depth });
    start += width;
  }
  return waves;
}

/** The wave under world x (null on the flat start). */
function waveAt(waves: readonly Wave[], x: number): Wave | null {
  let lo = 0;
  let hi = waves.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const w = waves[mid];
    if (!w) break;
    if (x < w.start) hi = mid - 1;
    else if (x >= w.start + w.width) lo = mid + 1;
    else return w;
  }
  return null;
}

/** Height of the sea at x (0 on the crests, negative in the troughs), its slope and its curvature. */
export function seaAt(waves: readonly Wave[], x: number): { h: number; slope: number; bend: number } {
  const w = waveAt(waves, x);
  if (!w) return { h: 0, slope: 0, bend: 0 };
  const k = (2 * Math.PI) / w.width;
  const u = (x - w.start) * k;
  return { h: (-w.depth * (1 - Math.cos(u))) / 2, slope: (-w.depth * k * Math.sin(u)) / 2, bend: (-w.depth * k * k * Math.cos(u)) / 2 };
}

export function createWaveSurf({ arena, duration, params, rng }: GameSetup): MinigameLogic<WaveSurfState> {
  const factor = typeof params.waves === 'number' ? Math.min(1.4, Math.max(0.6, params.waves)) : 1;
  const events = eventQueue();
  const length = MAX_SPEED * duration + 2000;
  const islands: number[] = [];
  for (let x = FIRST_ISLAND; x < length; x += ISLAND_GAP) islands.push(x);
  const state: WaveSurfState = {
    x: 120,
    y: 0,
    speed: START_SPEED,
    vy: 0,
    airborne: false,
    holding: false,
    waves: makeWaves(rng, length, factor),
    islands,
    passed: 0,
    landedAgo: 9,
    landedWell: false,
    islandAgo: 9,
    time: 0,
    screenX: Math.min(260, arena.width * 0.3),
    baseY: Math.max(HUD_SAFE_TOP + 230, arena.height * 0.56),
  };
  /** Screen position of a point of the sea (events are drawn on screen). */
  const onScreen = (x: number, y: number): { x: number; y: number } => ({ x: state.screenX + x - state.x, y: state.baseY - y });

  return {
    state,
    get score() {
      return state.passed;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.landedAgo += dt;
      state.islandAgo += dt;
      state.holding = input.pointer !== null;
      const weight = state.holding ? HEAVY : 1;

      if (state.airborne) {
        state.vy -= AIR_GRAVITY * weight * dt;
        state.x += state.speed * dt;
        state.y += state.vy * dt;
        const sea = seaAt(state.waves, state.x);
        if (state.y <= sea.h) {
          // Landing: smooth along a downslope gives a boost, into an upslope a splash.
          const descent = state.vy / state.speed;
          state.y = sea.h;
          state.airborne = false;
          state.landedAgo = 0;
          const smooth = Math.abs(descent - sea.slope) < SMOOTH_LANDING;
          state.landedWell = smooth && sea.slope < -0.1;
          if (state.landedWell) {
            state.speed = Math.min(MAX_SPEED, state.speed * 1.12);
            events.push({ type: 'action', ...onScreen(state.x, state.y) });
          } else if (!smooth) {
            // Nose first into the water: a splash that slows her down.
            state.speed = Math.max(MIN_SPEED, state.speed * 0.75);
            events.push({ type: 'hit', ...onScreen(state.x, state.y) });
          }
        }
      } else {
        const sea = seaAt(state.waves, state.x);
        // Along the sea: downhill speeds up, uphill slows, both stronger while heavy; the water drags.
        const along = -GRAVITY * weight * sea.slope / (1 + sea.slope * sea.slope);
        state.speed += (along - DRAG * state.speed * state.speed) * dt;
        state.speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, state.speed));
        state.x += state.speed * dt;
        const next = seaAt(state.waves, state.x);
        state.y = next.h;
        // Over a crest faster than the sea curves away: off into the air.
        if (next.bend < 0 && state.speed * state.speed * -next.bend > GRAVITY * weight * TAKEOFF_MARGIN) {
          state.airborne = true;
          state.vy = next.slope * state.speed;
        }
      }

      const island = state.islands[state.passed];
      if (island !== undefined && state.x >= island) {
        state.passed += 1;
        state.islandAgo = 0;
        events.push({ type: 'score', ...onScreen(island, 60) });
      }
    },
  };
}

/** Good play: heavy on the way down (and diving after a jump), light on the way up so she flies off crests. */
export function waveSurfBot(state: WaveSurfState, _context: BotContext): BotMove {
  // In the air: dive while flying flatter than the sea below, so she meets the downslope along it.
  const hold = state.airborne ? state.vy / state.speed > seaAt(state.waves, state.x + state.speed * 0.1).slope + 0.1 : seaAt(state.waves, state.x + state.speed * 0.05).slope < -0.12;
  return hold ? { touch: { x: 300, y: 400 } } : {};
}

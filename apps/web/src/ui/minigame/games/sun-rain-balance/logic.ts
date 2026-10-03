// Sun and rain: a little apple tree needs both sunshine and water. The sun drifts slowly across the sky; the
// child drags a rain cloud. Over the sun, the cloud rains on the tree (water fills, light drops); away from it
// the sun shines (light fills); the tree uses a little of both all the time. When both bars sit in their green bands the tree grows fast;
// too little or too much of either and it grows slowly (it never dies). Each time it has grown enough it bears
// an apple: a point. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface SunRainState {
  sun: Point;
  /** Which way the sun drifts (-1, 1). */
  sunDir: number;
  cloud: Point;
  /** Sunlight and water, 0–1. */
  light: number;
  water: number;
  /** Growth toward the next apple, 0–1. */
  growth: number;
  /** The cloud is in front of the sun (it rains). */
  raining: boolean;
  /** Apples hanging on the tree (they drop into the basket after a moment). */
  apples: Array<{ x: number; y: number; ago: number }>;
  tree: Point;
  /** The tree crown's size (arena units). */
  crown: number;
  groundY: number;
  score: number;
  time: number;
}

/** Green band for both bars. */
export const GOOD_LOW = 0.35;
export const GOOD_HIGH = 0.8;
/** Seconds of growth in the green for one apple; outside it grows at a quarter of the speed. */
const SECONDS_PER_APPLE = 7.5;
const SLOW = 0.15;
/** Rain fills the water, sunshine the light; the tree uses a little of both all the time. */
const FILL = 0.34;
const USE = 0.17;
/** The cloud covers the sun this close (centre to centre). */
export const COVER = 80;
const SUN_SPEED = 26;
const CLOUD_SPEED = 900;

export const inGreen = (v: number): boolean => v >= GOOD_LOW && v <= GOOD_HIGH;

export function createSunRain({ arena, rng }: GameSetup): MinigameLogic<SunRainState> {
  const events = eventQueue();
  const skyY = HUD_SAFE_TOP + 70;
  const groundY = arena.height - 70;
  const state: SunRainState = {
    sun: { x: arena.width * rng.range(0.3, 0.7), y: skyY },
    sunDir: rng.chance(0.5) ? 1 : -1,
    cloud: { x: arena.width * 0.15, y: skyY + 10 },
    light: 0.55,
    water: 0.55,
    growth: 0,
    raining: false,
    apples: [],
    tree: { x: arena.width / 2, y: groundY },
    crown: Math.min(170, arena.width * 0.27, (groundY - skyY - 40) / 2.3),
    groundY,
    score: 0,
    time: 0,
  };
  // Where the apples grow among the leaves.
  const spots = [
    [-0.55, -0.55],
    [0.5, -0.6],
    [0, -0.85],
    [-0.3, -0.25],
    [0.35, -0.25],
  ] as const;
  let spot = 0;

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      // The sun drifts back and forth over the sky.
      state.sun.x += state.sunDir * SUN_SPEED * dt;
      if (state.sun.x < 80 || state.sun.x > arena.width - 80) state.sunDir *= -1;
      // The cloud follows the finger along the sky.
      const p = input.pointer;
      if (p) {
        const goal = Math.max(60, Math.min(arena.width - 60, p.x));
        const step = CLOUD_SPEED * dt;
        state.cloud.x += Math.max(-step, Math.min(step, goal - state.cloud.x));
      }
      state.raining = Math.abs(state.cloud.x - state.sun.x) <= COVER;
      state.water = Math.min(1, Math.max(0, state.water + ((state.raining ? FILL : 0) - USE) * dt));
      state.light = Math.min(1, Math.max(0, state.light + ((state.raining ? 0 : FILL) - USE) * dt));
      const happy = inGreen(state.light) && inGreen(state.water);
      state.growth += (dt / SECONDS_PER_APPLE) * (happy ? 1 : SLOW);
      if (state.growth >= 1) {
        state.growth -= 1;
        state.score += 1;
        const [sx, sy] = spots[spot % spots.length] ?? [0, -0.5];
        spot += 1;
        const { crown } = state;
        const x = state.tree.x + sx * crown * 0.9;
        const y = state.tree.y - crown * 1.25 + sy * crown * 0.5;
        state.apples.push({ x, y, ago: 0 });
        events.push({ type: 'score', x, y });
      }
      for (const a of state.apples) a.ago += dt;
      state.apples = state.apples.filter((a) => a.ago < 3);
    },
  };
}

/** Good play: rains when the soil runs dry and moves the cloud away when the tree needs sun. */
export function sunRainBot(state: SunRainState, context: BotContext): BotMove {
  // Rain while the water is the lower of the two (with a little slack so the cloud does not dither).
  const rain = state.raining ? state.water < state.light + 0.04 : state.water < state.light - 0.04;
  if (rain) return { touch: { x: state.sun.x + state.sunDir * 20, y: state.cloud.y } };
  // Park the cloud well away from the sun.
  const away = state.sun.x > context.arena.width / 2 ? 90 : context.arena.width - 90;
  return { touch: { x: away, y: state.cloud.y } };
}

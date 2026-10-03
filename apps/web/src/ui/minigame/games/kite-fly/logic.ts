// Kite fly: the child stands in a field holding the string, and her kite climbs only where the wind blows. A
// stream of wind winds left and right up the sky (and drifts as time goes on); holding a finger down and
// dragging steers the kite sideways (it follows a little late). Inside the stream the kite shoots up, outside
// it slowly sinks. Higher up, tree branches reach in from the sides and birds fly across: touching one tangles
// the kite, which drops 20 m and cannot be steered for a moment. The score is the highest the kite has been,
// in metres, so a drop never takes points away. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type ObstacleKind = 'branch' | 'bird';

export interface Obstacle {
  kind: ObstacleKind;
  /** Height (m) of its middle. */
  altitude: number;
  /** A branch reaches from a side to `reach` (units); a bird flies across at `x`. */
  side: -1 | 1;
  reach: number;
  x: number;
  speed: number;
  /** Seconds since the kite got caught on it (-1: never). */
  hitAgo: number;
}

export interface KiteState {
  /** Kite: across in units, height in metres. */
  kiteX: number;
  altitude: number;
  best: number;
  /** Tens of metres already cheered. */
  cheered: number;
  /** Seconds left of being tangled (no steering, a wobble). */
  tangled: number;
  /** Where the stream's middle is, as a function of height and time: phase for draw and the bot. */
  windPhase: number;
  /** Half the stream's width (units). */
  windHalf: number;
  /** The kite's height on screen (units from the top) once the camera follows it. */
  kiteScreenY: number;
  /** Ground line on screen when the camera is at the bottom. */
  groundY: number;
  /** Units per metre on screen. */
  scale: number;
  obstacles: Obstacle[];
  /** Climb rate this step (m/s), for the tail's flutter. */
  climb: number;
  /** Where the finger steers the kite to (null when nothing touches). */
  steerX: number | null;
  arenaWidth: number;
  time: number;
}

/** m/s inside the stream at its middle, and sinking outside it. */
const CLIMB = 5.2;
const SINK = 1.6;
const KITE_SPEED = 520;
const KITE_HALF = 34;
const TANGLE_DROP = 20;
const TANGLE_SECONDS = 0.9;
/** Metres between two obstacles, from this height on. */
const OBSTACLE_GAP = 22;
const FIRST_OBSTACLE = 26;
export const SCALE = 9;

/** Where the wind stream's middle is at height `altitude` (m) at time `time`. */
export function windCentre(state: Pick<KiteState, 'windPhase' | 'windHalf' | 'arenaWidth'>, altitude: number, time: number): number {
  const swing = state.arenaWidth / 2 - state.windHalf - 30;
  return state.arenaWidth / 2 + swing * Math.sin(altitude * 0.05 + time * 0.32 + state.windPhase) * (0.75 + 0.25 * Math.sin(time * 0.21 + altitude * 0.013));
}

/** The span (units across) an obstacle covers at its height. */
export function obstacleSpan(o: Obstacle, width: number): [number, number] {
  if (o.kind === 'branch') return o.side < 0 ? [0, o.reach] : [width - o.reach, width];
  return [o.x - 40, o.x + 40];
}

function makeObstacle(altitude: number, width: number, rng: Rng): Obstacle {
  const side: -1 | 1 = rng.chance(0.5) ? -1 : 1;
  // Low down, branches of the trees around the field; higher up, birds.
  if (altitude < 90 || rng.chance(0.35)) return { kind: 'branch', altitude, side, reach: width * rng.range(0.28, 0.42), x: 0, speed: 0, hitAgo: -1 };
  return { kind: 'bird', altitude, side, reach: 0, x: rng.range(80, width - 80), speed: rng.range(70, 120) * side, hitAgo: -1 };
}

export function createKiteFly({ arena, params, rng }: GameSetup): MinigameLogic<KiteState> {
  const wind = typeof params.wind === 'number' ? Math.min(1.5, Math.max(0.6, params.wind)) : 1;
  const events = eventQueue();
  const groundY = arena.height - 70;
  const state: KiteState = {
    kiteX: arena.width / 2,
    altitude: 2,
    best: 0,
    cheered: 0,
    tangled: 0,
    windPhase: rng.range(0, Math.PI * 2),
    windHalf: Math.min(110, arena.width * 0.13),
    kiteScreenY: Math.max(HUD_SAFE_TOP + 120, arena.height * 0.42),
    groundY,
    scale: SCALE,
    obstacles: [],
    climb: 0,
    steerX: null,
    arenaWidth: arena.width,
    time: 0,
  };
  for (let a = FIRST_OBSTACLE; a < 600; a += OBSTACLE_GAP * rng.range(0.8, 1.25)) state.obstacles.push(makeObstacle(a, arena.width, rng));

  return {
    state,
    get score() {
      return Math.floor(state.best);
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.tangled = Math.max(0, state.tangled - dt);
      state.steerX = input.pointer?.x ?? null;
      if (state.steerX !== null && state.tangled <= 0) {
        const target = Math.min(arena.width - 50, Math.max(50, state.steerX));
        // Eases toward the finger, never faster than the kite can fly: it trails a little behind.
        const move = KITE_SPEED * dt;
        state.kiteX += Math.max(-move, Math.min(move, (target - state.kiteX) * 8 * dt));
      }
      // How deep in the stream the kite is: full climb in its middle, none past its edge.
      const gap = Math.abs(state.kiteX - windCentre(state, state.altitude, state.time));
      const inWind = Math.max(0, 1 - gap / state.windHalf);
      state.climb = inWind > 0 ? CLIMB * wind * Math.min(1, 0.35 + inWind) : -SINK;
      if (state.tangled > 0) state.climb = -SINK;
      state.altitude = Math.max(2, state.altitude + state.climb * dt);
      if (state.altitude > state.best) state.best = state.altitude;

      for (const o of state.obstacles) {
        if (o.hitAgo >= 0) o.hitAgo += dt;
        if (o.kind === 'bird') {
          o.x += o.speed * dt;
          if (o.x < 60 || o.x > arena.width - 60) o.speed = -o.speed;
          o.x = Math.min(arena.width - 60, Math.max(60, o.x));
        }
        if (state.tangled > 0 || Math.abs(o.altitude - state.altitude) > 3) continue;
        const [left, right] = obstacleSpan(o, arena.width);
        if (state.kiteX + KITE_HALF > left && state.kiteX - KITE_HALF < right) {
          o.hitAgo = 0;
          state.tangled = TANGLE_SECONDS;
          state.altitude = Math.max(2, state.altitude - TANGLE_DROP);
          events.push({ type: 'hit', x: state.kiteX, y: state.kiteScreenY });
        }
      }
      // A chime for every 10 m of new height, a little higher each time.
      const tens = Math.floor(state.best / 10);
      if (tens > state.cheered) {
        state.cheered = tens;
        events.push({ type: 'score', x: state.kiteX, y: state.kiteScreenY - 50, points: 10, note: 64 + (tens % 8) * 2, voice: 'bell' });
      }
    },
  };
}

/** Good play: steer to the stream a little above the kite, moving out of the way of what is coming. */
export function kiteBot(state: KiteState, context: BotContext): BotMove {
  const ahead = state.altitude + 4;
  let target = windCentre(state, ahead, state.time + 0.3);
  for (const o of state.obstacles) {
    if (o.altitude < state.altitude - 2 || o.altitude > state.altitude + 9) continue;
    const [left, right] = obstacleSpan(o, context.arena.width);
    if (target + 50 > left && target - 50 < right) {
      // Go round it on the side nearer the stream.
      const leftSide = left - 60;
      const rightSide = right + 60;
      target = leftSide > 50 && (rightSide > context.arena.width - 50 || Math.abs(leftSide - target) < Math.abs(rightSide - target)) ? leftSide : rightSide;
    }
  }
  return { touch: { x: Math.min(context.arena.width - 50, Math.max(50, target)), y: context.arena.height * 0.75 } };
}

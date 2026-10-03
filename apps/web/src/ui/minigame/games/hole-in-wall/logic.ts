// Hole in the wall: a foam wall with a body-shaped hole slides toward the child's character. Big pose buttons
// along the bottom (stand, squat, arms up, star, one leg) change the character's pose; matching the hole when
// the wall arrives lets her through (a point), a wrong pose gets her gently pushed over by the foam and costs
// one of three hearts. Walls come quicker as the round goes on, and the one-leg pose joins later.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Pose = 'stand' | 'squat' | 'arms-up' | 'star' | 'one-leg';
export const POSES: readonly Pose[] = ['stand', 'squat', 'arms-up', 'star', 'one-leg'];

/** A pose as a head and limbs: points in figure units (feet at 0, the head's top near -1, x to the right). */
export interface Figure {
  head: Point;
  limbs: readonly (readonly Point[])[];
}

const pt = (x: number, y: number): Point => ({ x, y });

export const FIGURES: Readonly<Record<Pose, Figure>> = {
  stand: {
    head: pt(0, -0.87),
    limbs: [
      [pt(0, -0.74), pt(0, -0.42)],
      [pt(0, -0.7), pt(-0.15, -0.55), pt(-0.17, -0.4)],
      [pt(0, -0.7), pt(0.15, -0.55), pt(0.17, -0.4)],
      [pt(0, -0.42), pt(-0.09, -0.2), pt(-0.1, 0)],
      [pt(0, -0.42), pt(0.09, -0.2), pt(0.1, 0)],
    ],
  },
  squat: {
    head: pt(0, -0.58),
    limbs: [
      [pt(0, -0.46), pt(0, -0.22)],
      [pt(0, -0.42), pt(-0.18, -0.36), pt(-0.32, -0.34)],
      [pt(0, -0.42), pt(0.18, -0.36), pt(0.32, -0.34)],
      [pt(0, -0.22), pt(-0.22, -0.16), pt(-0.18, 0)],
      [pt(0, -0.22), pt(0.22, -0.16), pt(0.18, 0)],
    ],
  },
  'arms-up': {
    head: pt(0, -0.87),
    limbs: [
      [pt(0, -0.74), pt(0, -0.42)],
      [pt(0, -0.7), pt(-0.15, -0.86), pt(-0.24, -1.05)],
      [pt(0, -0.7), pt(0.15, -0.86), pt(0.24, -1.05)],
      [pt(0, -0.42), pt(-0.09, -0.2), pt(-0.1, 0)],
      [pt(0, -0.42), pt(0.09, -0.2), pt(0.1, 0)],
    ],
  },
  star: {
    head: pt(0, -0.85),
    limbs: [
      [pt(0, -0.72), pt(0, -0.42)],
      [pt(0, -0.68), pt(-0.2, -0.72), pt(-0.4, -0.78)],
      [pt(0, -0.68), pt(0.2, -0.72), pt(0.4, -0.78)],
      [pt(0, -0.42), pt(-0.16, -0.2), pt(-0.3, 0)],
      [pt(0, -0.42), pt(0.16, -0.2), pt(0.3, 0)],
    ],
  },
  'one-leg': {
    head: pt(0, -0.87),
    limbs: [
      [pt(0, -0.74), pt(0, -0.42)],
      [pt(0, -0.7), pt(-0.2, -0.66), pt(-0.36, -0.62)],
      [pt(0, -0.7), pt(0.2, -0.66), pt(0.36, -0.62)],
      [pt(0, -0.42), pt(-0.02, -0.2), pt(-0.03, 0)],
      [pt(0, -0.42), pt(0.2, -0.32), pt(0.08, -0.18)],
    ],
  },
};

export interface Wall {
  pose: Pose;
  /** 0 = far away (just appeared) … 1 = at the character; past 1 it goes on behind (or stops, if it hit). */
  z: number;
  /** null until it reaches the character; then whether she got through. */
  through: boolean | null;
}

export interface HoleState {
  pose: Pose;
  /** Seconds since the pose last changed (a little hop). */
  posedAgo: number;
  wall: Wall | null;
  /** Seconds until the next wall appears. */
  nextIn: number;
  /** Seconds since the character was pushed over (she gets up), large = long ago. */
  pushedAgo: number;
  buttons: { pose: Pose; at: Point }[];
  buttonRadius: number;
  /** Where the character's feet are, and how tall she is (arena units). */
  feet: Point;
  height: number;
  lives: number;
  walls: number;
  score: number;
  time: number;
}

const LIVES = 3;
/** Seconds a wall takes to arrive, at the start and at the end of the round. */
const APPROACH_START = 3.2;
const APPROACH_END = 2.0;
const GAP = 0.6;
/** The fifth pose joins after this share of the round. */
const ONE_LEG_FROM = 0.35;

export function createHoleInWall({ arena, duration, params, rng }: GameSetup): MinigameLogic<HoleState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const buttonRadius = Math.max(TOUCH_RADIUS + 8, Math.min(62, (arena.width - 40) / (POSES.length * 2.3)));
  const buttonY = arena.height - buttonRadius - 22;
  const gap = Math.min((arena.width - 30) / POSES.length, buttonRadius * 2.6);
  const buttons = POSES.map((pose, i) => ({ pose, at: { x: arena.width / 2 + (i - (POSES.length - 1) / 2) * gap, y: buttonY } }));
  const feetY = buttonY - buttonRadius - 50;
  const height = Math.min(300, feetY - HUD_SAFE_TOP - 90);
  const state: HoleState = {
    pose: 'stand',
    posedAgo: 9,
    wall: null,
    nextIn: 0.8,
    pushedAgo: 99,
    buttons,
    buttonRadius,
    feet: { x: arena.width / 2, y: feetY },
    height,
    lives: LIVES,
    walls: 0,
    score: 0,
    time: 0,
  };
  const progress = (): number => Math.min(1, state.time / duration);
  const available = (): readonly Pose[] => (progress() >= ONE_LEG_FROM ? POSES : POSES.slice(0, 4));

  function newWall(): void {
    const poses = available();
    let pose = poses[rng.int(0, poses.length - 1)] ?? 'stand';
    // Rarely the same hole twice in a row, never three times.
    if (pose === state.wall?.pose && rng.chance(0.7)) pose = poses[(poses.indexOf(pose) + 1 + rng.int(0, poses.length - 2)) % poses.length] ?? 'stand';
    state.wall = { pose, z: 0, through: null };
    state.walls += 1;
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.posedAgo += dt;
      state.pushedAgo += dt;
      for (const tap of input.taps) {
        const button = buttons.find((b) => Math.hypot(b.at.x - tap.x, b.at.y - tap.y) <= buttonRadius * 1.25);
        if (button && button.pose !== state.pose && state.pushedAgo > 0.6) {
          state.pose = button.pose;
          state.posedAgo = 0;
          events.push({ type: 'action', x: button.at.x, y: button.at.y - buttonRadius });
        }
      }
      const wall = state.wall;
      if (!wall) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) newWall();
        return;
      }
      const approach = (APPROACH_START + (APPROACH_END - APPROACH_START) * progress()) / factor;
      wall.z += dt / approach;
      if (wall.through === null && wall.z >= 1) {
        wall.through = wall.pose === state.pose;
        if (wall.through) {
          state.score += 1;
          events.push({ type: 'score', x: state.feet.x, y: state.feet.y - state.height });
        } else {
          state.lives -= 1;
          state.pushedAgo = 0;
          events.push({ type: 'hit', x: state.feet.x, y: state.feet.y - state.height / 2 });
        }
      }
      // A wall she got through goes on past; one that pushed her stops and fades.
      if (wall.through !== null && wall.z >= 1 + GAP / approach) {
        state.wall = null;
        state.nextIn = 0.15;
      }
    },
  };
}

/** Good play: looks at the hole and takes its pose well before the wall arrives. */
export function holeInWallBot(state: HoleState, _context: BotContext): BotMove {
  const wall = state.wall;
  if (!wall || wall.through !== null || wall.z < 0.25 || wall.pose === state.pose) return {};
  const button = state.buttons.find((b) => b.pose === wall.pose);
  return button ? { tap: button.at } : {};
}

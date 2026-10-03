// Claw machine: soft toys lie in three rows (front, middle, back) inside a glass cabinet. Each try has two
// holds: the first moves the claw right while held, the second moves it back (deeper) while held; letting
// go of the second drops it. A claw right over a toy grabs it, lifts it and carries it to the chute: a toy
// won. Nothing is left to luck: a claw near enough always holds on. Six tries. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const TOYS: readonly SpriteName[] = ['teddy-bear', 'unicorn', 'dog-face', 'panda', 'rabbit', 'cat-face', 'duck', 'octopus', 'penguin', 'frog'];

export type Phase = 'across' | 'deep' | 'drop' | 'lift' | 'carry';

export interface Toy {
  sprite: SpriteName;
  /** Across (arena x) and depth (0 front, 1 back). */
  x: number;
  depth: number;
  won: boolean;
}

export interface ClawState {
  phase: Phase;
  /** The claw's across position, depth (0–1) and how far down it is (0 up, 1 at the toys). */
  x: number;
  depth: number;
  down: number;
  /** Fingers moved this phase (a new hold is needed for the next). */
  moved: boolean;
  held: number;
  toys: Toy[];
  /** Bounds of the cabinet floor across, the chute's x. */
  left: number;
  right: number;
  chuteX: number;
  /** The top of the cabinet, and the floor's front and back y. */
  top: number;
  frontY: number;
  backY: number;
  tries: number;
  /** Seconds since the last try ended (a short pause). */
  rest: number;
  lastWon: boolean | null;
  score: number;
  time: number;
}

export const TRIES = 6;
const ACROSS_SPEED = 230;
const DEEP_SPEED = 0.55;
const DROP_SPEED = 1.4;
/** How close (across, depth) the claw must be to hold a toy. */
export const GRIP_ACROSS = 42;
export const GRIP_DEPTH = 0.2;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createClawMachine({ arena, rng }: GameSetup): MinigameLogic<ClawState> {
  const events = eventQueue();
  const left = 40;
  const right = arena.width - 40;
  const top = HUD_SAFE_TOP + 30;
  const frontY = Math.min(arena.height - 200, top + 520);
  const state: ClawState = {
    phase: 'across',
    x: left + 70,
    depth: 0,
    down: 0,
    moved: false,
    held: -1,
    toys: [],
    left,
    right,
    chuteX: left + 70,
    top,
    frontY,
    backY: frontY - 170,
    tries: 0,
    rest: 0,
    lastWon: null,
    score: 0,
    time: 0,
  };
  // A pile of toys: three rows, spread across the floor past the chute.
  const perRow = Math.max(3, Math.floor((right - left - 180) / 110));
  const pool = [...TOYS];
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i < perRow; i += 1) {
      const sprite = pool.splice(rng.int(0, pool.length - 1), 1)[0] ?? TOYS[0] ?? 'teddy-bear';
      if (pool.length === 0) pool.push(...TOYS);
      state.toys.push({ sprite, x: left + 190 + (i + rng.range(-0.25, 0.25) + (row % 2) * 0.5) * ((right - left - 230) / perRow), depth: row / 2, won: false });
    }
  }
  let wasHolding = false;

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.tries >= TRIES && state.phase === 'across' && state.rest > 0.6;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.rest += dt;
      const holding = input.pointer !== null;
      const pressed = holding && !wasHolding;
      const released = !holding && wasHolding;
      wasHolding = holding;
      switch (state.phase) {
        case 'across':
          if (state.tries >= TRIES || state.rest < 0.6) break;
          if (holding && (state.moved || pressed)) {
            state.moved = true;
            state.x = Math.min(state.right - 30, state.x + ACROSS_SPEED * dt);
          }
          if ((released && state.moved) || state.x >= state.right - 30) {
            state.phase = 'deep';
            state.moved = false;
            events.push({ type: 'action', x: state.x, y: state.top + 30 });
          }
          break;
        case 'deep':
          if (holding && (state.moved || pressed)) {
            state.moved = true;
            state.depth = Math.min(1, state.depth + DEEP_SPEED * dt);
          }
          if ((released && state.moved) || state.depth >= 1) {
            state.phase = 'drop';
            state.moved = false;
          }
          break;
        case 'drop':
          state.down = Math.min(1, state.down + DROP_SPEED * dt);
          if (state.down >= 1) {
            const i = state.toys.findIndex((t) => !t.won && Math.abs(t.x - state.x) < GRIP_ACROSS && Math.abs(t.depth - state.depth) < GRIP_DEPTH);
            state.held = i;
            state.phase = 'lift';
            events.push({ type: i >= 0 ? 'action' : 'miss', x: state.x, y: state.frontY - state.depth * 170 });
          }
          break;
        case 'lift':
          state.down = Math.max(0, state.down - DROP_SPEED * dt);
          if (state.down <= 0) state.phase = 'carry';
          break;
        case 'carry': {
          // Back to the front and over to the chute.
          state.depth = Math.max(0, state.depth - DEEP_SPEED * 2 * dt);
          state.x = Math.max(state.chuteX, state.x - ACROSS_SPEED * 1.6 * dt);
          if (state.depth <= 0 && state.x <= state.chuteX) {
            const toy = state.toys[state.held];
            if (toy) {
              toy.won = true;
              state.score += 1;
              events.push({ type: 'score', x: state.chuteX, y: state.frontY + 60 });
            }
            state.lastWon = Boolean(toy);
            state.held = -1;
            state.tries += 1;
            state.phase = 'across';
            state.rest = 0;
            state.moved = false;
          }
          break;
        }
      }
      state.x = clamp(state.x, state.chuteX, state.right - 30);
    },
  };
}

/** Good play: pick the toy nearest the chute, hold until over it, then hold until deep enough. */
export function clawBot(state: ClawState, _context: BotContext): BotMove {
  const finger = { x: 300, y: 500 };
  if (state.phase !== 'across' && state.phase !== 'deep') return {};
  if (state.rest < 0.6) return {};
  const reachable = state.toys.filter((t) => !t.won && t.x > state.x - 5).sort((a, b) => a.x - b.x || a.depth - b.depth);
  const target = state.phase === 'across' ? reachable[0] : state.toys.filter((t) => !t.won && Math.abs(t.x - state.x) < GRIP_ACROSS).sort((a, b) => a.depth - b.depth)[0];
  if (!target) return {};
  if (state.phase === 'across') return state.x + 230 * 0.06 < target.x ? { touch: finger } : state.moved ? {} : { touch: finger };
  return state.depth + 0.55 * 0.06 < target.depth ? { touch: finger } : state.moved ? {} : target.depth < 0.05 ? { touch: finger } : {};
}

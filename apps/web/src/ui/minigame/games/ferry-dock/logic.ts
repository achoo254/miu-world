// Ferry dock: a little ferry crosses a river whose current pushes it downstream (strongest mid-river). The
// child keeps a finger on the water: the ferry's engine pulls toward the finger, harder the further away it
// is, and the ferry keeps drifting when the finger lifts. Docking gently at the lit pier is a point and the
// next pier is on the other bank; arriving too fast bumps the ferry back. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

const THRUST = 280;
/** Finger distance for full thrust. */
const FULL_REACH = 160;
const WATER_DRAG = 0.9;
/** Docking faster than this bumps. */
export const SAFE_SPEED = 120;
export const PIER_HALF = 80;
const DOCKED_SECONDS = 1.2;

export interface Pier {
  x: number;
  bank: 'top' | 'bottom';
}

export interface FerryState {
  ferry: Point;
  vel: Point;
  /** Water edges the ferry's middle can reach, top and bottom. */
  topEdge: number;
  bottomEdge: number;
  current: number;
  piers: Pier[];
  target: number;
  phase: 'sail' | 'docked';
  phaseAgo: number;
  bumpAt: number;
  finger: Point | null;
  score: number;
  time: number;
}

/** The current at height `y`: none at the banks, strongest in the middle. */
export const currentAt = (state: Pick<FerryState, 'topEdge' | 'bottomEdge' | 'current'>, y: number): number =>
  state.current * Math.sin(Math.PI * Math.min(1, Math.max(0, (y - state.topEdge) / (state.bottomEdge - state.topEdge))));

export const pierPoint = (state: FerryState, pier: Pier): Point => ({ x: pier.x, y: pier.bank === 'top' ? state.topEdge : state.bottomEdge });

export function createFerryDock({ arena, rng }: GameSetup): MinigameLogic<FerryState> {
  const events = eventQueue();
  const bank = 70;
  const topEdge = HUD_SAFE_TOP + bank + 34;
  const bottomEdge = arena.height - bank - 34;
  const piers: Pier[] = [0.25, 0.75].flatMap((k) => [
    { x: arena.width * k, bank: 'top' as const },
    { x: arena.width * k, bank: 'bottom' as const },
  ]);
  const state: FerryState = {
    ferry: { x: arena.width * 0.25, y: bottomEdge },
    vel: { x: 0, y: 0 },
    topEdge,
    bottomEdge,
    current: 70,
    piers,
    target: 0,
    phase: 'sail',
    phaseAgo: 0,
    bumpAt: -9,
    finger: null,
    score: 0,
    time: 0,
  };

  const pickTarget = (r: Rng): void => {
    const here = state.ferry.y < (topEdge + bottomEdge) / 2 ? 'top' : 'bottom';
    const options = piers.map((p, i) => ({ p, i })).filter(({ p }) => p.bank !== here);
    state.target = options[r.int(0, options.length - 1)]?.i ?? 0;
  };
  pickTarget(rng);

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
      state.phaseAgo += dt;
      state.finger = input.pointer;
      if (state.phase === 'docked') {
        if (state.phaseAgo >= DOCKED_SECONDS) {
          state.phase = 'sail';
          state.phaseAgo = 0;
          state.current = Math.min(110, state.current + 6);
          pickTarget(rng);
        }
        return;
      }
      const { ferry, vel } = state;
      let ax = (currentAt(state, ferry.y) - vel.x) * WATER_DRAG;
      let ay = -vel.y * WATER_DRAG;
      const p = input.pointer;
      if (p) {
        const dx = p.x - ferry.x;
        const dy = p.y - ferry.y;
        const d = Math.hypot(dx, dy);
        if (d > 8) {
          const power = THRUST * Math.min(1, d / FULL_REACH);
          ax += (dx / d) * power;
          ay += (dy / d) * power;
        }
      }
      vel.x += ax * dt;
      vel.y += ay * dt;
      ferry.x += vel.x * dt;
      ferry.y += vel.y * dt;
      if (ferry.x < 70 || ferry.x > arena.width - 70) {
        ferry.x = Math.min(arena.width - 70, Math.max(70, ferry.x));
        vel.x = -vel.x * 0.4;
      }
      const atTop = ferry.y <= topEdge;
      const atBottom = ferry.y >= bottomEdge;
      if (atTop || atBottom) {
        ferry.y = atTop ? topEdge : bottomEdge;
        const pier = piers[state.target];
        const speed = Math.hypot(vel.x, vel.y);
        const onPier = pier && pier.bank === (atTop ? 'top' : 'bottom') && Math.abs(ferry.x - pier.x) <= PIER_HALF;
        if (onPier && speed < SAFE_SPEED) {
          state.phase = 'docked';
          state.phaseAgo = 0;
          state.score += 1;
          vel.x = 0;
          vel.y = 0;
          events.push({ type: 'score', x: ferry.x, y: ferry.y });
        } else {
          if (speed >= SAFE_SPEED && state.time - state.bumpAt > 0.4) {
            state.bumpAt = state.time;
            events.push({ type: 'hit', x: ferry.x, y: ferry.y });
          }
          vel.y = -vel.y * 0.5;
        }
      }
    },
  };
}

/** Good play: steers toward the pier, easing off as it gets close and leaning against the current. */
export function ferryBot(state: FerryState, context: BotContext): BotMove {
  if (state.phase !== 'sail') return {};
  const pier = state.piers[state.target];
  if (!pier) return {};
  const goal = pierPoint(state, pier);
  const { ferry, vel } = state;
  const dx = goal.x - ferry.x;
  const dy = goal.y - ferry.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.min(230, dist * 1.2 + 30);
  const wx = dist > 0 ? (dx / dist) * want : 0;
  const wy = dist > 0 ? (dy / dist) * want : 0;
  // Engine push needed: correct the speed and cancel the water's pull.
  const ax = (wx - vel.x) * 2.5 - (currentAt(state, ferry.y) - vel.x) * WATER_DRAG;
  const ay = (wy - vel.y) * 2.5 + vel.y * WATER_DRAG;
  const a = Math.hypot(ax, ay);
  if (a < 5) return {};
  const reach = Math.min(1, a / THRUST) * FULL_REACH;
  const x = ferry.x + (ax / a) * Math.max(10, reach);
  const y = ferry.y + (ay / a) * Math.max(10, reach);
  return { touch: { x: Math.min(context.arena.width, Math.max(0, x)), y: Math.min(context.arena.height, Math.max(0, y)) } };
}

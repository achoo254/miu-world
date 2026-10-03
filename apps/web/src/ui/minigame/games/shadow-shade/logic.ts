// Shade for the cat: a cat naps in the yard beside a tree and a house. The child drags the sun along the sky:
// low suns cast long shadows away from them, a high sun only short ones. When a shadow covers the cat for a
// moment it purrs (a point), wakes and pads off to nap somewhere else. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Lowest sun (radians above the horizon): the longest shadow. */
export const MIN_ELEVATION = (12 * Math.PI) / 180;
const SUN_TURN = 3.2;
/** Seconds the cat must stay in the shade, then purrs, then walks to its next spot. */
export const SHADE_SECONDS = 0.9;
const PURR_SECONDS = 0.7;
const WALK_SPEED = 260;
export const CAT_HALF = 26;

export interface Caster {
  kind: 'tree' | 'house';
  x: number;
  /** Half the width of what casts the shadow, and its height. */
  half: number;
  height: number;
}

export type CatPhase = 'nap' | 'purr' | 'walk';

export interface ShadeState {
  groundY: number;
  /** The sky arc the sun rides: centre on the ground, radius. */
  arc: Point;
  arcRadius: number;
  /** Sun angle: 0 = right horizon, π/2 = overhead, π = left horizon. */
  sun: number;
  sunTarget: number;
  casters: Caster[];
  catX: number;
  catTo: number;
  phase: CatPhase;
  phaseAgo: number;
  shaded: number;
  naps: number;
  score: number;
  time: number;
}

export const sunPoint = (state: Pick<ShadeState, 'arc' | 'arcRadius' | 'sun'>): Point => ({
  x: state.arc.x + Math.cos(state.sun) * state.arcRadius,
  y: state.arc.y - Math.sin(state.sun) * state.arcRadius,
});

/** The ground a caster's shadow covers for a sun at `sun`: [from, to]. */
export function shadowSpan(caster: Caster, sun: number): [number, number] {
  const elevation = Math.max(MIN_ELEVATION, Math.min(Math.PI - MIN_ELEVATION, sun));
  const lift = elevation <= Math.PI / 2 ? elevation : Math.PI - elevation;
  const length = caster.height / Math.tan(lift);
  // A sun on the right throws the shadow to the left, and the other way round.
  return Math.cos(elevation) > 0 ? [caster.x - caster.half - length, caster.x + caster.half] : [caster.x - caster.half, caster.x + caster.half + length];
}

export const isShaded = (state: Pick<ShadeState, 'casters' | 'sun' | 'catX'>): boolean =>
  state.casters.some((c) => {
    const [from, to] = shadowSpan(c, state.sun);
    return state.catX - CAT_HALF >= from - 4 && state.catX + CAT_HALF <= to + 4;
  });

/** A napping spot away from where the cat is, that some shadow can reach but nothing stands on. */
export function napSpot(rng: Rng, casters: readonly Caster[], width: number, from: number): number {
  for (let tries = 0; tries < 60; tries += 1) {
    const c = casters[rng.int(0, casters.length - 1)];
    if (!c) break;
    const reach = Math.min(c.height / Math.tan(MIN_ELEVATION + 0.06) - 40, width);
    const side = rng.chance(0.5) ? -1 : 1;
    const x = c.x + side * (c.half + CAT_HALF + rng.range(20, Math.max(30, reach - CAT_HALF)));
    const clearOfAll = casters.every((o) => Math.abs(x - o.x) > o.half + CAT_HALF + 10);
    if (x > 50 && x < width - 50 && clearOfAll && Math.abs(x - from) > 120) return x;
  }
  return from < width / 2 ? width - 60 : 60;
}

export function createShadowShade({ arena, rng }: GameSetup): MinigameLogic<ShadeState> {
  const events = eventQueue();
  const groundY = arena.height - Math.max(80, (arena.height - HUD_SAFE_TOP) * 0.18);
  const scale = Math.min(1, (groundY - HUD_SAFE_TOP) / 440);
  const arcRadius = Math.min(arena.width * 0.47, groundY - HUD_SAFE_TOP - 40);
  const treeLeft = rng.chance(0.5);
  const casters: Caster[] = [
    { kind: 'tree', x: arena.width * (treeLeft ? 0.3 : 0.7), half: 50 * scale, height: 230 * scale },
    { kind: 'house', x: arena.width * (treeLeft ? 0.72 : 0.28), half: 80 * scale, height: 170 * scale },
  ];
  const state: ShadeState = {
    groundY,
    arc: { x: arena.width / 2, y: groundY },
    arcRadius,
    sun: Math.PI / 2,
    sunTarget: Math.PI / 2,
    casters,
    catX: 0,
    catTo: 0,
    phase: 'nap',
    phaseAgo: 0,
    shaded: 0,
    naps: 0,
    score: 0,
    time: 0,
  };
  state.catX = napSpot(rng, casters, arena.width, arena.width / 2 + 200);
  state.catTo = state.catX;

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
      const p = input.pointer ?? input.taps[0];
      if (p) state.sunTarget = Math.max(MIN_ELEVATION, Math.min(Math.PI - MIN_ELEVATION, Math.atan2(state.arc.y - Math.min(p.y, state.arc.y - 1), p.x - state.arc.x)));
      const turn = state.sunTarget - state.sun;
      state.sun += Math.sign(turn) * Math.min(Math.abs(turn), SUN_TURN * dt);

      if (state.phase === 'walk') {
        const d = state.catTo - state.catX;
        state.catX += Math.sign(d) * Math.min(Math.abs(d), WALK_SPEED * dt);
        if (Math.abs(state.catTo - state.catX) < 0.5) {
          state.phase = 'nap';
          state.phaseAgo = 0;
          state.shaded = 0;
        }
        return;
      }
      if (state.phase === 'purr') {
        if (state.phaseAgo >= PURR_SECONDS) {
          state.phase = 'walk';
          state.phaseAgo = 0;
          state.catTo = napSpot(rng, casters, arena.width, state.catX);
        }
        return;
      }
      state.shaded = isShaded(state) ? state.shaded + dt : 0;
      if (state.shaded >= SHADE_SECONDS) {
        state.phase = 'purr';
        state.phaseAgo = 0;
        state.naps += 1;
        state.score += 1;
        events.push({ type: 'score', x: state.catX, y: groundY - 40 });
      }
    },
  };
}

/** Good play: picks a caster beside the cat and puts the sun where that caster's shadow just covers it. */
export function shadowShadeBot(state: ShadeState, _context: BotContext): BotMove {
  if (state.phase !== 'nap') return {};
  let best: number | null = null;
  for (const c of state.casters) {
    const catLeft = state.catX < c.x;
    const gap = Math.abs(state.catX - c.x) - c.half + CAT_HALF + 20;
    const lift = Math.atan2(c.height, gap);
    if (lift < MIN_ELEVATION + 0.02) continue;
    const angle = catLeft ? lift : Math.PI - lift;
    if (best === null || Math.abs(angle - state.sun) < Math.abs(best - state.sun)) best = angle;
  }
  if (best === null) return {};
  return { touch: sunPoint({ ...state, sun: best }) };
}

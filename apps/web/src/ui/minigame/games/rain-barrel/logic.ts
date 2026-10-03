// Rain barrel: rain falls from a drifting cloud onto a big banana leaf. The child drags left and right to tilt
// the leaf: drops slide down it and drip off its low tip, so the tip goes where the finger points (a steep leaf
// reaches near its middle but catches less rain). One of three earthen jars is waiting for water; filling it is a
// point and another jar opens. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const CAPACITY = 8;
const MAX_TILT = (80 * Math.PI) / 180;
const MIN_TILT = (10 * Math.PI) / 180;
const TILT_SPEED = 4;
const RAIN_RATE = 7;
const FALL_SPEED = 430;
const SLIDE_SPEED = 320;
export const MOUTH = 46;

export interface Drop {
  x: number;
  y: number;
  /** Sliding along the leaf (distance from the pivot, signed along the leaf), or falling. */
  sliding: boolean;
  along: number;
}

export interface RainState {
  pivot: Point;
  half: number;
  /** Leaf tilt: positive = right end low. */
  tilt: number;
  target: number;
  cloudX: number;
  cloudDir: number;
  drops: Drop[];
  jars: Point[];
  active: number;
  fill: number;
  filledAt: number;
  score: number;
  time: number;
}

/** The leaf's low tip for a tilt. */
export const tipOf = (state: Pick<RainState, 'pivot' | 'half' | 'tilt'>): Point => ({
  x: state.pivot.x + Math.sign(state.tilt || 1) * Math.cos(state.tilt) * state.half,
  y: state.pivot.y + Math.abs(Math.sin(state.tilt)) * state.half,
});

/** The tilt that puts the tip over `x`. */
export function tiltFor(state: Pick<RainState, 'pivot' | 'half'>, x: number): number {
  const dx = x - state.pivot.x;
  const reach = Math.min(1, Math.abs(dx) / state.half);
  const tilt = Math.min(MAX_TILT, Math.max(MIN_TILT, Math.acos(reach)));
  return dx < 0 ? -tilt : tilt;
}

export function createRainBarrel({ arena, rng }: GameSetup): MinigameLogic<RainState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const half = Math.min(arena.width * 0.36, 240);
  const pivot = { x: arena.width / 2, y: HUD_SAFE_TOP + free * 0.42 };
  const jarY = arena.height - 70;
  const state: RainState = {
    pivot,
    half,
    tilt: 0,
    target: 0,
    cloudX: arena.width * 0.3,
    cloudDir: 1,
    drops: [],
    jars: [-0.72, 0, 0.72].map((k) => ({ x: pivot.x + k * half, y: jarY })),
    active: 1,
    fill: 0,
    filledAt: -9,
    score: 0,
    time: 0,
  };
  let rainIn = 0;

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
      const p = input.pointer ?? input.taps[0];
      if (p) state.target = tiltFor(state, p.x);
      const turn = state.target - state.tilt;
      state.tilt += Math.sign(turn) * Math.min(Math.abs(turn), TILT_SPEED * dt);

      state.cloudX += state.cloudDir * 90 * dt;
      if (state.cloudX < 90 || state.cloudX > arena.width - 90) state.cloudDir *= -1;
      rainIn -= dt;
      while (rainIn <= 0) {
        rainIn += 1 / RAIN_RATE;
        state.drops.push({ x: state.cloudX + rng.range(-80, 80), y: HUD_SAFE_TOP + 30, sliding: false, along: 0 });
      }

      const dirX = Math.cos(state.tilt);
      const dirY = Math.sin(state.tilt);
      const flat = Math.abs(state.tilt) < 0.07;
      for (const d of state.drops) {
        if (d.sliding) {
          // Down the slope to the low end (on a flat leaf, slowly to the nearer end).
          const toward = flat ? Math.sign(d.along || 1) : Math.sign(state.tilt);
          d.along += toward * (flat ? SLIDE_SPEED * 0.25 : SLIDE_SPEED) * dt;
          d.x = pivot.x + dirX * d.along;
          d.y = pivot.y + dirY * d.along - 6;
          if (Math.abs(d.along) >= half) d.sliding = false;
          continue;
        }
        const before = d.y;
        d.y += FALL_SPEED * dt;
        const along = (d.x - pivot.x) / dirX;
        const leafY = pivot.y + dirY * along;
        if (Math.abs(along) < half - 4 && before < leafY - 6 && d.y >= leafY - 6) {
          d.sliding = true;
          d.along = along;
        }
      }
      const kept: Drop[] = [];
      for (const d of state.drops) {
        const jar = state.jars.findIndex((j) => !d.sliding && Math.abs(d.x - j.x) <= MOUTH && d.y >= j.y - 40);
        if (jar >= 0) {
          if (jar === state.active) {
            state.fill += 1;
            events.push({ type: 'action', x: d.x, y: d.y, note: 72 + state.fill * 2, voice: 'bell' });
            if (state.fill >= CAPACITY) {
              state.score += 1;
              state.fill = 0;
              state.filledAt = state.time;
              const at = state.jars[state.active] ?? d;
              events.push({ type: 'score', x: at.x, y: at.y - 40 });
              state.active = (state.active + rng.int(1, 2)) % 3;
            }
          }
          continue;
        }
        if (d.y < arena.height + 10) kept.push(d);
      }
      state.drops = kept;
    },
  };
}

/** Good play: the leaf's tip over the waiting jar. */
export function rainBarrelBot(state: RainState, context: BotContext): BotMove {
  const jar = state.jars[state.active];
  return jar ? { touch: { x: jar.x, y: context.arena.height * 0.7 } } : {};
}

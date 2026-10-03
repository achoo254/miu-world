// Bịt mắt bắt dê (blind man's buff with a goat): the child is blindfolded, so the field is dark except a
// little around her. The goat wanders and bleats now and then: each bleat sends out a ring of light from
// where it is (and a sound). She drags (or taps) to walk; reaching the goat catches it (a point) and a new
// goat runs off somewhere else. A goat that hears her close darts away for a moment. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Bleat {
  x: number;
  y: number;
  age: number;
}

export interface BlindGoatState {
  field: { x: number; y: number; w: number; h: number };
  me: Point;
  /** Where she is walking to (null: standing). */
  walkTo: Point | null;
  goat: Point;
  goatHeading: number;
  /** Seconds left of the goat darting off; seconds before it can dart again. */
  dart: number;
  rest: number;
  bleatIn: number;
  bleats: Bleat[];
  /** Seconds since the last catch (the goat shows), -1 before any. */
  caughtAgo: number;
  caughtAt: Point;
  score: number;
  time: number;
}

/** She sees this far around herself. */
export const SIGHT = 115;
export const CATCH = 70;
const WALK = 230;
const GOAT_WALK = 60;
const GOAT_DART = 170;
const HEAR = 150;
export const BLEAT_SECONDS = 1.6;

export function createBlindGoat({ arena, rng }: GameSetup): MinigameLogic<BlindGoatState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 10;
  const field = { x: 20, y: top, w: arena.width - 40, h: arena.height - top - 20 };
  const state: BlindGoatState = {
    field,
    me: { x: field.x + field.w / 2, y: field.y + field.h / 2 },
    walkTo: null,
    goat: { x: 0, y: 0 },
    goatHeading: 0,
    dart: 0,
    rest: 0,
    bleatIn: 0.8,
    bleats: [],
    caughtAgo: -1,
    caughtAt: { x: 0, y: 0 },
    score: 0,
    time: 0,
  };
  const clampX = (x: number): number => Math.min(field.x + field.w - 40, Math.max(field.x + 40, x));
  const clampY = (y: number): number => Math.min(field.y + field.h - 40, Math.max(field.y + 40, y));
  function placeGoat(): void {
    for (let i = 0; i < 30; i += 1) {
      const p = { x: field.x + rng.range(50, field.w - 50), y: field.y + rng.range(50, field.h - 50) };
      if (Math.hypot(p.x - state.me.x, p.y - state.me.y) > Math.min(field.w, field.h) * 0.45) {
        state.goat = p;
        break;
      }
    }
    state.goatHeading = rng.range(0, Math.PI * 2);
    state.bleatIn = 0.6;
  }
  placeGoat();

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
      if (state.caughtAgo >= 0) state.caughtAgo += dt;
      const aim = input.pointer ?? input.taps.at(-1);
      if (aim) state.walkTo = { x: clampX(aim.x), y: clampY(aim.y) };
      if (state.walkTo) {
        const dx = state.walkTo.x - state.me.x;
        const dy = state.walkTo.y - state.me.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, WALK * dt);
        if (d > 0.5) {
          state.me = { x: state.me.x + (dx / d) * step, y: state.me.y + (dy / d) * step };
        } else state.walkTo = null;
      }

      // The goat: ambles about, darts off when it hears her close.
      const g = state.goat;
      const near = Math.hypot(g.x - state.me.x, g.y - state.me.y);
      state.rest = Math.max(0, state.rest - dt);
      state.dart = Math.max(0, state.dart - dt);
      if (near < HEAR && state.rest <= 0 && state.dart <= 0) {
        state.dart = 0.6;
        state.rest = 2.4;
        state.goatHeading = Math.atan2(g.y - state.me.y, g.x - state.me.x) + rng.range(-0.6, 0.6);
      }
      if (rng.chance(dt * 0.5)) state.goatHeading += rng.range(-1.5, 1.5);
      const speed = state.dart > 0 ? GOAT_DART : GOAT_WALK;
      let nx = g.x + Math.cos(state.goatHeading) * speed * dt;
      let ny = g.y + Math.sin(state.goatHeading) * speed * dt;
      if (nx !== clampX(nx)) state.goatHeading = Math.PI - state.goatHeading;
      if (ny !== clampY(ny)) state.goatHeading = -state.goatHeading;
      nx = clampX(nx);
      ny = clampY(ny);
      state.goat = { x: nx, y: ny };

      state.bleatIn -= dt;
      if (state.bleatIn <= 0) {
        state.bleatIn = BLEAT_SECONDS + rng.range(0, 0.6);
        state.bleats.push({ x: nx, y: ny, age: 0 });
        events.push({ type: 'action', x: nx, y: ny, note: 76 + rng.int(-2, 2), voice: 'whistle' });
      }
      for (const b of state.bleats) b.age += dt;
      state.bleats = state.bleats.filter((b) => b.age < 1.4);

      if (Math.hypot(nx - state.me.x, ny - state.me.y) < CATCH) {
        state.score += 1;
        state.caughtAgo = 0;
        state.caughtAt = { x: nx, y: ny };
        events.push({ type: 'score', x: nx, y: ny });
        placeGoat();
      }
    },
  };
}

/** Good play: walk to the goat when it is in sight, else to where it last bleated. */
export function blindGoatBot(state: BlindGoatState, _context: BotContext): BotMove {
  const g = state.goat;
  if (Math.hypot(g.x - state.me.x, g.y - state.me.y) < SIGHT) return { touch: g };
  const heard = state.bleats.at(-1);
  if (heard) return { touch: { x: heard.x, y: heard.y } };
  return {};
}

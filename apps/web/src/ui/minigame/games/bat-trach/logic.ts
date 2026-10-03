// Bắt trạch (catch the loach): a slippery loach swims in curves around a big water jar. The child puts a finger
// on its head and follows it; a ring fills while she keeps up, and after two seconds it is caught (a point) and
// another one comes. If the finger slips off, the loach dives and comes up somewhere else a second later. A
// held loach wriggles faster, and loaches get quicker during the round. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const CATCH_SECONDS = 2;
/** How close (units) the finger must stay to the loach's head. */
export const GRAB = TOUCH_RADIUS * 1.8;
const DIVE_SECONDS = 1;
const NEXT_SECONDS = 0.6;
const SPEED_START = 110;
const SPEED_END = 190;
const HELD_SPEED = 1.35;
const BODY = 14;

export interface Loach {
  head: Point;
  heading: number;
  /** Earlier head positions, newest first (the body). */
  body: Point[];
  /** Seconds the finger has kept up with it. */
  held: number;
  /** Seconds left under water (hidden) after a slip, or before the next appears. */
  under: number;
  wiggle: number;
}

export interface TrachState {
  jar: Point;
  radius: number;
  loach: Loach;
  /** Seconds since the last catch (it is lifted out), large = long ago. */
  caughtAgo: number;
  score: number;
  time: number;
}

export function createBatTrach({ arena, duration, params, rng }: GameSetup): MinigameLogic<TrachState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 20;
  const radius = Math.min(arena.width * 0.45, (arena.height - top - 40) / 2, 300);
  const jar = { x: arena.width / 2, y: top + (arena.height - top - 20) / 2 };
  const spawn = (): Loach => {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(0, radius * 0.5);
    const head = { x: jar.x + Math.cos(a) * r, y: jar.y + Math.sin(a) * r };
    return { head, heading: rng.range(0, Math.PI * 2), body: Array.from({ length: BODY }, () => ({ ...head })), held: 0, under: 0, wiggle: rng.range(0, 10) };
  };
  const state: TrachState = { jar, radius, loach: spawn(), caughtAgo: 99, score: 0, time: 0 };

  function surfaceElsewhere(): void {
    const next = spawn();
    next.under = DIVE_SECONDS;
    state.loach = next;
  }

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
      state.caughtAgo += dt;
      const l = state.loach;
      if (l.under > 0) {
        l.under = Math.max(0, l.under - dt);
        return;
      }
      // Swim: a wandering heading, turned back toward the middle near the jar's wall.
      l.wiggle += dt;
      const speed = (SPEED_START + (SPEED_END - SPEED_START) * Math.min(1, state.time / duration)) * factor * (l.held > 0 ? HELD_SPEED : 1);
      l.heading += (Math.sin(l.wiggle * 1.7) * 1.6 + Math.sin(l.wiggle * 0.63) * 1.1) * dt;
      const dx = l.head.x - jar.x;
      const dy = l.head.y - jar.y;
      const out = Math.hypot(dx, dy);
      if (out > radius * 0.72) {
        const inward = Math.atan2(-dy, -dx);
        let turn = inward - l.heading;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        l.heading += Math.sign(turn) * Math.min(Math.abs(turn), 3.5 * dt);
      }
      l.head = { x: l.head.x + Math.cos(l.heading) * speed * dt, y: l.head.y + Math.sin(l.heading) * speed * dt };
      const d = Math.hypot(l.head.x - jar.x, l.head.y - jar.y);
      if (d > radius * 0.85) l.head = { x: jar.x + ((l.head.x - jar.x) / d) * radius * 0.85, y: jar.y + ((l.head.y - jar.y) / d) * radius * 0.85 };
      l.body.unshift({ ...l.head });
      l.body.length = BODY;

      const finger = input.pointer;
      const on = finger !== null && Math.hypot(finger.x - l.head.x, finger.y - l.head.y) <= GRAB;
      if (on) {
        l.held += dt;
        if (l.held >= CATCH_SECONDS) {
          state.score += 1;
          state.caughtAgo = 0;
          events.push({ type: 'score', x: l.head.x, y: l.head.y - 30 });
          const next = spawn();
          next.under = NEXT_SECONDS;
          state.loach = next;
        }
      } else if (l.held > 0) {
        // Slipped: it dives and comes up somewhere else.
        events.push({ type: 'miss', x: l.head.x, y: l.head.y });
        surfaceElsewhere();
      }
    },
  };
}

/** Good play: keeps the finger on the head, a little ahead of where it is going. */
export function batTrachBot(state: TrachState, _context: BotContext): BotMove {
  const l = state.loach;
  if (l.under > 0) return {};
  const ahead = 14;
  return { touch: { x: l.head.x + Math.cos(l.heading) * ahead, y: l.head.y + Math.sin(l.heading) * ahead } };
}

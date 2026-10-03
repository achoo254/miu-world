// Lantern light ("Thắp đèn phố Hội"): evening in the old town, two strings of five red lanterns over the street.
// Each lantern slowly burns down, and now and then a breeze dims a few at once; the child taps a lantern to
// light it bright again. Groups of visitors stroll along the street, but only while at least eight lanterns are
// lit: when the street gets dark they stop and wait. A group that reaches the far end is a point.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const LANTERNS = 10;
/** Lanterns that must be lit for visitors to walk. */
export const NEEDED = 8;
/** A lantern above this brightness counts as lit. */
export const LIT = 0.25;

export interface Lantern extends Point {
  /** 1 = just lit … 0 = out. */
  glow: number;
  /** Brightness lost per second. */
  fade: number;
  litAt: number;
}

export interface Visitor {
  x: number;
  /** Faces in the group (draw.ts maps them to pictures). */
  faces: number[];
  walking: boolean;
}

export interface LanternLightState {
  lanterns: Lantern[];
  lanternRadius: number;
  visitors: Visitor[];
  streetY: number;
  /** When the last breeze blew (lanterns sway). */
  breezeAt: number;
  score: number;
  time: number;
}

const GROUP_EVERY = 3.4;
const WALK_SPEED_SHARE = 1 / 4.2;
const FACES = 6;

const fadeFor = (rng: Rng, progress: number): number => 1 / rng.range(13 - 4 * progress, 18 - 5 * progress);

export const litCount = (state: LanternLightState): number => state.lanterns.filter((l) => l.glow > LIT).length;

export function createLanternLight({ arena, duration, rng }: GameSetup): MinigameLogic<LanternLightState> {
  const events = eventQueue();
  const perRow = LANTERNS / 2;
  const spacing = (arena.width - 40) / perRow;
  const lanternRadius = Math.max(TOUCH_RADIUS + 8, Math.min(62, spacing * 0.4));
  const top = HUD_SAFE_TOP + lanternRadius + 20;
  const rowGap = Math.min(190, (arena.height - top) * 0.3);
  const lanterns: Lantern[] = Array.from({ length: LANTERNS }, (_, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    return { x: 20 + spacing * (col + 0.5), y: top + row * rowGap + (col % 2) * 14, glow: rng.range(0.75, 1), fade: fadeFor(rng, 0), litAt: -9 };
  });
  const state: LanternLightState = {
    lanterns,
    lanternRadius,
    visitors: [],
    streetY: Math.min(arena.height - 70, top + rowGap + lanternRadius + 170),
    breezeAt: -9,
    score: 0,
    time: 0,
  };
  let nextGroup = 0.6;
  let nextBreeze = rng.range(5, 8);

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
      const progress = Math.min(1, state.time / duration);
      for (const tap of input.taps) {
        const reach = lanternRadius * 1.3;
        let best: Lantern | undefined;
        let bestD = reach;
        for (const l of lanterns) {
          const d = Math.hypot(tap.x - l.x, tap.y - l.y);
          if (d <= bestD) {
            best = l;
            bestD = d;
          }
        }
        if (!best) continue;
        const wasOut = best.glow <= LIT;
        best.glow = 1;
        best.litAt = state.time;
        best.fade = fadeFor(rng, progress);
        events.push({ type: 'action', x: best.x, y: best.y, note: wasOut ? 79 : 74, voice: 'bell' });
      }
      for (const l of lanterns) l.glow = Math.max(0, l.glow - l.fade * dt);
      nextBreeze -= dt;
      if (nextBreeze <= 0) {
        // A breeze: two or three lanterns flicker low.
        state.breezeAt = state.time;
        for (let k = rng.int(2, 3); k > 0; k -= 1) {
          const l = lanterns[rng.int(0, LANTERNS - 1)];
          if (l) l.glow = Math.min(l.glow, rng.range(0.15, 0.35));
        }
        nextBreeze = rng.range(6 - 2 * progress, 9 - 3 * progress);
      }

      nextGroup -= dt;
      if (nextGroup <= 0) {
        state.visitors.push({ x: -80, faces: Array.from({ length: rng.int(2, 3) }, () => rng.int(0, FACES - 1)), walking: true });
        nextGroup += GROUP_EVERY;
      }
      const bright = litCount(state) >= NEEDED;
      const speed = (arena.width + 160) * WALK_SPEED_SHARE;
      let ahead = Infinity;
      // The front group first: groups never walk through each other.
      for (const v of [...state.visitors].sort((a, b) => b.x - a.x)) {
        const room = ahead - v.x > 130;
        v.walking = bright && room;
        if (v.walking) v.x += speed * dt;
        ahead = v.x;
        if (v.x > arena.width + 80) {
          state.score += 1;
          events.push({ type: 'score', x: arena.width - 60, y: state.streetY - 60 });
        }
      }
      state.visitors = state.visitors.filter((v) => v.x <= arena.width + 80);
    },
  };
}

/** Good play: relight the dimmest lantern once it is getting low. */
export function lanternLightBot(state: LanternLightState, _context: BotContext): BotMove {
  let dimmest: Lantern | undefined;
  for (const l of state.lanterns) if (!dimmest || l.glow < dimmest.glow) dimmest = l;
  return dimmest && dimmest.glow < 0.5 ? { tap: { x: dimmest.x, y: dimmest.y } } : {};
}

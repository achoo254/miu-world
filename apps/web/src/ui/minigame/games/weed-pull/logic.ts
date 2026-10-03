// Weed pull: a vegetable garden where weeds keep sprouting between the carrots and flowers. Hold a
// weed and pull it up out of the soil; a tough weed (the clover) first has to be wiggled left and right a
// few times. Pulling a vegetable or a flower by mistake costs a point. Empty spots sprout again. Pure: no
// DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type PlantKind = 'weed' | 'tough' | 'carrot' | 'sunflower' | 'tulip';

export interface Plot {
  x: number;
  y: number;
  /** The vegetable or flower planted here for good (it is replanted if pulled), or null for a weedy spot. */
  crop: PlantKind | null;
  plant: PlantKind | null;
  /** Seconds until something sprouts in an empty plot. */
  regrow: number;
  /** Seconds since it sprouted (a little pop). */
  age: number;
  /** A plant just pulled out: flying away (seconds since), and what it was. */
  pulled: { kind: PlantKind; t: number } | null;
}

export interface Grab {
  plot: number;
  startX: number;
  startY: number;
  /** Left-right shakes made so far, and the way the finger last went (-1, 1, 0). */
  wiggles: number;
  dir: number;
  turnX: number;
  /** 0–1: how far out of the soil. */
  progress: number;
}

export interface WeedState {
  plots: Plot[];
  plantSize: number;
  grab: Grab | null;
  /** A pull just finished with the finger still down: lift it before grabbing the next plant. */
  fingerBusy: boolean;
  score: number;
  time: number;
}

/** Upward drag that pulls a plant all the way out. */
export const PULL_DISTANCE = 110;
/** Shakes a tough weed needs, each at least WIGGLE_MIN wide. */
export const WIGGLES_NEEDED = 3;
const WIGGLE_MIN = 22;
const GRAB_RADIUS = Math.max(TOUCH_RADIUS * 1.5, 64);

export const isWeed = (kind: PlantKind | null): boolean => kind === 'weed' || kind === 'tough';

/** A weed for an empty spot: tough ones become more common as the round goes on. */
const sprout = (rng: Rng, progress: number): PlantKind => (rng.chance(0.15 + 0.15 * progress) ? 'tough' : 'weed');
const CROP_SHARE = 0.38;

export function createWeedPull({ arena, duration, params, rng }: GameSetup): MinigameLogic<WeedState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const cols = wide ? 5 : 3;
  const rows = wide ? 3 : Math.min(5, Math.floor((arena.height - HUD_SAFE_TOP - 60) / 150));
  const top = HUD_SAFE_TOP + 60;
  const rowGap = Math.min(170, (arena.height - top - 40) / rows);
  const colGap = Math.min(180, (arena.width - 40) / cols);
  const gridTop = top + (arena.height - top - 40 - rowGap * rows) / 2;
  const plots: Plot[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const crop = rng.chance(CROP_SHARE) ? rng.pick(['carrot', 'sunflower', 'tulip'] as const) : null;
      const plant = crop ?? (rng.chance(0.6) ? sprout(rng, 0) : null);
      plots.push({ x: arena.width / 2 + (c - (cols - 1) / 2) * colGap, y: gridTop + rowGap * (r + 0.7), crop, plant, regrow: rng.range(0.5, 2), age: 9, pulled: null });
    }
  }
  const state: WeedState = { plots, plantSize: Math.min(96, colGap * 0.6, rowGap * 0.62), grab: null, fingerBusy: false, score: 0, time: 0 };

  function finishPull(grab: Grab): void {
    const plot = state.plots[grab.plot];
    if (!plot?.plant) return;
    const kind = plot.plant;
    plot.pulled = { kind, t: 0 };
    plot.plant = null;
    plot.regrow = rng.range(1.2, 2.6) / factor;
    if (isWeed(kind)) {
      const points = kind === 'tough' ? 2 : 1;
      state.score += points;
      events.push({ type: 'score', x: plot.x, y: plot.y - 60, points });
    } else {
      state.score = Math.max(0, state.score - 1);
      events.push({ type: 'hit', x: plot.x, y: plot.y - 40 });
    }
    state.grab = null;
    state.fingerBusy = true;
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
      const p = input.pointer;
      if (!p) {
        state.fingerBusy = false;
        state.grab = null;
      } else if (!state.grab && !state.fingerBusy) {
        // Take hold of the nearest plant under the finger.
        let best = -1;
        let bestD = GRAB_RADIUS;
        state.plots.forEach((plot, i) => {
          const d = Math.hypot(p.x - plot.x, p.y - (plot.y - state.plantSize * 0.4));
          if (plot.plant && d < bestD) {
            best = i;
            bestD = d;
          }
        });
        if (best >= 0) state.grab = { plot: best, startX: p.x, startY: p.y, wiggles: 0, dir: 0, turnX: p.x, progress: 0 };
      } else if (state.grab) {
        const grab = state.grab;
        const plot = state.plots[grab.plot];
        if (plot?.plant === 'tough' && grab.wiggles < WIGGLES_NEEDED) {
          // Count shakes: each change of way after moving far enough.
          const dir = Math.sign(p.x - grab.turnX);
          if (dir !== 0 && Math.abs(p.x - grab.turnX) >= WIGGLE_MIN) {
            if (dir !== grab.dir) {
              if (grab.dir !== 0) {
                grab.wiggles += 1;
                events.push({ type: 'action', x: plot.x, y: plot.y });
              }
              grab.dir = dir;
            }
            grab.turnX = p.x;
          }
          grab.startY = Math.max(grab.startY, p.y);
        } else {
          grab.progress = Math.max(0, (grab.startY - p.y) / PULL_DISTANCE);
          if (grab.progress >= 1) finishPull(grab);
        }
      }

      for (const plot of state.plots) {
        plot.age += dt;
        if (plot.pulled) {
          plot.pulled.t += dt;
          if (plot.pulled.t > 0.7) plot.pulled = null;
        }
        if (!plot.plant && state.grab?.plot !== state.plots.indexOf(plot)) {
          plot.regrow -= dt;
          if (plot.regrow <= 0) {
            plot.plant = plot.crop ?? sprout(rng, Math.min(1, state.time / duration));
            plot.age = 0;
          }
        }
      }
    },
  };
}

/** Good play: grab the nearest weed, shake a tough one, pull up; lift the finger between plants. */
export function weedPullBot(state: WeedState, _context: BotContext): BotMove {
  const { grab } = state;
  if (state.fingerBusy) return {};
  if (grab) {
    const plot = state.plots[grab.plot];
    if (!plot || !isWeed(plot.plant)) return {};
    if (plot.plant === 'tough' && grab.wiggles < WIGGLES_NEEDED) return { touch: { x: grab.startX + (grab.dir > 0 ? -40 : 40), y: grab.startY } };
    return { touch: { x: grab.startX, y: grab.startY - PULL_DISTANCE * Math.min(1.2, grab.progress + 0.6) } };
  }
  const weed = state.plots.find((p) => isWeed(p.plant));
  return weed ? { touch: { x: weed.x, y: weed.y - state.plantSize * 0.4 } } : {};
}

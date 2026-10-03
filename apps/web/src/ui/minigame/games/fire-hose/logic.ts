// Fire hose: little fires flare up in the windows of a house and slowly grow. The child holds a finger where
// the water should go: the firefighter's hose sprays an arcing stream that lands there (it curves under
// gravity on the way). Water on a fire shrinks it; put out (a point) it leaves a puff of steam. A fire that
// grows to full size rings the alarm bell, nothing worse; bigger fires take longer, so the trick is choosing
// which one to put out first. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Window {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 when no fire; else the fire's size (grows to 1). */
  fire: number;
  /** Seconds since it was put out (steam), large when not lately. */
  outAgo: number;
  /** The alarm rang for this fire already. */
  rang: boolean;
}

export interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface FireHoseState {
  windows: Window[];
  drops: Drop[];
  nozzle: Point;
  aim: Point | null;
  groundY: number;
  score: number;
  time: number;
}

const GRAVITY = 900;
const DROPS_PER_SECOND = 26;
/** Fire size one drop takes away, and how fast a fire grows (per second). */
export const DROP_COOL = 0.05;
const GROW = 0.07;
const START_SIZE = 0.3;
const MAX_FIRES = 5;
const SPAWN_START = 1.9;
const SPAWN_END = 1.2;

export function createFireHose({ arena, duration, rng }: GameSetup): MinigameLogic<FireHoseState> {
  const events = eventQueue();
  const landscape = arena.width > arena.height * 1.15;
  const cols = landscape ? 4 : 3;
  const groundY = arena.height - 150;
  const top = HUD_SAFE_TOP + 40;
  const rows = Math.max(2, Math.min(4, Math.floor((groundY - top - 60) / 150)));
  const wallW = Math.min(arena.width - 60, cols * 170);
  const cellW = wallW / cols;
  const cellH = (groundY - top - 40) / rows;
  const left = (arena.width - wallW) / 2;
  const windows: Window[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const w = Math.min(120, cellW - 30);
      const h = Math.min(110, cellH - 30);
      windows.push({ x: left + (c + 0.5) * cellW - w / 2, y: top + 30 + (r + 0.5) * cellH - h / 2, w, h, fire: 0, outAgo: 99, rang: false });
    }
  }
  const state: FireHoseState = { windows, drops: [], nozzle: { x: arena.width / 2, y: groundY + 40 }, aim: null, groundY, score: 0, time: 0 };
  let spawnIn = 0.5;
  let sprayDebt = 0;

  function spawnFire(): void {
    const free = windows.filter((w) => w.fire === 0 && w.outAgo > 1);
    if (free.length === 0 || windows.filter((w) => w.fire > 0).length >= MAX_FIRES) return;
    const w = free[rng.int(0, free.length - 1)];
    if (!w) return;
    w.fire = START_SIZE;
    w.rang = false;
  }

  /** A drop lobbed so that it comes down through `target` (gravity bends its path on the way). */
  function launch(target: Point): void {
    const dx = target.x - state.nozzle.x;
    const dy = target.y - state.nozzle.y;
    // Long enough in the air to be falling again when it gets there.
    const t = Math.max(0.3, Math.hypot(dx, dy) / 900, Math.sqrt((2 * Math.max(0, -dy)) / GRAVITY) * 1.2);
    const spread = rng.range(-14, 14);
    state.drops.push({ x: state.nozzle.x, y: state.nozzle.y, vx: (dx + spread) / t, vy: (dy + spread) / t - 0.5 * GRAVITY * t, life: 2 });
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
      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawnFire();
        spawnIn = SPAWN_START + (SPAWN_END - SPAWN_START) * Math.min(1, state.time / duration);
      }
      for (const w of windows) {
        w.outAgo += dt;
        if (w.fire <= 0) continue;
        w.fire = Math.min(1, w.fire + GROW * dt);
        if (w.fire >= 1 && !w.rang) {
          w.rang = true;
          events.push({ type: 'hit', x: w.x + w.w / 2, y: w.y, note: 88, voice: 'bell' });
        }
      }
      state.aim = input.pointer && input.pointer.y < state.groundY ? input.pointer : null;
      if (state.aim) {
        sprayDebt += DROPS_PER_SECOND * dt;
        while (sprayDebt >= 1) {
          sprayDebt -= 1;
          launch(state.aim);
        }
      } else sprayDebt = 0;
      for (const d of state.drops) {
        d.vy += GRAVITY * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.life -= dt;
        // Falling onto a window: it cools that window's fire.
        if (d.vy <= 0) continue;
        const w = windows.find((win) => d.x >= win.x - 10 && d.x <= win.x + win.w + 10 && d.y >= win.y - 10 && d.y <= win.y + win.h + 10);
        if (!w) continue;
        d.life = 0;
        if (w.fire <= 0) continue;
        w.fire -= DROP_COOL;
        if (w.fire <= 0) {
          w.fire = 0;
          w.outAgo = 0;
          state.score += 1;
          events.push({ type: 'score', x: w.x + w.w / 2, y: w.y + w.h / 2 });
        }
      }
      state.drops = state.drops.filter((d) => d.life > 0 && d.y < arena.height + 20);
    },
  };
}

/** Good play: sprays the biggest fire until it is out (a little above its middle, where the drops come down). */
export function fireHoseBot(state: FireHoseState, _context: BotContext): BotMove {
  const burning = state.windows.filter((w) => w.fire > 0).sort((a, b) => b.fire - a.fire)[0];
  if (!burning) return {};
  return { touch: { x: burning.x + burning.w / 2, y: burning.y + burning.h * 0.35 } };
}

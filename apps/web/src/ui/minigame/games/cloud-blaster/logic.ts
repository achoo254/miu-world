// Cloud blaster: rows of dry clouds sway and sink toward the parched rice field. While the child's finger is on
// the screen, the water hose at the bottom follows it and sprays drops straight up. A cloud soaked by three drops
// turns into a rain cloud, rains on the field and floats away: a point. A dry cloud that sinks to the field
// costs one of three hearts. New rows keep coming, a little quicker as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Cloud {
  /** Place in its row (the row sways together). */
  baseX: number;
  y: number;
  wet: number;
  /** Seconds since it turned to rain, or -1 while dry. */
  raining: number;
}

export interface Drop extends Point {
  done: boolean;
}

export interface CloudState {
  clouds: Cloud[];
  drops: Drop[];
  hoseX: number;
  hoseY: number;
  fieldY: number;
  sway: number;
  spraying: boolean;
  /** Seconds until the next drop leaves the hose. */
  reload: number;
  lives: number;
  hitAgo: number;
  score: number;
  time: number;
}

export const HITS = 3;
export const CLOUD_R = 46;
const DROP_SPEED = 700;
const RELOAD = 0.11;
const LIVES = 3;

export const cloudX = (state: CloudState, c: Cloud): number => c.baseX + state.sway;

export function createCloudBlaster({ arena, duration, params }: GameSetup): MinigameLogic<CloudState> {
  const pace = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const fieldY = arena.height - 140;
  const perRow = Math.max(4, Math.min(6, Math.floor((arena.width - 120) / 120)));
  const state: CloudState = { clouds: [], drops: [], hoseX: arena.width / 2, hoseY: arena.height - 70, fieldY, sway: 0, spraying: false, reload: 0, lives: LIVES, hitAgo: 9, score: 0, time: 0 };
  let row = 0;
  let nextRow = 2.4;

  function addRow(y: number): void {
    const span = arena.width - 160;
    // Every other row is shifted half a place, so the field is never covered in straight columns.
    const shift = row % 2 === 0 ? 0 : span / perRow / 2;
    for (let i = 0; i < perRow; i += 1) {
      if (row % 3 === 2 && i % 2 === 1) continue;
      state.clouds.push({ baseX: 80 + shift + (span / perRow) * i + (span / perRow) / 4, y, wet: 0, raining: -1 });
    }
    row += 1;
  }
  addRow(HUD_SAFE_TOP + 20);

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
      state.hitAgo += dt;
      const late = Math.min(1, state.time / duration);
      state.sway = Math.sin(state.time * 0.8) * 50;
      const sink = (14 + 10 * late) * pace;
      for (const c of state.clouds) {
        if (c.raining >= 0) {
          c.raining += dt;
          c.y -= 40 * dt;
          continue;
        }
        c.y += sink * dt;
        if (c.y + CLOUD_R >= fieldY) {
          c.raining = 99;
          state.lives -= 1;
          state.hitAgo = 0;
          events.push({ type: 'hit', x: cloudX(state, c), y: fieldY });
        }
      }
      state.clouds = state.clouds.filter((c) => c.raining < 1.4);
      // A new row every couple of seconds (sooner late in the round), or at once when the sky is clear.
      nextRow -= dt;
      const highest = state.clouds.reduce((min, c) => (c.raining < 0 ? Math.min(min, c.y) : min), Infinity);
      if (!Number.isFinite(highest) || (nextRow <= 0 && highest > HUD_SAFE_TOP + 20 + CLOUD_R * 1.6)) {
        addRow(HUD_SAFE_TOP + 20);
        nextRow = (3.0 - 0.8 * late) / pace;
      }

      state.spraying = input.pointer !== null;
      if (input.pointer) state.hoseX += (Math.min(arena.width - 40, Math.max(40, input.pointer.x)) - state.hoseX) * Math.min(1, dt * 18);
      state.reload -= dt;
      if (state.spraying && state.reload <= 0) {
        state.drops.push({ x: state.hoseX, y: state.hoseY - 40, done: false });
        state.reload = RELOAD;
      }
      for (const d of state.drops) {
        d.y -= DROP_SPEED * dt;
        if (d.y < HUD_SAFE_TOP - 40) d.done = true;
        if (d.done) continue;
        // The lowest dry cloud it reaches takes the drop.
        const hit = state.clouds.filter((c) => c.raining < 0 && Math.abs(cloudX(state, c) - d.x) < CLOUD_R && Math.abs(c.y - d.y) < CLOUD_R * 0.7).sort((a, b) => b.y - a.y)[0];
        if (!hit) continue;
        d.done = true;
        hit.wet += 1;
        if (hit.wet >= HITS) {
          hit.raining = 0;
          state.score += 1;
          events.push({ type: 'score', x: cloudX(state, hit), y: hit.y });
        }
      }
      state.drops = state.drops.filter((d) => !d.done);
    },
  };
}

/** Good play: sprays under the lowest dry cloud, where it will be when the drops get there. */
export function cloudBot(state: CloudState, _context: BotContext): BotMove {
  const dry = state.clouds.filter((c) => c.raining < 0).sort((a, b) => b.y - a.y);
  const target = dry[0];
  if (!target) return { touch: { x: state.hoseX, y: state.hoseY } };
  const flight = (state.hoseY - target.y) / DROP_SPEED;
  const x = target.baseX + Math.sin((state.time + flight + 0.1) * 0.8) * 50;
  return { touch: { x, y: state.hoseY } };
}

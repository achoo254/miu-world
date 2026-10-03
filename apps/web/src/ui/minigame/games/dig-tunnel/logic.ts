// Dig tunnel: the child digs down into the earth from the grass, square by square, toward the finger (drag
// or tap where to go), collecting gems. Rocks sit in the earth: dig out the square under one and it wobbles
// for a moment, then falls until it lands. A falling rock that hits her costs one of three hearts and sends
// her back up to the grass. A new field comes when the gems run out. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Tile = 'dirt' | 'empty' | 'rock' | 'gem';

export interface Rock {
  cell: number;
  /** Seconds it has wobbled (-1 resting), and its fall progress into the next square (0–1). */
  wobble: number;
  falling: boolean;
}

export interface DigState {
  cols: number;
  rows: number;
  cellPx: number;
  left: number;
  top: number;
  tiles: Tile[];
  rocks: Rock[];
  player: number;
  /** Where she was before the current move, and how far into the move she is (0–1, 1 when standing). */
  from: number;
  moving: number;
  target: number | null;
  invulnerable: number;
  bumpAgo: number;
  lives: number;
  score: number;
  time: number;
}

const STEP = 0.16;
const DIG_STEP = 0.24;
export const WOBBLE = 0.55;
const FALL_STEP = 0.12;
const LIVES = 3;

function layField(state: DigState, rng: Rng): void {
  const { cols, rows } = state;
  state.tiles = Array.from({ length: cols * rows }, (_, i) => (i < cols ? 'empty' : 'dirt'));
  state.rocks = [];
  for (let i = cols * 2; i < cols * rows; i += 1) {
    const roll = rng.next();
    if (roll < 0.12) {
      state.tiles[i] = 'rock';
      state.rocks.push({ cell: i, wobble: -1, falling: false });
    } else if (roll < 0.32 && state.tiles[i - cols] !== 'rock') state.tiles[i] = 'gem';
  }
  state.player = Math.floor(cols / 2);
  state.from = state.player;
  state.moving = 1;
  state.target = null;
}

export function createDigTunnel({ arena, rng }: GameSetup): MinigameLogic<DigState> {
  const events = eventQueue();
  const cellPx = Math.min(66, (arena.width - 20) / 8);
  const cols = Math.floor((arena.width - 20) / cellPx);
  const rows = Math.min(14, Math.floor((arena.height - HUD_SAFE_TOP - 30) / cellPx));
  const state: DigState = {
    cols,
    rows,
    cellPx,
    left: (arena.width - cols * cellPx) / 2,
    top: arena.height - 20 - rows * cellPx,
    tiles: [],
    rocks: [],
    player: 0,
    from: 0,
    moving: 1,
    target: null,
    invulnerable: 0,
    bumpAgo: 9,
    lives: LIVES,
    score: 0,
    time: 0,
  };
  layField(state, rng);

  const cellAt = (p: Point): number | null => {
    const c = Math.floor((p.x - state.left) / cellPx);
    const r = Math.floor((p.y - state.top) / cellPx);
    return c >= 0 && r >= 0 && c < cols && r < rows ? r * cols + c : null;
  };

  function nextStep(): number | null {
    const target = state.target;
    if (target === null || target === state.player) return null;
    const at = state.player;
    const dc = (target % cols) - (at % cols);
    const dr = Math.floor(target / cols) - Math.floor(at / cols);
    const options: number[] = [];
    const h = dc !== 0 ? at + Math.sign(dc) : null;
    const v = dr !== 0 ? at + Math.sign(dr) * cols : null;
    if (Math.abs(dc) >= Math.abs(dr)) options.push(...[h, v].filter((o): o is number => o !== null));
    else options.push(...[v, h].filter((o): o is number => o !== null));
    return options.find((o) => state.tiles[o] !== 'rock') ?? null;
  }

  function hurt(): void {
    state.lives -= 1;
    state.invulnerable = 1.5;
    state.bumpAgo = 0;
    events.push({ type: 'hit', x: state.left + ((state.player % cols) + 0.5) * cellPx, y: state.top + (Math.floor(state.player / cols) + 0.5) * cellPx });
    state.player = Math.floor(cols / 2);
    state.from = state.player;
    state.moving = 1;
    state.target = null;
  }

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
      state.invulnerable = Math.max(0, state.invulnerable - dt);
      state.bumpAgo += dt;
      const aim = input.pointer ?? input.taps[input.taps.length - 1];
      if (aim) {
        const cell = cellAt(aim);
        if (cell !== null) state.target = cell;
      }

      // Walking or digging one square at a time.
      if (state.moving < 1) {
        const dug = state.tiles[state.player] === 'dirt';
        state.moving = Math.min(1, state.moving + dt / (dug ? DIG_STEP : STEP));
        if (state.moving >= 1) {
          const tile = state.tiles[state.player];
          if (tile === 'gem') {
            state.score += 1;
            const p = cellCentreOf(state, state.player);
            events.push({ type: 'score', x: p.x, y: p.y });
          } else if (tile === 'dirt') events.push({ type: 'action', x: cellCentreOf(state, state.player).x, y: cellCentreOf(state, state.player).y });
          state.tiles[state.player] = 'empty';
        }
      } else {
        const next = nextStep();
        if (next !== null) {
          state.from = state.player;
          state.player = next;
          state.moving = 0;
        }
      }

      // Rocks: wobble over an empty square, then fall square by square.
      for (const rock of state.rocks) {
        const below = rock.cell + cols;
        const open = below < cols * rows && state.tiles[below] === 'empty' && !state.rocks.some((r) => r !== rock && r.cell === below);
        if (!rock.falling) {
          if (!open) {
            rock.wobble = -1;
            continue;
          }
          rock.wobble = rock.wobble < 0 ? 0 : rock.wobble + dt;
          if (rock.wobble >= WOBBLE) {
            rock.falling = true;
            rock.wobble = 0;
          }
          continue;
        }
        rock.wobble += dt;
        if (rock.wobble < FALL_STEP) continue;
        rock.wobble = 0;
        if (!open) {
          rock.falling = false;
          rock.wobble = -1;
          continue;
        }
        state.tiles[rock.cell] = 'empty';
        rock.cell = below;
        state.tiles[below] = 'rock';
        if (state.player === below && state.invulnerable <= 0) hurt();
      }
      // A new field once no gem is left that she can still dig her way to.
      if (state.moving >= 1 && Math.floor(state.time * 2) !== Math.floor((state.time - dt) * 2) && !gemWithinReach(state)) layField(state, rng);
    },
  };
}

export const cellCentreOf = (state: DigState, cell: number): Point => ({
  x: state.left + ((cell % state.cols) + 0.5) * state.cellPx,
  y: state.top + (Math.floor(cell / state.cols) + 0.5) * state.cellPx,
});

/** Whether some gem can still be reached by digging round the rocks. */
function gemWithinReach(state: DigState): boolean {
  const seen = new Set<number>([state.player]);
  const queue = [state.player];
  for (let i = 0; i < queue.length; i += 1) {
    const at = queue[i];
    if (at === undefined) break;
    if (state.tiles[at] === 'gem') return true;
    const c = at % state.cols;
    for (const next of [at + state.cols, at - state.cols, c > 0 ? at - 1 : -1, c < state.cols - 1 ? at + 1 : -1]) {
      if (next < 0 || next >= state.tiles.length || seen.has(next) || state.tiles[next] === 'rock') continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

/** Squares a rock is about to fall into: under a wobbling or falling rock, down the open squares beneath it. */
function dangerous(state: DigState): Set<number> {
  const out = new Set<number>();
  for (const rock of state.rocks) {
    if (rock.wobble < 0 && !rock.falling) continue;
    for (let cell = rock.cell + state.cols; cell < state.tiles.length; cell += state.cols) {
      out.add(cell);
      if (state.tiles[cell] !== 'empty') break;
    }
  }
  return out;
}

/** Good play: the shortest way to the nearest gem that never stops under a rock about to fall. */
export function digTunnelBot(state: DigState, _context: BotContext): BotMove {
  if (state.moving < 1) return {};
  const danger = dangerous(state);
  const { cols } = state;
  const previous = new Map<number, number>([[state.player, -1]]);
  const queue = [state.player];
  let goal: number | null = null;
  for (let i = 0; i < queue.length && goal === null; i += 1) {
    const at = queue[i];
    if (at === undefined) break;
    const c = at % cols;
    for (const next of [at + cols, at - cols, c > 0 ? at - 1 : -1, c < cols - 1 ? at + 1 : -1]) {
      if (next < 0 || next >= state.tiles.length || previous.has(next)) continue;
      const tile = state.tiles[next];
      if (tile === 'rock' || danger.has(next)) continue;
      previous.set(next, at);
      if (tile === 'gem') {
        goal = next;
        break;
      }
      queue.push(next);
    }
  }
  if (goal === null) {
    // Nothing safe to reach: stand still out of harm's way.
    return danger.has(state.player) ? { touch: cellCentreOf(state, Math.floor(cols / 2)) } : {};
  }
  // Walk back from the gem to the first square after where she stands.
  let step = goal;
  for (let back = previous.get(step); back !== undefined && back !== state.player && back !== -1; back = previous.get(step)) step = back;
  return { touch: cellCentreOf(state, step) };
}

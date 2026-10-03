// Dots and boxes against the owl: a 4×4 field of boxes between dots. Taking turns, each player draws one line
// between two neighbouring dots; whoever closes a box owns it and goes again. When every line is drawn, the one
// with more boxes wins the game. A won game is a point; after a lost one the owl plays a little more carelessly
// next time. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIZE = 4;
/** Lines: SIZE+1 rows of SIZE horizontal ones, then SIZE rows of SIZE+1 vertical ones. */
export const H_LINES = (SIZE + 1) * SIZE;
export const LINES = H_LINES + SIZE * (SIZE + 1);

export type Player = 'child' | 'owl';

export interface DotsState {
  drawn: (Player | null)[];
  boxes: (Player | null)[];
  turn: Player;
  /** Seconds the owl has been thinking. */
  think: number;
  phase: 'play' | 'over';
  phaseTime: number;
  /** How careless the owl is (rises after each game the child loses). */
  ease: number;
  origin: Point;
  gap: number;
  lastLine: number;
  lastTapAt: number;
  games: number;
  score: number;
  time: number;
}

const OWL_THINK = 0.6;
const OVER_PAUSE = 2.0;

/** The four lines around box b. */
export function sidesOf(b: number): number[] {
  const r = Math.floor(b / SIZE);
  const c = b % SIZE;
  return [r * SIZE + c, (r + 1) * SIZE + c, H_LINES + r * (SIZE + 1) + c, H_LINES + r * (SIZE + 1) + c + 1];
}

/** Boxes that line l borders. */
export function boxesOf(l: number): number[] {
  if (l < H_LINES) {
    const r = Math.floor(l / SIZE);
    const c = l % SIZE;
    return [r - 1, r].filter((rr) => rr >= 0 && rr < SIZE).map((rr) => rr * SIZE + c);
  }
  const k = l - H_LINES;
  const r = Math.floor(k / (SIZE + 1));
  const c = k % (SIZE + 1);
  return [c - 1, c].filter((cc) => cc >= 0 && cc < SIZE).map((cc) => r * SIZE + cc);
}

const sidesDrawn = (drawn: readonly (Player | null)[], b: number): number => sidesOf(b).filter((l) => drawn[l]).length;

/** Lines that close a box right now. */
export const closing = (drawn: readonly (Player | null)[]): number[] => drawn.map((d, l) => (d === null && boxesOf(l).some((b) => sidesDrawn(drawn, b) === 3) ? l : -1)).filter((l) => l >= 0);

/** Lines that do not hand the other player a box. */
export const safe = (drawn: readonly (Player | null)[]): number[] => drawn.map((d, l) => (d === null && boxesOf(l).every((b) => sidesDrawn(drawn, b) < 2) ? l : -1)).filter((l) => l >= 0);

/** Boxes the other player could then take in a row after line l (how much it gives away). */
export function giveaway(drawn: readonly (Player | null)[], l: number): number {
  const d = [...drawn];
  d[l] = 'child';
  let taken = 0;
  for (;;) {
    const next = closing(d)[0];
    if (next === undefined) return taken;
    for (const b of boxesOf(next)) if (sidesDrawn(d, b) === 3) taken += 1;
    d[next] = 'owl';
  }
}

/** A careful player's line: close a box, else a safe line, else the one giving away least. */
export function carefulLine(drawn: readonly (Player | null)[], pick: (n: number) => number): number {
  const close = closing(drawn);
  if (close.length > 0) return close[0] ?? -1;
  const ok = safe(drawn);
  if (ok.length > 0) return ok[pick(ok.length)] ?? -1;
  const open = drawn.map((d, l) => (d === null ? l : -1)).filter((l) => l >= 0);
  open.sort((a, b) => giveaway(drawn, a) - giveaway(drawn, b));
  return open[0] ?? -1;
}

export function lineEnds(state: Pick<DotsState, 'origin' | 'gap'>, l: number): [Point, Point] {
  const { origin, gap } = state;
  if (l < H_LINES) {
    const r = Math.floor(l / SIZE);
    const c = l % SIZE;
    return [
      { x: origin.x + c * gap, y: origin.y + r * gap },
      { x: origin.x + (c + 1) * gap, y: origin.y + r * gap },
    ];
  }
  const k = l - H_LINES;
  const r = Math.floor(k / (SIZE + 1));
  const c = k % (SIZE + 1);
  return [
    { x: origin.x + c * gap, y: origin.y + r * gap },
    { x: origin.x + c * gap, y: origin.y + (r + 1) * gap },
  ];
}

export function createDotsBoxes({ arena, rng }: GameSetup): MinigameLogic<DotsState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 70;
  const side = Math.min(arena.width - 80, arena.height - top - 40, 520);
  const gap = side / SIZE;
  const origin = { x: (arena.width - side) / 2, y: top + (arena.height - top - 40 - side) / 2 };
  const state: DotsState = {
    drawn: [],
    boxes: [],
    turn: 'child',
    think: 0,
    phase: 'play',
    phaseTime: 0,
    ease: 0.15,
    origin,
    gap,
    lastLine: -1,
    lastTapAt: -1,
    games: 0,
    score: 0,
    time: 0,
  };

  function newGame(): void {
    state.drawn = Array.from({ length: LINES }, () => null);
    state.boxes = Array.from({ length: SIZE * SIZE }, () => null);
    state.turn = 'child';
    state.think = 0;
    state.phase = 'play';
    state.phaseTime = 0;
    state.lastLine = -1;
  }

  function draw(l: number, who: Player): void {
    state.drawn[l] = who;
    state.lastLine = l;
    let closed = 0;
    for (const b of boxesOf(l)) {
      if (state.boxes[b] === null && sidesDrawn(state.drawn, b) === 4) {
        state.boxes[b] = who;
        closed += 1;
        const at = { x: origin.x + ((b % SIZE) + 0.5) * gap, y: origin.y + (Math.floor(b / SIZE) + 0.5) * gap };
        events.push(who === 'child' ? { type: 'action', ...at, note: 76, voice: 'bell' } : { type: 'miss', ...at });
      }
    }
    if (closed === 0) state.turn = who === 'child' ? 'owl' : 'child';
    state.think = 0;
    if (state.drawn.every((d) => d !== null)) {
      const mine = state.boxes.filter((b) => b === 'child').length;
      state.phase = 'over';
      state.phaseTime = 0;
      state.games += 1;
      if (mine * 2 > SIZE * SIZE) {
        state.score += 1;
        events.push({ type: 'score', x: arena.width / 2, y: origin.y + side / 2 });
      } else {
        state.ease = Math.min(0.8, state.ease + 0.25);
        events.push({ type: 'hit', x: arena.width / 2, y: origin.y + side / 2 });
      }
    }
  }

  /** The owl: careful, except now and then (more after a lost game) it draws any line. */
  function owlLine(g: Rng): number {
    const open = state.drawn.map((d, l) => (d === null ? l : -1)).filter((l) => l >= 0);
    if (g.chance(state.ease)) return open[g.int(0, open.length - 1)] ?? -1;
    return carefulLine(state.drawn, (n) => g.int(0, n - 1));
  }

  newGame();

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
      state.phaseTime += dt;
      if (state.phase === 'over') {
        if (state.phaseTime >= OVER_PAUSE) newGame();
        return;
      }
      if (state.turn === 'owl') {
        state.think += dt;
        if (state.think >= OWL_THINK) {
          const l = owlLine(rng);
          if (l >= 0) draw(l, 'owl');
        }
        return;
      }
      for (const tap of input.taps) {
        let best = -1;
        let bestD = Infinity;
        for (let l = 0; l < LINES; l += 1) {
          if (state.drawn[l]) continue;
          const [a, b] = lineEnds(state, l);
          const d = Math.hypot((a.x + b.x) / 2 - tap.x, (a.y + b.y) / 2 - tap.y);
          if (d < bestD) {
            bestD = d;
            best = l;
          }
        }
        if (best >= 0 && bestD <= gap * 0.45) {
          state.lastTapAt = state.time;
          draw(best, 'child');
          break;
        }
      }
    },
  };
}

/** Good play: careful lines (the first safe one, so the bot is the same every time for a seed). */
export function dotsBot(state: DotsState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.turn !== 'child' || state.time - state.lastTapAt < 0.35) return {};
  const l = carefulLine(state.drawn, (n) => Math.floor(n / 2));
  if (l < 0) return {};
  const [a, b] = lineEnds(state, l);
  return { tap: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

// Simple circuit ("Nối mạch thắp đèn"): a battery, one or two light bulbs, sometimes a switch and sometimes a
// leaf on the board. The child drags wires from one metal clip to another (a clip holds one wire; a new wire
// from it replaces the old). When the wires make a closed loop from the battery's + through every bulb back to
// its −, with the switch closed (tap it), the bulbs light up: a point and the next board. A leaf does not carry
// electricity, so a loop through it stays dark. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type PartKind = 'battery' | 'bulb' | 'switch' | 'leaf';

export interface Part {
  kind: PartKind;
  centre: Point;
  /** Its two clips (for the battery: + then −). */
  clips: [Point, Point];
  /** A switch: closed? */
  closed: boolean;
}

/** A wire between two clips, each named by part index and clip (0 / 1). */
export type Clip = readonly [number, 0 | 1];
export type Wire = readonly [Clip, Clip];

export interface CircuitState {
  parts: Part[];
  wires: Wire[];
  /** The clip being dragged from, and where the finger is. */
  from: Clip | null;
  finger: Point | null;
  /** Parts lit by a closed loop now. */
  lit: number[];
  nextIn: number;
  boards: number;
  score: number;
  time: number;
}

const CLIP_REACH = 46;
const NEXT_SECONDS = 1.4;

const sameClip = (a: Clip, b: Clip): boolean => a[0] === b[0] && a[1] === b[1];

/** The loop from the battery's + back to its −, as part indexes, or null when there is none. */
export function loopOf(state: Pick<CircuitState, 'parts' | 'wires'>): number[] | null {
  const battery = state.parts.findIndex((p) => p.kind === 'battery');
  if (battery < 0) return null;
  const across = (clip: Clip): Clip | null => {
    for (const [a, b] of state.wires) {
      if (sameClip(a, clip)) return b;
      if (sameClip(b, clip)) return a;
    }
    return null;
  };
  const path: number[] = [];
  let at: Clip = [battery, 0];
  for (let guard = 0; guard < 20; guard += 1) {
    const next = across(at);
    if (!next) return null;
    if (next[0] === battery) return next[1] === 1 ? path : null;
    path.push(next[0]);
    at = [next[0], next[1] === 0 ? 1 : 0];
  }
  return null;
}

/** Bulbs lit: those on a closed loop that has no open switch and no leaf. */
export function litParts(state: Pick<CircuitState, 'parts' | 'wires'>): number[] {
  const loop = loopOf(state);
  if (!loop) return [];
  const broken = loop.some((i) => {
    const p = state.parts[i];
    return !p || p.kind === 'leaf' || (p.kind === 'switch' && !p.closed);
  });
  return broken ? [] : loop;
}

export function createSimpleCircuit({ arena, rng }: GameSetup): MinigameLogic<CircuitState> {
  const events = eventQueue();
  const state: CircuitState = { parts: [], wires: [], from: null, finger: null, lit: [], nextIn: 0, boards: 0, score: 0, time: 0 };

  const deal = (r: Rng): void => {
    const level = state.boards;
    const kinds: PartKind[] = ['bulb'];
    if (level >= 1) kinds.push('switch');
    if (level >= 2 && r.chance(0.6)) kinds.push('bulb');
    if (level >= 2 && r.chance(0.6)) kinds.push('leaf');
    const others = [...kinds];
    for (let i = others.length - 1; i > 0; i -= 1) {
      const j = r.int(0, i);
      const a = others[i];
      const b = others[j];
      if (a && b) {
        others[i] = b;
        others[j] = a;
      }
    }
    const top = HUD_SAFE_TOP + 40;
    const cx = arena.width / 2;
    const bottom = arena.height - 90;
    const make = (kind: PartKind, centre: Point): Part => {
      const half = kind === 'battery' ? 80 : 62;
      return { kind, centre, clips: [{ x: centre.x - half, y: centre.y }, { x: centre.x + half, y: centre.y }], closed: false };
    };
    const parts: Part[] = [make('battery', { x: cx, y: bottom })];
    // The others spread over the board above the battery.
    const n = others.length;
    const cols = arena.width >= arena.height ? Math.min(n, 3) : Math.min(n, 2);
    const rows = Math.ceil(n / cols);
    const cellW = (arena.width - 40) / cols;
    const cellH = (bottom - 120 - top) / rows;
    others.forEach((kind, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, n - row * cols);
      parts.push(make(kind, { x: cx + ((i % cols) - (inRow - 1) / 2) * cellW, y: top + (row + 0.5) * cellH }));
    });
    state.parts = parts;
    state.wires = [];
    state.lit = [];
    state.from = null;
  };

  const clipAt = (p: Point): Clip | null => {
    let best: Clip | null = null;
    let bestD = CLIP_REACH;
    state.parts.forEach((part, i) => {
      part.clips.forEach((c, k) => {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d <= bestD) {
          best = [i, k as 0 | 1];
          bestD = d;
        }
      });
    });
    return best;
  };

  const connect = (a: Clip, b: Clip): void => {
    if (a[0] === b[0]) return;
    state.wires = state.wires.filter(([x, y]) => !sameClip(x, a) && !sameClip(y, a) && !sameClip(x, b) && !sameClip(y, b));
    state.wires.push([a, b]);
    const at = state.parts[b[0]]?.clips[b[1]] ?? { x: 0, y: 0 };
    events.push({ type: 'action', x: at.x, y: at.y });
  };

  const check = (): void => {
    const lit = litParts(state);
    state.lit = lit;
    const bulbs = state.parts.map((p, i) => (p.kind === 'bulb' ? i : -1)).filter((i) => i >= 0);
    if (bulbs.length > 0 && bulbs.every((i) => lit.includes(i))) {
      state.score += 1;
      state.nextIn = NEXT_SECONDS;
      const bulb = state.parts[bulbs[0] ?? 0];
      events.push({ type: 'score', x: bulb?.centre.x ?? 0, y: bulb?.centre.y ?? 0, note: 84, voice: 'bell' });
    }
  };

  deal(rng);

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
      if (state.nextIn > 0) {
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.boards += 1;
          deal(rng);
        }
        return;
      }
      const tap = input.taps[0];
      if (input.pressed) {
        const at = input.pointer ?? tap;
        state.from = at ? clipAt(at) : null;
      }
      if (input.pointer) state.finger = input.pointer;
      if (!input.released) return;
      const end = input.pointer ?? state.finger ?? tap ?? null;
      const target = end ? clipAt(end) : null;
      if (state.from && target && !sameClip(state.from, target)) connect(state.from, target);
      else if (tap && !state.from) {
        // A tap on a switch flips it.
        const i = state.parts.findIndex((p) => p.kind === 'switch' && Math.hypot(tap.x - p.centre.x, tap.y - p.centre.y) < 60);
        const sw = state.parts[i];
        if (sw) {
          sw.closed = !sw.closed;
          events.push({ type: 'action', x: sw.centre.x, y: sw.centre.y, note: sw.closed ? 76 : 69, voice: 'clap' });
        }
      }
      state.from = null;
      state.finger = null;
      check();
    },
  };
}

/** The wires the bot lays: battery + → each part needed in turn → battery −. */
function plan(state: CircuitState): Wire[] {
  const battery = state.parts.findIndex((p) => p.kind === 'battery');
  const needed = state.parts.map((p, i) => (p.kind === 'bulb' || p.kind === 'switch' ? i : -1)).filter((i) => i >= 0);
  const wires: Wire[] = [];
  let at: Clip = [battery, 0];
  for (const i of needed) {
    wires.push([at, [i, 0]]);
    at = [i, 1];
  }
  wires.push([at, [battery, 1]]);
  return wires;
}

/** Good play: lay the planned wires one by one, then close the switch. */
export function simpleCircuitBot(state: CircuitState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  const point = (c: Clip): Point => state.parts[c[0]]?.clips[c[1]] ?? { x: 0, y: 0 };
  if (state.from) {
    const wire = plan(state).find(([a]) => sameClip(a, state.from ?? a));
    if (!wire) return {};
    const to = point(wire[1]);
    return state.finger && Math.hypot(state.finger.x - to.x, state.finger.y - to.y) < 2 ? {} : { touch: to };
  }
  const missing = plan(state).find(([a, b]) => !state.wires.some(([x, y]) => (sameClip(x, a) && sameClip(y, b)) || (sameClip(x, b) && sameClip(y, a))));
  if (missing) return { touch: point(missing[0]) };
  const open = state.parts.find((p) => p.kind === 'switch' && !p.closed);
  return open ? { tap: open.centre } : {};
}

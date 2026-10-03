// Bus lines: bus stops of three shapes (circle, square, triangle) dot the town, and more appear. People wait
// at the stops, each showing the shape of the stop they want to go to. The child drags from one stop to
// another to draw a bus line (or to make a line longer from one of its ends); up to three lines. A bus runs
// up and down each line, stops at every stop, lets off the people who wanted that shape (a point each) and
// takes on the people whose shape its line reaches. A stop with too many people waiting blinks; nothing is
// lost. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Shape = 0 | 1 | 2;
export const SHAPES: readonly Shape[] = [0, 1, 2];

export interface Stop extends Point {
  shape: Shape;
  /** Shapes wanted by the people waiting. */
  waiting: Shape[];
  /** Seconds since it appeared (it pops in). */
  age: number;
}

export interface Bus {
  /** The stop it is at or heading to (index into its line), the way it goes, and how far between. */
  at: number;
  dir: number;
  x: number;
  y: number;
  /** Seconds left standing at a stop. */
  standing: number;
  riders: Shape[];
}

export interface Line {
  stops: number[];
  bus: Bus;
}

export interface BusState {
  stops: Stop[];
  lines: Line[];
  /** A line being drawn: from which stop, and where the finger is. */
  drawing: { from: number; to: Point } | null;
  area: { x: number; y: number; w: number; h: number };
  score: number;
  time: number;
}

export const MAX_LINES = 3;
export const CAPACITY = 6;
export const CROWDED = 6;
const BUS_SPEED = 180;
const STAND_SECONDS = 0.35;
const MAX_STOPS = 8;
const NEW_STOP_SECONDS = 11;
const PERSON_START = 1.4;
const PERSON_END = 0.75;
export const STOP_REACH = TOUCH_RADIUS + 16;

export function createBusLines({ arena, duration, rng }: GameSetup): MinigameLogic<BusState> {
  const events = eventQueue();
  const area = { x: 70, y: HUD_SAFE_TOP + 60, w: arena.width - 140, h: arena.height - HUD_SAFE_TOP - 110 };
  const state: BusState = { stops: [], lines: [], drawing: null, area, score: 0, time: 0 };
  let stopIn = NEW_STOP_SECONDS;
  let personIn = 1;

  function addStop(shape: Shape, r: Rng): void {
    const gap = Math.min(170, Math.sqrt((area.w * area.h) / MAX_STOPS) * 0.75);
    for (let k = 0; k < 200; k += 1) {
      const p = { x: area.x + r.range(0, area.w), y: area.y + r.range(0, area.h) };
      if (state.stops.every((s) => Math.hypot(s.x - p.x, s.y - p.y) >= gap)) {
        state.stops.push({ ...p, shape, waiting: [], age: 0 });
        return;
      }
    }
  }
  for (const shape of SHAPES) addStop(shape, rng);

  const stopAt = (p: Point): number => {
    let best = -1;
    let bestD = STOP_REACH;
    state.stops.forEach((s, i) => {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  /** Joins stop a to stop b: grows a line from its end at a, or starts a new line. */
  function connect(a: number, b: number): void {
    if (a === b || a < 0 || b < 0) return;
    if (state.lines.some((l) => l.stops.includes(a) && l.stops.includes(b))) return;
    const line = state.lines.find((l) => !l.stops.includes(b) && (l.stops[0] === a || l.stops[l.stops.length - 1] === a));
    if (line) {
      if (line.stops[line.stops.length - 1] === a) line.stops.push(b);
      else {
        line.stops.unshift(b);
        line.bus.at += 1;
      }
    } else if (state.lines.length < MAX_LINES) {
      const s = state.stops[a];
      if (!s) return;
      const line: Line = { stops: [a, b], bus: { at: 0, dir: 1, x: s.x, y: s.y, standing: STAND_SECONDS, riders: [] } };
      state.lines.push(line);
      // The new bus picks up at its first stop straight away.
      serve(line, a);
    } else return;
    const s = state.stops[b];
    if (s) events.push({ type: 'action', x: s.x, y: s.y, note: 67 + state.lines.length * 2, voice: 'bell' });
  }

  /** At a stop: people for this shape get off, people whose shape the line reaches get on. */
  function serve(line: Line, stopIndex: number): void {
    const stop = state.stops[stopIndex];
    if (!stop) return;
    const off = line.bus.riders.filter((r) => r === stop.shape).length;
    if (off > 0) {
      line.bus.riders = line.bus.riders.filter((r) => r !== stop.shape);
      state.score += off;
      events.push({ type: 'score', x: stop.x, y: stop.y - 30, points: off });
    }
    const reaches = new Set(line.stops.map((i) => state.stops[i]?.shape));
    const staying: Shape[] = [];
    for (const want of stop.waiting) {
      if (reaches.has(want) && want !== stop.shape && line.bus.riders.length < CAPACITY) line.bus.riders.push(want);
      else staying.push(want);
    }
    stop.waiting = staying;
  }

  function drive(line: Line, dt: number): void {
    const bus = line.bus;
    if (line.stops.length < 2) return;
    if (bus.standing > 0) {
      bus.standing -= dt;
      if (bus.standing > 0) return;
      // Leave toward the next stop, turning back at the ends.
      if (bus.at + bus.dir < 0 || bus.at + bus.dir >= line.stops.length) bus.dir = -bus.dir;
      bus.at += bus.dir;
    }
    const target = state.stops[line.stops[bus.at] ?? 0];
    if (!target) return;
    const dx = target.x - bus.x;
    const dy = target.y - bus.y;
    const d = Math.hypot(dx, dy);
    const move = BUS_SPEED * dt;
    if (d <= move) {
      bus.x = target.x;
      bus.y = target.y;
      bus.standing = STAND_SECONDS;
      serve(line, line.stops[bus.at] ?? 0);
    } else {
      bus.x += (dx / d) * move;
      bus.y += (dy / d) * move;
    }
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
      for (const s of state.stops) s.age += dt;
      stopIn -= dt;
      if (stopIn <= 0 && state.stops.length < MAX_STOPS) {
        addStop(rng.pick([0, 1, 2] as const), rng);
        stopIn = NEW_STOP_SECONDS;
      }
      personIn -= dt;
      if (personIn <= 0) {
        personIn = PERSON_START + (PERSON_END - PERSON_START) * Math.min(1, state.time / duration);
        const stop = state.stops[rng.int(0, state.stops.length - 1)];
        const others = SHAPES.filter((sh) => sh !== stop?.shape && state.stops.some((s) => s.shape === sh));
        if (stop && others.length > 0 && stop.waiting.length < CROWDED + 4) stop.waiting.push(others[rng.int(0, others.length - 1)] ?? 0);
      }
      // Drawing a line: from a stop, let go on another.
      if (input.pressed && input.pointer) {
        const from = stopAt(input.pointer);
        state.drawing = from >= 0 ? { from, to: { ...input.pointer } } : null;
      }
      if (state.drawing && input.pointer) state.drawing.to = { ...input.pointer };
      if (input.released && state.drawing) {
        connect(state.drawing.from, stopAt(state.drawing.to));
        state.drawing = null;
      }
      for (const line of state.lines) drive(line, dt);
    },
  };
}

/** Good play: one line through every stop (nearest first from its ends); once that line is long, a second. */
export function busLinesBot(state: BusState, _context: BotContext): BotMove {
  if (state.drawing) {
    const plan = botPlan(state);
    const target = plan ? state.stops[plan[1]] : undefined;
    if (!target) return {};
    const at = state.drawing.to;
    return Math.hypot(at.x - target.x, at.y - target.y) < 2 ? {} : { touch: { x: target.x, y: target.y } };
  }
  const plan = botPlan(state);
  const from = plan ? state.stops[plan[0]] : undefined;
  return from ? { touch: { x: from.x, y: from.y } } : {};
}

/** The bot's next join: [from, to], or null when every stop is on a line. */
function botPlan(state: BusState): [number, number] | null {
  const onLine = new Set(state.lines.flatMap((l) => l.stops));
  const loose = state.stops.map((_, i) => i).filter((i) => !onLine.has(i));
  if (state.lines.length === 0) {
    const [a, b] = nearestPair(state, [0], loose.filter((i) => i !== 0));
    return a >= 0 ? [a, b] : null;
  }
  if (loose.length === 0) return null;
  const line = state.lines[state.lines.length - 1];
  if (!line) return null;
  const ends = [line.stops[0] ?? 0, line.stops[line.stops.length - 1] ?? 0];
  if (line.stops.length >= 5 && state.lines.length < MAX_LINES) {
    // A new line from the nearest stop already served.
    const [a, b] = nearestPair(state, [...onLine], loose);
    return a >= 0 ? [a, b] : null;
  }
  const [a, b] = nearestPair(state, ends, loose);
  return a >= 0 ? [a, b] : null;
}

function nearestPair(state: BusState, from: number[], to: number[]): [number, number] {
  let best: [number, number] = [-1, -1];
  let bestD = Infinity;
  for (const a of from) {
    for (const b of to) {
      const p = state.stops[a];
      const q = state.stops[b];
      if (!p || !q || a === b) continue;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < bestD) {
        bestD = d;
        best = [a, b];
      }
    }
  }
  return best;
}

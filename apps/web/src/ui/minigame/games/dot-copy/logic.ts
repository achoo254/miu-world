// Dot copy: a small picture drawn on a 4 × 4 grid of dots is shown beside a big empty grid. The child copies
// it by dragging from dot to dot (or tapping one dot, then another in a straight line from it): each line
// that is in the picture stays; a line that is not turns red and fades. When every line of the picture is
// there, it is finished (a point) and the next picture comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const DOTS = 4;

/** Pictures as strokes through dots (column, row), easy ones first. */
const EASY: readonly (readonly (readonly [number, number])[])[][] = [
  [[[0, 0], [0, 3], [2, 3]]], // L
  [[[1, 0], [2, 1], [1, 2], [0, 1], [1, 0]]], // diamond
  [[[1, 3], [1, 0]], [[0, 1], [1, 0], [2, 1]]], // arrow
  [[[0, 0], [2, 0]], [[1, 0], [1, 3]]], // T
  [[[0, 2], [1, 1], [2, 2], [3, 1]]], // zigzag
];
const HARD: readonly (readonly (readonly [number, number])[])[][] = [
  [[[0, 3], [0, 0], [2, 0], [2, 1], [0, 1]]], // flag
  [[[0, 1], [2, 1], [2, 3], [0, 3], [0, 1], [1, 0], [2, 1]]], // house
  [[[0, 0], [0, 2], [1, 3], [2, 3], [3, 2], [3, 0]]], // cup
  [[[0, 0], [3, 0], [0, 3], [3, 3]]], // Z
  [[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]], // square
  [[[0, 3], [3, 3], [0, 0], [0, 3]]], // triangle
];

const dotIndex = (c: number, r: number): number => r * DOTS + c;
export const segmentKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** The unit segments from dot a to dot b if they are on one straight line (across, down, diagonal), else null. */
export function straightSegments(a: number, b: number): string[] | null {
  const ac = a % DOTS;
  const ar = Math.floor(a / DOTS);
  const dc = (b % DOTS) - ac;
  const dr = Math.floor(b / DOTS) - ar;
  if (a === b || (dc !== 0 && dr !== 0 && Math.abs(dc) !== Math.abs(dr))) return null;
  const n = Math.max(Math.abs(dc), Math.abs(dr));
  const out: string[] = [];
  for (let k = 0; k < n; k += 1) out.push(segmentKey(dotIndex(ac + (Math.sign(dc) * k), ar + Math.sign(dr) * k), dotIndex(ac + Math.sign(dc) * (k + 1), ar + Math.sign(dr) * (k + 1))));
  return out;
}

function pictureSegments(strokes: readonly (readonly (readonly [number, number])[])[]): string[] {
  const out = new Set<string>();
  for (const stroke of strokes) {
    for (let k = 1; k < stroke.length; k += 1) {
      const [c0, r0] = stroke[k - 1] ?? [0, 0];
      const [c1, r1] = stroke[k] ?? [0, 0];
      for (const s of straightSegments(dotIndex(c0, r0), dotIndex(c1, r1)) ?? []) out.add(s);
    }
  }
  return [...out];
}

export interface DotCopyState {
  /** Segments of the picture to copy, and those drawn so far (keys "a-b", a < b). */
  picture: string[];
  drawn: string[];
  /** Lines drawn that are not in the picture, fading. */
  wrong: { key: string; age: number }[];
  /** The dot the finger (or the last tap) is at. */
  current: number | null;
  /** The finger's position while it draws, for the line still being pulled. */
  pen: Point | null;
  /** The big grid: top-left dot and spacing; the sample: same. */
  gridX: number;
  gridY: number;
  spacing: number;
  sampleX: number;
  sampleY: number;
  sampleSpacing: number;
  /** Seconds since the picture was finished (-1 while drawing). */
  doneAgo: number;
  /** Seconds since this picture appeared. */
  pictureAgo: number;
  count: number;
  score: number;
  time: number;
}

const DONE_SECONDS = 1.3;
const WRONG_SECONDS = 0.7;

export function createDotCopy({ arena, rng }: GameSetup): MinigameLogic<DotCopyState> {
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const top = HUD_SAFE_TOP + 30;
  let spacing: number;
  let gridX: number;
  let gridY: number;
  let sampleSpacing: number;
  let sampleX: number;
  let sampleY: number;
  if (landscape) {
    spacing = Math.min(150, (arena.height - top - 70) / (DOTS - 1));
    sampleSpacing = Math.min(70, (arena.width - spacing * 3 - 160) / 3);
    const total = sampleSpacing * 3 + 90 + spacing * 3;
    sampleX = (arena.width - total) / 2;
    gridX = sampleX + sampleSpacing * 3 + 90;
    gridY = top + 20 + (arena.height - top - 50 - spacing * 3) / 2;
    sampleY = gridY + (spacing * 3 - sampleSpacing * 3) / 2;
  } else {
    spacing = Math.min(165, (arena.width - 130) / (DOTS - 1));
    sampleSpacing = 60;
    const total = sampleSpacing * 3 + 110 + spacing * 3;
    sampleY = top + 20 + Math.max(0, (arena.height - top - 60 - total) / 2);
    gridY = sampleY + sampleSpacing * 3 + 110;
    gridX = (arena.width - spacing * 3) / 2;
    sampleX = (arena.width - sampleSpacing * 3) / 2;
  }
  const order = [...shuffle(EASY.length), ...shuffle(HARD.length).map((i) => i + EASY.length)];
  function shuffle(n: number): number[] {
    const out = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i -= 1) {
      const j = rng.int(0, i);
      [out[i], out[j]] = [out[j] ?? 0, out[i] ?? 0];
    }
    return out;
  }
  const pictureAt = (n: number): string[] => {
    const k = order[n % order.length] ?? 0;
    return pictureSegments((k < EASY.length ? EASY[k] : HARD[k - EASY.length]) ?? []);
  };
  const state: DotCopyState = {
    picture: pictureAt(0),
    drawn: [],
    wrong: [],
    current: null,
    pen: null,
    gridX,
    gridY,
    spacing,
    sampleX,
    sampleY,
    sampleSpacing,
    doneAgo: -1,
    pictureAgo: 0,
    count: 0,
    score: 0,
    time: 0,
  };
  const dotPoint = (i: number): Point => ({ x: gridX + (i % DOTS) * spacing, y: gridY + Math.floor(i / DOTS) * spacing });
  /** The dot under a point (within a generous reach), or -1. */
  const dotAt = (p: Point): number => {
    let best = -1;
    let bestD = spacing * 0.42;
    for (let i = 0; i < DOTS * DOTS; i += 1) {
      const d = Math.hypot(dotPoint(i).x - p.x, dotPoint(i).y - p.y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    }
    return best;
  };

  function draw(from: number, to: number): void {
    const segments = straightSegments(from, to);
    if (!segments) return;
    for (const key of segments) {
      if (state.drawn.includes(key)) continue;
      const [a, b] = key.split('-').map(Number);
      const mid = { x: (dotPoint(a ?? 0).x + dotPoint(b ?? 0).x) / 2, y: (dotPoint(a ?? 0).y + dotPoint(b ?? 0).y) / 2 };
      if (state.picture.includes(key)) {
        state.drawn.push(key);
        events.push({ type: 'action', ...mid });
      } else if (!state.wrong.some((w) => w.key === key)) {
        state.wrong.push({ key, age: 0 });
        events.push({ type: 'miss', ...mid });
      }
    }
    if (state.picture.every((k) => state.drawn.includes(k))) {
      state.doneAgo = 0;
      state.score += 1;
      state.current = null;
      events.push({ type: 'score', x: gridX + spacing * 1.5, y: gridY + spacing * 1.5 });
    }
  }

  let tapAnchor: number | null = null;

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
      state.pictureAgo += dt;
      for (const w of state.wrong) w.age += dt;
      state.wrong = state.wrong.filter((w) => w.age < WRONG_SECONDS);
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= DONE_SECONDS) {
          state.doneAgo = -1;
          state.count += 1;
          state.picture = pictureAt(state.count);
          state.drawn = [];
          state.pictureAgo = 0;
          tapAnchor = null;
        }
        state.pen = null;
        return;
      }
      // Dragging: from the dot where the finger went down to each dot it reaches in a straight line.
      if (input.pressed) state.current = null;
      state.pen = input.pointer;
      if (input.pointer) {
        const dot = dotAt(input.pointer);
        if (dot >= 0 && dot !== state.current) {
          if (state.current !== null && straightSegments(state.current, dot)) draw(state.current, dot);
          if (state.doneAgo < 0) state.current = dot;
        }
      } else if (input.released) state.current = null;
      // Tapping: one dot, then another in a line from it, joins them.
      for (const tap of input.taps) {
        if (state.doneAgo >= 0) break;
        const dot = dotAt(tap);
        if (dot < 0) continue;
        if (tapAnchor !== null && tapAnchor !== dot && straightSegments(tapAnchor, dot)) draw(tapAnchor, dot);
        tapAnchor = tapAnchor === dot ? null : dot;
        state.current = tapAnchor;
      }
    },
  };
}

/** Good play: trace the picture's lines one after another, lifting the finger only when a line ends. */
export function dotCopyBot(state: DotCopyState, _context: BotContext): BotMove {
  // A look at the sample first, then a line every few tenths of a second, as a child draws.
  if (state.doneAgo >= 0 || state.pictureAgo < 2 || Math.round(state.time * 10) % 3 !== 0) return state.pen && state.doneAgo < 0 ? { touch: state.pen } : {};
  const todo = state.picture.filter((k) => !state.drawn.includes(k)).map((k) => k.split('-').map(Number) as [number, number]);
  const at = (i: number): Point => ({ x: state.gridX + (i % DOTS) * state.spacing, y: state.gridY + Math.floor(i / DOTS) * state.spacing });
  if (state.current !== null && state.pen) {
    const here = state.current;
    const next = todo.find(([a, b]) => a === here || b === here);
    if (next) return { touch: at(next[0] === here ? next[1] : next[0]) };
    return {};
  }
  if (state.pen) return {};
  // Start where the fewest lines meet, so the strokes do not double back.
  const degree = (i: number): number => todo.filter(([a, b]) => a === i || b === i).length;
  const ends = todo.flat().sort((a, b) => (degree(a) % 2 === 1 ? 0 : 1) - (degree(b) % 2 === 1 ? 0 : 1));
  const start = ends[0];
  return start === undefined ? {} : { touch: at(start) };
}

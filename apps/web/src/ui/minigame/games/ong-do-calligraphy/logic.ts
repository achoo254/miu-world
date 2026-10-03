// Ông đồ calligraphy (xin chữ): the old scholar writes a word for Tết in faint strokes on red paper (An, Tâm,
// Phúc, Lộc, Vui, Hòa) and the child traces it with the brush, one stroke at a time, in order. Slow, steady
// strokes leave dark ink; rushing leaves it pale; wandering off the stroke makes it blot. A good stroke stays
// on the paper; a pale or wandering one is wiped and she writes it again. A finished word is a point and the
// scholar adds the marks (the hat on â, the accent on ú…) and hangs it up. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

type Line = ReadonlyArray<readonly [number, number]>;
interface Glyph {
  width: number;
  strokes: readonly Line[];
}

/** Letters as brush strokes in a box one unit tall (0 = top, 1 = baseline), drawn in this order. */
const GLYPHS: Record<string, Glyph> = {
  A: { width: 0.8, strokes: [[[0, 1], [0.4, 0]], [[0.4, 0], [0.8, 1]], [[0.18, 0.62], [0.62, 0.62]]] },
  n: { width: 0.55, strokes: [[[0, 0.45], [0, 1]], [[0, 0.62], [0.15, 0.48], [0.38, 0.45], [0.55, 0.6], [0.55, 1]]] },
  T: { width: 0.7, strokes: [[[0, 0], [0.7, 0]], [[0.35, 0], [0.35, 1]]] },
  a: { width: 0.55, strokes: [[[0.5, 0.52], [0.3, 0.45], [0.08, 0.55], [0.02, 0.78], [0.12, 0.97], [0.35, 0.98], [0.5, 0.85]], [[0.53, 0.45], [0.53, 1]]] },
  m: { width: 0.8, strokes: [[[0, 0.45], [0, 1]], [[0, 0.62], [0.12, 0.48], [0.3, 0.47], [0.4, 0.6], [0.4, 1]], [[0.4, 0.62], [0.52, 0.48], [0.7, 0.47], [0.8, 0.6], [0.8, 1]]] },
  P: { width: 0.6, strokes: [[[0, 0], [0, 1]], [[0, 0], [0.4, 0], [0.58, 0.12], [0.58, 0.36], [0.4, 0.5], [0, 0.5]]] },
  h: { width: 0.55, strokes: [[[0, 0], [0, 1]], [[0, 0.62], [0.15, 0.48], [0.38, 0.45], [0.55, 0.6], [0.55, 1]]] },
  u: { width: 0.55, strokes: [[[0, 0.45], [0, 0.85], [0.12, 0.98], [0.4, 0.98], [0.55, 0.85]], [[0.55, 0.45], [0.55, 1]]] },
  c: { width: 0.5, strokes: [[[0.5, 0.52], [0.3, 0.45], [0.08, 0.55], [0.02, 0.75], [0.1, 0.95], [0.3, 1], [0.5, 0.93]]] },
  L: { width: 0.55, strokes: [[[0, 0], [0, 1], [0.55, 1]]] },
  o: { width: 0.55, strokes: [[[0.28, 0.45], [0.06, 0.55], [0, 0.75], [0.08, 0.95], [0.28, 1], [0.48, 0.95], [0.55, 0.75], [0.5, 0.55], [0.3, 0.45]]] },
  V: { width: 0.7, strokes: [[[0, 0], [0.35, 1], [0.7, 0]]] },
  i: { width: 0.12, strokes: [[[0.06, 0.45], [0.06, 1]]] },
  H: { width: 0.7, strokes: [[[0, 0], [0, 1]], [[0.7, 0], [0.7, 1]], [[0, 0.5], [0.7, 0.5]]] },
};

export interface Mark {
  /** Letter index in the word, and what the scholar adds there. */
  letter: number;
  kind: 'hat' | 'acute' | 'grave' | 'dot-below' | 'dot';
}

/** The words, spelled with plain letters plus the marks the scholar adds. */
export const WORDS: ReadonlyArray<{ word: string; letters: string; marks: Mark[] }> = [
  { word: 'An', letters: 'An', marks: [] },
  { word: 'Tâm', letters: 'Tam', marks: [{ letter: 1, kind: 'hat' }] },
  { word: 'Phúc', letters: 'Phuc', marks: [{ letter: 2, kind: 'acute' }] },
  { word: 'Lộc', letters: 'Loc', marks: [{ letter: 1, kind: 'hat' }, { letter: 1, kind: 'dot-below' }] },
  { word: 'Vui', letters: 'Vui', marks: [{ letter: 2, kind: 'dot' }] },
  { word: 'Hòa', letters: 'Hoa', marks: [{ letter: 1, kind: 'grave' }] },
];

export interface Stroke {
  /** Points along the stroke, about 12 units apart. */
  samples: Point[];
  /** Ink left on each sample (0 = none yet). */
  ink: number[];
  done: boolean;
}

export type StrokeVerdict = 'good' | 'pale' | 'off';

export interface CalligraphyState {
  word: number;
  /** Letter boxes (left x, width) on the paper, the paper's top and em size. */
  boxes: Array<{ x: number; w: number }>;
  top: number;
  em: number;
  strokes: Stroke[];
  current: number;
  /** The brush trail of this stroke, and how much of it strayed off the stroke. */
  trail: Point[];
  strayed: number;
  drawn: number;
  pen: Point | null;
  speed: number;
  verdict: StrokeVerdict | null;
  verdictAgo: number;
  /** Seconds since the word was finished (-1 while writing). */
  doneAgo: number;
  words: number;
  score: number;
  time: number;
}

const SAMPLE = 12;
const COVER = 34;
const STRAY = 52;
const DONE_SECONDS = 1.8;
const HISTORY = 12;

/** Ink from brush speed (units/s): slow is dark, fast is pale. */
export const inkFor = (speed: number): number => Math.max(0.2, Math.min(1, 1 - (speed - 380) / 600));

/** How a finished stroke went: coverage of the stroke, its mean ink, and how much the brush strayed. */
export function judge(stroke: Stroke, strayed: number, drawn: number): StrokeVerdict {
  const covered = stroke.ink.filter((v) => v > 0);
  const coverage = covered.length / Math.max(1, stroke.ink.length);
  const ink = covered.reduce((a, b) => a + b, 0) / Math.max(1, covered.length);
  if (coverage < 0.8 || strayed > Math.max(60, drawn * 0.35)) return 'off';
  return ink >= 0.55 ? 'good' : 'pale';
}

function sampleLine(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / SAMPLE));
    for (let k = i === 1 ? 0 : 1; k <= n; k += 1) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

const distToSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
};

export function createCalligraphy({ arena, rng }: GameSetup): MinigameLogic<CalligraphyState> {
  const events = eventQueue();
  const order = WORDS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0];
  }
  const state: CalligraphyState = {
    word: 0,
    boxes: [],
    top: 0,
    em: 0,
    strokes: [],
    current: 0,
    trail: [],
    strayed: 0,
    drawn: 0,
    pen: null,
    speed: 0,
    verdict: null,
    verdictAgo: 9,
    doneAgo: -1,
    words: 0,
    score: 0,
    time: 0,
  };
  const history: Point[] = [];

  function newWord(): void {
    state.word = order[state.words % order.length] ?? 0;
    const entry = WORDS[state.word] ?? WORDS[0];
    const letters = [...(entry?.letters ?? 'An')].map((ch) => GLYPHS[ch] ?? GLYPHS.A);
    const gap = 0.18;
    const width = letters.reduce((s, g) => s + (g?.width ?? 0.5), 0) + gap * (letters.length - 1);
    const em = Math.min(230, (arena.width - 110) / width, arena.height - HUD_SAFE_TOP - 200);
    let x = (arena.width - width * em) / 2;
    const top = HUD_SAFE_TOP + 70 + (arena.height - HUD_SAFE_TOP - 170 - em) / 2;
    state.boxes = [];
    state.strokes = [];
    for (const g of letters) {
      if (!g) continue;
      state.boxes.push({ x, w: g.width * em });
      for (const line of g.strokes) {
        const samples = sampleLine(line.map(([lx, ly]) => ({ x: x + lx * em, y: top + ly * em })));
        state.strokes.push({ samples, ink: samples.map(() => 0), done: false });
      }
      x += (g.width + gap) * em;
    }
    state.top = top;
    state.em = em;
    state.current = 0;
    state.doneAgo = -1;
  }

  function finishStroke(): void {
    const stroke = state.strokes[state.current];
    if (!stroke || state.trail.length < 2) {
      state.trail = [];
      return;
    }
    const verdict = judge(stroke, state.strayed, state.drawn);
    state.verdict = verdict;
    state.verdictAgo = 0;
    const end = stroke.samples.at(-1) ?? { x: 0, y: 0 };
    if (verdict === 'good') {
      stroke.done = true;
      state.current += 1;
      events.push({ type: 'action', ...end });
      if (state.current >= state.strokes.length) {
        state.doneAgo = 0;
        state.score += 1;
        events.push({ type: 'score', x: arena.width / 2, y: state.top - 30 });
      }
    } else {
      stroke.ink = stroke.ink.map(() => 0);
      events.push({ type: 'miss', ...end });
    }
    state.trail = [];
  }

  newWord();

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
      state.verdictAgo += dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo > DONE_SECONDS) {
          state.words += 1;
          newWord();
        }
        return;
      }
      const p = input.pointer;
      if (p) {
        history.push(p);
        if (history.length > HISTORY) history.shift();
        const oldest = history[0] ?? p;
        state.speed = history.length > 1 ? Math.hypot(p.x - oldest.x, p.y - oldest.y) / ((history.length - 1) * dt) : 0;
        const prev = state.trail.at(-1);
        if (input.pressed || !prev) {
          state.trail = [p];
          state.strayed = 0;
          state.drawn = 0;
        } else if (prev.x !== p.x || prev.y !== p.y) {
          state.trail.push(p);
          const len = Math.hypot(p.x - prev.x, p.y - prev.y);
          state.drawn += len;
          const stroke = state.strokes[state.current];
          if (stroke) {
            const ink = inkFor(state.speed);
            let near = false;
            stroke.samples.forEach((s, i) => {
              if (distToSegment(s, prev, p) <= COVER) {
                stroke.ink[i] = Math.max(stroke.ink[i] ?? 0, ink);
              }
            });
            for (const s of stroke.samples) if (Math.hypot(s.x - p.x, s.y - p.y) <= STRAY) near = true;
            if (!near) state.strayed += len;
          }
        }
      } else {
        history.length = 0;
        state.speed = 0;
        if (state.pen && state.trail.length > 0) finishStroke();
      }
      state.pen = p;
    },
  };
}

/** Good play: draws the stroke from its start at an even, unhurried pace and lifts the brush at its end. */
export function calligraphyBot(state: CalligraphyState, _context: BotContext): BotMove {
  const stroke = state.strokes[state.current];
  if (state.doneAgo >= 0 || !stroke || state.verdictAgo < 0.3) return {};
  const first = stroke.samples[0];
  if (!first) return {};
  if (!state.pen) return { touch: first };
  // Brush on toward the first part of the stroke that has no ink yet; lift once it is all inked.
  const gap = stroke.ink.findIndex((v) => v === 0);
  if (gap < 0) return {};
  const next = stroke.samples[Math.min(stroke.samples.length - 1, gap + 1)];
  return next ? { touch: next } : {};
}

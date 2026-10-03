// A small one-stroke letter recogniser in the spirit of the $1 recogniser (Wobbrock et al., 2007), without
// rotation (a "u" must not read as an "n"): the stroke is resampled to evenly spaced points, centred, scaled
// so its longer side is 1, and compared point by point with each letter's model, drawn either way round (and,
// for the closed "o", from any starting point). Pure: no DOM.
import type { Point } from '../../types';

export const LETTERS = ['o', 'c', 'l', 'n', 'm', 'v', 's', 'b'] as const;
export type Letter = (typeof LETTERS)[number];

const SAMPLES = 32;
/** Mean distance (in letter heights) under which a stroke counts as a letter. */
export const MATCH = 0.2;

const arc = (cx: number, cy: number, r: number, from: number, to: number, steps = 12): Point[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

/** How a child writes each letter in one stroke, in a box one unit high per x-height (y down). */
export const MODELS: Readonly<Record<Letter, readonly Point[]>> = {
  // Anticlockwise from the top right, all the way round.
  o: arc(0.5, 0.5, 0.5, -Math.PI / 4, -Math.PI / 4 - Math.PI * 2, 24),
  c: arc(0.5, 0.5, 0.5, -Math.PI / 4, -Math.PI * 1.75, 18),
  l: [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
  ],
  n: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0.35 }, ...arc(0.5, 0.45, 0.45, Math.PI * 1.05, Math.PI * 2, 8), { x: 0.95, y: 1 }],
  m: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0.35 }, ...arc(0.3, 0.35, 0.3, Math.PI * 1.05, Math.PI * 2, 6), { x: 0.6, y: 1 }, { x: 0.6, y: 0.35 }, ...arc(0.9, 0.35, 0.3, Math.PI * 1.05, Math.PI * 2, 6), { x: 1.2, y: 1 }],
  v: [
    { x: 0, y: 0 },
    { x: 0.45, y: 1 },
    { x: 0.9, y: 0 },
  ],
  s: [...arc(0.45, 0.27, 0.3, -Math.PI * 0.15, -Math.PI * 1.55, 8), ...arc(0.45, 0.75, 0.27, -Math.PI * 0.5, Math.PI * 0.85, 8)],
  b: [{ x: 0, y: -1 }, { x: 0, y: 1 }, ...arc(0.4, 0.55, 0.42, Math.PI * 0.85, Math.PI * 0.85 - Math.PI * 2 + 0.3, 14).reverse()],
};

function length(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

/** Evenly spaced points along a stroke. */
export function resample(points: readonly Point[], n = SAMPLES): Point[] {
  const first = points[0];
  if (!first) return [];
  const step = length(points) / (n - 1);
  if (step === 0) return Array.from({ length: n }, () => ({ ...first }));
  const out: Point[] = [{ ...first }];
  let carry = 0;
  for (let i = 1; i < points.length && out.length < n; i += 1) {
    let a = points[i - 1] ?? first;
    const b = points[i] ?? a;
    let d = Math.hypot(b.x - a.x, b.y - a.y);
    while (carry + d >= step && out.length < n) {
      const k = (step - carry) / d;
      const p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      out.push(p);
      a = p;
      d = Math.hypot(b.x - a.x, b.y - a.y);
      carry = 0;
    }
    carry += d;
  }
  while (out.length < n) out.push({ ...(points.at(-1) ?? first) });
  return out;
}

/** Centred on its middle, longer side 1. */
export function normalise(points: readonly Point[]): Point[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  return points.map((p) => ({ x: (p.x - cx) / size, y: (p.y - cy) / size }));
}

const distance = (a: readonly Point[], b: readonly Point[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const p = a[i];
    const q = b[i];
    if (p && q) sum += Math.hypot(p.x - q.x, p.y - q.y);
  }
  return sum / a.length;
};

const PREPARED: readonly { letter: Letter; shape: Point[] }[] = LETTERS.flatMap((letter) => {
  const base = normalise(resample(MODELS[letter]));
  const variants = [base, [...base].reverse()];
  if (letter === 'o') {
    // Closed: any starting point, either way round.
    for (let shift = 2; shift < SAMPLES; shift += 2) {
      const ring = resample([...MODELS.o.slice(Math.floor((shift * MODELS.o.length) / SAMPLES)), ...MODELS.o.slice(1, Math.floor((shift * MODELS.o.length) / SAMPLES) + 1)]);
      const shape = normalise(ring);
      variants.push(shape, [...shape].reverse());
    }
  }
  return variants.map((shape) => ({ letter, shape }));
});

/** The letter a stroke looks like, with how far off it is (a match is under MATCH); null when too short. */
export function recognise(stroke: readonly Point[]): { letter: Letter; score: number } | null {
  if (stroke.length < 2 || length(stroke) < 40) return null;
  const shape = normalise(resample(stroke));
  let best: { letter: Letter; score: number } | null = null;
  for (const model of PREPARED) {
    const d = distance(shape, model.shape);
    if (!best || d < best.score) best = { letter: model.letter, score: d };
  }
  return best;
}

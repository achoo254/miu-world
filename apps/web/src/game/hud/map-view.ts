// The full map's view (map-sheet.ts): which part of the map shows and how big, moved by a drag, a pinch, the
// wheel, a double tap or the +/− buttons, and always kept on the map (never zoomed out past the whole map nor
// panned off it). Also finds what a tap lands on and which labels fit without covering each other.
// Pure: no DOM, no three.js.

/** The world point in the middle of the screen and how many CSS pixels a block takes. North (−z) is up. */
export interface SheetView {
  cx: number;
  cz: number;
  scale: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** A rectangle of the world (blocks): the map's core. */
export interface MapRect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Room kept along the screen's sides for the sheet's bars and buttons (CSS px). */
export interface Inset {
  x: number;
  y: number;
}

export interface ScaleLimits {
  min: number;
  max: number;
}

/** The closest zoom (px per block): about the width of a house across a phone. */
export const MAX_SCALE = 10;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** The zoom that shows the whole map inside the inset screen. */
export function fitScale(rect: MapRect, viewport: Viewport, inset: Inset): number {
  const w = Math.max(1, viewport.width - 2 * inset.x);
  const h = Math.max(1, viewport.height - 2 * inset.y);
  return Math.min(w / Math.max(1, rect.x1 - rect.x0), h / Math.max(1, rect.z1 - rect.z0));
}

/** From the whole map to MAX_SCALE (a small map can still be zoomed in four times). */
export function scaleLimits(rect: MapRect, viewport: Viewport, inset: Inset): ScaleLimits {
  const min = fitScale(rect, viewport, inset);
  return { min, max: Math.max(MAX_SCALE, min * 4) };
}

/** The whole map, in the middle of the screen. */
export function overview(rect: MapRect, viewport: Viewport, inset: Inset): SheetView {
  return { cx: (rect.x0 + rect.x1) / 2, cz: (rect.z0 + rect.z1) / 2, scale: fitScale(rect, viewport, inset) };
}

/**
 * The view kept on the map: zoom within its limits, and the centre where the map still covers the screen
 * (its edge may come in as far as the inset); a side narrower than the screen stays in the middle.
 */
export function clampView(view: SheetView, rect: MapRect, viewport: Viewport, inset: Inset): SheetView {
  const limits = scaleLimits(rect, viewport, inset);
  const scale = clamp(view.scale, limits.min, limits.max);
  const axis = (c: number, lo: number, hi: number, screen: number, room: number): number => {
    const half = (screen / 2 - room) / scale;
    return hi - lo <= 2 * half ? (lo + hi) / 2 : clamp(c, lo + half, hi - half);
  };
  return { cx: axis(view.cx, rect.x0, rect.x1, viewport.width, inset.x), cz: axis(view.cz, rect.z0, rect.z1, viewport.height, inset.y), scale };
}

/** Screen position (CSS px) of a world point. */
export function toScreen(view: SheetView, viewport: Viewport, x: number, z: number): [number, number] {
  return [(x - view.cx) * view.scale + viewport.width / 2, (z - view.cz) * view.scale + viewport.height / 2];
}

/** World point under a screen position. */
export function toWorld(view: SheetView, viewport: Viewport, px: number, py: number): [number, number] {
  return [view.cx + (px - viewport.width / 2) / view.scale, view.cz + (py - viewport.height / 2) / view.scale];
}

/** The map dragged by a finger: what was under it stays under it. */
export function panBy(view: SheetView, dx: number, dy: number): SheetView {
  return { cx: view.cx - dx / view.scale, cz: view.cz - dy / view.scale, scale: view.scale };
}

/** Zoomed by `factor` round a screen point, which keeps the same world point under it (within the limits). */
export function zoomAt(view: SheetView, viewport: Viewport, factor: number, px: number, py: number, limits: ScaleLimits): SheetView {
  const scale = clamp(view.scale * factor, limits.min, limits.max);
  const [wx, wz] = toWorld(view, viewport, px, py);
  return { cx: wx - (px - viewport.width / 2) / scale, cz: wz - (py - viewport.height / 2) / scale, scale };
}

export interface Point {
  x: number;
  y: number;
}

/** Two fingers moved from `before` to `after`: zoomed by how far they spread, moved with their middle. */
export function pinch(view: SheetView, viewport: Viewport, before: readonly [Point, Point], after: readonly [Point, Point], limits: ScaleLimits): SheetView {
  const gap = (p: readonly [Point, Point]): number => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  const mid = (p: readonly [Point, Point]): Point => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
  const from = mid(before);
  const to = mid(after);
  const factor = gap(before) > 1 ? gap(after) / gap(before) : 1;
  return panBy(zoomAt(view, viewport, factor, from.x, from.y, limits), to.x - from.x, to.y - from.y);
}

/** The view from `a` to `b` at `t` (0…1): the centre moves straight, the zoom evenly in steps of doubling. */
export function blendView(a: SheetView, b: SheetView, t: number): SheetView {
  return { cx: a.cx + (b.cx - a.cx) * t, cz: a.cz + (b.cz - a.cz) * t, scale: a.scale * Math.pow(b.scale / a.scale, t) };
}

/** The nearest of `items` to a tap, within `slop` CSS px of it on screen; null when none is that near. */
export function hitTest<T extends { x: number; z: number }>(items: readonly T[], view: SheetView, viewport: Viewport, px: number, py: number, slop: number): T | null {
  let best: T | null = null;
  let bestDistance = slop;
  for (const item of items) {
    const [sx, sy] = toScreen(view, viewport, item.x, item.z);
    const distance = Math.hypot(sx - px, sy - py);
    if (distance <= bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

export interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Which labels to draw, most important first: each one that would cover a label already kept is left out. */
export function fitLabels(boxes: readonly LabelBox[]): boolean[] {
  const kept: LabelBox[] = [];
  return boxes.map((b) => {
    const covers = kept.some((k) => b.x < k.x + k.width && k.x < b.x + b.width && b.y < k.y + k.height && k.y < b.y + b.height);
    if (!covers) kept.push(b);
    return !covers;
  });
}

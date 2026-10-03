// Stone path: replaces the surface block along a polyline so the way from spawn to the landmarks
// reads at a glance. Returns the set of touched columns so decorations can avoid them.

export type Point = readonly [number, number];

export function pathColumns(points: readonly Point[], radius: number): Set<string> {
  const cells = new Set<string>();
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a[0] + (b[0] - a[0]) * t;
      const pz = a[1] + (b[1] - a[1]) * t;
      for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
        for (let dz = -Math.ceil(radius); dz <= Math.ceil(radius); dz++) {
          const x = Math.round(px) + dx;
          const z = Math.round(pz) + dz;
          if (Math.hypot(x - px, z - pz) <= radius) cells.add(`${x},${z}`);
        }
      }
    }
  }
  return cells;
}

/** Distance from (x, z) to the polyline. */
export function distanceToPath(points: readonly Point[], x: number, z: number): number {
  return nearestOnPath(points, x, z).d;
}

/**
 * The point of the polyline nearest (x, z): where it is, how far, and how far along the polyline from its first
 * point (Infinity away for a polyline of fewer than two points).
 */
export function nearestOnPath(points: readonly Point[], x: number, z: number): { x: number; z: number; d: number; along: number } {
  let best = { x, z, d: Infinity, along: 0 };
  let run = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len = Math.hypot(vx, vz);
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    const [px, pz] = [a[0] + vx * t, a[1] + vz * t];
    const d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { x: px, z: pz, d, along: run + t * len };
    run += len;
  }
  return best;
}

/** The columns under a polyline's middle line every block along it, from its first point to its last. */
export function columnsAlong(points: readonly Point[]): Array<readonly [number, number]> {
  const cells: Array<readonly [number, number]> = [];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (; carry <= len; carry++) {
      const t = len === 0 ? 0 : carry / len;
      cells.push([Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t)]);
    }
    carry -= len;
  }
  return cells;
}

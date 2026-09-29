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
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1)));
    best = Math.min(best, Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)));
  }
  return best;
}

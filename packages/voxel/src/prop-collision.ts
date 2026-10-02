// Placed props that stand in the child's way (owner, 02/10/2026: "giống như ngoài đời thực"), by their
// traversal (traversal.ts, `traversal` in content/world/models.json): plants, crops, rugs and the people and
// animals standing as scenery are walked through; every other prop fills the grid cells its bounds mostly
// cover and collides like blocks do. An `auto-step` one (a crate, a planter, a bench) is stepped onto at one
// block and climbed at two; a `blocking` one (a fence, a door, a railing, a big rock) is never stepped or
// climbed over by walking. A prop thinner than MIN_COVER across a cell (a thin post, a sign's pole) leaves
// that cell free. The game and the map tools (reachability of every quest target) share this one rule.
import type { Traversal } from './traversal';

/** Bounds of a model in its own space (its scene's nodes included), before placement. */
export interface ModelBounds {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export interface PlacedProp {
  model: string;
  position: readonly [number, number, number];
  /** Degrees about y. */
  yaw: number;
  scale: number;
}

/** Share of a cell a prop must cover across x and across z to fill it. */
const MIN_COVER = 0.3;
/** A prop sunk this little into the floor, or reaching this little into a cell above, does not fill it. */
const FLOOR_SLACK = 0.05;
const TOP_SLACK = 0.15;

export const cellKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;

/** World bounds of a placed prop (rotation about y, uniform scale, then position), as the renderer places it. */
export function placedBounds(prop: PlacedProp, bounds: ModelBounds): { min: [number, number, number]; max: [number, number, number] } {
  const a = (prop.yaw * Math.PI) / 180;
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const p: [number, number, number] = [(x * c + z * s) * prop.scale + prop.position[0], y * prop.scale + prop.position[1], (-x * s + z * c) * prop.scale + prop.position[2]];
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i] ?? Infinity, p[i] ?? 0);
          max[i] = Math.max(max[i] ?? -Infinity, p[i] ?? 0);
        }
      }
    }
  }
  return { min, max };
}

/** Cells along one axis that [lo, hi] covers by at least MIN_COVER. */
function coveredCells(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let c = Math.floor(lo); c < Math.ceil(hi); c++) if (Math.min(hi, c + 1) - Math.max(lo, c) >= MIN_COVER) out.push(c);
  return out;
}

/**
 * Every cell a solid prop fills (`cellKey`) with its traversal; a cell two props share is `blocking` if either
 * is. Models without bounds (not loaded) fill nothing.
 */
export function propSolidCells(props: Iterable<PlacedProp>, boundsOf: (model: string) => ModelBounds | undefined, traversalOf: (model: string) => Traversal): Map<string, Exclude<Traversal, 'walk-through'>> {
  const cells = new Map<string, Exclude<Traversal, 'walk-through'>>();
  for (const prop of props) {
    const traversal = traversalOf(prop.model);
    if (traversal === 'walk-through') continue;
    const bounds = boundsOf(prop.model);
    if (!bounds) continue;
    const { min, max } = placedBounds(prop, bounds);
    const ys: number[] = [];
    for (let y = Math.floor(min[1] + FLOOR_SLACK); y <= Math.floor(max[1] - TOP_SLACK); y++) ys.push(y);
    for (const x of coveredCells(min[0], max[0])) {
      for (const z of coveredCells(min[2], max[2])) {
        for (const y of ys) {
          const key = cellKey(x, y, z);
          if (cells.get(key) !== 'blocking') cells.set(key, traversal);
        }
      }
    }
  }
  return cells;
}

// Which square of the map a companion bot explores next: one it has not walked, next to one it has (so likely one it
// can get to), near its home and near where it is, more so among others it has not walked. It comes to know the map
// outwards from its home. Measured on the school's grid: nearest to where it stands only, a curious bot drifted to
// the map's far edge for its whole run; heading for the place its quest needs fixed it on the fence in front of it.
import { AREA_SIDE, type MemoryGraph } from './memory-graph';
import type { Spot, WalkMap } from './walk-store';

/** Squares it weighs, best first (the first not past a wall it met is taken)… */
const CANDIDATES = 12;
/** …looked for within this many squares of it and of its home first (the whole map only when none is left there). */
const BOX = 10;
/** Squares with fewer standing columns than this are not worth exploring. */
const MIN_SPOTS = 24;

/** Per map: how many standing columns each coarse square has. */
const spotsByMap = new WeakMap<WalkMap, Uint16Array>();

function spotsPerArea(map: WalkMap): Uint16Array {
  const known = spotsByMap.get(map);
  if (known) return known;
  const ax = Math.ceil(map.sx / AREA_SIDE);
  const counts = new Uint16Array(ax * Math.ceil(map.sz / AREA_SIDE));
  for (let z = 0; z < map.sz; z++) {
    for (let x = 0; x < map.sx; x++) {
      if (map.spot(x, z, 0) !== 0) {
        const i = Math.floor(x / AREA_SIDE) + Math.floor(z / AREA_SIDE) * ax;
        counts[i] = (counts[i] ?? 0) + 1;
      }
    }
  }
  spotsByMap.set(map, counts);
  return counts;
}

export interface AreaChoice {
  map: WalkMap;
  memory: MemoryGraph;
  at: Spot;
  home: Spot;
  random: () => number;
  /** Squares it keeps away from now. */
  avoids(area: number): boolean;
  /** Whether going straight to (x, z) heads into a wall it met. */
  walled(x: number, z: number): boolean;
}

/** The square to explore next, or -1: none left. */
export function pickArea({ map, memory, at, home, random, avoids, walled }: AreaChoice): number {
  const spots = spotsPerArea(map);
  const [ax, az] = memory.areaSide;
  const top: Array<{ area: number; score: number }> = [];
  const jitter = random() * AREA_SIDE;
  const consider = (x: number, z: number): void => {
    const i = x + z * ax;
    if ((spots[i] ?? 0) < MIN_SPOTS || memory.visited(i) || avoids(i)) return;
    let fresh = 0;
    let walked = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const nz = z + dz;
        if (!(dx || dz) || nx < 0 || nz < 0 || nx >= ax || nz >= az) continue;
        if (memory.visited(nx + nz * ax)) walked += 1;
        else fresh += 1;
      }
    }
    if (walked === 0) return;
    const cx = (x + 0.5) * AREA_SIDE;
    const cz = (z + 0.5) * AREA_SIDE;
    const score = Math.hypot(cx - at.x, cz - at.z) / 2 + Math.hypot(cx - home.x, cz - home.z) - 4 * fresh + (jitter * ((i * 2_654_435_761) % 7)) / 7;
    if (top.length < CANDIDATES || score < (top.at(-1)?.score ?? Infinity)) {
      top.push({ area: i, score });
      top.sort((p, q) => p.score - q.score);
      if (top.length > CANDIDATES) top.pop();
    }
  };
  const boxes = [
    [Math.floor(at.x / AREA_SIDE), Math.floor(at.z / AREA_SIDE)],
    [Math.floor(home.x / AREA_SIDE), Math.floor(home.z / AREA_SIDE)],
  ] as const;
  const inBox = (b: readonly [number, number], x: number, z: number): boolean => Math.abs(x - b[0]) <= BOX && Math.abs(z - b[1]) <= BOX;
  boxes.forEach((box, k) => {
    for (let z = Math.max(0, box[1] - BOX); z <= Math.min(az - 1, box[1] + BOX); z++) {
      for (let x = Math.max(0, box[0] - BOX); x <= Math.min(ax - 1, box[0] + BOX); x++) {
        if (k === 1 && inBox(boxes[0], x, z)) continue;
        consider(x, z);
      }
    }
  });
  if (top.length === 0) for (let z = 0; z < az; z++) for (let x = 0; x < ax; x++) if (!inBox(boxes[0], x, z) && !inBox(boxes[1], x, z)) consider(x, z);
  const open = top.find((c) => !walled(((c.area % ax) + 0.5) * AREA_SIDE, (Math.floor(c.area / ax) + 0.5) * AREA_SIDE));
  return open?.area ?? -1;
}

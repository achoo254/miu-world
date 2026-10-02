// The lie of the land of "Đảo bí ẩn" (designs/dao-bi-an/d-01, 02/10/2026): an archipelago on a clear blue sea.
// The main island carries a tall mesa of rock in its middle whose great fall pours down a sheer south face into
// a pool between ruins (d-05), its cave running in from the north face (d-07, d-08) to the treasure vault
// (d-14); a rocky highland in its west (the jungle's fall and rope bridge on its south face, d-04; the night
// forest's pool under its north face, d-13); the ruins and the temple to the east (d-06, d-09). North-east lies
// the volcano's island with the challenge court of lava at its foot (d-10, d-11); south-east the pirates'
// island under its cliff (d-12); small islets with palms all round. Pure functions of a column, no world.
import { fbm, hashSeed } from '../noise';
import { smoothstep } from '../map-kit';
import type { Zone } from '../zone-map';

export const SIZE = 800;
/** The ground of the zones; the sea's surface two blocks under it (its bed two lower still). */
export const LEVEL = 12;
export const WATER = 10;
const SEED = hashSeed('miu-dao-bi-an-land');

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'ben-tau-bai-bien', name: 'Bến tàu và bãi biển', x: 380, z: 590, hx: 64, hz: 36 },
  { chapter: 2, id: 'rung-nhiet-doi', name: 'Rừng nhiệt đới và thác nước', x: 220, z: 405, hx: 56, hz: 44 },
  { chapter: 3, id: 'di-tich-den-tho', name: 'Khu di tích cổ và đền thờ', x: 592, z: 410, hx: 54, hz: 44 },
  { chapter: 4, id: 'hang-dong-kho-bau', name: 'Hang động và kho báu', x: 400, z: 190, hx: 56, hz: 32 },
  { chapter: 5, id: 'bo-da-hai-tac', name: 'Bờ đá hải tặc', x: 650, z: 672, hx: 44, hz: 30, floor: 'sand' },
];

/** An inclusive rectangle of columns. */
export interface Area {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export const SPAWN = { x: 392, z: 610 };
/** The long pier of the harbour (d-02): its deck runs south from the beach into the sea. */
export const PIER = { x: 400, z0: 628, z1: 676, half: 2 };
/** The central mesa: its middle, reach and rise; and the sheer south face the great fall comes down. */
export const MESA = { x: 400, z: 355, r: 90, rise: 30 };
export const FALLS = { x: 400, faceZ: 418, half: 20 };
export const FALLS_POOL = { x: 400, z: 430, r: 9 };
/** The cave from its mouth in the mesa's north face, the great hall with its lake, the treasure vault. */
export const CAVE = { mouthZ: 268, tunnel: { x0: 397, x1: 403 }, hall: { x0: 372, z0: 292, x1: 428, z1: 336 }, vault: { x0: 384, z0: 346, x1: 416, z1: 374 } };
/** The rocky highland of the jungle: its fall into the jungle's pool (south), and the night forest's (north). */
export const HIGHLAND: Area & { rise: number } = { x0: 192, z0: 262, x1: 280, z1: 325, rise: 14 };
export const JUNGLE_POOL = { x: 235, z: 340, r: 8 };
export const NIGHT_POOL = { x: 240, z: 247, r: 7 };
/** A rock pool among stones on the beach (the crab of the welcome quest lives there). */
export const TIDE_POOL: Area = { x0: 432, z0: 616, x1: 438, z1: 625 };
/** The temple north of the ruins zone, its front (south, z1) on the zone's edge. */
export const TEMPLE: Area = { x0: 568, z0: 312, x1: 616, z1: 360 };
/** The volcano (its true peak rises over the map's terrain cap; the build lays the top) and the challenge court. */
export const VOLCANO = { x: 712, z: 106, r: 66, peak: 46, crater: 7 };
export const CHALLENGE: Area = { x0: 630, z0: 166, x1: 672, z1: 204 };
export const LEDGE = { x: 655, z: 142 };
/** The pirates' cliff east of their beach: its sheer west face at `x0`, the cave into it. */
export const COVE: Area & { rise: number; cave: Area } = { x0: 700, z0: 618, x1: 750, z1: 726, rise: 18, cave: { x0: 700, z0: 663, x1: 726, z1: 677 } };
/** The jetty of the pirates' beach and where their ship lies. */
export const COVE_JETTY = { x: 672, z0: 710, z1: 734 };

/** Islands: ellipses (middle, radii) and the islets round them (middle, radius). */
const MAIN = { x: 400, z: 390, rx: 255, rz: 235 };
const VOLCANO_ISLAND = { x: 690, z: 130, rx: 106, rz: 98 };
const PIRATE_ISLAND = { x: 668, z: 668, rx: 86, rz: 52 };
export const ISLETS: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: 110, z: 575, r: 26 },
  { x: 85, z: 255, r: 22 },
  { x: 255, z: 715, r: 22 },
  { x: 505, z: 725, r: 18 },
  { x: 770, z: 420, r: 26 },
  { x: 165, z: 95, r: 20 },
  { x: 530, z: 75, r: 18 },
  { x: 770, z: 770, r: 16 },
  { x: 55, z: 765, r: 14 },
  { x: 330, z: 60, r: 16 },
  { x: 60, z: 430, r: 14 },
  { x: 548, z: 612, r: 9 },
  { x: 190, z: 642, r: 8 },
  { x: 470, z: 690, r: 7 },
  { x: 735, z: 300, r: 10 },
  { x: 600, z: 772, r: 9 },
  { x: 40, z: 120, r: 9 },
  { x: 350, z: 742, r: 8 },
  { x: 118, z: 360, r: 7 },
  { x: 90, z: 680, r: 9 },
  { x: 440, z: 95, r: 7 },
];
/** Bays bitten into the main island's coast (middle, radius), never into what must stand on land. */
const BAYS: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: 178, z: 505, r: 34 },
  { x: 640, z: 522, r: 34 },
  { x: 258, z: 186, r: 34 },
  { x: 548, z: 200, r: 30 },
  { x: 250, z: 562, r: 30 },
];
/** Land kept round what must stand on it (the zones, the highland, the temple, the challenge court). */
const KEEP_LAND: ReadonlyArray<Area & { pad: number }> = [
  ...ZONES.map((zn) => ({ x0: zn.x - zn.hx, z0: zn.z - zn.hz, x1: zn.x + zn.hx, z1: zn.z + zn.hz, pad: 10 })),
  { ...HIGHLAND, pad: 9 },
  { ...TEMPLE, pad: 8 },
  { ...CHALLENGE, pad: 8 },
  { ...COVE, pad: 4 },
];

const outsideArea = (a: Area, x: number, z: number): number => Math.hypot(Math.max(0, a.x0 - x, x - a.x1), Math.max(0, a.z0 - z, z - a.z1));
export const inArea = (a: Area, x: number, z: number, pad = 0): boolean => x >= a.x0 - pad && x <= a.x1 + pad && z >= a.z0 - pad && z <= a.z1 + pad;
export const inZoneRect = (x: number, z: number, pad = 0): boolean => ZONES.some((zn) => Math.abs(x - zn.x) <= zn.hx + pad && Math.abs(z - zn.z) <= zn.hz + pad);

const inEllipse = (e: { x: number; z: number; rx: number; rz: number }, x: number, z: number, wobble: number): boolean => ((x - e.x) / e.rx) ** 2 + ((z - e.z) / e.rz) ** 2 < 1 + wobble;

function computeLand(x: number, z: number): boolean {
  for (const a of KEEP_LAND) {
    const d = outsideArea(a, x, z);
    if (d < a.pad + 3 && d < a.pad + 3 * fbm(SEED + 9, x / 14, z / 14)) return true;
  }
  const wobble = 0.16 * fbm(SEED, x / 38, z / 38);
  if (BAYS.some((b) => Math.hypot(x - b.x, z - b.z) < b.r * (1 + 0.25 * wobble))) return false;
  if (inEllipse(MAIN, x, z, wobble) || inEllipse(VOLCANO_ISLAND, x, z, wobble) || inEllipse(PIRATE_ISLAND, x, z, wobble)) return true;
  for (const i of ISLETS) {
    const d = Math.hypot(x - i.x, z - i.z);
    if (d < i.r * 1.25 && d < i.r * (1 + 0.22 * fbm(SEED + 5, x / 9, z / 9))) return true;
  }
  return false;
}

/** The land of every column, worked out once (the map asks for each column many times). */
let landGrid: Uint8Array | undefined;
/** Whether a column is land (else sea); off the map is sea. */
export function isLand(x: number, z: number): boolean {
  if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) return false;
  if (!landGrid) {
    const grid = new Uint8Array(SIZE * SIZE);
    for (let cx = 0; cx < SIZE; cx++) for (let cz = 0; cz < SIZE; cz++) grid[cx * SIZE + cz] = computeLand(cx, cz) ? 1 : 0;
    landGrid = grid;
  }
  return landGrid[x * SIZE + z] === 1;
}

const inDisc = (p: { x: number; z: number; r: number }, x: number, z: number): boolean => Math.hypot(x - p.x, z - p.z) < p.r;
/** Pools on land: the great fall's, the jungle's, the night forest's, the rock pool on the beach. */
export const inPool = (x: number, z: number): boolean => inDisc(FALLS_POOL, x, z) || inDisc(JUNGLE_POOL, x, z) || inDisc(NIGHT_POOL, x, z) || inArea(TIDE_POOL, x, z);
/** Water: the sea round the islands, and the pools. */
export const inWater = (x: number, z: number): boolean => inPool(x, z) || !isLand(x, z);

/** Blocks from each column to the nearest sea (0 in the sea, at most 32), by a sweep from the sea once. */
let coastGrid: Uint8Array | undefined;
export function coastDistance(x: number, z: number): number {
  if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) return 0;
  if (!coastGrid) {
    const grid = new Uint8Array(SIZE * SIZE).fill(32);
    const queue = new Int32Array(SIZE * SIZE);
    let tail = 0;
    for (let cx = 0; cx < SIZE; cx++) {
      for (let cz = 0; cz < SIZE; cz++) {
        if (isLand(cx, cz)) continue;
        grid[cx * SIZE + cz] = 0;
        queue[tail++] = cx * SIZE + cz;
      }
    }
    for (let head = 0; head < tail; head++) {
      const at = queue[head] ?? 0;
      const [cx, cz] = [Math.floor(at / SIZE), at % SIZE];
      const next = (grid[at] ?? 0) + 1;
      if (next >= 32) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const [nx, nz] = [cx + dx, cz + dz];
        if (nx < 0 || nz < 0 || nx >= SIZE || nz >= SIZE) continue;
        const k = nx * SIZE + nz;
        if ((grid[k] ?? 0) <= next) continue;
        grid[k] = next;
        queue[tail++] = k;
      }
    }
    coastGrid = grid;
  }
  return coastGrid[x * SIZE + z] ?? 0;
}

/** Rise of a rocky mountain of `rise` round (cx, cz): steep stepped sides, a rounded top, its edge ragged. */
function mesaRise(cx: number, cz: number, r: number, rise: number, x: number, z: number, salt: number): number {
  const d = Math.hypot(x - cx, z - cz) + 7 * fbm(SEED + salt, x / 21, z / 21) + 3 * fbm(SEED + salt + 50, x / 6, z / 6);
  if (d >= r) return 0;
  return rise * smoothstep(0, 0.6, 1 - d / r);
}

/**
 * The central mountain and its two shoulders, cut sheer where the great fall comes down. Its top rises past
 * the terrain's cap (the build lays the rest, `LEVEL + mesaHeight`).
 */
export function mesaHeight(x: number, z: number): number {
  if (z > FALLS.faceZ && Math.abs(x - FALLS.x) <= FALLS.half) return 0;
  const rise = Math.max(mesaRise(MESA.x, MESA.z, MESA.r, MESA.rise, x, z, 1), mesaRise(352, 330, 44, 18, x, z, 2), mesaRise(455, 335, 46, 20, x, z, 3));
  return Math.floor(rise / 3) * 3;
}

/** The highland, a plateau falling over seven blocks, sheer where its two falls come down. */
export function highlandHeight(x: number, z: number): number {
  if (z > HIGHLAND.z1 && Math.abs(x - JUNGLE_POOL.x) <= 11) return 0;
  if (z < HIGHLAND.z0 && Math.abs(x - NIGHT_POOL.x) <= 10) return 0;
  const out = outsideArea(HIGHLAND, x, z) + 3 * fbm(SEED + 4, x / 11, z / 11);
  const rise = HIGHLAND.rise * (1 - smoothstep(0, 7, out));
  return Math.floor(rise / 3) * 3 + (rise > 1 && fbm(SEED + 6, x / 6, z / 6) > 0.3 ? 1 : 0);
}

/** The volcano's true height above the ground (past the terrain's cap; its crater sunk five under the rim). */
export function volcanoRise(x: number, z: number): number {
  const d = Math.hypot(x - VOLCANO.x, z - VOLCANO.z) + 3 * fbm(SEED + 7, x / 9, z / 9);
  if (d >= VOLCANO.r) return 0;
  const full = VOLCANO.peak - LEVEL;
  const cone = full * (1 - d / VOLCANO.r) ** 0.95;
  const rise = d < VOLCANO.crater ? Math.min(cone, full - 5) : cone;
  return Math.floor(rise / 2) * 2;
}

/** The pirates' cliff: full height from its sheer west face, falling away to the sea on its other sides. */
export function coveHeight(x: number, z: number): number {
  if (x < COVE.x0) return 0;
  const edge = Math.min(COVE.x1 - x, z - COVE.z0, COVE.z1 - z) + 3 * fbm(SEED + 8, x / 8, z / 8);
  if (edge <= 0) return 0;
  const rise = COVE.rise * smoothstep(0, 8, edge) * (0.85 + 0.15 * fbm(SEED + 10, x / 12, z / 12));
  return Math.floor(rise / 3) * 3;
}

/**
 * The shaped ground: beaches low by the sea (never in a zone), a hump on each islet, then the mesa, the
 * highland, the cliff and the volcano on top. The map's terrain stops at its cap (the build lays the rest).
 */
export function shapeIsland(x: number, z: number, h: number): number {
  let out = h;
  if (!isLand(x, z)) return out;
  const coast = coastDistance(x, z);
  if (!inZoneRect(x, z) && coast <= 6) out = Math.min(out, coast <= 3 ? LEVEL - 1 : LEVEL);
  for (const islet of ISLETS) {
    const d = Math.hypot(x - islet.x, z - islet.z);
    if (d < islet.r * 0.7) out += Math.round(3 * (1 - d / (islet.r * 0.7)));
  }
  out += mesaHeight(x, z) + highlandHeight(x, z) + coveHeight(x, z);
  const v = volcanoRise(x, z);
  if (v > 0) out = Math.max(out, LEVEL + v);
  return out;
}

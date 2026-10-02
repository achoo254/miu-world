// Block structures of the countryside maps, after the owner's mocks (designs/the-gioi/, designs/<map>/):
// a market stall under a striped awning, a wooden windmill, a red-and-white lighthouse, a stone fountain,
// a village well, a cottage with a coloured roof. Each writes blocks only and returns where its props or
// its people go.
import { placeHouse, type HouseBlocks } from './buildings';
import { put, type WorldWriter } from './world-writer';

/**
 * A stall `w` wide (x) and `d` deep (z) on `baseY` (designs/cho-phien/d-03…d-06): four log posts, a plank
 * counter along its front (-z), a shelf along its back, a crate either side of the counter and an awning
 * striped in `stripes` (block ids, alternating along x) that slopes down over the counter. Returns the
 * counter top's centre (for produce props), where the seller stands behind it, the shelf top's centre and
 * the two crates' tops.
 */
export function placeStall(
  world: WorldWriter,
  x0: number,
  z0: number,
  w: number,
  d: number,
  baseY: number,
  b: { log: number; planks: number; stripes: readonly number[] },
): { counter: [number, number, number]; seller: [number, number]; shelf: [number, number, number]; crates: Array<[number, number, number]> } {
  const [x1, z1] = [x0 + w - 1, z0 + d - 1];
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) for (let y = baseY; y < baseY + 3; y++) put(world, x, y, z, b.log);
  for (let x = x0 + 1; x < x1; x++) {
    put(world, x, baseY, z0, b.planks);
    put(world, x, baseY + 1, z1, b.planks);
  }
  for (const x of [x0 - 1, x1 + 1]) put(world, x, baseY, z0, b.planks);
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const stripe = b.stripes[((x - x0 + 1) % b.stripes.length + b.stripes.length) % b.stripes.length] ?? b.planks;
    for (let z = z0; z <= z1; z++) put(world, x, baseY + 3, z, stripe);
    put(world, x, baseY + 2, z0 - 1, stripe);
  }
  const mid = (x0 + x1) / 2 + 0.5;
  return {
    counter: [mid, baseY + 1, z0 + 0.5],
    seller: [Math.round((x0 + x1) / 2), z0 + 1],
    shelf: [mid, baseY + 2, z1 + 0.5],
    crates: [[x0 - 0.5, baseY + 1, z0 + 0.5], [x1 + 1.5, baseY + 1, z0 + 0.5]],
  };
}

/**
 * A wooden windmill of the mocks (designs/lang-ven-song/d-06, nong-trai/d-13): a stone foot, a round plank
 * tower tapering up with log ribs, two windows and a door on -z, a pointed cap, and four lattice sails on its
 * -z face, each `sails` blocks long. `stone` and `glass` default to the log and planks.
 */
export function placeWindmill(world: WorldWriter, cx: number, cz: number, baseY: number, b: { planks: number; log: number; roof: number; sail: number; stone?: number; glass?: number }, sails = 8): { top: number } {
  const height = 13;
  const radiusAt = (y: number): number => (y < 2 ? 4 : y < 7 ? 3 : y < 11 ? 2.5 : 2);
  for (let y = 0; y < height; y++) {
    const r = radiusAt(y);
    for (let dx = -5; dx <= 5; dx++) {
      for (let dz = -5; dz <= 5; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > r + 0.3 || d <= r - 1) continue;
        if (dx === 0 && dz < 0 && y < 3) continue; // the door through the foot
        const rib = Math.abs(dx) === Math.abs(dz) && d > 1;
        const window = (y === 5 || y === 9) && ((dx === 0 && dz > 0) || (dz === 0 && dx !== 0));
        put(world, cx + dx, baseY + y, cz + dz, y < 2 ? (b.stone ?? b.log) : window ? (b.glass ?? b.planks) : rib ? b.log : b.planks);
      }
    }
  }
  for (let k = 0; k <= 4; k++) {
    const r = 2.8 * (1 - k / 4);
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= r + 0.3) put(world, cx + dx, baseY + height + k, cz + dz, b.roof);
  }
  // Four sails: a log spar each, a lattice of cloth and frame three blocks wide along it.
  const hub = { y: baseY + height - 2, z: cz - 3 };
  put(world, cx, hub.y, hub.z, b.log);
  put(world, cx, hub.y, hub.z + 1, b.log);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const [px, py] = [-dy, dx];
    for (let i = 1; i <= sails; i++) {
      put(world, cx + dx * i, hub.y + dy * i, hub.z, b.log);
      if (i < 3) continue;
      for (const k of [1, 2]) put(world, cx + dx * i + px * k, hub.y + dy * i + py * k, hub.z, i % 2 === 0 || k === 2 ? b.planks : b.sail);
    }
  }
  return { top: baseY + height + 4 };
}

/** A round lighthouse striped red and white, a glass lantern room on top and a dark cap. */
export function placeLighthouse(world: WorldWriter, cx: number, cz: number, baseY: number, b: { red: number; white: number; glass: number; cap: number }): { top: number } {
  const height = 14;
  for (let y = 0; y < height; y++) {
    const r = y < 6 ? 2.6 : 2.1;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dx, dz);
      const door = dz < -1 && dx === 0 && y < 2;
      if (d <= r && d > r - 1.2 && !door) put(world, cx + dx, baseY + y, cz + dz, Math.floor(y / 3) % 2 === 0 ? b.red : b.white);
    }
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    put(world, cx + dx, baseY + height, cz + dz, b.white);
    if (Math.abs(dx) === 2 || Math.abs(dz) === 2) for (let y = 1; y <= 2; y++) put(world, cx + dx, baseY + height + y, cz + dz, b.glass);
  }
  for (let k = 0; k <= 2; k++) for (let dx = -2 + k; dx <= 2 - k; dx++) for (let dz = -2 + k; dz <= 2 - k; dz++) put(world, cx + dx, baseY + height + 3 + k, cz + dz, b.cap);
  return { top: baseY + height + 5 };
}

/** A round stone basin of water with a stone plinth in the middle (a statue stands on it). */
export function placeFountain(world: WorldWriter, cx: number, cz: number, baseY: number, b: { stone: number; water: number }): { plinth: [number, number, number] } {
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const d = Math.hypot(dx, dz);
    if (d > 4.4) continue;
    if (d > 3.4) put(world, cx + dx, baseY, cz + dz, b.stone);
    else put(world, cx + dx, baseY - 1, cz + dz, b.water);
  }
  for (let y = baseY - 1; y <= baseY + 1; y++) for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) put(world, cx + dx, y, cz + dz, b.stone);
  return { plinth: [cx + 0.5, baseY + 2, cz + 0.5] };
}

/**
 * The white cat of the mocks' squares (designs/truong-hoc/c-03, cho-phien/d-01, lau-dai/d-03, trung-tam/d-01):
 * a chibi cat of blocks sitting on (cx, y, cz) facing -z, a big head with ears and dark eyes over a small body,
 * its tail curled up behind.
 */
export function placeCatStatue(world: WorldWriter, cx: number, y: number, cz: number, b: { stone: number; eye: number }): void {
  for (let dx = -1; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) for (let dy = 0; dy <= 1; dy++) put(world, cx + dx, y + dy, cz + dz, b.stone);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = 2; dy <= 4; dy++) put(world, cx + dx, y + dy, cz + dz, b.stone);
  for (const dx of [-2, 2]) put(world, cx + dx, y + 5, cz, b.stone);
  for (const dx of [-1, 1]) put(world, cx + dx, y + 3, cz - 1, b.eye);
  for (let dy = 1; dy <= 3; dy++) put(world, cx + 1, y + dy, cz + 2, b.stone);
}

/** A village well: a ring of stone round a water hole. */
export function placeWell(world: WorldWriter, cx: number, cz: number, ground: number, b: { stone: number; water: number }): void {
  for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) put(world, cx + dx, ground + 1, cz + dz, b.stone);
  put(world, cx, ground, cz, b.water);
}

/**
 * A cottage of the mocks: walls and roof colour picked by `n` so a row of them reads as a mixed street
 * (red, blue and orange roofs; cream, birch and plank walls), door on -z, finished as `b.finish` says
 * (buildings.ts `HouseBlocks`). Returns its footprint (inclusive) with the doorstep in front, the lamp cells
 * beside its door and the tops of its flower boxes.
 */
export function placeCottage(
  world: WorldWriter,
  x0: number,
  z0: number,
  n: number,
  baseY: number,
  b: { walls: readonly number[]; roofs: readonly number[]; trim: number; finish?: Omit<HouseBlocks, 'wall' | 'roof' | 'trim'> },
): { x0: number; z0: number; x1: number; z1: number; lamps: Array<[number, number]>; boxes: Array<[number, number, number]> } {
  const w = 9 + (n % 3) * 2;
  const d = 7 + (n % 2);
  const front = placeHouse(world, x0, z0, w, d, 4, baseY, {
    ...b.finish,
    wall: b.walls[n % b.walls.length] ?? b.trim,
    roof: b.roofs[(n * 7) % b.roofs.length] ?? b.trim,
    trim: b.trim,
  });
  return { x0: x0 - 1, z0: z0 - 3, x1: x0 + w, z1: z0 + d, lamps: front.lamps, boxes: front.boxes };
}

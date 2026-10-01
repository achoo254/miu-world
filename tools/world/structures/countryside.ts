// Block structures of the countryside maps, after the owner's mocks (designs/the-gioi/, designs/<map>/):
// a market stall under a striped awning, a wooden windmill, a red-and-white lighthouse, a stone fountain,
// a village well, a cottage with a coloured roof. Each writes blocks only and returns where its props or
// its people go.
import { placeHouse } from './buildings';
import { put, type WorldWriter } from './world-writer';

/**
 * A stall `w` wide (x) and `d` deep (z) on `baseY`: four log posts, a plank counter along its front (-z)
 * and an awning striped in `stripes` (block ids, alternating along x), one block over the posts.
 * Returns the counter top's centre (for produce props) and where the seller stands behind it.
 */
export function placeStall(world: WorldWriter, x0: number, z0: number, w: number, d: number, baseY: number, b: { log: number; planks: number; stripes: readonly number[] }): { counter: [number, number, number]; seller: [number, number] } {
  const [x1, z1] = [x0 + w - 1, z0 + d - 1];
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) for (let y = baseY; y < baseY + 3; y++) put(world, x, y, z, b.log);
  for (let x = x0 + 1; x < x1; x++) put(world, x, baseY, z0, b.planks);
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const stripe = b.stripes[((x - x0 + 1) % b.stripes.length + b.stripes.length) % b.stripes.length] ?? b.planks;
    for (let z = z0 - 1; z <= z1; z++) put(world, x, baseY + 3, z, stripe);
  }
  return { counter: [(x0 + x1) / 2 + 0.5, baseY + 1, z0 + 0.5], seller: [Math.round((x0 + x1) / 2), z0 + 1] };
}

/** A wooden windmill: a tapering planks tower with a log frame, a cap and four sails facing -z. */
export function placeWindmill(world: WorldWriter, cx: number, cz: number, baseY: number, b: { planks: number; log: number; roof: number; sail: number }): { top: number } {
  const height = 11;
  for (let y = 0; y < height; y++) {
    const r = y < 4 ? 3 : y < 8 ? 2 : 1;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const edge = Math.max(Math.abs(dx), Math.abs(dz)) === r;
        const door = dz === -r && dx === 0 && y < 2;
        if (edge && !door) put(world, cx + dx, baseY + y, cz + dz, Math.abs(dx) === r && Math.abs(dz) === r ? b.log : b.planks);
      }
    }
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dz) <= 2) put(world, cx + dx, baseY + height, cz + dz, b.roof);
  // Sails: a cross of logs with planks cloth, on the -z face of the cap.
  const hub = { y: baseY + height - 2, z: cz - 2 };
  put(world, cx, hub.y, hub.z, b.log);
  for (let i = 1; i <= 6; i++) {
    for (const [dx, dy] of [[i, 0], [-i, 0], [0, i], [0, -i]] as const) {
      put(world, cx + dx, hub.y + dy, hub.z, b.log);
      if (i > 1) put(world, cx + dx + (dy !== 0 ? 1 : 0), hub.y + dy + (dx !== 0 ? 1 : 0), hub.z, b.sail);
    }
  }
  return { top: baseY + height };
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

/** A round stone basin of water with a stone plinth in the middle (a statue prop stands on it). */
export function placeFountain(world: WorldWriter, cx: number, cz: number, baseY: number, b: { stone: number; water: number }): { plinth: [number, number, number] } {
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const d = Math.hypot(dx, dz);
    if (d > 4.4) continue;
    if (d > 3.4) put(world, cx + dx, baseY, cz + dz, b.stone);
    else put(world, cx + dx, baseY - 1, cz + dz, b.water);
  }
  for (let y = baseY - 1; y <= baseY + 1; y++) put(world, cx, y, cz, b.stone);
  return { plinth: [cx + 0.5, baseY + 2, cz + 0.5] };
}

/** A village well: a ring of stone round a water hole. */
export function placeWell(world: WorldWriter, cx: number, cz: number, ground: number, b: { stone: number; water: number }): void {
  for (const [dx, dz] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) put(world, cx + dx, ground + 1, cz + dz, b.stone);
  put(world, cx, ground, cz, b.water);
}

/**
 * A cottage of the mocks: walls and roof colour picked by `n` so a row of them reads as a mixed street
 * (red, blue and orange roofs; cream, birch and plank walls), door on -z. Returns its footprint (inclusive)
 * with the doorstep in front.
 */
export function placeCottage(world: WorldWriter, x0: number, z0: number, n: number, baseY: number, b: { walls: readonly number[]; roofs: readonly number[]; trim: number }): { x0: number; z0: number; x1: number; z1: number } {
  const w = 9 + (n % 3) * 2;
  const d = 7 + (n % 2);
  placeHouse(world, x0, z0, w, d, 3 + (n % 2), baseY, {
    wall: b.walls[n % b.walls.length] ?? b.trim,
    roof: b.roofs[(n * 7) % b.roofs.length] ?? b.trim,
    trim: b.trim,
  });
  return { x0: x0 - 1, z0: z0 - 3, x1: x0 + w, z1: z0 + d };
}

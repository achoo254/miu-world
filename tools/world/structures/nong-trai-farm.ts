// Block structures of the farm's detail mock (designs/nong-trai/d-*, 02/10/2026): the red barn under its grey
// gambrel roof with white trim and X doors (d-04, c-09), the glasshouse of timber and glass with its benches
// (d-05), the storehouse with its shelves and bread oven (d-08), the brick bread oven (d-13), the farm gate of
// stone feet and timber with its lanterns (d-02), the round silo. Each writes blocks only, its front toward
// -z, and returns where its props, its lamps or its people go; the map file decides where they stand.
import { put, type WorldWriter } from './world-writer';

export interface BarnBlocks {
  wall: number;
  roof: number;
  trim: number;
  floor: number;
  glass: number;
  lantern: number;
  stall: number;
}

/**
 * A red barn `w` wide (x, odd reads best) and `d` deep on `baseY`, walls `wallHeight` high, its gambrel roof's
 * ridge running front to back so the front gable shows the barn's outline: steep lower slopes, shallow upper
 * ones, white trim along the gable's edge and the corners. A wide door in the middle of the front with a white X
 * door folded back either side, a hay loft window with a white X over it, windows down both sides, a plank
 * floor, log stalls along both side walls inside, lanterns on the walls. Returns the cell before the door, the
 * floor inside (inclusive) and the stalls' middles.
 */
export function placeRedBarn(world: WorldWriter, x0: number, z0: number, w: number, d: number, baseY: number, b: BarnBlocks, wallHeight = 6): { door: [number, number]; inside: { x0: number; z0: number; x1: number; z1: number }; stalls: Array<[number, number]> } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const mid = (x0 + x1) / 2;
  const half = (w - 1) / 2 + 1;
  const top = baseY + wallHeight;
  const rise = Math.round(w * 0.5);
  /** The roof's height over a column: two steep blocks for every one across, then a gentle top. */
  const roofAt = (x: number): number => {
    const t = Math.max(0, half - Math.abs(x - mid)) / half;
    return top + Math.round(rise * (t < 0.42 ? (t / 0.42) * 0.68 : 0.68 + ((t - 0.42) / 0.58) * 0.32));
  };
  const doorHalf = Math.max(2, Math.floor(w / 8));
  const doorHeight = Math.min(wallHeight - 1, 5);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      put(world, x, baseY - 1, z, b.floor);
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      for (let y = baseY; y < top; y++) {
        const corner = edgeX && edgeZ;
        const door = z === z0 && Math.abs(x - mid) <= doorHalf && y < baseY + doorHeight;
        if (door) continue;
        const sideWindow = edgeX && !edgeZ && y === baseY + 2 && (z - z0) % 4 === 2 && z < z1 - 1;
        put(world, x, y, z, corner || y === top - 1 ? b.trim : sideWindow ? b.glass : b.wall);
      }
    }
  }
  // The folded-back doors on the front wall either side of the opening: a white frame with a white X.
  for (const side of [-1, 1]) {
    const inner = Math.round(mid + side * (doorHalf + 1));
    const outer = Math.round(mid + side * (doorHalf + 3));
    for (let x = Math.min(inner, outer); x <= Math.max(inner, outer); x++) {
      for (let y = baseY; y < baseY + doorHeight; y++) {
        const u = Math.abs(x - inner);
        const v = y - baseY;
        const frame = u === 0 || u === 2 || v === 0 || v === doorHeight - 1;
        const cross = Math.abs(u * (doorHeight - 1) - v * 2) <= 1 || Math.abs((2 - u) * (doorHeight - 1) - v * 2) <= 1;
        put(world, x, y, z0 - 1, frame || cross ? b.trim : b.wall);
      }
    }
  }
  // A white beam over the opening.
  for (let x = Math.round(mid - doorHalf - 1); x <= Math.round(mid + doorHalf + 1); x++) put(world, x, baseY + doorHeight, z0, b.trim);
  // The roof shell: each column at its height, filled down to its outer neighbour so the steep part has no gaps.
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const y = roofAt(x);
    const outer = x <= mid ? roofAt(x - 1) : roofAt(x + 1);
    const from = Math.min(y, Math.max(top, outer + 1));
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      for (let yy = from; yy <= y; yy++) put(world, x, yy, z, b.roof);
      // Gable ends under the roof: the wall, white just under the roof's edge.
      if (z === z0 || z === z1) for (let yy = top; yy < from; yy++) put(world, x, yy, z, yy >= from - 1 ? b.trim : b.wall);
    }
  }
  // The hay loft window over the door: a white frame and X on the gable.
  const loftY = top + 1;
  for (let du = -1; du <= 1; du++) for (let dv = 0; dv <= 2; dv++) put(world, Math.round(mid) + du, loftY + dv, z0, du === 0 || dv === 1 || Math.abs(du) === 1 ? b.trim : b.wall);
  put(world, Math.round(mid), loftY + 1, z0, b.glass);
  // Inside: log stalls along both side walls, every third block, lanterns on the walls.
  const stalls: Array<[number, number]> = [];
  for (let z = z0 + 3; z < z1 - 1; z += 4) {
    for (const [wx, dir] of [[x0, 1], [x1, -1]] as const) {
      for (let k = 1; k <= 3; k++) put(world, wx + dir * k, baseY, z, b.stall);
      put(world, wx + dir * 3, baseY + 1, z, b.stall);
      stalls.push([wx + dir * 2, z + 2]);
    }
  }
  for (let z = z0 + 2; z < z1; z += 6) for (const wx of [x0 + 1, x1 - 1]) put(world, wx, baseY + 3, z, b.lantern);
  return { door: [Math.round(mid), z0 - 2], inside: { x0: x0 + 1, z0: z0 + 1, x1: x1 - 1, z1: z1 - 1 }, stalls };
}

export interface GlasshouseBlocks {
  frame: number;
  glass: number;
  floor: number;
  bench: number;
  plinth: number;
}

/**
 * A glasshouse `w` (x) by `d` (z) on `baseY` (d-05): a stone plinth, timber posts every three blocks and a beam
 * round the top, glass between, a glass gable roof with timber rafters and ridge running front to back, a door
 * three wide and three high on -z, a paved floor (through the doorway too), plank benches along both long walls and across the back. Returns the bench
 * tops (for pots) and the cells under the ridge (for hanging lanterns).
 */
export function placeGlasshouse(world: WorldWriter, x0: number, z0: number, w: number, d: number, baseY: number, b: GlasshouseBlocks, wallHeight = 4): { benches: Array<[number, number, number]>; ridge: Array<[number, number, number]>; door: [number, number] } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const mid = Math.floor((x0 + x1) / 2);
  const top = baseY + wallHeight;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      put(world, x, baseY - 1, z, b.floor);
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      for (let y = baseY; y < top; y++) {
        const door = z === z0 && Math.abs(x - mid) <= 1 && y < baseY + 3;
        if (door) continue;
        const post = (edgeZ && (x - x0) % 3 === 0) || (edgeX && (z - z0) % 3 === 0) || (edgeX && edgeZ);
        put(world, x, y, z, y === baseY ? b.plinth : post || y === top - 1 ? b.frame : b.glass);
      }
    }
  }
  // The gable roof: glass, a rafter of timber every third row and along the ridge.
  const halfW = (w - 1) / 2;
  for (let x = x0; x <= x1; x++) {
    const step = Math.round((halfW - Math.abs(x - (x0 + x1) / 2)) * 0.8);
    for (let z = z0; z <= z1; z++) {
      const y = top + step;
      const rafter = (z - z0) % 3 === 0 || z === z1 || Math.abs(x - (x0 + x1) / 2) < 1;
      put(world, x, y, z, rafter ? b.frame : b.glass);
      if (z === z0 || z === z1) for (let yy = top; yy < y; yy++) put(world, x, yy, z, b.glass);
    }
  }
  // Benches: along both long walls and across the back, a plank top on legs.
  const benches: Array<[number, number, number]> = [];
  for (let z = z0 + 2; z <= z1 - 2; z++) {
    for (const x of [x0 + 1, x1 - 1]) {
      put(world, x, baseY, z, b.bench);
      if (z % 2 === 0) benches.push([x + 0.5, baseY + 1, z + 0.5]);
    }
  }
  for (let x = x0 + 3; x <= x1 - 3; x++) {
    put(world, x, baseY, z1 - 1, b.bench);
    if (x % 2 === 0) benches.push([x + 0.5, baseY + 1, z1 - 0.5]);
  }
  const ridge: Array<[number, number, number]> = [];
  const ridgeY = top + Math.round(halfW * 0.8);
  for (let z = z0 + 3; z < z1; z += 4) ridge.push([(x0 + x1) / 2 + 0.5, ridgeY - 1, z + 0.5]);
  return { benches, ridge, door: [mid, z0 - 2] };
}

export interface StorehouseBlocks {
  wall: number;
  beam: number;
  roof: number;
  plinth: number;
  floor: number;
  shelf: number;
  brick: number;
  lantern: number;
  glass: number;
}

/**
 * The storehouse and its kitchen (d-08) `w` by `d` on `baseY`: a stone foot, plank walls framed in timber
 * posts and beam, windows, a red gable roof (ridge along x), a door three wide and three high on -z, a plank
 * floor (through the doorway too), a plank ceiling with the loft over it filled; inside, plank shelves along the back wall, a brick oven with an arched mouth in the east corner,
 * lanterns on the walls. Returns the shelf spots (for jar shelves), the oven mouth (for its fire), the open
 * floor (for tables and sacks) and the cell before the door.
 */
export function placeStorehouse(world: WorldWriter, x0: number, z0: number, w: number, d: number, baseY: number, b: StorehouseBlocks, wallHeight = 5): { shelves: Array<[number, number, number]>; fire: [number, number, number]; floor: { x0: number; z0: number; x1: number; z1: number }; door: [number, number] } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const mid = Math.floor((x0 + x1) / 2);
  const top = baseY + wallHeight;
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      put(world, x, baseY - 1, z, b.floor);
      const edgeX = x === x0 || x === x1;
      const edgeZ = z === z0 || z === z1;
      if (!edgeX && !edgeZ) continue;
      for (let y = baseY; y < top; y++) {
        const door = z === z0 && Math.abs(x - mid) <= 1 && y < baseY + 3;
        if (door) continue;
        const i = edgeZ ? x - x0 : z - z0;
        const post = i % 4 === 0 || (edgeX && edgeZ);
        const window = !post && y === baseY + 2 && i % 4 === 2 && !(z === z0 && Math.abs(x - mid) < 3);
        put(world, x, y, z, y === baseY ? b.plinth : window ? b.glass : post || y === top - 1 ? b.beam : b.wall);
      }
    }
  }
  for (const x of [mid - 2, mid + 2]) put(world, x, baseY + 2, z0 - 1, b.lantern);
  // Gable roof along x, eaves one block out, gable ends of wall.
  const halfD = Math.ceil((d + 2) / 2);
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const step = Math.min(z - (z0 - 1), z1 + 1 - z);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, top + step, z, b.roof);
      if ((x === x0 || x === x1) && step > 0 && step < halfD) for (let y = top; y < top + step; y++) put(world, x, y, z, b.beam);
    }
  }
  // Inside: the oven against the back wall, east of the shelves: a block of bricks five wide with an arched
  // mouth three wide toward the door, a hearth before it and a chimney through the roof.
  const ox = x1 - 7;
  const oz = z1 - 3;
  for (let dx = 0; dx <= 4; dx++) {
    for (let dz = 0; dz <= 2; dz++) {
      for (let y = baseY; y <= baseY + 4; y++) {
        const arch = dx >= 1 && dx <= 3 && dz <= 1 && y >= baseY + 1 && (y <= baseY + 2 || (dx === 2 && y === baseY + 3));
        put(world, ox + dx, y, oz + dz, arch ? 0 : b.brick);
      }
    }
  }
  for (let dx = 1; dx <= 3; dx++) put(world, ox + dx, baseY - 1, oz - 1, b.brick);
  // The embers glow at the back of the mouth.
  for (let dx = 1; dx <= 3; dx++) for (let y = baseY + 1; y <= baseY + 2; y++) put(world, ox + dx, y, oz + 2, b.lantern);
  for (let y = baseY + 5; y <= top + halfD + 1; y++) for (const dx of [1, 2, 3]) put(world, ox + dx, y, oz + 2, b.brick);
  // A plank ceiling with a timber beam across it every third block, the loft over it filled up to the roof so
  // no sealed hollow is left under it.
  for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) if (world.get(x, top, z) === 0) put(world, x, top, z, (x - x0) % 3 === 2 ? b.beam : b.shelf);
  for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) for (let y = top + 1; world.get(x, y, z) === 0 && y <= top + halfD; y++) put(world, x, y, z, b.shelf);
  // Shelves along the back wall (a plank ledge at the foot of each), lanterns on the walls.
  const shelves: Array<[number, number, number]> = [];
  for (let x = x0 + 2; x <= ox - 2; x += 3) shelves.push([x + 0.5, baseY, z1 - 0.6]);
  for (const [lx, lz] of [[x0 + 1, z0 + 3], [x1 - 1, z0 + 3], [x0 + 1, z1 - 3]] as const) put(world, lx, baseY + 3, lz, b.lantern);
  return { shelves, fire: [ox + 2.5, baseY + 1, oz + 0.9], floor: { x0: x0 + 2, z0: z0 + 2, x1: x1 - 2, z1: z1 - 3 }, door: [mid, z0 - 2] };
}

/**
 * The bread oven of the mill yard (d-13): a little house of stone bricks under a red tile roof, its arched
 * oven mouth on -z with a stone hearth under it. Returns the mouth (for its fire).
 */
export function placeBreadOven(world: WorldWriter, x0: number, z0: number, baseY: number, b: { brick: number; roof: number; hearth: number }): { fire: [number, number, number] } {
  const [w, d] = [5, 5];
  for (let x = x0; x < x0 + w; x++) {
    for (let z = z0; z < z0 + d; z++) {
      for (let y = baseY; y < baseY + 4; y++) {
        const mouth = z === z0 && x === x0 + 2 && y >= baseY + 1 && y <= baseY + 2;
        const hollow = x === x0 + 2 && z === z0 + 1 && y >= baseY + 1 && y <= baseY + 2;
        put(world, x, y, z, mouth || hollow ? 0 : b.brick);
      }
    }
  }
  put(world, x0 + 2, baseY, z0 - 1, b.hearth);
  for (let z = z0 - 1; z <= z0 + d; z++) {
    const step = Math.min(z - (z0 - 1), z0 + d - z);
    for (let x = x0 - 1; x <= x0 + w; x++) put(world, x, baseY + 4 + step, z, b.roof);
    for (const x of [x0, x0 + w - 1]) for (let y = baseY + 4; y < baseY + 4 + step; y++) put(world, x, y, z, b.brick);
  }
  for (let y = baseY + 4; y <= baseY + 8; y++) put(world, x0 + 3, y, z0 + 3, b.brick);
  return { fire: [x0 + 2.5, baseY + 1, z0 + 1.5] };
}

/**
 * The farm gate over a way running along z (d-02), centred on (cx, z): two stone feet three high, timber
 * posts on them to `height`, a plank beam with a log over it, braces at both corners, a wooden door folded back
 * inside the left post. Returns where the cat sign sits (on the beam, in the middle), the lanterns hanging on
 * the posts' fronts and the ground cell for the farm's name board, right of the gate on the -z side.
 */
export function placeFarmGate(world: WorldWriter, cx: number, z: number, baseY: number, b: { stone: number; post: number; beam: number; door: number; lantern: number }, span = 9, height = 8): { sign: [number, number, number]; lamps: Array<[number, number, number]>; board: [number, number] } {
  const half = Math.floor(span / 2);
  for (const side of [-1, 1]) {
    const px = cx + side * (half + 1);
    for (const dx of [0, side]) {
      for (const dz of [0, 1]) {
        for (let y = baseY; y < baseY + height; y++) put(world, px + dx, y, z + dz, y < baseY + 3 ? b.stone : b.post);
      }
    }
    // A brace from the post up to the beam.
    put(world, px - side, baseY + height - 2, z, b.post);
    put(world, px - side * 2, baseY + height - 1, z, b.post);
    // A lantern hung on the post's front.
    put(world, px, baseY + height - 3, z - 1, b.lantern);
  }
  for (let x = cx - half - 3; x <= cx + half + 3; x++) {
    for (const dz of [0, 1]) {
      put(world, x, baseY + height, z + dz, b.beam);
      put(world, x, baseY + height + 1, z + dz, b.post);
    }
  }
  // The left door, folded back inside the gate along the way.
  const dx = cx - half;
  for (let dz = 2; dz <= 5; dz++) for (let y = baseY; y < baseY + 5; y++) put(world, dx, y, z + dz, dz === 2 || dz === 5 || y === baseY || y === baseY + 4 || y - baseY === dz - 1 ? b.post : b.door);
  return {
    sign: [cx + 0.5, baseY + height + 2, z + 1],
    lamps: [
      [cx - half - 1 + 0.5, baseY + height - 3, z - 1 + 0.5],
      [cx + half + 1 + 0.5, baseY + height - 3, z - 1 + 0.5],
    ],
    board: [cx + half + 5, z - 3],
  };
}

/** A round silo of `wall` banded with `band`, under a dome of `roof`: solid, no sealed hollow inside it. */
export function placeSilo(world: WorldWriter, cx: number, cz: number, baseY: number, b: { wall: number; band: number; roof: number }, height = 12): void {
  for (let y = 0; y < height; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= 3.2) put(world, cx + dx, baseY + y, cz + dz, y % 4 === 3 && d > 2.1 ? b.band : b.wall);
      }
    }
  }
  for (let k = 0; k < 3; k++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= 3.2 - k * 1.1) put(world, cx + dx, baseY + height + k, cz + dz, b.roof);
}

/**
 * Opens a round tower's doorway (the windmill's, countryside.ts) to three wide and three high, so the child walks
 * in without a squeeze: clears the columns either side of its -z axis from its centre out to `radius` + 1, the
 * bottom three rows from `baseY`.
 */
export function widenRoundDoor(world: WorldWriter, cx: number, cz: number, baseY: number, radius: number): void {
  for (let y = baseY; y < baseY + 3; y++) for (let dx = -1; dx <= 1; dx++) for (let dz = -radius - 1; dz < 0; dz++) put(world, cx + dx, y, cz + dz, 0);
}

/**
 * A round fruit tree of blocks (d-06): a short trunk, a wide round crown. Returns cells on the crown's surface
 * (for its apples or oranges), every `every`-th.
 */
export function placeFruitTree(world: WorldWriter, x: number, z: number, baseY: number, b: { log: number; leaves: number }, trunk = 4, radius = 3, every = 5): Array<[number, number, number]> {
  for (let y = baseY; y < baseY + trunk + 1; y++) put(world, x, y, z, b.log);
  const cy = baseY + trunk + radius - 1;
  const fruit: Array<[number, number, number]> = [];
  let n = 0;
  const r = radius + 0.4;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius + 1; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const dist = Math.hypot(dx, dy * 1.15, dz);
        if (dist > r) continue;
        put(world, x + dx, cy + dy, z + dz, b.leaves, true);
        // Fruit hangs on the outside of the crown's lower half, facing out.
        if (dist > r - 1 && dy <= 0 && dy > -radius + 1 && (Math.abs(dx) === radius || Math.abs(dz) === radius) && n++ % every === 0) {
          fruit.push([x + dx + 0.5 + Math.sign(dx) * 0.55, cy + dy - 0.1, z + dz + 0.5 + Math.sign(dz) * 0.55]);
        }
      }
    }
  }
  return fruit;
}

/**
 * The great shade tree of the rest area (d-11): a thick trunk with root flares and a low, wide crown that
 * roofs the tables under it. Returns the crown's underside height (lanterns hang just below it).
 */
export function placeShadeTree(world: WorldWriter, cx: number, cz: number, baseY: number, b: { core: number; log: number; leaves: number }, rng: () => number): { under: number } {
  const trunk = 7;
  for (let y = baseY - 1; y < baseY + trunk; y++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(world, cx + dx, y, cz + dz, b.core);
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [-2, -1], [1, -2], [-1, 2]] as const) {
    for (let y = baseY; y < baseY + 1 + Math.floor(rng() * 2); y++) put(world, cx + dx, y, cz + dz, b.log);
  }
  // Four boughs out from the top of the trunk into the crown.
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) for (let i = 2; i <= 6; i++) put(world, cx + dx * i, baseY + trunk - 1 + Math.floor(i / 3), cz + dz * i, b.log);
  const cy = baseY + trunk + 3;
  const [rx, ry] = [10, 3.6];
  for (let dx = -11; dx <= 11; dx++) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dz = -11; dz <= 11; dz++) {
        if ((dx / rx) ** 2 + (dy / ry) ** 2 + (dz / rx) ** 2 <= 1 - rng() * 0.15) put(world, cx + dx, cy + dy, cz + dz, b.leaves, true);
      }
    }
  }
  return { under: cy - Math.ceil(ry) };
}

/**
 * A tall waterfall (d-01, d-06, d-14): a block of rock rising to `top` at the foot of the cliffs, `x` its middle
 * and `face` the row its front stands on (the fall looks toward -z), and a sheet of water five wide down its
 * front and on down the slope to the brook below. `surface` is the ground's top. Returns the lip.
 */
export function placeTallFall(world: WorldWriter, x: number, face: number, top: number, surface: (x: number, z: number) => number, b: { rock: number; moss: number; cap: number; water: number }): { lip: [number, number, number] } {
  // The rock: wider at the foot, a shoulder either side of the fall, green on top.
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = 0; dz <= 10; dz++) {
      const h = Math.round(top - Math.abs(dx) * 0.7 - dz * 0.15 + (Math.abs(dx) <= 2 ? 1 : 0));
      const [cx, cz] = [x + dx, face + dz];
      for (let y = surface(cx, cz) + 1; y <= h; y++) put(world, cx, y, cz, y >= h - 1 ? b.cap : (cx * 3 + y + cz) % 5 === 0 ? b.moss : b.rock);
    }
  }
  // The sheet: five wide and two blocks thick down the face, from the lip to the ground.
  for (let dx = -2; dx <= 2; dx++) {
    for (const dz of [-1, 0]) {
      const [cx, cz] = [x + dx, face + dz];
      for (let y = surface(cx, cz) + 1; y <= top; y++) put(world, cx, y, cz, b.water);
    }
    // Down the slope in front to where the ground levels off.
    for (let dz = -2; dz >= -12; dz--) {
      const cz = face + dz;
      const s = surface(x + dx, cz);
      if (s <= surface(x + dx, cz - 1)) break;
      put(world, x + dx, s + 1, cz, b.water);
    }
  }
  return { lip: [x + 0.5, top, face + 0.5] };
}

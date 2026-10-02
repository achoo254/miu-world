// Block buildings for the world overview's islands: a house with a gable roof (school, library, the
// child's house), a small castle with corner towers, and a snowy mountain. The camera looks from the
// -x/-z corner, so doors and windows face -z.
import { put, type WorldWriter } from './world-writer';

export interface HouseBlocks {
  wall: number;
  roof: number;
  /** Corner posts. */
  trim: number;
  /**
   * The finish of the owner's village frames (designs/lang-ven-song/d-03, d-10): any part given is built,
   * any left out is not. `plinth`: a course of stone along the foot of the walls; `beam`: a timber beam round
   * the top of the walls and a post every four blocks; `glass`: glazed windows (else open holes); `sill`: a
   * sill jutting under each window, a flower box; `ridge`: the roof's ridge row; `gable`: the gable ends'
   * infill (timber over a plain wall); `chimney`: a chimney stack through the back slope; `lantern`: a lantern
 * on the wall either side of the door.
   */
  plinth?: number;
  beam?: number;
  glass?: number;
  sill?: number;
  ridge?: number;
  gable?: number;
  chimney?: number;
  /** A lantern on the wall either side of the door (it glows at dusk). */
  lantern?: number;
  /** The floor inside, one block under `baseY` (planks, tiles): a room never stands on grass. */
  floor?: number;
}

/** Where a house's dressing goes: the cell before its door, a lamp each side of it, the top of every flower box. */
export interface HouseFront {
  roofTop: number;
  door: [number, number];
  lamps: Array<[number, number]>;
  boxes: Array<[number, number, number]>;
}

/** Box of `w` x `d` from (x0, z0) with walls `wallHeight` high on `baseY`, a door and windows on the -z side. */
export function placeHouse(world: WorldWriter, x0: number, z0: number, w: number, d: number, wallHeight: number, baseY: number, blocks: HouseBlocks): HouseFront {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const doorX = x0 + Math.floor(w / 2);
  const detailed = blocks.beam !== undefined;
  const topY = baseY + wallHeight - 1;
  // Windows: one row in the middle of the wall (two rows on tall walls); a detailed house keeps its beam row
  // and its plinth whole, and its posts stand every four blocks with the windows between them.
  const windowRow = (y: number): boolean => (detailed ? y > baseY && y < topY && y <= baseY + 2 : y === baseY + 2);
  const windowAt = (i: number, length: number): boolean => (detailed ? i % 4 === 2 && i < length - 1 : i % 3 === 1);
  const postAt = (i: number, length: number): boolean => detailed && (i % 4 === 0 || i === length - 1);
  const boxes: Array<[number, number, number]> = [];
  if (blocks.floor !== undefined) for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) put(world, x, baseY - 1, z, blocks.floor);
  for (let y = baseY; y < baseY + wallHeight; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const [i, length] = edgeZ ? [x - x0, w] : [z - z0, d];
        const nearDoor = z === z0 && x >= doorX - 2 && x <= doorX + 1;
        const door = z === z0 && (x === doorX || x === doorX - 1) && y < baseY + 2;
        if (door) continue;
        const window = !corner && windowRow(y) && windowAt(i, length) && !nearDoor;
        if (window) {
          if (blocks.glass !== undefined) put(world, x, y, z, blocks.glass);
          if (blocks.sill !== undefined && y === baseY + 1 + (detailed ? 0 : 1) && z === z0) {
            put(world, x, y - 1, z - 1, blocks.sill);
            boxes.push([x + 0.5, y, z - 0.5]);
          }
          continue;
        }
        let id = corner ? blocks.trim : blocks.wall;
        if (detailed && (postAt(i, length) || y === topY)) id = blocks.beam ?? id;
        if (y === baseY && blocks.plinth !== undefined) id = blocks.plinth;
        put(world, x, y, z, id);
      }
    }
  }
  if (blocks.lantern !== undefined && wallHeight > 3) for (const x of [doorX - 2, doorX + 1]) put(world, x, baseY + 2, z0 - 1, blocks.lantern);
  // A lintel over the door on a detailed house.
  if (detailed && wallHeight > 3) for (const x of [doorX - 1, doorX]) put(world, x, baseY + 2, z0, blocks.beam ?? blocks.trim);
  // Gable roof along x: each row one step higher towards the middle of the depth, eaves overhang by one.
  const half = Math.ceil((d + 2) / 2);
  let roofTop = baseY + wallHeight;
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const step = Math.min(z - (z0 - 1), z1 + 1 - z);
    const y = baseY + wallHeight + step;
    roofTop = Math.max(roofTop, y);
    const ridge = step === half - 1;
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, y, z, ridge && blocks.ridge !== undefined ? blocks.ridge : blocks.roof);
      // Gable ends: fill the triangle under the roof with wall (timber on a detailed house).
      if ((x === x0 || x === x1) && step > 0 && step < half) for (let fy = baseY + wallHeight; fy < y; fy++) put(world, x, fy, z, blocks.gable ?? blocks.wall);
    }
  }
  // A chimney through the back slope, near the east gable, two blocks over the roof.
  if (blocks.chimney !== undefined && w >= 6) {
    const [cx, cz] = [x1 - 2, z1 - 1];
    const slope = baseY + wallHeight + Math.min(cz - (z0 - 1), z1 + 1 - cz);
    for (let y = baseY + wallHeight; y <= Math.max(slope + 2, roofTop + 1); y++) put(world, cx, y, cz, blocks.chimney);
  }
  return { roofTop, door: [doorX, z0 - 1], lamps: [[doorX - 2, z0 - 1], [doorX + 1, z0 - 1]], boxes };
}

export interface CastleBlocks {
  wall: number;
  roof: number;
  trim: number;
}

function battlements(world: WorldWriter, x0: number, z0: number, x1: number, z1: number, y: number, id: number): void {
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      const onEdge = x === x0 || x === x1 || z === z0 || z === z1;
      if (onEdge && (x + z) % 2 === 0) put(world, x, y, z, id);
    }
  }
}

function pyramidRoof(world: WorldWriter, x0: number, z0: number, x1: number, z1: number, y: number, id: number): number {
  let top = y;
  for (let k = 0; x0 + k <= x1 - k && z0 + k <= z1 - k; k++) {
    for (let x = x0 + k; x <= x1 - k; x++) for (let z = z0 + k; z <= z1 - k; z++) put(world, x, y + k, z, id);
    top = y + k;
  }
  return top;
}

function solidBox(world: WorldWriter, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, id: number): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) put(world, x, y, z, id);
}

/** Curtain walls round (cx, cz), four round-roofed corner towers and a tall keep; the gate faces -z. */
export function placeCastle(world: WorldWriter, cx: number, cz: number, half: number, baseY: number, blocks: CastleBlocks): { keepTop: number } {
  const [x0, x1, z0, z1] = [cx - half, cx + half, cz - half, cz + half];
  const wallTop = baseY + 5;
  for (let y = baseY; y <= wallTop; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
        const gate = z === z0 && Math.abs(x - cx) <= 1 && y < baseY + 4;
        if (!gate) put(world, x, y, z, blocks.wall);
      }
    }
  }
  battlements(world, x0, z0, x1, z1, wallTop + 1, blocks.wall);
  for (const [tx, tz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) {
    solidBox(world, tx - 1, tz - 1, tx + 1, tz + 1, baseY, wallTop + 4, blocks.wall);
    pyramidRoof(world, tx - 2, tz - 2, tx + 2, tz + 2, wallTop + 5, blocks.roof);
  }
  const k = Math.max(2, Math.floor(half / 2));
  solidBox(world, cx - k, cz - k + 1, cx + k, cz + k + 1, baseY, wallTop + 7, blocks.wall);
  for (let x = cx - k; x <= cx + k; x += 2) put(world, x, wallTop + 3, cz - k + 1, blocks.trim); // windows band
  const keepTop = pyramidRoof(world, cx - k - 1, cz - k, cx + k + 1, cz + k + 2, wallTop + 8, blocks.roof);
  return { keepTop };
}

export interface MountainBlocks {
  stone: number;
  snow: number;
}

/** A rough cone of stone from `baseY` up to `peakY`, all snow above `snowLine` and snow-capped just below it. */
export function placeMountain(world: WorldWriter, cx: number, cz: number, radius: number, baseY: number, peakY: number, snowLine: number, blocks: MountainBlocks, rng: () => number): void {
  for (let x = cx - radius; x <= cx + radius; x++) {
    for (let z = cz - radius; z <= cz + radius; z++) {
      const t = Math.hypot(x - cx, z - cz) / radius;
      if (t > 1) continue;
      const h = Math.round(baseY + (peakY - baseY) * (1 - t) ** 1.3 + (rng() - 0.5) * 2);
      if (h <= baseY) continue;
      for (let y = baseY + 1; y <= h; y++) put(world, x, y, z, y >= snowLine || (y === h && h >= snowLine - 3) ? blocks.snow : blocks.stone);
    }
  }
}

export interface SkyBridgeBlocks {
  planks: number;
  log: number;
}

/** A plank walkway between two points in the air (2 wide), sloping evenly, with posts and rails. */
export function placeSkyBridge(world: WorldWriter, from: readonly [number, number, number], to: readonly [number, number, number], blocks: SkyBridgeBlocks, skip: (x: number, z: number) => boolean): void {
  const [ax, ay, az] = from;
  const [bx, by, bz] = to;
  const length = Math.hypot(bx - ax, bz - az);
  const steps = Math.ceil(length * 2);
  const nx = -(bz - az) / length;
  const nz = (bx - ax) / length;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = ax + (bx - ax) * t;
    const pz = az + (bz - az) * t;
    const y = Math.round(ay + (by - ay) * t);
    for (const off of [-0.5, 0.5]) {
      const x = Math.round(px + nx * off);
      const z = Math.round(pz + nz * off);
      if (!skip(x, z)) put(world, x, y, z, blocks.planks);
    }
    const rail = s % 4 === 0 ? blocks.log : blocks.planks;
    for (const off of [-1.6, 1.6]) {
      const x = Math.round(px + nx * off);
      const z = Math.round(pz + nz * off);
      if (skip(x, z)) continue;
      put(world, x, y, z, blocks.log, true);
      put(world, x, y + 1, z, rail, true);
    }
  }
}

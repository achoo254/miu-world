// Block buildings for the world overview's islands: a house with a gable roof (school, library, the
// child's house), a small castle with corner towers, and a snowy mountain. The camera looks from the
// -x/-z corner, so doors and windows face -z.
import { put, type WorldWriter } from './world-writer';

export interface HouseBlocks {
  wall: number;
  roof: number;
  /** Corner posts. */
  trim: number;
}

/** Box of `w` x `d` from (x0, z0) with walls `wallHeight` high on `baseY`, a door and windows on the -z side. */
export function placeHouse(world: WorldWriter, x0: number, z0: number, w: number, d: number, wallHeight: number, baseY: number, blocks: HouseBlocks): { roofTop: number } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const doorX = x0 + Math.floor(w / 2);
  for (let y = baseY; y < baseY + wallHeight; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const door = z === z0 && (x === doorX || x === doorX - 1) && y < baseY + 2;
        const window = !corner && y === baseY + 2 && (edgeZ ? (x - x0) % 3 === 1 : (z - z0) % 3 === 1) && x !== doorX && x !== doorX - 1;
        if (door || window) continue;
        put(world, x, y, z, corner ? blocks.trim : blocks.wall);
      }
    }
  }
  // Gable roof along x: each row one step higher towards the middle of the depth, eaves overhang by one.
  const half = Math.ceil((d + 2) / 2);
  let roofTop = baseY + wallHeight;
  for (let z = z0 - 1; z <= z1 + 1; z++) {
    const step = Math.min(z - (z0 - 1), z1 + 1 - z);
    const y = baseY + wallHeight + step;
    roofTop = Math.max(roofTop, y);
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      put(world, x, y, z, blocks.roof);
      // Gable ends: fill the triangle under the roof with wall.
      if ((x === x0 || x === x1) && step > 0 && step < half) for (let fy = baseY + wallHeight; fy < y; fy++) put(world, x, fy, z, blocks.wall);
    }
  }
  return { roofTop };
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

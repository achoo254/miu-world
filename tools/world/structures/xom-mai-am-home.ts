// Block structures of Xóm Mái Ấm after the home frames of the village's detail mock (designs/lang-ven-song/d-03,
// d-04, d-05, d-13, d-14, 02/10/2026): the family home of cream stone under a red tiled roof whose rooms are
// lined with planks, beamed and floored for the furniture of d-13; the red barn with its white trim, X doors,
// loft window and gambrel roof, its stalls inside along a cobbled aisle (d-04, d-14); the stone well under a
// little timber roof with its roller (d-05). Each writes blocks only, its front toward -z, and returns where
// its furniture, its lamps or its people go; the map file decides where they stand.
import { placeHouse, type HouseBlocks, type HouseFront } from './buildings';
import { put, type WorldWriter } from './world-writer';

/** The open floor inside a building (inclusive), and the height its floor stands at (the first free row). */
export interface Room {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floorY: number;
}

/**
 * The family home of d-03 and d-13: a detailed house (`blocks`, buildings.ts) `w` x `d` with walls five rows
 * high on `baseY`, its floor of `floor` one row below, its walls lined inside with planks and posts, two log
 * beams across the room under the eaves, a dormer over the door. Returns the house's front and the room inside the lining.
 */
export function placeFamilyHome(
  world: WorldWriter,
  x0: number,
  z0: number,
  w: number,
  d: number,
  baseY: number,
  blocks: HouseBlocks & { floor: number; lining: number; post: number; glass: number },
): HouseFront & { room: Room } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const wallHeight = 5;
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      put(world, x, baseY - 1, z, blocks.floor);
      for (let y = baseY; y < baseY + wallHeight + 4; y++) put(world, x, y, z, 0);
    }
  }
  const front = placeHouse(world, x0, z0, w, d, wallHeight, baseY, blocks);
  lineInside(world, x0, z0, x1, z1, baseY, wallHeight, blocks);
  // A dormer over the door (d-03): a glazed face set into the front slope, its cheeks, a little gable roof.
  const doorX = x0 + Math.floor(w / 2);
  const eaves = baseY + wallHeight;
  const [dx0, dx1] = [doorX - 2, doorX + 1];
  for (let x = dx0; x <= dx1; x++) {
    for (let y = eaves + 2; y <= eaves + 4; y++) {
      const pane = (x === doorX - 1 || x === doorX) && y <= eaves + 3;
      put(world, x, y, z0 + 1, pane ? blocks.glass : x === dx0 || x === dx1 ? blocks.beam ?? blocks.trim : blocks.wall);
    }
    put(world, x, eaves + 1, z0 + 1, blocks.sill ?? blocks.trim);
  }
  for (const x of [dx0, dx1]) put(world, x, eaves + 4, z0 + 2, blocks.wall);
  for (let z = z0; z <= z0 + 4; z++) {
    for (let x = dx0 - 1; x <= dx1 + 1; x++) {
      const edge = x === dx0 - 1 || x === dx1 + 1;
      put(world, x, edge ? eaves + 5 : eaves + 6, z, blocks.roof);
    }
    for (const x of [doorX - 1, doorX]) put(world, x, eaves + 7, z, blocks.ridge ?? blocks.roof);
    for (const x of [dx0, dx1]) put(world, x, eaves + 5, z, z === z0 ? blocks.gable ?? blocks.wall : blocks.roof);
  }
  for (const x of [doorX - 1, doorX]) put(world, x, eaves + 5, z0, blocks.gable ?? blocks.wall);
  for (const z of [z0 + Math.round(d / 3), z0 + Math.round((2 * d) / 3)]) for (let x = x0 + 1; x < x1; x++) put(world, x, baseY + wallHeight, z, blocks.post);
  return { ...front, room: { x0: x0 + 2, z0: z0 + 2, x1: x1 - 2, z1: z1 - 2, floorY: baseY } };
}

/**
 * Lines the walls of a box (x0..x1, z0..z1 its outer walls) from inside, from `baseY` up `height` rows: planks
 * with a post at the corners, every four blocks and along the top, glass where the wall has a window and nothing
 * where it has a doorway, so a room reads as timber inside whatever its walls are outside.
 */
function lineInside(world: WorldWriter, x0: number, z0: number, x1: number, z1: number, baseY: number, height: number, b: { lining: number; post: number; glass: number }): void {
  for (let y = baseY; y < baseY + height; y++) {
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      for (let z = z0 + 1; z <= z1 - 1; z++) {
        const onX = x === x0 + 1 || x === x1 - 1;
        const onZ = z === z0 + 1 || z === z1 - 1;
        if (!onX && !onZ) continue;
        const corner = onX && onZ;
        const outs: Array<[number, number]> = [];
        if (onZ) outs.push([x, z === z0 + 1 ? z0 : z1]);
        if (onX) outs.push([x === x0 + 1 ? x0 : x1, z]);
        const outer = outs.map(([ox, oz]) => world.get(ox, y, oz));
        if (outer.some((id) => id === 0)) continue;
        if (!corner && outer[0] === b.glass) {
          put(world, x, y, z, b.glass);
          continue;
        }
        const i = onZ ? x - x0 : z - z0;
        put(world, x, y, z, corner || i % 4 === 0 || y === baseY + height - 1 ? b.post : b.lining);
      }
    }
  }
}

export interface BarnBlocks {
  wall: number;
  trim: number;
  roof: number;
  glass: number;
  floor: number;
  aisle: number;
  lining: number;
  post: number;
  lantern: number;
}

/**
 * The red barn of d-04 and d-14, `w` wide (odd) and `d` deep on `baseY`, walls six rows high: white corners,
 * a white-framed doorway five wide in the middle of its front with a white X door leaf either side, a loft
 * window with a white X in the gable, glazed windows down both sides, a gambrel roof whose ridge runs front to
 * back with a white trim along the gables' edge. Inside: planks lining the walls, a cobbled aisle down the
 * middle, plank-floored stalls either side, a post with a lantern on it at each stall's corner on the aisle,
 * log beams across under the eaves. Returns the cell before its door, the room inside, the stalls' middles
 * (x, z, side) and where their partitions run (the map fences them), and the beams' rows.
 */
export function placeRedBarn(
  world: WorldWriter,
  x0: number,
  z0: number,
  w: number,
  d: number,
  baseY: number,
  b: BarnBlocks,
): { door: [number, number]; room: Room; stalls: Array<{ x: number; z: number; side: -1 | 1 }>; partitions: Array<{ x0: number; x1: number; z: number }>; beams: number[] } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const mid = x0 + (w - 1) / 2;
  const H = 6;
  // Floor and the air inside.
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      put(world, x, baseY - 1, z, Math.abs(x - mid) <= 1 ? b.aisle : b.floor);
      for (let y = baseY; y < baseY + H + 12; y++) put(world, x, y, z, 0);
    }
  }
  // Walls: red boards, white corners, windows down the sides.
  for (let y = baseY; y < baseY + H; y++) {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const edgeX = x === x0 || x === x1;
        const edgeZ = z === z0 || z === z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const sideWindow = edgeX && !edgeZ && (z - z0) % 4 === 2 && z < z1 - 1 && (y === baseY + 2 || y === baseY + 3);
        put(world, x, y, z, corner ? b.trim : sideWindow ? b.glass : b.wall);
      }
    }
  }
  // The doorway, its white frame, and a white X door leaf folded back either side.
  for (let x = mid - 2; x <= mid + 2; x++) for (let y = baseY; y <= baseY + 3; y++) put(world, x, y, z0, 0);
  for (const x of [mid - 3, mid + 3]) for (let y = baseY; y <= baseY + 4; y++) put(world, x, y, z0, b.trim);
  for (let x = mid - 3; x <= mid + 3; x++) put(world, x, baseY + 4, z0, b.trim);
  const leaf = (lx0: number, lw: number): void => {
    const lh = 5;
    for (let u = 0; u < lw; u++) {
      for (let v = 0; v < lh; v++) {
        const border = u === 0 || u === lw - 1 || v === 0 || v === lh - 1;
        const t = v / (lh - 1);
        const s = u / (lw - 1);
        const cross = Math.abs(s - t) < 0.2 || Math.abs(s - (1 - t)) < 0.2;
        put(world, lx0 + u, baseY + v, z0 - 1, border || cross ? b.trim : b.wall);
      }
    }
  };
  leaf(mid - 7, 4);
  leaf(mid + 4, 4);
  // Gambrel roof, its ridge along z: steep lower slopes, shallow upper ones.
  const half = (w + 1) / 2;
  const rise = (k: number): number => (k <= 3 ? 2 * k : 6 + Math.ceil((k - 3) * 0.67));
  const roofAt = new Map<number, number>();
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const k = Math.min(x - (x0 - 1), x1 + 1 - x, half);
    const y = baseY + H + rise(k);
    const from = k > 0 ? baseY + H + rise(k - 1) + 1 : y;
    roofAt.set(x, y);
    for (let z = z0 - 1; z <= z1 + 1; z++) for (let yy = from; yy <= y; yy++) put(world, x, yy, z, b.roof);
  }
  // Gables: red boards under the roof, a white trim along its edge, the loft window with its X.
  for (const z of [z0, z1]) {
    for (let x = x0; x <= x1; x++) {
      const top = (roofAt.get(x) ?? baseY + H) - 1;
      for (let y = baseY + H; y <= top; y++) put(world, x, y, z, y >= top - 1 && Math.abs(x - mid) > 0 ? b.trim : b.wall);
    }
  }
  for (const z of [z0, z1]) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = 0; dy <= 4; dy++) {
        const y = baseY + H - 1 + dy;
        const border = Math.abs(dx) === 2 || dy === 0 || dy === 4;
        const cross = Math.abs(dx) === Math.abs(dy - 2);
        put(world, mid + dx, y, z, border || cross ? b.trim : b.glass);
      }
    }
  }
  // Inside: lining, beams, stalls either side of the aisle.
  lineInside(world, x0, z0, x1, z1, baseY, H, { lining: b.lining, post: b.post, glass: b.glass });
  const beams: number[] = [];
  for (let z = z0 + 4; z < z1 - 1; z += 5) {
    beams.push(z);
    for (let x = x0 + 1; x < x1; x++) put(world, x, baseY + H, z, b.post);
  }
  const stalls: Array<{ x: number; z: number; side: -1 | 1 }> = [];
  const partitions: Array<{ x0: number; x1: number; z: number }> = [];
  for (const side of [-1, 1] as const) {
    const inner = mid + side * 2;
    const outer = side < 0 ? x0 + 2 : x1 - 2;
    const [sx0, sx1] = [Math.min(inner, outer), Math.max(inner, outer)];
    for (let z = z0 + 4; z <= z1 - 5; z += 4) {
      for (let y = baseY; y <= baseY + 1; y++) put(world, inner, y, z, b.post);
      put(world, inner, baseY + 2, z, b.lantern);
      partitions.push({ x0: side < 0 ? sx0 : sx0 + 1, x1: side < 0 ? sx1 - 1 : sx1, z });
      stalls.push({ x: (sx0 + sx1) / 2, z: z + 2, side });
    }
  }
  return { door: [mid, z0 - 1], room: { x0: x0 + 2, z0: z0 + 2, x1: x1 - 2, z1: z1 - 2, floorY: baseY }, stalls, partitions, beams };
}

/**
 * The village well of d-05 on a paved ring (`ground` is the ground's top): a round stone kerb two rows high over
 * water, a log post either side, the roller across them and a little gable roof of planks over it all, its
 * ridge and its open gables edged with logs. Returns where the bucket hangs from the roller (its rope's top) and the kerb's top.
 */
export function placeRoofedWell(
  world: WorldWriter,
  cx: number,
  cz: number,
  ground: number,
  b: { kerb: number; cap: number; water: number; post: number; roof: number; ridge: number; paving: number; border: number },
): { rope: [number, number, number]; kerb: number } {
  for (let dx = -6; dx <= 6; dx++) {
    for (let dz = -6; dz <= 6; dz++) {
      const r = Math.hypot(dx, dz);
      if (r <= 5.6) put(world, cx + dx, ground, cz + dz, r > 4.7 ? b.border : b.paving);
    }
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const ring = Math.max(Math.abs(dx), Math.abs(dz)) === 2 && !(Math.abs(dx) === 2 && Math.abs(dz) === 2);
      if (ring) {
        put(world, cx + dx, ground + 1, cz + dz, b.kerb);
        put(world, cx + dx, ground + 2, cz + dz, b.cap);
      } else if (Math.max(Math.abs(dx), Math.abs(dz)) <= 1) {
        put(world, cx + dx, ground, cz + dz, b.water);
        put(world, cx + dx, ground - 1, cz + dz, b.water);
      }
    }
  }
  for (const dx of [-2, 2]) for (let y = ground + 3; y <= ground + 5; y++) put(world, cx + dx, y, cz, b.post);
  for (let dx = -2; dx <= 2; dx++) put(world, cx + dx, ground + 5, cz, b.post);
  // The roof: a gable along x over the roller, eaves overhanging the kerb.
  for (let dz = -3; dz <= 3; dz++) {
    const y = ground + 6 + (3 - Math.abs(dz));
    for (let dx = -3; dx <= 3; dx++) {
      put(world, cx + dx, y, cz + dz, dz === 0 || Math.abs(dx) === 3 ? b.ridge : b.roof);
    }
  }
  return { rope: [cx + 0.5, ground + 5, cz + 0.5], kerb: ground + 3 };
}

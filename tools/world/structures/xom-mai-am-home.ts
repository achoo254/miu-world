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

/** The family home's walls: seven rows, so the house stands some nine times the child's height under its roof. */
const HOME_WALLS = 7;

/**
 * The family home of d-03 and d-13: a detailed house (`blocks`, buildings.ts) `w` x `d` with walls seven rows
 * high on `baseY` and a doorway three wide, its floor of `floor` one row below, its walls lined inside with
 * planks and posts, two log beams across the room under the eaves, a dormer over the door. Returns the house's
 * front, the room inside the lining, the beams' rows and the walls' height.
 */
export function placeFamilyHome(
  world: WorldWriter,
  x0: number,
  z0: number,
  w: number,
  d: number,
  baseY: number,
  blocks: HouseBlocks & { floor: number; lining: number; post: number; glass: number },
): HouseFront & { room: Room; beams: number[]; wallHeight: number } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const wallHeight = HOME_WALLS;
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      put(world, x, baseY - 1, z, blocks.floor);
      for (let y = baseY; y < baseY + wallHeight + 4; y++) put(world, x, y, z, 0);
    }
  }
  const front = placeHouse(world, x0, z0, w, d, wallHeight, baseY, blocks);
  lineInside(world, x0, z0, x1, z1, baseY, wallHeight, blocks);
  // A dormer over the door (d-03), centred on the doorway: a glazed face set into the front slope, its cheeks,
  // a little gable roof peaking over the middle pane.
  const cx = front.doorway.x0 + Math.floor(front.doorway.width / 2);
  const eaves = baseY + wallHeight;
  for (let dx = -2; dx <= 2; dx++) {
    const cheek = Math.abs(dx) === 2;
    for (let y = eaves + 2; y <= eaves + 4; y++) put(world, cx + dx, y, z0 + 1, !cheek && y <= eaves + 3 ? blocks.glass : cheek ? blocks.beam ?? blocks.trim : blocks.wall);
    put(world, cx + dx, eaves + 1, z0 + 1, blocks.sill ?? blocks.trim);
  }
  for (const dx of [-2, 2]) put(world, cx + dx, eaves + 4, z0 + 2, blocks.wall);
  for (let z = z0; z <= z0 + 6; z++) {
    for (let dx = -3; dx <= 3; dx++) put(world, cx + dx, eaves + 8 - Math.abs(dx), z, dx === 0 ? blocks.ridge ?? blocks.roof : blocks.roof);
    // The cheeks carry the roof: wall under its lowest courses.
    for (const dx of [-2, 2]) put(world, cx + dx, eaves + 5, z, z === z0 ? blocks.gable ?? blocks.wall : blocks.roof);
  }
  // The gable over the dormer's face, under its roof.
  for (let dx = -1; dx <= 1; dx++) for (let y = eaves + 5; y < eaves + 8 - Math.abs(dx); y++) put(world, cx + dx, y, z0, blocks.gable ?? blocks.wall);
  const beams = [z0 + Math.round(d / 3), z0 + Math.round((2 * d) / 3)];
  for (const z of beams) for (let x = x0 + 1; x < x1; x++) put(world, x, baseY + wallHeight, z, blocks.post);
  return { ...front, room: { x0: x0 + 2, z0: z0 + 2, x1: x1 - 2, z1: z1 - 2, floorY: baseY }, beams, wallHeight };
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
}

/**
 * The red barn of d-04 and d-14, `w` wide (odd) and `d` deep on `baseY`, walls seven rows high: white corners,
 * a white-framed doorway seven wide and five high in the middle of its front with a white X door leaf either
 * side, a loft window with a white X in the gable, glazed windows down both sides, a gambrel roof whose ridge
 * runs front to back with a white trim along the gables' edge. Inside: planks lining the walls, a cobbled aisle
 * seven wide down the middle, plank-floored stalls either side open onto it, a post at each stall's corner on
 * the aisle, log beams across under the eaves; the front of the floor is left clear for the way in. Returns
 * the cell before its door, the room inside, the stalls' middles (x, z, side) and where their partitions run
 * (the map fences them), the aisle's half width and the beams' rows.
 */
export function placeRedBarn(
  world: WorldWriter,
  x0: number,
  z0: number,
  w: number,
  d: number,
  baseY: number,
  b: BarnBlocks,
): { door: [number, number]; room: Room; stalls: Array<{ x: number; z: number; side: -1 | 1 }>; partitions: Array<{ x0: number; x1: number; z: number }>; aisle: number; beams: number[] } {
  const x1 = x0 + w - 1;
  const z1 = z0 + d - 1;
  const mid = x0 + (w - 1) / 2;
  const H = 7;
  /** Half the aisle's width (cells either side of the middle one) and of the doorway's. */
  const AISLE = 3;
  const DOOR = 3;
  const DOOR_HIGH = 5;
  // Floor and the air inside.
  for (let x = x0 + 1; x < x1; x++) {
    for (let z = z0 + 1; z < z1; z++) {
      put(world, x, baseY - 1, z, Math.abs(x - mid) <= AISLE ? b.aisle : b.floor);
      for (let y = baseY; y < baseY + H + 14; y++) put(world, x, y, z, 0);
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
        const sideWindow = edgeX && !edgeZ && (z - z0) % 4 === 2 && z < z1 - 1 && y >= baseY + 2 && y <= baseY + 4;
        put(world, x, y, z, corner ? b.trim : sideWindow ? b.glass : b.wall);
      }
    }
  }
  // The doorway, its white frame, and a white X door leaf folded back either side.
  for (let x = mid - DOOR; x <= mid + DOOR; x++) for (let y = baseY; y < baseY + DOOR_HIGH; y++) put(world, x, y, z0, 0);
  for (const x of [mid - DOOR - 1, mid + DOOR + 1]) for (let y = baseY; y <= baseY + DOOR_HIGH; y++) put(world, x, y, z0, b.trim);
  for (let x = mid - DOOR - 1; x <= mid + DOOR + 1; x++) put(world, x, baseY + DOOR_HIGH, z0, b.trim);
  const leaf = (lx0: number, lw: number): void => {
    const lh = DOOR_HIGH + 1;
    for (let u = 0; u < lw; u++) {
      for (let v = 0; v < lh; v++) {
        const t = v / (lh - 1);
        const s = u / (lw - 1);
        const cross = Math.abs(s - t) < 0.2 || Math.abs(s - (1 - t)) < 0.2;
        put(world, lx0 + u, baseY + v, z0 - 1, v === lh - 1 || cross ? b.trim : b.wall);
      }
    }
  };
  leaf(mid - DOOR - 5, 4);
  leaf(mid + DOOR + 2, 4);
  // Gambrel roof, its ridge along z: steep lower slopes, shallow upper ones.
  const half = (w + 1) / 2;
  const rise = (k: number): number => (k <= 3 ? 2 * k : 6 + Math.ceil((k - 3) * 0.67));
  const roofAt = new Map<number, number>();
  const roofFrom = new Map<number, number>();
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    const k = Math.min(x - (x0 - 1), x1 + 1 - x, half);
    const y = baseY + H + rise(k);
    const from = k > 0 ? baseY + H + rise(k - 1) + 1 : y;
    roofAt.set(x, y);
    roofFrom.set(x, from);
    for (let z = z0 - 1; z <= z1 + 1; z++) for (let yy = from; yy <= y; yy++) put(world, x, yy, z, b.roof);
  }
  // The roof sits down on the side walls and their lining: red boards fill the gap under its lowest slope, so
  // no ledge is left along the wall tops under the eaves.
  for (const x of [x0, x0 + 1, x1 - 1, x1]) {
    for (let z = z0; z <= z1; z++) for (let y = baseY + H; y < (roofFrom.get(x) ?? baseY + H); y++) put(world, x, y, z, b.wall);
  }
  // Gables: red boards under the roof, a white trim along its edge, the loft window with its X.
  for (const z of [z0, z1]) {
    for (let x = x0; x <= x1; x++) {
      const top = (roofAt.get(x) ?? baseY + H) - 1;
      for (let y = baseY + H; y <= top; y++) put(world, x, y, z, y === top ? b.trim : b.wall);
    }
  }
  for (const z of [z0, z1]) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = 0; dy <= 2; dy++) {
        const cross = Math.abs(dx) === Math.abs(dy - 1);
        put(world, mid + dx, baseY + H + 2 + dy, z, cross ? b.trim : b.glass);
      }
    }
  }
  // Inside: lining, beams, stalls either side of the aisle from the fourth row in, each six rows long.
  lineInside(world, x0, z0, x1, z1, baseY, H, { lining: b.lining, post: b.post, glass: b.glass });
  const beams: number[] = [];
  for (let z = z0 + 4; z < z1 - 1; z += 5) {
    beams.push(z);
    for (let x = x0 + 1; x < x1; x++) put(world, x, baseY + H, z, b.post);
  }
  const stalls: Array<{ x: number; z: number; side: -1 | 1 }> = [];
  const partitions: Array<{ x0: number; x1: number; z: number }> = [];
  for (const side of [-1, 1] as const) {
    const inner = mid + side * (AISLE + 1);
    const outer = side < 0 ? x0 + 2 : x1 - 2;
    const [sx0, sx1] = [Math.min(inner, outer), Math.max(inner, outer)];
    for (let z = z0 + 6; z <= z1 - 8; z += 6) {
      put(world, inner, baseY, z, b.post);
      partitions.push({ x0: side < 0 ? sx0 : sx0 + 1, x1: side < 0 ? sx1 - 1 : sx1, z });
      stalls.push({ x: (sx0 + sx1) / 2, z: z + 3, side });
    }
  }
  return { door: [mid, z0 - 1], room: { x0: x0 + 2, z0: z0 + 2, x1: x1 - 2, z1: z1 - 2, floorY: baseY }, stalls, partitions, aisle: AISLE, beams };
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
  for (let dz = -2; dz <= 2; dz++) {
    const y = ground + 6 + (2 - Math.abs(dz));
    for (let dx = -3; dx <= 3; dx++) {
      put(world, cx + dx, y, cz + dz, dz === 0 || Math.abs(dx) === 3 ? b.ridge : b.roof);
    }
  }
  return { rope: [cx + 0.5, ground + 5, cz + 0.5], kerb: ground + 3 };
}

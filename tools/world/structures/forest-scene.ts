// The scenery of Khu rừng bí mật after the owner's detail mocks (designs/khu-rung-bi-mat/, 02/10/2026): a
// grey cliff in tiers with a waterfall off its tallest face into a pool, big blocky trees, a ranger's cabin
// one can walk into, an open timber shelter over the camp's table, walk-in ridge tents, and the verges of the
// forest trails (flowers, mushrooms, bushes of leaf blocks, now and then a lantern). Blocks for what is big, props for
// what is small; the map generator decides where each goes.
import { doorSteps, placeHouse, type HouseBlocks } from './buildings';
import { type Facing, facingWriter, FRAME, frameCell, put, type WorldWriter } from './world-writer';

/** A cliff of tiers round (x, z), `r` blocks from its middle to its foot. */
export interface Cliff {
  x: number;
  z: number;
  r: number;
}

/** The ground at a cliff's foot (the generator levels it) and the rise of its top tier above that. */
export const CLIFF_BASE = 12;
export const CLIFF_TOP = CLIFF_BASE + 24;
/** Tiers of the cliff: inside each share of its reach, the rise above the foot. */
const TIERS: ReadonlyArray<readonly [number, number]> = [
  [0.42, 24],
  [0.66, 15],
  [0.9, 7],
];
/** Half the width of the tall rock face the falls come down (on the cliff's -z side). */
const FALLS_BAND = 9;

/** How far south (-z) of a cliff's middle its falls' face stands. */
export const fallsFace = (c: Cliff): number => Math.floor(c.r * 0.82);

/**
 * The falls of a cliff: the row of columns the sheet of water stands in (just off the face), five wide
 * round `x`, and the round pool at its foot.
 */
export function fallsOf(c: Cliff): { x: number; sheetZ: number; pool: { x: number; z: number; r: number } } {
  const sheetZ = c.z - fallsFace(c) - 1;
  return { x: c.x, sheetZ, pool: { x: c.x, z: sheetZ - 5, r: 5.5 } };
}

/**
 * The rise of a cliff above its foot at a column: tiers of 7, 15 and 24 blocks with a ragged edge, and on
 * the -z side one sheer face from the top (the falls). 0 off the cliff.
 */
export function cliffRise(c: Cliff, x: number, z: number): number {
  const dx = x - c.x;
  const dz = z - c.z;
  // The face juts a block here and there, except where the sheet comes down.
  const ragged = Math.abs(dx) > 2 && cellRoll(x, c.z, 17) < 0.45 ? 1 : 0;
  if (dz < 0 && Math.abs(dx) <= FALLS_BAND && -dz <= fallsFace(c) - ragged) return CLIFF_TOP - CLIFF_BASE;
  const a = Math.atan2(dz, dx);
  const d = Math.hypot(dx, dz) / c.r + 0.07 * Math.sin(3 * a + c.x) + 0.04 * Math.sin(7 * a + 1.7);
  for (const [edge, rise] of TIERS) if (d < edge) return rise;
  return 0;
}

/** A cell's own roll in [0, 1): the same on every run, no draw from the map's random numbers. */
export const cellRoll = (x: number, z: number, salt = 0): number => {
  const h = Math.imul(x * 73856093 + salt * 83492791, 1) ^ Math.imul(z * 19349663 + salt, 1);
  return ((h >>> 0) % 1000) / 1000;
};

export interface CliffBlocks {
  stone: number;
  moss: number;
  grey: number;
  grass: number;
}

/** A cliff column of height `h`: grey stone with moss and darker stones on its faces, mostly grass on top. */
export function cliffColumn(world: WorldWriter, x: number, z: number, h: number, b: CliffBlocks): void {
  for (let y = 0; y < h; y++) {
    const roll = cellRoll(x + y * 7, z - y * 3, 5);
    put(world, x, y, z, y < h - 12 ? b.stone : roll < 0.14 ? b.moss : roll < 0.3 ? b.grey : b.stone);
  }
  // Bare rock shows through the grass on the ledges here and there.
  const top = cellRoll(x, z, 6);
  put(world, x, h, z, top < 0.18 ? b.stone : top < 0.26 ? b.moss : b.grass);
}

/**
 * The falls: a spring on the cliff's top, a stream three blocks wide running to the lip (five at the lip),
 * the sheet down the face to the pool at `waterLevel`, and mossy boulders either side of its foot. The
 * terrain round it (the pool, the cliff) is the generator's; tufts of leaves (`tuft`) cling to the face either
 * side of the sheet. Returns the foot of the sheet's middle.
 */
export function placeFalls(world: WorldWriter, c: Cliff, waterLevel: number, b: { water: number; moss: number; stone: number; tuft: number }): [number, number, number] {
  const { x, sheetZ } = fallsOf(c);
  const spring = { x, z: c.z - 6 };
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) < 2.6) put(world, spring.x + dx, CLIFF_TOP, spring.z + dz, b.water);
  for (let z = sheetZ + 1; z < spring.z; z++) {
    const half = z <= sheetZ + 3 ? 2 : 1;
    for (let dx = -half; dx <= half; dx++) put(world, x + dx, CLIFF_TOP, z, b.water);
    // Boulders on the stream's banks, every few blocks.
    if ((z - sheetZ) % 3 === 1) for (const side of [-1, 1]) put(world, x + side * (half + 1), CLIFF_TOP + 1, z, (z & 1) === 0 ? b.moss : b.stone);
  }
  for (let dx = -2; dx <= 2; dx++) for (let y = waterLevel + 1; y <= CLIFF_TOP; y++) put(world, x + dx, y, sheetZ, b.water);
  for (const side of [-1, 1]) {
    for (const [ox, oz, high] of [[3, 0, 3], [4, -1, 2], [3, -2, 1]] as const) {
      for (let y = waterLevel + 1; y <= waterLevel + high; y++) put(world, x + side * ox, y, sheetZ + oz, y === waterLevel + high ? b.moss : b.stone);
    }
  }
  // Tufts of green clinging to the face either side of the sheet.
  for (let dx = 3; dx <= FALLS_BAND; dx++) {
    for (const side of [-1, 1]) {
      for (let y = waterLevel + 4; y < CLIFF_TOP - 1; y += 3) {
        const tx = x + side * dx;
        if (cellRoll(tx, y, 23) >= 0.22) continue;
        put(world, tx, y, world.get(tx, y, sheetZ + 1) === 0 ? sheetZ + 1 : sheetZ, b.tuft, true);
      }
    }
  }
  return [x + 0.5, waterLevel + 1, sheetZ + 0.5];
}

/**
 * A big tree of the mocks: a trunk two blocks thick, `height` tall, under a crown of stacked blocky layers
 * seven blocks across, its corners cut by each cell's own roll (no draw from the map's random numbers).
 */
export function placeBigTree(world: WorldWriter, x: number, baseY: number, z: number, height: number, b: { log: number; leaves: number }): void {
  const top = baseY + height;
  for (let y = baseY; y < top; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) put(world, x + dx, y, z + dz, b.log);
  for (const [dy, radius] of [[-3, 3], [-2, 3], [-1, 4], [0, 3], [1, 3], [2, 2], [3, 1]] as const) {
    for (let dx = -radius; dx <= radius + 1; dx++) {
      for (let dz = -radius; dz <= radius + 1; dz++) {
        const edgeX = dx === -radius || dx === radius + 1;
        const edgeZ = dz === -radius || dz === radius + 1;
        if (edgeX && edgeZ) continue;
        if ((edgeX || edgeZ) && cellRoll(x + dx, z + dz, dy + 9) < 0.35) continue;
        put(world, x + dx, top + dy, z + dz, b.leaves, true);
      }
    }
  }
}

export interface CabinBlocks extends HouseBlocks {
  floor: number;
  foot: number;
}

/** A room's cells and its door, in the world. */
export interface Cabin {
  /** The world column of a cell of the room's own frame: (u, v) from its front-left inside corner, v inward. */
  cell(u: number, v: number): [number, number];
  /** The world cell before the middle of the doorway, and the cells two out before the whole doorway. */
  door: [number, number];
  apron: Array<[number, number]>;
  floorY: number;
  /** Inside size: `u` along the front, `v` back from it. */
  inside: { u: number; v: number };
}

/**
 * Footings and floor under a structure's own frame cells (u0..u1 x v0..v1): `foot` from the ground up to the
 * floor at `baseY` - 1, the air above it cleared `clear` blocks up.
 */
function groundFloor(world: WorldWriter, origin: readonly [number, number], facing: Facing, box: { u0: number; u1: number; v0: number; v1: number }, baseY: number, clear: number, surface: (x: number, z: number) => number, b: { floor: number; foot: number }): void {
  const fw = facingWriter(world, origin, facing);
  for (let u = box.u0; u <= box.u1; u++) {
    for (let v = box.v0; v <= box.v1; v++) {
      const [x, z] = frameCell(origin, facing, u, v);
      for (let y = surface(x, z) + 1; y < baseY - 1; y++) put(world, x, y, z, b.foot);
      put(fw, u, baseY - 1, v, b.floor);
      for (let y = baseY; y < baseY + clear; y++) put(fw, u, y, v, 0);
    }
  }
}

/** A front's doorway (`x0`, `width` in the frame, on the wall at FRAME): one-block steps down to the ground, the door cell and its apron. */
function doorFront(world: WorldWriter, origin: readonly [number, number], facing: Facing, doorway: { x0: number; width: number }, baseY: number, surface: (x: number, z: number) => number, step: number): Pick<Cabin, 'door' | 'apron'> {
  const fw = facingWriter(world, origin, facing);
  const ground = (u: number, v: number): number => {
    const [x, z] = frameCell(origin, facing, u, v);
    return surface(x, z) + 1;
  };
  doorSteps(fw, doorway.x0, doorway.width, FRAME, baseY, ground, step);
  const apron: Array<[number, number]> = [];
  for (let u = doorway.x0; u < doorway.x0 + doorway.width; u++) for (const v of [FRAME - 1, FRAME - 2]) apron.push(frameCell(origin, facing, u, v));
  return { door: frameCell(origin, facing, doorway.x0 + Math.floor(doorway.width / 2), FRAME - 1), apron };
}

/**
 * A ranger's cabin `w` x `d` with walls `wallHeight` high and its door looking `facing`, its front-left corner
 * on the world cell `origin` (see world-writer.ts `facingWriter`): stone footings down to the ground, a plank
 * floor at `baseY` - 1, timber walls with glazed windows, a gabled roof, a lantern each side of the door and
 * one-block steps up to it where the floor stands over the ground. With walls of five or more and a front of
 * seven or more the doorway is three wide and three high (buildings.ts `doorwaySize`).
 */
export function placeCabin(world: WorldWriter, origin: readonly [number, number], facing: Facing, w: number, d: number, wallHeight: number, baseY: number, surface: (x: number, z: number) => number, b: CabinBlocks): Cabin {
  groundFloor(world, origin, facing, { u0: FRAME, u1: FRAME + w - 1, v0: FRAME, v1: FRAME + d - 1 }, baseY, wallHeight + Math.ceil((d + 2) / 2) + 3, surface, b);
  const front = placeHouse(facingWriter(world, origin, facing), FRAME, FRAME, w, d, wallHeight, baseY, b);
  return {
    cell: (u, v) => frameCell(origin, facing, FRAME + 1 + u, FRAME + 1 + v),
    ...doorFront(world, origin, facing, front.doorway, baseY, surface, b.foot),
    floorY: baseY,
    inside: { u: w - 2, v: d - 2 },
  };
}

export interface ShelterBlocks {
  post: number;
  roof: number;
  ridge: number;
  floor: number;
  foot: number;
}

/**
 * An open timber shelter (the camp's "chòi gỗ") over a plank deck (2 * `half` + 1) square round (cx, cz): log
 * posts at its corners and halfway along each side, five high, and a roof one block over the edges rising in
 * three steps to a flat top with its ridge along x. Open on every side: one walks in anywhere.
 */
export function placeShelter(world: WorldWriter, cx: number, cz: number, half: number, baseY: number, surface: (x: number, z: number) => number, b: ShelterBlocks): void {
  for (let dx = -half; dx <= half; dx++) {
    for (let dz = -half; dz <= half; dz++) {
      const [x, z] = [cx + dx, cz + dz];
      for (let y = surface(x, z) + 1; y < baseY - 1; y++) put(world, x, y, z, b.foot);
      put(world, x, baseY - 1, z, b.floor);
      for (let y = baseY; y < baseY + 9; y++) put(world, x, y, z, 0);
    }
  }
  const POST = 5;
  for (const dx of [-half, 0, half]) {
    for (const dz of [-half, 0, half]) {
      if (dx === 0 && dz === 0) continue;
      for (let y = baseY; y < baseY + POST; y++) put(world, cx + dx, y, cz + dz, b.post);
    }
  }
  const eave = half + 1;
  for (let dx = -eave; dx <= eave; dx++) {
    for (let dz = -eave; dz <= eave; dz++) {
      const step = Math.min(eave - Math.abs(dz), 3);
      put(world, cx + dx, baseY + POST - 1 + step, cz + dz, step === 3 && dz === 0 ? b.ridge : b.roof);
    }
  }
}

export interface TentBlocks {
  canvas: number;
  pole: number;
  floor: number;
  foot: number;
}

/** A camp tent's size: nine across, eleven deep, its ridge pole six over the floor. */
export const TENT = { w: 9, d: 11 } as const;

/**
 * A walk-in ridge tent of canvas blocks (TENT.w across, TENT.d deep) with its door looking `facing`, its
 * front-left corner on the world cell `origin`: a groundsheet of planks on footings, sides falling in steps
 * from a log ridge pole to three-high walls (too high to climb from inside), a closed back and a front with a
 * doorway three wide and three high, the ridge pole jutting a block out at each end. Inside: seven by nine of
 * floor, three blocks of headroom at the sides and six in the middle.
 */
export function placeTent(world: WorldWriter, origin: readonly [number, number], facing: Facing, baseY: number, surface: (x: number, z: number) => number, b: TentBlocks): Cabin {
  const half = (TENT.w - 1) / 2;
  const mid = FRAME + half;
  groundFloor(world, origin, facing, { u0: FRAME, u1: FRAME + TENT.w - 1, v0: FRAME, v1: FRAME + TENT.d - 1 }, baseY, 9, surface, b);
  const fw = facingWriter(world, origin, facing);
  // The canvas over a column `a` from the middle: the top of the three-high wall at the edge, then one step up
  // per column.
  const slope = (a: number): number => baseY + 2 + half - a;
  for (let u = FRAME; u < FRAME + TENT.w; u++) {
    const a = Math.abs(u - mid);
    for (let v = FRAME - 1; v <= FRAME + TENT.d; v++) {
      const end = v === FRAME || v === FRAME + TENT.d - 1;
      const outside = v < FRAME || v >= FRAME + TENT.d;
      if (a === 0) put(fw, u, slope(0), v, b.pole);
      if (outside) continue;
      if (a > 0) put(fw, u, slope(a), v, b.canvas);
      if (a === half) for (let y = baseY; y < slope(a); y++) put(fw, u, y, v, b.canvas);
      if (!end) continue;
      // The front and the back close the triangle under the canvas; the front leaves its doorway.
      for (let y = baseY; y < slope(a); y++) if (!(v === FRAME && a <= 1 && y < baseY + 3)) put(fw, u, y, v, b.canvas);
    }
  }
  return {
    cell: (u, v) => frameCell(origin, facing, FRAME + 1 + u, FRAME + 1 + v),
    ...doorFront(world, origin, facing, { x0: mid - 1, width: 3 }, baseY, surface, b.foot),
    floorY: baseY,
    inside: { u: TENT.w - 2, v: TENT.d - 2 },
  };
}

/** What a trail's verge needs from the map. */
export interface VergeGround {
  surface(x: number, z: number): number;
  world: WorldWriter;
  /** Open ground for a flower or a bush: off the paths and the water, clear of what was built. */
  free(x: number, z: number): boolean;
  prop(model: string, x: number, z: number, yaw: number): void;
}

/**
 * The verges of a forest trail (the mocks' trails edged with flowers, c-10, a-10): every `spacing` blocks
 * along both sides, two to three blocks off the way, a flower, a mushroom, a fern or a bush of leaf blocks
 * (green or blossom, one or two high), and a lantern post every `lampEvery` blocks on alternate sides.
 */
export function trailVerge(g: VergeGround, route: ReadonlyArray<readonly [number, number]>, options: { verge: readonly string[]; bushes: readonly number[]; lamp?: string; spacing?: number; lampEvery?: number }): void {
  const spacing = options.spacing ?? 3;
  const lampEvery = options.lampEvery ?? 0;
  let walked = 0;
  for (let i = 0; i + 1 < route.length; i++) {
    const [ax = 0, az = 0] = route[i] ?? [];
    const [bx = 0, bz = 0] = route[i + 1] ?? [];
    const len = Math.hypot(bx - ax, bz - az);
    if (len === 0) continue;
    const [nx, nz] = [-(bz - az) / len, (bx - ax) / len];
    for (let d = 1; d < len; d += spacing, walked += spacing) {
      for (const side of [-1, 1]) {
        const off = 2.3 + cellRoll(Math.round(walked), side, 3) * 0.9;
        const x = Math.round(ax + ((bx - ax) * d) / len + nx * side * off);
        const z = Math.round(az + ((bz - az) * d) / len + nz * side * off);
        if (!g.free(x, z)) continue;
        const k = Math.floor(walked / spacing) * 2 + (side > 0 ? 1 : 0);
        const lampHere = lampEvery > 0 && options.lamp && walked % lampEvery < spacing && side === (Math.floor(walked / lampEvery) % 2 === 0 ? 1 : -1);
        if (lampHere && options.lamp) g.prop(options.lamp, x, z, side > 0 ? 270 : 90);
        else if (k % 4 === 1) {
          const y = g.surface(x, z) + 1;
          const bush = options.bushes[k % options.bushes.length] ?? 0;
          put(g.world, x, y, z, bush);
          if (k % 3 === 0) put(g.world, x, y + 1, z, bush);
        } else g.prop(options.verge[k % options.verge.length] ?? '', x, z, (k * 53) % 360);
      }
    }
  }
}

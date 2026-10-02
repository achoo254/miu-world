// The market pieces of Chợ phiên, after the owner's detail mock of the market (designs/cho-phien/d-*.png,
// 02/10/2026): a stall of each trade under its striped awning (vegetables, food, groceries, clothes, fish,
// flowers, fruit, rice, cakes, drinks, pets) with its goods heaped on the counter, in crates before it, on the
// shelf behind and hanging from the awning, a lantern on each front post and a chalkboard beside it; strings
// of pennants between lamp posts; two-storey shophouses with a striped awning over the shop front; the timber
// market gate with its "Chợ" sign and lanterns on brackets; the market hall with its clock tower. Blocks
// for the frames, box props (content/world/box-props/cho-phien.json) for the cloth, the goods and the glow.
import { PACK } from '../map-kit';
import { cottagePalette, STREET_LANTERN } from '../scenery';
import type { ZoneMapContext } from '../zone-map';
import { placeHouse } from './buildings';
import { type Facing, FRAME, facingWriter, frameCell } from './world-writer';

const BOX = PACK.box;
const FOOD = PACK.food;
const N = PACK.nature;
const P = PACK.props;

/** The world yaw of a prop whose front looks -z, turned to look `facing`. */
export const FACING_YAW: Readonly<Record<Facing, number>> = { north: 0, east: 270, south: 180, west: 90 };

/**
 * A point of a structure's own frame in the world: (u, v) blocks from the corner of its origin cell, u along
 * its front, v back from it (`facingWriter` turns cells the same way).
 */
export function framePoint(origin: readonly [number, number], facing: Facing, u: number, v: number): [number, number] {
  const [ox, oz] = origin;
  if (facing === 'south') return [ox + 1 - u, oz + 1 - v];
  if (facing === 'east') return [ox + 1 - v, oz + u];
  if (facing === 'west') return [ox + v, oz + 1 - u];
  return [ox + u, oz + v];
}

/** The origin cell that lays a `width` x `depth` footprint (front along its width) on a world rectangle's corner. */
export function originFor(x0: number, z0: number, width: number, depth: number, facing: Facing): [number, number] {
  if (facing === 'south') return [x0 + width - 1, z0 + depth - 1];
  if (facing === 'east') return [x0 + depth - 1, z0];
  if (facing === 'west') return [x0, z0 + width - 1];
  return [x0, z0];
}

/** The world rectangle (inclusive) of frame cells u0..u1, v0..v1. */
function frameRect(origin: readonly [number, number], facing: Facing, u0: number, v0: number, u1: number, v1: number): [number, number, number, number] {
  const a = frameCell(origin, facing, FRAME + u0, FRAME + v0);
  const b = frameCell(origin, facing, FRAME + u1, FRAME + v1);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}

export type Goods = 'veg' | 'fruit' | 'food' | 'grocery' | 'clothes' | 'fish' | 'flowers' | 'rice' | 'cakes' | 'drinks' | 'pets';
export type Awning = 'red' | 'blue' | 'orange' | 'green';

const crate = (kind: string): string => `${BOX}/cp-crate-${kind}.glb`;
const chalk = (icon: string): string => `${BOX}/cp-chalkboard-${icon}.glb`;

interface Stock {
  awning: Awning;
  /** On the counter, one per block of it (four). */
  counter: readonly string[];
  /** On the shelf at the back (four). */
  shelf: readonly string[];
  /** On the ground before the counter (up to four). */
  front: readonly string[];
  /** Hanging from the awning's front edge (three). */
  hanging?: readonly string[];
  sign?: string;
  /** Beside the stall (a mirror, brooms, a barrel). */
  side?: string;
  /** Hanging at the back over the shelf (the food stall's cloth banner). */
  back?: string;
  /** No cupboard or shelf at the back: the stall looks through to what is behind it (the fish stalls on the water). */
  open?: boolean;
}

/** What each trade sells and shows (d-03 vegetables, d-04 food, d-05 groceries, d-06 clothes, d-07 fish, d-08 pets). */
const STOCK: Readonly<Record<Goods, Stock>> = {
  veg: {
    awning: 'green',
    counter: [crate('cabbage'), crate('tomato'), crate('lemon'), crate('potato')],
    shelf: [`${P}/basket.glb`, `${FOOD}/cabbage.glb`, `${FOOD}/broccoli.glb`, `${P}/basket.glb`],
    front: [crate('carrot'), crate('cabbage'), crate('eggplant'), `${N}/crop_pumpkin.glb`],
    hanging: [`${BOX}/cp-string-garlic.glb`, `${BOX}/cp-string-onion.glb`, `${BOX}/cp-string-chilli.glb`],
    sign: chalk('carrot'),
  },
  fruit: {
    awning: 'red',
    counter: [crate('apple'), crate('orange'), `${FOOD}/watermelon.glb`, `${FOOD}/grapes.glb`],
    shelf: [`${FOOD}/banana.glb`, `${FOOD}/pear.glb`, `${P}/basket.glb`, `${FOOD}/orange.glb`],
    front: [crate('lemon'), crate('apple'), `${FOOD}/watermelon.glb`, crate('orange')],
    sign: chalk('apple'),
  },
  food: {
    awning: 'red',
    counter: [`${BOX}/cp-tray-bread.glb`, `${BOX}/cp-tray-skewers.glb`, `${BOX}/cp-tray-buns.glb`, `${FOOD}/pie.glb`],
    shelf: [`${FOOD}/bread.glb`, `${FOOD}/croissant.glb`, `${FOOD}/pie.glb`, `${FOOD}/cupcake.glb`],
    front: [`${BOX}/cp-stool.glb`, `${BOX}/cp-stool.glb`],
    sign: chalk('bread'),
    side: `${PACK.survival}/barrel.glb`,
    back: `${BOX}/cp-banner-food.glb`,
  },
  grocery: {
    awning: 'blue',
    counter: [`${BOX}/cp-shelf-jars.glb`, `${BOX}/cp-shelf-bottles.glb`, `${BOX}/cp-shelf-tins.glb`, `${FOOD}/honey.glb`],
    shelf: [`${BOX}/cp-shelf-bottles.glb`, `${BOX}/cp-shelf-jars.glb`, `${BOX}/cp-shelf-tins.glb`, `${BOX}/cp-shelf-jars.glb`],
    front: [`${BOX}/cp-sack-rice.glb`, `${BOX}/cp-sack-beans.glb`, `${P}/potted-plant.glb`, `${BOX}/cp-sack-corn.glb`],
    sign: chalk('bottle'),
    side: `${BOX}/cp-brooms.glb`,
  },
  clothes: {
    awning: 'orange',
    counter: [`${BOX}/cp-folded-clothes.glb`, `${BOX}/cp-hat-straw.glb`, `${BOX}/cp-folded-clothes.glb`, `${BOX}/cp-hat-pink.glb`],
    shelf: [`${BOX}/cp-hat-blue.glb`, `${BOX}/cp-hat-straw.glb`, `${BOX}/cp-hat-pink.glb`, `${BOX}/cp-folded-clothes.glb`],
    front: [`${P}/potted-plant.glb`, `${PACK.survival}/chest.glb`],
    hanging: [`${BOX}/cp-shirt-pink.glb`, `${BOX}/cp-shirt-blue.glb`, `${BOX}/cp-shirt-yellow.glb`],
    sign: chalk('hat'),
    side: `${BOX}/cp-mirror.glb`,
  },
  fish: {
    awning: 'blue',
    counter: [`${BOX}/cp-fish-ice.glb`, `${BOX}/cp-fish-ice.glb`, `${BOX}/cp-fish-ice.glb`, `${BOX}/cp-fish-ice.glb`],
    shelf: [`${P}/basket.glb`, `${PACK.survival}/bucket.glb`, `${P}/spiral-shell.glb`, `${P}/basket.glb`],
    front: [`${BOX}/cp-crab-basket.glb`, `${PACK.survival}/bucket.glb`, `${BOX}/cp-crab-basket.glb`],
    hanging: [`${BOX}/cp-fish-line.glb`, `${BOX}/cp-fish-line.glb`, `${BOX}/cp-fish-line.glb`],
    sign: chalk('fish'),
    side: `${PACK.survival}/barrel.glb`,
    open: true,
  },
  flowers: {
    awning: 'red',
    counter: [`${BOX}/cp-flowers-warm.glb`, `${BOX}/cp-flowers-cool.glb`, `${BOX}/cp-flowers-warm.glb`, `${BOX}/cp-flowers-cool.glb`],
    shelf: [`${P}/potted-plant.glb`, `${P}/seedling.glb`, `${P}/potted-plant.glb`, `${P}/seedling.glb`],
    front: [`${BOX}/cp-flowers-cool.glb`, `${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${BOX}/cp-flowers-warm.glb`],
    sign: chalk('flower'),
  },
  rice: {
    awning: 'orange',
    counter: [`${BOX}/cp-sack-rice.glb`, `${P}/balance-scale.glb`, `${BOX}/cp-sack-beans.glb`, `${BOX}/cp-sack-corn.glb`],
    shelf: [`${FOOD}/bag.glb`, `${FOOD}/bag.glb`, `${P}/basket.glb`, `${FOOD}/bag.glb`],
    front: [`${BOX}/cp-sack-rice.glb`, `${BOX}/cp-sack-rice.glb`, `${BOX}/cp-sack-corn.glb`],
  },
  cakes: {
    awning: 'red',
    counter: [`${FOOD}/cake.glb`, `${FOOD}/cupcake.glb`, `${BOX}/cp-tray-buns.glb`, `${FOOD}/pie.glb`],
    shelf: [`${FOOD}/cake.glb`, `${P}/birthday-cake.glb`, `${FOOD}/cupcake.glb`, `${FOOD}/croissant.glb`],
    front: [`${BOX}/cp-stool.glb`, `${BOX}/cp-stool.glb`],
    sign: chalk('bread'),
  },
  drinks: {
    awning: 'blue',
    counter: [`${FOOD}/soda-bottle.glb`, `${BOX}/cp-shelf-bottles.glb`, `${FOOD}/soda-bottle.glb`, `${BOX}/cp-shelf-bottles.glb`],
    shelf: [`${BOX}/cp-shelf-bottles.glb`, `${FOOD}/soda-bottle.glb`, `${BOX}/cp-shelf-bottles.glb`, `${FOOD}/soda-bottle.glb`],
    front: [`${PACK.survival}/barrel.glb`, `${PACK.survival}/bucket.glb`],
    sign: chalk('bottle'),
  },
  pets: {
    awning: 'red',
    counter: [`${BOX}/cp-feed-trough.glb`, `${P}/basket.glb`, `${BOX}/cp-sack-corn.glb`, `${P}/basket.glb`],
    shelf: [`${BOX}/cp-sack-corn.glb`, `${P}/basket.glb`, `${BOX}/cp-sack-beans.glb`, `${P}/basket.glb`],
    front: [`${BOX}/cp-hay-bale.glb`, `${BOX}/cp-hay-bale.glb`],
    sign: chalk('paw'),
  },
};

export const STALL = { width: 6, depth: 4 } as const;

/** Where a stall's seller stands and looks, and the middle of the walk before it. */
export interface StallPlace {
  goods: Goods;
  seller: [number, number];
  looks: [number, number];
  before: [number, number];
}

/**
 * A stall of `goods` 6 x 4 from its origin cell, its counter facing `facing`: four log posts (the back ones a
 * block higher, under the awning's rise), a plank counter, low plank sides, a cupboard and shelf at the back;
 * the trade's striped awning, goods on the counter, the shelf, the ground before it and hanging from the
 * awning, a lantern on each front post, its chalkboard. `awning` overrides the trade's colour. Keeps the
 * stall and the two rows before it clear of trees and quest places.
 */
export function marketStall(ctx: ZoneMapContext, origin: readonly [number, number], facing: Facing, goods: Goods, n: number, awning?: Awning): StallPlace {
  const { world, block } = ctx;
  const base = ctx.ground + 1;
  const w = facingWriter(world, origin, facing);
  const [log, planks] = [block('log'), block('planks')];
  const set = (u: number, y: number, v: number, id: number): void => w.set(FRAME + u, y, FRAME + v, id);
  for (const u of [0, 5]) {
    for (let y = base; y <= base + 2; y++) set(u, y, 0, log);
    for (let y = base; y <= base + 3; y++) set(u, y, 3, log);
    for (const v of [1, 2]) set(u, base, v, planks);
  }
  const stock = STOCK[goods];
  for (let u = 1; u <= 4; u++) {
    set(u, base, 0, planks);
    if (stock.open) continue;
    set(u, base, 3, planks);
    set(u, base + 1, 3, planks);
  }
  const yaw = FACING_YAW[facing];
  const at = (u: number, y: number, v: number): [number, number, number] => {
    const [x, z] = framePoint(origin, facing, u, v);
    return [x, y, z];
  };
  ctx.propAt(`${BOX}/cp-awning-${awning ?? stock.awning}.glb`, at(3, base + 2.7, 2), yaw);
  stock.counter.forEach((m, i) => ctx.propAt(m, at(1.5 + i, base + 1, 0.5), yaw + ((i * 23 + n * 7) % 30) - 15));
  if (!stock.open) stock.shelf.forEach((m, i) => ctx.propAt(m, at(1.5 + i, base + 2, 3.5), yaw + ((i * 41 + n) % 40) - 20));
  if (stock.back) ctx.propAt(stock.back, at(3, base + 2.45, 3.2), yaw);
  const fronts = [1.0, 2.2, 3.8, 5.0];
  stock.front.forEach((m, i) => ctx.propAt(m, at(fronts[i] ?? 3, base, -0.55), yaw + ((i * 37 + n * 11) % 24) - 12));
  stock.hanging?.forEach((m, i) => ctx.propAt(m, at(1.5 + i * 1.5, base + 2, -0.35), yaw + i * 30));
  for (const u of [0.5, 5.5]) ctx.propAt(`${BOX}/cp-hang-lantern.glb`, at(u, base + 1.9, -0.15), yaw);
  if (stock.sign) ctx.propAt(stock.sign, at(-0.8, base, -1.1), yaw + 20);
  if (stock.side) ctx.propAt(stock.side, at(6.7, base, 0.6), yaw - 15);
  const [x0, z0, x1, z1] = frameRect(origin, facing, -1, -2, 6, 3);
  ctx.keepOut(x0, z0, x1, z1);
  const seller = framePoint(origin, facing, 2.5, 1.5).map(Math.floor) as [number, number];
  const looks = framePoint(origin, facing, 2.5, -2).map(Math.floor) as [number, number];
  const before = framePoint(origin, facing, 3, -3).map(Math.floor) as [number, number];
  return { goods, seller, looks, before };
}

/** The tie point under a street lantern's head (STREET_LANTERN) standing on a column. */
export function streetLamp(ctx: ZoneMapContext, x: number, z: number): [number, number, number] {
  ctx.prop(STREET_LANTERN, x, z, 0);
  return [x + 0.5, ctx.surface(x, z) + 3.55, z + 0.5];
}

/**
 * A string of pennants from `a` to `b` (cord points), sagging `sag` blocks in the middle: four-block lengths
 * of the bunting props (content/world/box-props/cho-phien.json) along the line, colours alternating.
 */
export function bunting(ctx: ZoneMapContext, a: readonly [number, number, number], b: readonly [number, number, number], sag = 0.6): void {
  const [ax, ay, az] = a;
  const [bx, by, bz] = b;
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 1) return;
  const segments = Math.max(1, Math.round(len / 4));
  // (+ 0 turns a -0 into 0: the entities file keeps no negative zero to compare against.)
  const yaw = Math.round((Math.atan2(-(bz - az), bx - ax) * 180) / Math.PI) + 0;
  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments;
    const y = ay + (by - ay) * t - sag * 4 * t * (1 - t);
    ctx.propAt(`${BOX}/${i % 2 ? 'cp-bunting-b' : 'cp-bunting'}.glb`, [ax + (bx - ax) * t, y - 0.64, az + (bz - az) * t], yaw);
  }
}

const SHOP_AWNINGS: readonly Awning[] = ['red', 'blue', 'orange', 'green', 'blue', 'red'];

/**
 * A two-storey shophouse `w` wide and `d` deep on a world rectangle (x0, z0 its least corner), its shop front
 * facing `facing`: the village houses' finish (stone foot, timber posts and beams, glazed windows over flower
 * boxes, ridge, gables, chimney, lanterns by the door) with a beam between the storeys and upper windows, a
 * striped awning hung from the wall over the shop front, a plank threshold in the doorway, a planter and a
 * crate or a chalkboard either side of the door, the two rows before the door kept clear. Owner (02/10/2026):
 * a house many times the child's size with a really wide way in, so callers give at least 13 x 11 (the door
 * is then three wide and three high, buildings.ts `doorwaySize`). Returns the cell before its door.
 */
export function shophouse(ctx: ZoneMapContext, x0: number, z0: number, w: number, d: number, facing: Facing, n: number): [number, number] {
  const { world, block } = ctx;
  const base = ctx.ground + 1;
  const palette = cottagePalette(ctx);
  const walls = [block('sand'), block('snow'), block('birch-log'), block('planks'), block('sand')];
  const roofs = [block('brick-red'), block('roof-blue'), block('wood-red'), block('brick-red'), block('roof-blue')];
  const origin = originFor(x0, z0, w, d, facing);
  const writer = facingWriter(world, origin, facing);
  const wallHeight = 7;
  const wall = walls[n % walls.length] ?? palette.trim;
  const front = placeHouse(writer, FRAME, FRAME, w, d, wallHeight, base, { ...palette.finish, wall, roof: roofs[(n * 3) % roofs.length] ?? palette.trim, trim: palette.trim });
  // The upper storey: a beam round the walls at its floor, a window over every window below.
  const set = (u: number, y: number, v: number, id: number): void => writer.set(FRAME + u, y, FRAME + v, id);
  for (let u = 0; u < w; u++) {
    for (const v of [0, d - 1]) {
      set(u, base + 3, v, palette.finish.beam);
      if (u % 4 === 2 && u < w - 1) for (const y of [base + 4, base + 5]) set(u, y, v, palette.finish.glass);
    }
  }
  for (let v = 1; v < d - 1; v++) for (const u of [0, w - 1]) set(u, base + 3, v, palette.finish.beam);
  for (const [bx, by, bz] of front.boxes) {
    const [x, z] = framePoint(origin, facing, bx - FRAME, bz - FRAME);
    ctx.propAt(`${N}/${['flower_redA', 'flower_yellowB', 'flower_purpleA'][(n + Math.floor(bx)) % 3]}.glb`, [x, by, z], n * 23);
  }
  // A plank threshold in the doorway, level with the floor inside.
  for (let i = 0; i < front.doorway.width; i++) writer.set(front.doorway.x0 + i, base - 1, FRAME, palette.finish.floor);
  const yaw = FACING_YAW[facing];
  const door = Math.floor(w / 2);
  // The awning's back edge sits in the wall over the door: it hangs from the house, not over the street.
  const awningAt = framePoint(origin, facing, door, 0.05);
  ctx.propAt(`${BOX}/cp-shop-awning-${SHOP_AWNINGS[n % SHOP_AWNINGS.length] ?? 'red'}.glb`, [awningAt[0], base + 2.35, awningAt[1]], yaw);
  const [px, pz] = framePoint(origin, facing, door - 3.5, -0.7);
  ctx.propAt(`${BOX}/cp-planter.glb`, [px, base, pz], yaw);
  const SIGNS = ['bottle', 'bread', 'hat', 'flower'];
  const CRATES = ['apple', 'cabbage', 'orange'];
  const other = n % 3 === 0 ? chalk(SIGNS[n % SIGNS.length] ?? 'bottle') : n % 3 === 1 ? crate(CRATES[n % CRATES.length] ?? 'apple') : `${PACK.survival}/barrel.glb`;
  const [ox, oz] = framePoint(origin, facing, door + 3.5, -0.7);
  ctx.propAt(other, [ox, base, oz], yaw + 10);
  ctx.keepOut(x0 - 1, z0 - 1, x0 + w, z0 + d);
  // Nothing stands in the two rows before the doorway (lanterns, verges and dressing go round it).
  const u0 = front.doorway.x0 - FRAME;
  const [ax0, az0, ax1, az1] = frameRect(origin, facing, u0, -2, u0 + front.doorway.width - 1, -1);
  ctx.keepOut(ax0, az0, ax1, az1);
  const step = framePoint(origin, facing, door, -1.5);
  return [Math.floor(step[0]), Math.floor(step[1])];
}

// Generates "Chợ phiên" (Toán topics 2 and 3) from a fixed seed, 800 x 800 blocks after the owner's market
// mocks (designs/cho-phien/): a country market town by a canal, rows of stalls under red, blue and yellow
// striped awnings piled with produce, brick squares, two-storey shophouses with coloured roofs round them.
// Two districts on the canal's north bank, one per chapter. West, the flower and vegetable market
// (chapter 1): flower, seed, gourd, vegetable, fruit, bamboo and lantern rows, the seedling greenhouse, the
// gourd trellis, the old apple tree, the pig pen, the dovecote, the ox-cart park, the duck pond, the
// basket-throwing and tug-of-war grounds, the gate with its watch hut, and on the canal the sluice, the
// gravel bank, the wooden shed and the dragon bridge. East, the weighing row (chapter 2): the scale stalls,
// the drinks counter with its fish tank, the sweet-soup kitchen in the middle, the goods store, the rice
// store and its sack racks, and the goods landing on a harbour basin of the canal. Between them the market
// street lined with shophouses, hamlets of cottages, a fountain garden; beyond them, outskirts of vegetable
// plots, hamlets along lamp-lit lanes and thin woods.
// Output: assets/generated/world/cho-phien/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain, smoothstep } from './map-kit';
import { bambooHedge, flowerBed, hamlet, jetty, lampRow } from './scenery';
import { placeHouse, type HouseBlocks } from './structures/buildings';
import { placeFountain, placeStall } from './structures/countryside';
import type { Point } from './structures/path';
import { placeAncientTree, placeTree } from './structures/tree';
import type { WorldWriter } from './structures/world-writer';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'cho-phien';
const WATER_LEVEL = 10;

/** What the market's people hold: produce, baskets, crates. */
const LIFE_HELD = {
  basket: `${PACK.props}/basket.glb`,
  apple: `${PACK.food}/apple.glb`,
  cabbage: `${PACK.food}/cabbage.glb`,
  crate: `${PACK.survival}/box.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  paddle: `${PACK.nature}/canoe_paddle.glb`,
};

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'cho-rau-hoa', name: 'Chợ rau hoa', x: 220, z: 372, hx: 88, hz: 68, floor: 'path' },
  { chapter: 2, id: 'day-hang-can-dong', name: 'Dãy hàng cân đong', x: 590, z: 372, hx: 70, hz: 60, floor: 'path' },
];

/** The canal's centre line, west to east, south of both districts. */
export function canalCentre(x: number): number {
  return 476 + 6 * Math.sin(x / 57) + 3 * Math.sin(x / 23 + 1);
}
const CANAL = { half: 6, x0: 26, x1: 774 };
/** The harbour basin of the goods landing, the inlet to the sluice by the flower market, the duck pond. */
const HARBOUR = { x: 625, z: 474, rx: 30, rz: 12 };
const INLET = { x0: 176, x1: 179, z0: 452 };
const DUCK_POND = { x: 290, z: 424, r: 7 };

const inWater = (x: number, z: number): boolean =>
  (x >= CANAL.x0 && x <= CANAL.x1 && Math.abs(z - canalCentre(x)) < CANAL.half) ||
  ((x - HARBOUR.x) / HARBOUR.rx) ** 2 + ((z - HARBOUR.z) / HARBOUR.rz) ** 2 < 1 ||
  (x >= INLET.x0 && x <= INLET.x1 && z >= INLET.z0 && z <= canalCentre(x)) ||
  Math.hypot(x - DUCK_POND.x, z - DUCK_POND.z) < DUCK_POND.r;

/** North-south roads (the west market's, the middle one, the east market's, two outer lanes) and east-west ones. */
const ROAD_X = { west: 220, mid: 410, east: 590, outerW: 60, outerE: 740 };
const ROAD_Z = { north: 140, street: 290, lane: 372, bank: 448, south: 620 };
const ROUTES: Point[][] = [
  [[ROAD_X.west, 30], [ROAD_X.west, 770]],
  [[ROAD_X.east, 30], [ROAD_X.east, 770]],
  [[ROAD_X.mid, ROAD_Z.street], [ROAD_X.mid, 770]],
  [[ROAD_X.outerW, ROAD_Z.north], [ROAD_X.outerW, ROAD_Z.south]],
  [[ROAD_X.outerE, ROAD_Z.north], [ROAD_X.outerE, ROAD_Z.south]],
  ...Object.values(ROAD_Z).map((z): Point[] => [[30, z], [770, z]]),
];
/** Spans of x between the north-south roads (a few blocks clear of them), where rows of buildings and plots go. */
const SEGMENTS: ReadonlyArray<readonly [number, number]> = [[26, 54], [67, 213], [227, 403], [417, 583], [597, 733], [747, 774]];
const SPAWN = { x: ROAD_X.west, z: 262 };
/** Kept clear round the spawn and the gate back to the school (the builder puts it at spawn + (7, 3)). */
const SPAWN_YARD = { x0: 208, z0: 254, x1: 240, z1: 276 };

/** Level ground for the town and its hamlets (the outskirts roll). */
const FLAT = [
  { x0: 24, z0: 252, x1: 776, z1: 458 },
  { x0: 24, z0: 144, x1: 776, z1: 186 },
  { x0: 24, z0: 486, x1: 776, z1: 540 },
  { x0: 24, z0: 624, x1: 776, z1: 668 },
];
const flatness = (x: number, z: number): number =>
  Math.max(...FLAT.map((r) => 1 - smoothstep(0, 8, Math.hypot(Math.max(0, r.x0 - x, x - r.x1), Math.max(0, r.z0 - z, z - r.z1)))));
const F = PACK.food;
const N = PACK.nature;
const P = PACK.props;
const M = {
  flowerRed: `${N}/flower_redA.glb`,
  flowerYellow: `${N}/flower_yellowB.glb`,
  flowerPurple: `${N}/flower_purpleA.glb`,
  bamboo: `${N}/crops_bambooStageB.glb`,
  lily: `${N}/lily_large.glb`,
  canoe: `${N}/canoe.glb`,
  pumpkin: `${N}/crop_pumpkin.glb`,
  fence: `${N}/fence_simple.glb`,
  lamp: `${PACK.roads}/light-curved.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  crate: `${PACK.survival}/box-large.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  campfire: `${PACK.survival}/campfire-stand.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  hoop: `${PACK.box}/basketball-hoop.glb`,
  scale: `${P}/balance-scale.glb`,
  basket: `${P}/basket.glb`,
  star: `${P}/glowing-star.glb`,
  picture: `${P}/framed-picture.glb`,
  toyBoat: `${P}/sailboat.glb`,
  seedling: `${P}/seedling.glb`,
  fish: `${P}/tropical-fish.glb`,
  cucumber: `${P}/cucumber.glb`,
  cabbage: `${F}/cabbage.glb`,
  carrot: `${F}/carrot.glb`,
  apple: `${F}/apple.glb`,
  banana: `${F}/banana.glb`,
  pear: `${F}/pear.glb`,
  soda: `${F}/soda-bottle.glb`,
  pot: `${F}/pot-stew.glb`,
  bag: `${F}/bag.glb`,
  cake: `${F}/cake.glb`,
};
/** What each kind of stall piles on its counter and in the crates before it. */
const GOODS = {
  sunflower: [M.flowerYellow],
  chrysanthemum: [M.flowerYellow, M.flowerPurple],
  hibiscus: [M.flowerRed],
  flowers: [M.flowerRed, M.flowerYellow, M.flowerPurple],
  seeds: [M.seedling, M.bag],
  pictures: [M.picture],
  gourds: [M.cucumber, M.pumpkin],
  carrots: [M.carrot],
  greens: [M.cabbage],
  vegetables: [M.cabbage, M.carrot, M.cucumber],
  fruit: [M.apple, M.banana, M.pear],
  apples: [M.apple],
  guava: [M.pear],
  toys: [M.toyBoat],
  bamboo: [M.basket],
  lanterns: [M.basket],
  stars: [M.star],
  soup: [M.pot],
  drinks: [M.soda],
  cakes: [M.cake],
  rice: [M.bag],
} as const;
type Kind = keyof typeof GOODS;
const FLOWER_KINDS = new Set<Kind>(['sunflower', 'chrysanthemum', 'hibiscus', 'flowers']);
const FLOWER_PROPS = [M.flowerRed, M.flowerYellow, M.flowerPurple];

type Facing = 'n' | 's';

/** A writer that mirrors front to back about z = m / 2: a builder whose door faces -z then faces +z. */
function mirrored(world: WorldWriter, m: number): WorldWriter {
  return { size: world.size, get: (x, y, z) => world.get(x, y, m - z), set: (x, y, z, id) => world.set(x, y, m - z, id) };
}

/** The market's builders on one map: stalls, tents, shophouses, plots, and the small works of the lessons. */
function marketKit(ctx: ZoneMapContext) {
  const { world, block, ground } = ctx;
  const base = ground + 1;
  const B = {
    log: block('log'), planks: block('planks'), birch: block('birch-log'), snow: block('snow'), sand: block('sand'), red: block('wood-red'),
    brick: block('brick-red'), grey: block('brick-grey'), blue: block('roof-blue'), glass: block('glass'), board: block('board'),
    water: block('water'), leaves: block('leaves'), autumn: block('leaves-autumn'), pink: block('leaves-pink'), dirt: block('dirt'),
    stone: block('stone'), riverbed: block('riverbed'), path: block('path'), treeLog: block('tree-log'),
  };
  const awnings = [[B.red, B.snow], [B.blue, B.snow], [B.sand, B.snow], [B.red, B.sand], [B.brick, B.snow]];
  const writerFor = (z0: number, d: number, facing: Facing): WorldWriter => (facing === 'n' ? world : mirrored(world, 2 * z0 + d - 1));
  const set = (x: number, y: number, z: number, id: number): void => world.set(x, y, z, id);
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, id);
  };
  let stalls = 0;

  /**
   * A stall `w` x `d` from (x0, z0) whose counter faces `facing` (n: -z, s: +z), its goods on the counter and
   * two crates (or pots of flowers) of them before it. Returns the counter's row and the side customers stand on.
   */
  const stall = (x0: number, z0: number, kind: Kind, facing: Facing = 'n', w = 6, d = 4): { front: number; out: number } => {
    const n = stalls++;
    placeStall(writerFor(z0, d, facing), x0, z0, w, d, base, { log: B.log, planks: B.planks, stripes: awnings[n % awnings.length] ?? [] });
    const front = facing === 'n' ? z0 : z0 + d - 1;
    const out = facing === 'n' ? -1 : 1;
    ctx.keepOut(x0 - 1, front + 2 * out, x0 + w, front - out * d);
    const goods: readonly string[] = GOODS[kind];
    const yaw = facing === 'n' ? 180 : 0;
    for (let i = 0; i < w - 2; i++) ctx.propAt(goods[(i + n) % goods.length] ?? M.basket, [x0 + 1.5 + i, base + 1, front + 0.5], yaw + i * 25);
    for (const [k, dx] of [-1, w].entries()) {
      const good = goods[(k + n) % goods.length] ?? M.basket;
      if (FLOWER_KINDS.has(kind)) {
        ctx.prop(good, x0 + dx, front, k * 70);
        ctx.prop(good, x0 + dx, front + out, k * 70 + 40);
      } else {
        ctx.prop(M.crate, x0 + dx, front + out, n * 30 + k * 90);
        ctx.propAt(good, [x0 + dx + 0.5, base + 0.9, front + out + 0.5], k * 60);
      }
    }
    return { front, out };
  };
  /** A striped awning on four posts with no counter (a tent for hives, a kitchen). */
  const tent = (x0: number, z0: number, w: number, d: number, facing: Facing = 'n'): void => {
    placeStall(writerFor(z0, d, facing), x0, z0, w, d, base, { log: B.log, planks: B.planks, stripes: awnings[stalls++ % awnings.length] ?? [] });
    const front = facing === 'n' ? z0 : z0 + d - 1;
    for (let x = x0 + 1; x < x0 + w - 1; x++) set(x, base, front, 0);
    ctx.keepOut(x0 - 1, z0 - 2, x0 + w, z0 + d + 1);
  };

  let houses = 0;
  /** A house `w` x `d` whose door faces `facing` with its front wall on row `zFront`. Returns its rows. */
  const house = (x0: number, zFront: number, w: number, d: number, wallHeight: number, facing: Facing, blocks: HouseBlocks): { z0: number; z1: number } => {
    const z0 = facing === 'n' ? zFront : zFront - d + 1;
    placeHouse(writerFor(z0, d, facing), x0, z0, w, d, wallHeight, base, blocks);
    ctx.keepOut(x0 - 1, z0 - 1, x0 + w, z0 + d);
    return { z0, z1: z0 + d - 1 };
  };
  const SHOP_WALLS = [B.snow, B.sand, B.birch, B.planks, B.snow, B.sand];
  const SHOP_ROOFS = [B.brick, B.blue, B.red, B.brick, B.grey, B.blue, B.red];
  /** A two-storey shophouse: glazed upper windows, a striped awning over the shop front, a pot or a crate by the door. */
  const shophouse = (x0: number, zFront: number, w: number, facing: Facing): void => {
    const n = houses++;
    const d = 8 + (n % 2);
    house(x0, zFront, w, d, 6, facing, { wall: SHOP_WALLS[n % SHOP_WALLS.length] ?? B.snow, roof: SHOP_ROOFS[(n * 3) % SHOP_ROOFS.length] ?? B.brick, trim: B.log });
    for (let x = x0 + 1; x < x0 + w - 1; x++) if ((x - x0) % 3 === 1) set(x, base + 4, zFront, B.glass);
    const out = facing === 'n' ? -1 : 1;
    const stripes = awnings[n % awnings.length] ?? [];
    for (let x = x0; x < x0 + w; x++) set(x, base + 2, zFront + out, stripes[(x - x0) % stripes.length] ?? B.red);
    ctx.prop(n % 3 === 0 ? M.crate : n % 3 === 1 ? M.barrel : M.flowerRed, x0 + 1, zFront + out, n * 40);
    if (n % 2 === 0) ctx.prop(FLOWER_PROPS[n % FLOWER_PROPS.length] ?? M.flowerRed, x0 + w - 2, zFront + out, n * 20);
    ctx.keepOut(x0, zFront + out, x0 + w - 1, zFront + out);
  };
  /** Shophouses along a street from x0 to x1, skipping roads, zones, water and `reserved` ground. */
  const shopRow = (x0: number, x1: number, zFront: number, facing: Facing, reserved: ReadonlyArray<{ x0: number; z0: number; x1: number; z1: number }> = []): void => {
    let x = x0;
    while (x <= x1) {
      const w = 8 + (houses % 3);
      if (x + w - 1 > x1) break;
      const zs = facing === 'n' ? [zFront - 1, zFront + 9] : [zFront - 9, zFront + 1];
      let clear = true;
      for (let cx = x - 3; cx <= x + w + 2 && clear; cx++) {
        for (let cz = Math.min(...zs); cz <= Math.max(...zs) && clear; cz++) {
          if (ctx.onPath(cx, cz) || ctx.inWater(cx, cz) || ctx.inZone(cx, cz, 1) || reserved.some((r) => cx >= r.x0 && cx <= r.x1 && cz >= r.z0 && cz <= r.z1)) clear = false;
        }
      }
      if (!clear) {
        x += 2;
        continue;
      }
      shophouse(x, zFront, w, facing);
      x += w + 1 + (houses % 2);
    }
  };

  let plots = 0;
  /**
   * A vegetable plot (inclusive) on the rolling ground: tilled earth, crop rows every other row (greens,
   * carrots and pumpkins, cabbages, flowers), a fence along the side facing `fenceZ` (a road), kept clear.
   */
  const plot = (x0: number, z0: number, x1: number, z1: number, fenceZ?: number): void => {
    const n = plots++;
    const crop = n % 6;
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        if (ctx.onPath(x, z) || ctx.inWater(x, z)) continue;
        const y = ctx.surface(x, z);
        set(x, y, z, B.dirt);
        if ((z - z0) % 2 !== 1 || x === x0 || x === x1 || z === z1) continue;
        if (crop === 0 || crop === 3) set(x, y + 1, z, B.leaves);
        else if (crop === 1) set(x, y + 1, z, B.autumn);
        else if (crop === 5) set(x, y + 1, z, (x + z) % 4 === 0 ? B.pink : B.leaves);
        else if (crop === 2 && (x - x0) % 3 === 1) ctx.prop(M.cabbage, x, z, (x * 37 + z * 11) % 360);
        else if (crop === 4 && (x - x0) % 4 === 2) ctx.prop(M.pumpkin, x, z, (x * 37 + z * 11) % 360);
      }
    }
    if (fenceZ !== undefined) for (let x = x0; x <= x1; x += 2) if (!ctx.onPath(x, fenceZ) && !ctx.inWater(x, fenceZ)) ctx.prop(M.fence, x, fenceZ, 0);
    ctx.keepOut(x0, z0, x1, z1);
  };

  return { B, base, set, box, stall, tent, house, shophouse, shopRow, plot };
}
export async function generateChoPhien() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'cho-phien',
    seedText: 'miu-cho-phien',
    outland: 'market',
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    shape: (x, z, h) => {
      const k = flatness(x, z);
      return h * (1 - k) + 12 * k;
    },
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: { skip: 0.55, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.32 ? 'leaves-pink' : roll < 0.4 ? 'leaves-autumn' : 'leaves') }) },
    dressing: { models: [M.basket, M.crate, M.barrel, M.bucket, M.flowerRed, M.flowerYellow, M.flowerPurple, M.pumpkin, M.cabbage], spacing: 6 },
    // Toy boats and small frames on the stalls (content/world/models.json has the usual sizes).
    sizes: { [M.toyBoat]: 0.6, [M.picture]: 0.6 },
    // Market day: sellers calling at every row, shoppers answering, porters carrying loads, the canal's
    // boatmen, the animals for sale, children at the games.
    life: ({ landmark }) => [
      ...crowd('vendor', ['Cô bán hoa', 'Bà bán hoa cúc'], [person('e'), person('i')], landmark('sap-hoa-huong-duong'), 8, 4, [LIFE_HELD.basket]),
      ...crowd('vendor', ['Bác bán rau', 'Chị bán cà rốt'], [person('b'), person('h')], landmark('sap-rau-cai'), 8, 4, [LIFE_HELD.cabbage]),
      ...crowd('vendor', ['Chú bán quả', 'Cô bán ổi'], [person('k'), person('l')], landmark('hang-qua'), 8, 3, [LIFE_HELD.apple]),
      ...crowd('vendor', ['Bác bán đồ tre'], [person('a')], landmark('sap-do-tre'), 5, 2, [LIFE_HELD.basket]),
      ...crowd('vendor', ['Cô bán đèn lồng'], [person('h')], landmark('sap-den-long'), 5, 2, [LIFE_HELD.basket]),
      ...crowd('shopper', ['Cô đi chợ', 'Bác đi chợ', 'Mẹ đi chợ'], [person('c'), person('g'), person('l'), person('e')], landmark('day-sap-rau-hoa'), 22, 10, [LIFE_HELD.basket]),
      ...crowd('porter', ['Chú gánh hàng', 'Bác khuân rau'], [person('j'), person('m')], landmark('cong-cho'), 12, 4, [LIFE_HELD.crate]),
      ...crowd('pupil', ['Bạn kéo co', 'Bạn ném rổ'], [person('f'), person('n'), person('o'), person('q')], landmark('bai-keo-co'), 8, 6),
      ...crowd('hen-keeper', ['Bà bán gà vịt'], [person('i')], landmark('ao-vit'), 8, 1, [LIFE_HELD.basket, LIFE_HELD.basket]),
      ...crowd('chick', ['Gà con'], [animal('chick')], landmark('ao-vit'), 8, 8),
      ...crowd('pig', ['Lợn giống'], [animal('pig')], landmark('chuong-lon-giong'), 6, 4),
      ...crowd('cow', ['Bò kéo xe'], [animal('cow')], landmark('bai-buoc-xe-bo'), 8, 3),
      ...crowd('vendor', ['Cô bán cân', 'Bác cân hàng'], [person('e'), person('b')], landmark('quay-can'), 8, 3, [LIFE_HELD.basket]),
      ...crowd('vendor', ['Chị bán nước'], [person('h')], landmark('quay-nuoc'), 6, 2, [LIFE_HELD.bucket]),
      ...crowd('home-cook', ['Bà nấu chè'], [person('i')], landmark('bep-che'), 4, 2, [LIFE_HELD.basket]),
      ...crowd('shopper', ['Khách mua chè', 'Bác mua gạo'], [person('c'), person('k'), person('g')], landmark('bep-che'), 12, 5, [LIFE_HELD.basket]),
      ...crowd('porter', ['Chú khuân bao gạo'], [person('j'), person('m')], landmark('kho-gao'), 8, 3, [LIFE_HELD.crate]),
      ...crowd('ferryman', ['Bác chèo thuyền hàng'], [person('m'), person('a')], landmark('ben-hang-ben-kenh'), 10, 3, [LIFE_HELD.paddle]),
      ...crowd('ploughman', ['Bác trồng rau'], [person('a'), person('e')], landmark('ruong-rau-ngoai-o'), 24, 4),
      ...crowd('dog', ['Cún chợ'], [animal('dog')], landmark('pho-cho'), 20, 4),
      ...crowd('cat', ['Mèo hàng cá'], [animal('cat')], landmark('vuon-hoa-giua-pho'), 12, 3),
      ...crowd('chick', ['Gà ri'], [animal('chick')], landmark('cong-cho'), 10, 6),
      ...crowd('dog', ['Chó giữ kho'], [animal('dog')], landmark('kho-gao'), 12, 3),
      ...crowd('cat', ['Mèo nằm bếp'], [animal('cat')], landmark('bep-che'), 9, 3),
    ],
    build: (ctx) => {
      const kit = marketKit(ctx);
      const { B, base, shopRow, plot } = kit;
      const { world, rng } = ctx;
      ctx.keepOut(SPAWN_YARD.x0, SPAWN_YARD.z0, SPAWN_YARD.x1, SPAWN_YARD.z1);
      buildSquares(ctx, kit);
      buildFlowerMarket(ctx, kit);
      buildWeighingRow(ctx, kit);
      buildCanal(ctx, kit);

      // The market street and the middle lane: shophouses on both sides wherever no zone or road is.
      shopRow(24, 776, ROAD_Z.street - 5, 's', [SPAWN_YARD]);
      shopRow(24, 776, ROAD_Z.street + 5, 'n');
      for (const [x0, x1] of [[24, 124], [316, 512], [668, 776]] as const) {
        shopRow(x0, x1, ROAD_Z.lane - 5, 's');
        shopRow(x0, x1, ROAD_Z.lane + 5, 'n');
      }
      ctx.landmark('pho-cho', 'Phố chợ', 330, ROAD_Z.street);

      // Hamlets of cottages round shared yards: between the districts, west and east of them, along the outer lanes.
      for (const [x0, x1] of SEGMENTS) {
        hamlet(ctx, x0, ROAD_Z.north + 4, x1, 186);
        hamlet(ctx, x0, 494, x1, 540);
        hamlet(ctx, x0, ROAD_Z.south + 6, x1, 668);
      }
      for (const [x0, x1] of [[26, 54], [67, 124], [318, 402], [668, 733], [747, 776]] as const) {
        hamlet(ctx, x0, 304, x1, 358);
        hamlet(ctx, x0, 388, x1, 444);
      }
      hamlet(ctx, 418, 388, 512, 444);

      // The fountain garden between the districts.
      const garden = { x: 462, z: 330 };
      placeFountain(world, garden.x, garden.z, base, { stone: B.grey, water: B.water });
      ctx.keepOut(garden.x - 5, garden.z - 5, garden.x + 5, garden.z + 5);
      for (const [dx, dz] of [[-24, -18], [12, -18], [-24, 12], [12, 12]] as const) flowerBed(ctx, garden.x + dx, garden.z + dz, 12, 6);
      for (const [i, dx] of [-8, 0, 8].entries()) for (const dz of [-8, 8]) ctx.prop(M.bench, garden.x + dx, garden.z + dz, dz < 0 ? 0 : 180 + i);
      for (const [dx, dz] of [[-30, -6], [30, -6], [-30, 8], [30, 8], [0, -22], [0, 22]] as const) {
        placeTree(world, garden.x + dx, base, garden.z + dz, 6, { log: B.treeLog, leaves: B.pink }, rng);
        ctx.keepOut(garden.x + dx - 1, garden.z + dz - 1, garden.x + dx + 1, garden.z + dz + 1);
      }
      ctx.keepOut(garden.x - 36, garden.z - 26, garden.x + 36, garden.z + 26);
      ctx.landmark('vuon-hoa-giua-pho', 'Vườn hoa giữa phố', garden.x, garden.z - 6);

      // Outskirts: vegetable plots north of the town and south of the canal, thin woods beyond.
      for (const [x0, x1] of SEGMENTS) {
        for (let x = x0; x + 20 <= x1; x += 44) {
          const xe = Math.min(x + 39, x1);
          plot(x, 192, xe, 222, 190);
          plot(x, 228, xe, 252, 254);
          plot(x, 548, xe, 578, 546);
          plot(x, 584, xe, 612, 614);
          if (((x - x0) / 44) % 2 === 0) plot(x, 682, xe, 714, 680);
          if (((x - x0) / 44) % 2 === 1) plot(x, 46, xe, 80, 84);
        }
      }
      ctx.landmark('ruong-rau-ngoai-o', 'Ruộng rau ngoại ô', 300, 220);

      for (const [i, route] of ROUTES.entries()) lampRow(ctx, route, 20 + (i % 3) * 2);
      bambooHedge(ctx, [[20, 20], [780, 20]]);
      bambooHedge(ctx, [[20, 780], [780, 780]]);
      bambooHedge(ctx, [[20, 20], [20, 780]]);
      bambooHedge(ctx, [[780, 20], [780, 780]]);
    },
  });
}

type Kit = ReturnType<typeof marketKit>;

/** Brick squares of both markets (a border and a grid of grey brick on the path floor) and lamps along their lanes. */
function buildSquares(ctx: ZoneMapContext, kit: Kit): void {
  for (const zn of ZONES) {
    for (let x = zn.x - zn.hx; x <= zn.x + zn.hx; x++) {
      for (let z = zn.z - zn.hz; z <= zn.z + zn.hz; z++) {
        if (ctx.onPath(x, z) || ctx.inWater(x, z)) continue;
        const border = Math.abs(x - zn.x) >= zn.hx - 1 || Math.abs(z - zn.z) >= zn.hz - 1;
        if (border || (x - zn.x) % 12 === 0 || (z - zn.z) % 12 === 0) kit.set(x, ctx.ground, z, kit.B.grey);
      }
    }
    for (let d = -zn.hx + 8; d <= zn.hx - 8; d += 14) for (const side of [-3, 3]) ctx.prop(M.lamp, zn.x + d, zn.z + side, side > 0 ? 90 : 270);
    for (let d = -zn.hz + 8; d <= zn.hz - 8; d += 14) for (const side of [-3, 3]) if (Math.abs(d) > 4) ctx.prop(M.lamp, zn.x + side, zn.z + d, side > 0 ? 0 : 180);
  }
}

/** Chapter 1: the flower and vegetable market, quarter by quarter round its crossroads, its gates and its yards. */
function buildFlowerMarket(ctx: ZoneMapContext, kit: Kit): void {
  const { B, base, set, box, stall, tent } = kit;
  const { world, rng } = ctx;
  const zn = ctx.zone(1);
  const [cx, cz] = [zn.x, zn.z];
  const top = zn.z - zn.hz;

  // The market gate on the road from the street: two brick pillars, a red beam, and the watch hut beside it.
  for (const px of [cx - 6, cx + 4]) box(px, base, top - 1, px + 2, base + 5, top + 1, B.brick);
  box(cx - 6, base + 6, top - 1, cx + 6, base + 6, top + 1, B.red);
  for (let x = cx - 6; x <= cx + 6; x += 2) set(x, base + 7, top, B.sand);
  ctx.keepOut(cx - 7, top - 2, cx + 7, top + 2);
  ctx.landmark('cong-cho', 'Cổng chợ', cx, top - 3);
  const hut = { x0: cx - 18, z0: top + 2 };
  for (const [dx, dz] of [[0, 0], [4, 0], [0, 4], [4, 4]] as const) box(hut.x0 + dx, base, hut.z0 + dz, hut.x0 + dx, base + 4, hut.z0 + dz, B.log);
  box(hut.x0, base + 5, hut.z0, hut.x0 + 4, base + 5, hut.z0 + 4, B.planks);
  for (let i = 0; i <= 4; i++) for (const [x, z] of [[hut.x0 + i, hut.z0], [hut.x0 + i, hut.z0 + 4], [hut.x0, hut.z0 + i], [hut.x0 + 4, hut.z0 + i]] as const) set(x, base + 6, z, B.planks);
  for (let k = 0; k <= 2; k++) box(hut.x0 - 1 + k, base + 8 + k, hut.z0 - 1 + k, hut.x0 + 5 - k, base + 8 + k, hut.z0 + 5 - k, B.blue);
  for (const [dx, dz] of [[0, 0], [4, 0], [0, 4], [4, 4]] as const) box(hut.x0 + dx, base + 6, hut.z0 + dz, hut.x0 + dx, base + 7, hut.z0 + dz, B.log);
  ctx.keepOut(hut.x0 - 1, hut.z0 - 1, hut.x0 + 5, hut.z0 + 5);
  ctx.landmark('choi-canh-cong-cho', 'Chòi canh cổng chợ', hut.x0 + 2, hut.z0 + 2);
  // The back gate where the lane leaves the market west.
  const west = zn.x - zn.hx;
  for (const pz of [cz - 7, cz + 5]) box(west - 1, base, pz, west + 1, base + 4, pz + 2, B.planks);
  box(west - 1, base + 5, cz - 7, west + 1, base + 5, cz + 7, B.red);
  ctx.keepOut(west - 2, cz - 8, west + 2, cz + 8);
  ctx.landmark('cong-sau-cho', 'Cổng sau chợ', west + 3, cz);

  // North-west: the flower rows, facing each other across the walk between them, the hives under a tent.
  const x0 = zn.x - zn.hx + 6;
  const rowA: Kind[] = ['sunflower', 'sunflower', 'chrysanthemum', 'chrysanthemum', 'hibiscus', 'hibiscus', 'seeds', 'seeds'];
  const rowB: Kind[] = ['pictures', 'flowers', 'hibiscus', 'seeds', 'sunflower', 'chrysanthemum', 'pictures', 'flowers'];
  rowA.forEach((kind, i) => stall(x0 + i * 10, top + 8, kind, 's'));
  rowB.forEach((kind, i) => stall(x0 + i * 10, top + 21, kind, 'n'));
  ctx.landmark('day-sap-rau-hoa', 'Lối đi giữa hai dãy sạp', x0 + 40, top + 16);
  ctx.landmark('sap-hoa-huong-duong', 'Sạp hoa hướng dương', x0 + 8, top + 16);
  ctx.landmark('sap-hoa-cuc', 'Sạp hoa cúc', x0 + 28, top + 16);
  ctx.landmark('hang-hoa-dam-but', 'Hàng hoa dâm bụt', x0 + 48, top + 16);
  ctx.landmark('hang-hat-giong', 'Hàng hạt giống', x0 + 68, top + 16);
  ctx.landmark('sap-tranh-hoa-giay', 'Sạp tranh hoa giấy', x0 + 2, top + 18);
  const hives = { x0: x0, z0: top + 36 };
  tent(hives.x0, hives.z0, 9, 5, 's');
  for (let i = 0; i < 3; i++) ctx.prop(M.crate, hives.x0 + 2 + i * 2, hives.z0 + 2, i * 15);
  ctx.landmark('to-ong-duoi-mai-leu', 'Tổ ong dưới mái lều', hives.x0 + 4, hives.z0 + 7);
  const rowC: Kind[] = ['flowers', 'seeds', 'hibiscus', 'pictures', 'chrysanthemum', 'flowers'];
  rowC.forEach((kind, i) => stall(x0 + 14 + i * 10, top + 36, kind, 's'));
  const rowD: Kind[] = ['seeds', 'sunflower', 'flowers', 'chrysanthemum', 'hibiscus', 'seeds', 'pictures', 'flowers'];
  rowD.forEach((kind, i) => stall(x0 + i * 10, top + 49, kind, 'n'));
  flowerBed(ctx, x0, top + 57, 40, 4);
  ctx.keepOut(x0, top + 57, x0 + 39, top + 60);

  // North-east: the gourd trellis, the gourd and vegetable rows, the pumpkin pile, bamboo beds of greens,
  // the washing trough, the soup stall at the end of the row with its water jars behind.
  const ne = cx + 8;
  const trellis = { x0: ne, z0: top + 6, x1: ne + 14, z1: top + 18 };
  for (let x = trellis.x0; x <= trellis.x1; x += 7) for (let z = trellis.z0; z <= trellis.z1; z += 6) box(x, base, z, x, base + 2, z, B.log);
  box(trellis.x0, base + 3, trellis.z0, trellis.x1, base + 3, trellis.z1, B.leaves);
  for (let x = trellis.x0 + 1; x < trellis.x1; x += 2) for (let z = trellis.z0 + 1; z < trellis.z1; z += 3) ctx.propAt(M.cucumber, [x + 0.5, base + 2.3, z + 0.5], (x * 31) % 360);
  for (let x = trellis.x0 + 2; x < trellis.x1; x += 4) ctx.prop(M.pumpkin, x, trellis.z1 - 1, x * 20);
  ctx.landmark('gian-bau-ban-giong', 'Giàn bầu bán giống', ne + 7, top + 12);
  const rowE: Kind[] = ['gourds', 'gourds', 'toys', 'carrots', 'carrots', 'greens'];
  const rowF: Kind[] = ['greens', 'greens', 'carrots', 'gourds', 'vegetables', 'greens'];
  rowE.forEach((kind, i) => stall(ne + 20 + i * 10, top + 8, kind, 's'));
  rowF.forEach((kind, i) => stall(ne + 20 + i * 10, top + 21, kind, 'n'));
  ctx.landmark('sap-bi-muop', 'Sạp bí mướp', ne + 23, top + 16);
  ctx.landmark('sap-tau-go-do-choi', 'Sạp tàu gỗ cạnh hàng bầu bí', ne + 43, top + 16);
  ctx.landmark('sap-ca-rot', 'Sạp cà rốt', ne + 58, top + 16);
  ctx.landmark('sap-rau-cai', 'Sạp rau cải', ne + 73, top + 18);
  const pile = { x: ne + 6, z: top + 28 };
  for (const [layer, n, y] of [[0, 4, 0], [1, 3, 0.55], [2, 2, 1.1], [3, 1, 1.6]] as const) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) ctx.propAt(M.pumpkin, [pile.x + 0.5 + (i - (n - 1) / 2) * 0.8, base + y, pile.z + 0.5 + (j - (n - 1) / 2) * 0.8], (i * 47 + j * 31 + layer * 13) % 360);
  }
  ctx.keepOut(pile.x - 2, pile.z - 2, pile.x + 2, pile.z + 2);
  ctx.landmark('dong-bi-ngo', 'Đống bí ngô ở hàng bầu bí', pile.x, pile.z);
  for (let i = 0; i < 3; i++) {
    const bx = ne + 22 + i * 10;
    box(bx, base, top + 31, bx + 3, base, top + 32, B.birch);
    for (let k = 0; k < 4; k++) ctx.propAt(k % 2 ? M.cabbage : M.carrot, [bx + k + 0.5, base + 1, top + 31.5 + (k % 2)], k * 40);
    ctx.keepOut(bx - 1, top + 30, bx + 4, top + 33);
  }
  ctx.landmark('chong-tre-ban-rau', 'Chõng tre bán rau', ne + 34, top + 28);
  const trough = { x0: ne + 54, z0: top + 30 };
  box(trough.x0, base, trough.z0, trough.x0 + 9, base, trough.z0 + 3, B.planks);
  box(trough.x0 + 1, base, trough.z0 + 1, trough.x0 + 8, base, trough.z0 + 2, B.water);
  for (let i = 0; i < 3; i++) ctx.prop(M.bucket, trough.x0 + 1 + i * 4, trough.z0 - 1, i * 50);
  ctx.keepOut(trough.x0 - 1, trough.z0 - 1, trough.x0 + 10, trough.z0 + 4);
  ctx.landmark('mang-nuoc-rua-rau', 'Máng nước rửa rau', trough.x0 + 4, trough.z0 - 2);
  const rowG: Kind[] = ['gourds', 'greens', 'vegetables', 'gourds', 'carrots', 'fruit', 'greens'];
  rowG.forEach((kind, i) => stall(ne + 2 + i * 10, top + 38, kind, 's'));
  const rowH: Kind[] = ['vegetables', 'carrots', 'vegetables', 'fruit', 'greens', 'gourds', 'soup'];
  rowH.forEach((kind, i) => stall(ne + 2 + i * 10, top + 50, kind, 'n'));
  const soup = { x: ne + 62, z: top + 50 };
  for (const dx of [-1, 4]) ctx.prop(M.bench, soup.x + dx, soup.z - 4, 0);
  for (let i = 0; i < 3; i++) ctx.prop(M.barrel, soup.x + 1 + i * 2, soup.z + 6, i * 30);
  ctx.keepOut(soup.x - 1, soup.z + 5, soup.x + 6, soup.z + 7);
  ctx.landmark('quan-canh-cuoi-day', 'Quán canh cuối dãy', soup.x + 2, soup.z - 3);
  ctx.landmark('chum-nuoc-sau-quan', 'Chum nước sau quán', soup.x + 3, soup.z + 8);

  // South-west: the bamboo goods, the bamboo-ware stalls and the post box beside them, the lantern and star
  // lantern rows, the seedling greenhouse with its brick yard, the nursery beds.
  const sw = { x: zn.x - zn.hx + 6, z: cz + 6 };
  for (let i = 0; i < 16; i++) ctx.prop(M.bamboo, sw.x + (i % 8) * 2, sw.z + 2 + Math.floor(i / 8) * 3, i * 50);
  for (let r = 0; r < 2; r++) box(sw.x, base, sw.z + 9 + r * 2, sw.x + 12, base + (r === 0 ? 1 : 0), sw.z + 9 + r * 2, B.birch);
  ctx.keepOut(sw.x - 1, sw.z + 1, sw.x + 16, sw.z + 12);
  ctx.landmark('hang-tre-nua', 'Hàng tre nứa', sw.x + 8, sw.z + 6);
  stall(sw.x + 20, sw.z + 2, 'bamboo', 's');
  stall(sw.x + 30, sw.z + 2, 'bamboo', 's');
  (['bamboo', 'toys', 'pictures'] as const).forEach((kind, i) => stall(sw.x + 46 + i * 10, sw.z + 2, kind, 's'));
  ctx.landmark('sap-do-tre', 'Sạp đồ tre', sw.x + 26, sw.z + 9);
  const post = { x: sw.x + 40, z: sw.z + 5 };
  set(post.x, base, post.z, B.log);
  set(post.x, base + 1, post.z, B.red);
  ctx.keepOut(post.x - 1, post.z - 1, post.x + 1, post.z + 1);
  ctx.landmark('hom-thu-canh-hang-tre', 'Hòm thư cạnh hàng tre', post.x, post.z + 2);
  const lanterns: Kind[] = ['lanterns', 'stars', 'lanterns', 'stars', 'lanterns', 'stars', 'lanterns'];
  lanterns.forEach((kind, i) => {
    const sx = sw.x + i * 10;
    const { front, out } = stall(sx, sw.z + 20, kind, 's');
    for (let x = sx; x < sx + 6; x++) {
      if (kind === 'lanterns') set(x, base + 2, front + out, (x - sx) % 2 === 0 ? B.red : B.sand);
      else if ((x - sx) % 2 === 1) ctx.propAt(M.star, [x + 0.5, base + 2.1, front + out + 0.5], x * 30);
    }
  });
  ctx.landmark('sap-den-long', 'Sạp đèn lồng', sw.x + 3, sw.z + 27);
  ctx.landmark('sap-den-ong-sao', 'Sạp đèn ông sao dưới mái lều', sw.x + 13, sw.z + 27);
  const glass = { x0: sw.x + 4, z0: sw.z + 40, w: 18, d: 11 };
  placeHouse(world, glass.x0, glass.z0, glass.w, glass.d, 4, base, { wall: B.glass, roof: B.glass, trim: B.birch });
  const doorX = glass.x0 + Math.floor(glass.w / 2);
  for (const [bx0, bx1] of [[glass.x0 + 2, doorX - 3], [doorX + 2, glass.x0 + glass.w - 3]] as const) {
    box(bx0, base, glass.z0 + 2, bx1, base, glass.z0 + glass.d - 3, B.planks);
    for (let x = bx0; x <= bx1; x += 2) for (let z = glass.z0 + 2; z <= glass.z0 + glass.d - 3; z += 2) ctx.propAt(M.seedling, [x + 0.5, base + 1, z + 0.5], (x * 13 + z * 7) % 360);
  }
  for (let x = glass.x0 - 2; x < glass.x0 + glass.w + 2; x++) for (let z = glass.z0 - 6; z < glass.z0; z++) set(x, ctx.ground, z, B.brick);
  ctx.keepOut(glass.x0 - 1, glass.z0 - 1, glass.x0 + glass.w, glass.z0 + glass.d);
  ctx.landmark('nha-kinh-cay-giong', 'Nhà kính bán cây giống', doorX, glass.z0 - 3);
  ctx.landmark('san-gach-truoc-nha-kinh', 'Sân gạch trước nhà kính', doorX - 6, glass.z0 - 3);
  (['seeds', 'flowers', 'seeds', 'pictures', 'flowers'] as const).forEach((kind, i) => stall(sw.x + 30 + i * 10, sw.z + 32, kind, 's'));
  for (let i = 0; i < 4; i++) {
    const bedX = sw.x + 30 + (i % 2) * 24;
    const bedZ = sw.z + 44 + Math.floor(i / 2) * 9;
    for (let x = 0; x < 18; x += 2) for (let z = 0; z < 4; z += 2) ctx.prop(i % 2 ? M.seedling : FLOWER_PROPS[(x + z) % 3] ?? M.flowerRed, bedX + x, bedZ + z, x * 20);
    ctx.keepOut(bedX, bedZ, bedX + 17, bedZ + 3);
  }
  ctx.landmark('vuon-uom-cay', 'Vườn ươm cây giống', sw.x + 50, sw.z + 46);

  // South-east: the fruit row with the guava price board, the old apple tree beside it, the pig pen, the
  // dovecote, the ox carts and the straw stack, the basket-throwing and tug-of-war grounds, the duck pond.
  const se = { x: cx + 8, z: cz + 6 };
  const fruit: Kind[] = ['apples', 'guava', 'fruit', 'guava', 'apples'];
  fruit.forEach((kind, i) => stall(se.x + i * 10, se.z, kind, 's'));
  ctx.landmark('hang-qua', 'Hàng quả', se.x + 23, se.z + 8);
  const board = { x: se.x + 11, z: se.z + 8 };
  for (const dx of [0, 4]) box(board.x + dx, base, board.z, board.x + dx, base + 2, board.z, B.log);
  box(board.x + 1, base + 1, board.z, board.x + 3, base + 2, board.z, B.board);
  ctx.keepOut(board.x - 1, board.z - 1, board.x + 5, board.z + 1);
  ctx.landmark('bang-gia-hang-oi', 'Bảng giá ở hàng ổi', board.x + 2, board.z - 2);
  const apple = { x: se.x + 64, z: se.z + 6 };
  placeAncientTree(world, apple.x, base, apple.z, { log: B.treeLog, leaves: B.leaves, core: B.log }, rng);
  for (let dx = -8; dx <= 8; dx++) for (let dy = 9; dy <= 19; dy++) for (let dz = -8; dz <= 8; dz++) {
    if (world.get(apple.x + dx, base + dy, apple.z + dz) === B.leaves && (dx * 7 + dy * 3 + dz * 5) % 11 === 0) set(apple.x + dx, base + dy, apple.z + dz, B.red);
  }
  for (let i = 0; i < 8; i++) ctx.prop(M.apple, apple.x + Math.round(Math.cos(i) * 4), apple.z + Math.round(Math.sin(i) * 4), i * 45);
  ctx.prop(M.basket, apple.x - 3, apple.z + 3, 30);
  ctx.keepOut(apple.x - 3, apple.z - 3, apple.x + 3, apple.z + 3);
  ctx.landmark('goc-tao-ben-hang-qua', 'Cây táo già bên hàng quả', apple.x, apple.z - 5);
  const pen = { x0: se.x, z0: se.z + 14, x1: se.x + 10, z1: se.z + 22 };
  for (let x = pen.x0; x <= pen.x1; x += 2) for (const z of [pen.z0, pen.z1]) ctx.prop(M.fence, x, z, 0);
  for (let z = pen.z0 + 2; z < pen.z1; z += 2) for (const x of [pen.x0, pen.x1]) ctx.prop(M.fence, x, z, 90);
  box(pen.x0 + 2, base, pen.z1 - 2, pen.x0 + 5, base, pen.z1 - 2, B.planks);
  ctx.keepOut(pen.x0, pen.z0, pen.x1, pen.z1);
  ctx.landmark('chuong-lon-giong', 'Chuồng lợn giống góc chợ', pen.x0 + 5, pen.z0 + 4);
  const dove = { x: se.x + 18, z: se.z + 18 };
  box(dove.x, base, dove.z, dove.x, base + 3, dove.z, B.log);
  box(dove.x - 1, base + 4, dove.z - 1, dove.x + 1, base + 5, dove.z + 1, B.planks);
  set(dove.x, base + 5, dove.z - 1, B.snow);
  box(dove.x - 2, base + 6, dove.z - 2, dove.x + 2, base + 6, dove.z + 2, B.red);
  set(dove.x, base + 7, dove.z, B.red);
  ctx.keepOut(dove.x - 1, dove.z - 1, dove.x + 1, dove.z + 1);
  ctx.landmark('long-bo-cau', 'Lồng bồ câu góc chợ', dove.x, dove.z - 3);
  for (const [i, kx] of [se.x + 26, se.x + 34].entries()) {
    const kz = se.z + 16;
    box(kx, base, kz, kx + 2, base, kz + 4, B.planks);
    box(kx, base + 1, kz + 1, kx + 2, base + 1, kz + 4, B.sand);
    for (const wx of [kx - 1, kx + 3]) set(wx, base, kz + 2, B.log);
    box(kx + 1, base, kz - 3, kx + 1, base, kz - 1, B.birch);
    ctx.keepOut(kx - 1, kz - 3, kx + 3, kz + 5);
    if (i === 0) ctx.landmark('bai-buoc-xe-bo', 'Bãi buộc xe bò', kx + 5, kz - 3);
  }
  const straw = { x: se.x + 48, z: se.z + 20 };
  for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
    const h = 3 - Math.round(Math.hypot(dx, dz));
    for (let y = 0; y < h; y++) set(straw.x + dx, base + y, straw.z + dz, B.sand);
  }
  ctx.keepOut(straw.x - 3, straw.z - 3, straw.x + 3, straw.z + 3);
  ctx.landmark('dong-rom-sau-xe', 'Đống rơm sau xe', straw.x, straw.z - 5);
  const court = { x0: se.x, z0: se.z + 30, x1: se.x + 16, z1: se.z + 56 };
  for (let x = court.x0; x <= court.x1; x++) for (let z = court.z0; z <= court.z1; z++) {
    if (x === court.x0 || x === court.x1 || z === court.z0 || z === court.z1 || z === (court.z0 + court.z1) / 2) set(x, ctx.ground, z, B.snow);
  }
  ctx.prop(M.hoop, (court.x0 + court.x1) / 2, court.z0 + 1, 0);
  ctx.prop(M.hoop, (court.x0 + court.x1) / 2, court.z1 - 1, 180);
  for (let i = 0; i < 4; i++) ctx.prop(M.basket, court.x1 + 2, court.z0 + 4 + i * 6, i * 70);
  ctx.landmark('bai-nem-ro-tre', 'Bãi ném rổ tre', (court.x0 + court.x1) / 2, (court.z0 + court.z1) / 2 + 4);
  const tug = { x0: se.x + 24, z0: se.z + 38, x1: se.x + 50, z1: se.z + 46 };
  for (let x = tug.x0; x <= tug.x1; x++) for (let z = tug.z0; z <= tug.z1; z++) {
    if (x === tug.x0 || x === tug.x1 || z === tug.z0 || z === tug.z1) set(x, ctx.ground, z, B.brick);
    else if (x === (tug.x0 + tug.x1) / 2) set(x, ctx.ground, z, B.snow);
    else if (z === (tug.z0 + tug.z1) / 2) set(x, ctx.ground, z, B.log);
  }
  ctx.landmark('bai-keo-co', 'Bãi kéo co', (tug.x0 + tug.x1) / 2, tug.z0 + 2);
  (['fruit', 'apples', 'guava'] as const).forEach((kind, i) => stall(se.x + 22 + i * 10, se.z + 50, kind, 'n'));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.propAt(M.lily, [DUCK_POND.x + Math.cos(a) * 3.5 + 0.5, WATER_LEVEL + 1.02, DUCK_POND.z + Math.sin(a) * 3.5 + 0.5], i * 40);
  }
  for (let i = 0; i < 6; i++) ctx.prop(M.bamboo, DUCK_POND.x - 9 + i, DUCK_POND.z + 8, i * 60);
  ctx.landmark('ao-vit', 'Ao vịt', DUCK_POND.x, DUCK_POND.z);
}

/** Chapter 2: the weighing row: scales, fruit and cakes, the drinks counter, the sweet-soup kitchen, the stores. */
function buildWeighingRow(ctx: ZoneMapContext, kit: Kit): void {
  const { B, base, set, box, stall, tent, house } = kit;
  const zn = ctx.zone(2);
  const [cx, cz] = [zn.x, zn.z];
  const top = zn.z - zn.hz;
  const left = zn.x - zn.hx + 5;
  /** A dial scale on a counter: a white face in a red rim on a post. */
  const dial = (x: number, y: number, z: number): void => {
    set(x, y, z, B.log);
    set(x, y + 1, z, B.snow);
    set(x - 1, y + 1, z, B.red);
    set(x + 1, y + 1, z, B.red);
  };
  /** A platform scale: a grey brick slab with a post and a dial, sacks on it. */
  const platform = (x: number, z: number): void => {
    box(x, base, z, x + 1, base, z + 1, B.grey);
    dial(x + 2, base, z + 1);
    ctx.propAt(M.bag, [x + 1, base + 1, z + 1], 30);
    ctx.keepOut(x - 1, z - 1, x + 3, z + 2);
  };

  // North-west: two double rows, the scale stalls facing the fruit and cake stalls across their walks; the
  // ledger table and the platform scales between them.
  const rows: Array<[number, Facing, Kind[]]> = [
    [top + 4, 's', ['fruit', 'fruit', 'rice', 'fruit', 'fruit', 'cakes']],
    [top + 16, 'n', ['fruit', 'cakes', 'cakes', 'fruit', 'rice', 'fruit']],
    [top + 32, 's', ['cakes', 'fruit', 'fruit', 'fruit', 'cakes', 'rice']],
    [top + 45, 'n', ['fruit', 'cakes', 'fruit', 'rice', 'cakes', 'fruit']],
  ];
  for (const [r, [z0, facing, kinds]] of rows.entries()) {
    kinds.forEach((kind, i) => {
      const sx = left + 1 + i * 10;
      const { front } = stall(sx, z0, kind, facing);
      if ((r === 0 && i < 2) || (r === 2 && i === 2)) ctx.propAt(M.scale, [sx + 3, base + 1, front + 0.5], 0);
      if (r === 0 && i === 3) dial(sx + 3, base + 1, front);
    });
  }
  ctx.landmark('quay-can', 'Quầy cân', left + 25, top + 11);
  ctx.landmark('sap-can-dia', 'Sạp cân đĩa', left + 4, top + 11);
  ctx.landmark('sap-can-ban', 'Sạp cân bàn', left + 24, top + 11);
  ctx.landmark('sap-can-dong-ho', 'Sạp cân đồng hồ', left + 34, top + 11);
  ctx.landmark('sap-trai-cay', 'Sạp trái cây', left + 44, top + 11);
  ctx.landmark('sap-banh-ngot', 'Sạp bánh ngọt', left + 54, top + 11);
  const ledger = { x: left + 3, z: top + 25 };
  box(ledger.x, base, ledger.z, ledger.x + 2, base, ledger.z, B.planks);
  ctx.propAt(M.basket, [ledger.x + 1.5, base + 1, ledger.z + 0.5], 0);
  ctx.prop(M.bench, ledger.x + 1, ledger.z + 2, 180);
  ctx.keepOut(ledger.x - 1, ledger.z - 1, ledger.x + 3, ledger.z + 2);
  ctx.landmark('ban-so-sach', 'Bàn sổ sách', ledger.x + 1, ledger.z - 2);
  for (const [i, px] of [left + 16, left + 24, left + 32].entries()) platform(px, top + 24 + (i % 2));
  for (let i = 0; i < 4; i++) ctx.prop(i % 2 ? M.crate : M.barrel, left + 44 + i * 3, top + 25, i * 35);

  // North-east: the drinks counter and its fish tank, the shelf of cans and jars, the blackboard, the
  // measuring table; a row of drinks stalls.
  const ne = cx + 8;
  const { front } = stall(ne, top + 8, 'drinks', 'n', 14, 5);
  const tank = { x0: ne + 16, z0: top + 7 };
  box(tank.x0, base, tank.z0, tank.x0 + 4, base + 1, tank.z0 + 2, B.glass);
  box(tank.x0 + 1, base, tank.z0 + 1, tank.x0 + 3, base + 1, tank.z0 + 1, B.water);
  for (let i = 0; i < 3; i++) ctx.propAt(M.fish, [tank.x0 + 1.5 + i, base + 0.6 + (i % 2) * 0.5, tank.z0 + 1.5], i * 120);
  ctx.keepOut(tank.x0 - 1, tank.z0 - 1, tank.x0 + 5, tank.z0 + 3);
  ctx.landmark('quay-nuoc', 'Quầy nước uống', ne + 7, front - 3);
  ctx.landmark('be-ca-quay-nuoc', 'Bể cá ở quầy nước', tank.x0 + 2, tank.z0 - 2);
  const shelf = { x0: ne, z0: top + 22 };
  for (const x of [shelf.x0, shelf.x0 + 9]) box(x, base, shelf.z0, x, base + 3, shelf.z0, B.log);
  for (const y of [base, base + 2]) box(shelf.x0 + 1, y, shelf.z0, shelf.x0 + 8, y, shelf.z0, B.planks);
  for (let x = shelf.x0 + 1; x <= shelf.x0 + 8; x++) for (const y of [base + 1, base + 3]) ctx.propAt(M.soda, [x + 0.5, y, shelf.z0 + 0.5], x * 40 + y);
  for (let i = 0; i < 4; i++) ctx.prop(M.barrel, shelf.x0 + 1 + i * 2, shelf.z0 - 1, i * 25);
  ctx.keepOut(shelf.x0 - 1, shelf.z0 - 2, shelf.x0 + 10, shelf.z0 + 1);
  ctx.landmark('ke-can-binh', 'Kệ can, bình', shelf.x0 + 4, shelf.z0 - 3);
  const blackboard = { x0: ne + 14, z0: top + 22 };
  for (const x of [blackboard.x0, blackboard.x0 + 5]) box(x, base, blackboard.z0, x, base + 2, blackboard.z0, B.log);
  box(blackboard.x0 + 1, base + 1, blackboard.z0, blackboard.x0 + 4, base + 2, blackboard.z0, B.board);
  ctx.keepOut(blackboard.x0 - 1, blackboard.z0 - 1, blackboard.x0 + 6, blackboard.z0 + 1);
  ctx.landmark('bang-den-quay-nuoc', 'Bảng đen quầy nước', blackboard.x0 + 3, blackboard.z0 - 2);
  const measure = { x0: ne + 26, z0: top + 21 };
  box(measure.x0, base, measure.z0, measure.x0 + 2, base, measure.z0 + 1, B.planks);
  ctx.propAt(M.bucket, [measure.x0 + 0.5, base + 1, measure.z0 + 0.5], 0);
  ctx.propAt(M.soda, [measure.x0 + 1.5, base + 1, measure.z0 + 1.5], 0);
  ctx.propAt(M.bucket, [measure.x0 + 2.5, base + 1, measure.z0 + 1.5], 60);
  ctx.keepOut(measure.x0 - 1, measure.z0 - 1, measure.x0 + 3, measure.z0 + 2);
  ctx.landmark('ban-dong-nuoc', 'Bàn đong nước', measure.x0 + 1, measure.z0 - 2);
  (['drinks', 'cakes', 'fruit'] as const).forEach((kind, i) => stall(ne + 26 + i * 10, top + 8, kind, 'n'));
  const rowD: Kind[] = ['drinks', 'drinks', 'cakes', 'fruit', 'drinks', 'cakes'];
  const rowE: Kind[] = ['fruit', 'drinks', 'drinks', 'cakes', 'rice', 'drinks'];
  rowD.forEach((kind, i) => stall(ne + i * 10, top + 32, kind, 's'));
  rowE.forEach((kind, i) => stall(ne + i * 10, top + 45, kind, 'n'));

  // South-west: the sweet-soup kitchen in the middle of the market, its tables and benches, the jars
  // behind it; a row of stalls further south.
  const che = { x0: cx - 22, z0: cz + 8 };
  tent(che.x0, che.z0, 10, 7);
  for (const dx of [3, 6]) {
    ctx.prop(M.campfire, che.x0 + dx, che.z0 + 3, 0);
    ctx.propAt(M.pot, [che.x0 + dx + 0.5, base + 0.75, che.z0 + 3.5], dx * 20);
  }
  for (let i = 0; i < 3; i++) {
    const tx = che.x0 - 24 + i * 7;
    box(tx, base, che.z0 + 2, tx + 2, base, che.z0 + 3, B.planks);
    ctx.propAt(M.pot, [tx + 1.5, base + 1, che.z0 + 3], i * 50);
    for (const dz of [0, 5]) ctx.prop(M.bench, tx + 1, che.z0 + dz, dz ? 180 : 0);
    ctx.keepOut(tx - 1, che.z0 + 1, tx + 3, che.z0 + 4);
  }
  for (let i = 0; i < 6; i++) ctx.prop(M.barrel, che.x0 + i * 2, che.z0 + 10, i * 30);
  ctx.keepOut(che.x0 - 1, che.z0 + 9, che.x0 + 11, che.z0 + 11);
  ctx.landmark('bep-che', 'Bếp chè giữa chợ', che.x0 + 5, che.z0 - 3);
  ctx.landmark('day-binh-nuoc-sau-bep-che', 'Dãy bình nước sau bếp chè', che.x0 + 5, che.z0 + 13);
  const rowsSouth: Array<[number, Facing, Kind[]]> = [
    [cz + 21, 's', ['soup', 'fruit', 'cakes', 'soup']],
    [cz + 34, 'n', ['soup', 'fruit', 'cakes', 'soup', 'fruit']],
    [cz + 42, 's', ['fruit', 'cakes', 'rice', 'fruit', 'drinks']],
  ];
  for (const [z0, facing, kinds] of rowsSouth) kinds.forEach((kind, i) => stall(left + 1 + i * 11, z0, kind, facing));

  // South-east: the sack racks, the goods store with its door and the storekeeper's table, the rice store.
  const racks = { x0: cx + 8, z0: cz + 8 };
  for (let x = racks.x0; x <= racks.x0 + 24; x += 4) box(x, base, racks.z0, x, base + 3, racks.z0 + 1, B.log);
  for (const y of [base, base + 2]) box(racks.x0, y, racks.z0, racks.x0 + 24, y, racks.z0 + 1, B.planks);
  for (let x = racks.x0 + 1; x < racks.x0 + 24; x++) if ((x - racks.x0) % 4 !== 0) for (const y of [base + 1, base + 3]) ctx.propAt(M.bag, [x + 0.5, y, racks.z0 + 1], x * 30 + y);
  for (let i = 0; i < 8; i++) ctx.prop(M.bag, racks.x0 + 1 + i * 3, racks.z0 + 4 + (i % 2), i * 45);
  ctx.keepOut(racks.x0 - 1, racks.z0 - 1, racks.x0 + 25, racks.z0 + 2);
  ctx.landmark('gia-xep-bao-gao', 'Giá xếp bao gạo', racks.x0 + 12, racks.z0 - 2);
  ctx.landmark('giua-nhung-bao-gao', 'Giữa những bao gạo', racks.x0 + 12, racks.z0 + 7);
  const store = { x0: cx + 8, zFront: cz + 26, w: 18, d: 10 };
  house(store.x0, store.zFront, store.w, store.d, 5, 'n', { wall: B.planks, roof: B.grey, trim: B.log });
  for (let i = 0; i < 3; i++) ctx.prop(i % 2 ? M.crate : M.barrel, store.x0 + 1 + i * 2, store.zFront - 2, i * 25);
  for (let i = 0; i < 3; i++) ctx.prop(M.crate, store.x0 + 13 + i * 2, store.zFront - 2, i * 40);
  ctx.keepOut(store.x0, store.zFront - 3, store.x0 + 5, store.zFront - 1);
  ctx.keepOut(store.x0 + 12, store.zFront - 3, store.x0 + 17, store.zFront - 1);
  ctx.landmark('kho-hang', 'Kho hàng', store.x0 + 9, store.zFront - 3);
  ctx.landmark('cua-kho-hang', 'Cửa kho hàng', store.x0 + 8, store.zFront - 2);
  const keeper = { x: store.x0 + 20, z: store.zFront - 2 };
  box(keeper.x, base, keeper.z, keeper.x + 1, base, keeper.z, B.planks);
  ctx.propAt(M.basket, [keeper.x + 1, base + 1, keeper.z + 0.5], 0);
  ctx.keepOut(keeper.x - 1, keeper.z - 1, keeper.x + 2, keeper.z + 1);
  ctx.landmark('ban-thu-kho', 'Bàn thủ kho', keeper.x, keeper.z - 2);
  for (const [i, kx] of [cx + 42, cx + 52].entries()) {
    const kz = cz + 9;
    box(kx, base, kz, kx + 2, base, kz + 4, B.planks);
    for (const wx of [kx - 1, kx + 3]) set(wx, base, kz + 2, B.log);
    box(kx + 1, base, kz - 3, kx + 1, base, kz - 1, B.birch);
    for (let k = 0; k < 3; k++) ctx.propAt(k === 1 ? M.barrel : M.crate, [kx + 1.5, base + 1, kz + 1 + k * 1.3], i * 40 + k * 20);
    ctx.keepOut(kx - 1, kz - 3, kx + 3, kz + 5);
  }
  ctx.landmark('xe-cho-hang', 'Xe chở hàng', cx + 50, cz + 6);
  (['rice', 'rice', 'fruit', 'cakes', 'drinks', 'fruit'] as const).forEach((kind, i) => stall(cx + 6 + i * 10, cz + 46, kind, 'n'));
  const rice = { x0: cx + 42, zFront: cz + 28, w: 14, d: 9 };
  house(rice.x0, rice.zFront, rice.w, rice.d, 4, 'n', { wall: B.birch, roof: B.brick, trim: B.log });
  for (let i = 0; i < 5; i++) ctx.prop(M.bag, rice.x0 + 1 + i * 3, rice.zFront - 2, i * 50);
  ctx.keepOut(rice.x0, rice.zFront - 3, rice.x0 + rice.w, rice.zFront - 1);
  ctx.landmark('kho-gao', 'Kho gạo của chợ', rice.x0 + 7, rice.zFront - 4);
}

/** The canal: boats, the dragon bridge, the sluice and its inlet, the gravel bank, the shed, the goods landing. */
function buildCanal(ctx: ZoneMapContext, kit: Kit): void {
  const { B, base, set, box } = kit;
  const { ground } = ctx;
  const waterSpan = (x: number): [number, number] => {
    let z0 = ROAD_Z.bank;
    while (!inWater(x, z0) && z0 < 520) z0++;
    let z1 = z0;
    while (inWater(x, z1 + 1)) z1++;
    return [z0, z1];
  };
  const deckY = WATER_LEVEL + 1;

  // The dragon bridge on the market road: a wider deck, red rails and a red body with a yellow back rising
  // and falling along both sides, a head at the north bank and a tail at the south.
  const bx = ROAD_X.west;
  const [s0, s1] = waterSpan(bx);
  for (let z = s0 - 1; z <= s1 + 1; z++) {
    for (const dx of [-2, 2]) set(bx + dx, deckY, z, B.planks);
    const t = (z - s0) / Math.max(1, s1 - s0);
    const hump = Math.round(1.5 + 1.5 * Math.sin(t * Math.PI * 3));
    for (const dx of [-3, 3]) {
      for (let y = deckY + 1; y <= deckY + 1 + hump; y++) set(bx + dx, y, z, y === deckY + 1 + hump ? B.sand : B.red);
      set(bx + dx, deckY, z, B.planks);
    }
  }
  for (const dx of [-3, 3]) {
    const hx = bx + dx + Math.sign(dx);
    const head = ctx.surface(hx, s0 - 3) + 1;
    box(hx - 1, head, s0 - 4, hx + 1, head + 2, s0 - 2, B.red);
    set(hx, head + 3, s0 - 3, B.sand);
    set(hx, head + 1, s0 - 5, B.snow);
    const tail = ctx.surface(hx, s1 + 3) + 1;
    box(hx, tail, s1 + 2, hx, tail + 1, s1 + 3, B.red);
    set(hx, tail, s1 + 4, B.sand);
  }
  ctx.keepOut(bx - 5, s0 - 6, bx + 5, s1 + 5);
  ctx.landmark('cau-rong', 'Cầu hình rồng bắc qua kênh', bx, s0 - 1);
  ctx.landmark('chan-cau-rong', 'Chân cầu rồng bắc qua kênh', bx + 6, s0 - 3);

  // The sluice: a grey dam across the inlet with a plank gate between log posts.
  const mouth = Math.floor(canalCentre(INLET.x0) - CANAL.half) - 1;
  box(INLET.x0 - 1, WATER_LEVEL - 2, mouth, INLET.x1 + 1, ground, mouth, B.grey);
  box(INLET.x0 + 1, WATER_LEVEL - 1, mouth, INLET.x1 - 1, ground, mouth, B.planks);
  for (const x of [INLET.x0 - 1, INLET.x1 + 1]) box(x, ground + 1, mouth, x, ground + 3, mouth, B.log);
  box(INLET.x0 - 1, ground + 4, mouth, INLET.x1 + 1, ground + 4, mouth, B.log);
  ctx.keepOut(INLET.x0 - 3, INLET.z0 - 2, INLET.x1 + 3, mouth + 1);
  ctx.landmark('bo-kenh-canh-cho', 'Bờ kênh cạnh chợ', INLET.x0 + 12, ROAD_Z.bank + 3);
  ctx.landmark('cua-cong', 'Đập nhỏ và cửa cống', INLET.x0 + 2, INLET.z0 - 3);

  // The gravel bank and the wooden shed along it east of the bridge.
  for (let x = 250; x <= 300; x++) {
    for (let z = ROAD_Z.bank + 3; z < waterSpan(x)[0]; z++) {
      if (ctx.onPath(x, z)) continue;
      set(x, ctx.surface(x, z), z, (x * 7 + z * 13) % 5 === 0 ? B.stone : B.riverbed);
    }
  }
  ctx.keepOut(250, ROAD_Z.bank + 3, 300, ROAD_Z.bank + 20);
  ctx.landmark('bai-soi-ven-kenh', 'Bãi sỏi ven kênh', 275, ROAD_Z.bank + 5);
  const shed = { x0: 232, z0: ROAD_Z.bank + 4 };
  for (const [dx, dz] of [[0, 0], [7, 0], [0, 5], [7, 5]] as const) box(shed.x0 + dx, base, shed.z0 + dz, shed.x0 + dx, base + 2, shed.z0 + dz, B.log);
  box(shed.x0 - 1, base + 3, shed.z0 - 1, shed.x0 + 8, base + 3, shed.z0 + 6, B.planks);
  box(shed.x0 + 1, base, shed.z0 + 5, shed.x0 + 6, base + 2, shed.z0 + 5, B.planks);
  for (let i = 0; i < 3; i++) ctx.prop(i % 2 ? M.crate : M.barrel, shed.x0 + 2 + i * 2, shed.z0 + 3, i * 40);
  ctx.keepOut(shed.x0 - 1, shed.z0 - 1, shed.x0 + 8, shed.z0 + 6);
  ctx.landmark('lan-go-ben-kenh', 'Lán gỗ bên kênh', shed.x0 + 4, shed.z0 - 2);

  // The vegetable washing basins by the canal below the weighing row, and the goods landing on the harbour.
  const basins = { x0: 552, z0: ROAD_Z.bank + 5 };
  box(basins.x0, base, basins.z0, basins.x0 + 8, base, basins.z0 + 2, B.grey);
  box(basins.x0 + 1, base, basins.z0 + 1, basins.x0 + 7, base, basins.z0 + 1, B.water);
  for (let i = 0; i < 4; i++) ctx.prop(M.bucket, basins.x0 + 1 + i * 2, basins.z0 - 1, i * 35);
  ctx.keepOut(basins.x0 - 1, basins.z0 - 1, basins.x0 + 9, basins.z0 + 3);
  ctx.landmark('chau-rua-rau-ben-kenh', 'Chậu rửa rau bên kênh', basins.x0 + 4, basins.z0 - 2);
  for (const x of [605, 625, 645]) {
    const [z0] = waterSpan(x);
    jetty(ctx, x, z0, 10, 1, WATER_LEVEL);
  }
  for (let i = 0; i < 10; i++) {
    const x = 600 + i * 5;
    const z = waterSpan(x)[0] - 3;
    if (!ctx.onPath(x, z)) ctx.prop(i % 3 === 0 ? M.barrel : M.crate, x, z, i * 30);
    if (i % 2 === 0 && !ctx.onPath(x + 2, z)) ctx.prop(M.bag, x + 2, z, i * 20);
  }
  ctx.landmark('ben-hang-ben-kenh', 'Bến hàng bên kênh', 625, waterSpan(625)[0] - 2);

  // Boats moored along the canal away from the bridges.
  for (let x = 40; x < 770; x += 34) {
    if (Object.values(ROAD_X).some((rx) => Math.abs(rx - x) < 10) || Math.abs(x - HARBOUR.x) < HARBOUR.rx) continue;
    ctx.propAt(M.canoe, [x + 0.5, WATER_LEVEL + 0.9, canalCentre(x) + 2.5], 90);
  }
  ctx.landmark('con-kenh', 'Con kênh', 480, Math.round(canalCentre(480)));
}

await runIfMain(import.meta.url, generateChoPhien);

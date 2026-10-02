// Generates "Chợ phiên" (Toán topics 2 and 3) from a fixed seed, 800 x 800 blocks after the owner's detail mock
// of the market (designs/cho-phien/d-01…d-10, c-08, 02/10/2026): a market town by a canal, its ground the
// market's own green and warm cobbles. The flower and vegetable market (chapter 1) is a round cobbled square
// round a fountain with the white cat on it (d-01), striped stalls in a ring about it facing in, pennants
// strung lamp to lamp; north of it the timber gate with its "Chợ" sign and lanterns (d-02) opens on a lane
// of stalls between shophouses (d-09, d-10, c-08); south of it the market hall under its clock tower, a hall
// to walk into with shelves of jars, bottles and sacks. West of the square the vegetable stalls face the food
// stalls (d-03, d-04), east of it the grocery stalls face the clothes stalls (d-05, d-06); the flower stalls,
// the pet yard with its pens by the duck pond (d-08), gardens and big trees round them. A market street of
// shophouses with striped awnings leads east to the weighing row (chapter 2): fruit, rice, cake and drinks
// stalls with their scales along two crossing streets, the great balance in the square where they meet. On
// the harbour of the canal below it the fish stalls and the lighthouse (d-07). Round the town: the north
// street of shophouses, hamlets of cottages, vegetable plots, woods.
// Output: assets/generated/world/cho-phien/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain, smoothstep } from './map-kit';
import { bambooHedge, cottagePalette, flowerBed, hamlet, jetty, laneVerge } from './scenery';
import { placeHouse } from './structures/buildings';
import { bunting, marketStall, originFor, shophouse, STALL, streetLamp, type Awning, type Goods, type StallPlace } from './structures/cho-phien-market';
import { placeCatStatue, placeFountain, placeLighthouse } from './structures/countryside';
import { placePlaza } from './structures/landmarks';
import type { Point } from './structures/path';
import { placeTree } from './structures/tree';
import { type Facing, facingOf } from './structures/world-writer';
import { animal, crowd, person, type Resident } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'cho-phien';
const WATER_LEVEL = 10;

/** What the market's people hold: produce, baskets, crates. */
const HELD = {
  basket: `${PACK.props}/basket.glb`,
  apple: `${PACK.food}/apple.glb`,
  cabbage: `${PACK.food}/cabbage.glb`,
  carrot: `${PACK.food}/carrot.glb`,
  bread: `${PACK.food}/bread.glb`,
  fish: `${PACK.survival}/fish.glb`,
  flower: `${PACK.nature}/flower_redA.glb`,
  crate: `${PACK.survival}/box.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  paddle: `${PACK.nature}/canoe_paddle.glb`,
  bag: `${PACK.food}/bag.glb`,
};

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'cho-rau-hoa', name: 'Chợ rau hoa', x: 220, z: 372, hx: 88, hz: 68, floor: 'path' },
  { chapter: 2, id: 'day-hang-can-dong', name: 'Dãy hàng cân đong', x: 590, z: 372, hx: 70, hz: 60, floor: 'path' },
];

/** The canal's centre line, west to east, south of both markets. */
export function canalCentre(x: number): number {
  return 476 + 6 * Math.sin(x / 57) + 3 * Math.sin(x / 23 + 1);
}
const CANAL = { half: 6, x0: 26, x1: 774 };
/** The harbour basin below the weighing row, the inlet to the sluice, the duck pond by the pet yard. */
const HARBOUR = { x: 625, z: 474, rx: 30, rz: 12 };
const INLET = { x0: 176, x1: 179, z0: 452 };
const DUCK_POND = { x: 290, z: 424, r: 7 };

const inWater = (x: number, z: number): boolean =>
  (x >= CANAL.x0 && x <= CANAL.x1 && Math.abs(z - canalCentre(x)) < CANAL.half) ||
  ((x - HARBOUR.x) / HARBOUR.rx) ** 2 + ((z - HARBOUR.z) / HARBOUR.rz) ** 2 < 1 ||
  (x >= INLET.x0 && x <= INLET.x1 && z >= INLET.z0 && z <= canalCentre(x)) ||
  Math.hypot(x - DUCK_POND.x, z - DUCK_POND.z) < DUCK_POND.r;

/** The flower and vegetable market's square, the gate on the lane north of it, the hall south of it. */
const SQUARE = { x: 220, z: 372, r: 23 };
const GATE = { x: 220, z: 306 };
const HALL = { x0: 205, z0: 404, w: 31, d: 16 };
/** The weighing row's square where its two streets cross. */
const SCALES = { x: 590, z: 372, r: 9 };
/** The lighthouse's islet in the harbour. */
const ISLET = { x: 646, z: 475, r: 3.4 };

/** East-west ways (the north lane, the north street, the market street, the canal bank, the south lane). */
const ROAD_Z = { north: 140, street: 290, market: 372, bank: 448, south: 620 };
/** North-south ways (the gate lane, the middle lane, the dragon bridge's road, the weighing row's road, two outer lanes). */
const ROAD_X = { gate: 220, mid: 410, bridge: 320, east: 590, outerW: 60, outerE: 740 };
const ROUTES: Point[][] = [
  [[ROAD_X.gate, 30], [ROAD_X.gate, SQUARE.z - SQUARE.r + 2]],
  [[24, ROAD_Z.market], [SQUARE.x - SQUARE.r, ROAD_Z.market]],
  [[SQUARE.x + SQUARE.r, ROAD_Z.market], [776, ROAD_Z.market]],
  [[24, ROAD_Z.street], [776, ROAD_Z.street]],
  [[24, ROAD_Z.bank], [776, ROAD_Z.bank]],
  [[24, ROAD_Z.north], [776, ROAD_Z.north]],
  [[24, ROAD_Z.south], [776, ROAD_Z.south]],
  [[ROAD_X.east, 30], [ROAD_X.east, 770]],
  [[ROAD_X.mid, ROAD_Z.street], [ROAD_X.mid, ROAD_Z.bank]],
  [[ROAD_X.bridge, ROAD_Z.market], [ROAD_X.bridge, 770]],
  [[ROAD_X.outerW, ROAD_Z.north], [ROAD_X.outerW, ROAD_Z.south]],
  [[ROAD_X.outerE, ROAD_Z.north], [ROAD_X.outerE, ROAD_Z.south]],
];
const SPAWN = { x: ROAD_X.gate, z: 262 };
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

const N = PACK.nature;
const BOX = PACK.box;
const M = {
  bench: `${BOX}/park-bench.glb`,
  planter: `${BOX}/cp-planter.glb`,
  cart: `${BOX}/cp-handcart.glb`,
  hay: `${BOX}/cp-hay-bale.glb`,
  trough: `${BOX}/cp-feed-trough.glb`,
  lantern: `${BOX}/cp-hang-lantern.glb`,
  mast: `${BOX}/cp-pennant-mast.glb`,
  sign: `${BOX}/cp-sign-cho.glb`,
  clock: `${BOX}/cp-clock.glb`,
  apples: `${BOX}/cp-chalkboard-apple.glb`,
  paw: `${BOX}/cp-chalkboard-paw.glb`,
  jars: `${BOX}/cp-shelf-jars.glb`,
  bottles: `${BOX}/cp-shelf-bottles.glb`,
  tins: `${BOX}/cp-shelf-tins.glb`,
  rice: `${BOX}/cp-sack-rice.glb`,
  beans: `${BOX}/cp-sack-beans.glb`,
  corn: `${BOX}/cp-sack-corn.glb`,
  crate: `${PACK.survival}/box-large.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  scale: `${PACK.props}/balance-scale.glb`,
  basket: `${PACK.props}/basket.glb`,
  bag: `${PACK.food}/bag.glb`,
  fence: `${N}/fence_simple.glb`,
  lily: `${N}/lily_large.glb`,
  canoe: `${N}/canoe.glb`,
  pumpkin: `${N}/crop_pumpkin.glb`,
  cabbage: `${PACK.food}/cabbage.glb`,
  flowers: [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`],
  pets: { cow: animal('cow'), pig: animal('pig'), chick: animal('chick'), cat: animal('cat'), dog: animal('dog'), bunny: `${PACK.pets}/animal-bunny.glb` },
};

/** What a shopper at a stall of each trade comes for (their name: "Bà mua cá"). */
const WANTS: Readonly<Record<Goods, string>> = {
  veg: 'mua rau', fruit: 'mua hoa quả', food: 'mua đồ ăn', grocery: 'mua mắm muối', clothes: 'mua áo', fish: 'mua cá',
  flowers: 'mua hoa', rice: 'mua gạo', cakes: 'mua bánh', drinks: 'mua nước', pets: 'xem thú',
};
/** Who: kept apart from the named sellers, so a second stall of a trade gets a seller of its own name. */
const FOLK = ['Cô', 'Bác', 'Chị', 'Bà', 'Chú', 'Anh', 'Dì', 'Ông'];

/** Who keeps each trade's stalls: their names (never the same twice), how they look, what they hold. */
const SELLERS: Readonly<Record<Goods, { names: readonly string[]; models: readonly string[]; held: readonly string[] }>> = {
  veg: { names: ['Cô bán rau', 'Bác bán củ quả', 'Chị bán cải xanh', 'Bà bán hành tỏi', 'Chú bán bí ngô'], models: [person('b'), person('e'), person('h'), person('i'), person('k')], held: [HELD.cabbage] },
  fruit: { names: ['Chú bán hoa quả', 'Cô bán cam', 'Chị bán dưa hấu', 'Bác bán táo', 'Cô bán nho', 'Anh bán chuối'], models: [person('k'), person('l'), person('e'), person('a'), person('h'), person('j')], held: [HELD.apple] },
  food: { names: ['Bác bán bánh mì', 'Cô bán xôi', 'Chú bán xiên nướng', 'Bà bán bánh bao', 'Chị bán bánh nướng'], models: [person('a'), person('i'), person('m'), person('c'), person('l')], held: [HELD.bread] },
  grocery: { names: ['Chú bán tạp hóa', 'Cô bán mắm muối', 'Bà bán đồ khô', 'Anh bán chổi rơm', 'Chị bán hũ mứt'], models: [person('m'), person('e'), person('i'), person('j'), person('h')], held: [HELD.basket] },
  clothes: { names: ['Chị bán quần áo', 'Cô bán mũ nón', 'Bác thợ may', 'Cô bán áo hoa', 'Chị bán khăn'], models: [person('l'), person('h'), person('a'), person('e'), person('c')], held: [HELD.basket] },
  fish: { names: ['Bác bán cá', 'Cô bán tôm cua', 'Chú bán cá khô', 'Chị bán mực', 'Bà bán ốc'], models: [person('m'), person('e'), person('k'), person('h'), person('i')], held: [HELD.fish] },
  flowers: { names: ['Cô bán hoa', 'Bà bán hoa cúc', 'Chị bán hoa hồng', 'Cô bán cây giống', 'Chị bán hoa hướng dương'], models: [person('e'), person('i'), person('h'), person('l'), person('c')], held: [HELD.flower] },
  rice: { names: ['Chú bán gạo', 'Bác cân gạo', 'Cô bán đậu', 'Chị bán ngô', 'Bác bán nếp', 'Cô đong lạc'], models: [person('b'), person('a'), person('e'), person('h'), person('k'), person('l')], held: [HELD.bag] },
  cakes: { names: ['Cô bán bánh ngọt', 'Chị bán bánh bông lan', 'Bà bán bánh dẻo', 'Cô bán bánh kem', 'Chú bán bánh quy'], models: [person('l'), person('h'), person('i'), person('e'), person('m')], held: [HELD.basket] },
  drinks: { names: ['Chị bán nước', 'Cô bán nước mía', 'Chú bán nước chanh', 'Bà bán trà', 'Anh bán sữa đậu'], models: [person('h'), person('e'), person('k'), person('i'), person('j')], held: [HELD.bucket] },
  pets: { names: ['Bà bán thú cưng', 'Chú bán gà vịt', 'Cô bán thỏ'], models: [person('i'), person('b'), person('l')], held: [HELD.basket] },
};

type Kit = ReturnType<typeof marketKit>;

const fail = (message: string): never => {
  throw new Error(`cho-phien: ${message}`);
};

/** This map's builders on one map: blocks by name, stalls (their sellers listed for the cast), lamps and pennants. */
function marketKit(ctx: ZoneMapContext) {
  const { world, block } = ctx;
  const base = ctx.ground + 1;
  const B = {
    log: block('log'), planks: block('planks'), sand: block('sand'), snow: block('snow'), red: block('brick-red'), wood: block('wood-red'),
    blue: block('roof-blue'), glass: block('glass'), stone: block('cobble-grey'), cobble: block('cobble'), grey: block('brick-grey'),
    water: block('water'), leaves: block('leaves'), pink: block('leaves-pink'), autumn: block('leaves-autumn'), treeLog: block('tree-log'),
    lantern: block('lantern'), iron: block('iron'), gold: block('wheat'), riverbed: block('riverbed'), dirt: block('dirt'), board: block('board'),
    birch: block('birch-log'), rock: block('stone'),
  };
  const set = (x: number, y: number, z: number, id: number): void => world.set(x, y, z, id);
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = y0; y <= y1; y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id);
  };
  const sellers: Array<StallPlace & { n: number }> = [];
  let stalls = 0;
  /**
   * A stall of `goods` whose footprint's least corner is (x0, z0), facing `facing` (6 along its front, 4 deep).
   * Its seller joins the cast unless `seller` is false.
   */
  const stall = (x0: number, z0: number, facing: Facing, goods: Goods, awning?: Awning, seller = true): StallPlace => {
    const n = stalls++;
    const place = marketStall(ctx, originFor(x0, z0, STALL.width, STALL.depth, facing), facing, goods, n, awning);
    if (seller) sellers.push({ ...place, n });
    return place;
  };
  /** A stall centred on (cx, cz) looking toward (tx, tz) (the nearest of the four ways). */
  const stallToward = (cx: number, cz: number, tx: number, tz: number, goods: Goods, awning?: Awning): StallPlace => {
    const facing = facingOf(tx - cx, tz - cz);
    const across = facing === 'north' || facing === 'south';
    const [w, d] = across ? [STALL.width, STALL.depth] : [STALL.depth, STALL.width];
    return stall(Math.round(cx - w / 2), Math.round(cz - d / 2), facing, goods, awning);
  };
  let houses = 0;
  const shop = (x0: number, z0: number, w: number, d: number, facing: Facing): [number, number] => shophouse(ctx, x0, z0, w, d, facing, houses++);
  const tree = (x: number, z: number, leaves: number, height = 6): void => {
    placeTree(world, x, base, z, height, { log: B.treeLog, leaves }, ctx.rng);
    ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
  };
  /** A festival mast on a column; returns where pennants tie to it. */
  const mast = (x: number, z: number): [number, number, number] => {
    ctx.prop(M.mast, x, z, 0);
    return [x + 0.5, ctx.surface(x, z) + 6.8, z + 0.5];
  };
  return { B, base, set, box, stall, stallToward, shop, tree, mast, sellers, lamp: (x: number, z: number) => streetLamp(ctx, x, z) };
}

export async function generateChoPhien() {
  let cast: readonly Resident[] = [];
  let kit: Kit | null = null;
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'cho-phien',
    seedText: 'miu-cho-phien',
    outland: 'market',
    soil: { grass: 'grass-market', path: 'cobble' },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    shape: (x, z, h) => {
      const k = flatness(x, z);
      return h * (1 - k) + 12 * k;
    },
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: { skip: 0.55, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.25 ? 'leaves-pink' : roll < 0.35 ? 'leaves-autumn' : 'leaves') }) },
    dressing: { models: [M.planter, M.crate, M.barrel, M.bucket, M.basket, ...M.flowers], spacing: 9 },
    // The cast is drawn once the map is built (zone-map.ts calls `life` after `build`).
    life: ({ landmark }) => shopperRounds(kit ?? fail('the market was not built before its cast'), [
      ...cast,
      // 0. Spawn & bến xe chợ phiên (x: 220, z: 262).
      { routine: 'school-guard', name: 'Chú bảo vệ trạm bến xe chợ', model: person('d'), at: [SPAWN.x + 4, SPAWN.z + 2] as const },
      { routine: 'vendor', name: 'Cô hướng dẫn vào chợ phiên', model: person('e'), held: [HELD.basket], at: [SPAWN.x - 3, SPAWN.z - 3] as const },
      { routine: 'shopper', name: 'Khách đi chợ xách làn xuống bến', model: person('k'), held: [HELD.basket], at: [SPAWN.x + 3, SPAWN.z - 4] as const },
      { routine: 'pupil', name: 'Bạn nhỏ đợi xe cùng mẹ', model: person('f'), held: [HELD.flower], at: [SPAWN.x - 4, SPAWN.z + 3] as const },
      { routine: 'dog', name: 'Cún giữ trạm đón chợ', model: M.pets.dog, at: [SPAWN.x + 5, SPAWN.z - 2] as const },
      { routine: 'porter', name: 'Bác kéo xe hàng vào chợ', model: person('m'), held: [HELD.crate], at: [220, 290] as const },
      { routine: 'shopper', name: 'Người đi dạo phố chợ sớm', model: person('l'), held: [HELD.basket], at: [220, 310] as const },

      // Shoppers and children round the squares and along the lanes, porters at the gate and the harbour.
      ...crowd('shopper', ['Cô đi chợ', 'Bác đi chợ', 'Mẹ đi chợ', 'Bà đi chợ sớm', 'Chị xách làn'], [person('c'), person('g'), person('l'), person('e'), person('i')], landmark('quang-truong-cho'), 13, 10, [HELD.basket]),
      ...crowd('shopper', ['Bé đi chợ cùng mẹ', 'Bạn nhỏ xách giỏ', 'Bé cầm hoa'], [person('f'), person('n'), person('o')], landmark('quang-truong-cho'), 9, 5, [HELD.flower]),
      ...crowd('shopper', ['Khách mua rau', 'Ông đi chợ'], [person('g'), person('a')], landmark('loi-di-trong-cho'), 3, 4, [HELD.basket]),
      ...crowd('shopper', ['Cô mua bánh', 'Bạn nhỏ mua kẹo'], [person('c'), person('p')], landmark('gian-do-an'), 4, 4, [HELD.bread]),
      ...crowd('shopper', ['Chị thử mũ', 'Cô mua áo'], [person('l'), person('e')], landmark('gian-quan-ao'), 4, 4, [HELD.basket]),
      ...crowd('shopper', ['Khách xem chó mèo', 'Bé ngắm thỏ'], [person('g'), person('q')], landmark('khu-ban-thu-nuoi'), 6, 4),
      ...crowd('shopper', ['Bác cân gạo về', 'Cô mua chè', 'Chú mua nước'], [person('k'), person('c'), person('j')], landmark('can-lon'), 14, 9, [HELD.bag]),
      ...crowd('shopper', ['Bạn nhỏ đi phố', 'Cô dạo phố'], [person('n'), person('l')], landmark('pho-cho'), 4, 5, [HELD.basket]),
      ...crowd('shopper', ['Bà mua cá'], [person('i'), person('g')], landmark('gian-hai-san'), 5, 3, [HELD.basket]),
      ...crowd('porter', ['Chú khuân rau', 'Bác gánh hàng', 'Anh đẩy xe'], [person('j'), person('m'), person('b')], landmark('cong-cho'), 6, 3, [HELD.crate]),
      ...crowd('porter', ['Chú khuân cá', 'Bác vác thùng'], [person('m'), person('k')], landmark('ben-hang'), 7, 3, [HELD.crate]),
      ...crowd('porter', ['Anh chở bao gạo'], [person('j')], landmark('can-lon'), 22, 2, [HELD.bag]),
      ...crowd('sweeper', ['Cô quét chợ'], [person('h')], landmark('quang-truong-cho'), 20, 1),
      ...crowd('ferryman', ['Bác chèo thuyền hàng', 'Chú lái đò'], [person('m'), person('a')], landmark('ben-hang'), 12, 2, [HELD.paddle]),
      ...crowd('ploughman', ['Bác trồng rau', 'Cô xới đất'], [person('a'), person('e')], landmark('ruong-rau-ngoai-o'), 20, 3),
      // Animals: the pet yard's for sale and the market's own cats, dogs and hens.
      ...crowd('chick', ['Gà con'], [M.pets.chick], landmark('khu-ban-thu-nuoi'), 10, 8),
      ...crowd('cow', ['Bê con'], [M.pets.cow], landmark('khu-ban-thu-nuoi'), 12, 2),
      ...crowd('pig', ['Lợn giống'], [M.pets.pig], landmark('khu-ban-thu-nuoi'), 14, 3),
      ...crowd('cat', ['Mèo mướp', 'Mèo tam thể'], [M.pets.cat], landmark('quang-truong-cho'), 16, 3),
      ...crowd('dog', ['Cún chợ', 'Chó vàng'], [M.pets.dog], landmark('quang-truong-cho'), 18, 2),
      ...crowd('cat', ['Mèo hàng cá'], [M.pets.cat], landmark('gian-hai-san'), 6, 2),
      ...crowd('dog', ['Chó giữ kho'], [M.pets.dog], landmark('can-lon'), 18, 3),
      ...crowd('chick', ['Gà ri'], [M.pets.chick], landmark('cong-cho'), 9, 6),
      ...crowd('cat', ['Mèo nằm phố'], [M.pets.cat], landmark('pho-cho'), 8, 2),
      ...crowd('dog', ['Cún phố chợ'], [M.pets.dog], landmark('pho-cho'), 10, 2),
      ...crowd('chick', ['Gà mái mơ'], [M.pets.chick], landmark('thap-dong-ho'), 12, 4),
      // Dogs and cats running round the lanes and the stalls, hens pecking under them.
      ...crowd('dog', ['Cún đốm', 'Chó lông xù'], [M.pets.dog], landmark('loi-di-trong-cho'), 7, 3),
      ...crowd('cat', ['Mèo vàng', 'Mèo mun'], [M.pets.cat], landmark('loi-di-trong-cho'), 6, 3),
      ...crowd('cat', ['Mèo hàng bánh'], [M.pets.cat], landmark('gian-do-an'), 5, 2),
      ...crowd('dog', ['Cún hàng áo'], [M.pets.dog], landmark('gian-quan-ao'), 6, 2),
      ...crowd('chick', ['Gà tre'], [M.pets.chick], landmark('gian-do-an'), 7, 4),
    ]),
    build: (ctx) => {
      const built = marketKit(ctx);
      kit = built;
      ctx.keepOut(SPAWN_YARD.x0, SPAWN_YARD.z0, SPAWN_YARD.x1, SPAWN_YARD.z1);
      paveZones(ctx, built);
      buildSquare(ctx, built);
      buildGateLane(ctx, built);
      buildHall(ctx, built);
      buildSideStreets(ctx, built);
      buildPetYard(ctx, built);
      buildMarketStreet(ctx, built);
      buildWeighingRow(ctx, built);
      buildHarbour(ctx, built);
      buildCanal(ctx, built);
      buildOutskirts(ctx, built);
      cast = sellerCast(built);
    },
  });
}

/**
 * A seller in every stall (owner, 02/10/2026: every stall is kept), the trade's own names first, then "Dì bán
 * cá"-like names nobody else has; each works behind the counter only, facing the shoppers.
 */
function sellerCast(kit: Kit): Resident[] {
  const used = new Map<Goods, number>();
  const taken = new Set<string>();
  const out: Resident[] = [];
  for (const s of kit.sellers) {
    const who = SELLERS[s.goods];
    const i = used.get(s.goods) ?? 0;
    used.set(s.goods, i + 1);
    const trade = WANTS[s.goods].replace(/^(mua|xem)/, 'bán');
    const name = who.names[i] ?? FOLK.map((f) => `${f} ${trade}`).find((n) => !taken.has(n)) ?? `${FOLK[i % FOLK.length] ?? 'Cô'} ${trade} ${i + 1}`;
    taken.add(name);
    out.push({ routine: 'vendor', name, model: who.models[i % who.models.length] ?? person('e'), held: who.held, at: s.seller, facing: s.looks, visits: [s.seller, s.seller, s.seller] });
  }
  return out;
}

/**
 * Shoppers going round the stalls: one for every other stall, standing first at its counter, then at the
 * two stalls nearest it, asking the price (everyday-routines.ts); and every shopper of the crowds round the
 * squares does the round of the three stalls nearest home.
 */
function shopperRounds(kit: Kit, cast: readonly Resident[]): Resident[] {
  const nearestStalls = (x: number, z: number): Array<readonly [number, number]> =>
    [...kit.sellers].sort((a, b) => Math.hypot(a.before[0] - x, a.before[1] - z) - Math.hypot(b.before[0] - x, b.before[1] - z)).slice(0, 3).map((s) => s.before);
  const going = cast.map((r) => (r.routine === 'shopper' && !r.visits ? { ...r, visits: nearestStalls(r.at[0], r.at[1]) } : r));
  const counts = new Map<Goods, number>();
  const extra = kit.sellers.flatMap((s, i): Resident[] => {
    if (i % 2 === 1) return [];
    const k = counts.get(s.goods) ?? 0;
    counts.set(s.goods, k + 1);
    const visits = nearestStalls(s.before[0], s.before[1]);
    return [{ routine: 'shopper', name: `${FOLK[(k + i) % FOLK.length] ?? 'Cô'} ${WANTS[s.goods]}`, model: person('abcghijklnop'[i % 12] ?? 'c'), held: [HELD.basket], at: s.before, visits }];
  });
  return [...going, ...extra];
}

/**
 * The markets' cobbles: the squares, the lanes and streets with their stalls, the hall's forecourt, the
 * flower rows and the pet yard, edged in grey where they meet the market's grass; the rest of each market
 * is grass with its gardens and trees.
 */
function paveZones(ctx: ZoneMapContext, kit: Kit): void {
  const paved = (x: number, z: number): boolean => {
    const near = (px: number, pz: number, r: number): boolean => Math.hypot(x - px, z - pz) <= r;
    return (
      near(SQUARE.x, SQUARE.z, SQUARE.r + 3) ||
      (Math.abs(z - ROAD_Z.market) <= 11 && x >= 132 && x <= 660) ||
      (Math.abs(x - GATE.x) <= 14 && z >= 300 && z <= SQUARE.z) ||
      (x >= HALL.x0 - 4 && x <= HALL.x0 + HALL.w + 3 && z >= HALL.z0 - 6 && z <= HALL.z0 + HALL.d + 1) ||
      (x >= 244 && x <= 300 && z >= 314 && z <= 340) ||
      (x >= 242 && x <= 280 && z >= 382 && z <= 410) ||
      (Math.abs(x - ROAD_X.east) <= 11 && z >= 312 && z <= 432) ||
      near(SCALES.x, SCALES.z, SCALES.r + 3)
    );
  };
  for (const zn of ZONES) {
    for (let x = zn.x - zn.hx; x <= zn.x + zn.hx; x++) {
      for (let z = zn.z - zn.hz; z <= zn.z + zn.hz; z++) {
        if (ctx.inWater(x, z)) continue;
        const y = ctx.surface(x, z);
        if (!paved(x, z)) {
          kit.set(x, y, z, ctx.soil.grass);
          continue;
        }
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => !paved(x + dx, z + dz));
        kit.set(x, y, z, edge ? kit.B.stone : kit.B.cobble);
      }
    }
  }
}

/**
 * The market square (d-01): a round of cobbles with a grey ring, the fountain with the white cat in the
 * middle, planters and benches round it, eight stalls in a ring facing it (leaving the four ways in) and four
 * more on its diagonals, street lanterns flanking the ways in, festival masts round its edge strung with
 * pennants, big trees at its corners.
 */
function buildSquare(ctx: ZoneMapContext, kit: Kit): void {
  const { world } = ctx;
  const { B, base } = kit;
  const { x: cx, z: cz, r } = SQUARE;
  placePlaza(world, cx, cz, r, ctx.ground, { paver: B.cobble, border: B.stone });
  const fountain = placeFountain(world, cx, cz, base, { stone: B.grey, water: B.water });
  placeCatStatue(world, cx, fountain.plinth[1], cz, { stone: B.snow, eye: B.iron });
  ctx.keepOut(cx - 5, cz - 5, cx + 5, cz + 5);
  for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]] as const) {
    ctx.prop(M.planter, cx + dx, cz + dz, 0);
    ctx.prop(M.bench, cx + Math.sign(dx) * 8, cz + dz / 2, dx < 0 ? 90 : 270);
  }
  for (const [dx, dz] of [[-3, -7], [3, -7], [-3, 7], [3, 7], [-7, 0], [7, 0]] as const) ctx.prop(M.flowers[(dx + dz + 9) % 3] ?? M.planter, cx + dx, cz + dz, dx * 20);
  ctx.landmark('quang-truong-cho', 'Quảng trường chợ', cx, cz - 8);
  ctx.landmark('dai-phun-nuoc-meo-trang', 'Đài phun nước tượng mèo', cx, cz + 6);
  // The ring of stalls between the ways in, and four more on the diagonals, colours mixed as the mock's.
  const ring: Array<[number, number, Goods, Awning]> = [
    [30, 15, 'flowers', 'orange'], [60, 15, 'fruit', 'red'], [120, 15, 'veg', 'green'], [150, 15, 'flowers', 'blue'],
    [210, 15, 'fruit', 'red'], [240, 15, 'flowers', 'blue'], [300, 15, 'veg', 'green'], [330, 15, 'fruit', 'orange'],
    [45, 20, 'food', 'blue'], [135, 20, 'grocery', 'orange'], [225, 20, 'clothes', 'red'], [315, 20, 'veg', 'green'],
  ];
  for (const [deg, radius, goods, awning] of ring) {
    const a = (deg * Math.PI) / 180;
    kit.stallToward(cx + radius * Math.cos(a), cz + radius * Math.sin(a), cx, cz, goods, awning);
  }
  // Heaps of goods between the fountain and the diagonal stalls: a crate, a crate of fruit, a bucket of flowers.
  for (const deg of [45, 135, 225, 315]) {
    const a = (deg * Math.PI) / 180;
    const [hx, hz] = [Math.round(cx + 10.5 * Math.cos(a)), Math.round(cz + 10.5 * Math.sin(a))];
    ctx.prop(M.crate, hx, hz, deg);
    ctx.prop(`${BOX}/cp-crate-${['apple', 'orange', 'cabbage', 'tomato'][(deg - 45) / 90] ?? 'apple'}.glb`, hx + Math.sign(Math.cos(a)), hz, deg + 20);
    ctx.prop(`${BOX}/cp-flowers-${deg < 180 ? 'warm' : 'cool'}.glb`, hx, hz + Math.sign(Math.sin(a)), 0);
  }
  // Street lanterns either side of each way in; masts round the edge, pennants from each to the next.
  for (const deg of [20, 70, 110, 160, 200, 250, 290, 340]) {
    const a = (deg * Math.PI) / 180;
    kit.lamp(Math.round(cx + 19.5 * Math.cos(a)), Math.round(cz + 19.5 * Math.sin(a)));
  }
  const masts: Array<[number, number, number]> = [];
  for (let k = 0; k < 12; k++) {
    const a = ((15 + k * 30) * Math.PI) / 180;
    masts.push(kit.mast(Math.round(cx + 22 * Math.cos(a)), Math.round(cz + 22 * Math.sin(a))));
  }
  masts.forEach((p, i) => bunting(ctx, p, masts[(i + 1) % masts.length] ?? p, 0.9));
  // Across the square from mast to mast over the fountain, as the mock's strings over the stalls.
  for (const [i, j] of [[1, 7], [4, 10]] as const) {
    const [a, b] = [masts[i], masts[j]];
    if (a && b) bunting(ctx, a, b, 2.2);
  }
  // Big trees at the square's corners (d-01's left and right), planters under them.
  for (const [dx, dz] of [[-28, -22], [28, -22], [-28, 21], [28, 21]] as const) {
    kit.tree(cx + dx, cz + dz, dx < 0 ? B.leaves : B.pink, 8);
    for (const px of [-2, 2]) ctx.prop(M.planter, cx + dx + px, cz + dz + 2, 0);
  }
}

/**
 * The market gate (d-02): stone feet under timber posts, a beam across with braces, the "Chợ" sign hung from
 * it, a lantern on a bracket either side and two under the beam, low stone walls and fences either side;
 * then the lane to the square (d-09, d-10, c-08): stalls both sides facing it, shophouses behind them,
 * street lanterns between the stalls, pennants zigzagging across from house to house over the awnings.
 */
function buildGateLane(ctx: ZoneMapContext, kit: Kit): void {
  const { B, base, box } = kit;
  const { x: cx, z: gz } = GATE;
  // Feet, posts, the beam and its braces.
  for (const sx of [-1, 1]) {
    const [p0, p1] = sx < 0 ? [cx - 6, cx - 5] : [cx + 5, cx + 6];
    box(p0, base, gz - 1, p1, base + 1, gz, B.stone);
    box(p0, base + 2, gz - 1, p1, base + 5, gz, B.log);
    kit.set(cx + sx * 4, base + 5, gz, B.log);
    // The bracket arm outside the post that the outer lantern hangs from.
    box(cx + sx * 7, base + 4, gz, cx + sx * 8, base + 4, gz, B.log);
    ctx.propAt(M.lantern, [cx + sx * 8 + 0.5, base + 3.02, gz + 0.5], sx < 0 ? 90 : 270);
    ctx.propAt(M.lantern, [cx + sx * 3 + 0.5, base + 5.02, gz + 0.5], 0);
  }
  box(cx - 8, base + 6, gz - 1, cx + 8, base + 6, gz, B.log);
  box(cx - 7, base + 7, gz, cx + 7, base + 7, gz, B.planks);
  ctx.propAt(M.sign, [cx + 0.5, base + 6 - 1.62, gz - 1.15], 0);
  // Low stone walls either side, fences on to the market's corners, planters and the apple board.
  // A cobbled forecourt before it on the way from the spawn, flower beds along it.
  for (let x = cx - 10; x <= cx + 10; x++) for (let z = gz - 12; z <= gz - 1; z++) kit.set(x, ctx.surface(x, z), z, Math.abs(x - cx) === 10 ? B.stone : B.cobble);
  flowerBed(ctx, cx - 9, gz - 11, 4, 6);
  flowerBed(ctx, cx + 6, gz - 11, 4, 6);
  for (const sx of [-1, 1]) {
    box(cx + sx * 7, base, gz - 1, cx + sx * 17, base + 1, gz - 1, B.stone);
    for (let k = 18; k <= 86; k += 2) ctx.prop(M.fence, cx + sx * k, gz - 1, 0);
    ctx.prop(M.planter, cx + sx * 9, gz - 3, 0);
    ctx.prop(M.flowers[sx + 1] ?? M.planter, cx + sx * 11, gz - 3, 0);
  }
  ctx.prop(M.apples, cx + 9, gz - 5, 340);
  ctx.keepOut(cx - 18, gz - 12, cx + 18, gz + 1);
  ctx.landmark('cong-cho', 'Cổng chợ', cx, gz - 6);

  // The lane: three stalls a side facing it, lanterns between them.
  const lane = { z0: gz + 3, z1: SQUARE.z - SQUARE.r - 1 };
  const goodsW: Goods[] = ['veg', 'fruit', 'flowers', 'clothes'];
  const goodsE: Goods[] = ['fruit', 'veg', 'food', 'grocery'];
  for (let i = 0; i < 4; i++) {
    const z0 = lane.z0 + i * 8;
    kit.stall(cx - 7, z0, 'east', goodsW[i] ?? 'veg');
    kit.stall(cx + 4, z0, 'west', goodsE[i] ?? 'fruit');
    kit.lamp(cx - 4, z0 + 6);
    kit.lamp(cx + 4, z0 + 6);
  }
  kit.lamp(cx - 4, lane.z0 - 1);
  kit.lamp(cx + 4, lane.z0 - 1);
  // The end of the lane before the square: planters, a handcart of crates.
  for (const sx of [-1, 1]) ctx.prop(M.planter, cx + sx * 6, lane.z1 - 2, 0);
  ctx.prop(M.cart, cx - 9, lane.z1 - 4, 90);
  ctx.landmark('loi-di-trong-cho', 'Lối đi trong chợ', cx, lane.z0 + 4);
  // Shophouses behind the stalls, their fronts to the lane; pennants from house to house over it.
  for (const [i, z0] of [lane.z0 - 1, lane.z0 + 10, lane.z0 + 21].entries()) {
    const w = 10 + (i % 2);
    kit.shop(cx - 21, z0, w, 9, 'east');
    kit.shop(cx + 13, z0, w, 9, 'west');
  }
  const y = base + 5.8;
  const [west, east] = [cx - 12, cx + 13];
  const ties: Array<[number, number, number]> = [];
  for (let z = lane.z0; z <= lane.z0 + 28; z += 5) ties.push([(ties.length % 2 ? east : west) + 0.0, y, z + 0.5]);
  ties.forEach((p, i) => {
    const next = ties[i + 1];
    if (next) bunting(ctx, p, next, 0.9);
  });
  // From the gate's beam to the first houses.
  bunting(ctx, [cx - 7.5, base + 6.5, gz + 0.5], [east, y, lane.z0 + 2.5], 0.8);
  bunting(ctx, [cx + 8.5, base + 6.5, gz + 0.5], [west, y, lane.z0 + 2.5], 0.8);
}

/**
 * The market hall south of the square (d-01, d-09, d-10): two storeys of cream walls and timber under a red
 * roof, a wide door to the square and a clock tower out of the middle of its roof with a clock each way.
 * Inside, the market's grocery: shelves of jars, bottles and tins along the walls, sacks and baskets, two
 * counters with their scales, lanterns on the walls.
 */
function buildHall(ctx: ZoneMapContext, kit: Kit): void {
  const { world } = ctx;
  const { B, base, set, box } = kit;
  const { x0, z0, w, d } = HALL;
  const [x1, z1] = [x0 + w - 1, z0 + d - 1];
  const finish = cottagePalette(ctx).finish;
  placeHouse(world, x0, z0, w, d, 8, base, { ...finish, wall: B.sand, roof: B.red, trim: B.log });
  // The upper storey: a beam at its floor, windows over the windows below.
  for (let x = x0; x <= x1; x++) {
    for (const z of [z0, z1]) {
      set(x, base + 4, z, B.log);
      if ((x - x0) % 4 === 2 && x < x1) for (const y of [base + 5, base + 6]) set(x, y, z, B.glass);
    }
  }
  for (let z = z0 + 1; z < z1; z++) {
    for (const x of [x0, x1]) {
      set(x, base + 4, z, B.log);
      if ((z - z0) % 4 === 2 && z < z1) for (const y of [base + 5, base + 6]) set(x, y, z, B.glass);
    }
  }
  // A wide door under a lintel; the door lanterns moved out beside it.
  const doorX = x0 + Math.floor(w / 2);
  box(doorX - 2, base, z0, doorX + 2, base + 2, z0, 0);
  box(doorX - 3, base + 3, z0, doorX + 3, base + 3, z0, B.log);
  for (const x of [doorX - 2, doorX + 1]) set(x, base + 2, z0 - 1, 0);
  for (const x of [doorX - 4, doorX + 4]) set(x, base + 2, z0 - 1, B.lantern);
  // The clock tower, out of the roof's middle.
  const T = { x0: doorX - 3, z0: z0 + 4, x1: doorX + 3, z1: z0 + 10, top: base + 22 };
  for (let y = base + 8; y <= T.top; y++) {
    for (let x = T.x0; x <= T.x1; x++) {
      for (let z = T.z0; z <= T.z1; z++) {
        const edgeX = x === T.x0 || x === T.x1;
        const edgeZ = z === T.z0 || z === T.z1;
        if (!edgeX && !edgeZ) continue;
        const corner = edgeX && edgeZ;
        const slit = !corner && (y - base) % 5 === 1 && (x === doorX || z === T.z0 + 3);
        set(x, y, z, corner || y === T.top ? B.log : slit ? B.glass : B.sand);
      }
    }
  }
  box(T.x0 - 1, T.top + 1, T.z0 - 1, T.x1 + 1, T.top + 1, T.z1 + 1, B.stone);
  for (let k = 0; T.x0 - 1 + k <= T.x1 + 1 - k; k++) box(T.x0 - 1 + k, T.top + 2 + k, T.z0 - 1 + k, T.x1 + 1 - k, T.top + 2 + k, T.z1 + 1 - k, B.red);
  const spire = T.top + 7;
  box(doorX, spire, T.z0 + 3, doorX, spire + 1, T.z0 + 3, B.log);
  set(doorX, spire + 2, T.z0 + 3, B.gold);
  ctx.propAt(M.clock, [doorX + 0.5, base + 15, T.z0 - 0.02], 0);
  ctx.propAt(M.clock, [doorX + 0.5, base + 15, T.z1 + 1.02], 180);
  // Inside: shelves along the back and the sides (a cupboard, a shelf over it), goods on both.
  const goods = [M.jars, M.bottles, M.tins, M.jars, M.bottles];
  const shelfAt = (x: number, z: number, i: number, yaw: number): void => {
    set(x, base, z, B.planks);
    set(x, base + 2, z, B.planks);
    ctx.propAt(goods[i % goods.length] ?? M.jars, [x + 0.5, base + 1, z + 0.5], yaw);
    ctx.propAt(goods[(i + 2) % goods.length] ?? M.jars, [x + 0.5, base + 3, z + 0.5], yaw);
  };
  for (let x = x0 + 2; x <= x1 - 2; x++) shelfAt(x, z1 - 1, x, 180);
  for (let z = z0 + 3; z <= z1 - 3; z++) {
    shelfAt(x0 + 1, z, z, 90);
    shelfAt(x1 - 1, z, z + 1, 270);
  }
  // Two counters with their scales, sacks and baskets by them, the market's lanterns on the walls.
  for (const sx of [-1, 1]) {
    const cx0 = doorX + sx * 8 - 2;
    box(cx0, base, z0 + 8, cx0 + 4, base, z0 + 8, B.planks);
    ctx.propAt(M.scale, [cx0 + 1.5, base + 1, z0 + 8.5], 180);
    ctx.propAt(M.basket, [cx0 + 3.5, base + 1, z0 + 8.5], 30);
    for (const [k, sack] of [M.rice, M.beans, M.corn].entries()) ctx.prop(sack, cx0 + k * 2, z0 + 6, k * 20);
  }
  for (let x = x0 + 3; x <= x1 - 3; x += 6) set(x, base + 4, z1, B.lantern);
  for (const x of [x0, x1]) for (let z = z0 + 3; z <= z1 - 3; z += 5) set(x, base + 4, z, B.lantern);
  ctx.keepOut(x0 - 1, z0 - 2, x1 + 1, z1 + 1);
  ctx.landmark('nha-long-cho', 'Nhà lồng chợ', doorX, z0 + 5);
  ctx.landmark('thap-dong-ho', 'Tháp đồng hồ', doorX, z0 - 3);
  // Planters and pennants along the hall's front.
  for (const dx of [-12, -8, 8, 12]) ctx.prop(M.planter, doorX + dx, z0 - 2, 0);
  const left = kit.lamp(doorX - 6, z0 - 3);
  const right = kit.lamp(doorX + 6, z0 - 3);
  bunting(ctx, left, [x0 + 0.5, base + 7.5, z0 - 0.5], 0.6);
  bunting(ctx, right, [x1 + 0.5, base + 7.5, z0 - 0.5], 0.6);
}

/**
 * The square's side streets: west, the vegetable stalls (d-03) facing the food stalls (d-04); east, the
 * grocery stalls (d-05) facing the clothes stalls (d-06); lanterns between the stalls, festival masts behind
 * them strung with pennants across the street; north-east the flower stalls in two rows; big trees and
 * gardens in the corners.
 */
function buildSideStreets(ctx: ZoneMapContext, kit: Kit): void {
  const { B } = kit;
  const z = ROAD_Z.market;
  const row = (xs: readonly number[], north: Goods, south: Goods): void => {
    const mastsN: Array<[number, number, number]> = [];
    const mastsS: Array<[number, number, number]> = [];
    for (const x0 of xs) {
      kit.stall(x0, z - 8, 'south', north);
      kit.stall(x0, z + 4, 'north', south);
      kit.lamp(x0 + 7, z - 4);
      kit.lamp(x0 + 7, z + 4);
      mastsN.push(kit.mast(x0 + 8, z - 7));
      mastsS.push(kit.mast(x0 + 8, z + 7));
    }
    mastsN.forEach((p, i) => {
      const s = mastsS[i];
      const next = mastsS[i + 1];
      if (s) bunting(ctx, p, s, 0.8);
      if (next) bunting(ctx, p, next, 1.0);
    });
  };
  row([140, 150, 160, 170, 180], 'veg', 'food');
  ctx.landmark('gian-rau-cu', 'Gian hàng rau củ', 163, z - 1);
  ctx.landmark('gian-do-an', 'Gian hàng đồ ăn', 163, z + 1);
  row([254, 264, 274, 284, 294], 'grocery', 'clothes');
  ctx.landmark('gian-tap-hoa', 'Gian hàng tạp hóa', 277, z - 1);
  ctx.landmark('gian-quan-ao', 'Gian hàng quần áo', 277, z + 1);

  // The flower stalls north-east of the square, two rows facing across a walk.
  const flowers: Awning[] = ['red', 'orange', 'blue', 'green'];
  for (let i = 0; i < 4; i++) {
    kit.stall(250 + i * 12, 318, 'south', 'flowers', flowers[i]);
    kit.stall(250 + i * 12, 332, 'north', i % 2 ? 'veg' : 'flowers', flowers[(i + 2) % 4]);
  }
  ctx.landmark('day-sap-hoa', 'Dãy sạp hoa', 272, 327);
  flowerBed(ctx, 250, 344, 40, 3);
  ctx.keepOut(250, 344, 289, 346);
  // Gardens with big trees and benches in the corners of the market, clear ground round them for the lessons.
  for (const [x, zz, leaves] of [[150, 322, B.pink], [184, 334, B.leaves], [150, 420, B.leaves], [186, 430, B.pink], [300, 314, B.leaves], [302, 356, B.pink], [300, 432, B.leaves]] as const) {
    kit.tree(x, zz, leaves, 7);
    ctx.prop(M.bench, x + 3, zz, 270);
    ctx.prop(M.planter, x - 3, zz + 2, 0);
  }
  flowerBed(ctx, 140, 392, 30, 4);
  ctx.keepOut(140, 392, 169, 395);
}

/**
 * The pet yard (d-08) east of the hall by the duck pond: a fenced pen of hay, troughs, a rabbit hutch and
 * the animals for sale, its two stalls behind it with their counters to the pen, lanterns at its corners.
 */
function buildPetYard(ctx: ZoneMapContext, kit: Kit): void {
  const { B, base, box } = kit;
  const pen = { x0: 248, z0: 388, x1: 274, z1: 400 };
  kit.stall(251, 402, 'north', 'pets', 'red');
  kit.stall(265, 402, 'north', 'pets', 'orange');
  for (let x = pen.x0; x <= pen.x1; x += 2) {
    if (Math.abs(x - 262) > 2) ctx.prop(M.fence, x, pen.z0, 0);
  }
  for (let z = pen.z0 + 2; z <= pen.z1; z += 2) for (const x of [pen.x0, pen.x1]) ctx.prop(M.fence, x, z, 90);
  // A hutch for the rabbits: a plank box under a little roof.
  box(pen.x0 + 2, base, pen.z0 + 7, pen.x0 + 5, base + 1, pen.z0 + 9, B.planks);
  box(pen.x0 + 1, base + 2, pen.z0 + 6, pen.x0 + 6, base + 2, pen.z0 + 10, B.red);
  for (const [x, z, yaw] of [[pen.x0 + 9, pen.z0 + 3, 0], [pen.x0 + 19, pen.z0 + 7, 90], [pen.x0 + 14, pen.z0 + 9, 30]] as const) ctx.prop(M.hay, x, z, yaw);
  ctx.prop(M.trough, pen.x0 + 16, pen.z0 + 3, 0);
  ctx.prop(M.trough, pen.x0 + 23, pen.z0 + 9, 90);
  const shown: Array<[string, number, number, number]> = [
    [M.pets.cow, 9, 3, 200], [M.pets.bunny, 13, 2, 170], [M.pets.bunny, 14, 3, 220], [M.pets.bunny, 4, 11, 180],
    [M.pets.chick, 11, 2, 10], [M.pets.chick, 12, 4, 120], [M.pets.chick, 16, 2, 220], [M.pets.cat, 17, 3, 160],
    [M.pets.dog, 6, 2, 200], [M.pets.pig, 18, 9, 120], [M.pets.chick, 24, 5, 45], [M.pets.cat, 10, 9, 250],
  ];
  for (const [model, dx, dz, yaw] of shown) ctx.prop(model, pen.x0 + dx, pen.z0 + dz, yaw);
  for (const [x, z] of [[pen.x0 - 2, pen.z0 - 2], [pen.x1 + 2, pen.z0 - 2]] as const) kit.lamp(x, z);
  ctx.prop(M.paw, pen.x0 + 3, pen.z0 - 3, 20);
  ctx.keepOut(pen.x0, pen.z0, pen.x1, pen.z1);
  ctx.landmark('khu-ban-thu-nuoi', 'Khu bán thú nuôi', 261, pen.z0 - 4);
  // Lilies on the duck pond beside it.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.propAt(M.lily, [DUCK_POND.x + Math.cos(a) * 3.5 + 0.5, WATER_LEVEL + 1.02, DUCK_POND.z + Math.sin(a) * 3.5 + 0.5], i * 40);
  }
  ctx.landmark('ao-vit', 'Ao vịt', DUCK_POND.x, DUCK_POND.z);
}

/**
 * The market street from the square to the weighing row: shophouses both sides with their awnings, street
 * lanterns before them, pennants zigzagging across from house front to house front over the awnings.
 */
function buildMarketStreet(ctx: ZoneMapContext, kit: Kit): void {
  const z = ROAD_Z.market;
  const y = kit.base + 5.8;
  const clearOf = (x0: number, x1: number): boolean => {
    for (let x = x0 - 3; x <= x1 + 3; x++) if (ctx.onPath(x, z - 12) || ctx.onPath(x, z + 12) || ctx.inZone(x, z, 2)) return false;
    return true;
  };
  const ties: Array<[number, number, number]> = [];
  let x = 312;
  let n = 0;
  while (x + 10 <= 516) {
    const w = 10 + (n % 3);
    if (!clearOf(x, x + w - 1)) {
      x += 2;
      continue;
    }
    kit.shop(x, z - 15, w, 9, 'south');
    kit.shop(x, z + 7, w, 9, 'north');
    kit.lamp(x + w, z - 4);
    kit.lamp(x + w, z + 4);
    ties.push([x + 3, y, z - 5.9], [x + w - 3, y, z + 7]);
    x += w + 2;
    n++;
  }
  ties.forEach((p, i) => {
    const next = ties[i + 1];
    if (next && Math.abs(next[0] - p[0]) < 16) bunting(ctx, p, next, 0.9);
  });
  ctx.keepOut(309, z - 6, 519, z + 6);
  ctx.landmark('pho-cho', 'Phố chợ', 360, z);
}

/**
 * Chapter 2, the weighing row: a small square where its two streets cross with the great balance in the
 * middle (gold pans on chains from a beam) and scale tables round it, stalls along both streets facing them,
 * lanterns and festival masts strung with pennants across the streets; trees, carts and sacks in the corners.
 */
function buildWeighingRow(ctx: ZoneMapContext, kit: Kit): void {
  const { world } = ctx;
  const { B, base, box, set } = kit;
  const { x: cx, z: cz, r } = SCALES;
  placePlaza(world, cx, cz, r, ctx.ground, { paver: B.cobble, border: B.stone });
  box(cx - 1, base, cz - 1, cx + 1, base, cz + 1, B.stone);
  box(cx, base + 1, cz, cx, base + 7, cz, B.log);
  set(cx, base + 8, cz, B.gold);
  box(cx - 4, base + 7, cz, cx + 4, base + 7, cz, B.log);
  for (const sx of [-1, 1]) {
    box(cx + sx * 4, base + 4, cz, cx + sx * 4, base + 6, cz, B.iron);
    box(cx + sx * 4 - 1, base + 3, cz - 1, cx + sx * 4 + 1, base + 3, cz + 1, B.gold);
  }
  ctx.keepOut(cx - 1, cz - 1, cx + 1, cz + 1);
  ctx.landmark('can-lon', 'Cân lớn giữa chợ', cx, cz - 5);
  for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]] as const) kit.lamp(cx + dx, cz + dz);
  for (const [px, pz] of [[583, 367], [596, 367], [583, 377], [596, 377]] as const) {
    box(px, base, pz, px + 1, base, pz, B.planks);
    ctx.propAt(M.scale, [px + 1, base + 1, pz + 0.5], 0);
    ctx.prop(M.rice, px + (px < cx ? -1 : 2), pz, 30);
    ctx.keepOut(px - 1, pz, px + 2, pz);
  }

  // Along the east-west street: stalls both sides, lanterns and masts in the gaps, pennants across.
  const z = ROAD_Z.market;
  const across = (a: ReadonlyArray<[number, number, number]>, b: ReadonlyArray<[number, number, number]>): void => {
    a.forEach((p, i) => {
      const s = b[i];
      const next = b[i + 1];
      if (s) bunting(ctx, p, s, 0.8);
      if (next) bunting(ctx, p, next, 1.0);
    });
  };
  const arms: Array<[readonly number[], Goods, Goods]> = [
    [[526, 536, 546, 556, 566], 'fruit', 'rice'],
    [[604, 614, 624, 634, 644], 'cakes', 'drinks'],
  ];
  for (const [xs, north, south] of arms) {
    const mastsN: Array<[number, number, number]> = [];
    const mastsS: Array<[number, number, number]> = [];
    xs.forEach((x0, i) => {
      kit.stall(x0, z - 8, 'south', i === 2 ? 'grocery' : north);
      kit.stall(x0, z + 4, 'north', i === 1 ? 'fruit' : south);
      if (i === xs.length - 1) return;
      kit.lamp(x0 + 7, z - 4);
      kit.lamp(x0 + 7, z + 4);
      mastsN.push(kit.mast(x0 + 8, z - 7));
      mastsS.push(kit.mast(x0 + 8, z + 7));
    });
    across(mastsN, mastsS);
  }
  // Along the north-south road.
  const x = ROAD_X.east;
  const north: Goods[] = ['fruit', 'cakes', 'rice', 'drinks'];
  const south: Goods[] = ['rice', 'grocery', 'fruit', 'cakes'];
  for (const [zs, goods] of [[[318, 328, 338, 348], north], [[386, 396, 406, 416], south]] as const) {
    const mastsW: Array<[number, number, number]> = [];
    const mastsE: Array<[number, number, number]> = [];
    zs.forEach((z0, i) => {
      kit.stall(x - 8, z0, 'east', goods[i] ?? 'fruit');
      kit.stall(x + 4, z0, 'west', goods[(i + 2) % 4] ?? 'cakes');
      if (i === zs.length - 1) return;
      kit.lamp(x - 4, z0 + 7);
      kit.lamp(x + 4, z0 + 7);
      mastsW.push(kit.mast(x - 7, z0 + 8));
      mastsE.push(kit.mast(x + 7, z0 + 8));
    });
    across(mastsW, mastsE);
  }
  ctx.landmark('day-sap-can', 'Dãy sạp có cân', 546, z - 1);
  // Sacks and carts in the corners, trees with benches.
  for (const [px, pz] of [[548, 340], [636, 340], [548, 404], [636, 404]] as const) {
    ctx.prop(M.cart, px, pz, 30);
    ctx.prop(M.crate, px + 3, pz + 1, 10);
    ctx.prop(M.bag, px + 3, pz - 1, 50);
  }
  for (const [px, pz, leaves] of [[530, 324, B.leaves], [652, 324, B.pink], [530, 424, B.pink], [652, 424, B.leaves]] as const) {
    kit.tree(px, pz, leaves, 7);
    ctx.prop(M.bench, px + 3, pz, 270);
  }
}

/**
 * The harbour below the weighing row (d-07): fish stalls open at the back along the bank, facing the road,
 * a fence along the water's edge behind them, jetties with boats, and the lighthouse on its islet.
 */
function buildHarbour(ctx: ZoneMapContext, kit: Kit): void {
  const { B, base } = kit;
  const z = ROAD_Z.bank + 4;
  const stalls = [598, 608, 618, 628, 638];
  stalls.forEach((x0) => kit.stall(x0, z, 'north', 'fish'));
  for (const x0 of stalls) kit.lamp(x0 + 7, z - 1);
  for (let x = 594; x <= 648; x += 2) {
    let edge = z + 5;
    while (!inWater(x, edge + 1) && edge < z + 20) edge++;
    if (!ctx.keptOut(x, edge)) ctx.prop(M.fence, x, edge, 0);
  }
  ctx.landmark('gian-hai-san', 'Gian hàng hải sản', 641, z - 3);
  ctx.landmark('ben-hang', 'Bến hàng bên kênh', 600, ROAD_Z.bank + 2);
  // The islet and its lighthouse.
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 4; dz++) {
      if (Math.hypot(dx, dz) > ISLET.r) continue;
      for (let y = WATER_LEVEL - 2; y <= ctx.ground; y++) kit.set(ISLET.x + dx, y, ISLET.z + dz, B.stone);
    }
  }
  placeLighthouse(ctx.world, ISLET.x, ISLET.z, base, { red: B.wood, white: B.snow, glass: B.glass, cap: B.blue });
  ctx.keepOut(ISLET.x - 4, ISLET.z - 4, ISLET.x + 4, ISLET.z + 4);
  ctx.landmark('hai-dang', 'Hải đăng', ISLET.x, ISLET.z - 6);
}

/** The canal: the dragon bridge, the sluice and its inlet, the gravel bank, the shed, the basins, the jetties, boats. */
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

  // The dragon bridge on the south road: red rails and a red body with a yellow back rising and falling
  // along both sides, a head at the north bank and a tail at the south.
  const bx = ROAD_X.bridge;
  const [s0, s1] = waterSpan(bx);
  for (let z = s0 - 1; z <= s1 + 1; z++) {
    for (const dx of [-2, 2]) set(bx + dx, deckY, z, B.planks);
    const t = (z - s0) / Math.max(1, s1 - s0);
    const hump = Math.round(1.5 + 1.5 * Math.sin(t * Math.PI * 3));
    for (const dx of [-3, 3]) {
      for (let y = deckY + 1; y <= deckY + 1 + hump; y++) set(bx + dx, y, z, y === deckY + 1 + hump ? B.gold : B.wood);
      set(bx + dx, deckY, z, B.planks);
    }
  }
  for (const dx of [-3, 3]) {
    const hx = bx + dx + Math.sign(dx);
    const head = ctx.surface(hx, s0 - 3) + 1;
    box(hx - 1, head, s0 - 4, hx + 1, head + 2, s0 - 2, B.wood);
    set(hx, head + 3, s0 - 3, B.gold);
    set(hx, head + 1, s0 - 5, B.snow);
    const tail = ctx.surface(hx, s1 + 3) + 1;
    box(hx, tail, s1 + 2, hx, tail + 1, s1 + 3, B.wood);
    set(hx, tail, s1 + 4, B.gold);
  }
  ctx.keepOut(bx - 5, s0 - 6, bx + 5, s1 + 5);
  ctx.landmark('cau-rong', 'Cầu hình rồng bắc qua kênh', bx, s0 - 1);

  // The sluice: a grey dam across the inlet with a plank gate between log posts.
  const mouth = Math.floor(canalCentre(INLET.x0) - CANAL.half) - 1;
  box(INLET.x0 - 1, WATER_LEVEL - 2, mouth, INLET.x1 + 1, ground, mouth, B.grey);
  box(INLET.x0 + 1, WATER_LEVEL - 1, mouth, INLET.x1 - 1, ground, mouth, B.planks);
  for (const x of [INLET.x0 - 1, INLET.x1 + 1]) box(x, ground + 1, mouth, x, ground + 3, mouth, B.log);
  box(INLET.x0 - 1, ground + 4, mouth, INLET.x1 + 1, ground + 4, mouth, B.log);
  ctx.keepOut(INLET.x0 - 3, INLET.z0 - 2, INLET.x1 + 3, mouth + 1);
  ctx.landmark('cua-cong', 'Đập nhỏ và cửa cống', INLET.x0 + 2, INLET.z0 - 3);

  // The gravel bank and the wooden shed along it.
  for (let x = 250; x <= 300; x++) {
    for (let z = ROAD_Z.bank + 3; z < waterSpan(x)[0]; z++) {
      if (ctx.onPath(x, z)) continue;
      set(x, ctx.surface(x, z), z, (x * 7 + z * 13) % 5 === 0 ? B.rock : B.riverbed);
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

  // The vegetable washing basins below the weighing row, jetties into the harbour.
  const basins = { x0: 552, z0: ROAD_Z.bank + 5 };
  box(basins.x0, base, basins.z0, basins.x0 + 8, base, basins.z0 + 2, B.grey);
  box(basins.x0 + 1, base, basins.z0 + 1, basins.x0 + 7, base, basins.z0 + 1, B.water);
  for (let i = 0; i < 4; i++) ctx.prop(M.bucket, basins.x0 + 1 + i * 2, basins.z0 - 1, i * 35);
  ctx.keepOut(basins.x0 - 1, basins.z0 - 1, basins.x0 + 9, basins.z0 + 3);
  ctx.landmark('chau-rua-rau-ben-kenh', 'Chậu rửa rau bên kênh', basins.x0 + 4, basins.z0 - 2);
  for (const x of [596, 612]) {
    const [z0] = waterSpan(x);
    jetty(ctx, x, z0, 9, 1, WATER_LEVEL, x > 600);
  }
  // Boats moored along the canal away from the bridges.
  for (let x = 40; x < 770; x += 34) {
    if (Object.values(ROAD_X).some((rx) => Math.abs(rx - x) < 10) || Math.abs(x - HARBOUR.x) < HARBOUR.rx) continue;
    ctx.propAt(M.canoe, [x + 0.5, WATER_LEVEL + 0.9, canalCentre(x) + 2.5], 90);
  }
  ctx.landmark('con-kenh', 'Con kênh', 480, Math.round(canalCentre(480)));
}

/**
 * Round the town: the north street of shophouses, hamlets of cottages, vegetable plots in the outer bands, a
 * bamboo hedge round the map, and the verges of every way outside the markets (lanterns, bushes, flowers).
 */
function buildOutskirts(ctx: ZoneMapContext, kit: Kit): void {
  const { B } = kit;
  const z = ROAD_Z.street;
  let x = 26;
  let n = 0;
  while (x + 10 <= 774) {
    const w = 10 + (n % 3);
    let clear = x + w < SPAWN_YARD.x0 - 4 || x > SPAWN_YARD.x1 + 4;
    for (let cx = x - 3; cx <= x + w + 2 && clear; cx++) if (ctx.onPath(cx, z - 12) || ctx.onPath(cx, z + 12)) clear = false;
    if (!clear) {
      x += 2;
      continue;
    }
    kit.shop(x, z - 13, w, 9, 'south');
    if (!ctx.inZone(x, z + 13, 3) && !ctx.inZone(x + w, z + 13, 3)) kit.shop(x, z + 5, w, 8, 'north');
    x += w + 3;
    n++;
  }
  ctx.landmark('pho-phia-bac', 'Phố phía bắc', 300, z);

  const SEGMENTS: ReadonlyArray<readonly [number, number]> = [[26, 54], [67, 316], [327, 403], [417, 583], [597, 733], [747, 774]];
  for (const [x0, x1] of SEGMENTS) {
    hamlet(ctx, x0, ROAD_Z.north + 4, x1, 186);
    hamlet(ctx, x0, 494, x1, 540);
    hamlet(ctx, x0, ROAD_Z.south + 6, x1, 668);
  }
  for (const [x0, x1] of [[26, 54], [67, 126], [668, 733], [747, 776]] as const) {
    hamlet(ctx, x0, 304, x1, 358);
    hamlet(ctx, x0, 388, x1, 444);
  }
  for (const [x0, x1] of [[327, 403], [417, 512]] as const) {
    hamlet(ctx, x0, 300, x1, 352);
    hamlet(ctx, x0, 392, x1, 444);
  }

  // Vegetable plots in the outer bands, a fence along the road side of each.
  let plots = 0;
  const plot = (x0: number, z0: number, x1: number, z1: number, fenceZ: number): void => {
    const crop = plots++ % 4;
    for (let px = x0; px <= x1; px++) {
      for (let pz = z0; pz <= z1; pz++) {
        if (ctx.onPath(px, pz) || ctx.inWater(px, pz) || ctx.keptOut(px, pz)) continue;
        const y = ctx.surface(px, pz);
        kit.set(px, y, pz, B.dirt);
        if ((pz - z0) % 2 !== 1 || px === x0 || px === x1 || pz === z1) continue;
        if (crop === 0) kit.set(px, y + 1, pz, B.leaves);
        else if (crop === 1) kit.set(px, y + 1, pz, B.autumn);
        else if (crop === 2 && (px - x0) % 3 === 1) ctx.prop(M.cabbage, px, pz, (px * 37 + pz * 11) % 360);
        else if (crop === 3 && (px - x0) % 4 === 2) ctx.prop(M.pumpkin, px, pz, (px * 37 + pz * 11) % 360);
      }
    }
    for (let px = x0; px <= x1; px += 2) if (!ctx.onPath(px, fenceZ) && !ctx.inWater(px, fenceZ)) ctx.prop(M.fence, px, fenceZ, 0);
    ctx.keepOut(x0, z0, x1, z1);
  };
  for (const [x0, x1] of SEGMENTS) {
    for (let px = x0; px + 20 <= x1; px += 52) {
      const xe = Math.min(px + 36, x1);
      plot(px, 200, xe, 240, 198);
      plot(px, 556, xe, 604, 554);
      if (((px - x0) / 52) % 2 === 0) plot(px, 684, xe, 716, 682);
      else plot(px, 46, xe, 80, 84);
    }
  }
  ctx.landmark('ruong-rau-ngoai-o', 'Ruộng rau ngoại ô', 300, 220);

  for (const route of ROUTES) laneVerge(ctx, route, { lampEvery: 16 });
  bambooHedge(ctx, [[20, 20], [780, 20]]);
  bambooHedge(ctx, [[20, 780], [780, 780]]);
  bambooHedge(ctx, [[20, 20], [20, 780]]);
  bambooHedge(ctx, [[780, 20], [780, 780]]);
}

await runIfMain(import.meta.url, generateChoPhien);

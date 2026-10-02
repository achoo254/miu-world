// Generates "Nông trại" (Toán topic 4) from a fixed seed, 800 x 800 blocks after the owner's detail mock of the
// farm (designs/nong-trai/d-01…d-14, c-09, 02/10/2026): golden wheat and maize in fenced fields, pumpkins among
// their vines, rows of sunflowers, red barns under grey gambrel roofs with white trim, a windmill, dairy cows
// and sheep, a river with a humped stone bridge, and behind it all a wall of mountains with waterfalls.
// The lessons' farm (chapter 1) is in the middle, fenced round and entered from the spawn under its timber
// gate with the cat sign and the farm's name board (d-02): the crop beds with the scarecrow and sunflowers,
// the windmill and its bread oven (d-03, d-13), the farmhouse with its mailbox and the quest board with the
// "!" (d-10, d-12), the paved yard with the market stalls (d-09), the big red barn with cows in its stalls
// (d-04), the paddock with sheep, the hen house and the pigsty, the fish pond with its fishing jetty (d-07),
// the apple orchard with ladders and crates (d-06), the glasshouse (d-05) and the storehouse with its oven
// (d-08), both walked into, and the rest under the great tree with lanterns, tables and parasols (d-11).
// Round it, along winding farm lanes: farmsteads (barn, farmhouse, silo, windmill), wheat, maize, pumpkin
// and sunflower fields, orchards, pastures, hamlets of cottages, the river and its lake.
// Output: assets/generated/world/nong-trai/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { cottagePalette, hamlet, jetty, laneVerge, STREET_LANTERN, streetHouses } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeStall, placeWell, placeWindmill } from './structures/countryside';
import { placeArchBridge, placePlaza } from './structures/landmarks';
import { placeBreadOven, placeFarmGate, placeFruitTree, placeGlasshouse, placeRedBarn, placeShadeTree, placeSilo, placeStorehouse, placeTallFall } from './structures/nong-trai-farm';
import type { Point } from './structures/path';
import { facingWriter, FRAME, frameCell, put, type Facing } from './structures/world-writer';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'nong-trai';
const SIZE = 800;
const LEVEL = 12;
const WATER_LEVEL = 10;

export const ZONES: readonly Zone[] = [{ chapter: 1, id: 'nong-trai', name: 'Nông trại', x: 400, z: 430, hx: 100, hz: 78 }];
/** The lessons' farm (the zone), fenced round; its gate is on the north side, on the way from the spawn. */
const FARM = { x0: 300, z0: 352, x1: 500, z1: 508 };
const GATE = { x: 400, z: 349 };
/** The farm's paved yard where the lanes meet, the market stalls on its north-east. */
const YARD = { x: 400, z: 414, r: 8 };

interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}
const rect = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0, z0, x1, z1 });
const inRect = (r: Rect, x: number, z: number, pad = 0): boolean => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;

// ── Water and mountains ──
/** The river across the south of the map, west to east into the lake. */
export const riverCenter = (x: number): number => 566 + 6 * Math.sin(x / 70) + 3 * Math.sin(x / 23 + 1);
const RIVER_HALF = 6;
const LAKE = { x: 718, z: 566, rx: 70, rz: 46 };
/** The farm's fish pond (d-07), in the south-west of the lessons' farm. */
const POND = { x: 334, z: 468, rx: 22, rz: 12 };
/** The foot of the mountains behind the river: cliffs rise south of it. */
const ridge = (x: number): number => Math.max(596 + 6 * Math.sin(x / 85 + 0.5) + 3 * Math.sin(x / 29), x > 620 ? LAKE.z + LAKE.rz + 10 : 0);
/** The waterfalls off the cliffs, and the brooks from their pools to the river. */
const FALLS = [236, 532];

const WATER = new Uint8Array(SIZE * SIZE);
for (let x = 0; x < SIZE; x++) {
  for (let z = 0; z < SIZE; z++) {
    const river = x < LAKE.x && Math.abs(z - riverCenter(x)) < RIVER_HALF + 1.2 * Math.sin(x / 17);
    const lake = ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2 < 1;
    const pond = ((x - POND.x) / POND.rx) ** 2 + ((z - POND.z) / POND.rz) ** 2 < 1;
    const brook = FALLS.some((fx) => Math.abs(x - fx) < 3.5 && z > riverCenter(fx) && z < ridge(fx) + 1);
    if (river || lake || pond || brook) WATER[x * SIZE + z] = 1;
  }
}
const inWater = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < SIZE && z < SIZE && WATER[x * SIZE + z] === 1;
const nearWater = (x: number, z: number, r: number): boolean => {
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (inWater(x + dx, z + dz)) return true;
  return false;
};
/** Height of the mountains over a column: cliffs from the ridge's foot up to a rolling top. */
const mountain = (x: number, z: number): number => {
  const up = z - ridge(x);
  if (up <= 0) return 0;
  const top = 16 + 3 * Math.sin(x / 23) + 2 * Math.sin(z / 13 + x / 41);
  return Math.min(up * 1.7, top);
};

// ── Ways ──
const R = {
  north: [[400, 14], [396, 80], [410, 150], [398, 230], [404, 300], [402, 328]] as Point[],
  gate: [[402, 328], [400, 352], [400, YARD.z - 2]] as Point[],
  lane: [[14, 436], [80, 422], [160, 440], [240, 428], [300, 428], [400, YARD.z + 4], [500, 428], [560, 418], [640, 436], [700, 424], [786, 432]] as Point[],
  south: [[400, YARD.z + 4], [376, 432], [370, 470], [378, 508], [392, 536], [400, 556], [400, 592]] as Point[],
  westNorth: [[396, 80], [320, 96], [240, 84], [160, 104], [80, 92], [14, 100]] as Point[],
  eastNorth: [[410, 150], [490, 170], [570, 158], [650, 176], [730, 166], [786, 172]] as Point[],
  west: [[80, 422], [96, 340], [84, 250], [100, 170], [80, 92]] as Point[],
  east: [[640, 436], [656, 350], [640, 260], [652, 176]] as Point[],
  riverWest: [[14, 540], [120, 538], [240, 536], [330, 538], [390, 534]] as Point[],
  riverEast: [[392, 536], [480, 538], [560, 540], [630, 528]] as Point[],
  falls: [[240, 536], [240, 560], [240, 592]] as Point[],
  barnA: [[247, 88], [247, 196]] as Point[],
  store: [[486, 428], [486, 466]] as Point[],
};
const ROUTES: Point[][] = Object.values(R);

// ── Fields round the lessons' farm (inclusive rectangles): flat ground, filled by kind ──
type FieldKind = 'wheat' | 'corn' | 'pumpkin' | 'sunflower' | 'veg' | 'pasture' | 'orchard';
interface Field {
  kind: FieldKind;
  r: Rect;
  /** Pastures: cows and sheep; orchards: oranges instead of apples. */
  variant?: number;
}
const FIELDS: readonly Field[] = [
  // North-west, round farmstead A (c-09: its barn between two wheat fields, cows and beds before them).
  { kind: 'wheat', r: rect(196, 170, 242, 192), variant: 1 },
  { kind: 'wheat', r: rect(252, 170, 300, 192), variant: 1 },
  { kind: 'wheat', r: rect(196, 112, 242, 140) },
  { kind: 'veg', r: rect(196, 146, 242, 164) },
  { kind: 'pasture', r: rect(252, 112, 300, 164), variant: 1 },
  { kind: 'wheat', r: rect(312, 110, 388, 196) },
  { kind: 'corn', r: rect(300, 222, 386, 312) },
  { kind: 'pasture', r: rect(108, 112, 186, 316), variant: 2 },
  { kind: 'pumpkin', r: rect(196, 222, 290, 312) },
  { kind: 'wheat', r: rect(110, 14, 380, 50) },
  // North-east, round farmstead B.
  { kind: 'wheat', r: rect(418, 186, 508, 316) },
  { kind: 'pumpkin', r: rect(520, 226, 632, 266) },
  { kind: 'sunflower', r: rect(520, 276, 632, 316) },
  { kind: 'orchard', r: rect(418, 20, 560, 138) },
  { kind: 'pasture', r: rect(570, 20, 780, 146), variant: 3 },
  { kind: 'pasture', r: rect(664, 184, 784, 296), variant: 4 },
  { kind: 'wheat', r: rect(664, 306, 784, 414) },
  // Either side of the lessons' farm.
  { kind: 'orchard', r: rect(108, 326, 196, 414), variant: 1 },
  { kind: 'veg', r: rect(206, 326, 292, 414) },
  { kind: 'pasture', r: rect(160, 448, 292, 526), variant: 5 },
  { kind: 'pasture', r: rect(508, 322, 632, 412), variant: 6 },
  { kind: 'sunflower', r: rect(508, 446, 560, 500) },
  { kind: 'veg', r: rect(568, 446, 634, 500) },
  { kind: 'wheat', r: rect(508, 506, 634, 526) },
];
/** Farmsteads: a red barn facing north up its own way, the farmhouse beside it, a silo, a windmill. */
const FARMSTEADS = [
  { id: 'trang-trai-a', barn: { x: 237, z: 198, w: 21, d: 16 }, house: { x: 266, z: 200 }, silo: [229, 206], mill: [212, 208] },
  { id: 'trang-trai-b', barn: { x: 538, z: 192, w: 19, d: 15 }, house: { x: 574, z: 194 }, silo: [566, 214], mill: [614, 204] },
  { id: 'trang-trai-c', barn: { x: 690, z: 466, w: 19, d: 15 }, house: { x: 660, z: 468 }, silo: [718, 474], mill: [748, 478] },
] as const;
/** Flat ground: every field, every farmstead and the hamlet south-west of the farm. */
const FLAT: readonly Rect[] = [
  ...FIELDS.map((f) => f.r),
  ...FARMSTEADS.map((f) => rect(Math.min(f.house.x, f.mill[0]) - 8, f.barn.z - 6, Math.max(f.house.x + 14, f.mill[0] + 8), f.barn.z + f.barn.d + 6)),
  rect(20, 446, 150, 528),
];

const N = PACK.nature;
const S = PACK.survival;
const BOX = PACK.box;
const M = {
  fence: `${N}/fence_simple.glb`,
  corn: `${N}/crops_cornStageD.glb`,
  pumpkin: `${BOX}/nt-pumpkin.glb`,
  carrot: `${N}/crop_carrot.glb`,
  greens: `${N}/crops_leafsStageB.glb`,
  melon: `${N}/crop_melon.glb`,
  lily: `${N}/lily_large.glb`,
  logs: `${N}/log_stack.glb`,
  canoe: `${N}/canoe.glb`,
  bush: `${N}/plant_bushLarge.glb`,
  rock: `${N}/rock_largeA.glb`,
  barrel: `${S}/barrel.glb`,
  bucket: `${S}/bucket.glb`,
  crate: `${S}/box-large.glb`,
  workbench: `${S}/workbench.glb`,
  cow: `${PACK.pets}/animal-cow.glb`,
  pig: `${PACK.pets}/animal-pig.glb`,
  chick: `${PACK.pets}/animal-chick.glb`,
  pumpkinBig: `${PACK.food}/pumpkin.glb`,
  cabbage: `${PACK.food}/cabbage.glb`,
  carrotFood: `${PACK.food}/carrot.glb`,
  apple: `${PACK.food}/apple.glb`,
  cartRed: `${PACK.props}/railway-red.glb`,
  scarecrow: `${BOX}/nt-scarecrow.glb`,
  sunflower: `${BOX}/nt-sunflower.glb`,
  sheep: `${BOX}/nt-sheep.glb`,
  questBoard: `${BOX}/nt-quest-board.glb`,
  catSign: `${BOX}/nt-cat-sign.glb`,
  farmSign: `${BOX}/nt-farm-sign.glb`,
  appleCrate: `${BOX}/nt-apple-crate.glb`,
  ladder: `${BOX}/nt-ladder.glb`,
  parasol: `${BOX}/nt-parasol.glb`,
  picnic: `${BOX}/nt-picnic-table.glb`,
  mailbox: `${BOX}/nt-mailbox.glb`,
  toolSign: `${BOX}/nt-tool-sign.glb`,
  hangLamp: `${BOX}/nt-hanging-lantern.glb`,
  breadTable: `${BOX}/nt-bread-table.glb`,
  sacks: `${BOX}/nt-flour-sacks.glb`,
  jars: `${BOX}/nt-jar-shelf.glb`,
  fire: `${BOX}/nt-fire.glb`,
  strawberry: `${BOX}/nt-strawberry-pot.glb`,
  flowerPot: `${BOX}/nt-flower-pot.glb`,
  hay: `${BOX}/nt-hay-bale.glb`,
  milk: `${BOX}/nt-milk-can.glb`,
  wheatPatch: `${BOX}/nt-wheat-patch.glb`,
  signs: [`${BOX}/nt-sign-carrot.glb`, `${BOX}/nt-sign-apple.glb`, `${BOX}/nt-sign-cabbage.glb`],
  appleFruit: `${BOX}/nt-apple.glb`,
  orange: `${BOX}/nt-orange.glb`,
  bench: `${BOX}/park-bench.glb`,
};
const FLOWERS = [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`, `${N}/flower_yellowA.glb`];

/** What the farm's people hold at their work. */
const HELD = {
  basket: `${PACK.props}/basket.glb`,
  bucket: `${S}/bucket.glb`,
  hoe: `${S}/tool-hoe.glb`,
  kite: `${PACK.props}/kite.glb`,
  crate: `${S}/box.glb`,
  apple: `${PACK.food}/apple.glb`,
  rod: 'built:fishing-rod',
  fish: `${S}/fish.glb`,
  bread: `${PACK.food}/bag.glb`,
  carrot: `${PACK.food}/carrot.glb`,
  book: `${PACK.props}/open-book.glb`,
};

export async function generateNongTrai() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'nong-trai',
    seedText: 'miu-nong-trai',
    outland: 'farm',
    soil: { grass: 'grass-farm', path: 'trail' },
    zones: ZONES,
    // On the farm road facing the gate (d-02), the fields of the mock either side, the mountains beyond.
    spawn: { x: 402, z: 328, yaw: 0 },
    // Flat fields and farmyards; gentle swells between them; the mountains rise south of the river.
    shape: (x, z, h) => {
      const m = mountain(x, z);
      if (m > 0) return LEVEL + m;
      if (FLAT.some((r) => inRect(r, x, z, 2))) return LEVEL;
      return LEVEL + (h - LEVEL) * 0.45;
    },
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    // Flowers and bushes dotted through the farm's lawns (no stones).
    dressing: { models: [...FLOWERS, `${N}/plant_bush.glb`, `${N}/grass_large.glb`], spacing: 7 },
    trees: { skip: 0.55, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.18 ? 'leaves-pink' : roll < 0.26 ? 'leaves-autumn' : 'leaves') }) },
    life: ({ landmark }) => [
      // The barn and the paddock (d-04): milkers with their pails, cows in the stalls and out, sheep's keepers.
      ...crowd('milker', ['Cô vắt sữa', 'Chú vắt sữa'], [person('e'), person('m')], landmark('chuong-bo'), 4, 2, [HELD.bucket, HELD.bucket]),
      ...crowd('cow', ['Bò sữa', 'Bò Đốm'], [animal('cow')], landmark('chuong-bo'), 6, 4),
      ...crowd('cow', ['Bò sữa', 'Bê con'], [animal('cow')], landmark('khu-chan-nuoi'), 9, 6),
      ...crowd('hen-keeper', ['Bà cho gà ăn', 'Cô nhặt trứng'], [person('i'), person('h')], landmark('chuong-ga'), 5, 2, [HELD.basket, HELD.basket]),
      ...crowd('chick', ['Gà con', 'Gà mái'], [animal('chick')], landmark('chuong-ga'), 6, 12),
      ...crowd('pig', ['Lợn con', 'Lợn mẹ'], [animal('pig')], landmark('chuong-lon'), 4, 6),
      // The crop beds and the fields (d-03): farmers with their hoes, reapers in the wheat.
      ...crowd('ploughman', ['Bác nông dân', 'Chú trồng bí'], [person('a'), person('j')], landmark('khu-trong-trot'), 10, 3, [HELD.hoe, HELD.carrot]),
      ...crowd('rice-planter', ['Cô gặt lúa mì', 'Chú bó lúa'], [person('k'), person('b')], landmark('ruong-lua-mi'), 14, 4, [HELD.basket]),
      ...crowd('ploughman', ['Bác trồng ngô'], [person('m'), person('e')], landmark('ruong-ngo'), 16, 3, [HELD.hoe]),
      // The orchard (d-06): apple pickers with their baskets.
      ...crowd('rice-planter', ['Cô hái táo', 'Bác hái táo', 'Anh hái cam'], [person('l'), person('a'), person('k')], landmark('vuon-cay'), 8, 3, [HELD.basket, HELD.apple]),
      // The pond (d-07): an angler on the jetty with his rod.
      ...crowd('ferryman', ['Chú câu cá', 'Ông câu cá'], [person('m'), person('b')], landmark('ao-ca'), 3, 2, [HELD.rod, HELD.fish]),
      // The glasshouse (d-05) and the storehouse kitchen (d-08).
      ...crowd('waterer', ['Cô chăm vườn kính'], [person('h')], landmark('nha-kinh'), 3, 2, [HELD.bucket]),
      ...crowd('home-cook', ['Bà làm bánh', 'Chú làm mứt'], [person('i'), person('j')], landmark('nha-kho'), 3, 2, [HELD.bread]),
      ...crowd('porter', ['Chú khuân bao bột', 'Anh chở nông sản'], [person('k'), person('c')], landmark('lo-banh'), 7, 2, [HELD.crate]),
      // The yard and its market (d-09), the farmhouse (d-12).
      // Each seller behind the counter of a stall.
      ...crowd('vendor', ['Cô bán bí'], [person('e')], landmark('sap-1'), 0, 1, [HELD.basket]),
      ...crowd('vendor', ['Bác bán táo'], [person('j')], landmark('sap-2'), 0, 1, [HELD.apple]),
      ...crowd('vendor', ['Chị bán rau'], [person('l')], landmark('sap-3'), 0, 1, [HELD.carrot]),
      ...crowd('shopper', ['Bà đi chợ', 'Chú mua rau', 'Bạn nhỏ đi chợ'], [person('i'), person('m'), person('n')], landmark('san-nong-trai'), 7, 3, [HELD.basket]),
      ...crowd('home-cook', ['Mẹ nấu cơm trưa'], [person('l')], landmark('nha-nong-trai'), 5, 1, [HELD.basket]),
      ...crowd('sweeper', ['Ông quét sân'], [person('a')], landmark('san-nong-trai'), 6, 1),
      // The rest under the great tree (d-11) and the meadow by the river: the children.
      ...crowd('pupil', ['Bạn Thỏ', 'Bạn Sóc', 'Bạn Cáo'], [person('f'), person('n'), person('o')], landmark('khu-nghi'), 6, 3, [HELD.book]),
      ...crowd('kite-flyer', ['Bạn thả diều'], [person('p'), person('q'), person('f')], landmark('bai-co-ven-song'), 14, 4, [HELD.kite]),
      ...crowd('dog', ['Chó chăn cừu', 'Cún nông trại'], [animal('dog')], landmark('cong-nong-trai'), 10, 3),
      ...crowd('cat', ['Mèo kho thóc', 'Mèo mướp'], [animal('cat')], landmark('nha-kho'), 6, 3),
      // Round the farm: the farmsteads' herds and hands, the hamlet's pets.
      ...crowd('cow', ['Bò vàng', 'Bò sữa'], [animal('cow')], landmark('dong-co-bo-sua'), 22, 10),
      ...crowd('cow', ['Bò ăn cỏ'], [animal('cow')], landmark('trang-trai-a'), 20, 6),
      ...crowd('milker', ['Cô chăn bò'], [person('h')], landmark('trang-trai-a'), 12, 1, [HELD.bucket]),
      ...crowd('ploughman', ['Chú làm đất'], [person('j')], landmark('trang-trai-b'), 16, 2, [HELD.hoe]),
      ...crowd('pig', ['Lợn ỉ'], [animal('pig')], landmark('trang-trai-c'), 14, 5),
      ...crowd('chick', ['Gà con'], [animal('chick')], landmark('trang-trai-b'), 10, 8),
      ...crowd('dog', ['Chó Vàng'], [animal('dog')], landmark('xom-nong-dan'), 12, 2),
      ...crowd('laundry', ['Cô phơi áo'], [person('e')], landmark('xom-nong-dan'), 10, 2, [HELD.basket]),
    ],
    build: (ctx) => buildFarm(ctx),
  });
}

function buildFarm(ctx: ZoneMapContext): void {
  const { world, block, rng } = ctx;
  const base = LEVEL + 1;
  const B = {
    planks: block('planks'), log: block('log'), dirt: block('dirt'), sand: block('sand'), stone: block('stone'), water: block('water'),
    leaves: block('leaves'), pink: block('leaves-pink'), autumn: block('leaves-autumn'), treeLog: block('tree-log'), board: block('board'),
    glass: block('glass'), snow: block('snow'), brickRed: block('brick-red'), brickGrey: block('brick-grey'), woodRed: block('wood-red'),
    roofBlue: block('roof-blue'), birch: block('birch-log'), moss: block('rock-moss'), cobble: block('cobble'), cobbleGrey: block('cobble-grey'),
    paver: block('paver'), farmland: block('farmland'), wheat: block('wheat'), lantern: block('lantern'), iron: block('iron'), grass: ctx.soil.grass,
  };
  const barnBlocks = { wall: B.woodRed, roof: B.brickGrey, trim: B.snow, floor: B.planks, glass: B.glass, lantern: B.lantern, stall: B.log };
  const keep = (r: Rect): void => ctx.keepOut(r.x0, r.z0, r.x1, r.z1);
  const yaw = (): number => Math.floor(rng() * 360);
  /** Open ground for a planted cell: off the ways, the water and what is built. */
  const plantable = (x: number, z: number): boolean => !ctx.onPath(x, z) && !ctx.nearPath(x, z, 2.5) && !nearWater(x, z, 1) && world.get(x, ctx.surface(x, z) + 1, z) === 0;
  /** Fence posts round a rectangle every two blocks, open where a way runs through and at `gaps`. */
  const fenceRing = (r: Rect, gaps: ReadonlyArray<readonly [number, number]> = []): void => {
    const open = (x: number, z: number): boolean => gaps.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 2.5) || ctx.nearPath(x, z, 2) || nearWater(x, z, 0);
    for (let x = r.x0; x <= r.x1; x += 2) for (const z of [r.z0, r.z1]) if (!open(x, z)) ctx.prop(M.fence, x, z, 0);
    for (let z = r.z0 + 2; z < r.z1; z += 2) for (const x of [r.x0, r.x1]) if (!open(x, z)) ctx.prop(M.fence, x, z, 90);
  };
  const flowers = (x: number, z: number, n: number): void => {
    for (let i = 0; i < n; i++) ctx.prop(FLOWERS[(x + z + i) % FLOWERS.length] ?? '', x + (i % 3), z + Math.floor(i / 3), (x * 7 + i * 41) % 360);
  };
  const lamp = (x: number, z: number): void => ctx.prop(STREET_LANTERN, x, z, 0);

  // ── Fillers ──
  /**
   * Golden wheat over tilled soil, a furrow every sixth row (d-01, d-03): a block high where it is seen from
   * afar, or (`stalks`, the fields the mock frames look at) patches of tall stalks two blocks square.
   */
  const wheatIn = (r: Rect, stalks = false): void => {
    for (let x = r.x0 + 1; x < r.x1; x++) {
      for (let z = r.z0 + 1; z < r.z1; z++) {
        if (!plantable(x, z)) continue;
        const s = ctx.surface(x, z);
        world.set(x, s, z, B.farmland);
        if ((z - r.z0) % 6 === 0) continue;
        if (!stalks) world.set(x, s + 1, z, B.wheat);
        else if ((x - r.x0) % 2 === 1 && [1, 3].includes((z - r.z0) % 6) && plantable(x + 1, z + 1)) ctx.propAt(M.wheatPatch, [x + 1, s + 1, z + 1], ((x * 7 + z) % 4) * 90);
      }
    }
  };
  /** Rows of tilled soil, `crop` every `every` blocks along each row, rows `gap` apart. */
  const rowsIn = (r: Rect, crop: (x: number, z: number) => string, every: number, gap: number): void => {
    for (let z = r.z0 + 2; z < r.z1 - 1; z += gap) {
      for (let x = r.x0 + 2; x < r.x1 - 1; x++) {
        if (!plantable(x, z)) continue;
        const s = ctx.surface(x, z);
        world.set(x, s, z, B.farmland);
        if ((x - r.x0) % every === 0) ctx.prop(crop(x, z), x, z, (x * 31 + z * 7) % 360);
      }
    }
  };
  const herd = (model: string, r: Rect, count: number): void => {
    for (let i = 0; i < count; i++) {
      const x = Math.round(r.x0 + 2 + rng() * (r.x1 - r.x0 - 4));
      const z = Math.round(r.z0 + 2 + rng() * (r.z1 - r.z0 - 4));
      if (!plantable(x, z)) continue;
      ctx.prop(model, x, z, yaw());
    }
  };
  /** A fruit tree with apples (or oranges) on its crown. */
  const fruitTree = (x: number, z: number, oranges: boolean, every = 6): void => {
    const fruit = placeFruitTree(world, x, z, ctx.surface(x, z) + 1, { log: B.treeLog, leaves: B.leaves }, 3 + ((x + z) % 2), 3, every);
    for (const at of fruit) ctx.propAt(oranges ? M.orange : M.appleFruit, at, (at[0] * 37) % 360);
  };
  const fill = (f: Field, i: number): void => {
    const r = f.r;
    switch (f.kind) {
      case 'wheat':
        wheatIn(r, f.variant === 1);
        fenceRing(r);
        for (let k = 0; k < 3; k++) if (i % 2 === 0) ctx.prop(M.hay, r.x0 - 2, r.z0 + 6 + k * 4, k * 30);
        if ((r.x1 - r.x0) > 40) ctx.prop(M.scarecrow, Math.round((r.x0 + r.x1) / 2), Math.round((r.z0 + r.z1) / 2), 0);
        break;
      case 'corn':
        rowsIn(r, () => M.corn, 2, 3);
        fenceRing(r);
        break;
      case 'pumpkin':
        rowsIn(r, () => M.pumpkin, 2, 3);
        fenceRing(r);
        ctx.prop(M.scarecrow, Math.round((r.x0 + r.x1) / 2), r.z0 + 3, 0);
        break;
      case 'sunflower':
        for (let z = r.z0 + 2; z < r.z1 - 1; z += 3) for (let x = r.x0 + 2; x < r.x1 - 1; x += 3) if (plantable(x, z)) ctx.prop(M.sunflower, x, z, 0);
        fenceRing(r);
        break;
      case 'veg': {
        const crops = [M.carrot, M.greens, M.melon, M.cabbage];
        rowsIn(r, (_x, z) => crops[(Math.floor(z / 3) + i) % crops.length] ?? M.carrot, 3, 3);
        fenceRing(r);
        ctx.prop(M.scarecrow, Math.round((r.x0 + r.x1) / 2), Math.round((r.z0 + r.z1) / 2), 0);
        break;
      }
      case 'pasture': {
        // A red shed and its hay in one corner, a trough of water, shade trees, cows and sheep (d-04).
        fenceRing(r);
        const shed = { x: r.x0 + 4, z: r.z0 + 4, w: 11, d: 7 };
        placeHouse(world, shed.x, shed.z, shed.w, shed.d, 4, base, { wall: B.woodRed, roof: B.brickGrey, trim: B.snow });
        ctx.keepOut(shed.x - 1, shed.z - 3, shed.x + shed.w, shed.z + shed.d);
        for (let k = 0; k < 3; k++) ctx.prop(M.hay, shed.x + shed.w + 2, shed.z + 1 + k * 2, k * 40);
        const [tx, tz] = [r.x1 - 10, r.z0 + 6];
        for (let dx = 0; dx < 6; dx++) for (let dz = -1; dz <= 1; dz++) world.set(tx + dx, base, tz + dz, dz === 0 && dx > 0 && dx < 5 ? B.water : B.planks);
        ctx.keepOut(tx, tz - 1, tx + 5, tz + 1);
        for (let t = 0; t < Math.floor((r.x1 - r.x0) * (r.z1 - r.z0) / 1400); t++) {
          const x = Math.round(r.x0 + 6 + rng() * (r.x1 - r.x0 - 12));
          const z = Math.round(r.z0 + 16 + rng() * Math.max(1, r.z1 - r.z0 - 22));
          if (plantable(x, z) && !ctx.keptOut(x, z, 3)) fruitTree(x, z, false, 99);
        }
        const area = (r.x1 - r.x0) * (r.z1 - r.z0);
        herd(M.cow, r, Math.min(14, Math.round(area / 900)));
        herd(M.sheep, r, Math.min(18, Math.round(area / 600)));
        if ((f.variant ?? 0) % 3 === 0) herd(M.pig, r, 3);
        break;
      }
      case 'orchard': {
        // Fruit trees in rows, crates of fruit and a ladder between them (d-06).
        let n = 0;
        for (let x = r.x0 + 4; x <= r.x1 - 3; x += 9) {
          for (let z = r.z0 + 4; z <= r.z1 - 3; z += 9) {
            if (!plantable(x, z) || ctx.nearPath(x, z, 4) || nearWater(x, z, 4)) continue;
            fruitTree(x, z, f.variant === 1, 7);
            if (n % 4 === 1) ctx.prop(M.appleCrate, x + 3, z + 1, n * 30);
            if (n % 6 === 2) ctx.prop(M.ladder, x + 1, z - 3, 0);
            n++;
          }
        }
        fenceRing(r);
        break;
      }
    }
    keep(r);
  };

  // ── The lessons' farm (chapter 1) ──
  buildLessonsFarm(ctx, B, { keep, fenceRing, flowers, lamp, wheatIn, rowsIn, herd, fruitTree });

  // ── The mountains behind the river (d-01, d-06, d-14): stone cliffs, moss on their ledges, falls into brooks ──
  for (let x = 0; x < SIZE; x++) {
    for (let z = Math.floor(ridge(x)) - 2; z < SIZE; z++) {
      const s = ctx.surface(x, z);
      if (s <= LEVEL + 2 || inWater(x, z)) continue;
      const steep = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx = 0, dz = 0]) => Math.abs(ctx.surface(x + dx, z + dz) - s)));
      if (steep < 2) continue;
      for (let y = s - 3; y <= s; y++) world.set(x, y, z, (x * 3 + y + z) % 5 === 0 ? B.moss : B.stone);
    }
  }
  // Peaks over the plateau, rock up their sides, green on their tops (the mock's mountains, d-01, d-06).
  for (let px = 30; px < SIZE - 20; px += 46) {
    const pz = Math.round(ridge(px) + 34 + 14 * Math.sin(px / 37));
    const radius = 18 + (px % 3) * 4;
    const peakTop = Math.min(46, LEVEL + 26 + (px % 5) * 3);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const [x, z] = [px + dx, pz + dz];
        const d = Math.hypot(dx, dz) / radius;
        if (d > 1 || x < 0 || z < 0 || x >= SIZE || z >= SIZE || FALLS.some((fx) => Math.abs(x - fx) < 10)) continue;
        const s = ctx.surface(x, z);
        const h = Math.round(Math.max(s, s + (peakTop - s) * (1 - d) ** 1.4 + Math.sin(x * 0.7 + z * 0.3)));
        for (let y = s + 1; y <= h; y++) put(world, x, y, z, y >= h - 1 && d > 0.15 ? B.leaves : (x + y + z) % 6 === 0 ? B.moss : B.stone);
      }
    }
  }
  for (const [i, fx] of FALLS.entries()) {
    const face = Math.floor(ridge(fx)) + 6;
    placeTallFall(world, fx, face, 40 - i * 3, ctx.surface, { rock: B.stone, moss: B.moss, cap: B.leaves, water: B.water });
    ctx.keepOut(fx - 9, Math.floor(ridge(fx)) - 2, fx + 9, face + 11);
    ctx.landmark(i === 0 ? 'thac-tay' : 'thac-dong', i === 0 ? 'Thác nước phía tây' : 'Thác nước phía đông', fx, Math.floor(ridge(fx)) - 4);
  }

  // ── The river: the humped stone bridges (d-14), reeds and lilies, boats on the lake ──
  for (const [i, x] of [400, 240].entries()) {
    const c = riverCenter(x);
    const reach = RIVER_HALF + 4;
    const bridge = placeArchBridge(world, [x, Math.floor(c - reach)], [x, Math.ceil(c + reach)], WATER_LEVEL + 1, WATER_LEVEL, { stone: B.brickGrey, rail: B.cobbleGrey });
    for (const [lx, lz] of bridge.lamps.filter((_, k) => k % 2 === 0)) lamp(lx, lz);
    ctx.landmark(i === 0 ? 'cau-da' : 'cau-da-tay', i === 0 ? 'Cầu đá qua sông' : 'Cầu đá về thác', x, Math.round(c), WATER_LEVEL + 4);
    // Open meadow on both banks by the bridge, so the falls are seen from it (d-14).
    ctx.keepOut(x - 14, Math.floor(c) - 24, x + 14, Math.floor(ridge(x)) - 1);
  }
  for (let x = 20; x < LAKE.x - LAKE.rx; x += 11) {
    const c = riverCenter(x);
    if (Math.abs(x - 400) < 8 || Math.abs(x - 240) < 8) continue;
    ctx.propAt(M.lily, [x + 0.5, WATER_LEVEL + 1.02, Math.round(c + ((x % 3) - 1) * 2) + 0.5], x * 13);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    ctx.propAt(M.canoe, [LAKE.x + Math.cos(a) * LAKE.rx * 0.55 + 0.5, WATER_LEVEL + 0.9, LAKE.z + Math.sin(a) * LAKE.rz * 0.55 + 0.5], k * 60);
  }
  jetty(ctx, LAKE.x - 20, Math.floor(LAKE.z - LAKE.rz) - 1, 12, 1, WATER_LEVEL, true);
  ctx.landmark('ho-nong-trai', 'Hồ sau nông trại', LAKE.x, LAKE.z - LAKE.rz + 4);
  ctx.landmark('bai-co-ven-song', 'Bãi cỏ ven sông', 300, 586);
  for (let x = 30; x < 620; x += 9) {
    const z = Math.round(riverCenter(x) - RIVER_HALF - 4);
    if (!ctx.onPath(x, z) && !ctx.nearPath(x, z, 3)) ctx.prop(FLOWERS[x % FLOWERS.length] ?? '', x, z, x);
  }

  // ── Farmsteads (c-09): the barn up its way between wheat fields, the farmhouse, a silo, a windmill ──
  const palette = cottagePalette(ctx);
  for (const [i, f] of FARMSTEADS.entries()) {
    const { x, z, w, d } = f.barn;
    const barn = placeRedBarn(world, x, z, w, d, base, barnBlocks, 5);
    ctx.keepOut(x - 4, z - 2, x + w + 3, z + d + 1);
    for (const [k, [sx, sz]] of barn.stalls.slice(0, 4).entries()) ctx.prop(k % 2 ? M.hay : M.milk, sx, sz, k * 40);
    const house = placeHouse(world, f.house.x, f.house.z, 13, 8, 4, base, { ...palette.finish, wall: palette.walls[i % 3] ?? B.sand, roof: B.brickRed, trim: B.log });
    for (const [bx, by, bz] of house.boxes) ctx.propAt(FLOWERS[(Math.floor(bx) + i) % 3] ?? '', [bx, by, bz], i * 20);
    ctx.keepOut(f.house.x - 1, f.house.z - 3, f.house.x + 13, f.house.z + 8);
    ctx.prop(M.mailbox, house.door[0] + 3, f.house.z - 3, 0);
    placeSilo(world, f.silo[0], f.silo[1], base, { wall: B.birch, band: B.woodRed, roof: B.brickGrey });
    ctx.keepOut(f.silo[0] - 4, f.silo[1] - 4, f.silo[0] + 4, f.silo[1] + 4);
    placeWindmill(world, f.mill[0], f.mill[1], base, { planks: B.planks, log: B.log, roof: B.brickRed, sail: B.snow, stone: B.cobbleGrey, glass: B.glass }, 9);
    ctx.keepOut(f.mill[0] - 5, f.mill[1] - 4, f.mill[0] + 5, f.mill[1] + 5);
    for (let k = 0; k < 3; k++) ctx.prop(M.hay, x + w + 2, z + 3 + k * 2, k * 25);
    ctx.prop(M.cartRed, x - 3, z + 4, 90);
    lamp(barn.door[0] - 4, z - 2);
    ctx.landmark(f.id, 'Trang trại', barn.door[0], barn.door[1]);
  }
  ctx.landmark('ruong-lua-mi', 'Ruộng lúa mì', 270, 170);
  // The way up to farmstead A stays open between its fields (c-09).
  ctx.keepOut(243, 100, 251, 196);
  for (const [x, z, a] of [[256, 150, 60], [259, 156, 200], [262, 147, 300], [256, 160, 120]] as const) ctx.prop(M.cow, x, z, a);
  for (const [x, z] of [[264, 152], [266, 158]] as const) ctx.prop(M.sheep, x, z, x * 9);
  ctx.landmark('ruong-ngo', 'Ruộng ngô', 343, 266);
  ctx.landmark('dong-co-bo-sua', 'Đồng cỏ bò sữa', 570, 367);
  ctx.landmark('xom-nong-dan', 'Xóm nông dân', 84, 466);

  // ── The fields, then the hamlets along the lanes where room is left, then the lanes' verges ──
  for (const [i, f] of FIELDS.entries()) fill(f, i);
  placeWell(world, 84, 466, LEVEL, { stone: B.brickGrey, water: B.water });
  ctx.keepOut(82, 464, 86, 468);
  hamlet(ctx, 20, 446, 150, 528, 24);
  for (const route of [R.westNorth, R.eastNorth, R.west, R.east]) streetHouses(ctx, route, { setback: 6, gap: 6 });
  for (const route of [R.north, R.lane, R.south, R.riverWest, R.riverEast]) laneVerge(ctx, route, { spacing: 4, lampEvery: 18 });
  for (const route of [R.westNorth, R.eastNorth, R.west, R.east, R.barnA, R.falls]) laneVerge(ctx, route, { spacing: 7, lampEvery: 28 });
}

interface FarmTools {
  keep: (r: Rect) => void;
  fenceRing: (r: Rect, gaps?: ReadonlyArray<readonly [number, number]>) => void;
  flowers: (x: number, z: number, n: number) => void;
  lamp: (x: number, z: number) => void;
  wheatIn: (r: Rect, stalks?: boolean) => void;
  rowsIn: (r: Rect, crop: (x: number, z: number) => string, every: number, gap: number) => void;
  herd: (model: string, r: Rect, count: number) => void;
  fruitTree: (x: number, z: number, oranges: boolean, every?: number) => void;
}

/** A world point of a structure built turned (its frame's float point, FRAME-based). */
const turned = (origin: readonly [number, number], facing: Facing, [u, y, v]: readonly [number, number, number]): [number, number, number] => {
  const [x, z] = frameCell(origin, facing, Math.floor(u), Math.floor(v));
  return [x + 0.5, y, z + 0.5];
};

/** The lessons' farm, frame by frame of the detail mock. */
function buildLessonsFarm(ctx: ZoneMapContext, B: Record<string, number>, t: FarmTools): void {
  const { world } = ctx;
  const base = LEVEL + 1;
  const b = (name: string): number => B[name] ?? 0;
  const keepRect = (x0: number, z0: number, x1: number, z1: number): void => ctx.keepOut(x0, z0, x1, z1);

  // The farm's fence, open at the gate and where the lanes come in.
  t.fenceRing(rect(FARM.x0 - 2, FARM.z0 - 2, FARM.x1 + 2, FARM.z1 + 2), [[GATE.x - 3, FARM.z0 - 2], [GATE.x + 3, FARM.z0 - 2]]);

  // ── The gate (d-02): stone feet, timber posts and beam, the cat sign on top, lanterns, the farm's name board ──
  const gate = placeFarmGate(world, GATE.x, GATE.z, base, { stone: b('cobbleGrey'), post: b('log'), beam: b('planks'), door: b('planks'), lantern: b('lantern') }, 9, 7);
  ctx.propAt(M.catSign, gate.sign, 0);
  ctx.prop(M.farmSign, 2 * GATE.x - gate.board[0], gate.board[1], 0);
  keepRect(GATE.x - 8, GATE.z - 1, GATE.x + 8, GATE.z + 6);
  // The way up to the gate stays open (the mock sees the gate whole from the spawn).
  keepRect(GATE.x - 12, GATE.z - 22, GATE.x + 12, GATE.z - 2);
  for (const side of [-1, 1]) {
    const x = GATE.x + side * 7;
    for (let dz = -1; dz <= 1; dz++) for (let y = base; y < base + 2; y++) world.set(x + side, y, GATE.z + dz, y === base ? b('pink') : b('leaves'));
    ctx.prop(M.flowerPot, GATE.x + side * 6, GATE.z - 2, 0);
    t.flowers(GATE.x + side * 9 - 1, GATE.z - 4, 6);
  }
  ctx.landmark('cong-nong-trai', 'Cổng nông trại', GATE.x, GATE.z - 3);
  // The way in is paved from the gate to the yard (d-02).
  for (let z = GATE.z - 4; z <= YARD.z - YARD.r; z++) for (let x = GATE.x - 2; x <= GATE.x + 2; x++) if (ctx.onPath(x, z) || Math.abs(x - GATE.x) <= 1) world.set(x, ctx.surface(x, z), z, b('cobble'));

  // ── The crop beds (d-03): wheat, pumpkins among their leaves, a scarecrow, sunflowers along the way ──
  const wheatA = rect(306, 356, 338, 372);
  const wheatB = rect(346, 356, 388, 376);
  const pumpkins = rect(338, 380, 366, 396);
  for (const r of [wheatA, wheatB]) {
    t.wheatIn(r, true);
    t.fenceRing(r);
    t.keep(r);
  }
  t.rowsIn(pumpkins, () => M.pumpkin, 2, 2);
  t.fenceRing(pumpkins);
  t.keep(pumpkins);
  ctx.prop(M.scarecrow, 357, 368, 0);
  for (let z = 358; z <= 386; z += 2) ctx.prop(M.sunflower, 392, z, 0);
  ctx.keepOut(391, 357, 393, 387);
  ctx.landmark('khu-trong-trot', 'Khu trồng trọt', 376, 386);
  // East of the way: maize, more pumpkins, a sunflower field.
  const maize = rect(410, 356, 448, 398);
  const pumpkinsE = rect(456, 356, 496, 376);
  const sunflowers = rect(456, 382, 496, 400);
  t.rowsIn(maize, () => M.corn, 2, 3);
  t.rowsIn(pumpkinsE, () => M.pumpkin, 2, 2);
  for (let z = sunflowers.z0 + 2; z < sunflowers.z1; z += 3) for (let x = sunflowers.x0 + 2; x < sunflowers.x1; x += 2) ctx.prop(M.sunflower, x, z, 0);
  for (const r of [maize, pumpkinsE, sunflowers]) {
    t.fenceRing(r);
    t.keep(r);
  }
  ctx.prop(M.scarecrow, 476, 366, 0);

  // ── The windmill and the bread oven (d-13): sacks of flour at the mill's door, tables of loaves ──
  const mill = { x: 322, z: 386 };
  placeWindmill(world, mill.x, mill.z, base, { planks: b('planks'), log: b('log'), roof: b('brickRed'), sail: b('snow'), stone: b('cobbleGrey'), glass: b('glass') }, 10);
  ctx.keepOut(mill.x - 5, mill.z - 4, mill.x + 5, mill.z + 5);
  ctx.landmark('coi-xay-gio', 'Cối xay gió', mill.x, mill.z - 6);
  const oven = placeBreadOven(world, 330, 392, base, { brick: b('cobbleGrey'), roof: b('brickRed'), hearth: b('brickGrey') });
  ctx.propAt(M.fire, oven.fire, 0);
  ctx.keepOut(329, 390, 335, 397);
  ctx.prop(M.breadTable, 336, 388, 90);
  ctx.prop(M.breadTable, 326, 378, 90);
  ctx.prop(M.sacks, 318, 380, 20);
  ctx.prop(M.sacks, 336, 383, 70);
  for (let x = 312; x <= 344; x++) for (let z = 377; z <= 384; z++) if (world.get(x, base, z) === 0 && (x + z) % 7 !== 0) world.set(x, ctx.surface(x, z), z, b('cobble'));
  ctx.landmark('lo-banh', 'Lò bánh mì', 333, 387);

  // ── The farmhouse (d-12), its front to the yard, the quest board beside it (d-10) ──
  const palette = cottagePalette(ctx);
  const { beam: _beam, ...plain } = palette.finish;
  const homeFinish = { ...plain, roof: b('brickRed'), trim: b('log') };
  const facing: Facing = 'east';
  const main = { origin: [382, 400] as const, w: 15, d: 9 };
  const wing = { origin: [386, 389] as const, w: 9, d: 7 };
  for (const [k, part] of [main, wing].entries()) {
    const writer = facingWriter(world, part.origin, facing);
    const front = placeHouse(writer, FRAME, FRAME, part.w, part.d, k === 0 ? 5 : 4, base, { ...homeFinish, wall: k === 0 ? b('sand') : b('birch') });
    for (const box of front.boxes) ctx.propAt(FLOWERS[k % 3] ?? '', turned(part.origin, facing, box), k * 30);
    const [x0, z0] = frameCell(part.origin, facing, FRAME - 1, FRAME - 3);
    const [x1, z1] = frameCell(part.origin, facing, FRAME + part.w, FRAME + part.d);
    keepRect(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1));
  }
  // A porch over the door: a plank roof on two log posts.
  for (let x = 383; x <= 386; x++) for (let z = 404; z <= 410; z++) world.set(x, base + 3 + (x === 383 ? 1 : 0), z, b('brickRed'));
  for (const z of [404, 410]) for (let y = base; y < base + 3; y++) world.set(386, y, z, b('log'));
  ctx.prop(M.mailbox, 388, 402, 90);
  ctx.prop(M.toolSign, 388, 413, 90);
  ctx.prop(M.bench, 384, 412, 90);
  t.flowers(383, 412, 3);
  ctx.landmark('nha-nong-trai', 'Nhà nông trại', 387, 407);
  ctx.prop(M.questBoard, 390, 398, 90);
  ctx.prop(M.jars, 389, 402, 90);
  t.flowers(388, 395, 3);
  ctx.landmark('bang-nhiem-vu', 'Bảng nhiệm vụ', 391, 398);

  // ── The yard where the lanes meet (d-01, d-09): paved, the market stalls on its north-east ──
  placePlaza(world, YARD.x, YARD.z, YARD.r, LEVEL, { paver: b('cobble'), border: b('cobbleGrey') });
  for (const [dx, dz] of [[7, -6], [-7, 7], [7, 7]] as const) t.lamp(YARD.x + dx, YARD.z + dz);
  ctx.prop(M.hay, YARD.x - 4, YARD.z + 3, 20);
  ctx.prop(M.milk, YARD.x - 5, YARD.z + 1, 0);
  ctx.prop(M.milk, YARD.x - 4, YARD.z + 1, 0);
  ctx.landmark('san-nong-trai', 'Sân nông trại', YARD.x, YARD.z);
  const awnings = [[b('woodRed'), b('snow')], [b('roofBlue'), b('sand')], [b('roofBlue'), b('snow')]];
  const produce = [[M.pumpkinBig, M.carrotFood, M.pumpkinBig], [M.apple, M.appleFruit, M.apple], [M.cabbage, M.carrotFood, M.cabbage]];
  /** Where each stall's seller stands, named last among the landmarks (the review pictures the first ones). */
  const sellers: Array<[number, number]> = [];
  for (let i = 0; i < 3; i++) {
    // A stall facing south onto the lane, its counter toward the shoppers.
    const origin: [number, number] = [416 + i * 8, 412];
    const writer = facingWriter(world, origin, 'south');
    const stall = placeStall(writer, FRAME, FRAME, 5, 3, base, { log: b('log'), planks: b('planks'), stripes: awnings[i] ?? [] });
    for (let k = 0; k < 3; k++) {
      const [cx, cy, cz] = turned(origin, 'south', [stall.counter[0] - 1 + k, stall.counter[1], stall.counter[2]]);
      ctx.propAt(produce[i]?.[k] ?? M.apple, [cx, cy, cz], k * 40);
    }
    sellers.push(frameCell(origin, 'south', stall.seller[0], stall.seller[1]));
    for (const crate of stall.crates) ctx.propAt(i === 1 ? M.appleCrate : M.hay, turned(origin, 'south', crate), 0);
    ctx.propAt(M.signs[i] ?? M.appleFruit, turned(origin, 'south', [FRAME + 2, base + 4, FRAME + 1]), 0);
    const [sx0, sz0] = frameCell(origin, 'south', FRAME - 2, FRAME - 2);
    const [sx1, sz1] = frameCell(origin, 'south', FRAME + 6, FRAME + 3);
    keepRect(Math.min(sx0, sx1), Math.min(sz0, sz1), Math.max(sx0, sx1), Math.max(sz0, sz1));
  }
  ctx.landmark('cho-nong-san', 'Chợ nông sản', 426, 417);

  // ── The red barn (d-04, c-09): its doors to the yard, cows in the stalls, hay and pails inside ──
  const barn = placeRedBarn(world, 385, 434, 29, 20, base, { wall: b('woodRed'), roof: b('brickGrey'), trim: b('snow'), floor: b('planks'), glass: b('glass'), lantern: b('lantern'), stall: b('log') });
  ctx.keepOut(381, 432, 417, 454);
  for (const [k, [sx, sz]] of barn.stalls.entries()) ctx.prop(k % 3 === 0 ? M.hay : k % 3 === 1 ? M.milk : M.bucket, sx, sz, k * 30);
  for (let x = barn.inside.x0 + 4; x < barn.inside.x1 - 3; x += 3) ctx.prop(M.hay, x, barn.inside.z1, 0);
  for (const side of [-1, 1]) t.lamp(barn.door[0] + side * 7, barn.door[1]);
  const pen = rect(407, 424, 417, 431);
  t.fenceRing(pen, [[407, 428]]);
  for (const [x, z, a] of [[409, 426, 30], [411, 429, 200], [414, 426, 120], [415, 429, 300]] as const) ctx.prop(M.sheep, x, z, a);
  ctx.prop(M.cow, 412, 427, 250);
  ctx.prop(M.hay, 409, 430, 0);
  t.keep(pen);
  ctx.landmark('chuong-bo', 'Chuồng bò đỏ', 399, 444);
  ctx.landmark('cua-chuong-bo', 'Cửa chuồng bò', barn.door[0], barn.door[1] - 6);

  // ── The paddock beside the barn (d-04): cows, sheep, the trough; the hen house and the pigsty ──
  const paddock = rect(420, 436, 462, 466);
  t.fenceRing(paddock, [[441, 436]]);
  for (let dx = 0; dx < 7; dx++) for (let dz = -1; dz <= 1; dz++) world.set(450 + dx, base, 460 + dz, dz === 0 && dx > 0 && dx < 6 ? b('water') : b('planks'));
  ctx.keepOut(450, 459, 456, 461);
  for (const [x, z, a] of [[423, 440, 30], [426, 442, 200], [424, 445, 120], [429, 439, 300], [433, 444, 80]] as const) ctx.prop(M.sheep, x, z, a);
  ctx.prop(M.cow, 430, 447, 150);
  t.herd(M.sheep, paddock, 6);
  t.herd(M.cow, paddock, 3);
  ctx.prop(M.milk, 423, 438, 0);
  ctx.prop(M.hay, 425, 439, 30);
  t.keep(paddock);
  ctx.landmark('khu-chan-nuoi', 'Khu chăn nuôi', 441, 451);
  placeHouse(world, 467, 436, 9, 6, 3, base, { wall: b('planks'), roof: b('woodRed'), trim: b('log') });
  const run = rect(466, 444, 478, 452);
  t.fenceRing(run, [[472, 444]]);
  t.herd(M.chick, run, 5);
  t.keep(rect(466, 433, 478, 452));
  ctx.landmark('chuong-ga', 'Chuồng gà', 472, 448);
  const sty = rect(466, 456, 480, 466);
  for (let x = sty.x0 + 1; x < sty.x1; x++) for (let z = sty.z0 + 1; z < sty.z1; z++) world.set(x, LEVEL, z, b('dirt'));
  t.fenceRing(sty, [[473, 456]]);
  t.herd(M.pig, sty, 3);
  t.keep(sty);
  ctx.landmark('chuong-lon', 'Chuồng lợn', 473, 461);

  // ── The storehouse and its kitchen (d-08), walked into: jars on the shelves, the oven alight, tables of sacks ──
  const store = placeStorehouse(world, 474, 472, 23, 15, base, { wall: b('planks'), beam: b('log'), roof: b('brickRed'), plinth: b('cobbleGrey'), floor: b('planks'), shelf: b('planks'), brick: b('cobbleGrey'), lantern: b('lantern'), glass: b('glass') });
  for (const at of store.shelves) ctx.propAt(M.jars, at, 0);
  ctx.propAt(M.fire, store.fire, 0);
  ctx.propAt(M.breadTable, [store.floor.x0 + 2.5, base, store.floor.z0 + 3.5], 0);
  ctx.propAt(M.sacks, [store.floor.x0 + 0.5, base, store.floor.z1 - 0.5], 0);
  ctx.propAt(M.hay, [store.floor.x1 - 4.5, base, store.floor.z0 + 0.5], 0);
  ctx.propAt(M.milk, [store.floor.x1 - 2.5, base, store.floor.z0 + 0.5], 0);
  // Jar shelves down the west wall, a second table, sacks by the oven, lanterns hung from the beams.
  for (const z of [477, 480, 483]) ctx.propAt(M.jars, [475.45, base, z + 0.5], 90);
  ctx.propAt(M.breadTable, [store.floor.x0 + 6.5, base, store.floor.z0 + 6.5], 90);
  ctx.propAt(M.sacks, [store.floor.x1 - 1.5, base, store.floor.z1 - 2.5], 40);
  ctx.propAt(M.sacks, [store.floor.x1 - 0.5, base, store.floor.z1 - 4.5], 200);
  for (const [x, z] of [[479, 476], [485, 479], [491, 476], [481, 482]] as const) ctx.propAt(M.hangLamp, [x + 0.5, base + 4.25, z + 0.5], 0);
  for (const [x, z, model] of [[494, 475, M.barrel], [494, 477, M.barrel], [493, 476, M.crate], [477, 474, M.crate], [478, 474, M.hay]] as const) ctx.propAt(model, [x + 0.5, base, z + 0.5], x * 13);
  ctx.keepOut(473, 469, 497, 487);
  ctx.landmark('nha-kho', 'Nhà kho chế biến', 486, 480);

  // ── The glasshouse (d-05), walked into: strawberry and flower pots on its benches, lanterns under the ridge ──
  const glass = placeGlasshouse(world, 418, 482, 19, 15, base, { frame: b('log'), glass: b('glass'), floor: b('paver'), bench: b('planks'), plinth: b('cobbleGrey') });
  for (const [k, at] of glass.benches.entries()) ctx.propAt(k % 3 === 0 ? M.flowerPot : M.strawberry, at, k * 45);
  for (const at of glass.ridge) ctx.propAt(M.hangLamp, at, 0);
  for (let z = 485; z <= 493; z += 2) for (const x of [421, 433]) ctx.prop(z % 4 === 1 ? M.strawberry : M.flowerPot, x, z, z * 20);
  ctx.keepOut(417, 479, 437, 497);
  ctx.landmark('nha-kinh', 'Nhà kính', 427, 489);

  // ── The rest under the great tree (d-11): lanterns hung in it, tables and parasols, flowers round ──
  const tree = { x: 462, z: 497 };
  const shade = placeShadeTree(world, tree.x, tree.z, base, { core: b('log'), log: b('treeLog'), leaves: b('leaves') }, ctx.rng);
  ctx.keepOut(tree.x - 2, tree.z - 2, tree.x + 2, tree.z + 2);
  for (let x = tree.x - 9; x <= tree.x + 9; x++) {
    for (let z = tree.z - 9; z <= tree.z + 9; z++) {
      const d = Math.hypot(x - tree.x, z - tree.z);
      if (d < 9 && d > 2 && world.get(x, base, z) === 0) world.set(x, LEVEL, z, d > 8 ? b('cobbleGrey') : (x + z) % 5 === 0 ? b('paver') : b('cobble'));
    }
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3;
    const r = k % 2 ? 4 : 7;
    ctx.propAt(M.hangLamp, [tree.x + Math.cos(a) * r + 0.5, shade.under - 0.75, tree.z + Math.sin(a) * r + 0.5], 0);
  }
  for (const [dx, dz, parasol] of [[-5, -5, true], [1, -6, false], [5, -3, true], [-6, 2, false], [5, 4, true], [-2, 6, false]] as const) {
    ctx.prop(M.picnic, tree.x + dx, tree.z + dz, dx * 10);
    if (parasol) ctx.prop(M.parasol, tree.x + dx + 2, tree.z + dz + 1, 0);
  }
  t.flowers(tree.x - 12, tree.z - 2, 6);
  t.flowers(tree.x + 10, tree.z - 9, 6);
  ctx.landmark('khu-nghi', 'Khu nghỉ dưới gốc cây', tree.x, tree.z - 6);

  // ── The fish pond (d-07): a stone edge, a fishing jetty, a plank landing on the far side, lilies ──
  for (let x = POND.x - POND.rx - 2; x <= POND.x + POND.rx + 2; x++) {
    for (let z = POND.z - POND.rz - 2; z <= POND.z + POND.rz + 2; z++) {
      if (inWater(x, z) || !nearWater(x, z, 1) || ctx.onPath(x, z)) continue;
      world.set(x, ctx.surface(x, z), z, (x + z) % 4 === 0 ? b('moss') : b('cobbleGrey'));
    }
  }
  const jettyX = POND.x;
  let bank = POND.z - POND.rz;
  while (inWater(jettyX, bank)) bank--;
  for (let k = 1; k <= 9; k++) {
    for (let dx = -1; dx <= 1; dx++) world.set(jettyX + dx, WATER_LEVEL + 1, bank + k, b('planks'));
    if (k % 3 === 0) for (const dx of [-2, 2]) for (let y = WATER_LEVEL - 1; y <= WATER_LEVEL + 2; y++) world.set(jettyX + dx, y, bank + k, b('log'));
  }
  ctx.prop(M.bucket, jettyX + 2, bank, 0);
  ctx.prop(M.logs, jettyX - 4, bank - 1, 90);
  const far = { x: POND.x + 14, z: POND.z + 6 };
  for (let dx = 0; dx < 6; dx++) for (let dz = 0; dz < 3; dz++) if (inWater(far.x + dx, far.z + dz)) world.set(far.x + dx, WATER_LEVEL + 1, far.z + dz, b('planks'));
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const r = 0.45 + 0.4 * (((k * 3) % 4) / 4);
    const [x, z] = [POND.x + Math.cos(a) * POND.rx * r, POND.z + Math.sin(a) * POND.rz * r];
    if (Math.abs(x - jettyX) > 3) ctx.propAt(M.lily, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], k * 40);
  }
  placeHouse(world, 359, 459, 7, 6, 3, base, { wall: b('planks'), roof: b('roofBlue'), trim: b('log'), glass: b('glass'), lantern: b('lantern') });
  ctx.keepOut(358, 456, 366, 465);
  ctx.prop(M.barrel, 360, 457, 0);
  ctx.landmark('ao-ca', 'Ao cá', jettyX, bank + 2);

  // ── The apple orchard (d-06): round trees heavy with fruit, a ladder, crates of apples ──
  let n = 0;
  for (const x of [305, 315, 324, 336, 345, 355]) {
    for (const z of [491, 502]) {
      if (ctx.nearPath(x, z, 5) || nearWater(x, z, 4)) continue;
      const fruit = placeFruitTree(world, x, z, base, { log: b('treeLog'), leaves: b('leaves') }, 3, 4, 3);
      t.flowers(x - 1, z + 2, 3);
      for (const at of fruit) ctx.propAt(n % 4 === 3 ? M.orange : M.appleFruit, at, (at[0] * 37) % 360);
      n++;
    }
  }
  for (let z = 484; z <= 507; z++) for (let x = 329; x <= 331; x++) if (!inWater(x, z)) world.set(x, ctx.surface(x, z), z, ctx.soil.path);
  ctx.prop(M.ladder, 322, 489, 0);
  ctx.prop(M.appleCrate, 328, 491, 20);
  ctx.prop(M.appleCrate, 332, 495, 60);
  ctx.prop(M.appleCrate, 329, 499, 0);
  ctx.prop(M.workbench, 331, 503, 90);
  ctx.landmark('vuon-cay', 'Vườn cây ăn quả', 326, 492);

  for (const [i, [sx, sz]] of sellers.entries()) ctx.landmark(`sap-${i + 1}`, 'Sạp nông sản', sx, sz);

  // Lamps along the farm's inner ways.
  for (const [x, z] of [[404, 370], [380, 450], [366, 486], [480, 440], [490, 456]] as const) t.lamp(x, z);
}

await runIfMain(import.meta.url, generateNongTrai);

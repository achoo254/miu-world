// Generates "Làng Ven Sông" (Tiếng Việt weeks 1–4) from a fixed seed, 800 x 800 blocks after the owner's
// village and lake mocks (designs/lang-ven-song/, designs/the-gioi/b-04-ho-song-toan-canh.png,
// b-09-ben-tau-toan-canh.png): a wide river winds across the map, bamboo bridges and a ferry cross it, and
// it opens east into a lake with a harbour, sailboats, a beach and a red-and-white lighthouse. Four
// districts, one per chapter: the village gate under the banyan with the little school and the well
// (chapter 1), the meadow by the river with the flower garden and its beehives (chapter 2), the landing and
// the class under the banyan on the north bank (chapter 3), the lotus marsh and the village football field
// (chapter 4). Between them: rice paddies inside earth dykes, hamlets of tiled-roof cottages round shared
// yards, lamp-lit lanes, bamboo hedges, fruit trees. After the detail mock of the village (02/10/2026,
// designs/lang-ven-song/d-*, the outdoor frames; the home frames are Xóm Mái Ấm's): a gate arch with its
// banner and lamps on the way in from the spawn, the village square with its fountain, market stalls, the
// blossom tree with benches and the notice board, the bell tower over it, the windmill in a golden wheat
// field, humped stone bridges over the river, cobbled lanes with flowers along their verges.
// Output: assets/generated/world/lang-ven-song/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { bambooHedge, cottagePalette, cottageRow, flowerBed, hamlet, jetty, laneVerge, STREET_LANTERN, streetHouses } from './scenery';
import { animal, crowd, person } from './village-life';
import { placeHouse } from './structures/buildings';
import { placeCatStatue, placeFountain, placeLighthouse, placeStall, placeWell, placeWindmill } from './structures/countryside';
import { placeArchBridge, placeGateArch, placePlaza, placeTower } from './structures/landmarks';
import { facingWriter, FRAME } from './structures/world-writer';
import type { Point } from './structures/path';
import { placeAncientTree } from './structures/tree';
import { generateZoneMap, type Zone } from './zone-map';

export const MAP_ID = 'lang-ven-song';
const SIZE = 800;
const WATER_LEVEL = 10;

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'dau-lang', name: 'Đầu làng', x: 190, z: 210, hx: 34, hz: 28 },
  { chapter: 2, id: 'bai-co-ven-song', name: 'Bãi cỏ ven sông', x: 520, z: 250, hx: 36, hz: 28 },
  { chapter: 3, id: 'ben-song', name: 'Bến sông', x: 200, z: 560, hx: 36, hz: 28 },
  { chapter: 4, id: 'dam-sen', name: 'Đầm sen và sân bóng', x: 520, z: 600, hx: 38, hz: 30 },
];

/** The river's centre line across the map. */
export function riverCenter(x: number): number {
  return 400 + 34 * Math.sin(x / 70) + 10 * Math.sin(x / 23 + 0.7);
}
const RIVER_HALF = 9;
/** The lake the river opens into at the east, and the spit the lighthouse stands on. */
const LAKE = { x: 700, z: 410, rx: 90, rz: 130 };
const SPIT = { x: 640, z: 300 };
const MARSH = { x: 560, z: 640, r: 16 };

/** The two village lanes along the banks, the bridges between them, a spur into each district. */
const LANE_SOUTH: Point[] = [[30, 300], [250, 290], [470, 300], [600, 280]];
const LANE_NORTH: Point[] = [[30, 500], [250, 500], [470, 510], [600, 520]];
/** The village square west of the gate district, its bell tower north of it, the windmill in its wheat field. */
const SQUARE = { x: 100, z: 235, r: 13 };
const TOWER = { x: 100, z: 212 };
const MILL = { x: 205, z: 130 };
/** The craft workshop's footprint corner (11 x 9), east of the square. */
const WORKSHOP = { x0: 126, z0: 204 };
const WHEAT = { x0: 172, z0: 98, x1: 238, z1: 164 };
/** Where the way from the spawn passes under the village gate. */
const GATE = { x: 60, z: 84 };
/** The stone bridges: where the two crossings meet the river. */
const BRIDGES = [120, 360];
const ROUTES: Point[][] = [
  [[60, 60], [60, 300]],
  [[60, SQUARE.z], [156, SQUARE.z]],
  LANE_SOUTH,
  LANE_NORTH,
  [[120, 296], [120, 500]],
  [[360, 296], [360, 505]],
  ...ZONES.map((zn): Point[] => [[zn.x, zn.z < 400 ? 296 : 505], [zn.x, zn.z]]),
  // Dykes through the paddies.
  [[330, 60], [330, 296]],
  [[330, 505], [330, 760]],
];
/** Rice paddies (inclusive) between the districts. */
const PADDIES = [
  { x0: 260, z0: 70, x1: 440, z1: 260 },
  { x0: 40, z0: 340, x1: 300, z1: 380 },
  { x0: 280, z0: 540, x1: 440, z1: 760 },
  { x0: 620, z0: 600, x1: 760, z1: 760 },
];

const N = PACK.nature;
const M = {
  rice: `${N}/crops_wheatStageA.glb`,
  riceRipe: `${N}/crops_wheatStageB.glb`,
  lily: `${N}/lily_large.glb`,
  lilySmall: `${N}/lily_small.glb`,
  fence: `${N}/fence_simple.glb`,
  logs: `${N}/log_stack.glb`,
  box: `${PACK.survival}/box-large.glb`,
  workbench: `${PACK.survival}/workbench.glb`,
  rock: `${N}/rock_largeB.glb`,
};

/** What the village's people hold at their work. */
const L = {
  basket: `${PACK.props}/basket.glb`,
  book: `${PACK.props}/open-book.glb`,
  spoon: `${PACK.food}/cooking-spoon.glb`,
  shirt: `${PACK.props}/t-shirt.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  carrot: `${PACK.food}/carrot.glb`,
  kite: `${PACK.props}/kite.glb`,
  flower: `${N}/flower_redA.glb`,
  paddle: `${N}/canoe_paddle.glb`,
  fish: `${PACK.survival}/fish.glb`,
  crate: `${PACK.survival}/box.glb`,
  cup: `${PACK.food}/cup-tea.glb`,
};

/** The village square's things (designs/lang-ven-song/d-08, d-11). */
const SQ = {
  bench: `${PACK.box}/park-bench.glb`,
  sign: `${PACK.survival}/signpost.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  produce: [`${PACK.food}/cabbage.glb`, `${PACK.food}/carrot.glb`, `${PACK.food}/apple.glb`, `${PACK.food}/pumpkin.glb`, `${PACK.food}/pear.glb`, `${PACK.food}/banana.glb`],
  desk: `${PACK.furniture}/desk.glb`,
  chair: `${PACK.furniture}/chair.glb`,
  bookcase: `${PACK.furniture}/bookcaseOpen.glb`,
  workbench: `${PACK.survival}/workbench.glb`,
  anvil: `${PACK.survival}/workbench-anvil.glb`,
  crate: `${PACK.survival}/box-large.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  basket: `${PACK.props}/basket.glb`,
  axe: `${PACK.survival}/tool-axe.glb`,
  hoe: `${PACK.survival}/tool-hoe.glb`,
  crateSmall: `${PACK.survival}/box.glb`,
};

const inWater = (x: number, z: number): boolean =>
  (x < LAKE.x && Math.abs(z - riverCenter(x)) < RIVER_HALF + 2 * Math.sin(x / 31)) ||
  ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2 < 1 ||
  Math.hypot(x - MARSH.x, z - MARSH.z) < MARSH.r;

export async function generateLangVenSong() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'lang-ven-song',
    seedText: 'miu-lang-ven-song',
    outland: 'river',
    soil: { grass: 'grass-village', path: 'cobble' },
    size: SIZE,
    zones: ZONES,
    spawn: { x: 60, z: 70, yaw: 0 },
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    rides: { vehicle: { name: 'Đò', label: 'Lên đò', model: `${N}/canoe.glb` } },
    trees: { skip: 0.8, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.12 ? 'leaves-autumn' : roll < 0.3 ? 'leaves-pink' : 'leaves') }) },
    life: ({ zone, landmark }) => {
      const [gate, meadow, landing, marsh] = [1, 2, 3, 4].map(zone) as [Zone, Zone, Zone, Zone];
      const c = (zn: Zone, dx: number, dz: number): readonly [number, number] => [zn.x + dx, zn.z + dz];
      return [
        // The gate's guard, the square's sellers and shoppers, the miller and the reapers in the wheat.
        ...crowd('sentry', ['Bác gác cổng làng'], [person('a')], [GATE.x + 7, GATE.z - 2], 2, 1),
        ...crowd('vendor', ['Cô bán rau', 'Bác bán hoa quả', 'Chị bán bí'], [person('e'), person('j'), person('h')], landmark('cho-nho'), 4, 3, [L.basket]),
        ...crowd('shopper', ['Bà đi chợ', 'Cô đi chợ', 'Bạn nhỏ đi chợ'], [person('i'), person('l'), person('n')], landmark('quang-truong-lang'), 10, 5, [L.basket]),
        ...crowd('sweeper', ['Cô quét sân'], [person('m')], landmark('cay-hoa-sinh-hoat'), 6, 1),
        { routine: 'porter', name: 'Bác thợ mộc', model: person('b'), held: [`${PACK.survival}/tool-axe.glb`], at: landmark('xuong-thu-cong'), visits: [[WORKSHOP.x0 + 3, WORKSHOP.z0 + 3], [WORKSHOP.x0 + 6, WORKSHOP.z0 + 5], [WORKSHOP.x0 + 8, WORKSHOP.z0 + 3]] },
        ...crowd('rice-planter', ['Bác gặt lúa mì', 'Chú bó lúa'], [person('k'), person('b')], landmark('coi-xay-gio'), 18, 3, [L.basket]),
        // Chapter 1: the village gate, the school, the paddies beside it.
        ...crowd('rice-planter', ['Cô cấy lúa', 'Bác cấy lúa', 'Chị cấy lúa'], [person('e'), person('i'), person('m')], [300, 150], 40, 5, [L.basket]),
        ...crowd('pupil', ['Bạn nhỏ'], [person('f'), person('n'), person('o')], c(gate, 18, -32), 8, 3, [L.book]),
        ...crowd('teacher', ['Thầy giáo làng'], [person('a')], c(gate, 14, -26), 2, 1, [L.book]),
        ...crowd('home-cook', ['Bà nấu cơm', 'Mẹ nấu cơm'], [person('i'), person('l')], [90, 130], 30, 3, [L.spoon, L.basket]),
        ...crowd('laundry', ['Cô phơi đồ', 'Chị phơi áo'], [person('e'), person('h')], [100, 330], 24, 3, [L.basket, L.shirt]),
        ...crowd('waterer', ['Ông tưới cây'], [person('a'), person('j')], c(gate, -40, 30), 12, 2, [L.bucket, L.carrot]),
        ...crowd('chick', ['Gà con'], [animal('chick')], c(gate, -46, -10), 6, 8),
        ...crowd('dog', ['Chó Vàng', 'Chó Mực con'], [animal('dog')], c(gate, 30, 20), 14, 3),
        ...crowd('cow', ['Trâu bò'], [animal('cow')], [380, 280], 40, 5),
        // Chapter 2: the meadow by the river, the flower garden, kites in the wind.
        ...crowd('kite-flyer', ['Bạn thả diều'], [person('f'), person('n'), person('o'), person('p')], c(meadow, -10, 34), 14, 4, [L.kite]),
        ...crowd('waterer', ['Cô làm vườn'], [person('e')], landmark('vuon-hoa-to-ong'), 10, 2, [L.bucket, L.flower]),
        ...crowd('laundry', ['Mẹ phơi chăn'], [person('l')], [500, 330], 20, 2, [L.basket, L.shirt]),
        ...crowd('cow', ['Bò vàng'], [animal('cow')], c(meadow, 40, 30), 18, 6),
        ...crowd('pig', ['Lợn con'], [animal('pig')], [520, 140], 16, 4),
        ...crowd('cat', ['Mèo mướp'], [animal('cat')], [540, 320], 20, 3),
        // Chapter 3: the landing, the ferry, the class under the banyan.
        ...crowd('ferryman', ['Bác lái đò', 'Chú chèo đò'], [person('a'), person('m')], landmark('ben-do'), 6, 2, [L.paddle, L.fish]),
        ...crowd('porter', ['Chú gánh hàng'], [person('j'), person('k')], c(landing, 30, -20), 12, 2, [L.crate]),
        ...crowd('pupil', ['Học trò gốc đa'], [person('f'), person('o')], landmark('lop-hoc-goc-da'), 10, 3, [L.book]),
        ...crowd('home-cook', ['Bà bán nước chè'], [person('i')], c(landing, -36, -24), 4, 1, [L.cup]),
        ...crowd('chick', ['Gà con'], [animal('chick')], c(landing, -40, 30), 6, 8),
        ...crowd('dog', ['Cún bến sông'], [animal('dog')], c(landing, 20, 30), 10, 2),
        // Chapter 4: the marsh, the football field; the harbour's fishers and sailors.
        ...crowd('pupil', ['Cầu thủ nhí'], [person('f'), person('n'), person('o'), person('p'), person('q')], landmark('san-bong-lang'), 9, 6),
        ...crowd('rice-planter', ['Cô hái sen'], [person('e'), person('h')], landmark('dam-sen'), 20, 3, [L.basket]),
        ...crowd('ferryman', ['Ngư dân'], [person('m'), person('k'), person('j')], landmark('ben-tau'), 12, 4, [L.paddle, L.fish]),
        ...crowd('porter', ['Người khuân cá'], [person('b'), person('c')], landmark('ben-tau'), 18, 3, [L.crate]),
        ...crowd('pig', ['Lợn ỉ'], [animal('pig')], c(marsh, -50, 30), 10, 4),
        ...crowd('cow', ['Bò ven đê'], [animal('cow')], [640, 640], 30, 5),
        ...crowd('cat', ['Mèo tam thể'], [animal('cat')], c(marsh, 40, -30), 12, 3),
      ];
    },
    build: (ctx) => {
      const { world, block, rng, ground, zone } = ctx;
      const [gate, meadow, landing, marsh] = [1, 2, 3, 4].map(zone) as [Zone, Zone, Zone, Zone];
      const banyan = (x: number, z: number, id: string, name: string): void => {
        placeAncientTree(world, x, ground + 1, z, { log: block('tree-log'), leaves: block('leaves'), core: block('log') }, rng);
        ctx.keepOut(x - 6, z - 6, x + 6, z + 6);
        ctx.landmark(id, name, x, z);
      };

      // Rice paddies: flooded plots inside earth dykes, rice every few columns (young, ripe here and there).
      for (const p of PADDIES) {
        for (let x = p.x0; x <= p.x1; x++) {
          for (let z = p.z0; z <= p.z1; z++) {
            const dyke = (x - p.x0) % 12 === 0 || (z - p.z0) % 9 === 0 || x === p.x1 || z === p.z1;
            if (dyke || ctx.onPath(x, z) || inWater(x, z)) continue;
            world.set(x, ctx.surface(x, z), z, block('water'));
            if ((x - p.x0) % 4 === 2 && (z - p.z0) % 3 === 1) ctx.prop((x + z) % 7 < 3 ? M.riceRipe : M.rice, x, z, (x * 13 + z * 7) % 360);
          }
        }
        ctx.keepOut(p.x0, p.z0, p.x1, p.z1);
      }
      ctx.landmark('canh-dong-lua', 'Cánh đồng lúa', 350, 160);

      const lit = (cells: ReadonlyArray<readonly [number, number]>): void => {
        for (const [x, z] of cells) ctx.prop(STREET_LANTERN, x, z, 0);
      };
      // Everything that stands on a fixed spot first (the square, the gate, the mill, the bridges); then the
      // streets of cottages along both lanes, facing them (d-10, c-07); hamlets round shared yards beyond the
      // districts; and last the verges of every way, so they keep clear of the gardens.
      const streets = (): void => {
        for (const lane of [LANE_SOUTH, LANE_NORTH]) streetHouses(ctx, lane);
        streetHouses(ctx, [[60, 110], [60, 290]], { sides: [1] });
        hamlet(ctx, 68, 100, 140, 170);
        hamlet(ctx, 460, 60, 600, 200);
        hamlet(ctx, 60, 640, 160, 760);
        for (const route of ROUTES) laneVerge(ctx, route);
      };
      ctx.landmark('duong-lang', 'Đường làng', 150, Math.round((290 + 293) / 2));
      const finish = cottagePalette(ctx).finish;

      // The village gate on the way in from the spawn (d-02): stone pillars, a tiled roof, the village's banner.
      const gateArch = placeGateArch(world, GATE.x, GATE.z, ctx.surface(GATE.x, GATE.z) + 1, 'x', {
        pillar: block('cobble-grey'), beam: block('log'), roof: block('brick-red'), cloth: block('wood-red'), emblem: block('wheat'),
      });
      lit(gateArch.lamps);
      ctx.prop(SQ.sign, gateArch.sign[0], gateArch.sign[1], 30);
      ctx.keepOut(GATE.x - 6, GATE.z - 1, GATE.x + 6, GATE.z + 2);
      ctx.landmark('cong-lang', 'Cổng làng', GATE.x, GATE.z);

      // The village square (d-08, d-11): paved round a fountain, stalls on its south side facing it, the
      // blossom tree with benches and the notice board, the bell tower to the north.
      const top = ctx.surface(SQUARE.x, SQUARE.z);
      placePlaza(world, SQUARE.x, SQUARE.z, SQUARE.r, top, { paver: block('cobble'), border: block('cobble-grey') });
      const fountain = placeFountain(world, SQUARE.x, SQUARE.z, top + 1, { stone: block('brick-grey'), water: block('water') });
      placeCatStatue(world, SQUARE.x, fountain.plinth[1], SQUARE.z, { stone: block('snow'), eye: block('iron') });
      ctx.keepOut(SQUARE.x - SQUARE.r, SQUARE.z - SQUARE.r, SQUARE.x + SQUARE.r, SQUARE.z + SQUARE.r);
      ctx.landmark('quang-truong-lang', 'Quảng trường làng', SQUARE.x, SQUARE.z - 7);
      const awnings = [[block('wood-red'), block('snow')], [block('roof-blue'), block('snow')], [block('wheat'), block('snow')]];
      for (let i = 0; i < 3; i++) {
        const stall = placeStall(world, SQUARE.x - 14 + i * 11, SQUARE.z + 8, 5, 3, top + 1, { log: block('log'), planks: block('planks'), stripes: awnings[i] ?? [] });
        for (let k = 0; k < 3; k++) ctx.propAt(SQ.produce[(i * 2 + k) % SQ.produce.length] ?? '', [stall.counter[0] - 1 + k, stall.counter[1], stall.counter[2]], k * 40);
        ctx.prop(SQ.barrel, SQUARE.x - 10 + i * 11, SQUARE.z + 12, 0);
      }
      ctx.landmark('cho-nho', 'Chợ nhỏ trong làng', SQUARE.x, SQUARE.z + 6);
      lit([[-9, -9], [9, -9], [-12, 2], [12, 2]].map(([dx = 0, dz = 0]) => [SQUARE.x + dx, SQUARE.z + dz] as const));
      placeAncientTree(world, SQUARE.x - 24, top + 1, SQUARE.z - 8, { log: block('tree-log'), leaves: block('leaves-pink'), core: block('log') }, rng);
      ctx.keepOut(SQUARE.x - 30, SQUARE.z - 14, SQUARE.x - 18, SQUARE.z - 2);
      for (const dz of [-3, 3]) ctx.prop(SQ.bench, SQUARE.x - 16, SQUARE.z - 8 + dz, 90);
      ctx.landmark('cay-hoa-sinh-hoat', 'Cây hoa nơi sinh hoạt chung', SQUARE.x - 20, SQUARE.z - 8);
      // The notice board: a board on two posts under a little plank roof.
      const board = { x: SQUARE.x + 16, z: SQUARE.z - 6 };
      for (let y = top + 1; y <= top + 4; y++) for (const dx of [-2, 2]) world.set(board.x + dx, y, board.z, block('log'));
      for (let dx = -1; dx <= 1; dx++) for (let y = top + 2; y <= top + 3; y++) world.set(board.x + dx, y, board.z, block('board'));
      for (let dx = -3; dx <= 3; dx++) world.set(board.x + dx, top + 5, board.z, block('planks'));
      ctx.keepOut(board.x - 3, board.z - 1, board.x + 3, board.z + 1);
      ctx.landmark('bang-tin', 'Bảng tin làng', board.x, board.z - 2);
      // The craft workshop east of the square (d-12), its door on the square's side: work benches, an anvil,
      // barrels and crates, shelves of pots under warm lanterns, a craftsman at work.
      const shop = { x0: WORKSHOP.x0, z0: WORKSHOP.z0, x1: WORKSHOP.x0 + 10, z1: WORKSHOP.z0 + 8 };
      placeHouse(facingWriter(world, [shop.x1, shop.z1], 'south'), FRAME, FRAME, 11, 9, 5, top + 1, { ...finish, wall: block('planks'), roof: block('wood-red'), trim: block('log') });
      for (let x = shop.x0 + 1; x < shop.x1; x++) {
        world.set(x, top + 3, shop.z0 + 1, block('planks'));
        if ((x - shop.x0) % 4 === 1) world.set(x, top + 4, shop.z0, block('lantern'));
      }
      const floor = top + 1;
      ctx.propAt(SQ.workbench, [shop.x0 + 2.5, floor, shop.z0 + 2.5], 0);
      ctx.propAt(SQ.workbench, [shop.x0 + 5.5, floor, shop.z0 + 4.5], 90);
      ctx.propAt(SQ.anvil, [shop.x1 - 2.5, floor, shop.z0 + 2.5], 0);
      for (const [dx, dz] of [[1, 6], [1, 7], [9, 7]] as const) ctx.propAt(SQ.barrel, [shop.x0 + dx + 0.5, floor, shop.z0 + dz + 0.5], dx * 30);
      ctx.propAt(SQ.crate, [shop.x1 - 1.5, floor, shop.z0 + 5.5], 15);
      for (const [i, model] of [SQ.bucket, SQ.basket, SQ.bucket].entries()) ctx.propAt(model, [shop.x0 + 3.5 + i * 2, top + 4, shop.z0 + 1.5], i * 40);
      ctx.propAt(SQ.axe, [shop.x0 + 2.5, floor + 0.9, shop.z0 + 2.5], 70);
      // A second shelf under the first, a rack of tools on the east wall, more crates and baskets by the door.
      for (let x = shop.x0 + 1; x < shop.x1; x++) world.set(x, top + 2, shop.z0 + 1, block('planks'));
      for (const [i, model] of [SQ.basket, SQ.crateSmall, SQ.basket, SQ.crateSmall].entries()) ctx.propAt(model, [shop.x0 + 2.5 + i * 2, top + 3, shop.z0 + 1.5], i * 25);
      for (let z = shop.z0 + 2; z <= shop.z0 + 5; z++) world.set(shop.x1 - 1, top + 4, z, block('log'));
      for (const [i, model] of [SQ.axe, SQ.hoe, SQ.axe].entries()) ctx.propAt(model, [shop.x1 - 1.5, top + 2, shop.z0 + 2.5 + i * 1.2], 90);
      for (const [dx, dz] of [[3, 7], [4, 7]] as const) ctx.propAt(SQ.crateSmall, [shop.x0 + dx + 0.5, floor, shop.z0 + dz + 0.5], dx * 20);
      ctx.propAt(SQ.basket, [shop.x0 + 5.5, floor + 0.9, shop.z0 + 4.5], 0);
      ctx.prop(SQ.sign, shop.x1 + 2, shop.z1 + 2, 200);
      ctx.keepOut(shop.x0 - 1, shop.z0 - 1, shop.x1 + 1, shop.z1 + 3);
      ctx.landmark('xuong-thu-cong', 'Xưởng thủ công', shop.x0 + 5, shop.z0 + 4, floor);
      placeTower(world, TOWER.x, TOWER.z, top + 1, 3, 13, { wall: block('sand'), trim: block('cobble-grey'), roof: block('brick-red'), glass: block('glass'), flag: block('wood-red'), pole: block('log') }, false);
      ctx.keepOut(TOWER.x - 5, TOWER.z - 5, TOWER.x + 5, TOWER.z + 5);
      ctx.landmark('thap-chuong', 'Tháp chuông', TOWER.x, TOWER.z + 6);

      // The windmill in its golden wheat field (d-06), reapers' sheaves along the field.
      for (let x = WHEAT.x0; x <= WHEAT.x1; x++) {
        for (let z = WHEAT.z0; z <= WHEAT.z1; z++) {
          if (ctx.onPath(x, z) || ctx.inZone(x, z, 2) || Math.hypot(x - MILL.x, z - MILL.z) < 6) continue;
          // Golden grain a block high (walked through), a furrow every fifth row.
          if ((z - WHEAT.z0) % 5 === 4) world.set(x, ctx.surface(x, z), z, block('farmland'));
          else world.set(x, ctx.surface(x, z) + 1, z, block('wheat'));
        }
      }
      ctx.keepOut(WHEAT.x0, WHEAT.z0, WHEAT.x1, WHEAT.z1);
      placeWindmill(world, MILL.x, MILL.z, ctx.surface(MILL.x, MILL.z) + 1, { planks: block('planks'), log: block('log'), roof: block('wood-red'), sail: block('snow'), stone: block('cobble-grey'), glass: block('glass') });
      ctx.landmark('coi-xay-gio', 'Cối xay gió', MILL.x, MILL.z - 5);

      // Humped stone bridges where the two crossings meet the river (d-09), lamps at their ends.
      for (const [i, x] of BRIDGES.entries()) {
        const c = riverCenter(x);
        const reach = RIVER_HALF + 5;
        const bridge = placeArchBridge(world, [x, Math.floor(c - reach)], [x, Math.ceil(c + reach)], WATER_LEVEL + 1, WATER_LEVEL, { stone: block('brick-grey'), rail: block('cobble-grey') });
        lit(bridge.lamps.filter((_, k) => k % 2 === 0));
        ctx.landmark(i === 0 ? 'cau-da' : 'cau-da-dong', i === 0 ? 'Cầu đá qua sông' : 'Cầu đá phía đông', x, Math.round(c), WATER_LEVEL + 4);
      }
      bambooHedge(ctx, [[20, 20], [780, 20]]);
      bambooHedge(ctx, [[20, 780], [600, 780]]);
      bambooHedge(ctx, [[20, 20], [20, 780]]);

      // Chapter 1: the banyan at the village gate, the little school, the well, a flower bed by the school.
      banyan(gate.x - 22, gate.z + 12, 'cay-da-dau-lang', 'Cây đa đầu làng');
      const school = { x0: gate.x + 6, z0: gate.z - 20, w: 17, d: 9 };
      placeHouse(world, school.x0, school.z0, school.w, school.d, 4, ground + 1, { ...finish, wall: block('birch-log'), roof: block('brick-red'), trim: block('log') });
      // Inside: a green board on the back wall, two rows of desks facing it, a bookcase by the door.
      for (let x = school.x0 + 5; x <= school.x0 + 11; x++) for (let y = ground + 2; y <= ground + 3; y++) world.set(x, y, school.z0 + school.d - 1, block('board'));
      for (const row of [3, 5]) for (const col of [3, 7, 11]) ctx.centredAt(SQ.desk, [school.x0 + col + 0.5, ground + 1, school.z0 + row + 0.5], 180);
      ctx.centredAt(SQ.bookcase, [school.x0 + 1.5, ground + 1, school.z0 + 2.5], 90);
      ctx.keepOut(school.x0 - 1, school.z0 - 2, school.x0 + school.w, school.z0 + school.d);
      flowerBed(ctx, school.x0, school.z0 - 4, 12, 2);
      ctx.landmark('lop-hoc-nho', 'Lớp học nhỏ', school.x0 + school.w / 2, school.z0 - 2);
      const well = { x: gate.x - 6, z: gate.z - 12 };
      placeWell(world, well.x, well.z, ground, { stone: block('brick-grey'), water: block('water') });
      ctx.keepOut(well.x - 1, well.z - 1, well.x + 1, well.z + 1);
      ctx.landmark('gieng-lang', 'Giếng làng', well.x, well.z);

      // Chapter 2: the meadow down to the river, the flower garden and its beehives.
      const garden = { x: meadow.x + 14, z: meadow.z - 10 };
      flowerBed(ctx, garden.x - 9, garden.z - 7, 18, 14);
      for (const dx of [-12, 12]) ctx.prop(M.box, garden.x + dx, garden.z + 9, 10);
      ctx.landmark('vuon-hoa-to-ong', 'Vườn hoa tổ ong', garden.x, garden.z);

      // Chapter 3: the landing on the north bank with its jetty and boats, the class under the banyan.
      const jettyX = landing.x + 18;
      const bank = Math.ceil(riverCenter(jettyX) + RIVER_HALF + 2);
      jetty(ctx, jettyX, bank, 9, -1, WATER_LEVEL);
      for (let i = 0; i < 3; i++) ctx.prop(M.logs, jettyX + 7 + i * 3, bank + 6, 90);
      ctx.landmark('ben-do', 'Bến đò', jettyX, bank);
      banyan(landing.x - 16, landing.z + 12, 'lop-hoc-goc-da', 'Lớp học dưới gốc đa');
      for (let i = 0; i < 3; i++) ctx.prop(M.workbench, landing.x - 20 + i * 4, landing.z + 2, 180);

      // Chapter 4: lotus over the marsh, the village football field with its goals.
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const r = MARSH.r * (0.25 + 0.6 * (((i * 7) % 5) / 5));
        ctx.propAt(i % 3 === 0 ? M.lilySmall : M.lily, [MARSH.x + Math.cos(a) * r + 0.5, WATER_LEVEL + 1.02, MARSH.z + Math.sin(a) * r + 0.5], i * 50);
      }
      ctx.landmark('dam-sen', 'Đầm sen', MARSH.x, MARSH.z);
      const pitch = { x: marsh.x - 18, z: marsh.z - 8 };
      for (let dx = -9; dx <= 9; dx++) for (let dz = -13; dz <= 13; dz++) if (Math.abs(dx) === 9 || Math.abs(dz) === 13 || dz === 0) world.set(pitch.x + dx, ground, pitch.z + dz, block('snow'));
      for (const dz of [-14, 14]) for (const dx of [-1, 1]) ctx.prop(M.fence, pitch.x + dx, pitch.z + dz, 90);
      ctx.landmark('san-bong-lang', 'Sân bóng làng', pitch.x, pitch.z);

      // The lake: the harbour's piers with sailboats, the lighthouse on its spit, the harbour's cottages.
      for (const [i, z] of [370, 410, 450].entries()) jetty(ctx, LAKE.x - LAKE.rx + 4 + i * 2, z, 16, 1, WATER_LEVEL, true);
      placeLighthouse(world, SPIT.x, SPIT.z, ground + 1, { red: block('wood-red'), white: block('snow'), glass: block('glass'), cap: block('roof-blue') });
      ctx.keepOut(SPIT.x - 4, SPIT.z - 4, SPIT.x + 4, SPIT.z + 4);
      ctx.landmark('hai-dang', 'Hải đăng', SPIT.x, SPIT.z);
      ctx.landmark('ben-tau', 'Bến tàu', LAKE.x - LAKE.rx + 10, 410);
      cottageRow(ctx, 600, 230, 3);
      for (const [x, z] of [[620, 560], [650, 580]] as const) ctx.prop(M.rock, x, z, x);
      streets();
    },
  });
}

await runIfMain(import.meta.url, generateLangVenSong);

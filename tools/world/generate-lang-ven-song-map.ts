// Generates "Làng Ven Sông" (Tiếng Việt weeks 1–4) from a fixed seed, 800 x 800 blocks after the owner's
// village and lake mocks (designs/lang-ven-song/, designs/the-gioi/b-04-ho-song-toan-canh.png,
// b-09-ben-tau-toan-canh.png): a wide river winds across the map, bamboo bridges and a ferry cross it, and
// it opens east into a lake with a harbour, sailboats, a beach and a red-and-white lighthouse. Four
// districts, one per chapter: the village gate under the banyan with the little school and the well
// (chapter 1), the meadow by the river with the flower garden and its beehives (chapter 2), the landing and
// the class under the banyan on the north bank (chapter 3), the lotus marsh and the village football field
// (chapter 4). Between them: rice paddies inside earth dykes, hamlets of tiled-roof cottages along their own
// yards, lamp-lit lanes, bamboo hedges, fruit trees. After the detail mock of the village (02/10/2026,
// designs/lang-ven-song/d-*, the outdoor frames; the home frames are Xóm Mái Ấm's): a gate arch with its
// banner and lamps on the way in from the spawn, the village square with its fountain, market stalls, the
// blossom tree with benches and the notice board, the bell tower over it, the windmill in a golden wheat
// field, humped stone bridges over the river, cobbled lanes with flowers along their verges.
// Output: assets/generated/world/lang-ven-song/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { bambooHedge, cottagePalette, flowerBed, jetty, joinWalks, laneVerge, STREET_LANTERN, streetHouses } from './scenery';
import { animal, crowd, person } from './village-life';
import { placeCatStatue, placeFountain, placeLighthouse, placeStall, placeWell, placeWindmill } from './structures/countryside';
import { fillTowerShaft, placeArchBridge, placeGateArch, placePlaza, placeTower, widenRoundDoor } from './structures/landmarks';
import { placeHall } from './structures/lang-ven-song-buildings';
import { facingWriter, FRAME, frameCell } from './structures/world-writer';
import { pathColumns, type Point } from './structures/path';
import { placeAncientTree } from './structures/tree';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

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
/** The craft workshop's footprint (17 x 13), east of the square, its door on the square's lane. */
const WORKSHOP = { x0: 124, z0: 214, w: 17, d: 13 };
const WHEAT = { x0: 172, z0: 98, x1: 238, z1: 164 };
/** Where the way from the spawn passes under the village gate. */
const GATE = { x: 60, z: 84 };
/** The stone bridges: where the two crossings meet the river. */
const BRIDGES = [120, 360];
/** The landing's jetty on the north bank of the river (chapter 3), its root on the bank. */
const JETTY = { x: 218, bank: Math.ceil(riverCenter(218) + RIVER_HALF + 2) };
/** The little school's footprint in the gate district (21 x 15), and the cell before its door (on its -z side). */
const SCHOOL = { x0: 196, z0: 190, w: 21, d: 15 };
const SCHOOL_DOOR = { x: SCHOOL.x0 + Math.floor(SCHOOL.w / 2), z: SCHOOL.z0 - 2 };
/** The z of a lane (a polyline along x) at `x`, so a branch meets it without a gap or a stub beyond it. */
function laneZ(lane: readonly Point[], x: number): number {
  for (let i = 1; i < lane.length; i++) {
    const [ax = 0, az = 0] = lane[i - 1] ?? [];
    const [bx = 0, bz = 0] = lane[i] ?? [];
    if (x >= ax && x <= bx) return Math.round(az + ((bz - az) * (x - ax)) / Math.max(1, bx - ax));
  }
  return lane[lane.length - 1]?.[1] ?? 0;
}
/** The hamlets' streets: west of the wheat on to the field track, north of the meadow, the harbour's, south of the landing. */
const HAMLET_STREETS: Point[][] = [
  [[604, 222], [664, 222]],
  [[60, 140], [170, 140]],
  [[450, 100], [600, 100]],
  [[450, 160], [600, 160]],
  [[100, 600], [100, 750]],
];
/**
 * The ways down to the water (the marsh's boardwalk, the landing's jetty, the harbour's shore walk and its
 * piers): their banks fall two blocks to the deck, so they get steps.
 */
const WATER_WAYS: Point[][] = [
  [[520, 622], [MARSH.x - 6, MARSH.z - 3]],
  [[JETTY.x, laneZ(LANE_NORTH, JETTY.x)], [JETTY.x, JETTY.bank]],
  [[600, 280], [606, 310], [606, 500], [600, 520]],
  [[606, 371], [614, 371]],
  [[606, 411], [616, 411]],
  [[606, 451], [618, 451]],
];
/**
 * One network of ways (owner, 02/10/2026: a way from wherever the child starts to wherever she goes): the
 * spawn's lane with stubs to the ride stops and the gate, the square's lane, the two lanes along the banks and
 * the bridges between them, a branch through each district from the nearer lane, the school's walk and the
 * field track on to the windmill, the class under the banyan, the football field, a boardwalk into the lotus
 * marsh, the way down to the landing's jetty, the harbour's shore walk joining both lanes past the piers, the
 * lighthouse's way, the hamlets' lanes, and the dykes through the paddies with one out to the middle of the
 * rice field.
 */
const ROUTES: Point[][] = [
  [[60, 60], [60, 300]],
  [[42, 64], [60, 64]],
  [[60, 73], [68, 73]],
  [[60, SQUARE.z], [156, SQUARE.z]],
  LANE_SOUTH,
  LANE_NORTH,
  [[120, laneZ(LANE_SOUTH, 120)], [120, laneZ(LANE_NORTH, 120)]],
  [[360, laneZ(LANE_SOUTH, 360)], [360, laneZ(LANE_NORTH, 360)]],
  ...ZONES.map((zn): Point[] => (zn.z < 400 ? [[zn.x, laneZ(LANE_SOUTH, zn.x)], [zn.x, zn.z]] : [[zn.x, laneZ(LANE_NORTH, zn.x)], [zn.x, zn.z + zn.hz]])),
  [[190, 210], [190, SCHOOL_DOOR.z - 3], [SCHOOL_DOOR.x, SCHOOL_DOOR.z - 3], [SCHOOL_DOOR.x, SCHOOL_DOOR.z]],
  [[190, SCHOOL_DOOR.z - 3], [190, MILL.z - 10], [MILL.x, MILL.z - 10], [MILL.x, MILL.z - 6]],
  [[200, 572], [192, 572]],
  [[520, 592], [513, 592]],
  ...WATER_WAYS,
  [[606, 294], [640, 294], [640, 296]],
  // The hamlets' lanes: on from their streets to the field track, the dyke road up from the south lane, the
  // harbour's street on from the south lane's end, the lane south from the north lane.
  [[60, 140], [190, 140]],
  [[450, laneZ(LANE_SOUTH, 450)], [450, 100], [600, 100]],
  [[450, 160], [600, 160]],
  [[600, 280], [600, 222], [664, 222]],
  [[100, laneZ(LANE_NORTH, 100)], [100, 750]],
  // Dykes through the paddies.
  [[330, 60], [330, 296]],
  [[330, 505], [330, 760]],
  [[330, 160], [350, 160]],
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

/**
 * Steps along `routes`' ways (3 wide, as the map draws them): wherever a way cell stands more than a block
 * below its neighbour on the way (a bank falling to a plank deck over the water), it is raised with `block`
 * until every step is one block, so the child walks down to the water a step at a time.
 */
function stepWays(ctx: ZoneMapContext, routes: readonly Point[][], block: number): void {
  const cells = [...new Set(routes.flatMap((r) => [...pathColumns(r, 1.4)]))].map((k) => k.split(',').map(Number) as [number, number]);
  const key = (x: number, z: number): string => `${x},${z}`;
  const ground = new Map(cells.map(([x, z]) => [key(x, z), ctx.inWater(x, z) ? WATER_LEVEL + 1 : ctx.surface(x, z)]));
  const top = new Map(ground);
  for (let changed = true; changed; ) {
    changed = false;
    for (const [x, z] of cells) {
      const here = top.get(key(x, z)) ?? 0;
      const need = Math.max(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx = 0, dz = 0]) => (top.get(key(x + dx, z + dz)) ?? -Infinity) - 1));
      if (need > here) {
        top.set(key(x, z), need);
        changed = true;
      }
    }
  }
  for (const [x, z] of cells) for (let y = (ground.get(key(x, z)) ?? 0) + 1; y <= (top.get(key(x, z)) ?? 0); y++) ctx.world.set(x, y, z, block);
}

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
      const [gate, meadow, landing, _marsh] = [1, 2, 3, 4].map(zone) as [Zone, Zone, Zone, Zone];
      const c = (zn: Zone, dx: number, dz: number): readonly [number, number] => [zn.x + dx, zn.z + dz];
      return [
        // 0. Spawn & Cổng làng (x: 60, z: 70 & GATE x: 60, z: 84).
        { routine: 'sentry', name: 'Bác gác cổng làng', model: person('a'), held: [`${PACK.survival}/tool-axe.glb`], at: [GATE.x + 3, GATE.z - 4] as const },
        { routine: 'ferryman', name: 'Bác lái đò đón khách bến vào', model: person('m'), held: [L.paddle], at: [56, 72] as const },
        { routine: 'shopper', name: 'Khách du lịch về thăm quê', model: person('k'), held: [L.basket], at: [63, 68] as const },
        { routine: 'pupil', name: 'Bạn nhỏ tung tăng vào làng', model: person('f'), held: [L.kite], at: [58, 76] as const },
        { routine: 'dog', name: 'Cún gác cổng làng', model: animal('dog'), at: [65, 80] as const },

        // Village Square & Chợ nhỏ (x: 100, z: 235).
        ...crowd('vendor', ['Cô bán rau', 'Bác bán hoa quả', 'Chị bán bí', 'Chú bán cá tươi'], [person('e'), person('j'), person('h'), person('m')], landmark('cho-nho'), 4, 4, [L.basket]),
        ...crowd('shopper', ['Bà đi chợ', 'Cô đi chợ', 'Bác mua rau', 'Chị dẫn em đi chợ'], [person('i'), person('l'), person('n'), person('p')], landmark('quang-truong-lang'), 8, 5, [L.basket]),
        ...crowd('sweeper', ['Cô quét sân quảng trường'], [person('e')], landmark('cay-hoa-sinh-hoat'), 6, 1),
        { routine: 'porter', name: 'Bác thợ mộc', model: person('b'), held: [`${PACK.survival}/tool-axe.glb`], at: landmark('xuong-thu-cong'), visits: [[WORKSHOP.x0 + 7, WORKSHOP.z0 + 3], [WORKSHOP.x0 + 9, WORKSHOP.z0 + 7], [WORKSHOP.x0 + 4, WORKSHOP.z0 + 6]] },
        ...crowd('porter', ['Thợ phụ cưa gỗ'], [person('k')], landmark('xuong-thu-cong'), 3, 1, [`${PACK.survival}/tool-axe.glb`]),
        ...crowd('sentry', ['Bác trông tháp chuông'], [person('d')], landmark('thap-chuong'), 3, 1),
        ...crowd('reader', ['Người đọc bảng tin làng'], [person('c')], landmark('bang-tin'), 3, 1, [L.book]),
        ...crowd('dog', ['Cún quảng trường'], [animal('dog')], landmark('quang-truong-lang'), 10, 2),

        // Chapter 1: Đầu làng (trường học, giếng làng, cây đa, cối xay gió).
        ...crowd('teacher', ['Thầy giáo làng'], [person('a')], landmark('lop-hoc-nho'), 2, 1, [L.book]),
        ...crowd('pupil', ['Bạn nhỏ đọc bài', 'Bạn nhỏ tập viết bảng', 'Bạn làm toán'], [person('f'), person('n'), person('o'), person('q')], landmark('lop-hoc-nho'), 5, 5, [L.book]),
        ...crowd('reader', ['Cụ già hóng mát gốc đa', 'Bác uống nước chè'], [person('b'), person('i')], landmark('cay-da-dau-lang'), 4, 2, [L.cup]),
        ...crowd('pupil', ['Bạn nhỏ chơi ô ăn quan', 'Bạn đố chữ'], [person('r'), person('p')], landmark('cay-da-dau-lang'), 4, 3, [L.book]),
        ...crowd('waterer', ['Cô gánh nước giếng', 'Chị rửa rau giếng làng'], [person('e'), person('h')], landmark('gieng-lang'), 4, 3, [L.bucket]),
        ...crowd('rice-planter', ['Bác gặt lúa mì', 'Chú bó lúa', 'Cô gánh lúa'], [person('k'), person('b'), person('l')], landmark('coi-xay-gio'), 12, 3, [L.basket]),
        ...crowd('home-cook', ['Bà nấu cơm trưa'], [person('i')], c(gate, 10, 25), 8, 2, [L.spoon]),
        ...crowd('laundry', ['Cô phơi đồ bờ giậu'], [person('e')], c(gate, -15, 20), 8, 2, [L.shirt]),
        ...crowd('chick', ['Gà con'], [animal('chick')], landmark('cay-da-dau-lang'), 8, 6),
        ...crowd('dog', ['Chó Vàng đầu làng'], [animal('dog')], landmark('gieng-lang'), 8, 2),

        // Chapter 2: Bãi cỏ ven sông (vườn hoa tổ ong, thả diều, dã ngoại ven sông).
        ...crowd('waterer', ['Cô làm vườn hoa', 'Bác tỉa cành hoa', 'Chú lấy mật ong'], [person('e'), person('j'), person('p')], landmark('vuon-hoa-to-ong'), 8, 3, [L.bucket, L.flower]),
        ...crowd('kite-flyer', ['Bạn thả diều', 'Bạn nhỏ đón gió', 'Bạn chạy theo cánh diều'], [person('f'), person('n'), person('o'), person('p'), person('q')], c(meadow, 0, 10), 12, 6, [L.kite]),
        ...crowd('shopper', ['Gia đình dã ngoại ven sông', 'Người ngồi hóng mát bờ cỏ'], [person('l'), person('c')], c(meadow, -12, 16), 8, 3, [L.basket]),
        ...crowd('reader', ['Bác đọc sách dưới bóng cây'], [person('a')], c(meadow, 15, -10), 6, 2, [L.book]),
        ...crowd('ferryman', ['Chú câu cá ngắm mây'], [person('m')], c(meadow, -18, 24), 6, 2, [L.fish]),
        ...crowd('laundry', ['Mẹ phơi chăn ven bãi'], [person('l')], c(meadow, 12, -22), 8, 2, [L.shirt]),
        ...crowd('cow', ['Bò vàng gặm cỏ', 'Bê con'], [animal('cow')], c(meadow, 25, 20), 16, 6),
        ...crowd('cat', ['Mèo mướp nằm nắng'], [animal('cat')], c(meadow, -5, 12), 8, 2),

        // Chapter 3: Bến sông (bến đò ngang, lớp học dưới gốc đa, quán nước, xóm chài).
        ...crowd('ferryman', ['Bác lái đò', 'Chú chèo đò'], [person('a'), person('m')], landmark('ben-do'), 4, 3, [L.paddle]),
        ...crowd('shopper', ['Khách đợi đò qua sông', 'Bà gánh hàng sang bến', 'Bác đi chợ về'], [person('k'), person('l'), person('i')], landmark('ben-do'), 5, 4, [L.basket]),
        ...crowd('teacher', ['Thầy giáo dạy học gốc đa'], [person('a')], landmark('lop-hoc-goc-da'), 3, 1, [L.book]),
        ...crowd('pupil', ['Học trò gốc đa', 'Bạn nhỏ ghép vần', 'Bạn giơ tay phát biểu', 'Bạn ngồi lắng nghe'], [person('f'), person('o'), person('n'), person('r'), person('q')], landmark('lop-hoc-goc-da'), 6, 8, [L.book]),
        ...crowd('home-cook', ['Bà bán nước chè tươi'], [person('i')], c(landing, -12, -8), 4, 1, [L.cup]),
        ...crowd('shopper', ['Bác uống nước chè bên sông', 'Chú thợ hàn nghỉ chân'], [person('b'), person('d'), person('h')], c(landing, -10, -10), 4, 3, [L.cup]),
        ...crowd('ferryman', ['Ngư dân vá lưới cá', 'Chú gỡ cá tươi', 'Bác câu cá bờ sông'], [person('j'), person('k'), person('c')], c(landing, 8, -6), 6, 3, [L.fish]),
        ...crowd('porter', ['Chú gánh sọt cá lên bến', 'Anh chuyển đồ lên thuyền'], [person('m'), person('p')], c(landing, 12, 4), 6, 2, [L.crate]),
        ...crowd('dog', ['Cún bến sông'], [animal('dog')], landmark('ben-do'), 8, 2),
        ...crowd('chick', ['Đàn gà xóm chài'], [animal('chick')], c(landing, -15, 10), 6, 6),

        // Chapter 4: Đầm sen và sân bóng (sân bóng đá làng, hái hoa sen, bến tàu & hải đăng).
        ...crowd('pupil', ['Cầu thủ nhí', 'Thủ môn bắt bóng', 'Tiền đạo sút bóng'], [person('f'), person('n'), person('o'), person('p'), person('q'), person('r')], landmark('san-bong-lang'), 7, 8),
        ...crowd('shopper', ['Khán giả cổ vũ bóng đá', 'Bác huấn luyện viên', 'Phụ huynh xem đá bóng'], [person('c'), person('j'), person('l'), person('a')], landmark('san-bong-lang'), 8, 5),
        ...crowd('vendor', ['Bác bán nước giải khát sân bóng'], [person('h')], landmark('san-bong-lang'), 6, 1, [L.cup]),
        ...crowd('pupil', ['Bạn nhỏ reo hò cổ vũ'], [person('d'), person('k')], landmark('san-bong-lang'), 6, 2, [L.kite]),
        ...crowd('rice-planter', ['Cô hái sen', 'Chị bó hoa sen', 'Bác ướp trà sen'], [person('e'), person('h'), person('i')], landmark('dam-sen'), 12, 4, [L.basket, L.flower]),
        ...crowd('ferryman', ['Ngư dân bến tàu', 'Thuyền trưởng kéo neo'], [person('m'), person('k')], landmark('ben-tau'), 8, 3, [L.paddle]),
        ...crowd('porter', ['Người khuân cá về làng'], [person('b'), person('c')], landmark('ben-tau'), 10, 3, [L.crate]),
        ...crowd('sentry', ['Người giữ đèn hải đăng'], [person('d')], landmark('hai-dang'), 3, 1),
        ...crowd('cow', ['Bò ven đê'], [animal('cow')], [640, 640], 25, 4),
        ...crowd('cat', ['Mèo đầm sen'], [animal('cat')], landmark('dam-sen'), 10, 2),
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
      // streets of cottages along both lanes, facing them (d-10, c-07); the hamlets beyond the districts along
      // their own lanes, every door with its walk to the way; and last the verges of every way, so they keep
      // clear of the gardens.
      const streets = (): void => {
        for (const lane of [LANE_SOUTH, LANE_NORTH]) streetHouses(ctx, lane);
        streetHouses(ctx, [[60, 110], [60, 290]], { sides: [1] });
        for (const lane of HAMLET_STREETS) streetHouses(ctx, lane);
        joinWalks(ctx, [LANE_SOUTH, LANE_NORTH, [[60, 110], [60, 290]], ...HAMLET_STREETS]);
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
      // The notice board: a board on two posts under a little tiled roof.
      const board = { x: SQUARE.x + 16, z: SQUARE.z - 6 };
      for (let y = top + 1; y <= top + 4; y++) for (const dx of [-2, 2]) world.set(board.x + dx, y, board.z, block('log'));
      for (let dx = -1; dx <= 1; dx++) for (let y = top + 2; y <= top + 3; y++) world.set(board.x + dx, y, board.z, block('board'));
      for (let dx = -3; dx <= 3; dx++) world.set(board.x + dx, top + 5, board.z, block('wood-red'));
      ctx.keepOut(board.x - 3, board.z - 1, board.x + 3, board.z + 1);
      ctx.landmark('bang-tin', 'Bảng tin làng', board.x, board.z - 2);
      // The craft workshop east of the square (d-12), a hall with its wide door on the square's lane: shelves of
      // pots between posts along the back wall under warm lanterns, work benches and an anvil either side of an
      // aisle as wide as the door, barrels and crates in the corners, a rack of tools on the east wall.
      const shop = { x0: WORKSHOP.x0, z0: WORKSHOP.z0, x1: WORKSHOP.x0 + WORKSHOP.w - 1, z1: WORKSHOP.z0 + WORKSHOP.d - 1 };
      const shopOrigin = [shop.x1, shop.z1] as const;
      const shopCell = (u: number, v: number): [number, number] => frameCell(shopOrigin, 'south', u, v);
      const hall = placeHall(facingWriter(world, shopOrigin, 'south'), FRAME, FRAME, WORKSHOP.w, WORKSHOP.d, 7, (u, v) => ctx.surface(...shopCell(u, v)), {
        ...finish,
        wall: block('planks'),
        roof: block('wood-red'),
        trim: block('log'),
        foot: block('cobble-grey'),
      });
      const floor = hall.room.floorY;
      // A cobbled walk from the doorway down to the lane.
      const doorXs = Array.from({ length: hall.doorway.width }, (_, i) => shopCell(hall.doorway.x0 + i, FRAME)[0]);
      for (const x of doorXs) for (let z = shop.z1 + 1; z < SQUARE.z && !ctx.onPath(x, z); z++) world.set(x, ctx.surface(x, z), z, ctx.soil.path);
      // Shelves along the back wall in bays of four or five between log posts (each bay's top too small to read as
      // a room), a lantern in the wall over every fourth column.
      const back = shop.z0 + 1;
      for (let x = shop.x0 + 1; x < shop.x1; x++) {
        if ((x - shop.x0) % 6 === 5) for (let y = floor; y <= floor + 5; y++) world.set(x, y, back, block('log'));
        else for (const y of [floor + 1, floor + 3]) world.set(x, y, back, block('planks'));
        if ((x - shop.x0) % 4 === 1) world.set(x, floor + 4, shop.z0, block('lantern'));
      }
      const shelfX = [2, 4, 7, 9, 11, 13, 15].map((dx) => shop.x0 + dx);
      for (const [i, x] of shelfX.entries()) {
        ctx.propAt([SQ.basket, SQ.crateSmall, SQ.bucket][i % 3] ?? SQ.basket, [x + 0.5, floor + 2, back + 0.5], i * 25);
        ctx.propAt([SQ.bucket, SQ.basket, SQ.crateSmall][i % 3] ?? SQ.bucket, [x + 0.5, floor + 4, back + 0.5], i * 40);
      }
      // Benches and the anvil in the bays either side of the aisle (shop.x0 + 6 … + 10), a walk along each wall.
      ctx.propAt(SQ.workbench, [shop.x0 + 4.5, floor, shop.z0 + 4.5], 0);
      ctx.propAt(SQ.workbench, [shop.x0 + 4.5, floor, shop.z0 + 8.5], 90);
      ctx.propAt(SQ.anvil, [shop.x1 - 3.5, floor, shop.z0 + 4.5], 0);
      ctx.propAt(SQ.workbench, [shop.x1 - 3.5, floor, shop.z0 + 8.5], 90);
      ctx.propAt(SQ.axe, [shop.x0 + 4.5, floor + 0.9, shop.z0 + 4.5], 70);
      ctx.propAt(SQ.basket, [shop.x0 + 4.5, floor + 0.9, shop.z0 + 8.5], 0);
      for (const [dx, dz] of [[1, 11], [15, 11], [15, 2]] as const) ctx.propAt(SQ.barrel, [shop.x0 + dx + 0.5, floor, shop.z0 + dz + 0.5], dx * 30);
      ctx.propAt(SQ.crate, [shop.x0 + 1.5, floor, shop.z0 + 2.5], 15);
      for (const dx of [2, 3]) ctx.propAt(SQ.crateSmall, [shop.x0 + dx + 0.5, floor, shop.z0 + 11.5], dx * 20);
      // The tool rack: a log rail high on the east wall, tools hanging under it.
      for (let z = shop.z0 + 5; z <= shop.z0 + 9; z++) world.set(shop.x1 - 1, floor + 4, z, block('log'));
      for (const [i, model] of [SQ.axe, SQ.hoe, SQ.axe, SQ.hoe].entries()) ctx.propAt(model, [shop.x1 - 1.5, floor + 2, shop.z0 + 5.5 + i * 1.2], 90);
      ctx.prop(SQ.sign, shop.x1 + 2, shop.z1 + 2, 200);
      ctx.keepOut(shop.x0 - 1, shop.z0 - 1, shop.x1 + 1, shop.z1 + 4);
      ctx.keepOut(Math.min(...doorXs), shop.z1, Math.max(...doorXs), SQUARE.z - 2);
      ctx.landmark('xuong-thu-cong', 'Xưởng thủ công', shop.x0 + 8, shop.z0 + 6, floor);
      placeTower(world, TOWER.x, TOWER.z, top + 1, 3, 13, { wall: block('sand'), trim: block('cobble-grey'), roof: block('brick-red'), glass: block('glass'), flag: block('wood-red'), pole: block('log') }, false);
      fillTowerShaft(world, TOWER.x, TOWER.z, top + 1, 3, 13, block('sand'));
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
      const millBase = ctx.surface(MILL.x, MILL.z) + 1;
      placeWindmill(world, MILL.x, MILL.z, millBase, { planks: block('planks'), log: block('log'), roof: block('wood-red'), sail: block('snow'), stone: block('cobble-grey'), glass: block('glass') });
      widenRoundDoor(world, MILL.x, MILL.z, millBase, 4);
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

      // Chapter 1: the banyan at the village gate, the little school, the well, flower beds by the school.
      banyan(gate.x - 22, gate.z + 12, 'cay-da-dau-lang', 'Cây đa đầu làng');
      // The school: a hall with a wide door to the north, inside a green board on the back wall, three rows of
      // desks with their chairs facing it either side of an aisle from the door, the teacher's desk by the board,
      // bookcases along the west wall.
      const school = SCHOOL;
      const classroom = placeHall(world, school.x0, school.z0, school.w, school.d, 7, ctx.surface, {
        ...finish,
        wall: block('birch-log'),
        roof: block('brick-red'),
        trim: block('log'),
        foot: block('cobble-grey'),
      }).room;
      const doorX = SCHOOL_DOOR.x;
      const boardZ = school.z0 + school.d - 1;
      for (let x = doorX - 5; x <= doorX + 5; x++) for (let y = classroom.floorY + 1; y <= classroom.floorY + 3; y++) world.set(x, y, boardZ, block('board'));
      for (const dz of [5, 8, 11]) {
        for (const dx of [-7, -4, 4, 7]) {
          ctx.centredAt(SQ.desk, [doorX + dx + 0.5, classroom.floorY, school.z0 + dz + 0.5], 180);
          // The pupil's chair behind the desk, facing it and the board (the pack's chair faces its +z).
          ctx.centredAt(SQ.chair, [doorX + dx + 0.5, classroom.floorY, school.z0 + dz - 0.5], 0);
        }
      }
      ctx.centredAt(SQ.desk, [doorX + 6.5, classroom.floorY, boardZ - 1.5], 0);
      for (const dz of [3, 6]) ctx.centredAt(SQ.bookcase, [classroom.x0 + 0.5, classroom.floorY, school.z0 + dz + 0.5], 90);
      ctx.keepOut(school.x0 - 1, school.z0 - 4, school.x0 + school.w, school.z0 + school.d);
      for (const x0 of [school.x0, doorX + 4]) flowerBed(ctx, x0, school.z0 - 2, 6, 1);
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
      const [jettyX, bank] = [JETTY.x, JETTY.bank];
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

      // The lake: the harbour's piers with sailboats, the lighthouse on its spit (the harbour's cottages line their street).
      for (const [i, z] of [370, 410, 450].entries()) jetty(ctx, LAKE.x - LAKE.rx + 4 + i * 2, z, 16, 1, WATER_LEVEL, true);
      placeLighthouse(world, SPIT.x, SPIT.z, ground + 1, { red: block('wood-red'), white: block('snow'), glass: block('glass'), cap: block('roof-blue') });
      // The spit stands a block over the village's ground: the doorway opens from the spit's own ground up.
      widenRoundDoor(world, SPIT.x, SPIT.z, ctx.surface(SPIT.x, SPIT.z - 4) + 1, 3);
      ctx.keepOut(SPIT.x - 4, SPIT.z - 4, SPIT.x + 4, SPIT.z + 4);
      ctx.landmark('hai-dang', 'Hải đăng', SPIT.x, SPIT.z);
      ctx.landmark('ben-tau', 'Bến tàu', LAKE.x - LAKE.rx + 10, 410);
      for (const [x, z] of [[620, 560], [650, 580]] as const) ctx.prop(M.rock, x, z, x);
      stepWays(ctx, WATER_WAYS, ctx.soil.path);
      streets();
    },
  });
}

await runIfMain(import.meta.url, generateLangVenSong);

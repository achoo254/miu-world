// Generates "Thư viện" (Tiếng Việt weeks 8–9, Toán topic 6) from a fixed seed, 800 x 800 blocks, after the
// owner's detail mock of the library (02/10/2026, designs/thu-vien/d-01…d-14, and the school's library
// frame designs/truong-hoc/c-16): a grand stone library under red roofs is the heart of a small town, a
// formal garden before it (a paved square round a tiered fountain, flower parterres edged with hedges,
// lantern-lit walks), a lake either side with a humped stone bridge over each, a reading garden behind it
// with its vine-hung pergola, the stream and its sandy beach. A walk from the spawn leads up the garden to
// the terrace and the arched door. Paved lanes lined with cottages fill the four quarters; flower gardens
// north-west, woods by the river. Three districts, one per chapter:
// - Chapter 1, south-west, by the spawn: the library (structures/thu-vien-library.ts: the hall with its
//   globe, the reading room, the bookcases by subject and their aisles, the children's corner, the gallery
//   up the grand staircase; computers, group room, rare books, the store room) and its gardens: the
//   terrace steps down to the reading garden: the flat stone, the purple myrtle, the stream, the beach.
// - Chapter 2, north-east: the golden-leaf festival yard: the leaf stage, the golden-leaf road, the round
//   pool with floating rafts, the golden tree with its stone table, the tree hung with clouds, the leaf-sweet
//   stall and the contest stations.
// - Chapter 3, south-east: the clock tower (spiral stairs to the landing, the clock-face balcony, round
//   windows, the bell loft with its railing and eaves), the clock workshop, the calendar room with its
//   east window, the mailbox and the telescope corner.
// Output: assets/generated/world/thu-vien/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain, smoothstep } from './map-kit';
import { cottageRow, flowerBed, laneVerge, STREET_LANTERN, streetHouses } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeFountain, placeStall } from './structures/countryside';
import { placePlaza } from './structures/landmarks';
import { placeArchedBridge, placeClockTower } from './structures/thu-vien-garden';
import { pathColumns, type Point } from './structures/path';
import { buildLibraryHall, LIBRARY_MODELS, type LibraryPlan } from './structures/thu-vien-library';
import { placeAncientTree, placeTree } from './structures/tree';
import { animal, crowd, person, type Resident } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'thu-vien';
const SIZE = 800;
const LEVEL = 12;
const BASE = LEVEL + 1;
const WATER_LEVEL = 10;

/** What the people hold at their work. */
const LIFE_HELD = {
  book: `${PACK.props}/open-book.glb`,
  basket: `${PACK.props}/basket.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  crate: `${PACK.survival}/box.glb`,
  axe: `${PACK.survival}/tool-axe.glb`,
  flute: `${PACK.props}/flute.glb`,
  apple: `${PACK.food}/apple.glb`,
  hoe: `${PACK.survival}/tool-hoe.glb`,
  palette: `${PACK.props}/artist-palette.glb`,
  balloon: `${PACK.props}/balloon.glb`,
};

/** The festival yard and the clock tower's district (their ways are laid out from them below). */
const FAIR = { x: 595, z: 250, hx: 66, hz: 48 };
const TOWER_YARD = { x: 595, z: 600, hx: 62, hz: 50 };

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'phong-doc', name: 'Phòng đọc', x: 230, z: 530, hx: 70, hz: 54 },
  { chapter: 2, id: 'san-le-hoi-la-vang', name: 'Sân lễ hội lá vàng', ...FAIR },
  { chapter: 3, id: 'thap-dong-ho', name: 'Tháp đồng hồ và phòng lịch', ...TOWER_YARD },
];

interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** The library: its walls, the pavilion in front with the door, the floor a block over the ground. */
const LIB: LibraryPlan = { x0: 194, x1: 266, z0: 506, z1: 540, pavX0: 216, pavX1: 244, pavZ0: 502, door: 230, floor: LEVEL + 1 };
/** The terrace before the door and the one behind it, at the floor's height. */
const TERRACE: Rect = { x0: 208, z0: 494, x1: 252, z1: 501 };
const BACK_TERRACE: Rect = { x0: 222, z0: LIB.z1 + 2, x1: 238, z1: LIB.z1 + 6 };
/** The library's stone shell stands a block outside its plan (the plan's edge is the rooms' lining). */
const RAISED: readonly Rect[] = [{ x0: LIB.x0 - 1, z0: LIB.pavZ0, x1: LIB.x1 + 1, z1: LIB.z1 + 1 }, TERRACE, BACK_TERRACE];
/** The clock tower standing apart behind the library, east of it (d-01). */
const CLOCK_TOWER = { x: 318, z: 528 };
/** The garden's paved square with its fountain, the lakes either side, the pergola of the reading garden. */
const SQUARE = { x: LIB.door, z: 466, r: 15 };
const LAKES = [
  { x: 188, z: 458, rx: 16, rz: 15 },
  { x: 272, z: 458, rx: 16, rz: 15 },
];
const LAKE_Z = 458;
const PERGOLA: Rect = { x0: 204, z0: 549, x1: 218, z1: 559 };
/** The library's grounds outside its district: no cottages or wild trees there. */
const GROUNDS: readonly Rect[] = [
  { x0: 120, z0: 436, x1: 340, z1: 473 },
  { x0: 120, z0: 474, x1: 157, z1: 600 },
  { x0: 303, z0: 474, x1: 340, z1: 600 },
  { x0: 158, z0: 587, x1: 302, z1: 600 },
];

// Water: the river down the middle of the map, the stream behind the library, the lakes before it, the
// festival's round pool.
const riverCenter = (z: number): number => 420 + 22 * Math.sin(z / 60) + 6 * Math.sin(z / 23 + 1.3);
const streamCenter = (x: number): number => 568 + 3 * Math.sin(x / 11) + 2 * Math.sin(x / 29);
const POOL = { x: 632, z: 268, r: 10 };
/** The festival's stalls (two columns west of the golden-leaf road, each facing north), the golden tree, the
 * stall by the pool; the clock tower at the end of its street and the telescope deck on its lawn. */
const STALL_WEST = FAIR.x - 57;
const STALL_COLUMNS = [STALL_WEST, FAIR.x - 33];
const STALL_ROWS = [-24, -8, 8, 24].map((dz) => FAIR.z + dz);
const GOLD_TREE = { x: FAIR.x + 50, z: FAIR.z - FAIR.hz + 24 };
const WATER_STALL = { x: POOL.x + 14, z: POOL.z + 14 };
const TOWER = { x: TOWER_YARD.x, z: TOWER_YARD.z + 12 };
const TELESCOPE = { x: TOWER_YARD.x + 34, z: TOWER_YARD.z - 26 };
/** The clock workshop east of the tower and the calendar room west of it (doors on -z, in the middle). */
const WORKSHOP = { x0: TOWER.x + 12, z0: TOWER.z - 8, w: 17, d: 13 };
const CALENDAR_ROOM = { x0: TOWER.x - 30, z0: TOWER.z - 10, w: 19, d: 13 };
const doorOf = (r: { x0: number; z0: number; w: number }): Point => [r.x0 + Math.floor(r.w / 2), r.z0];
const inLake = (x: number, z: number): boolean => LAKES.some((l) => ((x - l.x) / l.rx) ** 2 + ((z - l.z) / l.rz) ** 2 < 1);
const inWater = (x: number, z: number): boolean =>
  (z > 24 && z < 776 && Math.abs(x - riverCenter(z)) < 8 + 1.5 * Math.sin(z / 37)) ||
  (x > 120 && x < 318 && Math.abs(z - streamCenter(x)) < 2.2) ||
  Math.hypot(x - POOL.x, z - POOL.z) < POOL.r ||
  inLake(x, z);

const SPAWN = { x: 186, z: 430 };

// Ways (one network from the spawn to every place): the avenue (three lanes wide), the ring road, the side
// streets, a spur into each district; by the spawn a walk from the avenue past the bus stops down to the lake
// and one to the gate; in the library's garden the walk up to the terrace, the walk across before it, the
// walks over the two bridges, the walk from the back terrace past the bus stop to the street south, the
// reading garden's walks to the myrtle, the flat stone and the stream, the beach; at the festival a walk
// before every row of stalls, on to the pool, the golden tree and the stall by the pool; at the clock tower
// the street up to its door, a walk across its front to the doors of the workshop and the calendar room, a
// street from its lawn south, the walk to the telescope deck.
const AVENUE_Z = 420;
const AVENUE: Point[][] = [-3, 0, 3].map((dz): Point[] => [[30, AVENUE_Z + dz], [770, AVENUE_Z + dz]]);
const STREETS: Point[][] = [
  [[60, 60], [740, 60]],
  [[60, 740], [740, 740]],
  [[60, 60], [60, 740]],
  [[740, 60], [740, 740]],
  [[150, 60], [150, 420]],
  [[60, 240], [480, 240]],
  [[330, 420], [330, 740]],
  [[60, 660], [330, 660]],
  [[480, 60], [480, 740]],
  [[690, 60], [690, 740]],
  [[480, 130], [740, 130]],
  [[480, 340], [740, 340]],
  [[480, 500], [740, 500]],
  [[480, 700], [740, 700]],
];
const SPAWN_WALKS: Point[][] = [
  [[SPAWN.x, AVENUE_Z + 3], [SPAWN.x, LAKE_Z - 16]],
  [[SPAWN.x, SPAWN.z + 3], [SPAWN.x + 10, SPAWN.z + 3]],
];
const GARDEN_WALKS: Point[][] = [
  ...[-2, 0, 2].map((dx): Point[] => [[LIB.door + dx, AVENUE_Z + 3], [LIB.door + dx, TERRACE.z0 - 1]]),
  [[LIB.door - 26, 487], [LIB.door + 26, 487]],
  [[60, LAKE_Z], [SQUARE.x - SQUARE.r + 1, LAKE_Z]],
  [[SQUARE.x + SQUARE.r - 1, LAKE_Z], [330, LAKE_Z]],
  [[200, PERGOLA.z0 - 1], [LIB.door, PERGOLA.z0 - 1]],
  [[LIB.door, BACK_TERRACE.z1 + 1], [LIB.door, 660]],
  [[200, PERGOLA.z0 - 1], [172, PERGOLA.z0 - 1], [172, 536]],
  [[192, PERGOLA.z0 - 1], [192, 562]],
  [[LIB.door, 553], [256, 553], [256, 558]],
  [[330, CLOCK_TOWER.z - 8], [CLOCK_TOWER.x - 6, CLOCK_TOWER.z - 8]],
];
const FAIR_WALKS: Point[][] = [
  ...STALL_ROWS.map((z): Point[] => [[STALL_WEST - 4, z - 4], [FAIR.x, z - 4]]),
  [[FAIR.x, POOL.z - 14], [POOL.x + 8, POOL.z - 14]],
  [[FAIR.x + 18, GOLD_TREE.z + 14], [GOLD_TREE.x + 7, GOLD_TREE.z + 14], [GOLD_TREE.x + 7, WATER_STALL.z - 3], [WATER_STALL.x, WATER_STALL.z - 3]],
];
const TOWER_WALKS: Point[][] = [
  [[TOWER.x, TOWER.z + 9], [TOWER.x, 700]],
  [[TOWER.x + 2, TELESCOPE.z + 4], [TELESCOPE.x, TELESCOPE.z + 4]],
  [doorOf(CALENDAR_ROOM), [doorOf(CALENDAR_ROOM)[0], TOWER.z - 11], [doorOf(WORKSHOP)[0], TOWER.z - 11], doorOf(WORKSHOP)],
];
const SPURS: Point[][] = [
  [[200, PERGOLA.z0 - 1], [200, 660]],
  [[595, 420], [595, 250]],
  [[595, 420], [595, TOWER.z - 5]],
];
const ROUTES: Point[][] = [...AVENUE, ...STREETS, ...SPAWN_WALKS, ...GARDEN_WALKS, ...FAIR_WALKS, ...TOWER_WALKS, ...SPURS];

/** Quarters of the town (levelled ground), and the flower gardens north-west. */
const TOWN: readonly Rect[] = [
  { x0: 66, z0: 66, x1: 144, z1: 414 },
  { x0: 156, z0: 246, x1: 390, z1: 414 },
  { x0: 66, z0: 426, x1: 326, z1: 736 },
  { x0: 486, z0: 136, x1: 736, z1: 414 },
  { x0: 486, z0: 426, x1: 736, z1: 736 },
];
const GARDENS: Rect = { x0: 158, z0: 68, x1: 384, z1: 232 };
const FLAT: readonly Rect[] = [...TOWN, GARDENS];
/** Kept open round the spawn and the gate beside it. */
const SPAWN_CLEAR: Rect = { x0: SPAWN.x - 10, z0: SPAWN.z - 4, x1: SPAWN.x + 16, z1: SPAWN.z + 12 };

const N = PACK.nature;
const F = PACK.furniture;
const P = PACK.props;
const M = {
  bookcase: `${F}/bookcaseOpen.glb`,
  table: `${F}/table.glb`,
  chair: `${F}/chair.glb`,
  plant: `${F}/pottedPlant.glb`,
  books: `${P}/books.glb`,
  openBook: `${P}/open-book.glb`,
  rock: `${N}/rock_largeA.glb`,
  grass: `${N}/grass_large.glb`,
  bush: `${N}/plant_bushLarge.glb`,
  fence: `${N}/fence_simple.glb`,
  lily: `${N}/lily_large.glb`,
  lilySmall: `${N}/lily_small.glb`,
  flowerRed: `${N}/flower_redA.glb`,
  flowerYellow: `${N}/flower_yellowB.glb`,
  flowerPurple: `${N}/flower_purpleA.glb`,
  fruitTree: `${N}/tree_fat.glb`,
  autumnTree: `${N}/tree_oak_fall.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  leaf: `${P}/fallen-leaf.glb`,
  balloon: `${P}/balloon.glb`,
  gift: `${P}/gift-red.glb`,
  ticket: `${P}/ticket-red.glb`,
  chopsticks: `${P}/chopsticks.glb`,
  clock: `${P}/clock-face.glb`,
  alarm: `${P}/alarm-clock.glb`,
  calendar: `${P}/calendar.glb`,
  picture: `${P}/framed-picture.glb`,
  envelope: `${P}/envelope.glb`,
  wheel: `${P}/wheel.glb`,
  workbench: `${PACK.survival}/workbench.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
};
const FLOWERS = [M.flowerRed, M.flowerYellow, M.flowerPurple];

const outsideRect = (r: Rect, x: number, z: number): number => Math.hypot(Math.max(0, r.x0 - x, x - r.x1), Math.max(0, r.z0 - z, z - r.z1));
const inRect = (r: Rect, x: number, z: number, pad = 0): boolean => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;

/** The same residents, their work spots planned (village-life.ts `visits`). */
const visiting = (cast: readonly Resident[], visits: ReadonlyArray<readonly [number, number]>): Resident[] => cast.map((r) => ({ ...r, visits }));

export async function generateThuVien() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'thu-vien',
    seedText: 'miu-thu-vien',
    outland: 'library',
    soil: { grass: 'grass-library', path: 'paver' },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    shape: (x, z, h) => {
      if (RAISED.some((r) => inRect(r, x, z))) return LEVEL + 1;
      const d = Math.min(...FLAT.map((r) => outsideRect(r, x, z)));
      const k = smoothstep(0, 8, d);
      return LEVEL * (1 - k) + h * k;
    },
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: {
      skip: 0.45,
      blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.3 ? 'leaves-autumn' : roll < 0.5 ? 'leaves-pink' : 'leaves') }),
    },
    // The tower's clock face and the library's gable clock (content/world/models.json has the usual sizes).
    sizes: { [M.bookcase]: 2.4, [M.clock]: 3 },
    // The districts are dressed below (clear of the rooms indoors), not by the builder.
    dressing: { models: [], spacing: SIZE },
    // The library town: the librarians, readers young and old, the children's corner, parents and the
    // gardeners outside; the festival crowd, the tower's keepers, the streets.
    life: ({ landmark }) => [
      // 0. Spawn & arrival terminal: guards, welcome guides, bus riders and shoppers (x: ~186, z: ~430).
      { routine: 'school-guard', name: 'Chú bảo vệ cổng thư viện', model: person('d'), at: [SPAWN.x + 3, SPAWN.z + 1] as const },
      { routine: 'librarian', name: 'Cô hướng dẫn mượn thẻ sách', model: person('e'), held: [LIFE_HELD.book], at: [SPAWN.x - 2, SPAWN.z - 3] as const },
      { routine: 'shopper', name: 'Khách mua sách tới bến xe', model: person('k'), held: [LIFE_HELD.basket], at: [SPAWN.x + 2, SPAWN.z - 4] as const },
      { routine: 'pupil', name: 'Bạn nhỏ cầm truyện vừa mượn', model: person('f'), held: [LIFE_HELD.book], at: [SPAWN.x - 4, SPAWN.z + 2] as const },
      { routine: 'dog', name: 'Cún gác bến xe thư viện', model: animal('dog'), at: [SPAWN.x + 5, SPAWN.z - 2] as const },

      // Way along the central avenue (x: 320-440, z: 420): townspeople strolling and working.
      { routine: 'sweeper', name: 'Chú bảo trì đèn đường', model: person('l'), at: [320, 420] as const },
      { routine: 'shopper', name: 'Người đi dạo đọc báo ven hồ', model: person('c'), held: [LIFE_HELD.book], at: [380, 420] as const },
      { routine: 'vendor', name: 'Bác đẩy xe sách lưu động', model: person('j'), held: [LIFE_HELD.crate], at: [440, 420] as const },

      // 1. Chapter 1: Indoors each works round its own place: the desk and the counter, the stacks, the tables.
      ...visiting(crowd('librarian', ['Cô thủ thư'], [person('e')], landmark('ban-thu-thu'), 2, 1, [LIFE_HELD.book]), [[220, 510], [240, 510], [262, 512]]),
      ...visiting(crowd('librarian', ['Chú xếp sách'], [person('j')], landmark('loi-giua-cac-ke-sach'), 3, 1, [LIFE_HELD.book]), [[251, 512], [257, 516], [262, 518]]),
      ...visiting(crowd('reader', ['Bạn đọc sách', 'Bác đọc báo', 'Chị đọc truyện'], [person('n'), person('a'), person('h'), person('p')], landmark('ban-doc'), 5, 4, [LIFE_HELD.book]), [[201, 513], [207, 514], [210, 508]]),
      ...visiting(crowd('pupil', ['Bạn nhỏ nghe kể chuyện', 'Em bé xem tranh'], [person('f'), person('o'), person('q')], landmark('goc-doc-co-goi'), 4, 3, [LIFE_HELD.book]), [[207, 525], [199, 534], [211, 535]]),
      ...visiting(crowd('pupil', ['Bạn tra cứu sách'], [person('r'), person('n')], landmark('khu-may-tinh'), 3, 2), [[248, 524], [252, 528], [256, 524]]),
      ...visiting(crowd('reader', ['Nhóm bạn học bài'], [person('q'), person('f')], landmark('phong-hoc-nhom'), 4, 2, [LIFE_HELD.book]), [[256, 535], [259, 537], [261, 535]]),
      ...crowd('reader', ['Bạn đọc dưới giàn hoa'], [person('f'), person('o')], landmark('vuon-doc-sach'), 6, 3, [LIFE_HELD.book]),
      ...crowd('waterer', ['Bác làm vườn', 'Cô tưới hoa'], [person('m'), person('e')], landmark('quang-truong-dai-phun'), 16, 3, [LIFE_HELD.bucket]),
      ...crowd('sweeper', ['Chú quét lối đi'], [person('d')], landmark('thu-vien'), 10, 1),
      ...crowd('shopper', ['Mẹ đưa con đến thư viện', 'Bố dắt con đi đọc sách', 'Bà dẫn cháu đi mượn sách'], [person('l'), person('k'), person('i')], landmark('quang-truong-dai-phun'), 11, 4, [LIFE_HELD.book]),
      ...crowd('waterer', ['Bác làm vườn sau'], [person('b')], landmark('vuon-doc-sach'), 12, 1, [LIFE_HELD.bucket]),
      ...crowd('reader', ['Bác đọc sách bên hiên thư viện'], [person('a')], landmark('thu-vien'), 8, 2, [LIFE_HELD.book]),
      ...crowd('reader', ['Bạn nhỏ vẽ bìa sách yêu thích'], [person('p')], landmark('vuon-doc-sach'), 7, 2, [LIFE_HELD.palette]),

      // 2. Chapter 2: Sân lễ hội lá vàng & các trạm hoạt động.
      ...crowd('pupil', ['Bạn dự hội'], [person('f'), person('n'), person('o'), person('q'), person('r')], landmark('san-khau-la-vang'), 12, 8, [LIFE_HELD.balloon]),
      ...crowd('vendor', ['Cô bán kẹo lá', 'Bác bán bóng bay'], [person('e'), person('b')], landmark('quay-keo-la'), 5, 2, [LIFE_HELD.apple]),
      ...crowd('shopper', ['Mẹ đưa con đi hội', 'Bố dắt con'], [person('l'), person('k')], landmark('duong-la-vang'), 14, 4, [LIFE_HELD.basket]),
      ...crowd('trumpeter', ['Chú thổi kèn hội'], [person('c')], landmark('san-khau-la-vang'), 6, 1, [LIFE_HELD.flute]),
      ...crowd('sweeper', ['Cô quét lá vàng'], [person('e'), person('h')], landmark('cay-la-vang'), 12, 2, [LIFE_HELD.basket]),
      ...crowd('reader', ['Bạn nghe kể chuyện sự tích', 'Bé lắng nghe cô đọc sách'], [person('f'), person('o'), person('r')], landmark('tram-ke-chuyen'), 6, 3, [LIFE_HELD.book]),
      ...crowd('pupil', ['Bạn nhỏ thi đố vui bó đũa', 'Bạn đếm que tính'], [person('n'), person('q')], landmark('tram-bo-dua'), 5, 2, [LIFE_HELD.book]),
      ...crowd('pupil', ['Bạn múc nước thả thuyền lá', 'Bé vớt thuyền'], [person('o'), person('f')], landmark('tram-be-nuoc'), 6, 2, [LIFE_HELD.bucket]),
      ...crowd('shopper', ['Bác ngắm cây lá vàng', 'Người thưởng ngoạn mùa thu'], [person('c'), person('p')], landmark('cay-la-vang'), 8, 2),
      ...crowd('pupil', ['Bạn nhỏ reo hò xem kịch lá'], [person('n'), person('r')], landmark('san-khau-la-vang'), 8, 2, [LIFE_HELD.balloon]),

      // 3. Chapter 3: Tháp đồng hồ, xưởng đồng hồ, phòng lịch & đài thiên văn (đầy đủ sinh hoạt thường nhật).
      ...crowd('school-guard', ['Bác giữ tháp'], [person('d')], landmark('chan-thap-dong-ho'), 4, 1),
      ...crowd('sweeper', ['Chú quét dọn chân tháp'], [person('l')], landmark('mai-hien-thap'), 6, 1),
      ...crowd('teacher', ['Ông thợ đồng hồ'], [person('a')], landmark('phong-may-dong-ho'), 4, 1, [LIFE_HELD.book]),
      ...crowd('porter', ['Thợ phụ lau bánh răng', 'Học việc chỉnh kim đồng hồ'], [person('k'), person('j')], landmark('ke-dong-ho'), 4, 2, [LIFE_HELD.axe]),
      ...crowd('pupil', ['Bạn nhỏ học cách xem giờ', 'Bạn quan sát con lắc'], [person('f'), person('n')], landmark('phong-may-dong-ho'), 5, 2, [LIFE_HELD.book]),
      ...crowd('librarian', ['Cô quản lý lịch mùa', 'Chuyên viên lưu trữ tờ lịch'], [person('h'), person('e')], landmark('phong-lich'), 4, 2, [LIFE_HELD.book]),
      ...crowd('librarian', ['Bác thợ vá lịch cũ'], [person('b')], landmark('ban-va-lich'), 3, 1, [LIFE_HELD.book]),
      ...crowd('pupil', ['Bạn nhỏ học 12 tháng', 'Bạn tìm ngày sinh nhật trên lịch'], [person('o'), person('q')], landmark('gia-treo-lich'), 4, 2, [LIFE_HELD.book]),
      ...crowd('reader', ['Người xem album ảnh bốn mùa'], [person('p')], landmark('goc-treo-album-anh'), 4, 1, [LIFE_HELD.book]),
      ...crowd('shopper', ['Bác bưu tá phát thư', 'Người gửi bưu thiếp qua khe thư'], [person('m'), person('h')], landmark('hop-thu'), 4, 2, [LIFE_HELD.book]),
      ...crowd('reader', ['Nhà thiên văn nghiệp dư', 'Người ngắm mây trời qua kính'], [person('d'), person('c')], landmark('goc-kinh-vien-vong'), 5, 2),
      ...crowd('pupil', ['Bạn nhỏ ngắm đường chân trời'], [person('r')], landmark('ban-cong-ngam-troi'), 4, 1),
      ...crowd('shopper', ['Khách ngồi hóng mát ngắm tháp', 'Bác đọc sách trên ghế đá'], [person('a'), person('k')], landmark('bai-co-quanh-thap'), 8, 3, [LIFE_HELD.book]),
      ...crowd('pupil', ['Nhóm bạn xếp hàng lên tham quan tháp'], [person('f'), person('o'), person('q')], landmark('chan-cau-thang-xoan'), 5, 3, [LIFE_HELD.book]),
      ...crowd('sentry', ['Người giữ chuông đỉnh tháp'], [person('j')], landmark('gac-chuong'), 3, 1),
      ...crowd('reader', ['Khách ngắm toàn cảnh thị trấn'], [person('p')], landmark('ban-cong-mat-dong-ho'), 3, 1),

      // Animals around the library, gardens, festival, and clock tower.
      ...crowd('dog', ['Cún phố sách'], [animal('dog')], landmark('quang-truong-dai-phun'), 20, 3),
      ...crowd('cat', ['Mèo thư viện'], [animal('cat')], landmark('goc-doc-co-goi'), 5, 2),
      ...crowd('chick', ['Gà nhà bác làm vườn'], [animal('chick')], landmark('vuon-doc-sach'), 12, 8),
      ...crowd('chick', ['Gà mái mẹ'], [animal('chick')], landmark('tang-da-phang'), 10, 5),
      ...crowd('cat', ['Mèo nằm nắng'], [animal('cat')], landmark('bai-cat-nho'), 8, 4),
      ...crowd('cat', ['Mèo phố hội'], [animal('cat')], landmark('cay-la-vang'), 10, 3),
      ...crowd('dog', ['Cún đi hội'], [animal('dog')], landmark('duong-la-vang'), 16, 4),
      ...crowd('dog', ['Chó giữ tháp'], [animal('dog')], landmark('goc-kinh-vien-vong'), 14, 3),
      ...crowd('cow', ['Bò gặm cỏ bờ suối'], [animal('cow')], landmark('suoi-nho'), 18, 3),
    ],
    build: (ctx) => buildTown(ctx),
  });
}

function buildTown(ctx: ZoneMapContext): void {
  const { world, block, rng, surface, zone } = ctx;
  const [, festival, tower] = [1, 2, 3].map(zone) as [Zone, Zone, Zone];

  // Ground taken (buildings, yards, plots) and props placed, cell by cell, so the town and the dressing
  // keep clear of them; rooms indoors get no dressing.
  const used = new Uint8Array(SIZE * SIZE);
  const propped = new Uint8Array(SIZE * SIZE);
  const indoors: Rect[] = [];
  const cell = (x: number, z: number): number => (x >= 0 && z >= 0 && x < SIZE && z < SIZE ? x * SIZE + z : -1);
  const mark = (grid: Uint8Array, x0: number, z0: number, x1: number, z1: number): void => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
      const i = cell(x, z);
      if (i >= 0) grid[i] = 1;
    }
  };
  const isSet = (grid: Uint8Array, x: number, z: number): boolean => grid[cell(x, z)] === 1;
  const c: ZoneMapContext = {
    ...ctx,
    keepOut: (x0, z0, x1, z1) => {
      ctx.keepOut(x0, z0, x1, z1);
      mark(used, x0, z0, x1, z1);
    },
    prop: (model, x, z, yaw = 0) => {
      ctx.prop(model, x, z, yaw);
      mark(propped, x, z, x, z);
    },
    centred: (model, x, z, yaw) => {
      ctx.centred(model, x, z, yaw);
      mark(propped, x, z, x, z);
    },
  };
  const indoor = (r: Rect): void => {
    indoors.push(r);
    mark(used, r.x0, r.z0, r.x1, r.z1);
  };
  const isIndoor = (x: number, z: number): boolean => indoors.some((r) => inRect(r, x, z));
  const put = (x: number, y: number, z: number, name: string): void => world.set(x, y, z, name === 'air' ? 0 : block(name));
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, name: string): void => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) put(x, y, z, name);
  };
  const tree = (x: number, z: number, leaves: string, height = 6): void => {
    placeTree(world, x, surface(x, z) + 1, z, height, { log: block('tree-log'), leaves: block(leaves) }, rng);
    mark(used, x - 1, z - 1, x + 1, z + 1);
  };
  const bigTree = (x: number, z: number, leaves: string): void => {
    placeAncientTree(world, x, BASE, z, { log: block('tree-log'), leaves: block(leaves), core: block('log') }, rng);
    c.keepOut(x - 3, z - 3, x + 3, z + 3);
  };
  const benchRow = (x: number, z: number, count: number, dx: number, dz: number, yaw: number): void => {
    for (let i = 0; i < count; i++) c.prop(M.bench, x + i * dx, z + i * dz, yaw);
  };
  const stall = (x0: number, z0: number, stripes: readonly string[], goods: readonly string[]): [number, number] => {
    const s = placeStall(world, x0, z0, 5, 3, BASE, { log: block('log'), planks: block('planks'), stripes: stripes.map(block) });
    goods.forEach((g, i) => ctx.propAt(g, [s.counter[0] - 1.5 + i * 1.5, s.counter[1], s.counter[2]], i * 40));
    ctx.propAt(M.balloon, [x0 + 0.5, BASE + 4, z0 - 0.5], 0);
    c.keepOut(x0 - 1, z0 - 2, x0 + 5, z0 + 3);
    return [x0 + 2, z0 - 3];
  };

  // The spawn and the gate beside it stay open; the library's grounds outside its district keep their own
  // trees and no cottages.
  c.keepOut(SPAWN_CLEAR.x0, SPAWN_CLEAR.z0, SPAWN_CLEAR.x1, SPAWN_CLEAR.z1);
  for (const r of GROUNDS) c.keepOut(r.x0, r.z0, r.x1, r.z1);

  const free = (x: number, z: number, pad: number): boolean => {
    if (ctx.nearPath(x, z, pad + 1) || inRect(SPAWN_CLEAR, x, z, 2)) return false;
    for (let dx = -pad; dx <= pad; dx++) {
      for (let dz = -pad; dz <= pad; dz++) {
        const [px, pz] = [x + dx, z + dz];
        if (inWater(px, pz) || isSet(used, px, pz) || isSet(propped, px, pz) || world.get(px, surface(px, pz) + 1, pz) !== 0) return false;
      }
    }
    return true;
  };
  buildGrounds(ctx, c, { free, put, box, tree, benchRow });
  for (const r of buildLibraryHall(ctx, LIB).indoors) indoor(r);
  buildFestival(ctx, c, festival, { free, put, box, tree, bigTree, benchRow, stall });
  buildClockTower(ctx, c, tower, { free, put, box, tree, benchRow, indoor });

  // Flower gardens north-west: fenced beds of one flower each, alleys between them.
  let plot = 0;
  for (let z = GARDENS.z0; z + 20 <= GARDENS.z1; z += 28) {
    for (let x = GARDENS.x0; x + 36 <= GARDENS.x1; x += 44) {
      if (plot++ % 3 === 1) continue;
      flowerField(c, { x0: x, z0: z, x1: x + 36, z1: z + 20 }, FLOWERS[plot % 3] ?? M.flowerRed);
    }
  }

  // Houses round the squares of the festival and the clock tower, along their edges (cottages of the shared
  // size, up to 17 x 12 with their yards), clear of the ways, the pool and its rim, what stands there.
  const buffer = new Set<string>();
  for (const r of ROUTES) for (const k of pathColumns(r, 5)) buffer.add(k);
  const COTTAGE = { w: 17, d: 12 };
  const fits = (x0: number, z0: number, x1: number, z1: number): boolean => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (buffer.has(`${x},${z}`) || isSet(used, x, z) || isSet(propped, x, z) || inWater(x, z) || inWater(x, z + 1) || !ctx.inZone(x, z)) return false;
      if (Math.hypot(x - POOL.x, z - POOL.z) < POOL.r + 4) return false;
    }
    return true;
  };
  const pave = (x: number, z: number): void => {
    if (inWater(x, z) || world.get(x, surface(x, z) + 1, z) !== 0) return;
    world.set(x, surface(x, z), z, ctx.soil.path);
    mark(used, x, z, x, z);
  };
  // A row of cottages whose doors face into the district across their yards; from every door a walk through
  // its yard's gate to a lane along the row's front, the lane running on to the district's street at `street`.
  const edgeRow = (zn: Zone, z: number, street: number): void => {
    const doors: number[] = [];
    let x = zn.x - zn.hx + 1;
    while (x + COTTAGE.w <= zn.x + zn.hx - 1) {
      if (!fits(x - 1, z - 7, x + COTTAGE.w, z + COTTAGE.d)) {
        x += 3;
        continue;
      }
      const next = cottageRow(c, x, z, 1).x1;
      doors.push(x + Math.floor((next - 3 - x) / 2));
      x = next + 2;
    }
    if (doors.length === 0) return;
    const lane = z - 9;
    for (const door of doors) for (let pz = lane; pz < z; pz++) for (let dx = -1; dx <= 1; dx++) pave(door + dx, pz);
    for (let px = Math.min(street, ...doors) - 1; px <= Math.max(street, ...doors) + 1; px++) for (const pz of [lane, lane + 1]) pave(px, pz);
  };
  edgeRow(festival, festival.z + festival.hz - 13, festival.x);
  edgeRow(tower, tower.z - tower.hz + 9, tower.x);
  edgeRow(tower, tower.z + tower.hz - 13, tower.x);
  // Trees all round the inside of the festival and the tower's lawn, golden round the festival.
  const leavesOf: Record<number, readonly string[]> = { 2: ['leaves-autumn', 'leaves-autumn', 'leaves-pink'], 3: ['leaves', 'leaves-pink', 'leaves-autumn'] };
  for (const zn of [festival, tower]) {
    const ring: Array<[number, number]> = [];
    for (let x = zn.x - zn.hx + 3; x <= zn.x + zn.hx - 3; x += 7) ring.push([x, zn.z - zn.hz + 3], [x, zn.z + zn.hz - 3]);
    for (let z = zn.z - zn.hz + 10; z <= zn.z + zn.hz - 10; z += 7) ring.push([zn.x - zn.hx + 3, z], [zn.x + zn.hx - 3, z]);
    ring.forEach(([x, z], i) => {
      let clear = !ctx.nearPath(x, z, 4);
      for (let dx = -3; dx <= 3 && clear; dx++) for (let dz = -3; dz <= 3 && clear; dz++) if (isSet(used, x + dx, z + dz) || isSet(propped, x + dx, z + dz) || inWater(x + dx, z + dz) || world.get(x + dx, surface(x + dx, z + dz) + 1, z + dz) !== 0) clear = false;
      if (clear) tree(x, z, leavesOf[zn.chapter]?.[i % 3] ?? 'leaves', 5 + (i % 3));
    });
  }

  // The town (designs/thu-vien/d-01, behind the library): cottages along both sides of every street and the
  // avenue, their doors on it, front gardens with fences and lanterns; then the verges of every way.
  for (const r of STREETS) streetHouses(c, r);
  streetHouses(c, [[30, AVENUE_Z], [770, AVENUE_Z]], { setback: 9 });
  for (const r of [...STREETS, ...SPURS, [[30, AVENUE_Z], [770, AVENUE_Z]] as Point[]]) laneVerge(c, r, { spacing: 4, lampEvery: 16 });

  // The festival and the tower dressed with small things, clear of paths, water, rooms and what stands there.
  const dress = (zn: Zone, models: readonly string[], spacing: number): void => {
    for (let gx = zn.x - zn.hx + 2; gx < zn.x + zn.hx - 1; gx += spacing) {
      for (let gz = zn.z - zn.hz + 2; gz < zn.z + zn.hz - 1; gz += spacing) {
        const x = Math.round(gx + (rng() - 0.5) * spacing * 0.8);
        const z = Math.round(gz + (rng() - 0.5) * spacing * 0.8);
        const model = models[Math.floor(rng() * models.length)] ?? M.bush;
        let clear = !ctx.onPath(x, z) && !inWater(x, z) && !isIndoor(x, z) && world.get(x, surface(x, z) + 1, z) === 0;
        for (let dx = -1; dx <= 1 && clear; dx++) for (let dz = -1; dz <= 1 && clear; dz++) if (isSet(used, x + dx, z + dz) || isSet(propped, x + dx, z + dz)) clear = false;
        if (clear) c.prop(model, x, z, Math.floor(rng() * 360));
      }
    }
  };
  dress(festival, [M.leaf, M.leaf, M.flowerYellow, M.bush], 5);
  dress(tower, [...FLOWERS, M.bush, M.grass], 5);
}

interface Kit {
  /** Open ground for a tree or a bed: off the ways and the water, clear of what stands there. */
  free: (x: number, z: number, pad: number) => boolean;
  put: (x: number, y: number, z: number, name: string) => void;
  box: (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, name: string) => void;
  tree: (x: number, z: number, leaves: string, height?: number) => void;
  benchRow: (x: number, z: number, count: number, dx: number, dz: number, yaw: number) => void;
}

/** A fenced bed of one flower in rows (every 2 blocks along x, every 3 along z), fence posts every 2 blocks. */
function flowerField(c: ZoneMapContext, r: Rect, flower: string): void {
  for (let x = r.x0 + 2; x < r.x1 - 1; x += 2) for (let z = r.z0 + 2; z < r.z1 - 1; z += 3) c.prop(flower, x, z, (x * 31 + z * 7) % 360);
  for (let x = r.x0; x <= r.x1; x += 2) for (const z of [r.z0, r.z1]) if (Math.abs(x - (r.x0 + r.x1) / 2) > 2) c.prop(M.fence, x, z, 0);
  for (let z = r.z0 + 2; z < r.z1; z += 2) for (const x of [r.x0, r.x1]) c.prop(M.fence, x, z, 90);
  c.keepOut(r.x0, r.z0, r.x1, r.z1);
}

/** Yaw that turns a bench (its seat facing +z) towards a point. */
const benchFacing = (x: number, z: number, tx: number, tz: number): number => (Math.round((Math.atan2(tx - x, tz - z) * 180) / Math.PI) + 360) % 360;

/**
 * Chapter 1's grounds round the library (designs/thu-vien/d-01, d-02, d-13, d-14): the terrace before the
 * door with its planters, lanterns and signboard; the formal garden down to the avenue: the paved square
 * round the tiered fountain, side fountains, flower parterres edged with hedges, clipped bushes and blossom
 * trees, lantern posts along the walks; a lake either side with stone rims, lilies and a humped stone bridge;
 * behind the library the back terrace, the reading garden's pergola hung with vines over its table, the flat
 * stone and the purple myrtle, the stream and its beach; a fountain garden east of the library.
 */
function buildGrounds(ctx: ZoneMapContext, c: ZoneMapContext, kit: Kit): void {
  const { world, block, surface } = ctx;
  const { free, put, box, tree, benchRow } = kit;
  const lit = (cells: ReadonlyArray<readonly [number, number]>): void => {
    for (const [x, z] of cells) c.prop(STREET_LANTERN, x, z, 0);
  };
  /** A hedge of leaves a block high round a bed, gaps where a walk crosses it; flowers inside. */
  const parterre = (r: Rect, flowers = true): void => {
    for (let x = r.x0; x <= r.x1; x++) {
      for (let z = r.z0; z <= r.z1; z++) {
        if (ctx.onPath(x, z) || inRect(SPAWN_CLEAR, x, z)) continue;
        const edge = x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1;
        const k = (x - r.x0 + z - r.z0) % 4;
        if (edge) put(x, surface(x, z) + 1, z, 'leaves');
        else if (!flowers) continue;
        else if (k === 0) put(x, surface(x, z) + 1, z, (x + z) % 3 === 0 ? 'leaves-autumn' : 'leaves-pink');
        else if (k === 2) put(x, surface(x, z) + 1, z, 'wheat');
        else c.prop(FLOWERS[(x * 3 + z) % 3] ?? M.flowerRed, x, z, (x * 37 + z * 11) % 360);
      }
    }
  };
  /** A clipped bush: a stack of leaves, wider in the middle, now and then blossom-pink. */
  const topiary = (x: number, z: number, pink = false): void => {
    const y = surface(x, z) + 1;
    const leaves = pink ? 'leaves-pink' : 'leaves';
    for (let dy = 0; dy <= 2; dy++) put(x, y + dy, z, leaves);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) put(x + dx, y + 1, z + dz, leaves);
  };

  // Landmarks outside first: the review page shoots the first of them from above.
  ctx.landmark('thu-vien', 'Thư viện', LIB.door, TERRACE.z0 + 2, BASE);
  ctx.landmark('quang-truong-dai-phun', 'Quảng trường đài phun', SQUARE.x, SQUARE.z - 6);
  ctx.landmark('cau-da-thu-vien', 'Cầu đá bên hồ', (LAKES[1]?.x ?? 300), LAKE_Z, WATER_LEVEL + 4);
  ctx.landmark('vuon-doc-sach', 'Vườn đọc sách', (PERGOLA.x0 + PERGOLA.x1) >> 1, PERGOLA.z0 + 4);

  // The terrace (d-02): paved, a stone kerb round it with planters of clipped bushes, the signboard, lamps.
  for (let x = TERRACE.x0; x <= TERRACE.x1; x++) {
    for (let z = TERRACE.z0; z <= TERRACE.z1; z++) {
      const edge = x === TERRACE.x0 || x === TERRACE.x1 || z === TERRACE.z0;
      put(x, BASE, z, edge ? 'cobble' : (x + z) % 7 === 0 ? 'cobble' : 'paver');
      if (edge && Math.abs(x - LIB.door) > 8 && (x === TERRACE.x0 || x === TERRACE.x1 || (x - TERRACE.x0) % 4 !== 2)) put(x, BASE + 1, z, 'cobble');
    }
  }
  for (const dx of [-7, 6]) {
    const x = LIB.door + dx;
    box(x, BASE + 1, TERRACE.z1 - 2, x + 1, BASE + 1, TERRACE.z1 - 1, 'cobble');
    box(x, BASE + 2, TERRACE.z1 - 2, x + 1, BASE + 3, TERRACE.z1 - 1, 'leaves');
  }
  for (const x of [TERRACE.x0 + 1, TERRACE.x1 - 1, LIB.door - 9, LIB.door + 9]) c.prop(STREET_LANTERN, x, TERRACE.z0 + 1, 0);
  c.prop(LIBRARY_MODELS.sign, LIB.door - 12, TERRACE.z1 - 1, 0);
  for (const [x, z] of [[LIB.door + 12, TERRACE.z1 - 1], [LIB.door - 15, TERRACE.z0 + 3], [LIB.door + 14, TERRACE.z0 + 3]] as const) {
    c.centred(M.plant, x, z, 0);
  }
  for (let x = TERRACE.x0 + 2; x < TERRACE.x1 - 1; x += 3) if (Math.abs(x - LIB.door) > 9) c.prop(FLOWERS[x % 3] ?? M.flowerRed, x, TERRACE.z0 + 1, x * 7);
  // Beds along the foot of the wings: a hedge against the wall, flowers before it, clipped bushes between.
  for (const [x0, x1] of [[LIB.x0, TERRACE.x0 - 1], [TERRACE.x1 + 1, LIB.x1]] as const) {
    for (let x = x0; x <= x1; x++) {
      put(x, BASE + 1, LIB.z0 - 2, 'leaves');
      if (x % 2 === 0) c.prop(FLOWERS[(x >> 1) % 3] ?? M.flowerRed, x, LIB.z0 - 3, x * 13);
      if (x % 6 === 2) topiary(x, LIB.pavZ0 - 2, x % 12 === 2);
    }
  }
  for (const [x, z] of [[LIB.x0 - 3, LIB.z0 - 6], [LIB.x1 + 3, LIB.z0 - 6], [LIB.x0 - 4, LIB.z1 - 4], [LIB.x1 + 4, LIB.z1 - 4]] as const) tree(x, z, 'leaves-pink', 6);

  // The paved square round the tiered fountain (d-01), lamps round it, benches facing the water.
  placePlaza(world, SQUARE.x, SQUARE.z, SQUARE.r, LEVEL, { paver: block('paver'), border: block('cobble') });
  placeFountain(world, SQUARE.x, SQUARE.z, BASE, { stone: block('cobble'), water: block('water') });
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const d = Math.hypot(dx, dz);
      if (d <= 2.3) put(SQUARE.x + dx, BASE + 2, SQUARE.z + dz, d > 1.3 ? 'cobble' : 'water');
    }
  }
  put(SQUARE.x, BASE + 3, SQUARE.z, 'cobble');
  put(SQUARE.x, BASE + 4, SQUARE.z, 'water');
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    lit([[Math.round(SQUARE.x + Math.cos(a) * (SQUARE.r - 1)), Math.round(SQUARE.z + Math.sin(a) * (SQUARE.r - 1))]]);
    const [bx, bz] = [Math.round(SQUARE.x + Math.cos(a) * 9), Math.round(SQUARE.z + Math.sin(a) * 9)];
    if (!ctx.onPath(bx, bz)) c.prop(M.bench, bx, bz, benchFacing(bx, bz, SQUARE.x, SQUARE.z));
  }

  // Between the square and the terrace: a fountain either side of the cross walk, parterres, clipped bushes.
  for (const dx of [-30, 30]) {
    const fx = SQUARE.x + dx;
    placePlaza(world, fx, 487, 6.5, LEVEL, { paver: block('paver'), border: block('cobble') });
    placeFountain(world, fx, 487, BASE, { stone: block('cobble'), water: block('water') });
    put(fx, BASE + 2, 487, 'water');
  }
  for (const r of [
    { x0: SQUARE.x - 22, z0: 482, x1: SQUARE.x - 5, z1: 492 },
    { x0: SQUARE.x + 5, z0: 482, x1: SQUARE.x + 22, z1: 492 },
    { x0: SQUARE.x - 26, z0: 437, x1: SQUARE.x - 6, z1: 449 },
    { x0: SQUARE.x + 6, z0: 437, x1: SQUARE.x + 26, z1: 449 },
  ]) parterre(r);
  for (const [x, z] of [[SQUARE.x - 5, 481], [SQUARE.x + 5, 481], [SQUARE.x - 6, 451], [SQUARE.x + 6, 451], [SQUARE.x - 22, 481], [SQUARE.x + 22, 481]] as const) topiary(x, z, (x + z) % 3 === 0);
  // Lantern posts up both sides of the walk to the terrace.
  for (let z = AVENUE_Z + 8; z < TERRACE.z0; z += 9) if (Math.abs(z - SQUARE.z) > SQUARE.r + 1) lit([[LIB.door - 4, z], [LIB.door + 4, z]]);

  // The lakes either side (d-01, d-14): a stone rim, lilies, rocks, a humped stone bridge over each.
  for (const l of LAKES) {
    for (let x = l.x - l.rx - 3; x <= l.x + l.rx + 3; x++) {
      for (let z = l.z - l.rz - 3; z <= l.z + l.rz + 3; z++) {
        if (inWater(x, z) || ctx.onPath(x, z)) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => inLake(x + dx, z + dz))) put(x, surface(x, z), z, 'cobble');
      }
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.3;
      const k = 0.35 + 0.5 * (((i * 7) % 5) / 5);
      const [x, z] = [l.x + Math.cos(a) * l.rx * k, l.z + Math.sin(a) * l.rz * k];
      if (Math.abs(z - LAKE_Z) > 4) ctx.propAt(i % 3 === 0 ? M.lilySmall : M.lily, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], i * 50);
    }
    const bridge = placeArchedBridge(world, l.x - l.rx - 4, l.x + l.rx + 4, LAKE_Z, LEVEL, WATER_LEVEL, {
      stone: block('cobble-grey'), ring: block('cobble'), parapet: block('cobble'), deck: block('paver'), water: block('water'),
    });
    lit(bridge.lamps);
    for (const [dx, dz] of [[-l.rx - 2, -6], [l.rx + 2, 7]] as const) c.prop(M.rock, l.x + dx, l.z + dz, dx * 7);
    // Trees round the lake's far side, the side away from the walk up to the library.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      if (Math.cos(a) * Math.sign(l.x - LIB.door) < 0.2) continue;
      const [x, z] = [Math.round(l.x + Math.cos(a) * (l.rx + 6)), Math.round(l.z + Math.sin(a) * (l.rz + 6))];
      if (!ctx.onPath(x, z) && !ctx.nearPath(x, z, 3) && !inRect(SPAWN_CLEAR, x, z, 2)) tree(x, z, i % 3 === 0 ? 'leaves-pink' : 'leaves', 5 + (i % 2));
    }
  }
  ctx.landmark('ho-thu-vien', 'Hồ trước thư viện', LAKES[0]?.x ?? 160, LAKE_Z - 18);

  // Round the garden's edge: trees, now and then a blossom tree, flowers under them.
  for (let x = 126; x <= 334; x += 9) for (const z of [440, 596]) if (!ctx.nearPath(x, z, 3) && !inWater(x, z) && !inRect(SPAWN_CLEAR, x, z, 2) && !(z === 440 && x > 150 && x < 312)) tree(x, z, x % 27 === 0 ? 'leaves-pink' : 'leaves', 6);
  for (let z = 449; z <= 588; z += 9) for (const x of [126, 334]) if (!ctx.nearPath(x, z, 3) && !inWater(x, z)) tree(x, z, z % 27 === 0 ? 'leaves-pink' : 'leaves', 6);

  // The clock tower standing apart behind the library (d-01), a flower bed round its foot.
  const clock = placeClockTower(world, CLOCK_TOWER.x, CLOCK_TOWER.z, BASE, {
    wall: block('sand'), trim: block('cobble'), glass: block('glass'), lantern: block('lantern'), dial: block('snow'), roof: block('brick-red'), finial: block('iron'),
  });
  for (const k of clock.clocks) ctx.propAt(M.clock, k.at, k.yaw);
  c.keepOut(CLOCK_TOWER.x - 5, CLOCK_TOWER.z - 5, CLOCK_TOWER.x + 5, CLOCK_TOWER.z + 5);
  flowerBed(c, CLOCK_TOWER.x - 5, CLOCK_TOWER.z - 6, 11, 2);
  lit([[CLOCK_TOWER.x - 5, CLOCK_TOWER.z - 5], [CLOCK_TOWER.x + 5, CLOCK_TOWER.z - 5]]);
  ctx.landmark('thap-dong-ho-vuon', 'Tháp đồng hồ bên vườn', CLOCK_TOWER.x, CLOCK_TOWER.z - 7);

  // Groves framing the grounds (d-01: green and blossom trees all round): behind the reading garden, either
  // side of the lakes and of the library, a few clipped bushes and flowers between them.
  const grove = (r: Rect, every: number): void => {
    for (let gx = r.x0; gx <= r.x1; gx += every) {
      for (let gz = r.z0; gz <= r.z1; gz += every) {
        const x = Math.round(gx + (ctx.rng() - 0.5) * every * 0.6);
        const z = Math.round(gz + (ctx.rng() - 0.5) * every * 0.6);
        if (!free(x, z, 2)) continue;
        const roll = ctx.rng();
        if (roll < 0.15) topiary(x, z, roll < 0.05);
        else if (roll < 0.25) flowerBed(c, x - 1, z - 1, 3, 3);
        else tree(x, z, roll < 0.45 ? 'leaves-pink' : 'leaves', 5 + Math.floor(roll * 10) % 3);
      }
    }
  };
  for (const r of [
    { x0: 124, z0: 586, x1: 336, z1: 598 },
    { x0: 124, z0: 476, x1: 156, z1: 584 },
    { x0: 304, z0: 476, x1: 336, z1: 584 },
    { x0: 124, z0: 438, x1: 158, z1: 474 },
    { x0: 302, z0: 438, x1: 336, z1: 474 },
    { x0: 160, z0: 478, x1: 190, z1: 500 },
    { x0: 270, z0: 478, x1: 300, z1: 500 },
    { x0: 160, z0: 574, x1: 300, z1: 584 },
  ]) grove(r, 7);

  // Behind the library: the back terrace and its steps (bậc thềm), the reading garden's pergola (d-13).
  for (let x = BACK_TERRACE.x0; x <= BACK_TERRACE.x1; x++) for (let z = BACK_TERRACE.z0; z <= BACK_TERRACE.z1; z++) put(x, BASE, z, x === BACK_TERRACE.x0 || x === BACK_TERRACE.x1 || z === BACK_TERRACE.z1 ? 'cobble' : 'paver');
  // Planters at the terrace's two front corners, on the lawn beside its kerb (the paving kept for walking).
  for (const x of [BACK_TERRACE.x0 - 1, BACK_TERRACE.x1 + 1]) c.centred(M.plant, x, BACK_TERRACE.z1, 0);
  ctx.landmark('bac-them-ra-vuon', 'Bậc thềm ra vườn', LIB.door, BACK_TERRACE.z1 + 2);
  const pg = PERGOLA;
  for (let x = pg.x0; x <= pg.x1; x++) for (let z = pg.z0; z <= pg.z1; z++) if (!ctx.onPath(x, z)) put(x, surface(x, z), z, (x + z) % 5 === 0 ? 'cobble' : 'paver');
  const posts: Array<[number, number]> = [];
  for (let x = pg.x0; x <= pg.x1; x += 7) for (const z of [pg.z0, pg.z1]) posts.push([x, z]);
  // Timber posts on stone plinths (the pergola's feet stand clear of the paving and the wet).
  for (const [x, z] of posts) {
    put(x, BASE, z, 'stone');
    box(x, BASE + 1, z, x, BASE + 3, z, 'log');
  }
  for (let x = pg.x0; x <= pg.x1; x++) for (const z of [pg.z0, pg.z1]) put(x, BASE + 4, z, 'log');
  for (let x = pg.x0; x <= pg.x1; x += 2) for (let z = pg.z0; z <= pg.z1; z++) put(x, BASE + 4, z, 'planks');
  for (let x = pg.x0 - 1; x <= pg.x1 + 1; x++) {
    for (let z = pg.z0 - 1; z <= pg.z1 + 1; z++) {
      const k = (x * 7 + z * 13) % 10;
      if (k < 6) put(x, BASE + 5, z, k === 0 || k === 3 ? 'leaves-pink' : 'leaves');
      const rim = x === pg.x0 - 1 || x === pg.x1 + 1 || z === pg.z0 - 1 || z === pg.z1 + 1;
      if (rim && k < 3) put(x, BASE + 4, z, 'leaves');
    }
  }
  for (const [x, z] of posts) for (const [dx, dz] of [[1, 0], [-1, 0]] as const) if (!ctx.onPath(x + dx, z + dz)) put(x + dx, BASE + 3, z + dz, 'leaves');
  // Vines hanging from the slats, blossom among them.
  for (let x = pg.x0 + 1; x < pg.x1; x++) {
    for (let z = pg.z0; z <= pg.z1; z++) {
      const k = (x * 5 + z * 11) % 9;
      const edge = z === pg.z0 || z === pg.z1;
      if ((edge && k < 5) || k === 0) put(x, BASE + 3, z, k === 2 ? 'leaves-pink' : 'leaves');
      if (edge && k === 1) put(x, BASE + 2, z, 'leaves');
    }
  }
  const tableX = (pg.x0 + pg.x1) >> 1;
  const tableZ = (pg.z0 + pg.z1) >> 1;
  for (const dx of [-0.5, 1.5]) ctx.propAt(LIBRARY_MODELS.readingTable, [tableX + dx, BASE, tableZ + 0.5], 0);
  for (const [dz, yaw] of [[-2, 0], [2, 180]] as const) c.prop(M.bench, tableX, tableZ + dz, yaw);
  ctx.propAt(M.openBook, [tableX - 0.5, BASE + 0.8, tableZ + 0.5], 30);
  ctx.propAt(M.books, [tableX + 1.4, BASE + 0.8, tableZ + 0.6], 80);
  ctx.propAt(LIBRARY_MODELS.readingLamp, [tableX + 0.6, BASE + 0.8, tableZ + 0.4], 0);
  for (const [x, z] of [[pg.x0 + 2, pg.z0 + 2], [pg.x1 - 2, pg.z1 - 2], [pg.x0 + 2, pg.z1 - 2]] as const) c.centred(M.plant, x, z, 0);
  for (const [x, z] of [[pg.x0 - 3, pg.z0 + 2], [pg.x1 + 3, pg.z1 - 1]] as const) c.prop(STREET_LANTERN, x, z, 0);
  flowerBed(c, pg.x0, pg.z1 + 2, pg.x1 - pg.x0, 2);

  // The reading garden west and south of the hall: the flat stone with wild grass round it and the stream
  // behind it, the purple myrtle, benches, a sandy beach on the stream.
  const stone = { x: 184, z: 555 };
  box(stone.x - 2, BASE, stone.z - 1, stone.x + 2, BASE, stone.z + 1, 'stone');
  for (const [dx, dz] of [[-5, -2], [5, 1], [-3, 4]] as const) c.prop(M.rock, stone.x + dx, stone.z + dz, dx * 40);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    c.prop(i % 3 === 0 ? M.flowerPurple : M.grass, Math.round(stone.x + Math.cos(a) * 5), Math.round(stone.z + Math.sin(a) * 4), i * 25);
  }
  c.keepOut(stone.x - 2, stone.z - 1, stone.x + 2, stone.z + 1);
  ctx.landmark('tang-da-phang', 'Tảng đá phẳng', stone.x, stone.z - 3);
  // Named as the lessons name them, so their places gather here (place-quest-targets.ts).
  ctx.landmark('bai-co-dai-quanh-tang-da', 'Bãi cỏ dại quanh tảng đá', stone.x + 6, stone.z + 3);
  ctx.landmark('suoi-nho-sau-tang-da', 'Suối nhỏ sau tảng đá', stone.x, Math.round(streamCenter(stone.x)) - 5);
  const myrtle = { x: 174, z: 532 };
  tree(myrtle.x, myrtle.z, 'leaves-pink', 5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.prop(M.flowerPurple, Math.round(myrtle.x + Math.cos(a) * 3), Math.round(myrtle.z + Math.sin(a) * 3), i * 45);
  }
  ctx.landmark('goc-sim-tim', 'Gốc sim tím', myrtle.x + 3, myrtle.z + 3);
  for (let x = 248; x <= 266; x++) {
    const bank = Math.floor(streamCenter(x) - 2.2);
    for (let z = bank - 5; z <= bank; z++) if (!inWater(x, z) && !ctx.onPath(x, z)) put(x, surface(x, z), z, 'sand');
  }
  c.prop(M.bucket, 252, 562, 30);
  ctx.landmark('bai-cat-nho', 'Bãi cát nhỏ', 257, Math.floor(streamCenter(257)) - 5);
  ctx.landmark('suoi-nho', 'Suối nhỏ', 190, Math.round(streamCenter(190)) - 4);
  // Benches on the lawn north of the reading garden's walk, facing the flat stone and the stream.
  benchRow(176, PERGOLA.z0 - 4, 3, 5, 0, 0);
  benchRow(170, 505, 3, 0, 8, 90);
  for (const [x0, z0] of [[164, 490], [176, 512], [256, 545], [282, 552]] as const) flowerBed(c, x0, z0, 10, 4);
  for (const [x, z] of [[166, 520], [180, 490], [244, 556], [276, 562], [292, 548], [168, 575], [236, 582], [286, 580], [150, 540], [300, 500]] as const) tree(x, z, (x + z) % 3 === 0 ? 'leaves-pink' : 'leaves');

  // East of the hall: a fountain among flower beds, benches and trees.
  const fx = 287;
  const fz = 522;
  placeFountain(world, fx, fz, BASE, { stone: block('cobble'), water: block('water') });
  c.keepOut(fx - 5, fz - 5, fx + 5, fz + 5);
  for (const [dx, dz, yaw] of [[0, -7, 0], [0, 7, 180], [-7, 0, 90], [7, 0, 270]] as const) c.prop(M.bench, fx + dx, fz + dz, yaw);
  for (const [x0, z0] of [[272, 506], [272, 532], [292, 506], [292, 532]] as const) flowerBed(c, x0, z0, 8, 4);
  for (const [x, z] of [[274, 516], [298, 516], [274, 528], [298, 528]] as const) topiary(x, z, x > 280);
}

/**
 * Chapter 2: the golden-leaf festival yard: the stage under a leafy backdrop to the north, benches for the
 * audience, the golden-leaf road up the middle, the round pool with rafts to the east, the golden tree with
 * its stone table, the tree hung with clouds, the leaf-sweet stall and the contest stations.
 */
function buildFestival(ctx: ZoneMapContext, c: ZoneMapContext, zn: Zone, kit: Kit & { bigTree: (x: number, z: number, leaves: string) => void; stall: (x0: number, z0: number, stripes: readonly string[], goods: readonly string[]) => [number, number] }): void {
  const { surface } = ctx;
  const { put, box, bigTree, benchRow, stall } = kit;
  const top = zn.z - zn.hz;

  // The golden-leaf road: a trodden road up the middle (the street into the yard runs on along it to the
  // stage), leaves strewn along it, golden trees either side on the grass past the audience's square.
  const S = { x0: zn.x - 18, z0: top + 5, x1: zn.x + 18, z1: top + 16 };
  for (let z = top + 20; z <= zn.z + zn.hz; z++) for (let dx = -3; dx <= 3; dx++) {
    const x = zn.x + dx;
    if (!inWater(x, z)) put(x, surface(x, z), z, 'path');
  }
  for (let z = top + 22; z <= zn.z + zn.hz; z += 3) for (const dx of [-4, 4]) c.prop(M.leaf, zn.x + dx, z, z * 37);
  for (let z = S.z1 + 30; z <= zn.z + zn.hz - 2; z += 10) for (const dx of [-7, 7]) if (!ctx.onPath(zn.x + dx, z)) c.prop(M.autumnTree, zn.x + dx, z, z * 11);
  ctx.landmark('duong-la-vang', 'Đường lá vàng', zn.x, zn.z + 30);

  // The leaf stage: a plank platform, a backdrop of golden leaves in a red frame, balloons.
  box(S.x0, BASE, S.z0, S.x1, BASE, S.z1, 'planks');
  box(S.x0, BASE + 1, S.z0 - 1, S.x1, BASE + 7, S.z0 - 1, 'leaves-autumn');
  for (let x = S.x0; x <= S.x1; x += 6) box(x, BASE + 1, S.z0 - 1, x, BASE + 8, S.z0 - 1, 'wood-red');
  box(S.x0, BASE + 8, S.z0 - 1, S.x1, BASE + 8, S.z0 - 1, 'wood-red');
  for (const x of [S.x0 + 1, S.x1 - 1]) ctx.propAt(M.balloon, [x + 0.5, BASE + 1, S.z0 + 0.5], 0);
  for (let x = S.x0 + 4; x < S.x1 - 2; x += 5) ctx.propAt(M.leaf, [x + 0.5, BASE + 1, S.z1 - 1.5], x * 17);
  ctx.landmark('san-khau-la-vang', 'Sân khấu lá vàng', zn.x, S.z1 + 2);
  for (const z of [S.z1 + 8, S.z1 + 14, S.z1 + 20]) {
    benchRow(zn.x - 16, z, 3, 4, 0, 180);
    benchRow(zn.x + 8, z, 3, 4, 0, 180);
  }

  // The round pool: a stone rim, rafts afloat, the edge where the fish swim.
  for (let x = POOL.x - 13; x <= POOL.x + 13; x++) for (let z = POOL.z - 13; z <= POOL.z + 13; z++) {
    const d = Math.hypot(x - POOL.x, z - POOL.z);
    if (d >= POOL.r && d < POOL.r + 1.6) put(x, surface(x, z), z, 'brick-grey');
  }
  for (const [dx, dz] of [[-5, -4], [3, -5], [-2, 4], [5, 3]] as const) box(POOL.x + dx, WATER_LEVEL + 1, POOL.z + dz, POOL.x + dx + 1, WATER_LEVEL + 1, POOL.z + dz + 2, 'planks');
  ctx.landmark('be-nuoc-tron', 'Bể nước tròn', POOL.x, POOL.z - POOL.r - 2);
  ctx.landmark('mep-be-nuoc-tron', 'Mép bể nước tròn', POOL.x - POOL.r - 3, POOL.z);

  // The golden tree with its stone table and stools; the tree hung with clouds.
  const gold = GOLD_TREE;
  bigTree(gold.x, gold.z, 'leaves-autumn');
  box(gold.x + 3, BASE, gold.z + 9, gold.x + 5, BASE, gold.z + 10, 'stone');
  for (const [dx, dz] of [[2, 8], [6, 8], [2, 11], [6, 11]] as const) put(gold.x + dx, BASE, gold.z + dz, 'brick-grey');
  c.keepOut(gold.x + 2, gold.z + 8, gold.x + 6, gold.z + 11);
  ctx.landmark('cay-la-vang', 'Cây lá vàng', gold.x, gold.z + 5);
  ctx.landmark('ban-da-duoi-cay-la-vang', 'Bàn đá dưới cây lá vàng', gold.x + 4, gold.z + 13);
  const cloudTree = { x: zn.x - 46, z: top + 12 };
  bigTree(cloudTree.x, cloudTree.z, 'leaves-autumn');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const x = Math.round(cloudTree.x + Math.cos(a) * 5);
    const z = Math.round(cloudTree.z + Math.sin(a) * 5);
    box(x, BASE + 8, z, x, BASE + 9, z, 'log');
    box(x - 1, BASE + 6, z - 1, x + 1, BASE + 7, z, 'snow');
  }
  ctx.landmark('cay-treo-may', 'Cây treo mây', cloudTree.x, cloudTree.z + 8);

  // The leaf-sweet stall by the road, the contest stations west of it and one by the pool.
  const sweets = stall(zn.x + 10, zn.z - 6, ['wood-red', 'snow'], [M.leaf, M.gift, M.leaf]);
  ctx.landmark('quay-keo-la', 'Quầy kẹo lá', sweets[0], sweets[1]);
  const stations: Array<[string, string, readonly string[], readonly string[]]> = [
    ['tram-bong-hoa', 'Trạm bông hoa', ['brick-red', 'snow'], [M.flowerRed, M.flowerYellow, M.flowerPurple]],
    ['tram-the-mau', 'Trạm thẻ màu', ['roof-blue', 'snow'], [M.ticket, M.ticket]],
    ['tram-doan-tu', 'Trạm đoán từ', ['sand', 'wood-red'], [M.openBook, M.books]],
    ['tram-do-vat', 'Trạm đồ vật', ['birch-log', 'roof-blue'], [M.gift, M.balloon]],
    ['tram-dong-vai', 'Trạm đóng vai', ['planks', 'brick-red'], [M.balloon, M.leaf]],
    ['tram-ke-chuyen', 'Trạm kể chuyện', ['snow', 'wood-red'], [M.books, M.openBook]],
    ['tram-bo-dua', 'Trạm bó đũa', ['sand', 'roof-blue'], [M.chopsticks, M.chopsticks]],
  ];
  const slots: Array<[number, number]> = [];
  for (const x0 of STALL_COLUMNS) for (const z0 of STALL_ROWS) slots.push([x0, z0]);
  stations.forEach(([id, name, stripes, goods], i) => {
    const [x0, z0] = slots[i] ?? [0, 0];
    const [lx, lz] = stall(x0, z0, stripes, goods);
    ctx.landmark(id, name, lx, lz);
  });
  const waterStall = stall(WATER_STALL.x, WATER_STALL.z, ['roof-blue', 'snow'], [M.balloon, M.leaf]);
  ctx.landmark('tram-be-nuoc', 'Trạm bể nước', waterStall[0], waterStall[1]);

  // Golden trees round the yard (off the walks), lamps at the corners of the audience.
  for (let z = top + 30; z <= zn.z + 20; z += 12) if (!ctx.nearPath(zn.x - zn.hx + 9, z, 3)) c.prop(M.autumnTree, zn.x - zn.hx + 9, z, z * 13);
  // The audience's square paved in front of the stage, flowers behind every stall.
  for (let x = S.x0; x <= S.x1; x++) for (let z = S.z1 + 1; z <= S.z1 + 26; z++) if (Math.abs(x - zn.x) > 3) put(x, surface(x, z), z, 'path');
  for (const [x0, z0] of slots.slice(0, stations.length)) flowerBed(c, x0, z0 + 5, 6, 2);
  for (const [x, z] of [[S.x0 - 2, S.z1 + 1], [S.x1 + 2, S.z1 + 1], [S.x0 - 2, S.z1 + 26], [S.x1 + 2, S.z1 + 26]] as const) c.prop(STREET_LANTERN, x, z, 0);
}

/**
 * Chapter 3: the clock tower at the end of its street: a brick tower with a porch roof over the door, round
 * windows, spiral stairs up the inside to the landing and the balcony under the clock faces, on up to the
 * bell loft with its big bell, railing and eaves; the clock workshop and the calendar room either side, the
 * mailbox by the door, the telescope corner on its little deck, flower beds and benches on the lawn.
 */
function buildClockTower(ctx: ZoneMapContext, c: ZoneMapContext, zn: Zone, kit: Kit & { indoor: (r: Rect) => void }): void {
  const { surface } = ctx;
  const { put, box, tree, benchRow, indoor } = kit;
  const t = TOWER;
  const at = (dx: number, y: number, dz: number, name: string): void => put(t.x + dx, y, t.z + dz, name);
  const WALL_TOP = BASE + 22;
  const LANDING = BASE + 15;
  const BELFRY = BASE + 23;

  // The paved apron round the tower.
  for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
    const x = t.x + dx;
    const z = t.z + dz;
    if (Math.max(Math.abs(dx), Math.abs(dz)) > 5 && !ctx.onPath(x, z)) put(x, surface(x, z), z, 'brick-grey');
  }
  // Walls: brick with stone corners and a stone band under the balcony; the door faces the street (-z).
  for (let y = BASE; y <= WALL_TOP; y++) for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== 5) continue;
    const corner = Math.abs(dx) === 5 && Math.abs(dz) === 5;
    at(dx, y, dz, corner || y === LANDING ? 'brick-grey' : 'brick-red');
  }
  box(t.x - 1, BASE, t.z - 5, t.x + 1, BASE + 2, t.z - 5, 'air');
  box(t.x - 4, LEVEL, t.z - 4, t.x + 4, LEVEL, t.z + 4, 'planks');
  // Round windows on every face, and a clock face over each balcony side: white dial, dark hands.
  const faces: Array<(u: number, y: number, name: string) => void> = [
    (u, y, n) => at(u, y, -5, n),
    (u, y, n) => at(u, y, 5, n),
    (u, y, n) => at(-5, y, u, n),
    (u, y, n) => at(5, y, u, n),
  ];
  for (const face of faces) {
    for (let u = -2; u <= 2; u++) for (let dy = -2; dy <= 2; dy++) {
      if (u * u + dy * dy <= 2.5) face(u, BASE + 8 + dy, 'glass');
      if (u * u + dy * dy <= 6.5) face(u, BASE + 19 + dy, 'snow');
    }
    for (const [u, dy] of [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] as const) face(u, BASE + 19 + dy, 'board');
  }
  ctx.propAt(M.clock, [t.x + 0.5, BASE + 17.6, t.z - 6.3], 180);

  // Spiral stairs of planks round the inside: from the door up to the landing, then on up to the bell loft.
  const ring: Array<[number, number]> = [];
  for (let dx = -2; dx >= -4; dx--) ring.push([dx, -4]);
  for (let dz = -3; dz <= 4; dz++) ring.push([-4, dz]);
  for (let dx = -3; dx <= 4; dx++) ring.push([dx, 4]);
  for (let dz = 3; dz >= -4; dz--) ring.push([4, dz]);
  for (let dx = 3; dx >= 2; dx--) ring.push([dx, -4]);
  // The landing covers the inside but the first flight's well; the second flight climbs from it.
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const k = ring.findIndex(([rx, rz]) => rx === dx && rz === dz);
    if (k < 0 || k > 15) at(dx, LANDING, dz, 'planks');
  }
  ring.forEach(([dx, dz], k) => {
    if (k <= 23) at(dx, BASE + k, dz, 'planks');
  });
  // The balcony round the clock faces, a door onto it from the landing (a plank threshold over the stone
  // band), a rail along its edge.
  for (let dx = -7; dx <= 7; dx++) for (let dz = -7; dz <= 7; dz++) {
    const d = Math.max(Math.abs(dx), Math.abs(dz));
    if (d >= 6) at(dx, LANDING, dz, 'planks');
    if (d === 7) at(dx, LANDING + 1, dz, 'birch-log');
  }
  box(t.x - 1, LANDING + 1, t.z - 5, t.x + 1, LANDING + 2, t.z - 5, 'air');
  box(t.x - 1, LANDING, t.z - 5, t.x + 1, LANDING, t.z - 5, 'planks');
  ctx.landmark('chieu-nghi-cau-thang-xoan', 'Chiếu nghỉ cầu thang xoắn', t.x, t.z, LANDING + 1);
  ctx.landmark('ban-cong-mat-dong-ho', 'Ban công mặt đồng hồ', t.x, t.z - 6, LANDING + 1);
  ctx.landmark('chan-cau-thang-xoan', 'Chân cầu thang xoắn', t.x - 1, t.z - 3);

  // The bell loft: a floor over the walls (open over the last stairs), stone pillars, a railing, the bell.
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
    const k = ring.findIndex(([rx, rz]) => rx === dx && rz === dz);
    if (k < 20 || k > 22) at(dx, BELFRY, dz, 'planks');
    const edge = Math.max(Math.abs(dx), Math.abs(dz)) === 5;
    const pillar = Math.abs(dx) >= 4 && Math.abs(dz) >= 4;
    if (pillar) for (let y = BELFRY + 1; y <= BELFRY + 4; y++) at(dx, y, dz, 'brick-grey');
    else if (edge) at(dx, BELFRY + 1, dz, 'birch-log');
  }
  at(0, BELFRY + 4, 0, 'sand');
  box(t.x - 1, BELFRY + 2, t.z - 1, t.x + 1, BELFRY + 3, t.z + 1, 'sand');
  for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) at(dx, BELFRY + 2, dz, 'sand');
  ctx.landmark('gac-chuong', 'Gác chuông', t.x, t.z + 3, BELFRY + 1);
  ctx.landmark('lan-can-dinh-thap', 'Lan can đỉnh tháp', t.x, t.z - 4, BELFRY + 1);
  // Eaves over the bell loft and a pointed roof.
  for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) at(dx, BELFRY + 5, dz, 'roof-blue');
  for (let k = 0; k <= 5; k++) for (let dx = -5 + k; dx <= 5 - k; dx++) for (let dz = -5 + k; dz <= 5 - k; dz++) at(dx, BELFRY + 6 + k, dz, 'roof-blue');

  // The porch roof over the door, the mailbox beside it.
  for (const dx of [-3, 3]) box(t.x + dx, BASE, t.z - 9, t.x + dx, BASE + 2, t.z - 9, 'log');
  box(t.x - 4, BASE + 3, t.z - 9, t.x + 4, BASE + 3, t.z - 6, 'roof-blue');
  ctx.landmark('mai-hien-thap', 'Mái hiên tháp', t.x, t.z - 8);
  ctx.landmark('chan-thap-dong-ho', 'Chân tháp đồng hồ', t.x - 7, t.z);
  const mail = { x: t.x + 6, z: t.z - 9 };
  put(mail.x, BASE, mail.z, 'log');
  put(mail.x, BASE + 1, mail.z, 'wood-red');
  ctx.propAt(M.envelope, [mail.x + 0.5, BASE + 2, mail.z + 0.5], 0);
  c.keepOut(mail.x, mail.z, mail.x, mail.z);
  ctx.landmark('hop-thu', 'Hộp thư', mail.x, mail.z - 2);

  // The clock workshop east of the tower, a public room many times the child's size (17 x 13, walls 7 high,
  // a doorway 3 x 3 on its street side): shelves of clocks along the back wall, a workbench with wheels by
  // each side wall, the floor between them open.
  const W = WORKSHOP;
  room(ctx, W.x0, W.z0, W.w, W.d, 7, { wall: 'brick-grey', roof: 'roof-blue', trim: 'log' });
  indoor({ x0: W.x0 + 1, z0: W.z0 + 1, x1: W.x0 + W.w - 2, z1: W.z0 + W.d - 2 });
  for (let x = W.x0 + 2; x <= W.x0 + W.w - 3; x += 2) {
    c.centred(M.bookcase, x, W.z0 + W.d - 2, 180);
    for (const y of [0.15, 0.95, 1.7]) ctx.propAt(M.alarm, [x + 0.5, BASE + y, W.z0 + W.d - 2.2], 180);
  }
  for (const [x, yaw] of [[W.x0 + 2, 90], [W.x0 + W.w - 3, 270]] as const) {
    c.prop(M.workbench, x, W.z0 + 5, yaw);
    ctx.propAt(yaw === 90 ? M.wheel : M.alarm, [x + 0.5, BASE + 0.9, W.z0 + 5.5], yaw);
  }
  ctx.landmark('phong-may-dong-ho', 'Phòng máy đồng hồ', W.x0 + 4, W.z0 - 3);
  ctx.landmark('ke-dong-ho', 'Kệ đồng hồ', W.x0 + 8, W.z0 + 8);

  // The calendar room west of it, as big (19 x 13, walls 7): the mending table, the calendar rack along the
  // back wall, the photo corner, the east window.
  const R = CALENDAR_ROOM;
  const rx1 = R.x0 + R.w - 1;
  room(ctx, R.x0, R.z0, R.w, R.d, 7, { wall: 'birch-log', roof: 'wood-red', trim: 'log' });
  box(rx1, BASE + 1, R.z0 + 3, rx1, BASE + 4, R.z0 + R.d - 4, 'glass');
  indoor({ x0: R.x0 + 1, z0: R.z0 + 1, x1: rx1 - 1, z1: R.z0 + R.d - 2 });
  for (const x of [R.x0 + 5, R.x0 + 6]) c.centred(M.table, x, R.z0 + 6, 0);
  c.centred(M.chair, R.x0 + 5, R.z0 + 5, 0);
  for (const [x, yaw] of [[R.x0 + 5.5, 10], [R.x0 + 6.6, 340]] as const) ctx.propAt(M.calendar, [x, BASE + 0.8, R.z0 + 6.5], yaw);
  ctx.landmark('ban-va-lich', 'Bàn vá lịch', R.x0 + 6, R.z0 + 8);
  const rack = R.z0 + R.d - 2;
  for (const x of [R.x0 + 4, rx1 - 4]) box(x, BASE, rack, x, BASE + 2, rack, 'log');
  box(R.x0 + 4, BASE + 3, rack, rx1 - 4, BASE + 3, rack, 'planks');
  for (let x = R.x0 + 5; x <= rx1 - 5; x += 2) ctx.propAt(M.calendar, [x + 0.5, BASE + 1.6, rack - 0.4], 180);
  ctx.landmark('gia-treo-lich', 'Giá treo lịch', R.x0 + 9, rack - 2);
  for (const z of [R.z0 + 4, R.z0 + 6, R.z0 + 8]) ctx.propAt(M.picture, [R.x0 + 1.3, BASE + 1.4, z + 0.5], 90);
  ctx.landmark('goc-treo-album-anh', 'Góc treo album ảnh', R.x0 + 2, R.z0 + 6);
  ctx.landmark('cua-so-huong-dong', 'Cửa sổ hướng đông', rx1 - 2, R.z0 + 6);
  ctx.landmark('phong-lich', 'Phòng lịch', R.x0 + 5, R.z0 - 3);

  // The telescope corner: a plank deck with a fence round it, a telescope on three legs.
  const tel = TELESCOPE;
  box(tel.x - 3, LEVEL, tel.z - 3, tel.x + 3, LEVEL, tel.z + 3, 'planks');
  c.keepOut(tel.x - 4, tel.z - 4, tel.x + 4, tel.z + 4);
  for (let d = -3; d <= 3; d += 2) for (const [x, z, yaw] of [[tel.x + d, tel.z - 3, 0], [tel.x + d, tel.z + 3, 0], [tel.x - 3, tel.z + d, 90], [tel.x + 3, tel.z + d, 90]] as const) if (!(z === tel.z + 3 && Math.abs(d) <= 1)) c.prop(M.fence, x, z, yaw);
  for (const [dx, dz] of [[-1, 1], [1, 1], [0, -1]] as const) put(tel.x + dx, BASE, tel.z + dz, 'log');
  put(tel.x, BASE + 1, tel.z, 'brick-grey');
  put(tel.x, BASE + 2, tel.z - 1, 'brick-grey');
  put(tel.x, BASE + 2, tel.z - 2, 'glass');
  ctx.landmark('goc-kinh-vien-vong', 'Góc kính viễn vọng', tel.x, tel.z + 5);
  ctx.landmark('ban-cong-ngam-troi', 'Ban công ngắm trời', tel.x - 5, tel.z);
  // The places as the lessons name them, on the ground round the tower and its rooms (place-quest-targets.ts).
  const named: Array<[string, string, number, number]> = [
    ['ban-cong-thap', 'Ban công tháp', t.x + 3, t.z - 10],
    ['bai-co-quanh-thap', 'Bãi cỏ quanh tháp', t.x - 10, t.z + 14],
    ['cau-thang-xoan-cua-thap', 'Cầu thang xoắn của tháp', t.x + 1, t.z - 2],
    ['duoi-chan-thap-dong-ho', 'Dưới chân tháp đồng hồ', t.x - 8, t.z + 4],
    ['duoi-qua-chuong-lon', 'Dưới quả chuông lớn', t.x, t.z + 1],
    ['gac-chuong-tren-thap', 'Gác chuông trên tháp', t.x + 8, t.z + 6],
    ['hop-thu-tren-thap', 'Hộp thư trên tháp', mail.x + 2, mail.z - 2],
    ['ke-dong-ho-dien-tu', 'Kệ đồng hồ điện tử', W.x0 + 4, W.z0 + 4],
    ['phong-lich-tren-thap', 'Phòng lịch trên tháp', R.x0 + 7, R.z0 + 3],
    ['o-cua-so-tron-tren-thap', 'Ô cửa sổ tròn trên tháp', t.x - 8, t.z - 4],
    ['dinh-thap-co-chuong', 'Đỉnh tháp có chuông', t.x + 8, t.z - 4],
  ];
  for (const [id, name, x, z] of named) ctx.landmark(id, name, x, z);

  // The lawn round the tower: flower beds, benches facing it, pink and green trees.
  for (const [x0, z0] of [[t.x - 20, t.z - 26], [t.x + 10, t.z - 26], [t.x - 22, t.z + 12], [t.x + 12, t.z + 12], [t.x - 18, t.z + 20]] as const) flowerBed(c, x0, z0, 10, 4);
  benchRow(t.x - 14, t.z - 18, 3, 4, 0, 0);
  benchRow(t.x + 6, t.z - 18, 3, 4, 0, 0);
  for (const [x, z] of [[zn.x - 50, zn.z - 22], [zn.x - 40, zn.z + 24], [zn.x + 50, zn.z + 24], [zn.x + 52, zn.z - 4], [zn.x - 52, zn.z + 6], [zn.x + 22, zn.z + 30], [zn.x - 20, zn.z + 30]] as const) tree(x, z, (x + z) % 2 === 0 ? 'leaves-pink' : 'leaves');
  // An avenue of trees up the street to the tower, flower beds between them.
  for (let z = zn.z - zn.hz + 14; z <= t.z - 22; z += 8) for (const dx of [-6, 6]) {
    tree(t.x + dx, z, z % 16 === 0 ? 'leaves-pink' : 'leaves', 5);
    flowerBed(c, t.x + dx - 1, z + 3, 3, 2);
  }
}

/** A room of `placeHouse` (door on -z) with glass in its windows. */
function room(ctx: ZoneMapContext, x0: number, z0: number, w: number, d: number, wallHeight: number, b: { wall: string; roof: string; trim: string }): void {
  const { world, block } = ctx;
  placeHouse(world, x0, z0, w, d, wallHeight, BASE, { wall: block(b.wall), roof: block(b.roof), trim: block(b.trim) });
  const y = BASE + 2;
  for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
    const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
    if (edge && world.get(x, y, z) === 0) world.set(x, y, z, block('glass'));
  }
  for (let x = x0 + 1; x < x0 + w - 1; x++) for (let z = z0 + 1; z < z0 + d - 1; z++) world.set(x, LEVEL, z, block('planks'));
}

await runIfMain(import.meta.url, generateThuVien);

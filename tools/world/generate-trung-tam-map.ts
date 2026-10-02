// Generates "Trung tâm", the hub of the world, 800 x 800 blocks from a fixed seed, after the owner's detail
// mock (designs/trung-tam/d-01 … d-08, 02/10/2026: "the place where the children meet when they play
// online, in the middle of the world; every map is reached from here"). In the middle, the round paved
// square: the tiered fountain under the great white cat holding its book, ringed with flower beds,
// benches, lanterns and red cat banners; the row of stone portals along its north side, each glowing in its
// map's colour under its map's name, to all ten maps (d-06); the timber shop with its striped awnings, its
// big sign, counters and red carpet (d-02); the quest board with its gold "!" against a stone wall (d-04);
// the blue-roofed team gazebo with its "TEAM" boards (d-05). A canal runs round the square under stone
// arch bridges, the central one with lanterns, banners and the wooden signposts to the districts (d-07);
// the clock tower stands over the canal's east side. Four districts, one per chapter:
// - the square itself (chapter 1, "Quảng trường trung tâm");
// - west over the canal (chapter 2, "Khu giao dịch và cửa hàng"): the children's trading tables piled with
//   gems, toys and potions, striped stalls round them (d-03);
// - east over the canal (chapter 3, "Khu sự kiện theo mùa"): the stage with its screen between lit trusses,
//   strings of paper lanterns, bunting, blossom trees and food stalls (d-08);
// - north (chapter 4, "Sân trước lâu đài"): the forecourt, then the steps up the terrace to the castle (its
//   front, gatehouse with the glowing gate and its hall behind), the mountains beyond it.
// Round them the town: the houses of the living quarter (west), the learning quarter with its school
// (south-west), the library (north-east) and the harbour with its ships and lighthouse (east); an airship
// and hot-air balloons over it all, and balloons to ride between the districts. Crowds of children walk
// and stand about in groups as players online do, each under their own name; sellers keep the shop and
// the stalls.
// Output: assets/generated/world/trung-tam/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain, smoothstep } from './map-kit';
import { fbm, hashSeed } from './noise';
import { flowerBed, laneVerge, SAILING_SHIP, STREET_LANTERN, streetHouses } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeFountain, placeLighthouse, placeStall } from './structures/countryside';
import { placeArchBridge, placeBanner, placePlaza } from './structures/landmarks';
import type { Point } from './structures/path';
import { placeTree, treeHeight } from './structures/tree';
import { placeGazebo, placeShop, placeStage } from './structures/truong-hoc-plaza';
import { framePoint, placeBigCat, placeClockTower, placeHubCastle, placePortalFacingSouth, placeTieredFountain } from './structures/trung-tam-square';
import type { PortalColour } from './structures/trung-tam-props';
import { facingWriter, FRAME, type Facing } from './structures/world-writer';
import { animal, crowd, person, type Resident } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'trung-tam';
const SIZE = 800;
const GROUND = 12;
const WATER_LEVEL = 10;
const SEED = hashSeed('miu-trung-tam-land');

/** The fountain in the middle of the square, and the square's paved round. */
const F = { x: 400, z: 446 } as const;
const PLAZA_R = 34;
/** The canal round the square: the inner edge a rounded rectangle, the water `width` blocks out from it. */
const CANAL = { x: 400, z: 448, hx: 62, hz: 50, r: 10, width: 6 } as const;
/** The castle's terrace (its top `y`), the steps up its front, and the castle on it. */
const TERRACE = { x0: 296, x1: 504, z0: 148, z1: 330, y: GROUND + 5 } as const;
const STEPS = { x0: 386, x1: 414 } as const;
const CASTLE = { x0: 336, x1: 464, front: 312, back: 226, gateX: 400, wallH: 12 } as const;
/** The clock tower over the canal's north-east, the library, the learning quarter's school, the harbour. */
const CLOCK = { x: 484, z: 416 } as const;
const LIBRARY = { x0: 572, z0: 300, w: 40, d: 18 } as const;
const SCHOOL = { x0: 190, z0: 640, w: 36, d: 14 } as const;
const HARBOUR = { z0: 372, z1: 700, shore: 688 } as const;

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'quang-truong-trung-tam', name: 'Quảng trường trung tâm', x: 400, z: 448, hx: 46, hz: 36, floor: 'cobble' },
  { chapter: 2, id: 'khu-giao-dich', name: 'Khu giao dịch và cửa hàng', x: 260, z: 448, hx: 40, hz: 32, floor: 'cobble' },
  { chapter: 3, id: 'khu-su-kien', name: 'Khu sự kiện theo mùa', x: 548, z: 448, hx: 42, hz: 32, floor: 'paver' },
  { chapter: 4, id: 'san-truoc-lau-dai', name: 'Sân trước lâu đài', x: 400, z: 362, hx: 50, hz: 25, floor: 'cobble-grey' },
];

/** The children arrive at the south foot of the central bridge, looking over it to the fountain. */
const SPAWN = { x: 400, z: 526 } as const;

/**
 * The portals (d-06) in an arc along the square's north side, all facing the fountain: five west of the way
 * to the castle and five east of it (the mock's row, Làng to Lâu đài, on the east), each a map and its colour.
 */
const PORTALS: ReadonlyArray<{ to: string; colour: PortalColour }> = [
  { to: 'truong-hoc', colour: 'yellow' },
  { to: 'thu-vien', colour: 'blue' },
  { to: 'nong-trai', colour: 'lime' },
  { to: 'cho-phien', colour: 'teal' },
  { to: 'xom-mai-am', colour: 'pink' },
  { to: 'lang-ven-song', colour: 'orange' },
  { to: 'khu-rung-bi-mat', colour: 'green' },
  { to: 'nui-tuyet', colour: 'ice' },
  { to: 'dao-bi-an', colour: 'violet' },
  { to: 'lau-dai', colour: 'red' },
];
/** A portal's opening: the first five step out west from the way, the last five east, curving south as they go. */
const portalAt = (i: number): [number, number] => {
  const k = i % 5;
  const side = i < 5 ? -1 : 1;
  return [F.x + side * (12 + k * 10), 414 + k * 2];
};

/** The shop (d-02) on the square's west side, its front to the fountain; the quest board on the east side; the gazebo south-east. */
const SHOP = { origin: [370, 434] as const, facing: 'east' as Facing, width: 16 };
const BOARD = { x: 430, z: 441 } as const;
const GAZEBO = { x: 419, z: 466 } as const;

/** The landmarks the welcome quest stands round (all in the square, on its paving). */
const LANDMARKS = {
  fountain: [400, 433],
  portals: [404, 421],
  shop: [375, 441],
  board: [424, 441],
  gazebo: [411, 459],
  beds: [389, 457],
} as const;

// Ways: the spawn over the central bridge into the square, on north through the portals' gap over the north
// bridge, the forecourt and the steps into the castle's hall; west over the canal through the trading
// quarter to the living quarter; east through the event ground to the harbour; the town's streets.
const SQUARE_IN: Point[] = [[SPAWN.x, SPAWN.z + 4], [400, 458]];
const TO_CASTLE: Point[] = [[400, 429], [400, 266]];
const WEST_WAY: Point[] = [[388, 462], [24, 462]];
const EAST_WAY: Point[] = [[413, 450], [672, 450]];
const SIDE_BRIDGES: Point[][] = [[[356, 488], [356, 516]], [[444, 488], [444, 516]]];
const TOWN_ROUTES: Point[][] = [
  [[300, 520], [500, 520]],
  [[400, 530], [400, 786]],
  [[24, 600], [672, 600]],
  [[120, 120], [120, 786]],
  [[24, 700], [672, 700]],
  [[548, 416], [548, 360], [LIBRARY.x0 + LIBRARY.w / 2, 360], [LIBRARY.x0 + LIBRARY.w / 2, LIBRARY.z0 + LIBRARY.d + 2]],
  [[640, 120], [640, 786]],
];
const ROUTES: Point[][] = [SQUARE_IN, TO_CASTLE, WEST_WAY, EAST_WAY, ...SIDE_BRIDGES, ...TOWN_ROUTES];

/** Signed distance from the canal's inner edge (negative inside the square). */
const canalDistance = (x: number, z: number): number => {
  const qx = Math.abs(x - CANAL.x) - (CANAL.hx - CANAL.r);
  const qz = Math.abs(z - CANAL.z) - (CANAL.hz - CANAL.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - CANAL.r;
};
const inCanal = (x: number, z: number): boolean => {
  const d = canalDistance(x, z);
  return d > 0 && d <= CANAL.width;
};
const harbourShore = (z: number): number => HARBOUR.shore + Math.round(9 * Math.sin(z / 31) + 5 * Math.sin(z / 13));
const inHarbour = (x: number, z: number): boolean => z >= HARBOUR.z0 && z <= HARBOUR.z1 && x >= harbourShore(z) + Math.round(Math.max(0, 30 - Math.min(z - HARBOUR.z0, HARBOUR.z1 - z)) ** 1.4 / 4);
const inWater = (x: number, z: number): boolean => inCanal(x, z) || inHarbour(x, z);

/** 1 inside a rectangle, fading to 0 over `fade` blocks outside it. */
const rectWeight = (x: number, z: number, x0: number, z0: number, x1: number, z1: number, fade: number): number => {
  const d = Math.hypot(Math.max(0, x0 - x, x - x1), Math.max(0, z0 - z, z - z1));
  return fade <= 0 ? (d === 0 ? 1 : 0) : 1 - smoothstep(0, fade, d);
};

/**
 * The land: level all round the square and the districts, the castle's terrace five blocks up with its
 * steps, the mountains rising in rocky steps behind it to the north.
 */
function shapeLand(x: number, z: number, h: number): number {
  const flat = Math.max(
    rectWeight(x, z, 200, 360, 610, 540, 10),
    rectWeight(x, z, LIBRARY.x0 - 6, LIBRARY.z0 - 10, LIBRARY.x0 + LIBRARY.w + 6, LIBRARY.z0 + LIBRARY.d + 12, 6),
    rectWeight(x, z, SCHOOL.x0 - 6, SCHOOL.z0 - 10, SCHOOL.x0 + SCHOOL.w + 6, SCHOOL.z0 + SCHOOL.d + 8, 6),
  );
  let out = h * (1 - flat) + GROUND * flat;
  if (z < 190) {
    const m = smoothstep(190, 50, z);
    out += Math.floor((m * (17 + 9 * fbm(SEED, x / 41, z / 33))) / 3) * 3;
  }
  if (x >= TERRACE.x0 && x <= TERRACE.x1 && z >= TERRACE.z0 && z <= TERRACE.z1) out = Math.max(out, TERRACE.y);
  if (x >= STEPS.x0 && x <= STEPS.x1 && z > TERRACE.z1 && z <= TERRACE.z1 + 4) out = TERRACE.y - (z - TERRACE.z1);
  return out;
}

const N = PACK.nature;
const BX = PACK.box;
const P = PACK.props;
/** The hub's own props (content/world/box-props/trung-tam.json) and the ones it shares. */
const TT = {
  portal: (colour: PortalColour) => `${BX}/tt-portal-${colour}.glb`,
  sign: (map: string) => `${BX}/tt-sign-${map}.glb`,
  shopSign: `${BX}/tt-sign-shop.glb`,
  questBoard: `${BX}/tt-quest-board.glb`,
  team1: `${BX}/tt-sign-team-1.glb`,
  team2: `${BX}/tt-sign-team-2.glb`,
  signpostWest: `${BX}/tt-signpost-west.glb`,
  signpostEast: `${BX}/tt-signpost-east.glb`,
  airship: `${BX}/tt-airship.glb`,
  balloonRainbow: `${BX}/tt-balloon-rainbow.glb`,
  balloonBlue: `${BX}/tt-balloon-blue.glb`,
  clock: `${BX}/tt-clock-face.glb`,
  tables: [`${BX}/tt-trade-table-gems.glb`, `${BX}/tt-trade-table-toys.glb`, `${BX}/tt-trade-table-potions.glb`],
  goods: `${BX}/tt-goods-pile.glb`,
  truss: `${BX}/tt-truss.glb`,
  lanterns: `${BX}/tt-lantern-string.glb`,
  carpet: `${BX}/tt-carpet.glb`,
  // Shared with the school's square and the castle (content/world/box-props/truong-hoc.json, lau-dai.json).
  banner: `${BX}/th-banner.glb`,
  planter: `${BX}/th-planter.glb`,
  bunting: `${BX}/th-bunting.glb`,
  balloon: `${BX}/th-balloon.glb`,
  screen: `${BX}/th-stage-screen.glb`,
  crate: `${BX}/th-goods-crate.glb`,
  shelf: `${BX}/th-goods-shelf.glb`,
  chandelier: `${BX}/ld-chandelier.glb`,
  bench: `${BX}/park-bench.glb`,
  pot: `${BX}/cp-planter.glb`,
  appleCrate: `${BX}/cp-crate-apple.glb`,
  parasol: `${BX}/nt-parasol.glb`,
  table: `${PACK.furniture}/table.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  box: `${PACK.survival}/box-large.glb`,
  bush: `${N}/plant_bush.glb`,
  flowers: [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`],
  food: [`${PACK.food}/apple.glb`, `${PACK.food}/cupcake.glb`, `${PACK.food}/pear.glb`, `${PACK.food}/bread.glb`, `${PACK.food}/cake.glb`, `${PACK.food}/watermelon.glb`],
  gifts: [`${P}/gift-red.glb`, `${P}/teddy-bear.glb`, `${P}/package-yellow.glb`, `${P}/nesting-dolls.glb`, `${P}/puzzle-red.glb`, `${P}/birthday-cake.glb`],
};

/** What the people hold. */
const HELD = {
  balloon: `${P}/balloon.glb`,
  balloonBlue: `${P}/balloon-blue.glb`,
  balloonYellow: `${P}/balloon-yellow.glb`,
  kite: `${P}/kite.glb`,
  book: `${P}/open-book.glb`,
  teddy: `${P}/teddy-bear.glb`,
  gem: `${P}/gem-blue.glb`,
  gift: `${P}/gift-red.glb`,
  ball: `${P}/soccer-ball.glb`,
  basket: `${P}/basket.glb`,
  flower: `${N}/flower_redA.glb`,
  crate: `${PACK.survival}/box.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  paddle: `${N}/canoe_paddle.glb`,
  flute: `${P}/flute.glb`,
  axe: `${PACK.survival}/tool-axe.glb`,
  apple: `${PACK.food}/apple.glb`,
  spoon: `${PACK.food}/cooking-spoon.glb`,
};

/** The children's names, each used once: the players of the hub, as online. */
const KID_NAMES = [
  'Minh Khang', 'Bảo Ngọc', 'Gia Huy', 'Khánh Linh', 'Đức Anh', 'Phương Anh', 'Tuấn Kiệt', 'Hà My', 'Quốc Bảo', 'Thảo Nhi',
  'Nhật Minh', 'Mai Chi', 'Hoàng Long', 'Ngọc Hân', 'Đăng Khoa', 'Bảo Châu', 'Minh Thư', 'Gia Bảo', 'Trúc Linh', 'An Nhiên',
  'Hải Đăng', 'Tú Anh', 'Khôi Nguyên', 'Yến Nhi', 'Thanh Tâm', 'Duy Khánh', 'Lan Anh', 'Phúc An', 'Diệu Linh', 'Trung Kiên',
  'Minh Châu', 'Quang Huy', 'Thu Trang', 'Bảo Long', 'Cát Tường', 'Đức Minh', 'Hồng Nhung', 'Gia Hân', 'Văn Nam', 'Thùy Dương',
  'Anh Thư', 'Hoàng Phúc', 'Ngọc Ánh', 'Tiến Đạt', 'Bích Ngọc', 'Huy Hoàng', 'Như Ý', 'Thiên Ân', 'Kim Ngân', 'Quốc Việt',
  'Mỹ Duyên', 'Thành Đạt', 'Hạ Vy', 'Bảo Anh', 'Minh Triết', 'Tường Vi', 'Nhật Nam', 'Khánh Vy', 'Gia Khang', 'Thu Hà',
  'Đình Phong', 'Vân Anh', 'Hữu Phước', 'Mai Anh', 'Phúc Lâm', 'Thục Đoan', 'Trọng Nhân', 'Xuân Mai', 'Bảo Khang', 'Ngọc Diệp',
  'Tấn Phát', 'Uyên Nhi', 'Đức Thịnh', 'Lam Ngọc', 'Hải Yến', 'Minh Quân', 'Trâm Anh', 'Hoài An', 'Phương Thảo', 'Tuệ Lâm',
  'Bảo Trâm', 'Gia Phúc', 'Quỳnh Như', 'Thái Sơn', 'Kim Chi', 'Duy Anh', 'Ánh Dương', 'Minh Đức', 'Tú Uyên', 'Việt Hoàng',
  'Hà Linh', 'Thế Anh', 'Diễm My', 'Quang Minh', 'Ngọc Trâm', 'Phú Quý', 'Bảo Vy', 'Lâm Phong', 'Thanh Hương', 'Đông Quân',
  'Hiền Thục', 'Gia Minh', 'Ngọc Mai', 'Khải Minh', 'Thu An', 'Bảo Nam', 'Linh Đan', 'Tùng Lâm', 'Hồng Ân', 'Đức Huy',
  'Minh Ngọc', 'Quốc Anh', 'Tuyết Mai', 'Hải Nam', 'Yên Chi', 'Trường An', 'Phương Linh', 'Nguyên Khôi', 'Bích Hà', 'Kiến Văn',
];
const KIDS = ['f', 'n', 'o', 'p', 'q', 'r'].map(person);
const PET_NAMES = {
  cat: ['Mèo Mướp', 'Mèo Mun', 'Mèo Tam Thể', 'Mèo Bơ', 'Mèo Xám', 'Mèo Sữa', 'Mèo Gừng', 'Mèo Khoai'],
  dog: ['Cún Vàng', 'Cún Bông', 'Cún Mực', 'Cún Đốm', 'Cún Lu', 'Cún Na', 'Cún Bột', 'Cún Xoài'],
} as const;

/** The hub's everyday life: groups of children as players online, the shopkeepers and sellers, guards, townsfolk and pets. */
function hubLife(map: { zone: (chapter: number) => Zone; landmark: (id: string) => readonly [number, number] }): Resident[] {
  let next = 0;
  /** A group of `count` children standing about together round (x, z), each under a name of their own. */
  const kids = (at: readonly [number, number], radius: number, count: number, routine: Resident['routine'] = 'pupil', held?: readonly string[]): Resident[] => {
    const names = Array.from({ length: count }, () => `Bạn ${KID_NAMES[next++ % KID_NAMES.length] ?? ''}`);
    return crowd(routine, names, KIDS.slice(next % KIDS.length).concat(KIDS), at, radius, count, held);
  };
  let pet = 0;
  const pets = (at: readonly [number, number], radius: number, count: number): Resident[] =>
    Array.from({ length: count }, (_, i) => {
      const kind = (pet + i) % 3 === 2 ? 'dog' : 'cat';
      const a = (i / count) * Math.PI * 2 + radius;
      const names = PET_NAMES[kind];
      return { routine: kind, name: names[pet++ % names.length] ?? 'Mèo', model: animal(kind), at: [Math.round(at[0] + Math.cos(a) * radius), Math.round(at[1] + Math.sin(a) * radius)] as const };
    });
  const [z1, z2, z3, z4] = [map.zone(1), map.zone(2), map.zone(3), map.zone(4)];
  const shopKeepers = [FRAME + 3, FRAME + 11].map((u) => framePoint(SHOP.origin, SHOP.facing, u + 0.5, FRAME + 3.5));
  return [
    // The square: groups round the fountain, before the portals, at the board and the gazebo, by the shop.
    ...kids([F.x - 14, F.z + 18], 3, 4, 'pupil', [HELD.balloon]),
    ...kids([F.x + 16, F.z - 4], 3, 4, 'kite-flyer', [HELD.kite]),
    ...kids([F.x - 18, F.z - 8], 2, 3, 'pupil', [HELD.teddy]),
    ...kids([F.x + 6, F.z + 20], 3, 4, 'shopper', [HELD.balloonBlue]),
    ...kids([F.x - 30, 424], 3, 4, 'pupil', [HELD.book]),
    ...kids([F.x + 30, 426], 3, 4, 'pupil', [HELD.gem]),
    ...kids([BOARD.x - 9, BOARD.z + 6], 2, 3, 'reader', [HELD.book]),
    ...kids([GAZEBO.x + 7, GAZEBO.z + 2], 3, 5, 'pupil', [HELD.ball]),
    ...kids([F.x - 22, F.z + 26], 3, 3, 'shopper', [HELD.gift]),
    ...kids([F.x + 26, F.z + 26], 3, 3, 'kite-flyer', [HELD.kite]),
    ...kids([z1.x, z1.z + z1.hz - 6], 4, 4, 'pupil', [HELD.balloonYellow]),
    ...shopKeepers.map(([x, z], i) => ({ routine: 'vendor' as const, name: i === 0 ? 'Cô chủ cửa hàng' : 'Chú bán đồ chơi', model: person(i === 0 ? 'e' : 'h'), held: [HELD.basket], at: [Math.floor(x), Math.floor(z)] as const, visits: [[Math.floor(x), Math.floor(z) - 2], [Math.floor(x), Math.floor(z) + 2]] as const, facing: [Math.floor(x) + 3, Math.floor(z)] as const })),
    ...kids([SHOP.origin[0] + 8, SHOP.origin[1] + 4], 2, 3, 'shopper', [HELD.basket]),
    { routine: 'sweeper', name: 'Chú quét quảng trường', model: person('l'), at: [F.x + 22, F.z + 14] as const },
    { routine: 'gardener', name: 'Cô chăm bồn hoa', model: person('a'), held: [HELD.flower], at: [F.x - 14, F.z - 10] as const },
    ...pets([F.x, F.z + 20], 9, 4),
    ...pets([F.x - 26, 432], 5, 2),
    // The way in: children just arrived at the bridge, the balloon man.
    ...kids([SPAWN.x - 10, SPAWN.z + 4], 3, 4, 'pupil', [HELD.balloon]),
    { routine: 'vendor', name: 'Chú bán bóng bay', model: person('c'), held: [HELD.balloonYellow], at: [SPAWN.x - 16, SPAWN.z - 2] as const },
    ...pets([SPAWN.x - 12, SPAWN.z + 8], 3, 2),
    // The trading quarter (d-03): a child at every table selling, groups of buyers between them.
    ...Array.from({ length: 8 }, (_, i) => ({ routine: 'vendor' as const, name: `Bạn ${KID_NAMES[next++ % KID_NAMES.length] ?? ''} bán đồ`, model: KIDS[i % KIDS.length] ?? person('f'), held: [i % 2 === 0 ? HELD.gem : HELD.gift], at: [z2.x - 30 + (i % 4) * 20, z2.z - 16 + Math.floor(i / 4) * 18] as const })),
    ...kids([z2.x - 20, z2.z - 4], 3, 4, 'shopper', [HELD.basket]),
    ...kids([z2.x + 10, z2.z - 4], 3, 4, 'shopper', [HELD.gem]),
    ...kids([z2.x - 10, z2.z + 24], 3, 3, 'shopper', [HELD.gift]),
    ...kids([z2.x + 26, z2.z + 22], 3, 3, 'pupil', [HELD.teddy]),
    { routine: 'vendor', name: 'Bác bán hoa quả', model: person('m'), held: [HELD.apple], at: [z2.x - 26, z2.z - 26] as const },
    { routine: 'porter', name: 'Chú khuân hàng', model: person('j'), held: [HELD.crate], at: [z2.x + 30, z2.z - 26] as const },
    ...pets([z2.x, z2.z + 10], 6, 4),
    // The event ground (d-08): the crowd before the stage, the host on it, the food stalls.
    ...kids([z3.x - 8, z3.z - 2], 3, 5, 'pupil', [HELD.balloon]),
    ...kids([z3.x + 8, z3.z - 2], 3, 5, 'pupil', [HELD.balloonBlue]),
    ...kids([z3.x, z3.z + 8], 3, 4, 'kite-flyer', [HELD.kite]),
    ...kids([z3.x - 26, z3.z + 18], 3, 3, 'shopper', [HELD.gift]),
    ...kids([z3.x + 26, z3.z + 18], 3, 3, 'shopper', [HELD.balloonYellow]),
    { routine: 'trumpeter', name: 'Cô dẫn chương trình', model: person('g'), held: [HELD.flute], at: [z3.x, z3.z - 12] as const },
    { routine: 'vendor', name: 'Cô bán bánh ngọt', model: person('e'), held: [HELD.spoon], at: [z3.x - 32, z3.z + 26] as const },
    { routine: 'vendor', name: 'Chú bán kẹo bông', model: person('k'), held: [HELD.balloon], at: [z3.x + 32, z3.z + 26] as const },
    ...pets([z3.x, z3.z + 16], 7, 4),
    // The forecourt and the castle: guards at the steps and the gate, children about, the gardener.
    ...([-1, 1] as const).map((s, i) => ({ routine: 'sentry' as const, name: i === 0 ? 'Chú lính gác bậc thềm' : 'Cô lính gác bậc thềm', model: person(i === 0 ? 'd' : 'g'), held: [HELD.axe], at: [400 + s * 17, TERRACE.z1 + 6] as const })),
    ...([-1, 1] as const).map((s, i) => ({ routine: 'sentry' as const, name: i === 0 ? 'Chú lính gác cổng lâu đài' : 'Bác lính gác cổng lâu đài', model: person(i === 0 ? 'c' : 'b'), held: [HELD.axe], at: [CASTLE.gateX + s * 11, CASTLE.front + 9] as const })),
    ...kids([z4.x - 24, z4.z], 3, 4, 'pupil', [HELD.book]),
    ...kids([z4.x + 24, z4.z + 6], 3, 4, 'kite-flyer', [HELD.kite]),
    ...kids([z4.x, z4.z + 18], 3, 3, 'pupil', [HELD.teddy]),
    { routine: 'gardener', name: 'Bác làm vườn sân trước', model: person('a'), held: [HELD.flower], at: [z4.x - 40, z4.z - 20] as const },
    { routine: 'sweeper', name: 'Cô quét sân lâu đài', model: person('l'), at: [z4.x + 40, z4.z - 18] as const },
    ...pets([z4.x, z4.z - 6], 8, 4),
    // The town round it: the living quarter's households, the school's children, the library, the harbour.
    ...crowd('home-cook', ['Bác nấu cơm', 'Cô nấu chè'], [person('h'), person('e')], [120, 520], 30, 2, [HELD.spoon]),
    ...crowd('laundry', ['Cô phơi áo', 'Chị giặt đồ'], [person('l'), person('e')], [120, 640], 26, 2),
    ...crowd('waterer', ['Ông tưới cây'], [person('m')], [80, 470], 6, 1, [HELD.bucket]),
    ...crowd('hen-keeper', ['Bà cho gà ăn'], [person('a')], [60, 560], 4, 1),
    ...crowd('chick', ['Gà con'], [animal('chick')], [60, 560], 5, 6),
    ...kids([SCHOOL.x0 + SCHOOL.w / 2, SCHOOL.z0 - 10], 5, 6, 'pupil', [HELD.book]),
    { routine: 'teacher', name: 'Cô giáo khu học tập', model: person('e'), held: [HELD.book], at: [SCHOOL.x0 + 6, SCHOOL.z0 - 6] as const },
    { routine: 'librarian', name: 'Bác thủ thư', model: person('a'), held: [HELD.book], at: [LIBRARY.x0 + LIBRARY.w / 2, LIBRARY.z0 + LIBRARY.d + 8] as const },
    ...kids([LIBRARY.x0 + 10, LIBRARY.z0 + LIBRARY.d + 10], 3, 3, 'reader', [HELD.book]),
    ...crowd('fisher', ['Bác câu cá cảng', 'Chú câu cá'], [person('m'), person('j')], [HARBOUR.shore - 8, 470], 10, 2),
    ...crowd('porter', ['Chú khuân thùng cảng', 'Anh bốc hàng'], [person('j'), person('d')], [HARBOUR.shore - 12, 540], 8, 2, [HELD.crate]),
    ...crowd('ferryman', ['Bác lái đò'], [person('b')], [HARBOUR.shore - 6, 600], 4, 1, [HELD.paddle]),
    ...pets([120, 600], 12, 4),
    ...pets([SCHOOL.x0 + 10, SCHOOL.z0 - 14], 5, 2),
  ];
}

export async function generateTrungTam() {
  const tripStops: ReadonlyArray<{ name: string; to: readonly [number, number] }> = [
    { name: 'Khu giao dịch', to: [260, 474] },
    { name: 'Khu sự kiện', to: [548, 474] },
    { name: 'Sân trước lâu đài', to: [400, 364] },
    { name: 'Cảng biển', to: [HARBOUR.shore - 20, 520] },
    { name: 'Khu sống', to: [126, 470] },
    { name: 'Thư viện', to: [LIBRARY.x0 + LIBRARY.w / 2 + 6, LIBRARY.z0 + LIBRARY.d + 6] },
  ];
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'trung-tam',
    seedText: 'miu-trung-tam',
    // The land round the hub: hills and lookouts toward the mountains behind the castle (d-01's backdrop).
    outland: 'castle',
    soil: { grass: 'grass-hub', path: 'cobble' },
    ground: { ground: GROUND, roll: 3 },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    shape: shapeLand,
    water: { level: WATER_LEVEL, covers: inWater },
    routes: ROUTES,
    pathsFromSpawn: false,
    // Each gate stands just behind its arch, hidden by the glowing pane, so the pane is what the child sees.
    gates: PORTALS.map((p, i) => {
      const [x, z] = portalAt(i);
      return { to: p.to, at: [x, z - 2] as const };
    }),
    // Balloons to ride (d-01's sky): from the station by the bridge to each district, and back.
    rides: {
      vehicle: { name: 'Khinh khí cầu', label: 'Lên khinh khí cầu', model: TT.balloonRainbow },
      stops: [
        ...tripStops.map((t, i) => ({ name: `Khinh khí cầu tới ${t.name}`, at: [SPAWN.x + 14 + (i % 3) * 5, SPAWN.z - 2 + Math.floor(i / 3) * 6] as const, to: t.to })),
        ...tripStops.map((t) => ({ name: 'Khinh khí cầu về quảng trường', at: [t.to[0] + 6, t.to[1]] as const, to: [SPAWN.x + 2, SPAWN.z - 2] as const })),
      ],
    },
    dressing: { models: [TT.planter, ...TT.flowers, TT.bush], spacing: 11 },
    trees: { skip: 0.72, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.35 ? 'leaves-pink' : roll < 0.42 ? 'leaves-autumn' : 'leaves') }) },
    life: hubLife,
    build: (ctx) => buildHub(ctx),
  });
}

function buildHub(ctx: ZoneMapContext): void {
  const { world, block, rng } = ctx;
  const ground = ctx.ground;
  const B = {
    paver: block('paver'),
    cobble: block('cobble'),
    cobbleGrey: block('cobble-grey'),
    brickGrey: block('brick-grey'),
    brickRed: block('brick-red'),
    woodRed: block('wood-red'),
    roofBlue: block('roof-blue'),
    snow: block('snow'),
    stone: block('stone'),
    moss: block('rock-moss'),
    planks: block('planks'),
    log: block('log'),
    treeLog: block('tree-log'),
    leaves: block('leaves'),
    pink: block('leaves-pink'),
    water: block('water'),
    lantern: block('lantern'),
    iron: block('iron'),
    glass: block('glass'),
    wheat: block('wheat'),
    sand: block('sand'),
  };
  const set = (x: number, y: number, z: number, id: number): void => world.set(x, y, z, id);
  const top = (x: number, z: number, id: number): void => set(x, ctx.surface(x, z), z, id);
  const tree = (x: number, z: number, leaves: number): void => {
    placeTree(world, x, ctx.surface(x, z) + 1, z, treeHeight(rng), { log: B.treeLog, leaves }, rng);
    ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
  };
  const y0 = ground + 1;
  const yawToward = (dx: number, dz: number): number => Math.round(((Math.atan2(-dx, -dz) * 180) / Math.PI + 720) % 360);

  // 1. Paving: everything inside the canal and a promenade round it; the square's round with its rings.
  for (let x = CANAL.x - CANAL.hx - 20; x <= CANAL.x + CANAL.hx + 20; x++) {
    for (let z = CANAL.z - CANAL.hz - 14; z <= CANAL.z + CANAL.hz + 14; z++) {
      const d = canalDistance(x, z);
      if (d > CANAL.width + 10 || inWater(x, z) || ctx.surface(x, z) < ground - 1) continue;
      top(x, z, d > 0 ? B.cobbleGrey : (x * 7 + z * 3) % 19 === 0 ? B.cobbleGrey : B.paver);
    }
  }
  placePlaza(world, F.x, F.z, PLAZA_R, ground, { paver: B.cobble, border: B.cobbleGrey });
  for (const r of [14.5, 24]) {
    for (let a = 0; a < 720; a++) {
      const t = (a / 720) * Math.PI * 2;
      top(Math.round(F.x + Math.cos(t) * r), Math.round(F.z + Math.sin(t) * r), B.cobbleGrey);
    }
  }
  // The canal's stone kerb and a low parapet along its inner side, open where a way crosses.
  for (let x = CANAL.x - CANAL.hx - 8; x <= CANAL.x + CANAL.hx + 8; x++) {
    for (let z = CANAL.z - CANAL.hz - 8; z <= CANAL.z + CANAL.hz + 8; z++) {
      if (inWater(x, z)) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => inCanal(x + dx, z + dz));
      if (!near) continue;
      top(x, z, B.cobbleGrey);
      if (!ctx.nearPath(x, z, 4.5)) set(x, ctx.surface(x, z) + 1, z, (x + z) % 9 === 0 ? B.leaves : B.cobbleGrey);
    }
  }
  // The arrival square at the central bridge's south foot, paved, its corners planted.
  for (let x = SPAWN.x - 28; x <= SPAWN.x + 28; x++) for (let z = 505; z <= SPAWN.z + 16; z++) if (!inWater(x, z)) top(x, z, (x + z) % 11 === 0 ? B.cobbleGrey : B.paver);
  ctx.keepOut(SPAWN.x - 28, 505, SPAWN.x + 28, SPAWN.z + 16);
  // No wild trees inside the canal outside the square, nor on its kerbs.
  ctx.keepOut(CANAL.x - CANAL.hx - 8, CANAL.z - CANAL.hz - 8, CANAL.x + CANAL.hx + 8, CANAL.z - 37);
  ctx.keepOut(CANAL.x - CANAL.hx - 8, CANAL.z + 37, CANAL.x + CANAL.hx + 8, CANAL.z + CANAL.hz + 8);
  ctx.keepOut(CANAL.x - CANAL.hx - 8, CANAL.z - 36, CANAL.x - 48, CANAL.z + 36);
  ctx.keepOut(CANAL.x + 48, CANAL.z - 36, CANAL.x + CANAL.hx + 8, CANAL.z + 36);

  // 2. The fountain (d-01): three tiers of water under the great white cat with its book.
  const fountain = placeTieredFountain(world, F.x, F.z, y0, { stone: B.brickGrey, rim: B.cobbleGrey, water: B.water });
  placeBigCat(world, fountain.statue[0], fountain.statue[1], fountain.statue[2], { fur: B.snow, eye: B.iron, coat: B.roofBlue, trim: B.lantern, book: B.woodRed, page: B.snow });
  ctx.keepOut(F.x - 10, F.z - 10, F.x + 10, F.z + 10);
  ctx.landmark('dai-phun-nuoc', 'Đài phun nước tượng mèo', LANDMARKS.fountain[0], LANDMARKS.fountain[1]);
  // The flower beds round it (blocks of green and blossom with flowers on top), open for every way in.
  const gaps = [270, 90, 17, 180, 225, 315, 127, 45];
  for (let deg = 0; deg < 360; deg += 2) {
    if (gaps.some((g) => Math.abs(((deg - g + 540) % 360) - 180) < 9)) continue;
    const a = (deg * Math.PI) / 180;
    for (const r of [12.6, 13.4]) {
      const [x, z] = [Math.round(F.x + Math.cos(a) * r), Math.round(F.z + Math.sin(a) * r)];
      set(x, y0, z, deg % 10 === 0 ? B.pink : B.leaves);
      if (deg % 16 === 0) set(x, y0 + 1, z, deg % 32 === 0 ? B.pink : B.leaves);
    }
    if (deg % 6 === 0) {
      const [x, z] = [Math.round(F.x + Math.cos(a) * 13), Math.round(F.z + Math.sin(a) * 13)];
      ctx.propAt(TT.flowers[(deg / 6) % 3] ?? '', [x + 0.5, y0 + 1, z + 0.5], deg);
    }
  }
  ctx.landmark('bon-hoa-quang-truong', 'Bồn hoa quanh đài phun', LANDMARKS.beds[0], LANDMARKS.beds[1]);
  // Lanterns, benches and red cat banners on rings round the beds.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
    const at = (r: number): [number, number] => [Math.round(F.x + Math.cos(a) * r), Math.round(F.z + Math.sin(a) * r)];
    const [lx, lz] = at(17);
    ctx.prop(STREET_LANTERN, lx, lz, 0);
    if (k % 3 === 1) {
      const [bx, bz] = at(19.5);
      ctx.prop(TT.bench, bx, bz, yawToward(F.x - bx, F.z - bz) + 180);
    }
  }
  for (const deg of [45, 135, 225, 315]) {
    const a = (deg * Math.PI) / 180;
    ctx.prop(TT.banner, Math.round(F.x + Math.cos(a) * 22), Math.round(F.z + Math.sin(a) * 22), 0);
  }

  // 3. The portals (d-06): stone arches along the square's north side, each glowing in its map's colour
  // under its map's name, lanterns and flower pots at their feet.
  PORTALS.forEach((p, i) => {
    const [cx, cz] = portalAt(i);
    const portal = placePortalFacingSouth(world, cx, cz, y0, { stone: B.cobbleGrey, trim: B.brickGrey, moss: B.leaves, lantern: B.lantern });
    ctx.propAt(TT.portal(p.colour), portal.pane, 180);
    ctx.propAt(TT.sign(p.to), portal.sign, 180);
    // Ivy down the pillars' outer edges and a blossom bush at each foot (d-06).
    for (const side of [-4, 4]) {
      for (let y = y0 + 3; y <= y0 + 6; y++) if ((y + i + side) % 3 !== 0) set(cx + side, y, cz + 1, B.leaves);
      set(cx + side, y0, cz + 1, i % 2 === 0 ? B.pink : B.leaves);
    }
    const [fx, fz] = portal.feet[0] ?? [cx - 5, cz + 1];
    ctx.prop(i % 2 === 0 ? TT.planter : TT.bush, fx, fz + 1, 0);
    ctx.keepOut(cx - 5, cz - 2, cx + 5, cz + 1);
  });
  ctx.landmark('cong-dich-chuyen', 'Dãy cổng dịch chuyển', LANDMARKS.portals[0], LANDMARKS.portals[1]);
  for (const s of [-1, 1]) {
    ctx.prop(TT.banner, F.x + s * 7, 417, 0);
    ctx.prop(STREET_LANTERN, F.x + s * 5, 423, 0);
  }

  // 4. The shop (d-02) on the west side facing the fountain: the timber hall with its two striped awnings,
  // a timber front over them with the big sign between lanterns, goods heaped on the counters, shelves
  // inside, crates and flower pots before it, the red carpet, a red cat banner either side.
  const shopWriter = facingWriter(world, SHOP.origin, SHOP.facing);
  const shop = placeShop(shopWriter, FRAME, FRAME, SHOP.width, y0, {
    wall: B.planks, post: B.log, roof: B.roofBlue, floor: B.planks, counter: B.log, stripes: [[B.roofBlue, B.snow], [B.woodRed, B.snow]],
  });
  const shopAt = (u: number, v: number): [number, number] => framePoint(SHOP.origin, SHOP.facing, u, v);
  for (let u = FRAME + 2; u <= FRAME + SHOP.width - 3; u++) {
    for (let y = y0 + 5; y <= y0 + 8; y++) {
      const edge = u === FRAME + 2 || u === FRAME + SHOP.width - 3 || y === y0 + 8;
      shopWriter.set(u, y, FRAME - 1, edge ? B.log : B.planks);
    }
  }
  for (const u of [FRAME + 1, FRAME + SHOP.width - 2]) shopWriter.set(u, y0 + 6, FRAME - 1, B.lantern);
  const [signX, signZ] = shopAt(FRAME + SHOP.width / 2, FRAME - 1.15);
  ctx.propAt(TT.shopSign, [signX, y0 + 5.15, signZ], 270);
  shop.counters.forEach(([u, y, v], i) => {
    for (let k = -2; k <= 2; k++) {
      const [x, z] = shopAt(u + k * 1.3, v);
      ctx.propAt(k % 2 === 0 ? TT.goods : TT.gifts[(i * 3 + k + 2) % TT.gifts.length] ?? TT.goods, [x, y, z], k * 40);
    }
  });
  for (const [u, y, v] of shop.shelves) {
    const [x, z] = shopAt(u, v);
    ctx.propAt(TT.shelf, [x, y, z], 270);
  }
  for (const [u, v, model] of [[FRAME - 2, FRAME - 1.5, TT.crate], [FRAME + SHOP.width + 1, FRAME - 1.5, TT.crate], [FRAME - 2, FRAME + 1.5, TT.appleCrate], [FRAME + SHOP.width + 1, FRAME + 1.5, TT.appleCrate], [FRAME + 1, FRAME - 3.5, TT.pot], [FRAME + SHOP.width - 1, FRAME - 3.5, TT.pot]] as const) {
    const [x, z] = shopAt(u, v);
    ctx.propAt(model, [x, y0, z], u * 17);
  }
  const [carpetX, carpetZ] = shopAt(FRAME + SHOP.width / 2, FRAME - 3.6);
  ctx.propAt(TT.carpet, [carpetX, y0, carpetZ], 90);
  for (const u of [FRAME - 3, FRAME + SHOP.width + 2]) {
    const [x, z] = shopAt(u, FRAME - 3);
    ctx.prop(TT.banner, Math.floor(x), Math.floor(z), 0);
  }
  ctx.keepOut(SHOP.origin[0] - 6, SHOP.origin[1] - 3, SHOP.origin[0] + 2, SHOP.origin[1] + SHOP.width + 2);
  ctx.landmark('truoc-cua-hang', 'Trước cửa hàng', LANDMARKS.shop[0], LANDMARKS.shop[1]);

  // 5. The quest board (d-04) against a stone wall under a tiled hood, a red banner with its crest over it,
  // red cat banners either side, a lantern, barrels and a crate.
  for (let z = BOARD.z - 7; z <= BOARD.z + 6; z++) {
    for (let x = BOARD.x + 1; x <= BOARD.x + 2; x++) {
      for (let y = y0; y <= y0 + 9; y++) set(x, y, z, y === y0 ? B.brickGrey : (y + z) % 5 === 0 ? B.brickGrey : B.cobbleGrey);
      if (z % 2 === 0) set(x, y0 + 10, z, B.cobbleGrey);
    }
  }
  for (let z = BOARD.z - 4; z <= BOARD.z + 4; z++) for (const dx of [0, -1]) set(BOARD.x + dx, y0 + 6, z, B.woodRed);
  placeBanner(world, BOARD.x, y0 + 9, BOARD.z - 1, 'z', { cloth: B.woodRed, emblem: B.lantern }, 3);
  for (const z of [BOARD.z - 4, BOARD.z + 4]) set(BOARD.x, y0 + 4, z, B.lantern);
  ctx.propAt(TT.questBoard, [BOARD.x + 0.62, y0, BOARD.z + 0.5], 90);
  for (const dz of [-6, 6]) ctx.prop(TT.banner, BOARD.x, BOARD.z + dz, 0);
  ctx.prop(STREET_LANTERN, BOARD.x - 3, BOARD.z - 6, 0);
  for (const dz of [-4, 4]) ctx.prop(TT.barrel, BOARD.x - 1, BOARD.z + dz + 1, 0);
  ctx.prop(TT.box, BOARD.x - 2, BOARD.z + 5, 20);
  ctx.prop(TT.pot, BOARD.x - 1, BOARD.z - 5, 0);
  ctx.keepOut(BOARD.x - 1, BOARD.z - 8, BOARD.x + 3, BOARD.z + 6);
  ctx.landmark('bang-nhiem-vu', 'Bảng nhiệm vụ', LANDMARKS.board[0], LANDMARKS.board[1]);

  // 6. The team gazebo (d-05): its blue roof over benches and a table, "TEAM" boards hung from its beams,
  // log rails between its posts (open in the middle of each side), lanterns and flower pots round it.
  const gazebo = placeGazebo(world, GAZEBO.x, GAZEBO.z, y0, { post: B.log, floor: B.planks, rail: B.log, roof: B.roofBlue, lantern: B.lantern });
  for (const s of [-3, 3]) for (const k of [-2, 2]) {
    set(GAZEBO.x + s, y0, GAZEBO.z + k, B.log);
    set(GAZEBO.x + k, y0, GAZEBO.z + s, B.log);
  }
  for (const [x, y, z] of gazebo.benches) ctx.propAt(TT.bench, [x, y, z], 0);
  ctx.centredAt(TT.table, [GAZEBO.x + 0.5, y0, GAZEBO.z + 0.5], 0);
  ctx.propAt(TT.goods, [GAZEBO.x + 0.5, y0 + 0.8, GAZEBO.z + 0.5], 0);
  ctx.propAt(TT.team1, [GAZEBO.x - 1, y0 + 3.1, GAZEBO.z + 3.5], 180);
  ctx.propAt(TT.team2, [GAZEBO.x + 2, y0 + 3.1, GAZEBO.z + 3.5], 180);
  ctx.propAt(TT.team1, [GAZEBO.x - 2.5, y0 + 3.1, GAZEBO.z - 1], 90);
  ctx.propAt(TT.team2, [GAZEBO.x + 3.5, y0 + 3.1, GAZEBO.z + 1], 270);
  for (const [dx, dz] of [[-6, -2], [6, 4]] as const) ctx.prop(STREET_LANTERN, GAZEBO.x + dx, GAZEBO.z + dz, 0);
  for (const [dx, dz] of [[-4, 5], [5, -4], [5, 5]] as const) ctx.prop(TT.pot, GAZEBO.x + dx, GAZEBO.z + dz, 0);
  for (const [dx, dz, yaw] of [[-1, 6, 0], [6, -3, 90]] as const) ctx.prop(TT.bench, GAZEBO.x + dx, GAZEBO.z + dz, yaw);
  ctx.keepOut(GAZEBO.x - 4, GAZEBO.z - 4, GAZEBO.x + 4, GAZEBO.z + 4);
  ctx.landmark('cho-to-doi', 'Chòi chờ tổ đội', LANDMARKS.gazebo[0], LANDMARKS.gazebo[1]);
  // Blossom and green trees in the square's corners behind the portals and by the canal (d-01).
  for (const [x, z] of [[344, 404], [456, 404], [372, 402], [428, 402], [348, 490], [452, 490]] as const) tree(x, z, (x + z) % 2 === 0 ? B.pink : B.leaves);

  // 7. The bridges over the canal (d-07): the central one wide with lanterns and banners, signposts to the
  // districts at its foot; the north one to the forecourt, the west and east ones, two small ones south.
  const span = (alongX: boolean, fixed: number, from: number, to: number): [number, number] => {
    const wet: number[] = [];
    for (let s = Math.min(from, to); s <= Math.max(from, to); s++) if (alongX ? inCanal(s, fixed) : inCanal(fixed, s)) wet.push(s);
    return [Math.min(...wet) - 3, Math.max(...wet) + 3];
  };
  const bridges: Array<{ alongX: boolean; fixed: number; width: number; rise: number; range: [number, number] }> = [
    { alongX: false, fixed: 400, width: 9, rise: 3, range: [480, 520] },
    { alongX: false, fixed: 400, width: 9, rise: 2, range: [380, 410] },
    { alongX: true, fixed: 462, width: 5, rise: 2, range: [320, 345] },
    { alongX: true, fixed: 450, width: 5, rise: 2, range: [455, 480] },
    { alongX: false, fixed: 356, width: 4, rise: 2, range: [480, 520] },
    { alongX: false, fixed: 444, width: 4, rise: 2, range: [480, 520] },
  ];
  const ends: Array<[number, number]> = [];
  for (const br of bridges) {
    const [a, c] = span(br.alongX, br.fixed, br.range[0], br.range[1]);
    const from: [number, number] = br.alongX ? [a, br.fixed] : [br.fixed, a];
    const to: [number, number] = br.alongX ? [c, br.fixed] : [br.fixed, c];
    const bridge = placeArchBridge(world, from, to, WATER_LEVEL + 1, WATER_LEVEL, { stone: B.brickGrey, rail: B.cobbleGrey }, br.width, br.rise);
    for (const [x, z] of bridge.lamps) ctx.prop(STREET_LANTERN, x, z, 0);
    ends.push(to);
  }
  const southFoot = ends[0]?.[1] ?? 508;
  for (const s of [-1, 1]) {
    ctx.prop(TT.banner, 400 + s * 7, southFoot + 2, 0);
    ctx.prop(TT.banner, 400 + s * 7, 492, 0);
  }
  ctx.propAt(TT.signpostWest, [394.5, ground + 1, southFoot + 3.5], 180);
  ctx.propAt(TT.signpostEast, [406.5, ground + 1, southFoot + 3.5], 180);
  ctx.landmark('cau-trung-tam', 'Cầu trung tâm', 400, southFoot + 2);
  // Flower boxes along the canal's outer bank either side of the central bridge.
  for (let x = 362; x <= 438; x += 6) if (Math.abs(x - 400) > 10 && Math.abs(x - 356) > 4 && Math.abs(x - 444) > 4) ctx.prop(TT.planter, x, 508, 0);

  // 8. The clock tower (d-01) over the canal's north-east, a clock on every face.
  const clock = placeClockTower(world, CLOCK.x, CLOCK.z, ctx.surface(CLOCK.x, CLOCK.z) + 1, 22, { wall: B.cobbleGrey, corner: B.brickGrey, glass: B.glass, roof: B.woodRed, pole: B.log, flag: B.woodRed, lantern: B.lantern });
  for (const face of clock.faces) ctx.propAt(TT.clock, face.at, face.yaw);
  ctx.keepOut(CLOCK.x - 5, CLOCK.z - 5, CLOCK.x + 5, CLOCK.z + 5);
  ctx.landmark('thap-dong-ho', 'Tháp đồng hồ', CLOCK.x, CLOCK.z + 6);

  // 9. The forecourt (zone 4) and the castle: two fountains, hedges and banners down the way, the steps up
  // the terrace, the castle's front, its glowing gate, the hall behind it lit by chandeliers.
  const fore = ctx.zone(4);
  for (const s of [-1, 1]) {
    const fx = fore.x + s * 28;
    const small = placeFountain(world, fx, fore.z, y0, { stone: B.cobbleGrey, water: B.water });
    ctx.propAt(TT.banner, small.plinth, 0);
    ctx.keepOut(fx - 4, fore.z - 4, fx + 4, fore.z + 4);
    for (let z = fore.z - fore.hz + 4; z <= fore.z + fore.hz - 4; z += 8) {
      ctx.prop(TT.banner, fore.x + s * 8, z, 0);
      ctx.prop(STREET_LANTERN, fore.x + s * 6, z + 4, 0);
    }
    flowerBed(ctx, fore.x + s * 42 - 3, fore.z - 20, 6, 10);
    flowerBed(ctx, fore.x + s * 42 - 3, fore.z + 10, 6, 10);
  }
  ctx.landmark('dai-phun-san-truoc', 'Đài phun sân trước', fore.x - 28, fore.z + 6);
  // The terrace's face of stone, its steps, planters and banners along it.
  for (let x = TERRACE.x0; x <= TERRACE.x1; x++) {
    for (let z = TERRACE.z0; z <= TERRACE.z1 + 4; z++) {
      const h = ctx.surface(x, z);
      const edge = z >= TERRACE.z1 - 1 || x <= TERRACE.x0 + 1 || x >= TERRACE.x1 - 1;
      if (h >= TERRACE.y - 4 && (edge || (x >= STEPS.x0 && x <= STEPS.x1))) for (let y = ground; y <= h; y++) set(x, y, z, x >= STEPS.x0 && x <= STEPS.x1 ? B.cobbleGrey : y === h ? B.cobbleGrey : B.brickGrey);
      else if (h === TERRACE.y) set(x, h, z, (x + z * 3) % 13 === 0 ? B.cobbleGrey : B.paver);
    }
  }
  for (let x = TERRACE.x0 + 4; x <= TERRACE.x1 - 4; x += 10) if (x < STEPS.x0 - 2 || x > STEPS.x1 + 2) ctx.prop(TT.planter, x, TERRACE.z1 + 2, 0);
  for (const s of [-1, 1]) ctx.prop(TT.banner, 400 + s * 16, TERRACE.z1 + 2, 0);
  const castle = placeHubCastle(world, { ...CASTLE, baseY: TERRACE.y + 1 }, {
    wall: B.cobbleGrey, trim: B.brickGrey, roof: B.woodRed, glass: B.glass, lantern: B.lantern, floor: B.paver, carpet: B.woodRed, beam: B.log, cloth: B.woodRed, emblem: B.wheat, pole: B.log,
  });
  ctx.propAt(TT.portal('ice'), castle.gate.pane, 180);
  for (const at of castle.lights) ctx.propAt(TT.chandelier, at, 0);
  for (const crown of castle.crowns) ctx.propAt(`${BX}/tt-tower-crown-${crown.radius}.glb`, crown.at, 0);
  for (const s of [-1, 1]) {
    for (const dz of [4, 10]) ctx.propAt(STREET_LANTERN, [CASTLE.gateX + s * 7 + 0.5, TERRACE.y + 1, castle.front + dz + 0.5], 0);
    ctx.propAt(TT.banner, [CASTLE.gateX + s * 12 + 0.5, TERRACE.y + 1, TERRACE.z1 - 3 + 0.5], 0);
  }
  ctx.keepOut(CASTLE.x0 - 6, CASTLE.back - 6, CASTLE.x1 + 6, castle.front + 1);
  ctx.keepOut(TERRACE.x0, TERRACE.z1 - 1, TERRACE.x1, TERRACE.z1 + 5);
  ctx.landmark('cong-lau-dai', 'Cổng lâu đài', CASTLE.gateX, castle.front + 4, TERRACE.y + 1);
  ctx.landmark('sanh-lau-dai', 'Sảnh lâu đài', CASTLE.gateX, castle.hall.z1 - 10, TERRACE.y + 1);

  // 10. The trading quarter (d-03): close rows of the children's tables with their goods under striped
  // parasols, crates and barrels between, striped stalls round it.
  const trade = ctx.zone(2);
  let t = 0;
  for (const z of [trade.z - 22, trade.z - 14, trade.z - 6, trade.z + 6, trade.z + 14, trade.z + 22]) {
    for (let x = trade.x - 29; x <= trade.x + 33; x += 7) {
      if (ctx.nearPath(x, z, 3)) continue;
      ctx.prop(TT.tables[t % TT.tables.length] ?? '', x, z, t % 2 === 0 ? 0 : 180);
      if (t % 2 === 0) ctx.prop(TT.parasol, x + 1, z + 1, t * 30);
      else if (t % 4 === 1) ctx.prop(TT.crate, x + 2, z, t * 20);
      else ctx.prop(TT.barrel, x - 2, z + 1, 0);
      t++;
    }
  }
  const stripes = [[B.woodRed, B.snow], [B.roofBlue, B.snow], [B.wheat, B.snow]];
  for (let i = 0; i < 6; i++) {
    const x0 = trade.x - 36 + i * 13;
    const stall = placeStall(world, x0, trade.z + trade.hz - 6, 6, 4, y0, { log: B.log, planks: B.planks, stripes: stripes[i % 3] ?? [] });
    for (let k = -1; k <= 1; k++) ctx.propAt(TT.food[(i + k + 1) % TT.food.length] ?? '', [stall.counter[0] + k * 1.4, stall.counter[1], stall.counter[2]], k * 50);
    ctx.keepOut(x0 - 1, trade.z + trade.hz - 7, x0 + 6, trade.z + trade.hz - 3);
    const north = facingWriter(world, [x0, trade.z - trade.hz + 2], 'south');
    const back = placeStall(north, FRAME, FRAME, 6, 4, y0, { log: B.log, planks: B.planks, stripes: stripes[(i + 1) % 3] ?? [] });
    for (let k = -1; k <= 1; k++) {
      const [x, z] = framePoint([x0, trade.z - trade.hz + 2], 'south', back.counter[0] + k * 1.4, back.counter[2]);
      ctx.propAt(TT.gifts[(i + k + 1) % TT.gifts.length] ?? '', [x, back.counter[1], z], k * 50);
    }
    ctx.keepOut(x0 - 6, trade.z - trade.hz - 2, x0 + 1, trade.z - trade.hz + 3);
  }
  // Stalls down the quarter's west side, their fronts to the tables.
  for (const [k, zNorth] of [424, 436, 468].entries()) {
    const origin: [number, number] = [trade.x - trade.hx + 4, zNorth];
    const stall = placeStall(facingWriter(world, origin, 'east'), FRAME, FRAME, 6, 4, y0, { log: B.log, planks: B.planks, stripes: stripes[(k + 2) % 3] ?? [] });
    for (let j = -1; j <= 1; j++) {
      const [cx, cz] = framePoint(origin, 'east', stall.counter[0] + j * 1.4, stall.counter[2]);
      ctx.propAt(j === 0 ? TT.goods : TT.gifts[(k + j + 1) % TT.gifts.length] ?? TT.goods, [cx, stall.counter[1], cz], j * 40);
    }
    ctx.keepOut(origin[0] - 4, zNorth - 1, origin[0] + 2, zNorth + 6);
  }
  for (let x = trade.x - 36; x <= trade.x + 36; x += 12) for (const dz of [-10, 18]) ctx.prop(STREET_LANTERN, x + 3, trade.z + dz, 0);
  for (const s of [-1, 1]) ctx.prop(TT.banner, trade.x + s * 42, trade.z + 14, 0);
  ctx.landmark('cho-giao-dich', 'Chợ giao dịch', trade.x, trade.z + 2);

  // 11. The event ground (d-08): the stage at its north end facing south, the screen between lit trusses,
  // lantern strings and bunting over the aisle, food stalls either side of it, blossom trees all round.
  const ev = ctx.zone(3);
  const stageFront = ev.z - ev.hz + 16;
  const stageWriter = facingWriter(world, [ev.x, stageFront], 'south');
  const stage = placeStage(stageWriter, FRAME, FRAME, y0, 21, { deck: B.planks, edge: B.log, step: B.cobbleGrey });
  const [scx, scz] = framePoint([ev.x, stageFront], 'south', stage.screen[0], stage.screen[2]);
  ctx.propAt(TT.screen, [scx, stage.deck, scz], 180);
  for (const s of [-1, 1]) {
    ctx.propAt(TT.truss, [ev.x + 0.5 + s * 10, stage.deck, stageFront - 4.5], 0);
    ctx.propAt(TT.truss, [ev.x + 0.5 + s * 12, y0, stageFront + 1.5], 0);
    ctx.propAt(TT.banner, [ev.x + 0.5 + s * 14, y0, stageFront - 2.5], 0);
  }
  for (const dx of [-6, 0, 6]) ctx.propAt(TT.lanterns, [ev.x + 0.5 + dx, y0 + 5.6, stageFront + 1.5], 0);
  for (const dz of [8, 16, 24, 32]) {
    for (const dx of [-9, -3, 3, 9]) ctx.propAt(TT.lanterns, [ev.x + 0.5 + dx, y0 + 4.6, stageFront + dz], 0);
    for (const s of [-1, 1]) ctx.prop(STREET_LANTERN, ev.x + s * 9, stageFront + dz - 1, 0);
  }
  ctx.propAt(TT.bunting, [ev.x + 0.5, y0 + 6.2, stageFront + 0.6], 0);
  ctx.keepOut(ev.x - 13, stageFront - 7, ev.x + 13, stageFront + 2);
  // Food stalls down both sides of the aisle facing it, clear of the way across the ground.
  for (const s of [-1, 1] as const) {
    for (const [k, zNorth] of [437, 454, 466].entries()) {
      const facing: Facing = s < 0 ? 'east' : 'west';
      const origin: [number, number] = s < 0 ? [ev.x - 12, zNorth] : [ev.x + 12, zNorth + 5];
      const stall = placeStall(facingWriter(world, origin, facing), FRAME, FRAME, 6, 4, y0, { log: B.log, planks: B.planks, stripes: stripes[(k + (s > 0 ? 1 : 0)) % 3] ?? [] });
      for (let j = -1; j <= 1; j++) {
        const [cx, cz] = framePoint(origin, facing, stall.counter[0] + j * 1.4, stall.counter[2]);
        ctx.propAt(TT.food[(k * 2 + j + 1 + (s > 0 ? 1 : 0)) % TT.food.length] ?? '', [cx, stall.counter[1], cz], j * 40);
      }
      const corners = [framePoint(origin, facing, FRAME - 1, FRAME - 2), framePoint(origin, facing, FRAME + 7, FRAME + 4)];
      ctx.keepOut(Math.floor(Math.min(...corners.map((c) => c[0]))), Math.floor(Math.min(...corners.map((c) => c[1]))), Math.floor(Math.max(...corners.map((c) => c[0]))), Math.floor(Math.max(...corners.map((c) => c[1]))));
    }
  }
  for (const s of [-1, 1]) {
    for (const z of [stageFront - 6, stageFront + 4, stageFront + 22, stageFront + 40]) tree(ev.x + s * 25, z, B.pink);
    for (const z of [stageFront - 3, stageFront + 14, stageFront + 32]) tree(ev.x + s * 34, z, z % 2 === 0 ? B.pink : B.leaves);
    tree(ev.x + s * 18, stageFront - 6, B.pink);
    for (const z of [446, 476]) tree(ev.x + s * 20, z, B.pink);
  }
  ctx.landmark('san-khau', 'Sân khấu sự kiện', ev.x, stageFront + 12);

  // 12. The harbour (east): jetties with boats and ships, the lighthouse on its point, crates on the quay.
  for (const [i, z] of [470, 520, 570, 620].entries()) {
    const x = harbourShore(z) + 2;
    for (let k = 0; k < 18; k++) for (let dz = -1; dz <= 1; dz++) if (inHarbour(x + k, z + dz)) set(x + k, WATER_LEVEL + 1, z + dz, B.planks);
    ctx.propAt(SAILING_SHIP, [x + 12.5, WATER_LEVEL + 0.6, z + 5.5], i * 30 + 90);
    ctx.prop(TT.barrel, x - 3, z - 2, 0);
    ctx.prop(TT.crate, x - 3, z + 2, i * 40);
    ctx.prop(STREET_LANTERN, x - 2, z, 0);
    ctx.keepOut(x - 2, z - 2, x + 18, z + 2);
  }
  const lighthouse = { x: harbourShore(690) - 8, z: 690 };
  placeLighthouse(world, lighthouse.x, lighthouse.z, ctx.surface(lighthouse.x, lighthouse.z) + 1, { red: B.woodRed, white: B.snow, glass: B.glass, cap: B.roofBlue });
  ctx.keepOut(lighthouse.x - 4, lighthouse.z - 4, lighthouse.x + 4, lighthouse.z + 4);
  ctx.landmark('cang-bien', 'Cảng biển', harbourShore(520) - 6, 520);

  // 13. The library (north-east) and the learning quarter's school (south-west), lawns and flowers before them.
  const finish = { plinth: B.cobbleGrey, beam: B.log, glass: B.glass, sill: B.planks, ridge: B.brickGrey, gable: B.planks, lantern: B.lantern, floor: B.planks };
  // The library's front looks south, down its lane: built in its own frame turned about its south-east corner.
  placeHouse(facingWriter(world, [LIBRARY.x0 + LIBRARY.w - 1, LIBRARY.z0 + LIBRARY.d - 1], 'south'), FRAME, FRAME, LIBRARY.w, LIBRARY.d, 7, y0, { ...finish, wall: B.sand, roof: B.roofBlue, trim: block('birch-log') });
  ctx.keepOut(LIBRARY.x0 - 2, LIBRARY.z0 - 2, LIBRARY.x0 + LIBRARY.w + 1, LIBRARY.z0 + LIBRARY.d + 2);
  flowerBed(ctx, LIBRARY.x0 + 2, LIBRARY.z0 + LIBRARY.d + 3, 12, 4);
  flowerBed(ctx, LIBRARY.x0 + LIBRARY.w - 14, LIBRARY.z0 + LIBRARY.d + 3, 12, 4);
  ctx.landmark('thu-vien', 'Thư viện', LIBRARY.x0 + LIBRARY.w / 2, LIBRARY.z0 + LIBRARY.d + 4);
  placeHouse(world, SCHOOL.x0, SCHOOL.z0, SCHOOL.w, SCHOOL.d, 6, y0, { ...finish, wall: block('birch-log'), roof: B.woodRed, trim: B.log });
  ctx.keepOut(SCHOOL.x0 - 2, SCHOOL.z0 - 4, SCHOOL.x0 + SCHOOL.w + 1, SCHOOL.z0 + SCHOOL.d + 1);
  ctx.prop(`${BX}/flagpole.glb`, SCHOOL.x0 + SCHOOL.w / 2, SCHOOL.z0 - 8, 0);
  ctx.landmark('khu-hoc-tap', 'Khu học tập', SCHOOL.x0 + SCHOOL.w / 2, SCHOOL.z0 - 6);

  // 14. The sky (d-01): the airship and hot-air balloons over the square.
  ctx.propAt(TT.airship, [462.5, 40, 392.5], 200);
  ctx.propAt(TT.balloonRainbow, [372.5, 34, 360.5], 30);
  ctx.propAt(TT.balloonBlue, [520.5, 30, 410.5], 0);
  ctx.propAt(TT.balloon, [300.5, 32, 420.5], 60);
  ctx.propAt(TT.balloonBlue, [560.5, 36, 470.5], 120);
  ctx.propAt(TT.balloon, [440.5, 38, 300.5], 10);

  // 15. The mountains behind the castle: rock and moss on their steps, snow on the tops.
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < TERRACE.z0 + 40; z++) {
      if (x >= TERRACE.x0 && x <= TERRACE.x1 && z >= TERRACE.z0) continue;
      const h = ctx.surface(x, z);
      if (h < ground + 6) continue;
      set(x, h, z, h >= ground + 17 ? B.snow : (x * 3 + z) % 4 === 0 ? B.moss : B.stone);
    }
  }

  // 16. The town: houses facing its streets (their roofs red, blue and dark red), blossom trees in the
  // square's corners outside the canal, and the verges of every way.
  for (const route of [WEST_WAY.slice(0), ...TOWN_ROUTES]) streetHouses(ctx, route);
  for (const [x, z] of [[316, 380], [484, 380], [314, 516], [486, 516], [300, 440], [500, 470]] as const) tree(x, z, (x + z) % 3 === 0 ? B.leaves : B.pink);
  for (const route of [WEST_WAY, EAST_WAY, ...TOWN_ROUTES]) laneVerge(ctx, route);
}

await runIfMain(import.meta.url, generateTrungTam);

// Generates "Đảo bí ẩn" (the treasure island: exploring and challenges) from a fixed seed, 800 x 800 blocks
// after the owner's detail mock (designs/dao-bi-an/d-01 … d-14, 02/10/2026): an archipelago on a clear blue
// sea. The main island's rock mesa in the middle with spires and its great fall between ruins; the harbour
// with its long pier and sailing ships, the beach of white sand under palms; the jungle with big trees,
// vines and the rope bridge before its fall; the ruins and the temple of the great crystal; the cave with its
// lake and crystals, and the treasure vault behind it; the night forest of glowing mushrooms; the volcano's
// island with the challenge court of lava; the pirates' cove; islets all round. Boats ("Thuyền") run between
// the landings of the islands, and plank causeways join them for those who walk. Five districts, one per
// chapter (structures/dao-bi-an-land.ts has the layout):
// - the harbour and the beach (chapter 1): the places of the welcome quest round the pier head;
// - the jungle and its fall (chapter 2), west of the mesa;
// - the ruins before the temple (chapter 3), east of it;
// - before the cave's mouth (chapter 4), north of it;
// - the pirates' beach (chapter 5) on their island, south-east.
// Output: assets/generated/world/dao-bi-an/{regions/, horizon.bin, entities.json}
import { loadBlocks, PACK, runIfMain } from './map-kit';
import { buildCave, buildGreatFalls, buildJungle, buildMesa, buildNightForest, buildTemple, paveRuins, STREAKS_HEIGHT } from './structures/dao-bi-an-inland';
import { buildCove, buildFishingVillage, buildHarbour, buildIslets, buildVolcano, dressCauseways, paintLand, palmShores } from './structures/dao-bi-an-coast';
import { islandKit, M } from './structures/dao-bi-an-kit';
import { inWater, isLand, LEVEL, NIGHT_POOL, PIER, shapeIsland, SPAWN, WATER, ZONES } from './structures/dao-bi-an-land';
import { placeSeaLife } from './structures/dao-bi-an-life';
import type { Point } from './structures/path';
import { animal, crowd, person, type Resident } from './village-life';
import { generateZoneMap } from './zone-map';

export const MAP_ID = 'dao-bi-an';

/** What the people hold. */
const HELD = {
  book: `${PACK.props}/open-book.glb`,
  basket: `${PACK.props}/basket.glb`,
  balloon: `${PACK.props}/balloon.glb`,
  kite: `${PACK.props}/kite.glb`,
  flute: `${PACK.props}/flute.glb`,
  shell: `${PACK.props}/spiral-shell.glb`,
  crate: `${PACK.survival}/box.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  pickaxe: `${PACK.survival}/tool-pickaxe.glb`,
  shovel: `${PACK.survival}/tool-shovel.glb`,
  paddle: `${PACK.nature}/canoe_paddle.glb`,
  spoon: `${PACK.food}/cooking-spoon.glb`,
  coconut: `${PACK.food}/coconut.glb`,
};

/** The landings the boats run between: where their stops wait on the sand, and where a boat puts one ashore. */
const LANDINGS = {
  harbour: { name: 'Bến tàu', stops: [[352, 631], [358, 631], [364, 631], [370, 631], [376, 631], [382, 631]], arrive: [384, 624] },
  jungle: { name: 'Rừng nhiệt đới', stops: [[176, 459], [182, 459], [188, 459]], arrive: [190, 450] },
  ruins: { name: 'Khu di tích cổ', stops: [[651, 426], [651, 432], [651, 438]], arrive: [642, 430] },
  cave: { name: 'Hang động', stops: [[420, 152], [426, 152], [432, 152]], arrive: [424, 160] },
  cove: { name: 'Bờ đá hải tặc', stops: [[618, 708], [624, 708], [630, 708]], arrive: [626, 698] },
  volcano: { name: 'Núi lửa', stops: [[636, 210], [642, 210], [648, 210]], arrive: [640, 214] },
  night: { name: 'Rừng đêm', stops: [[262, 226], [268, 226], [274, 226]], arrive: [262, 232] },
} as const satisfies Record<string, { name: string; stops: ReadonlyArray<readonly [number, number]>; arrive: readonly [number, number] }>;
type Landing = keyof typeof LANDINGS;

/** Every boat: from the harbour to each landing and back, and round the island from landing to landing. */
function rideStops(): Array<{ name: string; at: readonly [number, number]; to: readonly [number, number] }> {
  const taken = new Map<Landing, number>();
  const stopAt = (from: Landing): readonly [number, number] => {
    const i = taken.get(from) ?? 0;
    taken.set(from, i + 1);
    const at = LANDINGS[from].stops[i];
    if (!at) throw new Error(`${MAP_ID}: the ${from} landing has no room for another boat`);
    return at;
  };
  // A boat puts one ashore two blocks short of the landing (zone-map.ts walks to open ground past it).
  const ride = (from: Landing, to: Landing) => ({ name: `Thuyền tới ${LANDINGS[to].name}`, at: stopAt(from), to: [LANDINGS[to].arrive[0] - 2, LANDINGS[to].arrive[1] - 2] as const });
  const away: Landing[] = ['jungle', 'night', 'cave', 'volcano', 'ruins', 'cove'];
  const round: Array<[Landing, Landing]> = [['jungle', 'night'], ['night', 'cave'], ['cave', 'volcano'], ['volcano', 'ruins'], ['ruins', 'cove']];
  return [
    ...away.map((to) => ride('harbour', to)),
    ...away.map((from) => ({ ...ride(from, 'harbour'), name: 'Thuyền về Bến tàu' })),
    ...round.flatMap(([a, b]) => [ride(a, b), ride(b, a)]),
  ];
}

/** The ways: round the mesa from district to district, spurs to the places, causeways over the sea. */
const ROUTES: Point[][] = [
  [[SPAWN.x, SPAWN.z], [400, 600], [400, 556], [400, 446]],
  [[330, 572], [300, 524], [244, 470], [222, 449]],
  [[262, 361], [296, 332], [296, 262], [300, 212], [344, 198]],
  [[296, 252], [NIGHT_POOL.x + 6, NIGHT_POOL.z - 21]],
  [[400, 222], [400, 256]],
  [[456, 200], [520, 244], [550, 300], [552, 366]],
  [[592, 454], [540, 510], [444, 574]],
  [[235, 361], [235, 352]],
  [[310, 500], [306, 486]],
  [[444, 604], [548, 614], [606, 662]],
  [[456, 210], [560, 214], [628, 206]],
];

/** The island's people: sailors and fishers, explorers, the pirates of the cove, children everywhere. */
function islandCast(landmark: (id: string) => readonly [number, number]): Resident[] {
  /** A landmark of the map or a zone's middle, moved by (dx, dz). */
  const at = (id: string, dx = 0, dz = 0): readonly [number, number] => {
    const zn = ZONES.find((z) => z.id === id);
    const [x, z] = zn ? [zn.x, zn.z] : landmark(id);
    return [x + dx, z + dz];
  };
  return [
    // The harbour and the beach.
    { routine: 'sentry', name: 'Bác thuyền trưởng Hải', model: person('d'), held: [HELD.book], at: at('leu-thuyen-truong', -2, 4) },
    ...crowd('porter', ['Chú thủy thủ khuân hàng', 'Anh thủy thủ trẻ', 'Cô thủy thủ Mai', 'Chú thủy thủ Tùng'], [person('b'), person('k'), person('g'), person('j')], at('ben-tau', 0, -6), 9, 4, [HELD.crate]),
    ...crowd('ferryman', ['Bác lái thuyền Sáu', 'Chú chèo thuyền Bảy'], [person('m'), person('c')], at('ben-tau', -30, 2), 6, 2, [HELD.paddle]),
    ...crowd('sweeper', ['Chú lau sàn bến'], [person('l')], at('ben-tau', 6, -4), 3, 1),
    ...crowd('shopper', ['Khách ngắm biển', 'Bà đi dạo bãi cát', 'Cô du khách đội nón'], [person('i'), person('h'), person('e')], at('bai-bien'), 10, 3, [HELD.basket]),
    ...crowd('pupil', ['Bạn nhỏ nhặt vỏ ốc', 'Bạn nhỏ xây lâu đài cát', 'Bạn nhỏ đuổi sóng', 'Bạn nhỏ tìm kho báu'], [person('n'), person('o'), person('p'), person('q')], at('bai-bien', 10, -6), 14, 4, [HELD.shell]),
    ...crowd('kite-flyer', ['Bạn thả diều trên cát', 'Em bé thả diều'], [person('f'), person('r')], at('ben-tau-bai-bien', -30, -10), 10, 2, [HELD.kite]),
    ...crowd('pupil', ['Bạn nhỏ cầm bóng bay'], [person('n')], at('cay-dua-nghieng', 4, -8), 6, 1, [HELD.balloon]),
    { routine: 'vendor', name: 'Cô bán dừa', model: person('e'), held: [HELD.coconut], at: [452, 597] },
    ...crowd('home-cook', ['Cô nướng cá', 'Bà nấu canh chua'], [person('i'), person('l')], at('lang-chai', -4, 2), 6, 2, [HELD.spoon]),
    ...crowd('laundry', ['Cô vá lưới'], [person('h')], at('lang-chai', -16, -14), 4, 1, [HELD.basket]),
    ...crowd('porter', ['Chú phơi cá'], [person('m')], at('lang-chai', 10, -8), 5, 1, [HELD.bucket]),
    ...crowd('cat', ['Mèo làng chài'], [animal('cat')], at('lang-chai'), 8, 3),
    ...crowd('dog', ['Cún bãi biển'], [animal('dog')], at('bai-bien', -8, -6), 10, 2),
    ...crowd('chick', ['Gà làng chài'], [animal('chick')], at('lang-chai', 6, 4), 6, 4),
    // The great fall.
    ...crowd('reader', ['Nhà thám hiểm Minh', 'Cô thám hiểm Lan'], [person('a'), person('e')], at('thac-nuoc', 0, 4), 6, 2, [HELD.book]),
    ...crowd('pupil', ['Bạn nhỏ ngắm thác', 'Bạn nhỏ đếm cầu vồng'], [person('o'), person('r')], at('thac-nuoc', 0, 8), 8, 2),
    // The explorers' camp and the jungle.
    ...crowd('cook', ['Cô đầu bếp trại'], [person('l')], at('trai-tham-hiem'), 4, 1, [HELD.spoon]),
    ...crowd('reader', ['Nhà thực vật học Thảo', 'Anh vẽ bản đồ rừng'], [person('i'), person('k')], at('trai-tham-hiem', 4, 6), 7, 2, [HELD.book]),
    ...crowd('porter', ['Chú dẫn đường rừng', 'Anh khuân đồ thám hiểm'], [person('j'), person('b')], at('rung-nhiet-doi'), 16, 2, [HELD.crate]),
    ...crowd('gardener', ['Bác hái trái rừng'], [person('a')], at('rung-nhiet-doi', -20, 10), 6, 1, [HELD.basket]),
    ...crowd('pupil', ['Bạn nhỏ tìm dấu chân', 'Bạn nhỏ nghe chim hót', 'Bạn nhỏ hái hoa rừng'], [person('f'), person('p'), person('q')], at('rung-nhiet-doi', 10, 10), 18, 3),
    ...crowd('reader', ['Cô nghiên cứu thác nước'], [person('g')], at('thac-rung', 6, 4), 4, 1, [HELD.book]),
    // The ruins and the temple.
    ...crowd('reader', ['Nhà khảo cổ Quang', 'Cô đọc ký hiệu cổ', 'Anh chép chữ trên đá'], [person('c'), person('h'), person('k')], at('cong-di-tich'), 10, 3, [HELD.book]),
    ...crowd('sweeper', ['Chú phủi bụi tượng đá'], [person('m')], at('di-tich-den-tho', 30, 20), 6, 1),
    ...crowd('teacher', ['Cô hướng dẫn viên di tích'], [person('e')], at('cong-di-tich', 0, 12), 6, 1, [HELD.book]),
    ...crowd('pupil', ['Bạn nhỏ giải câu đố đá', 'Bạn nhỏ sờ cột cổ', 'Bạn nhỏ chơi trốn tìm'], [person('n'), person('o'), person('r')], at('di-tich-den-tho', -10, 10), 20, 3),
    // Before the cave.
    ...crowd('sentry', ['Chú gác cửa hang'], [person('d')], at('loi-vao-hang', 6, 0), 3, 1, [HELD.pickaxe]),
    ...crowd('porter', ['Anh thợ mỏ vui tính', 'Chú khuân đèn'], [person('j'), person('b')], at('hang-dong-kho-bau', 0, 10), 12, 2, [HELD.pickaxe]),
    ...crowd('reader', ['Nhà thám hiểm Dũng'], [person('a')], at('hang-dong-kho-bau', 20, 0), 6, 1, [HELD.book]),
    ...crowd('pupil', ['Bạn nhỏ soi đèn pin', 'Bạn nhỏ đào cát tìm đá'], [person('p'), person('q')], at('hang-dong-kho-bau', -20, 0), 10, 2, [HELD.shovel]),
    // The pirates' cove: friendly pirates who share their stories.
    ...crowd('sentry', ['Chú hải tặc vui tính', 'Cô hải tặc canh tàu'], [person('c'), person('g')], at('hang-hai-tac', -4, 0), 6, 2),
    ...crowd('porter', ['Hải tặc khuân rương', 'Anh hải tặc lăn thùng'], [person('k'), person('b')], at('bo-da-hai-tac', 10, 6), 10, 2, [HELD.crate]),
    ...crowd('cook', ['Bác đầu bếp tàu'], [person('m')], at('bo-da-hai-tac', 10, 14), 4, 1, [HELD.spoon]),
    ...crowd('trumpeter', ['Chú thổi tù và'], [person('d')], at('tau-hai-tac', -4, -4), 4, 1, [HELD.flute]),
    ...crowd('pupil', ['Bạn nhỏ đóng vai hải tặc', 'Bạn nhỏ ngắm tàu buồm'], [person('f'), person('n')], at('bo-da-hai-tac', -10, 0), 12, 2, [HELD.balloon]),
    ...crowd('dog', ['Cún của thuyền trưởng'], [animal('dog')], at('bo-da-hai-tac', 0, 10), 8, 1),
    ...crowd('cat', ['Mèo trên tàu'], [animal('cat')], at('bo-da-hai-tac', -14, 12), 6, 2),
    // The volcano and the night forest.
    ...crowd('reader', ['Nhà địa chất Hùng', 'Cô đo nhiệt núi lửa'], [person('a'), person('i')], at('mom-nui-lua', -4, 10), 5, 2, [HELD.book]),
    ...crowd('sentry', ['Chú canh khu thử thách'], [person('j')], at('khu-thu-thach', -4, 4), 4, 1),
    ...crowd('reader', ['Bác kể chuyện đêm'], [person('m')], at('rung-dem', 8, -2), 4, 1, [HELD.book]),
    ...crowd('pupil', ['Bạn nhỏ bắt đom đóm', 'Bạn nhỏ ngắm trăng'], [person('o'), person('q')], at('rung-dem', -6, -4), 6, 2),
  ];
}

export async function generateDaoBiAn() {
  let palms: Array<{ x: number; z: number; height: number }> = [];
  const map = await generateZoneMap({
    mapId: MAP_ID,
    region: 'dao-bi-an',
    seedText: 'miu-dao-bi-an',
    // The land round the island is the river country's (packages/voxel outland.ts): the most water of any
    // theme, fishing villages and ferries; the sea at the map's edge carries on into its lakes and rivers.
    outland: 'river',
    soil: { grass: 'grass-island', path: 'trail' },
    ground: { ground: LEVEL, roll: 3 },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 180 },
    shape: shapeIsland,
    water: { level: WATER, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    rides: { vehicle: { name: 'Thuyền', label: 'Lên thuyền', model: M.rowboat }, stops: rideStops() },
    dressing: { models: [M.flowers[0] ?? M.bush, M.flowers[1] ?? M.bush, M.bush, M.grass, M.fern, M.rockSmall], spacing: 8 },
    trees: { skip: 0.95, blocks: (r, block) => ({ log: block('tree-log'), leaves: block(r < 0.08 ? 'leaves-pink' : 'leaves') }) },
    sizes: { [M.fallsStreaks]: STREAKS_HEIGHT, [M.smoke]: 26, [M.moon]: 20, [M.bigCrystal]: 10, [M.goldStatue]: 5.2 },
    life: ({ landmark }) => islandCast(landmark),
    build: (ctx) => {
      const k = islandKit(ctx);
      paintLand(k);
      buildHarbour(k);
      buildFishingVillage(k);
      buildMesa(k);
      buildGreatFalls(k);
      buildCave(k);
      buildTemple(k);
      paveRuins(k, 3);
      buildJungle(k);
      buildNightForest(k);
      buildVolcano(k);
      buildCove(k);
      buildIslets(k);
      dressCauseways(k, ROUTES);
      // The explorers' camp by the road from the harbour to the jungle.
      const camp = { x: 312, z: 482 };
      for (const [dx, dz, model, yaw] of [[-4, -2, M.tent, 150], [4, -3, M.tent, 210], [0, 2, M.campfire, 0], [1, 3, M.campStand, 0], [-3, 4, M.mapTable, 20], [5, 3, M.crate, 0], [6, 2, M.barrel, 0], [-6, 1, M.logStack, 90]] as const) {
        ctx.prop(model, camp.x + dx, camp.z + dz, yaw);
      }
      ctx.keepOut(camp.x - 7, camp.z - 5, camp.x + 7, camp.z + 5);
      ctx.landmark('trai-tham-hiem', 'Trại thám hiểm', camp.x, camp.z + 8);
      // The moon over the night forest, high in the southern sky (d-13).
      ctx.propAt(M.moon, [NIGHT_POOL.x + 0.5, 116, 600.5], 0);
      palms = palmShores(k);
    },
  });

  // The sea life, on the finished map, clear of every quest target and stop.
  const block = await loadBlocks();
  const ambients = await placeSeaLife({
    world: map.world,
    blocks: { sand: block('sand'), water: block('water') },
    passable: new Set(['water', 'leaves', 'leaves-autumn', 'leaves-pink', 'tree-log', 'tree-birch-log', 'wheat'].map(block)),
    waterLevel: WATER,
    isSea: (x, z) => !isLand(x, z),
    questSpots: map.entities.interactables.map((t) => [Math.floor(t.position[0] ?? 0), Math.floor(t.position[2] ?? 0)] as const),
    palms,
    crabs: [[340, 630], [360, 628], [448, 628], [502, 610], [110, 560], [255, 702], [505, 712], [770, 404], [620, 714], [652, 716], [150, 420], [380, 150], [656, 470], [470, 690], [190, 642], [86, 255]],
    fish: [[410, 662], [385, 692], [330, 672], [520, 640], [600, 742], [700, 742], [140, 505], [118, 300], [300, 150], [480, 120], [600, 232], [760, 520], [566, 570], [250, 645], [40, 600], [780, 250]],
    parrots: [[360, 600], [440, 590], [200, 470], [560, 470], [420, 150], [660, 700], [110, 575], [770, 420], [300, 640], [255, 715], [620, 300], [520, 160]],
    anglers: [
      { name: 'Bác câu cá trên bến', letter: 'm', bank: [PIER.x - PIER.half, PIER.z0 + 20], water: [PIER.x - PIER.half - 4, PIER.z0 + 20] },
      { name: 'Chú câu cá đầu cầu tàu', letter: 'b', bank: [PIER.x + PIER.half, PIER.z0 + 34], water: [PIER.x + PIER.half + 4, PIER.z0 + 34] },
      { name: 'Ông ngư dân già', letter: 'a', bank: [671, 724], water: [667, 724] },
      { name: 'Cô ngư dân trẻ', letter: 'e', bank: [PIER.x - 6, PIER.z1 - 1], water: [PIER.x - 6, PIER.z1 + 4] },
    ],
  });
  map.entities.ambients = [...(map.entities.ambients ?? []), ...ambients];
  return map;
}

runIfMain(import.meta.url, generateDaoBiAn);

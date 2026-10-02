// Generates "Lâu đài" (Toán topics 5 and 7, the end-of-term review) from a fixed seed, 800 x 800 blocks after
// the owner's detail mock of the castle (designs/lau-dai/d-01 … d-13, 02/10/2026): a great stone castle on the
// high ground of a valley, rocky mountains behind it whose falls pour into its moat. Curtain walls with
// battlements, red banners and lamps, round towers under pointed red roofs with flags, the gatehouse with its
// guards and lanterns, a stone arch bridge over the moat whose last span at the gate is the drawbridge. Inside:
// the courtyard with the white cat on its fountain among flower hedges, the palace (the great hall with its
// red carpet up to the throne, the library, the dining hall), the bedchamber, the watchtower room with its
// map table and telescope, the dungeon of barred cells, the training ground with its targets and wooden
// lookout, the royal garden with rose arches behind. Three districts, one per chapter:
// - west, on the high ground (chapter 1, "Sân hình khối"): the painters' court of giant coloured shapes, the
//   drawing room with its stained glass, the rose window, the stone veranda over the lawn, the picture
//   gallery; the artists' streets round it, a pine wood and a waterfall pond behind.
// - inside the walls (chapter 2, "Đại sảnh ôn tập"): the courtyard before the great hall, the review stalls,
//   the badge podium and the pin board round the fountain; the great hall itself up the walk.
// - before the gate (chapter 3, "Cầu treo trước cổng thành"): the bridgehead square, the meadow, willows on the
//   moat bank, and below the slope the terraced rice paddies; then the town at the foot of the hill (streets of
//   coloured roofs, the little market with its fountain, fields, a windmill).
// Output: assets/generated/world/lau-dai/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain, smoothstep } from './map-kit';
import { fbm, hashSeed } from './noise';
import { cottageRow, fieldPlot, flowerBed, hamlet, laneVerge, STREET_LANTERN, streetHouses } from './scenery';
import { placeCatStatue, placeFountain, placeStall, placeWell, placeWindmill } from './structures/countryside';
import { archWindow, archway, battlements, castleRoom, fillBox, fillTowerShaft, gableRoofAlongZ, ironBars, type Rect, reviewBooth, roundRoom, widenRoundDoor } from './structures/lau-dai-castle';
import { placeArchBridge, placeBanner, placePlaza, placeTower, type TowerBlocks } from './structures/landmarks';
import { distanceToPath, pathColumns, type Point } from './structures/path';
import { placeTree } from './structures/tree';
import { facingWriter, FRAME, put } from './structures/world-writer';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'lau-dai';
const SIZE = 800;
/** The high ground the castle and the painters' court stand on; the town and the paddies lie lower. */
const LEVEL = 16;
const LOW = 12;
/** The moat lies five blocks under the high ground, its banks faced with stone. */
const WATER_LEVEL = 11;
const SEED = hashSeed('miu-lau-dai-land');

/** Castle walls (outer faces, inclusive, two blocks thick), the south gate and the west postern. */
const WALLS = { x0: 300, x1: 580, z0: 100, z1: 330 };
const GATE_X = 440;
const POSTERN_Z = 290;
const WALL_TOP = LEVEL + 11;
/** The south moat (rows of water) between the gate's landing and the meadow, and the bridge over it. */
const MOAT_S = { z0: 336, z1: 354 };
const BRIDGE = { z0: 333, z1: 357, width: 7, rise: 3 };
/** The bridge's middle pier, and the top of its deck along it. */
const PIER_Z = Math.round((MOAT_S.z0 + MOAT_S.z1) / 2);
const deckAt = (z: number): number => LEVEL + Math.round(BRIDGE.rise * Math.sin((Math.PI * (z - BRIDGE.z0)) / (BRIDGE.z1 - BRIDGE.z0)));
/** The pond the western fall pours into, and the falls themselves (x of each, and the first water row south). */
const POND = { x: 130, z: 98, r: 10 };
/** A pond in a clearing of the pine forest, the woodcutters' camp beside it. */
const FOREST_POND = { x: 660, z: 330, r: 8 };
const CAMP = { x0: 626, z0: 228, x1: 684, z1: 272 };
const FALLS: ReadonlyArray<readonly [number, number]> = [[130, POND.z - POND.r + 1], [380, WALLS.z0 - 10], [500, WALLS.z0 - 10]];

/** The palace across the courtyard: the great hall round the middle of chapter 2's zone, its two wings beside it. */
const HALL: Rect = { x0: 406, z0: 196, x1: 474, z1: 266 };
const HALL_HEIGHT = 13;
const LIBRARY: Rect = { x0: 372, z0: 206, x1: 402, z1: 266 };
const DINING: Rect = { x0: 478, z0: 206, x1: 508, z1: 266 };
const WING_HEIGHT = 11;
const KEEP: Rect = { x0: 432, z0: 178, x1: 448, z1: 195 };
/** The bedchamber, the watchtower room, the training ground, the dungeon and the royal garden. */
const BEDROOM: Rect = { x0: 500, z0: 110, x1: 524, z1: 134 };
/** The watchtower stands on the pine hill east of the castle, looking back over it to the mountains. */
const WATCH = { x: 640, z: 150, r: 8 };
const TRAINING: Rect = { x0: 516, z0: 186, x1: 576, z1: 250 };
const DUNGEON: Rect = { x0: 306, z0: 252, x1: 364, z1: 274 };
const GARDEN: Rect = { x0: 306, z0: 106, x1: 426, z1: 176 };
/** The courtyard's round square with the fountain, and the square inside the gate. */
const PLAZA = { x: 440, z: 279, r: 9 };
const GATE_SQUARE: Rect = { x0: 424, z0: 294, x1: 456, z1: 326 };

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
  spoon: `${PACK.food}/cooking-spoon.glb`,
  flower: `${PACK.nature}/flower_redA.glb`,
  kite: `${PACK.props}/kite.glb`,
  paddle: `${PACK.nature}/canoe_paddle.glb`,
  shirt: `${PACK.props}/t-shirt.glb`,
  balloon: `${PACK.props}/balloon.glb`,
};

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'san-hinh-khoi', name: 'Sân hình khối', x: 160, z: 260, hx: 64, hz: 52 },
  { chapter: 2, id: 'dai-sanh-on-tap', name: 'Đại sảnh ôn tập', x: 440, z: 225, hx: 70, hz: 48, floor: 'path' },
  { chapter: 3, id: 'cau-treo-cong-thanh', name: 'Cầu treo trước cổng thành', x: 440, z: 396, hx: 72, hz: 40 },
];

const SPAWN = { x: 60, z: 345 };
/** The road up to the castle: from the town's south edge through the paddies, over the bridge, to the courtyard's square. */
const AVENUE: Point[] = [[440, 776], [440, PLAZA.z + PLAZA.r + 1]];
/** From the square up to the great hall's door. */
const HALL_WALK: Point[] = [[440, PLAZA.z - PLAZA.r - 1], [440, HALL.z1]];
/** From the spawn to the painters' court, on past it over the west moat into the castle by the postern. */
const COURT_ROAD: Point[] = [[SPAWN.x, SPAWN.z], [160, 345], [160, 260]];
const POSTERN_LANE: Point[] = [[160, 260], [250, 260], [250, POSTERN_Z], [546, POSTERN_Z], [546, 252]];
/** Up the pine hill from the forest road to the watchtower's door. */
const TOWER_LANE: Point[] = [[700, 150], [WATCH.x + WATCH.r + 2, 150]];
/** Down the slope from the court to the town's main street, along it and north up the forest road. */
const LOWLAND_ROAD: Point[] = [[160, 345], [160, 480], [240, 560], [700, 560], [700, 140]];
const FOREST_ROAD: Point[] = [[440, 400], [700, 400]];
/** The farm lane west of the gate meadow, on past the gatekeeper's lodge to the avenue. */
const MEADOW_LANE: Point[] = [[160, 414], [378, 414], [378, 404], [436, 404]];
/** Along the moat's south bank under the willows, crossing the bridgehead square. */
const BANK_WALK: Point[] = [[372, 371], [508, 371]];
/** North from the court to the pond under the western fall. */
const NORTH_LANE: Point[] = [[160, 260], [160, 114], [134, 114]];
const WEST_LANE: Point[] = [[60, 345], [60, 190], [150, 190]];
/**
 * Earth tracks to the places off the roads: across the paddies and the wheat (with a spur to the windmill's
 * door), to the forest pond, the forest lookout and the woodcutters' camp, through the eastern orchards, and
 * to the town windmill's door.
 */
const FIELD_TRACK: Point[] = [[160, 470], [700, 470]];
const WHEAT_MILL_SPUR: Point[] = [[600, 470], [600, 484]];
const POND_TRAIL: Point[] = [[660, 400], [660, 344]];
const LOOKOUT_TRAIL: Point[] = [[700, 197], [749, 197]];
const CAMP_TRAIL: Point[] = [[700, 244], [632, 244]];
const ORCHARD_TRACK: Point[] = [[700, 520], [780, 520]];
const MILL_TRACK: Point[] = [[700, 660], [730, 660], [730, 632], [745, 632], [745, 635]];
const TRACKS: Point[][] = [FIELD_TRACK, WHEAT_MILL_SPUR, POND_TRAIL, LOOKOUT_TRAIL, CAMP_TRAIL, ORCHARD_TRACK, MILL_TRACK];
const TOWN_STREETS: Point[][] = [
  [[240, 660], [700, 660]],
  [[240, 750], [700, 750]],
  [[240, 560], [240, 750]],
  [[320, 560], [320, 750]],
  [[560, 560], [560, 750]],
  [[160, 480], [60, 480], [60, 776]],
];
const ROUTES: Point[][] = [AVENUE, HALL_WALK, COURT_ROAD, POSTERN_LANE, LOWLAND_ROAD, FOREST_ROAD, TOWER_LANE, MEADOW_LANE, BANK_WALK, NORTH_LANE, WEST_LANE, ...TOWN_STREETS, ...TRACKS];

/** Terraced rice paddies (inclusive) on the slope below the castle, and the golden wheat field beside them. */
const PADDY = { x0: 250, z0: 446, x1: 428, z1: 540 };
const WHEAT = { x0: 452, z0: 446, x1: 650, z1: 540 };

const N = PACK.nature;
const P = PACK.props;
const BX = PACK.box;
const M = {
  flag: `${PACK.castle}/flag-banner-long.glb`,
  flagWide: `${PACK.castle}/flag-wide.glb`,
  pine: `${N}/tree_pineTallA.glb`,
  pineRound: `${N}/tree_pineRoundC.glb`,
  rice: `${N}/crops_wheatStageB.glb`,
  corn: `${N}/crops_cornStageB.glb`,
  pumpkin: `${N}/crop_pumpkin.glb`,
  picture: `${P}/framed-picture.glb`,
  pictureYellow: `${P}/framed-picture-yellow.glb`,
  palette: `${P}/artist-palette.glb`,
  star: `${P}/glowing-star.glb`,
  ruler: `${P}/ruler.glb`,
  triangle: `${P}/triangle-ruler.glb`,
  scissors: `${P}/scissors.glb`,
  puzzle: `${P}/puzzle-red.glb`,
  medal: `${P}/medal-gold.glb`,
  teddy: `${P}/teddy-bear.glb`,
  cake: `${P}/birthday-cake.glb`,
  dolls: `${P}/nesting-dolls.glb`,
  scale: `${P}/balance-scale.glb`,
  clock: `${P}/clock-face.glb`,
  abacus: `${P}/abacus.glb`,
  books: `${P}/books.glb`,
  openBook: `${P}/open-book.glb`,
  globe: `${P}/globe.glb`,
  table: `${PACK.furniture}/table.glb`,
  chair: `${BX}/ld-chair.glb`,
  rug: `${PACK.furniture}/rugRectangle.glb`,
  plant: `${PACK.furniture}/pottedPlant.glb`,
  bench: `${BX}/park-bench.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  chest: `${PACK.survival}/chest.glb`,
  crate: `${PACK.survival}/box-large.glb`,
  bedroll: `${PACK.survival}/bedroll.glb`,
  anvil: `${PACK.survival}/workbench-anvil.glb`,
  logs: `${N}/log_stack.glb`,
  canoe: `${N}/canoe.glb`,
  fence: `${N}/fence_simple.glb`,
  flowers: [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`],
  food: [`${PACK.food}/cake.glb`, `${PACK.food}/apple.glb`, `${PACK.food}/pot-stew.glb`, `${PACK.food}/pear.glb`, `${PACK.food}/bowl-soup.glb`, `${PACK.food}/banana.glb`],
  // The castle's own props of boxes (content/world/box-props/lau-dai.json).
  throne: `${BX}/ld-throne.glb`,
  chandelier: `${BX}/ld-chandelier.glb`,
  candleStand: `${BX}/ld-candle-stand.glb`,
  torch: `${BX}/ld-wall-torch.glb`,
  longTable: `${BX}/ld-long-table.glb`,
  studyTable: `${BX}/ld-study-table.glb`,
  longBench: `${BX}/ld-bench-long.glb`,
  candles: `${BX}/ld-table-candles.glb`,
  plate: `${BX}/ld-plate.glb`,
  bookshelf: `${BX}/ld-bookshelf.glb`,
  bed: `${BX}/ld-bed.glb`,
  mapTable: `${BX}/ld-map-table.glb`,
  telescope: `${BX}/ld-telescope.glb`,
  target: `${BX}/ld-archery-target.glb`,
  dummy: `${BX}/ld-training-dummy.glb`,
  rack: `${BX}/ld-weapon-rack.glb`,
  roseArch: `${BX}/ld-rose-arch.glb`,
  bannerPole: `${BX}/ld-banner-pole.glb`,
};
const TABLE_TOP = 0.8;
const CHANDELIER_DROP = 3.2;

const inRect = (x: number, z: number, r: Rect, pad = 0): boolean => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;

const inMoat = (x: number, z: number): boolean => {
  if (x < WALLS.x0 - 10 || x > WALLS.x1 + 10 || z < WALLS.z0 - 10 || z > MOAT_S.z1) return false;
  return x <= WALLS.x0 - 3 || x >= WALLS.x1 + 3 || z <= WALLS.z0 - 3 || z >= MOAT_S.z0;
};
const inWater = (x: number, z: number): boolean => inMoat(x, z) || Math.hypot(x - POND.x, z - POND.z) < POND.r || Math.hypot(x - FOREST_POND.x, z - FOREST_POND.z) < FOREST_POND.r;

/**
 * Paves the grass left between a lane and the garden walks off it (a street's houses stand back from the
 * lane, so a walk can stop a block or two short of the way), so every door's walk joins its lane.
 */
function joinWalks(ctx: ZoneMapContext, lanes: readonly Point[][]): void {
  for (const lane of lanes) {
    for (let i = 1; i < lane.length; i++) {
      const [ax = 0, az = 0] = lane[i - 1] ?? [];
      const [bx = 0, bz = 0] = lane[i] ?? [];
      const len = Math.hypot(bx - ax, bz - az);
      if (len === 0) continue;
      const [ux, uz] = [(bx - ax) / len, (bz - az) / len];
      for (let t = 0; t <= len; t += 0.5) {
        for (const side of [-1, 1]) {
          let gap: Array<[number, number]> = [];
          for (let d = 1; d <= 6; d++) {
            const x = Math.round(ax + ux * t - uz * side * d);
            const z = Math.round(az + uz * t + ux * side * d);
            if (ctx.onPath(x, z)) {
              gap = [];
              continue;
            }
            const y = ctx.surface(x, z);
            if (ctx.world.get(x, y, z) === ctx.soil.path) {
              for (const [gx, gz] of gap) {
                ctx.world.set(gx, ctx.surface(gx, gz), gz, ctx.soil.path);
                ctx.keepOut(gx, gz, gx, gz);
              }
              break;
            }
            if (ctx.world.get(x, y + 1, z) !== 0 || ctx.inWater(x, z)) break;
            gap.push([x, z]);
          }
        }
      }
    }
  }
}

/**
 * A route cut into the stretches between its junctions, each ending `clear` blocks short of every other way:
 * the verges' lamps, bushes and fence lengths stand along a lane, never across the mouth of a side street.
 */
function vergeStretches(route: readonly Point[], others: readonly (readonly Point[])[], clear = 6): Point[][] {
  const out: Point[][] = [];
  for (let i = 0; i + 1 < route.length; i++) {
    const [ax = 0, az = 0] = route[i] ?? [];
    const [bx = 0, bz = 0] = route[i + 1] ?? [];
    const len = Math.hypot(bx - ax, bz - az);
    let start: Point | undefined;
    let last: Point | undefined;
    const close = (): void => {
      if (start && last && Math.hypot(last[0] - start[0], last[1] - start[1]) >= 4) out.push([start, last]);
      start = undefined;
      last = undefined;
    };
    for (let d = 0; d <= len; d++) {
      const p: Point = [ax + ((bx - ax) * d) / Math.max(1, len), az + ((bz - az) * d) / Math.max(1, len)];
      if (others.every((o) => distanceToPath(o, p[0], p[1]) >= clear)) {
        start ??= p;
        last = p;
      } else close();
    }
    close();
  }
  return out;
}

/** 1 inside a rectangle, fading to 0 over `fade` blocks outside it. */
const rectWeight = (x: number, z: number, x0: number, z0: number, x1: number, z1: number, fade: number): number => {
  const d = Math.hypot(Math.max(0, x0 - x, x - x1), Math.max(0, z0 - z, z - z1));
  return fade <= 0 ? (d === 0 ? 1 : 0) : 1 - smoothstep(0, fade, d);
};

/**
 * The land: level high ground under the castle and the west district (where houses stand), the rocky range
 * in terraces along the north, pine hills to the east, the low town and fields south of the slope.
 */
function shapeLand(x: number, z: number, h: number): number {
  const edge = Math.min(x, z, SIZE - 1 - x, SIZE - 1 - z);
  const rim = edge < 10 ? (10 - edge) * 1.1 : 0;
  const flat = Math.max(rectWeight(x, z, 14, 100, 292, 450, 6), rectWeight(x, z, WALLS.x0 - 2, WALLS.z0 - 2, WALLS.x1 + 2, BRIDGE.z0, 0), rectWeight(x, z, 246, 356, 596, 446, 4), rectWeight(x, z, CAMP.x0, CAMP.z0, CAMP.x1, CAMP.z1, 6));
  let out = h * (1 - flat) + (LEVEL + rim) * flat;
  if (z < 92) {
    const m = smoothstep(92, 38, z);
    const add = m * (13 + 5 * fbm(SEED, x / 37, z / 29));
    out += Math.floor(add / 3) * 3;
  }
  if (x > 596 && z < 450) {
    const hill = Math.round(4 * smoothstep(600, 700, x) * (0.6 + 0.4 * fbm(SEED + 3, x / 30, z / 30)));
    out += hill * (1 - rectWeight(x, z, CAMP.x0, CAMP.z0, CAMP.x1, CAMP.z1, 6));
  }
  const low = smoothstep(450, 500, z);
  return out * (1 - low) + (LOW + rim) * low;
}

export async function generateLauDai() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'lau-dai',
    seedText: 'miu-lau-dai',
    outland: 'castle',
    soil: { grass: 'grass-castle', path: 'cobble-grey' },
    ground: { ground: LEVEL, roll: 3 },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    shape: shapeLand,
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    // The rides stop outside the buildings: the one back from chapter 2 waits before the great hall's door.
    rides: {
      stops: [
        ...ZONES.map((zn, i) => ({ name: `Xe buýt tới ${zn.name}`, at: [SPAWN.x - 4 - i * 4, SPAWN.z - 6] as const, to: zn.chapter === 2 ? ([GATE_X, HALL.z1 - 4] as const) : ([zn.x, zn.z + zn.hz - 3] as const) })),
        ...ZONES.map((zn) => ({ name: 'Xe buýt về cổng', at: zn.chapter === 2 ? ([GATE_X + 14, HALL.z1 + 22] as const) : ([zn.x + 4, zn.z + zn.hz - 3] as const), to: [SPAWN.x + 2, SPAWN.z + 2] as const })),
      ],
    },
    routes: ROUTES,
    // Small things on the zones' open ground that suit the great hall's floor as well as the lawns.
    dressing: { models: [`${PACK.furniture}/pottedPlant.glb`, `${BX}/ld-candle-stand.glb`], spacing: 10 },
    trees: { skip: 0.8, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.1 ? 'leaves-autumn' : roll < 0.32 ? 'leaves-pink' : 'leaves') }) },
    // A wall clock, the bigger frames and star of the drawing room (content/world/models.json has the usual sizes).
    sizes: { [M.picture]: 1.2, [M.star]: 0.9, [M.clock]: 1, [M.chandelier]: 3.2, [M.globe]: 1.3, [M.throne]: 4 },
    // The castle's people: guards at the gate, in the hall and on the training ground, the servants of the
    // dining hall and the bedchamber, the librarian, the gardeners, children, craftsmen; the town below.
    life: ({ landmark }) => [
      // 0. The spawn & arrival terminal: guards, travelers, bus passengers and welcome vendor (x: ~60, z: ~345).
      { routine: 'sentry', name: 'Chú lính gác bến xe', model: person('d'), held: [LIFE_HELD.axe], at: [SPAWN.x + 4, SPAWN.z + 1] as const },
      { routine: 'vendor', name: 'Bác bán bánh trạm đón', model: person('h'), held: [LIFE_HELD.apple], at: [SPAWN.x - 2, SPAWN.z - 3] as const },
      { routine: 'shopper', name: 'Khách lữ hành tới thăm', model: person('k'), held: [LIFE_HELD.basket], at: [SPAWN.x + 2, SPAWN.z - 5] as const },
      { routine: 'pupil', name: 'Bạn nhỏ đợi xe vào thành', model: person('f'), held: [LIFE_HELD.balloon], at: [SPAWN.x - 6, SPAWN.z + 1] as const },
      { routine: 'dog', name: 'Cún trông bến đón', model: animal('dog'), at: [SPAWN.x + 6, SPAWN.z - 1] as const },

      // Way from spawn to castle (along the west-east road): villagers at everyday life.
      { routine: 'sweeper', name: 'Chú quét lối đá', model: person('l'), at: [160, 345] as const },
      { routine: 'waterer', name: 'Bác làm vườn ven đường', model: person('a'), held: [LIFE_HELD.flower], at: [220, 345] as const },
      { routine: 'shopper', name: 'Người đi dạo ngắm thành', model: person('c'), held: [LIFE_HELD.book], at: [280, 345] as const },
      { routine: 'pupil', name: 'Bạn nhỏ dạo đường làng', model: person('o'), held: [LIFE_HELD.kite], at: [200, 348] as const },

      // 1. Chapter 1: Sân hình khối & Painters' Court (x: 110-215, z: 215-300): artists, teachers, geometry students, woodworkers.
      ...crowd('teacher', ['Thầy dạy vẽ'], [person('a')], landmark('phong-ve'), 6, 1, [LIFE_HELD.palette]),
      ...crowd('teacher', ['Cô giáo hướng dẫn hình học'], [person('e')], landmark('ban-thuoc-ke'), 5, 1, [LIFE_HELD.book]),
      ...crowd('reader', ['Bạn vẽ tranh'], [person('f'), person('o'), person('p')], landmark('phong-tranh'), 8, 3, [LIFE_HELD.palette]),
      ...crowd('reader', ['Bạn ghép tranh hình học'], [person('n'), person('q')], landmark('ban-ghep-tranh'), 6, 2, [LIFE_HELD.palette]),
      ...crowd('reader', ['Bạn cắt dán giấy màu'], [person('f'), person('r')], landmark('ban-cat-dan'), 6, 2, [LIFE_HELD.palette]),
      ...crowd('pupil', ['Bạn nhỏ đo khối lập phương'], [person('n'), person('q')], landmark('khoi-lap-phuong'), 8, 2, [LIFE_HELD.book]),
      ...crowd('pupil', ['Bạn nhỏ khám phá khối hộp'], [person('o'), person('r')], landmark('khoi-hop-chu-nhat'), 8, 2, [LIFE_HELD.book]),
      ...crowd('pupil', ['Bạn nhỏ tìm hiểu khối trụ'], [person('p'), person('f')], landmark('khoi-tru'), 8, 2, [LIFE_HELD.book]),
      ...crowd('pupil', ['Bạn nhỏ ngắm khối cầu'], [person('q'), person('n')], landmark('khoi-cau'), 8, 2, [LIFE_HELD.balloon]),
      ...crowd('pupil', ['Bạn nhỏ quanh khối chóp'], [person('r'), person('o')], landmark('khoi-chop'), 8, 2, [LIFE_HELD.balloon]),
      ...crowd('pupil', ['Bạn nhỏ dạo hiên đá'], [person('f'), person('p')], landmark('hien-da'), 8, 2, [LIFE_HELD.book]),
      ...crowd('porter', ['Bác thợ mộc đẽo khối gỗ'], [person('m'), person('j')], landmark('ban-thu-cong'), 6, 2, [LIFE_HELD.axe, LIFE_HELD.crate]),
      ...crowd('shopper', ['Khách thưởng lãm tranh'], [person('l'), person('k')], landmark('gia-ve-lon'), 10, 2, [LIFE_HELD.basket]),
      ...crowd('sweeper', ['Chú quét sân hình khối'], [person('b')], landmark('khoi-hinh'), 6, 1),
      ...crowd('waterer', ['Cô tưới hoa phòng vẽ'], [person('e')], landmark('o-cua-phong-ve'), 6, 1, [LIFE_HELD.bucket]),
      ...crowd('cat', ['Mèo sưởi nắng thềm khối'], [animal('cat')], landmark('bac-thang-khoi'), 8, 2),
      ...crowd('dog', ['Cún chạy chơi trên cỏ'], [animal('dog')], landmark('bai-co'), 12, 2),

      // 2. Chapter 2: Đại sảnh ôn tập & Courtyard (x: 400-510, z: 180-300).
      // The gate's guards stand either side of the way in, on the landing before the bridge (d-02).
      ...([-1, 1] as const).map((side, i) => ({
        routine: 'sentry' as const,
        name: i === 0 ? 'Chú lính gác cổng' : 'Cô lính gác cổng',
        model: person(i === 0 ? 'd' : 'g'),
        held: [LIFE_HELD.axe],
        at: [GATE_X + side * 5, WALLS.z1 + 2] as const,
        visits: [[GATE_X + side * 4, WALLS.z1 + 3], [GATE_X + side * 5, WALLS.z1 + 2]] as const,
      })),
      // The hall's guards stand either side of the red carpet (d-06).
      ...([[-6, HALL.z0 + 18], [6, HALL.z0 + 18], [-6, HALL.z0 + 38], [6, HALL.z0 + 38]] as const).map(([dx, z], i) => ({
        routine: 'sentry' as const,
        name: i % 2 === 0 ? 'Lính cận vệ' : 'Lính đứng hầu',
        model: person(['c', 'd', 'g', 'k'][i] ?? 'c'),
        held: [LIFE_HELD.axe],
        at: [GATE_X + dx, z] as const,
        visits: [[GATE_X + dx, z + 2], [GATE_X + dx, z]] as const,
      })),
      ...crowd('trumpeter', ['Chú thổi kèn hiệu'], [person('c')], landmark('cua-dai-sanh'), 6, 1, [LIFE_HELD.flute]),
      ...crowd('librarian', ['Bác giữ sách'], [person('a')], landmark('thu-vien'), 4, 1, [LIFE_HELD.book]),
      ...crowd('reader', ['Bạn đọc sách', 'Bạn tra bản đồ'], [person('f'), person('o'), person('p')], landmark('thu-vien'), 6, 3, [LIFE_HELD.book]),
      ...crowd('cook', ['Bác đầu bếp'], [person('h')], landmark('phong-an'), 6, 1, [LIFE_HELD.spoon]),
      // The maid walks the aisle between the long tables of the dining hall (d-08).
      { routine: 'cook', name: 'Cô hầu bàn', model: person('e'), held: [LIFE_HELD.spoon], at: [493, 222] as const, visits: [[493, 230], [493, 240], [493, 250]] as const },
      ...crowd('porter', ['Thị nữ mang khay tiệc'], [person('l'), person('e')], landmark('phong-an'), 8, 2, [LIFE_HELD.basket]),
      ...crowd('sweeper', ['Chị hầu phòng'], [person('l')], landmark('phong-nghi'), 4, 1),
      ...crowd('sentry', ['Chú lính canh tháp'], [person('j')], landmark('thap-canh'), 2, 1, [LIFE_HELD.axe]),
      ...crowd('sentry', ['Chú cai ngục'], [person('b')], landmark('ham-nguc'), 6, 1),
      ...crowd('sentry', ['Lính tập bắn cung', 'Lính tập kiếm', 'Cô lính tập'], [person('d'), person('g'), person('c'), person('k'), person('j'), person('b')], landmark('khu-luyen-tap'), 14, 6, [LIFE_HELD.axe]),
      ...crowd('porter', ['Bác thợ rèn', 'Chú thợ mộc'], [person('m'), person('j')], landmark('lo-ren'), 4, 2, [LIFE_HELD.crate]),
      ...crowd('gardener', ['Bác làm vườn', 'Cô tỉa hoa hồng'], [person('a'), person('e')], landmark('vuon-hoang-gia'), 12, 2, [LIFE_HELD.flower]),
      ...crowd('waterer', ['Ông tưới hoa'], [person('m')], landmark('vom-hoa-hong'), 6, 1, [LIFE_HELD.bucket]),
      ...crowd('pupil', ['Bạn nhỏ dạo vườn'], [person('n'), person('q')], landmark('vuon-hoang-gia'), 16, 2),
      ...crowd('pupil', ['Bạn nhỏ trong sân', 'Bạn chơi quanh đài phun'], [person('f'), person('n'), person('q'), person('r')], landmark('dai-phun-nuoc'), 18, 5),
      ...crowd('pupil', ['Bạn thảo luận toán ôn tập'], [person('o'), person('p')], landmark('dai-phun-nuoc'), 14, 2, [LIFE_HELD.book]),
      ...crowd('teacher', ['Cô giáo dẫn đoàn'], [person('e')], landmark('dai-phun-nuoc'), 20, 1, [LIFE_HELD.book]),
      ...crowd('vendor', ['Bác bán bánh', 'Cô bán hoa'], [person('h'), person('e')], landmark('cho-trong-thanh'), 6, 2, [LIFE_HELD.apple]),
      ...crowd('porter', ['Chú khuân hàng'], [person('b'), person('k')], landmark('cho-trong-thanh'), 10, 2, [LIFE_HELD.crate]),
      ...crowd('milker', ['Chú giữ chuồng'], [person('j')], landmark('chuong-bo'), 4, 1, [LIFE_HELD.bucket]),
      ...crowd('laundry', ['Cô giặt áo choàng'], [person('l')], landmark('nha-nguoi-hau'), 8, 1, [LIFE_HELD.basket, LIFE_HELD.shirt]),

      // 3. Chapter 3: Cầu treo trước cổng thành & Bờ hào (x: 390-490, z: 340-420).
      ...crowd('sentry', ['Lính tuần tra trên cầu'], [person('k'), person('c')], landmark('nhip-cau-giua'), 6, 2, [LIFE_HELD.axe]),
      ...crowd('sentry', ['Lính canh đầu cầu'], [person('d')], landmark('dau-cau-treo'), 4, 1, [LIFE_HELD.axe]),
      ...crowd('shopper', ['Khách qua cầu vào thành'], [person('i'), person('g'), person('l')], landmark('cau-da'), 12, 3, [LIFE_HELD.basket]),
      ...crowd('vendor', ['Bác bán bánh mì đầu cầu'], [person('h')], landmark('dau-cau-treo'), 6, 1, [LIFE_HELD.apple]),
      ...crowd('vendor', ['Cô bán quà lưu niệm'], [person('e')], landmark('nha-gac'), 8, 1, [LIFE_HELD.crate]),
      ...crowd('kite-flyer', ['Bạn thả diều trước cổng'], [person('o'), person('r')], landmark('bai-co-truoc-cong'), 10, 2, [LIFE_HELD.kite]),
      ...crowd('pupil', ['Bạn nhỏ chơi ven hào'], [person('f'), person('q'), person('n')], landmark('bai-co-truoc-cong'), 14, 3, [LIFE_HELD.balloon]),
      ...crowd('ferryman', ['Ông câu cá hào'], [person('m')], landmark('goc-lieu'), 4, 1, [LIFE_HELD.paddle]),
      ...crowd('ferryman', ['Ngư dân câu cá bờ hào'], [person('k')], landmark('gam-cau'), 4, 1, [LIFE_HELD.paddle]),
      ...crowd('sweeper', ['Chú quét dọn cầu đá'], [person('b')], landmark('nhip-cau-dau'), 5, 1),
      ...crowd('sentry', ['Bác gác nhà cổng'], [person('a')], landmark('nha-gac'), 4, 1),

      // Town below & fields
      ...crowd('vendor', ['Bác bán rau thị trấn', 'Cô bán trái cây'], [person('b'), person('h')], landmark('cho-nho'), 10, 3, [LIFE_HELD.apple]),
      ...crowd('shopper', ['Người đi chợ', 'Bà đi chợ sớm'], [person('l'), person('k'), person('i')], landmark('cho-nho'), 16, 5, [LIFE_HELD.basket]),
      ...crowd('home-cook', ['Mẹ nấu cơm'], [person('i'), person('l')], landmark('thi-tran'), 20, 2, [LIFE_HELD.spoon]),
      ...crowd('ploughman', ['Bác nông dân'], [person('m'), person('a')], landmark('canh-dong'), 20, 4, [LIFE_HELD.hoe]),
      ...crowd('rice-planter', ['Cô cấy lúa chân đồi', 'Chị gặt lúa mì'], [person('e'), person('h')], landmark('ruong-lua'), 20, 4, [LIFE_HELD.basket]),

      // Animals
      ...crowd('cow', ['Bò kéo xe'], [animal('cow')], landmark('chuong-bo'), 6, 3),
      ...crowd('cow', ['Bò vàng'], [animal('cow')], landmark('canh-dong'), 30, 5),
      ...crowd('dog', ['Chó canh thành'], [animal('dog')], landmark('bai-co-truoc-cong'), 12, 3),
      ...crowd('dog', ['Chó gác bờ hào'], [animal('dog')], landmark('dau-cau-treo'), 8, 2),
      ...crowd('dog', ['Cún của lính'], [animal('dog')], landmark('khu-luyen-tap'), 12, 2),
      ...crowd('cat', ['Mèo trong sân'], [animal('cat')], landmark('dai-phun-nuoc'), 16, 3),
      ...crowd('cat', ['Mèo nằm vườn'], [animal('cat')], landmark('vuon-hoang-gia'), 12, 2),
      ...crowd('chick', ['Gà con'], [animal('chick')], landmark('chuong-bo'), 8, 6),
      ...crowd('chick', ['Gà mái chân đồi'], [animal('chick')], landmark('ruong-lua'), 14, 6),
      ...crowd('chick', ['Gà thị trấn'], [animal('chick')], landmark('thi-tran'), 10, 6),
      ...crowd('pig', ['Lợn nhà nông'], [animal('pig')], landmark('canh-dong'), 16, 4),
      ...crowd('cat', ['Mèo chợ thành'], [animal('cat')], landmark('cho-trong-thanh'), 10, 3),
      ...crowd('dog', ['Cún thị trấn'], [animal('dog')], landmark('thi-tran'), 16, 3),
    ],
    build: (base) => {
      const ctx: ZoneMapContext = base;
      /** The same context on the low ground (stalls and fields stand on its level). */
      const low: ZoneMapContext = { ...ctx, ground: LOW };
      const { world, block, rng } = ctx;
      const B = {
        stone: block('brick-grey'), cobble: block('stone'), grey: block('cobble-grey'), moss: block('rock-moss'), path: ctx.soil.path, grass: ctx.soil.grass,
        planks: block('planks'), log: block('log'), birch: block('birch-log'), sand: block('sand'), red: block('brick-red'), wood: block('wood-red'),
        blue: block('roof-blue'), white: block('snow'), green: block('board'), glass: block('glass'), water: block('water'), paver: block('paver'),
        leaves: block('leaves'), pink: block('leaves-pink'), autumn: block('leaves-autumn'), trunk: block('tree-log'), lantern: block('lantern'),
        iron: block('iron'), wheat: block('wheat'), wheatGold: block('sand'), tile: block('cobble'), trail: block('trail'), farmland: block('farmland'),
      };
      const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void => fillBox(world, x0, y0, z0, x1, y1, z1, id);
      const top = LEVEL + 1;
      /** The first air over a column, from the sky down (a prop on a bridge's rail, on a wall). */
      const roofOf = (x: number, z: number): number => {
        for (let y = world.size[1] - 1; y > 0; y--) if (world.get(x, y, z) !== 0) return y + 1;
        return 0;
      };
      /** Paves the walking face of a stone bridge (the top block of each column in the rectangle, where it is `from`). */
      const paveDeck = (x0: number, z0: number, x1: number, z1: number, from: number, to: number): void => {
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (world.get(x, roofOf(x, z) - 1, z) === from) put(world, x, roofOf(x, z) - 1, z, to);
      };
      /** Steps one block a step from the ground up to `floorTop` (the top block of a raised floor), out from (x, z) toward (dx, dz), `w` wide across. */
      const stepsDown = (x: number, z: number, dx: number, dz: number, floorTop: number, w: number, id: number): void => {
        for (let k = 1; k <= 6; k++) {
          const stepTop = floorTop - k;
          for (let s = -Math.floor(w / 2); s <= Math.floor(w / 2); s++) {
            const [cx, cz] = [x + dx * k + (dz !== 0 ? s : 0), z + dz * k + (dx !== 0 ? s : 0)];
            for (let y = ctx.surface(cx, cz) + 1; y <= stepTop; y++) put(world, cx, y, cz, id);
          }
        }
      };
      const onTable = (model: string, x: number, z: number, y = top, yaw = 0): void => ctx.propAt(model, [x + 0.5, y + TABLE_TOP, z + 0.5], yaw);
      const table = (x: number, z: number, items: readonly string[], yaw = 0, y = top): void => {
        ctx.centred(M.table, x, z, yaw);
        items.forEach((m, i) => onTable(m, x + (i - (items.length - 1) / 2) * 0.6, z, y, yaw));
        ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
      };
      const lamps = (cells: ReadonlyArray<readonly [number, number]>): void => {
        for (const [x, z] of cells) ctx.prop(STREET_LANTERN, x, z, 0);
      };
      const towerBlocks: TowerBlocks = { wall: B.stone, trim: B.grey, roof: B.red, glass: B.lantern, flag: B.wood, pole: B.log };
      const banner = { cloth: B.wood, emblem: B.wheat };
      const room = { wall: B.stone, plinth: B.grey, floor: B.grey, ceiling: B.planks, beam: B.log };

      // The castle's places first: the review page shows the first landmarks up close.
      ctx.landmark('cong-thanh', 'Cổng thành', GATE_X, WALLS.z1 - 1);
      ctx.landmark('cau-da', 'Cầu đá qua hào', GATE_X, PIER_Z, deckAt(PIER_Z) + 1);
      ctx.landmark('vuon-hoang-gia', 'Vườn hoàng gia', 348, 148);

      // ---------------------------------------------------------------------------------------------------
      // The rocky range along the north: stone on the steps of its terraces, moss between, and the falls.
      for (let x = 0; x < SIZE; x++) {
        for (let z = 0; z < 96; z++) {
          const y = ctx.surface(x, z);
          if (y < LEVEL + 4 || inWater(x, z)) continue;
          const steep = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => Math.abs(ctx.surface(x + dx, z + dz) - y) >= 2);
          for (let yy = y - 3; yy < y; yy++) put(world, x, yy, z, B.cobble);
          if (steep) put(world, x, y, z, B.cobble);
          else if ((x * 7 + z * 13) % 5 === 0) put(world, x, y, z, B.moss);
        }
      }
      for (const [fx, zWater] of FALLS) {
        // From the water up the slope to the crest of the range: water on every terrace and down every step.
        let crest = zWater - 1;
        for (let z = zWater - 1; z > Math.max(14, zWater - 60); z--) if (ctx.surface(fx, z) > ctx.surface(fx, crest)) crest = z;
        for (let dx = -2; dx <= 2; dx++) {
          const x = fx + dx;
          for (let z = zWater - 1; z > crest; z--) {
            const y = ctx.surface(x, z);
            put(world, x, y, z, B.water);
            for (let yy = y + 1; yy <= ctx.surface(x, z - 1); yy++) put(world, x, yy, z, B.water);
          }
          // The fall drops on down the moat's stone face into the water.
          for (let yy = WATER_LEVEL; yy <= ctx.surface(x, zWater - 1); yy++) put(world, x, yy, zWater, B.water);
        }
        ctx.keepOut(fx - 4, crest, fx + 4, zWater - 1);
      }
      // Seen from the paved north ward inside the walls, where the child can stand: the falls pour down the range
      // over the wall's battlements either side.
      ctx.landmark('thac-nuoc', 'Thác nước sau lâu đài', 440, WALLS.z0 + 5);

      // The moat's banks faced with stone up to the high ground: the castle rises from the water (d-01, d-05).
      for (let x = WALLS.x0 - 13; x <= WALLS.x1 + 13; x++) {
        for (let z = WALLS.z0 - 13; z <= MOAT_S.z1 + 3; z++) {
          if (inMoat(x, z)) continue;
          let near = false;
          for (let dx = -2; dx <= 2 && !near; dx++) for (let dz = -2; dz <= 2 && !near; dz++) near = inMoat(x + dx, z + dz);
          const y = ctx.surface(x, z);
          if (!near || y >= LEVEL) continue;
          const castleSide = inRect(x, z, { x0: WALLS.x0, z0: WALLS.z0, x1: WALLS.x1, z1: MOAT_S.z0 - 1 }, 2);
          for (let yy = y; yy < LEVEL; yy++) put(world, x, yy, z, (yy + x + z) % 7 === 0 ? B.moss : B.grey);
          put(world, x, LEVEL, z, castleSide ? B.grey : ctx.onPath(x, z) ? B.path : B.grass);
        }
      }

      // ---------------------------------------------------------------------------------------------------
      // The castle: curtain walls eleven high, a plinth course along their foot, battlements, banners and
      // lamps on their faces; round towers under pointed red roofs with flags at the corners and between.
      for (let x = WALLS.x0; x <= WALLS.x1; x++) {
        for (let z = WALLS.z0; z <= WALLS.z1; z++) {
          const ring = x <= WALLS.x0 + 1 || x >= WALLS.x1 - 1 || z <= WALLS.z0 + 1 || z >= WALLS.z1 - 1;
          if (!ring) continue;
          const outer = x === WALLS.x0 || x === WALLS.x1 || z === WALLS.z0 || z === WALLS.z1;
          for (let y = ctx.surface(x, z) + 1; y <= WALL_TOP; y++) put(world, x, y, z, outer && y <= top + 1 ? B.grey : B.stone);
          if (outer && (x + z) % 2 === 0) put(world, x, WALL_TOP + 1, z, B.stone);
          // A lamp in the wall's face every twelve blocks (they glow at dusk, d-13).
          const along = z === WALLS.z0 || z === WALLS.z1 ? x : z;
          if (outer && along % 12 === 6) put(world, x, top + 4, z, B.lantern);
        }
      }
      archway(world, 'x', WALLS.z1, GATE_X - 3, GATE_X + 3, top, 7);
      archway(world, 'x', WALLS.z1 - 1, GATE_X - 3, GATE_X + 3, top, 7);
      archway(world, 'z', WALLS.x0, POSTERN_Z - 2, POSTERN_Z + 2, top, 4);
      archway(world, 'z', WALLS.x0 + 1, POSTERN_Z - 2, POSTERN_Z + 2, top, 4);
      ctx.keepOut(WALLS.x0, WALLS.z0, WALLS.x1, WALLS.z0 + 2);
      ctx.keepOut(WALLS.x0, WALLS.z1 - 2, WALLS.x1, WALLS.z1 + 1);
      ctx.keepOut(WALLS.x0, WALLS.z0, WALLS.x0 + 2, WALLS.z1);
      ctx.keepOut(WALLS.x1 - 2, WALLS.z0, WALLS.x1, WALLS.z1);
      // Banners down the walls' outer faces, clear of the towers and the gate.
      const towerAt: Array<readonly [number, number]> = [
        [WALLS.x0, WALLS.z0], [WALLS.x1, WALLS.z0], [WALLS.x0, WALLS.z1], [WALLS.x1, WALLS.z1],
        [370, WALLS.z1], [510, WALLS.z1], [370, WALLS.z0], [510, WALLS.z0], [WALLS.x0, 215], [WALLS.x1, 215],
      ];
      const nearTower = (x: number, z: number): boolean => towerAt.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 9) || Math.abs(x - GATE_X) < 16;
      for (let x = WALLS.x0 + 12; x < WALLS.x1 - 10; x += 20) {
        if (!nearTower(x, WALLS.z1)) placeBanner(world, x, WALL_TOP - 1, WALLS.z1 + 1, 'x', banner, 5);
        if (!nearTower(x, WALLS.z0)) placeBanner(world, x, WALL_TOP - 1, WALLS.z0 - 1, 'x', banner, 5);
      }
      for (let z = WALLS.z0 + 22; z < WALLS.z1 - 10; z += 24) {
        if (!nearTower(WALLS.x0, z) && Math.abs(z - POSTERN_Z) > 8) placeBanner(world, WALLS.x0 - 1, WALL_TOP - 1, z, 'z', banner, 5);
        if (!nearTower(WALLS.x1, z)) placeBanner(world, WALLS.x1 + 1, WALL_TOP - 1, z, 'z', banner, 5);
      }
      // The towers are solid stone under their roofs: lookouts on the wall, not rooms with no way in.
      const tower = (tx: number, tz: number, baseY: number, r: number, h: number, b: TowerBlocks = towerBlocks): void => {
        placeTower(world, tx, tz, baseY, r, h, b, false);
        fillTowerShaft(world, tx, tz, baseY, r, h, b.wall);
      };
      for (const [tx, tz] of towerAt) {
        tower(tx, tz, top, 4, 14);
        ctx.keepOut(tx - 6, tz - 6, tx + 6, tz + 6);
      }
      ctx.landmark('thap-goc-thanh', 'Tháp góc thành', WALLS.x1 - 8, WALLS.z1 - 8);

      // The gatehouse (d-02): a stone block over the gate between two tall towers, the arch with its wooden
      // doors swung open and the portcullis drawn up, banners either side, lanterns on stone posts before it.
      const gate = { x0: GATE_X - 7, x1: GATE_X + 7, z0: WALLS.z1 - 4, z1: WALLS.z1 + 1 };
      box(gate.x0, top, gate.z0, gate.x1, LEVEL + 14, gate.z1, B.stone);
      battlements(world, gate, LEVEL + 15, B.stone);
      for (let z = gate.z0; z <= gate.z1; z++) archway(world, 'x', z, GATE_X - 3, GATE_X + 3, top, 7);
      for (let x = GATE_X - 2; x <= GATE_X + 2; x++) put(world, x, top + 6, gate.z1, x % 2 === 0 ? B.iron : 0);
      for (const x of [GATE_X - 3, GATE_X + 3]) box(x, top, gate.z0, x, top + 5, gate.z0 + 2, B.planks);
      for (const x of [GATE_X - 5, GATE_X + 5]) put(world, x, top + 4, gate.z1, B.lantern);
      for (let x = GATE_X - 2; x <= GATE_X + 2; x++) put(world, x, top + 9, gate.z1, B.lantern);
      placeBanner(world, GATE_X - 7, LEVEL + 13, gate.z1 + 1, 'x', banner, 6);
      placeBanner(world, GATE_X + 6, LEVEL + 13, gate.z1 + 1, 'x', banner, 6);
      for (const dx of [-11, 11]) {
        tower(GATE_X + dx, WALLS.z1 + 1, top, 4, 14);
        placeBanner(world, GATE_X + dx, LEVEL + 12, WALLS.z1 + 6, 'x', banner, 6);
      }
      ctx.keepOut(GATE_X - 16, gate.z0, GATE_X + 16, WALLS.z1 + 6);
      // The landing before the gate: stone posts with lamps, a rail along its edge over the water.
      for (const dx of [-6, 6]) {
        box(GATE_X + dx, top, BRIDGE.z0, GATE_X + dx, top + 2, BRIDGE.z0, B.grey);
        put(world, GATE_X + dx, top + 3, BRIDGE.z0, B.lantern);
      }
      for (const x of [GATE_X - 6, GATE_X - 4, GATE_X + 4, GATE_X + 6]) ctx.prop(M.fence, x, BRIDGE.z0 + 1, 0);
      ctx.landmark('ben-cong', 'Bến trước cổng thành', GATE_X, WALLS.z1 + 2);

      // The stone bridge over the south moat (d-05): two arches on a middle pier with turrets, lamps on its
      // parapets, and at the gate end the drawbridge of planks hung on iron chains.
      placeArchBridge(world, [GATE_X, BRIDGE.z0], [GATE_X, BRIDGE.z1], LEVEL, WATER_LEVEL, { stone: B.stone, rail: B.grey }, BRIDGE.width, BRIDGE.rise);
      const half = Math.floor(BRIDGE.width / 2);
      const pierZ = PIER_Z;
      for (let z = pierZ - 1; z <= pierZ + 1; z++) box(GATE_X - half, WATER_LEVEL - 2, z, GATE_X + half, deckAt(z), z, B.stone);
      for (const side of [-1, 1]) {
        const x0 = GATE_X + side * (half + 1);
        const x1 = GATE_X + side * (half + 3);
        box(x0, WATER_LEVEL - 2, pierZ - 2, x1, deckAt(pierZ) + 4, pierZ + 2, B.stone);
        battlements(world, { x0: Math.min(x0, x1), z0: pierZ - 2, x1: Math.max(x0, x1), z1: pierZ + 2 }, deckAt(pierZ) + 5, B.stone);
        put(world, x1, deckAt(pierZ) + 2, pierZ, B.lantern);
        placeBanner(world, x1 + side, deckAt(pierZ) + 3, pierZ - 1, 'z', banner, 4);
        // Turrets at the meadow end of the bridge.
        const ex0 = GATE_X + side * (half + 1);
        box(ex0, ctx.surface(ex0, BRIDGE.z1) + 1, BRIDGE.z1 - 2, GATE_X + side * (half + 2), LEVEL + 5, BRIDGE.z1, B.stone);
        put(world, GATE_X + side * (half + 1), LEVEL + 6, BRIDGE.z1, B.lantern);
        put(world, GATE_X + side * (half + 2), LEVEL + 6, BRIDGE.z1 - 2, B.stone);
      }
      for (let z = BRIDGE.z0; z <= BRIDGE.z0 + 3; z++) for (let x = GATE_X - half + 1; x <= GATE_X + half - 1; x++) put(world, x, deckAt(z), z, B.planks);
      // The deck between the parapets is paved like the avenue it carries.
      paveDeck(GATE_X - half + 1, BRIDGE.z0 + 4, GATE_X + half - 1, BRIDGE.z1, B.stone, B.path);
      for (let z = BRIDGE.z0 + 6; z < BRIDGE.z1 - 2; z += 6) {
        if (Math.abs(z - pierZ) < 3) continue;
        for (const side of [-1, 1]) ctx.propAt(STREET_LANTERN, [GATE_X + side * half + 0.5, roofOf(GATE_X + side * half, z), z + 0.5], 0);
      }
      for (const [i, x] of [GATE_X - 18, GATE_X + 14, GATE_X - 40].entries()) ctx.propAt(M.canoe, [x + 0.5, WATER_LEVEL + 0.9, MOAT_S.z0 + 4 + i * 4 + 0.5], 90 + i * 30);
      ctx.landmark('cau-treo', 'Cầu treo', GATE_X, BRIDGE.z0 + 2, deckAt(BRIDGE.z0 + 2) + 1);
      ctx.landmark('nhip-cau-dau', 'Nhịp cầu đầu', GATE_X, pierZ + 5, deckAt(pierZ + 5) + 1);
      ctx.landmark('nhip-cau-giua', 'Nhịp cầu giữa', GATE_X, pierZ, deckAt(pierZ) + 1);
      ctx.landmark('nhip-cau-cuoi', 'Nhịp cầu cuối', GATE_X, pierZ - 5, deckAt(pierZ - 5) + 1);
      ctx.landmark('gam-cau', 'Gầm cầu', GATE_X - 12, MOAT_S.z1 + 3, LEVEL + 1);

      // The postern: a little arch bridge over the west moat, two turrets and a lamp either side.
      placeArchBridge(world, [WALLS.x0 - 13, POSTERN_Z], [WALLS.x0 - 1, POSTERN_Z], LEVEL, WATER_LEVEL, { stone: B.stone, rail: B.grey }, 5, 2);
      paveDeck(WALLS.x0 - 13, POSTERN_Z - 1, WALLS.x0 - 1, POSTERN_Z + 1, B.stone, B.path);
      for (const dz of [-6, 6]) tower(WALLS.x0, POSTERN_Z + dz, top, 2, 12);
      ctx.keepOut(WALLS.x0 - 3, POSTERN_Z - 9, WALLS.x0 + 3, POSTERN_Z + 9);
      ctx.landmark('cong-tay', 'Cổng tây', WALLS.x0, POSTERN_Z);

      // ---------------------------------------------------------------------------------------------------
      // The palace across the north of the courtyard, its doors toward the gate: the great hall (chapter 2's
      // "Đại sảnh ôn tập", whose lessons stand on its floor) under a red roof between its two wings, the
      // library and the dining hall, light wells between them so every hall has tall windows; round towers
      // at its corners and the keep behind. Its stone is the warm cream of the mock (d-03, d-06).
      const warm = { wall: B.sand, plinth: B.paver, floor: B.planks, ceiling: B.planks, beam: B.log };
      castleRoom(world, LIBRARY, top, WING_HEIGHT, warm);
      castleRoom(world, DINING, top, WING_HEIGHT, warm);
      castleRoom(world, HALL, top, HALL_HEIGHT, { ...warm, floor: B.paver });
      for (const wing of [LIBRARY, DINING]) battlements(world, wing, top + WING_HEIGHT + 1, B.sand);
      const hallRoofTop = gableRoofAlongZ(world, HALL, top + HALL_HEIGHT, { roof: B.red, ridge: B.wood, gable: B.sand });
      const libX = (LIBRARY.x0 + LIBRARY.x1) >> 1;
      const dinX = (DINING.x0 + DINING.x1) >> 1;
      // Doors: the great door up from the fountain, eleven wide (the carpet and the paving either side of it run
      // in through it), each wing's own door beside it, five wide.
      archway(world, 'x', HALL.z1, GATE_X - 5, GATE_X + 5, top, 8);
      archway(world, 'x', LIBRARY.z1, libX - 2, libX + 2, top, 6);
      archway(world, 'x', DINING.z1, dinX - 2, dinX + 2, top, 6);
      // The facade: lanterns by the doors, tall windows, a rose window of coloured glass over the great door.
      for (const x of [GATE_X - 7, GATE_X + 7, libX - 4, libX + 4, dinX - 4, dinX + 4]) put(world, x, top + 3, HALL.z1 + 1, B.lantern);
      for (const x of [418, 426, 453, 461]) archWindow(world, 'x', HALL.z1, x, top + 4, 7, { glass: B.lantern, sill: B.paver });
      const rose = [B.blue, B.wood, B.sand, B.glass, B.lantern];
      for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
        const d = Math.hypot(dx, dy);
        if (d <= 3.2) put(world, GATE_X + dx, top + 11 + dy, HALL.z1, d < 1 ? B.lantern : (rose[Math.floor(d * 1.3 + (Math.atan2(dy, dx) + Math.PI) * 1.2) % rose.length] ?? B.glass));
      }
      for (const [x0, x1] of [[LIBRARY.x0, LIBRARY.x1], [DINING.x0, DINING.x1]] as const) for (const x of [x0 + 4, x1 - 5]) archWindow(world, 'x', LIBRARY.z1, x, top + 3, 6, { glass: B.lantern, sill: B.paver });
      for (const x of [GATE_X - 9, GATE_X + 8, 412, 467]) placeBanner(world, x, top + 11, HALL.z1 + 1, 'x', banner, 7);
      // Towers at the wings' corners and the hall's front corners, the keep behind with its turrets.
      for (const [tx, tz] of [[LIBRARY.x0, LIBRARY.z0], [DINING.x1, DINING.z0], [LIBRARY.x0, LIBRARY.z1], [DINING.x1, DINING.z1], [HALL.x0, HALL.z1], [HALL.x1, HALL.z1]] as const) {
        tower(tx, tz, top, 4, 14);
      }
      box(KEEP.x0, top, KEEP.z0, KEEP.x1, LEVEL + 12, KEEP.z1, B.stone);
      for (let y = top + 2; y <= LEVEL + 11; y += 4) for (let x = KEEP.x0 + 3; x < KEEP.x1; x += 4) put(world, x, y, KEEP.z0, B.lantern);
      battlements(world, KEEP, LEVEL + 13, B.stone);
      tower(GATE_X, (KEEP.z0 + KEEP.z1) >> 1, LEVEL + 13, 3, 4);
      for (const [tx, tz] of [[KEEP.x0 + 1, KEEP.z0 + 1], [KEEP.x1 - 1, KEEP.z0 + 1]] as const) tower(tx, tz, LEVEL + 13, 2, 3);
      // The palace keeps quests and trees out of its wings, its keep and its walls; the great hall's floor
      // is chapter 2's ground.
      for (const r of [LIBRARY, DINING, KEEP]) ctx.keepOut(r.x0 - 5, r.z0 - 5, r.x1 + 5, r.z1 + 1);
      ctx.keepOut(HALL.x0 - 5, HALL.z0 - 1, HALL.x0, HALL.z1 + 1);
      ctx.keepOut(HALL.x1, HALL.z0 - 1, HALL.x1 + 5, HALL.z1 + 1);
      ctx.keepOut(HALL.x0, HALL.z0 - 1, HALL.x1, HALL.z0);
      {
        // The rest of chapter 2's zone round the hall stays clear of quests: its lessons are in the hall.
        const zn = ctx.zone(2);
        ctx.keepOut(zn.x - zn.hx, zn.z - zn.hz, zn.x + zn.hx, HALL.z0 - 1);
        ctx.keepOut(zn.x - zn.hx, HALL.z1 + 1, zn.x + zn.hx, zn.z + zn.hz);
      }
      ctx.landmark('thap-chinh', 'Tháp chính', GATE_X, HALL.z1 + 3);
      ctx.landmark('lau-dai-chinh', 'Lâu đài chính', GATE_X, HALL.z1 + 2, hallRoofTop);
      /** A pair of red curtains either side of a window two wide whose first cell is `at` along a wall. */
      const curtains = (across: 'x' | 'z', fixed: number, at: number, y0: number, y1: number): void => {
        for (const s of [at - 1, at + 2]) for (let y = y0; y <= y1; y++) put(world, across === 'x' ? s : fixed, y, across === 'x' ? fixed : s, B.wood);
      };

      // The great hall (d-06): a floor of pale tiles, the red carpet edged in gold from the door straight up
      // the four steps of the dais to the red and gold throne before a red hanging with a golden crown;
      // stone pillars in two rows each side with torches, tall arched windows with red curtains and red
      // banners with golden crests between them all down both walls, candle stands, glowing chandeliers.
      for (let x = HALL.x0 + 1; x < HALL.x1; x++) for (let z = HALL.z0 + 1; z < HALL.z1; z++) put(world, x, LEVEL, z, (Math.floor(x / 2) + Math.floor(z / 2)) % 2 === 0 ? B.paver : B.tile);
      const nave = { x0: GATE_X - 3, x1: GATE_X + 3 };
      const carpet = (x: number): number => (x < nave.x0 || x > nave.x1 ? B.wheatGold : B.wood);
      for (let z = HALL.z0 + 1; z < HALL.z1; z++) for (let x = nave.x0 - 1; x <= nave.x1 + 1; x++) put(world, x, LEVEL, z, carpet(x));
      const dais = { z0: HALL.z0 + 1, z1: HALL.z0 + 10 };
      for (let step = 0; step < 4; step++) {
        const z1 = dais.z1 - step * 2;
        box(GATE_X - 12 + step, top, dais.z0, GATE_X + 12 - step, top + step, z1, B.paver);
        for (let x = nave.x0 - 1; x <= nave.x1 + 1; x++) for (let z = dais.z0; z <= z1; z++) put(world, x, top + step, z, carpet(x));
      }
      ctx.keepOut(GATE_X - 13, dais.z0, GATE_X + 13, dais.z1 + 1);
      ctx.propAt(M.throne, [GATE_X + 0.5, top + 4, dais.z0 + 1.5], 180);
      for (const dx of [-5, 5]) {
        ctx.propAt(M.candleStand, [GATE_X + dx + 0.5, top + 4, dais.z0 + 1.5], 0);
        ctx.centredAt(M.plant, [GATE_X + dx * 1.8 + 0.5, top + 3, dais.z0 + 3.5], 0);
        ctx.propAt(M.candleStand, [GATE_X + dx * 1.6 + 0.5, top, dais.z1 + 2.5], 0);
      }
      // The hanging behind the throne: red cloth with a golden crown, a canopy over it, banners either side.
      for (let x = GATE_X - 5; x <= GATE_X + 5; x++) for (let y = top + 4; y <= top + 11; y++) put(world, x, y, HALL.z0 + 1, B.wood);
      for (let x = GATE_X - 2; x <= GATE_X + 2; x++) put(world, x, top + 8, HALL.z0 + 1, B.lantern);
      for (const x of [GATE_X - 2, GATE_X, GATE_X + 2]) put(world, x, top + 9, HALL.z0 + 1, B.lantern);
      put(world, GATE_X, top + 10, HALL.z0 + 1, B.lantern);
      for (let x = GATE_X - 6; x <= GATE_X + 6; x++) for (let z = HALL.z0 + 1; z <= HALL.z0 + 3; z++) put(world, x, top + 11, z, z === HALL.z0 + 3 ? B.wheatGold : B.wood);
      for (const x of [GATE_X - 9, GATE_X + 8]) placeBanner(world, x, top + 10, HALL.z0 + 1, 'x', banner, 7);
      for (const x of [417, 424, 455, 462]) {
        archWindow(world, 'x', HALL.z0, x, top + 3, 9, { glass: B.glass, sill: B.paver });
        curtains('x', HALL.z0 + 1, x, top + 2, top + 11);
      }
      // Two rows of pillars each side, torches on them toward the carpet, candle stands down the carpet.
      for (let z = dais.z1 + 6; z < HALL.z1 - 4; z += 10) {
        for (const x of [GATE_X - 22, GATE_X - 11, GATE_X + 10, GATE_X + 21]) {
          box(x, top, z, x + 1, top + HALL_HEIGHT - 1, z + 1, B.paver);
          box(x - 1, top, z - 1, x + 2, top, z + 2, B.grey);
          ctx.keepOut(x - 1, z - 1, x + 2, z + 2);
          ctx.propAt(M.torch, [x + (x < GATE_X ? 2.1 : -0.1), top + 2.6, z + 1], 0);
          ctx.propAt(M.torch, [x + 1, top + 2.6, z + (x < GATE_X ? 2.1 : 2.1)], 0);
        }
        for (const dx of [-6, 6]) ctx.propAt(M.candleStand, [GATE_X + dx + 0.5, top, z + 5.5], 0);
      }
      // Down both side walls: a tall curtained window, a banner, a torch, in turn.
      for (let z = HALL.z0 + 13; z < HALL.z1 - 5; z += 10) {
        for (const [wallX, inX] of [[HALL.x0, HALL.x0 + 1], [HALL.x1, HALL.x1 - 1]] as const) {
          archWindow(world, 'z', wallX, z, top + 3, 9, { glass: B.glass, sill: B.paver });
          curtains('z', inX, z, top + 2, top + 11);
          placeBanner(world, inX, top + 10, z + 5, 'z', banner, 6);
          ctx.propAt(M.torch, [inX + (inX < GATE_X ? 0.75 : 0.25), top + 3, z + 4.5], 0);
          ctx.propAt(M.torch, [inX + (inX < GATE_X ? 0.75 : 0.25), top + 3, z + 8.5], 0);
        }
      }
      for (let z = dais.z1 + 8; z < HALL.z1 - 4; z += 12) for (const dx of [-14, 0, 14]) ctx.propAt(M.chandelier, [GATE_X + dx + 0.5, top + HALL_HEIGHT - CHANDELIER_DROP, z + 0.5], 0);
      // The end-of-term show inside the hall: the badge podium by the west wall, the pin board on the east.
      for (const [dx, hgt, id] of [[0, 3, B.sand], [-3, 2, B.white], [3, 1, B.wood]] as const) {
        box(HALL.x0 + 8 + dx - 1, top, HALL.z1 - 12, HALL.x0 + 8 + dx + 1, top + hgt - 1, HALL.z1 - 10, id);
        ctx.prop(M.medal, HALL.x0 + 8 + dx, HALL.z1 - 11, 0);
      }
      // A step along its front, so every place on it is one block up from the next.
      box(HALL.x0 + 4, top, HALL.z1 - 9, HALL.x0 + 12, top, HALL.z1 - 9, B.paver);
      ctx.keepOut(HALL.x0 + 3, HALL.z1 - 13, HALL.x0 + 13, HALL.z1 - 8);
      ctx.landmark('buc-huy-hieu', 'Bục huy hiệu', HALL.x0 + 8, HALL.z1 - 7);
      box(HALL.x1 - 1, top + 1, HALL.z1 - 16, HALL.x1 - 1, top + 3, HALL.z1 - 10, B.green);
      for (let i = 0; i < 3; i++) ctx.propAt(i % 2 ? M.picture : M.pictureYellow, [HALL.x1 - 1.6, top + 1.5, HALL.z1 - 14.5 + i * 2], 90);
      ctx.keepOut(HALL.x1 - 3, HALL.z1 - 17, HALL.x1, HALL.z1 - 9);
      ctx.landmark('gia-ghim-tranh', 'Giá ghim tranh', HALL.x1 - 5, HALL.z1 - 13);
      ctx.landmark('ngai-vang', 'Ngai vàng', GATE_X, dais.z1 + 2);
      ctx.landmark('cua-dai-sanh', 'Cửa đại sảnh', GATE_X, HALL.z1 - 3);
      // The hall dressed for the end-of-term show: the dais is the stage (its steps, the hanging behind it,
      // its wings), the floor is the audience's, the review stalls stand in the side aisles; every place a
      // chapter 2 lesson names has a landmark on the hall's floor, so its quest stands there.
      const stalls: ReadonlyArray<{ id: string; name: string; x0: number; z0: number; items: readonly string[] }> = [
        { id: 'gian-tia-so', name: 'Gian tia số', x0: HALL.x0 + 3, z0: HALL.z0 + 20, items: [M.ruler, M.ruler] },
        { id: 'gian-dong-ho', name: 'Gian đồng hồ', x0: HALL.x0 + 3, z0: HALL.z0 + 30, items: [M.clock] },
        { id: 'gian-dat-tinh', name: 'Gian đặt tính', x0: HALL.x0 + 3, z0: HALL.z0 + 40, items: [M.abacus, M.abacus] },
        { id: 'gian-do-chieu-cao', name: 'Gian đo chiều cao', x0: HALL.x0 + 3, z0: HALL.z0 + 50, items: [M.ruler] },
        { id: 'gian-hinh-phang', name: 'Gian hình phẳng', x0: HALL.x1 - 9, z0: HALL.z0 + 20, items: [M.triangle, M.puzzle] },
        { id: 'gian-can-dong', name: 'Gian cân đong', x0: HALL.x1 - 9, z0: HALL.z0 + 30, items: [M.scale] },
        { id: 'gian-bai-toan', name: 'Gian bài toán', x0: HALL.x1 - 9, z0: HALL.z0 + 40, items: [M.abacus, M.ruler] },
      ];
      const awnings = [[B.wood, B.white], [B.blue, B.white], [B.sand, B.wood], [B.green, B.white]] as const;
      stalls.forEach((st, i) => {
        reviewBooth(world, st.x0, st.z0, 7, 4, top, { log: B.log, planks: B.planks, stripes: awnings[i % awnings.length] ?? [B.wood] });
        st.items.forEach((m, k) => ctx.prop(m, st.x0 + 2 + k * 2, st.z0, 180));
        ctx.keepOut(st.x0 - 1, st.z0 - 1, st.x0 + 7, st.z0 + 4);
        ctx.landmark(st.id, st.name, st.x0 + 3, st.z0 - 3);
      });
      table(HALL.x0 + 13, HALL.z0 + 30, [M.clock]);
      ctx.landmark('ban-lich', 'Bàn lịch cạnh gian đồng hồ', HALL.x0 + 13, HALL.z0 + 33);
      // The paper-flower arch over the carpet inside the door, cakes, the teddy store and the puppet booth.
      for (const x of [nave.x0 - 2, nave.x1 + 2]) box(x, top, HALL.z1 - 6, x, top + 5, HALL.z1 - 6, B.planks);
      for (let x = nave.x0 - 2; x <= nave.x1 + 2; x++) put(world, x, top + 6, HALL.z1 - 6, x % 2 === 0 ? B.pink : B.leaves);
      ctx.landmark('gian-hoa-giay', 'Giàn hoa giấy', GATE_X, HALL.z1 - 8);
      table(HALL.x1 - 12, HALL.z0 + 52, [M.cake, M.cake]);
      ctx.landmark('goc-banh', 'Góc bánh', HALL.x1 - 12, HALL.z0 + 55);
      for (let i = 0; i < 5; i++) ctx.prop(M.teddy, HALL.x0 + 3 + (i % 3), HALL.z1 - 20 + Math.floor(i / 3), 180 + i * 20);
      ctx.landmark('kho-thu-bong', 'Kho thú bông', HALL.x0 + 5, HALL.z1 - 23);
      box(HALL.x0 + 12, top, HALL.z1 - 22, HALL.x0 + 16, top, HALL.z1 - 21, B.planks);
      for (const dx of [0, 4]) box(HALL.x0 + 12 + dx, top + 1, HALL.z1 - 22, HALL.x0 + 12 + dx, top + 3, HALL.z1 - 22, B.wood);
      box(HALL.x0 + 12, top + 4, HALL.z1 - 22, HALL.x0 + 16, top + 4, HALL.z1 - 22, B.blue);
      for (let dx = 1; dx <= 3; dx++) ctx.propAt(M.dolls, [HALL.x0 + 12 + dx + 0.5, top + 1, HALL.z1 - 20.6], 180);
      ctx.keepOut(HALL.x0 + 11, HALL.z1 - 23, HALL.x0 + 17, HALL.z1 - 20);
      ctx.landmark('buc-mua-roi', 'Bục múa rối', HALL.x0 + 14, HALL.z1 - 18);
      const named: ReadonlyArray<readonly [string, string, number, number]> = [
        ['san-khau', 'Sân khấu', GATE_X, dais.z1 + 3],
        ['bac-len-san-khau', 'Bậc lên sân khấu', GATE_X + 4, dais.z1 + 3],
        ['phong-nen', 'Phông nền sân khấu', GATE_X - 4, dais.z1 + 4],
        ['canh-ga', 'Cánh gà', GATE_X - 16, dais.z1 + 2],
        ['canh-ga-san-khau', 'Cánh gà sân khấu', GATE_X + 16, dais.z1 + 2],
        ['gian-den', 'Giàn đèn sân khấu', GATE_X + 8, dais.z1 + 8],
        ['hau-truong', 'Hậu trường', HALL.x0 + 5, dais.z1 + 3],
        ['quanh-hau-truong', 'Quanh hậu trường', HALL.x0 + 9, dais.z1 + 6],
        ['dong-thanh-go', 'Đống thanh gỗ khung phông', HALL.x1 - 5, dais.z1 + 3],
        ['hang-ghe', 'Hàng ghế', GATE_X - 6, HALL.z0 + 34],
        ['khan-phong', 'Khán phòng', GATE_X + 6, HALL.z0 + 40],
        ['loi-di-ket-hoa', 'Lối đi kết hoa', GATE_X, HALL.z0 + 46],
        ['goc-dung-buc-go', 'Góc dựng bục gỗ', HALL.x1 - 6, HALL.z1 - 10],
        ['san-do-xe', 'Sân đỗ xe trước đại sảnh', GATE_X + 8, HALL.z1 - 4],
      ];
      for (const [id, name, x, z] of named) ctx.landmark(id, name, x, z);
      // Planks and frame bars stacked where the wooden platforms are built; benches for the audience.
      for (const [dx, dz, bars] of [[-6, -10, true], [-3, -10, false], [-6, -6, false]] as const) {
        box(HALL.x1 + dx, top, HALL.z1 + dz, HALL.x1 + dx + 1, top, HALL.z1 + dz + 1, B.planks);
        if (bars) box(HALL.x1 + dx, top + 1, HALL.z1 + dz, HALL.x1 + dx + 1, top + 1, HALL.z1 + dz, B.log);
      }
      ctx.keepOut(HALL.x1 - 7, HALL.z1 - 11, HALL.x1 - 1, HALL.z1 - 4);
      for (const z of [HALL.z0 + 30, HALL.z0 + 34, HALL.z0 + 38]) for (const dx of [-8, 8]) ctx.propAt(M.longBench, [GATE_X + dx + 0.5, top, z + 0.5], 90);
      ctx.landmark('dai-sanh', 'Đại sảnh', GATE_X, (HALL.z0 + HALL.z1) >> 1);

      // The library (d-07): tall shelves of books all round the walls, reading tables with open books, books
      // and candles, the big globe, chandeliers, red curtains at the arched windows.
      const lib = { x0: LIBRARY.x0 + 1, z0: LIBRARY.z0 + 1, x1: LIBRARY.x1 - 1, z1: LIBRARY.z1 - 1 };
      for (let z = lib.z0 + 3; z <= lib.z1 - 6; z += 8) {
        archWindow(world, 'z', LIBRARY.x0, z, top + 2, 7, { glass: B.glass, sill: B.paver });
        curtains('z', lib.x0, z, top + 1, top + 8);
        for (const y of [top, top + 3.4]) ctx.propAt(M.bookshelf, [lib.x0 + 0.4, y, z + 5], 270);
      }
      for (const y of [top, top + 3.4]) {
        for (let x = lib.x0 + 2; x <= lib.x1 - 2; x += 3) ctx.propAt(M.bookshelf, [x + 0.5, y, lib.z0 + 0.4], 180);
        for (let z = lib.z0 + 2; z <= lib.z1 - 4; z += 3) ctx.propAt(M.bookshelf, [lib.x1 + 0.6, y, z + 0.5], 90);
      }
      for (const [dx, dz] of [[-6, 14], [6, 14], [-6, 30], [6, 30], [-6, 44], [6, 44]] as const) {
        const [x, z] = [libX + dx, LIBRARY.z0 + dz];
        ctx.propAt(M.studyTable, [x + 0.5, top, z + 0.5], 0);
        for (const side of [-1, 1]) ctx.propAt(M.longBench, [x + 0.5, top, z + side * 1.4 + 0.5], 0);
        onTable(M.openBook, x - 1, z, top, 0);
        onTable(M.books, x + 1, z, top, 30);
        ctx.propAt(M.candles, [x + 0.5, top + 0.86, z + 0.9], 0);
      }
      ctx.propAt(M.studyTable, [libX + 0.5, top, LIBRARY.z0 + 22.5], 90);
      onTable(M.globe, libX, LIBRARY.z0 + 21, top, 0);
      onTable(M.openBook, libX, LIBRARY.z0 + 24, top, 90);
      ctx.centred(M.rug, libX, LIBRARY.z1 - 8, 0);
      for (const dz of [18, 38]) ctx.propAt(M.chandelier, [libX + 0.5, top + WING_HEIGHT - CHANDELIER_DROP, LIBRARY.z0 + dz + 0.5], 0);
      for (const x of [lib.x0 + 1, lib.x1 - 1]) ctx.propAt(M.candleStand, [x + 0.5, top, lib.z1 - 1.5], 0);
      ctx.landmark('thu-vien', 'Thư viện lâu đài', libX, (LIBRARY.z0 + LIBRARY.z1) >> 1);

      // The dining hall (d-08): two long tables down the room under red runners with candles, plates and
      // dishes, wooden chairs along both sides, chandeliers, banners and curtained windows.
      const din = { x0: DINING.x0 + 1, z0: DINING.z0 + 1, x1: DINING.x1 - 1, z1: DINING.z1 - 1 };
      for (let z = din.z0 + 3; z <= din.z1 - 6; z += 8) {
        archWindow(world, 'z', DINING.x1, z, top + 2, 7, { glass: B.glass, sill: B.paver });
        curtains('z', din.x1, z, top + 1, top + 8);
        placeBanner(world, din.x1, top + 9, z + 4, 'z', banner, 5);
        placeBanner(world, din.x0, top + 9, z + 2, 'z', banner, 5);
        ctx.propAt(M.torch, [din.x0 + 0.75, top + 2.6, z + 5.5], 0);
      }
      for (const dx of [-5, 5]) {
        const x = dinX + dx;
        for (let z = DINING.z0 + 10; z <= DINING.z1 - 12; z += 6) {
          ctx.propAt(M.longTable, [x + 0.5, top, z + 0.5], 90);
          for (let k = -2; k <= 2; k++) {
            const y = top + 0.9;
            const zz = z + k * 1.1 + 0.5;
            ctx.propAt(M.plate, [x + 0.05, y, zz], 0);
            ctx.propAt(M.plate, [x + 0.95, y, zz], 0);
            if (k !== 0 && k % 2 === 0) ctx.propAt(M.food[(x + z + k + 6) % M.food.length] ?? M.plate, [x + 0.5, y, zz], k * 40);
            ctx.propAt(M.chair, [x - 0.6, top, zz], 270);
            ctx.propAt(M.chair, [x + 1.6, top, zz], 90);
          }
          ctx.propAt(M.candles, [x + 0.5, top + 0.9, z + 0.5], 90);
        }
      }
      for (const dz of [16, 32, 48]) ctx.propAt(M.chandelier, [dinX + 0.5, top + WING_HEIGHT - CHANDELIER_DROP, DINING.z0 + dz + 0.5], 0);
      for (const z of [din.z0 + 1, din.z1 - 1]) for (const x of [din.x0 + 1, din.x1 - 1]) ctx.propAt(M.candleStand, [x + 0.5, top, z + 0.5], 0);
      ctx.landmark('phong-an', 'Phòng ăn', dinX, (DINING.z0 + DINING.z1) >> 1);

      // The bedchamber (d-09): wooden beds under red covers along both walls, a chest at each foot, tall
      // cupboards between them, a rug, banners, the curtained window, torches on the walls.
      castleRoom(world, BEDROOM, top, 9, warm);
      gableRoofAlongZ(world, BEDROOM, top + 9, { roof: B.red, ridge: B.wood, gable: B.sand });
      const bedX = (BEDROOM.x0 + BEDROOM.x1) >> 1;
      archway(world, 'x', BEDROOM.z1, bedX - 2, bedX + 2, top, 5);
      archWindow(world, 'x', BEDROOM.z0, bedX - 1, top + 1, 6, { glass: B.glass, sill: B.planks });
      archWindow(world, 'x', BEDROOM.z0, bedX + 1, top + 1, 6, { glass: B.glass, sill: B.planks });
      for (const dx of [-2, 3]) box(bedX + dx, top, BEDROOM.z0 + 1, bedX + dx, top + 6, BEDROOM.z0 + 1, B.wood);
      for (const dx of [-7, 6]) placeBanner(world, bedX + dx, top + 7, BEDROOM.z0 + 1, 'x', banner, 5);
      for (const z of [117, 127]) {
        ctx.propAt(M.bed, [BEDROOM.x0 + 2.4, top, z + 0.5], 270);
        ctx.propAt(M.bed, [BEDROOM.x1 - 1.4, top, z + 0.5], 90);
        ctx.prop(M.chest, BEDROOM.x0 + 5, z, 90);
        ctx.prop(M.chest, BEDROOM.x1 - 5, z, 270);
        placeBanner(world, BEDROOM.x0 + 1, top + 7, z - 1, 'z', banner, 4);
        placeBanner(world, BEDROOM.x1 - 1, top + 7, z - 1, 'z', banner, 4);
      }
      for (const z of [113, 122, 131]) for (const x of [BEDROOM.x0 + 1, BEDROOM.x1 - 1]) ctx.propAt(M.torch, [x + (x < bedX ? 0.7 : 0.3), top + 2.4, z + 0.5], 0);
      ctx.propAt(M.bookshelf, [BEDROOM.x0 + 1.4, top, 122.5], 270);
      ctx.propAt(M.bookshelf, [BEDROOM.x1 - 0.4, top, 122.5], 90);
      ctx.centred(M.rug, bedX, 122, 90);
      ctx.propAt(M.chandelier, [bedX + 0.5, top + 9 - CHANDELIER_DROP, 122.5], 0);
      for (const [x, z] of [[BEDROOM.x0 + 2, BEDROOM.z1 - 2], [BEDROOM.x1 - 2, BEDROOM.z1 - 2], [bedX - 4, BEDROOM.z0 + 2], [bedX + 4, BEDROOM.z0 + 2]] as const) ctx.centred(M.plant, x, z, 0);
      ctx.keepOut(BEDROOM.x0 - 1, BEDROOM.z0 - 1, BEDROOM.x1 + 1, BEDROOM.z1 + 2);
      ctx.landmark('phong-nghi', 'Phòng nghỉ', bedX, 122);

      // The watchtower (d-10): a round stone room on the hill, fifteen across inside, its plank floor on a stone
      // footing, the door three wide on the east with steps down to the lane, wide windows on the other three
      // sides; the map table by the south-west window, the telescope at the west one, barrels, a chest, the
      // weapon rack, a lamp. Under a red cone that stays inside the world's height.
      const watchY = ctx.surface(WATCH.x, WATCH.z) + 1;
      const watch = roundRoom(world, WATCH.x, WATCH.z, watchY, WATCH.r, 9, { wall: B.stone, trim: B.grey, floor: B.planks, roof: B.red, beam: B.log, footing: B.cobble });
      stepsDown(WATCH.x + WATCH.r, WATCH.z, 1, 0, watchY - 1, 3, B.grey);
      ctx.propAt(M.flag, [WATCH.x + 0.5, watch.tip + 1, WATCH.z + 0.5], 0);
      ctx.propAt(M.mapTable, [WATCH.x - 3.5, watchY, WATCH.z + 4.5], 0);
      ctx.propAt(M.telescope, [WATCH.x - 5.5, watchY, WATCH.z - 0.5], 90);
      ctx.propAt(M.barrel, [WATCH.x + 4, watchY, WATCH.z + 5.5], 0);
      ctx.propAt(M.barrel, [WATCH.x + 2.8, watchY, WATCH.z + 6.4], 40);
      ctx.propAt(M.chest, [WATCH.x + 4, watchY, WATCH.z - 5.5], 270);
      ctx.propAt(M.rack, [WATCH.x + 0.5, watchY, WATCH.z - 6.6], 0);
      ctx.propAt(M.candleStand, [WATCH.x + 5.5, watchY, WATCH.z + 3.5], 0);
      ctx.propAt(M.torch, [WATCH.x + 6.4, watchY + 2.5, WATCH.z + 3.5], 0);
      ctx.centredAt(M.plant, [WATCH.x - 4, watchY, WATCH.z - 4], 0);
      ctx.keepOut(WATCH.x - 24, WATCH.z - 24, WATCH.x + 24, WATCH.z + 24);
      ctx.landmark('thap-canh', 'Tháp canh', WATCH.x, WATCH.z, watchY);

      // The training ground (d-04): trodden earth inside a wooden fence, a row of archery targets, straw
      // dummies, weapon racks, banners, a wooden lookout on its legs, the smithy in its corner.
      // A verge of grass two wide inside the fence carries the fence, the racks and the poles along it; the
      // trodden earth runs out through the two gates (south to the postern lane, west to the ward).
      const trainingGate = (x: number, z: number): boolean => (Math.abs(x - 546) <= 3 && z >= TRAINING.z1 - 2) || (Math.abs(z - 218) <= 4 && x <= TRAINING.x0 + 2);
      for (let x = TRAINING.x0; x <= TRAINING.x1; x++) for (let z = TRAINING.z0; z <= TRAINING.z1; z++) {
        if (ctx.onPath(x, z)) continue;
        const verge = Math.min(x - TRAINING.x0, TRAINING.x1 - x, z - TRAINING.z0, TRAINING.z1 - z) <= 2;
        put(world, x, LEVEL, z, verge && !trainingGate(x, z) ? B.grass : B.trail);
      }
      for (let x = TRAINING.x0; x <= TRAINING.x1; x += 2) for (const z of [TRAINING.z0, TRAINING.z1]) if (Math.abs(x - 546) > 3) ctx.prop(M.fence, x, z, 0);
      for (let z = TRAINING.z0 + 2; z < TRAINING.z1; z += 2) for (const x of [TRAINING.x0, TRAINING.x1]) if (x !== TRAINING.x0 || Math.abs(z - 218) > 4) ctx.prop(M.fence, x, z, 90);
      for (let x = TRAINING.x0 + 6; x <= TRAINING.x1 - 6; x += 8) ctx.propAt(M.target, [x + 0.5, top, TRAINING.z0 + 18.5], 180);
      for (let x = TRAINING.x0 + 22; x <= TRAINING.x1 - 4; x += 6) ctx.propAt(M.target, [x + 0.5, top, TRAINING.z0 + 30.5], 200);
      // Straw stacked for the targets, barrels and crates of arrows along the fence.
      for (const [x, z] of [[556, 212], [566, 212], [540, 240], [570, 244]] as const) {
        put(world, x, top, z, B.wheat);
        put(world, x + 1, top, z, B.wheat);
      }
      for (const [x, z] of [[572, 238], [573, 241], [560, 246], [527, 244]] as const) ctx.prop(M.barrel, x, z, x * 9);
      for (const [x, z] of [[574, 234], [550, 247]] as const) ctx.prop(M.crate, x, z, z * 7);
      for (let x = TRAINING.x0 + 8; x <= TRAINING.x1 - 8; x += 10) ctx.propAt(M.dummy, [x + 0.5, top, 232.5], 0);
      for (const z of [204, 216, 228, 240]) ctx.propAt(M.rack, [TRAINING.x1 - 1.5, top, z + 0.5], 90);
      for (const z of [196, 204, 232, 244]) ctx.propAt(M.bannerPole, [TRAINING.x0 + 2.5, top, z + 0.5], 90);
      for (let x = TRAINING.x0 + 10; x <= TRAINING.x1 - 10; x += 12) ctx.propAt(M.bannerPole, [x + 0.5, top, TRAINING.z0 + 1.5], 0);
      const lookout = { x: 523, z: 214 };
      for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as const) box(lookout.x + dx, top, lookout.z + dz, lookout.x + dx, top + 9, lookout.z + dz, B.log);
      box(lookout.x - 4, top + 7, lookout.z - 4, lookout.x + 4, top + 7, lookout.z + 4, B.planks);
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) if ((Math.abs(dx) === 4 || Math.abs(dz) === 4) && (dx + dz) % 2 === 0) put(world, lookout.x + dx, top + 8, lookout.z + dz, B.log);
      for (let k = 0; k <= 4; k++) box(lookout.x - 5 + k, top + 10 + k, lookout.z - 5 + k, lookout.x + 5 - k, top + 10 + k, lookout.z + 5 - k, k % 2 === 0 ? B.wood : B.planks);
      // A plank stair three wide up the east side to the platform, a block a step, through a gap in its rail.
      for (let k = 0; k <= 6; k++) box(lookout.x + 11 - k, top, lookout.z - 1, lookout.x + 11 - k, top + k, lookout.z + 1, B.planks);
      for (let dz = -1; dz <= 1; dz++) put(world, lookout.x + 4, top + 8, lookout.z + dz, 0);
      ctx.propAt(M.flag, [lookout.x + 0.5, top + 15, lookout.z + 0.5], 0);
      ctx.keepOut(lookout.x - 5, lookout.z - 5, lookout.x + 13, lookout.z + 5);
      ctx.landmark('choi-gac-go', 'Chòi gác gỗ', lookout.x, lookout.z - 7);
      const smithy = { x: 530, z: 270 };
      ctx.prop(M.anvil, smithy.x, smithy.z, 0);
      ctx.prop(M.barrel, smithy.x + 3, smithy.z + 2, 0);
      ctx.prop(M.logs, smithy.x - 3, smithy.z + 2, 90);
      ctx.prop(M.crate, smithy.x + 5, smithy.z - 1, 20);
      ctx.landmark('lo-ren', 'Lò rèn', smithy.x, smithy.z - 3);
      ctx.keepOut(TRAINING.x0, TRAINING.z0, TRAINING.x1, TRAINING.z1);
      ctx.landmark('khu-luyen-tap', 'Khu luyện tập', 546, 222);

      // The dungeon (d-11): a long vaulted corridor of stone, barred cells on both sides, torches between them.
      castleRoom(world, DUNGEON, top, 7, { wall: B.sand, plinth: B.paver, floor: block('cobble'), ceiling: B.stone, beam: B.planks });
      battlements(world, DUNGEON, top + 8, B.stone);
      const hall = { z0: 260, z1: 266 };
      for (let x = DUNGEON.x0 + 1; x < DUNGEON.x1; x++) {
        const divider = (x - DUNGEON.x0) % 8 === 0;
        for (const z of [hall.z0 - 1, hall.z1 + 1]) if (divider) box(x, top, z, x, top + 6, z, B.sand);
        if (divider) {
          box(x, top, DUNGEON.z0 + 1, x, top + 6, hall.z0 - 1, B.sand);
          box(x, top, hall.z1 + 1, x, top + 6, DUNGEON.z1 - 1, B.sand);
        }
      }
      for (let x0 = DUNGEON.x0 + 1; x0 < DUNGEON.x1 - 1; x0 += 8) {
        ironBars(world, 'x', hall.z0 - 1, x0, x0 + 6, top, 5, B.iron);
        ironBars(world, 'x', hall.z1 + 1, x0, x0 + 6, top, 5, B.iron);
        // Each cell's barred door stands open, three wide, under the top rail.
        for (const z of [hall.z0 - 1, hall.z1 + 1]) box(x0 + 2, top, z, x0 + 4, top + 3, z, 0);
        for (const z of [hall.z0 - 1, hall.z1 + 1]) box(x0, top + 5, z, x0 + 6, top + 6, z, B.sand);
        // Straw in a cell's corner, a barrel or a crate in another.
        put(world, x0 + 1, top, DUNGEON.z0 + 1, B.wheat);
        put(world, x0 + 2, top, DUNGEON.z0 + 1, B.wheat);
        put(world, x0 + 5, top, DUNGEON.z1 - 1, B.wheat);
        ctx.prop((x0 >> 3) % 2 === 0 ? M.barrel : M.crate, x0 + 5, DUNGEON.z0 + 2, x0);
        ctx.prop(M.bedroll, x0 + 2, DUNGEON.z1 - 2, 90);
      }
      for (let x = DUNGEON.x0 + 4; x < DUNGEON.x1; x += 8) {
        for (let z = hall.z0; z <= hall.z1; z++) put(world, x, top + 6, z, z === ((hall.z0 + hall.z1) >> 1) ? B.lantern : B.planks);
        for (const z of [hall.z0, hall.z1]) put(world, x, top + 5, z, B.planks);
      }
      // A lamp high on the back wall of every cell, so the bars stand dark against it.
      for (let x0 = DUNGEON.x0 + 4; x0 < DUNGEON.x1; x0 += 8) for (const z of [DUNGEON.z0, DUNGEON.z1]) put(world, x0, top + 3, z, B.lantern);
      for (let x = DUNGEON.x0 + 8; x < DUNGEON.x1; x += 8) for (const z of [hall.z0 + 0.15, hall.z1 + 0.85]) ctx.propAt(M.torch, [x + 0.5, top + 2.5, z], 0);
      // Barrels and crates down the corridor, against the bars between the cells' doors.
      for (const [x, z] of [[313, 260], [321, 266], [329, 260], [337, 266], [345, 260], [353, 266]] as const) ctx.prop(z === 266 ? M.crate : M.barrel, x, z, x * 7);
      archway(world, 'z', DUNGEON.x1, hall.z0 + 1, hall.z1 - 1, top, 4);
      for (const dz of [-3, 3]) put(world, DUNGEON.x1 + 1, top + 3, 263 + dz, B.lantern);
      ctx.keepOut(DUNGEON.x0 - 1, DUNGEON.z0 - 1, DUNGEON.x1 + 2, DUNGEON.z1 + 1);
      ctx.landmark('ham-nguc', 'Hầm ngục', (DUNGEON.x0 + DUNGEON.x1) >> 1, 263);

      // The royal garden behind the palace (d-12): paved walks crossing at a fountain, rose arches over the
      // long walk, flower beds inside low hedges, the pavilion, blossom trees, lamps.
      const gx = 348;
      const gz = 141;
      for (let x = GARDEN.x0; x <= GARDEN.x1; x++) for (let z = GARDEN.z0; z <= GARDEN.z1; z++) put(world, x, LEVEL, z, Math.abs(x - gx) <= 1 || Math.abs(z - gz) <= 1 ? B.grey : B.paver);
      placePlaza(world, gx, gz, 9, LEVEL, { paver: B.paver, border: B.grey });
      placeFountain(world, gx, gz, top, { stone: B.white, water: B.water });
      box(gx - 1, top + 1, gz - 1, gx + 1, top + 3, gz + 1, B.white);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) put(world, gx + dx, top + 4, gz + dz, B.white);
      box(gx - 1, top + 4, gz - 1, gx + 1, top + 4, gz + 1, B.water);
      put(world, gx, top + 4, gz, B.white);
      put(world, gx, top + 5, gz, B.white);
      put(world, gx, top + 6, gz, B.white);
      ctx.keepOut(gx - 5, gz - 5, gx + 5, gz + 5);
      for (const z of [112, 120, 128, 154, 162, 170]) ctx.propAt(M.roseArch, [gx + 0.5, top, z + 0.5], 0);
      /** Beds inside hedges (their grass stays when the wards are paved). */
      const beds: Rect[] = [];
      /** A tree planted on the paving in a square bed of earth inside a stone kerb, as courtyard trees are. */
      const plantedTree = (x: number, z: number, leaves: number, height: number): void => {
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) === 2) put(world, x + dx, top, z + dz, B.stone);
          else put(world, x + dx, LEVEL, z + dz, B.grass);
        }
        beds.push({ x0: x - 1, z0: z - 1, x1: x + 1, z1: z + 1 });
        placeTree(world, x, top, z, height, { log: B.trunk, leaves }, rng);
        ctx.keepOut(x - 2, z - 2, x + 2, z + 2);
      };
      const hedge = (x0: number, z0: number, x1: number, z1: number): void => {
        beds.push({ x0, z0, x1, z1 });
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
          const edge = x === x0 || x === x1 || z === z0 || z === z1;
          if (edge && !((x === ((x0 + x1) >> 1)) && (z === z0 || z === z1))) put(world, x, top, z, B.leaves);
        }
        // Inside: blossom and roses of blocks dotted over the grass, flowers between them.
        const bloom = [B.pink, B.wood, B.autumn, B.pink];
        for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) {
          put(world, x, LEVEL, z, B.grass);
          if ((x * 5 + z * 3) % 4 === 0) put(world, x, top, z, bloom[(x + z * 7) % bloom.length] ?? B.pink);
        }
        flowerBed(ctx, x0 + 2, z0 + 2, x1 - x0 - 3, z1 - z0 - 3);
        ctx.keepOut(x0, z0, x1, z1);
      };
      // The pavilion in the corner: a raised floor, birch columns, a red pointed roof.
      const pav = { x: 318, z: 116 };
      box(pav.x - 4, top, pav.z - 4, pav.x + 4, top, pav.z + 4, B.grey);
      for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]] as const) box(pav.x + dx, top + 1, pav.z + dz, pav.x + dx, top + 4, pav.z + dz, B.birch);
      for (let k = 0; k <= 5; k++) box(pav.x - 5 + k, top + 5 + k, pav.z - 5 + k, pav.x + 5 - k, top + 5 + k, pav.z + 5 - k, k === 0 ? B.sand : B.red);
      ctx.prop(M.bench, pav.x, pav.z, 90);
      ctx.keepOut(pav.x - 5, pav.z - 5, pav.x + 5, pav.z + 5);
      // Beds inside low hedges on a grid of paved walks, a blossom tree or a clipped bush in every third.
      let bed = 0;
      for (const x0 of [309, 320, 331, 356, 367, 378, 389, 400, 411]) {
        for (const z0 of [109, 120, 131, 152, 163]) {
          const [x1, z1] = [x0 + 7, z0 + 7];
          const nearPlaza = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].some(([x = 0, z = 0]) => Math.hypot(x - gx, z - gz) < 10.5);
          const onPavilion = x0 <= pav.x + 6 && x1 >= pav.x - 6 && z0 <= pav.z + 6 && z1 >= pav.z - 6;
          if (nearPlaza || onPavilion || x1 > GARDEN.x1 - 1 || z1 > GARDEN.z1 - 1) continue;
          hedge(x0, z0, x1, z1);
          const [cx, cz] = [x0 + 4, z0 + 4];
          if (bed % 3 === 1) placeTree(world, cx, top, cz, 5, { log: B.trunk, leaves: B.pink }, rng);
          else if (bed % 3 === 2) {
            box(cx, top, cz, cx, top + 2, cz, B.leaves);
            box(cx - 1, top + 3, cz - 1, cx + 1, top + 4, cz + 1, B.leaves);
          }
          bed++;
        }
      }
      lamps([[gx - 2, 116], [gx + 2, 124], [gx - 2, 158], [gx + 2, 166], [328, gz - 2], [368, gz + 2], [319, 129], [377, 150]]);
      for (const [x, z] of [[gx - 7, gz - 7], [gx + 7, gz + 7]] as const) ctx.prop(M.bench, x, z, 45);
      ctx.keepOut(GARDEN.x0, GARDEN.z0, GARDEN.x1, GARDEN.z1);
      ctx.landmark('vom-hoa-hong', 'Vòm hoa hồng', gx, 166);

      // ---------------------------------------------------------------------------------------------------
      // Before the great hall (d-03): the round square with the fountain and the white cat on it, beds of
      // flowers inside hedges either side, lamps and banners on poles down the way to the gate.
      placePlaza(world, PLAZA.x, PLAZA.z, PLAZA.r, LEVEL, { paver: B.paver, border: B.grey });
      for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > 5.5) continue;
        if (d > 4.5) put(world, PLAZA.x + dx, top, PLAZA.z + dz, B.white);
        else put(world, PLAZA.x + dx, LEVEL, PLAZA.z + dz, B.water);
      }
      box(PLAZA.x - 1, LEVEL, PLAZA.z - 1, PLAZA.x + 1, top + 2, PLAZA.z + 1, B.white);
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > 1.5 && d <= 3.2) put(world, PLAZA.x + dx, top + 1, PLAZA.z + dz, d > 2.4 ? B.white : B.water);
      }
      placeCatStatue(facingWriter(world, [PLAZA.x, PLAZA.z], 'south'), FRAME, top + 3, FRAME, { stone: B.white, eye: B.iron });
      ctx.keepOut(PLAZA.x - 6, PLAZA.z - 6, PLAZA.x + 6, PLAZA.z + 6);
      ctx.landmark('dai-phun-nuoc', 'Đài phun nước tượng mèo', PLAZA.x, PLAZA.z + PLAZA.r);
      lamps(Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        return [Math.round(PLAZA.x + Math.cos(a) * (PLAZA.r - 1)), Math.round(PLAZA.z + Math.sin(a) * (PLAZA.r - 1))] as const;
      }));
      for (const x0 of [PLAZA.x - 25, PLAZA.x + 12]) hedge(x0, PLAZA.z - 7, x0 + 13, PLAZA.z + 7);
      for (const x of [PLAZA.x - 30, PLAZA.x + 30]) plantedTree(x, PLAZA.z, B.leaves, 5);
      for (let z = PLAZA.z + PLAZA.r + 4; z <= WALLS.z1 - 8; z += 8) for (const dx of [-5, 5]) ctx.propAt(M.bannerPole, [GATE_X + dx + 0.5, top, z + 0.5], 90);

      const awningsBazaar = [[B.wood, B.white], [B.blue, B.white], [B.sand, B.wood], [B.green, B.white]] as const;

      // Inside the gate: the paved square with lamps, the bazaar's stalls and the well beside it.
      for (let x = GATE_SQUARE.x0; x <= GATE_SQUARE.x1; x++) for (let z = GATE_SQUARE.z0; z <= GATE_SQUARE.z1; z++) put(world, x, LEVEL, z, (x + z) % 9 === 0 ? B.paver : B.path);
      lamps([[GATE_SQUARE.x0 + 2, GATE_SQUARE.z0 + 2], [GATE_SQUARE.x1 - 2, GATE_SQUARE.z0 + 2], [GATE_SQUARE.x0 + 2, GATE_SQUARE.z1 - 6], [GATE_SQUARE.x1 - 2, GATE_SQUARE.z1 - 6]]);
      ctx.keepOut(GATE_SQUARE.x0, GATE_SQUARE.z0, GATE_SQUARE.x1, GATE_SQUARE.z1);
      [460, 470, 480, 490].forEach((x0, i) => {
        const stall = placeStall(world, x0, 300, 6, 4, top, { log: B.log, planks: B.planks, stripes: awningsBazaar[(i + 1) % awningsBazaar.length] ?? [B.wood] });
        for (let k = 0; k < 3; k++) ctx.propAt(M.food[(i * 2 + k) % M.food.length] ?? M.bucket, [stall.counter[0] - 1 + k, stall.counter[1], stall.counter[2]], k * 40);
        ctx.prop(M.barrel, x0 + 4, 305, 0);
      });
      placeWell(world, 476, 318, LEVEL, { stone: B.stone, water: B.water });
      ctx.keepOut(458, 297, 498, 320);
      ctx.landmark('cho-trong-thanh', 'Chợ trong thành', 476, 296);

      // The west ward: the servants' houses, the cowshed (the castle has no horses: its oxen pull the carts).
      // Their houses face a yard of grass with its fruit tree, behind a fence (the one green ward but the garden).
      const servants = cottageRow(ctx, 330, 222, 2);
      beds.push({ x0: 329, z0: 222 - 7, x1: servants.x1, z1: 221 });
      ctx.landmark('nha-nguoi-hau', 'Nhà người hầu', 345, 214);
      const shed = { x0: 310, z0: 186, x1: 326, z1: 200 };
      for (const [x, z] of [[shed.x0, shed.z0], [shed.x1, shed.z0], [shed.x0, shed.z1], [shed.x1, shed.z1], [318, shed.z0], [318, shed.z1]] as const) box(x, top, z, x, top + 3, z, B.log);
      box(shed.x0 - 1, top + 4, shed.z0 - 1, shed.x1 + 1, top + 4, shed.z1 + 1, B.planks);
      for (let x = shed.x0 - 1; x <= shed.x1 + 1; x++) put(world, x, top + 5, (shed.z0 + shed.z1) >> 1, B.wood);
      box(shed.x0 + 1, top, shed.z1 - 1, shed.x1 - 1, top, shed.z1 - 1, B.planks);
      for (let x = shed.x0 + 2; x < shed.x1; x += 3) put(world, x, top, shed.z0 + 1, B.wheat);
      placeWell(world, 340, 196, LEVEL, { stone: B.stone, water: B.water });
      ctx.keepOut(shed.x0 - 1, shed.z0 - 1, shed.x1 + 1, shed.z0 + 2);
      ctx.keepOut(338, 194, 342, 198);
      ctx.landmark('chuong-bo', 'Chuồng bò kéo xe', 318, 206);
      for (const [x, z] of [[372, 300], [400, 308], [506, 310], [540, 300]] as const) plantedTree(x, z, B.pink, 6);

      // ---------------------------------------------------------------------------------------------------
      // Chapter 3: the bridgehead square before the gate, the meadow, willows on the moat bank.
      placePlaza(world, GATE_X, BRIDGE.z1 + 9, 8, LEVEL, { paver: B.paver, border: B.grey });
      lamps([[GATE_X - 7, BRIDGE.z1 + 3], [GATE_X + 7, BRIDGE.z1 + 3], [GATE_X - 9, BRIDGE.z1 + 12], [GATE_X + 9, BRIDGE.z1 + 12]]);
      for (const dx of [-6, 6]) ctx.prop(M.bench, GATE_X + dx, BRIDGE.z1 + 9, 90);
      for (const dx of [-11, 11]) ctx.propAt(M.bannerPole, [GATE_X + dx + 0.5, top, BRIDGE.z1 + 5.5], 90);
      ctx.keepOut(GATE_X - 9, BRIDGE.z1 + 1, GATE_X + 9, BRIDGE.z1 + 17);
      ctx.landmark('dau-cau-treo', 'Đầu cầu', GATE_X, BRIDGE.z1 + 4);
      const willow = (x: number, z: number): void => {
        const y0 = ctx.surface(x, z) + 1;
        box(x, y0, z, x, y0 + 6, z, B.trunk);
        for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
          const d = Math.hypot(dx, dz);
          if (d > 4.3) continue;
          put(world, x + dx, y0 + 7, z + dz, B.leaves, true);
          if (d < 3) put(world, x + dx, y0 + 8, z + dz, B.leaves, true);
          if (d > 2.6 && (dx + dz) % 2 === 0) for (let y = y0 + 3; y < y0 + 7; y++) put(world, x + dx, y, z + dz, B.leaves, true);
        }
        ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
      };
      for (const x of [380, 404, 476, 500]) willow(x, BRIDGE.z1 + 4 + (x % 3));
      ctx.landmark('goc-lieu', 'Gốc liễu bên hào nước', 404, BRIDGE.z1 + 7);
      for (const [x, z] of [[392, 394], [418, 424], [470, 412], [500, 392], [380, 430]] as const) flowerBed(ctx, x, z, 6, 4);
      ctx.landmark('bai-co-truoc-cong', 'Bãi cỏ trước cổng thành', 480, 404);
      // The meadow's people: the gatekeeper's lodge, a ticket booth, picnic tables, blossom trees, a rail on the bank.
      // The gatekeeper's lodge: a stone house fifteen by eleven, walls seven high, a door three wide facing the
      // lane, a walk to it, a window either side, a bench and a lamp before it.
      const lodge: Rect = { x0: 386, z0: 410, x1: 400, z1: 420 };
      const lodgeDoor = (lodge.x0 + lodge.x1) >> 1;
      castleRoom(world, lodge, top, 7, { ...room, floor: B.planks });
      gableRoofAlongZ(world, lodge, top + 7, { roof: B.red, ridge: B.wood, gable: B.stone });
      archway(world, 'x', lodge.z0, lodgeDoor - 1, lodgeDoor + 1, top, 4);
      for (const x of [lodge.x0 + 3, lodge.x1 - 4]) archWindow(world, 'x', lodge.z0, x, top + 2, 4, { glass: B.glass, sill: B.planks });
      for (let z = 406; z < lodge.z0; z++) for (let x = lodgeDoor - 1; x <= lodgeDoor + 1; x++) put(world, x, LEVEL, z, B.path);
      put(world, lodgeDoor - 3, top + 3, lodge.z0 - 1, B.lantern);
      ctx.prop(M.bench, lodge.x1 - 3, lodge.z0 - 2, 0);
      ctx.keepOut(lodge.x0 - 1, lodge.z0 - 2, lodge.x1 + 1, lodge.z1 + 1);
      ctx.landmark('nha-gac', 'Nhà gác cổng', lodgeDoor, lodge.z0 - 2);
      placeStall(world, 460, 378, 6, 4, top, { log: B.log, planks: B.planks, stripes: [B.wood, B.white] });
      ctx.keepOut(459, 376, 466, 382);
      for (const [x, z] of [[496, 420], [504, 428], [372, 392]] as const) table(x, z, [M.food[0] ?? M.plate]);
      for (const [x, z] of [[370, 408], [508, 382], [430, 430], [462, 432], [508, 432]] as const) {
        placeTree(world, x, top, z, 6, { log: B.trunk, leaves: B.pink }, rng);
        ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
      }
      for (let x = WALLS.x0; x <= WALLS.x1; x += 2) if (Math.abs(x - GATE_X) > 12 && !ctx.keptOut(x, BRIDGE.z1)) ctx.prop(M.fence, x, BRIDGE.z1, 0);
      // Low hedges of leaves along the avenue through the meadow and round a flower bed (the child walks through).
      for (let z = BRIDGE.z1 + 19; z <= 434; z++) for (const x of [GATE_X - 5, GATE_X + 5]) if (!ctx.onPath(x, z) && (z - BRIDGE.z1) % 9 !== 0) put(world, x, top, z, z % 3 === 0 ? B.pink : B.leaves);
      for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2;
        put(world, Math.round(484 + Math.cos(t) * 7), top, Math.round(414 + Math.sin(t) * 7), a % 4 === 0 ? B.pink : B.leaves);
      }
      flowerBed(ctx, 481, 411, 6, 6);

      // The terraced rice paddies down the slope, and the golden wheat field beside them.
      for (let x = PADDY.x0; x <= PADDY.x1; x++) {
        for (let z = PADDY.z0; z <= PADDY.z1; z++) {
          const dyke = (x - PADDY.x0) % 12 === 0 || (z - PADDY.z0) % 9 === 0 || x === PADDY.x1 || z === PADDY.z1;
          if (dyke || ctx.onPath(x, z) || ctx.nearPath(x, z, 2.5)) continue;
          world.set(x, ctx.surface(x, z), z, B.water);
          if ((x - PADDY.x0) % 4 === 2 && (z - PADDY.z0) % 4 === 1) ctx.prop(M.rice, x, z, (x * 13 + z * 7) % 360);
        }
      }
      ctx.keepOut(PADDY.x0, PADDY.z0, PADDY.x1, PADDY.z1);
      ctx.landmark('ruong-lua', 'Ruộng lúa chân đồi', 380, 470, ctx.surface(380, 470) + 1);
      for (let x = WHEAT.x0; x <= WHEAT.x1; x++) {
        for (let z = WHEAT.z0; z <= WHEAT.z1; z++) {
          if (ctx.onPath(x, z) || ctx.nearPath(x, z, 2.5) || Math.hypot(x - 600, z - 490) < 7) continue;
          if ((z - WHEAT.z0) % 6 === 5) world.set(x, ctx.surface(x, z), z, B.farmland);
          else world.set(x, ctx.surface(x, z) + 1, z, B.wheat);
        }
      }
      ctx.keepOut(WHEAT.x0, WHEAT.z0, WHEAT.x1, WHEAT.z1);
      placeWindmill(world, 600, 490, ctx.surface(600, 490) + 1, { planks: B.planks, log: B.log, roof: B.red, sail: B.white, stone: B.grey, glass: B.glass });
      widenRoundDoor(world, 600, 490, ctx.surface(600, 490) + 1, 4, 4);
      ctx.landmark('canh-dong-lua-mi', 'Cánh đồng lúa mì', 560, 470, ctx.surface(560, 470) + 1);

      // ---------------------------------------------------------------------------------------------------
      // Chapter 1: the painters' court. A paved court of giant coloured shapes before the drawing room, from its
      // door to the gallery's arcade, its flower beds left in earth; the lawn and the veranda lie east of it.
      const court: Rect = { x0: 100, z0: 212, x1: 206, z1: 292 };
      const courtBeds: ReadonlyArray<readonly [number, number, number, number]> = [[102, 246, 6, 4], [102, 270, 6, 4], [206, 236, 8, 3], [166, 296, 10, 3], [204, 298, 8, 4]];
      const inCourtBed = (x: number, z: number): boolean => courtBeds.some(([bx, bz, w, d]) => x >= bx && x < bx + w && z >= bz && z < bz + d);
      for (let x = court.x0; x <= court.x1; x++) for (let z = court.z0; z <= court.z1; z++) if (!ctx.onPath(x, z) && !inCourtBed(x, z)) put(world, x, LEVEL, z, B.paver);
      const shapes: Array<{ id: string; name: string; at: readonly [number, number] }> = [];
      const cube = (x0: number, z0: number, s: number, id: number): void => box(x0, top, z0, x0 + s - 1, top + s - 1, z0 + s - 1, id);
      cube(134, 240, 4, B.wood);
      shapes.push({ id: 'khoi-lap-phuong', name: 'Khối lập phương', at: [136, 242] });
      box(170, top, 240, 175, top + 2, 242, B.blue);
      shapes.push({ id: 'khoi-hop-chu-nhat', name: 'Khối hộp chữ nhật', at: [172, 241] });
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= 2.6) box(192 + dx, top, 244 + dz, 192 + dx, top + 4, 244 + dz, B.sand);
      shapes.push({ id: 'khoi-tru', name: 'Khối trụ', at: [192, 244] });
      for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dy, dz) <= 2.8) put(world, 138 + dx, top + 3 + dy, 278 + dz, B.green);
      shapes.push({ id: 'khoi-cau', name: 'Khối cầu', at: [138, 278] });
      for (let k = 0; k < 4; k++) box(176 + k, top + k, 274 + k, 182 - k, top + k, 280 - k, B.red);
      shapes.push({ id: 'khoi-chop', name: 'Khối chóp', at: [179, 277] });
      for (let k = 0; k < 4; k++) box(192, top, 266 + k, 199, top + k, 266 + k, B.birch);
      shapes.push({ id: 'bac-thang-khoi', name: 'Bậc thang khối', at: [195, 268] });
      ctx.keepOut(133, 239, 138, 244);
      ctx.keepOut(169, 239, 176, 243);
      ctx.keepOut(188, 240, 196, 248);
      ctx.keepOut(134, 274, 142, 282);
      ctx.keepOut(175, 273, 183, 281);
      ctx.keepOut(191, 265, 200, 270);
      for (const s of shapes) ctx.landmark(s.id, s.name, s.at[0], s.at[1] + 4);
      ctx.landmark('khoi-hinh', 'Khối hình trên sân', 160, 270);

      /**
       * A hall of stone (or any walls) with its door on the south (+z), tall windows of stained glass along
       * both long sides and a gable roof along x rising `rise` a row. Returns the door's column.
       */
      const hallHouse = (x0: number, z0: number, w: number, d: number, wallH: number, baseY: number, b: { wall: number; roof: number; trim: number; floor: number }, rise: number, doorW = 2, doorH = 3): { doorX: number } => {
        const [x1, z1] = [x0 + w - 1, z0 + d - 1];
        const doorX = x0 + Math.floor(w / 2);
        const stained = [B.blue, B.wood, B.sand, B.glass];
        for (let y = baseY; y < baseY + wallH; y++) {
          for (let x = x0; x <= x1; x++) {
            for (let z = z0; z <= z1; z++) {
              const ex = x === x0 || x === x1;
              const ez = z === z0 || z === z1;
              if (!ex && !ez) continue;
              const corner = ex && ez;
              const door = z === z1 && Math.abs(x - doorX) <= doorW - 1 && y < baseY + doorH;
              const win = !corner && !door && y >= baseY + 2 && y <= baseY + Math.min(4, wallH - 2) && (ez ? (x - x0) % 4 === 2 : (z - z0) % 4 === 2);
              if (door) continue;
              put(world, x, y, z, win ? (stained[(x + z + y) % stained.length] ?? B.glass) : corner ? b.trim : b.wall);
            }
          }
        }
        for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++) put(world, x, baseY - 1, z, b.floor);
        const roofHalf = Math.ceil((d + 2) / 2);
        for (let z = z0 - 1; z <= z1 + 1; z++) {
          const step = Math.min(z - (z0 - 1), z1 + 1 - z);
          const y = baseY + wallH + Math.floor(step * rise);
          for (let x = x0 - 1; x <= x1 + 1; x++) {
            put(world, x, y, z, b.roof);
            if ((x === x0 || x === x1) && step > 0 && step < roofHalf) for (let fy = baseY + wallH; fy < y; fy++) put(world, x, fy, z, b.wall);
          }
        }
        ctx.keepOut(x0 - 1, z0 - 1, x1 + 1, z1 + 1);
        return { doorX };
      };

      // The drawing room on the north side, its door and stained glass facing the court.
      const studio = { x0: 100, z0: 211, w: 30, d: 14 };
      const { doorX: studioDoor } = hallHouse(studio.x0, studio.z0, studio.w, studio.d, 7, top, { wall: B.sand, roof: B.red, trim: B.log, floor: B.planks }, 1, 3, 4);
      const yard = studio.z0 + studio.d + 2;
      ctx.landmark('phong-ve', 'Phòng vẽ', studio.x0 + studio.w / 2, studio.z0 + studio.d / 2);
      ctx.landmark('o-cua-phong-ve', 'Ô cửa phòng vẽ', studioDoor, yard);
      // The big easel: a white canvas on log legs, palettes at its feet.
      box(104, top, yard + 4, 104, top + 6, yard + 4, B.log);
      box(110, top, yard + 4, 110, top + 6, yard + 4, B.log);
      box(105, top + 2, yard + 4, 109, top + 6, yard + 4, B.white);
      ctx.prop(M.palette, 107, yard + 6, 180);
      ctx.keepOut(103, yard + 3, 111, yard + 5);
      ctx.landmark('gia-ve-lon', 'Giá vẽ lớn', 107, yard + 7);
      // The star-map corner: a dark board dotted with white stars, glowing stars before it.
      box(120, top, yard + 3, 126, top + 4, yard + 3, B.green);
      for (const [x, y] of [[121, 2], [123, 4], [125, 1], [122, 0], [124, 3]] as const) put(world, x, top + y, yard + 3, B.white);
      for (const x of [121, 123, 125]) ctx.prop(M.star, x, yard + 5, 180);
      ctx.keepOut(119, yard + 2, 127, yard + 4);
      ctx.landmark('goc-ban-do-sao', 'Góc bản đồ sao', 123, yard + 6);
      // Tables in the court before the room: rulers, crafts, the magic ruler; the shelf of coloured paper; puzzles.
      table(140, 218, [M.ruler, M.ruler]);
      ctx.landmark('ban-thuoc-ke', 'Bàn thước kẻ', 140, 221);
      table(147, 218, [M.scissors, M.palette]);
      ctx.landmark('ban-thu-cong', 'Bàn thủ công', 147, 221);
      table(140, 230, [M.triangle]);
      ctx.landmark('ban-thuoc-than', 'Bàn thước thần', 140, 233);
      box(152, top, 214, 156, top + 4, 215, B.planks);
      [B.wood, B.blue, B.sand, B.green].forEach((id, i) => box(153, top + i, 214, 155, top + i, 214, id));
      ctx.keepOut(151, 213, 157, 216);
      ctx.landmark('ke-giay-mau', 'Kệ giấy màu', 154, 218);
      box(146, LEVEL, 228, 150, LEVEL, 232, B.planks);
      for (const [x, z] of [[147, 229], [149, 231], [147, 231]] as const) ctx.prop(M.puzzle, x, z, x * 40);
      ctx.landmark('goc-ghep-hinh', 'Góc ghép hình', 148, 234);

      // The rose window: a stone frame round a disc of coloured glass, with the rack of panes beside it.
      const roseAt = { x: 182, z: 214 };
      const glassColours = [B.blue, B.wood, B.sand, B.glass, B.green];
      for (let dx = -6; dx <= 6; dx++) for (let y = 0; y <= 12; y++) {
        const d = Math.hypot(dx, y - 6);
        const id = d <= 4.6 ? (glassColours[Math.floor(d * 1.2 + (Math.atan2(y - 6, dx) + Math.PI) * 1.3) % glassColours.length] ?? B.glass) : B.stone;
        put(world, roseAt.x + dx, top + y, roseAt.z, id);
      }
      ctx.keepOut(roseAt.x - 7, roseAt.z - 1, roseAt.x + 7, roseAt.z + 1);
      ctx.landmark('cua-so-kinh-mau', 'Cửa sổ kính màu', roseAt.x, roseAt.z + 3);
      for (let i = 0; i < 4; i++) {
        box(196 + i * 2, top, 218, 196 + i * 2, top + 2, 218, glassColours[i] ?? B.glass);
        put(world, 196 + i * 2, top, 219, B.log);
      }
      box(195, top + 3, 218, 203, top + 3, 218, B.log);
      ctx.keepOut(195, 217, 203, 220);
      ctx.landmark('gia-de-kinh-mau', 'Giá để kính màu', 199, 222);
      table(212, 216, [M.palette, M.triangle]);
      ctx.landmark('goc-ban-ve', 'Góc bàn vẽ', 212, 219);
      table(212, 230, [M.puzzle, M.picture]);
      ctx.landmark('ban-ghep-tranh', 'Bàn ghép tranh', 212, 233);
      // The stone veranda on the east side: a raised slab, birch columns, a stone roof, looking over the lawn.
      const veranda = { x0: 208, z0: 272, x1: 220, z1: 284 };
      box(veranda.x0, top, veranda.z0, veranda.x1, top, veranda.z1, B.stone);
      for (const [x, z] of [[veranda.x0, veranda.z0], [veranda.x1, veranda.z0], [veranda.x0, veranda.z1], [veranda.x1, veranda.z1], [veranda.x0, 278], [veranda.x1, 278]] as const) box(x, top + 1, z, x, top + 4, z, B.birch);
      box(veranda.x0 - 1, top + 5, veranda.z0 - 1, veranda.x1 + 1, top + 5, veranda.z1 + 1, B.stone);
      for (const z of [275, 281]) ctx.prop(M.bench, 216, z, 270);
      ctx.keepOut(veranda.x0 - 1, veranda.z0 - 1, veranda.x1 + 1, veranda.z1 + 1);
      ctx.landmark('hien-da', 'Hiên đá nhìn ra bãi cỏ', veranda.x0 - 2, 278);
      ctx.landmark('bai-co', 'Bãi cỏ', 196, 300);
      for (const [x, z, w, d] of courtBeds) flowerBed(ctx, x, z, w, d);

      // The picture gallery on the south side: an arcade open to the court, pictures hung from a rail on its
      // back wall, window sills with flowers in its end walls, the teacher's easel and the cutting table inside.
      const gallery = { x0: 100, z0: 293, x1: 150, z1: 306 };
      for (let x = gallery.x0; x <= gallery.x1; x++) for (let z = gallery.z0; z <= gallery.z1; z++) {
        const back = z === gallery.z1;
        const end = x === gallery.x0 || x === gallery.x1;
        const column = z === gallery.z0 && (x - gallery.x0) % 5 === 0;
        if (back || end || column) {
          for (let y = top; y <= top + 5; y++) {
            const sill = end && !back && z > gallery.z0 && z % 4 === 0 && y >= top + 2 && y <= top + 3;
            put(world, x, y, z, sill ? B.glass : column ? B.birch : B.wood);
          }
        }
        put(world, x, top + 6, z, B.blue);
        if (!back && !end) put(world, x, LEVEL, z, B.planks);
      }
      for (let x = gallery.x0 - 1; x <= gallery.x1 + 1; x++) for (const z of [gallery.z0 - 1, gallery.z1 + 1]) put(world, x, top + 6, z, B.blue);
      for (let x = gallery.x0 + 1; x < gallery.x1; x++) put(world, x, top + 4, gallery.z1 - 1, B.log);
      for (let x = gallery.x0 + 3; x < gallery.x1 - 1; x += 4) ctx.propAt(x % 8 < 4 ? M.picture : M.pictureYellow, [x + 0.5, top + 2.2, gallery.z1 - 0.4], 180);
      for (const z of [296, 300, 304]) ctx.propAt(M.flowers[z % 3] ?? M.fence, [gallery.x1 + 1.4, top + 2, z + 0.5], 0);
      box(gallery.x1 + 1, top + 1, 295, gallery.x1 + 1, top + 1, 305, B.log);
      box(118, top, 300, 118, top + 3, 300, B.log);
      box(122, top, 300, 122, top + 3, 300, B.log);
      box(119, top + 1, 300, 121, top + 3, 300, B.white);
      ctx.prop(M.palette, 120, 298, 180);
      table(136, 300, [M.scissors, M.puzzle]);
      ctx.keepOut(gallery.x0 - 1, gallery.z0 - 1, gallery.x1 + 2, gallery.z1 + 1);
      ctx.landmark('phong-tranh', 'Phòng tranh', 125, gallery.z0 - 2);
      ctx.landmark('xa-treo-tranh', 'Xà treo tranh', 110, gallery.z0 - 2);
      ctx.landmark('goc-phong-tranh', 'Góc phòng tranh', gallery.x0 + 2, gallery.z0 - 2);
      ctx.landmark('gia-ve-co-hang', 'Giá vẽ của cô Hằng', 120, gallery.z0 - 2);
      ctx.landmark('ban-cat-dan', 'Bàn cắt dán giấy màu', 136, gallery.z0 - 2);
      ctx.landmark('bau-cua-so-phong-tranh', 'Bậu cửa sổ phòng tranh', gallery.x1 + 3, 300);

      // ---------------------------------------------------------------------------------------------------
      // The town at the foot of the hill: the little market by the avenue (a paved square, striped stalls
      // with produce, the fountain), fields, orchards and the windmill round it.
      // Its paving runs out to the avenue and the main street, so it opens on both.
      const market = { x0: 442, z0: 562, x1: 550, z1: 652 };
      for (let x = market.x0; x <= market.x1; x++) for (let z = market.z0; z <= market.z1; z++) if (!ctx.onPath(x, z)) put(world, x, LOW, z, B.path);
      const townFountain = placeFountain(world, 500, 610, LOW + 1, { stone: B.stone, water: B.water });
      ctx.propAt(M.flagWide, townFountain.plinth, 0);
      ctx.keepOut(495, 605, 505, 615);
      let stallN = 0;
      for (const z0 of [574, 590, 630, 646]) {
        for (let x0 = 456; x0 + 6 <= market.x1 - 2; x0 += 10) {
          if (Math.abs(z0 + 2 - 610) < 9 && Math.abs(x0 + 3 - 500) < 10) continue;
          placeStall(world, x0, z0, 6, 4, LOW + 1, { log: B.log, planks: B.planks, stripes: awnings[stallN % awnings.length] ?? [B.wood] });
          low.prop([M.pumpkin, M.corn, M.bucket][stallN % 3] ?? M.pumpkin, x0 + 2, z0, 0);
          low.prop(M.pumpkin, x0 + 4, z0, 90);
          if (stallN % 2 === 0) low.prop(M.barrel, x0 + 6, z0 + 2, 0);
          stallN++;
        }
      }
      ctx.keepOut(market.x0 - 2, market.z0 - 2, market.x1 + 2, market.z1 + 2);
      ctx.landmark('cho-nho', 'Chợ nhỏ dưới chân thành', 500, 600, LOW + 1);
      ctx.landmark('thi-tran', 'Thị trấn dưới chân thành', 380, 660, LOW + 1);
      // Fields round the town: fenced plots of corn and pumpkins, a windmill over them.
      for (let z = 590; z + 14 <= 786; z += 20) fieldPlot(low, 172, z, 190, z + 14, z % 3 === 0 ? M.pumpkin : M.corn);
      for (const x of [708, 760]) for (let z = 600; z + 14 <= 786; z += 20) {
        if (Math.hypot(x + 9 - 745, z + 7 - 640) < 16 || ctx.nearPath(x + 9, z + 7, 11)) continue;
        fieldPlot(low, x, z, x + 18, z + 14, (x + z) % 3 === 0 ? M.pumpkin : M.corn);
      }
      // Orchards between the fields: rows of fruit trees in blossom, green and turning.
      const orchard = (x0: number, z0: number, x1: number, z1: number): void => {
        for (let x = x0; x <= x1; x += 6) for (let z = z0; z <= z1; z += 6) {
          if (ctx.nearPath(x, z, 3) || ctx.keptOut(x, z, 2) || inWater(x, z)) continue;
          const leaves = [B.pink, B.leaves, B.pink, B.autumn][(Math.floor(x / 6) + Math.floor(z / 6)) % 4] ?? B.leaves;
          placeTree(world, x, ctx.surface(x, z) + 1, z, 5 + ((x + z) % 2), { log: B.trunk, leaves }, rng);
          ctx.keepOut(x, z, x, z);
        }
      };
      // The windmill's ground is kept before the orchards are planted round it.
      ctx.keepOut(739, 634, 751, 646);
      orchard(200, 592, 232, 784);
      orchard(732, 600, 754, 784);
      orchard(708, 470, 784, 590);
      orchard(656, 450, 690, 552);
      placeWindmill(world, 745, 640, LOW + 1, { planks: B.planks, log: B.log, roof: B.red, sail: B.white, stone: B.grey, glass: B.glass });
      widenRoundDoor(world, 745, 640, LOW + 1, 4, 4);
      ctx.landmark('coi-xay-gio', 'Cối xay gió', 745, 632, LOW + 1);
      ctx.landmark('canh-dong', 'Cánh đồng', 745, 520, LOW + 1);

      // The woodcutters' camp in a clearing of the forest: huts, log piles, barrels; a lookout tower on the hill.
      cottageRow(ctx, CAMP.x0 + 4, CAMP.z0 + 26, 3);
      for (const [x, z] of [[632, 238], [640, 240], [650, 236], [664, 240]] as const) {
        box(x, top, z, x + 3, top + 1, z + 1, B.log);
        ctx.keepOut(x - 1, z - 1, x + 4, z + 2);
      }
      for (const [x, z] of [[672, 236], [674, 239]] as const) ctx.prop(M.barrel, x, z, 0);
      ctx.landmark('trai-tieu-phu', 'Trại tiều phu', 655, 248);
      tower(745, 190, ctx.surface(745, 190) + 1, 3, 12, { ...towerBlocks, wall: B.planks, trim: B.log });
      ctx.keepOut(740, 185, 750, 195);
      ctx.landmark('thap-canh-rung', 'Tháp canh trong rừng', 745, 197, ctx.surface(745, 197) + 1);
      ctx.landmark('ho-trong-rung', 'Hồ trong rừng thông', FOREST_POND.x, FOREST_POND.z + FOREST_POND.r + 2);

      // The streets of the districts: cottages facing every road outside the walls, a few hamlets round
      // shared yards, then the verges (lanterns, bushes, flowers) of every way.
      ctx.keepOut(SPAWN.x - 14, SPAWN.z - 14, SPAWN.x + 14, SPAWN.z + 14);
      // The arrival terminal: a paved bay beside the lane where the buses wait.
      for (let x = 36; x <= 58; x++) for (let z = 329; z <= 343; z++) put(world, x, LEVEL, z, B.paver);
      ctx.keepOut(36, 329, 58, 343);
      // The tracks to the fields, the forest and the windmills are trodden earth, not cobbles (the roads they
      // leave keep theirs).
      const roads = ROUTES.filter((r) => !TRACKS.includes(r));
      for (const track of TRACKS) {
        for (const cell of pathColumns(track, 1.4)) {
          const [x = 0, z = 0] = cell.split(',').map(Number);
          if (roads.some((r) => distanceToPath(r, x, z) < 2.5)) continue;
          const y = ctx.surface(x, z);
          if (world.get(x, y, z) === B.path) put(world, x, y, z, B.trail);
        }
      }
      for (const route of [COURT_ROAD, NORTH_LANE, WEST_LANE, MEADOW_LANE, LOWLAND_ROAD, FOREST_ROAD, ...TOWN_STREETS]) streetHouses(ctx, route);
      streetHouses(ctx, POSTERN_LANE.slice(2), { sides: [1] });
      hamlet(ctx, 18, 380, 140, 446);
      hamlet(ctx, 250, 150, 286, 240);
      joinWalks(ctx, ROUTES);
      for (const route of ROUTES) {
        if (route === HALL_WALK) continue;
        for (const stretch of vergeStretches(route, ROUTES.filter((r) => r !== route))) laneVerge(ctx, stretch);
      }
      ctx.landmark('duong-len-thanh', 'Đường lên thành', GATE_X, 470, ctx.surface(GATE_X, 470) + 1);

      // Pines: the forest on the eastern hills, the wood north of the court, a few up the range.
      /** A pine of blocks: a trunk and a cone of leaves, so the forest reads dark from above too. */
      const blockPine = (x: number, z: number): void => {
        const y0 = ctx.surface(x, z) + 1;
        const height = 7 + ((x * 3 + z) % 3);
        box(x, y0, z, x, y0 + height - 1, z, B.trunk);
        for (let y = y0 + 2; y <= y0 + height + 1; y++) {
          const r = Math.min(3, Math.round((y0 + height + 1 - y) / 2.2));
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r + 1) put(world, x + dx, y, z + dz, B.leaves, true);
        }
        ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
      };
      const blockPines = (x0: number, z0: number, x1: number, z1: number, spacing: number): void => {
        for (let gx2 = x0; gx2 <= x1; gx2 += spacing) for (let gz2 = z0; gz2 <= z1; gz2 += spacing) {
          const x = Math.round(gx2 + (rng() - 0.5) * spacing * 0.6);
          const z = Math.round(gz2 + (rng() - 0.5) * spacing * 0.6);
          if (x < 12 || z < 12 || x > SIZE - 13 || z > SIZE - 13) continue;
          if (ctx.nearPath(x, z, 4) || inWater(x, z) || ctx.inZone(x, z, 4) || ctx.keptOut(x, z, 3) || world.get(x, ctx.surface(x, z) + 1, z) !== 0) continue;
          if (FALLS.some(([fx]) => Math.abs(fx - x) < 6 && z < WALLS.z0)) continue;
          blockPine(x, z);
        }
      };
      blockPines(602, 106, 786, 446, 8);
      blockPines(14, 100, 156, 180, 10);
      blockPines(14, 16, 786, 90, 13);
      const pines = (x0: number, z0: number, x1: number, z1: number, spacing: number, keep: number): void => {
        for (let gx2 = x0; gx2 <= x1; gx2 += spacing) for (let gz2 = z0; gz2 <= z1; gz2 += spacing) {
          const x = Math.round(gx2 + (rng() - 0.5) * spacing * 0.8);
          const z = Math.round(gz2 + (rng() - 0.5) * spacing * 0.8);
          if (rng() > keep || x < 12 || z < 12 || x > SIZE - 13 || z > SIZE - 13) continue;
          if (ctx.nearPath(x, z, 3) || inWater(x, z) || ctx.inZone(x, z, 3) || ctx.keptOut(x, z, 2) || world.get(x, ctx.surface(x, z) + 1, z) !== 0) continue;
          if (FALLS.some(([fx]) => Math.abs(fx - x) < 5 && z < WALLS.z0)) continue;
          ctx.prop(rng() < 0.6 ? M.pine : M.pineRound, x, z, Math.floor(rng() * 360));
        }
      };
      pines(600, 106, 786, 446, 5, 0.6);
      pines(14, 100, 290, 180, 6, 0.55);
      pines(14, 14, 786, 92, 9, 0.5);
      base.keepOut(596, 102, 790, 448);
      ctx.landmark('rung-thong', 'Rừng thông', 690, 300, ctx.surface(690, 300) + 1);
      ctx.landmark('ho-thac', 'Hồ dưới thác', POND.x, POND.z + POND.r + 2);
      // Inside the walls the ground is paved (d-03): only the beds and the royal garden keep their grass.
      for (let x = WALLS.x0 + 2; x <= WALLS.x1 - 2; x++) {
        for (let z = WALLS.z0 + 2; z <= WALLS.z1 - 2; z++) {
          if (world.get(x, LEVEL, z) !== B.grass || inRect(x, z, GARDEN) || inRect(x, z, TRAINING) || beds.some((r) => inRect(x, z, r))) continue;
          put(world, x, LEVEL, z, (x * 3 + z * 7) % 23 === 0 ? B.paver : B.tile);
        }
      }
      // No wild trees in the wards round the courtyard (the castle's own trees are planted).
      const zone2 = ctx.zone(2);
      const [zx0, zx1, zz1] = [zone2.x - zone2.hx, zone2.x + zone2.hx, zone2.z + zone2.hz];
      for (const [x0, z0, x1, z1] of [[WALLS.x0 + 2, WALLS.z0 + 2, zx0 - 1, WALLS.z1 - 2], [zx1 + 1, WALLS.z0 + 2, WALLS.x1 - 2, WALLS.z1 - 2], [zx0, WALLS.z0 + 2, zx1, zone2.z - zone2.hz - 1], [zx0, zz1 + 1, zx1, WALLS.z1 - 2]] as const) ctx.keepOut(x0, z0, x1, z1);
    },
  });
}

await runIfMain(import.meta.url, generateLauDai);

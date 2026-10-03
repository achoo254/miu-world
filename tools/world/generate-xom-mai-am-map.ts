// Generates "Xóm Mái Ấm" (Tiếng Việt weeks 14–17, "Mái ấm gia đình") from a fixed seed, 800 x 800 blocks
// after the home frames of the owner's village detail mock (designs/lang-ven-song/d-03, d-04, d-05, d-07, d-13,
// d-14; the outdoor frames are Làng Ven Sông's): a cosy hamlet of cottages of cream stone under red tiled roofs
// (now and then a blue or an orange one), timber-framed, lanterns by their doors and flower boxes under their
// windows, each behind a front garden of flowers inside a white picket fence, a well or a haystack and a
// vegetable bed in the side yard, bamboo behind. Mẩy's family home in chapter 1 can be walked into and is laid
// out as d-13 (the supper table, the dresser, the iron stove, the checked bed, the rug, lanterns from the beams);
// the village well under its little timber roof stands on a paved ring (d-05); east of the middle fields the
// farm: the red barn with its stalls of cows and sheep inside (d-04, d-14), pens of cows, pigs and hens before
// it, the fenced vegetable garden with its pumpkins and the golden wheat field running down to the windmill
// (d-07). Lantern-lit trails join four districts, one per chapter. North-west, by the spawn: the flower garden
// and the lane of Mẩy's house with its duckweed pond (chapter 1). North-east: the porches round a moonlit yard
// and the warm stone den at the foot of the hill (chapter 2). South, round a big lotus lake crossed by a plank
// bridge: the old hut on the west shore below the slope up to grandpa's house (chapter 3), the far shore with
// the ferry landing, Mother Bống's grotto, the windy mound with its windmill and the fields of maize and
// carrots (chapter 4). Between them: more cottages, rice paddies, fenced vegetable plots, woods on the hills.
// Output: assets/generated/world/xom-mai-am/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { bambooHedge, cottagePalette, flowerBed, jetty, laneVerge, STREET_LANTERN } from './scenery';
import { doorSteps, placeHouse } from './structures/buildings';
import { cottageSize, placeWell, placeWindmill } from './structures/countryside';
import type { Point } from './structures/path';
import { placeAncientTree } from './structures/tree';
import { put } from './structures/world-writer';
import { placeFamilyHome, placeRedBarn, placeRoofedWell, type Room } from './structures/xom-mai-am-home';
import { animal, crowd, person, type Resident } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'xom-mai-am';
const WATER_LEVEL = 10;

/** What the hamlet's people hold at their chores. */
const LIFE_HELD = {
  basket: `${PACK.props}/basket.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  hoe: `${PACK.survival}/tool-hoe.glb`,
  book: `${PACK.props}/open-book.glb`,
  kite: `${PACK.props}/kite.glb`,
  crate: `${PACK.survival}/box.glb`,
  paddle: `${PACK.nature}/canoe_paddle.glb`,
  apple: `${PACK.food}/apple.glb`,
  pot: `${PACK.food}/pot-stew.glb`,
  bread: `${PACK.food}/bread.glb`,
  egg: `${PACK.food}/egg.glb`,
  cabbage: `${PACK.food}/cabbage.glb`,
};

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'vuon-hoa-ngo-nho', name: 'Vườn hoa và ngõ nhà Mẩy', x: 210, z: 150, hx: 44, hz: 34 },
  { chapter: 2, id: 'hien-nha-hang-da', name: 'Hiên nhà đêm trăng và hang đá', x: 560, z: 160, hx: 44, hz: 34 },
  { chapter: 3, id: 'choi-cu-con-doc', name: 'Chòi cũ bên bờ hồ và con dốc nhà ông', x: 215, z: 580, hx: 42, hz: 36 },
  { chapter: 4, id: 'ho-sen-canh-dong-gio', name: 'Hồ sen và cánh đồng gió', x: 600, z: 580, hx: 44, hz: 36 },
];

const SPAWN = { x: 110, z: 108 };
/** The big lotus lake between the two southern districts, and chapter 1's duckweed pond. */
const LAKE = { x: 400, z: 580, rx: 125, rz: 95 };
const POND = { x: 180, z: 206, r: 9 };
/** Hills with a flat top: grandpa's west of the slope, the den's in the north-east, the windy mound east of the lake. */
interface Hill {
  x: number;
  z: number;
  r: number;
  rise: number;
}
const GRANDPA_HILL: Hill = { x: 86, z: 590, r: 70, rise: 13 };
const DEN_HILL: Hill = { x: 706, z: 156, r: 76, rise: 14 };
const WIND_MOUND: Hill = { x: 716, z: 604, r: 34, rise: 6 };
const DEN = { x: 628, z: 160 };
/** Mẩy's family home (d-03, d-13), its door on -z toward her lane's yard: 21 x 15, a room of 17 x 11 inside its lining. */
const HOME = { x0: 214, z0: 158, w: 21, d: 15 };
/** The village well (d-05) under the old tree in the north. */
const WELL = { x: 400, z: 112 };
/** The farm east of the middle fields: the barn, its pens before it, the vegetable garden and the wheat (d-04, d-07, d-14). */
const BARN = { x0: 635, z0: 470, w: 25, d: 27 };
const PENS = [
  { x0: 622, z0: 436, x1: 643, z1: 463 },
  { x0: 651, z0: 436, x1: 674, z1: 463 },
];
const GARDEN = { x0: 664, z0: 473, x1: 732, z1: 497 };
const WHEAT = { x0: 664, z0: 503, x1: 784, z1: 542 };

/** The two village lanes across the map, north and south of the middle fields. */
const LANE_N: Point[] = [[24, 234], [200, 238], [400, 228], [600, 236], [776, 232]];
const LANE_S: Point[] = [[24, 420], [215, 416], [400, 426], [600, 418], [776, 422]];
/** The path round the lake's south shore, chapter 3 to chapter 4. */
const SHORE_S: Point[] = [[215, 616], [232, 706], [400, 714], [600, 706], [600, 616]];
/** The farm's track: from the south lane down past the pens to the barn door, and along the garden's north edge. */
const FARM_TRACK: Point[] = [[740, 421], [740, 467], [656, 467]];
/** Lanes between the two lanes, and up to the village well. */
const CROSS_LANES: Point[][] = [
  [[60, 236], [60, 418]],
  [[300, 233], [300, 421]],
  [[500, 232], [500, 422]],
  [[740, 234], [740, 421]],
  [[400, 228], [400, 119]],
];
const ROUTES: Point[][] = [
  // From the spawn to the lane and into chapter 1's zone; the way past the ride stops and the gate by the spawn.
  [[SPAWN.x, 105], [SPAWN.x, 236]],
  [[90, 105], [124, 105]],
  [[117, 105], [117, 110]],
  [[SPAWN.x, 140], [210, 150]],
  LANE_N,
  LANE_S,
  ...CROSS_LANES,
  // Spurs into the zones: Mẩy's lane (on to the flower garden's gate and through it, and to the duckweed
  // pond), the moonlit lane, down to the lake shores.
  [[210, 237], [210, 150]],
  [[210, 150], [210, 131], [222, 131], [226, 135], [239, 135]],
  [[210, 146], [234, 146]],
  [[210, 190], [186, 190]],
  [[560, 235], [560, 160]],
  [[215, 416], [215, 590]],
  [[600, 418], [600, 590]],
  // Into the den and up to its carved wall, up the slope to grandpa's house and over its top, across the lake
  // on a plank bridge, down to the beach and the pebble strand, along the south shore to Mother Bống's grotto.
  [[560, 160], [DEN.x, DEN.z]],
  // Across the moonlit yard to the bamboo bed, and on through the sapodilla garden's east fence to its tree.
  [[560, 160], [560, 149], [548, 149], [548, 138], [536, 138]],
  [[618, 160], [618, 144]],
  [[215, 580], [173, 575], [96, 590], [64, 572]],
  [[215, 590], [600, 590]],
  [[262, 574], [262, 604]],
  SHORE_S,
  [[512, 709], [510, 639]],
  [[400, 714], [400, 680]],
  [[600, 590], [WIND_MOUND.x, WIND_MOUND.z]],
  // To the chestnut tree, from the mound down between the fields into the windy field, and through the rice
  // on the dyke between the two lanes.
  [[600, 560], [628, 560]],
  [[714, 606], [714, 630], [723, 640], [723, 700]],
  [[400, 226], [400, 428]],
  // Into the drying yard from the lane to the well; down the farm's track past the garden to the wheat; into the maize.
  [[392, 170], [400, 170]],
  [[740, 467], [740, 500], [690, 500]],
  [[676, 598], [676, 569]],
  // The farm: between the pens to the barn door, and its track.
  [[647, 421], [647, 468]],
  FARM_TRACK,
];
/** Rice paddies (inclusive) in the middle fields and south of the lake. */
const PADDIES = [
  { x0: 312, z0: 298, x1: 488, z1: 404 },
  { x0: 70, z0: 306, x1: 180, z1: 376 },
  { x0: 616, z0: 306, x1: 730, z1: 376 },
  { x0: 420, z0: 724, x1: 588, z1: 782 },
];

const N = PACK.nature;
const M = {
  bamboo: `${N}/crops_bambooStageB.glb`,
  fatTree: `${N}/tree_fat.glb`,
  palm: `${N}/tree_palmTall.glb`,
  banana: `${N}/tree_palmShort.glb`,
  oak: `${N}/tree_oak.glb`,
  flowerRed: `${N}/flower_redA.glb`,
  flowerYellow: `${N}/flower_yellowB.glb`,
  flowerPurple: `${N}/flower_purpleA.glb`,
  bush: `${N}/plant_bushLarge.glb`,
  pebble: `${N}/rock_smallA.glb`,
  fence: `${N}/fence_simple.glb`,
  lily: `${N}/lily_large.glb`,
  lilySmall: `${N}/lily_small.glb`,
  canoe: `${N}/canoe.glb`,
  corn: `${N}/crops_cornStageD.glb`,
  cornYoung: `${N}/crops_cornStageB.glb`,
  carrot: `${N}/crop_carrot.glb`,
  dirtRow: `${N}/crops_dirtRow.glb`,
  cabbage: `${N}/crops_leafsStageB.glb`,
  rice: `${N}/crops_wheatStageA.glb`,
  riceRipe: `${N}/crops_wheatStageB.glb`,
  rock: `${N}/rock_largeB.glb`,
  logs: `${N}/log_stack.glb`,
  jar: `${N}/pot_large.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  crate: `${PACK.survival}/box-large.glb`,
  hammock: `${PACK.survival}/bedroll.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  chair: `${PACK.furniture}/chairRounded.glb`,
  table: `${PACK.furniture}/table.glb`,
  bowl: `${PACK.food}/bowl-soup.glb`,
  egg: `${PACK.food}/egg.glb`,
  lotus: `${PACK.props}/lotus.glb`,
  loofah: `${PACK.props}/cucumber.glb`,
  door: `${PACK.props}/door.glb`,
  shell: `${PACK.props}/spiral-shell.glb`,
  hat: `${PACK.props}/womans-hat.glb`,
  kite: `${PACK.props}/kite.glb`,
  plant: `${PACK.props}/potted-plant.glb`,
  picture: `${PACK.props}/framed-picture.glb`,
  pictureYellow: `${PACK.props}/framed-picture-yellow.glb`,
};
/** The home frames' things built of boxes (content/world/box-props/xom-mai-am.json). */
const X = Object.fromEntries(
  [
    'picket', 'rail-fence', 'cow', 'cabbage', 'dining-table', 'bench', 'bed', 'stove', 'rug', 'dresser', 'hanging-lantern', 'curtains', 'wall-shelf', 'sheep',
    'hay-bale', 'hay-pile', 'trough', 'milk-can', 'hanging-bucket', 'pumpkin', 'flower-pot', 'gate-sign', 'coop',
  ].map((id) => [id, `${PACK.box}/xma-${id}.glb`]),
) as Record<string, string>;
const box = (id: string): string => X[id] ?? '';
const FLOWERS = [M.flowerRed, M.flowerYellow, M.flowerPurple];
const YARD_TREES = [M.fatTree, M.palm, M.banana, M.oak];

/** Height a hill adds at a column: a dome with a flat top, so a house stands level on it. */
const hill = (h: Hill, x: number, z: number): number => {
  const d = Math.hypot(x - h.x, z - h.z) / h.r;
  return d >= 1 ? 0 : h.rise * Math.min(1, (1 - d * d) * 1.6);
};

/** The drying yard's haystacks alternate between its two edges. */
const x0Yard = (z: number): number => (Math.floor(z / 8) % 2 === 0 ? 378 : 392);
const inEllipse = (e: { x: number; z: number; rx: number; rz: number }, x: number, z: number): boolean => ((x - e.x) / e.rx) ** 2 + ((z - e.z) / e.rz) ** 2 < 1;
const inWater = (x: number, z: number): boolean => inEllipse(LAKE, x, z) || Math.hypot(x - POND.x, z - POND.z) < POND.r;
/** Row of the lake's shore at a column (north or south side), or undefined past its ends. */
const lakeShoreZ = (x: number, side: -1 | 1): number | undefined => {
  const t = (x - LAKE.x) / LAKE.rx;
  return Math.abs(t) >= 1 ? undefined : LAKE.z + side * LAKE.rz * Math.sqrt(1 - t * t);
};

type Rect = readonly [number, number, number, number];

/** The map's builders, sharing what has been claimed so the villages fill only what is left. */
function builders(ctx: ZoneMapContext) {
  const { world, block } = ctx;
  const B = {
    grass: ctx.soil.grass, dirt: block('dirt'), sand: block('sand'), stone: block('stone'), path: block('path'), planks: block('planks'), log: block('log'),
    grey: block('brick-grey'), moss: block('rock-moss'), water: block('water'), leaves: block('leaves'), pink: block('leaves-pink'), board: block('board'), red: block('wood-red'),
    white: block('snow'), tile: block('brick-red'), cobble: block('cobble'), cobbleGrey: block('cobble-grey'), farmland: block('farmland'), wheat: block('wheat'), lantern: block('lantern'),
  };
  const palette = cottagePalette(ctx);
  // Mostly cream stone under red tiles as the mock's cottages (d-03), now and then birch or plank walls, a blue or orange roof.
  const WALLS = [B.sand, B.sand, block('birch-log'), B.sand, B.planks];
  const ROOFS = [B.tile, B.tile, block('roof-blue'), B.tile, B.red];
  const claimed: Rect[] = [];
  const [SX, , SZ] = world.size;
  const cellOf = (x: number, z: number): number => x + z * SX;
  const inMap = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < SX && z < SZ;
  /** Columns a walk keeps off: what is claimed, and the fenced gardens the map leaves open for its quests. */
  const noWalk = new Uint8Array(SX * SZ);
  /** Columns of the walks laid from the doors to the lanes: with the lanes, the way network. */
  const walked = new Uint8Array(SX * SZ);
  const avoid = (x0: number, z0: number, x1: number, z1: number): void => {
    for (let x = Math.max(0, x0); x <= Math.min(SX - 1, x1); x++) for (let z = Math.max(0, z0); z <= Math.min(SZ - 1, z1); z++) noWalk[cellOf(x, z)] = 1;
  };
  const claim = (x0: number, z0: number, x1: number, z1: number): void => {
    claimed.push([x0, z0, x1, z1]);
    ctx.keepOut(x0, z0, x1, z1);
    avoid(x0, z0, x1, z1);
  };
  const isClaimed = (x0: number, z0: number, x1: number, z1: number): boolean => claimed.some(([a, b, c, d]) => x0 <= c && x1 >= a && z0 <= d && z1 >= b);
  const paint = (x: number, z: number, id: number): void => {
    if (!ctx.onPath(x, z) && !ctx.inWater(x, z)) world.set(x, ctx.surface(x, z), z, id);
  };
  const onWay = (x: number, z: number): boolean => ctx.onPath(x, z) || walked[cellOf(x, z)] === 1;
  /** The top block of a column as built so far (a levelled plot stands higher than the bare terrain). */
  const topAt = (x: number, z: number): number => {
    const s = ctx.surface(x, z);
    for (let y = s + 10; y > s - 4; y--) if (world.get(x, y, z) !== 0) return y;
    return s;
  };
  const soilTops = new Set([B.grass, B.dirt, B.sand]);

  /**
   * A walk two blocks wide from (x, z) to the nearest way (a lane, or a walk laid before), round what is
   * claimed, the water and anything standing, a block up or down at a time (owner, 02/10/2026: from every door
   * a way to wherever the child goes). Painted in the lanes' soil over grass, kept clear of trees and of the
   * houses placed after it. Returns whether it reached a way.
   */
  const walkToWay = (x: number, z: number, reach = 110): boolean => {
    if (!inMap(x, z)) return false;
    const start = cellOf(x, z);
    const from = new Map<number, number>([[start, -1]]);
    const queue = [start];
    let end = -1;
    for (let i = 0; i < queue.length && end === -1; i++) {
      const c = queue[i] ?? start;
      const [cx, cz] = [c % SX, Math.floor(c / SX)];
      if (onWay(cx, cz)) {
        end = c;
        break;
      }
      const top = topAt(cx, cz);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const [nx, nz] = [cx + dx, cz + dz];
        const n = cellOf(nx, nz);
        if (!inMap(nx, nz) || from.has(n) || Math.max(Math.abs(nx - x), Math.abs(nz - z)) > reach) continue;
        if (noWalk[n] === 1 || ctx.inWater(nx, nz) || Math.abs(topAt(nx, nz) - top) > 1) continue;
        from.set(n, c);
        queue.push(n);
      }
    }
    if (end === -1) return false;
    for (let c = from.get(end) ?? -1; c !== -1; c = from.get(c) ?? -1) {
      const [cx, cz] = [c % SX, Math.floor(c / SX)];
      for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const [px, pz] = [cx + dx, cz + dz];
        const n = cellOf(px, pz);
        if (!inMap(px, pz) || walked[n] === 1 || noWalk[n] === 1 || ctx.inWater(px, pz)) continue;
        const top = topAt(px, pz);
        if (!soilTops.has(world.get(px, top, pz))) continue;
        world.set(px, top, pz, ctx.soil.path);
        walked[n] = 1;
        ctx.keepOut(px, pz, px, pz);
      }
    }
    return true;
  };

  /** Raises every column of a rectangle to its highest one (dirt under grass); returns that height. */
  const levelPlot = (x0: number, z0: number, x1: number, z1: number): number => {
    let base = 0;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) base = Math.max(base, ctx.surface(x, z));
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const h = ctx.surface(x, z);
        for (let y = h; y < base; y++) world.set(x, y, z, B.dirt);
        if (h < base) world.set(x, base, z, B.grass);
      }
    }
    return base;
  };

  /** A porch along a house's front (-z) under eaves at `eaves`: a plank floor, a roof carrying on from them, a post at each end. */
  const porch = (x0: number, z0: number, w: number, base: number, roof: number, eaves: number): void => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0 - 3; z < z0; z++) world.set(x, base, z, B.planks);
    for (let x = x0 - 1; x <= x0 + w; x++) for (let z = z0 - 3; z <= z0 - 2; z++) put(world, x, eaves, z, roof);
    for (const x of [x0, x0 + w - 1]) for (let y = base + 1; y < eaves; y++) put(world, x, y, z0 - 3, B.log);
  };

  /** A haystack: a low dome of straw. */
  const haystack = (cx: number, cz: number, base: number): void => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(world, cx + dx, base + 1, cz + dz, B.sand);
    put(world, cx, base + 2, cz, B.sand);
  };

  /** A run of fence props (two blocks each) from (x0, z0) along x or z for `length` blocks, skipping the paths and `gap` (inclusive). */
  const fenceRun = (model: string, x0: number, z0: number, along: 'x' | 'z', length: number, gap?: readonly [number, number]): void => {
    for (let i = 0; i + 1 < length; i += 2) {
      const [x, z] = along === 'x' ? [x0 + i, z0] : [x0, z0 + i];
      const t = along === 'x' ? x : z;
      if (gap && t + 1.5 > gap[0] && t - 0.5 < gap[1] + 1) continue;
      if (ctx.onPath(x, z) || ctx.onPath(along === 'x' ? x + 1 : x, along === 'x' ? z : z + 1)) continue;
      ctx.prop(model, x, z, along === 'x' ? 0 : 90);
    }
  };

  /**
   * The front garden of d-03 before a house whose doorway (its first column and width) is on row `z` (the walls
   * run xa+1..xb-1): a cobbled walk as wide as the doorway from the door to the gate, beds of flowers either
   * side, bushes at its corners, a white picket fence round it with the gate open; a lantern post by every
   * other gate, the family's sign by every third.
   */
  const frontGarden = (xa: number, xb: number, z: number, base: number, doorway: { x0: number; width: number }, n: number, depth = 7): void => {
    const [walk0, walk1] = [doorway.x0, doorway.x0 + doorway.width - 1];
    for (let zz = z - depth - 1; zz <= z; zz++) for (let x = walk0; x <= walk1; x++) world.set(x, base, zz, B.cobble);
    fenceRun(box('picket'), xa, z - depth - 1, 'x', xb - xa + 1, [walk0, walk1]);
    for (const x of [xa, xb]) fenceRun(box('picket'), x, z - depth, 'z', depth);
    for (let x = xa + 1; x < xb; x += 2) {
      if (x >= walk0 - 1 && x <= walk1 + 1) continue;
      const zz = z - depth + 1 + (x % 4 === 0 ? 0 : 2);
      ctx.prop(FLOWERS[(x + zz + n) % 3] ?? M.flowerRed, x, zz, (x * 17 + zz * 29) % 360);
    }
    for (const x of [xa + 1, xb - 1]) {
      put(world, x, base + 1, z - 2, (x + n) % 2 === 0 ? B.leaves : B.pink);
      if (n % 3 === 0) put(world, x, base + 2, z - 2, B.leaves);
    }
    if (n % 2 === 0) ctx.prop(STREET_LANTERN, walk1 + 2, z - depth - 2, 0);
    if (n % 3 === 1) ctx.prop(box('gate-sign'), walk0 - 2, z - depth - 2, 180);
  };

  let homes = 0;
  /**
   * A cottage of d-03 whose corner is at (x, z), its door on side -z: the detailed house of the shared cottage's
   * size (13–17 x 11–12, walls seven high, a doorway three wide; stone foot, timber frame, glazed windows over
   * flower boxes, lanterns by the door, chimney), its front garden, in the side yard a well or a haystack, a
   * vegetable bed and a fruit tree, bamboo behind. Returns the house's width, its ground and its door column.
   */
  const homestead = (x: number, z: number, opts: { hammock?: boolean; chair?: boolean } = {}): { w: number; base: number; doorX: number } => {
    const n = homes++;
    const { w, d, wallHeight } = cottageSize(n);
    const plot: Rect = [x - 2, z - 9, x + w + 7, z + d + 3];
    const base = levelPlot(...plot);
    const roof = ROOFS[(n * 2 + Math.floor(n / 5)) % ROOFS.length] ?? B.tile;
    const front = placeHouse(world, x, z, w, d, wallHeight, base + 1, { ...palette.finish, wall: WALLS[n % WALLS.length] ?? B.sand, roof, trim: palette.trim });
    for (const [bx, by, bz] of front.boxes) ctx.propAt(FLOWERS[(Math.floor(bx) + n) % 3] ?? M.flowerRed, [bx, by, bz], n * 23);
    const doorX = x + Math.floor(w / 2);
    if (opts.hammock) {
      porch(x, z, w, base, roof, base + 6);
      ctx.propAt(M.hammock, [x + 2.5, base + 1.6, z - 1.5], 90);
    }
    frontGarden(x - 2, x + w + 1, z, base, front.doorway, n, opts.hammock ? 6 : 7);
    if (opts.chair) {
      // A cobbled terrace along the front from the walk to the rattan chair at its end.
      for (let tx = front.doorway.x0 + front.doorway.width; tx < x + w; tx++) for (const tz of [z - 3, z - 2]) world.set(tx, base, tz, B.cobble);
      ctx.centred(M.chair, x + w - 2, z - 2, 200);
    }
    // The side yard: a well or a haystack, a vegetable bed, a fruit tree; firewood and bamboo behind.
    const yx = x + w + 2;
    if (n % 2 === 0) {
      placeWell(world, yx + 2, z + 1, base, { stone: B.grey, water: B.water });
      ctx.prop(M.bucket, yx, z + 1, n * 41);
    } else haystack(yx + 2, z + 1, base);
    for (let i = 0; i < 3; i++) ctx.prop(i === 1 ? M.carrot : M.cabbage, yx + i * 2, z + 5, i * 70 + n);
    ctx.prop(YARD_TREES[n % YARD_TREES.length] ?? M.fatTree, yx + 3, z - 5, n * 37);
    ctx.prop(M.logs, x + w - 2, z + d + 1, 0);
    for (let bx = x - 1; bx <= x + w + 6; bx += 9) ctx.prop(M.bamboo, bx, z + d + 2, (bx * 37) % 360);
    claim(...plot);
    walkOut(front.doorway, plot[1], z - (opts.hammock ? 6 : 7) - 2, base);
    return { w, base, doorX };
  };
  /**
   * From a garden gate out to the lanes: the cobbled walk carried on from the gate (row `gateOut`) to the
   * plot's edge (row `edge`), steps down where the plot stands above the ground beyond, then a walk to the
   * nearest way, as wide as the doorway where it leaves.
   */
  const unwalked: Array<[number, number]> = [];
  const walkOut = (doorway: { x0: number; width: number }, edge: number, gateOut: number, base: number): void => {
    const cols = Array.from({ length: doorway.width }, (_, i) => doorway.x0 + i);
    for (let zz = edge; zz <= gateOut; zz++) for (const x of cols) world.set(x, base, zz, B.cobble);
    doorSteps(world, doorway.x0, doorway.width, edge, base + 1, (sx, sz) => topAt(sx, sz) + 1, ctx.soil.path);
    let reached = false;
    for (const x of cols) reached = walkToWay(x, edge - 1) || reached;
    if (!reached) unwalked.push([doorway.x0, edge]);
  };

  /**
   * Cottages in rows filling a rectangle, lanes between the rows, gaps of different widths between them
   * and now and then an orchard corner instead of a house; skips zones, water, paths, hills and what is claimed.
   */
  const village = (x0: number, z0: number, x1: number, z1: number): void => {
    for (let row = 0, z = z0 + 9; z + 15 <= z1; z += 30, row++) {
      let x = x0 + 2 + (row % 2) * 6;
      while (x + 22 <= x1) {
        const { w, d } = cottageSize(homes);
        const zz = z + ((x * 7 + row * 3) % 3) - 1;
        const plot: Rect = [x - 2, zz - 9, x + w + 7, zz + d + 3];
        if (!plotFree(plot)) {
          x += 4;
          continue;
        }
        if (ctx.rng() < 0.14) orchard(x, zz);
        else homestead(x, zz);
        x += w + 12 + Math.floor(ctx.rng() * 7);
      }
    }
  };
  /** A corner of fruit trees with a haystack and a bench where a cottage could have stood. */
  const orchard = (x: number, z: number): void => {
    for (let i = 0; i < 6; i++) ctx.prop(YARD_TREES[(i + x) % YARD_TREES.length] ?? M.oak, x + (i % 3) * 6, z - 6 + Math.floor(i / 3) * 8, i * 50 + x);
    haystack(x + 3, z + 6, ctx.surface(x + 3, z + 6));
    ctx.prop(M.bench, x + 9, z - 1, 0);
    claim(x - 2, z - 9, x + 16, z + 11);
  };
  const plotFree = ([x0, z0, x1, z1]: Rect): boolean => {
    // The plot and the strip before its gate, where its walk sets out.
    if (x0 < 14 || z0 < 16 || x1 > 785 || z1 > 785 || isClaimed(x0, z0 - 2, x1, z1)) return false;
    if (Math.hypot((x0 + x1) / 2 - SPAWN.x - 4, (z0 + z1) / 2 - SPAWN.z) < 26) return false;
    let lo = Infinity;
    let hi = -Infinity;
    for (let x = x0 - 4; x <= x1 + 4; x++) {
      for (let z = z0 - 4; z <= z1 + 4; z++) {
        if (onWay(x, z) || ctx.inWater(x, z) || ctx.inZone(x, z)) return false;
        if (x >= x0 && x <= x1 && z >= z0 && z <= z1) {
          const h = ctx.surface(x, z);
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
      }
    }
    return hi - lo <= 3;
  };

  /** Flooded plots inside earth dykes, rice every few columns (young, ripe here and there). */
  const paddy = (p: { x0: number; z0: number; x1: number; z1: number }): void => {
    for (let x = p.x0; x <= p.x1; x++) {
      for (let z = p.z0; z <= p.z1; z++) {
        const dyke = (x - p.x0) % 12 === 0 || (z - p.z0) % 9 === 0 || x === p.x1 || z === p.z1;
        if (dyke || ctx.onPath(x, z) || ctx.inWater(x, z)) continue;
        world.set(x, ctx.surface(x, z), z, B.water);
        if ((x - p.x0) % 5 === 2 && (z - p.z0) % 4 === 1) ctx.prop((x + z) % 7 < 3 ? M.riceRipe : M.rice, x, z, (x * 13 + z * 7) % 360);
      }
    }
    claim(p.x0, p.z0, p.x1, p.z1);
  };

  /** A fenced plot (inclusive) of a crop in rows four blocks apart on tilled earth, a rail fence round it, claimed. */
  const field = (x0: number, z0: number, x1: number, z1: number, crop: string): void => {
    for (let x = x0 + 2; x < x1 - 1; x += 3) {
      for (let z = z0 + 2; z < z1 - 1; z += 4) {
        if (ctx.onPath(x, z)) continue;
        paint(x, z, B.farmland);
        ctx.prop(crop, x, z, (x * 31 + z * 7) % 360);
      }
    }
    for (const z of [z0, z1]) fenceRun(M.fence, x0, z, 'x', x1 - x0 + 1);
    for (const x of [x0, x1]) fenceRun(M.fence, x, z0 + 2, 'z', z1 - z0 - 2);
    claim(x0, z0, x1, z1);
  };

  /** A scarecrow: a log post with plank arms, a straw head and a sun hat. */
  const scarecrow = (x: number, z: number, y = ctx.surface(x, z)): void => {
    for (let k = 1; k <= 3; k++) put(world, x, y + k, z, B.log);
    for (const dx of [-1, 1]) put(world, x + dx, y + 2, z, B.log);
    put(world, x, y + 4, z, B.sand);
    ctx.propAt(M.hat, [x + 0.5, y + 5, z + 0.5], 0);
  };

  /** A cave of mossy rock: a dome shell of radius `r` and `h` high over the level `y0` at (cx, cz), its mouth facing -x. */
  const cave = (cx: number, cz: number, r: number, h: number, y0: number): void => {
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) {
        for (let dy = 1; dy <= h + 1; dy++) {
          const d = (dx / r) ** 2 + (dz / r) ** 2 + (dy / h) ** 2;
          const mouth = dx < 0 && Math.abs(dz) <= 1 && dy <= 3;
          if (d <= 1 && d > 0.55 && !mouth) world.set(cx + dx, y0 + dy, cz + dz, B.moss);
          else if (d <= 0.55 || (mouth && d <= 1)) world.set(cx + dx, y0 + dy, cz + dz, 0);
        }
      }
    }
  };

  const isClaimedAt = (x: number, z: number): boolean => isClaimed(x, z, x, z);
  return { B, palette, claim, avoid, isClaimed, isClaimedAt, onWay, walkToWay, walkOut, unwalkedDoors: (): ReadonlyArray<readonly [number, number]> => unwalked, paint, levelPlot, porch, haystack, fenceRun, frontGarden, homestead, village, paddy, field, scarecrow, cave };
}

/**
 * Mẩy's family home as d-13 (seen from the door, looking in): the supper table with its benches on the left,
 * the dresser behind it, the iron stove in the far right corner, the bed with its checked quilt along the right
 * wall, the rug in the middle, curtains at every window, a shelf of jars, the family's pictures between the back
 * windows, lanterns hung from the beams and on the walls. The furniture keeps to the walls with two blocks or
 * more between each piece and the next, and the middle stays open from the door to the back wall (owner,
 * 02/10/2026: room to move inside). Returns the middle of the room.
 */
function furnishHome(ctx: ZoneMapContext, room: Room, beams: readonly number[], wallHeight: number, windows: { back: readonly number[]; front: readonly number[]; sides: readonly number[] }): [number, number] {
  const { x0, z0, x1, z1, floorY: y } = room;
  const lantern = ctx.block('lantern');
  // Left (+x): the table along z between two benches, two blocks clear of the side wall and of the front; the
  // dresser against the back wall behind it.
  const table: [number, number] = [x1 - 2.5, z0 + 4.5];
  ctx.propAt(box('dining-table'), [table[0], y, table[1]], 90);
  for (const dx of [-1.35, 1.35]) ctx.propAt(box('bench'), [table[0] + dx, y, table[1]], 90);
  ctx.propAt(box('dresser'), [table[0], y, z1 + 0.68], 0);
  ctx.propAt(box('wall-shelf'), [x1 + 0.98, y + 2.1, z0 + 1.5], 90);
  // Right (-x): the stove in the far corner with its firewood beside it, the bed with its head on the right wall.
  ctx.propAt(box('stove'), [x0 + 1.2, y, z1 + 0.5], 0);
  ctx.propAt(M.logs, [x0 + 2.6, y, z1 + 0.5], 0);
  ctx.propAt(box('bed'), [x0 + 1.4, y, z0 + 6.6], 270);
  ctx.propAt(M.plant, [x0 + 0.5, y, z0 + 0.5], 0);
  ctx.propAt(box('flower-pot'), [x1 + 0.5, y, z0 + 0.5], 0);
  // The middle: the rug, the family's pictures between the back windows.
  ctx.propAt(box('rug'), [(x0 + x1 + 1) / 2, y, (z0 + z1 + 1) / 2], 0);
  ctx.propAt(M.picture, [(x0 + x1 + 1) / 2 - 0.7, y + 1.6, z1 + 0.92], 180);
  ctx.propAt(M.pictureYellow, [(x0 + x1 + 1) / 2 + 0.7, y + 1.4, z1 + 0.92], 180);
  // Curtains at every window, lanterns from the beams, lanterns on the side walls.
  for (const x of windows.back) ctx.propAt(box('curtains'), [x + 0.5, y + 1.3, z1 + 0.96], 0);
  for (const x of windows.front) ctx.propAt(box('curtains'), [x + 0.5, y + 1.3, z0 + 0.04], 180);
  for (const z of windows.sides) {
    ctx.propAt(box('curtains'), [x0 + 0.04, y + 1.3, z + 0.5], 270);
    ctx.propAt(box('curtains'), [x1 + 0.96, y + 1.3, z + 0.5], 90);
  }
  for (const z of beams) for (const x of [x0 + 4, x1 - 4]) ctx.propAt(box('hanging-lantern'), [x + 0.5, y + wallHeight - 1.4, z + 0.5], 0);
  for (const z of [z0 + 1, z1 - 1]) {
    put(ctx.world, x0 - 1, y + 2, z, lantern);
    put(ctx.world, x1 + 1, y + 2, z, lantern);
  }
  return [Math.floor((x0 + x1) / 2), Math.floor((z0 + z1) / 2)];
}

/**
 * The barn's inside as d-14: cows and sheep in the stalls behind a rail along the aisle, a trough of hay inside
 * each stall's front and straw at its back, hay bales stacked in the front corners, buckets and milk cans along the aisle's edges with its middle left clear, lanterns hung over it.
 */
function furnishBarn(ctx: ZoneMapContext, barn: ReturnType<typeof placeRedBarn>, baseY: number): void {
  const { room, stalls, partitions, aisle, beams } = barn;
  const mid = (room.x0 + room.x1) / 2 + 0.5;
  const y = baseY;
  // Rail fences between the stalls.
  for (const p of partitions) for (let x = p.x0; x < p.x1; x += 2) ctx.propAt(box('rail-fence'), [x + 1, y, p.z + 0.5], 0);
  for (const [i, s] of stalls.entries()) {
    // The rail and the trough just inside the front, straw at the back by the wall, the beasts between facing the aisle.
    const front = mid + s.side * (aisle + 0.5);
    ctx.propAt(box('rail-fence'), [front, y, s.z + 0.5], 90);
    ctx.propAt(box('trough'), [front + s.side * 0.5, y, s.z], 90);
    ctx.propAt(box('hay-pile'), [s.x + 0.5 + s.side * 2.2, y, s.z + 0.5], 90 + i * 20);
    const facing = s.side < 0 ? 270 : 90;
    if ((i + (s.side < 0 ? 0 : 1)) % 3 === 2) {
      ctx.propAt(box('sheep'), [s.x + 0.5 - s.side * 0.4, y, s.z - 0.6], facing + 10);
      ctx.propAt(box('sheep'), [s.x + 0.5 + s.side * 0.4, y, s.z + 1.6], facing - 20);
    } else ctx.propAt(box('cow'), [s.x + 0.5, y, s.z + 0.5], facing);
  }
  // Hay bales stacked in the front corners, off the aisle.
  for (const x of [room.x0 + 0.6, room.x1 + 0.4]) {
    for (let k = 0; k < 2; k++) ctx.propAt(box('hay-bale'), [x, y, room.z0 + 0.5 + k * 0.85], 0);
    ctx.propAt(box('hay-bale'), [x, y + 0.86, room.z0 + 0.9], 0);
  }
  const edge = aisle - 0.3;
  for (const [dx, dz, model] of [[-edge, 5.2, M.bucket], [edge, 9.8, box('milk-can')], [-edge, 14.6, box('milk-can')], [edge, 18.5, M.bucket], [-edge, 21.6, M.barrel]] as const) {
    ctx.propAt(model, [mid + dx, y, room.z0 + dz], dz * 30);
  }
  for (const z of beams) ctx.propAt(box('hanging-lantern'), [mid, y + 7 - 1.4, z + 0.5], 0);
}

export async function generateXomMaiAm() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'xom-mai-am',
    seedText: 'miu-xom-mai-am',
    outland: 'hamlet',
    soil: { grass: 'grass-hamlet', path: 'trail' },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    water: { level: WATER_LEVEL, covers: inWater },
    shape: (x, z, h) => h + hill(GRANDPA_HILL, x, z) + hill(DEN_HILL, x, z) + hill(WIND_MOUND, x, z),
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: { skip: 0.72, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.1 ? 'leaves-autumn' : roll < 0.32 ? 'leaves-pink' : 'leaves') }) },
    dressing: { models: [M.flowerRed, M.flowerYellow, M.flowerPurple, M.bush, M.pebble], spacing: 7 },
    // Family life in and round every house: cooking, washing, watering, the farm's chores, kites on the windy
    // mound, pets and hens.
    life: ({ landmark }) => {
      const room = landmark('trong-nha-may');
      const at = (dx: number, dz: number): readonly [number, number] => [room[0] + dx, room[1] + dz];
      const barn = landmark('trong-chuong');
      const home: Resident[] = [
        // In Mẩy's home (d-13): mother at the stove, the table and the dresser; grandpa by the table; the cat on the rug.
        { routine: 'home-cook', name: 'Mẹ Mẩy nấu cơm', model: person('l'), held: [LIFE_HELD.pot, LIFE_HELD.bread], at: at(-5, 3), visits: [at(-5, 3), at(2, 0), at(4, 3)] },
        { routine: 'reader', name: 'Ông đọc báo', model: person('a'), held: [LIFE_HELD.book], at: at(2, -3), visits: [at(2, -3), at(-1, -1), at(1, 2)] },
        { routine: 'cat', name: 'Mèo mướp nhà Mẩy', model: animal('cat'), at: at(0, 1) },
        // In the barn (d-14): the milker down the aisle between the stalls.
        { routine: 'milker', name: 'Bác vắt sữa', model: person('m'), held: [LIFE_HELD.bucket], at: [barn[0], barn[1] - 4], visits: [[barn[0], barn[1] - 4], [barn[0], barn[1]], [barn[0], barn[1] + 4]] },
      ];
      const spawnLife: Resident[] = [
        // 0. Village entrance and spawn terminal: elder, returning shoppers, waiting children.
        { routine: 'school-guard', name: 'Bác trưởng thôn', model: person('d'), at: [SPAWN.x + 3, SPAWN.z + 2] },
        { routine: 'shopper', name: 'Bà đi chợ về', model: person('i'), held: [LIFE_HELD.basket], at: [SPAWN.x - 2, SPAWN.z + 4] },
        { routine: 'pupil', name: 'Bé đón bà đầu ngõ', model: person('f'), at: [SPAWN.x + 1, SPAWN.z + 6] },
        { routine: 'sweeper', name: 'Chú quét lối xóm', model: person('j'), at: [SPAWN.x - 5, SPAWN.z - 2] },
        { routine: 'dog', name: 'Chó Vàng đầu ngõ', model: animal('dog'), at: [SPAWN.x + 5, SPAWN.z - 3] },
      ];
      return [
        ...spawnLife,
        ...home,
        // Chapter 1: Vườn hoa và ngõ nhà Mẩy (x: ~210, z: ~150).
        ...crowd('laundry', ['Bà Mẩy phơi đồ'], [person('i')], landmark('nha-may'), 9, 1, [LIFE_HELD.basket]),
        ...crowd('pupil', ['Bé Bi nhà Mẩy', 'Anh Tí nhà Mẩy'], [person('f'), person('o')], landmark('nha-may'), 6, 2),
        ...crowd('pupil', ['Bạn nhỏ nhảy dây'], [person('n'), person('q')], landmark('bui-tre-dau-ngo'), 6, 2),
        ...crowd('pupil', ['Bạn nhỏ chơi ô ăn quan'], [person('o'), person('p')], landmark('ghe-may-ben-ngo'), 5, 2),
        ...crowd('vendor', ['Cô bán quà vặt'], [person('h')], landmark('goc-sung'), 8, 1, [LIFE_HELD.basket]),
        ...crowd('sweeper', ['Bác quét ngõ hoa'], [person('a')], landmark('cong-vuon-hoa'), 6, 1),
        ...crowd('home-cook', ['Bác Năm nấu cơm', 'Cô Hai nấu chè'], [person('e'), person('h')], landmark('vuon-hoa'), 22, 2, [LIFE_HELD.basket]),
        ...crowd('laundry', ['Mẹ phơi đồ', 'Chị phơi áo'], [person('e'), person('h')], landmark('san-phoi'), 12, 4, [LIFE_HELD.basket]),
        ...crowd('waterer', ['Ông tưới cây', 'Bà tưới rau'], [person('a'), person('i')], landmark('vuon-hoa'), 14, 3, [LIFE_HELD.bucket]),
        ...crowd('waterer', ['Bà múc nước giếng', 'Chú gánh nước'], [person('i'), person('k')], landmark('gieng-xom'), 7, 2, [LIFE_HELD.bucket]),
        ...crowd('waterer', ['Chú tưới giàn mướp'], [person('k')], landmark('gian-muop'), 5, 1, [LIFE_HELD.bucket]),
        ...crowd('ploughman', ['Bác chăm luống cải'], [person('m')], landmark('luong-cai'), 6, 1, [LIFE_HELD.hoe]),
        ...crowd('hen-keeper', ['Bà cho gà ăn'], [person('i')], landmark('to-rom'), 6, 1, [LIFE_HELD.basket, LIFE_HELD.egg]),
        ...crowd('chick', ['Gà con'], [animal('chick')], landmark('to-rom'), 7, 10),

        // Chapter 2: Hiên nhà đêm trăng và hang đá (x: ~560, z: ~160).
        ...crowd('teacher', ['Bà kể chuyện cổ tích'], [person('i')], landmark('chong-tre'), 4, 1, [LIFE_HELD.book]),
        ...crowd('pupil', ['Bạn nhỏ nghe kể chuyện'], [person('f'), person('o'), person('r')], landmark('chong-tre'), 8, 3, [LIFE_HELD.book]),
        ...crowd('pupil', ['Bạn trốn tìm gốc khế'], [person('n'), person('p')], landmark('goc-khe'), 6, 2),
        ...crowd('pupil', ['Bạn hái quả vú sữa'], [person('q')], landmark('cay-vu-sua'), 6, 1, [LIFE_HELD.apple]),
        ...crowd('home-cook', ['Mẹ đan áo ấm'], [person('l')], landmark('vong-duoi-hien'), 5, 1, [LIFE_HELD.basket]),
        ...crowd('shopper', ['Bác hàng xóm sang chơi'], [person('k'), person('c')], landmark('ghe-may-dau-hien'), 6, 2, [LIFE_HELD.basket]),
        ...crowd('waterer', ['Ông tưới cây trước sân'], [person('a')], landmark('ngo-anh-trang'), 6, 1, [LIFE_HELD.bucket]),
        ...crowd('reader', ['Bác Tư đọc sách', 'Bạn đọc truyện'], [person('j'), person('o')], landmark('hien-nha'), 10, 3, [LIFE_HELD.book]),
        ...crowd('home-cook', ['Bác nấu cỗ'], [person('m')], landmark('hang-da'), 12, 2, [LIFE_HELD.basket]),
        ...crowd('reader', ['Bạn đọc sách bên hang'], [person('p')], landmark('mom-da-cua-hang'), 4, 1, [LIFE_HELD.book]),
        ...crowd('sweeper', ['Chú dọn bãi đá'], [person('b')], landmark('bai-da-truoc-hang'), 6, 1),
        ...crowd('pupil', ['Bạn trong xóm'], [person('f'), person('n'), person('p')], landmark('chong-tre'), 12, 4),

        // Chapter 3: Chòi cũ bên bờ hồ và con dốc nhà ông (x: ~215, z: ~580).
        ...crowd('waterer', ['Ông chăm vườn thuốc'], [person('a')], landmark('nha-ong'), 6, 2, [LIFE_HELD.bucket]),
        ...crowd('home-cook', ['Bà phơi lá thuốc'], [person('i')], landmark('nha-ong'), 5, 2, [LIFE_HELD.basket]),
        ...crowd('pupil', ['Bạn nhỏ nhặt vỏ sò'], [person('f'), person('o'), person('q')], landmark('vach-vo-so'), 6, 3),
        ...crowd('pupil', ['Bạn nhỏ đắp cát'], [person('n'), person('p')], landmark('bai-cat'), 6, 3),
        ...crowd('ferryman', ['Bác lái đò bờ hồ'], [person('m')], landmark('choi-cu'), 6, 2, [LIFE_HELD.paddle]),
        ...crowd('ferryman', ['Chú câu cá bên chòi cũ', 'Bác buông cần'], [person('k'), person('b')], landmark('cua-go-choi'), 4, 2, [LIFE_HELD.paddle]),
        ...crowd('porter', ['Người gánh củi xuống dốc'], [person('j'), person('b')], landmark('tang-da'), 8, 2, [LIFE_HELD.crate]),
        ...crowd('pupil', ['Nhóm bạn leo dốc ngắm hồ'], [person('r'), person('o')], landmark('dinh-doc'), 8, 2),
        ...crowd('sweeper', ['Bác quét dốc đá'], [person('m')], landmark('dinh-doc'), 6, 1),
        ...crowd('shopper', ['Cô hàng xóm sang biếu quà'], [person('l')], landmark('hien-nha-hang-xom'), 6, 2, [LIFE_HELD.basket]),
        ...crowd('shopper', ['Người đi dạo ven hồ'], [person('c'), person('h')], landmark('bai-soi'), 10, 2, [LIFE_HELD.basket]),
        ...crowd('reader', ['Bạn ngồi đọc sách ven hồ'], [person('f'), person('q')], landmark('bai-cat'), 8, 2, [LIFE_HELD.book]),
        ...crowd('waterer', ['Chú gánh nước hồ'], [person('k')], landmark('choi-cu'), 6, 2, [LIFE_HELD.bucket]),
        ...crowd('laundry', ['Cô giặt đồ ven hồ'], [person('e')], landmark('bai-soi'), 8, 2, [LIFE_HELD.basket]),
        ...crowd('dog', ['Chó Vàng nhà ông'], [animal('dog')], landmark('nha-ong'), 8, 2),
        ...crowd('cat', ['Mèo sưởi nắng thềm đá'], [animal('cat')], landmark('tang-da'), 6, 2),

        // Chapter 4: Hồ sen và cánh đồng gió (x: ~600, z: ~580).
        ...crowd('ploughman', ['Bà nhổ cỏ luống cà rốt'], [person('i')], landmark('luong-ca-rot'), 5, 2, [LIFE_HELD.hoe, LIFE_HELD.cabbage]),
        ...crowd('waterer', ['Ông tưới luống cà rốt'], [person('j')], landmark('luong-ca-rot'), 6, 2, [LIFE_HELD.bucket]),
        ...crowd('home-cook', ['Bà nướng bánh khoai'], [person('i')], landmark('nha-ba'), 5, 1, [LIFE_HELD.pot]),
        ...crowd('vendor', ['Cô bán quà vặt bờ hồ'], [person('e')], landmark('nha-ba'), 8, 1, [LIFE_HELD.basket]),
        ...crowd('sweeper', ['Chị quét sân nhà bà'], [person('e')], landmark('nha-ba'), 6, 1),
        ...crowd('shopper', ['Bác hàng xóm sang trò chuyện'], [person('h'), person('l')], landmark('hang-rao-nha-ben'), 6, 2, [LIFE_HELD.basket]),
        ...crowd('pupil', ['Bạn nhỏ nhặt hạt dẻ'], [person('f'), person('n')], landmark('goc-cay-de'), 6, 2, [LIFE_HELD.basket]),
        ...crowd('reader', ['Bác đọc sách dưới bóng cây'], [person('a')], landmark('goc-cay-de'), 4, 1, [LIFE_HELD.book]),
        ...crowd('pupil', ['Bạn nhỏ cho cá Bống ăn'], [person('o'), person('q')], landmark('hang-me-bong'), 6, 2, [LIFE_HELD.bread]),
        ...crowd('pupil', ['Bạn nhỏ hái hoa sen'], [person('n'), person('p')], landmark('mep-ho-sen'), 6, 2),
        ...crowd('rice-planter', ['Cô chèo xuồng hái sen'], [person('h'), person('e')], landmark('mep-ho-sen'), 8, 2, [LIFE_HELD.basket]),
        ...crowd('ferryman', ['Bác lái đò bến hồ sen'], [person('m')], landmark('ben-do'), 6, 2, [LIFE_HELD.paddle]),
        ...crowd('ploughman', ['Bác nông dân bẻ ngô'], [person('m'), person('a')], landmark('ruong-ngo'), 14, 3, [LIFE_HELD.hoe]),
        ...crowd('porter', ['Chú bó thân ngô'], [person('k'), person('b')], landmark('ruong-ngo'), 12, 2, [LIFE_HELD.crate]),
        ...crowd('kite-flyer', ['Bạn thả diều gò gió'], [person('p'), person('r'), person('o')], landmark('go-dat'), 12, 3, [LIFE_HELD.kite]),
        ...crowd('pupil', ['Bạn nhỏ chạy trên đồng gió'], [person('f'), person('q')], landmark('canh-dong-gio'), 16, 3, [LIFE_HELD.kite]),
        ...crowd('rice-planter', ['Cô cấy lúa'], [person('h'), person('e')], landmark('canh-dong-lua'), 30, 4, [LIFE_HELD.basket]),

        // The farm (d-04, d-07): the hen keeper and the herd in the pens, the gardeners, the reapers in the wheat.
        ...crowd('hen-keeper', ['Cô cho gà ăn'], [person('e')], landmark('chuong-ga'), 4, 1, [LIFE_HELD.basket, LIFE_HELD.egg]),
        ...crowd('chick', ['Gà mái', 'Gà con'], [animal('chick')], landmark('chuong-ga'), 5, 8),
        ...crowd('cow', ['Bò sữa', 'Bê con'], [animal('cow')], landmark('bai-bo'), 6, 4),
        ...crowd('pig', ['Lợn ỉ'], [animal('pig')], landmark('chuong-ga'), 7, 3),
        ...crowd('waterer', ['Bác làm vườn', 'Cô hái bí'], [person('j'), person('h')], [GARDEN.x0 + 33, GARDEN.z0 + 18], 3, 2, [LIFE_HELD.hoe, LIFE_HELD.cabbage]),
        ...crowd('ploughman', ['Chú gặt lúa mì'], [person('k'), person('b')], landmark('ruong-lua-mi'), 12, 2, [LIFE_HELD.hoe]),
        ...crowd('dog', ['Cún giữ trại'], [animal('dog')], landmark('chuong-bo'), 6, 1),
        ...crowd('dog', ['Cún nhà Mẩy', 'Chó Vàng', 'Cún Mực'], [animal('dog')], landmark('goc-sung'), 16, 4),
        ...crowd('cat', ['Mèo tam thể', 'Mèo mun'], [animal('cat')], landmark('hien-nha-hang-xom'), 14, 4),
        ...crowd('pig', ['Lợn con'], [animal('pig')], landmark('nha-ba'), 12, 4),
        ...crowd('chick', ['Gà nhà bà'], [animal('chick')], landmark('nha-ba'), 8, 6),
        ...crowd('cow', ['Bò vàng'], [animal('cow')], landmark('canh-dong-gio'), 24, 5),
      ];
    },
    build: (ctx) => {
      const { world, block, rng, ground, zone, surface } = ctx;
      const b = builders(ctx);
      const { B } = b;
      /** A prop on the ground unless a way runs there (stones, flowers): ways stay clear to walk. */
      const offWay = (model: string, x: number, z: number, yaw: number): void => {
        if (!b.onWay(x, z)) ctx.prop(model, x, z, yaw);
      };
      /** The context for the shared hedges and verges, whose props keep off the walks to the doors as well as the lanes. */
      const offWays: ZoneMapContext = { ...ctx, prop: (model, x, z, yaw = 0) => offWay(model, x, z, yaw) };
      const [lane, porches, shore, field] = [1, 2, 3, 4].map(zone) as [Zone, Zone, Zone, Zone];

      // Mẩy's family home (d-03 outside, d-13 inside), first so its pictures lead the review: cream stone under
      // red tiles, its front garden of flowers behind a picket fence, its room furnished for supper.
      const homeBase = b.levelPlot(HOME.x0 - 2, HOME.z0 - 9, HOME.x0 + HOME.w + 1, HOME.z0 + HOME.d + 3);
      const home = placeFamilyHome(world, HOME.x0, HOME.z0, HOME.w, HOME.d, homeBase + 1, {
        ...b.palette.finish,
        wall: B.sand,
        roof: B.tile,
        trim: b.palette.trim,
        floor: B.planks,
        lining: B.planks,
        post: B.log,
        glass: block('glass'),
      });
      const windowsAlong = (length: number, skip: (i: number) => boolean): number[] => {
        const out: number[] = [];
        for (let i = 1; i < length - 1; i++) if (i % 4 === 2 && !skip(i)) out.push(i);
        return out;
      };
      const doorX = HOME.x0 + Math.floor(HOME.w / 2);
      // The doorway's columns and the two beside them, kept clear of bushes and pots out to the gate.
      const [door0, door1] = [home.doorway.x0 - 1, home.doorway.x0 + home.doorway.width];
      const middle = furnishHome(ctx, home.room, home.beams, home.wallHeight, {
        back: windowsAlong(HOME.w, () => false).map((i) => HOME.x0 + i),
        front: windowsAlong(HOME.w, (i) => HOME.x0 + i >= door0 - 1 && HOME.x0 + i <= door1 + 1).map((i) => HOME.x0 + i),
        sides: windowsAlong(HOME.d, () => false).map((i) => HOME.z0 + i),
      });
      for (const [bx, by, bz] of home.boxes) ctx.propAt(FLOWERS[Math.floor(bx) % 3] ?? M.flowerRed, [bx, by, bz], bx * 31);
      b.frontGarden(HOME.x0 - 2, HOME.x0 + HOME.w + 1, HOME.z0, homeBase, home.doorway, 1, 8);
      ctx.prop(STREET_LANTERN, door1 + 2, HOME.z0 - 10, 0);
      // Flowering bushes along the front wall and a second bed of flowers in pots, as the mock's cottage garden.
      for (let x = HOME.x0; x < HOME.x0 + HOME.w; x++) {
        if (x >= door0 && x <= door1) continue;
        put(world, x, homeBase + 1, HOME.z0 - 2, x % 3 === 0 ? B.leaves : B.pink);
        if (x % 2 === 0) ctx.prop(FLOWERS[x % 3] ?? M.flowerRed, x, HOME.z0 - 2, x * 23);
      }
      for (let x = HOME.x0 - 1; x <= HOME.x0 + HOME.w; x += 3) if (x < door0 || x > door1) ctx.prop(box('flower-pot'), x, HOME.z0 - 5, x * 13);
      for (const [x, model] of [[door0 - 2, box('flower-pot')], [door1 + 2, box('flower-pot')], [door0 - 3, M.barrel]] as const) ctx.prop(model, x, HOME.z0 - 1, x * 40);
      ctx.prop(M.fatTree, HOME.x0 + HOME.w + 3, HOME.z0 + 2, 70);
      ctx.propAt(M.hammock, [HOME.x0 + HOME.w + 3.5, homeBase + 1.2, HOME.z0 + 6.5], 0);
      b.claim(HOME.x0 - 3, HOME.z0 - 10, HOME.x0 + HOME.w + 4, HOME.z0 + HOME.d + 3);
      b.walkOut(home.doorway, HOME.z0 - 10, HOME.z0 - 10, homeBase);
      const { room } = home;
      ctx.landmark('trong-nha-may', 'Trong nhà Mẩy', middle[0], middle[1], room.floorY);
      ctx.landmark('nha-may', 'Nhà Mẩy', doorX, HOME.z0 - 4, homeBase + 1);
      ctx.landmark('vong-nha-may', 'Chiếc võng dưới hiên nhà Mẩy', HOME.x0 + HOME.w + 3, HOME.z0 + 6, homeBase + 1);

      // The village well (d-05) on its paved ring under the old tree, barrels and buckets by it, flowers round it.
      const wellGround = surface(WELL.x, WELL.z);
      const well = placeRoofedWell(world, WELL.x, WELL.z, wellGround, {
        kerb: B.cobbleGrey, cap: B.grey, water: B.water, post: B.log, roof: B.planks, ridge: B.log, paving: B.cobble, border: B.cobbleGrey,
      });
      ctx.propAt(box('hanging-bucket'), [well.rope[0], well.rope[1] - 1.8, well.rope[2] - 0.6], 0);
      // Barrels, the bucket, the pots and the crate stand off the paving's edge, so its ring stays clear to walk round.
      for (const [dx, dz, model, yaw] of [[-6, 3, M.barrel, 0], [-7, 1, M.barrel, 40], [-5, 4, M.bucket, 20], [6, 3, box('flower-pot'), 0], [6, -2, box('flower-pot'), 0], [-4, -5, box('flower-pot'), 0], [6, 1, M.crate, 15]] as const) {
        ctx.prop(model, WELL.x + dx, WELL.z + dz, yaw);
      }
      placeAncientTree(world, 413, ground + 1, 121, { log: block('tree-log'), leaves: B.leaves, core: B.log }, rng);
      for (const [x, z, yaw] of [[392, 108, 90], [408, 106, 90]] as const) ctx.prop(M.bench, x, z, yaw);
      for (const z of [104, 120]) b.fenceRun(box('picket'), 389, z, 'x', 6);
      flowerBed(ctx, 388, 98, 24, 4);
      flowerBed(ctx, 386, 108, 3, 8);
      // Flowers all round the paving, as the mock's well stands in a garden.
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const [x, z] = [Math.round(WELL.x + Math.cos(t) * 7), Math.round(WELL.z + Math.sin(t) * 7)];
        if (!ctx.onPath(x, z)) ctx.prop(FLOWERS[i % 3] ?? M.flowerRed, x, z, i * 37);
      }
      b.claim(386, 98, 420, 128);
      ctx.landmark('gieng-xom', 'Giếng xóm', WELL.x, WELL.z - 6, wellGround + 1);

      // The farm (d-04, d-14, d-07): the red barn, its pens either side of the way to its door, the garden and the wheat.
      const barnBase = b.levelPlot(BARN.x0 - 3, BARN.z0 - 1, BARN.x0 + BARN.w + 2, BARN.z0 + BARN.d + 2);
      const barn = placeRedBarn(world, BARN.x0, BARN.z0, BARN.w, BARN.d, barnBase + 1, {
        wall: B.red, trim: block('birch-log'), roof: B.log, glass: block('glass'), floor: B.planks, aisle: B.cobbleGrey, lining: B.planks, post: B.log,
      });
      furnishBarn(ctx, barn, barnBase + 1);
      // Outside the doorway (seven wide): lanterns either side, milk cans and hay bales before the folded door leaves.
      for (const dx of [-6, 6]) ctx.prop(STREET_LANTERN, barn.door[0] + dx, BARN.z0 - 3, 0);
      for (const [dx, dz, model, yaw] of [[-7, -2, box('milk-can'), 0], [-8, -2, box('milk-can'), 30], [7, -2, box('hay-bale'), 90], [8, -3, box('hay-bale'), 0], [7, -4, M.bucket, 0]] as const) {
        ctx.prop(model, barn.door[0] + dx, BARN.z0 + dz, yaw);
      }
      b.claim(BARN.x0 - 3, BARN.z0 - 1, BARN.x0 + BARN.w + 2, BARN.z0 + BARN.d + 2);
      // The doorway's threshold and the apron before it cobbled as the aisle, out to the farm's track.
      const barnDoor = { x0: barn.door[0] - barn.aisle, width: 2 * barn.aisle + 1 };
      for (let x = barnDoor.x0; x < barnDoor.x0 + barnDoor.width; x++) world.set(x, barnBase, BARN.z0, B.cobbleGrey);
      b.walkOut(barnDoor, BARN.z0 - 1, BARN.z0 - 1, barnBase);
      ctx.landmark('chuong-bo', 'Chuồng bò đỏ', barn.door[0], BARN.z0 - 6, barnBase + 1);
      ctx.landmark('trong-chuong', 'Trong chuồng bò', barn.door[0], BARN.z0 + Math.floor(BARN.d / 2), barnBase + 1);
      // The pens: rail fences with a gate on the way, a trough, hay bales, the hen coop in the east pen.
      for (const p of PENS) {
        for (const z of [p.z0, p.z1]) b.fenceRun(box('rail-fence'), p.x0, z, 'x', p.x1 - p.x0 + 1);
        for (const x of [p.x0, p.x1]) b.fenceRun(box('rail-fence'), x, p.z0 + 1, 'z', p.z1 - p.z0 - 1, [p.z1 - 6, p.z1 - 4]);
        b.claim(p.x0, p.z0, p.x1, p.z1);
      }
      const [west, east] = PENS as [(typeof PENS)[0], (typeof PENS)[0]];
      ctx.prop(box('trough'), west.x0 + 6, west.z0 + 4, 0);
      ctx.prop(box('trough'), west.x0 + 12, west.z0 + 4, 0);
      for (const [dx, dz] of [[3, 20], [4, 22], [2, 23]] as const) ctx.prop(box('hay-bale'), west.x0 + dx, west.z0 + dz, dx * 30);
      for (const [dx, dz, model, yaw] of [[17, 20, box('cow'), 200], [19, 24, box('cow'), 150], [14, 23, box('cow'), 240], [12, 18, box('sheep'), 190]] as const) ctx.prop(model, west.x0 + dx, west.z0 + dz, yaw);
      ctx.landmark('bai-bo', 'Bãi thả bò', west.x0 + 11, west.z0 + 13);
      ctx.prop(box('coop'), east.x0 + 12, east.z0 + 6, 0);
      ctx.prop(box('trough'), east.x0 + 6, east.z0 + 18, 0);
      for (let i = 0; i < 4; i++) ctx.prop(box('hay-pile'), east.x0 + 4 + i * 4, east.z0 + 12 + (i % 2) * 3, i * 70);
      ctx.landmark('chuong-ga', 'Chuồng gà', east.x0 + 10, east.z0 + 12);
      // The vegetable garden (d-07): beds of tilled earth inside a rail fence, pumpkins, cabbages, carrots, maize.
      const crops = [box('pumpkin'), box('cabbage'), M.carrot, box('pumpkin'), box('cabbage'), M.cornYoung];
      for (let z = GARDEN.z0 + 1; z < GARDEN.z1; z++) {
        for (let x = GARDEN.x0 + 1; x < GARDEN.x1; x++) {
          if (ctx.onPath(x, z) || (x - GARDEN.x0) % 17 === 0) continue;
          b.paint(x, z, B.farmland);
          const row = z - GARDEN.z0 - 1;
          if (row % 2 === 1 || x === GARDEN.x0 + 1 || x === GARDEN.x1 - 1) continue;
          const crop = crops[(Math.floor(row / 2) + Math.floor((x - GARDEN.x0) / 17)) % crops.length] ?? M.cabbage;
          if (crop === M.carrot || (x + row / 2) % 2 === 0) ctx.prop(crop, x, z, (x * 37 + z * 11) % 360);
        }
      }
      for (const z of [GARDEN.z0, GARDEN.z1]) b.fenceRun(box('rail-fence'), GARDEN.x0, z, 'x', GARDEN.x1 - GARDEN.x0 + 1, [GARDEN.x0 + 16, GARDEN.x0 + 18]);
      for (const x of [GARDEN.x0, GARDEN.x1]) b.fenceRun(box('rail-fence'), x, GARDEN.z0 + 1, 'z', GARDEN.z1 - GARDEN.z0 - 1);
      for (let x = GARDEN.x0 + 4; x < GARDEN.x1; x += 22) ctx.prop(M.barrel, x, GARDEN.z0 + 1, x);
      b.claim(GARDEN.x0, GARDEN.z0, GARDEN.x1, GARDEN.z1);
      ctx.landmark('vuon-rau', 'Vườn rau nhà bác', GARDEN.x0 + 17, GARDEN.z0 - 3);
      // The wheat field running south to the windy mound: golden grain two blocks high (one here and there), a furrow every sixth row.
      for (let x = WHEAT.x0; x <= WHEAT.x1; x++) {
        for (let z = WHEAT.z0; z <= WHEAT.z1; z++) {
          if (ctx.onPath(x, z) || ctx.inWater(x, z)) continue;
          if ((z - WHEAT.z0) % 6 === 5 || (x - WHEAT.x0) % 30 === 0) world.set(x, surface(x, z), z, B.farmland);
          else for (let k = 1; k <= ((x * 7 + z * 3) % 5 === 0 ? 1 : 2); k++) world.set(x, surface(x, z) + k, z, B.wheat);
        }
      }
      b.scarecrow(WHEAT.x0 + 40, WHEAT.z0 + 14);
      for (let i = 0; i < 4; i++) ctx.prop(box('hay-bale'), WHEAT.x0 + 9 + i * 27, WHEAT.z0 - 1, i * 50);
      b.claim(WHEAT.x0, WHEAT.z0 - 1, WHEAT.x1, WHEAT.z1);
      ctx.landmark('ruong-lua-mi', 'Ruộng lúa mì', WHEAT.x0 + 30, WHEAT.z0 + 5, surface(WHEAT.x0 + 30, WHEAT.z0 + 5) + 1);

      // Chapter 1, the flower garden: a picket fence round it with a gate on the lane side, beds of flowers, the
      // loofah trellis at its far end, the bee wall, the cabbage bed in the corner, daisies along the fence.
      const garden = { x0: 220, z0: 120, x1: 250, z1: 142 };
      for (const z of [garden.z0, garden.z1]) b.fenceRun(box('picket'), garden.x0, z, 'x', garden.x1 - garden.x0 + 1);
      b.fenceRun(box('picket'), garden.x0, garden.z0 + 1, 'z', garden.z1 - garden.z0 - 1, [128, 134]);
      b.fenceRun(box('picket'), garden.x1, garden.z0 + 1, 'z', garden.z1 - garden.z0 - 1);
      for (const z of [128, 134]) for (let y = ground + 1; y <= ground + 3; y++) world.set(garden.x0, y, z, B.log);
      for (let z = 128; z <= 134; z++) world.set(garden.x0, ground + 4, z, B.tile);
      ctx.landmark('cong-vuon-hoa', 'Cổng vườn hoa', garden.x0 - 2, 131);
      for (let x = garden.x0 + 3; x < 240; x += 3) for (let z = garden.z0 + 3; z < garden.z1 - 1; z += 3) offWay(FLOWERS[(x + z) % 3] ?? M.flowerRed, x, z, (x * 17 + z * 29) % 360);
      b.avoid(garden.x0, garden.z0, garden.x1, garden.z1);
      const trellis = { x0: 242, z0: 122, x1: 248, z1: 128 };
      for (const [x, z] of [[trellis.x0, trellis.z0], [trellis.x1, trellis.z0], [trellis.x0, trellis.z1], [trellis.x1, trellis.z1]] as const) for (let y = ground + 1; y <= ground + 3; y++) world.set(x, y, z, B.log);
      for (let x = trellis.x0; x <= trellis.x1; x++) for (let z = trellis.z0; z <= trellis.z1; z++) if ((x + z) % 3 !== 0) world.set(x, ground + 4, z, B.leaves);
      for (let i = 0; i < 6; i++) ctx.propAt(M.loofah, [trellis.x0 + 1.5 + (i % 3) * 2, ground + 3.2, trellis.z0 + 2.5 + Math.floor(i / 3) * 2], i * 60);
      ctx.landmark('gian-muop', 'Giàn mướp cuối vườn', 245, 125);
      for (let z = 136; z <= 140; z++) world.set(248, ground + 1, z, B.planks);
      for (let z = 136; z <= 140; z++) for (let y = ground + 2; y <= ground + 3; y++) world.set(248, y, z, z % 2 === 0 ? B.sand : B.board);
      for (let x = 242; x <= 246; x += 2) for (let z = 136; z <= 140; z += 2) ctx.prop(box('cabbage'), x, z, x * 7 + z);
      for (let x = garden.x0 + 1; x < garden.x1; x += 2) ctx.prop(M.flowerYellow, x, garden.z1 + 1, x * 31);
      ctx.landmark('vuon-hoa', 'Bụi hoa tỉ muội', 232, 131);
      ctx.landmark('luong-cai', 'Luống cải góc vườn', 244, 138);
      ctx.landmark('vach-to-ong', 'Vách tổ ong', 246, 140);
      ctx.landmark('khom-cuc', 'Khóm cúc bên hàng rào', 232, 144);
      // The straw nest with eggs in the yard; the bamboo at the lane's mouth, the fig tree and the rattan chair
      // beside the lane; the duckweed pond.
      for (let a = 0; a < 12; a++) world.set(Math.round(240 + 2 * Math.cos((a / 12) * Math.PI * 2)), ground + 1, Math.round(150 + 2 * Math.sin((a / 12) * Math.PI * 2)), B.sand);
      for (let i = 0; i < 3; i++) ctx.propAt(M.egg, [240.2 + i * 0.4, ground + 1, 150.3 + (i % 2) * 0.4], i * 50);
      b.claim(237, 147, 243, 153);
      ctx.landmark('to-rom', 'Tổ rơm nhà Mẩy', 240, 150);
      for (const x of [204, 206]) for (const z of [178, 181, 184]) ctx.prop(M.bamboo, x, z, x * 11 + z);
      ctx.prop(M.fatTree, 204, 166, 30);
      ctx.landmark('goc-sung', 'Gốc sung ven ngõ', 204, 166);
      ctx.landmark('ghe-may-ben-ngo', 'Ghế mây bên ngõ', 206, 172);
      ctx.landmark('bui-tre-dau-ngo', 'Bụi tre đầu ngõ', 207, 181);
      ctx.centred(M.chair, 206, 172, 270);
      ctx.centred(M.table, 206, 175, 0);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = POND.r * (0.3 + 0.55 * (((i * 7) % 5) / 5));
        ctx.propAt(M.lilySmall, [POND.x + Math.cos(a) * r + 0.5, WATER_LEVEL + 1.02, POND.z + Math.sin(a) * r + 0.5], i * 40);
      }
      ctx.landmark('ao-beo', 'Vũng nước cạnh ao bèo', POND.x, POND.z - POND.r - 1);
      // The neighbours down Mẩy's lane; fruit trees along the zone's north edge and the straw yard below them.
      b.homestead(lane.x - 38, lane.z + 18);
      for (let x = lane.x - 42; x <= lane.x + 2; x += 7) ctx.prop(YARD_TREES[Math.floor(x / 7) % YARD_TREES.length] ?? M.oak, x, lane.z - 32, x * 13);
      for (const [dx, dz] of [[-30, -24], [-22, -26], [-12, -22]] as const) {
        b.haystack(lane.x + dx, lane.z + dz, ground);
        b.claim(lane.x + dx - 1, lane.z + dz - 1, lane.x + dx + 1, lane.z + dz + 1);
      }
      ctx.prop(M.bench, lane.x - 16, lane.z - 14, 0);

      // Chapter 2: two cottages either side of the moonlit lane, their porches on a shared yard (a hammock
      // under one, a rattan chair at the end of the other), the bamboo bed in the yard, the star-fruit tree at
      // the lane's mouth, lanterns down the lane, the sapodilla garden.
      b.homestead(522, 176, { hammock: true });
      const chairHome = b.homestead(574, 176, { chair: true });
      ctx.landmark('hien-nha', 'Hiên nhà', 560, 166);
      ctx.landmark('vong-duoi-hien', 'Võng dưới hiên', 524, 174);
      ctx.landmark('ghe-may-dau-hien', 'Ghế mây đầu hiên', 574 + chairHome.w - 2, 174);
      ctx.landmark('ngo-anh-trang', 'Ngõ nhỏ ánh trăng', 560, 186);
      for (let x = 544; x <= 546; x++) for (let z = 148; z <= 149; z++) world.set(x, ground + 1, z, B.planks);
      ctx.landmark('chong-tre', 'Chõng tre ngoài sân', 545, 148);
      ctx.centred(M.table, 552, 141, 0);
      ctx.prop(M.oak, 567, 191, 40);
      ctx.landmark('goc-khe', 'Gốc khế đầu ngõ', 567, 191);
      for (let z = 166; z <= 194; z += 7) ctx.prop(STREET_LANTERN, z % 2 === 0 ? 557 : 563, z, 0);
      for (let z = 198; z <= 230; z += 8) ctx.prop(STREET_LANTERN, z % 16 === 6 ? 556 : 564, z, 0);
      const sapodilla = { x0: 520, z0: 130, x1: 540, z1: 146 };
      b.avoid(sapodilla.x0, sapodilla.z0, sapodilla.x1, sapodilla.z1);
      for (const z of [sapodilla.z0, sapodilla.z1]) b.fenceRun(box('picket'), sapodilla.x0, z, 'x', sapodilla.x1 - sapodilla.x0 + 1);
      for (const x of [sapodilla.x0, sapodilla.x1]) b.fenceRun(box('picket'), x, sapodilla.z0 + 1, 'z', sapodilla.z1 - sapodilla.z0 - 1);
      ctx.prop(M.fatTree, 530, 138, 10);
      flowerBed(ctx, 523, 133, 4, 4);
      flowerBed(ctx, 533, 141, 4, 4);
      ctx.landmark('cay-vu-sua', 'Cây vú sữa trong vườn', 530, 138);
      // A third porch on the yard's north side; flowers along the moonlit lane.
      b.homestead(porches.x + 14, porches.z - 26);
      for (let z = 167; z <= 193; z += 3) for (const x of [553, 567]) if (z !== 191) ctx.prop(FLOWERS[(z + x) % 3] ?? M.flowerRed, x, z, z * 7);
      // The warm stone den in the foot of the hill: a feast on a table inside, a field of boulders before it,
      // a stone wall carved with writing, tall rocks at its mouth.
      b.cave(DEN.x + 4, DEN.z, 6, 6, surface(DEN.x + 4, DEN.z));
      ctx.centred(M.table, DEN.x + 5, DEN.z, 0);
      for (let i = 0; i < 3; i++) ctx.propAt(M.bowl, [DEN.x + 4.6 + i * 0.5, surface(DEN.x + 5, DEN.z) + 1.8, DEN.z + 0.5], i * 30);
      b.claim(DEN.x - 3, DEN.z - 7, DEN.x + 11, DEN.z + 7);
      ctx.landmark('hang-da', 'Hang đá ấm', DEN.x + 4, DEN.z, surface(DEN.x + 4, DEN.z) + 1);
      for (const [x, z] of [[608, 150], [612, 170], [616, 146], [606, 168], [619, 174]] as const) offWay(M.rock, x, z, x * 7);
      for (let i = 0; i < 24; i++) offWay(M.pebble, 605 + ((i * 7) % 16), 148 + ((i * 11) % 26), i * 31);
      for (let x = 610; x <= 618; x++) for (let k = 1; k <= 4; k++) world.set(x, surface(x, 141) + k, 141, k === 3 && x % 2 === 0 ? B.board : B.stone);
      ctx.landmark('vach-da', 'Vách đá khắc chữ', 614, 139);
      ctx.landmark('bai-da-truoc-hang', 'Bãi đá trước hang', 612, 160);
      ctx.landmark('mom-da-cua-hang', 'Mỏm đá cửa hang', DEN.x - 4, DEN.z - 3);
      ctx.landmark('mam-co', 'Mâm cỗ giữa hang', DEN.x + 5, DEN.z, surface(DEN.x + 5, DEN.z) + 1);
      for (const z of [DEN.z - 3, DEN.z + 3]) for (let k = 1; k <= 4 - Math.abs(z - DEN.z) % 2; k++) world.set(DEN.x - 3, surface(DEN.x - 3, z) + k, z, B.moss);

      // Chapter 3: the old hut on the west shore with its wooden door off its hinges, the sand beach beside it,
      // the stone wall studded with shells, the pebble strand at the water's edge, a boat drawn up.
      // The hut is a house the child walks into: 13 x 11 under walls seven high, a doorway three wide, a plank floor.
      const hut = { x0: 234, z0: 560, w: 13, d: 11 };
      const hutBase = b.levelPlot(hut.x0 - 1, hut.z0 - 3, hut.x0 + hut.w, hut.z0 + hut.d);
      const hutFront = placeHouse(world, hut.x0, hut.z0, hut.w, hut.d, 7, hutBase + 1, { wall: B.planks, roof: B.red, trim: B.log, floor: B.planks });
      b.claim(hut.x0 - 1, hut.z0 - 1, hut.x0 + hut.w, hut.z0 + hut.d);
      for (let x = hutFront.doorway.x0; x < hutFront.doorway.x0 + hutFront.doorway.width; x++) world.set(x, hutBase, hut.z0, B.planks);
      b.walkOut(hutFront.doorway, hut.z0 - 1, hut.z0 - 1, hutBase);
      // The door off its hinges leans on the wall east of the doorway, clear of the way in.
      const hutDoorEnd = hutFront.doorway.x0 + hutFront.doorway.width;
      ctx.propAt(M.door, [hutDoorEnd + 1.6, hutBase + 1, hut.z0 - 0.7], 20);
      ctx.landmark('cua-go-choi', 'Cánh cửa gỗ của chòi', hutDoorEnd + 2, hut.z0 - 2);
      ctx.landmark('choi-cu', 'Căn chòi cũ bên bờ', hutFront.door[0], hut.z0 - 3);
      for (let x = 248; x <= 290; x++) for (let z = 550; z <= 586; z++) if (!ctx.inZone(x, z) || x > 236) b.paint(x, z, B.sand);
      ctx.landmark('bai-cat', 'Bãi cát cạnh căn chòi', 262, 572);
      for (let x = 246; x <= 290; x++) for (let z = 596; z <= 618; z++) if ((x * 7 + z * 3) % 5 !== 0) b.paint(x, z, B.grey);
      for (let i = 0; i < 30; i++) offWay(M.pebble, 250 + ((i * 13) % 26), 598 + ((i * 7) % 18), i * 47);
      ctx.landmark('bai-soi', 'Bãi sỏi mép hồ', 266, 606);
      for (let x = 250; x <= 255; x++) for (let k = 1; k <= 3; k++) world.set(x, ground + k, 548, B.stone);
      for (let i = 0; i < 6; i++) ctx.propAt(M.shell, [250.5 + i, ground + 1.2 + (i % 3), 547.4], i * 60);
      b.claim(249, 547, 256, 549);
      ctx.landmark('vach-vo-so', 'Vách đá gắn vỏ sò', 252, 546);
      ctx.propAt(M.canoe, [281.5, WATER_LEVEL + 0.9, 572.5], 90);
      // The neighbour's porch at the foot of the slope, bamboo up both sides of the slope, the boulder half way
      // up, grandpa's house on top with stone steps before its porch, the trail over the hilltop.
      b.homestead(183, 600, { chair: true });
      ctx.landmark('hien-nha-hang-xom', 'Hiên nhà hàng xóm', 188, 594);
      ctx.prop(M.rock, 132, 589, 40);
      ctx.landmark('tang-da', 'Tảng đá lưng dốc', 132, 589, surface(132, 589) + 1);
      // Grandpa's house: 15 x 12 under walls seven high, a doorway three wide, its porch roofed across the front.
      const top = surface(GRANDPA_HILL.x, GRANDPA_HILL.z);
      const gp = { x0: 80, z0: 596, w: 15, d: 12 };
      const gpFront = placeHouse(world, gp.x0, gp.z0, gp.w, gp.d, 7, top + 1, { ...b.palette.finish, wall: B.sand, roof: B.tile, trim: B.log });
      b.porch(gp.x0, gp.z0, gp.w, top, B.tile, top + 6);
      for (let x = gpFront.doorway.x0; x < gpFront.doorway.x0 + gpFront.doorway.width; x++) world.set(x, top, gp.z0, B.planks);
      ctx.propAt(M.hammock, [gp.x0 + 2.5, top + 1.6, gp.z0 - 1.5], 90);
      ctx.prop(M.oak, gp.x0 + gp.w + 3, gp.z0 + 8, 70);
      ctx.prop(M.palm, 76, 590, 10);
      b.claim(gp.x0 - 2, gp.z0 - 3, gp.x0 + gp.w + 5, gp.z0 + gp.d + 2);
      // From the porch's edge a walk out to the trail over the hilltop.
      b.walkOut(gpFront.doorway, gp.z0 - 4, gp.z0 - 4, top);
      ctx.landmark('nha-ong', 'Thềm nhà ông', gpFront.door[0], gp.z0 - 4, top + 1);
      for (let i = 0; i < 10; i++) offWay(M.pebble, 64 + ((i * 5) % 30), 566 + ((i * 3) % 10), i * 20);
      ctx.landmark('dinh-doc', 'Lối mòn đỉnh dốc', 66, 574, surface(66, 574) + 1);
      // Trees stay off the beach and the strand; a fisher's cottage in the zone's north-west, bamboo by the hut.
      ctx.keepOut(258, 548, 292, 588);
      ctx.keepOut(258, 594, 292, 620);
      b.homestead(shore.x - 37, shore.z - 26);
      for (let i = 0; i < 6; i++) ctx.prop(M.bamboo, hut.x0 - 3 - (i % 2) * 2, hut.z0 + 1 + Math.floor(i / 2) * 2, i * 40);
      ctx.prop(M.logs, hut.x0 + hut.w + 1, hut.z0 + 3, 0);

      // Chapter 4: lotus and lily pads all over the lake, thick along the east shore; the ferry landing at the
      // lake's far end; Mother Bống's grotto on the shore; grandma's cottage and her carrot beds; the house
      // next door behind its long fence; the chestnut tree; the maize with its scarecrow; the windy mound with
      // a windmill and kites.
      for (let gx = LAKE.x - LAKE.rx; gx <= LAKE.x + LAKE.rx; gx += 6) {
        for (let gz = LAKE.z - LAKE.rz; gz <= LAKE.z + LAKE.rz; gz += 6) {
          const x = Math.round(gx + (rng() - 0.5) * 4);
          const z = Math.round(gz + (rng() - 0.5) * 4);
          if (!inEllipse({ ...LAKE, rx: LAKE.rx - 3, rz: LAKE.rz - 3 }, x, z) || Math.abs(z - 590) < 4) continue;
          const roll = rng();
          ctx.propAt(roll < 0.2 ? M.lotus : roll < 0.45 ? M.lilySmall : M.lily, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], Math.floor(roll * 360));
        }
      }
      for (let i = 0; i < 40; i++) {
        const t = -0.6 + (i / 40) * 1.2;
        const x = Math.round(LAKE.x + LAKE.rx * Math.cos(t) - 4 - (i % 3) * 2);
        const z = Math.round(LAKE.z + LAKE.rz * Math.sin(t));
        if (Math.abs(z - 590) > 3) ctx.propAt(M.lotus, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], i * 33);
      }
      // The lake seen from the middle of its plank bridge.
      ctx.landmark('ho-sen', 'Hồ sen', LAKE.x, 589, WATER_LEVEL + 2);
      ctx.landmark('mep-ho-sen', 'Mép hồ sen', 530, 575);
      jetty(ctx, LAKE.x, Math.ceil(lakeShoreZ(LAKE.x, 1) ?? LAKE.z + LAKE.rz) + 1, 10, -1, WATER_LEVEL);
      ctx.landmark('ben-do', 'Bến đò cuối hồ', LAKE.x, 680);
      const grotto = { x: 512, z: 630 };
      b.cave(grotto.x, grotto.z, 4, 4, WATER_LEVEL);
      b.claim(grotto.x - 5, grotto.z - 5, grotto.x + 5, grotto.z + 5);
      ctx.landmark('hang-me-bong', 'Hang mẹ Bống', grotto.x, grotto.z, WATER_LEVEL + 1);
      const granny = b.homestead(566, 564);
      ctx.landmark('nha-ba', 'Nhà bà', granny.doorX, 560);
      for (let z = 598; z <= 612; z += 3) for (let x = 562; x <= 590; x += 2) {
        ctx.prop(M.dirtRow, x, z, 90);
        if (x % 4 === 2) ctx.prop(M.carrot, x, z, x * 11 + z);
      }
      ctx.landmark('luong-ca-rot', 'Luống cà rốt nhà bà', 576, 604);
      b.homestead(614, 606);
      b.fenceRun(box('rail-fence'), 609, 596, 'z', 23);
      ctx.landmark('hang-rao-nha-ben', 'Hàng rào nhà bên', 607, 607);
      ctx.prop(M.oak, 632, 560, 15);
      ctx.landmark('goc-cay-de', 'Gốc cây dẻ', 632, 560);
      b.field(652, 548, 700, 584, M.corn);
      b.scarecrow(676, 566);
      ctx.landmark('ruong-ngo', 'Ruộng ngô giữa đồng', 676, 566);
      b.field(652, 612, 700, 646, M.carrot);
      const mound = surface(WIND_MOUND.x, WIND_MOUND.z);
      placeWindmill(world, WIND_MOUND.x + 6, WIND_MOUND.z, mound + 1, { planks: B.planks, log: B.log, roof: B.tile, sail: B.white, stone: B.cobbleGrey, glass: block('glass') });
      // The mill's foot opened to a doorway three wide and three high, and a walk from it to the mound's trail.
      for (let dx = -1; dx <= 1; dx++) for (let dz = -5; dz <= -2; dz++) for (let y = 0; y <= 2; y++) put(world, WIND_MOUND.x + 6 + dx, mound + 1 + y, WIND_MOUND.z + dz, 0);
      b.claim(WIND_MOUND.x + 2, WIND_MOUND.z - 4, WIND_MOUND.x + 10, WIND_MOUND.z + 4);
      b.walkOut({ x0: WIND_MOUND.x + 5, width: 3 }, WIND_MOUND.z - 5, WIND_MOUND.z - 5, mound);
      for (let i = 0; i < 4; i++) ctx.propAt(M.kite, [WIND_MOUND.x - 6 + i * 4, mound + 9 + (i % 2) * 3, WIND_MOUND.z - 8 + i * 3], i * 80);
      ctx.keepOut(WIND_MOUND.x - 18, WIND_MOUND.z - 18, WIND_MOUND.x + 18, WIND_MOUND.z + 18);
      for (let i = 0; i < 14; i++) ctx.prop(FLOWERS[i % 3] ?? M.flowerRed, WIND_MOUND.x - 14 + ((i * 11) % 28), WIND_MOUND.z - 12 + ((i * 7) % 24), i * 25);
      ctx.landmark('go-dat', 'Gò đất lộng gió', WIND_MOUND.x, WIND_MOUND.z, mound + 1);
      ctx.landmark('canh-dong-gio', 'Cánh đồng gió', 720, 680);
      // Haystacks by grandma's yard, a bench and a boat on the shore.
      for (const [x, z] of [[591, 557], [593, 568]] as const) {
        b.haystack(x, z, ground);
        b.claim(x - 1, z - 1, x + 1, z + 1);
      }
      ctx.prop(M.bench, field.x - 40, field.z - 2, 90);
      ctx.propAt(M.canoe, [519.5, WATER_LEVEL + 0.9, 600.5], 20);
      // Boulders on the two hills.
      for (const h of [DEN_HILL, GRANDPA_HILL]) {
        for (let i = 0; i < 28; i++) {
          const a = i * 2.39;
          const r = h.r * (0.3 + 0.6 * ((i * 0.618) % 1));
          const x = Math.round(h.x + Math.cos(a) * r);
          const z = Math.round(h.z + Math.sin(a) * r);
          if (x > 14 && x < 786 && z > 14 && z < 786 && !ctx.onPath(x, z) && !ctx.inZone(x, z, 2)) ctx.prop(M.rock, x, z, i * 47);
        }
      }

      // The drying yard beside the lane to the well, haystacks round its edge.
      for (let x = 376; x <= 394; x++) for (let z = 140; z <= 200; z++) b.paint(x, z, B.path);
      for (let z = 144; z <= 196; z += 8) b.haystack(x0Yard(z), z, surface(x0Yard(z), z));
      b.claim(374, 138, 396, 202);
      ctx.landmark('san-phoi', 'Sân phơi', 385, 170);

      // Fields between the districts: rice paddies, fenced plots of maize, cabbage, carrots and pumpkins.
      for (const p of PADDIES) b.paddy(p);
      ctx.landmark('canh-dong-lua', 'Cánh đồng lúa', 400, 350);
      b.field(660, 660, 720, 720, M.corn);
      b.field(726, 660, 780, 720, M.cabbage);
      b.field(660, 728, 720, 782, M.carrot);
      b.field(726, 728, 780, 782, M.corn);
      b.field(316, 250, 360, 290, M.cabbage);
      b.field(440, 250, 484, 290, M.corn);
      b.field(192, 306, 236, 376, M.corn);
      b.field(244, 306, 290, 376, M.cabbage);
      b.field(510, 306, 556, 376, M.carrot);
      b.field(564, 306, 606, 376, M.corn);

      // Boats tied at jetties along the lake's north shore.
      for (const x of [320, 470]) jetty(ctx, x, Math.floor(lakeShoreZ(x, -1) ?? LAKE.z - LAKE.rz) - 1, 7, 1, WATER_LEVEL);

      // Cottages everywhere else, lanterns and flowers along the trails, bamboo round the hamlet.
      // Chapter 1's hamlet round the spawn and east of the garden; the hamlet round the well; chapter 2's.
      b.village(14, 14, 168, 232);
      b.village(256, 14, 384, 232);
      b.village(374, 14, 470, 100);
      b.village(404, 128, 490, 228);
      b.village(470, 14, 640, 128);
      b.village(470, 192, 640, 234);
      // A row each side of the middle fields along both lanes, and the lakeside rows north of the lake.
      b.village(14, 240, 300, 300);
      b.village(500, 240, 786, 300);
      b.village(14, 384, 300, 418);
      b.village(500, 384, 786, 418);
      b.village(230, 424, 600, 486);
      b.village(500, 486, 600, 545);
      b.village(250, 716, 415, 786);
      // West below the lane down to grandpa's hill, round the farm, and the hamlet south-west of the lake.
      b.village(14, 424, 175, 520);
      b.village(620, 424, 786, 545);
      b.village(14, 672, 250, 786);
      b.village(150, 486, 270, 545);
      b.village(100, 622, 300, 672);
      b.village(520, 620, 650, 700);
      // Bamboo down both sides of the moonlit lane and of the slope to grandpa's, set once every walk is laid.
      for (const hedge of [[[555, 196], [555, 230]], [[565, 196], [565, 230]], [[172, 571], [96, 585]], [[172, 580], [100, 595]]] as Point[][]) bambooHedge(offWays, hedge);
      for (const route of [LANE_N, LANE_S, SHORE_S, FARM_TRACK, ...CROSS_LANES]) laneVerge(offWays, route, { spacing: 4, lampEvery: 18 });
      for (let i = 14; i <= 786; i += 5) {
        for (const [x, z] of [[i, 13], [i, 787], [13, i], [787, i]] as const) if (!b.onWay(x, z) && !b.isClaimedAt(x, z)) ctx.prop(M.bamboo, x, z, (x * 37 + z) % 360);
      }
      const unwalked = b.unwalkedDoors();
      if (unwalked.length > 0) console.warn(`${MAP_ID}: no walk found to a lane from the doors at ${unwalked.map(([x, z]) => `${x},${z}`).join(' ')}`);
    },
  });
}

await runIfMain(import.meta.url, generateXomMaiAm);

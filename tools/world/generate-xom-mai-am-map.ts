// Generates "Xóm Mái Ấm" (Tiếng Việt weeks 14–17, "Mái ấm gia đình") from a fixed seed, 800 x 800 blocks in
// the style of the owner's village mocks (designs/lang-ven-song/, designs/the-gioi/): a cosy hamlet of
// homesteads, each a tiled-roof house (red, blue or orange roof) with a porch on posts, a kitchen hut with
// its chimney, a well, a haystack, a vegetable bed, fruit trees, a yard fence on the lane and bamboo behind.
// Lamp-lit lanes join four districts, one per chapter. North-west, by the spawn: the flower garden and the
// lane of Mẩy's house with its duckweed pond (chapter 1). North-east: the porches round a moonlit yard and
// the warm stone den at the foot of the hill (chapter 2). South, round a big lotus lake crossed by a plank
// bridge: the old hut on the west shore below the slope up to grandpa's house (chapter 3), the far shore with
// the ferry landing, Mother Bống's grotto, the windy mound with its windmill and the fields of maize and
// carrots (chapter 4). Between them: more homesteads, rice paddies, fenced vegetable plots, woods on the hills.
// Output: assets/generated/world/xom-mai-am/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { bambooHedge, cottagePalette, flowerBed, jetty, lampRow } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeWell, placeWindmill } from './structures/countryside';
import type { Point } from './structures/path';
import { placeAncientTree } from './structures/tree';
import { put } from './structures/world-writer';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'xom-mai-am';
const WATER_LEVEL = 10;

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

/** The two village lanes across the map, north and south of the middle fields. */
const LANE_N: Point[] = [[24, 234], [200, 238], [400, 228], [600, 236], [776, 232]];
const LANE_S: Point[] = [[24, 420], [215, 416], [400, 426], [600, 418], [776, 422]];
/** The path round the lake's south shore, chapter 3 to chapter 4. */
const SHORE_S: Point[] = [[215, 616], [232, 706], [400, 714], [600, 706], [600, 616]];
const ROUTES: Point[][] = [
  // From the spawn to the lane and into chapter 1's zone.
  [[SPAWN.x, SPAWN.z], [SPAWN.x, 236]],
  [[SPAWN.x, 140], [210, 150]],
  LANE_N,
  LANE_S,
  // Lanes between the two lanes, and up to the village well.
  [[60, 236], [60, 418]],
  [[300, 233], [300, 421]],
  [[500, 232], [500, 422]],
  [[740, 234], [740, 421]],
  [[400, 228], [400, 128]],
  // Spurs into the zones: Mẩy's lane, the moonlit lane, down to the lake shores.
  [[210, 237], [210, 150]],
  [[560, 235], [560, 160]],
  [[215, 416], [215, 590]],
  [[600, 418], [600, 590]],
  // Into the den, up the slope to grandpa's house and over its top, across the lake on a plank bridge.
  [[560, 160], [DEN.x, DEN.z]],
  [[215, 580], [173, 575], [96, 590], [64, 572]],
  [[215, 590], [600, 590]],
  SHORE_S,
  [[400, 714], [400, 680]],
  [[600, 590], [WIND_MOUND.x, WIND_MOUND.z]],
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
  hammock: `${PACK.survival}/bedroll.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  lamp: `${PACK.roads}/light-curved.glb`,
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
};
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
    grass: block('grass'), dirt: block('dirt'), sand: block('sand'), stone: block('stone'), path: block('path'), planks: block('planks'), log: block('log'),
    grey: block('brick-grey'), moss: block('rock-moss'), water: block('water'), leaves: block('leaves'), board: block('board'), red: block('wood-red'), white: block('snow'),
  };
  const palette = cottagePalette(ctx);
  const claimed: Rect[] = [];
  const claim = (x0: number, z0: number, x1: number, z1: number): void => {
    claimed.push([x0, z0, x1, z1]);
    ctx.keepOut(x0, z0, x1, z1);
  };
  const isClaimed = (x0: number, z0: number, x1: number, z1: number): boolean => claimed.some(([a, b, c, d]) => x0 <= c && x1 >= a && z0 <= d && z1 >= b);
  const paint = (x: number, z: number, id: number): void => {
    if (!ctx.onPath(x, z) && !ctx.inWater(x, z)) world.set(x, ctx.surface(x, z), z, id);
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

  /** A porch along a house's front (-z): a plank floor, a roof carrying on from the eaves, a post at each end. */
  const porch = (x0: number, z0: number, w: number, base: number, roof: number): void => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0 - 3; z < z0; z++) world.set(x, base, z, B.planks);
    for (let x = x0 - 1; x <= x0 + w; x++) for (let z = z0 - 3; z <= z0 - 2; z++) put(world, x, base + 4, z, roof);
    for (const x of [x0, x0 + w - 1]) for (let y = base + 1; y <= base + 3; y++) put(world, x, y, z0 - 3, B.log);
  };

  /** A haystack: a low dome of straw. */
  const haystack = (cx: number, cz: number, base: number): void => {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(world, cx + dx, base + 1, cz + dz, B.sand);
    put(world, cx, base + 2, cz, B.sand);
  };

  let homes = 0;
  /**
   * A homestead whose house has its door at (x, z) side -z: the house and its porch, the kitchen hut with a
   * chimney east of it, a well, a haystack and a vegetable bed in the yard, a fence on the lane, fruit trees,
   * bamboo behind. Returns the house's width, the porch's height and its door column.
   */
  const homestead = (x: number, z: number, opts: { hammock?: boolean; chair?: boolean } = {}): { w: number; base: number; doorX: number } => {
    const n = homes++;
    const w = 9 + (n % 3) * 2;
    const d = 7 + (n % 2);
    const plot: Rect = [x - 2, z - 9, x + w + 7, z + d + 3];
    const base = levelPlot(...plot);
    const roof = palette.roofs[(n + Math.floor(n / 3)) % palette.roofs.length] ?? B.red;
    placeHouse(world, x, z, w, d, 3, base + 1, { wall: palette.walls[n % palette.walls.length] ?? B.planks, roof, trim: palette.trim });
    porch(x, z, w, base, roof);
    const doorX = x + Math.floor(w / 2);
    // Kitchen hut and its chimney, water jar and firewood.
    const kx = x + w + 1;
    placeHouse(world, kx, z + 1, 5, 5, 2, base + 1, { wall: B.planks, roof: palette.roofs[(n + 1) % palette.roofs.length] ?? B.red, trim: B.log });
    for (let y = base + 1; y <= base + 7; y++) put(world, kx + 3, y, z + 4, B.grey);
    ctx.prop(M.jar, kx, z - 1, n * 23);
    ctx.prop(M.logs, kx + 5, z + 4, 90);
    placeWell(world, kx + 3, z - 5, base, { stone: B.grey, water: B.water });
    if (n % 2 === 0) ctx.prop(M.bucket, kx + 1, z - 5, n * 41);
    haystack(x + 1, z - 6, base);
    for (let i = 0; i < 2; i++) ctx.prop(M.cabbage, x + 4 + i * 2, z - 6, i * 70);
    ctx.prop(FLOWERS[n % 3] ?? M.flowerRed, x - 1, z - 2, n * 13);
    ctx.prop(FLOWERS[(n + 1) % 3] ?? M.flowerRed, x + w, z - 2, n * 17);
    // The fence on the lane, gaps at the gate; fruit trees; bamboo behind the house.
    for (let fx = x - 2; fx <= x + w + 6; fx += 2) if (Math.abs(fx - doorX) > 1) ctx.prop(M.fence, fx, z - 9, 0);
    ctx.prop(YARD_TREES[n % YARD_TREES.length] ?? M.fatTree, x - 2, z + 2, n * 37);
    if (n % 2 === 1) ctx.prop(YARD_TREES[(n + 2) % YARD_TREES.length] ?? M.oak, x + w + 6, z - 3, n * 29);
    for (let bx = x - 1; bx <= x + w + 6; bx += 4) ctx.prop(M.bamboo, bx, z + d + 2, (bx * 37) % 360);
    if (opts.hammock) ctx.propAt(M.hammock, [x + 2.5, base + 1.6, z - 1.5], 90);
    if (opts.chair) ctx.centred(M.chair, x + w - 2, z - 2, 200);
    claim(...plot);
    return { w, base, doorX };
  };

  /**
   * Homesteads in rows filling a rectangle, lanes between the rows, gaps of different widths between them
   * and now and then an orchard corner instead of a house; skips zones, water, paths, hills and what is claimed.
   */
  const village = (x0: number, z0: number, x1: number, z1: number): void => {
    for (let row = 0, z = z0 + 9; z + 12 <= z1; z += 25, row++) {
      let x = x0 + 2 + (row % 2) * 6;
      while (x + 18 <= x1) {
        const w = 9 + (homes % 3) * 2;
        const zz = z + ((x * 7 + row * 3) % 3) - 1;
        const plot: Rect = [x - 2, zz - 9, x + w + 7, zz + 11];
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
  /** A corner of fruit trees with a haystack and a bench where a homestead could have stood. */
  const orchard = (x: number, z: number): void => {
    for (let i = 0; i < 6; i++) ctx.prop(YARD_TREES[(i + x) % YARD_TREES.length] ?? M.oak, x + (i % 3) * 6, z - 6 + Math.floor(i / 3) * 8, i * 50 + x);
    haystack(x + 3, z + 6, ctx.surface(x + 3, z + 6));
    ctx.prop(M.bench, x + 9, z - 1, 0);
    claim(x - 2, z - 9, x + 16, z + 11);
  };
  const plotFree = ([x0, z0, x1, z1]: Rect): boolean => {
    if (x0 < 14 || z0 < 14 || x1 > 785 || z1 > 785 || isClaimed(x0, z0, x1, z1)) return false;
    if (Math.hypot((x0 + x1) / 2 - SPAWN.x - 4, (z0 + z1) / 2 - SPAWN.z) < 26) return false;
    let lo = Infinity;
    let hi = -Infinity;
    for (let x = x0 - 4; x <= x1 + 4; x++) {
      for (let z = z0 - 4; z <= z1 + 4; z++) {
        if (ctx.onPath(x, z) || ctx.inWater(x, z) || ctx.inZone(x, z)) return false;
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

  /** A fenced plot (inclusive) of a crop in rows three blocks apart, fence posts every three blocks, claimed. */
  const field = (x0: number, z0: number, x1: number, z1: number, crop: string): void => {
    for (let x = x0 + 2; x < x1 - 1; x += 3) for (let z = z0 + 2; z < z1 - 1; z += 3) if (!ctx.onPath(x, z)) ctx.prop(crop, x, z, (x * 31 + z * 7) % 360);
    for (let x = x0; x <= x1; x += 3) for (const z of [z0, z1]) if (!ctx.onPath(x, z)) ctx.prop(M.fence, x, z, 0);
    for (let z = z0 + 3; z < z1; z += 3) for (const x of [x0, x1]) if (!ctx.onPath(x, z)) ctx.prop(M.fence, x, z, 90);
    claim(x0, z0, x1, z1);
  };

  /** A scarecrow: a log post with plank arms, a straw head and a sun hat. */
  const scarecrow = (x: number, z: number): void => {
    const y = ctx.surface(x, z);
    for (let k = 1; k <= 3; k++) put(world, x, y + k, z, B.log);
    for (const dx of [-1, 1]) put(world, x + dx, y + 2, z, B.planks);
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
  return { B, claim, isClaimed, isClaimedAt, paint, levelPlot, porch, haystack, homestead, village, paddy, field, scarecrow, cave };
}

export async function generateXomMaiAm() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'xom-mai-am',
    seedText: 'miu-xom-mai-am',
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    water: { level: WATER_LEVEL, covers: inWater },
    shape: (x, z, h) => h + hill(GRANDPA_HILL, x, z) + hill(DEN_HILL, x, z) + hill(WIND_MOUND, x, z),
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: { skip: 0.72, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.1 ? 'leaves-autumn' : roll < 0.32 ? 'leaves-pink' : 'leaves') }) },
    models: {
      heights: {
        [M.bamboo]: 5, [M.fatTree]: 4.5, [M.palm]: 7, [M.banana]: 3.2, [M.oak]: 5, [M.flowerRed]: 0.5, [M.flowerYellow]: 0.5, [M.flowerPurple]: 0.5,
        [M.bush]: 1.2, [M.pebble]: 0.5, [M.fence]: 1, [M.lily]: 0.1, [M.lilySmall]: 0.08, [M.canoe]: 0.6, [M.corn]: 1.6, [M.carrot]: 0.45,
        [M.dirtRow]: 0.25, [M.cabbage]: 0.5, [M.rice]: 0.7, [M.riceRipe]: 1, [M.rock]: 2.2, [M.logs]: 0.9, [M.jar]: 0.9, [M.bucket]: 0.6,
        [M.barrel]: 1, [M.hammock]: 0.3, [M.bench]: 0.96, [M.lamp]: 4.8, [M.chair]: 1, [M.table]: 0.8, [M.bowl]: 0.3, [M.egg]: 0.25, [M.lotus]: 0.7,
        [M.loofah]: 0.7, [M.door]: 2, [M.shell]: 0.4, [M.hat]: 0.5, [M.kite]: 1.2,
      },
      centred: [M.chair, M.table],
    },
    dressing: { models: [M.flowerRed, M.flowerYellow, M.flowerPurple, M.bush, M.pebble], spacing: 7 },
    build: (ctx) => {
      const { world, block, rng, ground, zone, surface } = ctx;
      const b = builders(ctx);
      const { B } = b;
      const [lane, porches, shore, field] = [1, 2, 3, 4].map(zone) as [Zone, Zone, Zone, Zone];

      // Chapter 1, the flower garden: a fence round it with a gate on the lane side, beds of flowers, the
      // loofah trellis at its far end, the bee wall, the cabbage bed in the corner, daisies along the fence.
      const garden = { x0: 220, z0: 120, x1: 250, z1: 142 };
      for (let x = garden.x0; x <= garden.x1; x += 2) for (const z of [garden.z0, garden.z1]) ctx.prop(M.fence, x, z, 0);
      for (let z = garden.z0 + 2; z < garden.z1; z += 2) {
        if (Math.abs(z - 131) > 2) ctx.prop(M.fence, garden.x0, z, 90);
        ctx.prop(M.fence, garden.x1, z, 90);
      }
      for (const z of [128, 134]) for (let y = ground + 1; y <= ground + 3; y++) world.set(garden.x0, y, z, B.log);
      for (let z = 128; z <= 134; z++) world.set(garden.x0, ground + 4, z, B.red);
      ctx.landmark('cong-vuon-hoa', 'Cổng vườn hoa', garden.x0 - 2, 131);
      for (let x = garden.x0 + 3; x < 240; x += 3) for (let z = garden.z0 + 3; z < garden.z1 - 1; z += 3) ctx.prop(FLOWERS[(x + z) % 3] ?? M.flowerRed, x, z, (x * 17 + z * 29) % 360);
      const trellis = { x0: 242, z0: 122, x1: 248, z1: 128 };
      for (const [x, z] of [[trellis.x0, trellis.z0], [trellis.x1, trellis.z0], [trellis.x0, trellis.z1], [trellis.x1, trellis.z1]] as const) for (let y = ground + 1; y <= ground + 3; y++) world.set(x, y, z, B.log);
      for (let x = trellis.x0; x <= trellis.x1; x++) for (let z = trellis.z0; z <= trellis.z1; z++) if ((x + z) % 3 !== 0) world.set(x, ground + 4, z, B.leaves);
      for (let i = 0; i < 6; i++) ctx.propAt(M.loofah, [trellis.x0 + 1.5 + (i % 3) * 2, ground + 3.2, trellis.z0 + 2.5 + Math.floor(i / 3) * 2], i * 60);
      ctx.landmark('gian-muop', 'Giàn mướp', 245, 125);
      for (let z = 136; z <= 140; z++) world.set(248, ground + 1, z, B.planks);
      for (let z = 136; z <= 140; z++) for (let y = ground + 2; y <= ground + 3; y++) world.set(248, y, z, z % 2 === 0 ? B.sand : B.planks);
      for (let x = 242; x <= 246; x += 2) for (let z = 136; z <= 140; z += 2) ctx.prop(M.cabbage, x, z, x * 7 + z);
      for (let x = garden.x0 + 1; x < garden.x1; x += 2) ctx.prop(M.flowerYellow, x, garden.z1 + 1, x * 31);
      ctx.landmark('vuon-hoa', 'Vườn hoa', 232, 131);
      // Mẩy's house down the lane, its hammock under the porch; the straw nest with eggs in the yard; the
      // bamboo at the lane's mouth, the fig tree and the rattan chair beside the lane; the duckweed pond.
      const may = b.homestead(222, 166, { hammock: true, chair: true });
      ctx.landmark('nha-may', 'Nhà Mẩy', may.doorX, 162);
      for (let a = 0; a < 12; a++) world.set(Math.round(240 + 2 * Math.cos((a / 12) * Math.PI * 2)), ground + 1, Math.round(150 + 2 * Math.sin((a / 12) * Math.PI * 2)), B.sand);
      for (let i = 0; i < 3; i++) ctx.propAt(M.egg, [240.2 + i * 0.4, ground + 1, 150.3 + (i % 2) * 0.4], i * 50);
      b.claim(237, 147, 243, 153);
      ctx.landmark('to-rom', 'Tổ rơm', 240, 150);
      for (const x of [204, 206, 214, 216]) for (const z of [178, 181, 184]) ctx.prop(M.bamboo, x, z, x * 11 + z);
      ctx.prop(M.fatTree, 204, 166, 30);
      ctx.landmark('goc-sung', 'Gốc sung', 204, 166);
      ctx.centred(M.chair, 214, 172, 270);
      ctx.centred(M.table, 214, 175, 0);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = POND.r * (0.3 + 0.55 * (((i * 7) % 5) / 5));
        ctx.propAt(M.lilySmall, [POND.x + Math.cos(a) * r + 0.5, WATER_LEVEL + 1.02, POND.z + Math.sin(a) * r + 0.5], i * 40);
      }
      ctx.landmark('ao-beo', 'Ao bèo', POND.x, POND.z - POND.r - 1);
      // The neighbours down Mẩy's lane; fruit trees along the zone's north edge and the straw yard below them.
      b.homestead(lane.x - 38, lane.z + 18);
      for (let x = lane.x - 42; x <= lane.x + 2; x += 7) ctx.prop(YARD_TREES[Math.floor(x / 7) % YARD_TREES.length] ?? M.oak, x, lane.z - 32, x * 13);
      for (const [dx, dz] of [[-30, -24], [-22, -26], [-12, -22]] as const) {
        b.haystack(lane.x + dx, lane.z + dz, ground);
        b.claim(lane.x + dx - 1, lane.z + dz - 1, lane.x + dx + 1, lane.z + dz + 1);
      }
      ctx.prop(M.bench, lane.x - 16, lane.z - 14, 0);

      // Chapter 2: two homesteads either side of the moonlit lane, their porches on a shared yard (a hammock
      // under one, a rattan chair at the end of the other), the bamboo bed in the yard, the star-fruit tree at
      // the lane's mouth, lamps down the lane, the sapodilla garden.
      b.homestead(522, 176, { hammock: true });
      b.homestead(574, 176, { chair: true });
      ctx.landmark('hien-nha', 'Hiên nhà', 560, 166);
      for (let x = 544; x <= 546; x++) for (let z = 148; z <= 149; z++) world.set(x, ground + 1, z, B.planks);
      ctx.landmark('chong-tre', 'Chõng tre', 545, 148);
      ctx.centred(M.table, 549, 140, 0);
      ctx.prop(M.oak, 567, 191, 40);
      ctx.landmark('goc-khe', 'Gốc khế', 567, 191);
      for (let z = 166; z <= 194; z += 7) ctx.prop(M.lamp, z % 2 === 0 ? 557 : 563, z, z % 2 === 0 ? 90 : 270);
      for (let z = 198; z <= 230; z += 8) ctx.prop(M.lamp, z % 16 === 6 ? 556 : 564, z, 90);
      bambooHedge(ctx, [[555, 196], [555, 230]]);
      bambooHedge(ctx, [[565, 196], [565, 230]]);
      const sapodilla = { x0: 520, z0: 130, x1: 540, z1: 146 };
      for (let x = sapodilla.x0; x <= sapodilla.x1; x += 2) for (const z of [sapodilla.z0, sapodilla.z1]) ctx.prop(M.fence, x, z, 0);
      for (let z = sapodilla.z0 + 2; z < sapodilla.z1; z += 2) for (const x of [sapodilla.x0, sapodilla.x1]) ctx.prop(M.fence, x, z, 90);
      ctx.prop(M.fatTree, 530, 138, 10);
      flowerBed(ctx, 523, 133, 4, 4);
      flowerBed(ctx, 533, 141, 4, 4);
      ctx.landmark('cay-vu-sua', 'Cây vú sữa', 530, 138);
      // A third porch on the yard's north side; flowers along the moonlit lane.
      b.homestead(porches.x + 14, porches.z - 26);
      for (let z = 167; z <= 193; z += 3) for (const x of [553, 567]) if (z !== 191) ctx.prop(FLOWERS[(z + x) % 3] ?? M.flowerRed, x, z, z * 7);
      // The warm stone den in the foot of the hill: a feast on a table inside, a field of boulders before it,
      // a stone wall carved with writing, tall rocks at its mouth.
      b.cave(DEN.x + 4, DEN.z, 6, 6, surface(DEN.x + 4, DEN.z));
      ctx.centred(M.table, DEN.x + 5, DEN.z, 0);
      for (let i = 0; i < 3; i++) ctx.propAt(M.bowl, [DEN.x + 4.6 + i * 0.5, surface(DEN.x + 5, DEN.z) + 1.8, DEN.z + 0.5], i * 30);
      b.claim(DEN.x - 3, DEN.z - 7, DEN.x + 11, DEN.z + 7);
      ctx.landmark('hang-da', 'Hang đá', DEN.x + 4, DEN.z, surface(DEN.x + 4, DEN.z) + 1);
      for (const [x, z] of [[608, 150], [612, 170], [616, 146], [606, 168], [619, 174]] as const) ctx.prop(M.rock, x, z, x * 7);
      for (let i = 0; i < 24; i++) ctx.prop(M.pebble, 605 + ((i * 7) % 16), 148 + ((i * 11) % 26), i * 31);
      for (let x = 610; x <= 618; x++) for (let k = 1; k <= 4; k++) world.set(x, surface(x, 141) + k, 141, k === 3 && x % 2 === 0 ? B.board : B.stone);
      ctx.landmark('vach-da', 'Vách đá khắc chữ', 614, 139);
      for (const z of [DEN.z - 3, DEN.z + 3]) for (let k = 1; k <= 4 - Math.abs(z - DEN.z) % 2; k++) world.set(DEN.x - 3, surface(DEN.x - 3, z) + k, z, B.moss);

      // Chapter 3: the old hut on the west shore with its wooden door off its hinges, the sand beach beside it,
      // the stone wall studded with shells, the pebble strand at the water's edge, a boat drawn up.
      const hut = { x0: 238, z0: 560, w: 8, d: 6 };
      placeHouse(world, hut.x0, hut.z0, hut.w, hut.d, 3, ground + 1, { wall: B.planks, roof: B.red, trim: B.log });
      b.claim(hut.x0 - 1, hut.z0 - 2, hut.x0 + hut.w, hut.z0 + hut.d);
      ctx.propAt(M.door, [hut.x0 + hut.w / 2 + 1.6, ground + 1, hut.z0 - 0.7], 20);
      ctx.landmark('choi-cu', 'Chòi cũ bên bờ', hut.x0 + hut.w / 2, hut.z0 - 2);
      for (let x = 248; x <= 290; x++) for (let z = 550; z <= 586; z++) if (!ctx.inZone(x, z) || x > 236) b.paint(x, z, B.sand);
      ctx.landmark('bai-cat', 'Bãi cát', 262, 572);
      for (let x = 246; x <= 290; x++) for (let z = 596; z <= 618; z++) if ((x * 7 + z * 3) % 5 !== 0) b.paint(x, z, B.grey);
      for (let i = 0; i < 30; i++) ctx.prop(M.pebble, 250 + ((i * 13) % 26), 598 + ((i * 7) % 18), i * 47);
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
      bambooHedge(ctx, [[172, 571], [96, 585]]);
      bambooHedge(ctx, [[172, 580], [100, 595]]);
      ctx.prop(M.rock, 132, 589, 40);
      ctx.landmark('tang-da', 'Tảng đá lưng dốc', 132, 589, surface(132, 589) + 1);
      const top = surface(GRANDPA_HILL.x, GRANDPA_HILL.z);
      placeHouse(world, 80, 596, 11, 8, 3, top + 1, { wall: B.sand, roof: block('brick-red'), trim: B.log });
      b.porch(80, 596, 11, top, block('brick-red'));
      for (let x = 82; x <= 88; x++) world.set(x, top + 1, 592, B.grey);
      ctx.propAt(M.hammock, [82.5, top + 1.6, 594.5], 90);
      ctx.prop(M.oak, 94, 604, 70);
      ctx.prop(M.palm, 77, 590, 10);
      b.claim(76, 590, 96, 606);
      ctx.landmark('nha-ong', 'Nhà ông', 85, 592, top + 1);
      for (let i = 0; i < 10; i++) ctx.prop(M.pebble, 64 + ((i * 5) % 30), 566 + ((i * 3) % 10), i * 20);
      ctx.landmark('dinh-doc', 'Đỉnh dốc', 66, 574, surface(66, 574) + 1);
      // Trees stay off the beach and the strand; a fisher's homestead in the zone's north-west, bamboo by the hut.
      ctx.keepOut(258, 548, 292, 588);
      ctx.keepOut(258, 594, 292, 620);
      b.homestead(shore.x - 37, shore.z - 26);
      for (let i = 0; i < 6; i++) ctx.prop(M.bamboo, hut.x0 - 3 - (i % 2) * 2, hut.z0 + 1 + Math.floor(i / 2) * 2, i * 40);
      ctx.prop(M.logs, hut.x0 + hut.w + 1, hut.z0 + 3, 0);

      // Chapter 4: lotus and lily pads all over the lake, thick along the east shore; the ferry landing at the
      // lake's far end; Mother Bống's grotto on the shore; grandma's homestead and her carrot beds; the house
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
      ctx.landmark('ho-sen', 'Hồ sen', LAKE.x, 560);
      ctx.landmark('mep-ho-sen', 'Mép hồ sen', 530, 575);
      jetty(ctx, LAKE.x, Math.ceil(lakeShoreZ(LAKE.x, 1) ?? LAKE.z + LAKE.rz) + 1, 10, -1, WATER_LEVEL);
      ctx.landmark('ben-do', 'Bến đò', LAKE.x, 680);
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
      ctx.landmark('luong-ca-rot', 'Luống cà rốt', 576, 604);
      b.homestead(614, 606);
      for (let z = 596; z <= 618; z += 2) ctx.prop(M.fence, 609, z, 90);
      ctx.prop(M.oak, 632, 560, 15);
      ctx.landmark('goc-cay-de', 'Gốc cây dẻ', 632, 560);
      b.field(652, 548, 700, 584, M.corn);
      b.scarecrow(676, 566);
      ctx.landmark('ruong-ngo', 'Ruộng ngô', 676, 566);
      b.field(652, 612, 700, 646, M.carrot);
      const mound = surface(WIND_MOUND.x, WIND_MOUND.z);
      placeWindmill(world, WIND_MOUND.x + 6, WIND_MOUND.z, mound + 1, { planks: B.planks, log: B.log, roof: block('brick-red'), sail: B.white });
      b.claim(WIND_MOUND.x + 2, WIND_MOUND.z - 4, WIND_MOUND.x + 10, WIND_MOUND.z + 4);
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

      // The village well under the old tree in the north, between the two northern districts.
      placeAncientTree(world, 412, ground + 1, 118, { log: block('tree-log'), leaves: B.leaves, core: B.log }, rng);
      placeWell(world, 400, 112, surface(400, 112), { stone: B.grey, water: B.water });
      b.claim(392, 104, 420, 126);
      ctx.landmark('gieng-xom', 'Giếng xóm', 400, 112);
      for (const [x, z] of [[394, 108], [406, 106]] as const) ctx.prop(M.bench, x, z, 0);
      flowerBed(ctx, 392, 98, 16, 3);
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

      // Homesteads everywhere else, lamps along the lanes, bamboo round the hamlet.
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
      // West below the lane down to grandpa's hill, east of chapter 4, and the hamlet south-west of the lake.
      b.village(14, 424, 175, 520);
      b.village(620, 424, 786, 545);
      b.village(14, 672, 250, 786);
      b.village(150, 486, 270, 545);
      b.village(100, 622, 300, 672);
      b.village(520, 620, 650, 700);
      for (const route of [LANE_N, LANE_S, SHORE_S, ...ROUTES.slice(4, 8)]) lampRow(ctx, route);
      for (let i = 14; i <= 786; i += 5) {
        for (const [x, z] of [[i, 13], [i, 787], [13, i], [787, i]] as const) if (!ctx.onPath(x, z) && !b.isClaimedAt(x, z)) ctx.prop(M.bamboo, x, z, (x * 37 + z) % 360);
      }
    },
  });
}

await runIfMain(import.meta.url, generateXomMaiAm);

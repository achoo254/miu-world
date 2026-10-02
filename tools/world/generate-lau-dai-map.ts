// Generates "Lâu đài" (Toán topics 5 and 7, the end-of-term review) from a fixed seed, 800 x 800 blocks in
// the style of the owner's world mocks (designs/the-gioi/, cliffs and falls after designs/nui-tuyet/
// b-11-nui-toan-canh.png): a great stone castle on the high ground under a range of rocky mountains whose
// falls pour into its moat. High walls with corner towers and blue and red roofs, the keep and the great
// hall inside, a wide moat crossed at the south gate by a three-span suspension bridge and at the west by
// the postern. Three districts, one per chapter:
// - west, on the high ground (chapter 1, "Sân hình khối"): the painters' court of giant coloured shapes, the
//   drawing room with its stained glass, the rose window, the stone veranda over the lawn, the picture
//   gallery; the artists' hamlet round it, a pine wood and a waterfall pond behind.
// - inside the walls (chapter 2, "Đại sảnh ôn tập"): the courtyard before the great hall dressed for the
//   end-of-term show, the open-air stage with its backdrop, wings, lighting rig and steps, rows of seats
//   down a flower aisle, the backstage with the teddy store, the cake corner and the puppet booth, the
//   review stalls, the badge podium, the paper-flower arch and the car park; the castle's houses, garden,
//   fountain and bazaar round it.
// - before the gate (chapter 3, "Cầu treo trước cổng thành"): the bridgehead, the island under the middle
//   span, the meadow, willows on the moat bank, and below the slope the terraced rice paddies; then the town
//   at the foot of the hill (coloured roofs, the little market with its fountain, fields, a windmill).
// The road up to the castle is lit by lamps all the way; pines cover the eastern hills.
// Output: assets/generated/world/lau-dai/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain, smoothstep } from './map-kit';
import { fbm, hashSeed } from './noise';
import { cottageRow, fieldPlot, flowerBed, jetty, lampRow } from './scenery';
import { placeFountain, placeStall, placeWell, placeWindmill } from './structures/countryside';
import type { Point } from './structures/path';
import { placeTree } from './structures/tree';
import { put } from './structures/world-writer';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'lau-dai';
const SIZE = 800;
/** The high ground the castle and the painters' court stand on; the town and the paddies lie lower. */
const LEVEL = 16;
const LOW = 12;
const WATER_LEVEL = 14;
const SEED = hashSeed('miu-lau-dai-land');

/** Castle walls (outer faces, inclusive, two blocks thick), the south gate and the west postern. */
const WALLS = { x0: 300, x1: 580, z0: 100, z1: 330 };
const GATE_X = 440;
const POSTERN_Z = 290;
const WALL_TOP = LEVEL + 11;
/** The south moat: two channels with a low island between them under the bridge's middle span. */
const SOUTH = { a0: 332, a1: 343, i0: 344, i1: 351, b0: 352, b1: 363 };
/** The pond the western fall pours into, and the falls themselves (x of each, and the first water row south). */
const POND = { x: 130, z: 98, r: 10 };
/** A pond in a clearing of the pine forest, the woodcutters' camp beside it. */
const FOREST_POND = { x: 660, z: 330, r: 8 };
const CAMP = { x0: 626, z0: 228, x1: 684, z1: 272 };
const FALLS: ReadonlyArray<readonly [number, number]> = [[130, POND.z - POND.r + 1], [380, WALLS.z0 - 10], [500, WALLS.z0 - 10]];

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

export const ZONES: readonly Zone[] = [
  { chapter: 1, id: 'san-hinh-khoi', name: 'Sân hình khối', x: 160, z: 260, hx: 64, hz: 52 },
  { chapter: 2, id: 'dai-sanh-on-tap', name: 'Đại sảnh ôn tập', x: 440, z: 225, hx: 70, hz: 48, floor: 'path' },
  { chapter: 3, id: 'cau-treo-cong-thanh', name: 'Cầu treo trước cổng thành', x: 440, z: 396, hx: 72, hz: 40 },
];

const SPAWN = { x: 60, z: 345 };
/** The road up to the castle: from the town's south edge through the paddies, over the bridge, to the hall door. */
const AVENUE: Point[] = [[440, 776], [440, 172]];
/** From the spawn to the painters' court, on past it over the west moat into the castle by the postern. */
const COURT_ROAD: Point[] = [[SPAWN.x, SPAWN.z], [160, 345], [160, 260]];
const POSTERN_LANE: Point[] = [[160, 260], [250, 260], [250, POSTERN_Z], [566, POSTERN_Z]];
/** Down the slope from the court to the town's main street, along it and north up the forest road. */
const LOWLAND_ROAD: Point[] = [[160, 345], [160, 480], [240, 560], [700, 560], [700, 140]];
const FOREST_ROAD: Point[] = [[440, 400], [700, 400]];
const TOWN_STREETS: Point[][] = [
  [[240, 660], [700, 660]],
  [[240, 750], [700, 750]],
  [[240, 560], [240, 750]],
  [[320, 560], [320, 750]],
  [[560, 560], [560, 750]],
  [[160, 480], [60, 480], [60, 776]],
];
const ROUTES: Point[][] = [
  AVENUE,
  COURT_ROAD,
  POSTERN_LANE,
  LOWLAND_ROAD,
  FOREST_ROAD,
  ...TOWN_STREETS,
  // North from the court past the artists' hamlet to the waterfall pond.
  [[160, 260], [160, 116]],
];

/** Terraced rice paddies (inclusive) on the slope below the castle. */
const PADDIES = [
  { x0: 250, z0: 446, x1: 428, z1: 540 },
  { x0: 452, z0: 446, x1: 650, z1: 540 },
];

const N = PACK.nature;
const P = PACK.props;
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
  teddy: `${P}/teddy-bear.glb`,
  medal: `${P}/medal-gold.glb`,
  cake: `${P}/birthday-cake.glb`,
  scale: `${P}/balance-scale.glb`,
  clock: `${P}/clock-face.glb`,
  abacus: `${P}/abacus.glb`,
  dolls: `${P}/nesting-dolls.glb`,
  car: `${P}/automobile.glb`,
  bus: `${P}/school-bus.glb`,
  table: `${PACK.furniture}/table.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  barrel: `${PACK.survival}/barrel.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  fence: `${N}/fence_simple.glb`,
  flowers: [`${N}/flower_redA.glb`, `${N}/flower_yellowB.glb`, `${N}/flower_purpleA.glb`],
};
const TABLE_TOP = 0.8;

const inRect = (x: number, z: number, x0: number, z0: number, x1: number, z1: number): boolean => x >= x0 && x <= x1 && z >= z0 && z <= z1;

const inMoat = (x: number, z: number): boolean => {
  if (x < WALLS.x0 - 10 || x > WALLS.x1 + 10 || z < WALLS.z0 - 10 || z > SOUTH.b1) return false;
  const west = x <= WALLS.x0 - 3;
  const east = x >= WALLS.x1 + 3;
  const north = z <= WALLS.z0 - 3;
  const south = (z >= SOUTH.a0 && z <= SOUTH.a1) || (z >= SOUTH.b0 && z <= SOUTH.b1);
  return west || east || north || south;
};
const inWater = (x: number, z: number): boolean => inMoat(x, z) || Math.hypot(x - POND.x, z - POND.z) < POND.r || Math.hypot(x - FOREST_POND.x, z - FOREST_POND.z) < FOREST_POND.r;

/** 1 inside a rectangle, fading to 0 over `fade` blocks outside it. */
const rectWeight = (x: number, z: number, x0: number, z0: number, x1: number, z1: number, fade: number): number => {
  const d = Math.hypot(Math.max(0, x0 - x, x - x1), Math.max(0, z0 - z, z - z1));
  return fade <= 0 ? (d === 0 ? 1 : 0) : 1 - smoothstep(0, fade, d);
};

/**
 * The land: level high ground under the castle and the west district (where houses stand), the rocky range
 * in terraces along the north, pine hills to the east, the low town and fields south of the slope, the low
 * island in the south moat.
 */
function shapeLand(x: number, z: number, h: number): number {
  const edge = Math.min(x, z, SIZE - 1 - x, SIZE - 1 - z);
  const rim = edge < 10 ? (10 - edge) * 1.1 : 0;
  const flat = Math.max(rectWeight(x, z, 14, 100, 292, 450, 6), rectWeight(x, z, WALLS.x0 - 2, WALLS.z0 - 2, WALLS.x1 + 2, WALLS.z1 + 1, 0), rectWeight(x, z, 246, 364, 596, 446, 4), rectWeight(x, z, CAMP.x0, CAMP.z0, CAMP.x1, CAMP.z1, 6));
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
  out = out * (1 - low) + (LOW + rim) * low;
  if (inRect(x, z, WALLS.x0 - 2, SOUTH.i0, WALLS.x1 + 2, SOUTH.i1)) out = WATER_LEVEL;
  return out;
}

export async function generateLauDai() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'lau-dai',
    seedText: 'miu-lau-dai',
    outland: 'castle',
    ground: { ground: LEVEL, roll: 3 },
    zones: ZONES,
    spawn: { x: SPAWN.x, z: SPAWN.z, yaw: 0 },
    shape: shapeLand,
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: { skip: 0.78, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.1 ? 'leaves-autumn' : roll < 0.32 ? 'leaves-pink' : 'leaves') }) },
    // A wall clock, the bigger frames and star of the drawing room, the toy bus (content/world/models.json has the usual sizes).
    sizes: { [M.picture]: 1.2, [M.star]: 0.9, [M.clock]: 1, [M.bus]: 2.6 },
    // The castle town: sentries on the walls, the trumpeter, painters, the hall's stagehands, the town below.
    life: ({ landmark }) => [
      ...crowd('sentry', ['Chú lính gác', 'Cô lính gác'], [person('d'), person('g'), person('c')], landmark('cong-thanh'), 10, 4, [LIFE_HELD.axe]),
      ...crowd('sentry', ['Lính trên tháp'], [person('d')], landmark('thap-chinh'), 10, 2, [LIFE_HELD.axe]),
      ...crowd('trumpeter', ['Chú thổi kèn'], [person('c'), person('k')], landmark('dai-sanh'), 10, 2, [LIFE_HELD.flute]),
      ...crowd('teacher', ['Thầy dạy vẽ'], [person('a')], landmark('phong-ve'), 6, 1, [LIFE_HELD.palette]),
      ...crowd('reader', ['Bạn vẽ tranh'], [person('f'), person('o'), person('p')], landmark('phong-tranh'), 8, 3, [LIFE_HELD.palette]),
      ...crowd('porter', ['Chú dựng sân khấu'], [person('j'), person('b')], landmark('hau-truong'), 8, 3, [LIFE_HELD.crate]),
      ...crowd('pupil', ['Bạn xem diễn'], [person('f'), person('n'), person('q'), person('r')], landmark('hang-ghe'), 8, 6),
      ...crowd('vendor', ['Bác bán bánh', 'Cô bán hoa'], [person('h'), person('e')], landmark('cho-trong-thanh'), 10, 4, [LIFE_HELD.apple]),
      ...crowd('shopper', ['Người đi chợ'], [person('l'), person('k')], landmark('cho-nho'), 16, 5, [LIFE_HELD.basket]),
      ...crowd('vendor', ['Bác bán rau thị trấn'], [person('b'), person('m')], landmark('cho-nho'), 10, 3, [LIFE_HELD.apple]),
      ...crowd('ploughman', ['Bác nông dân'], [person('m'), person('a')], landmark('canh-dong'), 20, 4, [LIFE_HELD.hoe]),
      ...crowd('rice-planter', ['Cô cấy lúa chân đồi'], [person('e'), person('h')], landmark('ruong-lua'), 20, 4, [LIFE_HELD.basket]),
      ...crowd('ferryman', ['Ông câu cá hào'], [person('m')], landmark('bo-hao-giua'), 8, 2),
      ...crowd('cow', ['Bò vàng'], [animal('cow')], landmark('canh-dong'), 30, 5),
      ...crowd('dog', ['Chó canh thành'], [animal('dog')], landmark('bai-co-truoc-cong'), 12, 3),
      ...crowd('chick', ['Gà con'], [animal('chick')], landmark('thi-tran'), 10, 6),
      ...crowd('pig', ['Lợn nhà nông'], [animal('pig')], landmark('canh-dong'), 16, 4),
      ...crowd('chick', ['Gà mái chân đồi'], [animal('chick')], landmark('ruong-lua'), 14, 6),
      ...crowd('cat', ['Mèo chợ thành'], [animal('cat')], landmark('cho-trong-thanh'), 14, 5),
      ...crowd('dog', ['Cún thị trấn'], [animal('dog')], landmark('thi-tran'), 16, 3),
    ],
    build: (base) => {
      // Every footprint the map builds, so houses, pines and stalls keep out of each other.
      const taken = new Uint8Array(SIZE * SIZE);
      const ctx: ZoneMapContext = {
        ...base,
        keepOut: (x0, z0, x1, z1) => {
          for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(SIZE - 1, Math.max(x0, x1)); x++) for (let z = Math.max(0, Math.min(z0, z1)); z <= Math.min(SIZE - 1, Math.max(z0, z1)); z++) taken[x * SIZE + z] = 1;
          base.keepOut(x0, z0, x1, z1);
        },
      };
      /** The same context on the low ground (cottages and stalls stand on its level). */
      const low: ZoneMapContext = { ...ctx, ground: LOW };
      const isTaken = (x: number, z: number, pad = 0): boolean => {
        for (let dx = -pad; dx <= pad; dx++) for (let dz = -pad; dz <= pad; dz++) if (taken[(x + dx) * SIZE + z + dz] === 1) return true;
        return false;
      };
      const { world, block, rng } = ctx;
      const B = {
        stone: block('brick-grey'), cobble: block('stone'), moss: block('rock-moss'), grass: block('grass'), path: block('path'), planks: block('planks'),
        log: block('log'), birch: block('birch-log'), sand: block('sand'), red: block('brick-red'), wood: block('wood-red'), blue: block('roof-blue'),
        white: block('snow'), green: block('board'), glass: block('glass'), water: block('water'), asphalt: block('asphalt'),
        leaves: block('leaves'), pink: block('leaves-pink'), trunk: block('tree-log'),
      };
      const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void => {
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) put(world, x, y, z, id);
      };
      const top = LEVEL + 1;
      const onTable = (model: string, x: number, z: number, y = top, yaw = 0): void => ctx.propAt(model, [x + 0.5, y + TABLE_TOP, z + 0.5], yaw);
      const table = (x: number, z: number, items: readonly string[], yaw = 0, y = top): void => {
        ctx.centred(M.table, x, z, yaw);
        items.forEach((m, i) => onTable(m, x + (i - (items.length - 1) / 2) * 0.6, z, y, yaw));
        ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
      };

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
        }
        ctx.keepOut(fx - 4, crest, fx + 4, zWater - 1);
      }
      ctx.landmark('thac-nuoc', 'Thác nước sau lâu đài', 440, WALLS.z0 - 14, ctx.surface(440, WALLS.z0 - 14) + 1);

      // ---------------------------------------------------------------------------------------------------
      // The castle: curtain walls eleven high with battlements, towers at the corners, mid-walls and the gate.
      for (let x = WALLS.x0; x <= WALLS.x1; x++) {
        for (let z = WALLS.z0; z <= WALLS.z1; z++) {
          const ring = x <= WALLS.x0 + 1 || x >= WALLS.x1 - 1 || z <= WALLS.z0 + 1 || z >= WALLS.z1 - 1;
          if (!ring) continue;
          const gate = z >= WALLS.z1 - 1 && Math.abs(x - GATE_X) <= 4;
          const postern = x <= WALLS.x0 + 1 && Math.abs(z - POSTERN_Z) <= 3;
          for (let y = ctx.surface(x, z) + 1; y <= WALL_TOP; y++) {
            if ((gate && y <= LEVEL + 6) || (postern && y <= LEVEL + 5)) continue;
            put(world, x, y, z, B.stone);
          }
          const outer = x === WALLS.x0 || x === WALLS.x1 || z === WALLS.z0 || z === WALLS.z1;
          if (outer && (x + z) % 2 === 0) put(world, x, WALL_TOP + 1, z, B.stone);
        }
      }
      ctx.keepOut(WALLS.x0, WALLS.z0, WALLS.x1, WALLS.z0 + 2);
      ctx.keepOut(WALLS.x0, WALLS.z1 - 2, WALLS.x1, WALLS.z1 + 1);
      ctx.keepOut(WALLS.x0, WALLS.z0, WALLS.x0 + 2, WALLS.z1);
      ctx.keepOut(WALLS.x1 - 2, WALLS.z0, WALLS.x1, WALLS.z1);
      /** A square tower (half side `r`), hollow, slit windows, battlements and a pyramid roof with a banner. */
      const tower = (cx: number, cz: number, r: number, height: number, roof: number): void => {
        const y0 = Math.min(ctx.surface(cx, cz), LEVEL) + 1;
        const yTop = LEVEL + height;
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            for (let y = y0; y <= yTop; y++) {
              const slit = (dx === 0 || dz === 0) && (y - LEVEL) % 5 === 3;
              put(world, cx + dx, y, cz + dz, slit ? B.glass : B.stone);
            }
            if ((dx + dz) % 2 === 0) put(world, cx + dx, yTop + 1, cz + dz, B.stone);
          }
        }
        for (let k = 0; k <= r; k++) box(cx - r - 1 + k, yTop + 2 + k, cz - r - 1 + k, cx + r + 1 - k, yTop + 2 + k, cz + r + 1 - k, roof);
        ctx.propAt(M.flag, [cx + 0.5, yTop + r + 3, cz + 0.5], 0);
        ctx.keepOut(cx - r - 1, cz - r - 1, cx + r + 1, cz + r + 1);
      };
      const roofs = [B.blue, B.wood];
      [[WALLS.x0 + 3, WALLS.z0 + 3], [WALLS.x1 - 3, WALLS.z0 + 3], [WALLS.x0 + 3, WALLS.z1 - 3], [WALLS.x1 - 3, WALLS.z1 - 3]].forEach(([tx = 0, tz = 0], i) => tower(tx, tz, 4, 17, roofs[i % 2] ?? B.blue));
      [[WALLS.x0 + 2, 200], [WALLS.x1 - 2, 200], [370, WALLS.z0 + 2], [510, WALLS.z0 + 2], [370, WALLS.z1 - 2], [510, WALLS.z1 - 2]].forEach(([tx = 0, tz = 0], i) => tower(tx, tz, 3, 15, roofs[(i + 1) % 2] ?? B.wood));
      // The gatehouse: two tall towers flanking the gate, an arch of sand over it, banners on its face.
      tower(GATE_X - 10, WALLS.z1 - 3, 4, 19, B.blue);
      tower(GATE_X + 10, WALLS.z1 - 3, 4, 19, B.blue);
      for (let x = GATE_X - 5; x <= GATE_X + 5; x++) put(world, x, LEVEL + 7, WALLS.z1, B.sand);
      for (const dx of [-3, 3]) ctx.propAt(M.flagWide, [GATE_X + dx + 0.5, LEVEL + 8, WALLS.z1 + 1.2], 0);
      ctx.landmark('cong-thanh', 'Cổng thành', GATE_X, WALLS.z1 - 1);
      // The postern: two small turrets and a log lintel over the way in from the west.
      tower(WALLS.x0 + 1, POSTERN_Z - 7, 2, 13, B.wood);
      tower(WALLS.x0 + 1, POSTERN_Z + 7, 2, 13, B.wood);
      for (let z = POSTERN_Z - 4; z <= POSTERN_Z + 4; z++) put(world, WALLS.x0 - 1, LEVEL + 6, z, B.log);
      ctx.landmark('cong-tay', 'Cổng tây', WALLS.x0, POSTERN_Z);

      // The keep: a tall stone tower block with window rows, battlements and four roofed turrets.
      const keep = { x0: 424, z0: 106, x1: 456, z1: 134 };
      for (let x = keep.x0; x <= keep.x1; x++) {
        for (let z = keep.z0; z <= keep.z1; z++) {
          const edge = x === keep.x0 || x === keep.x1 || z === keep.z0 || z === keep.z1;
          if (!edge) continue;
          const along = z === keep.z0 || z === keep.z1 ? x - keep.x0 : z - keep.z0;
          for (let y = top; y <= LEVEL + 21; y++) put(world, x, y, z, (y - LEVEL) % 5 === 3 && along % 4 === 2 ? B.glass : B.stone);
          if ((x + z) % 2 === 0) put(world, x, LEVEL + 22, z, B.stone);
        }
      }
      box(keep.x0 + 1, LEVEL + 21, keep.z0 + 1, keep.x1 - 1, LEVEL + 21, keep.z1 - 1, B.stone);
      for (const [tx, tz] of [[keep.x0, keep.z0], [keep.x1, keep.z0], [keep.x0, keep.z1], [keep.x1, keep.z1]] as const) {
        box(tx - 2, top, tz - 2, tx + 2, LEVEL + 25, tz + 2, B.stone);
        for (let k = 0; k <= 3; k++) box(tx - 3 + k, LEVEL + 26 + k, tz - 3 + k, tx + 3 - k, LEVEL + 26 + k, tz + 3 - k, B.blue);
        ctx.propAt(M.flag, [tx + 0.5, LEVEL + 30, tz + 0.5], 0);
      }
      box(436, LEVEL + 22, 116, 444, LEVEL + 25, 124, B.stone);
      for (let k = 0; k <= 5; k++) box(435 + k, LEVEL + 26 + k, 115 + k, 445 - k, LEVEL + 26 + k, 125 - k, B.wood);
      ctx.keepOut(keep.x0 - 3, keep.z0 - 3, keep.x1 + 3, keep.z1 + 3);
      ctx.landmark('thap-chinh', 'Tháp chính', 440, keep.z1 + 2);

      /**
       * A hall of stone (or any walls) with its door on the south (+z), tall windows of stained glass along
       * both long sides and a gable roof along x rising `rise` a row. Returns the door's column.
       */
      const hallHouse = (x0: number, z0: number, w: number, d: number, wallH: number, baseY: number, b: { wall: number; roof: number; trim: number }, rise: number, doorW = 2): { doorX: number } => {
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
              const door = z === z1 && Math.abs(x - doorX) <= doorW - 1 && y < baseY + 3;
              const win = !corner && !door && y >= baseY + 2 && y <= baseY + Math.min(4, wallH - 2) && (ez ? (x - x0) % 4 === 2 : (z - z0) % 4 === 2);
              if (door) continue;
              put(world, x, y, z, win ? (stained[(x + z + y) % stained.length] ?? B.glass) : corner ? b.trim : b.wall);
            }
          }
        }
        const half = Math.ceil((d + 2) / 2);
        for (let z = z0 - 1; z <= z1 + 1; z++) {
          const step = Math.min(z - (z0 - 1), z1 + 1 - z);
          const y = baseY + wallH + Math.floor(step * rise);
          for (let x = x0 - 1; x <= x1 + 1; x++) {
            put(world, x, y, z, b.roof);
            if ((x === x0 || x === x1) && step > 0 && step < half) for (let fy = baseY + wallH; fy < y; fy++) put(world, x, fy, z, b.wall);
          }
        }
        ctx.keepOut(x0 - 1, z0 - 1, x1 + 1, z1 + 1);
        return { doorX };
      };

      // The great hall north of the courtyard, its door on the avenue; benches and banners inside.
      const greatHall = { x0: 395, z0: 140, w: 91, d: 33 };
      hallHouse(greatHall.x0, greatHall.z0, greatHall.w, greatHall.d, 9, top, { wall: B.stone, roof: B.wood, trim: B.sand }, 0.5, 3);
      for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) if (i !== 3) ctx.prop(M.bench, 410 + i * 12, 150 + row * 5, 0);
      box(420, top, 142, 460, top, 145, B.planks);
      ctx.landmark('dai-sanh', 'Đại sảnh', GATE_X, greatHall.z0 + greatHall.d - 1);
      ctx.landmark('cua-dai-sanh', 'Cửa đại sảnh', GATE_X, greatHall.z0 + greatHall.d + 1);

      // ---------------------------------------------------------------------------------------------------
      // Chapter 2: the courtyard before the great hall, dressed for the end-of-term show.
      // The open-air stage facing east: platform two blocks high, backdrop, wings, lighting rig, steps.
      const stage = { x0: 380, z0: 190, x1: 402, z1: 220 };
      box(stage.x0, top, stage.z0, stage.x1, top + 1, stage.z1, B.planks);
      for (let z = stage.z0; z <= stage.z1; z++) for (let y = top + 2; y <= top + 8; y++) put(world, stage.x0, y, z, z === stage.z0 || z === stage.z1 || y === top + 8 ? B.sand : (y + z) % 5 === 0 ? B.white : B.blue);
      for (const z of [stage.z0, stage.z1]) box(stage.x0 + 1, top + 2, z, stage.x0 + 6, top + 7, z, B.wood);
      for (const z of [stage.z0 - 1, stage.z1 + 1]) box(stage.x1 + 1, top, z, stage.x1 + 1, top + 9, z, B.log);
      for (let z = stage.z0 - 1; z <= stage.z1 + 1; z++) put(world, stage.x1 + 1, top + 10, z, z % 4 === 0 ? B.glass : B.log);
      for (let z = 202; z <= 208; z++) put(world, stage.x1 + 1, top, z, B.planks);
      ctx.keepOut(stage.x0 - 1, stage.z0 - 2, stage.x1 + 2, stage.z1 + 2);
      ctx.landmark('san-khau', 'Sân khấu', stage.x1 - 4, 205, top + 2);
      ctx.landmark('phong-nen', 'Phông nền sân khấu', stage.x0 + 1, 205, top + 2);
      ctx.landmark('canh-ga', 'Cánh gà sân khấu', stage.x0 + 4, stage.z0 + 1, top + 2);
      ctx.landmark('gian-den', 'Giàn đèn sân khấu', stage.x1 + 1, stage.z0 - 1);
      ctx.landmark('bac-len-san-khau', 'Bậc lên sân khấu', stage.x1 + 1, 205);
      // Rows of seats either side of the flower aisle, arches of paper flowers over it.
      for (let x = 410; x <= 432; x += 4) for (let z = 192; z <= 218; z += 3) if (Math.abs(z - 205) > 2) ctx.prop(M.bench, x, z, 270);
      for (let x = 405; x <= 436; x += 2) for (const z of [203, 207]) ctx.prop(M.flowers[(x + z) % 3] ?? M.fence, x, z, x * 20);
      for (const x of [412, 422, 432]) {
        for (const z of [202, 208]) box(x, top, z, x, top + 3, z, B.log);
        for (let z = 202; z <= 208; z++) put(world, x, top + 4, z, B.pink);
      }
      ctx.keepOut(408, 190, 434, 220);
      ctx.landmark('hang-ghe', 'Hàng ghế', 420, 196);
      ctx.landmark('loi-di-ket-hoa', 'Lối đi kết hoa', 420, 205);
      ctx.landmark('khan-phong', 'Khán phòng', 426, 214);
      // Backstage behind the backdrop: barrels, a pile of the backdrop's frame bars, the teddy store, the cake corner.
      for (const [x, z] of [[373, 192], [375, 194], [373, 214], [376, 218]] as const) ctx.prop(M.barrel, x, z, x * 30);
      box(372, top, 199, 377, top + 1, 201, B.log);
      ctx.keepOut(371, 190, 378, 220);
      ctx.landmark('hau-truong', 'Hậu trường', 375, 206);
      ctx.landmark('dong-thanh-go', 'Đống thanh gỗ khung phông', 374, 200);
      const shed = { x0: 371, z0: 228, x1: 379, z1: 234 };
      for (let x = shed.x0; x <= shed.x1; x++) for (let z = shed.z0; z <= shed.z1; z++) {
        const wall = z === shed.z0 || x === shed.x0 || z === shed.z1;
        if (wall && x !== shed.x1) box(x, top, z, x, top + 3, z, B.planks);
        put(world, x, top + 4, z, B.blue);
      }
      for (let i = 0; i < 4; i++) ctx.prop(M.teddy, shed.x1 - 1 - (i % 2) * 2, shed.z0 + 1 + i, 90);
      ctx.keepOut(shed.x0, shed.z0, shed.x1 + 1, shed.z1);
      ctx.landmark('kho-thu-bong', 'Kho thú bông', shed.x1, (shed.z0 + shed.z1) / 2);
      table(375, 246, [M.cake, M.cake]);
      table(375, 252, [M.cake]);
      ctx.landmark('goc-banh', 'Góc bánh', 375, 249);
      // The puppet booth: a little red-curtained stage on a plank base, the dolls on its sill.
      const puppet = { x: 394, z: 248 };
      box(puppet.x - 3, top, puppet.z, puppet.x + 3, top, puppet.z + 2, B.planks);
      for (const dx of [-3, 3]) box(puppet.x + dx, top + 1, puppet.z, puppet.x + dx, top + 4, puppet.z, B.wood);
      box(puppet.x - 3, top + 5, puppet.z, puppet.x + 3, top + 5, puppet.z, B.blue);
      for (let dx = -2; dx <= 2; dx++) ctx.propAt(M.dolls, [puppet.x + dx + 0.5, top + 1, puppet.z + 1.5], 180);
      ctx.keepOut(puppet.x - 4, puppet.z - 1, puppet.x + 4, puppet.z + 3);
      ctx.landmark('buc-mua-roi', 'Bục múa rối', puppet.x, puppet.z - 2);

      // The review stalls east of the avenue (the end-of-term booths), each with its subject on the counter.
      const awnings = [[B.wood, B.white], [B.blue, B.white], [B.sand, B.wood], [B.green, B.white]] as const;
      const stalls: ReadonlyArray<{ id: string; name: string; x0: number; z0: number; items: readonly string[] }> = [
        { id: 'gian-tia-so', name: 'Gian tia số', x0: 450, z0: 207, items: [M.ruler, M.ruler] },
        { id: 'gian-dong-ho', name: 'Gian đồng hồ', x0: 461, z0: 207, items: [M.clock] },
        { id: 'gian-dat-tinh', name: 'Gian đặt tính', x0: 478, z0: 207, items: [M.abacus, M.abacus] },
        { id: 'gian-do-chieu-cao', name: 'Gian đo chiều cao', x0: 489, z0: 207, items: [M.ruler] },
        { id: 'gian-hinh-phang', name: 'Gian hình phẳng', x0: 450, z0: 230, items: [M.triangle, M.puzzle] },
        { id: 'gian-can-dong', name: 'Gian cân đong', x0: 461, z0: 230, items: [M.scale] },
        { id: 'gian-bai-toan', name: 'Gian bài toán', x0: 472, z0: 230, items: [M.abacus, M.ruler] },
      ];
      stalls.forEach((s, i) => {
        placeStall(world, s.x0, s.z0, 7, 4, top, { log: B.log, planks: B.planks, stripes: awnings[i % awnings.length] ?? [B.wood] });
        s.items.forEach((m, k) => ctx.prop(m, s.x0 + 2 + k * 2, s.z0, 180));
        ctx.keepOut(s.x0 - 1, s.z0 - 2, s.x0 + 7, s.z0 + 4);
        ctx.landmark(s.id, s.name, s.x0 + 3, s.z0 - 2);
      });
      // The calendar table beside the clock stall; a measuring post by the height stall, striped every block.
      table(472, 205, [M.clock]);
      ctx.landmark('ban-lich', 'Bàn lịch cạnh gian đồng hồ', 472, 203);
      for (let y = top; y <= top + 5; y++) put(world, 497, y, 205, y % 2 === 0 ? B.wood : B.white);
      // The pin board: a green board on posts with the class's pictures pinned on its face.
      box(483, top, 232, 489, top + 3, 232, B.green);
      for (const x of [483, 489]) put(world, x, top + 4, 232, B.log);
      for (let i = 0; i < 3; i++) ctx.propAt(i % 2 ? M.picture : M.pictureYellow, [484.5 + i * 2, top + 1.5, 231.4], 180);
      ctx.keepOut(482, 231, 490, 233);
      ctx.landmark('gia-ghim-tranh', 'Giá ghim tranh', 486, 229);
      // The badge podium: three tiers with medals on top.
      for (const [dx, hgt, id] of [[0, 3, B.sand], [-3, 2, B.white], [3, 1, B.wood]] as const) {
        box(456 + dx - 1, top, 254, 456 + dx + 1, top + hgt - 1, 256, id);
        ctx.prop(M.medal, 456 + dx, 255, 180);
      }
      ctx.keepOut(451, 253, 461, 257);
      ctx.landmark('buc-huy-hieu', 'Bục huy hiệu', 456, 251);
      // The paper-flower arch over the avenue at the courtyard's entrance.
      for (const x of [GATE_X - 4, GATE_X + 4]) for (const z of [262, 266]) box(x, top, z, x, top + 4, z, B.log);
      box(GATE_X - 4, top + 5, 262, GATE_X + 4, top + 5, 266, B.pink);
      for (let x = GATE_X - 4; x <= GATE_X + 4; x += 2) for (const z of [262, 266]) put(world, x, top + 4, z, B.pink);
      ctx.landmark('gian-hoa-giay', 'Giàn hoa giấy', GATE_X, 264);
      // The corner where the wooden platforms are built: planks stacked in piles, a half-built platform, barrels.
      for (const [x, z, hgt] of [[494, 252, 2], [498, 252, 1], [494, 258, 1], [502, 260, 2]] as const) box(x, top, z, x + 2, top + hgt - 1, z + 1, B.planks);
      box(496, top, 264, 505, top, 268, B.planks);
      for (const [x, z] of [[503, 254], [505, 257]] as const) ctx.prop(M.barrel, x, z, 0);
      ctx.keepOut(493, 251, 506, 269);
      ctx.landmark('goc-dung-buc-go', 'Góc dựng bục gỗ', 499, 249);
      // The car park before the great hall: asphalt with white lines, cars in their bays and the school bus.
      box(488, LEVEL, 178, 508, LEVEL, 198, B.asphalt);
      for (let x = 490; x <= 506; x += 6) for (let z = 178; z <= 186; z++) put(world, x, LEVEL, z, B.white);
      for (const x of [493, 499, 505]) ctx.prop(M.car, x, 182, 180);
      ctx.prop(M.bus, 497, 193, 90);
      ctx.keepOut(487, 177, 509, 199);
      ctx.landmark('san-do-xe', 'Sân đỗ xe trước đại sảnh', 498, 200);

      // Inside the walls round the courtyard: the castle's houses, its garden with the fountain, the bazaar.
      const houses = (c: ZoneMapContext, x0: number, z0: number, x1: number, z1: number, rowEvery = 22): void => {
        for (let z = z0 + 8; z + 9 <= z1; z += rowEvery) {
          let x = x0;
          while (x + 13 <= x1) {
            let clear = true;
            for (let cx = x - 1; cx <= x + 14 && clear; cx++) for (let cz = z - 8; cz <= z + 9 && clear; cz++) {
              if (c.onPath(cx, cz) || c.inWater(cx, cz) || c.inZone(cx, cz, 1) || isTaken(cx, cz)) clear = false;
            }
            if (!clear) {
              x += 4;
              continue;
            }
            x = cottageRow(c, x, z, 1).x1 + 2;
          }
        }
      };
      houses(ctx, WALLS.x0 + 3, WALLS.z0 + 3, 366, WALLS.z1 - 3);
      houses(ctx, 514, WALLS.z0 + 3, WALLS.x1 - 3, WALLS.z1 - 3);
      houses(ctx, 372, WALLS.z0 + 3, 420, 136, 16);
      houses(ctx, 460, WALLS.z0 + 3, 512, 136, 16);
      const fountain = placeFountain(world, 400, 308, top, { stone: B.stone, water: B.water });
      ctx.propAt(M.flag, fountain.plinth, 0);
      ctx.keepOut(395, 303, 405, 313);
      ctx.landmark('dai-phun-nuoc', 'Đài phun nước trong thành', 400, 302);
      flowerBed(ctx, 376, 298, 10, 4);
      flowerBed(ctx, 414, 298, 10, 4);
      flowerBed(ctx, 376, 316, 10, 4);
      for (const [x, z] of [[384, 310], [416, 310]] as const) ctx.prop(M.bench, x, z, 90);
      for (const [x, z] of [[372, 306], [428, 306], [380, 322], [420, 322]] as const) {
        placeTree(world, x, top, z, 6, { log: B.trunk, leaves: B.pink }, rng);
        ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
      }
      [456, 468, 480, 492].forEach((x0, i) => {
        placeStall(world, x0, 296, 6, 4, top, { log: B.log, planks: B.planks, stripes: awnings[(i + 1) % awnings.length] ?? [B.wood] });
        ctx.prop(i % 2 ? M.pumpkin : M.bucket, x0 + 2, 296, 0);
        ctx.prop(M.barrel, x0 + 4, 300, 0);
        ctx.keepOut(x0 - 1, 294, x0 + 6, 300);
      });
      placeWell(world, 474, 315, LEVEL, { stone: B.stone, water: B.water });
      ctx.keepOut(472, 313, 476, 317);
      ctx.landmark('cho-trong-thanh', 'Chợ trong thành', 474, 294);
      // No wild trees in the wards: the castle's own trees are planted.
      for (const [x0, z0, x1, z1] of [[WALLS.x0 + 2, WALLS.z0 + 2, 366, WALLS.z1 - 2], [514, WALLS.z0 + 2, WALLS.x1 - 2, WALLS.z1 - 2], [367, WALLS.z0 + 2, 513, 138], [367, 275, 513, WALLS.z1 - 2]] as const) base.keepOut(x0, z0, x1, z1);

      // ---------------------------------------------------------------------------------------------------
      // Chapter 3: the three-span suspension bridge over the south moat, the island under its middle span.
      const deckY = WATER_LEVEL + 1;
      for (let z = SOUTH.a0; z <= SOUTH.b1; z++) for (const x of [GATE_X - 2, GATE_X + 2]) put(world, x, deckY, z, B.planks);
      for (let z = SOUTH.i0; z <= SOUTH.i1; z++) for (let x = GATE_X - 2; x <= GATE_X + 2; x++) put(world, x, deckY, z, B.planks);
      const pylons = [WALLS.z1 + 1, SOUTH.i0, SOUTH.i1, SOUTH.b1 + 1];
      const pylonTop = deckY + 11;
      for (const z of pylons) {
        for (const x of [GATE_X - 2, GATE_X + 2]) box(x, Math.min(ctx.surface(x, z) + 1, deckY), z, x, pylonTop, z, B.log);
        for (let x = GATE_X - 2; x <= GATE_X + 2; x++) put(world, x, pylonTop + 1, z, B.log);
      }
      for (let s = 0; s + 1 < pylons.length; s++) {
        const [za = 0, zb = 0] = [pylons[s], pylons[s + 1]];
        for (let z = za + 1; z < zb; z++) {
          const t = (z - za) / (zb - za);
          const y = Math.round(deckY + 2 + (pylonTop - deckY - 2) * (2 * t - 1) ** 2);
          for (const x of [GATE_X - 2, GATE_X + 2]) {
            put(world, x, y, z, B.log);
            // Over the island the deck is open at its sides, so the child can step down under the middle span.
            if (s === 1) continue;
            put(world, x, deckY + 1, z, B.planks);
            if (z % 2 === 0) for (let yy = deckY + 2; yy < y; yy++) put(world, x, yy, z, B.log);
          }
        }
      }
      for (const dx of [-2, 2]) ctx.propAt(M.flagWide, [GATE_X + dx + 0.5, pylonTop + 2, SOUTH.b1 + 1.5], 0);
      ctx.landmark('cau-treo', 'Cầu treo', GATE_X, (SOUTH.a0 + SOUTH.b1) / 2, deckY + 1);
      ctx.landmark('nhip-cau-dau', 'Nhịp cầu đầu', GATE_X, (SOUTH.b0 + SOUTH.b1) / 2, deckY + 1);
      ctx.landmark('nhip-cau-giua', 'Nhịp cầu giữa', GATE_X, (SOUTH.i0 + SOUTH.i1) / 2, deckY + 1);
      ctx.landmark('nhip-cau-cuoi', 'Nhịp cầu cuối', GATE_X, (SOUTH.a0 + SOUTH.a1) / 2, deckY + 1);
      ctx.landmark('gam-cau', 'Gầm cầu', GATE_X - 4, SOUTH.i0 + 2, WATER_LEVEL + 1);
      ctx.landmark('bo-hao-giua', 'Bờ hào dưới nhịp giữa', GATE_X + 6, SOUTH.i0 + 4, WATER_LEVEL + 1);
      // Reeds and flowers on the island; boats moored at a little jetty off the south bank.
      for (let x = WALLS.x0; x <= WALLS.x1; x += 3) if (Math.abs(x - GATE_X) > 5) ctx.prop(M.flowers[x % 3] ?? M.fence, x, SOUTH.i0 + 1 + (x % 5), x);
      jetty(ctx, 404, SOUTH.b1 + 1, 6, -1, WATER_LEVEL);
      jetty(ctx, 478, SOUTH.b1 + 1, 6, -1, WATER_LEVEL);
      // The bridgehead: a paved landing with lamps and benches; the meadow before the gate; willows by the moat.
      for (let x = GATE_X - 9; x <= GATE_X + 9; x++) for (let z = SOUTH.b1 + 2; z <= SOUTH.b1 + 9; z++) put(world, x, ctx.surface(x, z), z, B.path);
      for (const dx of [-8, 8]) ctx.prop(M.bench, GATE_X + dx, SOUTH.b1 + 6, 90);
      ctx.landmark('dau-cau-treo', 'Đầu cầu treo', GATE_X, SOUTH.b1 + 4);
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
      for (const x of [384, 412, 470, 498]) willow(x, SOUTH.b1 + 6 + (x % 3));
      ctx.landmark('goc-lieu', 'Gốc liễu bên hào nước', 412, SOUTH.b1 + 9);
      for (const [x, z] of [[392, 400], [418, 424], [470, 412], [500, 392], [380, 430]] as const) flowerBed(ctx, x, z, 6, 4);
      ctx.landmark('bai-co-truoc-cong', 'Bãi cỏ trước cổng thành', 480, 404);

      // The meadow's people: a gatekeeper's lodge, a ticket booth, picnic tables, pink trees and a fence on the bank.
      hallHouse(392, 414, 9, 6, 3, top, { wall: B.stone, roof: B.blue, trim: B.log }, 1);
      ctx.landmark('nha-gac', 'Nhà gác cổng', 396, 412);
      placeStall(world, 452, 376, 6, 4, top, { log: B.log, planks: B.planks, stripes: [B.wood, B.white] });
      ctx.prop(M.flagWide, 455, 380, 0);
      ctx.keepOut(451, 374, 458, 380);
      for (const [x, z] of [[488, 420], [500, 426], [372, 392]] as const) table(x, z, [M.cake]);
      for (const [x, z] of [[376, 410], [508, 380], [430, 430], [462, 432], [508, 432]] as const) {
        placeTree(world, x, top, z, 6, { log: B.trunk, leaves: B.pink }, rng);
        ctx.keepOut(x - 1, z - 1, x + 1, z + 1);
      }
      for (let x = WALLS.x0; x <= WALLS.x1; x += 2) if (Math.abs(x - GATE_X) > 10 && Math.abs(x - 404) > 3 && Math.abs(x - 478) > 3 && !isTaken(x, SOUTH.b1 + 2)) ctx.prop(M.fence, x, SOUTH.b1 + 2, 0);
      // Low hedges of leaves along the avenue through the meadow and round a flower bed (the child walks through).
      for (let z = SOUTH.b1 + 11; z <= 434; z++) for (const x of [GATE_X - 5, GATE_X + 5]) if (!ctx.onPath(x, z) && (z - SOUTH.b1) % 9 !== 0) put(world, x, top, z, z % 3 === 0 ? B.pink : B.leaves);
      for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2;
        put(world, Math.round(484 + Math.cos(t) * 7), top, Math.round(406 + Math.sin(t) * 7), a % 4 === 0 ? B.pink : B.leaves);
      }
      flowerBed(ctx, 481, 403, 6, 6);
      // Farmhouses on the high ground either side of the gate meadow.
      houses(ctx, 250, 366, 362, 444);
      houses(ctx, 518, 366, 596, 444);

      // The terraced rice paddies down the slope: flooded plots inside earth dykes, rice in rows.
      for (const p of PADDIES) {
        for (let x = p.x0; x <= p.x1; x++) {
          for (let z = p.z0; z <= p.z1; z++) {
            const dyke = (x - p.x0) % 12 === 0 || (z - p.z0) % 9 === 0 || x === p.x1 || z === p.z1;
            if (dyke || ctx.onPath(x, z) || ctx.nearPath(x, z, 2.5)) continue;
            world.set(x, ctx.surface(x, z), z, B.water);
            if ((x - p.x0) % 4 === 2 && (z - p.z0) % 4 === 1) ctx.prop(M.rice, x, z, (x * 13 + z * 7) % 360);
          }
        }
        ctx.keepOut(p.x0, p.z0, p.x1, p.z1);
      }
      ctx.landmark('ruong-lua', 'Ruộng lúa chân đồi', 380, 470, ctx.surface(380, 470) + 1);

      // ---------------------------------------------------------------------------------------------------
      // Chapter 1: the painters' court. A paved court of giant coloured shapes in the middle of the lawns.
      for (let x = 128; x <= 204; x++) for (let z = 234; z <= 288; z++) if (!ctx.onPath(x, z)) put(world, x, LEVEL, z, B.path);
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

      // The drawing room on the north side, its door and stained glass facing the court.
      const studio = { x0: 100, z0: 211, w: 30, d: 14 };
      const { doorX: studioDoor } = hallHouse(studio.x0, studio.z0, studio.w, studio.d, 5, top, { wall: B.sand, roof: B.red, trim: B.log }, 1);
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
      const rose = { x: 182, z: 214 };
      const glassColours = [B.blue, B.wood, B.sand, B.glass, B.green];
      for (let dx = -6; dx <= 6; dx++) for (let y = 0; y <= 12; y++) {
        const d = Math.hypot(dx, y - 6);
        const id = d <= 4.6 ? (glassColours[Math.floor(d * 1.2 + (Math.atan2(y - 6, dx) + Math.PI) * 1.3) % glassColours.length] ?? B.glass) : B.stone;
        put(world, rose.x + dx, top + y, rose.z, id);
      }
      ctx.keepOut(rose.x - 7, rose.z - 1, rose.x + 7, rose.z + 1);
      ctx.landmark('cua-so-kinh-mau', 'Cửa sổ kính màu', rose.x, rose.z + 3);
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
      for (const [x, z, w, d] of [[102, 246, 6, 4], [102, 270, 6, 4], [206, 236, 8, 3], [166, 296, 10, 3], [204, 298, 8, 4]] as const) flowerBed(ctx, x, z, w, d);

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
      }
      for (let x = gallery.x0 - 1; x <= gallery.x1 + 1; x++) for (const z of [gallery.z0 - 1, gallery.z1 + 1]) put(world, x, top + 6, z, B.blue);
      for (let x = gallery.x0 + 1; x < gallery.x1; x++) put(world, x, top + 4, gallery.z1 - 1, B.log);
      for (let x = gallery.x0 + 3; x < gallery.x1 - 1; x += 4) ctx.propAt(x % 8 < 4 ? M.picture : M.pictureYellow, [x + 0.5, top + 2.2, gallery.z1 - 0.4], 180);
      for (const z of [296, 300, 304]) ctx.propAt(M.flowers[z % 3] ?? M.fence, [gallery.x1 + 1.4, top + 2, z + 0.5], 0);
      box(gallery.x1 + 1, top + 1, 295, gallery.x1 + 1, top + 1, 305, B.planks);
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
      // The districts' everyday streets: the artists' hamlet round the court, the town at the foot of the hill.
      houses(ctx, 18, 196, 92, 336);
      houses(ctx, 230, 150, 286, 336);
      houses(ctx, 96, 350, 290, 446);
      houses(ctx, 18, 352, 92, 446);
      houses(ctx, 170, 116, 290, 200);
      // The little market by the avenue: a paved square, striped stalls with produce, the fountain.
      const market = { x0: 450, z0: 568, x1: 550, z1: 652 };
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
          ctx.keepOut(x0 - 1, z0 - 2, x0 + 6, z0 + 4);
          stallN++;
        }
      }
      ctx.landmark('cho-nho', 'Chợ nhỏ dưới chân thành', 500, 600, LOW + 1);
      for (const [x0, z0, x1, z1] of [[244, 565, 316, 656], [324, 565, 436, 656], [564, 565, 692, 656], [244, 665, 316, 746], [324, 665, 436, 746], [444, 665, 556, 746], [564, 665, 692, 746], [244, 755, 692, 787], [20, 486, 150, 787]] as const) houses(low, x0, z0, x1, z1);
      ctx.landmark('thi-tran', 'Thị trấn dưới chân thành', 380, 610, LOW + 1);
      // Fields round the town: fenced plots of corn and pumpkins, a windmill over them.
      for (let z = 590; z + 14 <= 786; z += 20) fieldPlot(low, 172, z, 190, z + 14, z % 3 === 0 ? M.pumpkin : M.corn);
      for (const x of [708, 760]) for (let z = 600; z + 14 <= 786; z += 20) {
        if (Math.hypot(x + 9 - 745, z + 7 - 640) < 16 || ctx.nearPath(x + 9, z + 7, 11)) continue;
        fieldPlot(low, x, z, x + 18, z + 14, (x + z) % 3 === 0 ? M.pumpkin : M.corn);
      }
      // Orchards between the fields: rows of fruit trees in blossom, green and turning.
      const orchard = (x0: number, z0: number, x1: number, z1: number): void => {
        for (let x = x0; x <= x1; x += 6) for (let z = z0; z <= z1; z += 6) {
          if (ctx.nearPath(x, z, 3) || isTaken(x, z, 2) || inWater(x, z)) continue;
          const leaves = [B.pink, B.leaves, B.pink, block('leaves-autumn')][(Math.floor(x / 6) + Math.floor(z / 6)) % 4] ?? B.leaves;
          placeTree(world, x, ctx.surface(x, z) + 1, z, 5 + ((x + z) % 2), { log: B.trunk, leaves }, rng);
          ctx.keepOut(x, z, x, z);
        }
      };
      orchard(200, 592, 232, 784);
      orchard(732, 600, 754, 784);
      orchard(708, 470, 784, 590);
      orchard(656, 450, 690, 552);
      placeWindmill(world, 745, 640, LOW + 1, { planks: B.planks, log: B.log, roof: B.red, sail: B.white });
      ctx.keepOut(741, 636, 749, 644);
      ctx.landmark('coi-xay-gio', 'Cối xay gió', 745, 646, LOW + 1);
      ctx.landmark('canh-dong', 'Cánh đồng', 745, 520, LOW + 1);

      // The woodcutters' camp in a clearing of the forest: huts, log piles, barrels; a lookout tower on the hill.
      cottageRow(ctx, CAMP.x0 + 4, CAMP.z0 + 26, 3);
      for (const [x, z] of [[632, 238], [640, 240], [650, 236], [664, 240]] as const) {
        box(x, top, z, x + 3, top + 1, z + 1, B.log);
        ctx.keepOut(x - 1, z - 1, x + 4, z + 2);
      }
      for (const [x, z] of [[672, 236], [674, 239]] as const) ctx.prop(M.barrel, x, z, 0);
      ctx.landmark('trai-tieu-phu', 'Trại tiều phu', 655, 248);
      tower(745, 190, 3, 16, B.wood);
      ctx.landmark('thap-canh', 'Tháp canh trong rừng', 745, 196, ctx.surface(745, 196) + 1);
      ctx.landmark('ho-trong-rung', 'Hồ trong rừng thông', FOREST_POND.x, FOREST_POND.z + FOREST_POND.r + 2);
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
        for (let gx = x0; gx <= x1; gx += spacing) for (let gz = z0; gz <= z1; gz += spacing) {
          const x = Math.round(gx + (rng() - 0.5) * spacing * 0.6);
          const z = Math.round(gz + (rng() - 0.5) * spacing * 0.6);
          if (x < 12 || z < 12 || x > SIZE - 13 || z > SIZE - 13) continue;
          if (ctx.nearPath(x, z, 4) || inWater(x, z) || ctx.inZone(x, z, 4) || isTaken(x, z, 3) || world.get(x, ctx.surface(x, z) + 1, z) !== 0) continue;
          if (FALLS.some(([fx]) => Math.abs(fx - x) < 6 && z < WALLS.z0)) continue;
          blockPine(x, z);
        }
      };
      blockPines(602, 106, 786, 446, 8);
      blockPines(14, 100, 156, 200, 10);
      blockPines(14, 16, 786, 90, 13);
      const pines = (x0: number, z0: number, x1: number, z1: number, spacing: number, keep: number): void => {
        for (let gx = x0; gx <= x1; gx += spacing) for (let gz = z0; gz <= z1; gz += spacing) {
          const x = Math.round(gx + (rng() - 0.5) * spacing * 0.8);
          const z = Math.round(gz + (rng() - 0.5) * spacing * 0.8);
          if (rng() > keep || x < 12 || z < 12 || x > SIZE - 13 || z > SIZE - 13) continue;
          if (ctx.nearPath(x, z, 3) || inWater(x, z) || ctx.inZone(x, z, 3) || isTaken(x, z, 2) || world.get(x, ctx.surface(x, z) + 1, z) !== 0) continue;
          if (FALLS.some(([fx]) => Math.abs(fx - x) < 5 && z < WALLS.z0)) continue;
          ctx.prop(rng() < 0.6 ? M.pine : M.pineRound, x, z, Math.floor(rng() * 360));
        }
      };
      pines(600, 106, 786, 446, 5, 0.6);
      pines(14, 100, 290, 200, 6, 0.55);
      pines(14, 14, 786, 92, 9, 0.5);
      base.keepOut(596, 102, 790, 448);
      ctx.landmark('rung-thong', 'Rừng thông', 690, 300, ctx.surface(690, 300) + 1);
      ctx.landmark('ho-thac', 'Hồ dưới thác', POND.x, POND.z + POND.r + 2);

      // Lamps along the road up to the castle and every street, benches by the court road.
      // (The court road's lamps start past the gate home beside the spawn.)
      for (const r of [AVENUE, [[SPAWN.x + 24, SPAWN.z], ...COURT_ROAD.slice(1)] as Point[], POSTERN_LANE, LOWLAND_ROAD, FOREST_ROAD, ...TOWN_STREETS]) lampRow(ctx, r, 16);
      ctx.landmark('duong-len-thanh', 'Đường lên thành', GATE_X, 470, ctx.surface(GATE_X, 470) + 1);
    },
  });
}

await runIfMain(import.meta.url, generateLauDai);

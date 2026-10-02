// Generates "Nông trại" (Toán topic 4) from a fixed seed, 800 x 800 blocks after the owner's farm mocks
// (designs/nong-trai/): fenced plots of vegetables, maize and pumpkins, a wooden windmill, red-roofed
// farmhouses, red barns with grey roofs and white trim, dairy cows, pink blossom trees among the green.
// The lessons' farm (chapter 1) is the heart of the map, fenced round with a flowered fence and entered by
// its gate: the windmill and its lawn, the hay barn and the hen house, the farmhouse, the granary with three
// doors, its porch with the glass cabinet and the bagging belt, the drying yard ruled in squares, the silos,
// the red cow barn, the tool workshop (repair bench, paint corner, planing bench, label shelf), the cart yard
// with its trains of produce carts, the fish pond with its bridge and the fry tank, the pigsty, the orchard
// with its stepping stones, the mango tree at its head and the squirrels' house up a rope ladder.
// Round it, on a grid of lamp-lit farm roads, the rest of the countryside: farmsteads (farmhouse, red barn,
// silo, windmill, kitchen plots, a cow paddock), market gardens of raised beds, wheat fields with haystacks,
// orchards, cow pastures, ponds, a creek across the south with plank bridges, glasshouses, and hamlets of
// farmers' cottages.
// Output: assets/generated/world/nong-trai/{regions/, horizon.bin, entities.json}
import { PACK, runIfMain } from './map-kit';
import { fieldPlot, flowerBed, hamlet, lampRow } from './scenery';
import { placeHouse } from './structures/buildings';
import { placeCottage, placeStall, placeWell, placeWindmill } from './structures/countryside';
import type { Point } from './structures/path';
import { placeAncientTree, placeTree } from './structures/tree';
import { put, type WorldWriter } from './structures/world-writer';
import { animal, crowd, person } from './village-life';
import { generateZoneMap, type Zone, type ZoneMapContext } from './zone-map';

export const MAP_ID = 'nong-trai';
const SIZE = 800;
const LEVEL = 12;
const WATER_LEVEL = 10;

/** The lessons' farm: the middle of the map, crossed by the farm road (x 400) and the lane (z 430). */
/** What the farm's people hold at their work. */
const LIFE_HELD = {
  basket: `${PACK.props}/basket.glb`,
  bucket: `${PACK.survival}/bucket.glb`,
  hoe: `${PACK.survival}/tool-hoe.glb`,
  book: `${PACK.props}/open-book.glb`,
  kite: `${PACK.props}/kite.glb`,
  crate: `${PACK.survival}/box.glb`,
  paddle: `${PACK.nature}/canoe_paddle.glb`,
  apple: `${PACK.food}/apple.glb`,
};

export const ZONES: readonly Zone[] = [{ chapter: 1, id: 'nong-trai', name: 'Nông trại', x: 400, z: 430, hx: 100, hz: 78 }];
const FARM = { x0: 300, z0: 352, x1: 500, z1: 508 };

interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** Farm roads: a grid across the whole map, lamps along them; the farm sits in the middle cell. */
const ROAD_X = [150, 270, 400, 530, 650];
const ROAD_Z = [150, 300, 430, 570, 690];
/** Cell edges of the road grid, the map's edge at both ends. */
const EDGES_X = [12, ...ROAD_X, 788];
const EDGES_Z = [12, ...ROAD_Z, 788];
/** Blocks between a road's centre line and the land beside it (lamps stand 3 from the line). */
const ROAD_GAP = 6;

type Use = 'farmstead' | 'veg' | 'orchard' | 'wheat' | 'pasture' | 'hamlet' | 'pond' | 'glasshouse' | 'farm';
/** What each cell of the road grid holds (rows north to south, columns west to east); 'farm' is the lessons' farm. */
const USES: readonly (readonly Use[])[] = [
  ['orchard', 'farmstead', 'veg', 'wheat', 'farmstead', 'pasture'],
  ['veg', 'pond', 'farmstead', 'hamlet', 'glasshouse', 'orchard'],
  ['farmstead', 'wheat', 'farm', 'farm', 'veg', 'farmstead'],
  ['pasture', 'hamlet', 'farm', 'farm', 'wheat', 'veg'],
  ['wheat', 'veg', 'orchard', 'pond', 'farmstead', 'veg'],
  ['hamlet', 'pasture', 'veg', 'farmstead', 'orchard', 'hamlet'],
];
const cellRect = (col: number, row: number): Rect => ({
  x0: (EDGES_X[col] ?? 0) + ROAD_GAP,
  z0: (EDGES_Z[row] ?? 0) + ROAD_GAP,
  x1: (EDGES_X[col + 1] ?? 0) - ROAD_GAP,
  z1: (EDGES_Z[row + 1] ?? 0) - ROAD_GAP,
});
const PARCELS = USES.flatMap((row, r) => row.map((use, c) => ({ use, col: c, row: r, rect: cellRect(c, r) })));
const centreOf = (r: Rect): [number, number] => [Math.round((r.x0 + r.x1) / 2), Math.round((r.z0 + r.z1) / 2)];

/** The farm's fish pond (its bridge is the path along x 352), the countryside's ponds, the creek's springs. */
const FISH_POND = { x: 350, z: 470, rx: 16, rz: 11 };
const PONDS = [
  FISH_POND,
  ...PARCELS.filter((p) => p.use === 'pond').map((p) => {
    const [x, z] = centreOf(p.rect);
    return { x, z, rx: Math.round((p.rect.x1 - p.rect.x0) * 0.32), rz: Math.round((p.rect.z1 - p.rect.z0) * 0.3) };
  }),
  // A watering pond in every pasture.
  ...PARCELS.filter((p) => p.use === 'pasture').map((p) => ({ x: Math.round(p.rect.x0 + (p.rect.x1 - p.rect.x0) * 0.72), z: Math.round(p.rect.z0 + (p.rect.z1 - p.rect.z0) * 0.4), rx: 11, rz: 7 })),
  { x: 40, z: 632, rx: 9, rz: 8 },
  { x: 752, z: 628, rx: 10, rz: 9 },
];
/** The creek winding west to east across the south of the map, between its two spring ponds. */
export const creekCenter = (x: number): number => 630 + 10 * Math.sin(x / 57) + 4 * Math.sin(x / 19 + 1);
const CREEK = { x0: 40, x1: 752, half: 3 };

/** Water by column, worked out once (the builder asks about every column many times over). */
const WATER = new Uint8Array(SIZE * SIZE);
for (let x = 0; x < SIZE; x++) {
  for (let z = 0; z < SIZE; z++) {
    const creek = x >= CREEK.x0 && x <= CREEK.x1 && Math.abs(z - creekCenter(x)) < CREEK.half + 0.8 * Math.sin(x / 13);
    if (creek || PONDS.some((p) => ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 < 1)) WATER[x * SIZE + z] = 1;
  }
}
const inWater = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < SIZE && z < SIZE && WATER[x * SIZE + z] === 1;
const nearWater = (x: number, z: number, r: number): boolean => {
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (inWater(x + dx, z + dz)) return true;
  return false;
};
const inRect = (r: Rect, x: number, z: number, pad = 0): boolean => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
const overlaps = (a: Rect, b: Rect): boolean => a.x0 <= b.x1 && b.x0 <= a.x1 && a.z0 <= b.z1 && b.z0 <= a.z1;

const ROUTES: Point[][] = [
  ...ROAD_X.map((x): Point[] => [[x, 24], [x, 776]]),
  ...ROAD_Z.map((z): Point[] => [[24, z], [776, z]]),
  // The footpath from the lane over the fish pond's bridge and on through the orchard.
  [[352, 430], [352, 570]],
];

const N = PACK.nature;
const S = PACK.survival;
const P = PACK.pets;
const M = {
  fence: `${N}/fence_simple.glb`,
  fruitTree: `${N}/tree_fat.glb`,
  bush: `${N}/plant_bushLarge.glb`,
  hay: `${S}/box-large.glb`,
  barrel: `${S}/barrel.glb`,
  bucket: `${S}/bucket.glb`,
  workbench: `${S}/workbench.glb`,
  anvil: `${S}/workbench-anvil.glb`,
  cartRed: `${PACK.props}/railway-red.glb`,
  cartBlue: `${PACK.props}/railway-blue.glb`,
  cartYellow: `${PACK.props}/railway-yellow.glb`,
  wheel: `${PACK.props}/wheel.glb`,
  brush: `${PACK.props}/paintbrush.glb`,
  gift: `${PACK.props}/gift-red.glb`,
  sack: `${PACK.props}/package-yellow.glb`,
  lily: `${N}/lily_large.glb`,
  logs: `${N}/log_stack.glb`,
  bench: `${PACK.box}/park-bench.glb`,
  cow: `${P}/animal-cow.glb`,
  pig: `${P}/animal-pig.glb`,
  chick: `${P}/animal-chick.glb`,
  corn: `${N}/crops_cornStageD.glb`,
  pumpkin: `${N}/crop_pumpkin.glb`,
  carrot: `${N}/crop_carrot.glb`,
  greens: `${N}/crops_leafsStageB.glb`,
  wheat: `${N}/crops_wheatStageB.glb`,
  melon: `${N}/crop_melon.glb`,
};
const CROPS = [M.corn, M.pumpkin, M.carrot, M.greens, M.wheat, M.melon] as const;
const CARTS = [M.cartRed, M.cartYellow, M.cartBlue] as const;
const PRODUCE = [M.pumpkin, M.melon, M.hay] as const;

/** A round silo of `wall` banded with `band`, under a dome of `roof`. */
function placeSilo(world: WorldWriter, cx: number, cz: number, baseY: number, b: { wall: number; band: number; roof: number }): void {
  const height = 11;
  for (let y = 0; y < height; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const d = Math.hypot(dx, dz);
        if (d <= 3.2 && d > 2.1) put(world, cx + dx, baseY + y, cz + dz, y % 4 === 3 ? b.band : b.wall);
      }
    }
  }
  for (let k = 0; k < 3; k++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dz) <= 3.2 - k * 1.1) put(world, cx + dx, baseY + height + k, cz + dz, b.roof);
}

/** A scarecrow: a post, arms, a straw head and a red hat. */
function placeScarecrow(world: WorldWriter, x: number, z: number, baseY: number, b: { post: number; arm: number; head: number; hat: number }): void {
  for (let y = 0; y < 3; y++) put(world, x, baseY + y, z, b.post);
  for (const dx of [-1, 1]) put(world, x + dx, baseY + 1, z, b.arm);
  put(world, x, baseY + 3, z, b.head);
  put(world, x, baseY + 4, z, b.hat);
}

export async function generateNongTrai() {
  return generateZoneMap({
    mapId: MAP_ID,
    region: 'nong-trai',
    seedText: 'miu-nong-trai',
    outland: 'farm',
    zones: ZONES,
    // Beside the farm road, facing the gate, the fields of the mock either side; room to its east for the gate home.
    spawn: { x: 402, z: 328, yaw: 0 },
    // Farmland is flat inside every cell of the road grid; the strips between and the edge roll gently.
    shape: (x, z, h) => {
      if (Math.min(x, z, SIZE - 1 - x, SIZE - 1 - z) < 14) return LEVEL + (h - LEVEL) * 0.5;
      if (PARCELS.some((p) => inRect(p.rect, x, z, 1))) return LEVEL;
      return LEVEL + (h - LEVEL) * 0.5;
    },
    water: { level: WATER_LEVEL, covers: inWater },
    pathsFromSpawn: false,
    routes: ROUTES,
    trees: { skip: 0.45, blocks: (roll, block) => ({ log: block('tree-log'), leaves: block(roll < 0.35 ? 'leaves-pink' : roll < 0.42 ? 'leaves-autumn' : 'leaves') }) },
    // The farm at work: milking, feeding hens, ploughing, carting the harvest; herds in the pastures.
    life: ({ landmark }) => [
      ...crowd('milker', ['Cô vắt sữa', 'Chú vắt sữa'], [person('e'), person('m')], landmark('chuong-bo'), 8, 3, [LIFE_HELD.bucket, LIFE_HELD.bucket]),
      ...crowd('cow', ['Bò sữa', 'Bê con'], [animal('cow')], landmark('dong-co-bo-sua'), 26, 14),
      ...crowd('hen-keeper', ['Bà cho gà ăn', 'Cô nhặt trứng'], [person('i'), person('h')], landmark('chuong-ga'), 7, 2, [LIFE_HELD.basket, LIFE_HELD.basket]),
      ...crowd('chick', ['Gà con'], [animal('chick')], landmark('chuong-ga'), 8, 14),
      ...crowd('pig', ['Lợn con', 'Lợn mẹ'], [animal('pig')], landmark('chuong-lon'), 9, 8),
      ...crowd('ploughman', ['Chú cày ruộng', 'Bác làm đất'], [person('m'), person('a'), person('j')], landmark('ruong-rau'), 22, 5, [LIFE_HELD.hoe, LIFE_HELD.apple]),
      ...crowd('ploughman', ['Cô trồng ngô'], [person('e'), person('h')], landmark('ruong-ngo'), 18, 3, [LIFE_HELD.hoe]),
      ...crowd('porter', ['Chú chở nông sản'], [person('k'), person('j')], landmark('bai-xe-keo'), 10, 3, [LIFE_HELD.crate]),
      ...crowd('porter', ['Bác khuân thóc'], [person('b')], landmark('kho-thoc'), 8, 2, [LIFE_HELD.crate]),
      ...crowd('waterer', ['Ông tưới vườn'], [person('a')], landmark('vuon-cay'), 14, 2, [LIFE_HELD.bucket]),
      ...crowd('home-cook', ['Bà nấu cơm trưa'], [person('i')], landmark('nha-nong-trai'), 8, 2, [LIFE_HELD.basket]),
      ...crowd('ferryman', ['Chú câu cá'], [person('m')], landmark('ao-ca'), 10, 2, [LIFE_HELD.paddle]),
      ...crowd('kite-flyer', ['Bạn thả diều'], [person('f'), person('o'), person('q')], landmark('bai-co-coi-xay-gio'), 12, 4, [LIFE_HELD.kite]),
      ...crowd('dog', ['Chó chăn bò', 'Cún nông trại'], [animal('dog')], landmark('cong-nong-trai'), 16, 4),
      ...crowd('cat', ['Mèo kho thóc'], [animal('cat')], landmark('hien-kho'), 8, 3),
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
    roofBlue: block('roof-blue'), birch: block('birch-log'), path: block('path'),
  };
  const barnBlocks = { wall: B.woodRed, roof: B.brickGrey, trim: B.snow };
  const farmhouse = { walls: [B.sand, B.birch, B.planks], roofs: [B.brickRed, B.woodRed, B.brickRed, B.roofBlue], trim: B.log };
  const keep = (r: Rect): void => ctx.keepOut(r.x0, r.z0, r.x1, r.z1);
  const yaw = (): number => Math.floor(rng() * 360);
  /** A building of the countryside: placed, kept clear of trees and targets with its doorstep. */
  const house = (x0: number, z0: number, w: number, d: number, h: number, blocks: { wall: number; roof: number; trim: number }): Rect => {
    placeHouse(world, x0, z0, w, d, h, base, blocks);
    const r = { x0: x0 - 1, z0: z0 - 3, x1: x0 + w, z1: z0 + d };
    keep(r);
    return r;
  };
  const cottage = (x0: number, z0: number, n: number): Rect => {
    const r = placeCottage(world, x0, z0, n, base, farmhouse);
    keep(r);
    return r;
  };
  /** Fence posts round a rectangle every two blocks, leaving `gaps` (columns or rows) open for gates. */
  const fenceRing = (r: Rect, gaps: ReadonlyArray<readonly [number, number]> = []): void => {
    const open = (x: number, z: number): boolean => gaps.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 2.5) || ctx.onPath(x, z) || inWater(x, z);
    for (let x = r.x0; x <= r.x1; x += 2) for (const z of [r.z0, r.z1]) if (!open(x, z)) ctx.prop(M.fence, x, z, 0);
    for (let z = r.z0 + 2; z < r.z1; z += 2) for (const x of [r.x0, r.x1]) if (!open(x, z)) ctx.prop(M.fence, x, z, 90);
  };
  /** Hay stacked in blocks of straw. */
  const haystack = (x: number, z: number, w = 2, h = 2): void => {
    for (let dx = 0; dx < w; dx++) for (let dz = 0; dz < w; dz++) for (let y = 0; y < h; y++) put(world, x + dx, base + y, z + dz, B.sand);
    ctx.keepOut(x, z, x + w - 1, z + w - 1);
  };
  /** Animals scattered over a rectangle, clear of what stands there. */
  const herd = (model: string, r: Rect, count: number): void => {
    for (let i = 0; i < count; i++) {
      const x = Math.round(r.x0 + rng() * (r.x1 - r.x0));
      const z = Math.round(r.z0 + rng() * (r.z1 - r.z0));
      if (inWater(x, z) || ctx.onPath(x, z) || world.get(x, base, z) !== 0) continue;
      ctx.prop(model, x, z, yaw());
    }
  };
  /** A fruit tree of blocks: a short trunk, a crown of green or blossom. */
  const fruitTree = (x: number, z: number, pink: boolean, height = 5): void => {
    placeTree(world, x, base, z, height, { log: B.treeLog, leaves: pink ? B.pink : B.leaves }, rng);
  };

  /**
   * A raised bed of blocks: a plank frame, dirt furrows and rows of `kind` (cabbages, pumpkins among their
   * leaves, blossom, wheat ridges, seedlings); skips the paths and the water's edge.
   */
  const bed = (p: Rect, kind: number): void => {
    for (let x = p.x0; x <= p.x1; x++) {
      for (let z = p.z0; z <= p.z1; z++) {
        if (ctx.onPath(x, z) || nearWater(x, z, 2)) continue;
        const s = ctx.surface(x, z);
        if (x === p.x0 || x === p.x1 || z === p.z0 || z === p.z1) {
          world.set(x, s + 1, z, kind === 3 ? B.log : B.planks);
          continue;
        }
        const row = (z - p.z0) % 2 === 0;
        const dx = x - p.x0;
        world.set(x, s, z, kind === 3 ? B.sand : B.dirt);
        if (!row) continue;
        const crop =
          kind === 0 ? (dx % 2 === 1 ? B.leaves : 0) :
          kind === 1 ? (dx % 3 === 0 ? B.autumn : dx % 3 === 1 ? B.leaves : 0) :
          kind === 2 ? (dx % 2 === 1 ? B.pink : B.leaves) :
          kind === 3 ? B.sand :
          dx % 3 === 1 ? B.leaves : 0;
        if (crop) world.set(x, s + 1, z, crop);
      }
    }
    keep(p);
  };
  /** Plots of `w` x `d` with `gap`-wide grass bunds between them, over a rectangle, clear of `reserved`. */
  const plotsIn = (r: Rect, w: number, d: number, gap: number, reserved: readonly Rect[] = []): Rect[] => {
    const out: Rect[] = [];
    for (let z = r.z0; z + d - 1 <= r.z1; z += d + gap) {
      for (let x = r.x0; x + w - 1 <= r.x1; x += w + gap) {
        const p = { x0: x, z0: z, x1: x + w - 1, z1: z + d - 1 };
        if (!reserved.some((q) => overlaps(p, q))) out.push(p);
      }
    }
    return out;
  };
  /** Market-garden beds over a rectangle, a scarecrow in every fifth one. */
  const beds = (r: Rect, reserved: readonly Rect[], seed: number, kinds: readonly number[] = [0, 1, 2, 4, 0, 1]): void => {
    for (const [i, p] of plotsIn(r, 20, 13, 3, reserved).entries()) {
      bed(p, kinds[(i + seed) % kinds.length] ?? 0);
      if ((i + seed) % 5 === 2) placeScarecrow(world, Math.round((p.x0 + p.x1) / 2), Math.round((p.z0 + p.z1) / 2), base, { post: B.log, arm: B.planks, head: B.sand, hat: B.brickRed });
    }
  };
  /** Bushes along a rectangle's edges, every `every` blocks (hedges between the fields). */
  const hedge = (r: Rect, every = 6): void => {
    for (let x = r.x0; x <= r.x1; x += every) for (const z of [r.z0, r.z1]) if (!ctx.onPath(x, z) && !nearWater(x, z, 1)) ctx.prop(M.bush, x, z, x * 7);
    for (let z = r.z0 + every; z < r.z1; z += every) for (const x of [r.x0, r.x1]) if (!ctx.onPath(x, z) && !nearWater(x, z, 1)) ctx.prop(M.bush, x, z, z * 7);
  };

  /**
   * The inside of a cow pasture from row `top` down: four paddocks between cross fences, clumps of shade
   * trees, a water trough and a hay stack in each paddock, patches of flowers, the herd grazing.
   */
  const pastureFill = (r: Rect, top: number, cows: number): void => {
    const mx = Math.round((r.x0 + r.x1) / 2);
    const mz = Math.round((top + r.z1) / 2);
    for (let z = top; z < r.z1; z += 2) if (Math.abs(z - mz) > 3 && !nearWater(mx, z, 1)) ctx.prop(M.fence, mx, z, 90);
    for (let x = r.x0 + 2; x < r.x1; x += 2) if (Math.abs(x - mx) > 3 && !nearWater(x, mz, 1)) ctx.prop(M.fence, x, mz, 0);
    const free = (x: number, z: number, pad: number): boolean => {
      if (nearWater(x, z, pad + 1) || Math.abs(x - mx) <= pad || Math.abs(z - mz) <= pad) return false;
      for (let dx = -pad; dx <= pad; dx++) for (let dz = -pad; dz <= pad; dz++) if (world.get(x + dx, base, z + dz) !== 0 || world.get(x + dx, base + 2, z + dz) !== 0) return false;
      return true;
    };
    const quarters: Rect[] = [
      { x0: r.x0 + 3, z0: top + 2, x1: mx - 3, z1: mz - 3 },
      { x0: mx + 3, z0: top + 2, x1: r.x1 - 3, z1: mz - 3 },
      { x0: r.x0 + 3, z0: mz + 3, x1: mx - 3, z1: r.z1 - 3 },
      { x0: mx + 3, z0: mz + 3, x1: r.x1 - 3, z1: r.z1 - 3 },
    ];
    for (const [q, p] of quarters.entries()) {
      if (p.x1 - p.x0 < 12 || p.z1 - p.z0 < 10) continue;
      const at = (u: number, v: number): [number, number] => [Math.round(p.x0 + (p.x1 - p.x0) * u), Math.round(p.z0 + (p.z1 - p.z0) * v)];
      // Shade trees in clumps of three.
      for (let c = 0; c < 3; c++) {
        const [cx, cz] = at(0.2 + 0.6 * rng(), 0.2 + 0.6 * rng());
        for (const [dx, dz] of [[0, 0], [5, 1], [2, 5]] as const) if (free(cx + dx, cz + dz, 2)) fruitTree(cx + dx, cz + dz, (q + c + dx) % 3 === 0, 6);
      }
      // A plank trough of water and a hay stack by the fence.
      const [tx, tz] = at(0.15, 0.85);
      if (free(tx + 2, tz, 3)) {
        for (let dx = 0; dx < 6; dx++) for (let dz = -1; dz <= 1; dz++) world.set(tx + dx, base, tz + dz, dz === 0 && dx > 0 && dx < 5 ? B.water : B.planks);
        ctx.keepOut(tx, tz - 1, tx + 5, tz + 1);
      }
      const [hx, hz] = at(0.85, 0.15);
      if (free(hx, hz, 2)) haystack(hx, hz, 3, 2);
      const [fx, fz] = at(0.55, 0.6);
      if (free(fx, fz, 2)) flowerBed(ctx, fx - 2, fz - 1, 6, 3);
      herd(M.cow, p, Math.round(cows / 4));
    }
  };

  // ── The countryside, cell by cell of the road grid ──
  let n = 0;
  for (const parcel of PARCELS) {
    const r = parcel.rect;
    const i = n++;
    switch (parcel.use) {
      case 'farmstead': {
        // Farmhouse, red barn, silo and (every other one) a windmill along the top; kitchen plots, a cow paddock, beds below.
        const home = cottage(r.x0 + 4, r.z0 + 7, i);
        flowerBed(ctx, home.x0 + 1, home.z0 - 2, 8, 2);
        const barn = house(home.x1 + 6, r.z0 + 5, 18, 11, 5, barnBlocks);
        const siloX = barn.x1 + 6;
        placeSilo(world, siloX, r.z0 + 10, base, { wall: B.birch, band: B.woodRed, roof: B.brickGrey });
        ctx.keepOut(siloX - 4, r.z0 + 6, siloX + 4, r.z0 + 14);
        const millX = r.x1 - 10;
        if (i % 2 === 0 && millX - 8 > siloX + 4) {
          placeWindmill(world, millX, r.z0 + 12, base, { planks: B.planks, log: B.log, roof: B.brickRed, sail: B.snow });
          ctx.keepOut(millX - 4, r.z0 + 3, millX + 4, r.z0 + 16);
          ctx.landmark(`coi-xay-gio-${i}`, 'Cối xay gió', millX, r.z0 + 12);
        } else {
          for (let k = 0; k < 3; k++) haystack(millX - 6 + k * 4, r.z0 + 8, 2, 2 + (k % 2));
        }
        for (let k = 0; k < 4; k++) ctx.prop(M.hay, barn.x0 + 2 + k * 3, barn.z0 - 1, k * 25);
        ctx.prop(CARTS[i % 3] ?? M.cartRed, barn.x1 + 2, barn.z0 + 1, 90);
        herd(M.chick, { x0: home.x0, z0: home.z0 - 6, x1: home.x1, z1: home.z0 - 3 }, 4);
        // Kitchen plots and a cow paddock under the buildings, then beds to the bottom of the cell.
        const top = r.z0 + 24;
        fieldPlot(ctx, r.x0 + 2, top, r.x0 + 16, top + 10, CROPS[i % CROPS.length] ?? M.corn);
        fieldPlot(ctx, r.x0 + 20, top, r.x0 + 34, top + 10, CROPS[(i + 2) % CROPS.length] ?? M.carrot);
        const paddock = { x0: r.x0 + 40, z0: top, x1: Math.min(r.x1 - 2, r.x0 + 80), z1: top + 18 };
        fenceRing(paddock, [[Math.round((paddock.x0 + paddock.x1) / 2), paddock.z0]]);
        herd(M.cow, { x0: paddock.x0 + 2, z0: paddock.z0 + 2, x1: paddock.x1 - 2, z1: paddock.z1 - 2 }, 5);
        ctx.prop(M.barrel, paddock.x1 - 2, paddock.z0 + 2, 0);
        keep(paddock);
        beds({ x0: r.x0 + 2, z0: top + 22, x1: r.x1 - 2, z1: r.z1 - 2 }, [], i);
        ctx.landmark(`trang-trai-${i}`, 'Trang trại', barn.x0 + 9, barn.z0 + 2);
        break;
      }
      case 'veg': {
        // Raised beds edge to edge, a tool shed with its barrels in a corner, hedges round.
        const shed = house(r.x0 + 3, r.z0 + 5, 9, 6, 3, { wall: B.planks, roof: i % 2 ? B.brickRed : B.roofBlue, trim: B.log });
        ctx.prop(M.barrel, shed.x1 + 2, shed.z0 + 2, 0);
        ctx.prop(M.bucket, shed.x1 + 2, shed.z0 + 4, 0);
        beds({ x0: r.x0 + 2, z0: r.z0 + 2, x1: r.x1 - 2, z1: r.z1 - 2 }, [{ x0: shed.x0 - 2, z0: shed.z0 - 2, x1: shed.x1 + 4, z1: shed.z1 + 2 }], i);
        hedge(r, 7);
        if (i % 3 === 0) ctx.landmark(`vuon-rau-${i}`, 'Vườn rau', ...centreOf(r));
        break;
      }
      case 'wheat': {
        // Wheat in wide strips of ridged straw, a stook of hay here and there, a cart at the head of the field.
        const barn = house(r.x0 + 4, r.z0 + 6, 16, 10, 5, barnBlocks);
        placeSilo(world, barn.x1 + 6, r.z0 + 11, base, { wall: B.birch, band: B.woodRed, roof: B.brickGrey });
        for (let k = 0; k < 3; k++) haystack(barn.x1 + 13 + k * 4, r.z0 + 7 + (k % 2) * 4, 3, 2);
        const yardRect = { x0: r.x0, z0: r.z0, x1: barn.x1 + 26, z1: r.z0 + 20 };
        keep(yardRect);
        for (const [k, p] of plotsIn({ x0: r.x0 + 2, z0: r.z0 + 2, x1: r.x1 - 2, z1: r.z1 - 2 }, 34, 22, 3, [yardRect]).entries()) {
          bed(p, 3);
          for (let x = p.x0 + 2; x < p.x1; x += 4) ctx.prop(M.wheat, x, p.z0 + 1, x * 13);
          if (k % 3 === 1) haystack(p.x1 - 4, p.z1 - 4, 2, 2);
          if (k % 4 === 0) placeScarecrow(world, p.x0 + 8, p.z0 + 9, base, { post: B.log, arm: B.planks, head: B.sand, hat: B.brickRed });
        }
        ctx.prop(CARTS[i % 3] ?? M.cartYellow, r.x0 + 4, r.z0, 90);
        ctx.landmark(`ruong-lua-mi-${i}`, 'Cánh đồng lúa mì', ...centreOf(r));
        break;
      }
      case 'orchard': {
        // Fruit trees in rows (blossom and green), the odd round fruit tree, a dirt lane down the middle, crates.
        const [mx] = centreOf(r);
        for (let x = r.x0 + 4; x <= r.x1 - 3; x += 7) {
          for (let z = r.z0 + 4; z <= r.z1 - 3; z += 7) {
            if (Math.abs(x - mx) < 4 || ctx.onPath(x, z) || ctx.nearPath(x, z, 3) || nearWater(x, z, 3)) continue;
            if ((x + z) % 4 === 0) ctx.prop(M.fruitTree, x, z, x * 31 + z);
            else fruitTree(x, z, ((x - r.x0) / 7) % 2 === 0);
          }
        }
        for (let z = r.z0; z <= r.z1; z++) for (let dx = -1; dx <= 1; dx++) if (!nearWater(mx + dx, z, 1)) world.set(mx + dx, ctx.surface(mx + dx, z), z, B.dirt);
        for (let k = 0; k < 5; k++) ctx.prop(k % 2 ? M.hay : M.barrel, mx + 3, r.z0 + 10 + k * 18, k * 40);
        keep(r);
        ctx.landmark(`vuon-qua-${i}`, 'Vườn cây ăn quả', mx, r.z0 + 10);
        break;
      }
      case 'pasture': {
        // A big fenced pasture: a red cow shed, a water trough, shade trees, the herd grazing.
        const shed = house(r.x0 + 6, r.z0 + 8, 14, 8, 4, barnBlocks);
        ctx.prop(M.barrel, shed.x1 + 2, shed.z0 + 3, 0);
        ctx.prop(M.bucket, shed.x1 + 2, shed.z0 + 5, 0);
        const barn = house(shed.x1 + 8, r.z0 + 6, 18, 10, 5, barnBlocks);
        for (let k = 0; k < 3; k++) haystack(barn.x1 + 3 + k * 4, r.z0 + 8, 2, 2 + (k % 2));
        const [cx] = centreOf(r);
        fenceRing({ x0: r.x0 + 1, z0: r.z0 + 1, x1: r.x1 - 1, z1: r.z1 - 1 }, [[cx, r.z0 + 1], [cx, r.z1 - 1]]);
        pastureFill({ x0: r.x0 + 1, z0: r.z0 + 1, x1: r.x1 - 1, z1: r.z1 - 1 }, shed.z1 + 4, 36);
        for (let k = 0; k < 6; k++) ctx.prop(M.hay, shed.x0 + 1 + k * 2, shed.z1 + 2, k * 30);
        keep(r);
        ctx.landmark(`dong-co-${i}`, 'Đồng cỏ chăn bò', ...centreOf(r));
        break;
      }
      case 'hamlet': {
        // Farmers' cottages round shared yards, a well and flowers on the green in the middle.
        const [cx, cz] = centreOf(r);
        const green = { x0: cx - 8, z0: cz - 6, x1: cx + 8, z1: cz + 6 };
        placeWell(world, cx, cz, LEVEL, { stone: B.brickGrey, water: B.water });
        ctx.keepOut(cx - 1, cz - 1, cx + 1, cz + 1);
        flowerBed(ctx, green.x0, green.z1 - 2, 16, 2);
        ctx.keepOut(green.x0, green.z0, green.x1, green.z1);
        hamlet(ctx, r.x0, r.z0, r.x1, cz - 8, 22);
        hamlet(ctx, r.x0, cz + 6, r.x1, r.z1, 22);
        ctx.landmark(`xom-nong-dan-${i}`, 'Xóm nông dân', cx, cz);
        break;
      }
      case 'pond': {
        // A farm pond: lilies, a plank pier, a bench and the fishing gear on the bank; trees grow round it.
        const [cx, cz] = centreOf(r);
        const pond = PONDS.find((p) => p.x === cx && p.z === cz);
        if (!pond) break;
        for (let k = 0; k < 26; k++) {
          const a = (k / 26) * Math.PI * 2;
          const t = 0.35 + 0.5 * (((k * 7) % 5) / 5);
          ctx.propAt(M.lily, [cx + Math.cos(a) * pond.rx * t + 0.5, WATER_LEVEL + 1.02, cz + Math.sin(a) * pond.rz * t + 0.5], k * 50);
        }
        let bank = cz - pond.rz;
        while (inWater(cx, bank)) bank--;
        for (let k = 1; k <= 8; k++) for (let dx = -1; dx <= 1; dx++) world.set(cx + dx, WATER_LEVEL + 1, bank + k, B.planks);
        ctx.prop(M.bench, cx - 4, bank - 2, 0);
        ctx.prop(M.bucket, cx + 3, bank - 1, 0);
        ctx.prop(M.logs, cx + 5, bank - 3, 90);
        ctx.landmark(`ao-lang-${i}`, 'Ao làng', cx, cz);
        break;
      }
      case 'glasshouse': {
        // Glasshouses in rows (greens growing inside), beds below them.
        const half = Math.round((r.z0 + r.z1) / 2);
        for (let gz = r.z0 + 5; gz + 8 <= half; gz += 14) {
          for (let gx = r.x0 + 3; gx + 14 <= r.x1; gx += 18) {
            placeHouse(world, gx, gz, 14, 8, 3, base, { wall: B.glass, roof: B.glass, trim: B.planks });
            for (let x = gx + 2; x <= gx + 11; x++) for (const z of [gz + 2, gz + 5]) {
              world.set(x, LEVEL, z, B.dirt);
              world.set(x, base, z, (x + z) % 3 === 0 ? B.autumn : B.leaves);
            }
            keep({ x0: gx - 1, z0: gz - 3, x1: gx + 14, z1: gz + 8 });
          }
        }
        beds({ x0: r.x0 + 2, z0: half + 2, x1: r.x1 - 2, z1: r.z1 - 2 }, [], i, [0, 4, 1]);
        ctx.landmark(`nha-kinh-${i}`, 'Nhà kính', ...centreOf(r));
        break;
      }
      case 'farm':
        break;
    }
  }

  // ── Round the lessons' farm, outside its fence ──
  // The mock's fenced plots either side of the farm road at the spawn (room east of the spawn for the gate home).
  for (const [k, x0] of [278, 307, 336, 365, 416, 443, 470, 497].entries()) {
    for (const [j, z0] of [308, 330].entries()) fieldPlot(ctx, x0, z0, x0 + (x0 < 400 ? 25 : 23), z0 + 16, CROPS[(k + j * 3) % CROPS.length] ?? M.corn);
  }
  ctx.landmark('ruong-rau', 'Ruộng rau', 349, 327);
  ctx.landmark('ruong-ngo', 'Ruộng ngô', 290, 316);
  // South of the farm: the big orchard either side of the footpath, the dairy pasture.
  for (let x = 280; x <= 392; x += 7) {
    for (let z = 518; z <= 562; z += 7) {
      if (ctx.nearPath(x, z, 3)) continue;
      if ((x + z) % 5 === 0) ctx.prop(M.fruitTree, x, z, x + z);
      else fruitTree(x, z, ((x - 280) / 7) % 2 === 1);
    }
  }
  ctx.keepOut(276, 514, 394, 564);
  const dairy = { x0: 407, z0: 515, x1: 523, z1: 563 };
  fenceRing(dairy, [[465, 515]]);
  house(492, 520, 18, 10, 5, barnBlocks);
  for (let k = 0; k < 3; k++) haystack(480 + k * 3, 522, 2, 2);
  pastureFill({ x0: dairy.x0, z0: dairy.z0, x1: 488, z1: dairy.z1 }, dairy.z0 + 2, 16);
  ctx.prop(M.barrel, 410, 518, 0);
  keep(dairy);
  ctx.landmark('dong-co-bo-sua', 'Đồng cỏ bò sữa', 465, 540);

  // The farm's fence with flowers inside it, open where the road, the lane and the footpath come in.
  fenceRing({ x0: FARM.x0 - 2, z0: FARM.z0 - 2, x1: FARM.x1 + 2, z1: FARM.z1 + 2 }, [[397, FARM.z0 - 2], [403, FARM.z0 - 2]]);
  for (const x0 of [306, 410]) flowerBed(ctx, x0, FARM.z0, x0 < 400 ? 60 : 20, 1);
  ctx.landmark('hang-rao-hoa', 'Hàng rào hoa', 340, FARM.z0);
  // The farm gate: two log pillars over the road, a plank beam with a red board on top.
  for (const x of [396, 404]) {
    for (let y = base; y < base + 6; y++) world.set(x, y, FARM.z0 - 2, B.log);
    ctx.keepOut(x, FARM.z0 - 2, x, FARM.z0 - 2);
  }
  for (let x = 396; x <= 404; x++) world.set(x, base + 6, FARM.z0 - 2, B.planks);
  for (let x = 398; x <= 402; x++) world.set(x, base + 7, FARM.z0 - 2, B.woodRed);
  ctx.landmark('cong-nong-trai', 'Cổng nông trại', 400, FARM.z0 - 2);

  // ── The lessons' farm (chapter 1) ──
  // North-west: the hay barn with its stacks, the hen house and its run, the windmill on its lawn, the flight fence.
  house(304, 360, 14, 10, 5, { wall: B.planks, roof: B.woodRed, trim: B.log });
  for (let k = 0; k < 3; k++) haystack(321 + k * 3, 362 + (k % 2) * 3, 2, 2 + (k % 2));
  ctx.prop(M.hay, 322, 372, 10);
  ctx.prop(M.hay, 325, 372, 40);
  ctx.landmark('nha-kho-co-kho', 'Nhà kho cỏ khô', 311, 357);
  house(306, 400, 9, 6, 3, { wall: B.planks, roof: B.woodRed, trim: B.log });
  const run = { x0: 305, z0: 390, x1: 315, z1: 396 };
  fenceRing(run, [[310, 396]]);
  herd(M.chick, { x0: 307, z0: 391, x1: 313, z1: 395 }, 6);
  ctx.prop(M.bucket, 314, 398, 0);
  keep(run);
  ctx.landmark('chuong-ga', 'Chuồng gà', 310, 398);
  const mill = { x: 372, z: 372 };
  placeWindmill(world, mill.x, mill.z, base, { planks: B.planks, log: B.log, roof: B.brickRed, sail: B.snow });
  ctx.keepOut(mill.x - 4, mill.z - 9, mill.x + 4, mill.z + 4);
  ctx.landmark('coi-xay-gio', 'Cối xay gió', mill.x, mill.z);
  ctx.landmark('bai-co-coi-xay-gio', 'Bãi cỏ cạnh cối xay gió', 352, 392);
  for (let x = 330; x <= 394; x += 2) ctx.prop(M.fence, x, 416, 0);
  for (let x = 330; x <= 394; x += 16) for (let y = base; y < base + 2; y++) world.set(x, y, 418, B.woodRed);
  ctx.landmark('hang-rao-duong-bay', 'Hàng rào đo đường bay', 362, 416);

  // North-east: the gift stall by the fields, the farmhouse, the drying yard ruled in squares, the granary with
  // three doors and its porch (glass cabinet, bagging belt), two silos.
  const stall = placeStall(world, 408, 356, 6, 3, base, { log: B.log, planks: B.planks, stripes: [B.woodRed, B.snow] });
  for (const dx of [-1.5, 0, 1.5]) ctx.propAt(M.gift, [stall.counter[0] + dx, stall.counter[1], stall.counter[2]], dx * 30);
  ctx.keepOut(407, 354, 414, 359);
  ctx.landmark('choi-goi-qua', 'Chòi gói quà bên ruộng', 411, 357);
  cottage(420, 362, 2);
  flowerBed(ctx, 421, 356, 10, 2);
  ctx.landmark('nha-nong-trai', 'Nhà nông trại', 426, 360);
  const yard = { x0: 440, z0: 360, x1: 463, z1: 383 };
  for (let x = yard.x0; x <= yard.x1; x++) for (let z = yard.z0; z <= yard.z1; z++) world.set(x, LEVEL, z, (x - yard.x0) % 4 === 0 || (z - yard.z0) % 4 === 0 ? B.planks : B.sand);
  ctx.landmark('san-phoi', 'Sân phơi kẻ ô số', 452, 372);
  const granary = { x0: 440, z0: 400, w: 22, d: 10 };
  placeHouse(world, granary.x0, granary.z0, granary.w, granary.d, 5, base, { wall: B.planks, roof: B.brickRed, trim: B.log });
  for (const doorX of [granary.x0 + 4, granary.x0 + 17]) for (let y = base; y < base + 2; y++) for (const x of [doorX, doorX + 1]) world.set(x, y, granary.z0, 0);
  // The porch: a plank floor, log posts and a lean-to roof in front of the doors.
  const porch = { x0: granary.x0 - 1, z0: granary.z0 - 5, x1: granary.x0 + granary.w, z1: granary.z0 - 1 };
  for (let x = porch.x0; x <= porch.x1; x++) {
    for (let z = porch.z0; z <= porch.z1; z++) {
      world.set(x, LEVEL, z, B.planks);
      world.set(x, base + 3, z, B.planks);
    }
  }
  for (const x of [porch.x0, porch.x0 + 8, porch.x1 - 8, porch.x1]) for (let y = base; y < base + 3; y++) world.set(x, y, porch.z0, B.log);
  // The glass cabinet against the wall at the west end of the porch.
  for (const x of [granary.x0 + 1, granary.x0 + 2]) {
    for (let y = base; y < base + 2; y++) world.set(x, y, porch.z1, B.glass);
    world.set(x, base + 2, porch.z1, B.planks);
  }
  ctx.keepOut(porch.x0, porch.z0, porch.x1, granary.z0 + granary.d);
  ctx.landmark('kho-thoc', 'Kho thóc ba cánh cửa', granary.x0 + 11, porch.z0 - 2);
  ctx.landmark('hien-kho', 'Tủ kính ở hiên kho', granary.x0 + 2, porch.z0);
  ctx.landmark('san-truoc-kho-thoc', 'Sân trước kho thóc', granary.x0 + 11, 390);
  // The bagging belt beside the granary: a belt on log legs, sacks riding on it, a stack at its end.
  for (let x = 464; x <= 474; x++) {
    world.set(x, base, 397, x % 3 === 0 ? B.log : B.board);
    if (x % 2 === 0) ctx.propAt(M.sack, [x + 0.5, base + 1, 397.5], x * 20);
  }
  for (let k = 0; k < 3; k++) ctx.prop(M.hay, 477, 395 + k * 2, k * 15);
  ctx.keepOut(463, 396, 478, 400);
  ctx.landmark('bang-chuyen', 'Băng chuyền đóng bao', 469, 395);
  for (const x of [470, 481]) placeSilo(world, x, 410, base, { wall: B.birch, band: B.woodRed, roof: B.brickGrey });
  ctx.keepOut(466, 405, 485, 415);
  fieldPlot(ctx, 476, 358, 496, 374, M.greens);
  fieldPlot(ctx, 476, 378, 496, 390, M.carrot);
  ctx.landmark('bo-ruong-rau', 'Bờ ruộng rau', 486, 376);
  // The farmhouse's kitchen garden and its well, fruit trees along the lane.
  bed({ x0: 406, z0: 384, x1: 426, z1: 394 }, 0);
  placeWell(world, 432, 388, LEVEL, { stone: B.brickGrey, water: B.water });
  ctx.keepOut(431, 387, 433, 389);
  ctx.prop(M.bucket, 434, 390, 0);
  for (let x = 306; x <= 496; x += 9) {
    for (const z of [424, 437]) if (!ctx.nearPath(x, z, 3) && (z === 424 || (x > 320 && x < 398))) fruitTree(x, z, Math.floor(x / 9) % 2 === 0, 6);
  }

  // South-west: the pigsty, the fish pond with its railed bridge and its banks, the fry tank, the mango tree, the
  // orchard with its stepping stones and the squirrels' house.
  house(304, 446, 9, 6, 3, { wall: B.brickGrey, roof: B.woodRed, trim: B.log });
  const pen = { x0: 303, z0: 436, x1: 313, z1: 443 };
  for (let x = pen.x0 + 1; x < pen.x1; x++) for (let z = pen.z0 + 1; z < pen.z1; z++) world.set(x, LEVEL, z, B.dirt);
  fenceRing(pen, [[308, 443]]);
  herd(M.pig, { x0: 305, z0: 438, x1: 311, z1: 441 }, 4);
  ctx.prop(M.barrel, 315, 440, 0);
  keep(pen);
  ctx.landmark('chuong-lon', 'Chuồng lợn', 308, 440);
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    const t = 0.4 + 0.45 * (((k * 3) % 4) / 4);
    const [x, z] = [FISH_POND.x + Math.cos(a) * FISH_POND.rx * t, FISH_POND.z + Math.sin(a) * FISH_POND.rz * t];
    if (Math.abs(x - 352) > 3) ctx.propAt(M.lily, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], k * 40);
  }
  for (let z = FISH_POND.z - FISH_POND.rz - 1; z <= FISH_POND.z + FISH_POND.rz + 1; z++) {
    if (!inWater(352, z)) continue;
    for (const x of [350, 354]) {
      world.set(x, WATER_LEVEL + 1, z, B.log);
      if (z % 2 === 0) ctx.propAt(M.fence, [x + 0.5, WATER_LEVEL + 2, z + 0.5], 90);
    }
  }
  ctx.landmark('ao-ca', 'Ao cá', FISH_POND.x - 6, FISH_POND.z);
  ctx.landmark('cau-ao', 'Cầu ao', 352, FISH_POND.z);
  ctx.landmark('bo-ao-ca', 'Bờ ao cá', 338, FISH_POND.z - FISH_POND.rz - 3);
  ctx.prop(M.bench, 340, 455, 0);
  ctx.prop(M.bench, 362, 455, 0);
  ctx.prop(M.bucket, 344, 456, 0);
  ctx.prop(M.logs, 330, 462, 90);
  const tank = { x0: 372, z0: 462, x1: 381, z1: 469 };
  for (let x = tank.x0; x <= tank.x1; x++) {
    for (let z = tank.z0; z <= tank.z1; z++) {
      const rim = x === tank.x0 || x === tank.x1 || z === tank.z0 || z === tank.z1;
      world.set(x, rim ? base : LEVEL, z, rim ? B.brickGrey : B.water);
      if (rim) continue;
      world.set(x, LEVEL - 1, z, B.water);
    }
  }
  for (const [x, z] of [[374, 464], [378, 467]] as const) ctx.propAt(M.lily, [x + 0.5, LEVEL + 1.02, z + 0.5], x * 9);
  keep(tank);
  ctx.landmark('be-uom-ca', 'Bể ươm cá bên ao', 376, 465);
  placeAncientTree(world, 310, base, 476, { log: B.treeLog, leaves: B.leaves, core: B.log }, rng);
  ctx.keepOut(304, 470, 316, 482);
  ctx.landmark('cay-xoai', 'Cây xoài đầu vườn', 310, 476);
  for (let x = 320; x <= 396; x += 2) if (!ctx.onPath(x, 495)) world.set(x, LEVEL, 495, B.stone);
  for (let x = 322; x <= 380; x += 8) {
    for (const z of [489, 502]) {
      if (ctx.nearPath(x, z, 3)) continue;
      fruitTree(x, z, (x / 8) % 2 === 0);
    }
  }
  ctx.landmark('vuon-cay', 'Vườn cây ăn quả', 340, 495);
  ctx.landmark('loi-da', 'Lối đá qua vườn cây', 330, 495);
  const nest = { x: 390, z: 500 };
  placeTree(world, nest.x, base, nest.z, 9, { log: B.treeLog, leaves: B.leaves }, rng);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (dx || dz) world.set(nest.x + dx, base + 4, nest.z + dz, B.planks);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) world.set(nest.x + dx, base + 5, nest.z + dz, B.planks);
  for (let y = base; y < base + 4; y++) world.set(nest.x + 3, y, nest.z, B.log);
  ctx.keepOut(nest.x - 3, nest.z - 3, nest.x + 3, nest.z + 3);
  ctx.landmark('nha-soc', 'Thang dây nhà sóc', nest.x + 3, nest.z);

  // South-east: the red cow barn and its yard, the tool workshop and its benches, the cart yard.
  house(408, 446, 20, 12, 6, barnBlocks);
  for (let k = 0; k < 3; k++) ctx.prop(M.hay, 422 + k * 2, 441, k * 20);
  const cowYard = { x0: 408, z0: 462, x1: 428, z1: 478 };
  fenceRing(cowYard, [[418, 462]]);
  herd(M.cow, { x0: 410, z0: 464, x1: 426, z1: 476 }, 4);
  ctx.prop(M.barrel, 426, 464, 0);
  keep(cowYard);
  ctx.landmark('chuong-bo', 'Chuồng bò đỏ', 418, 444);
  house(446, 448, 15, 9, 4, { wall: B.brickGrey, roof: B.roofBlue, trim: B.log });
  // The repair bench with a wheel and the cart it mends.
  ctx.prop(M.workbench, 448, 442, 180);
  ctx.prop(M.wheel, 450, 442, 0);
  ctx.prop(M.anvil, 452, 442, 180);
  ctx.prop(M.cartBlue, 449, 438, 90);
  ctx.landmark('ban-sua-xe', 'Bàn sửa xe', 450, 440);
  // The paint corner: pots and a brush.
  ctx.prop(M.barrel, 457, 442, 0);
  ctx.prop(M.barrel, 459, 443, 0);
  ctx.prop(M.bucket, 457, 439, 0);
  ctx.prop(M.brush, 459, 439, 30);
  ctx.landmark('goc-pha-son', 'Góc pha sơn', 458, 440);
  // The planing bench and its timber on the east side.
  ctx.prop(M.workbench, 464, 450, 90);
  ctx.prop(M.logs, 464, 454, 0);
  ctx.landmark('ban-bao-go', 'Bàn bào gỗ', 464, 452);
  // The label shelf against the west wall: log posts, plank shelves, dark label boards.
  for (let z = 449; z <= 455; z++) {
    const post = z === 449 || z === 455;
    for (let y = base; y < base + 3; y++) world.set(443, y, z, post ? B.log : y === base + 1 ? B.board : B.planks);
  }
  ctx.keepOut(443, 449, 443, 455);
  ctx.landmark('xuong-nong-cu', 'Xưởng nông cụ', 453, 446);
  // Two trains of produce carts waiting in the cart yard, pumpkins, melons and hay on them.
  for (const [t, z] of [474, 490].entries()) {
    for (let k = 0; k < 5; k++) {
      const x = 446 + t * 6 + k * 5;
      ctx.prop(CARTS[(k + t) % 3] ?? M.cartRed, x, z, 90);
      ctx.propAt(PRODUCE[(k + t) % 3] ?? M.pumpkin, [x + 0.5, base + 1, z + 0.5], k * 50);
    }
  }
  for (let k = 0; k < 3; k++) ctx.prop(M.hay, 494, 476 + k * 3, k * 20);
  ctx.landmark('bai-xe-keo', 'Bãi xe kéo', 466, 482);
  // A lean-to over the first train: log posts and a plank roof.
  for (let x = 443; x <= 470; x++) for (let z = 471; z <= 477; z++) world.set(x, base + 3, z, B.planks);
  for (const x of [443, 456, 470]) for (const z of [471, 477]) for (let y = base; y < base + 3; y++) world.set(x, y, z, B.log);
  // Pumpkins and greens east of the workshop.
  fieldPlot(ctx, 472, 436, 496, 446, M.pumpkin);
  bed({ x0: 472, z0: 451, x1: 496, z1: 465 }, 1);

  // Street lamps along every farm road.
  for (const route of ROUTES.slice(0, ROAD_X.length + ROAD_Z.length)) lampRow(ctx, route, 22);
}

await runIfMain(import.meta.url, generateNongTrai);

// Generates chapter 1 "Khu rừng bí mật" from a fixed seed: level forest floor, a stream,
// a wooden bridge, stepping stones, a stone path, scattered trees, the ancient tree, plus the quest's
// interactables (ids match the `target`s in content/quests/forest-ch1.json) and decorative props; the
// places of the forest's Tiếng Việt lessons (chapters 2–5) are placed from the catalogues. Beyond chapter 1's
// corner the forest follows the owner's detail mocks (designs/khu-rung-bi-mat/, 02/10/2026): the stream
// widens, a grey cliff in tiers drops a waterfall into a pool that runs into it, a second wooden bridge with
// lanterns crosses it, the trails are edged with flowers, mushrooms and leaf bushes, blossom trees stand among
// the green, and the forest folk keep a camp with walk-in tents, a fire, an open shelter and a ranger's cabin,
// every one big enough for the child to walk round inside through a three-wide door (owner, 02/10/2026). One
// network of trodden trails and plank bridges joins the spawn, its gate and train stops, every chapter's
// start, the landmarks and every door.
// Output: assets/generated/world/forest-ch1/{regions/, horizon.bin, entities.json}
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { FOREST_CAST_SIZES, QUEST_CLEARANCE, placeForestLife } from './forest-life';
import { columnsOf, fillColumn, heightField, loadBlocks, mapModels, PACK, placeRegionTargets, runIfMain, scatterTrees, smoothstep, standHeight, WIDE_MAP_SIDE } from './map-kit';
import { createRng, hashSeed } from './noise';
import { placeBridge } from './structures/bridge';
import { CLIFF_BASE, cellRoll, type Cliff, cliffColumn, cliffRise, fallsOf, placeBigTree, placeCabin, placeFalls, placeShelter, placeTent, TENT, trailVerge } from './structures/forest-scene';
import { distanceToPath, pathColumns, type Point } from './structures/path';
import { cellsIn } from './chapters/place-quest-targets';
import { placeAncientTree } from './structures/tree';
import { type Facing, turnCell } from './structures/world-writer';
import { crowd, person, placeVillageLife, type Resident } from './village-life';
import { sideQuestTableOf, standingAnchors } from '../content/side-quest-table';
import { NETWORK_BLOCK_NAMES, sideFolk, sideSpots } from './side-givers';
import { outlandSpecOf } from './outland-spec';
import { HUB_REGION } from './zone-map';

export const MAP_ID = 'forest-ch1';
export const SEED_TEXT = 'miu-forest-ch1';
const WATER_LEVEL = 9;
/** Height of the level forest floor, which the cliffs stand on. */
const GROUND = CLIFF_BASE;
/** The forest's own ground (owner, 02/10/2026: each map its own colour): deep green grass and earth trails. */
const SOIL = { grass: 'grass-forest', path: 'trail' };

/**
 * Chapter 1's corner keeps the trees, rocks and props its review pictures show (review/map/forest-ch1-*):
 * the mocks' scenery is laid beyond it.
 */
const CH1_CORNER = { x: 96, z: 100 };
const inCorner = (x: number, z: number): boolean => x < CH1_CORNER.x && z < CH1_CORNER.z;

export function riverCenter(x: number): number {
  return 50 + 6 * Math.sin(x / 14) + 2.5 * Math.sin(x / 6.3 + 1.3);
}

/** The stream as chapter 1 has it: the corner's trees and rocks were placed round this one. */
const narrowHalfWidth = (x: number): number => 2.3 + 0.8 * Math.sin(x / 9);

/** Past chapter 1's corner the stream widens to the mocks' clear blue stream, nine to eleven blocks across. */
export function riverHalfWidth(x: number): number {
  return narrowHalfWidth(x) + 2.2 * smoothstep(92, 112, x);
}

/**
 * The waterfall cliffs of the mocks (c-10, b-08): grey tiers with water falling off their tallest face into
 * a pool. The first stands over the stream east of chapter 1 and its pool runs into the stream; the second
 * is deep in the south-east.
 */
export const CLIFFS: readonly Cliff[] = [
  { x: 134, z: 98, r: 32 },
  { x: 690, z: 720, r: 56 },
];
const FALLS = CLIFFS.map(fallsOf);
/** The second wooden bridge, over the wide stream, and the forest folk's camp south of it. */
const SCENE = { bridgeX: 112, camp: { x: 114, z: 24 } };

/** A walk-in structure's place: its front-left corner, which way its door looks, and its frame's size. */
interface Site {
  origin: [number, number];
  facing: Facing;
  w: number;
  d: number;
}
/** The ranger's cabin (a house of 13 x 11 with walls of seven), its door to the camp's fire. */
const CABIN: Site = { origin: [SCENE.camp.x + 8, SCENE.camp.z + 6], facing: 'west', w: 13, d: 11 };
const CABIN_WALL = 7;
/** The camp's two tents either side of its west end, their doors to the fire; the open shelter south-east. */
const CAMP_TENTS: readonly Site[] = [
  { origin: [SCENE.camp.x - 18, SCENE.camp.z + 7], facing: 'north', w: TENT.w, d: TENT.d },
  { origin: [SCENE.camp.x - 10, SCENE.camp.z - 7], facing: 'south', w: TENT.w, d: TENT.d },
];
const SHELTER = { x: SCENE.camp.x + 11, z: SCENE.camp.z - 15, half: 4 };

/** A site's footprint in the world with its eaves (x0, z0, x1, z1). */
function siteBox(s: Site): [number, number, number, number] {
  const [ax, az] = turnCell(s.origin, s.facing, -1, -1);
  const [bx, bz] = turnCell(s.origin, s.facing, s.w, s.d);
  return [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)];
}
/** The world cell before the middle of a site's door (its front's middle, one out). */
const siteDoor = (s: Site): [number, number] => turnCell(s.origin, s.facing, Math.floor(s.w / 2), -1);
/** The tent of each glade's camp, east of the glade's middle, its door west to the camp's fire. */
const gladeTent = (d: { x: number; z: number }): Site => ({ origin: [d.x + 18, d.z + 14], facing: 'west', w: TENT.w, d: TENT.d });

/**
 * The glades of chapters 2–5 (each chapter's places go in its own), deep in the wide forest north of the
 * stream (owner, 01/10/2026: maps ten times wider).
 */
export const DISTRICTS: ReadonlyArray<{ chapter: number; x: number; z: number; hx: number; hz: number }> = [
  { chapter: 2, x: 220, z: 240, hx: 44, hz: 38 },
  { chapter: 3, x: 500, z: 260, hx: 44, hz: 38 },
  { chapter: 4, x: 240, z: 540, hx: 44, hz: 38 },
  { chapter: 5, x: 540, z: 560, hx: 44, hz: 38 },
];
/** Meadows of the forest beyond chapter 1's corner (open ground for the wild life, round the glades too). */
export const MEADOWS: ReadonlyArray<{ x: number; z: number }> = [
  { x: 140, z: 28 },
  { x: 180, z: 78 },
  { x: 128, z: 140 },
  { x: 60, z: 150 },
  { x: 166, z: 164 },
  { x: 100, z: 116 },
  { x: 340, z: 140 }, { x: 620, z: 140 }, { x: 720, z: 300 }, { x: 360, z: 380 }, { x: 640, z: 420 }, { x: 100, z: 380 },
  { x: 120, z: 660 }, { x: 380, z: 700 }, { x: 420, z: 520 }, { x: 700, z: 560 }, { x: 300, z: 640 }, { x: 560, z: 720 },
];

interface Clearing {
  x: number;
  z: number;
  radius: number;
}

export async function generateForest(): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const id = await loadBlocks();
  const B = {
    grass: id(SOIL.grass), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'),
    planks: id('planks'), path: id(SOIL.path), water: id('water'), rock: id('rock-moss'), birch: id('birch-log'),
    treeLog: id('tree-log'), treeBirch: id('tree-birch-log'),
    autumn: id('leaves-autumn'), bed: id('riverbed'), blossom: id('leaves-pink'), lantern: id('lantern'),
    cobbleGrey: id('cobble-grey'), woodRed: id('wood-red'), glass: id('glass'), board: id('board'), roofBlue: id('roof-blue'),
  };
  const seed = hashSeed(SEED_TEXT);
  const rng = createRng(seed);
  // Chapter 1 keeps its corner of the map; the forest runs on 800 blocks each way.
  const world = new VoxelWorld([WIDE_MAP_SIDE / 16, 3, WIDE_MAP_SIDE / 16]);
  const [sx, sy, sz] = world.size;

  // Landmarks and the bridge crossing (river runs along x, so the bridge deck runs along z).
  const bridgeX = 45;
  const bridgeZ0 = Math.floor(riverCenter(bridgeX) - riverHalfWidth(bridgeX) - 2);
  const bridgeZ1 = Math.ceil(riverCenter(bridgeX) + riverHalfWidth(bridgeX) + 2);
  const deckY = WATER_LEVEL + 2;
  const spawn = { x: 16, z: 16 };
  const ancient = { x: 74, z: 80 };
  // Quest order on the ground: the parrot and the three clues near spawn, the beaver on the near bank
  // by the stepping stones, then across the stream to the ancient tree, its chest and the chapter 2 gate.
  const parrot = { x: 30, z: 32 };
  const stonesX = 64;
  const stonesZ0 = Math.ceil(riverCenter(stonesX) - riverHalfWidth(stonesX));
  const stonesZ1 = Math.floor(riverCenter(stonesX) + riverHalfWidth(stonesX));
  const beaver = { x: stonesX - 2, z: stonesZ0 - 4 };
  const clearings: Clearing[] = [
    { x: spawn.x, z: spawn.z, radius: 7 },
    { x: parrot.x, z: parrot.z, radius: 8 },
    { x: beaver.x, z: beaver.z, radius: 5 },
    { x: stonesX, z: stonesZ1 + 4, radius: 4 },
    { x: ancient.x, z: ancient.z, radius: 10 },
    ...MEADOWS.map((m) => ({ x: m.x, z: m.z, radius: 9 })),
    ...DISTRICTS.map((d) => ({ x: d.x, z: d.z, radius: 30 })),
  ];
  const ch1Route: Point[] = [
    [spawn.x, spawn.z],
    [parrot.x - 3, parrot.z - 3],
    [36, bridgeZ0 - 6],
    [bridgeX, bridgeZ0 - 2],
    [bridgeX, bridgeZ1 + 2],
    [52, 62],
    [62, 70],
    [ancient.x - 6, ancient.z - 6],
  ];
  // Trails from the ancient tree up into the forest to every glade, and between them.
  const baseRoutes: Point[][] = [
    ch1Route,
    [[ancient.x, ancient.z + 8], [ancient.x, 180], [220, 240]],
    [[220, 240], [500, 260]],
    [[220, 240], [240, 540]],
    [[500, 260], [540, 560]],
    [[240, 540], [540, 560]],
    [[540, 560], [650, 660]],
  ];
  // The mocks' scene east of the corner: from the ancient tree along the cliff's foot to the second bridge,
  // over the stream to the camp; a spur to the waterfall's pool.
  const bridge2 = {
    x: SCENE.bridgeX,
    z0: Math.floor(riverCenter(SCENE.bridgeX) - riverHalfWidth(SCENE.bridgeX) - 2),
    z1: Math.ceil(riverCenter(SCENE.bridgeX) + riverHalfWidth(SCENE.bridgeX) + 2),
  };
  const camp = SCENE.camp;
  const [falls0] = FALLS;
  if (!falls0) throw new Error('the forest has no waterfall');
  const pool0 = falls0.pool;
  const sceneTrail: Point[] = [
    [ancient.x + 6, ancient.z + 8],
    [94, 84],
    [106, 76],
    [bridge2.x, bridge2.z1 + 4],
    [bridge2.x, bridge2.z0 - 2],
    [bridge2.x - 3, bridge2.z0 - 9],
    [camp.x + 2, camp.z + 6],
  ];
  const poolSpur: Point[] = [[bridge2.x, bridge2.z1 + 4], [Math.round(pool0.x - pool0.r - 3), pool0.z + 1]];
  const sceneRoutes = [sceneTrail, poolSpur];
  // One network of trails (owner, 02/10/2026: from wherever the child starts a way leads where she goes): the
  // spawn through its gate to the train's stops, the near bank to the stepping stones, the ancient tree's two
  // trails joined, the deep forest's trail on to the second falls, every glade's middle out to where its lessons
  // start and to its tent's door, and in the camp from the trail's end to the cabin's door, both tents' doors
  // and the shelter's deck.
  const pool1 = FALLS[1]?.pool;
  if (!pool1) throw new Error('the forest has no second waterfall');
  const campTrailEnd: Point = [camp.x + 2, camp.z + 6];
  const campWest: Point = [camp.x - 7, camp.z + 5];
  const campSouth: Point = [camp.x - 7, camp.z - 5];
  const [tentDoorA, tentDoorB] = CAMP_TENTS.map(siteDoor);
  const cabinDoor = siteDoor(CABIN);
  const gladeStartNear = (d: (typeof DISTRICTS)[number]): Point => [d.x, d.z + d.hz - 4];
  const links: Point[][] = [
    [[spawn.x, spawn.z], [spawn.x + 7, spawn.z - 1], [spawn.x + 7, spawn.z - 10]],
    [[bridgeX, bridgeZ0 - 2], [stonesX - 9, stonesZ0 + 1], [stonesX - 1, stonesZ0 - 1]],
    [[ancient.x, ancient.z + 8], [ancient.x + 6, ancient.z + 8]],
    [[650, 660], [Math.round(pool1.x - pool1.r - 3), pool1.z]],
    ...DISTRICTS.filter((d) => Math.min(...baseRoutes.map((r) => distanceToPath(r, ...gladeStartNear(d)))) > 3).map((d): Point[] => [[d.x, d.z], [d.x, d.z + d.hz]]),
    ...DISTRICTS.map((d): Point[] => [[d.x, d.z], siteDoor(gladeTent(d))]),
    [campTrailEnd, [cabinDoor[0] - 2, cabinDoor[1] + 1], cabinDoor],
    ...(tentDoorA && tentDoorB ? [[campTrailEnd, campWest, tentDoorA], [campWest, campSouth, tentDoorB]] : []),
    [campSouth, [SHELTER.x - SHELTER.half - 2, SHELTER.z + 2]],
  ];
  const routes: Point[][] = [...baseRoutes, ...sceneRoutes, ...links];
  const pathDistance = (x: number, z: number): number => Math.min(...routes.map((r) => distanceToPath(r, x, z)));
  const linkDistance = (x: number, z: number): number => Math.min(...links.map((r) => distanceToPath(r, x, z)));
  // The walk-in structures: the camp's cabin and tents, each glade's tent; the shelter as a site of its own size.
  const sites: Site[] = [CABIN, ...CAMP_TENTS, ...DISTRICTS.map(gladeTent)];
  const siteBoxes = [
    ...sites.map(siteBox),
    [SHELTER.x - SHELTER.half - 1, SHELTER.z - SHELTER.half - 1, SHELTER.x + SHELTER.half + 1, SHELTER.z + SHELTER.half + 1] as [number, number, number, number],
  ];
  /** Within `pad` blocks of a walk-in structure (its eaves included). */
  const nearSite = (x: number, z: number, pad: number): boolean => siteBoxes.some(([x0, z0, x1, z1]) => x >= x0 - pad && x <= x1 + pad && z >= z0 - pad && z <= z1 + pad);
  // Where chapter 1's corner had its trees and rocks: the trails and the stream as they were.
  const basePathDistance = (x: number, z: number): number => Math.min(...baseRoutes.map((r) => distanceToPath(r, x, z)));
  // Open ground of the scene: the camp, and the bank before the pool so the falls show from the bridge.
  const sceneClearings: Clearing[] = [
    { x: camp.x, z: camp.z, radius: 12 },
    { x: pool0.x - 12, z: pool0.z - 2, radius: 6 },
    // Level ground under every walk-in structure.
    ...siteBoxes.map(([x0, z0, x1, z1]) => ({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, radius: Math.hypot(x1 - x0, z1 - z0) / 2 + 1 })),
  ];
  const allClearings = [...clearings, ...sceneClearings];
  /** Blocks from the nearest water (the stream, a pool, the creek from the first pool to the stream): < 0 in it. */
  const wetDistance = (x: number, z: number): number => {
    let wet = Math.abs(z - riverCenter(x)) - riverHalfWidth(x);
    for (const f of FALLS) wet = Math.min(wet, Math.hypot(x - f.pool.x, z - f.pool.z) - f.pool.r);
    if (z <= pool0.z && z >= riverCenter(x)) wet = Math.min(wet, Math.abs(x - pool0.x) - 1.6);
    return wet;
  };
  // The cliffs rise where nothing else is: never on a trail or in the water.
  const cliffCells = new Set<number>();
  const cliffRiseAt = (x: number, z: number): number => {
    const rise = Math.max(...CLIFFS.map((c) => cliffRise(c, x, z)));
    return rise > 0 && wetDistance(x, z) >= 0.5 && pathDistance(x, z) >= 3 ? rise : 0;
  };

  // 1. Height field: a level forest floor (owner, 03/10/2026: the ground and its trails flat, only the water
  // sunk and the cliffs raised), banks easing down to the water; the cliffs' tiers stand on their levelled feet.
  const surface = heightField(world, (x, z) => {
    let h = GROUND;
    const wet = wetDistance(x, z);
    if (wet < 4) h = WATER_LEVEL + 1 + (h - WATER_LEVEL - 1) * smoothstep(1, 4, wet);
    for (const bx of [bridgeX, bridge2.x]) {
      const dr = Math.abs(z - riverCenter(x));
      const hw = riverHalfWidth(x);
      if (x >= bx - 1 && x <= bx + 1 && dr >= hw && dr < hw + 6) h = Math.max(h, deckY - 1);
    }
    const rise = cliffRiseAt(x, z);
    if (rise > 0) {
      cliffCells.add(x * sz + z);
      return CLIFF_BASE + rise;
    }
    return Math.round(Math.min(h, sy - 12));
  }, 0);

  // 2. Terrain columns, the cliffs' grey tiers, the stream and the pools.
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const h = surface(x, z);
      if (cliffCells.has(x * sz + z)) {
        cliffColumn(world, x, z, h, { stone: B.stone, moss: B.rock, grey: B.cobbleGrey, grass: B.grass });
        continue;
      }
      const wet = wetDistance(x, z);
      if (wet < 0) {
        const bed = WATER_LEVEL - (wet < -1 ? 2 : 1);
        for (let y = 0; y <= bed; y++) world.set(x, y, z, y === bed ? B.bed : B.stone);
        for (let y = bed + 1; y <= WATER_LEVEL; y++) world.set(x, y, z, B.water);
        continue;
      }
      const beach = wet < 2 && h <= WATER_LEVEL + 1;
      fillColumn(world, x, z, h, { stone: B.stone, under: beach ? B.sand : B.dirt, top: beach ? B.sand : B.grass });
    }
  }

  // 3. Stone path on the surface (bridge deck replaces it over the water).
  const pathCells = new Set(routes.flatMap((r) => [...pathColumns(r, 1.3)]));
  for (const cell of pathCells) {
    const [x = 0, z = 0] = cell.split(',').map(Number);
    if (x < 0 || z < 0 || x >= sx || z >= sz) continue;
    const top = world.get(x, surface(x, z), z);
    if (top === B.grass || top === B.dirt || top === B.sand) world.set(x, surface(x, z), z, B.path);
  }

  // 4. Bridges: chapter 1's, and the mocks' bridge over the wide stream with a lantern on each end post.
  placeBridge(world, { x0: bridgeX - 1, x1: bridgeX + 1, z0: bridgeZ0, z1: bridgeZ1, deckY }, B);
  placeBridge(world, { x0: bridge2.x - 1, x1: bridge2.x + 1, z0: bridge2.z0, z1: bridge2.z1, deckY }, B);
  const bridgeLamps = [bridge2.x - 2, bridge2.x + 2].flatMap((x) => [bridge2.z0, bridge2.z1].map((z) => [x, z] as const));
  for (const [x, z] of bridgeLamps) world.set(x, deckY + 2, z, B.log);

  // 4b. Stepping stones: four mossy rocks across the stream, level with the banks (the sort challenge).
  const stoneZs = [0, 1, 2, 3].map((i) => Math.round(stonesZ0 + (i * (stonesZ1 - stonesZ0)) / 3));
  for (const z of stoneZs) {
    for (let y = WATER_LEVEL - 2; y <= WATER_LEVEL + 1; y++) world.set(stonesX, y, z, B.rock);
  }

  // 5. Ancient tree landmark.
  const ancientBase = surface(ancient.x, ancient.z) + 1;
  placeAncientTree(world, ancient.x, ancientBase, ancient.z, { log: B.treeLog, leaves: B.leaves, core: B.log }, rng);

  // 5b. The waterfalls: a spring on each cliff's top, its stream to the lip and the sheet down to the pool.
  const fallsFeet = CLIFFS.map((c) => placeFalls(world, c, WATER_LEVEL, { water: B.water, moss: B.rock, stone: B.stone, tuft: B.leaves }));
  // A plank viewing deck two wide from the pool spur's end out over the first pool's edge, towards its falls.
  for (let x = Math.round(pool0.x - pool0.r - 2); x <= pool0.x - 3; x++) {
    for (const z of [pool0.z + 1, pool0.z + 2]) {
      world.set(x, WATER_LEVEL + 1, z, B.planks);
      for (let y = WATER_LEVEL + 2; y <= WATER_LEVEL + 4; y++) world.set(x, y, z, 0);
    }
  }

  // 6. Scattered trees (jittered grid, rejecting path, stream and clearings). Chapter 1's corner is placed as
  // it always was (its trees come first on the grid); trees there that the scene's trail or camp needs gone
  // are felled after.
  const nearFalls = (x: number, z: number): boolean => FALLS.some((f, i) => Math.abs(x - f.x) <= 4 && z >= f.sheetZ - 1 && z <= (CLIFFS[i]?.z ?? 0) - 3);
  const sceneRejects = (x: number, z: number): boolean =>
    pathDistance(x, z) < 3.5 || wetDistance(x, z) < 3 || nearFalls(x, z) || allClearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius + 1);
  const cornerRejects = (x: number, z: number): boolean =>
    basePathDistance(x, z) < 3.5 || Math.abs(z - riverCenter(x)) < narrowHalfWidth(x) + 3 || clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius + 1);
  const grid = scatterTrees({
    world,
    rng,
    surface,
    // The cliffs show their grey tiers: only one cell in three of them grows a tree.
    rejects: (x, z) => (x <= 98 ? cornerRejects(x, z) : sceneRejects(x, z) || (cliffCells.has(x * sz + z) && cellRoll(x, z, 41) < 0.65)),
    skip: 0.18,
    blocks: (roll) => (roll < 0.15 ? { log: B.treeBirch, leaves: B.leaves } : roll < 0.3 ? { log: B.treeLog, leaves: B.autumn } : { log: B.treeLog, leaves: B.leaves }),
  });
  /** A grid tree's trunk top (its crown's middle layer). */
  const crownTop = (x: number, z: number): number => {
    let y = surface(x, z) + 1;
    while (y < sy && (world.get(x, y, z) === B.treeLog || world.get(x, y, z) === B.treeBirch)) y++;
    return y;
  };
  const felled = new Set<string>();
  const fell = (x: number, z: number): void => {
    const top = crownTop(x, z);
    for (let y = surface(x, z) + 1; y < top; y++) world.set(x, y, z, 0);
    for (let y = top - 3; y <= top + 1; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const id = world.get(x + dx, y, z + dz);
          if (id === B.leaves || id === B.autumn) world.set(x + dx, y, z + dz, 0);
        }
      }
    }
    felled.add(`${x},${z}`);
  };
  for (const [x, z] of grid) if (x <= 98 && sceneRejects(x, z)) fell(x, z);
  // The mocks' forest is green with blossom trees among it and little autumn: beyond the corner, most
  // autumn crowns turn green and one green crown in nine turns pink (each tree's own roll).
  const recolour = (x: number, z: number, from: number, to: number): void => {
    const top = crownTop(x, z);
    for (let y = top - 3; y <= top + 1; y++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (world.get(x + dx, y, z + dz) === from) world.set(x + dx, y, z + dz, to);
  };
  for (const [x, z] of grid) {
    if (inCorner(x, z) || felled.has(`${x},${z}`)) continue;
    const crown = world.get(x, crownTop(x, z), z);
    const roll = cellRoll(x, z, 11);
    if (crown === B.autumn && roll < 0.85) recolour(x, z, B.autumn, B.leaves);
    else if (crown === B.leaves && roll < 0.11) recolour(x, z, B.leaves, B.blossom);
  }

  // 6b. The walk-in structures: the ranger's cabin (its door to the fire), the camp's tents and the open
  // shelter over the table, a tent at each glade's camp; no tree's crown over or in them. Big blocky trees along
  // the scene's trail, round the camp and the pool; grey stones on the wide stream's banks.
  for (const [x, z] of grid) if (!felled.has(`${x},${z}`) && nearSite(x, z, 4)) fell(x, z);
  /** The floor's height over a box of the ground: one over its highest column. */
  const baseOver = ([x0, z0, x1, z1]: readonly number[]): number => {
    let top = 0;
    for (let x = x0 ?? 0; x <= (x1 ?? 0); x++) for (let z = z0 ?? 0; z <= (z1 ?? 0); z++) top = Math.max(top, surface(x, z));
    return top + 1;
  };
  const cabin = placeCabin(world, CABIN.origin, CABIN.facing, CABIN.w, CABIN.d, CABIN_WALL, baseOver(siteBox(CABIN)), surface, {
    wall: B.planks, roof: B.woodRed, trim: B.log, floor: B.planks, foot: B.cobbleGrey,
    plinth: B.cobbleGrey, beam: B.log, glass: B.glass, sill: B.blossom, ridge: B.log, gable: B.planks, chimney: B.cobbleGrey, lantern: B.lantern,
  });
  // Canvas green and blue by turns: the camp's two tents, then the glades'.
  const tentSites = [...CAMP_TENTS, ...DISTRICTS.map(gladeTent)];
  const tents = tentSites.map((t, i) =>
    placeTent(world, t.origin, t.facing, baseOver(siteBox(t)), surface, { canvas: i % 2 === 0 ? B.board : B.roofBlue, pole: B.log, floor: B.planks, foot: B.dirt }),
  );
  const shelterY = baseOver([SHELTER.x - SHELTER.half, SHELTER.z - SHELTER.half, SHELTER.x + SHELTER.half, SHELTER.z + SHELTER.half]);
  placeShelter(world, SHELTER.x, SHELTER.z, SHELTER.half, shelterY, surface, { post: B.log, roof: B.woodRed, ridge: B.log, floor: B.planks, foot: B.cobbleGrey });
  const built = (x: number, z: number): boolean => nearSite(x, z, 1);
  const bigTrees: Array<[number, number]> = [];
  const bigTreeSpots: Point[] = [];
  let walked = 0;
  for (const route of sceneRoutes) {
    for (let i = 0; i + 1 < route.length; i++) {
      const [ax = 0, az = 0] = route[i] ?? [];
      const [bx = 0, bz = 0] = route[i + 1] ?? [];
      const len = Math.hypot(bx - ax, bz - az);
      for (let d = 4; d < len; d += 9, walked++) {
        const side = walked % 2 === 0 ? 1 : -1;
        bigTreeSpots.push([Math.round(ax + ((bx - ax) * d) / len - ((bz - az) / len) * side * 7), Math.round(az + ((bz - az) * d) / len + ((bx - ax) / len) * side * 7)]);
      }
    }
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    bigTreeSpots.push([Math.round(camp.x + Math.cos(a) * 20), Math.round(camp.z + Math.sin(a) * 20)]);
  }
  for (const [x, z] of bigTreeSpots) {
    const level = [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dz]) => surface(x + (dx ?? 0), z + (dz ?? 0)) === surface(x, z) && !cliffCells.has((x + (dx ?? 0)) * sz + z + (dz ?? 0)));
    if (inCorner(x, z) || !level || x < 4 || z < 4 || pathDistance(x, z) < 4.5 || wetDistance(x, z) < 3 || nearSite(x, z, 6) || sceneClearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius + 2)) continue;
    if (bigTrees.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 7)) continue;
    for (const [tx, tz] of grid) if (!felled.has(`${tx},${tz}`) && Math.hypot(tx - x, tz - z) < 6) fell(tx, tz);
    placeBigTree(world, x, surface(x, z) + 1, z, 8 + (bigTrees.length % 3), { log: B.treeLog, leaves: bigTrees.length % 4 === 2 ? B.blossom : B.leaves });
    bigTrees.push([x, z]);
  }
  const occupied: Array<[number, number]> = [...grid.filter(([x, z]) => !felled.has(`${x},${z}`)), ...bigTrees];
  for (let x = 92; x < 260; x++) {
    for (let z = 30; z < 80; z++) {
      const wet = wetDistance(x, z);
      if (wet < 0 || wet >= 1.2 || pathCells.has(`${x},${z}`) || Math.abs(x - bridge2.x) <= 3) continue;
      const roll = cellRoll(x, z, 21);
      if (roll >= 0.24 || world.get(x, surface(x, z) + 1, z) !== 0) continue;
      world.set(x, surface(x, z) + 1, z, roll < 0.08 ? B.rock : roll < 0.16 ? B.cobbleGrey : B.stone);
    }
  }

  // 7. Mossy boulders (drawn as chapter 1's corner always had them; none on the scene's trails, water or camp).
  for (let i = 0; i < Math.round((14 * sx * sz) / (96 * 96)); i++) {
    const x = 6 + Math.floor(rng() * (sx - 12));
    const z = 6 + Math.floor(rng() * (sz - 12));
    if (basePathDistance(x, z) < 3 || Math.abs(z - riverCenter(x)) < narrowHalfWidth(x) + 1) continue;
    const y = surface(x, z) + 1;
    const wide = rng() < 0.5 && x + 1 < sx;
    const tall = rng() < 0.3;
    if (linkDistance(x, z) < 3 || (!inCorner(x, z) && (pathDistance(x, z) < 3 || wetDistance(x, z) < 1 || built(x, z) || nearFalls(x, z)))) continue;
    world.set(x, y, z, B.rock);
    if (wide) world.set(x + 1, surface(x + 1, z) + 1, z, B.rock);
    if (tall) world.set(x, y + 1, z, B.rock);
  }

  // 8. Entities.
  const standY = standHeight(world, surface);
  const { props, scaleOf, place, addProp, addPropAt, addCentred, modelled, animated } = await mapModels({
    sizes: FOREST_CAST_SIZES,
    standY,
  });
  // The signpost at the fork by the spawn, off both trails (the train brings the child back to the trail there).
  addProp(`${PACK.survival}/signpost.glb`, spawn.x + 3, spawn.z - 3, 225);
  addProp(`${PACK.survival}/campfire-pit.glb`, spawn.x - 3, spawn.z + 1);
  addProp(`${PACK.survival}/barrel.glb`, spawn.x - 5, spawn.z - 3, 20);
  addProp(`${PACK.survival}/box-large.glb`, spawn.x - 4, spawn.z - 4, 40);
  for (let i = 0; i < 4; i++) addProp(`${PACK.survival}/fence.glb`, spawn.x - 6 + i, spawn.z - 6, 0);
  addProp(`${PACK.nature}/log_stack.glb`, bridgeX - 4, bridgeZ0 - 3, 90);
  for (let i = 0; i < 3; i++) addProp(`${PACK.food}/apple.glb`, beaver.x - 2 + i, beaver.z - 2, i * 40);
  const letterAt = { x: parrot.x + 6, z: parrot.z - 4 };
  addProp(`${PACK.nature}/plant_bush.glb`, letterAt.x + 1, letterAt.z + 1, 30);
  const flowers = [`${PACK.nature}/flower_redA.glb`, `${PACK.nature}/flower_yellowB.glb`, `${PACK.nature}/flower_purpleA.glb`];
  const mushrooms = [`${PACK.nature}/mushroom_redGroup.glb`, `${PACK.nature}/mushroom_tanGroup.glb`];
  for (let i = 0; i < 18; i++) {
    const c = clearings[i % clearings.length] ?? clearings[0];
    if (!c) break;
    const a = rng() * Math.PI * 2;
    const r = c.radius * (0.5 + rng() * 0.6);
    const x = Math.round(c.x + Math.cos(a) * r);
    const z = Math.round(c.z + Math.sin(a) * r);
    if (!pathCells.has(`${x},${z}`)) addProp(flowers[i % flowers.length] ?? '', x, z, Math.floor(rng() * 360));
  }
  for (const [i, [x, z]] of grid.entries()) {
    if (i % 4 !== 0) continue;
    const yaw = Math.floor(rng() * 360);
    if (!felled.has(`${x},${z}`)) addProp(mushrooms[i % 2] ?? '', x + 1, z + 1, yaw);
  }
  for (const [i, [x, z]] of bigTrees.entries()) addProp(mushrooms[i % 2] ?? '', x + 2, z + 2, i * 47);
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 17;
    const z = Math.round(riverCenter(x));
    addPropAt(`${PACK.nature}/lily_large.glb`, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], i * 70);
  }

  // 8b. The mocks' scenery beyond chapter 1's corner. Trails edged with flowers, mushrooms, ferns and leaf
  // bushes, a lantern post now and then on the scene's trail; the long trails between the glades more sparsely.
  const N = PACK.nature;
  const BOX = PACK.box;
  const LANTERN_POLE = `${BOX}/kr-lantern-pole.glb`;
  const verge = [
    `${N}/flower_redA.glb`, `${N}/flower_yellowA.glb`, `${N}/mushroom_redGroup.glb`, `${N}/flower_purpleB.glb`, `${N}/grass_large.glb`,
    `${N}/flower_yellowB.glb`, `${N}/mushroom_tanGroup.glb`, `${N}/plant_bush.glb`, `${N}/flower_purpleA.glb`, `${N}/mushroom_redTall.glb`,
  ];
  const vergeGround = {
    world,
    surface,
    free: (x: number, z: number): boolean =>
      !inCorner(x, z) && x > 2 && z > 2 && x < sx - 3 && z < sz - 3 && !pathCells.has(`${x},${z}`) && wetDistance(x, z) >= 0.5 && !built(x, z) &&
      world.get(x, surface(x, z), z) === B.grass && world.get(x, surface(x, z) + 1, z) === 0 && world.get(x, surface(x, z) + 2, z) === 0,
    prop: (model: string, x: number, z: number, yaw: number) => addProp(model, x, z, yaw),
  };
  const bushes = [B.leaves, B.blossom, B.leaves, B.autumn];
  for (const route of sceneRoutes) trailVerge(vergeGround, route, { verge, bushes, lamp: LANTERN_POLE, spacing: 2, lampEvery: 12 });
  for (const route of baseRoutes.slice(1)) trailVerge(vergeGround, route, { verge, bushes, spacing: 5 });

  // The camp: the fire with log benches round it, the shelter's table under a hanging lantern, lantern posts at
  // its edge, the woodpile by the cabin, a signpost where the trail comes in.
  const campFire = { x: camp.x - 1, z: camp.z };
  addProp(`${PACK.survival}/campfire-pit.glb`, campFire.x, campFire.z);
  addProp(`${PACK.survival}/campfire-stand.glb`, campFire.x, campFire.z, 90);
  for (const [dx, dz, yaw] of [[0, -3, 0], [-3, 0, 90], [0, 3, 0], [3, 0, 90]] as const) addProp(`${BOX}/kr-log-bench.glb`, campFire.x + dx, campFire.z + dz, yaw);
  addCentred(`${PACK.furniture}/table.glb`, [SHELTER.x + 0.5, shelterY, SHELTER.z + 0.5], 90);
  for (const dz of [-2, 2]) addPropAt(`${BOX}/kr-log-bench.glb`, [SHELTER.x + 0.5, shelterY, SHELTER.z + dz + 0.5], 0);
  addPropAt(`${BOX}/kr-hanging-lantern.glb`, [SHELTER.x + 0.5, shelterY + 6.3, SHELTER.z + 0.5]);
  addPropAt(`${BOX}/kr-mushroom-basket.glb`, [SHELTER.x - 3 + 0.5, shelterY, SHELTER.z + 3 + 0.5], 30);
  addPropAt(`${PACK.survival}/barrel.glb`, [SHELTER.x + 3 + 0.5, shelterY, SHELTER.z - 3 + 0.5], 10);
  addPropAt(`${BOX}/kr-tool-rack.glb`, [SHELTER.x + 3 + 0.5, shelterY, SHELTER.z + 3 + 0.5], 0);
  for (const [dx, dz] of [[-4, 8], [5, 9], [-8, -9], [4, -7]] as const) addProp(LANTERN_POLE, camp.x + dx, camp.z + dz, dx < 0 ? 270 : 90);
  const [cabinX0, cabinZ0, , cabinZ1] = siteBox(CABIN);
  addProp(`${N}/log_stack.glb`, cabinX0 + 4, cabinZ1 + 1, 0);
  addProp(`${N}/log_stack.glb`, cabinX0 + 7, cabinZ0 - 1, 0);
  addProp(`${PACK.survival}/signpost.glb`, camp.x + 3, camp.z + 9, 200);

  // The ranger's cabin, set out as a ranger's room round a clear way from the door to the back wall: the forest
  // map and a shelf of jars on the back wall, a bedroll along one side, a table with a book under a hanging
  // lantern on the other, the tool rack, a barrel, a bucket and a plant in the corners.
  const room = (u: number, v: number): [number, number, number] => {
    const [x, z] = cabin.cell(u, v);
    return [x + 0.5, cabin.floorY, z + 0.5];
  };
  const inRoom = (model: string, u: number, v: number, yaw: number, lift = 0): void => {
    const [x, y, z] = room(u, v);
    addPropAt(model, [x, y + lift, z], yaw);
  };
  const back = cabin.inside.v - 1;
  const side = cabin.inside.u - 1;
  inRoom(`${BOX}/kr-map-board.glb`, 2, back, 90);
  inRoom(`${BOX}/kr-jar-shelf.glb`, side - 2, back, 90);
  inRoom(`${BOX}/kr-mushroom-basket.glb`, side, back, 0);
  addCentred(`${PACK.furniture}/pottedPlant.glb`, room(0, back), 0);
  inRoom(`${PACK.survival}/bedroll.glb`, 0, 4, 0);
  addCentred(`${PACK.furniture}/table.glb`, room(side - 2, 4), 90);
  // The chairs face the table between them (the pack's chair faces its +z).
  addCentred(`${PACK.furniture}/chair.glb`, room(side - 3, 4), 90);
  addCentred(`${PACK.furniture}/chair.glb`, room(side - 1, 4), 270);
  inRoom(`${PACK.props}/open-book.glb`, side - 2, 4, 30, 0.8);
  for (const u of [side - 2, Math.floor(side / 2)]) inRoom(`${BOX}/kr-hanging-lantern.glb`, u, 4, 0, 4.25);
  inRoom(`${BOX}/kr-tool-rack.glb`, side, 1, 180);
  inRoom(`${PACK.survival}/barrel.glb`, side, 0, 0);
  inRoom(`${PACK.survival}/bucket.glb`, 0, 0, 0);
  addCentred(`${PACK.furniture}/rugRectangle.glb`, room(Math.floor(side / 2), 2), 90);

  // Inside each tent: two bedrolls along the low sides, a rug between them, a lantern from the ridge pole, a
  // basket and a box at the back.
  for (const [i, t] of tents.entries()) {
    const at = (u: number, v: number, lift = 0): [number, number, number] => {
      const [x, z] = t.cell(u, v);
      return [x + 0.5, t.floorY + lift, z + 0.5];
    };
    for (const u of [0, t.inside.u - 1]) addPropAt(`${PACK.survival}/bedroll.glb`, at(u, t.inside.v - 3), 0);
    addPropAt(`${BOX}/kr-hanging-lantern.glb`, at(Math.floor(t.inside.u / 2), Math.floor(t.inside.v / 2), 5.2), 0);
    addPropAt(`${BOX}/kr-mushroom-basket.glb`, at(t.inside.u - 1, t.inside.v - 1), i * 40);
    addPropAt(`${PACK.survival}/box.glb`, at(0, t.inside.v - 1), i * 25);
    const alongX = tentSites[i]?.facing === 'east' || tentSites[i]?.facing === 'west';
    addCentred(`${PACK.furniture}/rugRectangle.glb`, at(Math.floor(t.inside.u / 2), Math.floor(t.inside.v / 2)), alongX ? 90 : 0);
  }
  const [campTent] = tents;
  if (!campTent) throw new Error('the camp has no tent');
  const campTentAt = campTent.cell(Math.floor(campTent.inside.u / 2), Math.floor(campTent.inside.v / 2) - 1);
  const campTentFloor = campTent.floorY;

  // A lantern on each end post of the second bridge.
  for (const [x, z] of bridgeLamps) addPropAt(`${BOX}/kr-hanging-lantern.glb`, [x + 0.5, deckY + 3, z + 0.5]);

  // Flowers, ferns and mushrooms all over the scene's ground, as thick as in the mocks (each cell's own roll).
  for (let x = CH1_CORNER.x; x < 176; x++) {
    for (let z = 8; z < 110; z++) {
      const roll = cellRoll(x, z, 31);
      if (roll >= 0.045 || !vergeGround.free(x, z)) continue;
      addProp(verge[Math.floor(roll * 1000) % verge.length] ?? '', x, z, Math.floor(roll * 8000) % 360);
    }
  }

  // The falls: white streaks down each sheet and foam where it meets the pool; lily pads on the pools.
  for (const f of FALLS) {
    addPropAt(`${BOX}/kr-falls-streaks.glb`, [f.x + 0.5, WATER_LEVEL + 1, f.sheetZ - 0.01], 0);
    addPropAt(`${BOX}/kr-falls-foam.glb`, [f.x + 0.5, WATER_LEVEL + 0.9, f.sheetZ - 0.6], 0);
    for (const [dx, dz] of [[-3, -3], [2, -4], [-1, -7]] as const) addPropAt(`${N}/lily_large.glb`, [f.pool.x + dx + 0.5, WATER_LEVEL + 1.02, f.pool.z + dz + 0.5], dx * 40);
  }

  // Each glade of chapters 2–5 gets lantern posts round it and a tent by a campfire with a log bench.
  for (const d of DISTRICTS) {
    for (const [dx, dz] of [[-16, -14], [16, -14], [-16, 14], [16, 16]] as const) addProp(LANTERN_POLE, d.x + dx, d.z + dz, dx < 0 ? 270 : 90);
    addProp(`${PACK.survival}/campfire-pit.glb`, d.x + 13, d.z + 15);
    addProp(`${BOX}/kr-log-bench.glb`, d.x + 13, d.z + 18, 0);
  }

  const riddleAt = { x: ancient.x - 4, z: ancient.z - 4 };
  const interactables: WorldEntities['interactables'] = [
    {
      id: 'parrot-guide', kind: 'npc', name: 'Vẹt', label: 'Nói chuyện',
      position: place(parrot.x, parrot.z), yaw: 200, radius: 3, ...animated(`${PACK.pets}/animal-parrot.glb`),
    },
    {
      id: 'clue-box', kind: 'object', name: 'Chiếc hộp', label: 'Xem hộp',
      position: place(parrot.x - 6, parrot.z + 4), yaw: 30, radius: 2, ...modelled(`${PACK.survival}/box.glb`),
    },
    {
      id: 'clue-letter', kind: 'object', name: 'Lá thư', label: 'Đọc thư',
      position: place(letterAt.x, letterAt.z), yaw: 15, radius: 2, shape: 'letter',
    },
    {
      id: 'clue-mushroom', kind: 'object', name: 'Cây nấm đỏ', label: 'Xem nấm',
      position: place(parrot.x + 2, parrot.z + 7), yaw: 0, radius: 2, ...modelled(`${PACK.nature}/mushroom_red.glb`),
    },
    {
      id: 'animal-beaver', kind: 'npc', name: 'Hải ly', label: 'Nói chuyện',
      position: place(beaver.x, beaver.z), yaw: 20, radius: 3, ...animated(`${PACK.pets}/animal-beaver.glb`),
    },
    {
      // The stones are terrain blocks; the prompt sits on the near bank.
      id: 'stream-stones', kind: 'object', name: 'Đá qua suối', label: 'Qua suối',
      position: place(stonesX, stonesZ0 - 1), yaw: 0, radius: 2.5,
    },
    {
      id: 'ancient-tree', kind: 'riddle', name: 'Cây cổ thụ', label: 'Giải đố',
      position: place(riddleAt.x, riddleAt.z), yaw: 225, radius: 3, board: '8 + 5 = ?',
    },
    {
      id: 'chest', kind: 'chest', name: 'Rương', label: 'Mở rương',
      position: place(ancient.x - 5, ancient.z + 3), yaw: 45, radius: 2.5, ...modelled(`${PACK.survival}/chest.glb`),
    },
    {
      id: 'gate-ch2', kind: 'gate', name: 'Cổng đá', label: 'Tới chương 2',
      position: place(ancient.x + 4, ancient.z + 11), yaw: 0, radius: 4, ...modelled(`${PACK.castle}/gate.glb`),
    },
  ];

  // The gate back to the hub, beside the spawn (every theme map has one: zone-map.ts HUB_REGION).
  interactables.push({
    id: `cong-${HUB_REGION}`, kind: 'gate', name: 'Cổng sang Trung tâm', label: 'Đi qua cổng',
    position: place(spawn.x + 7, spawn.z - 4), yaw: 0, radius: 3, ...modelled(`${PACK.castle}/gate.glb`), travel: HUB_REGION,
  });

  // Villagers and animals going about their day, clear of every chapter's quest targets.
  const ambients = placeForestLife({
    world,
    surface,
    standY,
    pathCells,
    blocks: { grass: B.grass, sand: B.sand },
    questSpots: interactables.map((t) => [t.position[0] ?? 0, t.position[2] ?? 0] as const),
    trees: occupied,
    scene: { pool: pool0, camp, fire: campFire, table: SHELTER },
    spawn,
    meadows: MEADOWS,
    waterLevel: WATER_LEVEL,
    riverCenter,
    riverHalfWidth,
    addProp: (model, x, z, yaw) => addProp(model, x, z, yaw),
    scaleOf,
  });

  // Forest folk at the glades of chapters 2–5, each glade its own: rangers, mushroom pickers,
  // campers, woodcutters, botanists, landscape painters, anglers and scouts.
  const basket = `${PACK.props}/basket.glb`;
  const book = `${PACK.props}/open-book.glb`;
  const axe = `${PACK.survival}/tool-axe.glb`;
  const magnifier = `${PACK.props}/magnifier.glb`;
  const palette = `${PACK.props}/artist-palette.glb`;
  const kite = `${PACK.props}/kite.glb`;
  const fish = `${PACK.survival}/fish.glb`;
  const FOLK: ReadonlyArray<{ ranger: string; pickers: readonly string[]; campers: readonly string[]; watcher: string }> = [
    { ranger: 'Chú kiểm lâm', pickers: ['Cô hái nấm', 'Bà hái rau rừng', 'Chị hái mộc nhĩ', 'Bác tìm thảo dược'], campers: ['Bạn cắm trại', 'Bạn dựng lều', 'Bé nhặt nón thông', 'Bạn quan sát kiến'], watcher: 'Bác ngắm chim' },
    { ranger: 'Cô kiểm lâm', pickers: ['Chị nhặt hạt dẻ', 'Bác hái quả sim', 'Cô hái dâu rừng', 'Bà nhặt nấm hương'], campers: ['Bạn dựng lều', 'Bạn thổi sáo rừng', 'Bé tìm tổ chim', 'Bạn làm tiêu bản lá'], watcher: 'Ông vẽ cây' },
    { ranger: 'Bác giữ rừng', pickers: ['Cô nhặt lá khô', 'Bà hái chè rừng', 'Chị hái hoa dại', 'Chú đào rễ cây'], campers: ['Bạn đi dã ngoại', 'Bạn chụp ảnh bướm', 'Bé gom củi khô', 'Bạn ngắm mây trời'], watcher: 'Cô chụp ảnh chim' },
    { ranger: 'Anh kiểm lâm trẻ', pickers: ['Chú lấy mật ong', 'Chị hái hoa dại', 'Cô hái nấm mối', 'Bác tìm măng non'], campers: ['Bạn chơi trốn tìm', 'Bạn hát bên suối', 'Bé xếp lá vàng', 'Bạn ngắm thác'], watcher: 'Bác đọc sách dưới cây' },
  ];
  // The scene's folk: the ranger at his cabin, mushroom pickers, explorers, anglers, and spawn guides.
  const explorer = (name: string, letter: string, at: readonly [number, number]): Resident => ({ routine: 'pupil', name, model: person(letter), at, scale: 0.72, held: [magnifier] });
  const sceneFolk: Resident[] = [
    // Welcome and arrival round the spawn (x: 16, z: 16), a few steps off: a child arriving stands clear of
    // anyone to talk to until it walks up to them.
    { routine: 'sentry', name: 'Bác kiểm lâm đón tiếp', model: person('d'), at: [spawn.x + 6, spawn.z + 3] as const, held: [axe] },
    { routine: 'pupil', name: 'Bạn nhỏ hướng dẫn đường rừng', model: person('f'), at: [spawn.x + 2, spawn.z - 7] as const, held: [magnifier] },
    { routine: 'reader', name: 'Khách tham quan bìa rừng', model: person('k'), at: [spawn.x - 6, spawn.z + 4] as const, held: [book] },

    // Waterfall and cabin scene.
    { routine: 'sentry', name: 'Bác Kiểm lâm Sơn', model: person('d'), at: [cabin.door[0] - 3, cabin.door[1] + 3] },
    { routine: 'waterer', name: 'Chị Hái nấm Mai', model: person('h'), at: [100, 72], held: [basket] },
    { routine: 'porter', name: 'Chú gánh củi về lều', model: person('b'), at: [camp.x + 4, camp.z - 2], held: [axe] },
    explorer('Bé Na thám hiểm', 'o', [pool0.x - 12, pool0.z - 3]),
    explorer('Bé Bin thám hiểm', 'q', [pool0.x - 10, pool0.z + 2]),
    explorer('Bé Su thám hiểm', 'f', [pool0.x - 15, pool0.z]),
    { routine: 'reader', name: 'Ông Ngắm thác', model: person('k'), at: [pool0.x - 9, pool0.z - 6], held: [book] },
  ];
  ambients.push(
    ...placeVillageLife(
      {
        world,
        surface,
        standY,
        onPath: (x, z) => pathCells.has(`${x},${z}`),
        inWater: (x, z) => surface(x, z) <= WATER_LEVEL || wetDistance(x, z) < 1,
        questSpots: interactables.map((t) => [t.position[0] ?? 0, t.position[2] ?? 0] as const),
        scaleOf,
        isWay: (x, z) => pathCells.has(`${x},${z}`),
        spawn: [spawn.x, spawn.z],
      },
      DISTRICTS.flatMap((d, i) => {
        const folk = FOLK[i % FOLK.length] ?? FOLK[0];
        if (!folk) return [];
        return [
          ...crowd('sentry', [folk.ranger, 'Anh tuần rừng'], [person('d'), person('m')], [d.x, d.z - 18], 8, 2, [axe]),
          ...crowd('waterer', folk.pickers, [person('e'), person('i'), person('h'), person('p')], [d.x - 20, d.z], 10, 4, [basket]),
          ...crowd('porter', ['Bác tiều phu đốn củi', 'Chú gom cành khô'], [person('b'), person('j')], [d.x + 15, d.z - 15], 8, 2, [axe]),
          ...crowd('pupil', folk.campers, [person('f'), person('o'), person('q'), person('r')], [d.x + 18, d.z + 6], 8, 5, [magnifier]),
          ...crowd('reader', [folk.watcher, 'Nhà thực vật học'], [person('a'), person('c')], [d.x, d.z + 22], 6, 2, [book]),
          ...crowd('reader', ['Bạn vẽ tranh cây cổ thụ', 'Người phác thảo hoa dại'], [person('n'), person('p')], [d.x - 12, d.z + 18], 6, 2, [palette]),
          ...crowd('ferryman', ['Bác câu cá ven suối rừng'], [person('k')], [d.x - 18, d.z - 12], 6, 1, [fish]),
          ...crowd('pupil', ['Bạn nhỏ thả diều ven trảng cỏ'], [person('f'), person('o')], [d.x + 8, d.z + 24], 8, 2, [kite]),
        ];
      }).concat(sceneFolk),
      seed + 23,
    ),
  );

  // Chapters 2–5 (the Tiếng Việt quests): every target they name, placed from the catalogues, on firm
  // open ground off the path and the stream, clear of trees, props, chapter 1 and the villagers' places.
  const propCells = columnsOf(props);
  const canStand = (x: number, z: number): boolean => {
    const y = surface(x, z);
    if (y <= WATER_LEVEL || wetDistance(x, z) < 2 || pathDistance(x, z) < 2) return false;
    if (world.get(x, y + 1, z) !== 0 || world.get(x, y + 2, z) !== 0 || nearSite(x, z, 1)) return false; // a boulder, a trunk, a tent
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => Math.abs(surface(x + (dx ?? 0), z + (dz ?? 0)) - y) > 1)) return false;
    return !occupied.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 2.2) && !propCells.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5);
  };
  const villagerSpots = ambients.flatMap((a) => [a.position, ...Object.values(a.spots)].map((p) => [Math.floor(p[0]), Math.floor(p[2])] as const));
  // Each glade's lessons start at its edge; the forest train runs from the spawn to every glade and back,
  // its stops clear of the villagers' places like every target.
  const clearOfLife = (x: number, z: number): boolean => villagerSpots.every(([vx, vz]) => Math.hypot(vx - x, vz - z) >= QUEST_CLEARANCE + 1);
  // Open ground nearest (x, z), three blocks or more from the stops already set (each train stands on its own).
  const taken: Array<[number, number]> = [];
  const openNear = (x: number, z: number): [number, number] => {
    for (let r = 0; r <= 14; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const [cx, cz] = [x + dx, z + dz];
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !canStand(cx, cz) || !clearOfLife(cx, cz)) continue;
          if (taken.some(([tx, tz]) => Math.hypot(tx - cx, tz - cz) < 3)) continue;
          return [cx, cz];
        }
      }
    }
    return [x, z];
  };
  /** A train's stop: open ground near (x, z), kept from the next stops. */
  const stopNear = (x: number, z: number): [number, number] => {
    const at = openNear(x, z);
    taken.push(at);
    return at;
  };
  const gladeStart = new Map(DISTRICTS.map((d) => [d.chapter, openNear(...gladeStartNear(d))] as const));
  const trainModel = `${PACK.props}/railway-red.glb`;
  const stops = [
    ...DISTRICTS.map((d, i) => ({ name: `Tàu rừng tới bãi rừng ${i + 1}`, at: stopNear(spawn.x + 2 + i * 3, spawn.z - 5), to: gladeStart.get(d.chapter) ?? [d.x, d.z] })),
    ...DISTRICTS.map((d) => {
      const [gx, gz] = gladeStart.get(d.chapter) ?? [d.x, d.z];
      // The way home leaves beside the glade's start, by the same trail.
      return { name: 'Tàu rừng về bìa rừng', at: stopNear(gx, gz + 3), to: [spawn.x + 2, spawn.z + 2] as const };
    }),
  ];
  stops.forEach((stop, i) =>
    interactables.push({
      id: `ben-tau-rung-${i + 1}`, kind: 'object', name: stop.name, label: 'Lên tàu', position: place(stop.at[0], stop.at[1]), yaw: 0, radius: 2.5,
      ...modelled(trainModel), ride: place(stop.to[0] + 1, stop.to[1] + 1),
    }),
  );
  // The side quests' givers (beyond the parrot and the beaver, placed by hand above): beside the forest's ways,
  // at the places their table names, clear of the villagers' places like every target.
  const sideTable = sideQuestTableOf('khu-rung-bi-mat');
  const spots = sideSpots({
    world,
    wayIds: new Set(NETWORK_BLOCK_NAMES.map(id)),
    spawn: [spawn.x, spawn.z],
    groundY: surface,
    rides: interactables.flatMap((t) => (t.ride ? [{ stop: [Math.floor(t.position[0]), Math.floor(t.position[2])] as const, arrival: [Math.floor(t.ride[0]), Math.floor(t.ride[2])] as const }] : [])),
    landmark: () => undefined,
    canStand: (x, z) => canStand(x, z) && clearOfLife(x, z),
  });
  const giverAnchor = new Map(sideTable.givers.map((g) => [g.id, g.at ? { at: g.at } : { place: g.place ?? '' }] as const));
  // The givers, the co-op hosts and the zone guardians stand by the ways; only the givers have company round them.
  const standAnchor = standingAnchors(sideTable);
  const gladeCells = new Map(DISTRICTS.map((d) => [d.chapter, cellsIn(d.x - d.hx, d.z - d.hz, d.x + d.hx, d.z + d.hz)]));
  const allGlades = [...gladeCells.values()].flat();
  const allInteractables = await placeRegionTargets({
    mapId: MAP_ID,
    region: 'khu-rung-bi-mat',
    ownChapter: 1,
    map: {
      canStand,
      stand: place,
      chapterCells: (chapter) => gladeCells.get(chapter) ?? allGlades,
      residentCells: allGlades,
      // Villagers keep this far from every quest target (forest-life.ts): so do the targets from them.
      clearance: QUEST_CLEARANCE,
      keepClear: [...columnsOf(interactables.filter((t) => t.chapter === undefined)), ...villagerSpots, [spawn.x, spawn.z], ...gladeStart.values()],
      sideSpot: (giver, taken) => {
        const anchor = standAnchor.get(giver);
        if (!anchor) throw new Error(`${MAP_ID}: ${giver} offers side quests, hosts a co-op challenge or guards a zone but is not a giver, host or guardian in tools/content/side-quests/khu-rung-bi-mat.json`);
        return spots(anchor, [...taken, [spawn.x, spawn.z], ...gladeStart.values()]);
      },
    },
    interactables,
    seed: seed + 19,
  });

  // The givers' company and the table's residents, clear of every target and of the forest folk.
  const givers = new Map(allInteractables.filter((t) => giverAnchor.has(t.id)).map((t) => [t.id, [Math.floor(t.position[0]), Math.floor(t.position[2])] as const]));
  ambients.push(
    ...sideFolk({
      table: sideTable,
      givers,
      spots,
      life: {
        world,
        surface,
        standY,
        onPath: (x, z) => pathCells.has(`${x},${z}`),
        inWater: (x, z) => surface(x, z) <= WATER_LEVEL || wetDistance(x, z) < 1,
        // Measured from where each target stands, as the forest folk are (forest-life.ts QUEST_CLEARANCE).
        questSpots: [...allInteractables.map((t) => [t.position[0] ?? 0, t.position[2] ?? 0] as const), ...villagerSpots],
        scaleOf,
        isWay: (x, z) => pathCells.has(`${x},${z}`),
        spawn: [spawn.x, spawn.z],
      },
      seed: seed + 29,
    }),
  );

  const entities: WorldEntities = {
    version: 2,
    id: MAP_ID,
    seed,
    size: [sx, sy, sz],
    waterLevel: WATER_LEVEL,
    spawn: { position: [spawn.x + 0.5, standY(spawn.x, spawn.z), spawn.z + 0.5], yaw: 45 },
    chapterSpawns: Object.fromEntries([...gladeStart].map(([chapter, [x, z]]) => [String(chapter), { position: place(x, z), yaw: 180 }])),
    interactables: allInteractables,
    props,
    landmarks: [
      { id: 'ancient-tree', name: 'Cây cổ thụ', position: [ancient.x + 0.5, ancientBase, ancient.z + 0.5] },
      { id: 'bridge', name: 'Cầu gỗ', position: [bridgeX + 0.5, deckY + 1, (bridgeZ0 + bridgeZ1) / 2] },
      { id: 'stepping-stones', name: 'Đá qua suối', position: [stonesX + 0.5, WATER_LEVEL + 2, (stonesZ0 + stonesZ1) / 2 + 0.5] },
      { id: 'chest', name: 'Rương', position: place(ancient.x - 5, ancient.z + 3) },
      { id: 'thac-nuoc', name: 'Thác nước', position: fallsFeet[0] ?? place(pool0.x, pool0.z) },
      { id: 'cau-go-qua-suoi', name: 'Cầu gỗ qua suối', position: [bridge2.x + 0.5, deckY + 1, (bridge2.z0 + bridge2.z1) / 2] },
      { id: 'loi-mon-hoa', name: 'Lối mòn hoa', position: place(bridge2.x - 2, bridge2.z0 - 6) },
      { id: 'trai-nguoi-rung', name: 'Trại người rừng', position: place(campFire.x, campFire.z) },
      { id: 'choi-kiem-lam', name: 'Chòi kiểm lâm', position: room(Math.floor(side / 2), 4) },
      { id: 'leu-trai', name: 'Lều trại', position: [campTentAt[0] + 0.5, campTentFloor, campTentAt[1] + 0.5] },
      { id: 'thac-rung-sau', name: 'Thác rừng sâu', position: fallsFeet[1] ?? place(CLIFFS[1]?.x ?? 0, CLIFFS[1]?.z ?? 0) },
    ],
    ambients,
    outland: await outlandSpecOf(world, seed, 'forest', GROUND, SOIL),
  };
  return { world, entities };
}

await runIfMain(import.meta.url, generateForest);

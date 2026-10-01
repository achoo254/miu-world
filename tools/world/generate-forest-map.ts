// Generates chapter 1 "Khu rừng bí mật" from a fixed seed: rolling terrain with rim hills, a stream,
// a wooden bridge, stepping stones, a stone path, scattered trees, the ancient tree, plus the quest's
// interactables (ids match the `target`s in content/quests/forest-ch1.json) and decorative props; the
// places of the forest's Tiếng Việt lessons (chapters 2–5) are placed from the catalogues.
// Output: assets/generated/world/forest-ch1/{regions/, horizon.bin, entities.json}
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { LIFE_MODEL_ANIMATION, LIFE_MODEL_HEIGHT, QUEST_CLEARANCE, placeForestLife } from './forest-life';
import { columnsOf, fillColumn, heightField, loadBlocks, mapModels, PACK, placeRegionTargets, rollingHeight, runIfMain, scatterTrees, smoothstep, standHeight, WIDE_MAP_SIDE } from './map-kit';
import { createRng, hashSeed } from './noise';
import { placeBridge } from './structures/bridge';
import { distanceToPath, pathColumns, type Point } from './structures/path';
import { cellsIn } from './chapters/place-quest-targets';
import { placeAncientTree } from './structures/tree';
import { LIFE_CLIPS, LIFE_HEIGHTS, crowd, person, placeVillageLife } from './village-life';

export const MAP_ID = 'forest-ch1';
export const SEED_TEXT = 'miu-forest-ch1';
const WATER_LEVEL = 9;

/** Models and the height (in blocks) each should stand at; scale is derived from its bounds. */
const MODEL_HEIGHT: Record<string, number> = {
  [`${PACK.props}/railway-red.glb`]: 1.2,
  [`${PACK.survival}/chest.glb`]: 0.8,
  [`${PACK.survival}/box.glb`]: 0.6,
  [`${PACK.nature}/mushroom_red.glb`]: 0.8,
  [`${PACK.nature}/plant_bush.glb`]: 1.0,
  [`${PACK.survival}/signpost.glb`]: 1.6,
  [`${PACK.survival}/campfire-pit.glb`]: 0.5,
  [`${PACK.survival}/barrel.glb`]: 1.0,
  [`${PACK.survival}/box-large.glb`]: 0.9,
  [`${PACK.survival}/fence.glb`]: 1.0,
  [`${PACK.nature}/mushroom_redGroup.glb`]: 0.6,
  [`${PACK.nature}/mushroom_tanGroup.glb`]: 0.6,
  [`${PACK.nature}/flower_redA.glb`]: 0.5,
  [`${PACK.nature}/flower_yellowB.glb`]: 0.5,
  [`${PACK.nature}/flower_purpleA.glb`]: 0.5,
  [`${PACK.nature}/log_stack.glb`]: 0.9,
  [`${PACK.nature}/lily_large.glb`]: 0.1,
  [`${PACK.food}/apple.glb`]: 0.35,
  [`${PACK.castle}/gate.glb`]: 5,
  [`${PACK.pets}/animal-parrot.glb`]: 1.1,
  [`${PACK.pets}/animal-beaver.glb`]: 1.0,
};
/** Clips the animated models must contain. */
const MODEL_ANIMATION: Record<string, string> = {
  [`${PACK.pets}/animal-parrot.glb`]: 'idle',
  [`${PACK.pets}/animal-beaver.glb`]: 'idle',
};

export function riverCenter(x: number): number {
  return 50 + 6 * Math.sin(x / 14) + 2.5 * Math.sin(x / 6.3 + 1.3);
}

export function riverHalfWidth(x: number): number {
  return 2.3 + 0.8 * Math.sin(x / 9);
}

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
/** The waterfall cliff of the mock (designs/khu-rung-bi-mat/): a rocky hill with water falling down its face. */
const CLIFF = { x: 690, z: 720, r: 90, rise: 18 };

/** Meadows of the forest beyond chapter 1's corner (open ground for the wild life, round the glades too). */
export const MEADOWS: ReadonlyArray<{ x: number; z: number }> = [
  { x: 140, z: 28 },
  { x: 164, z: 84 },
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
    grass: id('grass'), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'),
    planks: id('planks'), path: id('path'), water: id('water'), rock: id('rock-moss'), birch: id('birch-log'),
    treeLog: id('tree-log'), treeBirch: id('tree-birch-log'),
    autumn: id('leaves-autumn'), bed: id('riverbed'),
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
  const routes: Point[][] = [
    ch1Route,
    [[ancient.x, ancient.z + 8], [ancient.x, 180], [220, 240]],
    [[220, 240], [500, 260]],
    [[220, 240], [240, 540]],
    [[500, 260], [540, 560]],
    [[240, 540], [540, 560]],
    [[540, 560], [CLIFF.x - 40, CLIFF.z - 60]],
  ];
  const pathDistance = (x: number, z: number): number => Math.min(...routes.map((r) => distanceToPath(r, x, z)));

  // 1. Height field: rolling ground, levelled at the clearings and along the path, sunk at the stream.
  const surface = heightField(world, (x, z) => {
    let h = rollingHeight(seed, x, z, world.size, { ground: 12, roll: 3.5, rim: 9 });
    for (const c of clearings) {
      const k = smoothstep(c.radius, c.radius + 5, Math.hypot(x - c.x, z - c.z));
      h = 12 * (1 - k) + h * k;
    }
    const cliff = Math.hypot(x - CLIFF.x, z - CLIFF.z) / CLIFF.r;
    if (cliff < 1) h += CLIFF.rise * Math.min(1, (1 - cliff) * 2.2);
    const pathDist = pathDistance(x, z);
    h = h * smoothstep(1, 5, pathDist) + Math.min(h, 13) * (1 - smoothstep(1, 5, pathDist));
    const dr = Math.abs(z - riverCenter(x));
    const hw = riverHalfWidth(x);
    if (dr < hw + 4) h = WATER_LEVEL + 1 + (h - WATER_LEVEL - 1) * smoothstep(hw + 1, hw + 4, dr);
    if (x >= bridgeX - 1 && x <= bridgeX + 1 && dr >= hw && dr < hw + 6) h = Math.max(h, deckY - 1);
    return Math.round(Math.min(h, sy - 12));
  }, 0);

  // 2. Terrain columns + stream.
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const dr = Math.abs(z - riverCenter(x));
      const hw = riverHalfWidth(x);
      if (dr < hw) {
        const bed = WATER_LEVEL - (dr < hw - 1 ? 2 : 1);
        for (let y = 0; y <= bed; y++) world.set(x, y, z, y === bed ? B.bed : B.stone);
        for (let y = bed + 1; y <= WATER_LEVEL; y++) world.set(x, y, z, B.water);
        continue;
      }
      const h = surface(x, z);
      const beach = dr < hw + 2 && h <= WATER_LEVEL + 1;
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

  // 4. Bridge.
  placeBridge(world, { x0: bridgeX - 1, x1: bridgeX + 1, z0: bridgeZ0, z1: bridgeZ1, deckY }, B);

  // 4b. Stepping stones: four mossy rocks across the stream, level with the banks (the sort challenge).
  const stoneZs = [0, 1, 2, 3].map((i) => Math.round(stonesZ0 + (i * (stonesZ1 - stonesZ0)) / 3));
  for (const z of stoneZs) {
    for (let y = WATER_LEVEL - 2; y <= WATER_LEVEL + 1; y++) world.set(stonesX, y, z, B.rock);
  }

  // 5. Ancient tree landmark.
  const ancientBase = surface(ancient.x, ancient.z) + 1;
  placeAncientTree(world, ancient.x, ancientBase, ancient.z, { log: B.treeLog, leaves: B.leaves, core: B.log }, rng);

  // 5b. The waterfall: water down the cliff's south face into a pool at its foot, mossy rocks beside it.
  const fallX = CLIFF.x;
  let fallZ = CLIFF.z;
  while (fallZ > CLIFF.z - CLIFF.r && surface(fallX, fallZ - 1) >= surface(fallX, fallZ) - 1) fallZ--;
  for (let z = fallZ; z <= fallZ + 4; z++) for (let dx = -1; dx <= 1; dx++) for (let y = surface(fallX, fallZ - 2) + 1; y <= surface(fallX + dx, z); y++) world.set(fallX + dx, y, z, B.water);
  for (let dx = -4; dx <= 4; dx++) for (let dz = -6; dz <= -1; dz++) if (Math.hypot(dx, dz + 3) < 3.6) world.set(fallX + dx, surface(fallX + dx, fallZ + dz), fallZ + dz, B.water);
  for (const dx of [-3, 3]) world.set(fallX + dx, surface(fallX + dx, fallZ + 1) + 1, fallZ + 1, B.rock);

  // 6. Scattered trees (jittered grid, rejecting path, stream, clearings and rim).
  const occupied = scatterTrees({
    world,
    rng,
    surface,
    rejects: (x, z) =>
      pathDistance(x, z) < 3.5 ||
      Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 3 ||
      clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius + 1),
    skip: 0.18,
    blocks: (roll) => (roll < 0.15 ? { log: B.treeBirch, leaves: B.leaves } : roll < 0.3 ? { log: B.treeLog, leaves: B.autumn } : { log: B.treeLog, leaves: B.leaves }),
  });

  // 7. Mossy boulders.
  for (let i = 0; i < Math.round((14 * sx * sz) / (96 * 96)); i++) {
    const x = 6 + Math.floor(rng() * (sx - 12));
    const z = 6 + Math.floor(rng() * (sz - 12));
    if (pathDistance(x, z) < 3 || Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 1) continue;
    const y = surface(x, z) + 1;
    world.set(x, y, z, B.rock);
    if (rng() < 0.5 && x + 1 < sx) world.set(x + 1, surface(x + 1, z) + 1, z, B.rock);
    if (rng() < 0.3) world.set(x, y + 1, z, B.rock);
  }

  // 8. Entities.
  const standY = standHeight(world, surface);
  const { props, scaleOf, place, addProp, addPropAt, modelled, animated } = await mapModels({
    heights: { ...MODEL_HEIGHT, ...LIFE_HEIGHTS, ...LIFE_MODEL_HEIGHT },
    clips: { ...MODEL_ANIMATION, ...LIFE_CLIPS, ...LIFE_MODEL_ANIMATION },
    standY,
  });
  addProp(`${PACK.survival}/signpost.glb`, spawn.x + 3, spawn.z + 3, 225);
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
  for (const [i, [x, z]] of occupied.entries()) {
    if (i % 4 === 0) addProp(mushrooms[i % 2] ?? '', x + 1, z + 1, Math.floor(rng() * 360));
  }
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 17;
    const z = Math.round(riverCenter(x));
    addPropAt(`${PACK.nature}/lily_large.glb`, [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], i * 70);
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
    id: 'cong-truong-hoc', kind: 'gate', name: 'Cổng sang Trường học', label: 'Đi qua cổng',
    position: place(spawn.x + 7, spawn.z - 4), yaw: 0, radius: 3, ...modelled(`${PACK.castle}/gate.glb`), travel: 'truong-hoc',
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
    spawn,
    meadows: MEADOWS,
    waterLevel: WATER_LEVEL,
    riverCenter,
    riverHalfWidth,
    addProp: (model, x, z, yaw) => addProp(model, x, z, yaw),
    scaleOf,
  });

  // Forest folk at the glades of chapters 2–5, each glade its own: a ranger, mushroom pickers, campers and
  // a bird watcher (placed like the villagers of the wide maps, village-life.ts).
  const basket = `${PACK.props}/basket.glb`;
  const book = `${PACK.props}/open-book.glb`;
  const axe = `${PACK.survival}/tool-axe.glb`;
  const FOLK: ReadonlyArray<{ ranger: string; pickers: readonly string[]; campers: string; watcher: string }> = [
    { ranger: 'Chú kiểm lâm', pickers: ['Cô hái nấm', 'Bà hái rau rừng'], campers: 'Bạn cắm trại', watcher: 'Bác ngắm chim' },
    { ranger: 'Cô kiểm lâm', pickers: ['Chị nhặt hạt dẻ', 'Bác hái quả sim'], campers: 'Bạn dựng lều', watcher: 'Ông vẽ cây' },
    { ranger: 'Bác giữ rừng', pickers: ['Cô nhặt lá khô', 'Bà hái chè rừng'], campers: 'Bạn đi dã ngoại', watcher: 'Cô chụp ảnh chim' },
    { ranger: 'Anh kiểm lâm trẻ', pickers: ['Chú lấy mật ong', 'Chị hái hoa dại'], campers: 'Bạn chơi trốn tìm', watcher: 'Bác đọc sách dưới cây' },
  ];
  ambients.push(
    ...placeVillageLife(
      {
        world,
        surface,
        standY,
        onPath: (x, z) => pathCells.has(`${x},${z}`),
        inWater: (x, z) => surface(x, z) <= WATER_LEVEL || Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 1,
        questSpots: interactables.map((t) => [t.position[0] ?? 0, t.position[2] ?? 0] as const),
        scaleOf,
      },
      DISTRICTS.flatMap((d, i) => {
        const folk = FOLK[i % FOLK.length] ?? FOLK[0];
        if (!folk) return [];
        return [
          ...crowd('sentry', [folk.ranger], [person('d')], [d.x, d.z - 18], 6, 1, [axe]),
          ...crowd('waterer', folk.pickers, [person('e'), person('i')], [d.x - 20, d.z], 8, 2, [basket]),
          ...crowd('pupil', [folk.campers], [person('f'), person('o'), person('q')], [d.x + 18, d.z + 6], 6, 3),
          ...crowd('reader', [folk.watcher], [person('a')], [d.x, d.z + 22], 4, 1, [book]),
        ];
      }),
      seed + 23,
    ),
  );

  // Chapters 2–5 (the Tiếng Việt quests): every target they name, placed from the catalogues, on firm
  // open ground off the path and the stream, clear of trees, props, chapter 1 and the villagers' places.
  const propCells = columnsOf(props);
  const canStand = (x: number, z: number): boolean => {
    const y = surface(x, z);
    if (y <= WATER_LEVEL || Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 2 || pathDistance(x, z) < 2) return false;
    if (world.get(x, y + 1, z) !== 0 || world.get(x, y + 2, z) !== 0) return false; // a boulder or a trunk
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => Math.abs(surface(x + (dx ?? 0), z + (dz ?? 0)) - y) > 1)) return false;
    return !occupied.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 2.2) && !propCells.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5);
  };
  const villagerSpots = ambients.flatMap((a) => [a.position, ...Object.values(a.spots)].map((p) => [Math.floor(p[0]), Math.floor(p[2])] as const));
  // Each glade's lessons start at its edge; the forest train runs from the spawn to every glade and back,
  // its stops clear of the villagers' places like every target.
  const clearOfLife = (x: number, z: number): boolean => villagerSpots.every(([vx, vz]) => Math.hypot(vx - x, vz - z) >= QUEST_CLEARANCE + 1);
  const openNear = (x: number, z: number): [number, number] => {
    for (let r = 0; r <= 14; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) === r && canStand(x + dx, z + dz) && clearOfLife(x + dx, z + dz)) return [x + dx, z + dz];
        }
      }
    }
    return [x, z];
  };
  const gladeStart = new Map(DISTRICTS.map((d) => [d.chapter, openNear(d.x, d.z + d.hz - 4)] as const));
  const trainModel = `${PACK.props}/railway-red.glb`;
  const stops = [
    ...DISTRICTS.map((d, i) => ({ name: `Tàu rừng tới bãi rừng ${i + 1}`, at: openNear(spawn.x + 2 + i * 3, spawn.z - 5), to: gladeStart.get(d.chapter) ?? [d.x, d.z] })),
    ...DISTRICTS.map((d) => {
      const [gx, gz] = gladeStart.get(d.chapter) ?? [d.x, d.z];
      return { name: 'Tàu rừng về bìa rừng', at: openNear(gx + 4, gz), to: [spawn.x + 2, spawn.z + 2] as const };
    }),
  ];
  stops.forEach((stop, i) =>
    interactables.push({
      id: `ben-tau-rung-${i + 1}`, kind: 'object', name: stop.name, label: 'Lên tàu', position: place(stop.at[0], stop.at[1]), yaw: 0, radius: 2.5,
      ...modelled(trainModel), ride: place(stop.to[0] + 1, stop.to[1] + 1),
    }),
  );
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
    },
    interactables,
    seed: seed + 19,
  });

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
    ],
    ambients,
  };
  return { world, entities };
}

await runIfMain(import.meta.url, generateForest);

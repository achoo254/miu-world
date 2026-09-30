// Generates chapter 1 "Khu rừng bí mật" from a fixed seed: rolling terrain with rim hills, a stream,
// a wooden bridge, stepping stones, a stone path, scattered trees, the ancient tree, plus the quest's
// interactables (ids match the `target`s in content/quests/forest-ch1.json) and decorative props, and
// for now the places of the first two Tiếng Việt quests (`chapter2Preview`).
// Output: assets/generated/world/forest-ch1/{chunks.bin, entities.json}
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { VoxelWorld, encodeWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, REPO_ROOT, readJson } from '../assets/asset-lib';
import { modelScales } from './model-scales';
import { createRng, fbm, hashSeed } from './noise';
import { placeBridge } from './structures/bridge';
import { distanceToPath, pathColumns, type Point } from './structures/path';
import { placeAncientTree, placeTree } from './structures/tree';

export const MAP_ID = 'forest-ch1';
export const SEED_TEXT = 'miu-forest-ch1';
const CHUNKS = [6, 2, 6] as const; // 96 x 32 x 96 blocks
const WATER_LEVEL = 9;
const OUT_DIR = path.join(ASSETS_DIR, 'generated/world', MAP_ID);

const PACK = {
  pets: 'packs/kenney-cube-pets/2.0',
  survival: 'packs/kenney-survival-kit/2.0',
  nature: 'packs/kenney-nature-kit/2.1',
  food: 'packs/kenney-food-kit/2.0',
  castle: 'packs/kenney-castle-kit/2.0',
};

/** Models and the height (in blocks) each should stand at; scale is derived from its bounds. */
const MODEL_HEIGHT: Record<string, number> = {
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
  // Chapter 2 stand-ins (see `chapter2Preview`).
  [`${PACK.pets}/animal-caterpillar.glb`]: 1.0,
  [`${PACK.pets}/animal-elephant.glb`]: 1.6,
  [`${PACK.nature}/tree_oak.glb`]: 5,
  [`${PACK.nature}/plant_bushLarge.glb`]: 1.2,
  [`${PACK.nature}/crops_wheatStageB.glb`]: 0.8,
  [`${PACK.nature}/stump_oldTall.glb`]: 1.4,
  [`${PACK.survival}/workbench.glb`]: 0.9,
};
/** Clips the animated models must contain. */
const MODEL_ANIMATION: Record<string, string> = {
  [`${PACK.pets}/animal-parrot.glb`]: 'idle',
  [`${PACK.pets}/animal-beaver.glb`]: 'idle',
  [`${PACK.pets}/animal-caterpillar.glb`]: 'idle',
  [`${PACK.pets}/animal-elephant.glb`]: 'idle',
};

export function riverCenter(x: number): number {
  return 50 + 6 * Math.sin(x / 14) + 2.5 * Math.sin(x / 6.3 + 1.3);
}

export function riverHalfWidth(x: number): number {
  return 2.3 + 0.8 * Math.sin(x / 9);
}

interface Clearing {
  x: number;
  z: number;
  radius: number;
}

const smoothstep = (e0: number, e1: number, v: number): number => {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export async function generateForest(): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  const id = (name: string): number => {
    const block = table.blocks.find((b) => b.name === name);
    if (!block) throw new Error(`block ${name} missing from content/blocks.json`);
    return block.id;
  };
  const B = {
    grass: id('grass'), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'),
    planks: id('planks'), path: id('path'), water: id('water'), rock: id('rock-moss'), birch: id('birch-log'),
    autumn: id('leaves-autumn'), bed: id('riverbed'),
  };
  const scales = await modelScales(MODEL_HEIGHT, MODEL_ANIMATION);
  const scaleOf = (model: string): number => scales.get(model) ?? 1;

  const seed = hashSeed(SEED_TEXT);
  const rng = createRng(seed);
  const world = new VoxelWorld(CHUNKS);
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
  ];
  const route: Point[] = [
    [spawn.x, spawn.z],
    [parrot.x - 3, parrot.z - 3],
    [36, bridgeZ0 - 6],
    [bridgeX, bridgeZ0 - 2],
    [bridgeX, bridgeZ1 + 2],
    [52, 62],
    [62, 70],
    [ancient.x - 6, ancient.z - 6],
  ];

  // 1. Height field.
  const heights: number[][] = [];
  for (let x = 0; x < sx; x++) {
    heights[x] = [];
    for (let z = 0; z < sz; z++) {
      let h = 12 + fbm(seed, x / 26, z / 26) * 3.5;
      const edge = Math.min(x, z, sx - 1 - x, sz - 1 - z);
      if (edge < 9) h += (9 - edge) * 1.1; // rim hills keep the player inside the chapter
      for (const c of clearings) {
        const k = smoothstep(c.radius, c.radius + 5, Math.hypot(x - c.x, z - c.z));
        h = 12 * (1 - k) + h * k;
      }
      const pathDist = distanceToPath(route, x, z);
      h = h * smoothstep(1, 5, pathDist) + Math.min(h, 13) * (1 - smoothstep(1, 5, pathDist));
      const dr = Math.abs(z - riverCenter(x));
      const hw = riverHalfWidth(x);
      if (dr < hw + 4) h = WATER_LEVEL + 1 + (h - WATER_LEVEL - 1) * smoothstep(hw + 1, hw + 4, dr);
      if (x >= bridgeX - 1 && x <= bridgeX + 1 && dr >= hw && dr < hw + 6) h = Math.max(h, deckY - 1);
      (heights[x] as number[])[z] = Math.round(Math.min(h, sy - 12));
    }
  }
  const surface = (x: number, z: number): number => heights[x]?.[z] ?? 0;

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
      for (let y = 0; y <= h; y++) {
        const idHere = y < h - 3 ? B.stone : y < h ? (beach ? B.sand : B.dirt) : beach ? B.sand : B.grass;
        world.set(x, y, z, idHere);
      }
    }
  }

  // 3. Stone path on the surface (bridge deck replaces it over the water).
  const pathCells = pathColumns(route, 1.3);
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
  placeAncientTree(world, ancient.x, ancientBase, ancient.z, { log: B.log, leaves: B.leaves }, rng);

  // 6. Scattered trees (jittered grid, rejecting path, stream, clearings and rim).
  const occupied: Array<[number, number]> = [];
  for (let gx = 4; gx < sx - 4; gx += 7) {
    for (let gz = 4; gz < sz - 4; gz += 7) {
      const x = Math.round(gx + (rng() - 0.5) * 5);
      const z = Math.round(gz + (rng() - 0.5) * 5);
      if (x < 3 || z < 3 || x >= sx - 3 || z >= sz - 3) continue;
      if (distanceToPath(route, x, z) < 3.5) continue;
      if (Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 3) continue;
      if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius + 1)) continue;
      if (rng() < 0.18) continue;
      const roll = rng();
      const blocks = roll < 0.15 ? { log: B.birch, leaves: B.leaves } : roll < 0.3 ? { log: B.log, leaves: B.autumn } : { log: B.log, leaves: B.leaves };
      placeTree(world, x, surface(x, z) + 1, z, 4 + Math.floor(rng() * 3), blocks, rng);
      occupied.push([x, z]);
    }
  }

  // 7. Mossy boulders.
  for (let i = 0; i < 14; i++) {
    const x = 6 + Math.floor(rng() * (sx - 12));
    const z = 6 + Math.floor(rng() * (sz - 12));
    if (distanceToPath(route, x, z) < 3 || Math.abs(z - riverCenter(x)) < riverHalfWidth(x) + 1) continue;
    const y = surface(x, z) + 1;
    world.set(x, y, z, B.rock);
    if (rng() < 0.5 && x + 1 < sx) world.set(x + 1, surface(x + 1, z) + 1, z, B.rock);
    if (rng() < 0.3) world.set(x, y + 1, z, B.rock);
  }

  // 8. Entities.
  // First air cell above the terrain surface (not the tree-top: canopies overhang the ground).
  const standY = (x: number, z: number): number => {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    let y = surface(bx, bz) + 1;
    while (y < sy && world.get(bx, y, bz) !== 0) y++;
    return y;
  };
  const props: WorldEntities['props'] = [];
  const addProp = (model: string, x: number, z: number, yaw = 0, chapter?: number): void => {
    props.push({ model, position: [x + 0.5, standY(x, z), z + 0.5], yaw, scale: scaleOf(model), ...(chapter ? { chapter } : {}) });
  };
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
    props.push({ model: `${PACK.nature}/lily_large.glb`, position: [x + 0.5, WATER_LEVEL + 1.02, z + 0.5], yaw: i * 70, scale: scaleOf(`${PACK.nature}/lily_large.glb`) });
  }

  const place = (x: number, z: number): [number, number, number] => [x + 0.5, standY(x, z), z + 0.5];
  const modelled = (model: string) => ({ model, scale: scaleOf(model) });
  const animated = (model: string) => ({ ...modelled(model), animation: MODEL_ANIMATION[model] ?? 'idle' });
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

  interactables.push(...chapter2Preview());

  /**
   * Temporary: the places of the two Tiếng Việt week 1 quests (Bài 1 at the forest gate, Bài 2 around
   * the calendar-leaf oak north of the stream), so their review copies are walked to, not jumped to,
   * before the chapter maps exist. They move to their own chapter map when it is built. Each spot is
   * the nearest open grass to its anchor, found after the terrain and trees are laid, so the rest of
   * the map (and chunks.bin) stays exactly as it was. Everything here is tagged chapter 2, so playing
   * chapter 1 neither draws nor meets it.
   */
  function chapter2Preview(): WorldEntities['interactables'] {
    const CHAPTER = 2;
    const prop = (model: string, x: number, z: number, yaw = 0): void => addProp(model, x, z, yaw, CHAPTER);
    const taken: Array<[number, number]> = interactables.map((t) => [t.position[0] ?? 0, t.position[2] ?? 0]);
    const open = (x: number, z: number): boolean => {
      if (x < 10 || z < 10 || x >= sx - 10 || z >= sz - 10 || pathCells.has(`${x},${z}`)) return false;
      if (world.get(x, surface(x, z), z) !== B.grass) return false;
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        for (let y = surface(x + dx, z + dz) + 1; y <= surface(x + dx, z + dz) + 5; y++) if (world.get(x + dx, y, z + dz) !== 0) return false;
      }
      return taken.every(([tx, tz]) => Math.hypot(tx - (x + 0.5), tz - (z + 0.5)) >= 3);
    };
    const spot = (x: number, z: number): { x: number; z: number } => {
      for (let r = 0; r <= 6; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dz = -r; dz <= r; dz++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !open(x + dx, z + dz)) continue;
            taken.push([x + dx + 0.5, z + dz + 0.5]);
            return { x: x + dx, z: z + dz };
          }
        }
      }
      throw new Error(`no open ground near ${x},${z} for a chapter 2 stand-in`);
    };
    const npc = (id: string, name: string, model: string, at: { x: number; z: number }, yaw: number) => ({
      id, kind: 'npc' as const, name, label: 'Nói chuyện', position: place(at.x, at.z), yaw, radius: 3, ...animated(model), chapter: CHAPTER,
    });
    const thing = (id: string, name: string, label: string, at: { x: number; z: number }, look: { model: string } | { shape: 'letter' }) => ({
      id, kind: 'object' as const, name, label, position: place(at.x, at.z), yaw: 0, radius: 2, chapter: CHAPTER,
      ...('model' in look ? modelled(look.model) : look),
    });

    // Bài 1 — cổng rừng: Sâu Xanh by the stone gate, the class board a few steps away.
    const sauXanh = spot(ancient.x + 10, ancient.z + 6);
    const bangGo = spot(ancient.x + 12, ancient.z);
    // Bài 2 — the oak hung with calendar leaves, Voi Bảo beside it, the three places the leaves blew to.
    const oak = spot(50, 20);
    prop(`${PACK.nature}/tree_oak.glb`, oak.x, oak.z, 30);
    const gocCay = spot(oak.x + 2, oak.z + 1);
    const voiBao = spot(oak.x + 3, oak.z + 4);
    const bush = spot(42, 25);
    prop(`${PACK.nature}/plant_bushLarge.glb`, bush.x, bush.z, 10);
    for (const [dx, dz] of [[1, 0], [0, 1]] as const) prop(`${PACK.nature}/flower_redA.glb`, bush.x + dx, bush.z + dz, dx * 90);
    const field = spot(57, 14);
    for (let i = 0; i < 6; i++) prop(`${PACK.nature}/crops_wheatStageB.glb`, field.x + (i % 3), field.z - 2 + Math.floor(i / 3), 0);
    const desk = spot(56, 25);
    prop(`${PACK.survival}/workbench.glb`, desk.x, desk.z, 180);
    const stump = spot(desk.x + 3, desk.z + 2);
    return [
      npc('sau-xanh', 'Sâu Xanh', `${PACK.pets}/animal-caterpillar.glb`, sauXanh, 200),
      thing('bang-go-lop-hai', 'Bảng gỗ lớp Hai', 'Đọc bảng', bangGo, { model: `${PACK.survival}/signpost.glb` }),
      thing('goc-cay-lich-la', 'Gốc cây lịch lá', 'Xem tờ lịch', gocCay, { shape: 'letter' }),
      npc('voi-bao', 'Voi Bảo', `${PACK.pets}/animal-elephant.glb`, voiBao, 220),
      thing('tv2-t01-to-lich-bui-hong', 'Tờ lịch ở bụi hồng', 'Nhặt tờ lịch', spot(bush.x, bush.z + 2), { shape: 'letter' }),
      thing('tv2-t01-to-lich-ruong-lua', 'Tờ lịch ở ruộng lúa', 'Nhặt tờ lịch', spot(field.x + 1, field.z + 1), { shape: 'letter' }),
      thing('tv2-t01-to-lich-ban-hoc', 'Tờ lịch trên bàn học', 'Nhặt tờ lịch', spot(desk.x, desk.z + 1), { shape: 'letter' }),
      thing('tv2-t01-bang-chu-cai', 'Bảng chữ cái', 'Xem bảng', spot(field.x + 4, field.z), { model: `${PACK.survival}/signpost.glb` }),
      thing('tv2-t01-hoc-cay', 'Hốc cây', 'Nhìn vào hốc cây', stump, { model: `${PACK.nature}/stump_oldTall.glb` }),
    ];
  }

  const entities: WorldEntities = {
    version: 2,
    id: MAP_ID,
    seed,
    size: [sx, sy, sz],
    waterLevel: WATER_LEVEL,
    spawn: { position: [spawn.x + 0.5, standY(spawn.x, spawn.z), spawn.z + 0.5], yaw: 45 },
    interactables,
    props,
    landmarks: [
      { id: 'ancient-tree', name: 'Cây cổ thụ', position: [ancient.x + 0.5, ancientBase, ancient.z + 0.5] },
      { id: 'bridge', name: 'Cầu gỗ', position: [bridgeX + 0.5, deckY + 1, (bridgeZ0 + bridgeZ1) / 2] },
      { id: 'stepping-stones', name: 'Đá qua suối', position: [stonesX + 0.5, WATER_LEVEL + 2, (stonesZ0 + stonesZ1) / 2 + 0.5] },
      { id: 'chest', name: 'Rương', position: place(ancient.x - 5, ancient.z + 3) },
    ],
  };
  return { world, entities };
}

async function main(): Promise<void> {
  const { world, entities } = await generateForest();
  const bin = encodeWorld(world);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'chunks.bin'), bin);
  await writeFile(path.join(OUT_DIR, 'entities.json'), `${JSON.stringify(entities, null, 2)}\n`);
  const solid = world.data.reduce((n, id) => n + (id === 0 ? 0 : 1), 0);
  console.log(
    `${MAP_ID}: ${world.size.join('x')} blocks, ${solid} non-air, chunks.bin ${bin.byteLength} bytes, ` +
      `${entities.props.length} props, ${entities.interactables.length} interactables`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

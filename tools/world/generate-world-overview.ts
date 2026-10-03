// Generates the world overview (mock M1.1 / M1.4) from a fixed seed: one floating island per region of
// content/world/regions.json, each with its landmark — Trung tâm in the middle (the hub, where the children
// meet: its square with the cat fountain and a ring of glowing portals), the school with its flag, the
// forest and its ancient tree, the library, the castle, the snowy mountain, the child's house, the village, the
// hamlet, the market, the farm and the far-off mystery island — joined by plank sky bridges. It is only
// rendered into the Home / world-map image (`pnpm assets:home`), never played. Each region gets a landmark where its label goes; the label's place
// on the image comes from the shared camera (packages/voxel/src/world-overview.ts) and is written into
// content/world/regions.json.
// Output: assets/generated/world/the-gioi/{regions/, horizon.bin, entities.json, stage-decor.json}
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { WORLD_OVERVIEW_MAP, projectToImage, type Vec3 } from '../../packages/voxel/src/world-overview';
import { RegionCatalog } from '../../packages/schema/src/region';
import { ASSETS_DIR, REPO_ROOT, readJson } from '../assets/asset-lib';
import { writeMap } from './map-kit';
import { catalogModels } from './model-catalog';
import { modelScales } from './model-scales';
import { createRng, hashSeed } from './noise';
import { placeCastle, placeHouse, placeMountain, placeSkyBridge } from './structures/buildings';
import { placeCatStatue, placeFountain, placeStall, placeWindmill } from './structures/countryside';
import { placeFloatingIsland } from './structures/floating-island';
import { placeAncientTree, placeTree } from './structures/tree';

export const MAP_ID = WORLD_OVERVIEW_MAP;
export const SEED_TEXT = 'miu-the-gioi';
const CHUNKS = [8, 3, 8] as const; // 128 x 48 x 128 blocks
const OUT_DIR = path.join(ASSETS_DIR, 'generated/world', MAP_ID);
/** Next to the map (only `pnpm world:overview` writes this folder); the web app bundles it at build time. */
const DECOR_PATH = path.join(OUT_DIR, 'stage-decor.json');

const PACK = {
  castle: 'packs/kenney-castle-kit/2.0',
  nature: 'packs/kenney-nature-kit/2.1',
  survival: 'packs/kenney-survival-kit/2.0',
};
/** Sizes of the island's own for the far view of the Home picture (content/world/models.json has the usual ones). */
const OVERVIEW_SIZES: Record<string, number> = {
  [`${PACK.nature}/tree_pineTallA.glb`]: 5,
  [`${PACK.nature}/tree_pineRoundC.glb`]: 3.5,
  [`${PACK.nature}/mushroom_redGroup.glb`]: 0.9,
  [`${PACK.nature}/flower_redA.glb`]: 0.6,
  [`${PACK.nature}/flower_yellowB.glb`]: 0.6,
  [`${PACK.nature}/flower_purpleA.glb`]: 0.6,
};

/**
 * Islands placed on screen first — `across` runs left (−) to right (+), `away` from the camera (0) to the
 * back (256) — because the camera looks from the −x/−z corner: x = (away − across) / 2, z = (away + across) / 2.
 */
const ISLANDS = [
  // Trung tâm is the hub in the middle (owner, 02/10/2026: shown in the middle of the map screen, where the
  // children meet online); the theme maps round it.
  // Their labels fall on a grid of three columns about a third of the island apart and rows a fifth of its
  // height apart, so no card covers another on a phone or an iPad; `lift` raises a label above its island
  // (over a roof, at the snowy peak) where the diamond-shaped world has no room further out.
  { region: 'trung-tam', across: 0, away: 146, radius: 16, top: 23, depth: 16, lift: 0 },
  { region: 'khu-rung-bi-mat', across: 68, away: 134, radius: 14, top: 24, depth: 16, lift: 2 },
  { region: 'cho-phien', across: 0, away: 102, radius: 9, top: 15, depth: 10, lift: 0 },
  { region: 'lau-dai', across: 5, away: 213, radius: 12, top: 27, depth: 14, lift: 0 },
  { region: 'thu-vien', across: -56, away: 154, radius: 10, top: 28, depth: 12, lift: 13 },
  { region: 'xom-mai-am', across: -65, away: 119, radius: 9, top: 23, depth: 10, lift: 6 },
  { region: 'lang-ven-song', across: -59, away: 85, radius: 9, top: 18, depth: 10, lift: 4 },
  { region: 'nong-trai', across: 56, away: 76, radius: 9, top: 24, depth: 10, lift: 2 },
  { region: 'nui-tuyet', across: 66, away: 160, radius: 8, top: 22, depth: 10, lift: 16 },
  { region: 'nha-cua-be', across: 12, away: 38, radius: 8, top: 19, depth: 10, lift: 5 },
  { region: 'dao-bi-an', across: 57, away: 66, radius: 6, top: 15, depth: 8, lift: -7 },
  // The school mirrors the mystery island on the near left: the one place of the label grid left free.
  { region: 'truong-hoc', across: -33, away: 55, radius: 7, top: 15, depth: 9, lift: 0 },
].map((island) => ({ ...island, x: Math.round((island.away - island.across) / 2), z: Math.round((island.away + island.across) / 2) }));

/** Things on the overview the Home stage animates on top of the render: each waterfall's top and foot (world blocks). */
export interface OverviewDecor {
  waterfalls: Array<{ top: Vec3; bottom: Vec3 }>;
}

export async function generateWorldOverview(): Promise<{ world: VoxelWorld; entities: WorldEntities; decor: OverviewDecor }> {
  const decor: OverviewDecor = { waterfalls: [] };
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  const { regions } = await readJson(path.join(REPO_ROOT, 'content/world/regions.json'), RegionCatalog);
  const missing = regions.filter((r) => !ISLANDS.some((i) => i.region === r.id)).map((r) => r.id);
  if (missing.length > 0) throw new Error(`no island for region(s) ${missing.join(', ')}`);
  const id = (name: string): number => {
    const block = table.blocks.find((b) => b.name === name);
    if (!block) throw new Error(`block ${name} missing from content/blocks.json`);
    return block.id;
  };
  const B = {
    grass: id('grass'), dirt: id('dirt'), stone: id('stone'), sand: id('sand'), log: id('log'), leaves: id('leaves'), planks: id('planks'),
    path: id('path'), water: id('water'), moss: id('rock-moss'), autumn: id('leaves-autumn'), birch: id('birch-log'),
    snow: id('snow'), brickRed: id('brick-red'), brickGrey: id('brick-grey'), woodRed: id('wood-red'),
    cobble: id('cobble'), lantern: id('lantern'), crystal: id('crystal'), sandIsland: id('grass-island'), roofBlue: id('roof-blue'),
  };
  const { heights } = await catalogModels(OVERVIEW_SIZES);
  const scales = await modelScales(heights, {});
  const seed = hashSeed(SEED_TEXT);
  const rng = createRng(seed);
  const world = new VoxelWorld(CHUNKS);
  const [sx, sy, sz] = world.size;

  const props: WorldEntities['props'] = [];
  const addProp = (model: string, x: number, y: number, z: number, yaw = 0): void => {
    props.push({ model, position: [x + 0.5, y, z + 0.5], yaw, scale: scales.get(model) ?? 1 });
  };
  const island = (region: string) => {
    const found = ISLANDS.find((i) => i.region === region);
    if (!found) throw new Error(`no island for ${region}`);
    return found;
  };

  const tops = new Map<string, (x: number, z: number) => boolean>();
  for (const spec of ISLANDS) {
    const surface = spec.region === 'nui-tuyet' ? B.snow : spec.region === 'dao-bi-an' ? B.sandIsland : B.grass;
    tops.set(spec.region, placeFloatingIsland(world, { ...spec, seed: seed + spec.x * 31 + spec.z }, { surface, dirt: B.dirt, stone: B.stone }));
  }
  const onIsland = (x: number, z: number): boolean => [...tops.values()].some((inside) => inside(x, z));

  // Khu rừng bí mật: the ancient tree, a ring of green and autumn trees, a stone path to the near edge,
  // and a pond spilling off the island's left side as a waterfall.
  const forest = island('khu-rung-bi-mat');
  const insideForest = tops.get(forest.region) ?? (() => false);
  placeAncientTree(world, forest.x, forest.top + 1, forest.z, { log: B.log, leaves: B.leaves }, rng);
  for (let t = 0; t <= 1; t += 0.05) {
    const x = Math.round(forest.x - 16 * t);
    const z = Math.round(forest.z - 16 * t);
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]] as const) if (insideForest(x + dx, z + dz)) world.set(x + dx, forest.top, z + dz, B.path);
  }
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2;
    const r = 8 + rng() * (forest.radius - 10);
    const x = Math.round(forest.x + Math.cos(a) * r);
    const z = Math.round(forest.z + Math.sin(a) * r);
    if (!insideForest(x, z) || world.get(x, forest.top, z) !== B.grass || world.get(x, forest.top + 1, z) !== 0) continue;
    if (Math.abs(x - z - (forest.x - forest.z)) < 3 && x < forest.x) continue; // keep the path clear
    placeTree(world, x, forest.top + 1, z, 3 + Math.floor(rng() * 3), { log: rng() < 0.2 ? B.birch : B.log, leaves: rng() < 0.3 ? B.autumn : B.leaves }, rng);
  }
  {
    // Pond on the +x/−z rim (screen left), then water falling off the edge.
    let edge = 0;
    while (insideForest(forest.x + 6 + edge, forest.z - 6 - edge)) edge++;
    const px = forest.x + 6 + edge - 3;
    const pz = forest.z - 6 - edge + 3;
    for (let dx = -2; dx <= 1; dx++) for (let dz = -1; dz <= 2; dz++) if (insideForest(px + dx, pz + dz)) world.set(px + dx, forest.top, pz + dz, B.water);
    for (let y = forest.top; y >= forest.top - 16; y--) for (const [dx, dz] of [[2, -2], [3, -3], [2, -3]] as const) if (world.get(px + dx, y, pz + dz) === 0) world.set(px + dx, y, pz + dz, B.water);
    decor.waterfalls.push({ top: [px + 3, forest.top + 1, pz - 2], bottom: [px + 3, forest.top - 16, pz - 2] });
  }
  addProp(`${PACK.survival}/tent.glb`, forest.x - 9, forest.top + 1, forest.z + 4, 40);

  // Trung tâm: a round stone square, the fountain with the white cat in the middle, and a ring of portal
  // arches glowing in their maps' colours round it.
  const hub = island('trung-tam');
  const insideHub = tops.get(hub.region) ?? (() => false);
  for (let x = hub.x - 11; x <= hub.x + 11; x++) {
    for (let z = hub.z - 11; z <= hub.z + 11; z++) if (Math.hypot(x - hub.x, z - hub.z) <= 11 && insideHub(x, z)) world.set(x, hub.top, z, B.cobble);
  }
  const { plinth } = placeFountain(world, hub.x, hub.z, hub.top + 1, { stone: B.cobble, water: B.water });
  placeCatStatue(world, Math.floor(plinth[0]), plinth[1], Math.floor(plinth[2]), { stone: B.snow, eye: B.log });
  const PORTAL_GLOW = [B.crystal, B.lantern, B.leaves, B.brickRed, B.roofBlue];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const [px, pz] = [Math.round(hub.x + Math.cos(a) * 9), Math.round(hub.z + Math.sin(a) * 9)];
    // An arch across the ring's tangent: two stone posts, a lintel, its pane glowing between them.
    const [tx, tz] = [Math.round(-Math.sin(a)), Math.round(Math.cos(a))];
    for (let y = hub.top + 1; y <= hub.top + 4; y++) {
      world.set(px - tx, y, pz - tz, B.brickGrey);
      world.set(px + tx, y, pz + tz, B.brickGrey);
      if (y <= hub.top + 3) world.set(px, y, pz, PORTAL_GLOW[i % PORTAL_GLOW.length] ?? B.crystal);
    }
    world.set(px, hub.top + 4, pz, B.brickGrey);
  }

  // Trường học: the school house with a red roof, a stone yard and the flagpole.
  const school = island('truong-hoc');
  placeHouse(world, school.x - 3, school.z - 1, 7, 5, 4, school.top + 1, { wall: B.planks, roof: B.brickRed, trim: B.log });
  for (let x = school.x - 4; x <= school.x + 4; x++) for (let z = school.z - 5; z <= school.z - 2; z++) if (tops.get(school.region)?.(x, z)) world.set(x, school.top, z, B.path);
  for (let y = school.top + 1; y <= school.top + 8; y++) world.set(school.x + 4, y, school.z - 4, B.birch);
  addProp(`${PACK.castle}/flag.glb`, school.x + 4, school.top + 9, school.z - 4, 90);

  // Thư viện: grey stone walls, a wooden roof and white columns along the front.
  const library = island('thu-vien');
  placeHouse(world, library.x - 4, library.z - 2, 8, 6, 5, library.top + 1, { wall: B.brickGrey, roof: B.woodRed, trim: B.birch });
  for (let x = library.x - 4; x <= library.x + 3; x += 2) for (let y = library.top + 1; y <= library.top + 4; y++) world.set(x, y, library.z - 4, B.birch);
  for (let x = library.x - 5; x <= library.x + 4; x++) world.set(x, library.top + 5, library.z - 4, B.brickGrey);

  // Lâu đài: walls, four towers and the keep, pennants on top.
  const castle = island('lau-dai');
  const { keepTop } = placeCastle(world, castle.x, castle.z, 6, castle.top + 1, { wall: B.brickGrey, roof: B.brickRed, trim: B.woodRed });
  addProp(`${PACK.castle}/flag-pennant.glb`, castle.x, keepTop + 1, castle.z + 1);
  for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]] as const) addProp(`${PACK.castle}/flag-pennant.glb`, castle.x + dx, castle.top + 1 + 5 + 5 + 3, castle.z + dz, 45);

  // Núi tuyết: a snowy peak with pines round its foot.
  const mountain = island('nui-tuyet');
  placeMountain(world, mountain.x + 1, mountain.z + 1, 9, mountain.top, sy - 3, mountain.top + 10, { stone: B.stone, snow: B.snow }, rng);
  for (const [dx, dz] of [[-8, -3], [-6, -7], [-2, -9], [-9, 2], [4, -8]] as const) {
    if (tops.get(mountain.region)?.(mountain.x + dx, mountain.z + dz)) addProp(`${PACK.nature}/tree_pineTallA.glb`, mountain.x + dx, mountain.top + 1, mountain.z + dz, dx * 13);
  }

  // Nhà của bé: a small red-roofed house, a fence and flowers.
  const home = island('nha-cua-be');
  placeHouse(world, home.x - 3, home.z - 1, 6, 5, 3, home.top + 1, { wall: B.planks, roof: B.brickRed, trim: B.birch });
  for (let x = home.x - 4; x <= home.x + 4; x += 2) addProp(`${PACK.nature}/fence_simple.glb`, x, home.top + 1, home.z - 5);
  ['flower_redA', 'flower_yellowB', 'flower_purpleA', 'flower_redA'].forEach((f, i) => addProp(`${PACK.nature}/${f}.glb`, home.x - 3 + i * 2, home.top + 1, home.z - 3));
  addProp(`${PACK.nature}/plant_bushLarge.glb`, home.x + 4, home.top + 1, home.z + 1);

  // Đảo bí ẩn: mossy rocks and giant mushrooms, far off and low.
  const mystery = island('dao-bi-an');
  addProp(`${PACK.nature}/rock_tallA.glb`, mystery.x, mystery.top + 1, mystery.z + 1);
  addProp(`${PACK.nature}/rock_tallF.glb`, mystery.x - 3, mystery.top + 1, mystery.z - 2, 60);
  addProp(`${PACK.nature}/mushroom_redTall.glb`, mystery.x + 3, mystery.top + 1, mystery.z - 2);
  addProp(`${PACK.nature}/mushroom_redGroup.glb`, mystery.x - 1, mystery.top + 1, mystery.z - 4);
  addProp(`${PACK.nature}/tree_pineRoundC.glb`, mystery.x + 2, mystery.top + 1, mystery.z + 3);

  // Làng Ven Sông: two tiled-roof cottages by a pond. Xóm Mái Ấm: a row of three cottages.
  const village = island('lang-ven-song');
  for (const dx of [-5, 1]) placeHouse(world, village.x + dx, village.z - 1, 5, 4, 3, village.top + 1, { wall: B.sand, roof: B.brickRed, trim: B.log });
  for (let dx = -2; dx <= 2; dx++) for (let dz = -6; dz <= -4; dz++) if (tops.get(village.region)?.(village.x + dx, village.z + dz)) world.set(village.x + dx, village.top, village.z + dz, B.water);
  const hamlet = island('xom-mai-am');
  for (const [i, dx] of [-6, -1, 4].entries()) placeHouse(world, hamlet.x + dx, hamlet.z - 2, 4, 4, 3, hamlet.top + 1, { wall: i === 1 ? B.planks : B.sand, roof: i === 2 ? B.woodRed : B.brickRed, trim: B.log });
  // Chợ phiên: three stalls under striped awnings. Nông trại: the windmill beside a fenced field.
  const market = island('cho-phien');
  for (const [i, dx] of [-6, -1, 4].entries()) placeStall(world, market.x + dx, market.z - 2, 4, 3, market.top + 1, { log: B.log, planks: B.planks, stripes: [i === 1 ? B.woodRed : B.brickRed, B.snow] });
  const farm = island('nong-trai');
  placeWindmill(world, farm.x - 2, farm.z + 1, farm.top + 1, { planks: B.planks, log: B.log, roof: B.brickRed, sail: B.snow }, 5);
  for (let x = farm.x + 2; x <= farm.x + 6; x += 2) addProp(`${PACK.nature}/fence_simple.glb`, x, farm.top + 1, farm.z - 4);

  // Sky bridges from the hub's rim (Trung tâm) to every theme map's island.
  const rim = (to: (typeof ISLANDS)[number]): [number, number, number] => {
    const dx = to.x - hub.x;
    const dz = to.z - hub.z;
    const len = Math.hypot(dx, dz);
    let r = 0;
    while (insideHub(Math.round(hub.x + (dx / len) * (r + 1)), Math.round(hub.z + (dz / len) * (r + 1)))) r++;
    return [hub.x + (dx / len) * (r - 1), hub.top, hub.z + (dz / len) * (r - 1)];
  };
  const shore = (to: (typeof ISLANDS)[number]): [number, number, number] => {
    const dx = hub.x - to.x;
    const dz = hub.z - to.z;
    const len = Math.hypot(dx, dz);
    const inside = tops.get(to.region) ?? (() => false);
    let r = 0;
    while (inside(Math.round(to.x + (dx / len) * (r + 1)), Math.round(to.z + (dz / len) * (r + 1)))) r++;
    return [to.x + (dx / len) * (r - 1), to.top, to.z + (dz / len) * (r - 1)];
  };
  for (const region of ISLANDS.map((i) => i.region).filter((r) => r !== hub.region)) {
    const to = island(region);
    placeSkyBridge(world, rim(to), shore(to), { planks: B.planks, log: B.log }, onIsland);
  }

  // Labels hang at each island's near rim, just under its top, like the mock's captions: they leave the
  // landmark on top in view.
  const anchor = (spec: (typeof ISLANDS)[number]): Vec3 => [spec.x - spec.radius * 0.6 + 0.5, spec.top - 3 + spec.lift, spec.z - spec.radius * 0.6 + 0.5];
  const entities: WorldEntities = {
    version: 2,
    id: MAP_ID,
    seed,
    size: [sx, sy, sz],
    waterLevel: 0,
    spawn: { position: [forest.x - 4 + 0.5, forest.top + 1, forest.z - 4 + 0.5], yaw: 0 },
    interactables: [],
    props,
    landmarks: ISLANDS.map((spec) => ({ id: spec.region, name: regions.find((r) => r.id === spec.region)?.name ?? spec.region, position: [...anchor(spec)] as [number, number, number] })),
  };
  return { world, entities, decor };
}

/** Where the Home stage draws its moving water, in percent of the rendered image (assets/generated/world/the-gioi/stage-decor.json). */
export function stageDecor(decor: OverviewDecor): { waterfalls: Array<{ x: number; top: number; bottom: number }> } {
  const round = (n: number): number => Math.round(n * 10) / 10;
  return {
    waterfalls: decor.waterfalls.map(({ top, bottom }) => {
      const a = projectToImage(top);
      const b = projectToImage(bottom);
      return { x: round((a.x + b.x) / 2), top: round(a.y), bottom: round(b.y) };
    }),
  };
}

/** Each region's label position on the rendered image, in percent (what content/world/regions.json must hold). */
export function regionHotspots(entities: WorldEntities): Record<string, { x: number; y: number }> {
  return Object.fromEntries(
    entities.landmarks.map((lm) => {
      const p = projectToImage(lm.position);
      return [lm.id, { x: Math.round(p.x), y: Math.round(p.y) }];
    }),
  );
}

/** Rewrites only the `hotspot` numbers in content/world/regions.json, keeping its one-line-per-region layout. */
export function withHotspots(regionsJson: string, hotspots: Record<string, { x: number; y: number }>): string {
  let out = regionsJson;
  for (const [id, { x, y }] of Object.entries(hotspots)) {
    // A region may span several lines (a backdrop, events): search on from its id to its own hotspot.
    const line = new RegExp(`("id": "${id}"[\\s\\S]*?"hotspot": \\{ "x": )\\d+(, "y": )\\d+`);
    if (!line.test(out)) throw new Error(`region ${id}: hotspot not found in regions.json`);
    out = out.replace(line, `$1${x}$2${y}`);
  }
  return out;
}

async function main(): Promise<void> {
  const { world, entities, decor } = await generateWorldOverview();
  await writeMap(world, entities);
  await writeFile(DECOR_PATH, `${JSON.stringify(stageDecor(decor), null, 2)}\n`);
  const regionsPath = path.join(REPO_ROOT, 'content/world/regions.json');
  await writeFile(regionsPath, withHotspots(await readFile(regionsPath, 'utf8'), regionHotspots(entities)));
  console.log('region labels updated in content/world/regions.json');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

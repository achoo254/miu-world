// What every region map generator shares, so a new map is a small file that lays out its scene, its
// places and its buildings: block ids from content/blocks.json, the rolling ground, soil
// columns, scattered trees, standing heights, props and model scales, the quest targets placed from the
// catalogues (place-quest-targets.ts), and writing the map's region files, horizon and entities.json.
// Output of a map: assets/generated/world/<map id>/{regions/r<x>-<z>.bin, horizon.bin, entities.json}
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import { buildHorizon, encodeHorizon, encodeRegions, regionFile } from '../../packages/voxel/src/region-format';
import type { Interactable, WorldEntities } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, REPO_ROOT, readJson } from '../assets/asset-lib';
import { placeQuestTargets, readQuests, targetUses, WALK_GAP, type PlacementMap } from './chapters/place-quest-targets';
import { catalogModels } from './model-catalog';
import { modelCentres, modelScales } from './model-scales';
import { fbm } from './noise';
import { placeTree, treeHeight } from './structures/tree';

type Cell = readonly [number, number];
type Position = [number, number, number];

/** Pack folders the maps place models from (paths under assets/). */
export const PACK = {
  pets: 'packs/kenney-cube-pets/2.0',
  survival: 'packs/kenney-survival-kit/2.0',
  nature: 'packs/kenney-nature-kit/2.1',
  food: 'packs/kenney-food-kit/2.0',
  castle: 'packs/kenney-castle-kit/2.0',
  furniture: 'packs/kenney-furniture-kit/2.0',
  roads: 'packs/kenney-city-kit-roads/2.1',
  suburb: 'packs/kenney-city-kit-suburban/2.0',
  props: 'generated/props',
  box: 'generated/box-props',
} as const;

/** 192 x 48 x 192 blocks (Jev, 01/10/2026: the owner found the maps small): the forest and the school. */
export const MAP_CHUNKS = [12, 3, 12] as const;
/**
 * Side of the wide maps in blocks (owner, 01/10/2026: ten times the area of the 256-block maps, room for many
 * children to explore together later; Jev chose ten times the area over ten times the side).
 */
export const WIDE_MAP_SIDE = 800;

/** A lookup of block ids by name from content/blocks.json; a name the table lacks is an error. */
export async function loadBlocks(): Promise<(name: string) => number> {
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  return (name) => {
    const block = table.blocks.find((b) => b.name === name);
    if (!block) throw new Error(`block ${name} missing from content/blocks.json`);
    return block.id;
  };
}

export const smoothstep = (e0: number, e1: number, v: number): number => {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Ground of rolling hills about `ground` (±`roll`). The map ends in no hills of its own: the outer land
 * (packages/voxel outland-*.ts) carries on from its edge.
 */
export function rollingHeight(seed: number, x: number, z: number, ground: { ground: number; roll: number }): number {
  return ground.ground + fbm(seed, x / 26, z / 26) * ground.roll;
}

/** A height for every column, from a map's own shaping of the ground; `surface` reads it back. */
export function heightField(world: VoxelWorld, height: (x: number, z: number) => number, fallback: number): (x: number, z: number) => number {
  const [sx, , sz] = world.size;
  const heights: number[][] = [];
  for (let x = 0; x < sx; x++) {
    const row: number[] = [];
    for (let z = 0; z < sz; z++) row.push(height(x, z));
    heights.push(row);
  }
  return (x, z) => heights[x]?.[z] ?? fallback;
}

/** A column of soil up to `h`: stone, then three blocks of `under`, `top` on the surface. */
export function fillColumn(world: VoxelWorld, x: number, z: number, h: number, blocks: { stone: number; under: number; top: number }): void {
  for (let y = 0; y <= h; y++) world.set(x, y, z, y < h - 3 ? blocks.stone : y < h ? blocks.under : blocks.top);
}

/**
 * Trees on a jittered 7-block grid, skipping the columns `rejects` refuses and a share `skip` of the rest;
 * `blocks` picks a tree's trunk and leaves from a roll in [0, 1). Returns the trunks' columns.
 */
export function scatterTrees(options: {
  world: VoxelWorld;
  rng: () => number;
  surface: (x: number, z: number) => number;
  rejects: (x: number, z: number) => boolean;
  skip: number;
  blocks: (roll: number) => { log: number; leaves: number };
}): Array<[number, number]> {
  const { world, rng, surface, rejects, skip, blocks } = options;
  const [sx, , sz] = world.size;
  const trunks: Array<[number, number]> = [];
  for (let gx = 4; gx < sx - 4; gx += 7) {
    for (let gz = 4; gz < sz - 4; gz += 7) {
      const x = Math.round(gx + (rng() - 0.5) * 5);
      const z = Math.round(gz + (rng() - 0.5) * 5);
      if (x < 3 || z < 3 || x >= sx - 3 || z >= sz - 3 || rejects(x, z)) continue;
      if (rng() < skip) continue;
      const kind = blocks(rng());
      placeTree(world, x, surface(x, z) + 1, z, treeHeight(rng), kind, rng);
      trunks.push([x, z]);
    }
  }
  return trunks;
}

/** First air cell above the terrain surface at a column (not a tree-top: canopies overhang the ground). */
export function standHeight(world: VoxelWorld, surface: (x: number, z: number) => number): (x: number, z: number) => number {
  const sy = world.size[1];
  return (x, z) => {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    let y = surface(bx, bz) + 1;
    while (y < sy && world.get(bx, y, bz) !== 0) y++;
    return y;
  };
}

/**
 * Props and model looks for one map: every model it places stands at its height in the catalog
 * (content/world/models.json, model-catalog.ts), or at the map's own `sizes` for the few it means as
 * something else; animated models play their catalog clip, corner-pivot models are placed by their middle.
 * Scales are measured from the models, checked against the manifest.
 */
export async function mapModels(options: { standY: (x: number, z: number) => number; sizes?: Readonly<Record<string, number>> }) {
  const { standY } = options;
  const { heights, clips, centred } = await catalogModels(options.sizes);
  const scales = await modelScales(heights, clips);
  const centres = await modelCentres(centred);
  const scaleOf = (model: string): number => {
    const scale = scales.get(model);
    if (scale === undefined) throw new Error(`${model} is not in content/world/models.json: add a line for it`);
    return scale;
  };
  const place = (x: number, z: number): Position => [x + 0.5, standY(x, z), z + 0.5];
  const props: WorldEntities['props'] = [];
  const addPropAt = (model: string, at: readonly [number, number, number], yaw = 0, chapter?: number): void => {
    // `+ 0` turns -0 into 0, so a prop turned by -0 writes the same JSON on every run.
    props.push({ model, position: [at[0], at[1], at[2]], yaw: yaw + 0, scale: scaleOf(model), ...(chapter ? { chapter } : {}) });
  };
  return {
    props,
    scaleOf,
    place,
    /** A prop standing on the ground at a column (shown in every chapter, or only in `chapter`). */
    addProp: (model: string, x: number, z: number, yaw = 0, chapter?: number): void => addPropAt(model, place(x, z), yaw, chapter),
    addPropAt,
    /** A pack model by its middle: its pivot is a corner, so the offset turns with it. */
    addCentred: (model: string, at: readonly [number, number, number], yaw: number): void => {
      const [cx, cz] = centres.get(model) ?? [0, 0];
      const s = scaleOf(model);
      const t = (yaw * Math.PI) / 180;
      const [ox, oz] = [-cx * s, -cz * s];
      addPropAt(model, [at[0] + ox * Math.cos(t) + oz * Math.sin(t), at[1], at[2] - ox * Math.sin(t) + oz * Math.cos(t)], yaw);
    },
    /** Where a model's pivot stands from the spot it is placed by (its middle, for a corner-pivot model), unturned. */
    offsetOf: (model: string): [number, number] => {
      const [cx, cz] = centres.get(model) ?? [0, 0];
      const s = scaleOf(model);
      return [-cx * s + 0, -cz * s + 0];
    },
    /** A piece of a restyled slot (home-decor.ts) at its spot: by its middle, tagged with its slot. */
    addSlotted: (model: string, at: readonly [number, number, number], yaw: number, slot: string): void => {
      const [cx, cz] = centres.get(model) ?? [0, 0];
      const s = scaleOf(model);
      const t = (yaw * Math.PI) / 180;
      const [ox, oz] = [-cx * s, -cz * s];
      props.push({ model, position: [at[0] + ox * Math.cos(t) + oz * Math.sin(t), at[1], at[2] - ox * Math.sin(t) + oz * Math.cos(t)], yaw: yaw + 0, scale: s, slot });
    },
    modelled: (model: string) => ({ model, scale: scaleOf(model) }),
    animated: (model: string) => ({ model, scale: scaleOf(model), animation: clips[model] ?? 'idle' }),
  };
}

/** Block columns of entities (props, interactables): what quest targets keep clear of. */
export const columnsOf = (list: ReadonlyArray<{ position: readonly number[] }>): Cell[] =>
  list.map((e) => [Math.floor(e.position[0] ?? 0), Math.floor(e.position[2] ?? 0)] as const);

/**
 * Places the targets of every quest of `region` on the map (`ownChapter`'s are the map's own, already in
 * `interactables`), and returns the map's interactables: its own ones retagged with every chapter that
 * uses them, then the placed ones. Places that could not keep a walk apart are warned about: the sign
 * that the map is crowded and should grow.
 */
export async function placeRegionTargets(options: {
  mapId: string;
  region: string;
  ownChapter?: number;
  map: PlacementMap;
  interactables: readonly Interactable[];
  seed: number;
}): Promise<Interactable[]> {
  const { mapId, region, ownChapter, map, interactables, seed } = options;
  const { placed, retagged, narrow } = await placeQuestTargets({ uses: targetUses(await readQuests(), region, ownChapter), map, existing: interactables, seed });
  for (const n of narrow) console.warn(`${mapId}: quest ${n.quest} place "${n.place}" only ${n.gap} blocks from its other places (aim ${WALK_GAP})`);
  const retaggedById = new Map(retagged.map((t) => [t.id, t]));
  return [...interactables.map((t) => retaggedById.get(t.id) ?? t), ...placed];
}

/** Where a generated map is written. */
export const mapDir = (mapId: string): string => path.join(ASSETS_DIR, 'generated/world', mapId);

/**
 * entities.json one entry per line (props, targets, villagers, landmarks): a wide map has some fifteen
 * thousand props, so indenting every field would make the file several megabytes; this keeps it readable and
 * diffable at a third of that.
 */
export function entitiesJson(entities: WorldEntities): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(entities)) {
    if (Array.isArray(value) && value.some((v) => typeof v === 'object')) lines.push(`  ${JSON.stringify(key)}: [\n${value.map((v) => `    ${JSON.stringify(v)}`).join(',\n')}\n  ]`);
    else lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  }
  return `{\n${lines.join(',\n')}\n}\n`;
}

/** The files a map is written as (region-format.ts): every region, the horizon, and entities.json. */
export function mapFiles(world: VoxelWorld, entities: WorldEntities): Array<{ file: string; bytes: Uint8Array | string }> {
  return [
    ...encodeRegions(world).map((r) => ({ file: regionFile(r.rx, r.rz), bytes: r.bytes })),
    { file: 'horizon.bin', bytes: encodeHorizon(buildHorizon(world)) },
    { file: 'entities.json', bytes: entitiesJson(entities) },
  ];
}

/** Writes a map's region files, horizon and entities (replacing what was there) and logs its size. */
export async function writeMap(world: VoxelWorld, entities: WorldEntities): Promise<void> {
  const dir = mapDir(entities.id);
  await rm(dir, { recursive: true, force: true });
  await mkdir(path.join(dir, 'regions'), { recursive: true });
  const files = mapFiles(world, entities);
  for (const f of files) await writeFile(path.join(dir, f.file), f.bytes);
  const bytes = files.filter((f) => f.file.startsWith('regions/')).reduce((n, f) => n + f.bytes.length, 0);
  const solid = world.data.reduce((n, id) => n + (id === 0 ? 0 : 1), 0);
  console.log(
    `${entities.id}: ${world.size.join('x')} blocks, ${solid} non-air, ${files.length - 2} regions ${bytes} bytes, ` +
      `${entities.props.length} props, ${entities.interactables.length} interactables, ${entities.ambients?.length ?? 0} ambients`,
  );
}

/** Runs a map generator when its file is the script `tsx` was started with (not when a test imports it). */
export async function runIfMain(moduleUrl: string, generate: () => Promise<{ world: VoxelWorld; entities: WorldEntities }>): Promise<void> {
  if (!process.argv[1] || moduleUrl !== pathToFileURL(process.argv[1]).href) return;
  const { world, entities } = await generate();
  await writeMap(world, entities);
}

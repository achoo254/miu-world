// A region map laid out as one zone per chapter (map-kit.ts has the parts every map shares): level ground
// in each zone, rolling hills between them and at the rim, a path from the spawn to every zone, optional
// water (river, pond, moat) with plank decks wherever a path crosses it, the map's own structures and props
// (its `build`), trees round the rest, and the quest targets of each chapter placed in its zone. A map file
// gives the zones, the water and what to build; this file does the rest the same way for every such map.
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { Interactable, WorldEntities } from '../../packages/voxel/src/world-entities';
import { cellsIn } from './chapters/place-quest-targets';
import { columnsOf, fillColumn, heightField, loadBlocks, mapModels, PACK, placeRegionTargets, rollingHeight, scatterTrees, smoothstep, standHeight, WIDE_MAP_SIDE } from './map-kit';
import { SCENERY_MODELS } from './scenery';
import { createRng, hashSeed } from './noise';
import { distanceToPath, pathColumns, type Point } from './structures/path';

/** A chapter's zone: a rectangle (centre, half sizes) whose ground is level and floored with `floor`. */
export interface Zone {
  chapter: number;
  id: string;
  name: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Block name of the zone's ground (grass if none). */
  floor?: string;
}

export interface Landmark {
  id: string;
  name: string;
  position: [number, number, number];
}

export interface ZoneMapContext {
  world: VoxelWorld;
  /** Block id by name (content/blocks.json). */
  block: (name: string) => number;
  rng: () => number;
  ground: number;
  surface: (x: number, z: number) => number;
  zone: (chapter: number) => Zone;
  inZone: (x: number, z: number, pad?: number) => Zone | undefined;
  onPath: (x: number, z: number) => boolean;
  nearPath: (x: number, z: number, gap: number) => boolean;
  inWater: (x: number, z: number) => boolean;
  /** A prop on the ground at a column, added once every block is down. */
  prop: (model: string, x: number, z: number, yaw?: number) => void;
  /** A prop at a fixed point (on a table, a wall, the water). */
  propAt: (model: string, at: readonly [number, number, number], yaw?: number) => void;
  /** A pack model whose pivot is a corner (furniture, houses), by its middle, on the ground at a column. */
  centred: (model: string, x: number, z: number, yaw: number) => void;
  /** Keeps trees and quest targets out of a rectangle (inclusive): a building's footprint and its doorstep. */
  keepOut: (x0: number, z0: number, x1: number, z1: number) => void;
  landmark: (id: string, name: string, x: number, z: number, y?: number) => void;
}

export interface ZoneMapSpec {
  mapId: string;
  region: string;
  seedText: string;
  /** Side of the map in blocks, a multiple of 16 (default 800: owner, 01/10/2026, ten times the area of 256). */
  size?: number;
  ground?: { ground: number; roll: number; rim: number };
  zones: readonly Zone[];
  spawn: { x: number; z: number; yaw: number };
  /** The map's own landforms (a hill, a slope), from the shaped height of a column (before the water sinks it). */
  shape?: (x: number, z: number, h: number) => number;
  /** Water at `level` over the columns `covers` names (its bed two blocks lower, sand on the banks). */
  water?: { level: number; covers: (x: number, z: number) => boolean };
  /** The map's ways (lanes, bridges, spurs into the zones). */
  routes?: readonly Point[][];
  /** Also a straight way from the spawn to every zone's centre (default); false when `routes` already reach them. */
  pathsFromSpawn?: boolean;
  /** Share of tree spots left empty, and a tree's trunk and leaves from a roll in [0, 1). */
  trees: { skip: number; blocks: (roll: number, block: (name: string) => number) => { log: number; leaves: number } };
  /** Every model the map places with its standing height in blocks; clips of the animated ones; corner-pivot models. */
  models: { heights: Readonly<Record<string, number>>; clips?: Readonly<Record<string, string>>; centred?: readonly string[] };
  build: (ctx: ZoneMapContext) => void;
  /**
   * Small things dotted through every zone so it never reads as an empty lawn (flowers, bushes, stones), about
   * one every `spacing` blocks, clear of the paths and what the map built; quest places still find room.
   */
  dressing?: { models: readonly string[]; spacing: number };
}

const DEFAULT_DRESSING = {
  models: [`${PACK.nature}/flower_redA.glb`, `${PACK.nature}/flower_yellowB.glb`, `${PACK.nature}/flower_purpleA.glb`, `${PACK.nature}/plant_bushLarge.glb`, `${PACK.nature}/grass_large.glb`, `${PACK.nature}/rock_smallA.glb`],
  spacing: 7,
};

const SIGNPOST = `${PACK.survival}/signpost.glb`;
const DRESSING_HEIGHTS: Readonly<Record<string, number>> = { [`${PACK.nature}/grass_large.glb`]: 0.6, [`${PACK.nature}/rock_smallA.glb`]: 0.5 };

export async function generateZoneMap(spec: ZoneMapSpec): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const block = await loadBlocks();
  const seed = hashSeed(spec.seedText);
  const rng = createRng(seed);
  const side = (spec.size ?? WIDE_MAP_SIDE) / 16;
  const world = new VoxelWorld([side, 3, side]);
  const [sx, sy, sz] = world.size;
  const ground = spec.ground ?? { ground: 12, roll: 3, rim: 10 };
  const level = ground.ground;
  const zones = spec.zones;
  const zone = (chapter: number): Zone => {
    const found = zones.find((zn) => zn.chapter === chapter);
    if (!found) throw new Error(`${spec.mapId}: no zone for chapter ${chapter}`);
    return found;
  };
  const inZone = (x: number, z: number, pad = 0): Zone | undefined => zones.find((zn) => Math.abs(x - zn.x) <= zn.hx + pad && Math.abs(z - zn.z) <= zn.hz + pad);
  /** Blocks outside a zone's rectangle (0 inside). */
  const outside = (zn: Zone, x: number, z: number): number => Math.hypot(Math.max(0, Math.abs(x - zn.x) - zn.hx), Math.max(0, Math.abs(z - zn.z) - zn.hz));
  const inWater = (x: number, z: number): boolean => spec.water?.covers(x, z) ?? false;
  const waterNear = (x: number, z: number, r: number): boolean => {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (inWater(x + dx, z + dz)) return true;
    return false;
  };

  // Paths: the map's own ways, and (unless they reach every zone already) the spawn to every zone.
  const fromSpawn = spec.pathsFromSpawn === false ? [] : zones.map((zn): Point[] => [[spec.spawn.x, spec.spawn.z], [zn.x, zn.z]]);
  const routes: Point[][] = [...fromSpawn, ...(spec.routes ?? []).map((r) => [...r])];
  const pathCells = new Set(routes.flatMap((r) => [...pathColumns(r, 1.4)]));
  const onPath = (x: number, z: number): boolean => pathCells.has(`${x},${z}`);
  const nearPath = (x: number, z: number, gap: number): boolean => routes.some((r) => distanceToPath(r, x, z) < gap);

  // 1. Ground: level in the zones and round the spawn, low along the paths, sunk under the water.
  const spawnZone: Zone = { chapter: 0, id: 'spawn', name: '', x: spec.spawn.x, z: spec.spawn.z, hx: 4, hz: 4 };
  const surface = heightField(world, (x, z) => {
    let h = rollingHeight(seed, x, z, world.size, ground);
    for (const zn of [...zones, spawnZone]) {
      const k = smoothstep(0, 6, outside(zn, x, z));
      h = level * (1 - k) + h * k;
    }
    const pathDist = Math.min(...routes.map((r) => distanceToPath(r, x, z)));
    const p = smoothstep(1, 5, pathDist);
    h = h * p + Math.min(h, level + 1) * (1 - p);
    if (spec.shape) h = spec.shape(x, z, h);
    if (spec.water) {
      if (inWater(x, z)) h = spec.water.level - 2;
      else if (waterNear(x, z, 2)) h = Math.min(h, spec.water.level + 1);
    }
    return Math.round(Math.min(h, sy - 16));
  }, level);

  // 2. Soil, zone floors, paths, water.
  const B = { stone: block('stone'), dirt: block('dirt'), grass: block('grass'), sand: block('sand'), path: block('path'), water: block('water'), bed: block('riverbed'), planks: block('planks'), log: block('log') };
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const h = surface(x, z);
      if (spec.water && inWater(x, z)) {
        fillColumn(world, x, z, h, { stone: B.stone, under: B.dirt, top: B.bed });
        for (let y = h + 1; y <= spec.water.level; y++) world.set(x, y, z, B.water);
        continue;
      }
      const zn = inZone(x, z);
      const bank = spec.water !== undefined && waterNear(x, z, 1);
      const top = onPath(x, z) ? B.path : bank ? B.sand : zn?.floor ? block(zn.floor) : B.grass;
      fillColumn(world, x, z, h, { stone: B.stone, under: bank ? B.sand : B.dirt, top });
    }
  }
  // A plank deck wherever a path crosses the water, one block over it, with log posts at its edges.
  if (spec.water) {
    const deckY = spec.water.level + 1;
    for (const cell of pathCells) {
      const [x = 0, z = 0] = cell.split(',').map(Number);
      if (!inWater(x, z)) continue;
      world.set(x, deckY, z, B.planks);
      for (let y = deckY + 1; y <= deckY + 3; y++) world.set(x, y, z, 0);
    }
  }

  // 3. The map's own structures and props.
  const queued: Array<{ kind: 'ground' | 'centred'; model: string; x: number; z: number; yaw: number } | { kind: 'at'; model: string; at: readonly [number, number, number]; yaw: number }> = [];
  const kept: Array<[number, number, number, number]> = [];
  const landmarks: Landmark[] = [];
  const keptOut = (x: number, z: number, pad = 0): boolean => kept.some(([x0, z0, x1, z1]) => x >= x0 - pad && x <= x1 + pad && z >= z0 - pad && z <= z1 + pad);
  spec.build({
    world,
    block,
    rng,
    ground: level,
    surface,
    zone,
    inZone,
    onPath,
    nearPath,
    inWater,
    prop: (model, x, z, yaw = 0) => queued.push({ kind: 'ground', model, x, z, yaw }),
    propAt: (model, at, yaw = 0) => queued.push({ kind: 'at', model, at, yaw }),
    centred: (model, x, z, yaw) => queued.push({ kind: 'centred', model, x, z, yaw }),
    keepOut: (x0, z0, x1, z1) => kept.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]),
    landmark: (id, name, x, z, y) => landmarks.push({ id, name, position: [x + 0.5, y ?? level + 1, z + 0.5] }),
  });

  // 3b. Dress every zone: small things on a jittered grid, clear of paths, water and buildings.
  const dressing = spec.dressing ?? DEFAULT_DRESSING;
  for (const zn of zones) {
    for (let gx = zn.x - zn.hx + 2; gx < zn.x + zn.hx - 1; gx += dressing.spacing) {
      for (let gz = zn.z - zn.hz + 2; gz < zn.z + zn.hz - 1; gz += dressing.spacing) {
        const x = Math.round(gx + (rng() - 0.5) * dressing.spacing * 0.8);
        const z = Math.round(gz + (rng() - 0.5) * dressing.spacing * 0.8);
        const model = dressing.models[Math.floor(rng() * dressing.models.length)];
        if (!model || onPath(x, z) || inWater(x, z) || keptOut(x, z, 1) || world.get(x, surface(x, z) + 1, z) !== 0) continue;
        queued.push({ kind: 'ground', model, x, z, yaw: Math.floor(rng() * 360) });
      }
    }
  }

  // 4. Trees round the zones, the paths, the water and the buildings.
  const trunks = scatterTrees({
    world,
    rng,
    surface,
    rejects: (x, z) => inZone(x, z, 2) !== undefined || nearPath(x, z, 3) || waterNear(x, z, 2) || keptOut(x, z, 2) || Math.hypot(x - spec.spawn.x, z - spec.spawn.z) < 8 || world.get(x, surface(x, z) + 1, z) !== 0,
    skip: spec.trees.skip,
    blocks: (roll) => spec.trees.blocks(roll, block),
  });

  // 5. Props, now that the ground is final.
  const standY = standHeight(world, surface);
  const models = await mapModels({ heights: { [SIGNPOST]: 1.6, ...SCENERY_MODELS, ...DRESSING_HEIGHTS, ...spec.models.heights }, clips: spec.models.clips ?? {}, standY, centred: spec.models.centred });
  for (const q of queued) {
    if (q.kind === 'at') models.addPropAt(q.model, q.at, q.yaw);
    else if (q.kind === 'centred') models.addCentred(q.model, models.place(q.x, q.z), q.yaw);
    else models.addProp(q.model, q.x, q.z, q.yaw);
  }
  // A signpost at the corner of each zone nearest the spawn, naming it.
  for (const zn of zones) {
    const cx = zn.x + Math.sign(spec.spawn.x - zn.x) * (zn.hx - 1);
    const cz = zn.z + Math.sign(spec.spawn.z - zn.z) * (zn.hz - 1);
    models.addProp(SIGNPOST, Math.round(cx), Math.round(cz), 45);
  }

  // 6. Quest targets: each chapter's in its zone, on level open ground off the paths, clear of props, trees and buildings.
  const propCells = columnsOf(models.props);
  const canStand = (x: number, z: number): boolean => {
    if (!inZone(x, z) || onPath(x, z) || inWater(x, z) || keptOut(x, z, 1)) return false;
    const y = surface(x, z);
    if (Math.abs(y - level) > 1 || world.get(x, y + 1, z) !== 0 || world.get(x, y + 2, z) !== 0) return false;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => Math.abs(surface(x + dx, z + dz) - y) > 1)) return false;
    return !trunks.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 2.2) && !propCells.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5);
  };
  const zoneCells = (chapter: number): Array<readonly [number, number]> => {
    const zn = zone(chapter);
    return cellsIn(zn.x - zn.hx + 1, zn.z - zn.hz + 1, zn.x + zn.hx - 1, zn.z + zn.hz - 1);
  };
  const interactables: Interactable[] = await placeRegionTargets({
    mapId: spec.mapId,
    region: spec.region,
    map: { canStand, stand: models.place, chapterCells: zoneCells, residentCells: zones.flatMap((zn) => zoneCells(zn.chapter)), keepClear: [[spec.spawn.x, spec.spawn.z]] },
    interactables: [],
    seed: seed + 11,
  });

  const entities: WorldEntities = {
    version: 2,
    id: spec.mapId,
    seed,
    size: [sx, sy, sz],
    waterLevel: spec.water?.level ?? level - 1,
    spawn: { position: models.place(spec.spawn.x, spec.spawn.z), yaw: spec.spawn.yaw },
    interactables,
    props: models.props,
    landmarks: [...zones.map((zn) => ({ id: zn.id, name: zn.name, position: [zn.x + 0.5, level + 1, zn.z + 0.5] as [number, number, number] })), ...landmarks],
  };
  return { world, entities };
}

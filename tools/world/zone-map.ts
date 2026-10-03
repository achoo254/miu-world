// A region map laid out as one zone per chapter (map-kit.ts has the parts every map shares): level ground
// (only the map's own hills and water change it; the land round the map carries on past its edge), a path from the spawn to every zone, optional
// water (river, pond, moat) with plank decks wherever a path crosses it, the map's own structures and props
// (its `build`), trees round the rest, and the quest targets of each chapter placed in its zone. A map file
// gives the zones, the water and what to build; this file does the rest the same way for every such map.
import path from 'node:path';
import type { HomeDecorCatalog } from '../../packages/schema/src/home-decor';
import { RegionCatalog } from '../../packages/schema/src/region';
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { Interactable, WorldEntities } from '../../packages/voxel/src/world-entities';
import { REPO_ROOT, readJson } from '../assets/asset-lib';
import { cellsIn } from './chapters/place-quest-targets';
import type { OutlandTheme } from '../../packages/voxel/src/outland';
import { levelProfile } from '../../packages/voxel/src/outland-levelling';
import { outlandSpecOf } from './outland-spec';
import { columnsOf, fillColumn, heightField, loadBlocks, mapModels, PACK, placeRegionTargets, rollingHeight, scatterTrees, smoothstep, standHeight, WIDE_MAP_SIDE } from './map-kit';
import { WAY_BLOCKS, wayChecks } from './scenery-audit';
import { placeVillageLife, type Resident } from './village-life';
import { sideQuestTableOf } from '../content/side-quest-table';
import { NETWORK_BLOCK_NAMES, sideFolk, sideSpots } from './side-givers';
import { createRng, hashSeed } from './noise';
import { columnsAlong, distanceToPath, nearestOnPath, pathColumns, type Point } from './structures/path';

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
  /** Where its chapter begins (default: by the middle of its south edge), as the child arrives on the map. */
  start?: readonly [number, number];
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
  /** Ids of the map's own grass and lane blocks (`soil`). */
  soil: { grass: number; path: number };
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
  /** The same at a fixed point (furniture on a classroom floor). */
  centredAt: (model: string, at: readonly [number, number, number], yaw: number) => void;
  /** Keeps trees and quest targets out of a rectangle (inclusive): a building's footprint and its doorstep. */
  keepOut: (x0: number, z0: number, x1: number, z1: number) => void;
  /** Whether a column lies in (or within `pad` of) a rectangle kept out so far. */
  keptOut: (x: number, z: number, pad?: number) => boolean;
  landmark: (id: string, name: string, x: number, z: number, y?: number) => void;
  /**
   * A thing of the map's own the child interacts with (not a quest's: a name board, the timetable on a wall):
   * an object standing at `at` (feet), its prompt reaching `radius` (default 2.5). Without a model nothing is
   * drawn but its `board`, a sign the game paints at runtime; with a model it stands as one.
   */
  target: (t: MapTarget) => void;
  /**
   * A spot of a piece the child restyles (`decor` of the spec, content/home/decor.json): the slot's default
   * style stands here, tagged with the slot, and every other style is written for the game to put in its place.
   */
  decorSpot: (slot: string, at: readonly [number, number, number], yaw: number) => void;
  /** The boxes of each part a block slot paints (role → boxes, inclusive): every other style's colours go there. */
  decorBlocks: (slot: string, roles: Readonly<Record<string, ReadonlyArray<readonly [number, number, number, number, number, number]>>>) => void;
}

export interface MapTarget {
  id: string;
  name: string;
  label: string;
  at: readonly [number, number, number];
  yaw: number;
  radius?: number;
  model?: string;
  board?: string;
}

export interface ZoneMapSpec {
  mapId: string;
  region: string;
  seedText: string;
  /** What the land round the map looks like most (packages/voxel outland.ts): its villages' trades and land. */
  outland: OutlandTheme;
  /** Side of the map in blocks, a multiple of 16 (default 800: owner, 01/10/2026, ten times the area of 256). */
  size?: number;
  /**
   * The map's ground height, and how far it rolls (default 0: level ground, owner 03/10/2026 — "tất cả map phần
   * đường đang hơi nhấp nhô, sửa lại hết thành mặt phẳng"). Relief a map means, a hill, a mountain, a dyke, is
   * its `shape`; water sinks under `water`.
   */
  ground?: { ground: number; roll?: number };
  /**
   * The map's own ground (block names, owner 02/10/2026: no two maps on the same green): its grass and its
   * lanes; the land round the map wears them too. Default grass and path.
   */
  soil?: { grass: string; path: string };
  zones: readonly Zone[];
  spawn: { x: number; z: number; yaw: number };
  /** The map's own landforms (a hill, a slope), from the shaped height of a column (before the water sinks it). */
  shape?: (x: number, z: number, h: number) => number;
  /**
   * Water at `level` over the columns `covers` names (its bed two blocks lower), its banks stepping down to sand
   * a block over it; `quay` names the banks that are stone-edged instead (a canal through a paved square): their
   * ground keeps its height to the water's edge.
   */
  water?: { level: number; covers: (x: number, z: number) => boolean; quay?: (x: number, z: number) => boolean };
  /** The map's ways (lanes, bridges, spurs into the zones). */
  routes?: readonly Point[][];
  /** Also a straight way from the spawn to every zone's centre (default); false when `routes` already reach them. */
  pathsFromSpawn?: boolean;
  /** Share of tree spots left empty, and a tree's trunk and leaves from a roll in [0, 1). */
  trees: { skip: number; blocks: (roll: number, block: (name: string) => number) => { log: number; leaves: number } };
  /** Every model the map places with its standing height in blocks; clips of the animated ones; corner-pivot models. */
  /** Models this map means as something else than the catalog's (content/world/models.json): model → height. */
  sizes?: Readonly<Record<string, number>>;
  build: (ctx: ZoneMapContext) => void;
  /**
   * Small things dotted through every zone so it never reads as an empty lawn (flowers, bushes, stones), about
   * one every `spacing` blocks, clear of the paths and what the map built; quest places still find room.
   */
  dressing?: { models: readonly string[]; spacing: number };
  /**
   * The map's everyday life: its people at their trades and its animals (village-life.ts), placed once the
   * quest targets stand, clear of them. Gets the zones and the landmarks to anchor the cast on.
   */
  /**
   * Gates to other maps (going through one plays that region's next lesson). Default: one beside the spawn
   * back to the hub, Trung tâm (owner, 02/10/2026: a map of its own in the middle of the world, where the
   * children meet online; every theme map is reached from it).
   */
  /**
   * `inPortal`: the gate is the trigger of a portal arch whose glowing pane is what the child sees, so it draws
   * no gate model (a wooden gate behind or in the arch showed through it from the side).
   */
  gates?: ReadonlyArray<{ to: string; at: readonly [number, number]; inPortal?: boolean }>;
  /**
   * The map's rides (a wide map is long to walk): by default a row of stops by the spawn, one to each zone,
   * and a stop at each zone back to the spawn. `vehicle` names them ("Xe buýt", "Đò") and gives their look;
   * `stops` replaces the default with the map's own (from, to, name); false: none.
   */
  rides?: false | { vehicle?: { name: string; label: string; model: string }; stops?: ReadonlyArray<{ name: string; at: readonly [number, number]; to: readonly [number, number] }> };
  life?: (map: { zone: (chapter: number) => Zone; landmark: (id: string) => readonly [number, number] }) => readonly Resident[];
  /** The styles the child may pick for the map's pieces (the child's home): the map writes every one. */
  decor?: HomeDecorCatalog;
  /** Places with a light of their own (indoors, a cave). */
  moods?: WorldEntities['moods'];
}

const DEFAULT_DRESSING = {
  models: [`${PACK.nature}/flower_redA.glb`, `${PACK.nature}/flower_yellowB.glb`, `${PACK.nature}/flower_purpleA.glb`, `${PACK.nature}/plant_bushLarge.glb`, `${PACK.nature}/grass_large.glb`, `${PACK.nature}/rock_smallA.glb`],
  spacing: 7,
};

const SIGNPOST = `${PACK.survival}/signpost.glb`;
const GATE = `${PACK.castle}/gate.glb`;
const RIDE_MODEL = `${PACK.props}/automobile.glb`;
/**
 * How a way's bumps are levelled along it (packages/voxel outland-levelling.ts): runs up to a dozen blocks long, a
 * block at most off the ground under them.
 */
const WAY_LEVELLING = { maxRun: 12, maxShift: 1 } as const;
/** Ground a side quest's giver stands on: grass of every map, sand, snow, earth. */
const NATURAL_GROUND = ['grass', 'grass-forest', 'grass-village', 'grass-hamlet', 'grass-farm', 'grass-library', 'grass-castle', 'grass-market', 'grass-snow', 'grass-island', 'grass-hub', 'grass-home', 'sand', 'snow', 'dirt'];
/** Free blocks over a giver's ground: under the open sky, not a roof, an arch or a tree. */
const GIVER_HEADROOM = 6;
/** A keep-out at most this big (blocks) is a building or a yard; bigger ones are a map's own regions. */
const BUILDING_AREA = 1600;
/** The hub every theme map has a gate back to. */
export const HUB_REGION = 'trung-tam';

export async function generateZoneMap(spec: ZoneMapSpec): Promise<{ world: VoxelWorld; entities: WorldEntities }> {
  const block = await loadBlocks();
  const seed = hashSeed(spec.seedText);
  const rng = createRng(seed);
  const side = (spec.size ?? WIDE_MAP_SIDE) / 16;
  const world = new VoxelWorld([side, 3, side]);
  const [sx, sy, sz] = world.size;
  const ground = { ground: spec.ground?.ground ?? 12, roll: spec.ground?.roll ?? 0 };
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

  // 1. Ground: level (rolling only if the map asks, then level in the zones and round the spawn and low along the
  // paths), raised or sunk by the map's `shape`, sunk under the water.
  const spawnZone: Zone = { chapter: 0, id: 'spawn', name: '', x: spec.spawn.x, z: spec.spawn.z, hx: 4, hz: 4 };
  const quay = (x: number, z: number): boolean => spec.water?.quay?.(x, z) ?? false;
  const natural = heightField(world, (x, z) => {
    let h = rollingHeight(seed, x, z, ground);
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
      else if (waterNear(x, z, 2) && !quay(x, z)) h = Math.min(h, spec.water.level + 1);
    }
    return Math.round(Math.min(h, sy - 16));
  }, level);
  // Every way lies level (owner, 03/10/2026: the ways flat, only real slopes climb): its ground block by block
  // along its middle line has its one-block bumps and dips levelled (a real climb stays), and every column of it
  // takes the height at its nearest point of that line, so a way along a slope or a bank is never tilted across.
  const wayHeights = routes.map((r) => levelProfile(columnsAlong(r).map(([x, z]) => (inWater(x, z) ? Number.NaN : natural(x, z))), WAY_LEVELLING));
  const wayHeight = (x: number, z: number): number => {
    let best = { d: Infinity, along: 0, route: -1 };
    for (const [route, r] of routes.entries()) {
      const p = nearestOnPath(r, x, z);
      if (p.d < best.d) best = { d: p.d, along: p.along, route };
    }
    const h = wayHeights[best.route]?.[Math.round(best.along)] ?? Number.NaN;
    return Number.isNaN(h) ? natural(x, z) : h;
  };
  const laid = heightField(world, (x, z) => (onPath(x, z) && !inWater(x, z) ? wayHeight(x, z) : natural(x, z)), level);
  // Where ways meet, a column a block off its neighbours on both sides along the way takes their height.
  const surface = heightField(world, (x, z) => {
    const h = laid(x, z);
    if (!onPath(x, z) || inWater(x, z)) return h;
    const wayAt = (wx: number, wz: number): number => (onPath(wx, wz) && !inWater(wx, wz) ? laid(wx, wz) : Number.NaN);
    for (const [dx, dz] of [[1, 0], [0, 1]] as const) {
      const [before, after] = [wayAt(x - dx, z - dz), wayAt(x + dx, z + dz)];
      if (before === after && Math.abs(before - h) === 1) return before;
    }
    return h;
  }, level);

  // 2. Soil, zone floors, paths, water.
  const soil = spec.soil ?? { grass: 'grass', path: 'path' };
  const B = { stone: block('stone'), dirt: block('dirt'), grass: block(soil.grass), sand: block('sand'), path: block(soil.path), water: block('water'), bed: block('riverbed'), planks: block('planks'), log: block('log') };
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const h = surface(x, z);
      if (spec.water && inWater(x, z)) {
        fillColumn(world, x, z, h, { stone: B.stone, under: B.dirt, top: B.bed });
        for (let y = h + 1; y <= spec.water.level; y++) world.set(x, y, z, B.water);
        continue;
      }
      const zn = inZone(x, z);
      const bank = spec.water !== undefined && waterNear(x, z, 1) && !quay(x, z);
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
  type OnGround = { model: string; x: number; z: number; yaw: number };
  type AtPoint = { model: string; at: readonly [number, number, number]; yaw: number };
  const queued: Array<(OnGround & { kind: 'ground' }) | (OnGround & { kind: 'centred' }) | (AtPoint & { kind: 'at' }) | (AtPoint & { kind: 'centred-at' })> = [];
  const kept: Array<[number, number, number, number]> = [];
  const landmarks: Landmark[] = [];
  const ownTargets: MapTarget[] = [];
  const decorSpots: Array<{ slot: string; at: readonly [number, number, number]; yaw: number }> = [];
  const decorBlocks: NonNullable<WorldEntities['decorBlocks']> = [];
  const decorSlot = (id: string): HomeDecorCatalog['slots'][number] => {
    const slot = spec.decor?.slots.find((s) => s.id === id);
    if (!slot) throw new Error(`${spec.mapId}: decor slot ${id} is not in the catalogue`);
    return slot;
  };
  const keptOut = (x: number, z: number, pad = 0): boolean => kept.some(([x0, z0, x1, z1]) => x >= x0 - pad && x <= x1 + pad && z >= z0 - pad && z <= z1 + pad);
  spec.build({
    world,
    block,
    soil: { grass: B.grass, path: B.path },
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
    centredAt: (model, at, yaw) => queued.push({ kind: 'centred-at', model, at, yaw }),
    keepOut: (x0, z0, x1, z1) => kept.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]),
    keptOut,
    landmark: (id, name, x, z, y) => landmarks.push({ id, name, position: [x + 0.5, y ?? level + 1, z + 0.5] }),
    target: (t) => ownTargets.push(t),
    decorSpot: (slot, at, yaw) => {
      if (!decorSlot(slot).options.every((o) => o.models)) throw new Error(`${spec.mapId}: decor slot ${slot} paints blocks, it has no spots`);
      decorSpots.push({ slot, at, yaw });
    },
    decorBlocks: (slotId, roles) => {
      const slot = decorSlot(slotId);
      const base = slot.options.find((o) => o.id === slot.default)?.blocks;
      if (!base) throw new Error(`${spec.mapId}: decor slot ${slotId} places models, it paints no blocks`);
      for (const option of slot.options) {
        if (option.id === slot.default) continue;
        for (const [role, boxes] of Object.entries(roles)) {
          const [from, to] = [base[role], option.blocks?.[role]];
          if (!from || !to) throw new Error(`${spec.mapId}: decor ${slotId}/${option.id} has no block for ${role}`);
          if (from !== to && boxes.length > 0) decorBlocks.push({ slot: slotId, option: option.id, from: block(from), to: block(to), boxes: boxes.map((b) => [...b] as [number, number, number, number, number, number]) });
        }
      }
    },
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
  const models = await mapModels({ standY, sizes: spec.sizes });
  for (const q of queued) {
    if (q.kind === 'at') models.addPropAt(q.model, q.at, q.yaw);
    else if (q.kind === 'centred-at') models.addCentred(q.model, q.at, q.yaw);
    else if (q.kind === 'centred') models.addCentred(q.model, models.place(q.x, q.z), q.yaw);
    else models.addProp(q.model, q.x, q.z, q.yaw);
  }
  // The restyled pieces: each spot's default style placed (tagged), every other style written for the game.
  const decorModels: NonNullable<WorldEntities['decorModels']> = [];
  for (const [i, spot] of decorSpots.entries()) {
    const slot = decorSlot(spot.slot);
    const own = slot.options.find((o) => o.id === slot.default);
    const styles = own?.models ?? [];
    const model = styles[decorSpots.filter((d, k) => k < i && d.slot === spot.slot).length % styles.length];
    if (!own || !model) throw new Error(`${spec.mapId}: decor slot ${spot.slot} has no default model`);
    models.addSlotted(model, spot.at, spot.yaw + (own.turn ?? 0), spot.slot);
  }
  for (const slot of spec.decor?.slots ?? []) {
    if (!decorSpots.some((d) => d.slot === slot.id)) continue;
    for (const option of slot.options) {
      if (option.id === slot.default) continue;
      for (const model of option.models ?? []) decorModels.push({ slot: slot.id, option: option.id, model, scale: models.scaleOf(model), offset: models.offsetOf(model), turn: option.turn ?? 0 });
    }
  }
  // A signpost at the corner of each zone nearest the spawn, naming it.
  for (const zn of zones) {
    const cx = zn.x + Math.sign(spec.spawn.x - zn.x) * (zn.hx - 1);
    const cz = zn.z + Math.sign(spec.spawn.z - zn.z) * (zn.hz - 1);
    models.addProp(SIGNPOST, Math.round(cx), Math.round(cz), 45);
  }

  // 6. Quest targets: each chapter's in its zone, on level open ground off the paths, clear of props, trees and buildings.
  const propCells = columnsOf(models.props);
  // Trees and props as column lookups (a wide map has some fifteen thousand props).
  const trunkNear = new Set<string>();
  for (const [tx, tz] of trunks) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dx, dz) < 2.2) trunkNear.add(`${tx + dx},${tz + dz}`);
  const propNear = new Set<string>();
  for (const [px, pz] of propCells) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (Math.hypot(dx, dz) < 1.5) propNear.add(`${px + dx},${pz + dz}`);
  const nearTrunk = (x: number, z: number): boolean => trunkNear.has(`${x},${z}`);
  const nearProp = (x: number, z: number): boolean => propNear.has(`${x},${z}`);
  const canStand = (x: number, z: number): boolean => {
    if (!inZone(x, z) || onPath(x, z) || inWater(x, z) || keptOut(x, z, 1)) return false;
    const y = surface(x, z);
    if (Math.abs(y - level) > 1 || world.get(x, y + 1, z) !== 0 || world.get(x, y + 2, z) !== 0) return false;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx = 0, dz = 0]) => Math.abs(surface(x + dx, z + dz) - y) > 1)) return false;
    return !nearTrunk(x, z) && !nearProp(x, z);
  };
  const zoneCells = (chapter: number): Array<readonly [number, number]> => {
    const zn = zone(chapter);
    return cellsIn(zn.x - zn.hx + 1, zn.z - zn.hz + 1, zn.x + zn.hx - 1, zn.z + zn.hz - 1);
  };
  const regionNames = new Map((await readJson(path.join(REPO_ROOT, 'content/world/regions.json'), RegionCatalog)).regions.map((r) => [r.id, r.name]));
  const gateList = spec.gates ?? (spec.region === HUB_REGION ? [] : [{ to: HUB_REGION, at: [spec.spawn.x + 7, spec.spawn.z + 3] as const }]);
  const gates: Interactable[] = gateList.map((g) => {
    const name = regionNames.get(g.to);
    if (!name) throw new Error(`${spec.mapId}: a gate leads to ${g.to}, which is not in content/world/regions.json`);
    return {
      id: `cong-${g.to}`,
      kind: 'gate' as const,
      name: `Cổng sang ${name}`,
      label: 'Đi qua cổng',
      position: models.place(g.at[0], g.at[1]),
      yaw: 0,
      radius: 3,
      ...(g.inPortal ? {} : models.modelled(GATE)),
      travel: g.to,
    };
  });
  // Each chapter starts at the edge of its zone; rides link those starts with the spawn.
  const openNear = (x: number, z: number): [number, number] => {
    for (let r = 0; r <= 8; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const [cx, cz] = [Math.round(x) + dx, Math.round(z) + dz];
          const y = surface(cx, cz);
          if (inWater(cx, cz) || keptOut(cx, cz, 0) || Math.abs(y - level) > 1 || world.get(cx, y + 1, cz) !== 0 || world.get(cx, y + 2, cz) !== 0) continue;
          return [cx, cz];
        }
      }
    }
    return [Math.round(x), Math.round(z)];
  };
  const chapterStart = new Map(zones.map((zn) => [zn.chapter, zn.start ? openNear(zn.start[0], zn.start[1]) : openNear(zn.x, zn.z + zn.hz - 3)] as const));
  const vehicle = (spec.rides !== false && spec.rides?.vehicle) || { name: 'Xe buýt', label: 'Lên xe', model: RIDE_MODEL };
  const rideStops =
    spec.rides === false
      ? []
      : (spec.rides?.stops ?? [
          ...zones.map((zn, i) => ({ name: `${vehicle.name} tới ${zn.name}`, at: [spec.spawn.x - 4 - (i % 4) * 4, spec.spawn.z - 6 - Math.floor(i / 4) * 4] as const, to: chapterStart.get(zn.chapter) ?? [zn.x, zn.z] })),
          ...zones.map((zn) => {
            const [sx0, sz0] = chapterStart.get(zn.chapter) ?? [zn.x, zn.z];
            return { name: `${vehicle.name} về cổng`, at: [sx0 + 4, sz0] as const, to: [spec.spawn.x + 2, spec.spawn.z + 2] as const };
          }),
        ]);
  const rides: Interactable[] = rideStops.map((stop, i) => {
    const [ax, az] = openNear(stop.at[0], stop.at[1]);
    const [tx, tz] = openNear(stop.to[0] + 2, stop.to[1] + 2);
    return {
      id: `ben-xe-${i + 1}`,
      kind: 'object' as const,
      name: stop.name,
      label: vehicle.label,
      position: models.place(ax, az),
      yaw: 0,
      radius: 2.5,
      ...models.modelled(vehicle.model),
      ride: models.place(tx, tz),
    };
  });
  // The side quests' givers: anywhere on the map, beside the ways, near the place their table names (a landmark
  // or a zone of that name).
  const sideTable = sideQuestTableOf(spec.region);
  const landmarkCell = (name: string): readonly [number, number] | undefined => {
    const key = name.trim().toLowerCase();
    const lm = landmarks.find((l) => l.name.trim().toLowerCase() === key);
    if (lm) return [Math.floor(lm.position[0]), Math.floor(lm.position[2])];
    const zn = zones.find((z) => z.name.trim().toLowerCase() === key);
    return zn ? [zn.x, zn.z] : undefined;
  };
  const naturalGround = new Set(NATURAL_GROUND.map(block));
  const pavingIds = new Set(WAY_BLOCKS.map(block));
  const { inLane } = wayChecks(world, pavingIds);
  const buildings = kept.filter(([x0, z0, x1, z1]) => (x1 - x0 + 1) * (z1 - z0 + 1) <= BUILDING_AREA);
  const nearBuilding = (x: number, z: number): boolean => buildings.some(([x0, z0, x1, z1]) => x >= x0 - 2 && x <= x1 + 2 && z >= z0 - 2 && z <= z1 + 2);
  const spots =
    sideTable.givers.length + sideTable.residents.length > 0
      ? sideSpots({
          world,
          wayIds: new Set(NETWORK_BLOCK_NAMES.map(block)),
          spawn: [spec.spawn.x, spec.spawn.z],
          // The ground as built (a map's builds may raise it over the height field).
          groundY: (x, z) => standY(x, z) - 1,
          rides: rides.flatMap((t) => (t.ride ? [{ stop: [Math.floor(t.position[0]), Math.floor(t.position[2])] as const, arrival: [Math.floor(t.ride[0]), Math.floor(t.ride[2])] as const }] : [])),
          landmark: landmarkCell,
          // Open ground: grass, sand, snow or earth underfoot, or the side of a paved square (never a lane's
          // middle, a field or a floor), the sky over the head (not under a roof, an arch or a tree), clear of every
          // building and its doorstep. A map's wide keep-outs (a forest kept for its pines, a lesson district) are
          // not buildings: a giver may stand there.
          canStand: (x, z) => {
            if (onPath(x, z) || inWater(x, z) || nearBuilding(x, z) || nearTrunk(x, z) || nearProp(x, z)) return false;
            const y = standY(x, z);
            const under = world.get(x, y - 1, z);
            if (!naturalGround.has(under) && !(pavingIds.has(under) && !inLane(x, y, z))) return false;
            for (let up = 0; up < GIVER_HEADROOM; up++) if (world.get(x, y + up, z) !== 0) return false;
            return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx = 0, dz = 0]) => Math.abs(standY(x + dx, z + dz) - y) <= 1);
          },
        })
      : undefined;
  const giverAnchor = new Map(sideTable.givers.map((g) => [g.id, g.at ? { at: g.at } : { place: g.place ?? '' }] as const));
  const placed: Interactable[] = await placeRegionTargets({
    mapId: spec.mapId,
    region: spec.region,
    map: {
      canStand,
      stand: models.place,
      chapterCells: zoneCells,
      residentCells: zones.flatMap((zn) => zoneCells(zn.chapter)),
      keepClear: [[spec.spawn.x, spec.spawn.z], ...chapterStart.values()],
      ...(spots
        ? {
            sideSpot: (id: string, taken: ReadonlyArray<readonly [number, number]>) => {
              const anchor = giverAnchor.get(id);
              if (!anchor) throw new Error(`${spec.mapId}: ${id} offers side quests but is not a giver in tools/content/side-quests/${spec.region}.json`);
              return spots(anchor, [...taken, [spec.spawn.x, spec.spawn.z], ...chapterStart.values()]);
            },
          }
        : {}),
      placeNamed: (name) => {
        const key = name.trim().toLowerCase();
        const lm = landmarks.find((l) => l.name.trim().toLowerCase() === key);
        return lm ? [Math.floor(lm.position[0]), Math.floor(lm.position[2])] : undefined;
      },
    },
    interactables: [
      ...gates,
      ...rides,
      ...ownTargets.map((t): Interactable => ({
        id: t.id,
        kind: 'object',
        name: t.name,
        label: t.label,
        position: [t.at[0], t.at[1], t.at[2]],
        yaw: t.yaw,
        radius: t.radius ?? 2.5,
        ...(t.model ? models.modelled(t.model) : {}),
        ...(t.board ? { board: t.board } : {}),
      })),
    ],
    seed: seed + 11,
  });
  // The map's own things stay in the world whichever lesson is played, even one a quest's step points at.
  const ownIds = new Set(ownTargets.map((t) => t.id));
  const interactables = placed.map((t): Interactable => {
    if (!ownIds.has(t.id)) return t;
    const { chapter: _chapter, chapters: _chapters, quest: _quest, ...always } = t;
    return always;
  });

  // 7. Everyday life round the districts, clear of every quest target and out of the water (the map's, and the
  // pools and fountains it built), spread over the map's lived ground: its ways (on the ground, or paving laid one
  // block up) and its buildings.
  const wayIds = new Set(WAY_BLOCKS.map(block));
  const isWay = (x: number, z: number): boolean => {
    const y = surface(x, z);
    return wayIds.has(world.get(x, y, z)) || (wayIds.has(world.get(x, y + 1, z)) && world.get(x, y + 2, z) === 0);
  };
  const landmarkAt = (id: string): readonly [number, number] => {
    const lm = landmarks.find((l) => l.id === id);
    if (!lm) throw new Error(`${spec.mapId}: no landmark ${id} for the cast`);
    return [Math.floor(lm.position[0]), Math.floor(lm.position[2])];
  };
  const lifeGround = { world, surface, standY, onPath, inWater: (x: number, z: number) => inWater(x, z) || world.get(x, surface(x, z), z) === B.water, questSpots: columnsOf(interactables), scaleOf: models.scaleOf, isWay, nearBuilding: (x: number, z: number, pad: number) => keptOut(x, z, pad), spawn: [spec.spawn.x, spec.spawn.z] as const };
  const villagers = spec.life ? placeVillageLife(lifeGround, spec.life({ zone, landmark: landmarkAt }), seed + 23) : [];
  // The side quests' company and the table's residents, clear of the villagers' homes too.
  const givers = new Map(interactables.filter((t) => giverAnchor.has(t.id)).map((t) => [t.id, [Math.floor(t.position[0]), Math.floor(t.position[2])] as const]));
  const folk = spots
    ? sideFolk({ table: sideTable, givers, spots, life: { ...lifeGround, questSpots: [...lifeGround.questSpots, ...columnsOf(villagers)] }, seed: seed + 29 })
    : [];
  const ambients = [...villagers, ...folk];

  const entities: WorldEntities = {
    version: 2,
    id: spec.mapId,
    seed,
    size: [sx, sy, sz],
    waterLevel: spec.water?.level ?? level - 1,
    spawn: { position: models.place(spec.spawn.x, spec.spawn.z), yaw: spec.spawn.yaw },
    chapterSpawns: Object.fromEntries([...chapterStart].map(([chapter, [x, z]]) => [String(chapter), { position: models.place(x, z), yaw: 180 }])),
    interactables,
    props: models.props,
    landmarks: [...zones.map((zn) => ({ id: zn.id, name: zn.name, position: [zn.x + 0.5, level + 1, zn.z + 0.5] as [number, number, number] })), ...landmarks],
    ...(ambients.length > 0 ? { ambients } : {}),
    outland: await outlandSpecOf(world, seed, spec.outland, level, spec.soil),
    ...(spec.moods && spec.moods.length > 0 ? { moods: spec.moods } : {}),
    ...(decorSpots.length > 0 ? { decorAnchors: decorSpots.map((d) => ({ slot: d.slot, position: [d.at[0], d.at[1], d.at[2]] as [number, number, number], yaw: d.yaw + 0 })), decorModels } : {}),
    ...(decorBlocks.length > 0 ? { decorBlocks } : {}),
  };
  return { world, entities };
}

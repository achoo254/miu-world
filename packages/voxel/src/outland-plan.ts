// The outer land's layout (outland.ts): one plan per map, from its spec and seed, that every lookup and every
// region of blocks is generated from. `planOutland` lays out the water (ponds where the core's edge is water,
// meandering rivers, lakes), the villages and their houses, the roads between them and out from the middle of
// each core side, the fields round the villages and the clearings (viewpoints, small scenes, ride stops). The
// land itself is a function of a column (`sampleColumn`): rolling ground and hills from noise, valleys carved
// down to the water, village pads levelled, the core's edge heights blended in near the core, roads laid on a
// smoothed profile. Trees are a function of a cell of a fixed grid. Nothing depends on what was generated
// before, so a column, a tree or a house is the same whichever region asks for it.
//
// Water follows the core maps (zone-map.ts): a column whose ground is below `waterLevel` holds water from
// ground + 1 up to and including `waterLevel`, so the water's top block is at y = waterLevel.
import { createRng, fbm, hashSeed, valueNoise } from './noise';
import { levelProfile } from './outland-levelling';
import { OUTLAND_BOUNDS, type OutlandBlockName, type OutlandSpec, type OutlandTheme, type WorldBounds } from './outland';

/** Highest ground of the outer land: room above it for a tree or a roof under the world's top. */
const OUTLAND_MAX_GROUND = 34;
/** Blocks over which the outer land eases from the core's edge heights to its own. */
const SEAM = 48;
/** No tree, house or prop this close to the core: its edge stays as the core made it. */
const CORE_CLEAR = 8;
/** Half width of a road: a column whose centre is this close to the road's middle line is road (2-3 wide). */
export const ROAD_HALF = 1.3;
/** Beyond a road's edge the land eases to the road's height over this many blocks. */
const ROAD_BLEND = 6;
/** Steepest rise of a road per block: rounded to blocks, neighbouring road columns differ by one at most. */
const ROAD_SLOPE = 0.5;
/** Spacing of a road's points (and its height profile) along its length. */
const ROAD_STEP = 4;
/** A road's bumps levelled along it (outland-levelling.ts): runs of up to 48 blocks, a block off the land at most. */
const ROAD_LEVELLING = { maxRun: 12, maxShift: 1 } as const;
/** A village's pad is level out to its radius, then eases into the land over this many blocks. */
const PAD_BLEND = 20;
/** Rise of a valley side per block away from the water's edge. */
const VALLEY_SLOPE = 0.6;
/** How far a water feature can shape the land (its valley sides). */
const VALLEY_REACH = 46;
/** Side of the spatial index's cells. */
const GRID = 64;
/** Spacing of the coarse height samples the layout reads (village sites, hills). */
const COARSE = 40;
/** Side of the cells of the forest grid: at most one tree per cell. */
const TREE_CELL = 6;
/** How far a tree's crown reaches from its trunk. */
const CROWN = 2;
/** Road segments, river segments: id = feature * SEGMENTS + segment. */
const SEGMENTS = 65536;

export type Side = 'north' | 'south' | 'west' | 'east';
export type FieldKind = 'paddy' | 'crop' | 'orchard' | 'pasture';
export type SceneKind = 'kites' | 'picnic' | 'fishing' | 'woodcutters' | 'teahouse' | 'football' | 'readers' | 'lookout';
export type ClearingKind = SceneKind | 'viewpoint' | 'stops';
export type StructureKind = 'house' | 'stall' | 'well';

/** What a map's outer land looks like most: its land, water and woods (its people are outland-life.ts's). */
export interface ThemeLook {
  rivers: number;
  lakes: number;
  villages: number;
  /** Shifts the hill mask: more (positive) or fewer (negative) hills. */
  hillBias: number;
  hillHeight: number;
  /** Tree density of the plains (woods come and go round it). */
  forest: number;
  /** Extra trunk height of the trees. */
  treeBonus: number;
  /** Ground this far above the map's ground shows rock in patches. */
  rockAbove: number;
  riverWide: number;
  lakeBig: number;
  /** Least and most fields per village. */
  fields: readonly [number, number];
  fieldKinds: Readonly<Record<FieldKind, number>>;
  leaves: Readonly<{ leaves: number; autumn: number; pink: number; birch: number }>;
  /** Half the villages sit near the water (fishing hamlets). */
  nearWater: boolean;
  viewpoints: number;
  scenes: Readonly<Partial<Record<SceneKind, number>>>;
  walls: readonly OutlandBlockName[];
}

const PLAIN_LEAVES = { leaves: 7, autumn: 0.8, pink: 0.5, birch: 1.5 } as const;
const HOUSE_WALLS: readonly OutlandBlockName[] = ['planks', 'birch-log', 'sand', 'planks'];

const THEME_LOOKS: Readonly<Record<OutlandTheme, ThemeLook>> = {
  river: {
    rivers: 5, lakes: 14, villages: 36, hillBias: -0.08, hillHeight: 11, forest: 0.16, treeBonus: 0, rockAbove: 12, riverWide: 1, lakeBig: 10,
    fields: [2, 4], fieldKinds: { paddy: 5, crop: 2, orchard: 1, pasture: 1 }, leaves: PLAIN_LEAVES, nearWater: true, viewpoints: 9,
    scenes: { kites: 5, picnic: 4, fishing: 12 }, walls: HOUSE_WALLS,
  },
  forest: {
    rivers: 2, lakes: 8, villages: 34, hillBias: 0.05, hillHeight: 13, forest: 0.5, treeBonus: 1, rockAbove: 11, riverWide: 0, lakeBig: 0,
    fields: [1, 3], fieldKinds: { paddy: 1, crop: 2, orchard: 2, pasture: 1 }, leaves: { leaves: 6, autumn: 2.5, pink: 0.5, birch: 3 }, nearWater: false, viewpoints: 10,
    scenes: { kites: 3, picnic: 8, fishing: 5, woodcutters: 9 }, walls: ['planks', 'birch-log', 'planks', 'sand'],
  },
  school: {
    rivers: 3, lakes: 9, villages: 36, hillBias: 0, hillHeight: 12, forest: 0.2, treeBonus: 0, rockAbove: 11, riverWide: 0, lakeBig: 4,
    fields: [1, 3], fieldKinds: { paddy: 2, crop: 2, orchard: 1, pasture: 1 }, leaves: PLAIN_LEAVES, nearWater: false, viewpoints: 10,
    scenes: { kites: 6, picnic: 4, fishing: 5, football: 8 }, walls: HOUSE_WALLS,
  },
  hamlet: {
    rivers: 3, lakes: 9, villages: 38, hillBias: -0.03, hillHeight: 12, forest: 0.2, treeBonus: 0, rockAbove: 11, riverWide: 0, lakeBig: 4,
    fields: [2, 4], fieldKinds: { paddy: 2, crop: 2, orchard: 2, pasture: 1 }, leaves: { leaves: 6, autumn: 1, pink: 1.5, birch: 1 }, nearWater: false, viewpoints: 10,
    scenes: { kites: 7, picnic: 7, fishing: 5 }, walls: HOUSE_WALLS,
  },
  market: {
    rivers: 3, lakes: 8, villages: 38, hillBias: -0.05, hillHeight: 11, forest: 0.18, treeBonus: 0, rockAbove: 12, riverWide: 0, lakeBig: 2,
    fields: [1, 3], fieldKinds: { paddy: 2, crop: 3, orchard: 1, pasture: 1 }, leaves: PLAIN_LEAVES, nearWater: false, viewpoints: 9,
    scenes: { kites: 4, picnic: 4, fishing: 5, teahouse: 10 }, walls: HOUSE_WALLS,
  },
  farm: {
    rivers: 3, lakes: 8, villages: 34, hillBias: -0.12, hillHeight: 10, forest: 0.12, treeBonus: 0, rockAbove: 12, riverWide: 0, lakeBig: 2,
    fields: [4, 6], fieldKinds: { paddy: 3, crop: 3, orchard: 1, pasture: 2.5 }, leaves: PLAIN_LEAVES, nearWater: false, viewpoints: 8,
    scenes: { kites: 7, picnic: 5, fishing: 5 }, walls: HOUSE_WALLS,
  },
  library: {
    rivers: 2, lakes: 9, villages: 34, hillBias: 0.02, hillHeight: 12, forest: 0.24, treeBonus: 0, rockAbove: 11, riverWide: 0, lakeBig: 4,
    fields: [2, 3], fieldKinds: { paddy: 1, crop: 1, orchard: 3, pasture: 1 }, leaves: { leaves: 5, autumn: 2, pink: 2.5, birch: 1.5 }, nearWater: false, viewpoints: 10,
    scenes: { kites: 4, picnic: 5, fishing: 4, readers: 9 }, walls: HOUSE_WALLS,
  },
  castle: {
    rivers: 2, lakes: 6, villages: 34, hillBias: 0.14, hillHeight: 18, forest: 0.2, treeBonus: 0, rockAbove: 7, riverWide: 0, lakeBig: 0,
    fields: [1, 3], fieldKinds: { paddy: 1, crop: 2, orchard: 1, pasture: 2 }, leaves: { leaves: 6, autumn: 2, pink: 0.5, birch: 2 }, nearWater: false, viewpoints: 14,
    scenes: { kites: 5, picnic: 4, fishing: 4, lookout: 9 }, walls: ['brick-grey', 'planks', 'sand', 'brick-grey'],
  },
};

export interface River {
  /** Points along its middle, x and z interleaved, about 12 blocks apart. */
  readonly pts: Float64Array;
  /** Half its width at each point. */
  readonly half: Float64Array;
}
export interface Lake {
  readonly x: number;
  readonly z: number;
  readonly r: number;
  /** Wobble of its shore: amplitude and phase of a third and a fifth harmonic. */
  readonly wobble: readonly [number, number, number, number];
  /** A pond spreading from water at the core's edge. */
  readonly mouth: boolean;
}
export type RoadEnd = { readonly kind: 'side'; readonly side: Side } | { readonly kind: 'village'; readonly village: number };
export interface Road {
  /** Points along its middle, x and z interleaved, ROAD_STEP apart. */
  readonly pts: Float64Array;
  /** Height of the road at each point (its surface block's y before rounding). */
  readonly profile: Float64Array;
  readonly from: RoadEnd;
  readonly to: RoadEnd;
}
/** A block building of a village. Walls x0..x1, z0..z1 (inclusive) on `base`; the door faces `door`. */
export interface Structure {
  readonly kind: StructureKind;
  readonly village: number;
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  /** y of the lowest wall block (the pad's height + 1). */
  readonly base: number;
  readonly wallH: number;
  /** The roof's ridge runs along x (doors on a z side) or along z. */
  readonly ridgeX: boolean;
  readonly door: Side;
  readonly wall: OutlandBlockName;
  readonly roof: OutlandBlockName;
}
export interface Village {
  readonly index: number;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  /** Radius of its level pad. */
  readonly radius: number;
  /** y of the pad's ground. */
  readonly pad: number;
  /** Houses it wants (some may not fit). */
  readonly homes: number;
  /** Its buildings (indices into `structures`) and its fields (into `fields`). */
  readonly structures: number[];
  readonly fields: number[];
}
export interface Field {
  readonly kind: FieldKind;
  readonly village: number;
  readonly x0: number;
  readonly z0: number;
  readonly x1: number;
  readonly z1: number;
  /** Crowns of an orchard's trees. */
  readonly leaves: OutlandBlockName;
}
/** Open ground kept free of trees: a viewpoint, a scene, the ride stops at a core side. */
export interface Clearing {
  readonly kind: ClearingKind;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  /** A viewpoint's name. */
  readonly name: string;
  /** The lake a fishing scene is by, or -1. */
  readonly lake: number;
}
/** Where a road leaves the middle of a core side. */
export interface SideGate {
  readonly side: Side;
  /** On the core's edge line, the middle of the road. */
  readonly x: number;
  readonly z: number;
  /** Outward normal of the side and the direction along it. */
  readonly nx: number;
  readonly nz: number;
  readonly ax: number;
  readonly az: number;
}

/** Feature ids by 64-block cell, so a column looks only at what can reach it. */
export class FeatureBuckets {
  private readonly cells: Array<number[] | undefined>;
  private readonly nx: number;
  private readonly nz: number;

  constructor(private readonly bounds: WorldBounds) {
    this.nx = Math.ceil((bounds.x1 - bounds.x0) / GRID);
    this.nz = Math.ceil((bounds.z1 - bounds.z0) / GRID);
    this.cells = new Array<number[] | undefined>(this.nx * this.nz);
  }

  /** Registers `id` in every cell overlapping the rectangle (inclusive). */
  add(x0: number, z0: number, x1: number, z1: number, id: number): void {
    const i0 = this.col(x0);
    const i1 = this.col(x1);
    const j0 = this.row(z0);
    const j1 = this.row(z1);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = i + j * this.nx;
        const list = this.cells[k];
        if (list) list.push(id);
        else this.cells[k] = [id];
      }
    }
  }

  /** Ids registered at a point (empty outside the bounds). */
  at(x: number, z: number): readonly number[] {
    const i = Math.floor((x - this.bounds.x0) / GRID);
    const j = Math.floor((z - this.bounds.z0) / GRID);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return NONE;
    return this.cells[i + j * this.nx] ?? NONE;
  }

  /** Ids registered in any cell overlapping the rectangle, each once, in ascending order. */
  within(x0: number, z0: number, x1: number, z1: number): number[] {
    const seen = new Set<number>();
    for (let j = this.row(z0); j <= this.row(z1); j++) for (let i = this.col(x0); i <= this.col(x1); i++) for (const id of this.cells[i + j * this.nx] ?? NONE) seen.add(id);
    return [...seen].sort((a, b) => a - b);
  }

  private col(x: number): number {
    return Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.bounds.x0) / GRID)));
  }

  private row(z: number): number {
    return Math.min(this.nz - 1, Math.max(0, Math.floor((z - this.bounds.z0) / GRID)));
  }
}
const NONE: readonly number[] = [];

interface Seeds {
  roll: number;
  mask: number;
  hill: number;
  density: number;
  tree: number;
  rock: number;
}

export interface OutlandPlan {
  readonly spec: OutlandSpec;
  /** The core's size; the world's height is `size[1]`. */
  readonly size: readonly [number, number, number];
  readonly waterLevel: number;
  readonly height: number;
  readonly bounds: WorldBounds;
  readonly look: ThemeLook;
  readonly seeds: Readonly<Seeds>;
  readonly rivers: readonly River[];
  readonly lakes: readonly Lake[];
  readonly villages: readonly Village[];
  readonly roads: readonly Road[];
  readonly structures: readonly Structure[];
  readonly fields: readonly Field[];
  readonly clearings: readonly Clearing[];
  readonly sides: readonly SideGate[];
  /** Prefix sums of the core's edge heights along each side (`edgeHeight`). */
  readonly edgeSums: Readonly<Record<Side, Float64Array>>;
  readonly grid: {
    readonly water: FeatureBuckets;
    readonly roads: FeatureBuckets;
    readonly villages: FeatureBuckets;
    readonly structures: FeatureBuckets;
    readonly fields: FeatureBuckets;
    readonly clearings: FeatureBuckets;
  };
}

// ---------------------------------------------------------------------------------------------------------
// Small geometry

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (e0: number, e1: number, v: number): number => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Parameter (0..1) of the closest point of the last `segDist` call. The lookups below share a few such
 * scratch values to stay allocation-free; they run on one thread (the game's worker, or the tools).
 */
let segT = 0;
/** Distance from (px, pz) to the segment a-b; sets `segT`. */
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? clamp(((px - ax) * dx + (pz - az) * dz) / len2, 0, 1) : 0;
  segT = t;
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

function pointRectDist(px: number, pz: number, x0: number, z0: number, x1: number, z1: number): number {
  return Math.hypot(Math.max(0, x0 - px, px - x1), Math.max(0, z0 - pz, pz - z1));
}

/** Whether the segment a-b meets the rectangle (Liang-Barsky clipping). */
function segHitsRect(ax: number, az: number, bx: number, bz: number, x0: number, z0: number, x1: number, z1: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]] as const) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

function segRectDist(ax: number, az: number, bx: number, bz: number, x0: number, z0: number, x1: number, z1: number): number {
  if (segHitsRect(ax, az, bx, bz, x0, z0, x1, z1)) return 0;
  return Math.min(
    pointRectDist(ax, az, x0, z0, x1, z1),
    pointRectDist(bx, bz, x0, z0, x1, z1),
    segDist(x0, z0, ax, az, bx, bz),
    segDist(x1, z0, ax, az, bx, bz),
    segDist(x0, z1, ax, az, bx, bz),
    segDist(x1, z1, ax, az, bx, bz),
  );
}

/** Whether segments a-b and c-d cross (touching at a shared end does not count). */
function segsCross(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): boolean {
  const o = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number): number => Math.sign((qx - px) * (rz - pz) - (qz - pz) * (rx - px));
  return o(ax, az, bx, bz, cx, cz) * o(ax, az, bx, bz, dx, dz) < 0 && o(cx, cz, dx, dz, ax, az) * o(cx, cz, dx, dz, bx, bz) < 0;
}

/** Hash of an integer point and a salt to [0, 1). */
function hash01(seed: number, x: number, z: number, salt: number): number {
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(z, 0x165667b1) ^ Math.imul(salt, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pickWeighted<K extends string>(weights: Readonly<Partial<Record<K, number>>>, roll: number): K {
  const entries = Object.entries(weights) as Array<[K, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let t = roll * total;
  for (const [k, w] of entries) {
    t -= w;
    if (t < 0) return k;
  }
  const last = entries[entries.length - 1];
  if (!last) throw new Error('pickWeighted: no weights');
  return last[0];
}

// ---------------------------------------------------------------------------------------------------------
// The land as a function of a column. Coordinates here are column centres (x + 0.5, z + 0.5) unless noted.

/** Blocks from a point to the core (a column next to the core is 1 away; the core's edge line is 0). */
export function coreDistance(plan: OutlandPlan, cx: number, cz: number): number {
  const [sx, , sz] = plan.size;
  const dx = cx < 0 ? 0.5 - cx : cx > sx ? cx - sx + 0.5 : 0;
  const dz = cz < 0 ? 0.5 - cz : cz > sz ? cz - sz + 0.5 : 0;
  return Math.hypot(dx, dz);
}

/**
 * Ground height of the core's edge near a point: the edge column nearest it at the seam, averaged over a
 * window of the edge that widens with the distance `d` (prefix sums: O(1)), so the core's ponds and banks
 * spread and round off as they carry on outward instead of running straight out.
 */
function edgeHeight(plan: OutlandPlan, cx: number, cz: number, d: number): number {
  const [sx, , sz] = plan.size;
  const x = Math.floor(cx);
  const z = Math.floor(cz);
  const xc = clamp(x, 0, sx - 1);
  const zc = clamp(z, 0, sz - 1);
  let side: Side;
  if (z < 0) side = 'north';
  else if (z >= sz) side = 'south';
  else if (x < 0) side = 'west';
  else if (x >= sx) side = 'east';
  else {
    // On the core's edge line (where a road leaves the core): the nearest edge.
    const m = Math.min(x, z, sx - 1 - x, sz - 1 - z);
    side = m === z ? 'north' : m === sz - 1 - z ? 'south' : m === x ? 'west' : 'east';
  }
  const at = side === 'north' || side === 'south' ? xc : zc;
  const sums = plan.edgeSums[side];
  const w = Math.floor(d * 0.5);
  const lo = Math.max(0, at - w);
  const hi = Math.min(sums.length - 2, at + w);
  return ((sums[hi + 1] ?? 0) - (sums[lo] ?? 0)) / (hi - lo + 1);
}

/** The land before water, villages and roads: rolling ground round the map's ground, hills where the mask says. */
function naturalHeight(plan: OutlandPlan, x: number, z: number): number {
  const look = plan.look;
  let h = plan.spec.ground + fbm(plan.seeds.roll, x / 56, z / 56, 3) * 3;
  const mask = fbm(plan.seeds.mask, x / 560, z / 560, 2) + look.hillBias;
  if (mask > 0) h += smoothstep(0, 0.35, mask) * (0.4 + 0.6 * (0.5 + 0.5 * fbm(plan.seeds.hill, x / 120, z / 120, 3))) * look.hillHeight;
  return clamp(h, plan.waterLevel + 1, OUTLAND_MAX_GROUND);
}

function lakeRadius(lake: Lake, cx: number, cz: number): number {
  const a = Math.atan2(cz - lake.z, cx - lake.x);
  const [a3, p3, a5, p5] = lake.wobble;
  return lake.r * (1 + a3 * Math.sin(3 * a + p3) + a5 * Math.sin(5 * a + p5));
}

/** Signed blocks to the nearest water edge (negative in the water), Infinity when no water is near. */
function waterDistance(plan: OutlandPlan, cx: number, cz: number): number {
  let best = Infinity;
  for (const id of plan.grid.water.at(cx, cz)) {
    if (id < 0) {
      const lake = plan.lakes[-id - 1];
      if (!lake) continue;
      const d = Math.hypot(cx - lake.x, cz - lake.z) - lakeRadius(lake, cx, cz);
      if (d < best) best = d;
      continue;
    }
    const river = plan.rivers[Math.floor(id / SEGMENTS)];
    if (!river) continue;
    const i = id % SEGMENTS;
    const p = river.pts;
    const d = segDist(cx, cz, p[2 * i] ?? 0, p[2 * i + 1] ?? 0, p[2 * i + 2] ?? 0, p[2 * i + 3] ?? 0);
    const half = (river.half[i] ?? 0) * (1 - segT) + (river.half[i + 1] ?? 0) * segT;
    if (d - half < best) best = d - half;
  }
  return best;
}

interface PreRoad {
  h: number;
  /** waterDistance at the column. */
  wd: number;
  /** Within the seam of a core edge that is water. */
  seamWater: boolean;
  /** On a village's level pad (roads do not reshape it). */
  pad: boolean;
  /** On a village's pad or the slope round it: its yards and lanes are grass, never rock. */
  village: boolean;
}

/** The land with its water, village pads and the seam with the core, before the roads are laid on it. */
function preRoad(plan: OutlandPlan, cx: number, cz: number, out: PreRoad): PreRoad {
  const wl = plan.waterLevel;
  let h = naturalHeight(plan, cx - 0.5, cz - 0.5);
  const wd = waterDistance(plan, cx, cz);
  if (wd < 0) h = wd < -2.5 ? wl - 3 : wl - 2;
  else if (wd < 1) h = Math.min(h, wl);
  else h = Math.min(h, wl + 1 + Math.max(0, wd - 2.5) * VALLEY_SLOPE);
  out.pad = false;
  out.village = false;
  for (const id of plan.grid.villages.at(cx, cz)) {
    const v = plan.villages[id];
    if (!v) continue;
    const dv = Math.hypot(cx - v.x, cz - v.z) - v.radius;
    if (dv <= 0) out.pad = true;
    if (dv < PAD_BLEND) out.village = true;
    if (dv < PAD_BLEND) {
      const k = smoothstep(0, PAD_BLEND, dv);
      h = v.pad * (1 - k) + h * k;
    }
  }
  out.seamWater = false;
  const d = coreDistance(plan, cx, cz);
  if (d < SEAM) {
    const e = edgeHeight(plan, cx, cz, d);
    const k = smoothstep(0, SEAM, d);
    h = e * (1 - k) + h * k;
    out.seamWater = e < wl;
  }
  out.h = h;
  out.wd = wd;
  return out;
}

/** The nearest road's distance and height at a point (scratch of the last `nearestRoad`). */
const roadHit = { d: Infinity, h: 0, road: -1 };
function nearestRoad(plan: OutlandPlan, cx: number, cz: number): typeof roadHit {
  roadHit.d = Infinity;
  roadHit.h = 0;
  roadHit.road = -1;
  for (const id of plan.grid.roads.at(cx, cz)) {
    const r = Math.floor(id / SEGMENTS);
    const road = plan.roads[r];
    if (!road) continue;
    const i = id % SEGMENTS;
    const p = road.pts;
    const d = segDist(cx, cz, p[2 * i] ?? 0, p[2 * i + 1] ?? 0, p[2 * i + 2] ?? 0, p[2 * i + 3] ?? 0);
    if (d < roadHit.d) {
      roadHit.d = d;
      roadHit.h = (road.profile[i] ?? 0) * (1 - segT) + (road.profile[i + 1] ?? 0) * segT;
      roadHit.road = r;
    }
  }
  return roadHit;
}

/** Blocks from a point to the nearest road's middle line (Infinity when no road is within ~9 blocks). */
export function roadDistance(plan: OutlandPlan, cx: number, cz: number): number {
  return nearestRoad(plan, cx, cz).d;
}

/** Column flags of `ColumnSample`. */
export const WATER = 1;
export const ROAD = 2;
/** Sand: low ground by the water. */
export const SHORE = 4;
/** A bridge's railing (on water beside a deck). */
export const RAIL = 8;
/** A village's ground: grass, whatever the height (trees may still stand there). */
export const VILLAGE = 16;

export interface ColumnSample {
  /** y of the top ground block (the bed under water). */
  ground: number;
  /** y of a bridge's deck (on a road over water) or of the deck a railing stands on; -1 when none. */
  deck: number;
  flags: number;
}

const prScratch: PreRoad = { h: 0, wd: 0, seamWater: false, pad: false, village: false };

/** Everything the blocks of a column follow: its ground, whether it is water, road, shore or bridge. */
export function sampleColumn(plan: OutlandPlan, x: number, z: number, out: ColumnSample): ColumnSample {
  const cx = x + 0.5;
  const cz = z + 0.5;
  const wl = plan.waterLevel;
  const pre = preRoad(plan, cx, cz, prScratch);
  const preGround = Math.round(pre.h);
  const road = nearestRoad(plan, cx, cz);
  out.flags = 0;
  out.deck = -1;
  if (road.d <= ROAD_HALF) {
    const top = Math.round(Math.max(road.h, wl + 1));
    out.flags = ROAD;
    if (preGround < wl) {
      out.flags |= WATER;
      out.deck = top;
      out.ground = preGround;
    } else out.ground = top;
    return out;
  }
  let h = pre.h;
  if (preGround >= wl && !pre.pad && road.d < ROAD_HALF + ROAD_BLEND) {
    const k = smoothstep(ROAD_HALF, ROAD_HALF + ROAD_BLEND, road.d);
    h = road.h * (1 - k) + h * k;
  }
  out.ground = Math.round(h);
  if (out.ground < wl) {
    out.flags = WATER;
    if (road.d <= ROAD_HALF + 1.2) {
      out.flags |= RAIL;
      out.deck = Math.round(Math.max(road.h, wl + 1));
    }
  } else if (out.ground <= wl + 1 && (pre.wd < 3.5 || pre.seamWater)) out.flags = SHORE;
  else if (pre.village) out.flags = VILLAGE;
  return out;
}

const groundScratch: ColumnSample = { ground: 0, deck: -1, flags: 0 };

/**
 * y of the top solid ground block of a column of the outer land (not a tree, house or prop). Below
 * `waterLevel` the column is water from there up to `waterLevel` (the core maps' convention, zone-map.ts);
 * on a bridge it is the deck's y, the surface a walker stands on over the water.
 */
export function outlandGround(plan: OutlandPlan, x: number, z: number): number {
  const s = sampleColumn(plan, x, z, groundScratch);
  return s.deck >= 0 && (s.flags & ROAD) !== 0 ? s.deck : s.ground;
}

/** The field a column lies in, or -1. */
export function fieldAt(plan: OutlandPlan, x: number, z: number): number {
  for (const id of plan.grid.fields.at(x + 0.5, z + 0.5)) {
    const f = plan.fields[id];
    if (f && x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) return id;
  }
  return -1;
}

/** The top block of a land column (not water): road, sand, a field's rows, rock high up, snow on the tops, grass. */
export function surfaceBlock(plan: OutlandPlan, x: number, z: number, s: ColumnSample): OutlandBlockName {
  if (s.flags & ROAD) return 'path';
  if (s.flags & SHORE) return 'sand';
  if (s.flags & VILLAGE) return 'grass';
  const f = plan.fields[fieldAt(plan, x, z)];
  if (f) {
    if (f.kind === 'paddy') return (x - f.x0) % 6 === 0 || (z - f.z0) % 6 === 0 || x === f.x1 || z === f.z1 ? 'dirt' : 'grass';
    if (f.kind === 'crop') return (f.x1 - f.x0 >= f.z1 - f.z0 ? z - f.z0 : x - f.x0) % 2 === 0 ? 'dirt' : 'grass';
    return 'grass';
  }
  if (s.ground >= OUTLAND_MAX_GROUND - 1) return 'snow';
  if (s.ground >= plan.spec.ground + plan.look.rockAbove) {
    const n = valueNoise(plan.seeds.rock, x / 5, z / 5);
    if (n > 0.8) return 'stone';
    if (n > 0.58) return 'rock-moss';
  }
  return 'grass';
}

// ---------------------------------------------------------------------------------------------------------
// Buildings and trees as blocks. Both draw column by column inside a clip rectangle, so a region draws its
// part and the skyline draws one column with the same code.

export type PutBlock = (x: number, y: number, z: number, block: OutlandBlockName) => void;

/** Columns a structure's blocks occupy (inclusive): a roof or an awning overhangs its walls by one. */
export function structureExtent(s: Structure): [number, number, number, number] {
  return s.kind === 'well' ? [s.x0, s.z0, s.x1, s.z1] : [s.x0 - 1, s.z0 - 1, s.x1 + 1, s.z1 + 1];
}

/** Draws the part of a structure inside the clip rectangle (inclusive). */
export function drawStructure(s: Structure, put: PutBlock, cx0: number, cz0: number, cx1: number, cz1: number): void {
  const [ex0, ez0, ex1, ez1] = structureExtent(s);
  const x0 = Math.max(ex0, cx0);
  const x1 = Math.min(ex1, cx1);
  const z0 = Math.max(ez0, cz0);
  const z1 = Math.min(ez1, cz1);
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      if (s.kind === 'house') houseColumn(s, put, x, z);
      else if (s.kind === 'stall') stallColumn(s, put, x, z);
      else wellColumn(s, put, x, z);
    }
  }
}

/**
 * One column of a house: plank floor, walls with log corners, a two-wide door on the door side, glass
 * windows, a gable roof one step higher per row towards the ridge, the gable ends filled with wall.
 */
function houseColumn(s: Structure, put: PutBlock, x: number, z: number): void {
  const [u, v, u0, u1, v0, v1] = s.ridgeX ? [x, z, s.x0, s.x1, s.z0, s.z1] : [z, x, s.z0, s.z1, s.x0, s.x1];
  const inU = u >= u0 && u <= u1;
  const inV = v >= v0 && v <= v1;
  if (u > u0 && u < u1 && v > v0 && v < v1) put(x, s.base - 1, z, 'planks');
  const top = s.base + s.wallH;
  if (inU && inV && (u === u0 || u === u1 || v === v0 || v === v1)) {
    const corner = (u === u0 || u === u1) && (v === v0 || v === v1);
    const doorV = s.door === 'north' || s.door === 'west' ? v0 : v1;
    const um = Math.floor((u0 + u1 + 1) / 2);
    const doorCol = v === doorV && (u === um || u === um - 1);
    for (let y = s.base; y < top; y++) {
      if (doorCol && y < s.base + 2) continue;
      const windowRow = y === s.base + 1 && !corner && !doorCol;
      const window = windowRow && (v === v0 || v === v1 ? (u - u0) % 3 === 1 : (v - v0) % 3 === 1);
      put(x, y, z, corner ? 'log' : window ? 'glass' : s.wall);
    }
  }
  const step = Math.min(v - (v0 - 1), v1 + 1 - v);
  const roofY = top + step;
  if ((u === u0 || u === u1) && inV && step > 0) for (let y = top; y < roofY; y++) put(x, y, z, s.wall);
  put(x, roofY, z, s.roof);
}

/** One column of a stall: four log posts, a plank counter on its front, a striped awning over it. */
function stallColumn(s: Structure, put: PutBlock, x: number, z: number): void {
  const post = (x === s.x0 || x === s.x1) && (z === s.z0 || z === s.z1);
  if (post) for (let y = s.base; y < s.base + 3; y++) put(x, y, z, 'log');
  const front = s.door === 'north' ? z === s.z0 : s.door === 'south' ? z === s.z1 : s.door === 'west' ? x === s.x0 : x === s.x1;
  if (front && !post && x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) put(x, s.base, z, 'planks');
  const stripe = (s.door === 'north' || s.door === 'south' ? x : z) % 2 === 0;
  put(x, s.base + 3, z, stripe ? s.roof : 'sand');
}

/** One column of a well: a stone ring with water inside, two log posts and a plank beam over it. */
function wellColumn(s: Structure, put: PutBlock, x: number, z: number): void {
  const mx = s.x0 + 1;
  const mz = s.z0 + 1;
  put(x, s.base, z, x === mx && z === mz ? 'water' : 'brick-grey');
  const beam = s.ridgeX ? z === mz : x === mx;
  const postCol = beam && (s.ridgeX ? x !== mx : z !== mz);
  if (postCol) for (let y = s.base + 1; y <= s.base + 2; y++) put(x, y, z, 'log');
  if (beam) put(x, s.base + 3, z, 'planks');
}

export interface Tree {
  x: number;
  z: number;
  /** Ground under the trunk. */
  ground: number;
  trunk: number;
  log: OutlandBlockName;
  leaves: OutlandBlockName;
}

/**
 * Draws a tree's part inside the clip rectangle: the trunk, then a crown of two wide layers (corners
 * trimmed by a hash, never by a random sequence, so the tree is the same from any side) and two narrow
 * ones. `put` is told which blocks are leaves: those go only into air.
 */
export function drawTree(plan: OutlandPlan, t: Tree, put: (x: number, y: number, z: number, block: OutlandBlockName, leaf: boolean) => void, cx0: number, cz0: number, cx1: number, cz1: number): void {
  const top = t.ground + t.trunk;
  for (let x = Math.max(t.x - CROWN, cx0); x <= Math.min(t.x + CROWN, cx1); x++) {
    for (let z = Math.max(t.z - CROWN, cz0); z <= Math.min(t.z + CROWN, cz1); z++) {
      const dx = Math.abs(x - t.x);
      const dz = Math.abs(z - t.z);
      if (dx === 0 && dz === 0) for (let y = t.ground + 1; y <= top; y++) put(x, y, z, t.log, false);
      const corner2 = dx === 2 && dz === 2;
      if (!corner2 || hash01(plan.seeds.tree, x, z, 7) < 0.45) put(x, top - 1, z, t.leaves, true);
      if (!corner2) put(x, top, z, t.leaves, true);
      if (dx <= 1 && dz <= 1) put(x, top + 1, z, t.leaves, true);
      if (dx + dz <= 1) put(x, top + 2, z, t.leaves, true);
    }
  }
}

const treeSample: ColumnSample = { ground: 0, deck: -1, flags: 0 };

/** A source of ground for a tree's trunk (a region's cached columns), else the column is sampled. */
export type GroundCache = (x: number, z: number) => ColumnSample | undefined;

/** Woods come and go: the density of trees round a point. */
function treeDensity(plan: OutlandPlan, x: number, z: number): number {
  return clamp(plan.look.forest + fbm(plan.seeds.density, x / 240, z / 240, 2) * 0.9, 0.02, 0.85);
}

/** Whether a trunk may stand at a column: off the roads, the villages, the fields, the clearings and the water. */
function treeRoom(plan: OutlandPlan, x: number, z: number): boolean {
  const cx = x + 0.5;
  const cz = z + 0.5;
  const b = plan.bounds;
  if (x < b.x0 + CROWN || z < b.z0 + CROWN || x >= b.x1 - CROWN || z >= b.z1 - CROWN) return false;
  if (coreDistance(plan, cx, cz) < CORE_CLEAR) return false;
  for (const id of plan.grid.villages.at(cx, cz)) {
    const v = plan.villages[id];
    if (v && Math.hypot(cx - v.x, cz - v.z) < v.radius + 8) return false;
  }
  for (const id of plan.grid.clearings.at(cx, cz)) {
    const c = plan.clearings[id];
    if (c && Math.hypot(cx - c.x, cz - c.z) < c.r) return false;
  }
  for (const id of plan.grid.fields.at(cx, cz)) {
    const f = plan.fields[id];
    if (f && x >= f.x0 - 3 && x <= f.x1 + 3 && z >= f.z0 - 3 && z <= f.z1 + 3) return false;
  }
  if (roadDistance(plan, cx, cz) < ROAD_HALF + 4) return false;
  return waterDistance(plan, cx, cz) >= 3;
}

/** The tree of forest cell (ci, cj), if one grows there (into `out`). */
function forestTree(plan: OutlandPlan, ci: number, cj: number, out: Tree, cache?: GroundCache): boolean {
  const seed = plan.seeds.tree;
  const x = ci * TREE_CELL + 1 + Math.floor(hash01(seed, ci, cj, 1) * (TREE_CELL - 2));
  const z = cj * TREE_CELL + 1 + Math.floor(hash01(seed, ci, cj, 2) * (TREE_CELL - 2));
  if (hash01(seed, ci, cj, 0) >= treeDensity(plan, x, z)) return false;
  if (!treeRoom(plan, x, z)) return false;
  const s = cache?.(x, z) ?? sampleColumn(plan, x, z, treeSample);
  if ((s.flags & ~VILLAGE) !== 0 || s.ground <= plan.waterLevel || s.ground > OUTLAND_MAX_GROUND) return false;
  out.x = x;
  out.z = z;
  out.ground = s.ground;
  out.trunk = 4 + Math.floor(hash01(seed, ci, cj, 3) * 4) + plan.look.treeBonus;
  const kind = pickWeighted(plan.look.leaves, hash01(seed, ci, cj, 4));
  // The trunks the child walks through, as in the core's woods (tree-log: not solid).
  out.log = kind === 'birch' ? 'tree-birch-log' : 'tree-log';
  out.leaves = kind === 'autumn' ? 'leaves-autumn' : kind === 'pink' ? 'leaves-pink' : 'leaves';
  return true;
}

/** The trees of an orchard, in rows five blocks apart, one call of `each` per tree. */
function orchardTrees(plan: OutlandPlan, f: Field, each: (t: Tree) => void, cache?: GroundCache): void {
  const t: Tree = { x: 0, z: 0, ground: 0, trunk: 3, log: 'tree-log', leaves: f.leaves };
  for (let x = f.x0 + 2; x <= f.x1 - 2; x += 5) {
    for (let z = f.z0 + 2; z <= f.z1 - 2; z += 5) {
      const s = cache?.(x, z) ?? sampleColumn(plan, x, z, treeSample);
      if ((s.flags & ~VILLAGE) !== 0) continue;
      t.x = x;
      t.z = z;
      t.ground = s.ground;
      t.trunk = 3 + Math.floor(hash01(plan.seeds.tree, x, z, 5) * 2);
      each(t);
    }
  }
}

/**
 * Every tree whose crown can reach the rectangle (inclusive), forest cells row by row and then the orchards
 * by index: the same order whichever rectangle is asked, so where two crowns meet the same tree's leaves win.
 */
export function forEachTree(plan: OutlandPlan, x0: number, z0: number, x1: number, z1: number, each: (t: Tree) => void, cache?: GroundCache): void {
  const t: Tree = { x: 0, z: 0, ground: 0, trunk: 0, log: 'tree-log', leaves: 'leaves' };
  const i0 = Math.floor((x0 - CROWN) / TREE_CELL);
  const i1 = Math.floor((x1 + CROWN) / TREE_CELL);
  const j0 = Math.floor((z0 - CROWN) / TREE_CELL);
  const j1 = Math.floor((z1 + CROWN) / TREE_CELL);
  for (let cj = j0; cj <= j1; cj++) {
    for (let ci = i0; ci <= i1; ci++) {
      if (!forestTree(plan, ci, cj, t, cache)) continue;
      if (t.x + CROWN < x0 || t.x - CROWN > x1 || t.z + CROWN < z0 || t.z - CROWN > z1) continue;
      each(t);
    }
  }
  for (const id of plan.grid.fields.within(x0 - CROWN, z0 - CROWN, x1 + CROWN, z1 + CROWN)) {
    const f = plan.fields[id];
    if (!f || f.kind !== 'orchard' || f.x1 + CROWN < x0 || f.x0 - CROWN > x1 || f.z1 + CROWN < z0 || f.z0 - CROWN > z1) continue;
    orchardTrees(plan, f, (tree) => {
      if (tree.x + CROWN < x0 || tree.x - CROWN > x1 || tree.z + CROWN < z0 || tree.z - CROWN > z1) return;
      each(tree);
    }, cache);
  }
}

const skyScratch: ColumnSample = { ground: 0, deck: -1, flags: 0 };

/** The tallest block of a column (a tree's crown, a roof, a bridge, the water or the ground) and its name. */
export function outlandSkyline(plan: OutlandPlan, x: number, z: number): { y: number; block: OutlandBlockName } {
  const s = sampleColumn(plan, x, z, skyScratch);
  let y: number;
  let block: OutlandBlockName;
  if (s.flags & WATER) {
    if (s.flags & ROAD) [y, block] = [s.deck, 'planks'];
    else if (s.flags & RAIL) [y, block] = [s.deck + 1, 'log'];
    else [y, block] = [plan.waterLevel, 'water'];
  } else [y, block] = [s.ground, surfaceBlock(plan, x, z, s)];
  // Buildings: the highest block they put in this column (the last one written there wins, as in a region).
  for (const id of plan.grid.structures.at(x + 0.5, z + 0.5)) {
    const st = plan.structures[id];
    if (!st) continue;
    drawStructure(st, (_x, by, _z, b) => {
      if (by >= y) [y, block] = [by, b];
    }, x, z, x, z);
  }
  // Trees: leaves go only into air, so the first tree (in the regions' order) to reach a height owns it.
  const ground = y;
  let leafY = -1;
  let leaf: OutlandBlockName = 'leaves';
  forEachTree(plan, x, z, x, z, (t) => {
    drawTree(plan, t, (_x, by, _z, b, isLeaf) => {
      if (isLeaf && by > ground && by > leafY) [leafY, leaf] = [by, b];
    }, x, z, x, z);
  });
  return leafY > y ? { y: leafY, block: leaf } : { y, block };
}

// ---------------------------------------------------------------------------------------------------------
// The layout

const VILLAGE_PREFIXES = ['Xóm', 'Làng', 'Thôn', 'Xóm', 'Làng', 'Ấp'] as const;
const THEME_PREFIXES: Readonly<Record<OutlandTheme, readonly string[]>> = {
  river: ['Làng chài'],
  forest: ['Bản'],
  school: [],
  hamlet: [],
  market: ['Chợ'],
  farm: ['Trại'],
  library: [],
  castle: [],
};
const VILLAGE_NAMES = [
  'Đồi Chè', 'Bến Đá', 'Cây Đa', 'Bãi Bồi', 'Đầm Sen', 'Gò Mít', 'Rặng Tre', 'Ao Cá', 'Đồng Lúa', 'Suối Mát', 'Cầu Tre', 'Bến Đò',
  'Giếng Đá', 'Vườn Cau', 'Đồng Cói', 'Gò Me', 'Bờ Xoan', 'Bãi Dâu', 'Đồng Ngô', 'Rừng Cọ', 'Hồ Sen', 'Gốc Gạo', 'Đình Cổ', 'Vườn Bưởi',
  'Cây Thị', 'Cánh Diều', 'Mái Rạ', 'Sông Đào', 'Đá Bạc', 'Hoa Ban', 'Gò Sim', 'Đồng Mía', 'Bến Nứa', 'Lũy Tre', 'Vườn Nhãn', 'Đồi Thông',
  'Đầm Ấu', 'Cây Si', 'Phi Lao', 'Gò Đậu', 'Khe Nước', 'Cầu Ván', 'Ngã Ba', 'Đồng Sen', 'Vườn Vải', 'Nương Sắn', 'Bãi Lau', 'Suối Đá',
  'Đồi Mua', 'Cây Me', 'Gò Thông', 'Ao Làng', 'Rừng Sim', 'Bãi Cát', 'Đồng Đỗ', 'Vườn Mận', 'Bến Củi', 'Đồi Gió', 'Cối Xay', 'Hoa Gạo',
  'Bờ Đê', 'Vườn Hồng', 'Mạ Non', 'Bãi Ngô', 'Đồng Cỏ', 'Ruộng Bậc', 'Rặng Dừa', 'Cây Khế', 'Gò Nổi', 'Đầm Vạc',
] as const;
const VIEWPOINT_NAMES = [
  'Đồi Ngắm Mây', 'Đỉnh Gió Lộng', 'Đồi Hoa Sim', 'Gò Ngắm Trăng', 'Đồi Thông Reo', 'Mỏm Đá Chim Đậu', 'Đồi Cỏ May', 'Đỉnh Nắng Sớm',
  'Đồi Bồ Công Anh', 'Gò Mây Trắng', 'Đồi Chuồn Chuồn', 'Đỉnh Cầu Vồng', 'Đồi Sao Đêm', 'Mỏm Đá Rêu', 'Đồi Lau Trắng', 'Gò Gió Hát',
] as const;

/** The same order of `items` for a seed (Fisher-Yates with the layout's random numbers). */
function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Distance from a rectangle to the core's rectangle. */
function rectCoreDistance(plan: OutlandPlan, x0: number, z0: number, x1: number, z1: number): number {
  const [sx, , sz] = plan.size;
  return Math.hypot(Math.max(0, -x1, x0 - sx), Math.max(0, -z1, z0 - sz));
}

/** Blocks from a point to any water feature (the whole layout, not just what the index holds near it). */
function waterDistanceFar(plan: OutlandPlan, x: number, z: number, within: number): number {
  let best = Infinity;
  for (const lake of plan.lakes) best = Math.min(best, Math.hypot(x - lake.x, z - lake.z) - lake.r * 1.25);
  for (const river of plan.rivers) {
    const p = river.pts;
    for (let i = 0; i < p.length; i += 2) {
      const dx = Math.abs((p[i] ?? 0) - x);
      const dz = Math.abs((p[i + 1] ?? 0) - z);
      if (dx > within + 20 || dz > within + 20) continue;
      best = Math.min(best, Math.hypot(dx, dz) - (river.half[i / 2] ?? 0) - 6);
    }
  }
  return best;
}

function registerRiver(plan: OutlandPlan, index: number): void {
  const river = plan.rivers[index];
  if (!river) return;
  const p = river.pts;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const reach = VALLEY_REACH + Math.max(river.half[i / 2] ?? 0, river.half[i / 2 + 1] ?? 0);
    const ax = p[i] ?? 0;
    const az = p[i + 1] ?? 0;
    const bx = p[i + 2] ?? 0;
    const bz = p[i + 3] ?? 0;
    plan.grid.water.add(Math.min(ax, bx) - reach, Math.min(az, bz) - reach, Math.max(ax, bx) + reach, Math.max(az, bz) + reach, index * SEGMENTS + i / 2);
  }
}

function registerLake(plan: OutlandPlan, index: number): void {
  const lake = plan.lakes[index];
  if (!lake) return;
  const reach = lake.r * 1.3 + VALLEY_REACH;
  plan.grid.water.add(lake.x - reach, lake.z - reach, lake.x + reach, lake.z + reach, -index - 1);
}

/**
 * A meandering line from a to b: the straight way bent sideways by slow noise, the bend fading at the ends
 * (`fixedEnd` false lets the far end wander). Null when it comes closer to the core than `minCore` allows.
 */
function meander(plan: OutlandPlan, ax: number, az: number, bx: number, bz: number, seed: number, wide: number, minCore: (along: number) => number, fixedEnd: boolean): River | null {
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(2, Math.ceil(len / 12));
  const ux = (bx - ax) / len;
  const uz = (bz - az) / len;
  const amp = Math.min(240, len * 0.1);
  const pts = new Float64Array((n + 1) * 2);
  const half = new Float64Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const along = (k / n) * len;
    const fade = fixedEnd ? Math.sin((Math.PI * k) / n) ** 0.6 : smoothstep(0, 150, along);
    const off = amp * fade * (valueNoise(seed, along / 420, 0.5) * 2 - 1 + 0.4 * (valueNoise(seed + 1, along / 110, 0.5) * 2 - 1));
    const x = ax + ux * along - uz * off;
    const z = az + uz * along + ux * off;
    if (coreDistance(plan, x, z) < minCore(along)) return null;
    pts[2 * k] = x;
    pts[2 * k + 1] = z;
    half[k] = 2.2 + 1.6 * valueNoise(seed + 2, along / 260, 0.5) + wide;
  }
  return { pts, half };
}

/** Point on a side of the bounds at `t` (0..1) along it. */
function boundsPoint(b: WorldBounds, side: number, t: number): [number, number] {
  if (side === 0) return [b.x0 + (b.x1 - b.x0) * t, b.z0];
  if (side === 1) return [b.x0 + (b.x1 - b.x0) * t, b.z1];
  if (side === 2) return [b.x0, b.z0 + (b.z1 - b.z0) * t];
  return [b.x1, b.z0 + (b.z1 - b.z0) * t];
}

const SIDE_NORMALS: Readonly<Record<Side, readonly [number, number]>> = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };

/** Runs of water columns along the core's edges (where the core's own water meets the outer land). */
function edgeWaterRuns(plan: OutlandPlan): Array<{ side: Side; start: number; len: number }> {
  const runs: Array<{ side: Side; start: number; len: number }> = [];
  for (const side of ['north', 'south', 'west', 'east'] as const) {
    const edge = plan.spec.edge[side];
    let start = -1;
    for (let i = 0; i <= edge.length; i++) {
      const wet = i < edge.length && (edge[i] ?? plan.spec.ground) < plan.waterLevel;
      if (wet && start < 0) start = i;
      if (!wet && start >= 0) {
        // Runs a few dry columns apart are one mouth.
        const last = runs[runs.length - 1];
        if (last && last.side === side && start - (last.start + last.len) < 4) last.len = i - last.start;
        else runs.push({ side, start, len: i - start });
        start = -1;
      }
    }
  }
  return runs;
}

/** Where on the edge line a run of a side is, and the outward normal there. */
function edgePoint(plan: OutlandPlan, side: Side, at: number): [number, number] {
  const [sx, , sz] = plan.size;
  if (side === 'north') return [at, 0];
  if (side === 'south') return [at, sz];
  if (side === 'west') return [0, at];
  return [sx, at];
}

function layWater(plan: OutlandPlan, rng: () => number, rivers: River[], lakes: Lake[]): void {
  const look = plan.look;
  const b = plan.bounds;
  const wobble = (): [number, number, number, number] => [rng() * 0.16, rng() * Math.PI * 2, rng() * 0.08, rng() * Math.PI * 2];
  // Ponds where the core's water reaches its edge: the water carries on outward and spreads.
  const runs = edgeWaterRuns(plan).filter((r) => r.len >= 3).sort((p, q) => q.len - p.len || p.start - q.start).slice(0, 8);
  const mouths: Array<{ side: Side; x: number; z: number; len: number }> = [];
  for (const run of runs) {
    const r = clamp(run.len * 0.55 + 6, 8, 34);
    const [ex, ez] = edgePoint(plan, run.side, run.start + run.len / 2);
    const [nx, nz] = SIDE_NORMALS[run.side];
    const x = ex + nx * (r * 0.5 + 2);
    const z = ez + nz * (r * 0.5 + 2);
    lakes.push({ x, z, r, wobble: wobble(), mouth: true });
    registerLake(plan, lakes.length - 1);
    mouths.push({ side: run.side, x, z, len: run.len });
  }
  // Rivers: from the widest mouths out to the edge of the world, then across the land.
  let left = look.rivers;
  for (const m of mouths.filter((mo) => mo.len >= 5).slice(0, 2)) {
    const [nx, nz] = SIDE_NORMALS[m.side];
    const startDist = coreDistance(plan, m.x, m.z);
    for (let tries = 0; tries < 12; tries++) {
      const spread = (rng() - 0.5) * 1400;
      const tx = nx !== 0 ? (nx < 0 ? b.x0 : b.x1) : clamp(m.x + spread, b.x0, b.x1);
      const tz = nz !== 0 ? (nz < 0 ? b.z0 : b.z1) : clamp(m.z + spread, b.z0, b.z1);
      const river = meander(plan, m.x, m.z, tx, tz, Math.floor(rng() * 1e9), look.riverWide, () => Math.min(startDist - 1, 140), false);
      if (!river) continue;
      rivers.push(river);
      registerRiver(plan, rivers.length - 1);
      left--;
      break;
    }
  }
  for (; left > 0; left--) {
    for (let tries = 0; tries < 40; tries++) {
      const sa = Math.floor(rng() * 4);
      const sb = rng() < 0.6 ? sa ^ 1 : (sa + 2) % 4;
      const [ax, az] = boundsPoint(b, sa, 0.08 + rng() * 0.84);
      const [bx, bz] = boundsPoint(b, sb, 0.08 + rng() * 0.84);
      if (segRectDist(ax, az, bx, bz, 0, 0, plan.size[0], plan.size[2]) < 260) continue;
      const river = meander(plan, ax, az, bx, bz, Math.floor(rng() * 1e9), look.riverWide, () => 160, true);
      if (!river) continue;
      rivers.push(river);
      registerRiver(plan, rivers.length - 1);
      break;
    }
  }
  // Lakes scattered over the land, apart from each other.
  for (let n = 0; n < look.lakes; n++) {
    for (let tries = 0; tries < 60; tries++) {
      const x = b.x0 + 150 + rng() * (b.x1 - b.x0 - 300);
      const z = b.z0 + 150 + rng() * (b.z1 - b.z0 - 300);
      const r = 12 + rng() * 24 + look.lakeBig;
      if (coreDistance(plan, x, z) < 200 + r) continue;
      if (lakes.some((l) => Math.hypot(l.x - x, l.z - z) < l.r + r + 40)) continue;
      lakes.push({ x, z, r, wobble: wobble(), mouth: false });
      registerLake(plan, lakes.length - 1);
      break;
    }
  }
}

/** Natural heights at the centres of COARSE-block cells over the bounds (the layout reads the land from them). */
interface Coarse {
  nx: number;
  nz: number;
  h: Float32Array;
  x: (i: number) => number;
  z: (j: number) => number;
}

function coarseHeights(plan: OutlandPlan): Coarse {
  const b = plan.bounds;
  const nx = Math.floor((b.x1 - b.x0) / COARSE);
  const nz = Math.floor((b.z1 - b.z0) / COARSE);
  const h = new Float32Array(nx * nz);
  const x = (i: number): number => b.x0 + COARSE / 2 + i * COARSE;
  const z = (j: number): number => b.z0 + COARSE / 2 + j * COARSE;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) h[i + j * nx] = naturalHeight(plan, x(i), z(j));
  return { nx, nz, h, x, z };
}

/** Rise and fall of the coarse heights round a cell (its 3 x 3 neighbourhood). */
function coarseRange(c: Coarse, i: number, j: number): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      if (i + di < 0 || j + dj < 0 || i + di >= c.nx || j + dj >= c.nz) return Infinity;
      const v = c.h[i + di + (j + dj) * c.nx] ?? 0;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  return hi - lo;
}

function siteVillages(plan: OutlandPlan, rng: () => number, coarse: Coarse, villages: Village[]): void {
  const look = plan.look;
  const b = plan.bounds;
  const order = shuffled(Array.from({ length: coarse.nx * coarse.nz }, (_, k) => k), rng);
  const names = shuffled(VILLAGE_NAMES, rng);
  const prefixes = [...VILLAGE_PREFIXES, ...THEME_PREFIXES[plan.spec.theme], ...THEME_PREFIXES[plan.spec.theme]];
  for (const spacing of [620, 520, 430, 350, 280]) {
    for (const k of order) {
      if (villages.length >= look.villages) return;
      const i = k % coarse.nx;
      const j = Math.floor(k / coarse.nx);
      const x = coarse.x(i) + Math.floor(rng() * 16) - 8;
      const z = coarse.z(j) + Math.floor(rng() * 16) - 8;
      if (x < b.x0 + 140 || z < b.z0 + 140 || x > b.x1 - 140 || z > b.z1 - 140) continue;
      if (coreDistance(plan, x, z) < 190) continue;
      if (villages.some((v) => Math.hypot(v.x - x, v.z - z) < spacing)) continue;
      if (coarseRange(coarse, i, j) > 5) continue;
      // Eight to sixteen homes round a pad wide enough for their yards (owner, 02/10/2026: villages felt empty).
      const homes = 8 + Math.floor(rng() * 9);
      const radius = Math.round(26 + homes * 2);
      const wd = waterDistanceFar(plan, x, z, radius + 160);
      if (wd < radius + PAD_BLEND + 10) continue;
      if (look.nearWater && villages.length < look.villages / 2 && wd > radius + 140) continue;
      const name = names[villages.length % names.length] ?? 'Đồng Xanh';
      const prefix = prefixes[Math.floor(rng() * prefixes.length)] ?? 'Xóm';
      const pad = clamp(Math.round(naturalHeight(plan, x, z)), plan.waterLevel + 2, OUTLAND_MAX_GROUND - 8);
      villages.push({ index: villages.length, name: `${prefix} ${name}`, x, z, radius, pad, homes, structures: [], fields: [] });
      plan.grid.villages.add(x - radius - PAD_BLEND - 8, z - radius - PAD_BLEND - 8, x + radius + PAD_BLEND + 8, z + radius + PAD_BLEND + 8, villages.length - 1);
    }
  }
}

/** The middle of each core side where a road leaves it: the land column nearest the middle (the core's water skipped). */
function laySides(plan: OutlandPlan, sides: SideGate[]): void {
  const [sx, , sz] = plan.size;
  for (const side of ['north', 'south', 'west', 'east'] as const) {
    const edge = plan.spec.edge[side];
    // Dry for ten columns either side: the road and its stops stand clear of the core's water.
    const dry = (i: number): boolean => i >= 12 && i < edge.length - 12 && Array.from({ length: 21 }, (_, k) => edge[i + k - 10] ?? 0).every((h) => h >= plan.waterLevel);
    const mid = Math.floor(edge.length / 2);
    let at = -1;
    for (let off = 0; off < mid && at < 0; off++) {
      if (dry(mid + off)) at = mid + off;
      else if (dry(mid - off)) at = mid - off;
    }
    if (at < 0) continue;
    const [nx, nz] = SIDE_NORMALS[side];
    const along = at + 0.5;
    const [x, z] = side === 'north' ? [along, 0] : side === 'south' ? [along, sz] : side === 'west' ? [0, along] : [sx, along];
    sides.push({ side, x, z, nx, nz, ax: Math.abs(nz), az: Math.abs(nx) });
  }
}

/** Chaikin's corner cutting, the ends kept: a bent line made smooth. */
function chaikin(pts: number[]): number[] {
  const out: number[] = [pts[0] ?? 0, pts[1] ?? 0];
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const [ax, az, bx, bz] = [pts[i] ?? 0, pts[i + 1] ?? 0, pts[i + 2] ?? 0, pts[i + 3] ?? 0];
    out.push(ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25, ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75);
  }
  out.push(pts[pts.length - 2] ?? 0, pts[pts.length - 1] ?? 0);
  return out;
}

/** Points every `step` blocks along a line (its last point kept). */
function resample(pts: readonly number[], step: number): Float64Array {
  const out: number[] = [pts[0] ?? 0, pts[1] ?? 0];
  let carry = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const [ax, az, bx, bz] = [pts[i] ?? 0, pts[i + 1] ?? 0, pts[i + 2] ?? 0, pts[i + 3] ?? 0];
    const len = Math.hypot(bx - ax, bz - az);
    let d = step - carry;
    while (d <= len) {
      out.push(ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len);
      d += step;
    }
    carry = len - (d - step);
  }
  const lx = pts[pts.length - 2] ?? 0;
  const lz = pts[pts.length - 1] ?? 0;
  if (Math.hypot(lx - (out[out.length - 2] ?? 0), lz - (out[out.length - 1] ?? 0)) > 0.5) out.push(lx, lz);
  return Float64Array.from(out);
}

/** A road's line from a to b, gently bent (Chaikin-smoothed), or straight when `bend` is 0. */
function roadLine(head: readonly number[], bx: number, bz: number, seed: number, bend: number): Float64Array {
  const ax = head[head.length - 2] ?? 0;
  const az = head[head.length - 1] ?? 0;
  const len = Math.hypot(bx - ax, bz - az);
  const parts = Math.max(1, Math.round(len / 90));
  const amp = Math.min(30, len * 0.06) * bend;
  const pts: number[] = [...head];
  for (let k = 1; k <= parts; k++) {
    const t = k / parts;
    const off = k < parts ? amp * (valueNoise(seed, k * 1.7, 0.5) * 2 - 1) : 0;
    pts.push(ax + (bx - ax) * t - ((bz - az) / len) * off, az + (bz - az) * t + ((bx - ax) / len) * off);
  }
  return resample(chaikin(chaikin(pts)), ROAD_STEP);
}

/**
 * The height along a road: the land under it with valleys filled and hills cut, half each, to a slope of
 * at most ROAD_SLOPE per block (the mean of the largest such profile below the land and the smallest above
 * it, both exact), in whole blocks with its small bumps levelled, never under a bridge's deck one block over
 * the water.
 */
function roadProfile(plan: OutlandPlan, pts: Float64Array): Float64Array {
  const n = pts.length / 2;
  const land = new Float64Array(n);
  const pre: PreRoad = { h: 0, wd: 0, seamWater: false, pad: false, village: false };
  const wl = plan.waterLevel;
  for (let i = 0; i < n; i++) {
    const h = preRoad(plan, pts[2 * i] ?? 0, pts[2 * i + 1] ?? 0, pre).h;
    land[i] = Math.round(h) < wl ? wl + 1 : h;
  }
  const gap = (i: number): number => ROAD_SLOPE * Math.hypot((pts[2 * i + 2] ?? 0) - (pts[2 * i] ?? 0), (pts[2 * i + 3] ?? 0) - (pts[2 * i + 1] ?? 0));
  const cut = Float64Array.from(land);
  const fill = Float64Array.from(land);
  for (let i = 1; i < n; i++) {
    cut[i] = Math.min(cut[i] ?? 0, (cut[i - 1] ?? 0) + gap(i - 1));
    fill[i] = Math.max(fill[i] ?? 0, (fill[i - 1] ?? 0) - gap(i - 1));
  }
  for (let i = n - 2; i >= 0; i--) {
    cut[i] = Math.min(cut[i] ?? 0, (cut[i + 1] ?? 0) + gap(i));
    fill[i] = Math.max(fill[i] ?? 0, (fill[i + 1] ?? 0) - gap(i));
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.round(Math.max(((cut[i] ?? 0) + (fill[i] ?? 0)) / 2, wl + 1)));
  // In whole blocks, the rolling land's one-block bumps and dips levelled: the road runs level and climbs only
  // over the hills (owner, 03/10/2026: the ways flat).
  return Float64Array.from(levelProfile(out, ROAD_LEVELLING), (h) => Math.max(h, wl + 1));
}

function layRoads(plan: OutlandPlan, rng: () => number, roads: Road[]): void {
  const [sx, , sz] = plan.size;
  // The network's nodes: the villages, then a point straight out from the middle of each core side.
  const nodes: Array<{ x: number; z: number; end: RoadEnd; gate?: SideGate }> = [
    ...plan.villages.map((v) => ({ x: v.x, z: v.z, end: { kind: 'village', village: v.index } as const })),
    ...plan.sides.map((g) => ({ x: g.x + g.nx * 32, z: g.z + g.nz * 32, end: { kind: 'side', side: g.side } as const, gate: g })),
  ];
  const villages = plan.villages.length;
  /** A straight way clear of the core and the lakes (a pond at the core's edge may be bridged near its rim). */
  const clear = (ax: number, az: number, bx: number, bz: number, core: number): boolean =>
    segRectDist(ax, az, bx, bz, 0, 0, sx, sz) >= core && plan.lakes.every((l) => segDist(l.x, l.z, ax, az, bx, bz) > (l.mouth ? l.r + 2 : l.r * 1.3 + 6));
  /** Whether two nodes may be joined: villages directly, a side's point only outward to a village. */
  const joinable = (i: number, j: number): boolean => {
    const a = nodes[i];
    const b = nodes[j];
    if (!a || !b || (a.gate && b.gate)) return false;
    const gate = a.gate ?? b.gate;
    if (!gate) return clear(a.x, a.z, b.x, b.z, 40);
    const v = a.gate ? b : a;
    return (v.x - gate.x) * gate.nx + (v.z - gate.z) * gate.nz > 0 && clear(a.x, a.z, b.x, b.z, 24);
  };
  const edges: Array<[number, number]> = [];
  const crossesAny = (i: number, j: number): boolean => {
    const a = nodes[i];
    const b = nodes[j];
    return !a || !b || edges.some(([p, q]) => {
      const c = nodes[p];
      const d = nodes[q];
      return c !== undefined && d !== undefined && segsCross(a.x, a.z, b.x, b.z, c.x, c.z, d.x, d.z);
    });
  };
  const dist = (i: number, j: number): number => Math.hypot((nodes[i]?.x ?? 0) - (nodes[j]?.x ?? 0), (nodes[i]?.z ?? 0) - (nodes[j]?.z ?? 0));
  // A spanning tree over every node (Prim): its ways never cross, and each core side joins the nearest villages.
  const inTree = new Set<number>(nodes.length > 0 ? [0] : []);
  while (inTree.size < nodes.length) {
    let best: [number, number, number] | null = null;
    for (const i of inTree) {
      for (let j = 0; j < nodes.length; j++) {
        if (inTree.has(j)) continue;
        const d = dist(i, j);
        if ((!best || d < best[2]) && joinable(i, j)) best = [i, j, d];
      }
    }
    if (!best) break; // the rest cannot be reached without crossing the core or a lake: villages keep their rides
    edges.push([best[0], best[1]]);
    inTree.add(best[1]);
  }
  // A few shorter loops between villages, never crossing a way or meeting one at a sharp angle.
  const angleOk = (at: number, other: number, to: number): boolean => {
    const [a, b, c] = [nodes[at], nodes[other], nodes[to]];
    if (!a || !b || !c) return false;
    const cos = ((b.x - a.x) * (c.x - a.x) + (b.z - a.z) * (c.z - a.z)) / (Math.hypot(b.x - a.x, b.z - a.z) * Math.hypot(c.x - a.x, c.z - a.z));
    return cos < Math.cos((35 * Math.PI) / 180);
  };
  let extras = Math.floor(villages / 3);
  for (let a = 0; a < villages && extras > 0; a++) {
    const near = Array.from({ length: villages }, (_, j) => j).filter((j) => j !== a).sort((p, q) => dist(a, p) - dist(a, q));
    const first = near[0];
    if (first === undefined) continue;
    const limit = dist(a, first) * 1.5;
    for (const b of near.slice(0, 4)) {
      if (dist(a, b) > limit) break;
      if (edges.some(([p, q]) => (p === a && q === b) || (p === b && q === a))) continue;
      if (!joinable(a, b) || crossesAny(a, b)) continue;
      const atA = edges.filter(([p, q]) => p === a || q === a).every(([p, q]) => angleOk(a, p === a ? q : p, b));
      const atB = edges.filter(([p, q]) => p === b || q === b).every(([p, q]) => angleOk(b, p === b ? q : p, a));
      if (!atA || !atB) continue;
      edges.push([a, b]);
      extras--;
      break;
    }
  }
  const lines: Array<{ pts: Float64Array; from: RoadEnd; to: RoadEnd }> = [];
  /** Keeps the bent line if it stays clear of the core and the lakes, else the straight one. */
  const settle = (head: readonly number[], bx: number, bz: number, seed: number, skipCore: number): Float64Array => {
    const bent = roadLine(head, bx, bz, seed, 1);
    const ok = (pts: Float64Array): boolean => {
      for (let i = 0; i < pts.length; i += 2) {
        const x = pts[i] ?? 0;
        const z = pts[i + 1] ?? 0;
        if (i / 2 >= skipCore && coreDistance(plan, x, z) < 24) return false;
        if (plan.lakes.some((l) => !l.mouth && Math.hypot(x - l.x, z - l.z) < lakeRadius(l, x, z) + 4)) return false;
      }
      return true;
    };
    return ok(bent) ? bent : roadLine(head, bx, bz, seed, 0);
  };
  // A side's first way starts on the core's edge and runs straight out to its point; the others start there.
  const leftSide = new Set<number>();
  for (const [p, q] of edges) {
    const [i, j] = nodes[q]?.gate ? [q, p] : [p, q];
    const a = nodes[i];
    const b = nodes[j];
    if (!a || !b) continue;
    const seed = Math.floor(rng() * 1e9);
    if (a.gate && !leftSide.has(i)) {
      leftSide.add(i);
      lines.push({ pts: settle([a.gate.x, a.gate.z, a.x, a.z], b.x, b.z, seed, 12), from: a.end, to: b.end });
    } else lines.push({ pts: settle([a.x, a.z], b.x, b.z, seed, 0), from: a.end, to: b.end });
  }
  for (const line of lines) {
    const index = roads.length;
    roads.push({ ...line, profile: new Float64Array(0) });
    const p = line.pts;
    const reach = ROAD_HALF + ROAD_BLEND + 2;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const [ax, az, bx, bz] = [p[i] ?? 0, p[i + 1] ?? 0, p[i + 2] ?? 0, p[i + 3] ?? 0];
      plan.grid.roads.add(Math.min(ax, bx) - reach, Math.min(az, bz) - reach, Math.max(ax, bx) + reach, Math.max(az, bz) + reach, index * SEGMENTS + i / 2);
    }
  }
  // Profiles last: a road's height never depends on another road.
  for (let i = 0; i < roads.length; i++) {
    const road = roads[i];
    if (road) roads[i] = { ...road, profile: roadProfile(plan, road.pts) };
  }
}

/** Distance from a rectangle (inclusive columns) to the nearest road's middle line. */
function rectRoadDistance(plan: OutlandPlan, x0: number, z0: number, x1: number, z1: number): number {
  let best = Infinity;
  for (const id of plan.grid.roads.within(x0, z0, x1 + 1, z1 + 1)) {
    const road = plan.roads[Math.floor(id / SEGMENTS)];
    if (!road) continue;
    const i = id % SEGMENTS;
    const p = road.pts;
    best = Math.min(best, segRectDist(p[2 * i] ?? 0, p[2 * i + 1] ?? 0, p[2 * i + 2] ?? 0, p[2 * i + 3] ?? 0, x0, z0, x1 + 1, z1 + 1));
  }
  return best;
}

/** Roads lie this far from any building (roads do not reshape a pad, so the ground under it stays level). */
const BUILD_CLEAR = ROAD_HALF + 2;

function buildVillages(plan: OutlandPlan, rng: () => number, structures: Structure[]): void {
  const roofs: readonly OutlandBlockName[] = ['brick-red', 'roof-blue', 'wood-red'];
  for (const v of plan.villages) {
    const taken: Array<[number, number, number, number]> = [];
    const free = (x0: number, z0: number, x1: number, z1: number): boolean => taken.every(([a, b, c, d]) => x1 < a || x0 > c || z1 < b || z0 > d);
    const inside = (x0: number, z0: number, x1: number, z1: number, margin: number): boolean =>
      [[x0, z0], [x1 + 1, z0], [x0, z1 + 1], [x1 + 1, z1 + 1]].every(([x = 0, z = 0]) => Math.hypot(x - v.x, z - v.z) <= v.radius - margin);
    const add = (s: Structure, occupied: [number, number, number, number]): void => {
      structures.push(s);
      v.structures.push(structures.length - 1);
      taken.push(occupied);
      // Indexed a little wider than it is, so a column next to it finds it too.
      const [ex0, ez0, ex1, ez1] = structureExtent(s);
      plan.grid.structures.add(ex0 - 2, ez0 - 2, ex1 + 3, ez1 + 3, structures.length - 1);
    };
    const facing = (x: number, z: number): { ridgeX: boolean; door: Side } => {
      const dx = v.x - x;
      const dz = v.z - z;
      return Math.abs(dz) >= Math.abs(dx) ? { ridgeX: true, door: dz < 0 ? 'north' : 'south' } : { ridgeX: false, door: dx < 0 ? 'west' : 'east' };
    };
    // The well and the stalls first, near the middle where people gather.
    const stalls = plan.spec.theme === 'market' ? 3 : rng() < 0.6 ? 1 : 0;
    const smalls: StructureKind[] = ['well', ...Array.from({ length: stalls }, (): StructureKind => 'stall')];
    for (const kind of smalls) {
      for (let tries = 0; tries < 16; tries++) {
        const a = rng() * Math.PI * 2;
        const r = 11 + rng() * 6;
        const cx = Math.round(v.x + Math.cos(a) * r);
        const cz = Math.round(v.z + Math.sin(a) * r);
        const { ridgeX, door } = facing(cx, cz);
        const [w, d] = kind === 'well' ? [3, 3] : ridgeX ? [4, 3] : [3, 4];
        const x0 = cx - 1;
        const z0 = cz - 1;
        const s: Structure = { kind, village: v.index, x0, z0, x1: x0 + w - 1, z1: z0 + d - 1, base: v.pad + 1, wallH: 3, ridgeX, door, wall: 'planks', roof: roofs[Math.floor(rng() * 3)] ?? 'brick-red' };
        const [ex0, ez0, ex1, ez1] = structureExtent(s);
        if (!inside(ex0, ez0, ex1, ez1, 3) || !free(ex0 - 3, ez0 - 3, ex1 + 3, ez1 + 3) || rectRoadDistance(plan, ex0, ez0, ex1, ez1) < BUILD_CLEAR) continue;
        add(s, [ex0 - 2, ez0 - 2, ex1 + 2, ez1 + 2]);
        break;
      }
    }
    // Houses on a jittered grid over the pad, nearest the middle first, doors towards the middle.
    const spots: Array<[number, number]> = [];
    for (let gx = -v.radius; gx <= v.radius; gx += 6) for (let gz = -v.radius; gz <= v.radius; gz += 6) spots.push([Math.round(v.x + gx + (rng() - 0.5) * 4), Math.round(v.z + gz + (rng() - 0.5) * 4)]);
    spots.sort((p, q) => Math.hypot(p[0] - v.x, p[1] - v.z) - Math.hypot(q[0] - v.x, q[1] - v.z));
    let homes = 0;
    for (const [cx, cz] of spots) {
      if (homes >= v.homes) break;
      if (Math.hypot(cx - v.x, cz - v.z) < 9) continue;
      const { ridgeX, door } = facing(cx, cz);
      const along = 7 + 2 * Math.floor(rng() * 3);
      const across = 6 + Math.floor(rng() * 2);
      const [w, d] = ridgeX ? [along, across] : [across, along];
      const x0 = Math.round(cx - w / 2);
      const z0 = Math.round(cz - d / 2);
      const s: Structure = {
        kind: 'house', village: v.index, x0, z0, x1: x0 + w - 1, z1: z0 + d - 1, base: v.pad + 1, wallH: 3 + Math.floor(rng() * 2), ridgeX, door,
        wall: plan.look.walls[Math.floor(rng() * plan.look.walls.length)] ?? 'planks', roof: roofs[Math.floor(rng() * roofs.length)] ?? 'brick-red',
      };
      const [ex0, ez0, ex1, ez1] = structureExtent(s);
      // A path's width round it, and a yard three blocks deeper before its door.
      const yard: [number, number, number, number] = [
        ex0 - 2 - (door === 'west' ? 3 : 0), ez0 - 2 - (door === 'north' ? 3 : 0), ex1 + 2 + (door === 'east' ? 3 : 0), ez1 + 2 + (door === 'south' ? 3 : 0),
      ];
      if (!inside(ex0, ez0, ex1, ez1, 2) || !free(...yard) || rectRoadDistance(plan, ex0, ez0, ex1, ez1) < BUILD_CLEAR) continue;
      add(s, yard);
      homes++;
    }
  }
}

function layFields(plan: OutlandPlan, rng: () => number, fields: Field[]): void {
  const look = plan.look;
  const b = plan.bounds;
  const pre: PreRoad = { h: 0, wd: 0, seamWater: false, pad: false, village: false };
  const orchardLeaves: readonly OutlandBlockName[] = look.leaves.pink > 1 ? ['leaves-pink', 'leaves', 'leaves-pink'] : ['leaves', 'leaves-pink', 'leaves-autumn'];
  for (const v of plan.villages) {
    const count = look.fields[0] + Math.floor(rng() * (look.fields[1] - look.fields[0] + 1));
    for (let n = 0; n < count; n++) {
      for (let tries = 0; tries < 14; tries++) {
        const kind = pickWeighted(look.fieldKinds, rng());
        const a = rng() * Math.PI * 2;
        const dist = v.radius + 14 + rng() * 45;
        const w = 16 + Math.floor(rng() * 18);
        const d = 12 + Math.floor(rng() * 14);
        const x0 = Math.round(v.x + Math.cos(a) * dist - w / 2);
        const z0 = Math.round(v.z + Math.sin(a) * dist - d / 2);
        const [x1, z1] = [x0 + w - 1, z0 + d - 1];
        if (x0 < b.x0 + 20 || z0 < b.z0 + 20 || x1 > b.x1 - 20 || z1 > b.z1 - 20) continue;
        if (rectCoreDistance(plan, x0, z0, x1 + 1, z1 + 1) < 40) continue;
        if (fields.some((f) => !(x1 + 4 < f.x0 || x0 - 4 > f.x1 || z1 + 4 < f.z0 || z0 - 4 > f.z1))) continue;
        if (plan.villages.some((o) => pointRectDist(o.x, o.z, x0, z0, x1 + 1, z1 + 1) < o.radius + 8)) continue;
        if (rectRoadDistance(plan, x0 - 1, z0 - 1, x1 + 1, z1 + 1) < ROAD_HALF + 3) continue;
        const probes: Array<[number, number]> = [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]];
        let lo = Infinity;
        let hi = -Infinity;
        let wet = false;
        for (const [px, pz] of probes) {
          const p = preRoad(plan, px + 0.5, pz + 0.5, pre);
          if (p.wd < 5) wet = true;
          lo = Math.min(lo, p.h);
          hi = Math.max(hi, p.h);
        }
        if (wet || hi - lo > 3 || lo < plan.waterLevel + 1) continue;
        fields.push({ kind, village: v.index, x0, z0, x1, z1, leaves: orchardLeaves[Math.floor(rng() * orchardLeaves.length)] ?? 'leaves' });
        v.fields.push(fields.length - 1);
        plan.grid.fields.add(x0, z0, x1 + 1, z1 + 1, fields.length - 1);
        break;
      }
    }
  }
}

function layClearings(plan: OutlandPlan, rng: () => number, coarse: Coarse, clearings: Clearing[]): void {
  const look = plan.look;
  const b = plan.bounds;
  const pre: PreRoad = { h: 0, wd: 0, seamWater: false, pad: false, village: false };
  const add = (c: Clearing): void => {
    clearings.push(c);
    plan.grid.clearings.add(c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r, clearings.length - 1);
  };
  // The ride stops at each core side, either side of its road.
  for (const g of plan.sides) add({ kind: 'stops', x: g.x + g.nx * 12, z: g.z + g.nz * 12, r: 18, name: '', lake: -1 });
  /** Open ground for a scene: dry, level enough, off the roads and away from villages and other clearings. */
  const open = (x: number, z: number, r: number, spacing: number): boolean => {
    if (x < b.x0 + 60 || z < b.z0 + 60 || x > b.x1 - 60 || z > b.z1 - 60) return false;
    if (coreDistance(plan, x, z) < 140) return false;
    if (plan.villages.some((v) => Math.hypot(v.x - x, v.z - z) < v.radius + 90)) return false;
    if (clearings.some((c) => Math.hypot(c.x - x, c.z - z) < spacing)) return false;
    if (plan.fields.some((f) => pointRectDist(x, z, f.x0, f.z0, f.x1 + 1, f.z1 + 1) < r + 4)) return false;
    let lo = Infinity;
    let hi = -Infinity;
    for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]] as const) {
      const p = preRoad(plan, x + dx, z + dz, pre);
      if (p.wd < 4 || roadDistance(plan, x + dx, z + dz) < ROAD_HALF + 2) return false;
      lo = Math.min(lo, p.h);
      hi = Math.max(hi, p.h);
    }
    return hi - lo <= 3;
  };
  const at = (i: number, j: number): number => coarse.h[i + j * coarse.nx] ?? 0;
  // Viewpoints on the tops of hills.
  const tops: Array<[number, number, number]> = [];
  for (let j = 1; j < coarse.nz - 1; j++) {
    for (let i = 1; i < coarse.nx - 1; i++) {
      const h = at(i, j);
      if (h < plan.spec.ground + 4) continue;
      let peak = true;
      for (let dj = -1; dj <= 1 && peak; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && at(i + di, j + dj) > h) peak = false;
      if (peak) tops.push([coarse.x(i), coarse.z(j), h]);
    }
  }
  tops.sort((p, q) => q[2] - p[2] || p[0] - q[0] || p[1] - q[1]);
  const names = shuffled(VIEWPOINT_NAMES, rng);
  let views = 0;
  for (const [tx, tz] of tops) {
    if (views >= look.viewpoints) break;
    // The highest column near the coarse top.
    let [bx, bz, bh] = [tx, tz, -Infinity];
    for (let dx = -16; dx <= 16; dx += 4) {
      for (let dz = -16; dz <= 16; dz += 4) {
        const h = naturalHeight(plan, tx + dx, tz + dz);
        if (h > bh) [bx, bz, bh] = [tx + dx, tz + dz, h];
      }
    }
    if (!open(bx, bz, 6, 380)) continue;
    add({ kind: 'viewpoint', x: bx, z: bz, r: 7, name: names[views % names.length] ?? 'Đồi Ngắm Cảnh', lake: -1 });
    views++;
  }
  // Fishing spots on the shores of the lakes.
  let fishing = look.scenes.fishing ?? 0;
  for (const [index, lake] of plan.lakes.entries()) {
    if (fishing <= 0) break;
    if (lake.mouth) continue;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rng();
      const x = lake.x + Math.cos(a) * (lakeRadius(lake, lake.x + Math.cos(a), lake.z + Math.sin(a)) + 9);
      const z = lake.z + Math.sin(a) * (lakeRadius(lake, lake.x + Math.cos(a), lake.z + Math.sin(a)) + 9);
      if (coreDistance(plan, x, z) < 120 || clearings.some((c) => Math.hypot(c.x - x, c.z - z) < 150)) continue;
      if (plan.villages.some((v) => Math.hypot(v.x - x, v.z - z) < v.radius + 40)) continue;
      const p = preRoad(plan, x, z, pre);
      if (p.wd < 3 || p.wd > 14 || roadDistance(plan, x, z) < ROAD_HALF + 3) continue;
      add({ kind: 'fishing', x, z, r: 7, name: '', lake: index });
      fishing--;
      break;
    }
  }
  // The other small scenes on open ground: kites on hills, lookouts on rock, the rest anywhere open.
  const order = shuffled(Array.from({ length: coarse.nx * coarse.nz }, (_, k) => k), rng);
  for (const [kind, count] of Object.entries(look.scenes) as Array<[SceneKind, number]>) {
    if (kind === 'fishing') continue;
    let left = count;
    const r = kind === 'football' ? 12 : 9;
    for (const k of order) {
      if (left <= 0) break;
      const i = k % coarse.nx;
      const j = Math.floor(k / coarse.nx);
      const h = at(i, j);
      if (kind === 'kites' && h < plan.spec.ground + 3) continue;
      if (kind === 'lookout' && h < plan.spec.ground + look.rockAbove) continue;
      const x = coarse.x(i) + Math.floor(rng() * 20) - 10;
      const z = coarse.z(j) + Math.floor(rng() * 20) - 10;
      if (kind === 'teahouse' && roadDistance(plan, x, z) > ROAD_HALF + 7.5) continue;
      if (!open(x, z, r, 220)) continue;
      add({ kind, x, z, r, name: '', lake: -1 });
      left--;
    }
  }
}

function prefixSums(values: readonly number[]): Float64Array {
  const out = new Float64Array(values.length + 1);
  for (let i = 0; i < values.length; i++) out[i + 1] = (out[i] ?? 0) + (values[i] ?? 0);
  return out;
}

/** The outer land of a map: its whole layout, from which every column, region and character is derived. */
export function planOutland(spec: OutlandSpec, size: readonly [number, number, number], waterLevel: number): OutlandPlan {
  const [sx, height, sz] = size;
  if (![sx, height, sz, waterLevel].every(Number.isInteger) || sx <= 0 || sz <= 0) throw new Error(`outland: bad size ${size.join('x')} or water level ${waterLevel}`);
  if (height % 16 !== 0 || height < OUTLAND_MAX_GROUND + 14) throw new Error(`outland: world height ${height} must be a multiple of 16 and at least ${OUTLAND_MAX_GROUND + 14}`);
  for (const [side, want] of [['north', sx], ['south', sx], ['west', sz], ['east', sz]] as const) {
    if (spec.edge[side].length !== want) throw new Error(`outland: edge ${side} has ${spec.edge[side].length} heights, the core is ${want} wide`);
  }
  const bounds = OUTLAND_BOUNDS;
  const tag = (name: string): number => hashSeed(`outland:${spec.seed}:${name}`);
  const rivers: River[] = [];
  const lakes: Lake[] = [];
  const villages: Village[] = [];
  const roads: Road[] = [];
  const structures: Structure[] = [];
  const fields: Field[] = [];
  const clearings: Clearing[] = [];
  const sides: SideGate[] = [];
  const plan: OutlandPlan = {
    spec,
    size: [sx, height, sz],
    waterLevel,
    height,
    bounds,
    look: THEME_LOOKS[spec.theme],
    seeds: { roll: tag('roll'), mask: tag('mask'), hill: tag('hill'), density: tag('density'), tree: tag('tree'), rock: tag('rock') },
    rivers,
    lakes,
    villages,
    roads,
    structures,
    fields,
    clearings,
    sides,
    edgeSums: {
      north: prefixSums(spec.edge.north),
      south: prefixSums(spec.edge.south),
      west: prefixSums(spec.edge.west),
      east: prefixSums(spec.edge.east),
    },
    grid: {
      water: new FeatureBuckets(bounds),
      roads: new FeatureBuckets(bounds),
      villages: new FeatureBuckets(bounds),
      structures: new FeatureBuckets(bounds),
      fields: new FeatureBuckets(bounds),
      clearings: new FeatureBuckets(bounds),
    },
  };
  const rng = createRng(tag('layout'));
  layWater(plan, rng, rivers, lakes);
  const coarse = coarseHeights(plan);
  siteVillages(plan, rng, coarse, villages);
  laySides(plan, sides);
  layRoads(plan, rng, roads);
  buildVillages(plan, rng, structures);
  layFields(plan, rng, fields);
  layClearings(plan, rng, coarse, clearings);
  return plan;
}

// Where the characters who offer minigames stand (side quests, tools/content/side-quest-table.ts), and the
// everyday folk round them. A giver is always in the world, whichever lesson is played, so it stands where the
// child passes: on open ground beside the way network the spawn is on (or at the side of a paved square), nearest
// the place its table names (a landmark, or a column where the map names nothing), clear of every other target.
// Its company and the table's residents live round their places as everyday life (village-life.ts), so the wide
// maps have someone to meet all over (owner, 03/10/2026: "map khá rộng nhưng rất ít npc và nhiệm vụ").
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { Ambient } from '../../packages/voxel/src/world-entities';
import type { Folk, SideQuestTable } from '../content/side-quest-table';
import { animal, person, placeVillageLife, LIFE_CLEARANCE, type LifeGround, type Resident } from './village-life';

type Cell = readonly [number, number];

/** Blocks a giver stands off a way at most (Chebyshev). */
export const BESIDE_WAY = 2;
/** Blocks between a giver and any other target or stop (an npc's prompt reaches 3). */
export const GIVER_CLEARANCE = 6;
/** A ride's stop or arrival is by the way cell this close (scenery-audit.ts ON_WAY). */
const RIDE_REACH = 4;
/** Farthest a giver stands from its place (blocks); beyond, the map has no way near that place. */
const MAX_REACH = 120;

/** The ways a giver stands by: paving and trodden ways (scenery-audit.ts WAY_BLOCKS) and plank decks. */
export const NETWORK_BLOCK_NAMES = ['path', 'trail', 'cobble', 'cobble-grey', 'paver', 'asphalt', 'planks'] as const;

/**
 * The way network the spawn is on, read as scenery-audit.ts reads it: every way block with two free blocks over
 * it (a path under a gate's arch or a bridge counts), joined to its neighbours one block up or down, and a ride
 * (a bus, a boat, the forest train) joining the network its stop is by to the one its arrival is by. Returns,
 * per column (x + z * sx), the heights of its way blocks on that network.
 */
export function spawnNetwork(world: VoxelWorld, wayIds: ReadonlySet<number>, spawn: Cell, rides: ReadonlyArray<{ stop: Cell; arrival: Cell }> = []): Map<number, number[]> {
  const [sx, sy, sz] = world.size;
  // Column c holds its way cells' heights from first[c] to first[c + 1] in ys.
  const first = new Int32Array(sx * sz + 1);
  const ys: number[] = [];
  for (let c = 0; c < sx * sz; c++) {
    first[c] = ys.length;
    const [x, z] = [c % sx, Math.floor(c / sx)];
    for (let y = 1; y < sy - 2; y++) if (wayIds.has(world.get(x, y, z)) && world.get(x, y + 1, z) === 0 && world.get(x, y + 2, z) === 0) ys.push(y);
  }
  first[sx * sz] = ys.length;
  const columnOf = new Int32Array(ys.length);
  for (let c = 0; c < sx * sz; c++) for (let i = first[c] ?? 0; i < (first[c + 1] ?? 0); i++) columnOf[i] = c;
  /** The way cell nearest a point (within `reach` blocks), or -1. */
  const wayNear = (at: Cell, reach: number): number => {
    for (let r = 0; r <= reach; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const [x, z] = [at[0] + dx, at[1] + dz];
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || x < 0 || z < 0 || x >= sx || z >= sz) continue;
          const c = x + z * sx;
          if ((first[c + 1] ?? 0) > (first[c] ?? 0)) return first[c] ?? -1;
        }
      }
    }
    return -1;
  };
  const start = wayNear(spawn, 24);
  if (start < 0) throw new Error("no way near the spawn: the side quests' givers stand by the ways");
  const inNet = new Uint8Array(ys.length);
  const stack = [start];
  inNet[start] = 1;
  const spread = (): void => {
    while (stack.length > 0) {
      const cell = stack.pop() as number;
      const c = columnOf[cell] ?? 0;
      const [x, z, y] = [c % sx, Math.floor(c / sx), ys[cell] ?? 0];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const [nx, nz] = [x + dx, z + dz];
        if (nx < 0 || nz < 0 || nx >= sx || nz >= sz) continue;
        const nc = nx + nz * sx;
        for (let n = first[nc] ?? 0; n < (first[nc + 1] ?? 0); n++) {
          if (inNet[n] || Math.abs((ys[n] ?? 0) - y) > 1) continue;
          inNet[n] = 1;
          stack.push(n);
        }
      }
    }
  };
  spread();
  // A ride whose stop is by the network brings the network its arrival is by; until no ride adds more.
  const pending = [...rides];
  for (let added = true; added; ) {
    added = false;
    for (const [i, ride] of pending.entries()) {
      const [stop, arrival] = [wayNear(ride.stop, RIDE_REACH), wayNear(ride.arrival, RIDE_REACH)];
      if (stop < 0 || arrival < 0 || !inNet[stop]) continue;
      pending.splice(i, 1);
      added = true;
      if (!inNet[arrival]) {
        inNet[arrival] = 1;
        stack.push(arrival);
        spread();
      }
      break;
    }
  }
  const net = new Map<number, number[]>();
  for (let i = 0; i < ys.length; i++) if (inNet[i]) net.set(columnOf[i] ?? 0, [...(net.get(columnOf[i] ?? 0) ?? []), ys[i] ?? 0]);
  return net;
}

export interface SideGround {
  world: VoxelWorld;
  /** Ids of NETWORK_BLOCK_NAMES. */
  wayIds: ReadonlySet<number>;
  spawn: Cell;
  /** The map's rides (stop → arrival): they join the networks they link. */
  rides?: ReadonlyArray<{ stop: Cell; arrival: Cell }>;
  /** Height of the ground block a giver would stand on at a column. */
  groundY(x: number, z: number): number;
  /**
   * Whether a giver may stand on a column: open, level ground off the ways and the water, clear of buildings and
   * their doorsteps, trees and props (the map's own rules for its quest targets, without their zones).
   */
  canStand(x: number, z: number): boolean;
  /** A landmark of that name on the map, when there is one. */
  landmark(name: string): Cell | undefined;
}

/**
 * Finds a giver's or a resident's spot: the free column nearest its place that stands beside the spawn's way
 * network (at most BESIDE_WAY off it, on the same height ±1), `gap` blocks from everything in `taken`.
 */
export function sideSpots(ground: SideGround): (anchor: { place?: string; at?: Cell }, taken: readonly Cell[], gap?: number) => Cell {
  const { world } = ground;
  const [sx, , sz] = world.size;
  const net = spawnNetwork(world, ground.wayIds, ground.spawn, ground.rides);
  /** A way of the network at most BESIDE_WAY off, at its own height (±1): its own paving counts (a square's side). */
  const besideWay = (x: number, z: number): boolean => {
    const y = ground.groundY(x, z);
    for (let dx = -BESIDE_WAY; dx <= BESIDE_WAY; dx++) {
      for (let dz = -BESIDE_WAY; dz <= BESIDE_WAY; dz++) {
        const [nx, nz] = [x + dx, z + dz];
        if (nx >= 0 && nz >= 0 && nx < sx && nz < sz && net.get(nx + nz * sx)?.some((wy) => Math.abs(wy - y) <= 1)) return true;
      }
    }
    return false;
  };
  return (anchor, taken, gap = GIVER_CLEARANCE) => {
    const at = anchor.at ?? (anchor.place ? ground.landmark(anchor.place) : undefined);
    if (!at) throw new Error(`no landmark "${anchor.place ?? ''}" on the map for a side quest's giver or resident`);
    const free = (x: number, z: number): boolean => taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) >= gap);
    // What ruled the ground out, for the error when nothing is left.
    const ruled = { open: 0, beside: 0 };
    for (let r = 0; r <= MAX_REACH; r++) {
      let best: Cell | undefined;
      let bestD = Infinity;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const [x, z] = [at[0] + dx, at[1] + dz];
          if (x < 2 || z < 2 || x >= sx - 2 || z >= sz - 2) continue;
          const d = Math.hypot(dx, dz);
          if (d >= bestD || !ground.canStand(x, z)) continue;
          ruled.open++;
          if (!besideWay(x, z)) continue;
          ruled.beside++;
          if (!free(x, z)) continue;
          best = [x, z];
          bestD = d;
        }
      }
      if (best) return best;
    }
    throw new Error(`no open ground beside a way within ${MAX_REACH} blocks of ${anchor.place ?? `[${at.join(', ')}]`} (${ruled.open} open columns, ${ruled.beside} of them beside a way, none clear of the targets)`);
  };
}

const folkModel = (model: Folk['model']): string => {
  const [kind, which] = [model.slice(0, model.indexOf('-')), model.slice(model.indexOf('-') + 1)];
  return kind === 'person' ? person(which) : animal(which as Parameters<typeof animal>[0]);
};

/**
 * Everyday life round the side quests: each giver's company beside it, each resident at its place (by the ways,
 * like the givers), placed clear of every target and of the villagers already there (`life.questSpots`). Ids
 * start with `folk-` so they never meet the map's own villagers'.
 */
export function sideFolk(options: {
  table: SideQuestTable;
  givers: ReadonlyMap<string, Cell>;
  spots: ReturnType<typeof sideSpots>;
  life: LifeGround;
  seed: number;
}): Ambient[] {
  const { table, givers, spots, life, seed } = options;
  const cast: Resident[] = [];
  for (const giver of table.givers) {
    const at = givers.get(giver.id);
    if (!at) continue;
    for (const f of giver.company) cast.push({ routine: f.routine, name: f.name, model: folkModel(f.model), at });
  }
  const taken: Cell[] = [...life.questSpots];
  for (const r of table.residents) {
    const at = spots(r.at ? { at: r.at } : { place: r.place ?? '' }, taken, LIFE_CLEARANCE + 1);
    taken.push(at);
    cast.push({ routine: r.routine, name: r.name, model: folkModel(r.model), at });
  }
  return placeVillageLife(life, cast, seed).map((a) => ({ ...a, id: `folk-${a.id}` }));
}

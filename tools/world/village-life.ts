// Everyday life of a wide map (`ambients` in entities.json): the people at their trades and the farm animals
// of each district, placed from a short cast list (who, which trade, where they live, what they hold). Each
// gets a home on open ground near its anchor and the places its routine uses (everyday-routines.ts in the
// web app: `work-a`, `work-b`, `work-c` and `focus` for people, `graze-a`, `graze-b` for animals), each a
// straight clear walk from home, off the paths and away from every quest target. Deterministic for a seed.
// Before that the cast is spread over the map's lived ground (spreadCast): no 100-block cell holds more than a
// set share of it, the crowds' free walkers going where their kind lives (owner, 03/10/2026: life spread over
// the whole map "như ngoài đời thật", not packed in one place).
import type { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import type { Ambient, AmbientRoutine } from '../../packages/voxel/src/world-entities';
import { PACK } from './map-kit';
import { LANE_WIDTH } from './scenery-audit';
import { createRng } from './noise';

/** Quest targets keep this far from any home or work place (as in the forest, forest-life.ts). */
export const LIFE_CLEARANCE = 5;

const PEOPLE = 'packs/kenney-blocky-characters/2.0';

/** A person model by letter (Kenney Blocky Characters), for a cast list. */
export const person = (letter: string): string => `${PEOPLE}/character-${letter}.glb`;
export const animal = (kind: 'cow' | 'pig' | 'dog' | 'cat' | 'chick' | 'penguin' | 'polar' | 'monkey'): string => `${PACK.pets}/animal-${kind}.glb`;

/** Animals go between two spots (chicks only peck round home and need none). */
const ANIMALS = new Set<AmbientRoutine>(['cow', 'pig', 'dog', 'cat', 'chick', 'penguin', 'polar-bear', 'monkey']);

export interface Resident {
  routine: AmbientRoutine;
  /** Shown on the prompt ("Bác bán rau"). */
  name: string;
  model: string;
  /** Manifest models the person holds, the everyday tool first. */
  held?: readonly string[];
  /** Where they live and work round (block column). */
  at: readonly [number, number];
  /** What they face at work (a counter, a cow); default: their first work place. */
  facing?: readonly [number, number];
  /**
   * Where their work places are, in order (a seller's cells behind the counter, the counters a shopper goes
   * round): each is the nearest open cell to it that is a clear walk from home, else one picked round home.
   */
  visits?: ReadonlyArray<readonly [number, number]>;
  scale?: number;
  /**
   * One of a crowd (crowd() sets it): a free walker the map may move to a quieter lived place of its kind when
   * its own place holds too much of the map's life. Residents a generator places by hand stay where it put them.
   */
  spread?: boolean;
}

export interface LifeGround {
  world: VoxelWorld;
  surface(x: number, z: number): number;
  standY(x: number, z: number): number;
  onPath(x: number, z: number): boolean;
  inWater(x: number, z: number): boolean;
  /** Quest targets of every chapter (x, z). */
  questSpots: ReadonlyArray<readonly [number, number]>;
  scaleOf(model: string): number;
  /** Whether a column's ground is a way (a road, lane, trail, paved square or yard): the lived ground's thread. */
  isWay(x: number, z: number): boolean;
  /** Where the child arrives: the life round it stays (the quiet cells draw their life from elsewhere). */
  spawn: readonly [number, number];
  /** Whether a column lies within `pad` of a building (its footprint and doorstep), when the map knows them. */
  nearBuilding?(x: number, z: number, pad: number): boolean;
}

type Cell = { x: number; z: number };

/** Side of the square cells a map's life is spread over (blocks); life-audit.ts measures with the same cells. */
export const LIFE_CELL = 100;
/** No cell holds more than this share of the map's life (and at least MIN_CAP may always stand in one)… */
const SPREAD_SHARE = 0.09;
const MIN_CAP = 8;
/** …except anchored crowds (a market's sellers), whose cell still keeps this share of the cap as free walkers. */
const KEEP_FREE = 1 / 3;
/** Cells whose middle lies this close to the spawn (blocks) give no walkers to the quiet cells. */
const SPAWN_KEEP = 120;

/** Lived ground a free walker settles on: beside a way, in a house's yard, on a shore, in a pasture. */
type SpotKind = 'street' | 'yard' | 'shore' | 'pasture';
/**
 * Where each kind of free walker lives, best first. Routines missing here are anchored to their place (sellers,
 * teachers, guards, farm hands at their fields, wild animals in their wilds) and never move.
 */
const SETTLES: Partial<Record<AmbientRoutine, readonly SpotKind[]>> = {
  shopper: ['street', 'yard'],
  porter: ['street'],
  sweeper: ['street', 'yard'],
  reader: ['yard', 'street'],
  pupil: ['yard', 'street'],
  'kite-flyer': ['pasture', 'street'],
  'home-cook': ['yard', 'street'],
  laundry: ['yard', 'street'],
  waterer: ['yard', 'street'],
  gardener: ['yard', 'street'],
  ferryman: ['shore'],
  fisher: ['shore'],
  cow: ['pasture'],
  pig: ['pasture', 'yard'],
  dog: ['yard', 'street'],
  cat: ['yard', 'street'],
  chick: ['yard', 'pasture'],
};
/** Distances (blocks) that make a spot one kind or another; spots are sampled every SPOT_STEP blocks. */
const SPOT = { doorstep: 2, street: 3, yardMax: 6, yardWay: 10, shore: 3, shoreWay: 16, pastureMin: 4, pastureMax: 18, pastureClear: 5 } as const;
const SPOT_STEP = 5;
/** How much a far cell is worth less than a near one when a walker moves (per block). */
const DISTANCE_COST = 1 / 500;

export function placeVillageLife(ground: LifeGround, cast: readonly Resident[], seed: number): Ambient[] {
  const { world, surface } = ground;
  const [sx, , sz] = world.size;
  const rng = createRng(seed);
  const used = new Set<string>();
  const nearQuest = (x: number, z: number): boolean => ground.questSpots.some(([qx, qz]) => Math.hypot(qx - (x + 0.5), qz - (z + 0.5)) < LIFE_CLEARANCE);
  /** Open ground: two free blocks above a solid top, off the paths, the lanes' middles and the water, clear of quests. */
  const open = (x: number, z: number): boolean => {
    if (x < 12 || z < 12 || x >= sx - 12 || z >= sz - 12 || used.has(`${x},${z}`)) return false;
    if (ground.onPath(x, z) || ground.inWater(x, z) || nearQuest(x, z) || inLane(ground, x, z)) return false;
    const y = surface(x, z);
    return world.get(x, y, z) !== 0 && world.get(x, y + 1, z) === 0 && world.get(x, y + 2, z) === 0;
  };
  /** A straight walk with no wall, no water and no step higher than one block. */
  const clearWalk = (a: Cell, b: Cell): boolean => {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
    let lastY = surface(a.x, a.z);
    for (let i = 1; i <= steps; i++) {
      const x = Math.round(a.x + ((b.x - a.x) * i) / steps);
      const z = Math.round(a.z + ((b.z - a.z) * i) / steps);
      const y = surface(x, z);
      if (Math.abs(y - lastY) > 1 || world.get(x, y + 1, z) !== 0 || world.get(x, y + 2, z) !== 0 || ground.inWater(x, z)) return false;
      lastY = y;
    }
    return true;
  };
  const nearest = (x: number, z: number, from?: Cell, maxRing = 10): Cell | null => {
    for (let r = 0; r <= maxRing; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const c = { x: Math.round(x) + dx, z: Math.round(z) + dz };
          if (!open(c.x, c.z) || (from && !clearWalk(from, c))) continue;
          used.add(`${c.x},${c.z}`);
          return c;
        }
      }
    }
    return null;
  };
  const at = (c: Cell): [number, number, number] => [c.x + 0.5, ground.standY(c.x, c.z), c.z + 0.5];

  const out: Ambient[] = [];
  const counts = new Map<string, number>();
  for (const resident of spreadCast(cast, () => livedSpots(ground, open, createRng(seed + 1)), ground.spawn, sx, sz, createRng(seed + 2))) {
    const home = nearest(resident.at[0], resident.at[1]);
    if (!home) continue; // crowded ground: this one stays home today
    const isAnimal = ANIMALS.has(resident.routine);
    const names = isAnimal ? ['graze-a', 'graze-b'] : ['work-a', 'work-b', 'work-c'];
    const spots: Record<string, [number, number, number]> = {};
    for (const [i, name] of names.entries()) {
      const a = rng() * Math.PI * 2;
      const r = (isAnimal ? 4 : 3) + rng() * 4;
      const visit = resident.visits?.[i];
      const planned = visit ? nearest(visit[0], visit[1], home, 3) : null;
      const c = planned ?? nearest(home.x + Math.cos(a) * r, home.z + Math.sin(a) * r, home, 4) ?? home;
      spots[name] = at(c);
    }
    if (!isAnimal) {
      const [fx, fz] = resident.facing ?? [spots['work-a']?.[0] ?? home.x, (spots['work-a']?.[2] ?? home.z) + 1];
      spots.focus = [fx + (resident.facing ? 0.5 : 0), ground.standY(Math.floor(fx), Math.floor(fz)) + 0.8, fz + (resident.facing ? 0.5 : 0)];
    }
    const n = (counts.get(resident.routine) ?? 0) + 1;
    counts.set(resident.routine, n);
    out.push({
      id: `${resident.routine}-${n}`,
      routine: resident.routine,
      name: resident.name,
      model: resident.model,
      scale: +(ground.scaleOf(resident.model) * (resident.scale ?? 1)).toFixed(4),
      ...(resident.held ? { held: [...resident.held] } : {}),
      position: at(home),
      yaw: Math.floor(rng() * 360),
      spots,
    });
  }
  return out;
}

/**
 * `count` residents of one trade spread on a ring round (x, z), at `radius` blocks, their names and
 * models taken in turn from the lists (a crowd of planters on a paddy, of hens round a yard).
 */
export function crowd(
  routine: AmbientRoutine,
  names: readonly string[],
  models: readonly string[],
  center: readonly [number, number],
  radius: number,
  count: number,
  held?: readonly string[],
): Resident[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + radius;
    return {
      routine,
      name: names[i % names.length] ?? names[0] ?? routine,
      model: models[i % models.length] ?? models[0] ?? '',
      at: [Math.round(center[0] + Math.cos(a) * radius), Math.round(center[1] + Math.sin(a) * radius)] as const,
      ...(held ? { held } : {}),
      spread: true,
    };
  });
}

/**
 * Whether a column is the middle of a lane (a way at most LANE_WIDTH across, as scenery-audit.ts reads it): a way
 * with way on both sides across it, narrow across and long along. Its middle is for walking through.
 */
function inLane(ground: LifeGround, x: number, z: number): boolean {
  if (!ground.isWay(x, z)) return false;
  const run = (dx: number, dz: number): number => {
    let n = 0;
    while (n < LANE_WIDTH && ground.isWay(x + dx * (n + 1), z + dz * (n + 1))) n++;
    return n;
  };
  const [west, east, north, south] = [run(-1, 0), run(1, 0), run(0, -1), run(0, 1)];
  const [acrossX, acrossZ] = [west + east + 1, north + south + 1];
  return (acrossX <= LANE_WIDTH && acrossZ > LANE_WIDTH && west >= 1 && east >= 1) || (acrossZ <= LANE_WIDTH && acrossX > LANE_WIDTH && north >= 1 && south >= 1);
}

interface Spot {
  x: number;
  z: number;
  cell: number;
  kinds: ReadonlySet<SpotKind>;
}

/**
 * Distance (Chebyshev, blocks) from every column to the nearest one `is` names, up to `limit` (beyond: limit + 1).
 * Column x + z * sx.
 */
function distanceField(sx: number, sz: number, is: (x: number, z: number) => boolean, limit: number): Uint8Array {
  const far = limit + 1;
  const dist = new Uint8Array(sx * sz).fill(far);
  let front: number[] = [];
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      if (!is(x, z)) continue;
      dist[x + z * sx] = 0;
      front.push(x + z * sx);
    }
  }
  for (let d = 1; d <= limit && front.length > 0; d++) {
    const next: number[] = [];
    for (const c of front) {
      const [x, z] = [c % sx, Math.floor(c / sx)];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const [nx, nz] = [x + dx, z + dz];
          if (nx < 0 || nz < 0 || nx >= sx || nz >= sz || dist[nx + nz * sx] !== far) continue;
          dist[nx + nz * sx] = d;
          next.push(nx + nz * sx);
        }
      }
    }
    front = next;
  }
  return dist;
}

/**
 * The map's lived ground, sampled on a jittered grid: open spots beside a way (street), round a building near a
 * way (yard), on a bank near a way (shore), on open grass a short walk off a way (pasture). Spots far from
 * every way are wilds, where no village life is moved to.
 */
function livedSpots(ground: LifeGround, open: (x: number, z: number) => boolean, rng: () => number): Spot[] {
  const [sx, , sz] = ground.world.size;
  const way = distanceField(sx, sz, ground.isWay, SPOT.pastureMax);
  const water = distanceField(sx, sz, ground.inWater, SPOT.shore);
  const cellsX = Math.ceil(sx / LIFE_CELL);
  const spots: Spot[] = [];
  for (let gx = 0; gx < sx; gx += SPOT_STEP) {
    for (let gz = 0; gz < sz; gz += SPOT_STEP) {
      const x = gx + Math.floor(rng() * SPOT_STEP);
      const z = gz + Math.floor(rng() * SPOT_STEP);
      const near = (pad: number): boolean => ground.nearBuilding?.(x, z, pad) ?? false;
      // Never in a building or on its doorstep (two cells out from its walls).
      if (x >= sx || z >= sz || ground.isWay(x, z) || !open(x, z) || near(SPOT.doorstep)) continue;
      const w = way[x + z * sx] ?? 255;
      const wet = water[x + z * sx] ?? 255;
      const kinds = new Set<SpotKind>();
      if (w <= SPOT.street) kinds.add('street');
      if (w <= SPOT.yardWay && near(SPOT.yardMax)) kinds.add('yard');
      if (wet <= SPOT.shore && w <= SPOT.shoreWay) kinds.add('shore');
      if (w >= SPOT.pastureMin && w <= SPOT.pastureMax && wet > SPOT.shore && !near(SPOT.yardMax) && clearRound(x, z, open)) kinds.add('pasture');
      if (kinds.size > 0) spots.push({ x, z, cell: Math.floor(x / LIFE_CELL) + Math.floor(z / LIFE_CELL) * cellsX, kinds });
    }
  }
  return spots;
}

/** Open ground all round a spot (no tree, wall or water): room for a cow to graze, a kite to fly. */
function clearRound(x: number, z: number, open: (x: number, z: number) => boolean): boolean {
  const r = Math.floor(SPOT.pastureClear / 2);
  for (let dx = -r; dx <= r; dx += r) for (let dz = -r; dz <= r; dz += r) if (!open(x + dx, z + dz)) return false;
  return true;
}

/**
 * The cast with its life spread over the map. First the cap: in every LIFE_CELL cell holding more than SPREAD_SHARE
 * of the cast (at least MIN_CAP), free walkers (`spread`, a routine in SETTLES) beyond it move — a random few of
 * each crowd, so every crowd keeps some of its own — to a spot of their kind in the cell that holds least for its
 * lived ground, nearer cells first among equals. Anchored residents stay; a cell they fill past the cap still
 * keeps a third of the cap's free walkers (a market stays lively). Then the quiet lived cells: each one nobody
 * lives in yet draws a free walker its ground suits from the busiest cell that can spare one (holding more than
 * half the cap, away from the spawn). Moved walkers keep their names and tools and lose their planned visits (the stalls they went
 * round are far now).
 */
function spreadCast(cast: readonly Resident[], spotsOf: () => readonly Spot[], spawn: readonly [number, number], sx: number, sz: number, rng: () => number): Resident[] {
  const cellsX = Math.ceil(sx / LIFE_CELL);
  const cellCount = cellsX * Math.ceil(sz / LIFE_CELL);
  const cellOf = (x: number, z: number): number => Math.min(cellsX - 1, Math.max(0, Math.floor(x / LIFE_CELL))) + Math.min(cellCount / cellsX - 1, Math.max(0, Math.floor(z / LIFE_CELL))) * cellsX;
  const cap = Math.max(MIN_CAP, Math.floor(cast.length * SPREAD_SHARE));
  const movable = (r: Resident): boolean => r.spread === true && r.facing === undefined && SETTLES[r.routine] !== undefined;
  const shuffle = <T>(list: T[]): T[] => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j] as T, list[i] as T];
    }
    return list;
  };

  // Lived spots by kind, per cell; a cell's worth is how much lived ground it has.
  const spots = spotsOf();
  const pool = new Map<string, Spot[]>();
  const worth = new Array<number>(cellCount).fill(0);
  for (const spot of spots) {
    worth[spot.cell] = (worth[spot.cell] ?? 0) + 1;
    for (const kind of spot.kinds) {
      const key = `${spot.cell}:${kind}`;
      pool.set(key, [...(pool.get(key) ?? []), spot]);
    }
  }
  const taken = new Set<Spot>();
  const freeSpots = (c: number, kind: SpotKind): Spot[] => (pool.get(`${c}:${kind}`) ?? []).filter((spot) => !taken.has(spot));
  const out = [...cast];
  const load = new Array<number>(cellCount).fill(0);
  /** Each cell's free walkers still at home, in a random order. */
  const stayers = new Map<number, number[]>();
  for (const [i, r] of cast.entries()) {
    const c = cellOf(r.at[0], r.at[1]);
    load[c] = (load[c] ?? 0) + 1;
    if (movable(r)) stayers.set(c, [...(stayers.get(c) ?? []), i]);
  }
  for (const list of stayers.values()) shuffle(list);
  /** Moves resident `i` to a free spot of `kind` in cell `c`; spots round it are taken too, so neighbours stand apart. */
  const moveTo = (i: number, c: number, kind: SpotKind): void => {
    const r = cast[i] as Resident;
    const free = freeSpots(c, kind);
    const spot = free[Math.floor(rng() * free.length)];
    if (!spot) return;
    for (const other of spots) if (Math.abs(other.x - spot.x) <= SPOT_STEP * 2 && Math.abs(other.z - spot.z) <= SPOT_STEP * 2) taken.add(other);
    const home = cellOf(r.at[0], r.at[1]);
    load[home] = (load[home] ?? 0) - 1;
    load[c] = (load[c] ?? 0) + 1;
    stayers.set(home, (stayers.get(home) ?? []).filter((j) => j !== i));
    const { visits: _visits, ...rest } = r;
    out[i] = { ...rest, at: [spot.x, spot.z] };
  };
  const order = shuffle(Array.from({ length: cellCount }, (_, c) => c));

  // The cap: per cell, the free walkers past what it keeps go to the quietest cell of their kind.
  const anchored = new Array<number>(cellCount).fill(0);
  for (const [c, n] of load.entries()) anchored[c] = n - (stayers.get(c)?.length ?? 0);
  const movers = [...stayers].flatMap(([c, free]) => free.slice(Math.max(0, cap - (anchored[c] ?? 0), Math.min(free.length, Math.ceil(cap * KEEP_FREE)))));
  for (const i of movers.sort((a, b) => a - b)) {
    const [ox, oz] = (cast[i] as Resident).at;
    for (const kind of SETTLES[(cast[i] as Resident).routine] ?? []) {
      let best = -1;
      let bestScore = Infinity;
      for (const c of order) {
        if ((load[c] ?? 0) >= cap || freeSpots(c, kind).length === 0) continue;
        const [mx, mz] = [((c % cellsX) + 0.5) * LIFE_CELL, (Math.floor(c / cellsX) + 0.5) * LIFE_CELL];
        const score = ((load[c] ?? 0) + 1) / (1 + Math.min(worth[c] ?? 0, 60) / 15) + Math.hypot(mx - ox, mz - oz) * DISTANCE_COST;
        if (score < bestScore) [best, bestScore] = [c, score];
      }
      if (best !== -1) {
        moveTo(i, best, kind);
        break;
      }
    }
  }

  // The quiet lived cells: each draws one free walker its ground suits from the busiest cell that can spare one
  // (not the ones round the spawn, which stay lively for the child arriving).
  const spare = Math.max(4, Math.ceil(cap / 2));
  const byTheSpawn = (c: number): boolean => Math.hypot(((c % cellsX) + 0.5) * LIFE_CELL - spawn[0], (Math.floor(c / cellsX) + 0.5) * LIFE_CELL - spawn[1]) < SPAWN_KEEP;
  for (const c of order) {
    if ((load[c] ?? 0) > 0 || (worth[c] ?? 0) === 0) continue;
    const donors = order.filter((d) => (load[d] ?? 0) > spare && !byTheSpawn(d)).sort((a, b) => (load[b] ?? 0) - (load[a] ?? 0));
    for (const d of donors) {
      const i = (stayers.get(d) ?? []).find((j) => (SETTLES[(cast[j] as Resident).routine] ?? []).some((kind) => freeSpots(c, kind).length > 0));
      const kind = i === undefined ? undefined : (SETTLES[(cast[i] as Resident).routine] ?? []).find((k) => freeSpots(c, k).length > 0);
      if (i === undefined || kind === undefined) continue;
      moveTo(i, c, kind);
      break;
    }
  }
  return out;
}

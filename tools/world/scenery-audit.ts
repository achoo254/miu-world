// `pnpm exec tsx tools/world/scenery-audit.ts <map>…`: a generated map against the scenery rules
// (.claude/rules/world-scenery.md, owner 02/10/2026: "cây lại mọc giữa đường… khung cảnh phải giống như ngoài
// đời thật"): trees standing on a way (a road, a lane, a path, a paved square or yard) instead of beside it or
// in a bed of earth, and solid props standing in a lane's middle. Reads the committed files; prints each finding
// with its cell so the generator can be fixed where it placed it. Solid props count only on lanes: squares,
// yards and market floors keep their benches, stalls and fountains. Then the way network: every place the
// child starts from or heads for lies by a way, all on one network (rides joining their two ends).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { VoxelWorld } from '../../packages/voxel/src/chunk-format';
import { modelCatalogSchema, modelTraversal } from '../../packages/voxel/src/model-catalog';
import { insertRegion } from '../../packages/voxel/src/region-format';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';
import { auditRooms } from './room-audit';

/** Surfaces that are ways: what a tree must not grow out of (it stands beside them, or in earth or a bed). */
export const WAY_BLOCKS = ['path', 'trail', 'cobble', 'cobble-grey', 'paver', 'asphalt'] as const;
/** Ways for the network check: the paved and trodden ones, and the plank bridges, decks and boardwalks. */
const NETWORK_BLOCKS = [...WAY_BLOCKS, 'planks'];
/** A place is on the ways when a way cell lies this close (blocks); a lesson district's centre, this close. */
const ON_WAY = 4;
const ZONE_ON_WAY = 14;
/** A roofed space at least this big (floor cells) is a house whose door the ways reach; smaller ones are stalls, porches, sheds. */
const HOUSE_AREA = 60;
const TRUNK_BLOCKS = ['log', 'tree-log', 'birch-log', 'tree-birch-log'];
const LEAF_BLOCKS = ['leaves', 'leaves-autumn', 'leaves-pink'];
/** A way at most this many blocks across is a lane: its middle stays clear. */
export const LANE_WIDTH = 7;
/** A trunk is a tree's when leaves hang this close above or round its top. */
const CROWN_REACH = 3;
/** A way's block running this deep under the surface is rock, not paving. */
const ROCK_DEPTH = 4;

export interface SceneryFinding {
  kind: 'tree-on-way' | 'prop-in-way' | 'off-the-ways' | 'cut-off';
  at: [number, number, number];
  what: string;
}

/** A generated map's committed files (assets/generated/world/<map>): its entities and its blocks. */
export async function readGeneratedMap(map: string): Promise<{ e: WorldEntities; world: VoxelWorld }> {
  const dir = path.join(ASSETS_DIR, 'generated/world', map);
  const e = JSON.parse(await readFile(path.join(dir, 'entities.json'), 'utf8')) as WorldEntities;
  const [SX, SY, SZ] = e.size;
  const world = new VoxelWorld([SX / 16, SY / 16, SZ / 16]);
  for (const f of await readdir(path.join(dir, 'regions'))) {
    const m = /^r(-?\d+)-(-?\d+)\.bin$/.exec(f);
    if (m) insertRegion(world, Number(m[1]), Number(m[2]), new Uint8Array(await readFile(path.join(dir, 'regions', f))));
  }
  return { e, world };
}

/** Block ids by name from content/blocks.json. */
export async function blockIds(): Promise<{ idsOf: (names: readonly string[]) => Set<number>; nameOf: Map<number, string> }> {
  const table = blockTableSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/blocks.json'), 'utf8')));
  return { idsOf: (names) => new Set(table.blocks.filter((b) => names.includes(b.name)).map((b) => b.id)), nameOf: new Map(table.blocks.map((b) => [b.id, b.name])) };
}

/**
 * Paving and lanes of a map: `paved` is a way's block laid on the ground (the same stone running deep under it
 * is a rock face — a cliff, a lava field — where trees and boulders belong); `inLane` is the middle of a lane
 * (a way at most LANE_WIDTH across one way, way cells on both sides) at a standing spot (x, y, z); `pavedUnder`,
 * whether the first block at most two under (x, y, z) is paving.
 */
export function wayChecks(world: VoxelWorld, way: ReadonlySet<number>): Record<'paved' | 'pavedUnder' | 'inLane', (x: number, y: number, z: number) => boolean> {
  const [SX, SY, SZ] = world.size;
  const inside = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < SX && z < SZ;
  const paved = (x: number, y: number, z: number): boolean => {
    const id = world.get(x, y, z);
    if (!way.has(id)) return false;
    for (let d = 1; d <= ROCK_DEPTH; d++) if (y - d < 0 || world.get(x, y - d, z) !== id) return true;
    return false;
  };
  // Whether the first block at most two under (x, y, z) is paving.
  const pavedUnder = (x: number, y: number, z: number): boolean => {
    for (let gy = Math.min(SY - 1, y); gy >= Math.max(0, y - 2); gy--) if (world.get(x, gy, z) !== 0) return paved(x, gy, z);
    return false;
  };
  const inLane = (x: number, y: number, z: number): boolean => {
    if (!inside(x, z) || !pavedUnder(x, y - 1, z)) return false;
    const wayAt = (dx: number, dz: number): boolean => inside(x + dx, z + dz) && pavedUnder(x + dx, y - 1, z + dz);
    const run = (dx: number, dz: number): number => {
      let n = 0;
      while (n < LANE_WIDTH && wayAt(dx * (n + 1), dz * (n + 1))) n++;
      return n;
    };
    const [west, east, north, south] = [run(-1, 0), run(1, 0), run(0, -1), run(0, 1)];
    const acrossX = west + east + 1;
    const acrossZ = north + south + 1;
    const laneAlongZ = acrossX <= LANE_WIDTH && acrossZ > LANE_WIDTH && west >= 1 && east >= 1;
    const laneAlongX = acrossZ <= LANE_WIDTH && acrossX > LANE_WIDTH && north >= 1 && south >= 1;
    return laneAlongZ || laneAlongX;
  };
  return { paved, pavedUnder, inLane };
}

export async function auditScenery(map: string): Promise<SceneryFinding[]> {
  const { e, world } = await readGeneratedMap(map);
  const [SX, SY, SZ] = e.size;
  const { idsOf, nameOf } = await blockIds();
  const [way, trunk, leaf] = [idsOf(WAY_BLOCKS), idsOf(TRUNK_BLOCKS), idsOf(LEAF_BLOCKS)];
  const inside = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < SX && z < SZ;
  const findings: SceneryFinding[] = [];
  const { paved, pavedUnder, inLane } = wayChecks(world, way);
  // A log in a wall: logs on both sides in a line, or a built block beside it (a tree stands clear, its only
  // neighbours air, leaves or the other trunks of a thick tree).
  const inWall = (x: number, y: number, z: number): boolean => {
    const at = (dx: number, dz: number): number => (inside(x + dx, z + dz) ? world.get(x + dx, y, z + dz) : 0);
    const [w, east, n, s] = [at(-1, 0), at(1, 0), at(0, -1), at(0, 1)];
    if ((trunk.has(w) && trunk.has(east)) || (trunk.has(n) && trunk.has(s))) return true;
    return [w, east, n, s].some((id) => id !== 0 && !trunk.has(id) && !leaf.has(id));
  };

  // Block trees: a trunk standing straight on paving, with a crown of leaves over it.
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      for (let y = 1; y < SY - 1; y++) {
        if (!trunk.has(world.get(x, y, z)) || !paved(x, y - 1, z) || inWall(x, y, z)) continue;
        let top = y;
        while (top + 1 < SY && trunk.has(world.get(x, top + 1, z))) top++;
        let crowned = false;
        for (let dy = 0; dy <= CROWN_REACH && !crowned; dy++) {
          for (let dx = -1; dx <= 1 && !crowned; dx++) for (let dz = -1; dz <= 1 && !crowned; dz++) if (inside(x + dx, z + dz) && leaf.has(world.get(x + dx, top + dy, z + dz))) crowned = true;
        }
        if (crowned) findings.push({ kind: 'tree-on-way', at: [x, y, z], what: `tree trunk on ${nameOf.get(world.get(x, y - 1, z)) ?? 'way'}` });
      }
    }
  }

  // Props: tree models on a way, and solid props on a way's middle (way cells on both sides along x or z).
  const catalog = modelCatalogSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/world/models.json'), 'utf8')));
  for (const p of e.props) {
    const [x, z] = [Math.floor(p.position[0]), Math.floor(p.position[2])];
    const y = Math.floor(p.position[1]);
    if (!inside(x, z) || !pavedUnder(x, y - 1, z)) continue;
    const file = p.model.split('/').pop() ?? p.model;
    if (/^tree|_tree|palm|bamboo|pine/i.test(file) && !/street/i.test(file)) {
      findings.push({ kind: 'tree-on-way', at: [x, y, z], what: file });
      continue;
    }
    if (modelTraversal(catalog, p.model) === 'walk-through') continue;
    // A lane is for walking: a solid prop stands at its edge, not in its middle. Squares, yards and market
    // floors are wider and keep their benches, stalls and fountains.
    if (inLane(x, y, z)) findings.push({ kind: 'prop-in-way', at: [x, y, z], what: file });
  }
  const doors = (await auditRooms(map)).filter((r) => r.area >= HOUSE_AREA && r.doorAt).map((r) => ({ name: `door of the house at ${r.at.join(',')}`, at: r.doorAt ?? r.at, reach: ON_WAY }));
  findings.push(...wayNetwork(world, e, idsOf(NETWORK_BLOCKS), doors));
  return findings;
}

/**
 * The map's ways as one network (owner, 02/10/2026: clear lanes joining every sensible pair of places; where
 * the child starts, a way leads to where she goes): every place the child starts from or heads for — the
 * spawn, each chapter's start, the gates, every ride's stop and arrival, the lesson districts, the named
 * places and every house's door — lies by a way, and all of them are on one network of way cells (stepping up or down one block),
 * a ride joining its stop to its arrival (a boat across the sea, a cable car up the mountain).
 */
function wayNetwork(world: VoxelWorld, e: WorldEntities, network: ReadonlySet<number>, doors: ReadonlyArray<{ name: string; at: readonly number[]; reach: number }>): SceneryFinding[] {
  const [SX, SY, SZ] = e.size;
  // Every way cell with room to stand on it, floor over floor (a ground floor under an upper one counts too):
  // column x + z * SX holds its cells' heights from `first[c]` to `first[c + 1]` in `ys`.
  const first = new Int32Array(SX * SZ + 1);
  const ys: number[] = [];
  for (let c = 0; c < SX * SZ; c++) {
    first[c] = ys.length;
    const [x, z] = [c % SX, Math.floor(c / SX)];
    for (let y = 1; y < SY - 1; y++) if (network.has(world.get(x, y, z)) && world.get(x, y + 1, z) === 0) ys.push(y);
  }
  first[SX * SZ] = ys.length;
  // Components of way cells, 4-connected, at most one block up or down.
  const comp = new Int32Array(ys.length).fill(-1);
  const columnOf = new Int32Array(ys.length);
  for (let c = 0; c < SX * SZ; c++) for (let i = first[c] ?? 0; i < (first[c + 1] ?? 0); i++) columnOf[i] = c;
  let count = 0;
  for (let i = 0; i < ys.length; i++) {
    if (comp[i] !== -1) continue;
    const stack = [i];
    comp[i] = count;
    while (stack.length > 0) {
      const cell = stack.pop() as number;
      const c = columnOf[cell] ?? 0;
      const [x, z, y] = [c % SX, Math.floor(c / SX), ys[cell] ?? 0];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const [nx, nz] = [x + dx, z + dz];
        if (nx < 0 || nz < 0 || nx >= SX || nz >= SZ) continue;
        const nc = nx + nz * SX;
        for (let n = first[nc] ?? 0; n < (first[nc + 1] ?? 0); n++) {
          if (comp[n] !== -1 || Math.abs((ys[n] ?? 0) - y) > 1) continue;
          comp[n] = count;
          stack.push(n);
        }
      }
    }
    count++;
  }
  // The network nearest a place: the way cell in the closest ring of columns whose height is nearest its own.
  const nearest = (px: number, py: number, pz: number, reach: number): number => {
    const [cx, cz] = [Math.floor(px), Math.floor(pz)];
    for (let r = 0; r <= reach; r++) {
      let best = -1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const [x, z] = [cx + dx, cz + dz];
          if (x < 0 || z < 0 || x >= SX || z >= SZ) continue;
          const c = x + z * SX;
          for (let i = first[c] ?? 0; i < (first[c + 1] ?? 0); i++) if (best === -1 || Math.abs((ys[i] ?? 0) - py) < Math.abs((ys[best] ?? 0) - py)) best = i;
        }
      }
      if (best !== -1) return comp[best] ?? -1;
    }
    return -1;
  };
  type Place = { name: string; at: readonly number[]; reach: number };
  const places: Place[] = [
    { name: 'spawn', at: e.spawn.position, reach: ON_WAY },
    ...Object.entries(e.chapterSpawns ?? {}).map(([c, s]) => ({ name: `chapter ${c} start`, at: s.position, reach: ON_WAY })),
    ...e.interactables.filter((t) => t.kind === 'gate').map((t) => ({ name: `gate ${t.id}`, at: t.position, reach: ON_WAY })),
    ...e.interactables.filter((t) => t.ride).map((t) => ({ name: `stop ${t.id}`, at: t.position, reach: ON_WAY })),
    ...e.interactables.flatMap((t) => (t.ride ? [{ name: `arrival of ${t.id}`, at: t.ride, reach: ON_WAY }] : [])),
    ...(e.landmarks ?? []).map((l) => ({ name: `place ${l.id}`, at: l.position, reach: ZONE_ON_WAY })),
    ...doors,
  ];
  const findings: SceneryFinding[] = [];
  const compOf = new Map<string, number>();
  for (const p of places) {
    const c = nearest(p.at[0] ?? 0, p.at[1] ?? 0, p.at[2] ?? 0, p.reach);
    if (c === -1) findings.push({ kind: 'off-the-ways', at: [Math.floor(p.at[0] ?? 0), Math.floor(p.at[1] ?? 0), Math.floor(p.at[2] ?? 0)], what: p.name });
    else compOf.set(p.name, c);
  }
  // Rides join the network their stop is on to the one their arrival is on.
  const parent = new Map<number, number>();
  const find = (c: number): number => {
    let r = c;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r) ?? r;
    return r;
  };
  for (const t of e.interactables.filter((i) => i.ride)) {
    const [a, b] = [compOf.get(`stop ${t.id}`), compOf.get(`arrival of ${t.id}`)];
    if (a !== undefined && b !== undefined) parent.set(find(a), find(b));
  }
  const spawnNet = compOf.has('spawn') ? find(compOf.get('spawn') ?? -1) : -1;
  for (const p of places) {
    const c = compOf.get(p.name);
    if (c !== undefined && find(c) !== spawnNet) findings.push({ kind: 'cut-off', at: [Math.floor(p.at[0] ?? 0), Math.floor(p.at[1] ?? 0), Math.floor(p.at[2] ?? 0)], what: p.name });
  }
  return findings;
}

async function main(): Promise<void> {
  for (const map of process.argv.slice(2)) {
    const findings = await auditScenery(map);
    const n = (kind: SceneryFinding['kind']): number => findings.filter((f) => f.kind === kind).length;
    console.log(`${map}: ${n('tree-on-way')} trees on a way, ${n('prop-in-way')} solid props in a lane, ${n('off-the-ways')} places off the ways, ${n('cut-off')} places on ways cut off from the spawn's`);
    for (const f of findings.slice(0, 40)) console.log(`  ${f.kind} [${f.at.join(',')}] ${f.what}`);
    if (findings.length > 40) console.log(`  … ${findings.length - 40} more`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

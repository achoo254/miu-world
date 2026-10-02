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

/** Surfaces that are ways: what a tree must not grow out of (it stands beside them, or in earth or a bed). */
export const WAY_BLOCKS = ['path', 'trail', 'cobble', 'cobble-grey', 'paver', 'asphalt'] as const;
/** Ways for the network check: the paved and trodden ones, and the plank bridges, decks and boardwalks. */
const NETWORK_BLOCKS = [...WAY_BLOCKS, 'planks'];
/** A place is on the ways when a way cell lies this close (blocks); a lesson district's centre, this close. */
const ON_WAY = 4;
const ZONE_ON_WAY = 14;
const TRUNK_BLOCKS = ['log', 'tree-log', 'birch-log', 'tree-birch-log'];
const LEAF_BLOCKS = ['leaves', 'leaves-autumn', 'leaves-pink'];
/** A way at most this many blocks across is a lane: its middle stays clear. */
const LANE_WIDTH = 7;
/** A trunk is a tree's when leaves hang this close above or round its top. */
const CROWN_REACH = 3;

export interface SceneryFinding {
  kind: 'tree-on-way' | 'prop-in-way' | 'off-the-ways' | 'cut-off';
  at: [number, number, number];
  what: string;
}

export async function auditScenery(map: string): Promise<SceneryFinding[]> {
  const dir = path.join(ASSETS_DIR, 'generated/world', map);
  const e = JSON.parse(await readFile(path.join(dir, 'entities.json'), 'utf8')) as WorldEntities;
  const [SX, SY, SZ] = e.size;
  const world = new VoxelWorld([SX / 16, SY / 16, SZ / 16]);
  for (const f of await readdir(path.join(dir, 'regions'))) {
    const m = /^r(-?\d+)-(-?\d+)\.bin$/.exec(f);
    if (m) insertRegion(world, Number(m[1]), Number(m[2]), new Uint8Array(await readFile(path.join(dir, 'regions', f))));
  }
  const table = blockTableSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/blocks.json'), 'utf8')));
  const idsOf = (names: readonly string[]): Set<number> => new Set(table.blocks.filter((b) => names.includes(b.name)).map((b) => b.id));
  const [way, trunk, leaf] = [idsOf(WAY_BLOCKS), idsOf(TRUNK_BLOCKS), idsOf(LEAF_BLOCKS)];
  const nameOf = new Map(table.blocks.map((b) => [b.id, b.name]));
  const inside = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < SX && z < SZ;
  const findings: SceneryFinding[] = [];

  // Block trees: a trunk standing straight on a way block, with a crown of leaves over it.
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      for (let y = 1; y < SY - 1; y++) {
        if (!trunk.has(world.get(x, y, z)) || !way.has(world.get(x, y - 1, z))) continue;
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
  const groundUnder = (x: number, y: number, z: number): number => {
    for (let gy = Math.min(SY - 1, y); gy >= Math.max(0, y - 2); gy--) {
      const id = world.get(x, gy, z);
      if (id !== 0) return id;
    }
    return 0;
  };
  for (const p of e.props) {
    const [x, z] = [Math.floor(p.position[0]), Math.floor(p.position[2])];
    const y = Math.floor(p.position[1]);
    if (!inside(x, z) || !way.has(groundUnder(x, y - 1, z))) continue;
    const file = p.model.split('/').pop() ?? p.model;
    if (/^tree|_tree|palm|bamboo|pine/i.test(file) && !/street/i.test(file)) {
      findings.push({ kind: 'tree-on-way', at: [x, y, z], what: file });
      continue;
    }
    if (modelTraversal(catalog, p.model) === 'walk-through') continue;
    // A lane (way at most LANE_WIDTH across one way) is for walking: a solid prop stands at its edge, not in
    // its middle. Squares, yards and market floors are wider and keep their benches, stalls and fountains.
    const wayAt = (dx: number, dz: number): boolean => inside(x + dx, z + dz) && way.has(groundUnder(x + dx, y - 1, z + dz));
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
    if (laneAlongZ || laneAlongX) findings.push({ kind: 'prop-in-way', at: [x, y, z], what: file });
  }
  findings.push(...wayNetwork(world, e, idsOf(NETWORK_BLOCKS)));
  return findings;
}

/**
 * The map's ways as one network (owner, 02/10/2026: clear lanes joining every sensible pair of places; where
 * the child starts, a way leads to where she goes): every place the child starts from or heads for — the
 * spawn, each chapter's start, the gates, every ride's stop and arrival, the lesson districts and the named
 * places — lies by a way, and all of them are on one network of way cells (stepping up or down one block),
 * a ride joining its stop to its arrival (a boat across the sea, a cable car up the mountain).
 */
function wayNetwork(world: VoxelWorld, e: WorldEntities, network: ReadonlySet<number>): SceneryFinding[] {
  const [SX, SY, SZ] = e.size;
  // The way cell under each column's highest standing spot that is on a way (block coordinates of the way block).
  const wayTop = new Int16Array(SX * SZ).fill(-1);
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      for (let y = SY - 2; y >= 1; y--) {
        if (network.has(world.get(x, y, z)) && world.get(x, y + 1, z) === 0) {
          wayTop[x + z * SX] = y;
          break;
        }
      }
    }
  }
  // Components of way cells, 4-connected, at most one block up or down.
  const comp = new Int32Array(SX * SZ).fill(-1);
  let count = 0;
  for (let i = 0; i < SX * SZ; i++) {
    if (wayTop[i] === -1 || comp[i] !== -1) continue;
    const stack = [i];
    comp[i] = count;
    while (stack.length > 0) {
      const c = stack.pop() as number;
      const [x, z] = [c % SX, Math.floor(c / SX)];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const [nx, nz] = [x + dx, z + dz];
        if (nx < 0 || nz < 0 || nx >= SX || nz >= SZ) continue;
        const n = nx + nz * SX;
        if (wayTop[n] === -1 || comp[n] !== -1 || Math.abs((wayTop[n] ?? 0) - (wayTop[c] ?? 0)) > 1) continue;
        comp[n] = count;
        stack.push(n);
      }
    }
    count++;
  }
  const nearest = (px: number, pz: number, reach: number): number => {
    const [cx, cz] = [Math.floor(px), Math.floor(pz)];
    for (let r = 0; r <= reach; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const [x, z] = [cx + dx, cz + dz];
          if (x >= 0 && z >= 0 && x < SX && z < SZ && (comp[x + z * SX] ?? -1) !== -1) return comp[x + z * SX] ?? -1;
        }
      }
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
  ];
  const findings: SceneryFinding[] = [];
  const compOf = new Map<string, number>();
  for (const p of places) {
    const c = nearest(p.at[0] ?? 0, p.at[2] ?? 0, p.reach);
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

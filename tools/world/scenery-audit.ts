// `pnpm exec tsx tools/world/scenery-audit.ts <map>…`: a generated map against the scenery rules
// (.claude/rules/world-scenery.md, owner 02/10/2026: "cây lại mọc giữa đường… khung cảnh phải giống như ngoài
// đời thật"): trees standing on a way (a road, a lane, a path, a paved square or yard) instead of beside it or
// in a bed of earth, and solid props standing in a lane's middle. Reads the committed files; prints each finding
// with its cell so the generator can be fixed where it placed it. Solid props count only on lanes: squares,
// yards and market floors keep their benches, stalls and fountains.
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
const TRUNK_BLOCKS = ['log', 'tree-log', 'birch-log', 'tree-birch-log'];
const LEAF_BLOCKS = ['leaves', 'leaves-autumn', 'leaves-pink'];
/** A way at most this many blocks across is a lane: its middle stays clear. */
const LANE_WIDTH = 7;
/** A trunk is a tree's when leaves hang this close above or round its top. */
const CROWN_REACH = 3;

export interface SceneryFinding {
  kind: 'tree-on-way' | 'prop-in-way';
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
  return findings;
}

async function main(): Promise<void> {
  for (const map of process.argv.slice(2)) {
    const findings = await auditScenery(map);
    const trees = findings.filter((f) => f.kind === 'tree-on-way');
    const props = findings.filter((f) => f.kind === 'prop-in-way');
    console.log(`${map}: ${trees.length} trees on a way, ${props.length} solid props in a lane`);
    for (const f of findings.slice(0, 40)) console.log(`  ${f.kind} [${f.at.join(',')}] ${f.what}`);
    if (findings.length > 40) console.log(`  … ${findings.length - 40} more`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

import { describe, expect, it } from 'vitest';
import table from '../../../content/blocks.json';
import { VoxelWorld } from './chunk-format';
import { inCore, OUTLAND_MODELS, outlandBlocks, type OutlandSpec, type OutlandTheme } from './outland';
import { drawTree, forEachTree, outlandSkyline, planOutland, ROAD, sampleColumn, type ColumnSample, type OutlandPlan, type Tree } from './outland-plan';
import { fillOutlandRegion } from './outland-region';
import { REGION_BLOCKS, REGION_CHUNKS } from './region-format';

const SIZE = [800, 48, 800] as const;
const blocks = outlandBlocks(table.blocks);
const nameOf = new Map(table.blocks.map((b) => [b.id, b.name]));

/** As in outland-plan.test.ts: a waving edge, the core's river on the north and south edges, a pond on the west. */
function testSpec(theme: OutlandTheme = 'river', seed = 1234): { spec: OutlandSpec; waterLevel: number } {
  const ground = theme === 'castle' ? 16 : 12;
  const waterLevel = ground - 2;
  const edge = (wet: (i: number) => boolean): number[] => Array.from({ length: SIZE[0] }, (_, i) => (wet(i) ? waterLevel - 2 : ground + 1 + Math.round(Math.sin(i / 37) * 1.4)));
  return {
    waterLevel,
    spec: {
      seed,
      theme,
      ground,
      edge: { north: edge((i) => i >= 300 && i < 330), south: edge((i) => i >= 300 && i < 330), west: edge((i) => i >= 600 && i < 612), east: edge(() => false) },
      models: Object.fromEntries(OUTLAND_MODELS.map((m) => [m, 1])),
    },
  };
}

function plan(theme: OutlandTheme = 'river'): OutlandPlan {
  const { spec, waterLevel } = testSpec(theme);
  return planOutland(spec, SIZE, waterLevel);
}

const region = (): VoxelWorld => new VoxelWorld([REGION_CHUNKS, SIZE[1] / 16, REGION_CHUNKS]);

function fill(p: OutlandPlan, rx: number, rz: number, out = region()): VoxelWorld {
  fillOutlandRegion(p, blocks, rx, rz, out);
  return out;
}

/** The top non-air block of a column of a filled region (y -1 when the column is empty). */
function top(world: VoxelWorld, lx: number, lz: number): { y: number; id: number } {
  for (let y = world.size[1] - 1; y >= 0; y--) {
    const id = world.get(lx, y, lz);
    if (id !== 0) return { y, id };
  }
  return { y: -1, id: 0 };
}

const regionOf = (x: number, z: number): [number, number] => [Math.floor(x / REGION_BLOCKS), Math.floor(z / REGION_BLOCKS)];

describe('outland regions', () => {
  const p = plan();
  const village = p.villages[0];
  if (!village) throw new Error('no village');
  const [vrx, vrz] = regionOf(village.x, village.z);

  it('fills a region the same every time, whichever regions were filled before', () => {
    const a = fill(p, vrx, vrz);
    const b = fill(planOutland(testSpec().spec, SIZE, testSpec().waterLevel), vrx, vrz);
    expect(Buffer.from(b.data).equals(Buffer.from(a.data))).toBe(true);
    // A reused buffer that held a neighbour first ends up identical.
    const reused = fill(p, vrx + 1, vrz);
    fill(p, vrx, vrz, reused);
    expect(Buffer.from(reused.data).equals(Buffer.from(a.data))).toBe(true);
  });

  it('matches the skyline in every column: crowns and roofs across region borders are whole', () => {
    // A village region, its neighbours, the region at the north gate (the core's edge, a road, the pond).
    const cases: Array<[number, number]> = [[vrx, vrz], [vrx + 1, vrz], [vrx, vrz + 1], [vrx - 1, vrz - 1], [3, -1], [-1, 4]];
    for (const [rx, rz] of cases) {
      const world = fill(p, rx, rz);
      for (let lz = 0; lz < REGION_BLOCKS; lz++) {
        for (let lx = 0; lx < REGION_BLOCKS; lx++) {
          const x = rx * REGION_BLOCKS + lx;
          const z = rz * REGION_BLOCKS + lz;
          if (inCore(p.size, x, z)) continue;
          const sky = outlandSkyline(p, x, z);
          const got = top(world, lx, lz);
          if (got.y !== sky.y || nameOf.get(got.id) !== sky.block) expect({ x, z, y: got.y, block: nameOf.get(got.id) }).toEqual({ x, z, y: sky.y, block: sky.block });
        }
      }
    }
  });

  it('draws a tree whose crown crosses a region border on both sides', () => {
    // Four regions side by side, put together; every tree crossing their inner borders must be complete.
    const [rx0, rz0] = [vrx + 2, vrz + 2];
    const span = 2 * REGION_BLOCKS;
    const parts = [0, 1, 2, 3].map((k) => fill(p, rx0 + (k % 2), rz0 + Math.floor(k / 2)));
    const at = (x: number, y: number, z: number): number => {
      const lx = x - rx0 * REGION_BLOCKS;
      const lz = z - rz0 * REGION_BLOCKS;
      const part = parts[Math.floor(lx / REGION_BLOCKS) + 2 * Math.floor(lz / REGION_BLOCKS)];
      return part?.get(lx % REGION_BLOCKS, y, lz % REGION_BLOCKS) ?? -1;
    };
    const midX = (rx0 + 1) * REGION_BLOCKS;
    const midZ = (rz0 + 1) * REGION_BLOCKS;
    let crossing = 0;
    forEachTree(p, rx0 * REGION_BLOCKS + 2, rz0 * REGION_BLOCKS + 2, rx0 * REGION_BLOCKS + span - 3, rz0 * REGION_BLOCKS + span - 3, (t: Tree) => {
      if (Math.abs(t.x - midX + 0.5) > 3 && Math.abs(t.z - midZ + 0.5) > 3) return;
      crossing++;
      drawTree(p, t, (x, y, z, block, leaf) => {
        const id = at(x, y, z);
        if (leaf) expect(id, `leaf of the tree at ${t.x},${t.z}`).not.toBe(0);
        else expect(nameOf.get(id), `trunk of the tree at ${t.x},${t.z}`).toBe(block);
      }, rx0 * REGION_BLOCKS, rz0 * REGION_BLOCKS, rx0 * REGION_BLOCKS + span - 1, rz0 * REGION_BLOCKS + span - 1);
    });
    expect(crossing).toBeGreaterThan(0);
  });

  it('leaves the core to the core and the world outside the bounds empty', () => {
    const out = region();
    out.data.fill(99);
    fill(p, 0, 0, out); // wholly the core
    expect(out.data.every((v) => v === 99)).toBe(true);
    fill(p, 6, 3, out); // the core's east edge (800) runs through it
    for (let lz = 0; lz < REGION_BLOCKS; lz += 7) {
      for (let lx = 0; lx < REGION_BLOCKS; lx++) {
        const core = inCore(p.size, 6 * REGION_BLOCKS + lx, 3 * REGION_BLOCKS + lz);
        expect(out.get(lx, 47, lz) === 99, `${lx},${lz}`).toBe(core);
      }
    }
    expect(fill(p, -20, 0).data.every((v) => v === 0)).toBe(true);
    expect(fill(p, 0, 26).data.every((v) => v === 0)).toBe(true);
    expect(() => fillOutlandRegion(p, blocks, 1, 1, new VoxelWorld([4, 3, 4]))).toThrow(/chunks/);
  });

  it('gives a road two free blocks over it and a bridge a plank deck', () => {
    const s: ColumnSample = { ground: 0, deck: -1, flags: 0 };
    let bridges = 0;
    // The roads out of the core sides, region by region.
    for (const road of p.roads.filter((r) => r.from.kind === 'side')) {
      const worlds = new Map<string, VoxelWorld>();
      for (let i = 0; i < road.pts.length; i += 2) {
        const x = Math.floor(road.pts[i] ?? 0);
        const z = Math.floor(road.pts[i + 1] ?? 0);
        if (inCore(p.size, x, z)) continue;
        const [rx, rz] = regionOf(x, z);
        const key = `${rx},${rz}`;
        const world = worlds.get(key) ?? fill(p, rx, rz);
        worlds.set(key, world);
        sampleColumn(p, x, z, s);
        expect(s.flags & ROAD).toBe(ROAD);
        const y = s.deck >= 0 ? s.deck : s.ground;
        const [lx, lz] = [x - rx * REGION_BLOCKS, z - rz * REGION_BLOCKS];
        expect(nameOf.get(world.get(lx, y, lz)), `road surface at ${x},${z}`).toBe(s.deck >= 0 ? 'planks' : 'path');
        expect([world.get(lx, y + 1, lz), world.get(lx, y + 2, lz)], `headroom at ${x},${z}`).toEqual([0, 0]);
        if (s.deck >= 0) bridges++;
      }
    }
    // The village roads cross the rivers somewhere: every bridge column has its deck.
    for (const road of p.roads) {
      for (let i = 0; i < road.pts.length && bridges < 3; i += 2) {
        const x = Math.floor(road.pts[i] ?? 0);
        const z = Math.floor(road.pts[i + 1] ?? 0);
        if (sampleColumn(p, x, z, s).deck < 0 || (s.flags & ROAD) === 0) continue;
        const [rx, rz] = regionOf(x, z);
        expect(nameOf.get(fill(p, rx, rz).get(x - rx * REGION_BLOCKS, s.deck, z - rz * REGION_BLOCKS))).toBe('planks');
        bridges++;
      }
    }
    expect(bridges).toBeGreaterThan(0);
  });

  it('fills a region within its time budget', () => {
    const out = region();
    const t0 = performance.now();
    let n = 0;
    for (let rz = -6; rz < 12; rz += 4) {
      for (let rx = -6; rx < 12; rx += 4) {
        fill(p, rx, rz, out);
        n++;
      }
    }
    // Typically under 10 ms in Node; 50 ms is the game's budget per region, doubled against a busy machine.
    expect((performance.now() - t0) / n).toBeLessThan(100);
  });
});

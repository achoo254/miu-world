import { describe, expect, it } from 'vitest';
import { inCore, OUTLAND_MODELS, type OutlandSpec, type OutlandTheme } from './outland';
import { outlandGround, outlandSkyline, planOutland, ROAD, sampleColumn, structureExtent, WATER, type ColumnSample, type OutlandPlan, VILLAGE } from './outland-plan';

const SIZE = [800, 48, 800] as const;

/**
 * A map's outer-land spec as the tools would write it: a gently waving edge one block over the ground, the
 * core's river crossing the north and south edges and a pond on the west edge (water columns), every model.
 */
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

function plan(theme: OutlandTheme = 'river', seed = 1234): OutlandPlan {
  const { spec, waterLevel } = testSpec(theme, seed);
  return planOutland(spec, SIZE, waterLevel);
}

const sample = (): ColumnSample => ({ ground: 0, deck: -1, flags: 0 });

/** The layout as plain data (arrays of numbers), for comparing two plans. */
function layout(p: OutlandPlan): unknown {
  return {
    rivers: p.rivers.map((r) => [...r.pts]),
    lakes: p.lakes,
    villages: p.villages,
    roads: p.roads.map((r) => [[...r.pts], [...r.profile], r.from, r.to]),
    structures: p.structures,
    fields: p.fields,
    clearings: p.clearings,
    sides: p.sides,
  };
}

describe('outland plan', () => {
  it('lays out the same land for the same spec, in budget', () => {
    // The fastest of five runs meets the budget: the first run pays for a cold JIT, and on a busy CI
    // machine any single run may wait for a core; the fastest one is the plan's own cost.
    let ms = Infinity;
    let a = plan();
    for (let run = 0; run < 5; run++) {
      const t0 = performance.now();
      a = plan();
      ms = Math.min(ms, performance.now() - t0);
    }
    const b = plan();
    expect(layout(b)).toEqual(layout(a));
    for (let i = 0; i < 2000; i++) {
      const x = -2400 + ((i * 7919) % 5700);
      const z = -2400 + ((i * 104729) % 5700);
      expect(outlandGround(b, x, z)).toBe(outlandGround(a, x, z));
      expect(outlandSkyline(b, x, z)).toEqual(outlandSkyline(a, x, z));
    }
    expect(layout(plan('river', 99))).not.toEqual(layout(a));
    expect(ms).toBeLessThan(200);
  });

  it('meets the core edge within a block, water carrying on outward where the edge is water', () => {
    const { spec, waterLevel } = testSpec();
    const p = planOutland(spec, SIZE, waterLevel);
    const s = sample();
    const sides: ReadonlyArray<readonly ['north' | 'south' | 'west' | 'east', (i: number) => readonly [number, number]]> = [
      ['north', (i) => [i, -1]],
      ['south', (i) => [i, SIZE[2]]],
      ['west', (i) => [-1, i]],
      ['east', (i) => [SIZE[0], i]],
    ];
    for (const [side, column] of sides) {
      for (const [i, edge] of spec.edge[side].entries()) {
        const [x, z] = column(i);
        sampleColumn(p, x, z, s);
        if (edge < waterLevel) expect((s.flags & WATER) !== 0, `${side} ${i} stays water`).toBe(true);
        else expect(Math.abs(outlandGround(p, x, z) - edge), `${side} ${i}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the ground under the world top with room for trees, and slopes walkable', () => {
    const p = plan('castle');
    let steep = 0;
    let steps = 0;
    for (let z = -2400; z < 3300; z += 97) {
      let last = outlandGround(p, -2400, z);
      for (let x = -2399; x < 3300; x += 1) {
        if (inCore(p.size, x, z)) continue;
        const g = outlandGround(p, x, z);
        expect(g).toBeLessThanOrEqual(34);
        if (Math.abs(g - last) > 2) steep++;
        last = g;
        steps++;
      }
    }
    // Hills, banks and bridges' ends may rise two blocks at once; more than that is a rare cliff.
    expect(steep / steps).toBeLessThan(0.002);
  });

  it('lays a road out of the middle of every core side to a village, walkable all along', () => {
    for (const theme of ['river', 'castle'] as const) {
      const p = plan(theme);
      expect(p.sides.map((g) => g.side).sort()).toEqual(['east', 'north', 'south', 'west']);
      for (const g of p.sides) {
        const road = p.roads.find((r) => r.from.kind === 'side' && r.from.side === g.side);
        expect(road?.to.kind, `${theme} ${g.side}`).toBe('village');
      }
      const s = sample();
      const n = sample();
      let checked = 0;
      for (const road of p.roads) {
        const pts = road.pts;
        for (let i = 0; i + 3 < pts.length; i += 2) {
          for (let t = 0; t < 1; t += 0.125) {
            const x = Math.floor((pts[i] ?? 0) + ((pts[i + 2] ?? 0) - (pts[i] ?? 0)) * t);
            const z = Math.floor((pts[i + 1] ?? 0) + ((pts[i + 3] ?? 0) - (pts[i + 1] ?? 0)) * t);
            if (inCore(p.size, x, z)) continue;
            sampleColumn(p, x, z, s);
            expect(s.flags & ROAD, `${theme} road column ${x},${z}`).toBe(ROAD);
            const here = outlandGround(p, x, z);
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
              if (inCore(p.size, x + dx, z + dz)) continue;
              if ((sampleColumn(p, x + dx, z + dz, n).flags & ROAD) === 0) continue;
              expect(Math.abs(outlandGround(p, x + dx, z + dz) - here), `${theme} step at ${x},${z}`).toBeLessThanOrEqual(1);
              checked++;
            }
          }
        }
      }
      expect(checked).toBeGreaterThan(10000);
    }
  });

  it('runs its roads level: no one-block bump or dip along them, climbing only over the hills', () => {
    for (const theme of ['river', 'castle', 'farm'] as const) {
      const p = plan(theme);
      let columns = 0;
      let wobbles = 0;
      for (const road of p.roads) {
        // The road's ground block by block along its middle line, outside the core.
        const heights: number[] = [];
        const pts = road.pts;
        for (let i = 0; i + 3 < pts.length; i += 2) {
          for (let t = 0; t < 1; t += 0.25) {
            const x = Math.floor((pts[i] ?? 0) + ((pts[i + 2] ?? 0) - (pts[i] ?? 0)) * t);
            const z = Math.floor((pts[i + 1] ?? 0) + ((pts[i + 3] ?? 0) - (pts[i + 1] ?? 0)) * t);
            if (!inCore(p.size, x, z)) heights.push(outlandGround(p, x, z));
          }
        }
        // A wobble: a run of at most a dozen columns one block off the same height on both sides.
        for (let i = 1; i < heights.length; ) {
          let j = i;
          while (j + 1 < heights.length && heights[j + 1] === heights[i]) j++;
          const [before, after, v] = [heights[i - 1], heights[j + 1], heights[i] ?? 0];
          if (before !== undefined && before === after && Math.abs(v - before) === 1 && j - i + 1 <= 12) wobbles++;
          i = j + 1;
        }
        columns += heights.length;
      }
      expect(columns).toBeGreaterThan(2000);
      expect(wobbles / columns, theme).toBeLessThan(0.001);
    }
  });

  it('builds the villages on level land, their houses on the pad and off the roads', () => {
    const p = plan('market');
    const s = sample();
    expect(p.villages.length).toBeGreaterThanOrEqual(25);
    expect(new Set(p.villages.map((v) => v.name)).size).toBe(p.villages.length);
    expect(p.villages.every((v) => !/miu/i.test(v.name))).toBe(true);
    for (const v of p.villages) {
      expect(sampleColumn(p, v.x, v.z, s).flags & WATER).toBe(0);
      expect(v.structures.length).toBeGreaterThanOrEqual(3);
      for (const index of v.structures) {
        const st = p.structures[index];
        if (!st) throw new Error(`missing structure ${index}`);
        const [x0, z0, x1, z1] = structureExtent(st);
        for (let x = x0; x <= x1; x++) {
          for (let z = z0; z <= z1; z++) {
            sampleColumn(p, x, z, s);
            // Village ground only: no road, water, shore or bridge under a building.
            expect(s.flags & ~VILLAGE, `${v.name} ${st.kind} at ${x},${z}`).toBe(0);
            expect(s.ground, `${v.name} ${st.kind} floor at ${x},${z}`).toBe(st.base - 1);
          }
        }
      }
    }
  });

  it('answers ground and skyline lookups fast enough for the far horizon', () => {
    const p = plan('forest');
    const t0 = performance.now();
    let sum = 0;
    for (let i = 0; i < 200_000; i++) sum += outlandSkyline(p, -2400 + (i % 450) * 12, -2400 + Math.floor(i / 450) * 12).y;
    const ms = performance.now() - t0;
    expect(sum).toBeGreaterThan(0);
    // About 0.3 s on a dev machine; twice that and more is a regression.
    expect(ms).toBeLessThan(1500);
  });
});

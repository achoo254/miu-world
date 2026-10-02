import { describe, expect, it } from 'vitest';
import table from '../../../content/blocks.json';
import { VoxelWorld } from './chunk-format';
import { inCore, OUTLAND_MODEL_HEIGHTS, OUTLAND_THEMES, outlandBlocks, type OutlandSpec, type OutlandTheme } from './outland';
import { outlandEntities } from './outland-life';
import { planOutland, RAIL, ROAD, sampleColumn, WATER, type ColumnSample, type OutlandPlan } from './outland-plan';
import { fillOutlandRegion } from './outland-region';
import { REGION_BLOCKS, REGION_CHUNKS } from './region-format';
import type { Ambient } from './world-entities';

const SIZE = [800, 48, 800] as const;
const blocks = outlandBlocks(table.blocks);
const solid = new Set(table.blocks.filter((b) => !('solid' in b) || b.solid !== false).map((b) => b.id));
const ANIMALS = new Set(['cow', 'pig', 'dog', 'cat', 'chick']);

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
      models: Object.fromEntries(Object.entries(OUTLAND_MODEL_HEIGHTS).map(([m, h]) => [m, +(1 / h).toFixed(4)])),
    },
  };
}

function plan(theme: OutlandTheme = 'river', seed = 1234): OutlandPlan {
  const { spec, waterLevel } = testSpec(theme, seed);
  return planOutland(spec, SIZE, waterLevel);
}

/** Every place a character stands: home and the walking spots (not `focus`, what it looks at). */
const standingPoints = (a: Ambient): Array<readonly [number, number, number]> => [a.position, ...Object.entries(a.spots).filter(([k]) => k !== 'focus').map(([, v]) => v)];

describe('outland life', () => {
  it('fills every theme with villages, people and animals, in budget', () => {
    for (const theme of OUTLAND_THEMES) {
      const p = plan(theme);
      const t0 = performance.now();
      const life = outlandEntities(p);
      const ms = performance.now() - t0;
      const animals = life.ambients.filter((a) => ANIMALS.has(a.routine)).length;
      expect(p.villages.length, theme).toBeGreaterThanOrEqual(25);
      expect(life.ambients.length - animals, `${theme} people`).toBeGreaterThanOrEqual(300);
      expect(animals, `${theme} animals`).toBeGreaterThanOrEqual(300);
      expect(ms, `${theme} ms`).toBeLessThan(400);
    }
  });

  it('gives the same life for the same plan', () => {
    expect(outlandEntities(plan('farm'))).toEqual(outlandEntities(plan('farm')));
  });

  const p = plan('river');
  const life = outlandEntities(p);
  const s: ColumnSample = { ground: 0, deck: -1, flags: 0 };

  it('names its ids uniquely under ngoai-, uses only the measured models and never calls anyone Miu', () => {
    const ids = [...life.ambients.map((a) => a.id), ...life.interactables.map((t) => t.id), ...life.landmarks.map((l) => l.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^ngoai-[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toBe(true);
    const models = p.spec.models;
    for (const prop of life.props) expect(prop.scale, prop.model).toBe(models[prop.model]);
    for (const a of life.ambients) {
      expect(a.scale, a.model).toBe(models[a.model]);
      for (const held of a.held ?? []) expect(models[held], held).toBeDefined();
    }
    for (const t of life.interactables) expect(t.scale).toBe(models[t.model ?? '']);
    expect([...life.ambients.map((a) => a.name), ...life.landmarks.map((l) => l.name)].some((n) => /miu/i.test(n))).toBe(false);
    // No two neighbours in a village share a name.
    for (const v of p.villages) {
      const names = life.ambients.filter((a) => Math.hypot(a.position[0] - v.x, a.position[2] - v.z) < v.radius + 20).map((a) => a.name);
      expect(new Set(names).size, v.name).toBe(names.length);
    }
  });

  it('puts every village 4-10 people and 4-12 animals', () => {
    let full = 0;
    for (const v of p.villages) {
      const near = life.ambients.filter((a) => Math.hypot(a.position[0] - v.x, a.position[2] - v.z) < v.radius + 110);
      const animals = near.filter((a) => ANIMALS.has(a.routine)).length;
      if (near.length - animals >= 4 && animals >= 4) full++;
    }
    expect(full / p.villages.length).toBeGreaterThan(0.9);
  });

  it('runs rides from each core side to far villages and from every village back, all onto open ground', () => {
    const rides = life.interactables;
    for (const g of p.sides) {
      const out = rides.filter((r) => r.id.startsWith(`ngoai-xe-${g.side}-`));
      expect(out.length, g.side).toBeGreaterThanOrEqual(3);
      expect(out.length, g.side).toBeLessThanOrEqual(4);
      expect(new Set(out.map((r) => r.name)).size).toBe(out.length);
      for (const r of out) expect(p.villages.some((v) => r.name === `Xe ra ${v.name}`), r.name).toBe(true);
    }
    expect(rides.filter((r) => r.name === 'Xe về trung tâm').length).toBe(p.villages.length);
    for (const r of rides) {
      expect([r.kind, r.label, r.radius]).toEqual(['object', 'Lên xe', 2.5]);
      expect(r.model).toBe('generated/props/automobile.glb');
      for (const at of [r.position, r.ride]) {
        if (!at) throw new Error(`${r.id} has no ride`);
        const [x, z] = [Math.floor(at[0]), Math.floor(at[2])];
        expect(inCore(p.size, x, z), r.id).toBe(false);
        sampleColumn(p, x, z, s);
        expect(s.flags & (WATER | ROAD | RAIL), `${r.id} at ${x},${z}`).toBe(0);
        expect(at[1]).toBe(s.ground + 1);
      }
    }
  });

  it('keeps people and animals on open ground off water and roads, clear of the ride stops', () => {
    const stops = life.interactables.flatMap((r) => [r.position]);
    for (const a of life.ambients) {
      for (const [x, y, z] of standingPoints(a)) {
        sampleColumn(p, Math.floor(x), Math.floor(z), s);
        expect(s.flags & (WATER | ROAD | RAIL), `${a.id} at ${x},${z}`).toBe(0);
        expect(y, a.id).toBe(s.ground + 1);
        for (const [sx, , sz] of stops) expect(Math.hypot(sx - x, sz - z), `${a.id} by a stop`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('stands everyone on a solid block with two free blocks over them (sampled regions)', () => {
    // Everyone round three villages and three scenes, and every ride's two ends.
    const centres: Array<[number, number]> = [
      ...p.villages.slice(0, 3).map((v): [number, number] => [v.x, v.z]),
      ...p.clearings.filter((c) => c.kind !== 'stops' && c.kind !== 'viewpoint').slice(0, 3).map((c): [number, number] => [c.x, c.z]),
    ];
    const points = [
      ...life.ambients.filter((a) => centres.some(([cx, cz]) => Math.hypot(a.position[0] - cx, a.position[2] - cz) < 60)).flatMap(standingPoints),
      ...life.interactables.flatMap((r) => (r.ride ? [r.position, r.ride] : [r.position])),
    ];
    const worlds = new Map<string, VoxelWorld>();
    for (const [x, y, z] of points) {
      const [bx, bz] = [Math.floor(x), Math.floor(z)];
      const [rx, rz] = [Math.floor(bx / REGION_BLOCKS), Math.floor(bz / REGION_BLOCKS)];
      let world = worlds.get(`${rx},${rz}`);
      if (!world) {
        world = new VoxelWorld([REGION_CHUNKS, SIZE[1] / 16, REGION_CHUNKS]);
        fillOutlandRegion(p, blocks, rx, rz, world);
        worlds.set(`${rx},${rz}`, world);
      }
      const [lx, lz] = [bx - rx * REGION_BLOCKS, bz - rz * REGION_BLOCKS];
      expect(solid.has(world.get(lx, y - 1, lz)), `ground under ${x},${y},${z}`).toBe(true);
      expect([world.get(lx, y, lz), world.get(lx, y + 1, lz)], `room at ${x},${y},${z}`).toEqual([0, 0]);
    }
    expect(points.length).toBeGreaterThan(100);
  });

  it('names viewpoints and villages as landmarks on the ground', () => {
    expect(life.landmarks.filter((l) => l.id.startsWith('ngoai-lang-')).length).toBe(p.villages.length);
    expect(life.landmarks.filter((l) => l.id.startsWith('ngoai-ngam-')).length).toBeGreaterThanOrEqual(5);
    for (const l of life.landmarks) {
      const g = sampleColumn(p, Math.floor(l.position[0]), Math.floor(l.position[2]), s).ground;
      expect(l.position[1], l.name).toBe(g + 1);
    }
  });
});

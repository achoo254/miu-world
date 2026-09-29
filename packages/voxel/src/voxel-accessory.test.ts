import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAccessory } from './accessory-schema';
import { MAX_ACCESSORY_TRIANGLES, buildAccessoryMesh } from './voxel-accessory';

const CONTENT = path.resolve(import.meta.dirname, '../../../content/accessories');

function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'test',
    slot: 'hat',
    attachNode: 'head',
    voxelSize: 0.5,
    offset: [0, 0, 0],
    palette: { a: '#ff0000', b: '#00ff00' },
    boxes: [{ x: 0, y: 0, z: 0, w: 2, h: 1, d: 1, color: 'a' }],
    ...overrides,
  };
}

describe('accessory schema', () => {
  it('rejects colors missing from the palette', () => {
    expect(() => parseAccessory(base({ boxes: [{ x: 0, y: 0, z: 0, w: 1, h: 1, d: 1, color: 'nope' }] }))).toThrow(/not in the palette/);
  });

  it('rejects an unknown slot and non-integer boxes', () => {
    expect(() => parseAccessory(base({ slot: 'cape' }))).toThrow();
    expect(() => parseAccessory(base({ boxes: [{ x: 0.5, y: 0, z: 0, w: 1, h: 1, d: 1, color: 'a' }] }))).toThrow();
  });

  it('rejects a variant overriding an unknown color', () => {
    expect(() => parseAccessory(base({ variants: { blue: { zzz: '#0000ff' } } }))).toThrow(/unknown color/);
  });
});

describe('buildAccessoryMesh', () => {
  it('a 2x1x1 box exposes 10 faces and merges into 6 quads', () => {
    const mesh = buildAccessoryMesh(parseAccessory(base()));
    expect(mesh.exposedFaces).toBe(10);
    expect(mesh.triangles).toBe(12);
  });

  it('builds the same mesh from layers as from boxes', () => {
    const fromLayers = buildAccessoryMesh(
      parseAccessory(base({ boxes: [], layers: { origin: [0, 0, 0], legend: { A: 'a' }, rows: [['AA']] } })),
    );
    expect(fromLayers.exposedFaces).toBe(10);
    expect(Array.from(fromLayers.geometry.positions)).toEqual(Array.from(buildAccessoryMesh(parseAccessory(base())).geometry.positions));
  });

  it('palette variants recolor without changing geometry', () => {
    const def = parseAccessory(base({ variants: { blue: { a: '#0000ff' } } }));
    const red = buildAccessoryMesh(def);
    const blue = buildAccessoryMesh(def, 'blue');
    expect(Array.from(blue.geometry.positions)).toEqual(Array.from(red.geometry.positions));
    expect(Array.from(red.geometry.extra.color?.slice(0, 3) ?? [])).toEqual([1, 0, 0]);
    expect(Array.from(blue.geometry.extra.color?.slice(0, 3) ?? [])).toEqual([0, 0, 1]);
  });

  for (const file of readdirSync(CONTENT).filter((f) => f.endsWith('.json'))) {
    it(`${file} parses, stays within budget, and every variant builds`, () => {
      const def = parseAccessory(JSON.parse(readFileSync(path.join(CONTENT, file), 'utf8')));
      const mesh = buildAccessoryMesh(def);
      expect(mesh.triangles).toBeLessThanOrEqual(MAX_ACCESSORY_TRIANGLES);
      for (const variant of Object.keys(def.variants)) expect(buildAccessoryMesh(def, variant).triangles).toBe(mesh.triangles);
    });
  }
});

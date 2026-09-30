import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAccessoryCatalog, parseAccessory } from './accessory-schema';
import { MAX_ACCESSORY_TRIANGLES, buildAccessoryMesh } from './voxel-accessory';

const CONTENT = path.resolve(import.meta.dirname, '../../../content/accessories');

function base(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'test',
    name: 'Mũ thử',
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

  const files = readdirSync(CONTENT).filter((f) => f.endsWith('.json'));
  const catalog = buildAccessoryCatalog(files.map((f) => JSON.parse(readFileSync(path.join(CONTENT, f), 'utf8')) as unknown));

  it('every content file is one catalogue item', () => {
    expect([...catalog.keys()].sort()).toEqual(files.map((f) => f.replace(/\.json$/, '')).sort());
  });

  for (const item of catalog.values()) {
    it(`${item.id} builds within budget, and every colour of its shape too`, () => {
      const mesh = buildAccessoryMesh(item.def, item.variant);
      expect(mesh.triangles).toBeLessThanOrEqual(MAX_ACCESSORY_TRIANGLES);
      for (const variant of Object.keys(item.def.variants)) expect(buildAccessoryMesh(item.def, variant).triangles).toBe(mesh.triangles);
    });
  }
});

describe('accessory catalogue', () => {
  const hat = base({ id: 'hat-a', variants: { blue: { a: '#0000ff' } } });

  it('turns a variant file into an item with the base shape, slot and its own unlock', () => {
    const items = buildAccessoryCatalog([hat, { id: 'hat-a-blue', name: 'Màu thử', variantOf: 'hat-a', variant: 'blue', unlock: { level: 3 } }]);
    const blue = items.get('hat-a-blue');
    expect(blue?.def.id).toBe('hat-a');
    expect(blue?.variant).toBe('blue');
    expect(blue?.slot).toBe(items.get('hat-a')?.slot);
    expect(blue?.unlock).toEqual({ level: 3 });
  });

  it.each([
    ['a duplicate id', [hat, hat], /duplicate/],
    ['a variant of an unknown accessory', [{ id: 'x', name: 'Màu thử', variantOf: 'ghost', variant: 'blue' }], /not a full accessory/],
    ['an unknown colour', [hat, { id: 'x', name: 'Màu thử', variantOf: 'hat-a', variant: 'green' }], /no variant "green"/],
    ['a variant of a variant', [hat, { id: 'x', name: 'Màu thử', variantOf: 'hat-a', variant: 'blue' }, { id: 'y', name: 'Màu thử', variantOf: 'x', variant: 'blue' }], /not a full accessory/],
    ['an empty unlock', [base({ unlock: {} })], /level or a quest/],
  ])('refuses %s', (_, files, message) => {
    expect(() => buildAccessoryCatalog(files)).toThrow(message);
  });
});

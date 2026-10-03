import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAccessoryCatalog, parseAccessory } from './accessory-schema';
import { MAX_ACCESSORY_TRIANGLES, MAX_VEHICLE_TRIANGLES, accessoryPieces, buildAccessoryMesh, mirroredAccessory, rasterizeAccessory } from './voxel-accessory';

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

  it('mirrors only boxes on a paired limb', () => {
    expect(() => parseAccessory(base({ mirror: true }))).toThrow(/paired limb/);
    expect(() => parseAccessory(base({ attachNode: 'leg-left', mirror: true, boxes: [], layers: { origin: [0, 0, 0], legend: { A: 'a' }, rows: [['A']] } }))).toThrow(
      /boxes only/,
    );
    const shoe = parseAccessory(base({ attachNode: 'leg-left', mirror: true, offset: [0.1, 0, 0.2], rotation: [10, 20, 30] }));
    const other = mirroredAccessory(shoe);
    expect(other).toMatchObject({ attachNode: 'leg-right', mirror: false, offset: [-0.1, 0, 0.2], rotation: [10, -20, -30] });
    expect(other.boxes[0]).toMatchObject({ x: -2, w: 2 });
    expect(buildAccessoryMesh(other).triangles).toBe(buildAccessoryMesh(shoe).triangles);
  });

  it('rejects a variant overriding an unknown color', () => {
    expect(() => parseAccessory(base({ variants: { blue: { zzz: '#0000ff' } } }))).toThrow(/unknown color/);
  });
});

describe('clothes', () => {
  const sleeve = { x: -1, y: -5, z: -3, w: 6, h: 6, d: 7, color: 'a' };
  const clothes = (overrides: Record<string, unknown> = {}): Record<string, unknown> =>
    base({
      id: 'clothes-test',
      slot: 'clothes',
      attachNode: 'torso',
      voxelSize: 0.05,
      boxes: [],
      parts: { torso: [{ x: -7, y: 12, z: -5, w: 14, h: 8, d: 10, color: 'a' }], 'arm-left': [sleeve], 'leg-left': [{ x: -3, y: -5, z: -3, w: 6, h: 5, d: 6, color: 'b' }] },
      ...overrides,
    });

  it('dresses the torso and both arms and legs, the right limbs mirroring the left', () => {
    const pieces = accessoryPieces(parseAccessory(clothes()));
    expect(pieces.map((p) => p.attachNode)).toEqual(['torso', 'arm-left', 'arm-right', 'leg-left', 'leg-right']);
    const right = pieces.find((p) => p.attachNode === 'arm-right');
    expect(right?.boxes).toEqual([{ ...sleeve, x: -5 }]);
    for (const piece of pieces) expect(piece.parts).toBeUndefined();
  });

  it('needs a torso, parts only, on the body voxel grid at the torso pivot', () => {
    expect(() => parseAccessory(clothes({ parts: { 'arm-left': [sleeve] } }))).toThrow(/torso/);
    expect(() => parseAccessory(clothes({ boxes: [sleeve] }))).toThrow(/parts only/);
    expect(() => parseAccessory(clothes({ voxelSize: 0.0625 }))).toThrow(/voxel size/);
    expect(() => parseAccessory(clothes({ attachNode: 'head' }))).toThrow(/attach to the torso/);
    expect(() => parseAccessory(clothes({ offset: [0, 0.1, 0] }))).toThrow(/offset/);
    expect(() => parseAccessory(clothes({ parts: { torso: [sleeve], 'arm-right': [sleeve] } }))).toThrow();
    expect(() => parseAccessory(clothes({ parts: { torso: [{ ...sleeve, color: 'nope' }] } }))).toThrow(/not in the palette/);
    expect(() => parseAccessory(base({ parts: { torso: [sleeve] } }))).toThrow(/only clothes/);
  });

  it('paints a `sym` box on both sides of x = 0', () => {
    const one = parseAccessory(base({ boxes: [{ x: 1, y: 0, z: 0, w: 2, h: 1, d: 1, color: 'a', sym: true }] }));
    expect(rasterizeAccessory(one)).toMatchObject({ dims: [6, 1, 1], min: [-3, 0, 0] });
    expect(buildAccessoryMesh(one).triangles).toBe(24);
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
      const triangles = (variant?: string): number[] => accessoryPieces(item.def).map((piece) => buildAccessoryMesh(piece, variant).triangles);
      const mesh = triangles(item.variant);
      const budget = item.slot === 'vehicle' ? MAX_VEHICLE_TRIANGLES : MAX_ACCESSORY_TRIANGLES;
      for (const count of mesh) expect(count).toBeLessThanOrEqual(budget);
      for (const variant of Object.keys(item.def.variants)) expect(triangles(variant)).toEqual(mesh);
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

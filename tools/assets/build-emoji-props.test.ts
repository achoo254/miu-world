import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { EmojiPropCatalog } from '../../packages/schema/src/world-target';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { buildProp, CARD_GRID, PROP_MODELS, propMesh, TRIANGLE_BUDGET } from './build-emoji-props';
import { colorize, extrudePicture, flatten, gridFromImage, insideDistance, medianCut } from './prop-picture';
import { meshFromVoxels } from './prop-voxels';

/** A picture `w`×`h` painted by `paint`. */
function picture(w: number, h: number, paint: (x: number, y: number) => [number, number, number, number]): PNG {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) png.data.set(paint(x, y), (y * w + x) * 4);
  return png;
}

/** Bounds of a mesh's positions: [min, max] per axis. */
function bounds(positions: Float32Array): Array<[number, number]> {
  const out: Array<[number, number]> = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
  for (let i = 0; i < positions.length; i++) {
    const axis = out[i % 3];
    const v = positions[i] ?? 0;
    if (axis) [axis[0], axis[1]] = [Math.min(axis[0], v), Math.max(axis[1], v)];
  }
  return out;
}

describe('emoji props', () => {
  // 8×8 picture: a 4-wide, 2-high opaque band, left half red, right half blue, rest see-through.
  const band = picture(8, 8, (x, y) => (y >= 3 && y < 5 && x >= 2 && x < 6 ? (x < 4 ? [255, 0, 0, 255] : [0, 0, 255, 255]) : [0, 0, 0, 0]));
  // 32×32 picture: an opaque disc, a gradient of greens.
  const disc = picture(32, 32, (x, y) => ((x - 15.5) ** 2 + (y - 15.5) ** 2 < 15 ** 2 ? [40, 120 + x * 4, 60, 255] : [0, 0, 0, 0]));

  it("trims the see-through margin and keeps each cell's colour", () => {
    const grid = gridFromImage(band, 4);
    expect([grid.width, grid.height]).toEqual([4, 2]);
    expect(grid.cells[0]).toEqual([1, 0, 0]);
    expect(grid.cells[3]).toEqual([0, 0, 1]);
  });

  it('repaints in one colour and keeps light and dark', () => {
    const blue = '#3d8fe0';
    const [mid, dark, light] = [colorize([1, 0, 0], blue), colorize([0.2, 0.2, 0.2], blue), colorize([0.95, 0.95, 0.95], blue)];
    expect(mid[2]).toBeGreaterThan(mid[0]);
    expect(dark[2]).toBeLessThan(mid[2]);
    expect(light[0]).toBeGreaterThan(mid[0]);
  });

  it('cuts a picture to a few flat colours', () => {
    const flat = flatten(gridFromImage(disc, 24), 4);
    expect(new Set(flat.cells.filter((c) => c !== null)).size).toBeLessThanOrEqual(4);
    expect(medianCut([[1, 0, 0], [1, 0, 0]], 4)).toEqual([[1, 0, 0]]);
  });

  it('extrudes a picture thicker toward its middle, and a board evenly', () => {
    const flat = flatten(gridFromImage(disc, 24), 4);
    const inside = insideDistance(flat);
    expect(Math.min(...inside.filter((d) => d > 0))).toBe(1);
    expect(Math.max(...inside)).toBeGreaterThanOrEqual(3);
    const depth = (profile: 'round' | 'slab'): number => {
      const [, , z] = bounds(meshFromVoxels(extrudePicture(flat, profile), () => [1, 1, 1], { height: flat.height, anchor: 'centre' }).positions);
      return (z?.[1] ?? 0) - (z?.[0] ?? 0);
    };
    expect(depth('round')).toBe(6);
    expect(depth('slab')).toBe(3);
  });

  it('fits a model to the height of the card it replaces, centred on x and z, standing on y = 0', () => {
    const png = PNG.sync.write(disc);
    const mesh = propMesh(png, { emoji: 'disc' });
    const [x, y, z] = bounds(mesh.positions);
    expect(mesh.built).toBe('picture');
    expect(y).toEqual([0, gridFromImage(disc, CARD_GRID).height]);
    expect((x?.[0] ?? 0) + (x?.[1] ?? 0)).toBeCloseTo(0);
    expect((z?.[0] ?? 0) + (z?.[1] ?? 0)).toBeCloseTo(0);
  });

  it('builds the same bytes from the same picture', async () => {
    const png = PNG.sync.write(band);
    expect(Buffer.from(await buildProp(png, { emoji: 'band' })).equals(Buffer.from(await buildProp(png, { emoji: 'band' })))).toBe(true);
  });

  it('models every listed prop in code within the budget, its colours in its palette, at its card height', async () => {
    const catalogue = EmojiPropCatalog.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/world/emoji-props.json'), 'utf8')));
    const [version = ''] = await readdir(path.join(ASSETS_DIR, 'packs/fluent-emoji'));
    const pictures = path.join(ASSETS_DIR, 'packs/fluent-emoji', version, 'props');
    for (const [id, prop] of Object.entries(catalogue.props)) {
      if (!PROP_MODELS.has(prop.emoji)) continue;
      const png = await readFile(path.join(pictures, `${prop.emoji}.png`));
      const mesh = propMesh(png, prop);
      expect(mesh.built, id).toBe('code');
      expect(mesh.indices.length / 3, id).toBeLessThanOrEqual(TRIANGLE_BUDGET);
      expect(bounds(mesh.positions)[1]?.[1], id).toBeCloseTo(gridFromImage(PNG.sync.read(png), CARD_GRID).height, 4);
    }
  });
});

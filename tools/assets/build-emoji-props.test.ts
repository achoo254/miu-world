import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { buildProp, colorize, gridFromImage, meshFromGrid } from './build-emoji-props';

/** A picture `w`×`h` with a see-through margin and an opaque rectangle painted by `paint`. */
function picture(w: number, h: number, paint: (x: number, y: number) => [number, number, number, number]): PNG {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) png.data.set(paint(x, y), (y * w + x) * 4);
  return png;
}

describe('emoji props', () => {
  // 8×8 picture: a 4-wide, 2-high opaque band, left half red, right half blue, rest see-through.
  const band = picture(8, 8, (x, y) => (y >= 3 && y < 5 && x >= 2 && x < 6 ? (x < 4 ? [255, 0, 0, 255] : [0, 0, 255, 255]) : [0, 0, 0, 0]));

  it('trims the see-through margin and keeps each cell\'s colour', () => {
    const grid = gridFromImage(band, 4);
    expect([grid.width, grid.height]).toEqual([4, 2]);
    expect(grid.cells[0]).toEqual([1, 0, 0]);
    expect(grid.cells[3]).toEqual([0, 0, 1]);
  });

  it('merges a row of one colour into one face, and puts sides only on the outline', () => {
    const mesh = meshFromGrid(gridFromImage(band, 4), 2);
    // Two colour runs per row × two rows, front and back: 8 faces; outline: 4 top + 4 bottom + 2 left + 2 right.
    expect(mesh.indices.length / 6).toBe(8 + 12);
  });

  it('repaints in one colour and keeps light and dark', () => {
    const blue = '#3d8fe0';
    const [mid, dark, light] = [colorize([1, 0, 0], blue), colorize([0.2, 0.2, 0.2], blue), colorize([0.95, 0.95, 0.95], blue)];
    expect(mid[2]).toBeGreaterThan(mid[0]);
    expect(dark[2]).toBeLessThan(mid[2]);
    expect(light[0]).toBeGreaterThan(mid[0]);
  });

  it('builds the same bytes from the same picture', async () => {
    const png = PNG.sync.write(band);
    expect(Buffer.from(await buildProp(png, { emoji: 'band' })).equals(Buffer.from(await buildProp(png, { emoji: 'band' })))).toBe(true);
  });
});

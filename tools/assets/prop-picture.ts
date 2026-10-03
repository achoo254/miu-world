// The emoji pictures the props are modelled on (build-emoji-props.ts): read into a grid of cell colours,
// cut down to a few flat colours (voxel art, and faces of one colour merge into few triangles), and either
// sampled by a model authored in code (prop-models-*.ts) or extruded into a rounded block model.
import { Grid } from './vehicle-voxel-grid';

export type Rgb = readonly [number, number, number];

export interface PropGrid {
  width: number;
  height: number;
  /** sRGB 0–1 per cell, row 0 at the top; null where the picture is see-through. */
  cells: Array<Rgb | null>;
}

/** A cell is solid when at least this share of its pixels is opaque. */
const COVERAGE = 0.5;
const OPAQUE = 128;

/** Average colour of every cell of the picture's opaque area (see-through margins trimmed), `grid` cells across its longer side. */
export function gridFromImage(png: { width: number; height: number; data: Uint8Array }, grid: number): PropGrid {
  let [x0, y0, x1, y1] = [png.width, png.height, -1, -1];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if ((png.data[(y * png.width + x) * 4 + 3] ?? 0) < OPAQUE) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  if (x1 < 0) throw new Error('the picture is fully see-through');
  const size = Math.max(x1 - x0 + 1, y1 - y0 + 1) / grid;
  const width = Math.max(1, Math.round((x1 - x0 + 1) / size));
  const height = Math.max(1, Math.round((y1 - y0 + 1) / size));
  const cells: Array<Rgb | null> = [];
  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      let [r, g, b, opaque, total] = [0, 0, 0, 0, 0];
      for (let y = Math.floor(y0 + gy * size); y < Math.min(y1 + 1, Math.floor(y0 + (gy + 1) * size)); y++) {
        for (let x = Math.floor(x0 + gx * size); x < Math.min(x1 + 1, Math.floor(x0 + (gx + 1) * size)); x++) {
          const i = (y * png.width + x) * 4;
          total++;
          if ((png.data[i + 3] ?? 0) < OPAQUE) continue;
          opaque++;
          r += png.data[i] ?? 0;
          g += png.data[i + 1] ?? 0;
          b += png.data[i + 2] ?? 0;
        }
      }
      cells.push(total > 0 && opaque / total >= COVERAGE ? [r / opaque / 255, g / opaque / 255, b / opaque / 255] : null);
    }
  }
  return { width, height, cells };
}

/** Repaints a colour in `hex`, keeping its lightness: dark outlines stay dark, highlights stay light. */
export function colorize(color: Rgb, hex: string): Rgb {
  const target = hexToRgb(hex);
  // HSL lightness, not luminance: a full red reads as a mid tone and must repaint as a full blue, not a navy.
  const light = (Math.max(...color) + Math.min(...color)) / 2;
  const shade = (t: number): number => Math.min(1, light < 0.5 ? t * light * 2 : t + (1 - t) * (light - 0.5) * 2 * 0.6);
  return [shade(target[0]), shade(target[1]), shade(target[2])];
}

export function hexToRgb(hex: string): Rgb {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return [r, g, b];
}

export function rgbToHex(c: Rgb): string {
  return `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Median cut: at most `count` colours standing for `colors` (each box of colours split at the median of its
 * widest channel, the palette entry its mean). Same colours in, same palette out.
 */
export function medianCut(colors: readonly Rgb[], count: number): Rgb[] {
  if (colors.length === 0) return [];
  const range = (box: readonly Rgb[], c: 0 | 1 | 2): number => {
    let [lo, hi] = [1, 0];
    for (const v of box) {
      lo = Math.min(lo, v[c]);
      hi = Math.max(hi, v[c]);
    }
    return hi - lo;
  };
  const widest = (box: readonly Rgb[]): 0 | 1 | 2 => {
    const [r, g, b] = [range(box, 0), range(box, 1), range(box, 2)];
    return r >= g && r >= b ? 0 : g >= b ? 1 : 2;
  };
  let boxes: Rgb[][] = [[...colors]];
  while (boxes.length < count) {
    // Split the box spanning the widest range (the earlier one on a tie); stop when every box is one colour.
    let pick = -1;
    let best = 0;
    boxes.forEach((box, i) => {
      const r = box.length > 1 ? range(box, widest(box)) : 0;
      if (r > best) [pick, best] = [i, r];
    });
    const box = boxes[pick];
    if (!box) break;
    const c = widest(box);
    const sorted = [...box].sort((a, b) => a[c] - b[c] || a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const half = Math.floor(sorted.length / 2);
    boxes = [...boxes.slice(0, pick), sorted.slice(0, half), sorted.slice(half), ...boxes.slice(pick + 1)];
  }
  return boxes.map((box) => {
    const sum = box.reduce<[number, number, number]>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
    return [sum[0] / box.length, sum[1] / box.length, sum[2] / box.length];
  });
}

/** The palette colour nearest `c` (squared distance in sRGB). */
export function nearest(palette: readonly Rgb[], c: Rgb): Rgb {
  let best = palette[0] ?? c;
  let bestDistance = Infinity;
  for (const p of palette) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
    if (d < bestDistance) [best, bestDistance] = [p, d];
  }
  return best;
}

/** A picture cut to a few flat colours: hex per cell, null where see-through. */
export interface FlatPicture {
  width: number;
  height: number;
  cells: Array<string | null>;
}

/** The picture in at most `colors` flat colours. */
export function flatten(grid: PropGrid, colors: number): FlatPicture {
  const solid = grid.cells.filter((c): c is Rgb => c !== null);
  const palette = medianCut(solid, colors);
  return { width: grid.width, height: grid.height, cells: grid.cells.map((c) => (c ? rgbToHex(nearest(palette, c)) : null)) };
}

/** The picture's colour at (u, v), each 0–1 across its opaque area, v = 0 at the top; null where see-through. */
export type PictureSampler = (u: number, v: number) => string | null;

export function sampler(picture: FlatPicture): PictureSampler {
  return (u, v) => {
    const x = Math.min(picture.width - 1, Math.max(0, Math.floor(u * picture.width)));
    const y = Math.min(picture.height - 1, Math.max(0, Math.floor(v * picture.height)));
    return picture.cells[y * picture.width + x] ?? null;
  };
}

/**
 * How thick a cell of the picture is extruded, from how far it lies inside the outline (1 on the outline):
 * `round` swells toward the middle like a cushion (2, 4, 6 blocks), `slab` is a thin board with a bevelled
 * edge (paper, tickets, rulers), `relief` a board whose rim stands proud (doors, windows, wall clocks).
 */
export type Profile = 'round' | 'slab' | 'relief';

const THICKNESS: Record<Profile, (inside: number) => number> = {
  round: (d) => 2 * Math.min(3, d),
  slab: (d) => (d === 1 ? 2 : 3),
  relief: (d) => (d === 1 ? 4 : 3),
};

/** Chebyshev distance of each solid cell to the nearest see-through cell (outside the picture counts): 1 on the outline. */
export function insideDistance(picture: FlatPicture): number[] {
  const { width, height } = picture;
  const far = width + height;
  const d = picture.cells.map((c) => (c ? far : 0));
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= width || y >= height ? 0 : (d[y * width + x] ?? 0));
  // Two chamfer passes (forward, backward) over the 8-neighbourhood.
  for (const pass of [0, 1]) {
    for (let k = 0; k < width * height; k++) {
      const i = pass === 0 ? k : width * height - 1 - k;
      if ((d[i] ?? 0) === 0) continue;
      const [x, y] = [i % width, Math.floor(i / width)];
      const s = pass === 0 ? -1 : 1;
      d[i] = Math.min(d[i] ?? far, at(x + s, y) + 1, at(x - 1, y + s) + 1, at(x, y + s) + 1, at(x + 1, y + s) + 1);
    }
  }
  return d;
}

/**
 * The picture as a block model: each cell a column of its colour, front toward +z, as thick as `profile` makes
 * it (centred on z = 0, or for `relief` growing forward from z = 0 so its back stays flat against a wall).
 */
export function extrudePicture(picture: FlatPicture, profile: Profile): Grid {
  const g = new Grid();
  g.sym = false;
  const inside = insideDistance(picture);
  const thick = THICKNESS[profile];
  for (let y = 0; y < picture.height; y++) {
    for (let x = 0; x < picture.width; x++) {
      const color = picture.cells[y * picture.width + x];
      if (!color) continue;
      const t = thick(inside[y * picture.width + x] ?? 1);
      const z0 = profile === 'relief' ? 0 : -Math.floor(t / 2);
      g.box(x - Math.floor(picture.width / 2), picture.height - 1 - y, z0, 1, 1, t, color);
    }
  }
  return g;
}

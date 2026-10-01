// Builds the quest things no 3D pack has (envelopes, tickets, rulers, calendars…) as block models from
// Fluent Emoji pictures: the picture is cut into a grid, every mostly-opaque cell becomes a block of its
// average colour, and the blocks are extruded a few deep, so the thing reads at a glance in the voxel world.
// Catalogue: content/world/emoji-props.json; pictures: assets/packs/fluent-emoji/<version>/props/; output:
// assets/generated/props/<id>.glb (one mesh, vertex colours, one draw call). Same input, same bytes.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Document, NodeIO, type TypedArray } from '@gltf-transform/core';
import { PNG } from 'pngjs';
import { EmojiPropCatalog, type EmojiProp } from '../../packages/schema/src/world-target';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';

/** Cells across the picture's longer side. */
export const GRID = 16;
/** Blocks the picture is extruded. */
export const DEPTH = 2;
/** A cell is solid when at least this share of its pixels is opaque. */
const COVERAGE = 0.5;
const OPAQUE = 128;

export const PROPS_DIR = path.join(ASSETS_DIR, 'generated/props');
const CATALOGUE = path.join(REPO_ROOT, 'content/world/emoji-props.json');

type Rgb = readonly [number, number, number];
export interface PropGrid {
  width: number;
  height: number;
  /** sRGB 0–1 per cell, row 0 at the top; null where the picture is see-through. */
  cells: Array<Rgb | null>;
}

/** Average colour of every cell of the picture's opaque area (see-through margins trimmed). */
export function gridFromImage(png: { width: number; height: number; data: Uint8Array }, grid = GRID): PropGrid {
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
  const target = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  // HSL lightness, not luminance: a full red reads as a mid tone and must repaint as a full blue, not a navy.
  const light = (Math.max(...color) + Math.min(...color)) / 2;
  const shade = (t: number): number => Math.min(1, light < 0.5 ? t * light * 2 : t + (1 - t) * (light - 0.5) * 2 * 0.6);
  return [shade(target[0] ?? 0), shade(target[1] ?? 0), shade(target[2] ?? 0)];
}

/** Colours in 1/32 steps, so neighbouring cells of one colour share a face. */
const quantize = (c: Rgb): Rgb => [Math.round(c[0] * 31) / 31, Math.round(c[1] * 31) / 31, Math.round(c[2] * 31) / 31];
const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

interface Mesh {
  positions: number[];
  normals: number[];
  /** Linear RGBA, 0–255 per channel. */
  colors: number[];
  indices: number[];
}

/** Block mesh of a grid: front and back faces merged along rows of one colour, sides only on the outline. */
export function meshFromGrid(grid: PropGrid, depth = DEPTH): Mesh {
  const mesh: Mesh = { positions: [], normals: [], colors: [], indices: [] };
  const at = (x: number, y: number): Rgb | null => (x < 0 || y < 0 || x >= grid.width || y >= grid.height ? null : (grid.cells[y * grid.width + x] ?? null));
  // Picture row 0 is the top: block y grows upward from the ground; x is centred, z centred on the depth.
  const X = (x: number): number => x - grid.width / 2;
  const Y = (y: number): number => grid.height - y;
  const quad = (corners: ReadonlyArray<readonly [number, number, number]>, normal: readonly [number, number, number], color: Rgb): void => {
    const base = mesh.positions.length / 3;
    for (const c of corners) {
      mesh.positions.push(...c);
      mesh.normals.push(...normal);
      mesh.colors.push(...[toLinear(color[0]), toLinear(color[1]), toLinear(color[2]), 1].map((v) => Math.round(v * 255)));
    }
    mesh.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const front = depth / 2;
  const back = -depth / 2;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; ) {
      const color = at(x, y);
      if (!color) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < grid.width && at(end, y)?.join() === color.join()) end++;
      quad([[X(x), Y(y + 1), front], [X(end), Y(y + 1), front], [X(end), Y(y), front], [X(x), Y(y), front]], [0, 0, 1], color);
      quad([[X(end), Y(y + 1), back], [X(x), Y(y + 1), back], [X(x), Y(y), back], [X(end), Y(y), back]], [0, 0, -1], color);
      x = end;
    }
  }
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const color = at(x, y);
      if (!color) continue;
      const [l, r, top, bottom] = [X(x), X(x + 1), Y(y), Y(y + 1)];
      if (!at(x - 1, y)) quad([[l, bottom, back], [l, bottom, front], [l, top, front], [l, top, back]], [-1, 0, 0], color);
      if (!at(x + 1, y)) quad([[r, bottom, front], [r, bottom, back], [r, top, back], [r, top, front]], [1, 0, 0], color);
      if (!at(x, y - 1)) quad([[l, top, front], [r, top, front], [r, top, back], [l, top, back]], [0, 1, 0], color);
      if (!at(x, y + 1)) quad([[l, bottom, back], [r, bottom, back], [r, bottom, front], [l, bottom, front]], [0, -1, 0], color);
    }
  }
  return mesh;
}

export async function buildProp(png: Buffer, prop: EmojiProp): Promise<Uint8Array> {
  const image = PNG.sync.read(png);
  const grid = gridFromImage(image);
  const painted: PropGrid = { ...grid, cells: grid.cells.map((c) => (c ? quantize(prop.colorize ? colorize(c, prop.colorize) : c) : null)) };
  const mesh = meshFromGrid(painted);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const accessor = (array: TypedArray, type: 'VEC3' | 'VEC4' | 'SCALAR') => doc.createAccessor().setArray(array).setType(type).setBuffer(buffer);
  const material = doc.createMaterial('prop').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1);
  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor(new Float32Array(mesh.positions), 'VEC3'))
    .setAttribute('NORMAL', accessor(new Float32Array(mesh.normals), 'VEC3'))
    .setAttribute('COLOR_0', accessor(new Uint8Array(mesh.colors), 'VEC4').setNormalized(true))
    .setIndices(accessor(mesh.positions.length / 3 > 65_535 ? new Uint32Array(mesh.indices) : new Uint16Array(mesh.indices), 'SCALAR'))
    .setMaterial(material);
  const node = doc.createNode('prop').setMesh(doc.createMesh('prop').addPrimitive(primitive));
  doc.createScene('prop').addChild(node);
  return new NodeIO().writeBinary(doc);
}

async function main(): Promise<void> {
  const catalogue = EmojiPropCatalog.parse(JSON.parse(await readFile(CATALOGUE, 'utf8')));
  const [version] = await readdir(path.join(ASSETS_DIR, 'packs/fluent-emoji'));
  if (!version) throw new Error('assets/packs/fluent-emoji is empty: run pnpm assets:fetch');
  await rm(PROPS_DIR, { recursive: true, force: true });
  await mkdir(PROPS_DIR, { recursive: true });
  for (const [id, prop] of Object.entries(catalogue.props).sort(([a], [b]) => a.localeCompare(b))) {
    const png = await readFile(path.join(ASSETS_DIR, 'packs/fluent-emoji', version, 'props', `${prop.emoji}.png`));
    await writeFile(path.join(PROPS_DIR, `${id}.glb`), await buildProp(png, prop));
  }
  console.log(`emoji props: ${Object.keys(catalogue.props).length} models in assets/generated/props`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

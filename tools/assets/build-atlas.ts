// Packs block tiles from the Kenney Voxel Pack into one atlas: each tile is downsampled to
// tileSize, tinted toward content/palette.json, and surrounded by extruded padding on a pitch that
// is a multiple of 8 so mip levels 0-3 never blend two tiles. Output: generated/atlas/atlas.{png,json}
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { blockTableSchema, type Atlas } from '../../packages/voxel/src/block-table';
import { ASSETS_DIR, MANIFEST_NAME, REPO_ROOT, manifestSchema, readJson } from './asset-lib';

const OUT_DIR = path.join(ASSETS_DIR, 'generated/atlas');
const paletteSchema = z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/));

interface Image {
  width: number;
  height: number;
  data: Uint8Array;
}

function hexRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16)) as [number, number, number];
}

/** Box-filter downsample by an integer factor (alpha-weighted so transparent texels don't darken). */
export function downsample(src: Image, size: number): Image {
  const factor = src.width / size;
  if (!Number.isInteger(factor) || src.height / size !== factor) throw new Error(`cannot downsample ${src.width}px to ${size}px`);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const o = ((y * factor + dy) * src.width + x * factor + dx) * 4;
          const alpha = src.data[o + 3] ?? 0;
          r += (src.data[o] ?? 0) * alpha;
          g += (src.data[o + 1] ?? 0) * alpha;
          b += (src.data[o + 2] ?? 0) * alpha;
          a += alpha;
        }
      }
      const o = (y * size + x) * 4;
      data.set(a > 0 ? [r / a, g / a, b / a, a / (factor * factor)] : [0, 0, 0, 0], o);
    }
  }
  return { width: size, height: size, data };
}

/** Pulls a tile toward a palette color while keeping its light/dark detail. */
export function tint(img: Image, color: [number, number, number], strength: number): Image {
  const lum = (o: number): number => 0.299 * (img.data[o] ?? 0) + 0.587 * (img.data[o + 1] ?? 0) + 0.114 * (img.data[o + 2] ?? 0);
  let sum = 0;
  let count = 0;
  for (let o = 0; o < img.data.length; o += 4) {
    if ((img.data[o + 3] ?? 0) === 0) continue;
    sum += lum(o);
    count++;
  }
  const mean = count > 0 ? sum / count : 1;
  const data = new Uint8Array(img.data);
  for (let o = 0; o < data.length; o += 4) {
    const shade = lum(o) / mean;
    for (let k = 0; k < 3; k++) {
      const target = Math.min(255, color[k] as number * shade);
      data[o + k] = Math.round((img.data[o + k] ?? 0) * (1 - strength) + target * strength);
    }
  }
  return { ...img, data };
}

/** Largest mip level L such that 2^L divides the slot pitch (no mip texel straddles two slots). */
export function safeMipLevel(pitch: number, tileSize: number): number {
  let level = 0;
  while (pitch % 2 ** (level + 1) === 0 && tileSize / 2 ** (level + 1) >= 1) level++;
  return level;
}

export async function buildAtlas(): Promise<{ png: Uint8Array; atlas: Atlas }> {
  const table = await readJson(path.join(REPO_ROOT, 'content/blocks.json'), blockTableSchema);
  const palette = await readJson(path.join(REPO_ROOT, 'content/palette.json'), paletteSchema);
  const manifest = await readJson(path.join(ASSETS_DIR, MANIFEST_NAME), manifestSchema);
  const listed = new Set(manifest.files.map((f) => f.path));

  const names = Object.keys(table.tiles).sort();
  const pitch = table.tileSize + 2 * table.padding;
  let size = 512;
  while (Math.floor(size / pitch) ** 2 < names.length) size *= 2;
  const cols = Math.floor(size / pitch);
  const out = new PNG({ width: size, height: size });
  const tiles: Atlas['tiles'] = {};

  for (const [i, name] of names.entries()) {
    const def = table.tiles[name];
    if (!def) continue;
    const rel = `${table.source}/${def.file}`;
    if (!listed.has(rel)) throw new Error(`tile ${name}: ${rel} is not in the asset manifest`);
    const decoded = PNG.sync.read(await readFile(path.join(ASSETS_DIR, rel)));
    let img = downsample({ width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) }, table.tileSize);
    if (def.tint) {
      const color = palette[def.tint];
      if (!color) throw new Error(`tile ${name}: unknown palette color ${def.tint}`);
      img = tint(img, hexRgb(color), def.strength);
    }
    const sx = (i % cols) * pitch;
    const sy = Math.floor(i / cols) * pitch;
    // Extruded padding: every padded texel copies the nearest edge texel of the tile.
    for (let y = -table.padding; y < table.tileSize + table.padding; y++) {
      for (let x = -table.padding; x < table.tileSize + table.padding; x++) {
        const cx = Math.min(table.tileSize - 1, Math.max(0, x));
        const cy = Math.min(table.tileSize - 1, Math.max(0, y));
        const src = (cy * table.tileSize + cx) * 4;
        const dst = ((sy + table.padding + y) * size + sx + table.padding + x) * 4;
        out.data.set(img.data.subarray(src, src + 4), dst);
      }
    }
    tiles[name] = [sx + table.padding, sy + table.padding, table.tileSize, table.tileSize];
  }

  const rect = (tile: string): [number, number, number, number] => {
    const r = tiles[tile];
    if (!r) throw new Error(`unknown tile ${tile}`);
    return r;
  };
  const atlas: Atlas = {
    size,
    tileSize: table.tileSize,
    padding: table.padding,
    safeMipLevel: safeMipLevel(pitch, table.tileSize),
    tiles,
    blocks: table.blocks.map((b) => ({ ...b, top: rect(b.top), side: rect(b.side), bottom: rect(b.bottom) })),
  };
  return { png: new Uint8Array(PNG.sync.write(out, { colorType: 6 })), atlas };
}

async function main(): Promise<void> {
  const { png, atlas } = await buildAtlas();
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'atlas.png'), png);
  await writeFile(path.join(OUT_DIR, 'atlas.json'), `${JSON.stringify(atlas, null, 2)}\n`);
  console.log(`atlas ${atlas.size}px, ${Object.keys(atlas.tiles).length} tiles, ${atlas.blocks.length} blocks, bleed-free through mip ${atlas.safeMipLevel}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAccessoryCatalog, parseAccessory } from '../../packages/voxel/src/accessory-schema';
import { rasterizeAccessory } from '../../packages/voxel/src/voxel-accessory';
import { REPO_ROOT } from './asset-lib';
import { VEHICLE_MODELS, vehicleFile, vehicleJson } from './build-vehicles';
import { Grid, shade, wheel } from './vehicle-voxel-grid';

/** Cells of a grid as "x,y,z:colour" strings, sorted. */
function cellsOf(g: Grid): string[] {
  const out: string[] = [];
  for (let x = -40; x < 40; x++) for (let y = -5; y < 40; y++) for (let z = -40; z < 40; z++) {
    const c = g.get(x, y, z);
    if (c) out.push(`${x},${y},${z}:${c}`);
  }
  return out.sort();
}

/** The same cells read back from the boxes an accessory file would hold. */
function cellsOfBoxes(g: Grid): string[] {
  const boxes = g.toBoxes();
  const palette = Object.fromEntries([...new Set(boxes.map((b) => b.color))].map((c) => [c, '#000000']));
  const def = parseAccessory({ id: 'probe', name: 'Thử', slot: 'hat', attachNode: 'head', voxelSize: 0.0625, offset: [0, 0, 0], palette, boxes });
  const volume = rasterizeAccessory(def);
  const out: string[] = [];
  const [sx, sy, sz] = volume.dims;
  for (let i = 0; i < sx; i++) for (let j = 0; j < sy; j++) for (let k = 0; k < sz; k++) {
    const cell = volume.cells[i + sx * (j + sy * k)] ?? 0;
    if (cell > 0) out.push(`${i + volume.min[0]},${j + volume.min[1]},${k + volume.min[2]}:${volume.colors[cell - 1]}`);
  }
  return out.sort();
}

describe('vehicle voxel grid', () => {
  it('mirrors every shape across x = 0 and gives back exactly its cells as half boxes with sym', () => {
    const g = new Grid();
    g.box(3, 0, -4, 4, 2, 8, 'body').ellipsoid(0, 6, 0, 7, 4, 9, 'shell').carve(-2, 6, -2, 4, 6, 4);
    wheel(g, { x: 6, w: 3, cy: 4, cz: 6, r: 4 });
    expect(g.symmetric()).toBe(true);
    const boxes = g.toBoxes();
    expect(boxes.every((b) => b.sym && b.x >= 0)).toBe(true);
    expect(cellsOfBoxes(g)).toEqual(cellsOf(g));
  });

  it('keeps one-sided shapes as they are', () => {
    const g = new Grid();
    g.box(0, 0, 0, 4, 1, 4, 'deck');
    g.sym = false;
    g.box(5, 0, 0, 2, 3, 1, 'pipe');
    expect(g.symmetric()).toBe(false);
    expect(g.toBoxes().some((b) => b.sym)).toBe(false);
    expect(cellsOfBoxes(g)).toEqual(cellsOf(g));
  });

  it('shades a colour darker or toward white', () => {
    expect(shade('#808080', 0.5)).toBe('#404040');
    expect(shade('#000000', 1.5)).toBe('#808080');
  });
});

describe('vehicle files', () => {
  const dir = path.join(REPO_ROOT, 'content/accessories');
  const catalog = buildAccessoryCatalog(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as unknown));

  it('every vehicle shape has a model, and every model a file', () => {
    const shapes = [...catalog.values()].filter((item) => item.slot === 'vehicle' && !item.variant).map((item) => item.id);
    expect(VEHICLE_MODELS.map((m) => m.id).sort()).toEqual(shapes.sort());
  });

  for (const model of VEHICLE_MODELS) {
    it(`${model.id} is what its model builds (edit the model, then run build-vehicles.ts)`, () => {
      const text = readFileSync(vehicleFile(model.id), 'utf8');
      expect(vehicleJson(model, parseAccessory(JSON.parse(text)))).toBe(text);
    });
  }
});

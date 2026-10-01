// Builds props too fine for whole blocks and missing from every pack (the swings, a basketball hoop, the
// flag on its pole, a park bench) from boxes listed in content/world/box-props.json: one mesh with a
// colour per vertex, one draw call. Output: assets/generated/box-props/<id>.glb. Same input, same bytes.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Document, NodeIO, type TypedArray } from '@gltf-transform/core';
import { BoxPropCatalog, type BoxProp } from '../../packages/schema/src/world-target';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';

export const BOX_PROPS_DIR = path.join(ASSETS_DIR, 'generated/box-props');
const CATALOGUE = path.join(REPO_ROOT, 'content/world/box-props.json');

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** The six faces of every box, outward normals, vertex colours (linear, 0–255). */
export function boxMesh(prop: BoxProp): { positions: number[]; normals: number[]; colors: number[]; indices: number[] } {
  const out = { positions: [] as number[], normals: [] as number[], colors: [] as number[], indices: [] as number[] };
  for (const box of prop.boxes) {
    const [x0, y0, z0] = box.from.map((v, i) => Math.min(v, box.to[i] ?? v)) as [number, number, number];
    const [x1, y1, z1] = box.from.map((v, i) => Math.max(v, box.to[i] ?? v)) as [number, number, number];
    const rgb = [1, 3, 5].map((i) => Math.round(toLinear(parseInt(box.color.slice(i, i + 2), 16) / 255) * 255));
    const faces: Array<[number[][], number[]]> = [
      [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]],
      [[[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]],
      [[[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]],
      [[[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]],
      [[[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0]],
      [[[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]],
    ];
    for (const [corners, normal] of faces) {
      const base = out.positions.length / 3;
      for (const c of corners) {
        out.positions.push(...c);
        out.normals.push(...normal);
        out.colors.push(rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0, 255);
      }
      out.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return out;
}

export async function buildBoxProp(prop: BoxProp): Promise<Uint8Array> {
  const mesh = boxMesh(prop);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const accessor = (array: TypedArray, type: 'VEC3' | 'VEC4' | 'SCALAR') => doc.createAccessor().setArray(array).setType(type).setBuffer(buffer);
  const material = doc.createMaterial('box-prop').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1);
  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor(new Float32Array(mesh.positions), 'VEC3'))
    .setAttribute('NORMAL', accessor(new Float32Array(mesh.normals), 'VEC3'))
    .setAttribute('COLOR_0', accessor(new Uint8Array(mesh.colors), 'VEC4').setNormalized(true))
    .setIndices(accessor(new Uint16Array(mesh.indices), 'SCALAR'))
    .setMaterial(material);
  doc.createScene('box-prop').addChild(doc.createNode('box-prop').setMesh(doc.createMesh('box-prop').addPrimitive(primitive)));
  return new NodeIO().writeBinary(doc);
}

async function main(): Promise<void> {
  const catalogue = BoxPropCatalog.parse(JSON.parse(await readFile(CATALOGUE, 'utf8')));
  await rm(BOX_PROPS_DIR, { recursive: true, force: true });
  await mkdir(BOX_PROPS_DIR, { recursive: true });
  for (const [id, prop] of Object.entries(catalogue.props).sort(([a], [b]) => a.localeCompare(b))) await writeFile(path.join(BOX_PROPS_DIR, `${id}.glb`), await buildBoxProp(prop));
  console.log(`box props: ${Object.keys(catalogue.props).length} models in assets/generated/box-props`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

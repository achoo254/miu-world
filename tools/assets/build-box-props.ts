// Builds props too fine for whole blocks and missing from every pack (the swings, a basketball hoop, the
// flag on its pole, a park bench) from boxes listed in content/world/box-props.json: one mesh with a
// colour per vertex, one draw call. Each map may keep its own in content/world/box-props/<map>.json. Output: assets/generated/box-props/<id>.glb. Same input, same bytes.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Document, NodeIO, type TypedArray } from '@gltf-transform/core';
import { BoxPropCatalog, type BoxProp } from '../../packages/schema/src/world-target';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';

export const BOX_PROPS_DIR = path.join(ASSETS_DIR, 'generated/box-props');
const CATALOGUE = path.join(REPO_ROOT, 'content/world/box-props.json');
/** More catalogues, one per map (content/world/box-props/<map>.json), so each map's props live with it. */
const MORE_CATALOGUES = path.join(REPO_ROOT, 'content/world/box-props');

/** Every box prop: content/world/box-props.json and each file under content/world/box-props/; an id twice is an error. */
export async function readBoxProps(): Promise<Record<string, BoxProp>> {
  const files = [CATALOGUE, ...(await readdir(MORE_CATALOGUES).catch(() => [] as string[])).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(MORE_CATALOGUES, f))];
  const props: Record<string, BoxProp> = {};
  for (const file of files) {
    for (const [id, prop] of Object.entries(BoxPropCatalog.parse(JSON.parse(await readFile(file, 'utf8'))).props)) {
      if (id in props) throw new Error(`box prop ${id} is in two catalogues (${path.relative(REPO_ROOT, file)})`);
      props[id] = prop;
    }
  }
  return props;
}

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

/**
 * One mesh: the plain boxes in one primitive coloured per vertex, and the glowing ones (`glow`) in one
 * primitive per colour whose material emits that colour, so they stay lit in any light.
 */
export async function buildBoxProp(prop: BoxProp): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const accessor = (array: TypedArray, type: 'VEC3' | 'VEC4' | 'SCALAR') => doc.createAccessor().setArray(array).setType(type).setBuffer(buffer);
  const primitiveOf = (boxes: BoxProp['boxes']) => {
    const mesh = boxMesh({ boxes });
    return doc
      .createPrimitive()
      .setAttribute('POSITION', accessor(new Float32Array(mesh.positions), 'VEC3'))
      .setAttribute('NORMAL', accessor(new Float32Array(mesh.normals), 'VEC3'))
      .setAttribute('COLOR_0', accessor(new Uint8Array(mesh.colors), 'VEC4').setNormalized(true))
      .setIndices(accessor(new Uint16Array(mesh.indices), 'SCALAR'));
  };
  // One plain material and one per glowing colour, shared by the still body and the moving parts.
  let plainMaterial: ReturnType<Document['createMaterial']> | null = null;
  const glowMaterials = new Map<string, ReturnType<Document['createMaterial']>>();
  const meshOf = (name: string, boxes: BoxProp['boxes']) => {
    const mesh = doc.createMesh(name);
    const plain = boxes.filter((b) => !b.glow);
    if (plain.length > 0) {
      plainMaterial ??= doc.createMaterial('box-prop').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1);
      mesh.addPrimitive(primitiveOf(plain).setMaterial(plainMaterial));
    }
    for (const color of [...new Set(boxes.filter((b) => b.glow).map((b) => b.color))].sort()) {
      let glow = glowMaterials.get(color);
      if (!glow) {
        const linear = [1, 3, 5].map((i) => toLinear(parseInt(color.slice(i, i + 2), 16) / 255)) as [number, number, number];
        glow = doc.createMaterial(`glow-${color.slice(1)}`).setBaseColorFactor([1, 1, 1, 1]).setEmissiveFactor(linear).setMetallicFactor(0).setRoughnessFactor(1);
        glowMaterials.set(color, glow);
      }
      mesh.addPrimitive(primitiveOf(boxes.filter((b) => b.glow && b.color === color)).setMaterial(glow));
    }
    return mesh;
  };
  const scene = doc.createScene('box-prop');
  const still = prop.boxes.filter((b) => b.part === undefined);
  if (still.length > 0) scene.addChild(doc.createNode('box-prop').setMesh(meshOf('box-prop', still)));
  // Each moving part is its own node standing at its pivot (its boxes drawn relative to it), so the game turns
  // it about that point; `axis` and `angle` ride along as the node's extras.
  for (const [name, { pivot, axis, angle }] of Object.entries(prop.parts ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    const shift = (v: readonly [number, number, number]): [number, number, number] => [v[0] - pivot[0], v[1] - pivot[1], v[2] - pivot[2]];
    const boxes = prop.boxes.filter((b) => b.part === name).map((b) => ({ ...b, from: shift(b.from), to: shift(b.to) }));
    scene.addChild(doc.createNode(`part-${name}`).setTranslation([...pivot]).setExtras({ axis, angle }).setMesh(meshOf(`part-${name}`, boxes)));
  }
  return new NodeIO().writeBinary(doc);
}

async function main(): Promise<void> {
  const props = await readBoxProps();
  await rm(BOX_PROPS_DIR, { recursive: true, force: true });
  await mkdir(BOX_PROPS_DIR, { recursive: true });
  for (const [id, prop] of Object.entries(props).sort(([a], [b]) => a.localeCompare(b))) await writeFile(path.join(BOX_PROPS_DIR, `${id}.glb`), await buildBoxProp(prop));
  console.log(`box props: ${Object.keys(props).length} models in assets/generated/box-props`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

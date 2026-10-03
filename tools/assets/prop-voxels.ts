// Block models of the emoji props (build-emoji-props.ts): a voxel grid (vehicle-voxel-grid.ts) of colours,
// meshed by greedy quads (packages/voxel greedy-mesher.ts) into one vertex-coloured mesh, one draw call, and
// fitted to the card it replaces: the same height in the picture's cells. The maps scaled each card from its
// bounds to the height content/world/models.json gives it, so a model of the same height stands as tall where
// the maps placed it. Also the shapes the models authored in code share (leaves and petals, painted balls).
import { Document, NodeIO, type TypedArray } from '@gltf-transform/core';
import { greedyQuads, quadsToGeometry, type Quad } from '../../packages/voxel/src/greedy-mesher';
import type { PictureSampler, Rgb } from './prop-picture';
import { Grid } from './vehicle-voxel-grid';

/** A prop modelled in code in place of its extruded picture. Front is +z, voxel y = 0 the ground. */
export interface PropModel {
  /** The picture it stands for (`emoji` in content/world/emoji-props.json): every prop drawn from it. */
  emoji: string;
  /** Colour of every key `build` paints with (a cell may also hold a `#rrggbb` colour of its own). */
  palette: Record<string, string>;
  /** Keys a colour variant (`colorize` in the catalogue) repaints; the others keep their colour. */
  tinted: readonly string[];
  /** `wall`: hung on walls, its back stays flat where the card's back was. */
  anchor?: 'wall';
  /** Flat colours of the picture `build` samples (fewer for a painted ball: less noise, fewer faces). */
  pictureColors?: number;
  /** Quarter turns about y after building (1: the front, +z, turns to −x, the way the picture faces). */
  turn?: 1;
  build(g: Grid, picture: PictureSampler): void;
}

export interface PropFit {
  /** Height in the picture's cells (the card's height): the model is scaled to it. */
  height: number;
  /** `centre`: centred on x and z; `wall`: centred on x, its back at z = −1 where the card's back was. */
  anchor: 'centre' | 'wall';
}

export interface PropMesh {
  positions: Float32Array<ArrayBuffer>;
  normals: Float32Array<ArrayBuffer>;
  /** Linear RGBA, 0–255. */
  colors: Uint8Array<ArrayBuffer>;
  indices: Uint32Array<ArrayBuffer>;
  /** Model size after fitting (x, y, z), in the picture's cells. */
  size: [number, number, number];
}

/** How light each face is painted: the front and the top at full colour, the sides darker, the underside darker still. */
function faceShade(q: Quad): number {
  if (q.axis === 1) return q.dir > 0 ? 1 : 0.7;
  if (q.axis === 0) return 0.86;
  return q.dir > 0 ? 1 : 0.92;
}

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Every filled cell of a grid (boxes mirrored where the grid is symmetric), turned `turn` quarter turns about y. */
function gridCells(g: Grid, turn = 0): Array<[number, number, number, string]> {
  const cells: Array<[number, number, number, string]> = [];
  const add = (x: number, y: number, z: number, c: string): void => {
    // A quarter turn takes the front (+z) to −x: cell (x, z) → (−z − 1, x).
    cells.push(turn === 1 ? [-z - 1, y, x, c] : [x, y, z, c]);
  };
  for (const b of g.toBoxes()) {
    for (let i = 0; i < b.w; i++) {
      for (let j = 0; j < b.h; j++) {
        for (let k = 0; k < b.d; k++) {
          add(b.x + i, b.y + j, b.z + k, b.color);
          if (b.sym) add(-(b.x + i) - 1, b.y + j, b.z + k, b.color);
        }
      }
    }
  }
  return cells;
}

/**
 * One mesh of a grid: coplanar faces of one colour merged, each colour resolved by `colorOf` (sRGB 0–1) and
 * shaded by the way its face looks; scaled so it stands `fit.height` tall, placed by `fit.anchor`.
 */
export function meshFromVoxels(g: Grid, colorOf: (cell: string) => Rgb, fit: PropFit, turn?: 1): PropMesh {
  const cells = gridCells(g, turn);
  if (cells.length === 0) throw new Error('the model has no blocks');
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const c of cells) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a] ?? 0, c[a] as number);
      max[a] = Math.max(max[a] ?? 0, (c[a] as number) + 1);
    }
  }
  const dims = [0, 1, 2].map((a) => (max[a] ?? 0) - (min[a] ?? 0)) as [number, number, number];
  const ids = new Map<string, number>();
  const volume = new Int32Array(dims[0] * dims[1] * dims[2]);
  const index = (x: number, y: number, z: number): number => x + dims[0] * (y + dims[1] * z);
  for (const [x, y, z, color] of cells) {
    if (!ids.has(color)) ids.set(color, ids.size + 1);
    volume[index(x - (min[0] ?? 0), y - (min[1] ?? 0), z - (min[2] ?? 0))] = ids.get(color) ?? 0;
  }
  const get = (x: number, y: number, z: number): number => (x < 0 || y < 0 || z < 0 || x >= dims[0] || y >= dims[1] || z >= dims[2] ? 0 : (volume[index(x, y, z)] ?? 0));
  const quads = greedyQuads(dims, get, () => true);
  const rgb = [...ids.keys()].map(colorOf);
  const scale = fit.height / dims[1];
  const geometry = quadsToGeometry(quads, {
    scale,
    offset: [(-dims[0] * scale) / 2, 0, fit.anchor === 'wall' ? -1 : (-dims[2] * scale) / 2],
    attributes: {
      color: {
        size: 4,
        value: (q) => {
          const c = rgb[q.id - 1] ?? [1, 0, 1];
          const s = faceShade(q);
          return [...c.map((v) => Math.round(toLinear(v * s) * 255)), 255];
        },
      },
    },
  });
  return {
    positions: Float32Array.from(geometry.positions),
    normals: Float32Array.from(geometry.normals),
    colors: Uint8Array.from(geometry.extra.color ?? []),
    indices: Uint32Array.from(geometry.indices),
    size: [dims[0] * scale, fit.height, dims[2] * scale],
  };
}

/** The mesh as a glTF binary: one node, one primitive, vertex colours. Same mesh, same bytes. */
export async function propGlb(mesh: PropMesh): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const accessor = (array: TypedArray, type: 'VEC3' | 'VEC4' | 'SCALAR') => doc.createAccessor().setArray(array).setType(type).setBuffer(buffer);
  const material = doc.createMaterial('prop').setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(1);
  const vertices = mesh.positions.length / 3;
  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor(mesh.positions, 'VEC3'))
    .setAttribute('NORMAL', accessor(mesh.normals, 'VEC3'))
    .setAttribute('COLOR_0', accessor(mesh.colors, 'VEC4').setNormalized(true))
    .setIndices(accessor(vertices > 65_535 ? mesh.indices : Uint16Array.from(mesh.indices), 'SCALAR'))
    .setMaterial(material);
  const node = doc.createNode('prop').setMesh(doc.createMesh('prop').addPrimitive(primitive));
  doc.createScene('prop').addChild(node);
  return new NodeIO().writeBinary(doc);
}

type Vec = readonly [number, number, number];
const add = (a: Vec, b: Vec, s: number): [number, number, number] => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const cross = (a: Vec, b: Vec): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): [number, number, number] => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Direction at `tilt` degrees above the ground, toward `heading` degrees (0 = +z, 90 = +x). */
export function direction(tilt: number, heading: number): [number, number, number] {
  const [t, h] = [(tilt * Math.PI) / 180, (heading * Math.PI) / 180];
  return [Math.cos(t) * Math.sin(h), Math.sin(t), Math.cos(t) * Math.cos(h)];
}

/**
 * A curved blade (a leaf, a petal, a sail): from `base` along `along` for `length` blocks, `halfWidth(t)`
 * across at t (0 at the base, 1 at the tip), cupped by `cup` blocks at its edges, `thick` blocks thick.
 * `color(t, s)` paints it (s −1…1 across). Follows the grid's mirroring.
 */
export function blade(
  g: Grid,
  o: { base: Vec; along: Vec; length: number; halfWidth: (t: number) => number; color: (t: number, s: number) => string; cup?: number; thick?: number; across?: Vec },
): void {
  const along = unit(o.along);
  // Across the blade: level (perpendicular to `along` and up) unless given; its face looks along their cross.
  const across = unit(o.across ?? (Math.abs(along[1]) > 0.98 ? [1, 0, 0] : cross(along, [0, 1, 0])));
  const normal = unit(cross(across, along));
  const step = 0.35;
  for (let l = 0; l <= o.length; l += step) {
    const t = l / o.length;
    const w = o.halfWidth(t);
    for (let a = -w; a <= w; a += step) {
      const s = w > 0 ? a / w : 0;
      const p = add(add(add(o.base, along, l), across, a), normal, (o.cup ?? 0) * s * s);
      for (let k = 0; k < (o.thick ?? 1); k++) {
        const q = add(p, normal, k * 0.7);
        g.box(Math.floor(q[0]), Math.floor(q[1]), Math.floor(q[2]), 1, 1, 1, o.color(t, s));
      }
    }
  }
}

/** Pointed at both ends, widest a little below the middle: a leaf or a petal `width` blocks across. */
export const leafShape =
  (width: number) =>
  (t: number): number =>
    (width / 2) * Math.sin(Math.PI * Math.min(1, t ** 0.8));

/**
 * A ball painted with the picture: each block takes the colour of the picture where it lies seen from the
 * front (the back half mirrored), so a soccer ball or the Earth reads from every side. `fallback` paints the
 * blocks whose spot in the picture is see-through.
 */
export function paintedBall(g: Grid, picture: PictureSampler, c: Vec, r: number, fallback: string, ry = r): void {
  const sym = g.sym;
  g.sym = false;
  for (let x = Math.floor(c[0] - r); x <= c[0] + r; x++) {
    for (let y = Math.floor(c[1] - ry); y <= c[1] + ry; y++) {
      for (let z = Math.floor(c[2] - r); z <= c[2] + r; z++) {
        const [dx, dy, dz] = [(x + 0.5 - c[0]) / r, (y + 0.5 - c[1]) / ry, (z + 0.5 - c[2]) / r];
        if (dx * dx + dy * dy + dz * dz > 1) continue;
        const u = 0.5 + (dz >= 0 ? dx : -dx) / 2;
        const v = 0.5 - dy / 2;
        // Blocks near the outline sample a little inward: the picture's rim is often see-through or shaded.
        const color = picture(0.5 + (u - 0.5) * 0.92, 0.5 + (v - 0.5) * 0.92) ?? fallback;
        g.box(x, y, z, 1, 1, 1, color);
      }
    }
  }
  g.sym = sym;
}

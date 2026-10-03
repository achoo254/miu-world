// Accessory JSON → one vertex-colored mesh: boxes/layers are rasterised into a voxel grid, then the
// shared greedy mesher drops hidden inner faces and merges flat areas.
import { MIRRORED_NODES, type AccessoryDef } from './accessory-schema';
import { countExposedFaces, greedyQuads, quadsToGeometry, type Dims, type QuadGeometry } from './greedy-mesher';

export const MAX_ACCESSORY_TRIANGLES = 1500;
/**
 * A vehicle is life-size and detailed (tyres, rims, lights, seat, wheel) yet costs little: each child rides
 * at most one in a scene, still one draw call.
 */
export const MAX_VEHICLE_TRIANGLES = 4000;

export interface VoxelVolume {
  dims: Dims;
  /** Voxel coordinate of grid cell (0,0,0). */
  min: [number, number, number];
  /** 0 = empty, otherwise 1 + index into `colors`. */
  cells: Uint8Array;
  colors: string[];
}

export interface AccessoryMesh {
  geometry: QuadGeometry;
  triangles: number;
  exposedFaces: number;
}

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16) / 255) as [number, number, number];
}

export function resolvePalette(def: AccessoryDef, variant?: string): Record<string, string> {
  if (!variant) return def.palette;
  const overrides = def.variants[variant];
  if (!overrides) throw new Error(`${def.id}: unknown variant "${variant}"`);
  return { ...def.palette, ...overrides };
}

/**
 * The other half of a `mirror` accessory: the same boxes flipped across x = 0 of the attach pivot,
 * worn on the paired limb (the left shoe of a right one).
 */
export function mirroredAccessory(def: AccessoryDef): AccessoryDef {
  const node = MIRRORED_NODES[def.attachNode];
  if (!node) throw new Error(`${def.id}: ${def.attachNode} has no mirrored node`);
  const [ox, oy, oz] = def.offset;
  const [rx, ry, rz] = def.rotation;
  return {
    ...def,
    attachNode: node,
    mirror: false,
    offset: [-ox, oy, oz],
    rotation: [rx, -ry, -rz],
    boxes: def.boxes.map((b) => ({ ...b, x: -(b.x + b.w) })),
  };
}

type Paint = { x: number; y: number; z: number; color: string };

/**
 * The meshes an item is worn as, each pinned to its own rig node: the item itself, a mirrored pair
 * (shoes), or clothes split by joint (torso, both arms, both legs; the right limbs mirror the left).
 */
export function accessoryPieces(def: AccessoryDef): AccessoryDef[] {
  if (!def.parts) return def.mirror ? [def, mirroredAccessory(def)] : [def];
  return Object.entries(def.parts).flatMap(([node, boxes]) => {
    const piece: AccessoryDef = { ...def, attachNode: node, boxes, parts: undefined, mirror: false };
    return node in MIRRORED_NODES ? [piece, mirroredAccessory(piece)] : [piece];
  });
}

function paints(def: AccessoryDef): Paint[] {
  const out: Paint[] = [];
  const boxes = def.boxes.flatMap((b) => (b.sym ? [b, { ...b, x: -(b.x + b.w) }] : [b]));
  for (const b of boxes) {
    for (let x = b.x; x < b.x + b.w; x++) {
      for (let y = b.y; y < b.y + b.h; y++) for (let z = b.z; z < b.z + b.d; z++) out.push({ x, y, z, color: b.color });
    }
  }
  const layers = def.layers;
  if (layers) {
    layers.rows.forEach((layer, y) =>
      layer.forEach((row, z) =>
        [...row].forEach((ch, x) => {
          const color = layers.legend[ch];
          if (ch !== '.' && color) out.push({ x: layers.origin[0] + x, y: layers.origin[1] + y, z: layers.origin[2] + z, color });
        }),
      ),
    );
  }
  return out;
}

export function rasterizeAccessory(def: AccessoryDef): VoxelVolume {
  const painted = paints(def);
  // Clothes keep their boxes in `parts`: they are built piece by piece (`accessoryPieces`).
  if (painted.length === 0) throw new Error(`${def.id}: no voxels on ${def.attachNode} (build clothes per piece)`);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of painted) {
    min[0] = Math.min(min[0], p.x);
    min[1] = Math.min(min[1], p.y);
    min[2] = Math.min(min[2], p.z);
    max[0] = Math.max(max[0], p.x);
    max[1] = Math.max(max[1], p.y);
    max[2] = Math.max(max[2], p.z);
  }
  const dims: Dims = [max[0] - min[0] + 1, max[1] - min[1] + 1, max[2] - min[2] + 1];
  const colors = Object.keys(def.palette).sort();
  const cells = new Uint8Array(dims[0] * dims[1] * dims[2]);
  for (const p of painted) {
    const i = p.x - min[0] + dims[0] * (p.y - min[1] + dims[1] * (p.z - min[2]));
    cells[i] = colors.indexOf(p.color) + 1;
  }
  return { dims, min, cells, colors };
}

/** Builds the mesh in the accessory's local space (model units, voxel (0,0,0) at the origin). */
export function buildAccessoryMesh(def: AccessoryDef, variant?: string): AccessoryMesh {
  const volume = rasterizeAccessory(def);
  const palette = resolvePalette(def, variant);
  const [sx, sy, sz] = volume.dims;
  const get = (x: number, y: number, z: number): number =>
    x < 0 || y < 0 || z < 0 || x >= sx || y >= sy || z >= sz ? 0 : (volume.cells[x + sx * (y + sy * z)] ?? 0);
  const solid = (): boolean => true;
  const quads = greedyQuads(volume.dims, get, solid);
  const rgb = volume.colors.map((name) => hexToRgb(palette[name] ?? '#ff00ff'));
  const geometry = quadsToGeometry(quads, {
    scale: def.voxelSize,
    offset: [volume.min[0] * def.voxelSize, volume.min[1] * def.voxelSize, volume.min[2] * def.voxelSize],
    attributes: { color: { size: 3, value: (q) => rgb[q.id - 1] ?? [1, 0, 1] } },
  });
  return { geometry, triangles: quads.length * 2, exposedFaces: countExposedFaces(volume.dims, get, solid) };
}

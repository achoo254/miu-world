// Greedy voxel mesher (pure TS, no three.js): merges coplanar exposed faces of the same block id
// into rectangles. Shared by world chunks (textured via atlas tiles) and accessories (vertex colors).

export type Dims = readonly [number, number, number];
/** Block id at integer coordinates; may be called outside [0, dims) to cull against neighbours. */
export type BlockSampler = (x: number, y: number, z: number) => number;
export type Axis = 0 | 1 | 2;

export interface Quad {
  axis: Axis;
  /** +1: face looks toward +axis, -1: toward -axis. */
  dir: 1 | -1;
  /** Min corner of the rectangle, lying on the face plane. */
  origin: [number, number, number];
  /** Extent along axis (axis+1)%3. */
  w: number;
  /** Extent along axis (axis+2)%3. */
  h: number;
  id: number;
}

/** A face of `self` is drawn unless the neighbour hides it (opaque, or the same transparent block). */
export function faceVisible(self: number, neighbour: number, isOpaque: (id: number) => boolean): boolean {
  if (self === 0) return false;
  if (neighbour === 0) return true;
  if (isOpaque(neighbour)) return false;
  return neighbour !== self;
}

export function countExposedFaces(dims: Dims, get: BlockSampler, isOpaque: (id: number) => boolean): number {
  let faces = 0;
  const steps = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
  for (let x = 0; x < dims[0]; x++) {
    for (let y = 0; y < dims[1]; y++) {
      for (let z = 0; z < dims[2]; z++) {
        const self = get(x, y, z);
        for (const [dx, dy, dz] of steps) if (faceVisible(self, get(x + dx, y + dy, z + dz), isOpaque)) faces++;
      }
    }
  }
  return faces;
}

export function greedyQuads(dims: Dims, get: BlockSampler, isOpaque: (id: number) => boolean): Quad[] {
  const quads: Quad[] = [];
  const pos: [number, number, number] = [0, 0, 0];
  for (const d of [0, 1, 2] as const) {
    const u = ((d + 1) % 3) as Axis;
    const v = ((d + 2) % 3) as Axis;
    const du = dims[u];
    const dv = dims[v];
    const mask = new Int32Array(du * dv);
    for (const dir of [1, -1] as const) {
      for (let s = 0; s < dims[d]; s++) {
        // 1. Mask of visible faces in this slice.
        pos[d] = s;
        for (let j = 0; j < dv; j++) {
          pos[v] = j;
          for (let i = 0; i < du; i++) {
            pos[u] = i;
            const self = get(pos[0], pos[1], pos[2]);
            const nx = pos[0] + (d === 0 ? dir : 0);
            const ny = pos[1] + (d === 1 ? dir : 0);
            const nz = pos[2] + (d === 2 ? dir : 0);
            mask[j * du + i] = faceVisible(self, get(nx, ny, nz), isOpaque) ? self : 0;
          }
        }
        // 2. Greedily grow rectangles of equal id: first along u, then along v.
        for (let j = 0; j < dv; j++) {
          for (let i = 0; i < du; ) {
            const id = mask[j * du + i] ?? 0;
            if (id === 0) {
              i++;
              continue;
            }
            let w = 1;
            while (i + w < du && mask[j * du + i + w] === id) w++;
            let h = 1;
            grow: while (j + h < dv) {
              for (let k = 0; k < w; k++) if (mask[(j + h) * du + i + k] !== id) break grow;
              h++;
            }
            for (let jj = 0; jj < h; jj++) mask.fill(0, (j + jj) * du + i, (j + jj) * du + i + w);
            const origin: [number, number, number] = [0, 0, 0];
            origin[d] = dir > 0 ? s + 1 : s;
            origin[u] = i;
            origin[v] = j;
            quads.push({ axis: d, dir, origin, w, h, id });
            i += w;
          }
        }
      }
    }
  }
  return quads;
}

export interface QuadAttribute {
  size: number;
  value: (quad: Quad) => readonly number[];
}

export interface QuadGeometry {
  positions: Float32Array;
  normals: Float32Array;
  /** Texture coordinates in block units (repeat per block); side faces keep world-up as +v. */
  uvs: Float32Array;
  indices: Uint32Array;
  extra: Record<string, Float32Array>;
}

/** Texture axes per face axis: x-faces use (z, y), y-faces (x, z), z-faces (x, y). */
const UV_AXES: Record<Axis, readonly [Axis, Axis]> = { 0: [2, 1], 1: [0, 2], 2: [0, 1] };

export function quadsToGeometry(
  quads: readonly Quad[],
  options: { scale?: number; offset?: readonly [number, number, number]; attributes?: Record<string, QuadAttribute> } = {},
): QuadGeometry {
  const scale = options.scale ?? 1;
  const offset = options.offset ?? [0, 0, 0];
  const attributes = options.attributes ?? {};
  const count = quads.length * 4;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices = new Uint32Array(quads.length * 6);
  const extra: Record<string, Float32Array> = {};
  for (const [name, attr] of Object.entries(attributes)) extra[name] = new Float32Array(count * attr.size);

  quads.forEach((q, qi) => {
    const u = (q.axis + 1) % 3;
    const v = (q.axis + 2) % 3;
    const du: [number, number, number] = [0, 0, 0];
    const dv: [number, number, number] = [0, 0, 0];
    du[u] = q.w;
    dv[v] = q.h;
    // Counter-clockwise seen from the side the face looks at.
    const corners = [
      [0, 0, 0],
      du,
      [du[0] + dv[0], du[1] + dv[1], du[2] + dv[2]],
      dv,
    ];
    if (q.dir < 0) corners.reverse();
    const [ta, tb] = UV_AXES[q.axis];
    corners.forEach((c, k) => {
      const vi = qi * 4 + k;
      for (let a = 0; a < 3; a++) {
        positions[vi * 3 + a] = (q.origin[a as Axis] + (c[a] ?? 0)) * scale + (offset[a] ?? 0);
        normals[vi * 3 + a] = a === q.axis ? q.dir : 0;
      }
      uvs[vi * 2] = c[ta] ?? 0;
      uvs[vi * 2 + 1] = c[tb] ?? 0;
      for (const [name, attr] of Object.entries(attributes)) {
        extra[name]?.set(attr.value(q), vi * attr.size);
      }
    });
    const base = qi * 4;
    indices.set([base, base + 1, base + 2, base, base + 2, base + 3], qi * 6);
  });
  return { positions, normals, uvs, indices, extra };
}

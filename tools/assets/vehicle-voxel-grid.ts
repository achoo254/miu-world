// Voxel-grid authoring for the vehicles (build-vehicles.ts): fill and carve shapes (boxes, discs, rings,
// ellipsoids) mirrored across x = 0 (voxel x ↔ −x−1), then decompose the grid back into accessory boxes
// (the x ≥ 0 half with `sym` when the grid is symmetric). Front is +z, voxel y = 0 the ground.
export interface VoxelBox {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  sym?: boolean;
}

/** One vehicle shape: how she rides it, its palette and how its voxels are laid out. */
export interface VehicleModel {
  /** The base accessory file it writes (content/accessories/<id>.json); colour variants follow it. */
  id: string;
  ride: { height: number; pose: 'stand' | 'sit' | 'drive'; float?: boolean };
  /** Every palette key of the file (keys its variants override must stay). */
  palette: Record<string, string>;
  /** Shades computed from another key: key → [source key, factor]; recomputed in every variant that recolours the source. */
  derived?: Record<string, [string, number]>;
  /** Extra overrides merged into an existing colour variant. */
  variantExtra?: Record<string, Record<string, string>>;
  build: (g: Grid) => void;
}

const K = 512;
const key = (x: number, y: number, z: number): number => ((x + 256) * K + (y + 256)) * K + (z + 256);
const unkey = (k: number): [number, number, number] => [Math.floor(k / (K * K)) - 256, (Math.floor(k / K) % K) - 256, (k % K) - 256];

export class Grid {
  cells = new Map<number, string>();
  /** When true, every op is also applied mirrored across x = 0. */
  sym = true;

  private put(x: number, y: number, z: number, c: string | null): void {
    const ks = this.sym ? [key(x, y, z), key(-x - 1, y, z)] : [key(x, y, z)];
    for (const k of ks) {
      if (c === null) this.cells.delete(k);
      else this.cells.set(k, c);
    }
  }
  get(x: number, y: number, z: number): string | undefined {
    return this.cells.get(key(x, y, z));
  }
  /** Fill [x, x+w) × [y, y+h) × [z, z+d). */
  box(x: number, y: number, z: number, w: number, h: number, d: number, c: string | null): this {
    for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) for (let k = z; k < z + d; k++) this.put(i, j, k, c);
    return this;
  }
  /** Centred-on-x box: x from -hw to hw-1 (width 2*hw). */
  cbox(hw: number, y: number, z: number, h: number, d: number, c: string | null): this {
    const s = this.sym;
    this.sym = false;
    this.box(-hw, y, z, 2 * hw, h, d, c);
    this.sym = s;
    return this;
  }
  carve(x: number, y: number, z: number, w: number, h: number, d: number): this {
    return this.box(x, y, z, w, h, d, null);
  }
  /** Disc in the y-z plane (centre cy, cz may be fractional; radius r), extruded along x [x, x+w). */
  discX(x: number, w: number, cy: number, cz: number, r: number, c: string | null, ry = r): this {
    for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++)
      for (let k = Math.floor(cz - r - 1); k <= cz + r + 1; k++) {
        const dy = (j + 0.5 - cy) / ry;
        const dz = (k + 0.5 - cz) / r;
        if (dy * dy + dz * dz <= 1) for (let i = x; i < x + w; i++) this.put(i, j, k, c);
      }
    return this;
  }
  /** Ring in the y-z plane: rOuter minus rInner. */
  ringX(x: number, w: number, cy: number, cz: number, rOut: number, rIn: number, c: string): this {
    for (let j = Math.floor(cy - rOut - 1); j <= cy + rOut + 1; j++)
      for (let k = Math.floor(cz - rOut - 1); k <= cz + rOut + 1; k++) {
        const d = Math.hypot(j + 0.5 - cy, k + 0.5 - cz);
        if (d <= rOut && d > rIn) for (let i = x; i < x + w; i++) this.put(i, j, k, c);
      }
    return this;
  }
  /** Upper half of a ring (a wheel-arch trim): ring cells at or above the centre height. */
  archX(x: number, w: number, cy: number, cz: number, rOut: number, rIn: number, c: string): this {
    for (let j = Math.floor(cy); j <= cy + rOut + 1; j++)
      for (let k = Math.floor(cz - rOut - 1); k <= cz + rOut + 1; k++) {
        const d = Math.hypot(j + 0.5 - cy, k + 0.5 - cz);
        if (d <= rOut && d > rIn) for (let i = x; i < x + w; i++) this.put(i, j, k, c);
      }
    return this;
  }
  /** Ellipse in the x-z plane (horizontal), extruded along y [y, y+h). cx is fractional (0 = centre line). */
  discY(cx: number, cz: number, rx: number, rz: number, y: number, h: number, c: string | null): this {
    for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++)
      for (let k = Math.floor(cz - rz - 1); k <= cz + rz + 1; k++) {
        const dx = (i + 0.5 - cx) / rx;
        const dz = (k + 0.5 - cz) / rz;
        if (dx * dx + dz * dz <= 1) for (let j = y; j < y + h; j++) this.put(i, j, k, c);
      }
    return this;
  }
  /** Ellipse in the x-y plane (facing z), extruded along z [z, z+d). */
  discZ(cx: number, cy: number, rx: number, ry: number, z: number, d: number, c: string | null): this {
    for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++)
      for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++) {
        const dx = (i + 0.5 - cx) / rx;
        const dy = (j + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) for (let k = z; k < z + d; k++) this.put(i, j, k, c);
      }
    return this;
  }
  /** Ellipsoid; `n` > 2 makes a superellipsoid (flatter sides, rounded-box look, fewer stair steps). */
  ellipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, c: string | null, minY = -Infinity, n = Math.max(rx, ry, rz) >= 9 ? 3.2 : Math.max(rx, ry, rz) >= 5 ? 2.6 : 2): this {
    for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++)
      for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++)
        for (let k = Math.floor(cz - rz - 1); k <= cz + rz + 1; k++) {
          const dx = (i + 0.5 - cx) / rx;
          const dy = (j + 0.5 - cy) / ry;
          const dz = (k + 0.5 - cz) / rz;
          if (j >= minY && Math.abs(dx) ** n + Math.abs(dy) ** n + Math.abs(dz) ** n <= 1) this.put(i, j, k, c);
        }
    return this;
  }
  /** Recolour the outer shell of existing cells matching `pred` (cells with an empty neighbour). */
  recolor(pred: (x: number, y: number, z: number, c: string) => string | null): this {
    const s = this.sym;
    this.sym = false;
    const changes: [number, number, number, string][] = [];
    for (const [k, c] of this.cells) {
      const [x, y, z] = unkey(k);
      const n = pred(x, y, z, c);
      if (n) changes.push([x, y, z, n]);
    }
    for (const [x, y, z, c] of changes) this.put(x, y, z, c);
    this.sym = s;
    return this;
  }

  /** Recolour the frontmost (largest z) cell of column (x, y), if any (faces painted on round fronts). */
  paintFront(x: number, y: number, c: string, minZ = -999): this {
    let best: number | null = null;
    for (let z = 200; z >= minZ; z--) if (this.get(x, y, z) !== undefined) {
      best = z;
      break;
    }
    if (best !== null) this.put(x, y, best, c);
    return this;
  }
  /** Recolour the topmost cell of column (x, z). */
  paintTop(x: number, z: number, c: string): this {
    for (let y = 200; y >= -10; y--) if (this.get(x, y, z) !== undefined) {
      this.put(x, y, z, c);
      break;
    }
    return this;
  }
  /** A stepped tube of w×w voxels from (x0,y0,z0) to (x1,y1,z1). */
  line(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string, w = 1): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.box(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), Math.round(z0 + (z1 - z0) * t), w, w, w, c);
    }
    return this;
  }

  /** Drops every cell below voxel y (round shapes and arch trims reaching under the ground). */
  clearBelow(y: number): this {
    for (const k of [...this.cells.keys()]) if (unkey(k)[1] < y) this.cells.delete(k);
    return this;
  }

  symmetric(): boolean {
    for (const [k, c] of this.cells) {
      const [x, y, z] = unkey(k);
      if (this.cells.get(key(-x - 1, y, z)) !== c) return false;
    }
    return true;
  }

  /** Greedy decomposition into boxes: x-runs, then z, then y. Symmetric grids emit the x ≥ 0 half with `sym`. */
  toBoxes(): VoxelBox[] {
    const sym = this.symmetric();
    const left = new Map<number, string>();
    for (const [k, c] of this.cells) if (!sym || unkey(k)[0] >= 0) left.set(k, c);
    const coords = [...left.keys()].map(unkey).sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0]);
    const out: VoxelBox[] = [];
    for (const [x0, y0, z0] of coords) {
      const c = left.get(key(x0, y0, z0));
      if (c === undefined) continue;
      const has = (x: number, y: number, z: number): boolean => left.get(key(x, y, z)) === c;
      let w = 1;
      while (has(x0 + w, y0, z0)) w++;
      let d = 1;
      const rowOk = (z: number, y: number): boolean => {
        for (let i = 0; i < w; i++) if (!has(x0 + i, y, z)) return false;
        return true;
      };
      while (rowOk(z0 + d, y0)) d++;
      let h = 1;
      const layerOk = (y: number): boolean => {
        for (let k = 0; k < d; k++) if (!rowOk(z0 + k, y)) return false;
        return true;
      };
      while (layerOk(y0 + h)) h++;
      for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) for (let k = 0; k < d; k++) left.delete(key(x0 + i, y0 + j, z0 + k));
      out.push({ x: x0, y: y0, z: z0, w, h, d, color: c, ...(sym ? { sym: true } : {}) });
    }
    return out;
  }
}

/** Multiplies an sRGB hex colour (f < 1 darker, > 1 lighter toward white). */
export function shade(hex: string, f: number): string {
  const c = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
  const out = c.map((v) => Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1)));
  return `#${out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A wheel on the +x side (mirrored): tyre disc across x [x, x+w), recessed rim and a hub cap on the outer face.
 * `spokes` draws a spoked rim (carriage, tricycle) instead of a solid one.
 */
export function wheel(
  g: Grid,
  o: { x: number; w: number; cy: number; cz: number; r: number; tyre?: string; rim?: string; hub?: string; cap?: string; spokes?: boolean; lite?: boolean; bg?: string },
): void {
  const { x, w, cy, cz, r } = o;
  const tyre = o.tyre ?? 'wheel';
  const rim = o.rim ?? 'rim';
  const hub = o.hub ?? 'hub';
  g.discX(x, w, cy, cz, r, tyre);
  const outer = x + w - 1;
  if (o.spokes) {
    // Spoked look on a solid wheel: a recessed dark disc between the tyre and the hub, spokes across it.
    g.discX(outer, 1, cy, cz, r - 1.3, null);
    g.discX(outer - 1, 1, cy, cz, r - 1.3, o.bg ?? tyre);
    g.ringX(outer - 1, 1, cy, cz, r - 1.3, r - 2.3, rim);
    const yc = Math.floor(cy);
    const zc = Math.floor(cz);
    const len = Math.floor(r - 1.6);
    g.box(outer - 1, yc, zc - len, 1, 1, 2 * len + 1, rim);
    g.box(outer - 1, yc - len, zc, 1, 2 * len + 1, 1, rim);
    if (r >= 7) for (let t = 1; t * 1.414 <= r - 1.8; t++) for (const [dy, dz] of [[t, t], [t, -t], [-t, t], [-t, -t]] as const) g.box(outer - 1, yc + dy, zc + dz, 1, 1, 1, rim);
    g.discX(outer - 1, 2, cy, cz, 1.8, hub);
    return;
  }
  // Recessed rim one voxel in, hub cap flush with the tyre wall, centre nut proud.
  g.discX(outer, 1, cy, cz, r - 1.5, null);
  g.discX(outer - 1, 1, cy, cz, r - 1.5, rim);
  if (o.lite) {
    g.discX(outer - 1, 2, cy, cz, Math.max(1.2, r - 4.2), o.cap ?? hub);
    return;
  }
  g.ringX(outer - 1, 1, cy, cz, r - 2.6, r - 3.4, hub);
  g.discX(outer, 1, cy, cz, Math.max(1.2, r - 4.2), o.cap ?? hub);
  g.discX(outer + 1, 1, cy, cz, 0.9, rim);
}

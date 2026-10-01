// Player physics against the block grid: axis-separated AABB sweeps with sub-stepping (no
// tunnelling), 1-block step-up, and a DDA raycast for keeping the camera out of blocks.

export type Vec3 = [number, number, number];
export type SolidAt = (x: number, y: number, z: number) => boolean;

/** Body box: position is the bottom-centre; x/z extend ±halfWidth, y extends [0, height]. */
export interface Body {
  halfWidth: number;
  height: number;
}

export interface MoveOptions {
  stepHeight: number;
  /** Whether the body stood on the ground before this move (step-up only works grounded). */
  onGround: boolean;
}

export interface MoveResult {
  position: Vec3;
  onGround: boolean;
  hitCeiling: boolean;
  /** Per axis: motion was cut short by a block. */
  blocked: [boolean, boolean, boolean];
}

const EPS = 1e-4;
const MAX_STEP = 0.25; // < 1 block, so a sweep can never skip over a block

function extents(body: Body, axis: number): [number, number] {
  return axis === 1 ? [0, body.height] : [-body.halfWidth, body.halfWidth];
}

function overlaps(pos: Vec3, body: Body, solid: SolidAt): boolean {
  const x0 = Math.floor(pos[0] - body.halfWidth);
  const x1 = Math.floor(pos[0] + body.halfWidth - EPS);
  const y0 = Math.floor(pos[1]);
  const y1 = Math.floor(pos[1] + body.height - EPS);
  const z0 = Math.floor(pos[2] - body.halfWidth);
  const z1 = Math.floor(pos[2] + body.halfWidth - EPS);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (solid(x, y, z)) return true;
  }
  return false;
}

/** Whether the body fits at a position without touching any solid block. */
export function bodyFits(pos: Vec3, body: Body, solid: SolidAt): boolean {
  return !overlaps(pos, body, solid);
}

/** Moves along one axis in small steps; on contact snaps flush against the block face. */
function sweep(pos: Vec3, axis: number, delta: number, body: Body, solid: SolidAt): boolean {
  let remaining = delta;
  const [lo, hi] = extents(body, axis);
  while (Math.abs(remaining) > 0) {
    const step = Math.max(-MAX_STEP, Math.min(MAX_STEP, remaining));
    const before = pos[axis] as number;
    pos[axis] = before + step;
    if (overlaps(pos, body, solid)) {
      if (step > 0) pos[axis] = Math.floor(before + step + hi - EPS) - hi - EPS;
      else pos[axis] = Math.floor(before + step + lo) + 1 - lo + EPS;
      // Snapping never moves backwards past the start (guards against starting inside a block).
      if ((step > 0 && (pos[axis] as number) < before) || (step < 0 && (pos[axis] as number) > before)) pos[axis] = before;
      return true;
    }
    remaining -= step;
  }
  return false;
}

function horizontalMove(start: Vec3, delta: Vec3, body: Body, solid: SolidAt): { pos: Vec3; blockedX: boolean; blockedZ: boolean } {
  const pos: Vec3 = [...start];
  const blockedX = sweep(pos, 0, delta[0], body, solid);
  const blockedZ = sweep(pos, 2, delta[2], body, solid);
  return { pos, blockedX, blockedZ };
}

export function moveAndCollide(start: Vec3, delta: Vec3, body: Body, solid: SolidAt, options: MoveOptions): MoveResult {
  let { pos, blockedX, blockedZ } = horizontalMove(start, delta, body, solid);

  // Step-up: retry the horizontal move from one step higher and keep it if it got further.
  if ((blockedX || blockedZ) && options.onGround && options.stepHeight > 0) {
    const raised: Vec3 = [...start];
    const ceiling = sweep(raised, 1, options.stepHeight, body, solid);
    if (!ceiling) {
      const stepped = horizontalMove(raised, delta, body, solid);
      const plain = Math.hypot(pos[0] - start[0], pos[2] - start[2]);
      const further = Math.hypot(stepped.pos[0] - start[0], stepped.pos[2] - start[2]);
      if (further > plain + EPS) {
        sweep(stepped.pos, 1, -options.stepHeight, body, solid); // settle onto the step
        ({ pos, blockedX, blockedZ } = stepped);
      }
    }
  }

  const blockedY = sweep(pos, 1, delta[1], body, solid);
  const groundProbe: Vec3 = [pos[0], pos[1] - 2 * EPS - 1e-3, pos[2]];
  const onGround = (blockedY && delta[1] < 0) || (delta[1] <= 0 && overlaps(groundProbe, body, solid));
  return { position: pos, onGround, hitCeiling: blockedY && delta[1] > 0, blocked: [blockedX, blockedY, blockedZ] };
}

/** Voxel DDA: distance along a unit `dir` to the first solid cell, or null within `maxDistance`. */
export function raycastGrid(origin: Vec3, dir: Vec3, maxDistance: number, solid: SolidAt): number | null {
  const cell: Vec3 = [Math.floor(origin[0]), Math.floor(origin[1]), Math.floor(origin[2])];
  const step: Vec3 = [Math.sign(dir[0]), Math.sign(dir[1]), Math.sign(dir[2])];
  const tDelta: Vec3 = [0, 0, 0];
  const tMax: Vec3 = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const d = dir[a] as number;
    const o = origin[a] as number;
    const c = cell[a] as number;
    tDelta[a] = d === 0 ? Infinity : Math.abs(1 / d);
    tMax[a] = d === 0 ? Infinity : d > 0 ? (c + 1 - o) / d : (o - c) / -d;
  }
  let t = 0;
  while (t <= maxDistance) {
    if (solid(cell[0], cell[1], cell[2])) return t;
    const axis = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2;
    t = tMax[axis] as number;
    cell[axis] = (cell[axis] as number) + (step[axis] as number);
    tMax[axis] = (tMax[axis] as number) + (tDelta[axis] as number);
  }
  return null;
}

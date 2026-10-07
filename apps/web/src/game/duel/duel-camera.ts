// Where the camera stands for a boss fight played out in the world: over the child's shoulder, turned a little off
// the line from her to the boss so both show side by side, far enough back that both fit, and aimed low so they sit
// in the part of the screen the question card leaves free (the card covers the bottom: more of a tall phone screen
// than of a wide one). Pure maths on a three.js camera: no scene, no WebGL.
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

type Point = readonly [number, number, number];

export interface DuelFrameInput {
  /** The child's feet. */
  player: Point;
  /** The boss's feet and its height (blocks). */
  boss: Point;
  bossHeight: number;
  /** Screen width over height, and the camera's vertical field of view (degrees). */
  aspect: number;
  fov: number;
  /** Which side of the line from her to the boss the camera stands on (1 or -1). */
  side: 1 | -1;
}

export interface DuelView {
  position: Vector3;
  target: Vector3;
  /** False when no distance up to the farthest fits both (the closest-fitting view is given anyway). */
  fits: boolean;
}

/** The child stands about this tall (camera-rig.ts aims at 1.3 blocks over her feet). */
const PLAYER_HEIGHT = 1.4;
/** The camera turns this far off the line from her to the boss, so she stands beside it on screen, not in front. */
const SIDE_ANGLE = MathUtils.degToRad(40);
/** It looks down a little. */
const PITCH = 0.3;
/** Never closer than this (blocks): close up, her back would hide the boss. */
const NEAREST = 5.5;
const FARTHEST = 16;
/** Kept off the screen's edges by this share of each half (5% of the screen's width or height). */
const MARGIN = 0.1;
/** Below the fight's header over the top of the screen (an eighth of its height). */
const TOP = 0.25;

/** The share of the screen (from the bottom) the question card covers: about half of a tall screen, a third of a wide one. */
export function duelCover(aspect: number): number {
  return aspect < 1 ? 0.45 : 0.35;
}

/** Whether every point projects into the part of the screen above the card, off its edges. */
function fitsAbove(camera: PerspectiveCamera, points: readonly Vector3[], cover: number): boolean {
  const bottom = -1 + 2 * cover + MARGIN;
  const p = new Vector3();
  return points.every((point) => {
    p.copy(point).project(camera);
    return p.z < 1 && Math.abs(p.x) <= 1 - MARGIN && p.y <= 1 - TOP && p.y >= bottom;
  });
}

export function frameDuel(input: DuelFrameInput): DuelView {
  const [px, py, pz] = input.player;
  const [bx, by, bz] = input.boss;
  const facing = Math.atan2(bx - px, bz - pz);
  const yaw = facing + Math.PI + input.side * SIDE_ANGLE;
  const dir = new Vector3(Math.sin(yaw) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(yaw) * Math.cos(PITCH));
  const points = [new Vector3(px, py, pz), new Vector3(px, py + PLAYER_HEIGHT, pz), new Vector3(bx, by, bz), new Vector3(bx, by + input.bossHeight, bz)];
  const centre = new Vector3((px + bx) / 2, (py + PLAYER_HEIGHT / 2 + by + input.bossHeight / 2) / 2, (pz + bz) / 2);
  const cover = duelCover(input.aspect);
  const camera = new PerspectiveCamera(input.fov, input.aspect, 0.1, 200);
  const halfTan = Math.tan(MathUtils.degToRad(input.fov) / 2);
  const view = (distance: number): { position: Vector3; target: Vector3 } => {
    const position = centre.clone().addScaledVector(dir, distance);
    // Aimed below the pair by as much as puts them in the middle of the free part (`cover` of the half-height down
    // from the screen's middle is that part's middle).
    const target = centre.clone().setY(centre.y - (cover * distance * halfTan) / Math.cos(PITCH));
    return { position, target };
  };
  let last = view(FARTHEST);
  for (let distance = NEAREST; distance <= FARTHEST; distance += 0.25) {
    last = view(distance);
    camera.position.copy(last.position);
    camera.lookAt(last.target);
    camera.updateMatrixWorld();
    if (fitsAbove(camera, points, cover)) return { ...last, fits: true };
  }
  return { ...last, fits: false };
}

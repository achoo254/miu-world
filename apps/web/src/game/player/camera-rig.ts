// Follow camera orbiting the player; a grid raycast pulls it in front of any block in the way. Against a
// bank, a trunk or a wall the camera rises and looks down over it rather than squeezing into Miu's head.
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { raycastGrid, type SolidAt } from '@miu/voxel/grid-collision';

const TARGET_HEIGHT = 1.9;
/** Gap kept between the camera and the block the ray hit. */
const WALL_MARGIN = 0.3;
const MIN_PITCH = -0.15;
const MAX_PITCH = 1.1;
/**
 * Closer than this, the camera tilts up (in these steps) to find a clearer view, as far as looking
 * almost straight down when a bank is right at Miu's back; the child's own drag stops at MAX_PITCH.
 */
const CLEAR_DISTANCE = 3;
const MAX_LIFTED_PITCH = 1.45;
const LIFT_STEP = 0.1;
/** How fast the extra tilt eases in and out (per second), so walking along a wall does not jitter. */
const LIFT_EASE = 6;

export class CameraRig {
  yaw: number;
  pitch = 0.32;
  distance = 7;
  private readonly target = new Vector3();
  private readonly smoothed = new Vector3();
  private initialised = false;
  /** Tilt added on top of `pitch` while something blocks the view from behind. */
  private lift = 0;
  /** Camera-to-aim distance after the last update: under ~1 block the camera is inside Miu. */
  viewDistance = this.distance;

  constructor(private readonly camera: PerspectiveCamera, private readonly solid: SolidAt, yaw: number) {
    this.yaw = yaw;
  }

  /** Right/forward basis on the ground plane for camera-relative movement. */
  basis(): { right: [number, number]; forward: [number, number] } {
    return { right: [Math.cos(this.yaw), -Math.sin(this.yaw)], forward: [-Math.sin(this.yaw), -Math.cos(this.yaw)] };
  }

  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.005;
    this.pitch = MathUtils.clamp(this.pitch + dy * 0.004, MIN_PITCH, MAX_PITCH);
  }

  /** Eases yaw to sit behind `facing` (used by the scripted autopilot). */
  follow(facing: number, dt: number): void {
    const behind = facing + Math.PI;
    const diff = Math.atan2(Math.sin(behind - this.yaw), Math.cos(behind - this.yaw));
    this.yaw += diff * Math.min(1, dt * 2.5);
  }

  update(dt: number, player: Vector3): void {
    // Aim at the head, but never inside a block (low canopies sit 2 blocks above the ground).
    let aimHeight = TARGET_HEIGHT;
    while (aimHeight > 0.9 && this.solid(Math.floor(player.x), Math.floor(player.y + aimHeight), Math.floor(player.z))) aimHeight -= 0.25;
    this.target.set(player.x, player.y + aimHeight, player.z);
    if (!this.initialised) {
      this.smoothed.copy(this.target);
      this.initialised = true;
    }
    this.smoothed.lerp(this.target, Math.min(1, dt * 10));
    // The least extra tilt that gives a clear view (or the most there is), eased toward.
    let wanted = 0;
    while (this.clearance(this.pitch + wanted) < CLEAR_DISTANCE && this.pitch + wanted + LIFT_STEP <= MAX_LIFTED_PITCH) wanted += LIFT_STEP;
    this.lift += (wanted - this.lift) * Math.min(1, dt * LIFT_EASE);
    const pitch = this.pitch + this.lift;
    const dir = this.direction(pitch);
    const distance = this.clearance(pitch);
    this.viewDistance = distance;
    this.camera.position.copy(this.smoothed).addScaledVector(dir, distance);
    this.camera.lookAt(this.smoothed);
  }

  private direction(pitch: number): Vector3 {
    return new Vector3(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch));
  }

  /** How far the camera can sit back at this pitch before a block gets in the way. */
  private clearance(pitch: number): number {
    const dir = this.direction(pitch);
    const hit = raycastGrid([this.smoothed.x, this.smoothed.y, this.smoothed.z], [dir.x, dir.y, dir.z], this.distance, this.solid);
    return hit === null ? this.distance : Math.max(0, hit - WALL_MARGIN);
  }
}

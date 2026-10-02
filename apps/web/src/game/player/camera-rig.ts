// Follow camera orbiting the player at the distance and tilt the child chose. The scenery never pushes it
// (owner, 02/10/2026): what stands between it and the child fades instead (block-material.ts), so in a room
// or a narrow passage the view stays the same and she still sees inside.
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import type { SolidAt } from '@miu/voxel/grid-collision';

const TARGET_HEIGHT = 1.55;
/**
 * The child's drag tilts only within a comfortable band: never below the head looking up at the sky,
 * never so steep that the screen is all ground. The view rests at DEFAULT_PITCH.
 */
const MIN_PITCH = 0.12;
const MAX_PITCH = 0.75;
export const DEFAULT_PITCH = 0.32;
/** Drag pixels to radians: sideways turns fast, tilting is slower so a sweeping swipe barely tilts. */
const YAW_PER_PX = 0.005;
const PITCH_PER_PX = 0.0025;
/** A drag counts as a tilt only when it is at least this steep (|dy| / |dx|); flatter swipes only turn. */
const TILT_SLOPE = 1;
/** While Miu walks and nobody drags, the tilt drifts back to DEFAULT_PITCH at this rate (per second). */
const RECENTER_EASE = 1.5;
/** How fast the view swings round behind the way Miu walks (per second): the scripted autopilot's pace. */
const FOLLOW_EASE = 2.5;

export class CameraRig {
  yaw: number;
  pitch = DEFAULT_PITCH;
  distance = 7;
  private readonly target = new Vector3();
  private readonly smoothed = new Vector3();
  private initialised = false;
  /** Camera-to-aim distance after the last update: under ~1 block the camera is inside Miu. */
  viewDistance = this.distance;

  constructor(private readonly camera: PerspectiveCamera, private readonly solid: SolidAt, yaw: number) {
    this.yaw = yaw;
  }

  /** Right/forward basis on the ground plane for camera-relative movement (of the view at `yaw`, default now). */
  basis(yaw = this.yaw): { right: [number, number]; forward: [number, number] } {
    return { right: [Math.cos(yaw), -Math.sin(yaw)], forward: [-Math.sin(yaw), -Math.cos(yaw)] };
  }

  orbit(dx: number, dy: number): void {
    this.yaw -= dx * YAW_PER_PX;
    if (Math.abs(dy) >= Math.abs(dx) * TILT_SLOPE) this.pitch = MathUtils.clamp(this.pitch + dy * PITCH_PER_PX, MIN_PITCH, MAX_PITCH);
  }

  /** Eases the tilt back to the resting view (called while Miu walks without a drag). */
  recenter(dt: number): void {
    this.pitch += (DEFAULT_PITCH - this.pitch) * Math.min(1, dt * RECENTER_EASE);
  }

  /**
   * Eases yaw to sit behind `facing`: the scripted autopilot at full pace, the child's walking at a share of
   * it (`strength` 0–1), so the view turns smoothly to where she goes.
   */
  follow(facing: number, dt: number, strength = 1): void {
    const behind = facing + Math.PI;
    const diff = Math.atan2(Math.sin(behind - this.yaw), Math.cos(behind - this.yaw));
    this.yaw += diff * Math.min(1, dt * FOLLOW_EASE * strength);
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
    const dir = this.direction(this.pitch);
    this.viewDistance = this.distance;
    this.camera.position.copy(this.smoothed).addScaledVector(dir, this.distance);
    this.camera.lookAt(this.smoothed);
  }

  private direction(pitch: number): Vector3 {
    return new Vector3(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch));
  }
}

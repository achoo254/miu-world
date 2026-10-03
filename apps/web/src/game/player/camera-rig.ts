// Follow camera orbiting the player at the distance and tilt the child chose. Nothing fades for standing in
// its way (owner, 02/10/2026: no occlusion fade, walls and trees draw as they are): when a wall, a roof or a
// solid prop would come between it and the child, the camera comes in to just in front of it, and eases back
// out once the way is clear. Plants (trees' leaves, bushes, crops) are not solid and never move it.
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { raycastGrid, type SolidAt } from '@miu/voxel/grid-collision';

/** The camera looks at the child's head (PLAYER_SCALE): about 1.3 blocks over her feet. */
const TARGET_HEIGHT = 1.3;
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
/** The camera stops this far in front of a wall or roof between it and the child, and never comes closer than NEAREST. */
const WALL_PAD = 0.35;
const NEAREST = 1;
/** Once the way is clear the camera eases back out to the chosen distance at this rate (per second); in, it snaps. */
const OUT_EASE = 3;
/** The child moved this far in one frame (a ride, a rescue, a saved spot): the camera jumps with her instead of gliding over the gap. */
const JUMP = 8;

export class CameraRig {
  yaw: number;
  pitch = DEFAULT_PITCH;
  distance = 7;
  private readonly target = new Vector3();
  private readonly smoothed = new Vector3();
  private initialised = false;
  /** Camera-to-aim distance after the last update (shorter than `distance` where a wall is in the way). */
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
    if (!this.initialised || this.smoothed.distanceTo(this.target) > JUMP) {
      this.smoothed.copy(this.target);
      this.initialised = true;
    }
    this.smoothed.lerp(this.target, Math.min(1, dt * 10));
    const dir = this.direction(this.pitch);
    const hit = raycastGrid([this.smoothed.x, this.smoothed.y, this.smoothed.z], [dir.x, dir.y, dir.z], this.distance, this.solid);
    const clear = hit === null ? this.distance : Math.max(NEAREST, hit - WALL_PAD);
    this.viewDistance = clear < this.viewDistance ? clear : this.viewDistance + (clear - this.viewDistance) * Math.min(1, dt * OUT_EASE);
    this.camera.position.copy(this.smoothed).addScaledVector(dir, this.viewDistance);
    this.camera.lookAt(this.smoothed);
  }

  private direction(pitch: number): Vector3 {
    return new Vector3(Math.sin(this.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw) * Math.cos(pitch));
  }
}

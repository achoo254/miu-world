// Follow camera orbiting the player; a grid raycast pulls it in front of any block in the way.
import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { raycastGrid, type SolidAt } from '@miu/voxel/grid-collision';

const TARGET_HEIGHT = 1.9;
/** Gap kept between the camera and the block the ray hit. */
const WALL_MARGIN = 0.3;
const MIN_PITCH = -0.15;
const MAX_PITCH = 1.1;

export class CameraRig {
  yaw: number;
  pitch = 0.32;
  distance = 7;
  private readonly target = new Vector3();
  private readonly smoothed = new Vector3();
  private initialised = false;

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
    const dir = new Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    const hit = raycastGrid([this.smoothed.x, this.smoothed.y, this.smoothed.z], [dir.x, dir.y, dir.z], this.distance, this.solid);
    const distance = hit === null ? this.distance : Math.max(0, hit - WALL_MARGIN);
    this.camera.position.copy(this.smoothed).addScaledVector(dir, distance);
    this.camera.lookAt(this.smoothed);
  }
}

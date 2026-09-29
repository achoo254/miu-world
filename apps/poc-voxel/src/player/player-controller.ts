// Third-person movement on the block grid: camera-relative walking/running, gravity, jump,
// 1-block step-up, all resolved by the shared grid collision.
import { Vector3 } from 'three';
import { moveAndCollide, type Body, type SolidAt } from '@miu/voxel/grid-collision';

export const WALK_SPEED = 3.4;
export const RUN_SPEED = 6.2;
const GRAVITY = 26;
const JUMP_SPEED = 8.6;
const TURN_RATE = 12; // rad/s toward the move direction
const BODY: Body = { halfWidth: 0.28, height: 1.75 };

/** World-space intent: direction length ≤ 1. */
export interface MoveIntent {
  dirX: number;
  dirZ: number;
  run: boolean;
  jump: boolean;
}

export class PlayerController {
  readonly position: Vector3;
  facing: number;
  onGround = false;
  /** Horizontal speed of the last update (drives idle/walk/sprint). */
  speed = 0;
  private velocityY = 0;

  constructor(private readonly solid: SolidAt, spawn: readonly [number, number, number], yawDeg: number) {
    this.position = new Vector3(...spawn);
    this.facing = (yawDeg * Math.PI) / 180;
  }

  update(dt: number, intent: MoveIntent): void {
    const len = Math.min(1, Math.hypot(intent.dirX, intent.dirZ));
    const speed = (intent.run ? RUN_SPEED : WALK_SPEED) * len;
    const vx = len > 0.01 ? (intent.dirX / Math.max(len, 1e-6)) * speed : 0;
    const vz = len > 0.01 ? (intent.dirZ / Math.max(len, 1e-6)) * speed : 0;

    if (intent.jump && this.onGround) this.velocityY = JUMP_SPEED;
    this.velocityY -= GRAVITY * dt;

    const result = moveAndCollide(
      [this.position.x, this.position.y, this.position.z],
      [vx * dt, this.velocityY * dt, vz * dt],
      BODY,
      this.solid,
      { stepHeight: 1, onGround: this.onGround },
    );
    const [px, py, pz] = result.position;
    this.speed = Math.hypot(px - this.position.x, pz - this.position.z) / Math.max(dt, 1e-6);
    this.position.set(px, py, pz);
    this.onGround = result.onGround;
    if (result.onGround && this.velocityY < 0) this.velocityY = 0;
    if (result.hitCeiling && this.velocityY > 0) this.velocityY = 0;

    if (len > 0.05) {
      const target = Math.atan2(vx, vz);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += Math.sign(diff) * Math.min(Math.abs(diff), TURN_RATE * dt);
    }
  }
}

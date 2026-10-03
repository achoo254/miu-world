// Third-person movement on the block grid: camera-relative walking/running, gravity, jump (and a second
// jump in the air),
// 1-block step-up, an automatic climb onto 2-block ledges, and swimming, all resolved by the shared grid
// collision. What she meets is walked through, stepped or climbed onto, or stops her, by its traversal
// (traversal.ts): `blocking` things (fences, doors, railings, walls) are never stepped or climbed over.
import { Vector3 } from 'three';
import { bodyFits, moveAndCollide, type Body, type SolidAt } from '@miu/voxel/grid-collision';

export const WALK_SPEED = 3.4;
export const RUN_SPEED = 6.2;
const GRAVITY = 26;
const JUMP_SPEED = 8.8; // clears ~1.49 blocks: effortless leap onto 1-block steps and ledges
/**
 * A second press of Jump in the air leaps again, once until she lands (owner, 03/10/2026: press twice to
 * jump higher): timed at the top of the first it lifts her feet about 2.9 blocks, still under a 3-block
 * face, which stays a wall (a stream's high bank, a curtain wall).
 */
const AIR_JUMP_SPEED = 8.8;
/**
 * Turning eases out toward the move direction (share of the remaining angle closed per second, as an
 * exponential rate), capped at TURN_RATE: a diagonal push swings her round smoothly instead of snapping.
 */
const TURN_EASE = 10;
const TURN_RATE = 12; // rad/s
/**
 * Horizontal velocity eases toward what the stick asks for, so a change of direction bends the path into
 * a short curve rather than a corner. Stopping eases faster, so she never slides off a ledge.
 */
const MOVE_EASE = 12;
const STOP_EASE = 20;
const BODY: Body = { halfWidth: 0.24, height: 1.45 };
/**
 * In water Miu sinks slowly, and holding Jump lifts her at jump speed: enough to leave the water with
 * a leap that clears a 2-block bank (a plain jump clears about 1.4), so a stream is never a trap.
 */
const WATER_GRAVITY = 7;
const SINK_SPEED = 2.2;
const SWIM_UP_SPEED = 9.5;
/** Heights above the feet sampled for water: knee and chest. */
const WET_AT = [0.3, 1.0];
/**
 * Walking into a ledge two blocks high (one block is the collision's step-up) climbs it on its own, so a
 * child never has to time a jump: Miu rises, then moves on top, in CLIMB_TIME. Taller faces stay walls.
 */
const CLIMB_HEIGHT = 2;
const CLIMB_TIME = 0.35;
/** Share of the climb spent rising before moving forward onto the ledge. */
const CLIMB_RISE = 0.65;
/** Only a deliberate push into the face climbs, not brushing past it. */
const CLIMB_MIN_INPUT = 0.3;

interface Climb {
  from: Vector3;
  to: Vector3;
  t: number;
}

/** Whether the block containing a point is water (or another liquid). */
export type LiquidAt = (x: number, y: number, z: number) => boolean;

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
  private velocityX = 0;
  private velocityZ = 0;
  private climb: Climb | null = null;
  /** Jump held on the last update: a new press is its rising edge. */
  private jumpHeld = false;
  /** Leaps left in the air before landing again. */
  private airJumps = 0;

  constructor(
    private readonly solid: SolidAt,
    spawn: readonly [number, number, number],
    yawDeg: number,
    private readonly liquid: LiquidAt = () => false,
    /** Solid cells she never steps or climbs onto by walking (traversal.ts `blocking`: fences, railings, doors). */
    private readonly blocking: SolidAt = () => false,
  ) {
    this.position = new Vector3(...spawn);
    this.facing = (yawDeg * Math.PI) / 180;
  }

  /** Knee or chest in water. */
  get inWater(): boolean {
    const { x, y, z } = this.position;
    return WET_AT.some((h) => this.liquid(Math.floor(x), Math.floor(y + h), Math.floor(z)));
  }

  /** Puts Miu down at a spot (the rescue button), at rest. */
  teleport(position: readonly [number, number, number]): void {
    this.position.set(...position);
    this.velocityY = 0;
    this.velocityX = 0;
    this.velocityZ = 0;
    this.climb = null;
    this.onGround = false;
    this.speed = 0;
  }

  /** Mid-climb onto a ledge (the character shows it as a hop). */
  get climbing(): boolean {
    return this.climb !== null;
  }

  update(dt: number, intent: MoveIntent): void {
    if (this.climb) {
      this.stepClimb(dt);
      return;
    }
    const len = Math.min(1, Math.hypot(intent.dirX, intent.dirZ));
    const speed = (intent.run ? RUN_SPEED : WALK_SPEED) * len;
    const wantX = len > 0.01 ? (intent.dirX / Math.max(len, 1e-6)) * speed : 0;
    const wantZ = len > 0.01 ? (intent.dirZ / Math.max(len, 1e-6)) * speed : 0;
    const ease = 1 - Math.exp(-(len > 0.01 ? MOVE_EASE : STOP_EASE) * dt);
    this.velocityX += (wantX - this.velocityX) * ease;
    this.velocityZ += (wantZ - this.velocityZ) * ease;
    const vx = this.velocityX;
    const vz = this.velocityZ;

    const pressed = intent.jump && !this.jumpHeld;
    this.jumpHeld = intent.jump;
    if (this.inWater) {
      this.velocityY = intent.jump ? SWIM_UP_SPEED : Math.max(this.velocityY - WATER_GRAVITY * dt, -SINK_SPEED);
    } else {
      if (intent.jump && this.onGround) {
        this.velocityY = JUMP_SPEED;
        this.airJumps = 1;
      } else if (pressed && !this.onGround && this.airJumps > 0) {
        this.velocityY = AIR_JUMP_SPEED;
        this.airJumps--;
      }
      this.velocityY -= GRAVITY * dt;
    }

    const result = moveAndCollide(
      [this.position.x, this.position.y, this.position.z],
      [vx * dt, this.velocityY * dt, vz * dt],
      BODY,
      this.solid,
      { stepHeight: 1, onGround: this.onGround, blocking: this.blocking },
    );
    const [px, py, pz] = result.position;
    this.speed = Math.hypot(px - this.position.x, pz - this.position.z) / Math.max(dt, 1e-6);
    this.position.set(px, py, pz);
    this.onGround = result.onGround;
    if (result.onGround) this.airJumps = 0;
    if (result.onGround && this.velocityY < 0) this.velocityY = 0;
    if (result.hitCeiling && this.velocityY > 0) this.velocityY = 0;
    if (result.onGround && len >= CLIMB_MIN_INPUT && (result.blocked[0] || result.blocked[2])) this.startClimb(vx, vz, result.blocked[0]);

    if (len > 0.05) {
      // Toward where the stick points, not the eased velocity: a U-turn still turns her round, not flips.
      const target = Math.atan2(wantX, wantZ);
      const diff = Math.atan2(Math.sin(target - this.facing), Math.cos(target - this.facing));
      const step = diff * (1 - Math.exp(-TURN_EASE * dt));
      this.facing += Math.sign(step) * Math.min(Math.abs(step), TURN_RATE * dt);
    }
  }

  /**
   * Starts a climb when the face Miu walks into is exactly CLIMB_HEIGHT blocks high with room to stand on
   * top and room overhead to rise (a low canopy or a lintel keeps it a wall). Along the blocked axis only.
   */
  private startClimb(vx: number, vz: number, blockedX: boolean): void {
    const axis = blockedX ? 0 : 2;
    const sign = Math.sign(axis === 0 ? vx : vz);
    if (sign === 0) return;
    const { x, y, z } = this.position;
    const feet = Math.floor(y + 1e-3);
    const front = Math.floor((axis === 0 ? x : z) + sign * (BODY.halfWidth + 0.05));
    const cx = axis === 0 ? front : Math.floor(x);
    const cz = axis === 2 ? front : Math.floor(z);
    // A wall of exactly that height that is `blocking` (a fence, a door, a railing) is not climbed.
    for (let h = 0; h < CLIMB_HEIGHT; h++) if (!this.solid(cx, feet + h, cz) || this.blocking(cx, feet + h, cz)) return;
    const top = feet + CLIMB_HEIGHT;
    const raised: [number, number, number] = [x, top + 1e-3, z];
    // The edge of the ledge, plus a little so Miu stands fully on it.
    const edge = sign > 0 ? front + BODY.halfWidth + 0.05 : front + 1 - BODY.halfWidth - 0.05;
    const onTop: [number, number, number] = axis === 0 ? [edge, top + 1e-3, z] : [x, top + 1e-3, edge];
    if (!bodyFits(raised, BODY, this.solid) || !bodyFits(onTop, BODY, this.solid)) return;
    if (!bodyFits([x, y + 1e-3, z], { halfWidth: BODY.halfWidth, height: BODY.height + CLIMB_HEIGHT }, this.solid)) return;
    this.climb = { from: this.position.clone(), to: new Vector3(...onTop), t: 0 };
    this.facing = axis === 0 ? (sign > 0 ? Math.PI / 2 : -Math.PI / 2) : sign > 0 ? 0 : Math.PI;
    this.onGround = false;
    this.speed = 0;
  }

  private stepClimb(dt: number): void {
    const climb = this.climb;
    if (!climb) return;
    climb.t = Math.min(1, climb.t + dt / CLIMB_TIME);
    const rise = Math.min(1, climb.t / CLIMB_RISE);
    const across = Math.max(0, (climb.t - CLIMB_RISE) / (1 - CLIMB_RISE));
    this.position.set(
      climb.from.x + (climb.to.x - climb.from.x) * across,
      climb.from.y + (climb.to.y - climb.from.y) * Math.sin((rise * Math.PI) / 2),
      climb.from.z + (climb.to.z - climb.from.z) * across,
    );
    if (climb.t < 1) return;
    this.position.copy(climb.to);
    this.climb = null;
    this.velocityY = 0;
    this.onGround = true;
  }
}

// What an animal NPC does from moment to moment, so it never stands frozen in one looping clip:
// now and then it eats, dances or cheers (never the same action twice running), it turns to face
// Miu when she comes close, stepping while it turns, and greets her once when she is in reach.
// Pure: no three.js; the caller plays the returned clip and applies the yaw.
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';

/** Cube Pets clip names this behaviour uses. */
export type NpcClip = 'idle' | 'walk' | 'eat' | 'dance' | 'gesture-positive';

export interface NpcFrame {
  readonly clip: NpcClip;
  /** World yaw in radians (0 faces +z). */
  readonly yaw: number;
}

export interface NpcBehaviorOptions {
  /** Yaw the NPC was placed with; it turns back to it when Miu walks away. */
  readonly homeYaw: number;
  /** Miu within this distance: the NPC turns to watch her. */
  readonly noticeRadius: number;
  /** Miu within this distance (the interaction radius): the NPC greets her. */
  readonly greetRadius: number;
  /** Length in seconds of each clip the model has; actions it lacks are never picked. */
  readonly clipSeconds: Readonly<Partial<Record<NpcClip, number>>>;
  /** Injectable for deterministic tests and runs. */
  readonly random: () => number;
}

/** Idle between two actions, in seconds: MIN plus up to SPREAD. */
const ACTION_GAP_MIN = 4;
const ACTION_GAP_SPREAD = 6;
/** A greeting does not repeat if Miu steps out and back in within this many seconds. */
const GREET_COOLDOWN = 8;
/** Turning speed (rad/s) and the remaining angle below which the NPC stops stepping. */
const TURN_SPEED = 3;
const STEP_WHILE_TURNING = 0.35;
const ACTIONS: readonly NpcClip[] = ['eat', 'dance', 'gesture-positive'];

/** Shortest signed angle from `from` to `to`, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  const d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) return d - Math.PI * 2;
  if (d <= -Math.PI) return d + Math.PI * 2;
  return d;
}

export class NpcBehavior {
  private yaw: number;
  private action: { clip: NpcClip; left: number } | null = null;
  private untilNextAction: number;
  private greetCooldown = 0;
  private wasInReach = false;
  private readonly picker: FreshPicker<NpcClip> | null;

  constructor(private readonly options: NpcBehaviorOptions) {
    this.yaw = options.homeYaw;
    const available = ACTIONS.filter((clip) => (options.clipSeconds[clip] ?? 0) > 0);
    this.picker = available.length > 0 ? freshPicker(available, options.random) : null;
    this.untilNextAction = this.gap();
  }

  private gap(): number {
    return ACTION_GAP_MIN + this.options.random() * ACTION_GAP_SPREAD;
  }

  private start(clip: NpcClip): void {
    this.action = { clip, left: this.options.clipSeconds[clip] ?? 0 };
  }

  /** `toPlayer`: Miu's offset from the NPC on the ground plane, or null when she is not around. */
  step(dt: number, toPlayer: { readonly dx: number; readonly dz: number } | null): NpcFrame {
    const distance = toPlayer ? Math.hypot(toPlayer.dx, toPlayer.dz) : Infinity;
    const noticed = toPlayer !== null && distance <= this.options.noticeRadius;
    const inReach = distance <= this.options.greetRadius;

    this.greetCooldown = Math.max(0, this.greetCooldown - dt);
    if (inReach && !this.wasInReach && this.greetCooldown === 0 && (this.options.clipSeconds['gesture-positive'] ?? 0) > 0) {
      this.start('gesture-positive');
      this.greetCooldown = GREET_COOLDOWN;
    }
    this.wasInReach = inReach;

    if (this.action) {
      this.action.left -= dt;
      if (this.action.left <= 0) {
        this.action = null;
        this.untilNextAction = this.gap();
      }
    } else if (!noticed && this.picker) {
      // While Miu is close the NPC keeps its attention on her instead of wandering off into an action.
      this.untilNextAction -= dt;
      if (this.untilNextAction <= 0) this.start(this.picker.next());
    }

    const targetYaw = noticed && toPlayer ? Math.atan2(toPlayer.dx, toPlayer.dz) : this.options.homeYaw;
    const remaining = angleDelta(this.yaw, targetYaw);
    const turn = Math.sign(remaining) * Math.min(Math.abs(remaining), TURN_SPEED * dt);
    this.yaw += turn;

    const stepping = Math.abs(remaining) > STEP_WHILE_TURNING && (this.options.clipSeconds.walk ?? 0) > 0;
    const clip = this.action?.clip ?? (stepping ? 'walk' : 'idle');
    return { clip, yaw: this.yaw };
  }
}

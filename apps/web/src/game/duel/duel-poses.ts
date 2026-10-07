// How a boss carries itself in a fight played out in the world: waiting, taunting the child, staggering at a blow
// that lands, answering a miss with a harmless trick, bowing out when beaten (nothing violent: the boss is a playful
// rival). Each pose names a clip of the NPC clip set (a Cube Pet's own clip, or a blocky character's stand-in,
// interactables.ts) and adds a little body motion drawn in code, so a model without that clip still shows the pose.
// Pure: no three.js.
import type { NpcClip } from '../entities/npc-behavior';

export type DuelPose = 'wait' | 'taunt' | 'hit' | 'counter' | 'lose';

/** The clips a fight plays: the NPC's everyday ones, and its shake of the head (no everyday behaviour uses it). */
export type DuelClip = NpcClip | 'gesture-negative';

/** One frame of a pose: the clip to play and how the body leans (radians: + tips forward), rolls and lifts (blocks). */
export interface DuelPoseFrame {
  clip: DuelClip;
  pitch: number;
  roll: number;
  lift: number;
}

/** Seconds each pose plays before the boss settles back to waiting (`lose` holds to the end of the fight). */
export const DUEL_POSE_SECONDS: Readonly<Record<DuelPose, number>> = { wait: Infinity, taunt: 1.4, hit: 1.2, counter: 1.3, lose: Infinity };

/** The stagger of a blow that lands: back 0.25 rad and up 0.15 block, there and back in 0.4 s. */
const STAGGER_S = 0.4;
/** Beaten: it bows (0.5 rad, 0.2 block down) for a moment, then dances happily as it says its winning line. */
const BOW_S = 1.2;

const ease = (k: number): number => Math.sin(Math.min(1, Math.max(0, k)) * Math.PI);

export function duelPoseFrame(pose: DuelPose, t: number): DuelPoseFrame {
  switch (pose) {
    case 'wait':
      return { clip: 'idle', pitch: 0, roll: 0, lift: 0 };
    case 'taunt':
      // A shake of the head (its clip) and a cheeky wobble.
      return { clip: 'gesture-negative', pitch: 0, roll: t < 0.9 ? Math.sin(t * 14) * 0.07 : 0, lift: 0 };
    case 'hit': {
      const k = ease(t / STAGGER_S);
      return { clip: t < STAGGER_S ? 'idle' : 'gesture-negative', pitch: -0.25 * k, roll: 0, lift: 0.15 * k };
    }
    case 'counter':
      // A cheerful trick: bubbles and leaves float toward the child (the stage sends them), the boss nods along.
      return { clip: 'gesture-positive', pitch: t < 0.5 ? 0.12 * ease(t / 0.5) : 0, roll: 0, lift: 0 };
    case 'lose': {
      if (t >= BOW_S) return { clip: 'dance', pitch: 0, roll: 0, lift: 0 };
      const k = t < 0.35 ? t / 0.35 : t > BOW_S - 0.3 ? (BOW_S - t) / 0.3 : 1;
      return { clip: 'idle', pitch: 0.5 * k, roll: 0, lift: -0.2 * k };
    }
  }
}

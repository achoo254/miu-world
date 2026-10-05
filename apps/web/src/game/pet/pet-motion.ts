// Motions the pet's model has no clip for, made in code over whatever clip plays (owner, 05/10/2026: "hoạt cảnh"
// for the pet): the tricks (sit, spin, jump, roll, high-five, dance) and the little moves of the care scenes and
// its reactions (hops of joy, a wiggle when petted, a shake after the bath, sniffing, a nap). Pure: a pose for a
// motion `t` seconds in, applied by the companion to two groups round its model (feet and centre).
//
// With less motion asked for (the device's setting or the game's "Chuyển động: Giảm bớt") the pet still does each
// thing, slower and smaller: no full turns, low hops.

export const PET_MOTIONS = ['sit', 'spin', 'jump', 'roll', 'high-five', 'dance', 'hop', 'greet', 'wiggle', 'shake', 'sniff', 'eat', 'nap', 'beg'] as const;
export type PetMotion = (typeof PET_MOTIONS)[number];

/** How long each motion plays once (seconds); the held ones (sit, nap, eat, sniff, beg) last until another starts. */
export const MOTION_SECONDS: Readonly<Record<PetMotion, number>> = {
  sit: 1.6,
  spin: 1.1,
  jump: 1.0,
  roll: 1.3,
  'high-five': 1.6,
  dance: 2.4,
  hop: 1.2,
  greet: 1.6,
  wiggle: 1.6,
  shake: 1.0,
  sniff: 1.4,
  eat: 2.4,
  nap: 3,
  beg: 1.6,
};

/** The clip of the model each motion plays under (Kenney Cube Pets: idle, walk, run, eat, dance, gesture-positive). */
export const MOTION_CLIP: Readonly<Record<PetMotion, string>> = {
  sit: 'idle',
  spin: 'gesture-positive',
  jump: 'gesture-positive',
  roll: 'idle',
  'high-five': 'gesture-positive',
  dance: 'dance',
  hop: 'gesture-positive',
  greet: 'gesture-positive',
  wiggle: 'gesture-positive',
  shake: 'idle',
  sniff: 'walk',
  eat: 'eat',
  nap: 'idle',
  beg: 'gesture-positive',
};

/**
 * How the motion moves the pet this instant: lifted off the ground (`lift`, model units of the pet's own height:
 * 1 is its height), turned round (`yaw`), tipped nose down (`pitch` > 0) or up, rolled sideways (`roll`), and
 * squashed (`squash` < 1) or stretched. Angles in radians.
 */
export interface MotionPose {
  lift: number;
  yaw: number;
  pitch: number;
  roll: number;
  squash: number;
}

export const REST_POSE: Readonly<MotionPose> = { lift: 0, yaw: 0, pitch: 0, roll: 0, squash: 1 };

const TAU = Math.PI * 2;
/** Eases 0→1 in and out. */
const ease = (k: number): number => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
/** A hop: 0 at both ends, 1 at the top. */
const arc = (k: number): number => (k <= 0 || k >= 1 ? 0 : 4 * k * (1 - k));
/** Settles in over the first `s` seconds. */
const settle = (t: number, s = 0.25): number => ease(t / s);

/** The pose of `motion` at `t` seconds; `gentle` for less motion. */
export function motionPose(motion: PetMotion, t: number, gentle = false): MotionPose {
  const k = Math.max(0, t) / MOTION_SECONDS[motion];
  const g = gentle ? 0.45 : 1;
  switch (motion) {
    case 'sit':
      // Sits back on its haunches: tipped tail-down, a little shorter.
      return { ...REST_POSE, pitch: -0.32 * settle(t), squash: 1 - 0.12 * settle(t) };
    case 'spin': {
      // One full turn with a small hop at its middle; gently, a quarter turn there and back.
      const turn = gentle ? Math.sin(Math.min(1, k) * Math.PI) * (Math.PI / 2) : ease(k) * TAU;
      return { ...REST_POSE, yaw: turn, lift: 0.25 * g * arc(k) };
    }
    case 'jump': {
      // Crouch, leap, land with a squash.
      const crouch = k < 0.18 ? arc(k / 0.36) : 0;
      const air = k >= 0.18 && k < 0.82 ? arc((k - 0.18) / 0.64) : 0;
      const land = k >= 0.82 ? arc((k - 0.82) / 0.36) : 0;
      return { ...REST_POSE, lift: 1.1 * g * air, pitch: -0.25 * air, squash: 1 - 0.18 * (crouch + land) + 0.08 * air };
    }
    case 'roll': {
      // Over on its side and all the way round (gently: onto its side and back), lifted so it never sinks.
      const over = gentle ? Math.sin(Math.min(1, k) * Math.PI) * 0.5 : ease(k) * TAU;
      return { ...REST_POSE, roll: over, lift: 0.18 * g * Math.abs(Math.sin(over / 2)), squash: 1 - 0.08 * arc(k) };
    }
    case 'high-five': {
      // Rears up on its hind legs, paw up, holds a beat, and back down.
      const up = k < 0.3 ? ease(k / 0.3) : k < 0.75 ? 1 : 1 - ease((k - 0.75) / 0.25);
      return { ...REST_POSE, pitch: -0.95 * g * up, lift: 0.12 * up, squash: 1 + 0.05 * up };
    }
    case 'dance': {
      // Bounces to a beat and sways.
      const beat = Math.abs(Math.sin(t * 6));
      return { ...REST_POSE, lift: 0.18 * g * beat, roll: 0.22 * g * Math.sin(t * 3), yaw: 0.35 * g * Math.sin(t * 1.5), squash: 1 - 0.06 * (1 - beat) };
    }
    case 'hop': {
      // Three quick hops of joy.
      const hop = arc((k * 3) % 1);
      return { ...REST_POSE, lift: 0.45 * g * hop, squash: 1 + 0.06 * hop - 0.08 * (1 - hop) * settle(t, 0.1) };
    }
    case 'greet': {
      // Two hops toward her, tail wagging (a waggle of the whole body).
      const hop = k < 0.6 ? arc(((k / 0.6) * 2) % 1) : 0;
      return { ...REST_POSE, lift: 0.4 * g * hop, roll: 0.18 * g * Math.sin(t * 14) * (1 - k) };
    }
    case 'wiggle':
      // Leans into her hand, wriggling with joy.
      return { ...REST_POSE, roll: 0.16 * g * Math.sin(t * 11), pitch: 0.12 * settle(t), squash: 1 - 0.05 * Math.abs(Math.sin(t * 5.5)) };
    case 'shake':
      // Shakes the bath water off, fast side to side, settling.
      return { ...REST_POSE, yaw: 0.32 * g * Math.sin(t * 38) * (1 - k), roll: 0.12 * g * Math.sin(t * 38 + 1) * (1 - k) };
    case 'sniff':
      // Nose to the ground, sniffing left and right.
      return { ...REST_POSE, pitch: 0.3 * settle(t), yaw: 0.25 * g * Math.sin(t * 7) };
    case 'eat':
      // Head down in the bowl, nodding as it munches.
      return { ...REST_POSE, pitch: 0.28 * settle(t) + 0.05 * Math.sin(t * 12), squash: 1 - 0.04 * settle(t) };
    case 'nap':
      // Curls up low on its side, breathing slowly.
      return { ...REST_POSE, squash: 0.72 + 0.03 * Math.sin(t * 2.2) * settle(t, 1) + 0.28 * (1 - settle(t, 0.8)), roll: 0.35 * settle(t, 0.8), lift: 0 };
    case 'beg':
      // Sits up asking, front paws up, bobbing a little.
      return { ...REST_POSE, pitch: -0.55 * settle(t, 0.35) + 0.06 * Math.sin(t * 5), squash: 1 - 0.06 * settle(t) };
  }
}

/** Whether a motion lasts until another starts (a sit, a nap, eating, sniffing, begging) rather than ending by itself. */
export const isHeld = (motion: PetMotion): boolean => motion === 'sit' || motion === 'nap' || motion === 'eat' || motion === 'sniff' || motion === 'beg';

// The child's everyday gestures, built in code on top of her clip (owner, 05/10/2026: no interaction where she
// freezes or has no animation). Each frame, after the rig's clip has posed her, `poseAction` turns her arms,
// legs and head for the gesture and returns how her whole body tips, rolls and lifts. Angles follow the rig
// (Kenney character-a, every species): an arm's or a leg's negative x swings it forward and up, a head's positive
// x bows it, a body's positive pitch leans it forward.
import { MathUtils, type Object3D } from 'three';

export const PLAYER_ACTIONS = [
  'rest',
  'lay',
  'sleep',
  'swing',
  'watch',
  'wash',
  'shower',
  'cook',
  'study',
  'stretch',
  'open',
  'tap',
  'hug',
  'dance',
  'smell',
  'kick',
  'eat',
  'drink',
  'fish',
  'pet',
  'water',
  'sweep',
  'cheer',
  'wave',
  'throw',
  'dodge',
] as const;
export type PlayerAction = (typeof PLAYER_ACTIONS)[number];

/** The bones a gesture moves (any may be missing on a rig; the gesture then skips it). */
export interface ActionRig {
  armRight: Object3D | null;
  armLeft: Object3D | null;
  head: Object3D | null;
  legRight: Object3D | null;
  legLeft: Object3D | null;
}

/** How the gesture moves her whole body: tipped forward (`pitch`, radians; −π/2 lies her on her back), rolled, lifted (model units). */
export interface ActionBody {
  pitch: number;
  roll: number;
  lift: number;
}

/** Seconds of one swing there and back (the swing's pendulum, interaction-geometry.ts, uses the same). */
export const SWING_PERIOD = 2.4;

const D = MathUtils.degToRad;
const LIE = -Math.PI / 2;

/** Poses `rig` for `action`, `t` seconds into it, over what the clip set this frame; returns the body's tilt. */
export function poseAction(rig: ActionRig, action: PlayerAction, t: number): ActionBody {
  const { armRight, armLeft, head, legRight, legLeft } = rig;
  const body: ActionBody = { pitch: 0, roll: 0, lift: 0 };
  const arms = (right: number, left: number): void => {
    if (armRight) armRight.rotation.x = right;
    if (armLeft) armLeft.rotation.x = left;
  };
  switch (action) {
    case 'rest':
      // Seated: she looks round now and then and breathes.
      if (head) head.rotation.y = Math.sin(t * 0.5) * 0.35;
      body.pitch = Math.sin(t * 1.6) * 0.012;
      break;
    case 'lay':
      body.pitch = LIE + Math.sin(t * 1.8) * 0.015;
      if (head) head.rotation.y = Math.sin(t * 0.4) * 0.25;
      break;
    case 'sleep':
      body.pitch = LIE + Math.sin(t * 1.1) * 0.02;
      if (head) head.rotation.y = 0.5;
      break;
    case 'swing': {
      // Hands up on the ropes, legs kicking in time with the swing.
      arms(D(-150), D(-150));
      if (armRight) armRight.rotation.z = D(12);
      if (armLeft) armLeft.rotation.z = D(-12);
      const kick = Math.sin((t * Math.PI * 2) / SWING_PERIOD) * 0.45;
      if (legRight) legRight.rotation.x += kick;
      if (legLeft) legLeft.rotation.x += kick;
      if (head) head.rotation.x = -0.1;
      break;
    }
    case 'watch': {
      // Sitting on the floor looking up at the screen; a giggle every few seconds.
      if (head) head.rotation.x = D(-12);
      const giggle = t % 4 < 0.8 ? Math.sin(t * 22) * 0.035 : 0;
      body.pitch = giggle;
      if (armRight) armRight.rotation.x = t % 6 < 1 ? D(-100) : 0;
      break;
    }
    case 'wash': {
      // Rubbing her hands together in front of her, head bowed.
      arms(D(-65), D(-65));
      const rub = Math.sin(t * 9) * 0.18;
      if (armRight) armRight.rotation.z = 0.28 + rub;
      if (armLeft) armLeft.rotation.z = -0.28 + rub;
      if (head) head.rotation.x = D(22);
      body.pitch = 0.06;
      break;
    }
    case 'shower': {
      // Under the shower: both hands up scrubbing her hair, face tipped up into the water, a little sway.
      const scrub = Math.sin(t * 8) * 0.2;
      arms(D(-160) + scrub, D(-160) - scrub);
      if (armRight) armRight.rotation.z = D(35);
      if (armLeft) armLeft.rotation.z = D(-35);
      if (head) head.rotation.x = D(-18) + Math.sin(t * 3) * 0.05;
      body.roll = Math.sin(t * 2.2) * 0.04;
      break;
    }
    case 'cook':
      // Stirring the pot round with one hand, holding it with the other.
      arms(D(-70) + Math.sin(t * 5) * 0.12, D(-45));
      if (armRight) armRight.rotation.y = Math.cos(t * 5) * 0.35;
      if (head) head.rotation.x = D(25);
      body.pitch = 0.08;
      break;
    case 'study':
      // Bent over the page, writing; a nod now and then.
      arms(D(-55) + Math.sin(t * 14) * 0.05, D(-35));
      if (armRight) armRight.rotation.z = Math.sin(t * 3) * 0.08;
      if (head) head.rotation.x = D(28) + (t % 3 < 0.4 ? Math.sin(t * 16) * 0.08 : 0);
      body.pitch = 0.16;
      break;
    case 'stretch':
      // Both arms up high, on tiptoe, swaying.
      arms(D(-170), D(-170));
      if (armRight) armRight.rotation.z = D(-12);
      if (armLeft) armLeft.rotation.z = D(12);
      body.roll = Math.sin(t * 1.5) * 0.08;
      body.lift = (Math.sin(t * 1.5) + 1) * 0.03;
      break;
    case 'open': {
      // Reaching for the handle, then pulling it toward her.
      const reach = Math.min(1, t / 0.4);
      const pull = t > 0.4 ? Math.min(1, (t - 0.4) / 0.4) : 0;
      arms(D(-90) * reach + D(20) * pull, D(-40) * reach);
      body.pitch = 0.08 * reach - 0.14 * pull;
      if (head) head.rotation.x = D(8);
      break;
    }
    case 'tap':
      // Quick taps of one hand on the switch or the button.
      arms(D(-75) + (Math.sin(t * 14) > 0 ? -0.12 : 0.04), 0);
      if (head) head.rotation.x = D(12);
      body.pitch = 0.04;
      break;
    case 'hug':
      // Arms round it, rocking from side to side.
      arms(D(-80), D(-80));
      if (armRight) armRight.rotation.z = 0.55;
      if (armLeft) armLeft.rotation.z = -0.55;
      if (head) head.rotation.z = 0.15;
      body.roll = Math.sin(t * 2.2) * 0.06;
      break;
    case 'dance': {
      const beat = Math.sin(t * 6);
      arms(D(-150) * Math.max(0, beat) + D(-20), D(-150) * Math.max(0, -beat) + D(-20));
      if (legRight) legRight.rotation.x = 0.35 * beat;
      if (legLeft) legLeft.rotation.x = -0.35 * beat;
      body.roll = Math.sin(t * 3) * 0.1;
      body.lift = Math.abs(beat) * 0.06;
      break;
    }
    case 'smell':
      // Bent to the flowers, hands behind her back, head swaying with the scent.
      arms(D(25), D(25));
      if (head) {
        head.rotation.x = D(25);
        head.rotation.y = Math.sin(t * 2) * 0.2;
      }
      body.pitch = 0.22;
      break;
    case 'kick': {
      const u = (t % 1.4) / 1.4;
      const swing = u < 0.35 ? Math.sin((u / 0.35) * Math.PI) : 0;
      if (legRight) legRight.rotation.x = -1.1 * swing;
      arms(D(30) * swing, D(-40) * swing);
      body.pitch = -0.08 * swing;
      break;
    }
    case 'eat':
      // Hand to mouth and chewing.
      arms(D(-115) + Math.sin(t * 4) * 0.12, D(-40));
      body.pitch = Math.sin(t * 8) * 0.045;
      break;
    case 'drink':
      arms(D(-140), 0);
      body.pitch = D(-16);
      break;
    case 'fish':
      // Both hands on the rod, watching the float; a tug now and then.
      arms(D(-50), D(-50));
      body.pitch = D(10) + (Math.sin(t * 2.5) > 0.85 ? 0.04 : 0);
      break;
    case 'pet':
      if (armRight) {
        armRight.rotation.x = D(-60) + Math.sin(t * 6) * 0.15;
        armRight.rotation.z = Math.sin(t * 6) * 0.1;
      }
      if (head) head.rotation.x = D(18);
      body.pitch = D(18);
      break;
    case 'wave':
      if (armRight) {
        armRight.rotation.x = D(-130);
        armRight.rotation.z = D(20) + Math.sin(t * 10) * 0.35;
      }
      if (head) head.rotation.z = Math.sin(t * 5) * 0.08;
      break;
    case 'water':
      arms(D(-50) + Math.sin(t * 4) * 0.1, D(-50));
      body.pitch = D(15);
      break;
    case 'sweep': {
      const sweep = Math.sin(t * 5) * 0.35;
      arms(D(-45), D(-45));
      if (armRight) armRight.rotation.y = sweep;
      if (armLeft) armLeft.rotation.y = sweep;
      break;
    }
    case 'throw': {
      // A boss fight's blow: the right arm winds back over her shoulder, then swings through toward the boss.
      const wind = Math.min(1, t / 0.18);
      const swing = t > 0.18 ? Math.min(1, (t - 0.18) / 0.16) : 0;
      if (armRight) armRight.rotation.x = D(-160) * wind + D(110) * swing;
      if (armLeft) armLeft.rotation.x = D(-30) * wind;
      body.pitch = -0.08 * wind + 0.2 * swing;
      body.roll = 0.05 * wind;
      break;
    }
    case 'dodge': {
      // A playful miss bounces back at her: she ducks and leans aside, then comes back up.
      const k = Math.sin(Math.min(1, t / 0.5) * Math.PI);
      body.roll = 0.32 * k;
      body.lift = -0.08 * k;
      arms(D(-40) * k, D(-70) * k);
      if (head) head.rotation.z = -0.15 * k;
      break;
    }
    case 'cheer':
      arms(D(-150), D(-150));
      body.pitch = Math.sin(t * 8) * 0.05;
      body.lift = Math.abs(Math.sin(t * 6)) * 0.08;
      break;
  }
  return body;
}

/** Whether a gesture lies her down (the bubble over her sits lower). */
export function liesDown(action: PlayerAction | null): boolean {
  return action === 'lay' || action === 'sleep';
}

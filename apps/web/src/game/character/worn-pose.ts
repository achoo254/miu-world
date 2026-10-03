// What the worn items change in the pose, applied after each animation update (Jev, 03/10/2026): with
// something on her back the tail is hidden (it stuck out through every bag); with something in her hand
// that arm stays still at her side as in the idle pose instead of swinging, so a staff or a fishing rod
// never brushes her cheek and keeps the way it was designed to be held (the rig's raised holding pose
// turned held things to point at her). Not while she sits on a vehicle (her hands are on the wheel) or
// plays an emote.
import { Quaternion, type AnimationClip, type Object3D } from 'three';
import { ACCESSORIES } from '../content/accessories';

/** Small enough to vanish, not zero (a zero scale makes the skinning matrix singular). */
const HIDDEN = 1e-3;

export interface WornPose {
  /** The items now worn (`id` or `id:variant`). */
  wear(entries: readonly string[]): void;
  /** After `mixer.update`: `free` is false while a seated pose or an emote owns the arms. */
  apply(free: boolean): void;
}

export function wornPose(root: Object3D, clips: readonly AnimationClip[]): WornPose {
  const tail = root.getObjectByName('tail') ?? null;
  const arm = root.getObjectByName('arm-right') ?? null;
  const track = clips.find((c) => c.name === 'idle')?.tracks.find((t) => t.name === 'arm-right.quaternion');
  const hold = track && track.values.length >= 4 ? new Quaternion(track.values[0], track.values[1], track.values[2], track.values[3]) : null;
  let back = false;
  let hand = false;
  return {
    wear(entries) {
      const slots = new Set(entries.map((entry) => ACCESSORIES.get(entry.split(':')[0] ?? '')?.slot));
      back = slots.has('back');
      hand = slots.has('hand');
      tail?.scale.setScalar(back ? HIDDEN : 1);
    },
    apply(free) {
      if (back) tail?.scale.setScalar(HIDDEN);
      if (hand && free && arm && hold) arm.quaternion.copy(hold);
    },
  };
}

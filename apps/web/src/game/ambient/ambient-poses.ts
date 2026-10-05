// Hand-made movement on a model's own parts, applied after its clip each frame so the clip keeps
// the rest of the body alive: a villager's arm to the forehead (wiping sweat), both arms up (a
// stretch), the head turning (looking around), a cup to the mouth, a waving arm, a rod held out and
// jerked; a bird's wings beating or spread in a glide, a bee's buzzing blur, a dozing animal's breath.
// Kenney Blocky Characters face +z with arms hanging along −y; Cube Pets wings hinge on z.
import type { Object3D, Vector3 } from 'three';
import type { Pose, Wings } from './ambient-types';

export interface PoseParts {
  armRight?: Object3D;
  armLeft?: Object3D;
  head?: Object3D;
  torso?: Object3D;
  body?: Object3D;
  wingLeft?: Wing;
  wingRight?: Wing;
  /** Rotation each posed part has at rest, restored every frame before the clip runs. */
  rest: Array<{ node: Object3D; x: number; y: number; z: number; scaleY: number }>;
}

/** A wing node (hinged where it meets the body, its span along x) and its angle and size at rest. */
export interface Wing {
  node: Object3D;
  baseZ: number;
  baseScale: Vector3;
}

export function findPoseParts(root: Object3D): PoseParts {
  const named = (name: string): Object3D | undefined => root.getObjectByName(name) ?? undefined;
  const wing = (name: string): Wing | undefined => {
    const node = named(name);
    return node ? { node, baseZ: node.rotation.z, baseScale: node.scale.clone() } : undefined;
  };
  const parts: PoseParts = { rest: [] };
  const set = <K extends keyof PoseParts>(key: K, value: PoseParts[K]): void => {
    if (value) parts[key] = value;
  };
  set('armRight', named('arm-right'));
  set('armLeft', named('arm-left'));
  set('head', named('head'));
  set('torso', named('torso'));
  set('body', named('body'));
  set('wingLeft', wing('wing-left'));
  set('wingRight', wing('wing-right'));
  for (const node of [parts.armRight, parts.armLeft, parts.head, parts.torso, parts.body]) {
    if (node) parts.rest.push({ node, x: node.rotation.x, y: node.rotation.y, z: node.rotation.z, scaleY: node.scale.y });
  }
  return parts;
}

/**
 * Puts posed parts back at rest. A clip that animates a part overwrites it again this frame; one that
 * does not (sitting moves no arm) must not keep the last pose's raised arm.
 */
export function resetPose(parts: PoseParts): void {
  for (const r of parts.rest) {
    r.node.rotation.set(r.x, r.y, r.z);
    r.node.scale.y = r.scaleY;
  }
  // Wings too: landed, a bird's wings fold back to rest (or to the clip's own motion), not where the last beat left them.
  for (const wing of [parts.wingLeft, parts.wingRight]) {
    if (!wing) continue;
    wing.node.rotation.z = wing.baseZ;
    wing.node.scale.copy(wing.baseScale);
  }
}

/** 0 → 1 over the first `seconds` of a pose, so arms rise instead of snapping into place. */
const easeIn = (t: number, seconds = 0.35): number => {
  const k = Math.min(1, t / seconds);
  return k * k * (3 - 2 * k);
};

/** Blends a part's clip rotation towards the pose's target. */
function lift(node: Object3D | undefined, x: number, y: number, z: number, k: number): void {
  if (!node) return;
  node.rotation.x += (x - node.rotation.x) * k;
  node.rotation.y += (y - node.rotation.y) * k;
  node.rotation.z += (z - node.rotation.z) * k;
}

export function applyPose(parts: PoseParts, pose: Pose, t: number): void {
  const k = easeIn(t);
  switch (pose) {
    case 'wipe-sweat':
      // Forearm across the brow, sweeping side to side, head bowed a little.
      lift(parts.armRight, -2.5, 0, 0.55 + Math.sin(t * 9) * 0.28, k);
      lift(parts.head, 0.15, 0, 0, k);
      return;
    case 'stretch': {
      const reach = -2.9 - Math.sin(t * 2.2) * 0.15;
      lift(parts.armRight, reach, 0, 0.25, k);
      lift(parts.armLeft, reach, 0, -0.25, k);
      lift(parts.torso, -0.14, 0, 0, k);
      lift(parts.head, -0.3, 0, 0, k);
      return;
    }
    case 'look-around':
      lift(parts.head, -0.05, Math.sin(t * 1.7) * 0.75, 0, k);
      return;
    case 'drink':
      lift(parts.armRight, -2.25, 0, 0.4, k);
      lift(parts.head, -0.4 - Math.sin(t * 3) * 0.05, 0, 0, k);
      return;
    case 'wave':
      lift(parts.armRight, -2.9, 0, -0.35 + Math.sin(t * 9) * 0.45, k);
      lift(parts.head, 0, 0, Math.sin(t * 4.5) * 0.08, k);
      return;
    case 'rod-hold':
      // Rod out over the water, the tip trembling now and then.
      lift(parts.armRight, -1.15 + Math.sin(t * 1.3) * 0.04 + (Math.sin(t * 7) > 0.92 ? 0.08 : 0), 0, 0.05, k);
      return;
    case 'rod-reel':
      lift(parts.armRight, -1.2 - Math.min(1, t * 3) * 1.2, 0, 0.05, 1);
      lift(parts.head, -0.2, 0, 0, k);
      return;
    case 'sleepy':
      if (parts.body) parts.body.scale.y = 1 + Math.sin(t * 1.4) * 0.035;
      return;
    case 'none':
      return;
  }
}

/**
 * A bird's wings in flight, seen from the ground a few blocks below (owner, 05/10/2026: "chim bay không vỗ
 * cánh"): the Cube Pet wings are small plates, so in the air they open wider and longer and beat through a
 * wide arc, centred a little above level so the downstroke reads; the body rises on each downstroke.
 */
const FLAP_RATE = 18; // radians of the beat per second: about three beats a second
const FLAP_SWING = 1.15; // radians either side of the middle of the beat
const FLAP_MIDDLE = 0.25;
/** Spread wings in the air: their span (x) and chord (z) against the folded ones. */
export const FLIGHT_WING_SPAN = 1.7;
const FLIGHT_WING_CHORD = 1.25;
/** How far the body rises and falls with each beat (blocks). */
const FLAP_BOB = 0.14;

/** The wing angle above level this frame (radians; the right wing mirrors it). Folded: none, the clip's own. */
export function wingAngle(wings: Wings, time: number): number | null {
  switch (wings) {
    case 'flap':
      return FLAP_MIDDLE + Math.sin(time * FLAP_RATE) * FLAP_SWING;
    case 'glide':
      // Held out, a little raised, rocking slowly on the air.
      return 0.18 + Math.sin(time * 2) * 0.06;
    case 'buzz':
      return Math.sin(time * 70) * 0.55;
    case 'folded':
      return null;
  }
}

/** How far the body is lifted this frame by the beat: up on the downstroke, down as the wings rise. */
export function wingBob(wings: Wings, time: number): number {
  return wings === 'flap' ? -Math.sin(time * FLAP_RATE) * FLAP_BOB : 0;
}

export function applyWings(parts: PoseParts, wings: Wings, time: number): void {
  const angle = wingAngle(wings, time);
  // A bird's wings open out in the air (flap or glide); a bee's blur and a perched bird's keep their size
  // (resetPose put them back at rest before the clip).
  const spread = wings === 'flap' || wings === 'glide';
  for (const [wing, side] of [[parts.wingLeft, 1], [parts.wingRight, -1]] as const) {
    if (!wing) continue;
    if (angle !== null) wing.node.rotation.z = wing.baseZ + side * angle;
    if (spread) wing.node.scale.set(wing.baseScale.x * FLIGHT_WING_SPAN, wing.baseScale.y, wing.baseScale.z * FLIGHT_WING_CHORD);
  }
}

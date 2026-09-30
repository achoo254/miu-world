// Hand-made movement on a model's own parts, applied after its clip each frame so the clip keeps
// the rest of the body alive: a villager's arm to the forehead (wiping sweat), both arms up (a
// stretch), the head turning (looking around), a cup to the mouth, a waving arm, a rod held out and
// jerked; a bird's wings beating or spread in a glide, a bee's buzzing blur, a dozing animal's breath.
// Kenney Blocky Characters face +z with arms hanging along −y; Cube Pets wings hinge on z.
import type { Object3D } from 'three';
import type { Pose, Wings } from './ambient-types';

export interface PoseParts {
  armRight?: Object3D;
  armLeft?: Object3D;
  head?: Object3D;
  torso?: Object3D;
  body?: Object3D;
  wingLeft?: { node: Object3D; baseZ: number };
  wingRight?: { node: Object3D; baseZ: number };
  /** Rotation each posed part has at rest, restored every frame before the clip runs. */
  rest: Array<{ node: Object3D; x: number; y: number; z: number; scaleY: number }>;
}

export function findPoseParts(root: Object3D): PoseParts {
  const named = (name: string): Object3D | undefined => root.getObjectByName(name) ?? undefined;
  const wing = (name: string) => {
    const node = named(name);
    return node ? { node, baseZ: node.rotation.z } : undefined;
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

export function applyWings(parts: PoseParts, wings: Wings, time: number): void {
  const beat = (angle: number): void => {
    if (parts.wingLeft) parts.wingLeft.node.rotation.z = parts.wingLeft.baseZ + angle;
    if (parts.wingRight) parts.wingRight.node.rotation.z = parts.wingRight.baseZ - angle;
  };
  switch (wings) {
    case 'flap':
      beat(Math.sin(time * 16) * 0.95);
      return;
    case 'glide':
      beat(0.18 + Math.sin(time * 2) * 0.05);
      return;
    case 'buzz':
      beat(Math.sin(time * 70) * 0.55);
      return;
    case 'folded':
      return; // the clip's own wing motion
  }
}

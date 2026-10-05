import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { PLAYER_ACTIONS, poseAction, type ActionRig } from './player-actions';

const rig = (): ActionRig => ({ armRight: new Object3D(), armLeft: new Object3D(), head: new Object3D(), legRight: new Object3D(), legLeft: new Object3D() });

/** How far the bones and the body are from rest, summed over a second of the gesture. */
function movement(action: (typeof PLAYER_ACTIONS)[number]): number {
  let total = 0;
  for (let t = 0.05; t < 1.6; t += 0.1) {
    const r = rig();
    const body = poseAction(r, action, t);
    for (const bone of Object.values(r) as Object3D[]) total += Math.abs(bone.rotation.x) + Math.abs(bone.rotation.y) + Math.abs(bone.rotation.z);
    total += Math.abs(body.pitch) + Math.abs(body.roll) + Math.abs(body.lift);
    expect([body.pitch, body.roll, body.lift].every(Number.isFinite)).toBe(true);
  }
  return total;
}

describe('her everyday gestures', () => {
  it('moves her for every gesture: none leaves her standing still', () => {
    for (const action of PLAYER_ACTIONS) expect(movement(action), action).toBeGreaterThan(0.5);
  });

  it('lies her flat on her back to lie down or sleep', () => {
    for (const action of ['lay', 'sleep'] as const) expect(poseAction(rig(), action, 1).pitch).toBeCloseTo(-Math.PI / 2, 1);
  });

  it('skips the bones a rig does not have', () => {
    const none: ActionRig = { armRight: null, armLeft: null, head: null, legRight: null, legLeft: null };
    for (const action of PLAYER_ACTIONS) expect(() => poseAction(none, action, 0.7)).not.toThrow();
  });
});

import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, SkinnedMesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FLIGHT_WING_SPAN, applyWings, findPoseParts, resetPose, wingAngle, wingBob } from './ambient-poses';
import { mergeParts } from './merge-parts';

/** A Cube Pet bird in miniature: a body and two flat wings hinged at its sides, span along x. */
function bird(): Group {
  const model = new Group();
  const material = new MeshBasicMaterial();
  const body = new Mesh(new BoxGeometry(1.25, 1, 1.25), material);
  body.name = 'body';
  model.add(body);
  for (const [name, side] of [['wing-left', 1], ['wing-right', -1]] as const) {
    const wing = new Mesh(new BoxGeometry(0.47, 0.2, 0.6).translate((side * 0.47) / 2, 0, 0), material);
    wing.name = name;
    wing.position.set((side * 1.25) / 2, 0.2, 0);
    model.add(wing);
  }
  return model;
}

const samples = (from: number, to: number, count: number): number[] => Array.from({ length: count }, (_, i) => from + ((to - from) * i) / (count - 1));

describe('bird wings', () => {
  it('beat through a wide arc in flight: the angle changes from frame to frame and swings over a radian either way', () => {
    const angles = samples(0, 1, 60).map((t) => wingAngle('flap', t) ?? 0);
    const changes = angles.slice(1).filter((a, i) => Math.abs(a - (angles[i] ?? 0)) > 0.01).length;
    expect(changes).toBeGreaterThan(50);
    expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(2);
    // About three beats a second: the angle crosses its middle five or more times in one second.
    const middle = (Math.max(...angles) + Math.min(...angles)) / 2;
    const crossings = angles.slice(1).filter((a, i) => (a - middle) * ((angles[i] ?? 0) - middle) < 0).length;
    expect(crossings).toBeGreaterThanOrEqual(5);
  });

  it('turns both wing nodes mirrored and spreads them while airborne; back at rest once landed', () => {
    const model = bird();
    const parts = findPoseParts(model);
    const left = model.getObjectByName('wing-left') as Object3D;
    const right = model.getObjectByName('wing-right') as Object3D;
    const seen = new Set<number>();
    for (const t of samples(0, 0.5, 12)) {
      resetPose(parts);
      applyWings(parts, 'flap', t);
      expect(right.rotation.z).toBeCloseTo(-left.rotation.z);
      seen.add(Math.round(left.rotation.z * 100));
    }
    expect(seen.size).toBeGreaterThan(8);
    expect(left.scale.x).toBeCloseTo(FLIGHT_WING_SPAN);
    resetPose(parts);
    applyWings(parts, 'folded', 1);
    expect(left.rotation.z).toBe(0);
    expect(left.scale.x).toBe(1);
  });

  it('glides with the wings held out, and lifts the body on each downstroke only while beating', () => {
    const glide = samples(0, 2, 40).map((t) => wingAngle('glide', t) ?? 0);
    expect(Math.max(...glide) - Math.min(...glide)).toBeLessThan(0.2);
    const bobs = samples(0, 0.4, 20).map((t) => wingBob('flap', t));
    expect(Math.max(...bobs) - Math.min(...bobs)).toBeGreaterThan(0.2);
    expect(wingBob('glide', 0.3)).toBe(0);
    expect(wingBob('folded', 0.3)).toBe(0);
  });

  it('moves the merged skin with the wing: a wing tip vertex rises when the wing beats up', () => {
    const model = bird();
    const [skin] = mergeParts(model, false);
    expect(skin).toBeInstanceOf(SkinnedMesh);
    if (!skin) return;
    const parts = findPoseParts(model);
    const position = skin.geometry.getAttribute('position');
    // The outermost vertex of the left wing (largest x).
    let tip = 0;
    for (let i = 1; i < position.count; i++) if (position.getX(i) > position.getX(tip)) tip = i;
    const tipAt = (angle: number): Vector3 => {
      resetPose(parts);
      if (parts.wingLeft) parts.wingLeft.node.rotation.z = angle;
      model.updateMatrixWorld(true);
      skin.skeleton.update();
      return skin.applyBoneTransform(tip, new Vector3().fromBufferAttribute(position, tip));
    };
    const level = tipAt(0);
    const raised = tipAt(1);
    expect(raised.y - level.y).toBeGreaterThan(0.3);
  });
});

import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { SolidAt } from '@miu/voxel/grid-collision';
import { CameraRig, DEFAULT_DISTANCE, DEFAULT_PITCH, MAX_DISTANCE, MIN_DISTANCE } from './camera-rig';

// Flat ground (y < 1) with a 3-block wall right behind Miu (z = 6), the way a stream bank or a trunk
// stands at her back.
const WALL_Z = 6;
const solid: SolidAt = (_x, y, z) => y < 1 || (z === WALL_Z && y < 4);
const miu = new Vector3(5.5, 1, 5.5);

function settle(rig: CameraRig): void {
  for (let i = 0; i < 120; i++) rig.update(1 / 60, miu);
}

describe('camera rig', () => {
  it('comes in front of a wall at Miu\'s back, keeping its tilt, instead of fading the wall', () => {
    const camera = new PerspectiveCamera();
    // yaw 0 puts the camera toward +z: straight through the wall.
    const rig = new CameraRig(camera, solid, 0);
    settle(rig);
    // The wall stands half a block behind her: the camera comes all the way in, to its nearest.
    expect(rig.viewDistance).toBeCloseTo(1, 5);
    expect(rig.pitch).toBeCloseTo(DEFAULT_PITCH, 5);
    expect(camera.position.z).toBeLessThan(WALL_Z + 1);
  });

  it('keeps its normal distance and tilt in the open', () => {
    const camera = new PerspectiveCamera();
    const rig = new CameraRig(camera, (_x, y) => y < 1, 0);
    settle(rig);
    expect(rig.viewDistance).toBeCloseTo(rig.distance, 5);
    expect(camera.position.y).toBeLessThan(miu.y + 1.9 + rig.distance * Math.sin(rig.pitch) + 0.01);
  });
});

describe('camera jump', () => {
  it('jumps with the child when she is carried far in one frame, without gliding over the gap', () => {
    const camera = new PerspectiveCamera();
    const rig = new CameraRig(camera, (_x, y) => y < 1, 0);
    settle(rig);
    const far = new Vector3(600.5, 1, 580.5);
    rig.update(1 / 60, far);
    expect(Math.hypot(camera.position.x - far.x, camera.position.z - far.z)).toBeLessThan(rig.distance + 1);
  });
});

describe('camera drag', () => {
  it('keeps the tilt in a comfortable band however far the child drags', () => {
    const rig = new CameraRig(new PerspectiveCamera(), () => false, 0);
    rig.orbit(0, 5000);
    expect(rig.pitch).toBeLessThan(0.8);
    rig.orbit(0, -5000);
    expect(rig.pitch).toBeGreaterThan(0.1);
  });

  it('turns without tilting on a mostly sideways swipe', () => {
    const rig = new CameraRig(new PerspectiveCamera(), () => false, 0);
    const before = rig.pitch;
    rig.orbit(40, 15);
    expect(rig.pitch).toBe(before);
    expect(rig.yaw).not.toBe(0);
  });

  it('drifts back to the resting tilt while Miu walks', () => {
    const rig = new CameraRig(new PerspectiveCamera(), () => false, 0);
    rig.orbit(0, 5000);
    for (let i = 0; i < 180; i++) rig.recenter(1 / 60);
    expect(rig.pitch).toBeCloseTo(DEFAULT_PITCH, 1);
  });
});

describe('camera follow', () => {
  it('swings smoothly round behind the way Miu walks, slower at a lower strength', () => {
    const facing = Math.PI / 2; // walking toward +x: behind her is yaw 3π/2 (−π/2)
    const turned = (strength: number, frames: number): number => {
      const rig = new CameraRig(new PerspectiveCamera(), () => false, 0);
      for (let i = 0; i < frames; i++) rig.follow(facing, 1 / 60, strength);
      return Math.abs(Math.atan2(Math.sin(rig.yaw), Math.cos(rig.yaw)));
    };
    expect(turned(0.5, 10)).toBeGreaterThan(0);
    expect(turned(0.5, 10)).toBeLessThan(turned(1, 10)); // no snap: a short walk turns a little
    expect(turned(0.5, 600)).toBeCloseTo(Math.PI / 2, 2); // a longer walk ends right behind her
  });

  it('zooms in and out within its bounds, and a new view (after a gate) keeps the chosen distance', () => {
    const open: SolidAt = (_x, y) => y < 1;
    const rig = new CameraRig(new PerspectiveCamera(), open, 0);
    expect(rig.distance).toBe(DEFAULT_DISTANCE);
    rig.zoom(Math.log(2));
    expect(rig.distance).toBeCloseTo(DEFAULT_DISTANCE * 2, 5);
    for (let i = 0; i < 120; i++) rig.update(1 / 60, miu);
    expect(rig.viewDistance).toBeCloseTo(rig.distance, 1);
    rig.zoom(10);
    expect(rig.distance).toBe(MAX_DISTANCE);
    rig.zoom(-10);
    expect(rig.distance).toBe(MIN_DISTANCE);
    expect(new CameraRig(new PerspectiveCamera(), open, 0).distance).toBe(MIN_DISTANCE);
    rig.zoom(Math.log(DEFAULT_DISTANCE / MIN_DISTANCE));
    expect(rig.distance).toBeCloseTo(DEFAULT_DISTANCE, 5);
  });
});

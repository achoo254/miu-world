import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { SolidAt } from '@miu/voxel/grid-collision';
import { CameraRig, DEFAULT_PITCH } from './camera-rig';

// Flat ground (y < 1) with a 3-block wall right behind Miu (z = 6), the way a stream bank or a trunk
// stands at her back.
const WALL_Z = 6;
const solid: SolidAt = (_x, y, z) => y < 1 || (z === WALL_Z && y < 4);
const miu = new Vector3(5.5, 1, 5.5);

function settle(rig: CameraRig): void {
  for (let i = 0; i < 120; i++) rig.update(1 / 60, miu);
}

describe('camera rig', () => {
  it('rises and looks down over a wall at Miu\'s back instead of squeezing into her head', () => {
    const camera = new PerspectiveCamera();
    // yaw 0 puts the camera toward +z: straight into the wall.
    const rig = new CameraRig(camera, solid, 0);
    settle(rig);
    expect(rig.viewDistance).toBeGreaterThan(2.5);
    expect(camera.position.y).toBeGreaterThan(4);
    expect(solid(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z))).toBe(false);
  });

  it('keeps its normal distance and tilt in the open', () => {
    const camera = new PerspectiveCamera();
    const rig = new CameraRig(camera, (_x, y) => y < 1, 0);
    settle(rig);
    expect(rig.viewDistance).toBeCloseTo(rig.distance, 5);
    expect(camera.position.y).toBeLessThan(miu.y + 1.9 + rig.distance * Math.sin(rig.pitch) + 0.01);
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

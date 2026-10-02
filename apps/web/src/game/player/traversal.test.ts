// How Miu gets past what she meets (traversal.ts): walked through, stepped or climbed onto, or stopped.
// A strip of ground along x at y = 0 (she stands at y = 1); one thing stands at x = 6 in each case.
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { CameraRig } from './camera-rig';
import { PlayerController } from './player-controller';
import type { SolidAt } from '@miu/voxel/grid-collision';

const THING_X = 6;
const ground: SolidAt = (_x, y) => y < 1;

/** What stands at x = THING_X from y = 1: its height, whether it is solid, whether it blocks. */
function world(height: number, kind: 'walk-through' | 'auto-step' | 'blocking'): { solid: SolidAt; blocking: SolidAt } {
  const here = (x: number, y: number) => x === THING_X && y >= 1 && y < 1 + height;
  return {
    solid: (x, y, z) => ground(x, y, z) || (kind !== 'walk-through' && here(x, y)),
    blocking: (x, y) => kind === 'blocking' && here(x, y),
  };
}

/** Walks toward +x for two seconds and returns where she ends up. */
function walk(height: number, kind: 'walk-through' | 'auto-step' | 'blocking', run = false): PlayerController {
  const { solid, blocking } = world(height, kind);
  const player = new PlayerController(solid, [2.5, 1, 2.5], 90, () => false, blocking);
  for (let i = 0; i < 120; i++) player.update(1 / 60, { dirX: 1, dirZ: 0, run, jump: false });
  return player;
}

describe('traversal', () => {
  it('walks through grass, bushes and fields (no collision)', () => {
    const player = walk(1, 'walk-through');
    expect(player.position.x).toBeGreaterThan(THING_X + 1);
    expect(player.position.y).toBeCloseTo(1, 3);
  });

  it('steps onto a low rock or step on its own, and down again past it', () => {
    const { solid } = world(1, 'auto-step');
    const player = new PlayerController(solid, [2.5, 1, 2.5], 90, () => false);
    let highest = 1;
    for (let i = 0; i < 150; i++) {
      player.update(1 / 60, { dirX: 1, dirZ: 0, run: false, jump: false });
      highest = Math.max(highest, player.position.y);
    }
    expect(highest).toBeCloseTo(2, 1);
    expect(player.position.x).toBeGreaterThan(THING_X + 1);
    expect(player.position.y).toBeCloseTo(1, 1);
  });

  it('climbs a two-block ledge on its own', () => {
    const ledge: SolidAt = (x, y) => y < 1 || (x >= THING_X && y < 3);
    const player = new PlayerController(ledge, [2.5, 1, 2.5], 90, () => false);
    for (let i = 0; i < 120; i++) player.update(1 / 60, { dirX: 1, dirZ: 0, run: false, jump: false });
    expect(player.position.x).toBeGreaterThan(THING_X);
    expect(player.position.y).toBeCloseTo(3, 1);
  });

  it('is stopped by a wall, a fence or a closed door, however low', () => {
    for (const [height, kind] of [[3, 'auto-step'], [1, 'blocking'], [2, 'blocking']] as const) {
      const player = walk(height, kind, true);
      expect(player.position.x, `${kind} ${height}`).toBeLessThan(THING_X);
      expect(player.position.y, `${kind} ${height}`).toBeCloseTo(1, 3);
    }
  });

  it('runs across a stretch of mixed things without sticking or passing through what blocks', () => {
    // Grass at 4, a crate at 7, grass at 10, a fence at 13.
    const solid: SolidAt = (x, y) => y < 1 || ((x === 7 || x === 13) && y === 1);
    const blocking: SolidAt = (x, y) => x === 13 && y === 1;
    const player = new PlayerController(solid, [2.5, 1, 2.5], 90, () => false, blocking);
    let last = player.position.x;
    let stalls = 0;
    for (let i = 0; i < 240; i++) {
      player.update(1 / 60, { dirX: 1, dirZ: 0, run: true, jump: false });
      if (player.position.x < 12 && player.position.x - last < 1e-3) stalls++;
      last = player.position.x;
    }
    expect(stalls).toBe(0);
    expect(player.position.x).toBeGreaterThan(11);
    expect(player.position.x).toBeLessThan(13);
  });
});

describe('camera and what stands between it and Miu', () => {
  const rigAt = (solid: SolidAt): CameraRig => {
    const rig = new CameraRig(new PerspectiveCamera(), solid, 0);
    rig.update(1, new Vector3(0.5, 1, 0.5));
    return rig;
  };

  it('keeps its distance behind a tree (leaves are not solid, nothing fades)', () => {
    expect(rigAt(ground).viewDistance).toBeCloseTo(7, 3);
  });

  it('comes in front of a wall behind her instead of hiding her or fading the wall', () => {
    // The camera sits behind her toward +z at yaw 0: a wall at z = 3.
    const wall: SolidAt = (x, y, z) => ground(x, y, z) || (z === 3 && y < 8);
    const rig = rigAt(wall);
    expect(rig.viewDistance).toBeLessThan(3);
    expect(rig.viewDistance).toBeGreaterThanOrEqual(1);
  });
});

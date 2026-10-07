import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { duelCover, frameDuel } from './duel-camera';

/** Where a point lands on screen, as shares of its width and height from the top left (0…1). */
function onScreen(view: { position: Vector3; target: Vector3 }, aspect: number, point: Vector3): { x: number; y: number } {
  const camera = new PerspectiveCamera(60, aspect, 0.1, 200);
  camera.position.copy(view.position);
  camera.lookAt(view.target);
  camera.updateMatrixWorld();
  const p = point.clone().project(camera);
  return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 };
}

const SCREENS = [
  { name: 'phone, upright (9 : 19.5)', aspect: 9 / 19.5 },
  { name: 'iPad, upright (3 : 4)', aspect: 3 / 4 },
  { name: 'iPad, wide (4 : 3)', aspect: 4 / 3 },
];

describe('framing a boss fight', () => {
  for (const screen of SCREENS) {
    for (const apart of [2, 3, 4]) {
      for (const side of [1, -1] as const) {
        it(`shows her and the boss ${apart} blocks away above the card, off the edges, on a ${screen.name} (side ${side})`, () => {
          const player: [number, number, number] = [10, 5, 10];
          const boss: [number, number, number] = [10 + apart * 0.6, 5, 10 + apart * 0.8];
          const view = frameDuel({ player, boss, bossHeight: 1.6, aspect: screen.aspect, fov: 60, side });
          expect(view.fits).toBe(true);
          const free = 1 - duelCover(screen.aspect);
          for (const point of [new Vector3(...player), new Vector3(10, 6.4, 10), new Vector3(...boss), new Vector3(boss[0], boss[1] + 1.6, boss[2])]) {
            const at = onScreen(view, screen.aspect, point);
            expect(at.x).toBeGreaterThanOrEqual(0.05);
            expect(at.x).toBeLessThanOrEqual(0.95);
            expect(at.y).toBeGreaterThanOrEqual(0.05);
            expect(at.y).toBeLessThanOrEqual(free - 0.05);
          }
        });
      }
    }
  }

  it('stands behind her, on the side asked for, looking down a little', () => {
    const left = frameDuel({ player: [0, 0, 0], boss: [0, 0, 3], bossHeight: 1.5, aspect: 4 / 3, fov: 60, side: 1 });
    const right = frameDuel({ player: [0, 0, 0], boss: [0, 0, 3], bossHeight: 1.5, aspect: 4 / 3, fov: 60, side: -1 });
    // The boss is to the +z: the camera is on the -z side of her, above, and the two sides mirror each other.
    expect(left.position.z).toBeLessThan(0);
    expect(left.position.y).toBeGreaterThan(1);
    expect(Math.sign(left.position.x)).toBe(-Math.sign(right.position.x));
  });

  it('leaves a tall screen less room than a wide one', () => {
    expect(duelCover(9 / 19.5)).toBeGreaterThan(duelCover(4 / 3));
  });
});

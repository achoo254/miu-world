import { describe, expect, it } from 'vitest';
import type { RouteServiceResult } from './route-service';
import { RouteWalker, type AutowalkState } from './route-walker';

/** Moves a point along the walker's intent, as a controller on open ground would (no easing). */
function walk(walker: RouteWalker, at: { x: number; y: number; z: number }, seconds: number, dt = 1 / 30): void {
  for (let t = 0; t < seconds; t += dt) {
    const intent = walker.update(dt, at);
    if (!intent) return;
    const speed = intent.run ? 6.2 : 3.4;
    at.x += intent.dirX * speed * dt;
    at.z += intent.dirZ * speed * dt;
  }
}

function setup(result: RouteServiceResult) {
  const states: AutowalkState[] = [];
  let resolve: (r: RouteServiceResult) => void = () => undefined;
  const walker = new RouteWalker(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
    (s) => states.push(s),
  );
  return { walker, states, answer: async () => resolve(result) };
}

describe('RouteWalker', () => {
  it('stands still while the way is found, then walks the waypoints to the target', async () => {
    const { walker, states, answer } = setup({ ok: true, reachesTarget: true, points: [[0.5, 2, 20.5], [20.5, 2, 20.5]] });
    const at = { x: 0.5, y: 2, z: 0.5 };
    walker.go(at, { position: [20.5, 2, 20.5], radius: 2 });
    expect(walker.update(1 / 30, at)).toEqual({ dirX: 0, dirZ: 0, run: false, jump: false });
    await answer();
    await Promise.resolve();
    walk(walker, at, 20);
    expect(states).toEqual(['finding', 'walking', 'arrived']);
    expect(Math.hypot(at.x - 20.5, at.z - 20.5)).toBeLessThanOrEqual(1.6);
  });

  it('runs while much of the way is left and walks the last stretch', async () => {
    const { walker, answer } = setup({ ok: true, reachesTarget: true, points: [[40.5, 2, 0.5]] });
    const at = { x: 0.5, y: 2, z: 0.5 };
    walker.go(at, { position: [40.5, 2, 0.5], radius: 2 });
    await answer();
    await Promise.resolve();
    expect(walker.update(1 / 30, at)?.run).toBe(true);
    at.x = 36;
    expect(walker.update(1 / 30, at)?.run).toBe(false);
  });

  it('hops when held up, and gives up after finding the way again does not help', async () => {
    const { walker, states, answer } = setup({ ok: true, reachesTarget: true, points: [[10.5, 2, 0.5]] });
    const at = { x: 0.5, y: 2, z: 0.5 };
    walker.go(at, { position: [10.5, 2, 0.5], radius: 2 });
    await answer();
    await Promise.resolve();
    let hopped = false;
    for (let t = 0; t < 2; t += 1 / 30) hopped ||= walker.update(1 / 30, at)?.jump ?? false;
    expect(hopped).toBe(true);
    for (let round = 0; round < 3; round++) {
      for (let t = 0; t < 4; t += 1 / 30) walker.update(1 / 30, at);
      await answer();
      await Promise.resolve();
    }
    expect(states.at(-1)).toBe('failed');
  });

  it('drops a route that comes back after stop()', async () => {
    const { walker, states, answer } = setup({ ok: true, reachesTarget: true, points: [[10.5, 2, 0.5]] });
    walker.go({ x: 0, y: 2, z: 0 }, { position: [10.5, 2, 0.5], radius: 2 });
    walker.stop();
    await answer();
    await Promise.resolve();
    expect(states).toEqual(['finding', 'idle']);
    expect(walker.active).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { canMakeTen, createTensBundles, inside, pilesFor } from './logic';

describeMinigame('tens-bundles');

describe('tens bundles rules', () => {
  it('lays out the asked number of sticks, a ten whole or in two piles', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const target = 10 + (seed * 7) % 50;
      const groups = pilesFor(createRng(seed), target, 15);
      expect(groups.flat().reduce((a, b) => a + b, 0)).toBe(target);
      for (const g of groups.slice(0, Math.floor(target / 10))) expect(g.reduce((a, b) => a + b, 0)).toBe(10);
    }
    expect(canMakeTen([3, 7, 4])).toBe(true);
    expect(canMakeTen([6, 7])).toBe(false);
  });

  const loopAround = (sticks: Point[], extra: number): Point[] => {
    const xs = sticks.map((s) => s.x);
    const ys = sticks.map((s) => s.y);
    const l = Math.min(...xs) - extra;
    const r = Math.max(...xs) + extra;
    const t = Math.min(...ys) - extra;
    const b = Math.max(...ys) + extra;
    return [
      { x: l, y: t },
      { x: r, y: t },
      { x: r, y: b },
      { x: l, y: b },
      { x: l, y: t },
    ];
  };

  it('ties a loop round exactly ten and lets a loop round fewer slip off', () => {
    const game = createTensBundles({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: {}, rng: createRng(6) });
    const s = game.state;
    const draw = (loop: Point[]) => {
      loop.forEach((p, i) => game.step(1 / 60, { ...NO_INPUT, pressed: i === 0, pointer: p }));
      game.step(1 / 60, { ...NO_INPUT, released: true });
    };
    const firstPile = s.sticks.filter((k) => k.pile === 0);
    const loop = loopAround(firstPile, 12);
    const caught = s.sticks.filter((k) => inside(loop, k)).length;
    draw(loop);
    if (caught === 10) expect(s.bundles).toBe(1);
    else {
      expect(s.bundles).toBe(0);
      expect(s.slipped?.count).toBe(caught);
    }
  });
});

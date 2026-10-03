import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLunchboxPack, FOOD_GROUPS, groupOf } from './logic';
import { FOODS } from './draw';

describeMinigame('lunchbox-pack');

describe('lunchbox pack rules', () => {
  const setup = () => createLunchboxPack({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: { speed: 1 }, rng: createRng(2) });

  it('has a picture for every food', () => {
    expect(FOODS).toHaveLength(FOOD_GROUPS.length);
  });

  it('closes a box of four different groups for a point, and spills one with a group twice', () => {
    const game = setup();
    const s = game.state;
    const put = (food: number) => {
      s.foods.push({ id: 900 + food, food, x: 300, y: s.beltY, held: false });
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: s.beltY }] });
    };
    const firstOf = (g: number) => FOOD_GROUPS.indexOf(g as 0 | 1 | 2 | 3);
    for (let g = 0; g < 4; g += 1) put(firstOf(g));
    expect(game.score).toBe(1);
    expect(s.phase).toBe('closed');
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.packed).toEqual([]);
    s.foods = [];
    for (const g of [0, 1, 1, 3]) put(firstOf(g));
    expect(s.phase).toBe('spilled');
    expect(game.score).toBe(1);
    expect(new Set(s.packed.map(groupOf)).size).toBe(3);
  });

  it('is not won by tapping every food that passes', () => {
    for (const seed of [1, 2, 3]) {
      const game = createLunchboxPack({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: { speed: 1 }, rng: createRng(seed) });
      for (let step = 0; step < 90 * 60; step += 1) {
        const f = step % 6 === 0 ? game.state.foods.find((x) => x.x > 40 && x.x < 820) : undefined;
        game.step(1 / 60, f ? { ...NO_INPUT, taps: [{ x: f.x, y: f.y }] } : NO_INPUT);
      }
      expect(game.score).toBeLessThan(8);
    }
  });
});

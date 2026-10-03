import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFiveFruitTray, fits, isComplete, neighbours, solveTray, type Fruit, type Slot } from './logic';

describeMinigame('five-fruit-tray');

const slot = (fruit: Fruit | null, fixed = false): Slot => ({ x: 0, y: 0, fruit, fixed, placedAgo: 9 });

describe('five-fruit tray rules', () => {
  const five: Fruit[] = ['banana', 'mango', 'tangerine', 'grapes', 'pineapple'];

  it('joins the middle to the whole ring and each ring place to its two neighbours', () => {
    expect(neighbours(6, 0)).toEqual([1, 2, 3, 4, 5]);
    expect(neighbours(6, 1).sort()).toEqual([0, 2, 5]);
  });

  it('refuses a fruit next to its twin and needs all five fruits', () => {
    const slots = [slot('banana'), slot('mango'), slot(null), slot('mango'), slot('grapes'), slot('tangerine')];
    expect(fits(slots, 2, 'mango')).toBe(false);
    expect(fits(slots, 2, 'banana')).toBe(false);
    expect(fits(slots, 2, 'pineapple')).toBe(true);
    slots[2] = slot('tangerine');
    expect(isComplete(slots, five)).toBe(false);
    slots[2] = slot('pineapple');
    expect(isComplete(slots, five)).toBe(true);
  });

  it('always has a way to finish a tray, Grandma’s fruit included', () => {
    const slots = [slot(null), slot('grapes', true), slot(null), slot(null), slot('grapes', true), slot(null), slot(null)];
    const plan = solveTray(slots, five);
    expect(plan).not.toBeNull();
    if (plan) expect(isComplete(plan.map((f) => slot(f)), five)).toBe(true);
  });

  it('rolls a fruit off when it is dropped next to its twin', () => {
    const game = createFiveFruitTray({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(1) });
    const [a, b] = game.state.slots;
    const pile = game.state.piles[0];
    if (!a || !b || !pile) throw new Error('no tray');
    const carry = (to: { x: number; y: number }) => {
      game.step(1 / 60, { ...NO_INPUT, pointer: pile, pressed: true });
      game.step(1 / 60, { ...NO_INPUT, pointer: to });
      game.step(1 / 60, { ...NO_INPUT, released: true });
    };
    carry(a);
    expect(a.fruit).toBe(pile.fruit);
    carry(b);
    expect(b.fruit).toBeNull();
    expect(game.state.rolled?.fruit).toBe(pile.fruit);
  });
});

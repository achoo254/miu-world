import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWhackMole, headOf, RISE_SECONDS } from './logic';

describeMinigame('whack-mole');

describe('whack-mole rules', () => {
  const setup = () => createWhackMole({ arena: { width: 863, height: 600 }, goal: 25, duration: 60, params: { speed: 1 }, rng: createRng(4) });
  const raise = (game: ReturnType<typeof setup>, index: number, critter: 'mole' | 'golden' | 'rabbit') => {
    const hole = game.state.holes[index];
    if (!hole) throw new Error('no hole');
    Object.assign(hole, { critter, age: RISE_SECONDS, stay: 1, bonked: -1 });
    return headOf(hole, game.state.size);
  };

  it('scores a bonked mole, three for a crowned one, and only once', () => {
    const game = setup();
    const head = raise(game, 0, 'mole');
    game.step(1 / 60, { ...NO_INPUT, taps: [head, head] });
    expect(game.score).toBe(1);
    const gold = raise(game, 5, 'golden');
    game.step(1 / 60, { ...NO_INPUT, taps: [gold] });
    expect(game.score).toBe(4);
  });

  it('takes two points back for a rabbit, never below zero, and ignores taps on empty grass', () => {
    const game = setup();
    const rabbit = raise(game, 2, 'rabbit');
    game.step(1 / 60, { ...NO_INPUT, taps: [rabbit] });
    expect(game.score).toBe(0);
    expect(game.drainEvents().map((e) => e.type)).toContain('hit');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 5, y: 590 }] });
    expect(game.score).toBe(0);
  });
});

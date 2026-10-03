import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLiftNumbers, FLOORS, rowY } from './logic';

describeMinigame('lift-numbers');

describe('lift numbers rules', () => {
  const setup = () => createLiftNumbers({ arena: { width: 863, height: 600 }, goal: 15, duration: 90, params: {}, rng: createRng(5) });

  it('numbers the floors with six different two-digit numbers going up', () => {
    const game = setup();
    expect(game.state.numbers.length).toBe(FLOORS);
    expect(new Set(game.state.numbers).size).toBe(FLOORS);
    expect([...game.state.numbers].sort((a, b) => a - b)).toEqual(game.state.numbers);
    expect(game.state.numbers.every((n) => n >= 10 && n < 100)).toBe(true);
  });

  it('lets riders out only on the floor of their card', () => {
    const game = setup();
    const [first, second] = game.state.numbers;
    game.state.riders = [
      { want: second ?? 0, face: 0, arrivedAt: 0 },
      { want: first ?? 0, face: 1, arrivedAt: 0 },
    ];
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: rowY(game.state, 1) }] });
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.state.riders.map((r) => r.want)).toEqual([second]);
  });
});

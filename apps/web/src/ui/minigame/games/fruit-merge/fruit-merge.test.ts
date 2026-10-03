import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFruitMerge, POINTS } from './logic';

describeMinigame('fruit-merge');

describe('fruit merge rules', () => {
  const setup = () => createFruitMerge({ arena: { width: 863, height: 600 }, goal: 150, duration: 90, params: {}, rng: createRng(1) });
  const settle = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('merges two of a kind into the next fruit and scores it', () => {
    const game = setup();
    const x = (game.state.left + game.state.right) / 2;
    game.state.current = 1;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y: 300 }] });
    settle(game, 1);
    game.state.current = 1;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y: 300 }] });
    settle(game, 1.5);
    expect(game.state.fruits.map((f) => f.level)).toEqual([2]);
    expect(game.score).toBe(POINTS[2]);
  });

  it('stops the round only once the pile has stayed over the top line for a while', () => {
    const game = setup();
    const fruit = { id: 99, level: 7, x: (game.state.left + game.state.right) / 2, y: 0, vx: 0, vy: 0, age: 2 };
    game.state.fruits.push(fruit);
    // Held up there, as a full crate would hold it.
    const hold = (seconds: number) => {
      for (let i = 0; i < seconds * 60; i += 1) {
        fruit.y = game.state.lineY;
        fruit.vy = 0;
        game.step(1 / 60, NO_INPUT);
      }
    };
    hold(1);
    expect(game.done).toBe(false);
    hold(1);
    expect(game.done).toBe(true);
  });
});

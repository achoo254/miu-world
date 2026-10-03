import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createStackCatch, LAYER, topX } from './logic';

describeMinigame('stack-catch');

describe('stack catch rules', () => {
  const setup = () => createStackCatch({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: { speed: 1 }, rng: createRng(3) });

  it('lands a pancake on the stack when the top is under it, and scores the new height', () => {
    const game = setup();
    game.state.falling = { x: topX(game.state) + 10, h: 5, vh: 600, missed: -1, missedY: 0 };
    game.step(1 / 60, NO_INPUT);
    expect(game.state.layers).toHaveLength(1);
    expect(game.score).toBe(1);
    game.state.falling = { x: topX(game.state), h: LAYER + 5, vh: 600, missed: -1, missedY: 0 };
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(2);
  });

  it('lets a pancake far from the top fall past', () => {
    const game = setup();
    game.state.falling = { x: topX(game.state) + 200, h: 5, vh: 600, missed: -1, missedY: 0 };
    for (let i = 0; i < 3; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.layers).toHaveLength(0);
    expect(game.drainEvents().some((e) => e.type === 'miss')).toBe(true);
  });

  it('topples a tall stack jerked from side to side, keeping the best height', () => {
    const game = setup();
    game.state.layers = Array.from({ length: 14 }, () => ({ dx: 0, topping: 0 as const }));
    game.state.best = 14;
    for (let i = 0; i < 120 && game.state.layers.length > 0; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: i % 30 < 15 ? 80 : 780, y: 500 } });
    expect(game.state.layers).toHaveLength(0);
    expect(game.score).toBe(14);
  });
});

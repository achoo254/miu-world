import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createEggCatch } from './logic';

describeMinigame('egg-catch');

describe('egg catch rules', () => {
  const setup = () => createEggCatch({ arena: { width: 863, height: 600 }, goal: 25, duration: 40, params: { speed: 1 }, rng: createRng(3) });

  it('moves the basket toward the finger, not in one jump', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 800, y: 500 } });
    expect(game.state.basketX).toBeGreaterThan(431);
    expect(game.state.basketX).toBeLessThan(800);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 800, y: 500 } });
    expect(game.state.basketX).toBe(800);
  });

  it('scores an egg that lands in the basket and takes a heart for a rock', () => {
    const game = setup();
    game.state.items.push({ kind: 'golden', x: game.state.basketX, y: game.state.basketY - 30, vy: 600, ended: -1, caught: false });
    game.state.items.push({ kind: 'rock', x: game.state.basketX, y: game.state.basketY - 25, vy: 600, ended: -1, caught: false });
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(3);
    expect(game.lives).toBe(2);
    expect(game.drainEvents().map((e) => e.type).sort()).toEqual(['hit', 'score']);
  });
});

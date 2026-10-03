import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPinball } from './logic';

describeMinigame('pinball');

describe('pinball rules', () => {
  const setup = () => createPinball({ arena: { width: 863, height: 600 }, goal: 300, duration: 90, params: {}, rng: createRng(1) });

  it('raises the flipper on the side that is touched', () => {
    const game = setup();
    for (let i = 0; i < 10; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 10, y: 400 } });
    const [left, right] = game.state.flippers;
    expect(left?.angle).toBeLessThan(0);
    expect(right?.angle).toBeGreaterThan(0.4);
  });

  it('rings a bell for ten points and loses a ball that drains (after the free seconds)', () => {
    const game = setup();
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    const bell = game.state.bumpers[0];
    if (!bell) throw new Error('no bell');
    game.state.ball = { x: bell.x, y: bell.y - bell.r - 10, vx: 0, vy: 200 };
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(10);
    game.state.inPlay = 10;
    game.state.ball = { x: game.state.table.x + game.state.table.w / 2, y: game.state.table.y + game.state.table.h + 40, vx: 0, vy: 300 };
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
  });
});

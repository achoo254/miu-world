import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBreakout, landingX } from './logic';

describeMinigame('breakout');

describe('breakout rules', () => {
  const setup = () => createBreakout({ arena: { width: 863, height: 600 }, goal: 40, duration: 90, params: { speed: 1 }, rng: createRng(3) });

  it('keeps the ball on the paddle until a touch launches it', () => {
    const game = setup();
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.onPaddle).toBe(true);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 400, y: 500 } });
    expect(game.state.onPaddle).toBe(false);
    expect(game.state.ball.vy).toBeLessThan(0);
  });

  it('breaks a brick it touches, and loses a heart when the ball falls past the paddle', () => {
    const game = setup();
    const brick = game.state.bricks[0];
    if (!brick) throw new Error('no bricks');
    game.state.onPaddle = false;
    Object.assign(game.state.ball, { x: brick.x + brick.w / 2, y: brick.y + brick.h + 20, vx: 0, vy: -400 });
    for (let i = 0; i < 10; i += 1) game.step(1 / 60, NO_INPUT);
    expect(brick.alive).toBe(false);
    expect(game.score).toBeGreaterThanOrEqual(1);
    Object.assign(game.state.ball, { x: 30, y: 560, vx: 0, vy: 400 });
    game.state.paddleX = 700;
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
  });

  it('predicts where the ball comes down, bouncing off the walls', () => {
    const game = setup();
    Object.assign(game.state.ball, { x: 800, y: 300, vx: 300, vy: 300 });
    const x = landingX(game.state, 863) ?? 0;
    expect(x).toBeGreaterThan(14);
    expect(x).toBeLessThan(849);
  });
});

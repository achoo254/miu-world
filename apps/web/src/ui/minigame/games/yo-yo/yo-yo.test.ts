import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createYoyo } from './logic';

describeMinigame('yo-yo');

describe('yo-yo rules', () => {
  const setup = () => createYoyo({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: { speed: 1 }, rng: createRng(2) });
  const swipeDown: GameInput = { ...NO_INPUT, swipes: [{ direction: 'down', from: { x: 400, y: 200 }, dx: 0, dy: 150, speed: 1200 }] };
  const tap: GameInput = { ...NO_INPUT, taps: [{ x: 400, y: 300 }] };

  it('scores a trick for a tap just as the yo-yo sleeps at the bottom', () => {
    const game = setup();
    game.step(1 / 60, swipeDown);
    while (game.state.phase === 'down') game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('sleep');
    game.step(1 / 60, tap);
    expect(game.score).toBe(2);
    expect(game.state.phase).toBe('up');
  });

  it('goes slack for a tap while the yo-yo is still high, and after waiting too long', () => {
    const game = setup();
    game.step(1 / 60, swipeDown);
    game.step(1 / 60, tap);
    expect(game.state.phase).toBe('slack');
    while (game.state.phase !== 'hand') game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, swipeDown);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('slack');
    expect(game.score).toBe(0);
  });
});

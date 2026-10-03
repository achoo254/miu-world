import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPopLock, DOTS_PER_LOCK } from './logic';

describeMinigame('pop-lock');

describe('pop lock rules', () => {
  const setup = () => createPopLock({ arena: { width: 863, height: 600 }, goal: 4, duration: 60, params: { speed: 1 }, rng: createRng(5) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 500 }] };

  it('pops a dot on the needle, turns the needle back, and opens the lock after six', () => {
    const game = setup();
    for (let i = 0; i < DOTS_PER_LOCK; i += 1) {
      const dir = game.state.dir;
      game.state.dot = game.state.needle + dir * 0.05;
      game.step(1 / 60, tap);
      if (i < DOTS_PER_LOCK - 1) expect(game.state.dir).toBe(-dir);
    }
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('open');
  });

  it('starts the lock over after a tap off the dot or a dot swept past', () => {
    const game = setup();
    game.state.dot = game.state.needle + 0.05;
    game.step(1 / 60, tap);
    expect(game.state.dotsLeft).toBe(DOTS_PER_LOCK - 1);
    game.state.dot = game.state.needle + game.state.dir * 2;
    game.step(1 / 60, tap);
    expect(game.state.phase).toBe('fail');
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.dotsLeft).toBe(DOTS_PER_LOCK);
    game.state.dot = game.state.needle - game.state.dir * 0.5;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('fail');
    expect(game.score).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSinkFloat, FALL_SECONDS } from './logic';

// Always guessing "float" gets about half: not enough to win.
describeMinigame('sink-float', { loser: ({ arena }) => ({ swipe: { from: { x: arena.width / 2, y: arena.height / 2 }, dx: 0, dy: -120 } }) });

describe('sink or float rules', () => {
  const setup = () => createSinkFloat({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: { gap: 2.5 }, rng: createRng(8) });

  it('brings as many floating things as sinking ones', () => {
    const game = setup();
    const floats = game.state.things.filter((t) => t.floats).length;
    expect(Math.abs(floats * 2 - game.state.things.length)).toBeLessThanOrEqual(1);
  });

  it('scores a right guess once the thing lands, and nothing for a wrong one', () => {
    const game = setup();
    const [first, second] = game.state.things;
    if (!first || !second) throw new Error('no things');
    const swipeFor = (floats: boolean) => ({ ...NO_INPUT, swipes: [{ direction: floats ? ('up' as const) : ('down' as const), from: { x: 400, y: 300 }, dx: 0, dy: floats ? -100 : 100, speed: 800 }] });
    while (game.state.time < first.dropAt - 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, swipeFor(first.floats));
    while (game.state.time < first.dropAt + FALL_SECONDS + 0.05) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    game.step(1 / 60, swipeFor(!second.floats));
    while (game.state.time < second.dropAt + FALL_SECONDS + 0.05) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(second.right).toBe(false);
  });
});

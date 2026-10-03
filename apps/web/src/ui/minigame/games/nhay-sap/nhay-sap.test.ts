import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createNhaySap, gapAt } from './logic';

describeMinigame('nhay-sap', {
  // Hopping on every decision, whatever the poles do, must not win.
  loser: (context) => ({ tap: { x: context.arena.width / 2, y: context.arena.height / 2 } }),
});

describe('nhảy sạp rules', () => {
  const setup = () => createNhaySap({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: {}, rng: createRng(1) });
  const runTo = (game: ReturnType<typeof setup>, beat: number) => {
    while (game.state.beat < beat) game.step(1 / 60, NO_INPUT);
  };
  const hop = (game: ReturnType<typeof setup>) => game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 0, y: 0 }] });

  it('opens the poles on beats three and four only', () => {
    expect(gapAt(0.5)).toBeLessThan(0.3);
    expect(gapAt(1.5)).toBeLessThan(0.3);
    expect(gapAt(3)).toBe(1);
  });

  it('scores in on beat three and out on beat four, but not out too early', () => {
    const game = setup();
    runTo(game, 2.2);
    hop(game);
    expect(game.score).toBe(0);
    runTo(game, 3.4);
    hop(game);
    expect(game.score).toBe(2);
    runTo(game, 6.2);
    hop(game);
    runTo(game, 6.6);
    hop(game);
    expect(game.score).toBe(2);
  });

  it('trips a hop in on a clack, and a dancer left inside when the poles close', () => {
    const game = setup();
    runTo(game, 0.3);
    hop(game);
    expect(game.state.stumble).toBeGreaterThan(0);
    expect(game.score).toBe(0);
    runTo(game, 6.2);
    hop(game);
    runTo(game, 8.3);
    expect(game.state.inside).toBe(false);
    expect(game.state.streak).toBe(0);
    expect(game.score).toBe(0);
  });
});

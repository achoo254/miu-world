import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTennisRally, toScreen } from './logic';

describeMinigame('tennis-rally');

describe('table tennis rules', () => {
  const setup = (seed = 2) => createTennisRally({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: { speed: 1 }, rng: createRng(seed) });
  const untilNear = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 300 && !(game.state.phase === 'play' && game.state.ball.toward === 'child' && game.state.ball.d < 0.03); i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('hits a ball inside the ring back toward the side tapped', () => {
    const game = setup();
    untilNear(game);
    game.step(1 / 60, { ...NO_INPUT, taps: [toScreen(game.state, 0, -0.8)] });
    expect(game.state.ball.toward).toBe('khi');
    expect(game.state.ball.toL).toBeCloseTo(-0.8);
    expect(game.state.swingHit).toBe(true);
  });

  it('wins few points hitting every ball straight back at Khỉ', () => {
    for (const seed of [1, 2, 3]) {
      const game = setup(seed);
      for (let i = 0; i < 3600; i += 1) {
        const b = game.state.ball;
        const tap = game.state.phase === 'play' && b.toward === 'child' && b.d < 0.06 && b.d > -0.1 ? [toScreen(game.state, 0, game.state.khiL)] : [];
        game.step(1 / 60, { ...NO_INPUT, taps: tap });
      }
      expect(game.score).toBeLessThan(5);
    }
  });
});

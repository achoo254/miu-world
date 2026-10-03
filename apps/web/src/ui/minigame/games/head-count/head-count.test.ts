import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHeadCount } from './logic';

describeMinigame('head-count');

describe('head count rules', () => {
  const setup = (seed = 1) => createHeadCount({ arena: { width: 863, height: 600 }, goal: 6, duration: 100, params: {}, rng: createRng(seed) });
  const untilAsk = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 1200 && game.state.phase !== 'ask'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('never lets more friends out than went in', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const game = setup(seed);
      let inside = 0;
      for (const v of game.state.visits) {
        inside += v.dir === 'in' ? 1 : -1;
        expect(inside).toBeGreaterThanOrEqual(0);
      }
      expect(game.state.answer).toBe(inside);
    }
  });

  it('scores the right count and replays the round after a wrong one', () => {
    const game = setup();
    untilAsk(game);
    const right = game.state.choices.find((c) => c.value === game.state.answer);
    if (right) game.step(1 / 60, { ...NO_INPUT, taps: [right] });
    expect(game.score).toBe(1);
    untilAsk(game);
    const wrong = game.state.choices.find((c) => c.value !== game.state.answer);
    if (wrong) game.step(1 / 60, { ...NO_INPUT, taps: [wrong] });
    expect(game.state.phase).toBe('replay');
    expect(game.score).toBe(1);
  });
});

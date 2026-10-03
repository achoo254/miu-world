import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createChickenFeed, FULL } from './logic';

describeMinigame('chicken-feed');

describe('chicken feed rules', () => {
  const setup = (seed = 1) => createChickenFeed({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: {}, rng: createRng(seed) });

  it('fills a chick fed where the hens are far away, then it naps and a new one hatches', () => {
    const game = setup();
    const s = game.state;
    const [henA, henB, chick] = s.birds;
    if (!henA || !henB || !chick) throw new Error('no birds');
    henA.x = s.yard.x + s.yard.w - 40;
    henB.x = s.yard.x + s.yard.w - 40;
    chick.x = s.yard.x + 120;
    chick.y = s.yard.y + s.yard.h - 60;
    for (let n = 0; n < 3 && chick.fullAgo < 0; n += 1) {
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: chick.x, y: chick.y }] });
      for (let i = 0; i < 45; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(chick.ate).toBeGreaterThanOrEqual(FULL);
    expect(game.score).toBe(1);
    for (let i = 0; i < 160; i += 1) game.step(1 / 60, NO_INPUT);
    expect(chick.fullAgo).toBe(-1);
    expect(chick.ate).toBe(0);
  });

  it('is lost by tossing every handful in the middle of the yard', () => {
    for (const seed of [1, 2, 3]) {
      const game = setup(seed);
      const middle = { x: game.state.yard.x + game.state.yard.w / 2, y: game.state.yard.y + game.state.yard.h / 2 };
      for (let i = 0; i < 3600; i += 1) game.step(1 / 60, { ...NO_INPUT, taps: i % 48 === 0 ? [middle] : [] });
      expect(game.score).toBeLessThan(15);
    }
  });
});

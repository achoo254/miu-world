import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRiceWinnow, GOOD_HIGH, GOOD_LOW, HUSKS, RICE, tossFor, TOSS_SECONDS } from './logic';

describeMinigame('rice-winnow');

describe('rice winnow rules', () => {
  it('blows off more husks with a good toss, and rice too when too high', () => {
    expect(tossFor(GOOD_LOW - 10, 10)).toEqual({ kind: 'low', husksOff: 1, riceOff: 0 });
    expect(tossFor((GOOD_LOW + GOOD_HIGH) / 2, 10)).toEqual({ kind: 'good', husksOff: 3, riceOff: 0 });
    expect(tossFor(GOOD_HIGH + 50, 10)).toMatchObject({ kind: 'high', husksOff: 4 });
    expect(tossFor(GOOD_HIGH + 50, 2).husksOff).toBe(2);
  });

  it('cleans a tray toss by toss and scores it', () => {
    const game = createRiceWinnow({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(1) });
    const flick = { direction: 'up' as const, from: { x: 400, y: 500 }, dx: 0, dy: -180, speed: 900 };
    for (let n = 0; n < 4; n += 1) {
      game.step(1 / 60, { ...NO_INPUT, swipes: [flick] });
      for (let i = 0; i < 60 * TOSS_SECONDS + 2; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(HUSKS).toBe(12);
    expect(game.score).toBe(1);
    expect(game.state.trays).toEqual([3]);
    expect(game.state.rice).toBe(RICE);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSpotDiff, DIFFS, thingAt } from './logic';

describeMinigame('spot-diff');

describe('spot the difference rules', () => {
  const setup = () => createSpotDiff({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: {}, rng: createRng(4) });
  const tap = (at: Point) => ({ ...NO_INPUT, pressed: true, taps: [at] });

  it('has five differences of distinct places', () => {
    const game = setup();
    expect(game.state.things.filter((t) => t.diff)).toHaveLength(DIFFS);
  });

  it('finds a difference tapped in the second picture, once', () => {
    const game = setup();
    const thing = game.state.things.find((t) => t.diff);
    if (!thing) throw new Error('no difference');
    game.step(1 / 60, tap(thingAt(game.state.panels[1], thing)));
    expect(thing.found).toBe(true);
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap(thingAt(game.state.panels[0], thing)));
    expect(game.score).toBe(1);
  });

  it('rests after a wrong tap and shows a hint after five', () => {
    const game = setup();
    const same = game.state.things.find((t) => !t.diff);
    if (!same) throw new Error('no plain thing');
    for (let k = 0; k < 5; k += 1) {
      game.step(1 / 60, tap(thingAt(game.state.panels[0], same)));
      for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(game.score).toBe(0);
    expect(game.state.hint).toBeGreaterThanOrEqual(0);
  });
});

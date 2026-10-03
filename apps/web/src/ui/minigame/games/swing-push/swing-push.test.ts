import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSwingPush, fromBackPeak } from './logic';

describeMinigame('swing-push');

describe('swing push rules', () => {
  const setup = () => createSwingPush({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(4) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 400 }] };

  it('swings higher for a tap at the back high point, once a swing', () => {
    const game = setup();
    while (fromBackPeak(game.state.phase) > 0.05) game.step(1 / 60, NO_INPUT);
    const before = game.state.amplitude;
    game.step(1 / 60, tap);
    expect(game.state.amplitude).toBeGreaterThan(before + 0.1);
    const pushed = game.state.amplitude;
    game.step(1 / 60, tap);
    expect(game.state.amplitude).toBeLessThan(pushed);
  });

  it('loses height for a tap at the bottom of the swing', () => {
    const game = setup();
    game.step(1 / 60, NO_INPUT);
    const before = game.state.amplitude;
    game.step(1 / 60, tap);
    expect(game.state.amplitude).toBeLessThan(before);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBalanceScale, pans, subsetFor } from './logic';

describeMinigame('balance-scale');

describe('balance scale rules', () => {
  const setup = (seed = 1) => createBalanceScale({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: {}, rng: createRng(seed) });

  it('always deals a load some fruits on the shelf add up to', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const game = setup(seed);
      expect(subsetFor(game.state.fruits.map((f) => f.weight), game.state.load)).not.toBeNull();
    }
  });

  it('scores once the right pan weighs the same as the load for a moment', () => {
    const game = setup();
    const want = subsetFor(game.state.fruits.map((f) => f.weight), game.state.load) ?? [];
    for (const i of want) {
      const f = game.state.fruits[i];
      if (f) game.step(1 / 60, { ...NO_INPUT, taps: [f.home] });
    }
    expect(game.score).toBe(0);
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('a fruit dragged onto the pan stays there; the beam tilts toward the heavier side', () => {
    const game = setup(2);
    const f = game.state.fruits[0];
    if (!f) throw new Error('no fruit');
    const { right } = pans(game.state);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: f.home });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: right.x, y: right.y - 40 } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(f.onPan).toBe(true);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    if (f.weight < game.state.load) expect(game.state.tilt).toBeLessThan(0);
  });
});

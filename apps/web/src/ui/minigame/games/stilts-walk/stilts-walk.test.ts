import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createStiltsWalk, STEP_METRES } from './logic';

/** Taps left and right in turn, never looking at the lean. */
let flip = 0;
describeMinigame('stilts-walk', {
  loser: (context) => {
    flip += 1;
    return { tap: { x: flip % 2 === 0 ? 100 : context.arena.width - 100, y: context.arena.height - 80 } };
  },
});

describe('stilts walk rules', () => {
  const setup = () => createStiltsWalk({ arena: { width: 863, height: 600 }, goal: 100, duration: 60, params: {}, rng: createRng(2) });

  it('steps forward on the leaning side and tips further on the other', () => {
    const game = setup();
    game.state.lean = 0.3;
    game.state.spin = 0;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 100, y: 500 }] });
    expect(game.state.metres).toBe(0);
    expect(game.state.lean).toBeGreaterThan(0.5);
    for (let i = 0; i < 25; i += 1) game.step(1 / 60, NO_INPUT);
    game.state.fallen = -1;
    game.state.lean = 0.3;
    game.state.spin = 0;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 800, y: 500 }] });
    expect(game.state.metres).toBe(STEP_METRES);
    expect(Math.abs(game.state.lean)).toBeLessThan(0.1);
  });

  it('falls when left alone', () => {
    const game = setup();
    for (let i = 0; i < 300; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.falls).toBeGreaterThan(0);
  });
});

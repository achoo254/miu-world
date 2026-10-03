import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSkateTricks, TRICK_SECONDS } from './logic';

describeMinigame('skate-tricks');

describe('skate tricks rules', () => {
  const setup = () => createSkateTricks({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: {}, rng: createRng(1) });
  const swipe = (direction: Swipe['direction']): Swipe => ({ direction, from: { x: 200, y: 300 }, dx: direction === 'left' ? -100 : 100, dy: direction === 'up' ? -100 : 0, speed: 900 });

  it('scores a trick finished in the air', () => {
    const game = setup();
    game.state.ramps = [];
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('up')] });
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('left')] });
    for (let i = 0; i < Math.ceil(TRICK_SECONDS * 60) + 1; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('tumbles when the board lands mid-trick', () => {
    const game = setup();
    game.state.ramps = [];
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('up')] });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('right')] });
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(0);
    expect(game.state.down).toBeGreaterThan(0);
  });
});

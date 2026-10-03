import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe, type SwipeDirection } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBanhChung, diagonal, FOLD_SWIPE, TRAY_ORDER } from './logic';

describeMinigame('banh-chung-wrap');

describe('banh chung rules', () => {
  const setup = () => createBanhChung({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(4) });
  const swipe = (direction: SwipeDirection, dx: number, dy: number): Swipe => ({ direction, from: { x: 431, y: 300 }, dx, dy, speed: 900 });

  it('only takes the ingredient the recipe asks for next', () => {
    const game = setup();
    const rice = game.state.tray[TRAY_ORDER.indexOf('rice')];
    const leaf = game.state.tray[TRAY_ORDER.indexOf('leaf')];
    if (!rice || !leaf) throw new Error('no tray');
    game.step(1 / 60, { ...NO_INPUT, taps: [rice] });
    expect(game.state.done).toBe(0);
    game.step(1 / 60, { ...NO_INPUT, taps: [leaf] });
    expect(game.state.done).toBe(1);
  });

  it('folds with a swipe the right way only, and ties with two crossing diagonals', () => {
    const game = setup();
    game.state.done = 7;
    const step = game.state.steps[7];
    if (step?.kind !== 'fold') throw new Error('expected a fold');
    const right = FOLD_SWIPE[step.flap];
    const wrongWay: SwipeDirection = right === 'up' ? 'down' : 'up';
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(wrongWay, 0, wrongWay === 'up' ? -100 : 100)] });
    expect(game.state.done).toBe(7);
    game.state.done = 11;
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('right', 100, 100)] });
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('right', 100, 100)] });
    expect(game.score).toBe(0);
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('left', -100, 100)] });
    expect(game.score).toBe(1);
  });

  it('tells a diagonal from a straight swipe', () => {
    expect(diagonal(100, 90)).toBe('down');
    expect(diagonal(-100, 80)).toBe('up');
    expect(diagonal(100, 10)).toBeNull();
  });
});

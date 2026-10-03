import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBasketball, FLIGHT, IDEAL } from './logic';

/** Always flicks straight up with the same strength: fine until the hoop starts to move. */
const straight = ({ arena }: { arena: { width: number; height: number } }) => ({ swipe: { from: { x: arena.width / 2, y: arena.height - 110 }, dx: 0, dy: -IDEAL } });

describeMinigame('basketball');
describeMinigame('basketball', { loser: straight });

describe('basketball rules', () => {
  const setup = () => createBasketball({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(1) });
  const flick = (dy: number, dx = 0): Swipe => ({ direction: 'up', from: { x: 431, y: 490 }, dx, dy, speed: 1500 });
  const land = (game: ReturnType<typeof setup>): void => {
    for (let i = 0; i < Math.ceil(FLIGHT * 60) + 2; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('scores a flick of the right length at the hoop, not a short or a long one', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, swipes: [flick(-IDEAL)] });
    land(game);
    expect(game.state.lastResult).toBe('in');
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, swipes: [flick(-IDEAL * 0.5)] });
    land(game);
    expect(game.state.lastResult).toBe('short');
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, swipes: [flick(-IDEAL * 1.6)] });
    land(game);
    expect(game.state.lastResult).toBe('long');
    expect(game.score).toBe(1);
  });

  it('throws on letting go after a slow drag', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 431, y: 490 } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 431, y: 490 - IDEAL } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.state.shot?.result).toBe('in');
  });
});

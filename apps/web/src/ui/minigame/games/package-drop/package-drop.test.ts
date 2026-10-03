import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPackageDrop, FALL_SECONDS, GIFTS, leadFor } from './logic';

describeMinigame('package-drop');

describe('package drop rules', () => {
  const setup = () => createPackageDrop({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: { speed: 1 }, rng: createRng(4) });
  const fall = (game: ReturnType<typeof setup>): void => {
    for (let i = 0; i < Math.ceil(FALL_SECONDS * 60) + 2; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('scores a gift dropped early enough to drift onto the target', () => {
    const game = setup();
    game.state.target = { kind: 'house', x: 600, vx: 0, gotAgo: 9, bornAgo: 9 };
    game.state.planeX = 600 - leadFor(game.state.planeSpeed * 0.85);
    game.step(1 / 60, { ...NO_INPUT, pressed: true });
    fall(game);
    expect(game.state.gift?.result).toBe('hit');
    expect(game.score).toBe(1);
  });

  it('splashes a gift dropped right over the target, and counts the gifts down', () => {
    const game = setup();
    game.state.target = { kind: 'house', x: 600, vx: 0, gotAgo: 9, bornAgo: 9 };
    game.state.planeX = 600;
    game.step(1 / 60, { ...NO_INPUT, pressed: true });
    expect(game.state.giftsLeft).toBe(GIFTS - 1);
    // A second tap while a gift is falling drops nothing.
    game.step(1 / 60, { ...NO_INPUT, pressed: true });
    expect(game.state.giftsLeft).toBe(GIFTS - 1);
    fall(game);
    expect(game.state.gift?.result).toBe('splash');
    expect(game.score).toBe(0);
  });

  it('ends when every gift has fallen', () => {
    const game = setup();
    game.state.giftsLeft = 0;
    expect(game.done).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBottleFlip, idealSwipe } from './logic';

/** Always the same middling swipe, whatever the target. */
describeMinigame('bottle-flip', { loser: (context) => ({ swipe: { from: { x: 150, y: context.arena.height - 150 }, dx: 0, dy: -150 } }) });

describe('bottle flip rules', () => {
  const setup = () => createBottleFlip({ arena: { width: 863, height: 600 }, goal: 8, duration: 75, params: {}, rng: createRng(5) });
  const throwIt = (game: ReturnType<typeof setup>, length: number) => {
    const swipe: Swipe = { direction: 'up', from: { x: 200, y: 450 }, dx: 0, dy: -length, speed: 1500 };
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe] });
    for (let i = 0; i < 200 && game.state.phase === 'fly'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('stands after the right swipe and says which way a bad one was off', () => {
    const good = setup();
    throwIt(good, idealSwipe(good.state));
    expect(good.state.result).toBe('stand');
    expect(good.score).toBe(1);
    const strong = setup();
    throwIt(strong, idealSwipe(strong.state) * 1.35);
    expect(strong.state.result).toBe('long');
    const weak = setup();
    throwIt(weak, idealSwipe(weak.state) * 0.7);
    expect(weak.state.result).toBe('short');
  });
});

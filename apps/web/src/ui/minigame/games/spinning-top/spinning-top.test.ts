import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSpinningTop } from './logic';

/** Throws well, then taps the top all the time. */
const basher = ({ arena, time }: BotContext): BotMove =>
  time % 1 < 0.2 ? { swipe: { from: { x: arena.width / 2, y: arena.height - 70 }, dx: 0, dy: -((arena.height - 70 - (110 + (arena.height - 110) * 0.4)) / 1.6) } } : { tap: { x: arena.width / 2, y: 300 } };

describeMinigame('spinning-top');
describeMinigame('spinning-top', { loser: basher });

describe('spinning top rules', () => {
  const setup = () => createSpinningTop({ arena: { width: 863, height: 600 }, goal: 40, duration: 60, params: {}, rng: createRng(1) });
  const land = (game: ReturnType<typeof setup>) => {
    const { hand, ring } = game.state;
    game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction: 'up', from: hand, dx: (ring.x - hand.x) / 1.6, dy: (ring.y - hand.y) / 1.6, speed: 800 }] });
    while (game.state.phase === 'flying') game.step(1 / 60, NO_INPUT);
  };

  it('spins in the ring, and a whip while it wobbles keeps it going', () => {
    const game = setup();
    land(game);
    expect(game.state.phase).toBe('spinning');
    while (game.state.spin > 30) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.top] });
    expect(game.state.spin).toBe(100);
    expect(game.lives).toBe(3);
  });

  it('knocks over a top whipped while it still spins hard', () => {
    const game = setup();
    land(game);
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.top] });
    expect(game.state.phase).toBe('fallen');
    expect(game.lives).toBe(2);
  });
});

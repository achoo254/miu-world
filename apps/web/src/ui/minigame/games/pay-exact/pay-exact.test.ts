import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPayExact, fewestNotes, paid } from './logic';

/** Taps notes at random, as fast as they go. */
const spender = ({ arena, time }: BotContext): BotMove => {
  const i = Math.floor(Math.abs(Math.sin(time * 12.9898) * 43758.5453)) % 4;
  return { tap: { x: (arena.width / 4) * (i + 0.5), y: arena.height - 70 } };
};

describeMinigame('pay-exact');
describeMinigame('pay-exact', { loser: spender });

describe('pay exact rules', () => {
  const setup = () => createPayExact({ arena: { width: 863, height: 600 }, goal: 10, duration: 90, params: {}, rng: createRng(4) });
  const wait = (game: ReturnType<typeof setup>, s: number) => {
    for (let i = 0; i < s * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };
  const tapValue = (game: ReturnType<typeof setup>, v: number) => {
    const b = game.state.buttons.find((x) => x.value === v);
    if (!b) throw new Error('no note');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: b.x, y: b.y }] });
    wait(game, 0.35);
  };

  it('hands over the fewest notes', () => {
    expect(fewestNotes(8)).toEqual([5, 2, 1]);
    expect(fewestNotes(20)).toEqual([10, 10]);
    expect(fewestNotes(14)).toEqual([10, 2, 2]);
  });

  it('buys at the exact price and hands the whole tray back when it is too much', () => {
    const game = setup();
    game.state.price = 7;
    tapValue(game, 5);
    tapValue(game, 5);
    expect(game.state.phase).toBe('over');
    wait(game, 3);
    expect(paid(game.state)).toBe(0);
    expect(game.score).toBe(0);
    tapValue(game, 5);
    tapValue(game, 2);
    expect(game.score).toBe(1);
  });
});

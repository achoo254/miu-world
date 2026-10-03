import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCookieCutter } from './logic';

/** Presses anywhere on the dough without looking at the cookies already cut. */
const careless = ({ arena, time }: BotContext): BotMove => {
  const h = (k: number) => Math.abs(Math.sin(time * 12.9898 + k * 78.233) * 43758.5453) % 1;
  return { tap: { x: 60 + h(1) * (arena.width - 120), y: 160 + h(2) * (arena.height - 300) } };
};

describeMinigame('cookie-cutter');
describeMinigame('cookie-cutter', { loser: careless });

describe('cookie cutter rules', () => {
  const setup = () => createCookieCutter({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: {}, rng: createRng(1) });
  const press = (game: ReturnType<typeof setup>, x: number, y: number) => {
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y }] });
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('counts a cookie with room around it and squashes one that overlaps', () => {
    const game = setup();
    const { x, y } = game.state.dough;
    press(game, x + 200, y + 150);
    press(game, x + 220, y + 160);
    expect(game.score).toBe(1);
    expect(game.state.cookies.map((c) => c.good)).toEqual([true, false]);
  });
});

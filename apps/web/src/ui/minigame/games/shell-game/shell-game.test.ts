import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createShellGame, roundPace } from './logic';

describeMinigame('shell-game');

describe('shell game rules', () => {
  const setup = () => createShellGame({ arena: { width: 863, height: 600 }, goal: 5, duration: 70, params: { speed: 1 }, rng: createRng(9) });
  const toChoice = (game: ReturnType<typeof setup>): void => {
    while (game.state.phase !== 'choose') game.step(1 / 60, NO_INPUT);
  };

  it('keeps the gem under the same cup through every swap, and scores the right pick', () => {
    const game = setup();
    const gem = game.state.gem;
    toChoice(game);
    expect(game.state.gem).toBe(gem);
    const cup = game.state.cups[gem];
    if (!cup) throw new Error('no cup');
    expect(cup.x).toBe(game.state.slotX[cup.slot]);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: cup.x, y: game.state.tableY - 60 }] });
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('reveal');
  });

  it('gives nothing for a wrong cup', () => {
    const game = setup();
    toChoice(game);
    const wrong = game.state.cups.find((_, i) => i !== game.state.gem);
    if (!wrong) throw new Error('no cup');
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: wrong.x, y: game.state.tableY - 60 }] });
    expect(game.score).toBe(0);
    expect(game.state.phase).toBe('reveal');
  });

  it('swaps more and faster as the rounds go on', () => {
    expect(roundPace(0, 1).swaps).toBeLessThan(roundPace(8, 1).swaps);
    expect(roundPace(0, 1).seconds).toBeGreaterThan(roundPace(8, 1).seconds);
  });
});

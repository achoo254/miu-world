import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLightsOut, deal, HINT_AFTER, press } from './logic';

describeMinigame('lights-out');

describe('lights out rules', () => {
  it('switches a window and its four neighbours', () => {
    const lit = Array.from({ length: 9 }, () => false);
    press(lit, 3, 4);
    expect(lit).toEqual([false, true, false, true, true, true, false, true, false]);
    press(lit, 3, 0);
    expect(lit).toEqual([true, false, false, false, true, true, false, true, false]);
  });

  it('deals boards that the dealt taps solve', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const board = deal(createRng(seed), 4, 4);
      expect(board.lit.every(Boolean)).toBe(false);
      const lit = [...board.lit];
      board.need.forEach((n, i) => n && press(lit, 4, i));
      expect(lit.every(Boolean)).toBe(true);
    }
  });

  it('shows a hint after a while, and "Làm lại" restores the dealt board', () => {
    const game = createLightsOut({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(2) });
    const s = game.state;
    const start = [...s.lit];
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.left + s.cell / 2, y: s.top + s.cell / 2 }] });
    expect(s.lit).not.toEqual(start);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.redo.x, y: s.redo.y }] });
    expect(s.lit).toEqual(start);
    for (let i = 0; i < 60 * (HINT_AFTER + 0.5); i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.hint).toBeGreaterThanOrEqual(0);
    expect(s.need[s.hint]).toBe(true);
  });
});

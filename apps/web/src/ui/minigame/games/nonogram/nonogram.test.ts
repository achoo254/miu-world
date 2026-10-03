import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { clues, createNonogram, PICTURES, SIZE } from './logic';

describeMinigame('nonogram');

describe('nonogram rules', () => {
  it('reads runs of filled squares as clues', () => {
    expect(clues([true, true, false, true, false])).toEqual([2, 1]);
    expect(clues([false, false, false, false, false])).toEqual([0]);
    for (const p of PICTURES) expect(p.rows.every((r) => r.length === SIZE) && p.rows.length === SIZE).toBe(true);
  });

  it('crosses out a wrong square and rests, and finishes the picture when every square is filled', () => {
    const game = createNonogram({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: {}, rng: createRng(1) });
    const { left, top, cell } = game.state;
    const at = (i: number) => ({ x: left + ((i % SIZE) + 0.5) * cell, y: top + (Math.floor(i / SIZE) + 0.5) * cell });
    const wrong = game.state.solution.findIndex((s) => !s);
    game.step(1 / 60, { ...NO_INPUT, taps: [at(wrong)] });
    expect(game.state.crossed[wrong]).toBe(true);
    expect(game.state.rest).toBeGreaterThan(0);
    for (let i = 0; i < 80; i += 1) game.step(1 / 60, NO_INPUT);
    game.state.solution.forEach((s, i) => {
      if (s) game.step(1 / 60, { ...NO_INPUT, taps: [at(i)] });
    });
    expect(game.score).toBe(1);
  });
});

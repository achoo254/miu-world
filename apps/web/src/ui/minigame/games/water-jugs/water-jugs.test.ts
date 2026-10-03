import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWaterJugs, pour, puzzles, solve } from './logic';

describeMinigame('water-jugs');

describe('water jugs rules', () => {
  it('pours until the other can is full or this one is empty', () => {
    expect(pour([0, 0, 8], [3, 5, 8], 2, 1)).toEqual([0, 5, 3]);
    expect(pour([0, 5, 3], [3, 5, 8], 1, 0)).toEqual([3, 2, 3]);
    expect(pour([3, 2, 3], [3, 5, 8], 0, 1)).toEqual([0, 5, 3]);
  });

  it('solves the classic 8-5-3 for 4 litres in six pours, and every puzzle it offers', () => {
    expect(solve([0, 0, 8], [3, 5, 8], 4)?.length).toBe(6);
    const all = puzzles(2, 7);
    expect(all.length).toBeGreaterThan(10);
    for (const p of all) {
      let levels = [...p.start];
      for (const [from, to] of solve(p.start, p.caps, p.target) ?? []) levels = pour(levels, p.caps, from, to);
      expect(levels).toContain(p.target);
    }
  });

  it('scores once a can holds the asked amount; the reset button puts the cans back', () => {
    const game = createWaterJugs({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: { hard: false }, rng: createRng(3) });
    const tapJug = (i: number) => {
      const j = game.state.jugs[i];
      if (j) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: j.x, y: j.bottom - j.height / 2 }] });
      for (let s = 0; s < 40; s += 1) game.step(1 / 60, NO_INPUT);
    };
    const start = game.state.jugs.map((j) => j.level);
    const plan = solve(start, game.state.puzzle.caps, game.state.puzzle.target) ?? [];
    const [first] = plan;
    if (!first) throw new Error('no plan');
    tapJug(first[0]);
    tapJug(first[1]);
    expect(game.state.jugs.map((j) => j.level)).not.toEqual(start);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.reset] });
    expect(game.state.jugs.map((j) => j.level)).toEqual(start);
    for (const [from, to] of plan) {
      tapJug(from);
      tapJug(to);
    }
    expect(game.score).toBe(1);
  });
});

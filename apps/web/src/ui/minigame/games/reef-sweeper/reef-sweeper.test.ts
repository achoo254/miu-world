import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createReefSweeper, FLAG_HOLD, layRocks, leftAfterFirst, neighbours, SIDE, solvable } from './logic';

describeMinigame('reef-sweeper');

describe('reef sweeper rules', () => {
  it('never lays a rock on or around the first dig, and every patch is clearable by reasoning', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const start = seed % (SIDE * SIDE);
      const rocks = layRocks(createRng(seed), start, 4);
      expect(rocks.size).toBe(4);
      expect(rocks.has(start)).toBe(false);
      for (const n of neighbours(start)) expect(rocks.has(n)).toBe(false);
      expect(solvable(rocks, start)).toBe(true);
      expect(leftAfterFirst(rocks, start)).toBeGreaterThanOrEqual(4);
    }
  });

  it('takes a heart for a dug rock, and a hold plants a flag', () => {
    const game = createReefSweeper({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(2) });
    const s = game.state;
    const at = (i: number) => ({ x: s.left + ((i % SIDE) + 0.5) * s.size, y: s.top + (Math.floor(i / SIDE) + 0.5) * s.size });
    game.step(1 / 60, { ...NO_INPUT, taps: [at(12)] });
    const rock = s.cells.findIndex((c) => c.rock && !c.open);
    const closedSafe = s.cells.findIndex((c, i) => !c.rock && !c.open && i !== rock);
    if (rock < 0) throw new Error('no rock');
    // Hold on a square: a flag.
    if (closedSafe >= 0) {
      game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: at(closedSafe), holdTime: 0 });
      for (let k = 1; k * (1 / 60) <= FLAG_HOLD + 0.05; k += 1) game.step(1 / 60, { ...NO_INPUT, pointer: at(closedSafe), holdTime: k / 60 });
      expect(s.cells[closedSafe]?.flag).toBe(true);
      game.step(1 / 60, { ...NO_INPUT, released: true });
    }
    game.step(1 / 60, { ...NO_INPUT, taps: [at(rock)] });
    expect(game.lives).toBe(2);
    expect(s.cells[rock]?.hit).toBe(true);
  });
});

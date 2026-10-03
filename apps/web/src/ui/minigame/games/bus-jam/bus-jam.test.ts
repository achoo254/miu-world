import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentre, createBusJam, freeCells } from './logic';

describeMinigame('bus-jam');

describe('bus jam rules', () => {
  it('lets out the top row and animals next to a free way up', () => {
    // 3 × 3, all full but the middle top: the top row and the middle one can leave.
    const occupied = new Set([0, 2, 3, 4, 5, 6, 7, 8]);
    expect([...freeCells(3, 3, occupied)].sort()).toEqual([0, 2, 4]);
    occupied.delete(4);
    expect([...freeCells(3, 3, occupied)].sort()).toEqual([0, 2, 3, 5, 7]);
  });

  it('boards an animal for the waiting bus, benches another, and a full bus scores', () => {
    const game = createBusJam({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: { bench: 5 }, rng: createRng(2) });
    const tapCell = (cell: number) => game.step(1 / 60, { ...NO_INPUT, taps: [cellCentre(game.state, cell)] });
    const waiting = game.state.buses[0];
    const top = game.state.riders.filter((r) => r.cell >= 0 && r.cell < game.state.cols);
    const other = top.find((r) => r.group !== waiting);
    if (other) {
      tapCell(other.cell);
      expect(other.seat).toBeGreaterThanOrEqual(0);
    }
    for (let guard = 0; guard < 40 && game.score === 0; guard += 1) {
      const occupied = new Set(game.state.riders.filter((r) => r.cell >= 0).map((r) => r.cell));
      const free = freeCells(game.state.cols, game.state.rows, occupied);
      const mine = game.state.riders.find((r) => r.cell >= 0 && free.has(r.cell) && r.group === game.state.buses[0]);
      const any = game.state.riders.find((r) => r.cell >= 0 && free.has(r.cell));
      const pick = mine ?? any;
      if (!pick) break;
      tapCell(pick.cell);
      for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(game.score).toBeGreaterThanOrEqual(1);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTreasureMap, endOf, makeRoute, targetCell } from './logic';

describeMinigame('treasure-map-steps');

describe('treasure map rules', () => {
  const setup = () => createTreasureMap({ arena: { width: 600, height: 863 }, goal: 6, duration: 90, params: {}, rng: createRng(3) });

  it('makes routes that stay on the island and turn at every move', () => {
    const rng = createRng(11);
    for (let i = 0; i < 50; i += 1) {
      const { start, moves } = makeRoute(rng, 6, 5, 3);
      let at = start;
      moves.forEach((move, k) => {
        expect(move.count).toBeGreaterThanOrEqual(1);
        expect(move.count).toBeLessThanOrEqual(4);
        if (k > 0) expect(move.dir).not.toBe(moves[k - 1]?.dir);
        at = endOf(at, move);
        expect(at.cx).toBeGreaterThanOrEqual(0);
        expect(at.cx).toBeLessThan(6);
        expect(at.cy).toBeGreaterThanOrEqual(0);
        expect(at.cy).toBeLessThan(5);
      });
    }
  });

  it('walks to the right tile, stays put on a wrong one, and digs after the last move', () => {
    const game = setup();
    const { grid, cell } = game.state;
    const tapCell = (cx: number, cy: number) => game.step(1 / 60, { ...NO_INPUT, taps: [{ x: grid.x + (cx + 0.5) * cell, y: grid.y + (cy + 0.5) * cell }] });
    const start = { ...game.state.at };
    const target = targetCell(game.state);
    if (!target) throw new Error('no move');
    tapCell(target.cx === 0 ? 1 : 0, target.cy);
    if (target.cx !== 0 && target.cx !== 1) expect(game.state.at).toEqual(start);
    while (game.state.score === 0) {
      const t = targetCell(game.state);
      if (game.state.phase === 'play' && t) tapCell(t.cx, t.cy);
      else game.step(1 / 60, NO_INPUT);
    }
    expect(game.score).toBe(1);
  });
});

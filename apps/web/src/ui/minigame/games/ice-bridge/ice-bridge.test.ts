import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellAt, cellCentre, cheapestBridge, createIceBridge, iceWalk, makeLake, type Cell } from './logic';

describeMinigame('ice-bridge');

describe('ice bridge rules', () => {
  const setup = () => createIceBridge({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(4) });
  const tapCell = (game: ReturnType<typeof setup>, i: number) => game.step(1 / 60, { ...NO_INPUT, taps: [cellCentre(game.state, i)] });

  it('finds the cheapest bridge over floes', () => {
    const W: Cell = 'water';
    const F: Cell = 'floe';
    // 4 × 2: the top row needs two squares, the bottom one only one.
    const cells: Cell[] = [W, F, W, W, F, F, W, F];
    expect(cheapestBridge(cells, 4, 2).cost).toBe(1);
    expect(iceWalk(cells, 4, 2)).toBeNull();
    cells[6] = 'frozen';
    expect(iceWalk(cells, 4, 2)).toEqual([4, 5, 6, 7]);
  });

  it('deals lakes that need a few snowflakes', () => {
    const rng = createRng(2);
    for (let n = 0; n < 50; n += 1) {
      const { cells, cost } = makeLake(rng, 8, 5);
      expect(cost).toBeGreaterThanOrEqual(1);
      expect(cheapestBridge(cells, 8, 5).cost).toBe(cost);
    }
  });

  it('scores a bridge, and melts the lake when the snowflakes run out first', () => {
    const game = setup();
    const s = game.state;
    // Waste every snowflake on squares off the bridge.
    const bridge = new Set(cheapestBridge(s.cells, s.cols, s.rows).path);
    const waste = s.cells.map((c, i) => (c === 'water' && !bridge.has(i) ? i : -1)).filter((i) => i >= 0);
    for (const i of waste.slice(0, s.budget)) if (s.phase === 'build') tapCell(game, i);
    // Read through a function: the phase changes as the game steps.
    const phase = (): string => s.phase;
    if (phase() === 'build') throw new Error('not enough squares to waste');
    expect(phase() === 'melt' || phase() === 'cross').toBe(true);
    const melted = phase() === 'melt';
    for (let i = 0; i < 80; i += 1) game.step(1 / 60, NO_INPUT);
    if (melted) expect(s.snowflakes).toBe(s.budget);
    // Now build the cheapest bridge.
    while (phase() === 'build') {
      const next = cheapestBridge(s.cells, s.cols, s.rows).path.find((i) => s.cells[i] === 'water');
      if (next === undefined) break;
      tapCell(game, next);
    }
    expect(s.phase).toBe('cross');
    expect(game.score).toBeGreaterThanOrEqual(1);
  });
});

describe('ice bridge layout', () => {
  it('maps squares to the screen and back, crossing bottom to top on a tall screen', () => {
    for (const arena of [{ width: 863, height: 600 }, { width: 600, height: 863 }, { width: 600, height: 1298 }]) {
      const s = createIceBridge({ arena, goal: 4, duration: 90, params: {}, rng: createRng(1) }).state;
      expect(s.tall).toBe(arena.height > arena.width);
      for (let i = 0; i < s.cols * s.rows; i += 1) {
        const p = cellCentre(s, i);
        expect(cellAt(s, p)).toBe(i);
        expect(p.y - s.cell / 2).toBeGreaterThanOrEqual(110);
        expect(p.y + s.cell / 2).toBeLessThanOrEqual(arena.height);
      }
      expect(s.cell).toBeGreaterThanOrEqual(80);
    }
  });
});

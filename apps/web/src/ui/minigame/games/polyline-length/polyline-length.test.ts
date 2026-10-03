import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { allWays, createPolylineLength, makeBoard, pathLength } from './logic';

describeMinigame('polyline-length');

describe('polyline length rules', () => {
  it('makes maps with a way of the asked length and a way of another length', () => {
    for (let seed = 1; seed < 25; seed += 1) {
      const board = makeBoard(createRng(seed), 4, 3, { x: 80, y: 200, w: 700, h: 320 });
      expect(pathLength(board.edges, board.answer)).toBe(board.target);
      const sums = new Set(allWays(board.nodes.length, board.edges, board.start, board.end).map((w) => pathLength(board.edges, w)));
      expect(sums.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('scores a way of the asked length, and lets a wrong one fade', () => {
    const game = createPolylineLength({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(3) });
    const s = game.state;
    const trace = (way: number[]) => {
      way.forEach((n, i) => game.step(1 / 60, { ...NO_INPUT, pressed: i === 0, pointer: s.nodes[n] ?? null }));
      game.step(1 / 60, { ...NO_INPUT, released: true });
    };
    const other = allWays(s.nodes.length, s.edges, s.start, s.end).find((w) => pathLength(s.edges, w) !== s.target);
    if (!other) throw new Error('no other way');
    trace(other);
    expect(game.score).toBe(0);
    expect(s.result?.right).toBe(false);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    trace(s.answer);
    expect(game.score).toBe(1);
  });
});

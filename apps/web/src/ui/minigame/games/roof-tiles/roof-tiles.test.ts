import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { canLay, COLS, createRoofTiles } from './logic';

describeMinigame('roof-tiles');

describe('roof tiles rules', () => {
  it('lays a tile only on the eaves or on a tile below', () => {
    const tiles = Array.from({ length: 9 }, () => false);
    expect(canLay(tiles, 0, 2)).toBe(true);
    expect(canLay(tiles, 1, 2)).toBe(false);
    tiles[2] = true;
    expect(canLay(tiles, 1, 2)).toBe(true);
    expect(canLay(tiles, 0, 2)).toBe(false);
  });

  it('sends a tile back from a place it cannot sit', () => {
    const game = createRoofTiles({ arena: { width: 863, height: 600 }, goal: 27, duration: 90, params: {}, rng: createRng(1) });
    const { stack, left, bottom, cellW, cellH } = game.state;
    const carry = (r: number, c: number) => {
      game.step(1 / 60, { ...NO_INPUT, pointer: stack, pressed: true });
      game.step(1 / 60, { ...NO_INPUT, pointer: { x: left + (c + 0.5) * cellW, y: bottom - (r + 0.5) * cellH } });
      game.step(1 / 60, { ...NO_INPUT, released: true });
    };
    carry(1, 0);
    expect(game.score).toBe(0);
    expect(game.state.rejected).not.toBeNull();
    carry(0, 0);
    carry(1, 0);
    expect(game.score).toBe(2);
    expect(game.state.tiles[COLS]).toBe(true);
  });
});

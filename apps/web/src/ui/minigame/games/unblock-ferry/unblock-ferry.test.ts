import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createUnblockFerry, slideRange, solve, type Boat } from './logic';

describeMinigame('unblock-ferry');

describe('unblock ferry rules', () => {
  it('slides a boat only along its length, up to the next boat', () => {
    const boats: Boat[] = [
      { across: true, line: 2, pos: 0, length: 2 },
      { across: false, line: 3, pos: 1, length: 3 },
    ];
    expect(slideRange(boats, 0)).toEqual([0, 1]);
    expect(slideRange(boats, 1)).toEqual([0, 3]);
    expect(solve(boats)).toEqual([[1, 3], [0, 4]]);
  });

  it('gives solvable landings and takes back a slide with Lùi', () => {
    const game = createUnblockFerry({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(4) });
    expect(solve(game.state.boats)).not.toBeNull();
    const before = game.state.boats.map((b) => b.pos);
    const i = game.state.boats.findIndex((_, k) => {
      const [lo, hi] = slideRange(game.state.boats, k);
      return hi > lo;
    });
    const b = game.state.boats[i];
    if (!b) throw new Error('nothing moves');
    const [lo, hi] = slideRange(game.state.boats, i);
    const to = b.pos === hi ? lo : hi;
    const { left, top, cell } = game.state;
    const at = (pos: number) => (b.across ? { x: left + (pos + 0.5) * cell, y: top + (b.line + 0.5) * cell } : { x: left + (b.line + 0.5) * cell, y: top + (pos + 0.5) * cell });
    game.step(1 / 60, { ...NO_INPUT, pointer: at(b.pos), pressed: true });
    game.step(1 / 60, { ...NO_INPUT, pointer: at(to) });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.state.boats[i]?.pos).toBe(to);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.undo] });
    expect(game.state.boats.map((x) => x.pos)).toEqual(before);
  });
});

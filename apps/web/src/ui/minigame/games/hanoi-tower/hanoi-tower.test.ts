import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHanoiTower, nextMove } from './logic';

describeMinigame('hanoi-tower');

describe('hanoi tower rules', () => {
  const setup = () => createHanoiTower({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: { layers: 3 }, rng: createRng(4) });
  type Game = ReturnType<typeof setup>;
  const tapStand = (game: Game, stand: number) => game.step(1 / 60, { ...NO_INPUT, taps: [{ x: game.state.standX[stand] ?? 0, y: 400 }] });

  it('never puts a bigger layer on a smaller one', () => {
    const game = setup();
    const start = game.state.stands.findIndex((s) => s.length === 3);
    const a = (start + 1) % 3;
    const b = (start + 2) % 3;
    tapStand(game, start);
    tapStand(game, a); // smallest onto a
    tapStand(game, start);
    tapStand(game, a); // middle onto smallest: refused
    expect(game.state.stands[a]).toEqual([1]);
    expect(game.state.held).toBe(start);
    expect(game.drainEvents().some((e) => e.type === 'miss')).toBe(true);
    tapStand(game, b);
    expect(game.state.stands[b]).toEqual([2]);
    expect(game.state.moves).toBe(2);
  });

  it('scores a stack moved to the star in the fewest moves, then lays out the next', () => {
    const game = setup();
    for (let n = 0; n < 7; n += 1) {
      const move = nextMove(game.state.stands, game.state.target);
      if (!move) break;
      tapStand(game, move.from);
      tapStand(game, move.to);
    }
    expect(game.score).toBe(1);
    expect(game.state.moves).toBe(game.state.best);
    for (let i = 0; i < 100; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.moves).toBe(0);
    expect(game.state.stands.some((s) => s.length === 3)).toBe(true);
  });

  it('finds the shortest way from a mixed position', () => {
    expect(nextMove([[3], [2, 1], []], 2)).toEqual({ from: 0, to: 2 });
    expect(nextMove([[], [], [3, 2, 1]], 2)).toBeNull();
  });
});

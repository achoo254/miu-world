import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { canMove, createBallSort, dealBoard, isSolved, nextMove } from './logic';

describeMinigame('ball-sort-tubes');

describe('ball sort rules', () => {
  const setup = () => createBallSort({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: { colours: 3 }, rng: createRng(2) });

  it('drops only onto the same colour or into an empty tube', () => {
    const tubes = [[0, 1], [1], [0], []];
    expect(canMove(tubes, 0, 1)).toBe(true);
    expect(canMove(tubes, 0, 2)).toBe(false);
    expect(canMove(tubes, 0, 3)).toBe(true);
    expect(canMove([[0], [1, 1, 1, 1]], 0, 1)).toBe(false);
  });

  it('deals boards that the search can solve', () => {
    const rng = createRng(11);
    for (let n = 0; n < 5; n += 1) {
      let tubes = dealBoard(4, rng);
      expect(isSolved(tubes)).toBe(false);
      for (let k = 0; k < 100 && !isSolved(tubes); k += 1) {
        const move = nextMove(tubes);
        if (!move) throw new Error('stuck');
        tubes = tubes.map((t) => [...t]);
        const ball = tubes[move[0]]?.pop();
        if (ball !== undefined) tubes[move[1]]?.push(ball);
      }
      expect(isSolved(tubes)).toBe(true);
    }
  });

  it('moves a ball with two taps, takes it back with undo', () => {
    const game = setup();
    const move = nextMove(game.state.tubes);
    if (!move) throw new Error('no move');
    const before = JSON.stringify(game.state.tubes);
    const [a, b] = [game.state.slots[move[0]], game.state.slots[move[1]]];
    if (!a || !b) throw new Error('no slots');
    game.step(1 / 60, { ...NO_INPUT, taps: [a] });
    game.step(1 / 60, { ...NO_INPUT, taps: [b] });
    expect(JSON.stringify(game.state.tubes)).not.toBe(before);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.undo] });
    expect(JSON.stringify(game.state.tubes)).toBe(before);
  });
});

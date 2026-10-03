import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentre, createLawnMower, moves, stuck } from './logic';

describeMinigame('lawn-mower');

describe('lawn mower rules', () => {
  const setup = () => createLawnMower({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(4) });

  it('finishes a lawn by driving its path through every grass square', () => {
    const game = setup();
    for (const cell of game.state.solution.slice(1)) game.step(1 / 60, { ...NO_INPUT, pointer: cellCentre(game.state, cell) });
    expect(game.score).toBe(1);
  });

  it('never drives back over cut grass, and the redo button lays the lawn again', () => {
    const game = setup();
    const [start, second] = game.state.solution;
    if (start === undefined || second === undefined) throw new Error('no path');
    game.step(1 / 60, { ...NO_INPUT, pointer: cellCentre(game.state, second) });
    game.step(1 / 60, { ...NO_INPUT, pointer: cellCentre(game.state, start) });
    expect(game.state.cut).toEqual([start, second]);
    // Wander until stuck, then redo.
    for (let i = 0; i < 40 && !stuck(game.state) && game.state.doneAgo < 0; i += 1) {
      const next = moves(game.state).at(-1);
      if (next === undefined) break;
      game.step(1 / 60, { ...NO_INPUT, taps: [cellCentre(game.state, next)] });
    }
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.redo] });
    if (game.state.doneAgo < 0) expect(game.state.cut).toEqual([start]);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCubeHop, cubeCentre } from './logic';

describeMinigame('cube-hop');

describe('cube hop rules', () => {
  const setup = () => createCubeHop({ arena: { width: 863, height: 600 }, goal: 30, duration: 90, params: {}, rng: createRng(1) });

  it('colours a new cube for a point, and costs a heart for hopping off the edge', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, taps: [cubeCentre(game.state, { row: 1, col: 1 })] });
    expect(game.state.at).toEqual({ row: 1, col: 1 });
    expect(game.score).toBe(1);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [cubeCentre(game.state, { row: 0, col: 1 })] });
    expect(game.lives).toBe(2);
    expect(game.state.at).toEqual({ row: 0, col: 0 });
  });

  it('ignores taps far from the cubes next to her', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, taps: [cubeCentre(game.state, { row: 5, col: 2 })] });
    expect(game.state.at).toEqual({ row: 0, col: 0 });
  });
});

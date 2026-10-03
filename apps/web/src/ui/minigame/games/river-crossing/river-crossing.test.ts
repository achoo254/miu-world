import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { boatPoint, brokenRule, createRiverCrossing, slotPoint, solveCrossing } from './logic';

describeMinigame('river-crossing');

describe('river crossing rules', () => {
  const setup = () => createRiverCrossing({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: {}, rng: createRng(1) });
  const tap = (game: ReturnType<typeof setup>, p: Point) => game.step(1 / 60, { ...NO_INPUT, taps: [p] });
  const wait = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('solves the classic puzzle in seven trips, the eater going first', () => {
    const plan = solveCrossing(['near', 'near', 'near'], 'near');
    expect(plan).toHaveLength(7);
    expect(plan[0]).toBe(1);
    expect(brokenRule(['near', 'boat', 'near'], 'near')).toBeNull();
    expect(brokenRule(['boat', 'near', 'near'], 'near')).toEqual([1, 2]);
  });

  it('plays out a broken rule and starts the puzzle over', () => {
    const game = setup();
    const s = game.state;
    tap(game, slotPoint(s, 'near', 0));
    expect(s.spots[0]).toBe('boat');
    tap(game, s.oar);
    expect(s.phase).toBe('oops');
    wait(game, 2);
    expect(s.spots).toEqual(['near', 'near', 'near']);
    expect(game.score).toBe(0);
  });

  it('scores when everything is over on the far bank', () => {
    const game = setup();
    const s = game.state;
    for (const cargo of solveCrossing(s.spots, s.boat)) {
      const loaded = s.spots.indexOf('boat');
      if (loaded >= 0 && loaded !== cargo) tap(game, boatPoint(s));
      if (cargo >= 0 && s.spots[cargo] !== 'boat') tap(game, slotPoint(s, s.boat, cargo));
      tap(game, s.oar);
      wait(game, 1);
    }
    expect(game.score).toBe(1);
    expect(s.phase).toBe('solved');
  });
});

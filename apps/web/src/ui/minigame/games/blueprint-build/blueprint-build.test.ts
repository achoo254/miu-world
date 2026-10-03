import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBlueprintBuild, parsePlan } from './logic';

describeMinigame('blueprint-build');

describe('blueprint build rules', () => {
  const setup = () => createBlueprintBuild({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(1) });
  const tap = (at: Point) => ({ ...NO_INPUT, pressed: true, taps: [at] });

  it('reads plans with four colours and gaps', () => {
    expect(parsePlan(['r.', 'yg'])).toEqual([1, 0, 3, 4]);
  });

  it('lays a brick of the picked colour, takes it away on a second tap, and finishes on a match', () => {
    const game = setup();
    const { state } = game;
    const square = (i: number): Point => ({ x: state.left + ((i % state.size) + 0.5) * state.cell, y: state.top + (Math.floor(i / state.size) + 0.5) * state.cell });
    const first = state.plan.findIndex((v) => v > 0);
    const want = state.plan[first] ?? 1;
    const button = state.buttons[want - 1];
    if (!button) throw new Error('no button');
    game.step(1 / 60, tap(button));
    game.step(1 / 60, tap(square(first)));
    expect(state.built[first]).toBe(want);
    game.step(1 / 60, tap(square(first)));
    expect(state.built[first]).toBe(0);
    state.plan.forEach((v, i) => {
      if (i !== first) state.built[i] = v;
    });
    game.step(1 / 60, tap(square(first)));
    expect(game.score).toBe(1);
  });
});

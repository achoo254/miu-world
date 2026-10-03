import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCurrentDrift, flowAt, reaches } from './logic';

describeMinigame('current-drift');

describe('current drift rules', () => {
  const setup = () => createCurrentDrift({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(1) });

  it('never lays out a stream that needs no rocks, and water swirls away from a rock', () => {
    const game = setup();
    expect(reaches(game.state, [])).toBe(false);
    const rock = { x: 400, y: 300 };
    const v = flowAt(game.state, [rock], { x: 400, y: 260 });
    expect(v.y).toBeLessThan(flowAt(game.state, [], { x: 400, y: 260 }).y);
  });

  it('places a rock on a tap, lifts it on a second tap, and lets the bottle go on a tap on it', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 300 }] });
    expect(game.state.rocks).toHaveLength(1);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 402, y: 300 }] });
    expect(game.state.rocks).toHaveLength(0);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.bottle] });
    expect(game.state.phase).toBe('drift');
  });
});

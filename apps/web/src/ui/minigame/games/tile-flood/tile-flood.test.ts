import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { bestColour, createTileFlood, flood, greedySteps, patchOf } from './logic';

describeMinigame('tile-flood');

describe('tile flood rules', () => {
  const setup = () => createTileFlood({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(8) });

  it('floods the corner patch and swallows touching tiles of the new colour', () => {
    // 3×3: corner 0, right of it 1, below it 1.
    const cells = [0, 1, 2, 1, 2, 2, 3, 3, 3];
    const after = flood(cells, 3, 1);
    expect(after.slice(0, 2)).toEqual([1, 1]);
    expect([...patchOf(after, 3)].sort()).toEqual([0, 1, 3]);
  });

  it('always gives enough steps for the greedy player, who the bot follows', () => {
    const game = setup();
    expect(game.state.stepsGiven).toBe(greedySteps(game.state.cells, game.state.n) + 2);
    let steps = 0;
    while (game.state.phase === 'play') {
      const button = game.state.palette[bestColour(game.state.cells, game.state.n)];
      if (!button) throw new Error('no button');
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: button.x, y: button.y }] });
      steps += 1;
    }
    expect(game.state.phase).toBe('won');
    expect(steps).toBeLessThanOrEqual(game.state.stepsGiven);
    expect(game.score).toBe(1);
  });

  it('does not spend a step on the colour the patch already has', () => {
    const game = setup();
    const same = game.state.palette[game.state.cells[0] ?? 0];
    if (!same) throw new Error('no button');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: same.x, y: same.y }] });
    expect(game.state.stepsLeft).toBe(game.state.stepsGiven);
  });
});

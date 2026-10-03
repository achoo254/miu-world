import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTrainSwitch } from './logic';

describeMinigame('train-switch');

describe('train switch rules', () => {
  const setup = () => createTrainSwitch({ arena: { width: 863, height: 600 }, goal: 15, duration: 90, params: { speed: 1 }, rng: createRng(4) });
  /** Runs one star train (colour 2) to whichever station the forks send it; other trains are kept away. */
  const run = (game: ReturnType<typeof setup>) => {
    const train = { colour: 2, edge: 0, along: 0, arrived: -1, right: false };
    game.state.trains = [train];
    for (let i = 0; i < 600 && train.arrived < 0; i += 1) {
      game.step(1 / 60, NO_INPUT);
      game.state.trains = [train];
    }
    return train;
  };

  it('switches a fork with a tap and sends the train down the branch it is set to', () => {
    const game = setup();
    const s = game.state;
    game.step(1 / 60, NO_INPUT);
    const fork = s.nodes[1];
    if (!fork) throw new Error('no fork');
    const before = s.forks[1];
    game.step(1 / 60, { ...NO_INPUT, taps: [fork] });
    expect(s.forks[1]).toBe(1 - (before ?? 0));
    // A star train: fork 1 set to 1, then fork 3 set to 0, reaches the star station.
    s.forks[1] = 1;
    s.forks[3] = 0;
    expect(run(game).right).toBe(true);
    expect(game.score).toBe(1);
    s.forks[3] = 1;
    expect(run(game).right).toBe(false);
    expect(game.score).toBe(0);
  });
});

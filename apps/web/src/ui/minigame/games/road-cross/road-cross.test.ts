import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRoadCross } from './logic';

describeMinigame('road-cross');

describe('road cross rules', () => {
  const setup = () => createRoadCross({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: { speed: 1 }, rng: createRng(4) });
  const settle = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 12; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('sends the frog back to the pavement when a car hits it', () => {
    const game = setup();
    const lane = game.state.lanes[1];
    const car = lane?.things[0];
    if (!lane || !car) throw new Error('no car');
    lane.speed = 0;
    game.state.frogX = car.x;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 400 }] });
    settle(game);
    expect(game.state.frogRow).toBe(0);
    expect(game.state.bumpAgo).toBeLessThan(1);
  });

  it('carries the frog on a log, drops it back to the grass in the water, and scores the far bank', () => {
    const game = setup();
    const river = game.state.lanes[5];
    const log = river?.things[0];
    if (!river || !log) throw new Error('no log');
    game.state.frogRow = 4;
    game.state.frogX = log.x;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 400 }] });
    settle(game);
    expect(game.state.frogRow).toBe(5);
    const before = game.state.frogX;
    settle(game);
    expect(game.state.frogX).not.toBe(before);
    game.state.frogX = log.x + log.w;
    river.things = [];
    game.step(1 / 60, NO_INPUT);
    expect(game.state.frogRow).toBe(4);
    game.state.frogRow = 6;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 400 }] });
    settle(game);
    expect(game.score).toBe(1);
    expect(game.state.frogRow).toBe(0);
  });
});

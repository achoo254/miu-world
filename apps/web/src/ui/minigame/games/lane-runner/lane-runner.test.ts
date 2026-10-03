import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLaneRunner } from './logic';

describeMinigame('lane-runner');

describe('lane runner rules', () => {
  const setup = () => {
    const game = createLaneRunner({ arena: { width: 863, height: 600 }, goal: 25, duration: 60, params: { speed: 1 }, rng: createRng(3) });
    game.state.items = [];
    return game;
  };
  const swipe = (direction: Swipe['direction']): Swipe => ({ direction, from: { x: 400, y: 400 }, dx: direction === 'left' ? -150 : direction === 'right' ? 150 : 0, dy: direction === 'up' ? -150 : 0, speed: 1500 });
  const runInto = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('changes lane with a swipe and picks up a star in the new lane', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('left')] });
    expect(game.state.lane).toBe(0);
    game.state.items = [{ kind: 'star', lane: 0, z: 0.05, hit: -1 }];
    runInto(game);
    expect(game.score).toBe(1);
  });

  it('jumps a log but bumps into a crate, jump or not', () => {
    const game = setup();
    game.state.items = [{ kind: 'log', lane: 1, z: 0.05, hit: -1 }];
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('up')] });
    runInto(game);
    expect(game.lives).toBe(3);
    game.state.items = [{ kind: 'crate', lane: 1, z: 0.05, hit: -1 }];
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('up')] });
    runInto(game);
    expect(game.lives).toBe(2);
  });
});

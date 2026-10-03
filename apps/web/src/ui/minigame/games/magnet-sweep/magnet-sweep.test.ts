import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CAPACITY, createMagnetSweep, isIron } from './logic';

describeMinigame('magnet-sweep');

describe('magnet sweep rules', () => {
  const setup = () => createMagnetSweep({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: {}, rng: createRng(3) });
  const moveTo = (game: ReturnType<typeof setup>, x: number, y: number) => {
    for (let i = 0; i < 300; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x, y } });
  };

  it('lifts iron but not wood, leaves or shells', () => {
    const game = setup();
    game.state.things = [
      { kind: 0, x: 500, y: 300, age: 9, tilt: 0, stuck: null },
      { kind: 5, x: 520, y: 310, age: 9, tilt: 0, stuck: null },
    ];
    moveTo(game, 510, 305);
    const [iron, leaf] = game.state.things;
    expect(iron && isIron(iron) && iron.stuck).toBeTruthy();
    expect(leaf?.stuck).toBeNull();
    expect(game.state.load).toBeGreaterThanOrEqual(1);
  });

  it('drops the load in the toolbox for a point each, and carries no more than it can', () => {
    const game = setup();
    game.state.things = Array.from({ length: CAPACITY + 3 }, (_, i) => ({ kind: i % 4, x: 500 + (i % 3) * 8, y: 300 + i * 3, age: 9, tilt: 0, stuck: null }));
    moveTo(game, 505, 310);
    expect(game.state.load).toBe(CAPACITY);
    moveTo(game, game.state.box.x, game.state.box.y);
    expect(game.score).toBeGreaterThanOrEqual(CAPACITY);
    expect(game.state.load).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSledSlalom } from './logic';

describeMinigame('sled-slalom');

describe('sled slalom rules', () => {
  const setup = () => createSledSlalom({ arena: { width: 600, height: 863 }, goal: 15, duration: 60, params: { speed: 1 }, rng: createRng(7) });

  it('scores a gate passed between its flags and not one passed outside', () => {
    const game = setup();
    game.step(1 / 60, NO_INPUT);
    game.state.trees = [];
    game.state.gates = [
      { x: game.state.sledX, y: game.state.sledY + 2, half: 100, passed: null },
      { x: game.state.sledX + 250, y: game.state.sledY + 4, half: 100, passed: null },
    ];
    for (let i = 0; i < 5; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.state.gates[1]?.passed).toBe(false);
  });

  it('stops for a second after bumping a tree', () => {
    const game = setup();
    game.step(1 / 60, NO_INPUT);
    game.state.trees = [{ x: game.state.sledX, y: game.state.sledY + 22, bumped: false }];
    game.step(1 / 60, NO_INPUT);
    expect(game.state.stopped).toBeGreaterThan(0.9);
    const d = game.state.distance;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.distance).toBe(d);
  });

  it('never puts a gate over the middle of the slope', () => {
    const game = setup();
    for (let i = 0; i < 60 * 30; i += 1) game.step(1 / 60, NO_INPUT);
    for (const g of game.state.gates) expect(Math.abs(g.x - 300)).toBeGreaterThan(g.half);
  });
});

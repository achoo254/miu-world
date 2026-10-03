import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CLIMB_SECONDS, createCapCua, OPEN_GRACE } from './logic';

describeMinigame('cap-cua');

describe('cắp cua rules', () => {
  const setup = () => createCapCua({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: {}, rng: createRng(3) });
  const carryIn = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 120 && !game.state.crabs.some((c) => c.x > 60 && c.x < 800); i += 1) game.step(1 / 60, NO_INPUT);
    const crab = game.state.crabs.find((c) => c.x > 60 && c.x < 800);
    if (!crab) throw new Error('no crab');
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: crab.x, y: crab.y } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { ...game.state.basket } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('opens the lid for a crab, and a tap shuts it', () => {
    const game = setup();
    carryIn(game);
    expect(game.score).toBe(1);
    expect(game.state.lidOpen).toBe(true);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ ...game.state.basket }] });
    expect(game.state.lidOpen).toBe(false);
  });

  it('lets crabs climb out of a lid left open too long', () => {
    const game = setup();
    carryIn(game);
    carryIn(game);
    expect(game.score).toBe(2);
    for (let i = 0; i < 60 * (OPEN_GRACE + CLIMB_SECONDS + 0.1); i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.state.crabs.some((c) => c.escaped)).toBe(true);
  });
});

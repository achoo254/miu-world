import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPickSticks, type Stick } from './logic';

describeMinigame('pick-sticks');

describe('pick-up sticks rules', () => {
  const setup = () => createPickSticks({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: {}, rng: createRng(7) });
  const stick = (x: number, y: number, angle: number): Stick => ({ x, y, angle, length: 300, colour: 0, lifted: -1 });

  it('lifts the stick on top, and shakes the pile for one with a stick across it', () => {
    const game = setup();
    // A flat stick under an upright one crossing its middle, and a lone stick apart.
    game.state.sticks = [stick(400, 350, 0), stick(400, 350, Math.PI / 2), stick(400, 550, 0)];
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: 350 }] });
    expect(game.score).toBe(0);
    expect(game.lives).toBe(2);
    expect(game.state.blocking).toEqual([1]);
    // At the crossing, the tap takes the upright stick on top; then the flat one is free.
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 350 }] });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: 350 }] });
    expect(game.score).toBe(2);
    expect(game.lives).toBe(2);
  });

  it('lays a new pile once the table is empty', () => {
    const game = setup();
    game.state.sticks = [stick(400, 350, 0)];
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 350 }] });
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.sticks.filter((s) => s.lifted < 0).length).toBeGreaterThan(5);
    expect(game.state.piles).toBe(2);
  });
});

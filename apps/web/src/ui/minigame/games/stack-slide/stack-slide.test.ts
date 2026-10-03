import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createStackSlide } from './logic';

describeMinigame('stack-slide');

describe('stack slide rules', () => {
  const setup = () => createStackSlide({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: { speed: 1 }, rng: createRng(1) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 400 }] };

  it('cuts the part hanging over the edge, keeps an exact drop whole', () => {
    const game = setup();
    const base = game.state.floors[0];
    if (!base) throw new Error('no base');
    game.state.dir = 0;
    game.state.slider.x = base.x + 60;
    game.step(1 / 60, tap);
    expect(game.score).toBe(1);
    expect(game.state.floors[1]?.w).toBeCloseTo(base.w - 60);
    expect(game.state.chips).toHaveLength(1);
    const top = game.state.floors[1];
    if (!top) throw new Error('no floor');
    game.state.dir = 0;
    game.state.slider.x = top.x + 3;
    game.step(1 / 60, tap);
    expect(game.state.floors[2]?.w).toBeCloseTo(top.w);
    expect(game.state.floors[2]?.x).toBeCloseTo(top.x);
  });

  it('ends the round when a floor misses the tower', () => {
    const game = setup();
    game.state.dir = 0;
    game.state.slider.x = 30;
    game.state.slider.w = 40;
    game.step(1 / 60, tap);
    expect(game.score).toBe(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
  });
});

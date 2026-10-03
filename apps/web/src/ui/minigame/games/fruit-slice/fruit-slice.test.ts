import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFruitSlice, type Thrown } from './logic';

describeMinigame('fruit-slice');

describe('fruit slice rules', () => {
  const setup = () => createFruitSlice({ arena: { width: 863, height: 600 }, goal: 40, duration: 60, params: { speed: 1 }, rng: createRng(2) });
  const item = (kind: Thrown['kind'], x: number, y: number): Thrown => ({ kind, x, y, vx: 0, vy: 0, r: 46, angle: 0, spin: 0, cut: -1, cutAngle: 0 });

  it('cuts every fruit along the finger path, and a cactus costs a heart', () => {
    const game = setup();
    game.state.items.push(item('watermelon', 300, 350), item('lemon', 450, 360), item('cactus', 600, 350));
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 200, y: 350 } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 520, y: 355 } });
    expect(game.score).toBe(2);
    expect(game.lives).toBe(3);
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 700, y: 350 } });
    expect(game.lives).toBe(2);
    expect(game.drainEvents().map((e) => e.type).filter((t) => t !== 'miss')).toEqual(['score', 'score', 'hit']);
  });

  it('cuts along a quick flick, but a resting finger cuts nothing', () => {
    const game = setup();
    game.state.items.push(item('banana', 400, 300));
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 400, y: 300 } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 402, y: 301 } });
    expect(game.score).toBe(0);
    game.step(1 / 60, { ...NO_INPUT, released: true });
    game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, swipes: [{ direction: 'right', from: { x: 300, y: 300 }, dx: 200, dy: 0, speed: 1500 }] });
    expect(game.score).toBe(1);
  });
});

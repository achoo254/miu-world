import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createGravityFlip } from './logic';

describeMinigame('gravity-flip');

describe('gravity flip rules', () => {
  const setup = () => createGravityFlip({ arena: { width: 863, height: 600 }, goal: 420, duration: 60, params: {}, rng: createRng(1) });

  it('falls up to the roof on a tap and back down on the next', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: 300 }] });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.down).toBe('roof');
    expect(game.state.grounded).toBe(true);
    expect(game.state.y).toBeLessThan(game.state.roofY + 40);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: 300 }] });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.down).toBe('floor');
  });

  it('stumbles and slows down when it runs into something on its side', () => {
    const game = setup();
    game.state.obstacles = [{ at: 1, length: 1, side: 'floor', kind: 'rock', reach: 100, hit: false }];
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.obstacles[0]?.hit).toBe(true);
    expect(game.state.speed).toBeLessThan(2);
    expect(game.drainEvents().some((e) => e.type === 'hit')).toBe(true);
  });
});

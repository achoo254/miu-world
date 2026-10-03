import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPaddyWater, HIGH, LOW } from './logic';

describeMinigame('paddy-water');

describe('paddy water rules', () => {
  const setup = () => createPaddyWater({ arena: { width: 863, height: 600 }, goal: 10, duration: 90, params: {}, rng: createRng(2) });

  it('counts a terrace closed at the line and spills an overflowing one into the next', () => {
    const game = setup();
    const [a, b] = game.state.terraces;
    if (!a || !b) throw new Error('no terraces');
    a.level = (LOW + HIGH) / 2;
    game.step(1 / 60, NO_INPUT);
    expect(a.done).toBe(true);
    expect(game.score).toBe(1);
    b.open = true;
    b.level = 0.99;
    const c = game.state.terraces[2];
    const before = c?.level ?? 0;
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(c?.level ?? 0).toBeGreaterThan(before);
  });
});

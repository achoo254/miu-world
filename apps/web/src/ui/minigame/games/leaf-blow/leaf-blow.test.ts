import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLeafBlow } from './logic';

describeMinigame('leaf-blow');

describe('leaf blow rules', () => {
  const setup = () => createLeafBlow({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: { power: 1 }, rng: createRng(4) });

  it('starts every leaf on the grass, outside the frame', () => {
    const { state } = setup();
    expect(state.leaves.length).toBeGreaterThan(20);
    for (const l of state.leaves) expect(l.x < state.pile.x || l.x > state.pile.x + state.pile.w || l.y < state.pile.y || l.y > state.pile.y + state.pile.h).toBe(true);
  });

  it('blows a leaf away from the fan, and only near it', () => {
    const game = setup();
    const [near, far] = game.state.leaves;
    if (!near || !far) throw new Error('no leaves');
    near.x = 300;
    near.y = 300;
    far.x = 700;
    far.y = 500;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 250, y: 300 }, pressed: true });
    expect(near.vx).toBeGreaterThan(0);
    expect(Math.abs(near.vy)).toBeLessThan(1);
    expect(far.vx).toBe(0);
  });

  it('scores a leaf that ends inside the frame, once', () => {
    const game = setup();
    const [leaf] = game.state.leaves;
    if (!leaf) throw new Error('no leaves');
    leaf.x = game.state.pile.x + game.state.pile.w / 2;
    leaf.y = game.state.pile.y + game.state.pile.h / 2;
    game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(leaf.piled).toBeGreaterThan(0);
  });
});

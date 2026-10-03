import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMonkeyBridge, MAX_TILT } from './logic';

describeMinigame('monkey-bridge');

describe('monkey bridge rules', () => {
  const arena = { width: 863, height: 600 };
  const setup = () => createMonkeyBridge({ arena, goal: 3, duration: 60, params: { wind: 1 }, rng: createRng(2) });

  it('a lean grows by itself, and dragging the other way rights it', () => {
    const alone = setup();
    alone.state.tilt = 0.2;
    for (let i = 0; i < 20; i += 1) alone.step(1 / 60, NO_INPUT);
    expect(alone.state.tilt).toBeGreaterThan(0.2);
    const helped = setup();
    helped.state.tilt = 0.2;
    for (let i = 0; i < 20; i += 1) helped.step(1 / 60, { ...NO_INPUT, pointer: { x: 100, y: 500 } });
    expect(helped.state.tilt).toBeLessThan(0.2);
  });

  it('falls into the stream past the limit and wades back to the start', () => {
    const game = setup();
    game.state.along = 0.5;
    game.state.tilt = MAX_TILT - 0.001;
    game.state.spin = 1;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('fall');
    expect(game.drainEvents().map((e) => e.type)).toEqual(['hit']);
    for (let i = 0; i < 60 * 4 && game.state.phase !== 'walk'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('walk');
    expect(game.state.along).toBe(0);
    expect(game.score).toBe(0);
  });

  it('scores a bridge when she reaches the far bank', () => {
    const game = setup();
    game.state.along = 0.999;
    game.state.tilt = 0;
    game.state.spin = 0;
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('cheer');
  });
});

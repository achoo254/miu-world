import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BLEAT_SECONDS, createBlindGoat } from './logic';

describeMinigame('blind-goat');

describe('blind goat rules', () => {
  const setup = (seed = 1) => createBlindGoat({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: {}, rng: createRng(seed) });

  it('bleats with a ring of light and a note, and is caught when she reaches it', () => {
    const game = setup();
    let rings = 0;
    for (let i = 0; i < (BLEAT_SECONDS + 1) * 60; i += 1) {
      game.step(1 / 60, NO_INPUT);
      if (game.drainEvents().some((e) => e.note !== undefined)) rings = Math.max(rings, game.state.bleats.length);
    }
    expect(rings).toBeGreaterThan(0);
    game.state.goat = { x: game.state.me.x + 40, y: game.state.me.y };
    game.state.rest = 9;
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('is lost walking round in circles without listening', () => {
    for (const seed of [1, 2, 3]) {
      const game = setup(seed);
      const { field } = game.state;
      for (let i = 0; i < 3600; i += 1) {
        const a = i / 120;
        const pointer = { x: field.x + field.w / 2 + Math.cos(a) * field.w * 0.3, y: field.y + field.h / 2 + Math.sin(a) * field.h * 0.3 };
        game.step(1 / 60, { ...NO_INPUT, pointer });
      }
      expect(game.score).toBeLessThan(8);
    }
  });
});

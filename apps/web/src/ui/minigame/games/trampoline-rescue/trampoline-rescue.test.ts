import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTrampolineRescue, landings, NET_SPEED, NET_HALF } from './logic';

describeMinigame('trampoline-rescue');

describe('trampoline rescue rules', () => {
  const setup = () => createTrampolineRescue({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: { speed: 1 }, rng: createRng(6) });

  it('bounces a friend three times and saves it in the truck when the trampoline is under each landing', () => {
    const game = setup();
    for (let i = 0; i < 60 * 8; i += 1) {
      const next = landings(game.state)[0];
      game.step(1 / 60, { ...NO_INPUT, pointer: next ? { x: next.x, y: 400 } : null });
    }
    expect(game.score).toBeGreaterThan(0);
    expect(game.lives).toBe(3);
  });

  it('costs a heart when a friend lands away from the trampoline', () => {
    const game = setup();
    for (let i = 0; i < 60 * 4 && game.lives === 3; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 840, y: 400 } });
    expect(game.lives).toBe(2);
    expect(game.score).toBe(0);
  });

  it('only sends friends whose landings can all be reached in time', () => {
    const game = setup();
    for (let i = 0; i < 60 * 40; i += 1) {
      game.step(1 / 60, NO_INPUT);
      game.state.lives = 3;
      const all = landings(game.state);
      for (let k = 1; k < all.length; k += 1) {
        const a = all[k - 1];
        const b = all[k];
        if (a && b) expect(b.at - a.at + 1e-6).toBeGreaterThanOrEqual(Math.max(0, Math.abs(b.x - a.x) - NET_HALF) / NET_SPEED);
      }
    }
  });
});

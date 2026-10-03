import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDanhKhang, HIT_WINDOW, MAX_METRES, metresFor } from './logic';

// Tapping all the time swings far too early every turn.
describeMinigame('danh-khang', { loser: ({ arena }) => ({ tap: { x: arena.width / 2, y: arena.height / 2 } }) });

describe('đánh khăng rules', () => {
  it('sends the stick furthest from the top of its flight and nowhere outside the window', () => {
    expect(metresFor(0)).toBe(MAX_METRES);
    expect(metresFor(HIT_WINDOW / 2)).toBeLessThan(MAX_METRES);
    expect(metresFor(-HIT_WINDOW / 2)).toBe(metresFor(HIT_WINDOW / 2));
    expect(metresFor(HIT_WINDOW + 0.01)).toBe(0);
  });

  it('plays six turns, flick then swing, and adds up the metres', () => {
    const game = createDanhKhang({ arena: { width: 863, height: 600 }, goal: 100, duration: 60, params: { turns: 6 }, rng: createRng(1) });
    const tap = { ...NO_INPUT, taps: [{ x: 400, y: 300 }] };
    for (let turn = 0; turn < 6; turn += 1) {
      game.step(1 / 60, tap);
      while (game.state.inPhase < game.state.apex) game.step(1 / 60, NO_INPUT);
      game.step(1 / 60, tap);
      for (let i = 0; i < 120 && game.state.phase === 'flight'; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(game.done).toBe(true);
    expect(game.state.hits).toHaveLength(6);
    expect(game.score).toBeGreaterThan(150);
  });
});

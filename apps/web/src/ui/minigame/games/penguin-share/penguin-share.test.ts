import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPenguinShare, SHARES } from './logic';

describeMinigame('penguin-share');

describe('penguin share rules', () => {
  const setup = () => createPenguinShare({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: {}, rng: createRng(2) });
  const give = (game: ReturnType<typeof setup>, index: number) => {
    const g = game.state.penguins[index];
    if (!g) throw new Error('no penguin');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: g.x, y: g.y }] });
  };

  it('only ever shares up to 12 fish, evenly', () => {
    for (const [friends, each] of SHARES) {
      expect(friends * each).toBeLessThanOrEqual(12);
      expect(friends).toBeGreaterThanOrEqual(2);
    }
  });

  it('scores a fair share and has the one with most give a fish back otherwise', () => {
    const game = setup();
    const total = game.state.pile;
    // Everything to the first penguin: unfair, it hands one back.
    for (let i = 0; i < total; i += 1) give(game, 0);
    expect(game.score).toBe(0);
    expect(game.state.phase).toBe('giveBack');
    expect(game.state.pile).toBe(1);
    expect(game.state.penguins[0]?.fish).toBe(total - 1);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    // Start over fairly in a fresh game.
    const fair = setup();
    const n = fair.state.penguins.length;
    for (let i = 0; i < fair.state.each * n; i += 1) give(fair, i % n);
    expect(fair.score).toBe(1);
    expect(fair.state.phase).toBe('cheer');
  });
});

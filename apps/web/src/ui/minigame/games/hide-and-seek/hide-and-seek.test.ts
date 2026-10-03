import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHideAndSeek, PEEK_SECONDS, STAY_SECONDS } from './logic';

describeMinigame('hide-and-seek');

describe('hide and seek rules', () => {
  const setup = (seed = 1) => createHideAndSeek({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: {}, rng: createRng(seed) });

  it('finds a friend seen peeking, not one that has not peeked, and makes her wait after an empty place', () => {
    const game = setup();
    const [a, b] = game.state.friends;
    if (!a || !b) throw new Error('no friends');
    a.peekIn = 99;
    b.peekIn = 99;
    const at = (i: number) => game.state.places[i] ?? { x: 0, y: 0 };
    game.step(1 / 60, { ...NO_INPUT, taps: [at(a.place)] });
    expect(game.score).toBe(0);
    expect(game.state.looking).toBeGreaterThan(0);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    a.peekAgo = 0.1;
    game.step(1 / 60, { ...NO_INPUT, taps: [at(a.place)] });
    expect(game.score).toBe(1);
  });

  it('sneaks off to another place when not found in time', () => {
    const game = setup(2);
    const f = game.state.friends[0];
    if (!f) throw new Error('no friend');
    f.peekIn = 99;
    f.peekAgo = 0;
    const from = f.place;
    for (let i = 0; i < (PEEK_SECONDS + STAY_SECONDS) * 60 + 2; i += 1) game.step(1 / 60, NO_INPUT);
    expect(f.place).not.toBe(from);
  });

  it('is lost by tapping places at random', () => {
    const pick = createRng(99);
    for (const seed of [1, 2, 3, 4, 5]) {
      const game = setup(seed);
      for (let i = 0; i < 3600; i += 1) {
        const p = game.state.places[pick.int(0, game.state.places.length - 1)];
        game.step(1 / 60, { ...NO_INPUT, taps: i % 6 === 0 && p ? [p] : [] });
      }
      expect(game.score).toBeLessThan(12);
    }
  });
});

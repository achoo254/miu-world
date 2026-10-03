import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWordChain, firstSound, followers, lastSound, WORDS } from './logic';

describeMinigame('word-chain');

describe('word chain rules', () => {
  it('has two-sound words, none twice, and every word can start or continue a chain', () => {
    expect(new Set(WORDS.map((w) => w.text)).size).toBe(WORDS.length);
    for (const w of WORDS) {
      expect(w.text.split(' ')).toHaveLength(2);
      const linked = followers(w, [w]).length > 0 || WORDS.some((v) => v !== w && lastSound(v) === firstSound(w));
      expect(linked, w.text).toBe(true);
    }
  });

  it('offers exactly one card that follows the tail', () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const game = createWordChain({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(seed) });
      const tail = game.state.dragon.at(-1);
      if (!tail) throw new Error('no dragon');
      const following = game.state.options.filter((c) => firstSound(c) === lastSound(tail));
      expect(following).toHaveLength(1);
      expect(following[0]?.right).toBe(true);
    }
  });

  it('grows the dragon on the right card and rests the cards after a wrong one', () => {
    const game = createWordChain({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(4) });
    const s = game.state;
    const wrong = s.options.find((c) => !c.right);
    if (!wrong) throw new Error('no wrong card');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x + 10, y: wrong.y + 10 }] });
    expect(s.rest).toBeGreaterThan(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    const right = s.options.find((c) => c.right);
    if (!right) throw new Error('no right card');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x + 10, y: right.y + 10 }] });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(s.dragon.length === 2 || s.flewAgo >= 0).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMagicLetters, writing } from './logic';
import { LETTERS, MATCH, recognise } from './recognize';

describeMinigame('magic-letters');

describe('magic letters rules', () => {
  it('reads every letter written either way round, wobbly, at any size', () => {
    for (const letter of LETTERS) {
      for (const size of [90, 200]) {
        const points = writing(letter, 100, 200, size).map((p, i) => ({ x: p.x + Math.sin(i * 2.1) * size * 0.04, y: p.y + Math.cos(i * 1.3) * size * 0.04 }));
        for (const stroke of [points, [...points].reverse()]) {
          const read = recognise(stroke);
          expect(read?.letter, `${letter} at ${size}`).toBe(letter);
          expect(read?.score ?? 1).toBeLessThan(MATCH);
        }
      }
    }
  });

  it('pops the balloon whose letter was written', () => {
    const game = createMagicLetters({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: {}, rng: createRng(3) });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    const balloon = game.state.balloons[0];
    if (!balloon) throw new Error('no balloon');
    for (const p of writing(balloon.letter, 300, 300, 150)) game.step(1 / 60, { ...NO_INPUT, pointer: p });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBirdChoir } from './logic';

/** Guessing: taps a bird at random every decision. */
let guess = 1;
describeMinigame('bird-choir', {
  loser: (context) => {
    guess = (guess * 5 + 3) % 17;
    const spacing = (context.arena.width - 40) / 5;
    return { tap: { x: 20 + spacing * ((guess % 5) + 0.5), y: 110 + (context.arena.height - 110) * 0.45 - 30 } };
  },
});

describe('bird choir rules', () => {
  const setup = () => createBirdChoir({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(9) });
  const run = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('has the odd bird sing late or off key while the others sing together', () => {
    const game = setup();
    run(game, 0.5);
    const { chirpAt, chirpNote, odd, kind } = game.state;
    const others = chirpAt.filter((_, i) => i !== odd);
    expect(new Set(others).size).toBe(1);
    if (kind === 'pitch') expect(chirpNote[odd]).not.toBe(chirpNote[(odd + 1) % 5]);
    else expect(chirpAt[odd]).not.toBe(others[0]);
  });

  it('scores the odd bird and gives nothing for another', () => {
    const game = setup();
    run(game, 1);
    const right = game.state.birds[game.state.odd] ?? { x: 0, y: 0 };
    game.step(1 / 60, { ...NO_INPUT, taps: [right] });
    expect(game.score).toBe(1);
    run(game, 1.5);
    const wrong = game.state.birds[(game.state.odd + 2) % 5] ?? { x: 0, y: 0 };
    game.step(1 / 60, { ...NO_INPUT, taps: [wrong] });
    expect(game.score).toBe(1);
    expect(game.state.nextIn).toBeGreaterThan(0);
  });
});

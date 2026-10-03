import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSnapMatch } from './logic';

// Tapping all the time must not win: every tap on two different cards costs a card.
describeMinigame('snap-match', { loser: ({ arena }) => ({ tap: { x: arena.width / 2, y: arena.height / 2 } }) });

describe('snap match rules', () => {
  const setup = () => createSnapMatch({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: { speed: 1 }, rng: createRng(1) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 400 }] };

  it('gives the pile to the child who taps a snap first, and to the monkey otherwise', () => {
    const game = setup();
    let snaps = 0;
    for (let i = 0; i < 60 * 30 && snaps < 2; i += 1) {
      game.step(1 / 60, NO_INPUT);
      if (game.state.open && game.state.age > 0.1) {
        snaps += 1;
        if (snaps === 1) {
          game.step(1 / 60, tap);
          expect(game.score).toBe(1);
        } else {
          for (let j = 0; j < 60 && game.state.open; j += 1) game.step(1 / 60, NO_INPUT);
          expect(game.state.monkeyScore).toBe(1);
        }
      }
    }
    expect(snaps).toBe(2);
  });

  it('takes a card for a tap on two different cards, never below zero', () => {
    const game = setup();
    game.state.score = 1;
    for (let i = 0; i < 120 && (game.state.open || game.state.top < 0); i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.score).toBe(0);
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    if (!game.state.open) game.step(1 / 60, tap);
    expect(game.score).toBe(0);
  });
});

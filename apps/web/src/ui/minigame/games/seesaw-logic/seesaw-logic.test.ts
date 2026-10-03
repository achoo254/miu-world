import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { answerOf, createSeesawLogic, type SeesawLogicState } from './logic';

/** Guessing: taps a friend at random every decision. */
let guess = 0;
describeMinigame('seesaw-logic', {
  loser: (context) => {
    guess = (guess * 7 + 3) % 11;
    const x = context.arena.width / 2 + ((guess % 4) - 1.5) * 150;
    return { tap: { x, y: context.arena.height - Math.max(90, context.arena.height * 0.12) } };
  },
});

/** Who is heaviest, read only from the seesaws (what a child can see). */
function heaviestFromSeesaws(state: SeesawLogicState): number[] {
  const lighter = new Set<number>();
  for (const s of state.seesaws) {
    const leftHeavier = (state.rank[s.left] ?? 0) > (state.rank[s.right] ?? 0);
    lighter.add(leftHeavier ? s.right : s.left);
  }
  return state.friends.map((_, i) => i).filter((i) => !lighter.has(i));
}

describe('seesaw logic rules', () => {
  const setup = (seed: number) => createSeesawLogic({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: {}, rng: createRng(seed) });

  it('shows enough seesaws to find exactly one heaviest friend', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const game = setup(seed);
      expect(heaviestFromSeesaws(game.state)).toEqual([answerOf(game.state)]);
    }
  });

  it('scores the right friend and adds a hint seesaw after a wrong one', () => {
    const game = setup(3);
    const answer = answerOf(game.state);
    const wrong = (answer + 1) % game.state.friends.length;
    const before = game.state.seesaws.length;
    const at = (i: number) => game.state.spots[i] ?? { x: 0, y: 0 };
    game.step(1 / 60, { ...NO_INPUT, taps: [at(wrong)] });
    expect(game.score).toBe(0);
    expect(game.state.seesaws.length).toBeGreaterThanOrEqual(before);
    expect(game.state.seesaws.some((s) => [s.left, s.right].includes(wrong) && [s.left, s.right].includes(answer))).toBe(true);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [at(answer)] });
    // Found after a hint: the round ends without a point.
    expect(game.score).toBe(0);
    expect(game.state.nextIn).toBeGreaterThan(0);
    const fresh = setup(4);
    fresh.step(1 / 60, { ...NO_INPUT, taps: [fresh.state.spots[answerOf(fresh.state)] ?? { x: 0, y: 0 }] });
    expect(fresh.score).toBe(1);
  });
});

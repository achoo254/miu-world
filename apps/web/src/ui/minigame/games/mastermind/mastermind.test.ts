import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { ALL_CODES, consistentCodes, createMastermind, feedbackFor, MAX_GUESSES } from './logic';

describeMinigame('mastermind');

describe('gem code rules', () => {
  const setup = () => createMastermind({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: {}, rng: createRng(5) });
  const guess = (game: ReturnType<typeof setup>, gems: number[]) => {
    for (const g of gems) {
      const p = game.state.palette[g];
      if (!p) throw new Error('no gem');
      game.step(1 / 60, { ...NO_INPUT, taps: [p] });
    }
    for (let i = 0; i < 25; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('answers with gems in place and gems out of place', () => {
    expect(feedbackFor([0, 1, 2], [0, 2, 3])).toEqual({ exact: 1, near: 1 });
    expect(feedbackFor([0, 1, 2], [2, 0, 1])).toEqual({ exact: 0, near: 3 });
    expect(ALL_CODES).toHaveLength(24);
  });

  it('finds any code within the eight guesses by always guessing what fits', () => {
    for (const code of ALL_CODES) {
      const history: { gems: number[]; feedback: ReturnType<typeof feedbackFor> }[] = [];
      for (let n = 0; n < MAX_GUESSES; n += 1) {
        const next = consistentCodes(history)[0];
        if (!next) throw new Error('no code fits');
        const feedback = feedbackFor(code, next);
        history.push({ gems: next, feedback });
        if (feedback.exact === 3) break;
      }
      expect(history[history.length - 1]?.feedback.exact).toBe(3);
    }
  });

  it('opens the chest for the right row and shows the code after eight wrong ones', () => {
    const game = setup();
    guess(game, [...game.state.code]);
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('open');
    for (let i = 0; i < 100; i += 1) game.step(1 / 60, NO_INPUT);
    const wrong = ALL_CODES.find((c) => feedbackFor(game.state.code, c).exact < 3) ?? [0, 1, 2];
    for (let n = 0; n < MAX_GUESSES; n += 1) guess(game, wrong);
    expect(game.state.phase).toBe('reveal');
    expect(game.score).toBe(1);
  });
});

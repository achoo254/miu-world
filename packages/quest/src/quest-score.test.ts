import { describe, expect, it } from 'vitest';
import { questScore } from './quest-score';

describe('questScore', () => {
  it('gives full XP and 3 stars without the answer layer and with few mistakes', () => {
    expect(questScore(100, { answerViewed: false, wrongCount: 0 })).toEqual({ stars: 3, xpAwarded: 100 });
    expect(questScore(100, { answerViewed: false, wrongCount: 4 })).toEqual({ stars: 3, xpAwarded: 100 });
  });

  it('takes 10% of the quest XP (rounded down) and one star when the answer was viewed', () => {
    expect(questScore(100, { answerViewed: true, wrongCount: 0 })).toEqual({ stars: 2, xpAwarded: 90 });
    expect(questScore(5, { answerViewed: true, wrongCount: 0 })).toEqual({ stars: 2, xpAwarded: 4 });
  });

  it('takes one star at five or more mistakes, never going below one star', () => {
    expect(questScore(100, { answerViewed: false, wrongCount: 5 })).toEqual({ stars: 2, xpAwarded: 100 });
    expect(questScore(100, { answerViewed: true, wrongCount: 12 })).toEqual({ stars: 1, xpAwarded: 90 });
  });
});

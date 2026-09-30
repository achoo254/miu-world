/** Share of the quest XP kept when the child opened the answer layer (the rest is framed as encouragement, not a penalty). */
export const ANSWER_VIEWED_XP_SHARE = 0.9;
/** Wrong answers across the whole quest that cost one star. */
export const MISTAKES_PER_LOST_STAR = 5;

export interface QuestEffort {
  /** Whether the answer layer was opened on any step of the quest. */
  answerViewed: boolean;
  /** Wrong answers across every step of the quest. */
  wrongCount: number;
}

export interface QuestScore {
  /** 1 to 3. */
  stars: number;
  xpAwarded: number;
}

/**
 * Stars and XP for a finished quest: 3 stars, minus one if the answer was viewed, minus one more at
 * five or more mistakes, at least one. Viewing the answer keeps 90% of the quest XP (rounded down);
 * coins, skill XP and items are never reduced. Server-only: computed once when the quest finishes.
 */
export function questScore(questXp: number, effort: QuestEffort): QuestScore {
  const lost = (effort.answerViewed ? 1 : 0) + (effort.wrongCount >= MISTAKES_PER_LOST_STAR ? 1 : 0);
  const stars = Math.max(1, 3 - lost);
  const xpAwarded = effort.answerViewed ? Math.floor(questXp * ANSWER_VIEWED_XP_SHARE) : questXp;
  return { stars, xpAwarded };
}

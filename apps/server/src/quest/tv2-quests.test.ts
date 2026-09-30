import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { completeStep, emptyProgress, type QuestProgress } from '@miu/quest/quest-progress';
import { CONTENT_DIR, readQuestDefinitions } from '../content/content-catalog';
import { solution } from '../../test/quest-solution';

const quests = readQuestDefinitions(path.join(CONTENT_DIR, 'quests')).filter((q) => q.id.startsWith('tv2-'));

describe('Tiếng Việt 2 quests', () => {
  it('exist', () => {
    expect(quests.length).toBeGreaterThan(0);
  });

  for (const quest of quests) {
    it(`${quest.id} plays from first step to reward with the book's answers`, () => {
      if (quest.status === 'stub') throw new Error('textbook quests are written in full');
      // Drafts are played as they will run once switched on.
      const playable = { ...quest, status: 'active' as const };
      let progress: QuestProgress = emptyProgress();
      let reward = null;
      for (const [stepId, body] of solution(quest)) {
        const result = completeStep(playable, progress, stepId, body);
        if (!result.ok) throw new Error(`${quest.id} step ${stepId}: ${result.error}`);
        progress = result.progress;
        reward = result.reward;
      }
      expect(progress.completed).toBe(true);
      expect(reward).toEqual(quest.reward);
    });
  }
});

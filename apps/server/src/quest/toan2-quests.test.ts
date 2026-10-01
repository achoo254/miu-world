import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { completeStep, emptyProgress, type QuestProgress } from '@miu/quest/quest-progress';
import { CONTENT_DIR, readQuestDefinitions } from '../content/content-catalog';
import { solution } from '../../test/quest-solution';

const quests = readQuestDefinitions(path.join(CONTENT_DIR, 'quests')).filter((q) => q.id.startsWith('toan2-'));

describe('Toán 2 quests', () => {
  it('exist, one per lesson, all in the school region', () => {
    expect(quests.length).toBeGreaterThan(0);
    const lessons = quests.map((q) => (q.status === 'stub' ? null : q.lesson));
    expect(new Set(lessons).size).toBe(quests.length);
    for (const quest of quests) expect(quest.region).toBe('truong-hoc');
  });

  for (const quest of quests) {
    it(`${quest.id} plays from first step to reward with the book's answers`, () => {
      if (quest.status === 'stub') throw new Error('textbook quests are written in full');
      // Drafts are played as they will run once switched on; lessons open in any order, so each plays alone.
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

    it(`${quest.id} ties every graded step to the textbook exercises it plays`, () => {
      if (quest.status === 'stub') throw new Error('textbook quests are written in full');
      const untied = quest.steps.filter((s) => 'support' in s && !('curriculumRef' in s && s.curriculumRef && s.curriculumRef.length > 0)).map((s) => s.id);
      expect(untied).toEqual([]);
    });
  }
});

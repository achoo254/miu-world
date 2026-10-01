import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { completeStep, emptyProgress, type QuestProgress } from '@miu/quest/quest-progress';
import { CONTENT_DIR, readQuestDefinitions } from '../content/content-catalog';
import { solution } from '../../test/quest-solution';

const quests = readQuestDefinitions(path.join(CONTENT_DIR, 'quests')).filter((q) => q.id.startsWith('toan2-'));

/** Where each topic of the book plays (story-map.md, "Chia lại 8 map"): the map's region and its chapter. */
const PLACE_OF_TOPIC: Record<number, { region: string; chapter: number }> = {
  1: { region: 'truong-hoc', chapter: 1 },
  2: { region: 'cho-phien', chapter: 1 },
  3: { region: 'cho-phien', chapter: 2 },
  4: { region: 'nong-trai', chapter: 1 },
  5: { region: 'lau-dai', chapter: 1 },
  6: { region: 'thu-vien', chapter: 3 },
  7: { region: 'lau-dai', chapter: 2 },
};

describe('Toán 2 quests', () => {
  it('exist, one per lesson, each in the chapter of its topic on its map', () => {
    expect(quests.length).toBeGreaterThan(0);
    const lessons = quests.map((q) => (q.status === 'stub' ? null : q.lesson));
    expect(new Set(lessons).size).toBe(quests.length);
    for (const quest of quests) {
      const topic = Number(/^toan2-cd(\d+)-/.exec(quest.id)?.[1]);
      expect({ region: quest.region, chapter: quest.chapter }, quest.id).toEqual(PLACE_OF_TOPIC[topic]);
    }
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

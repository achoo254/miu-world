import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { completeStep, emptyProgress, type QuestProgress } from '@miu/quest/quest-progress';
import { CONTENT_DIR, readQuestDefinitions } from '../content/content-catalog';
import { readCurriculum } from '../worksheet/curriculum-books';
import { solution } from '../../test/quest-solution';

const quests = readQuestDefinitions(path.join(CONTENT_DIR, 'quests')).filter((q) => q.id.startsWith('tv2-'));
const book = readCurriculum().books.find((b) => b.book.id === 'tv2-t1')?.book;
const lessons = book?.toc.flatMap((unit) => unit.lessons) ?? [];

/** `tv2-t1-b03` in week 2 is played by `tv2-t02-b03`; `tv2-t1-on-giua-ki` in week 9 by `tv2-t09-on-giua-ki`. */
const questIdFor = (lessonId: string, week: number) => `tv2-t${String(week).padStart(2, '0')}-${lessonId.replace(/^tv2-t1-/, '')}`;

describe('Tiếng Việt 2 quests', () => {
  it('play every lesson of the book, one quest per lesson', () => {
    expect(lessons).toHaveLength(34);
    const expected = lessons.map((l) => questIdFor(l.id, l.week ?? 0)).sort();
    expect(quests.map((q) => q.id).sort()).toEqual(expected);
  });

  for (const lesson of lessons) {
    const week = lesson.week ?? 0;
    const id = questIdFor(lesson.id, week);
    it(`${id} plays ${lesson.id} in the forest chapter of week ${week}`, () => {
      const quest = quests.find((q) => q.id === id);
      if (!quest || quest.status === 'stub') throw new Error(`${id} is missing or not written in full`);
      expect(quest.lesson).toBe(lesson.id);
      expect(quest.region).toBe('khu-rung-bi-mat');
      // Chapter 1 is the forest's opening quest; week N of the book plays in chapter N + 1.
      expect(quest.chapter).toBe(week + 1);
      expect(quest.review).toBe('teacher-pending');
    });
  }

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

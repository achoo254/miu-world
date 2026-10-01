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

/**
 * Where each week of the book plays (story-map.md, "Chia lại 8 map"): the map's region and its chapter, one
 * chapter per week; the forest's chapter 1 is its opening quest.
 */
function placeOfWeek(week: number): { region: string; chapter: number } {
  if (week <= 4) return { region: 'lang-ven-song', chapter: week };
  if (week <= 7) return { region: 'truong-hoc', chapter: week - 3 };
  if (week <= 9) return { region: 'thu-vien', chapter: week - 7 };
  if (week <= 13) return { region: 'khu-rung-bi-mat', chapter: week - 8 };
  if (week <= 17) return { region: 'xom-mai-am', chapter: week - 13 };
  return { region: 'lau-dai', chapter: 3 };
}

describe('Tiếng Việt 2 quests', () => {
  it('play every lesson of the book, one quest per lesson', () => {
    expect(lessons).toHaveLength(34);
    const expected = lessons.map((l) => questIdFor(l.id, l.week ?? 0)).sort();
    expect(quests.map((q) => q.id).sort()).toEqual(expected);
  });

  for (const lesson of lessons) {
    const week = lesson.week ?? 0;
    const id = questIdFor(lesson.id, week);
    it(`${id} plays ${lesson.id} in the chapter of week ${week} on its map`, () => {
      const quest = quests.find((q) => q.id === id);
      if (!quest || quest.status === 'stub') throw new Error(`${id} is missing or not written in full`);
      expect(quest.lesson).toBe(lesson.id);
      expect({ region: quest.region, chapter: quest.chapter }).toEqual(placeOfWeek(week));
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

// Server responses for screen tests (progress, quest list), shaped like the real API DTOs.
import { QuestStepPublic } from '@miu/schema/content';
import type { ProgressResponse, QuestListResponse } from '@miu/schema/game';

export const PROGRESS: ProgressResponse = {
  quests: [],
  xp: 40,
  level: 1,
  xpIntoLevel: 40,
  xpForNextLevel: 100,
  coins: 12,
  skillXp: {},
  items: {},
  subjects: [],
};

const hello = QuestStepPublic.parse({ id: 'meet-parrot', title: 'Gặp Vẹt', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chào {name}!' }] });
const find = QuestStepPublic.parse({ id: 'find-clues', title: 'Tìm manh mối', kind: 'search', targets: ['clue-box'] });

/** Chapter 1 active with two steps (`done` of them finished), chapter 2 a stub. */
export function questList(done: number = 0): QuestListResponse {
  const completedSteps = [hello.id, find.id].slice(0, done);
  return {
    quests: [
      {
        quest: {
          id: 'forest-ch1',
          region: 'khu-rung-bi-mat',
          chapter: 1,
          title: 'Chương 1: Cứu cây cổ thụ',
          status: 'active',
          summary: '{name} đi tìm Lá thần.',
          texts: {},
          steps: [hello, find],
          reward: { xp: 100, coin: 20, skillXp: {}, items: {} },
          unlock: ['forest-ch2'],
        },
        state: done === 0 ? 'open' : done === 2 ? 'completed' : 'in-progress',
        progress: { questId: 'forest-ch1', completedSteps, completed: done === 2, found: {}, stars: done === 2 ? 3 : null },
      },
      {
        quest: { id: 'forest-ch2', region: 'khu-rung-bi-mat', chapter: 2, title: 'Chương 2', status: 'stub' },
        state: done === 2 ? 'open' : 'locked',
        progress: { questId: 'forest-ch2', completedSteps: [], completed: false, found: {}, stars: null },
      },
    ],
  };
}

/** `questList` plus an open textbook lesson in chapter 2 of the forest (no quest unlocks it). */
export function questListWithLesson(done: number = 0): QuestListResponse {
  const { quests } = questList(done);
  const lesson = {
    quest: {
      id: 'tv2-t01-b01',
      region: 'khu-rung-bi-mat',
      chapter: 2,
      title: 'Sâu Xanh vào lớp Hai',
      status: 'active' as const,
      summary: '{name} đi cùng Sâu Xanh.',
      texts: {},
      steps: [hello],
      reward: { xp: 80, coin: 15, skillXp: {}, items: {} },
      unlock: [],
      textbook: { book: 'Tiếng Việt 2, tập một', lesson: 'Bài 1. Tôi là học sinh lớp 2', pages: [10, 12] as [number, number] },
    },
    state: 'open' as const,
    progress: { questId: 'tv2-t01-b01', completedSteps: [], completed: false, found: {}, stars: null },
  };
  return { quests: [...quests, lesson] };
}

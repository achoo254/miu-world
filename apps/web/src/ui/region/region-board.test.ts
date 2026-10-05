import { describe, expect, it } from 'vitest';
import type { QuestSummary } from '@miu/schema/game';
import { questList } from '../player/test-fixtures';
import { boardTitle } from './region-detail';
import { boardStories, recommendedQuest, regionBooks, regionProgress } from './region-board';

const [ch1, ch2] = questList(0).quests as [QuestSummary, QuestSummary];
const as = (summary: QuestSummary, id: string, state: QuestSummary['state']): QuestSummary => ({ ...summary, quest: { ...summary.quest, id }, state });

describe('region board', () => {
  it('counts finished quests out of the real ones, leaving "coming soon" stubs out', () => {
    expect(regionProgress([ch1, ch2])).toEqual({ done: 0, total: 1 });
    expect(regionProgress([as(ch1, 'a', 'completed'), as(ch1, 'b', 'open'), ch2])).toEqual({ done: 1, total: 2 });
    expect(regionProgress([])).toEqual({ done: 0, total: 0 });
  });

  it('opens the quest under way first, then the next unfinished one, then one to play again', () => {
    const done = as(ch1, 'done', 'completed');
    const open = as(ch1, 'open', 'open');
    const going = as(ch1, 'going', 'in-progress');
    expect(recommendedQuest([done, open, going])?.quest.id).toBe('going');
    expect(recommendedQuest([done, open])?.quest.id).toBe('open');
    expect(recommendedQuest([done, ch2])?.quest.id).toBe('done');
    expect(recommendedQuest([ch2])).toBeNull();
  });

  it('names each book of a region\'s lessons once, spanning its lowest to its highest page', () => {
    const lesson = (id: string, region: string, book: string, pages: [number, number], status: 'active' | 'stub' = 'active'): QuestSummary =>
      ({ ...ch1, quest: { ...ch1.quest, id, region, status, textbook: { book, lesson: id, pages } } }) as QuestSummary;
    const quests = [
      lesson('a', 'lang-ven-song', 'Tiếng Việt 2, tập một', [10, 12]),
      lesson('b', 'lang-ven-song', 'Toán 2, tập một', [6, 7]),
      lesson('c', 'lang-ven-song', 'Tiếng Việt 2, tập một', [40, 43]),
      lesson('d', 'lang-ven-song', 'Tiếng Việt 2, tập một', [18, 20]),
      lesson('e', 'cho-phien', 'Toán 2, tập một', [50, 52]),
      lesson('f', 'lang-ven-song', 'Toán 2, tập một', [90, 91], 'stub'),
    ];
    expect(regionBooks(quests, 'lang-ven-song')).toEqual([
      { book: 'Tiếng Việt 2, tập một', pages: [10, 43], lessons: 3 },
      { book: 'Toán 2, tập một', pages: [6, 7], lessons: 1 },
    ]);
    expect(regionBooks(quests, 'trung-tam')).toEqual([]);
  });

  it('drops the region from a quest title on that region\'s own board', () => {
    expect(boardTitle('Khu rừng bí mật – Chương 1: Lá thần', 'Khu rừng bí mật')).toBe('Chương 1: Lá thần');
    expect(boardTitle('Thử dẫn đường', 'Khu rừng bí mật')).toBe('Thử dẫn đường');
  });

  it('groups the story chapters by story and never counts them as lessons', () => {
    const story = (id: string, part: number, state: QuestSummary['state']): QuestSummary => {
      const base = as(ch1, id, state);
      if (base.quest.status !== 'active') throw new Error('fixture');
      return { ...base, quest: { ...base.quest, category: 'story', story: { npc: 'hoa-mi', npcName: 'Họa Mi', arc: 'bai-ca', arcTitle: { vi: 'Bài ca', en: 'The song' }, part, parts: 2, hearts: 0 } } };
    };
    const list = [as(ch1, 'bai-1', 'completed'), story('yarn-bai-ca-1', 1, 'completed'), story('yarn-bai-ca-2', 2, 'open')];
    expect(regionProgress(list)).toEqual({ done: 1, total: 1 });
    const [group] = boardStories(list, ch1.quest.region);
    expect(group?.npcName).toBe('Họa Mi');
    expect(group?.chapters.map((q) => q.quest.id)).toEqual(['yarn-bai-ca-1', 'yarn-bai-ca-2']);
  });
});

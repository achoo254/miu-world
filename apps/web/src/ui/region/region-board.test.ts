import { describe, expect, it } from 'vitest';
import type { QuestSummary } from '@miu/schema/game';
import { questList } from '../player/test-fixtures';
import { boardTitle } from './region-detail';
import { recommendedQuest, regionProgress } from './region-board';

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

  it('drops the region from a quest title on that region\'s own board', () => {
    expect(boardTitle('Khu rừng bí mật – Chương 1: Lá thần', 'Khu rừng bí mật')).toBe('Chương 1: Lá thần');
    expect(boardTitle('Thử dẫn đường', 'Khu rừng bí mật')).toBe('Thử dẫn đường');
  });
});

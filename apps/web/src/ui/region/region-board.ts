// What the region screen shows about a region's quests (mock M2.1): how many are done, and which one
// "Khám phá ngay" opens. Pure functions over the server's quest list, the same for every region.
import type { QuestSummary } from '@miu/schema/game';

/** A quest the child can open now: real content (not a "coming soon" stub) that is not locked. */
export const isPlayable = (summary: QuestSummary): boolean => summary.quest.status !== 'stub' && summary.state !== 'locked';

/** Finished quests out of the region's real ones ("Hoàn thành: 4/12"); stubs are not counted. */
export function regionProgress(quests: readonly QuestSummary[]): { done: number; total: number } {
  const real = quests.filter((q) => q.quest.status !== 'stub');
  return { done: real.filter((q) => q.state === 'completed').length, total: real.length };
}

/**
 * The quest "Khám phá ngay" opens: the one under way, else the first open one not finished yet, else
 * the first playable one (to play a finished region again); null when nothing can be played.
 */
export function recommendedQuest(quests: readonly QuestSummary[]): QuestSummary | null {
  const playable = quests.filter(isPlayable);
  return (
    playable.find((q) => q.state === 'in-progress') ??
    playable.find((q) => q.state !== 'completed') ??
    playable[0] ??
    null
  );
}

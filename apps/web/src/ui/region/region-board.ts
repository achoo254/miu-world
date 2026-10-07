// What the region screen shows about a region's quests (mock M2.1): how many are done, and which one
// "Khám phá ngay" opens. Pure functions over the server's quest list, the same for every region.
import type { QuestSummary } from '@miu/schema/game';

/** A quest the child can open now: real content, not a "coming soon" stub (no quest is ever locked). */
export const isPlayable = (summary: QuestSummary): boolean => summary.quest.status !== 'stub';

/** A chapter of a character's story (listed after the lessons, never counted as one). */
export const isStory = (summary: QuestSummary): boolean => summary.quest.status === 'active' && summary.quest.category === 'story';

/** A zone guardian's fight (listed after the lessons under the zone guardians, never counted as a lesson). */
export const isGuardian = (summary: QuestSummary): boolean => summary.quest.status === 'active' && summary.quest.category === 'guardian';

/** A quest of a limited-time event on now (listed under the event, never counted as a lesson). */
export const isEvent = (summary: QuestSummary): boolean => summary.quest.status === 'active' && summary.quest.category === 'event';

/** Finished lessons out of the region's real ones ("Hoàn thành: 4/12"); stubs, story chapters, guardians and event quests are not counted. */
export function regionProgress(quests: readonly QuestSummary[]): { done: number; total: number } {
  const real = quests.filter((q) => q.quest.status !== 'stub' && !isStory(q) && !isGuardian(q) && !isEvent(q));
  return { done: real.filter((q) => q.state === 'completed').length, total: real.length };
}

/**
 * The quest "Khám phá ngay" opens: the one under way, else the first open one not finished yet, else
 * the first playable one (to play a finished region again); null when nothing can be played.
 */
export function recommendedQuest(quests: readonly QuestSummary[]): QuestSummary | null {
  // The lessons first; a story chapter only once every lesson is finished (its character offers it in the game). A
  // zone guardian is never recommended: the child meets it in its zone, or picks it on the board.
  const playable = [...quests.filter((q) => isPlayable(q) && !isStory(q) && !isGuardian(q) && !isEvent(q)), ...quests.filter(isStory)];
  return (
    playable.find((q) => q.state === 'in-progress' && !isStory(q)) ??
    playable.find((q) => q.state !== 'completed') ??
    playable[0] ??
    null
  );
}

/** A book a region's lessons come from: its name ("Toán 2, tập một"), the pages they span, how many lessons. */
export interface RegionBook {
  book: string;
  pages: [number, number];
  lessons: number;
}

/**
 * The textbooks behind a region's lessons, for the world map's quick facts (owner, 03/10/2026: which book and
 * which pages each map covers): one entry per book, in the order its first lesson comes, spanning the lowest
 * to the highest page of its active lessons.
 */
export function regionBooks(quests: readonly QuestSummary[], region: string): RegionBook[] {
  const books = new Map<string, RegionBook>();
  for (const summary of quests) {
    const textbook = summary.quest.status === 'active' && summary.quest.region === region ? summary.quest.textbook : undefined;
    if (!textbook) continue;
    const [from, to] = textbook.pages;
    const known = books.get(textbook.book);
    if (known) books.set(textbook.book, { book: textbook.book, pages: [Math.min(known.pages[0], from), Math.max(known.pages[1], to)], lessons: known.lessons + 1 });
    else books.set(textbook.book, { book: textbook.book, pages: [from, to], lessons: 1 });
  }
  return [...books.values()];
}

/** A character's story on the board: its chapters in order, under "Chuyện của <tên>". */
export interface BoardStory {
  npc: string;
  npcName: string;
  arc: string;
  arcTitle: { vi: string; en: string };
  chapters: QuestSummary[];
}

/** The region's story chapters grouped by story, in list order. */
export function boardStories(quests: readonly QuestSummary[], region: string): BoardStory[] {
  const stories = new Map<string, BoardStory>();
  for (const summary of quests) {
    const story = summary.quest.status === 'active' && summary.quest.region === region ? summary.quest.story : undefined;
    if (!story) continue;
    const known = stories.get(story.arc);
    if (known) known.chapters.push(summary);
    else stories.set(story.arc, { npc: story.npc, npcName: story.npcName, arc: story.arc, arcTitle: story.arcTitle, chapters: [summary] });
  }
  return [...stories.values()];
}

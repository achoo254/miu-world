// What the public lesson pages (`/bai/<slug>/`) say, read from the repo for the build and the share-card generator:
// the lessons from the books' tables of contents, the quests from `content/quests`, the region names.
//
// Quest files hold the answers, so a page may take nothing from one but the fields `pickQuestPageFields` names. It is
// the only code here that reads a quest, and it reads those keys and no others (never `steps`, `review`, `texts`,
// `sevenQuestions`, `reward`); `pnpm security:dist` is only the second net.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { CurriculumBook, BOOK_IDS } from '../../packages/schema/src/curriculum.ts';
import { lessonPages, type LessonPage } from '../../packages/schema/src/lesson-pages.ts';
import { RegionCatalog } from '../../packages/schema/src/region.ts';

/** How a page calls the player where quest text says `{name}`. */
const PLAYER_WORD = 'bé';

/**
 * Quest text with `{name}` filled for a reader who is nobody in particular: "Bé" where a sentence starts, "bé" in
 * the middle of one.
 */
export function fillPlayerName(text: string): string {
  const capital = PLAYER_WORD.charAt(0).toUpperCase() + PLAYER_WORD.slice(1);
  return text.replace(/(^|[.!?…]\s+)\{name\}/g, `$1${capital}`).replaceAll('{name}', PLAYER_WORD);
}

/** The one view of a quest a public page gets. */
export interface QuestPageFields {
  /** Names the quest in the page's "play this lesson" link. */
  id: string;
  /** The textbook lesson the quest plays: which page lists it. */
  lesson: string;
  title: string;
  summary: string;
  /** Region id (the page shows the region's name). */
  region: string;
}

/**
 * The allowlisted fields of a quest file, or null for one that is not an active quest of a textbook lesson. Anything
 * not named here stays unread: add a key only for text that is safe to show every visitor.
 */
export function pickQuestPageFields(raw: unknown): QuestPageFields | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { id, status, lesson, title, summary, region } = raw as Record<string, unknown>;
  if (status !== 'active') return null;
  if (typeof id !== 'string' || typeof lesson !== 'string' || typeof title !== 'string' || typeof summary !== 'string' || typeof region !== 'string') return null;
  return { id, lesson, title: fillPlayerName(title), summary: fillPlayerName(summary), region };
}

/** The lesson-bearing, active quests of a quest folder, by id. */
export function readQuestPageFields(questDir: string): QuestPageFields[] {
  return readdirSync(questDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => {
      const picked = pickQuestPageFields(JSON.parse(readFileSync(path.join(questDir, file), 'utf8')) as unknown);
      return picked ? [picked] : [];
    });
}

/** What one lesson page lists: an activity of the game that plays the lesson. */
export interface LessonActivity extends QuestPageFields {
  regionName: string;
}

export interface LessonPageData extends LessonPage {
  /** The game's quests that play this lesson (at least one), by id. */
  activities: LessonActivity[];
}

/** The lesson pages the repo's content gives, in book order (the pages' previous/next order). */
export function readLessonPageData(contentDir: string): LessonPageData[] {
  const books = BOOK_IDS.flatMap((id) => {
    const file = path.join(contentDir, 'curriculum', id, 'book.json');
    try {
      return [CurriculumBook.parse(JSON.parse(readFileSync(file, 'utf8')))];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  });
  const regions = new Map(RegionCatalog.parse(JSON.parse(readFileSync(path.join(contentDir, 'world/regions.json'), 'utf8'))).regions.map((r) => [r.id, fillPlayerName(r.name)]));
  const quests = readQuestPageFields(path.join(contentDir, 'quests'));
  return lessonPages(books, new Set(quests.map((q) => q.lesson))).map((page) => ({
    ...page,
    activities: quests
      .filter((q) => q.lesson === page.lessonId)
      .map((q) => ({ ...q, regionName: regions.get(q.region) ?? q.region })),
  }));
}

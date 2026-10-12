// The public page of a textbook lesson (`/bai/<slug>/`), named the way the build names it: from the lesson's printed
// title in the book's table of contents. A quest tells the game its lesson as printed (`textbook`: book and lesson
// title), so that is what is looked up. A quest that plays no textbook lesson, or a lesson with no page, has none.
import type { QuestTextbook } from '@miu/schema/game';
import { lessonPages, type BookToc } from '@miu/schema/lesson-pages';
import toan2 from '../../../../../content/curriculum/toan2-t1/book.json';
import tv2 from '../../../../../content/curriculum/tv2-t1/book.json';

const BOOKS: ReadonlyArray<BookToc & { title: string }> = [toan2, tv2];

export interface LessonPageRef {
  slug: string;
  /** The textbook lesson's id, the label the usage numbers use for it. */
  lessonId: string;
}

export function lessonPageOf(textbook: Pick<QuestTextbook, 'book' | 'lesson'> | undefined): LessonPageRef | null {
  if (!textbook) return null;
  const book = BOOKS.find((b) => b.title === textbook.book);
  const lesson = book?.toc.flatMap((unit) => unit.lessons).find((l) => l.title === textbook.lesson);
  const page = book && lesson ? lessonPages([book], new Set([lesson.id]))[0] : undefined;
  return page ? { slug: page.slug, lessonId: page.lessonId } : null;
}

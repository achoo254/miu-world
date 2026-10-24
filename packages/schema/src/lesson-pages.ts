// The public lesson pages (`/bai/<slug>/`): one per textbook lesson that a shipped quest plays, plus one page per
// subject (`/bai/toan-2/`, `/bai/tieng-viet-2/`). The static pages the web build writes, the analytics route table and
// the web app's links all name a page through this module, so a slug is spelled one way everywhere. A slug is read off
// the table of contents (`content/curriculum/<book>/book.json`): the subject plus the lesson's printed title, so it
// stays the same until the book's own title changes. Plain data and string work only, no file access.
import type { BookId } from './curriculum';

/** The subjects that have pages, in the order the pages list them. */
export const LESSON_SUBJECTS = [
  { slug: 'toan-2', bookId: 'toan2-t1', name: 'Toán 2' },
  { slug: 'tieng-viet-2', bookId: 'tv2-t1', name: 'Tiếng Việt 2' },
] as const satisfies ReadonlyArray<{ slug: string; bookId: BookId; name: string }>;
export type LessonSubject = (typeof LESSON_SUBJECTS)[number];

/** Where the pages live. */
export const LESSON_PAGES_ROOT = '/bai';

/** The subject pages' slugs (a lesson slug never equals one: it carries the lesson's title after the subject). */
export const SUBJECT_SLUGS: readonly string[] = LESSON_SUBJECTS.map((subject) => subject.slug);

/** `/bai/toan-2/` */
export const subjectPagePath = (subject: LessonSubject): string => `${LESSON_PAGES_ROOT}/${subject.slug}/`;

/** `/bai/toan-2-bai-1-on-tap-cac-so-den-100/` */
export const lessonPagePath = (slug: string): string => `${LESSON_PAGES_ROOT}/${slug}/`;

/** Lower-case ASCII words joined by hyphens ("Ôn tập, đếm" → "on-tap-dem"). */
export function asciiSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The part of a book's table of contents a slug and a page need; `CurriculumBook` fits it. */
export interface BookToc {
  id: string;
  toc: ReadonlyArray<{ title: string; lessons: ReadonlyArray<{ id: string; title: string; page: number }> }>;
}

export interface LessonPage {
  slug: string;
  lessonId: string;
  subject: LessonSubject;
  /** As printed ("Bài 1. Ôn tập các số đến 100"; "Ôn tập giữa học kì 1" for a review). */
  title: string;
  /** The topic or theme the lesson belongs to, as printed. */
  unit: string;
  /** Printed page the lesson starts on. */
  page: number;
}

/** A printed lesson title split into its number label and its name: "Bài 1. Ôn tập" → "Bài 1" and "Ôn tập". */
export function splitLessonTitle(title: string): { label: string | null; name: string } {
  const match = /^(Bài \d+)\.\s*(.+)$/.exec(title);
  return match?.[1] && match[2] ? { label: match[1], name: match[2] } : { label: null, name: title };
}

/**
 * The lessons that get a page: those of `lessonsWithQuests` (the ids of the lessons an active quest plays), in
 * book order. A slug used twice would make one page hide the other, so it is an error.
 */
export function lessonPages(books: readonly BookToc[], lessonsWithQuests: ReadonlySet<string>): LessonPage[] {
  const pages: LessonPage[] = [];
  const seen = new Map<string, string>();
  for (const subject of LESSON_SUBJECTS) {
    const book = books.find((b) => b.id === subject.bookId);
    if (!book) continue;
    for (const unit of book.toc) {
      for (const lesson of unit.lessons) {
        if (!lessonsWithQuests.has(lesson.id)) continue;
        const slug = `${subject.slug}-${asciiSlug(lesson.title)}`;
        const clash = seen.get(slug);
        if (clash !== undefined) throw new Error(`lessons ${clash} and ${lesson.id} would share the page /bai/${slug}`);
        seen.set(slug, lesson.id);
        pages.push({ slug, lessonId: lesson.id, subject, title: lesson.title, unit: unit.title, page: lesson.page });
      }
    }
  }
  return pages;
}

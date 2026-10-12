// The weekly clip schedule (`content/marketing/clip-schedule.json`): for each school week of the first semester, one
// Toán 2 lesson and one Tiếng Việt 2 lesson whose clip goes out that week. `pnpm marketing:schedule` plans it again
// from the books' tables of contents: a lesson keeps the school week the book gives it (Tiếng Việt), the others are
// spread evenly over the weeks in book order, and each week takes the first lesson that is not a revision lesson
// (revision lessons make a poor title). Only lessons that have a public page (an active quest plays them) count,
// because the clip's end card and caption link to that page.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { CurriculumBook, BOOK_IDS } from '../../packages/schema/src/curriculum';
import { LESSON_SUBJECTS, splitLessonTitle } from '../../packages/schema/src/lesson-pages';
import { readLessonPageData } from '../../apps/web/lesson-page-data';
import { REPO_ROOT } from '../assets/asset-lib';

export const SCHEDULE_PATH = path.join(REPO_ROOT, 'content/marketing/clip-schedule.json');
/** The school's calendar zone: "this week" means the week on the wall in Vietnam. */
export const SCHEDULE_TIME_ZONE = 'Asia/Saigon';
/** Monday of school week 1 (2026–2027 school year, first semester). */
export const FIRST_MONDAY = '2026-09-07';
/** Weeks of the first semester (week 18 ends on Sunday 10/01/2027, mid-January). */
export const SEMESTER_WEEKS = 18;

const SUBJECT_SLUGS = LESSON_SUBJECTS.map((subject) => subject.slug) as [string, ...string[]];
const SubjectSlug = z.enum(SUBJECT_SLUGS);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ClipSchedule = z.strictObject({
  version: z.literal(1),
  timeZone: z.literal(SCHEDULE_TIME_ZONE),
  /** Free text for people reading the file. */
  semester: z.string().min(1),
  weeks: z
    .array(
      z.strictObject({
        week: z.number().int().min(1),
        /** The Monday the week starts on (yyyy-mm-dd, Vietnam time). */
        monday: IsoDate,
        /** Lesson id (`toan2-t1-b07`) per subject page slug. */
        lessons: z.record(SubjectSlug, z.string().min(1)),
      }),
    )
    .min(1),
});
export type ClipSchedule = z.infer<typeof ClipSchedule>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `2026-09-07` plus `days` days (calendar arithmetic on the date alone, so no zone or daylight saving matters). */
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The calendar date in Vietnam at `now`, as yyyy-mm-dd. */
export function dateInSchool(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SCHEDULE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Problems that make a schedule unusable (empty when it is sound): weeks out of order, a Monday off the weekly grid, a lesson used twice. */
export function scheduleIssues(schedule: ClipSchedule): string[] {
  const issues: string[] = [];
  const used = new Map<string, number>();
  schedule.weeks.forEach((entry, index) => {
    if (entry.week !== index + 1) issues.push(`week ${entry.week} stands at position ${index + 1}`);
    if (entry.monday !== addDays(schedule.weeks[0]?.monday ?? entry.monday, 7 * index)) issues.push(`week ${entry.week}: ${entry.monday} is not a Monday seven days after the one before`);
    if (new Date(`${entry.monday}T00:00:00Z`).getUTCDay() !== 1) issues.push(`week ${entry.week}: ${entry.monday} is not a Monday`);
    for (const [subject, lesson] of Object.entries(entry.lessons)) {
      const earlier = used.get(lesson);
      if (earlier !== undefined) issues.push(`lesson ${lesson} (${subject}) is in week ${earlier} and week ${entry.week}`);
      used.set(lesson, entry.week);
    }
  });
  return issues;
}

/** The week that holds `today` (yyyy-mm-dd), or null before the first Monday and after the last Sunday. */
export function weekOf(schedule: ClipSchedule, today: string): ClipSchedule['weeks'][number] | null {
  return schedule.weeks.find((entry) => today >= entry.monday && today < addDays(entry.monday, 7)) ?? null;
}

export function readClipSchedule(file: string = SCHEDULE_PATH): ClipSchedule {
  const schedule = ClipSchedule.parse(JSON.parse(readFileSync(file, 'utf8')));
  const issues = scheduleIssues(schedule);
  if (issues.length > 0) throw new Error(`${path.relative(REPO_ROOT, file)}: ${issues.join('; ')}`);
  return schedule;
}

interface PlannedLesson {
  id: string;
  title: string;
  /** School week the book gives the lesson, when it does. */
  week?: number;
}

const isRevision = (title: string): boolean => /^(Luyện tập chung|Ôn tập)/.test(splitLessonTitle(title).name);

/** One lesson per week from a subject's lessons in book order: see the file header for the rule. */
function pickPerWeek(lessons: readonly PlannedLesson[], weeks: number): PlannedLesson[] {
  const byWeek: PlannedLesson[][] = Array.from({ length: weeks }, () => []);
  lessons.forEach((lesson, index) => {
    const week = lesson.week ?? Math.floor((index * weeks) / lessons.length) + 1;
    byWeek[Math.min(week, weeks) - 1]?.push(lesson);
  });
  return byWeek.map((group, index) => {
    const lesson = group.find((l) => !isRevision(l.title)) ?? group[0];
    if (!lesson) throw new Error(`no lesson falls in school week ${index + 1}`);
    return lesson;
  });
}

/** The schedule the books give: `lessonsWithPages` are the ids of the lessons that have a public page. */
export function planClipSchedule(books: readonly CurriculumBook[], lessonsWithPages: ReadonlySet<string>): ClipSchedule {
  const picks = LESSON_SUBJECTS.map((subject) => {
    const book = books.find((b) => b.id === subject.bookId);
    if (!book) throw new Error(`book ${subject.bookId} is missing`);
    const lessons = book.toc.flatMap((unit) => unit.lessons).filter((lesson) => lessonsWithPages.has(lesson.id));
    return [subject.slug, pickPerWeek(lessons, SEMESTER_WEEKS)] as const;
  });
  return {
    version: 1,
    timeZone: SCHEDULE_TIME_ZONE,
    semester: 'Học kì I năm học 2026–2027 (từ thứ Hai 07/09/2026 đến giữa tháng 1/2027)',
    weeks: Array.from({ length: SEMESTER_WEEKS }, (_, index) => ({
      week: index + 1,
      monday: addDays(FIRST_MONDAY, 7 * index),
      lessons: Object.fromEntries(picks.map(([slug, lessons]) => [slug, lessons[index]?.id ?? ''])),
    })),
  };
}

function main(): void {
  const contentDir = path.join(REPO_ROOT, 'content');
  const books = BOOK_IDS.map((id) => CurriculumBook.parse(JSON.parse(readFileSync(path.join(contentDir, 'curriculum', id, 'book.json'), 'utf8'))));
  const lessonsWithPages = new Set(readLessonPageData(contentDir).map((page) => page.lessonId));
  const schedule = planClipSchedule(books, lessonsWithPages);
  const issues = scheduleIssues(schedule);
  if (issues.length > 0) throw new Error(issues.join('; '));
  writeFileSync(SCHEDULE_PATH, `${JSON.stringify(schedule, null, 2)}\n`);
  console.log(`clip-schedule: ${schedule.weeks.length} weeks in ${path.relative(REPO_ROOT, SCHEDULE_PATH)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

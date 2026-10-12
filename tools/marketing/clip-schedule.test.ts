import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CurriculumBook } from '../../packages/schema/src/curriculum';
import { LESSON_SUBJECTS } from '../../packages/schema/src/lesson-pages';
import { readLessonPageData } from '../../apps/web/lesson-page-data';
import { REPO_ROOT } from '../assets/asset-lib';
import { ClipSchedule, FIRST_MONDAY, SEMESTER_WEEKS, addDays, dateInSchool, planClipSchedule, readClipSchedule, scheduleIssues, weekOf } from './clip-schedule';

const schedule = readClipSchedule();
const pages = readLessonPageData(path.join(REPO_ROOT, 'content'));

/** A book of `count` lessons, a unit of two lessons at a time, the ones in `revision` titled as revision lessons. */
function book(id: 'toan2-t1' | 'tv2-t1', count: number, revision: readonly number[] = [], weeks = false): CurriculumBook {
  const lessons = Array.from({ length: count }, (_, i) => ({
    id: `${id}-b${String(i + 1).padStart(2, '0')}`,
    title: revision.includes(i + 1) ? `Bài ${i + 1}. Ôn tập chung` : `Bài ${i + 1}. Tên bài ${i + 1}`,
    page: i + 1,
    ...(weeks ? { week: Math.floor(i / 2) + 1 } : {}),
  }));
  return CurriculumBook.parse({
    id,
    title: id,
    publisher: 'NXB',
    edition: 'Kết nối tri thức với cuộc sống, 2021',
    pdfPageOffset: 1,
    status: 'complete',
    contentPages: [1, count],
    toc: [{ id: `${id}-chu-de-1`, number: 1, title: 'Chủ đề', page: 1, lessons }],
  });
}

describe('the committed schedule', () => {
  it('is sound: a week per Monday from 07/09/2026 to mid-January 2027, no lesson twice', () => {
    expect(scheduleIssues(schedule)).toEqual([]);
    expect(schedule.weeks).toHaveLength(SEMESTER_WEEKS);
    expect(schedule.weeks[0]?.monday).toBe(FIRST_MONDAY);
    const last = schedule.weeks.at(-1);
    expect(last?.monday).toBe('2027-01-04');
    expect(addDays(last?.monday ?? '', 6)).toBe('2027-01-10');
  });

  it('gives every week one lesson per subject, each a lesson of that subject that has a public page', () => {
    const subjectOfLesson = new Map(pages.map((page) => [page.lessonId, page.subject.slug]));
    for (const entry of schedule.weeks) {
      expect(Object.keys(entry.lessons).sort(), `week ${entry.week}`).toEqual(LESSON_SUBJECTS.map((s) => s.slug).sort());
      for (const [subject, lesson] of Object.entries(entry.lessons)) expect(subjectOfLesson.get(lesson), `week ${entry.week} ${lesson}`).toBe(subject);
    }
  });

  it('keeps a Tiếng Việt lesson in the school week the book gives it', () => {
    const weekOfLesson = new Map(
      CurriculumBook.parse(JSON.parse(readFileSync(path.join(REPO_ROOT, 'content/curriculum/tv2-t1/book.json'), 'utf8'))).toc.flatMap((unit) => unit.lessons.map((l) => [l.id, l.week] as const)),
    );
    for (const entry of schedule.weeks) expect(weekOfLesson.get(entry.lessons['tieng-viet-2'] ?? ''), `week ${entry.week}`).toBe(entry.week);
  });

  it('is rejected by the schema when it carries an unknown field or subject', () => {
    expect(ClipSchedule.safeParse({ ...schedule, extra: 1 }).success).toBe(false);
    expect(ClipSchedule.safeParse({ ...schedule, weeks: [{ week: 1, monday: FIRST_MONDAY, lessons: { 'su-2': 'x' } }] }).success).toBe(false);
  });
});

describe('weeks and dates', () => {
  it('finds the week of a date, Sunday included, and none outside the semester', () => {
    expect(weekOf(schedule, '2026-09-07')?.week).toBe(1);
    expect(weekOf(schedule, '2026-09-13')?.week).toBe(1);
    expect(weekOf(schedule, '2026-09-14')?.week).toBe(2);
    expect(weekOf(schedule, '2027-01-10')?.week).toBe(18);
    expect(weekOf(schedule, '2026-09-06')).toBeNull();
    expect(weekOf(schedule, '2027-01-11')).toBeNull();
  });

  it('reads the date on the wall in Vietnam, not in UTC', () => {
    expect(dateInSchool(new Date('2026-10-11T16:59:59Z'))).toBe('2026-10-11');
    expect(dateInSchool(new Date('2026-10-11T17:00:00Z'))).toBe('2026-10-12');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-09-07', 0)).toBe('2026-09-07');
  });

  it('spots a Monday off the weekly grid and a lesson used twice', () => {
    const [first, second] = schedule.weeks;
    if (!first || !second) throw new Error('schedule too short');
    expect(scheduleIssues({ ...schedule, weeks: [first, { ...second, monday: '2026-09-15' }] })).not.toEqual([]);
    expect(scheduleIssues({ ...schedule, weeks: [first, { ...second, lessons: first.lessons }] }).join(' ')).toContain('is in week 1 and week 2');
  });
});

describe('planning', () => {
  const all = (books: CurriculumBook[]): Set<string> => new Set(books.flatMap((b) => b.toc.flatMap((u) => u.lessons.map((l) => l.id))));

  it('spreads the lessons of a book without weeks evenly over the weeks and skips revision lessons', () => {
    const books = [book('toan2-t1', 36, [1]), book('tv2-t1', 36, [], true)];
    const planned = planClipSchedule(books, all(books));
    expect(planned.weeks).toHaveLength(SEMESTER_WEEKS);
    expect(planned.weeks[0]?.lessons['toan-2']).toBe('toan2-t1-b02');
    expect(planned.weeks[1]?.lessons['toan-2']).toBe('toan2-t1-b03');
    expect(planned.weeks[17]?.lessons['toan-2']).toBe('toan2-t1-b35');
    expect(planned.weeks[4]?.lessons['tieng-viet-2']).toBe('tv2-t1-b09');
    expect(scheduleIssues(planned)).toEqual([]);
  });

  it('leaves out a lesson with no page and fails when a week is left with no lesson', () => {
    const books = [book('toan2-t1', 36), book('tv2-t1', 36, [], true)];
    const without = all(books);
    without.delete('toan2-t1-b01');
    expect(planClipSchedule(books, without).weeks[0]?.lessons['toan-2']).toBe('toan2-t1-b02');
    const empty = all(books);
    for (const id of ['tv2-t1-b01', 'tv2-t1-b02']) empty.delete(id);
    expect(() => planClipSchedule(books, empty)).toThrow(/no lesson falls in school week/);
  });
});

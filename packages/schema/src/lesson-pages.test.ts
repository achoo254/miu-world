import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CurriculumBook } from './curriculum';
import { asciiSlug, lessonPagePath, lessonPages, splitLessonTitle, subjectPagePath, LESSON_SUBJECTS, SUBJECT_SLUGS, type BookToc } from './lesson-pages';

const readBook = (id: string): CurriculumBook => CurriculumBook.parse(JSON.parse(readFileSync(new URL(`../../../content/curriculum/${id}/book.json`, import.meta.url), 'utf8')));
const BOOKS = [readBook('toan2-t1'), readBook('tv2-t1')];
const EVERY_LESSON = new Set(BOOKS.flatMap((book) => book.toc.flatMap((unit) => unit.lessons.map((lesson) => lesson.id))));

describe('asciiSlug', () => {
  it('writes Vietnamese as lower-case ASCII words', () => {
    expect(asciiSlug('Bài 1. Ôn tập các số đến 100')).toBe('bai-1-on-tap-cac-so-den-100');
    expect(asciiSlug('Đường đi, đỉnh Đà Lạt!')).toBe('duong-di-dinh-da-lat');
    expect(asciiSlug('  (không nhớ)  ')).toBe('khong-nho');
  });
});

describe('lesson pages of the shipped books', () => {
  const pages = lessonPages(BOOKS, EVERY_LESSON);

  it('names the pages the plan gives as examples', () => {
    const slugs = new Map(pages.map((page) => [page.lessonId, page.slug]));
    expect(slugs.get('toan2-t1-b01')).toBe('toan-2-bai-1-on-tap-cac-so-den-100');
    expect(slugs.get('tv2-t1-b01')).toBe('tieng-viet-2-bai-1-toi-la-hoc-sinh-lop-2');
    expect(slugs.get('tv2-t1-on-giua-ki')).toBe('tieng-viet-2-on-tap-giua-hoc-ki-1');
  });

  it('gives every lesson one unique, readable ASCII slug that is not a subject page', () => {
    expect(pages).toHaveLength(EVERY_LESSON.size);
    expect(new Set(pages.map((page) => page.slug)).size).toBe(pages.length);
    for (const page of pages) {
      expect(page.slug, page.lessonId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(SUBJECT_SLUGS).not.toContain(page.slug);
      expect(page.slug.startsWith(`${page.subject.slug}-`)).toBe(true);
    }
  });

  it('lists the pages in book order and only for the lessons asked for', () => {
    expect(pages.map((page) => page.subject.slug).filter((slug, i, all) => all.indexOf(slug) === i)).toEqual(LESSON_SUBJECTS.map((subject) => subject.slug));
    const some = lessonPages(BOOKS, new Set(['tv2-t1-b02', 'toan2-t1-b03', 'unknown-lesson']));
    expect(some.map((page) => page.lessonId)).toEqual(['toan2-t1-b03', 'tv2-t1-b02']);
    expect(some[0]).toMatchObject({ unit: 'Ôn tập và bổ sung', page: 13, title: 'Bài 3. Các thành phần của phép cộng, phép trừ' });
  });

  it('refuses two lessons that would share a page', () => {
    const twins: BookToc = { id: 'toan2-t1', toc: [{ title: 'Chủ đề', lessons: [{ id: 'a', title: 'Bài 1. Cộng', page: 1 }, { id: 'b', title: 'bài 1 - cộng', page: 2 }] }] };
    expect(() => lessonPages([twins], new Set(['a', 'b']))).toThrow(/would share the page/);
  });

  it('builds the page addresses', () => {
    expect(subjectPagePath(LESSON_SUBJECTS[0])).toBe('/bai/toan-2/');
    expect(lessonPagePath('toan-2-bai-1-on-tap-cac-so-den-100')).toBe('/bai/toan-2-bai-1-on-tap-cac-so-den-100/');
  });
});

describe('splitLessonTitle', () => {
  it('splits a numbered lesson and leaves a review whole', () => {
    expect(splitLessonTitle('Bài 12. Danh sách học sinh')).toEqual({ label: 'Bài 12', name: 'Danh sách học sinh' });
    expect(splitLessonTitle('Ôn tập giữa học kì 1')).toEqual({ label: null, name: 'Ôn tập giữa học kì 1' });
  });
});

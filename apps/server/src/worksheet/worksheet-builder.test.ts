import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildWorksheets, loadWorksheets } from './worksheet-builder';
import { readCurriculum } from './curriculum-books';

const FIXTURES = fileURLToPath(new URL('../../test/fixtures/curriculum', import.meta.url));

describe('worksheet builder', () => {
  const sheets = buildWorksheets(readCurriculum(FIXTURES).books);

  it('turns the writing sections of a Tiếng Việt lesson into blocks, wording unchanged', () => {
    expect(sheets.get('tv2-t1-b02')?.blocks).toEqual([
      {
        kind: 'dictation',
        prompt: 'Nghe – viết: Ngày hôm qua đâu rồi? (2 khổ thơ đầu)',
        title: 'Ngày hôm qua đâu rồi?',
        text: 'Em cầm tờ lịch cũ',
        page: 14,
        curriculumRef: ['tv2-t1-b02-nghe-viet-1'],
      },
      {
        kind: 'paragraph-prompt',
        prompt: 'Viết 2 – 3 câu giới thiệu bản thân.',
        hints: ['G: Em tên là gì?', 'G: Em học lớp mấy?'],
        lines: 6,
        page: 16,
        curriculumRef: ['tv2-t1-b02-viet-doan-1'],
      },
    ]);
    expect(sheets.get('tv2-t1-b03')?.blocks.map((b) => b.kind)).toEqual(['letter', 'copy-line']);
    expect(sheets.get('tv2-t1-b03')).toMatchObject({ bookId: 'tv2-t1', week: 2, pages: [17, 19], title: 'Bài 3. Niềm vui của Bi và Bống' });
  });

  it('keeps only the hands-on activity of a math lesson and skips lessons with nothing to write', () => {
    expect(sheets.get('toan2-t1-b17')?.blocks).toEqual([
      { kind: 'activity', prompt: 'Cân một số đồ vật trong nhà.', media: ['cân đồng hồ', 'túi gạo'], page: 66, curriculumRef: ['toan2-t1-b17-hoat-dong-1'] },
    ]);
    expect(sheets.has('toan2-t1-b18')).toBe(false);
  });

  it('builds from the shipped inventory without errors', () => {
    expect(() => loadWorksheets()).not.toThrow();
  });
});

import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildWorksheets, lettersOf, loadWorksheets, modelOf } from './worksheet-builder';
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

  it('finds the capitals to write in the prompt, or in the picture of the model when the prompt has none', () => {
    const item = { id: 'x', page: 1, exerciseType: 'viet-chu' as const, readConfidence: 'high' as const };
    expect(lettersOf({ ...item, prompt: 'Viết chữ hoa: I, K' })).toEqual(['I', 'K']);
    expect(lettersOf({ ...item, prompt: 'Viết chữ hoa Ă, Â.' })).toEqual(['Ă', 'Â']);
    const pictured = ['mẫu chữ hoa Ô cỡ vừa trên ô li có đánh số nét 1, 2, 3', 'mẫu chữ hoa Ô cỡ nhỏ', 'mẫu chữ hoa Ơ cỡ vừa'];
    expect(lettersOf({ ...item, prompt: 'Viết chữ hoa:', media: pictured })).toEqual(['Ô', 'Ơ']);
    expect(modelOf('Viết ứng dụng: Dung dăng dung dẻ\nDắt trẻ đi chơi.')).toEqual(['Dung dăng dung dẻ', 'Dắt trẻ đi chơi.']);
    expect(modelOf('Ăn chậm nhai kĩ.')).toEqual(['Ăn chậm nhai kĩ.']);
    expect(sheets.get('tv2-t1-b03')?.blocks).toMatchObject([{ letters: ['Ă', 'Â'] }, { model: ['Ăn chậm nhai kĩ.'] }]);
  });

  it('gives every capital-letter block of the shipped book its letters, and copies every model sentence verbatim', () => {
    const blocks = [...loadWorksheets().values()].flatMap((w) => w.blocks);
    const letters = blocks.filter((b) => b.kind === 'letter');
    expect(letters.length).toBeGreaterThan(0);
    for (const block of letters) expect(block.letters.length, block.curriculumRef.join()).toBeGreaterThan(0);
    for (const block of blocks) if (block.kind === 'copy-line') for (const line of block.model ?? []) expect(block.text).toContain(line);
  });
});

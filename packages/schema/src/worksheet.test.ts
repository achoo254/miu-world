import { describe, expect, it } from 'vitest';
import { Worksheet } from './worksheet';

const sheet = {
  lessonId: 'tv2-t1-b03',
  bookId: 'tv2-t1',
  title: 'Bài 3. Niềm vui của Bi và Bống',
  week: 2,
  pages: [17, 19],
  blocks: [{ kind: 'copy-line', text: 'Ăn chậm nhai kĩ.', page: 19, curriculumRef: ['tv2-t1-b03-viet-ung-dung-1'] }],
};

describe('Worksheet', () => {
  it('accepts a sheet whose blocks point back at the inventory', () => {
    expect(Worksheet.parse(sheet).blocks).toHaveLength(1);
  });

  it('needs at least one block, each with its inventory reference', () => {
    expect(Worksheet.safeParse({ ...sheet, blocks: [] }).success).toBe(false);
    expect(Worksheet.safeParse({ ...sheet, blocks: [{ ...sheet.blocks[0], curriculumRef: [] }] }).success).toBe(false);
    expect(Worksheet.safeParse({ ...sheet, bookId: 'toan3-t1' }).success).toBe(false);
  });
});

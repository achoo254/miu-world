import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CurriculumBook, CurriculumUnit, evaluateExpression } from './curriculum';

/** Smallest valid math unit: one lesson, one practice section, two items on one counted page. */
function unit() {
  return {
    book: 'toan2-t1',
    id: 'toan2-t1-chu-de-1',
    number: 1,
    title: 'Ôn tập và bổ sung',
    lessons: [
      {
        id: 'toan2-t1-b01',
        number: 1,
        title: 'Bài 1. Ôn tập các số đến 100',
        pages: [6, 9],
        sections: [
          {
            id: 'toan2-t1-b01-luyen-tap',
            kind: 'luyen-tap',
            pages: [6, 7],
            items: [
              { id: 'toan2-t1-b01-luyen-tap-1-a', page: 6, prompt: 'Tính: 62 - 6', exerciseType: 'tinh', expression: '62 - 6', answer: { number: 56 }, readConfidence: 'high' },
              { id: 'toan2-t1-b01-luyen-tap-2-a', page: 6, prompt: '47 ? 38 + 5', exerciseType: 'so-sanh', expression: '47 ? 38 + 5', answer: { text: '>' }, readConfidence: 'high' },
            ],
          },
        ],
      },
    ],
    pageItems: [{ page: 6, itemCount: 2 }],
  } as Record<string, unknown> & { lessons: Array<Record<string, unknown> & { sections: Array<Record<string, unknown> & { items: Record<string, unknown>[] }> }> };
}

const issues = (raw: unknown): string[] => {
  const parsed = CurriculumUnit.safeParse(raw);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
};
const firstSection = (u: ReturnType<typeof unit>) => {
  const section = u.lessons[0]?.sections[0];
  if (!section) throw new Error('fixture has a section');
  return section;
};

describe('evaluateExpression', () => {
  it('computes sums, comparisons and one unknown', () => {
    expect(evaluateExpression('62 - 6')).toBe(56);
    expect(evaluateExpression('8 + 5 − 3')).toBe(10);
    expect(evaluateExpression('47 ? 38 + 5')).toBe('>');
    expect(evaluateExpression('40 + 3 ? 43')).toBe('=');
    expect(evaluateExpression('? + 5 = 12')).toBe(7);
    expect(evaluateExpression('15 - ? = 9')).toBe(6);
  });

  it('refuses anything else', () => {
    for (const bad of ['6 x 2', '3 +', '', '? + ? = 4', '1 = 1', '5 kg + 3 kg', '(2 + 3)']) expect(evaluateExpression(bad)).toBeNull();
  });
});

describe('curriculum unit', () => {
  it('accepts a valid unit', () => {
    expect(issues(unit())).toEqual([]);
  });

  it('rejects a duplicate id', () => {
    const u = unit();
    const section = firstSection(u);
    section.items.push({ ...section.items[0] });
    u.pageItems = [{ page: 6, itemCount: 3 }];
    expect(issues(u)).toContain('duplicate id toan2-t1-b01-luyen-tap-1-a');
  });

  it('rejects pages outside the lesson or the section', () => {
    const u = unit();
    const section = firstSection(u);
    section.items[0] = { ...section.items[0], page: 8 };
    expect(issues(u)).toContain('item toan2-t1-b01-luyen-tap-1-a: page 8 outside section toan2-t1-b01-luyen-tap');
    const far = unit();
    firstSection(far).pages = [6, 12];
    expect(issues(far)).toContain('section toan2-t1-b01-luyen-tap: pages outside lesson toan2-t1-b01');
  });

  it('needs the text of a reading section', () => {
    const u: ReturnType<typeof unit> = { ...unit(), book: 'tv2-t1', id: 'tv2-t1-chu-diem-1' };
    u.lessons = [{ id: 'tv2-t1-b01', number: 1, week: 1, title: 'Bài 1. Tôi là học sinh lớp 2', pages: [10, 12], sections: [{ id: 'tv2-t1-b01-doc', kind: 'doc', pages: [10, 11], items: [] }] }];
    u.pageItems = [];
    expect(issues(u)).toEqual(['section tv2-t1-b01-doc: a reading section needs its text']);
    const section = firstSection(u);
    section.text = { title: 'Tôi là học sinh lớp 2', author: 'Văn Giá', body: 'Ngày khai trường đã đến.', glossary: [{ term: 'Níu', meaning: 'nắm lấy và kéo lại, kéo xuống.' }] };
    expect(issues(u)).toEqual([]);
  });

  it('uses only the section kinds of its book and needs a week for Tiếng Việt', () => {
    const u = unit();
    firstSection(u).kind = 'doc';
    expect(issues(u)).toContain('section toan2-t1-b01-luyen-tap: kind doc is not used in toan2-t1');
    const tv = { ...unit(), book: 'tv2-t1' };
    expect(issues(tv).join('\n')).toMatch(/needs its school week/);
  });

  it('checks each answer against its expression', () => {
    const u = unit();
    firstSection(u).items[0] = { ...firstSection(u).items[0], answer: { number: 66 } };
    expect(issues(u)).toEqual(['item toan2-t1-b01-luyen-tap-1-a: answer 66 does not match 62 - 6 = 56']);
    const cmp = unit();
    firstSection(cmp).items[1] = { ...firstSection(cmp).items[1], answer: { text: '<' } };
    expect(issues(cmp)).toEqual(['item toan2-t1-b01-luyen-tap-2-a: answer < does not match 47 ? 38 + 5 → >']);
    const bad = unit();
    firstSection(bad).items[0] = { ...firstSection(bad).items[0], expression: '62 x 6' };
    expect(issues(bad)).toEqual(['item toan2-t1-b01-luyen-tap-1-a: cannot compute expression "62 x 6"']);
  });

  it('compares the inventory with the second reading count of each page', () => {
    const u = unit();
    u.pageItems = [{ page: 6, itemCount: 3 }];
    expect(issues(u)).toEqual(['page 6: second reading counted 3 item(s), inventory has 2']);
    u.pageItems = [{ page: 6, itemCount: 2 }, { page: 7, itemCount: 0 }];
    expect(issues(u)).toEqual([]);
  });

  it('rejects a misspelt key', () => {
    const u = unit();
    firstSection(u).items[0] = { ...firstSection(u).items[0], promt: 'x' };
    expect(CurriculumUnit.safeParse(u).success).toBe(false);
  });
});

describe('shipped book files', () => {
  it('parse and list the lessons of the tables of contents', () => {
    const load = (id: string) => CurriculumBook.parse(JSON.parse(readFileSync(new URL(`../../../content/curriculum/${id}/book.json`, import.meta.url), 'utf8')));
    const lessons = (id: string) => load(id).toc.flatMap((u) => u.lessons);
    expect(load('toan2-t1').toc).toHaveLength(7);
    expect(lessons('toan2-t1')).toHaveLength(36);
    expect(load('tv2-t1').toc).toHaveLength(4);
    expect(lessons('tv2-t1')).toHaveLength(34);
    expect(new Set(lessons('tv2-t1').map((l) => l.week)).size).toBe(18);
  });
});

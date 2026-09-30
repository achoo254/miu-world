import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkCurriculum } from './check-curriculum';
import { checkContent } from './check-content';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { cpSync } from 'node:fs';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'miu-curriculum-'));
  mkdirSync(path.join(dir, 'toan2-t1'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const write = (rel: string, value: unknown) => writeFileSync(path.join(dir, rel), JSON.stringify(value));

/** A two-lesson book, pages 6–9, whose unit file covers only lesson 1 unless told otherwise. */
function book(status: 'draft' | 'complete') {
  return {
    id: 'toan2-t1',
    title: 'Toán 2, tập một',
    publisher: 'NXB',
    edition: 'KNTT',
    pdfPageOffset: 1,
    status,
    contentPages: [6, 9],
    toc: [
      {
        id: 'toan2-t1-chu-de-1',
        number: 1,
        title: 'Ôn tập',
        page: 6,
        lessons: [
          { id: 'toan2-t1-b01', title: 'Bài 1. Số', page: 6 },
          { id: 'toan2-t1-b02', title: 'Bài 2. Tia số', page: 8 },
        ],
      },
    ],
  };
}

const item = (id: string, page: number, readConfidence = 'high') => ({ id, page, prompt: 'Tính', exerciseType: 'tinh', readConfidence });
function lesson(n: 1 | 2, confidence = 'high') {
  const id = `toan2-t1-b0${n}`;
  const pages: [number, number] = n === 1 ? [6, 7] : [8, 9];
  return {
    id,
    number: n,
    title: n === 1 ? 'Bài 1. Số' : 'Bài 2. Tia số',
    pages,
    sections: [{ id: `${id}-luyen-tap`, kind: 'luyen-tap', pages, items: [item(`${id}-luyen-tap-1`, pages[0], confidence)] }],
  };
}
const unitFile = (lessons: unknown[], pageItems: unknown[]) => ({ book: 'toan2-t1', id: 'toan2-t1-chu-de-1', number: 1, title: 'Ôn tập', lessons, pageItems });
const fullCount = [6, 7, 8, 9].map((page) => ({ page, itemCount: page === 6 || page === 8 ? 1 : 0 }));

describe('checkCurriculum', () => {
  it('only warns about gaps while the book is a draft', () => {
    write('toan2-t1/book.json', book('draft'));
    write('toan2-t1/chu-de-1.json', unitFile([lesson(1)], []));
    const report = checkCurriculum(dir);
    expect(report.issues).toEqual([]);
    expect(report.warnings).toEqual([
      'toan2-t1: 1 lesson(s) not inventoried: toan2-t1-b02',
      'toan2-t1: content page(s) with no section: 8, 9',
      'toan2-t1: page(s) without a second-reading item count: 6, 7, 8, 9',
    ]);
  });

  it('turns the gaps into errors once the book is complete', () => {
    write('toan2-t1/book.json', book('complete'));
    write('toan2-t1/chu-de-1.json', unitFile([lesson(1), lesson(2, 'low')], fullCount.slice(0, 3)));
    const report = checkCurriculum(dir);
    expect(report.warnings).toEqual([]);
    expect(report.issues).toEqual([
      'toan2-t1: page(s) without a second-reading item count: 9',
      'toan2-t1: 1 item(s) still read with low confidence: toan2-t1-b02-luyen-tap-1',
    ]);
    write('toan2-t1/chu-de-1.json', unitFile([lesson(1), lesson(2)], fullCount));
    expect(checkCurriculum(dir)).toMatchObject({ issues: [], warnings: [] });
  });

  it('rejects lessons that disagree with the table of contents or repeat across files', () => {
    write('toan2-t1/book.json', book('draft'));
    write('toan2-t1/chu-de-1.json', unitFile([{ ...lesson(1), title: 'Bài 1. Khác' }], []));
    expect(checkCurriculum(dir).issues).toEqual(['toan2-t1: lesson toan2-t1-b01 title/start page/week differ from the table of contents']);
    write('toan2-t1/chu-de-1.json', unitFile([lesson(1)], []));
    write('toan2-t1/chu-de-1b.json', unitFile([lesson(1)], []));
    expect(checkCurriculum(dir).issues.join('\n')).toMatch(/unit toan2-t1-chu-de-1 is written twice/);
  });

  it('reports a unit file that breaks the schema', () => {
    write('toan2-t1/book.json', book('draft'));
    write('toan2-t1/chu-de-1.json', unitFile([lesson(1)], [{ page: 6, itemCount: 5 }]));
    expect(checkCurriculum(dir).issues.join('\n')).toMatch(/page 6: second reading counted 5 item\(s\), inventory has 1/);
  });
});

describe('content:check with the inventory', () => {
  it('validates the nested curriculum folders instead of flagging them', () => {
    const content = mkdtempSync(path.join(tmpdir(), 'miu-content-'));
    try {
      cpSync(CONTENT_DIR, content, { recursive: true });
      expect(checkContent(content).issues).toEqual([]);
      writeFileSync(path.join(content, 'curriculum/toan2-t1/chu-de-9.json'), '{}');
      writeFileSync(path.join(content, 'curriculum/stray.json'), '{}');
      const found = checkContent(content).issues.join('\n');
      expect(found).toMatch(/chu-de-9\.json/);
      expect(found).toMatch(/content\/curriculum\/stray\.json has no validator/);
    } finally {
      rmSync(content, { recursive: true, force: true });
    }
  });
});

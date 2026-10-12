import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readBookTocs } from './curriculum-books';

let dir: string | null = null;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

describe('readBookTocs', () => {
  it('reads the table of contents of both shipped books, in book order', () => {
    const books = readBookTocs();
    expect(books.map((book) => book.id)).toEqual(['toan2-t1', 'tv2-t1']);
    expect(books[0]?.toc[0]?.lessons[0]).toEqual({ id: 'toan2-t1-b01', title: 'Bài 1. Ôn tập các số đến 100', page: 6 });
  });

  it('skips a book that is not there and refuses a book.json that does not parse', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'miu-books-'));
    expect(readBookTocs(dir)).toEqual([]);
    mkdirSync(path.join(dir, 'toan2-t1'));
    writeFileSync(path.join(dir, 'toan2-t1/book.json'), '{"id":"toan2-t1"}');
    expect(() => readBookTocs(dir ?? '')).toThrow(/book\.json/);
  });
});

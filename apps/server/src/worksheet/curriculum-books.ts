import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { BOOK_IDS, CurriculumBook, CurriculumUnit } from '@miu/schema/curriculum';
import type { z } from 'zod';
import { CONTENT_DIR } from '../content/content-dir';

/** Textbook inventory (`content/curriculum/<book>/`): `book.json` plus one file per topic or theme. */
export const CURRICULUM_DIR = path.join(CONTENT_DIR, 'curriculum');

export interface LoadedBook {
  book: CurriculumBook;
  units: CurriculumUnit[];
}

export interface CurriculumRead {
  books: LoadedBook[];
  /** Files that do not parse or do not belong to their folder; the books are read without them. */
  issues: string[];
}

function parseFile<S extends z.ZodType>(schema: S, file: string, issues: string[]): z.infer<S> | null {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    issues.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  issues.push(...parsed.error.issues.map((i) => `${file}: ${i.path.length > 0 ? `${i.path.join('.')}: ` : ''}${i.message}`));
  return null;
}

/**
 * Only the tables of contents (`book.json`) of the books present, for what needs lesson titles and pages but not the
 * inventory itself (the lesson pages and their analytics names). A `book.json` that does not parse is an error.
 */
export function readBookTocs(dir: string = CURRICULUM_DIR): CurriculumBook[] {
  const issues: string[] = [];
  const books = BOOK_IDS.flatMap((id) => {
    const file = path.join(dir, id, 'book.json');
    const book = existsSync(file) ? parseFile(CurriculumBook, file, issues) : null;
    return book ? [book] : [];
  });
  if (issues.length > 0) throw new Error(issues.join('; '));
  return books;
}

/** Reads every book folder present; the content gate and the server use this same reader. */
export function readCurriculum(dir: string = CURRICULUM_DIR): CurriculumRead {
  const result: CurriculumRead = { books: [], issues: [] };
  for (const id of BOOK_IDS) {
    const folder = path.join(dir, id);
    if (!existsSync(folder)) continue;
    const book = parseFile(CurriculumBook, path.join(folder, 'book.json'), result.issues);
    if (!book) continue;
    if (book.id !== id) result.issues.push(`${folder}/book.json: id ${book.id} does not match its folder`);
    const units: CurriculumUnit[] = [];
    const files = readdirSync(folder)
      .filter((f) => f.endsWith('.json') && f !== 'book.json')
      .sort();
    for (const file of files.map((f) => path.join(folder, f))) {
      const unit = parseFile(CurriculumUnit, file, result.issues);
      if (unit && unit.book !== id) result.issues.push(`${file}: belongs to ${unit.book}, not ${id}`);
      else if (unit) units.push(unit);
    }
    result.books.push({ book, units });
  }
  return result;
}

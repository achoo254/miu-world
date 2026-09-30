// Textbook inventory checks (content/curriculum/<book>/). Each file is validated on its own by the schema;
// this adds what needs the whole book: the table of contents, page coverage and reading confidence.
// While a book is `draft` the completeness checks only warn, so the inventory can land one topic at a time.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BOOK_IDS, CurriculumBook, CurriculumUnit, type BookId, type CurriculumItem, type CurriculumLesson } from '../../packages/schema/src/curriculum';
import type { z } from 'zod';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';

export const CURRICULUM_DIR = path.join(CONTENT_DIR, 'curriculum');
/** Folders `content:check` hands to this checker (each holds the `.json` files directly inside it). */
export const CURRICULUM_FOLDERS = BOOK_IDS.map((id) => `curriculum/${id}/`);

export interface LoadedBook {
  book: CurriculumBook;
  units: CurriculumUnit[];
}

export interface CurriculumReport {
  issues: string[];
  /** Completeness gaps of a book still marked `draft`; they become issues once it is `complete`. */
  warnings: string[];
  books: LoadedBook[];
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

const lessonsOf = (units: readonly CurriculumUnit[]): CurriculumLesson[] => units.flatMap((u) => u.lessons);
const itemsOf = (units: readonly CurriculumUnit[]): CurriculumItem[] =>
  lessonsOf(units).flatMap((l) => l.sections.flatMap((s) => s.items));

/** Rules that hold at any stage: every lesson written matches the table of contents, ids unique across files. */
function consistencyIssues({ book, units }: LoadedBook): string[] {
  const issues: string[] = [];
  const tocUnits = new Map(book.toc.map((u) => [u.id, u]));
  const tocLessons = new Map(book.toc.flatMap((u) => u.lessons.map((l) => [l.id, { ...l, unit: u.id }] as const)));
  for (const unit of units) {
    const toc = tocUnits.get(unit.id);
    if (!toc) {
      issues.push(`${book.id}: unit ${unit.id} is not in the table of contents`);
      continue;
    }
    if (toc.number !== unit.number || toc.title !== unit.title) issues.push(`${book.id}: unit ${unit.id} number/title differ from the table of contents`);
    for (const lesson of unit.lessons) {
      const entry = tocLessons.get(lesson.id);
      if (!entry) issues.push(`${book.id}: lesson ${lesson.id} is not in the table of contents`);
      else if (entry.unit !== unit.id) issues.push(`${book.id}: lesson ${lesson.id} belongs to ${entry.unit}, not ${unit.id}`);
      else if (entry.title !== lesson.title || entry.page !== lesson.pages[0] || entry.week !== lesson.week) {
        issues.push(`${book.id}: lesson ${lesson.id} title/start page/week differ from the table of contents`);
      }
    }
  }
  const seen = new Set<string>();
  for (const unit of units) {
    if (seen.has(unit.id)) issues.push(`${book.id}: unit ${unit.id} is written twice`);
    seen.add(unit.id);
  }
  // Ids inside one file are already unique (schema); here they must not repeat in another file.
  const owner = new Map<string, string>();
  for (const unit of units) {
    for (const id of lessonsOf([unit]).flatMap((l) => [l.id, ...l.sections.flatMap((s) => [s.id, ...s.items.map((i) => i.id)])])) {
      const first = owner.get(id);
      if (first !== undefined && first !== unit.id) issues.push(`${book.id}: id ${id} is used in both ${first} and ${unit.id}`);
      owner.set(id, first ?? unit.id);
    }
  }
  return issues;
}

/** "6, 7, 8, 10" → "6–8, 10". */
export function pageRanges(pages: readonly number[]): string {
  const ranges: string[] = [];
  let start = pages[0];
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    const next = pages[i + 1];
    if (start === undefined || page === undefined) break;
    if (next === page + 1) continue;
    ranges.push(start === page ? String(page) : `${start}–${page}`);
    start = next;
  }
  return ranges.join(', ');
}

/** What a finished inventory must have: every lesson, every content page read and counted, nothing left unsure. */
function completenessGaps({ book, units }: LoadedBook): string[] {
  const gaps: string[] = [];
  const written = new Set(lessonsOf(units).map((l) => l.id));
  const missing = book.toc.flatMap((u) => u.lessons).filter((l) => !written.has(l.id));
  if (missing.length > 0) gaps.push(`${book.id}: ${missing.length} lesson(s) not inventoried: ${missing.map((l) => l.id).join(', ')}`);

  // A unit's opening page is a picture page when the unit starts before its first lesson.
  const openingPages = new Set(book.toc.filter((u) => u.lessons[0] && u.lessons[0].page !== u.page).map((u) => u.page));
  const sectionPages = new Set<number>();
  for (const section of lessonsOf(units).flatMap((l) => l.sections)) {
    for (let p = section.pages[0]; p <= section.pages[1]; p += 1) sectionPages.add(p);
  }
  const counted = new Set(units.flatMap((u) => u.pageItems.map((c) => c.page)));
  const [first, last] = book.contentPages;
  const unread: number[] = [];
  const uncounted: number[] = [];
  for (let page = first; page <= last; page += 1) {
    if (openingPages.has(page)) continue;
    if (!sectionPages.has(page)) unread.push(page);
    if (!counted.has(page)) uncounted.push(page);
  }
  if (unread.length > 0) gaps.push(`${book.id}: content page(s) with no section: ${pageRanges(unread)}`);
  if (uncounted.length > 0) gaps.push(`${book.id}: page(s) without a second-reading item count: ${pageRanges(uncounted)}`);
  const unsure = itemsOf(units).filter((i) => i.readConfidence === 'low');
  if (unsure.length > 0) gaps.push(`${book.id}: ${unsure.length} item(s) still read with low confidence: ${unsure.map((i) => i.id).join(', ')}`);
  return gaps;
}

function jsonFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => path.join(dir, f));
}

export function checkCurriculum(dir: string = CURRICULUM_DIR): CurriculumReport {
  const report: CurriculumReport = { issues: [], warnings: [], books: [] };
  for (const id of BOOK_IDS) {
    const folder = path.join(dir, id);
    if (!existsSync(folder)) continue;
    const book = parseFile(CurriculumBook, path.join(folder, 'book.json'), report.issues);
    if (!book) continue;
    if (book.id !== id) report.issues.push(`${folder}/book.json: id ${book.id} does not match its folder`);
    const units: CurriculumUnit[] = [];
    for (const file of jsonFiles(folder).filter((f) => path.basename(f) !== 'book.json')) {
      const unit = parseFile(CurriculumUnit, file, report.issues);
      if (unit && unit.book !== id) report.issues.push(`${file}: belongs to ${unit.book}, not ${id}`);
      else if (unit) units.push(unit);
    }
    const loaded = { book, units };
    report.books.push(loaded);
    report.issues.push(...consistencyIssues(loaded));
    (book.status === 'complete' ? report.issues : report.warnings).push(...completenessGaps(loaded));
  }
  return report;
}

/** Item totals per book for quick progress checks while reading. */
export function curriculumCounts(books: readonly LoadedBook[]): Record<BookId, { lessons: number; items: number }> {
  const counts = {} as Record<BookId, { lessons: number; items: number }>;
  for (const { book, units } of books) counts[book.id] = { lessons: lessonsOf(units).length, items: itemsOf(units).length };
  return counts;
}

function main(): void {
  const report = checkCurriculum();
  for (const warning of report.warnings) console.log(`warning: ${warning}`);
  console.log(JSON.stringify(curriculumCounts(report.books)));
  if (report.issues.length > 0) {
    console.error(`curriculum FAILED (${report.issues.length} problem(s)):`);
    for (const issue of report.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log('curriculum OK');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

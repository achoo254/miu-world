import { z } from 'zod';
import { ContentId } from './content';

// Textbook inventory: every lesson, section and exercise of a printed textbook, with its page and its
// wording as printed. Quests, worksheets and the content-gap report all point at these ids, so an id
// never changes once written. Pages are printed page numbers (PDF page − `pdfPageOffset`).

const Text = z.string().trim().min(1);
const Page = z.number().int().min(1);
const PageRange = z.tuple([Page, Page]).refine(([from, to]) => from <= to, { message: 'page range ends before it starts' });

export const BOOK_IDS = ['toan2-t1', 'tv2-t1'] as const;
export const BookId = z.enum(BOOK_IDS);
export type BookId = z.infer<typeof BookId>;

/** A lesson as the table of contents lists it (the check compares it with the lesson files). */
const TocLesson = z.strictObject({
  id: ContentId,
  title: Text,
  /** Printed page the lesson starts on. */
  page: Page,
  /** School week (Tiếng Việt only). */
  week: z.number().int().min(1).max(35).optional(),
});

const TocUnit = z.strictObject({ id: ContentId, number: z.number().int().min(1), title: Text, page: Page, lessons: z.array(TocLesson).min(1) });

/** `book.json`: identity, reading status and the table of contents as printed. */
export const CurriculumBook = z.strictObject({
  id: BookId,
  title: Text,
  publisher: Text,
  edition: Text,
  /** PDF page number minus this offset is the printed page number. */
  pdfPageOffset: z.number().int().min(0),
  /** `draft` while pages are still being read: completeness problems are warnings, not errors. */
  status: z.enum(['draft', 'complete']),
  /** Printed pages holding lessons (cover, foreword, contents, glossary and imprint pages excluded). */
  contentPages: PageRange,
  toc: z.array(TocUnit).min(1),
});
export type CurriculumBook = z.infer<typeof CurriculumBook>;

export const MATH_SECTION_KINDS = ['kham-pha', 'hoat-dong', 'luyen-tap', 'tro-choi', 'van-dung'] as const;
export const VIETNAMESE_SECTION_KINDS = [
  'doc',
  'viet-chu-hoa',
  'viet-ung-dung',
  'nghe-viet',
  'bang-chu-cai',
  'chinh-ta',
  'tu-ngu-cau',
  'viet-doan',
  'noi-nghe',
  'ke-chuyen',
  'doc-mo-rong',
  'van-dung',
  'danh-gia',
] as const;
export const SectionKind = z.union([z.enum(MATH_SECTION_KINDS), z.enum(VIETNAMESE_SECTION_KINDS)]);
export type SectionKind = z.infer<typeof SectionKind>;

export const EXERCISE_TYPES = [
  // Shared
  'chon-dap-an',
  'noi',
  'sap-xep',
  'tro-choi',
  // Math
  'tinh',
  'dien-so',
  'so-sanh',
  'dem',
  'bai-toan-loi-van',
  'do-luong-thuc-hanh',
  've-hinh',
  'nhan-dien-hinh',
  'xem-dong-ho',
  'xem-lich',
  // Vietnamese
  'khoi-dong',
  'doc-thanh-tieng',
  'doc-hieu',
  'tim-tu',
  'dien-chu',
  'xep-tu',
  'dat-cau',
  'dau-cau',
  'ke-chuyen-tranh',
  'noi-ve-ban-than',
  'viet-chu',
  'nghe-viet',
  'viet-doan',
] as const;
export const ExerciseType = z.enum(EXERCISE_TYPES);
export type ExerciseType = z.infer<typeof ExerciseType>;

/** The book's own answer, typed so quests and worksheets can reuse it; `open` for free answers (tell a story). */
export const ItemAnswer = z.union([
  z.strictObject({ number: z.number().int() }),
  z.strictObject({ text: Text }),
  /** Several blanks answered together, in reading order (a table row: 5, 1, 51, "Năm mươi mốt"). */
  z.strictObject({ values: z.array(z.union([z.number().int(), Text])).min(2) }),
  z.strictObject({ time: z.strictObject({ hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59) }) }),
  z.strictObject({ date: z.strictObject({ day: z.number().int().min(1).max(31), month: z.number().int().min(1).max(12) }) }),
  z.strictObject({ choice: Text }),
  z.strictObject({ choices: z.array(Text).min(2) }),
  z.strictObject({ open: z.literal(true) }),
]);
export type ItemAnswer = z.infer<typeof ItemAnswer>;

export const CurriculumItem = z.strictObject({
  /** `<section id>-<exercise number>` plus `-a`, `-b`… for each part answered on its own. */
  id: ContentId,
  page: Page,
  /** Wording as printed. */
  prompt: Text,
  exerciseType: ExerciseType,
  /** What the pictures show, in reading order (the quest redraws them). */
  media: z.array(Text).optional(),
  /** Calculation behind the answer, so the answer can be recomputed: see `evaluateExpression`. */
  expression: Text.optional(),
  answer: ItemAnswer.optional(),
  /** `low` when the two reading passes disagreed and a third pass has not settled it yet. */
  readConfidence: z.enum(['high', 'low']),
});
export type CurriculumItem = z.infer<typeof CurriculumItem>;

const PrintedText = z.strictObject({
  title: Text,
  author: Text.optional(),
  body: Text,
  /** "Từ ngữ" box under the text: word and meaning as printed. */
  glossary: z.array(z.strictObject({ term: Text, meaning: Text })).optional(),
});

export const CurriculumSection = z.strictObject({
  /** `<lesson id>-<kind>` plus `-2`, `-3`… when the kind repeats in the lesson. */
  id: ContentId,
  kind: SectionKind,
  /** Heading as printed, when the section has one of its own. */
  title: Text.optional(),
  pages: PageRange,
  /** Reading passage, poem or story as printed (line breaks kept); required for `doc`. */
  text: PrintedText.optional(),
  /** Attribution printed for a story told from pictures, as printed ("(Theo Truyện kể cho bé Mầm non)"). */
  source: Text.optional(),
  items: z.array(CurriculumItem),
});
export type CurriculumSection = z.infer<typeof CurriculumSection>;

export const CurriculumLesson = z.strictObject({
  id: ContentId,
  /** Lesson number as printed; review weeks have none. */
  number: z.number().int().min(1).optional(),
  title: Text,
  week: z.number().int().min(1).max(35).optional(),
  pages: PageRange,
  sections: z.array(CurriculumSection).min(1),
});
export type CurriculumLesson = z.infer<typeof CurriculumLesson>;

/** One file per topic (Toán) or theme (Tiếng Việt). */
export const CurriculumUnit = z
  .strictObject({
    book: BookId,
    id: ContentId,
    number: z.number().int().min(1),
    title: Text,
    lessons: z.array(CurriculumLesson).min(1),
    /** Items counted on each page by the second, independent reading pass. */
    pageItems: z.array(z.strictObject({ page: Page, itemCount: z.number().int().min(0) })),
  })
  .superRefine((unit, ctx) => {
    for (const message of unitIssues(unit)) ctx.addIssue({ code: 'custom', message });
  });
export type CurriculumUnit = z.infer<typeof CurriculumUnit>;

const within = (page: number, [from, to]: readonly [number, number]) => page >= from && page <= to;

function unitIssues(unit: { book: BookId; lessons: CurriculumLesson[]; pageItems: { page: number; itemCount: number }[] }): string[] {
  const issues: string[] = [];
  const kinds: readonly string[] = unit.book === 'toan2-t1' ? MATH_SECTION_KINDS : VIETNAMESE_SECTION_KINDS;
  for (const lesson of unit.lessons) {
    if (!lesson.id.startsWith(`${unit.book}-`)) issues.push(`lesson ${lesson.id}: id must start with ${unit.book}-`);
    if (unit.book === 'tv2-t1' && lesson.week === undefined) issues.push(`lesson ${lesson.id}: needs its school week`);
    for (const section of lesson.sections) {
      const where = `section ${section.id}`;
      if (!section.id.startsWith(`${lesson.id}-`)) issues.push(`${where}: id must start with ${lesson.id}-`);
      if (!kinds.includes(section.kind)) issues.push(`${where}: kind ${section.kind} is not used in ${unit.book}`);
      if (!within(section.pages[0], lesson.pages) || !within(section.pages[1], lesson.pages)) issues.push(`${where}: pages outside lesson ${lesson.id}`);
      if (section.kind === 'doc' && !section.text) issues.push(`${where}: a reading section needs its text`);
      for (const item of section.items) {
        const at = `item ${item.id}`;
        if (!item.id.startsWith(`${section.id}-`)) issues.push(`${at}: id must start with ${section.id}-`);
        if (!within(item.page, section.pages)) issues.push(`${at}: page ${item.page} outside section ${section.id}`);
        issues.push(...expressionIssues(item).map((m) => `${at}: ${m}`));
      }
    }
  }
  const ids = unit.lessons.flatMap((l) => [l.id, ...l.sections.flatMap((s) => [s.id, ...s.items.map((i) => i.id)])]);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) issues.push(`duplicate id ${id}`);
    seen.add(id);
  }
  const counted = new Map<number, number>();
  for (const { page, itemCount } of unit.pageItems) {
    if (counted.has(page)) issues.push(`page ${page} counted twice`);
    counted.set(page, itemCount);
  }
  const found = new Map<number, number>();
  for (const item of unit.lessons.flatMap((l) => l.sections.flatMap((s) => s.items))) found.set(item.page, (found.get(item.page) ?? 0) + 1);
  for (const page of new Set([...counted.keys(), ...found.keys()])) {
    const expected = counted.get(page);
    const actual = found.get(page) ?? 0;
    // A page not counted yet is a completeness gap (checked per book), not a broken file.
    if (expected !== undefined && expected !== actual) issues.push(`page ${page}: second reading counted ${expected} item(s), inventory has ${actual}`);
  }
  return issues;
}

function expressionIssues(item: CurriculumItem): string[] {
  if (item.expression === undefined) return [];
  const value = evaluateExpression(item.expression);
  if (value === null) return [`cannot compute expression "${item.expression}"`];
  const answer = item.answer;
  if (answer && 'number' in answer && answer.number !== value) return [`answer ${answer.number} does not match ${item.expression} = ${value}`];
  if (answer && 'text' in answer && typeof value === 'string' && answer.text !== value) return [`answer ${answer.text} does not match ${item.expression} → ${value}`];
  return [];
}

// Expressions are what a grade 2 book asks: whole numbers joined by + and −, left to right.
//   "62 - 6"          → 56
//   "47 ? 38 + 5"     → ">" (compare both sides; the answer is <, > or =)
//   "? + 5 = 12"      → 7  (one unknown in an equation, whole numbers 0–1000)

function sum(side: string): number | null {
  const tokens = side.replace(/\s+/g, '').replace(/−/g, '-').match(/[+-]|\d+/g);
  if (!tokens || tokens.join('') !== side.replace(/\s+/g, '').replace(/−/g, '-')) return null;
  let total = 0;
  let sign = 1;
  let expectNumber = true;
  for (const token of tokens) {
    if (expectNumber) {
      if (!/^\d+$/.test(token)) return null;
      total += sign * Number(token);
    } else {
      sign = token === '+' ? 1 : -1;
    }
    expectNumber = !expectNumber;
  }
  return expectNumber ? null : total;
}

/** Value of an inventory expression: a number, a comparison sign, or null when it is not one of the three forms. */
export function evaluateExpression(expression: string): number | '<' | '>' | '=' | null {
  const unknowns = expression.split('?').length - 1;
  if (expression.includes('=')) {
    const [left, right, ...rest] = expression.split('=');
    if (rest.length > 0 || left === undefined || right === undefined || unknowns !== 1) return null;
    const solutions = [];
    for (let n = 0; n <= 1000; n += 1) {
      const l = sum(left.replace('?', String(n)));
      const r = sum(right.replace('?', String(n)));
      if (l === null || r === null) return null;
      if (l === r) solutions.push(n);
    }
    return solutions.length === 1 ? (solutions[0] ?? null) : null;
  }
  if (unknowns === 1) {
    const [left = '', right = ''] = expression.split('?');
    const l = sum(left);
    const r = sum(right);
    if (l === null || r === null) return null;
    return l < r ? '<' : l > r ? '>' : '=';
  }
  return unknowns === 0 ? sum(expression) : null;
}

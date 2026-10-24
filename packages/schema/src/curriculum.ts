import { z } from 'zod';
import { ContentId } from './content';
import { ExerciseType, evaluateExpression } from './learning';

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

// Exercise kinds and expressions live with the learning framework; the inventory reuses them.
export { EXERCISE_TYPES, ExerciseType, evaluateExpression } from './learning';

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

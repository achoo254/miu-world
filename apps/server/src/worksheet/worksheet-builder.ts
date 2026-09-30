import type { CurriculumItem, CurriculumLesson, CurriculumSection } from '@miu/schema/curriculum';
import type { Worksheet, WorksheetBlock } from '@miu/schema/worksheet';
import { readCurriculum, type LoadedBook } from './curriculum-books';

/** Ruled lines left under a paragraph prompt. */
const PARAGRAPH_LINES = 6;

/** "G:" hint lines of a paragraph prompt go under it; the wording stays as printed. */
function splitHints(prompt: string): { prompt: string; hints: string[] } {
  const lines = prompt.split('\n');
  const hints = lines.filter((l) => /^\s*G:/.test(l)).map((l) => l.trim());
  return { prompt: lines.filter((l) => !/^\s*G:/.test(l)).join('\n').trim() || prompt, hints };
}

/**
 * Capitals a "Viết chữ hoa" item models: listed after the colon ("Viết chữ hoa: I, K"), or, where the
 * book shows them only as a picture, named in its description ("mẫu chữ hoa Đ cỡ vừa …").
 */
export function lettersOf(item: CurriculumItem): string[] {
  const after = /^Viết chữ hoa:?\s*(.*?)\.?$/.exec(item.prompt.trim())?.[1] ?? '';
  const listed = after.split(',').map((l) => l.trim()).filter(Boolean);
  if (listed.length > 0) return listed;
  const pictured = (item.media ?? []).flatMap((m) => [...m.matchAll(/mẫu chữ hoa (\p{Lu})(?!\p{L})/gu)].map((match) => match[1] ?? ''));
  return [...new Set(pictured.filter(Boolean))];
}

/** The sentence to copy in a "Viết ứng dụng" section, line by line, without the "Viết ứng dụng:" lead-in. */
export function modelOf(prompt: string): string[] {
  const sentence = /^Viết ứng dụng:\s*([\s\S]+)$/.exec(prompt)?.[1] ?? prompt;
  return sentence.split('\n').map((l) => l.trim()).filter(Boolean);
}

function blockFor(item: CurriculumItem, section: CurriculumSection): WorksheetBlock | null {
  const base = { page: item.page, curriculumRef: [item.id] };
  const paragraph = () => ({ kind: 'paragraph-prompt' as const, ...splitHints(item.prompt), lines: PARAGRAPH_LINES, ...base });
  switch (section.kind) {
    case 'viet-chu-hoa':
      return { kind: 'letter', prompt: item.prompt, letters: lettersOf(item), ...base };
    case 'viet-ung-dung':
      return { kind: 'copy-line', text: item.prompt, model: modelOf(item.prompt), ...base };
    case 'nghe-viet':
      return { kind: 'dictation', prompt: item.prompt, title: section.text?.title, text: section.text?.body, ...base };
    case 'viet-doan':
      return paragraph();
    case 'van-dung':
      return { kind: 'activity', prompt: item.prompt, media: item.media ?? [], ...base };
  }
  switch (item.exerciseType) {
    case 'viet-chu':
      return { kind: 'copy-line', text: item.prompt, ...base };
    case 'nghe-viet':
      return { kind: 'dictation', prompt: item.prompt, ...base };
    case 'viet-doan':
      return paragraph();
    case 'do-luong-thuc-hanh':
    case 've-hinh':
      return { kind: 'activity', prompt: item.prompt, media: item.media ?? [], ...base };
    default:
      return null;
  }
}

function worksheetFor(bookId: Worksheet['bookId'], lesson: CurriculumLesson): Worksheet | null {
  const blocks = lesson.sections.flatMap((section) => section.items.map((item) => blockFor(item, section)).filter((b) => b !== null));
  if (blocks.length === 0) return null;
  return { lessonId: lesson.id, bookId, title: lesson.title, week: lesson.week, pages: lesson.pages, blocks };
}

/**
 * Worksheets for every lesson with writing or at-home work, in book order. Built from the inventory
 * itself, so the printed wording is the book's and there is no second copy to keep in step.
 */
export function buildWorksheets(books: readonly LoadedBook[]): Map<string, Worksheet> {
  const sheets = new Map<string, Worksheet>();
  for (const { book, units } of books) {
    for (const lesson of units.flatMap((u) => u.lessons)) {
      const sheet = worksheetFor(book.id, lesson);
      if (sheet) sheets.set(sheet.lessonId, sheet);
    }
  }
  return sheets;
}

/** Reads the inventory once at startup; a broken inventory file fails the boot, not a request. */
export function loadWorksheets(dir?: string): Map<string, Worksheet> {
  const { books, issues } = readCurriculum(dir);
  if (issues.length > 0) throw new Error(`invalid textbook inventory: ${issues.join('; ')}`);
  return buildWorksheets(books);
}

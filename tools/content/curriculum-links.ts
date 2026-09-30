// Links between textbook quests and the textbook inventory (content/curriculum):
//  - which quest steps may stand for which kind of exercise (a clock exercise needs a clock challenge),
//  - the book's wording and answers reach the game unchanged (the game is the child's real homework),
//  - which inventory items no quest covers yet (`pnpm content:gaps`).
import { templateBlanks, type QuestDefinition, type QuestStep, type QuestText } from '../../packages/schema/src/content';
import { evaluateExpression, type CurriculumItem, type CurriculumSection, type ExerciseType } from '../../packages/schema/src/curriculum';
import type { LoadedBook } from './check-curriculum';

/** How a step is played: the challenge mechanic, or the step kind for other steps. */
export function stepMechanic(step: QuestStep): string {
  return step.kind === 'challenge' ? step.mechanic : step.kind;
}

const INTERACTIVE = ['drag-drop', 'sort', 'classify', 'fill-blank', 'multi-select', 'clock', 'calendar', 'connect'].map((m) => [m]);

/**
 * Ways a quest may cover each exercise type. An item is covered when, among the steps pointing at it,
 * every mechanic of at least one option is present. A new exercise type fails to compile until it has a rule.
 */
export const MECHANIC_RULES: Record<ExerciseType, readonly (readonly string[])[]> = {
  'chon-dap-an': [['quiz'], ['multi-select']],
  noi: [['classify'], ['connect'], ['fill-blank']],
  'sap-xep': [['sort']],
  'tro-choi': INTERACTIVE,
  tinh: [['riddle'], ['fill-blank']],
  // Also "lập các số…": pick every number the cards can make.
  'dien-so': [['riddle'], ['fill-blank'], ['drag-drop'], ['multi-select']],
  // Signs between numbers, or "find the flowers greater than 60" (pick or sort into groups).
  'so-sanh': [['fill-blank'], ['multi-select'], ['classify']],
  dem: [['riddle'], ['fill-blank'], ['drag-drop']],
  'bai-toan-loi-van': [['riddle'], ['fill-blank']],
  'do-luong-thuc-hanh': [['worksheet']],
  've-hinh': [['connect'], ['worksheet']],
  'nhan-dien-hinh': [['multi-select'], ['quiz'], ['classify']],
  'xem-dong-ho': [['clock']],
  'xem-lich': [['calendar']],
  'khoi-dong': [['speak']],
  'doc-thanh-tieng': [['read']],
  'doc-hieu': [['read'], ['quiz'], ['multi-select'], ['classify']],
  'tim-tu': [['classify'], ['multi-select'], ['fill-blank']],
  'dien-chu': [['fill-blank']],
  'xep-tu': [['sort'], ['classify']],
  'dat-cau': [['sort'], ['classify']],
  'dau-cau': [['fill-blank']],
  'ke-chuyen-tranh': [['sort', 'speak']],
  'noi-ve-ban-than': [['speak']],
  'viet-chu': [['worksheet']],
  'nghe-viet': [['worksheet']],
  'viet-doan': [['worksheet']],
};

/** Handwriting sections are done on paper whatever the exercise type says. */
const WRITING_SECTIONS = new Set(['viet-chu-hoa', 'viet-ung-dung', 'nghe-viet', 'viet-doan']);

/** Options for one inventory item: its type's rule, spoken or written answers for free questions. */
export function coverOptions(item: CurriculumItem, section: CurriculumSection): readonly (readonly string[])[] {
  if (WRITING_SECTIONS.has(section.kind)) return [['worksheet']];
  const options = [...MECHANIC_RULES[item.exerciseType]];
  if (item.answer && 'open' in item.answer) options.push(['speak'], ['worksheet']);
  return options;
}

interface IndexedItem {
  item: CurriculumItem;
  section: CurriculumSection;
  lesson: string;
}

export function indexInventory(books: readonly LoadedBook[]): Map<string, IndexedItem> {
  const index = new Map<string, IndexedItem>();
  for (const { units } of books) {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        for (const section of lesson.sections) {
          for (const item of section.items) index.set(item.id, { item, section, lesson: lesson.id });
        }
      }
    }
  }
  return index;
}

function sectionIndex(books: readonly LoadedBook[]): Map<string, CurriculumSection> {
  return new Map(books.flatMap(({ units }) => units.flatMap((u) => u.lessons.flatMap((l) => l.sections.map((s) => [s.id, s] as const)))));
}

// Wording is compared after only two layout-level normalisations: runs of spaces/line breaks become one
// space, and every blank mark (?, …, ..., □, ■, ◻, ___ and the template's {{blank}}) becomes "?". Letters,
// diacritics, digits and punctuation must match exactly.
const BLANK = /\{\{[a-z0-9-]+\}\}|…|\.{3,}|[□■◻◼]|_{2,}/g;
export function normaliseWording(text: string): string {
  return text.normalize('NFC').replace(BLANK, '?').replace(/\s+/g, ' ').trim();
}

/** Everything of the step the child reads: its wording, and the labels of what it shows to pick or move. */
function visibleWording(step: QuestStep): string[] {
  const parts: string[] = [];
  if ('prompt' in step) parts.push(step.prompt);
  if ('question' in step) parts.push(step.question);
  // The instruction and the sentence with blanks read as one line on screen.
  if (step.kind === 'challenge' && step.mechanic === 'fill-blank') parts.push([...parts, step.template].join(' '));
  if ('choices' in step) for (const c of step.choices) if ('id' in c) parts.push(c.text);
  if (step.kind === 'speak') parts.push(...step.hints);
  if (step.kind === 'challenge') {
    if (step.mechanic === 'fill-blank') parts.push(step.template, ...step.blanks.flatMap((b) => b.options.map((o) => o.text)));
    if (step.mechanic === 'sort' || step.mechanic === 'classify') parts.push(...step.items.map((i) => i.label));
    if (step.mechanic === 'classify') parts.push(...step.groups.map((g) => g.label));
  }
  return parts.map(normaliseWording);
}

/**
 * The printed phrases of an inventory prompt. Readers flatten a page's layout into one line (choices
 * printed in columns joined by "; ", a/b/c requirements, table cells split by " | ", A/B columns, "G:"
 * hint lines, the asked row after a list), and a quest shows those parts as separate buttons, labels,
 * cards and hints. So the prompt is cut at sentence ends and layout marks, and each sentence or list
 * entry must still appear exactly; nothing inside a phrase is ever loosened.
 */
export function printedPhrases(prompt: string): string[] {
  return normaliseWording(prompt)
    // A sentence ends at . ? ! or :, but not at a choice or row label such as "a." or "2.".
    .split(/;\s+|(?<=[.?!:])(?<!(?:^|\s)[a-zđ0-9]\.)\s+|\s+\|\s+|\s+(?=(?:G|M|A|B):\s)|\s+–\s+|\s+(?=[a-zđ]\.\s)/)
    .map((p) => p.replace(/^(?:(?:G|M|A|B):\s*)?(?:–\s*)?/, '').trim())
    .filter((p) => p.length > 0);
}

const stripChoiceLetter = (label: string) => label.replace(/^[a-zđ]\.\s*/i, '');

/** A phrase is shown when some visible text contains it; a choice "b. mẹ" may be shown as its button "mẹ". */
function missingPhrases(step: QuestStep, prompt: string): string[] {
  const visible = visibleWording(step);
  const shown = (phrase: string) =>
    visible.some((v) => v.includes(phrase)) || (/^[a-zđ]\.\s/.test(phrase) && visible.some((v) => v === stripChoiceLetter(phrase)));
  return printedPhrases(prompt).filter((p) => !shown(p));
}

const sameChoice = (quest: string, book: string) =>
  normaliseWording(quest) === normaliseWording(book) || normaliseWording(quest) === normaliseWording(stripChoiceLetter(book));

const WEEKDAY_LABELS: Record<string, string> = {
  'thu-hai': 'thứ Hai',
  'thu-ba': 'thứ Ba',
  'thu-tu': 'thứ Tư',
  'thu-nam': 'thứ Năm',
  'thu-sau': 'thứ Sáu',
  'thu-bay': 'thứ Bảy',
  'chu-nhat': 'Chủ nhật',
};

/** The book's answer, recomputed from the expression when there is one. */
function bookAnswer(item: CurriculumItem): CurriculumItem['answer'] {
  if (item.expression !== undefined) {
    const value = evaluateExpression(item.expression);
    if (typeof value === 'number') return { number: value };
    if (typeof value === 'string') return { text: value };
  }
  return item.answer;
}

/** Text form of a single-value answer, as a fill-blank option would show it. */
function answerText(answer: CurriculumItem['answer']): string | null {
  if (!answer) return null;
  if ('number' in answer) return String(answer.number);
  if ('text' in answer) return answer.text;
  if ('choice' in answer) return answer.choice;
  return null;
}

/** Differences between a step's answer and the book's answers for the items it points at. */
function answerIssues(step: QuestStep, items: readonly CurriculumItem[]): string[] {
  const [only] = items;
  const single = items.length === 1 && only ? bookAnswer(only) : undefined;
  if (step.kind === 'riddle' && single && 'number' in single && step.answer.value !== single.number) {
    return [`answer ${step.answer.value} differs from the book's ${single.number}`];
  }
  if ((step.kind === 'read' || (step.kind === 'challenge' && step.mechanic === 'quiz')) && single && 'choice' in single) {
    const picked = step.choices.find((c) => c.id === step.answer.choice);
    if (!picked || !sameChoice(picked.text, single.choice)) return [`answer "${picked?.text ?? '?'}" differs from the book's "${single.choice}"`];
  }
  if (step.kind !== 'challenge') return [];
  switch (step.mechanic) {
    case 'multi-select': {
      if (!single || !('choices' in single)) return [];
      const picked = step.answer.choices.map((id) => step.choices.find((c) => c.id === id)?.text ?? '?');
      const same = picked.length === single.choices.length && single.choices.every((b) => picked.some((q) => sameChoice(q, b)));
      return same ? [] : [`answer ${picked.join(', ')} differs from the book's ${single.choices.join(', ')}`];
    }
    case 'fill-blank': {
      // Blanks in template order; with one item per blank each blank takes that item's answer,
      // with one item for all blanks they take its answer values in order.
      const order = templateBlanks(step.template);
      const filled = order.map((id) => step.blanks.find((b) => b.id === id)?.options.find((o) => o.id === step.answer.fills[id])?.text ?? '?');
      let expected: (string | null)[] = [];
      if (items.length === order.length && items.length > 1) expected = items.map((i) => answerText(bookAnswer(i)));
      else if (single && 'values' in single) expected = single.values.map(String);
      else if (single) expected = [answerText(single)];
      if (expected.length !== filled.length || expected.some((e) => e === null)) return [];
      const wrong = filled.findIndex((f, i) => normaliseWording(f) !== normaliseWording(expected[i] ?? ''));
      return wrong < 0 ? [] : [`blank ${order[wrong]} is "${filled[wrong]}", the book's answer is "${expected[wrong]}"`];
    }
    case 'clock':
      if (single && 'time' in single && (single.time.hour !== step.answer.hour || single.time.minute !== step.answer.minute)) {
        return [`answer ${step.answer.hour}:${step.answer.minute} differs from the book's ${single.time.hour}:${single.time.minute}`];
      }
      return [];
    case 'calendar': {
      if (single && 'date' in single && (!('day' in step.answer) || step.answer.day !== single.date.day)) return [`answer differs from the book's day ${single.date.day}`];
      const label = 'weekday' in step.answer ? WEEKDAY_LABELS[step.answer.weekday] : undefined;
      if (single && 'text' in single && label && normaliseWording(single.text).toLowerCase() !== label.toLowerCase()) return [`answer ${label} differs from the book's ${single.text}`];
      return [];
    }
    default:
      return [];
  }
}

function textIssues(id: string, text: QuestText, sections: ReadonlyMap<string, CurriculumSection>): string[] {
  if (text.section === undefined) return [`text ${id} must name the inventory section it comes from`];
  const printed = sections.get(text.section)?.text;
  if (!printed) return [`text ${id} names ${text.section}, which has no printed text in the inventory`];
  const diff: string[] = (['title', 'author', 'body'] as const).filter((k) => (text[k] ?? '').normalize('NFC') !== (printed[k] ?? '').normalize('NFC'));
  if (JSON.stringify(text.glossary ?? []).normalize('NFC') !== JSON.stringify(printed.glossary ?? []).normalize('NFC')) diff.push('glossary');
  return diff.length > 0 ? [`text ${id} differs from the book in ${diff.join(', ')} (it must be copied exactly)`] : [];
}

const isTextbookQuest = (id: string) => id.startsWith('toan2-') || id.startsWith('tv2-');

export interface LessonGaps {
  book: string;
  unit: string;
  lesson: string;
  items: number;
  inGame: number;
  onWorksheet: number;
  missing: string[];
  /** Reading passages of the lesson no quest shows yet. */
  missingTexts: string[];
}

export interface LinkReport {
  issues: string[];
  lessons: LessonGaps[];
}

/**
 * Checks every textbook quest (drafts included) against the inventory and measures which items are
 * covered. Wording, passage and answer differences are errors at any stage; gaps are only counted.
 */
export function checkCurriculumLinks(books: readonly LoadedBook[], quests: readonly QuestDefinition[]): LinkReport {
  const issues: string[] = [];
  const items = indexInventory(books);
  const sections = sectionIndex(books);
  const mechanicsFor = new Map<string, Set<string>>();
  const shownSections = new Set<string>();

  for (const quest of quests) {
    if (quest.status === 'stub') continue;
    const where = (step: string) => `quest ${quest.id} step ${step}`;
    for (const [id, text] of Object.entries(quest.texts)) {
      if (text.section !== undefined) shownSections.add(text.section);
      if (isTextbookQuest(quest.id)) issues.push(...textIssues(id, text, sections).map((m) => `quest ${quest.id} ${m}`));
    }
    for (const step of quest.steps) {
      const refs = 'curriculumRef' in step ? (step.curriculumRef ?? []) : [];
      const linked: CurriculumItem[] = [];
      for (const ref of refs) {
        const entry = items.get(ref);
        if (!entry) {
          issues.push(`${where(step.id)} points at unknown inventory item ${ref}`);
          continue;
        }
        linked.push(entry.item);
        const set = mechanicsFor.get(ref) ?? new Set<string>();
        set.add(stepMechanic(step));
        mechanicsFor.set(ref, set);
        const missing = step.kind === 'worksheet' ? [] : missingPhrases(step, entry.item.prompt);
        if (missing.length > 0) issues.push(`${where(step.id)} does not show the book's wording of ${ref}: "${missing.join('", "')}"`);
      }
      issues.push(...answerIssues(step, linked).map((m) => `${where(step.id)}: ${m}`));
    }
  }

  const byLesson = new Map<string, LessonGaps>();
  for (const { book, units } of books) {
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        const missingTexts = lesson.sections.filter((s) => s.kind === 'doc' && s.text && !shownSections.has(s.id)).map((s) => s.id);
        byLesson.set(lesson.id, { book: book.id, unit: unit.id, lesson: lesson.id, items: 0, inGame: 0, onWorksheet: 0, missing: [], missingTexts });
      }
    }
  }
  for (const [id, { item, section, lesson }] of items) {
    const gaps = byLesson.get(lesson);
    if (!gaps) continue;
    gaps.items += 1;
    const used = mechanicsFor.get(id) ?? new Set<string>();
    const met = coverOptions(item, section).filter((option) => option.every((m) => used.has(m)));
    if (met.some((option) => !option.includes('worksheet'))) gaps.inGame += 1;
    else if (met.length > 0) gaps.onWorksheet += 1;
    else gaps.missing.push(id);
  }
  return { issues, lessons: [...byLesson.values()] };
}

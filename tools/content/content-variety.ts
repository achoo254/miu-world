// Content must never feel repeated: no quest reuses another quest's lines (dialogue, prompts, support,
// feedback, rewards…), and no two textbook quests are built from the same sequence of mechanics.
// The book's own wording is exempt: two quests may both show the same printed exercise.
import type { QuestDefinition } from '../../packages/schema/src/content';
import type { CurriculumItem } from '../../packages/schema/src/curriculum';
import type { LoadedBook } from './check-curriculum';
import { normaliseWording, stepMechanic } from './curriculum-links';

/** Shorter strings are labels (a choice "5", a title "Đọc bài"), not lines of content. */
const MIN_LINE_LENGTH = 16;
/** Keys whose values are ids, enums or machine data, not something a child reads or hears. */
const NOT_TEXT = new Set(['id', 'kind', 'mechanic', 'trigger', 'target', 'targets', 'skill', 'status', 'region', 'review', 'textRef', 'lessonId', 'curriculumRef', 'phases', 'type', 'mode', 'display', 'sevenQuestions']);

function playerLines(quest: QuestDefinition): Array<{ where: string; text: string }> {
  const lines: Array<{ where: string; text: string }> = [];
  const visit = (value: unknown, where: string): void => {
    if (typeof value === 'string') lines.push({ where, text: value });
    else if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${where}[${i}]`));
    else if (typeof value === 'object' && value !== null) {
      // A step's `answer` is graded data; the support layer's `answer` is text the child reads.
      const isStep = 'kind' in value;
      for (const [k, v] of Object.entries(value)) {
        if (!NOT_TEXT.has(k) && !(isStep && k === 'answer')) visit(v, where ? `${where}.${k}` : k);
      }
    }
  };
  if (quest.status === 'stub') return lines;
  // Passages come from the book and are compared with it elsewhere.
  const { texts: _texts, ...rest } = quest;
  visit(rest, '');
  return lines;
}

/** The book's answer as text, when it is text (an answer may be shown as a choice and again in the answer layer). */
function answerTexts(answer: CurriculumItem['answer']): string[] {
  if (!answer) return [];
  if ('text' in answer) return [answer.text];
  if ('choice' in answer) return [answer.choice];
  if ('choices' in answer) return answer.choices;
  if ('values' in answer) return answer.values.filter((v): v is string => typeof v === 'string');
  return [];
}

/** Normalised printed wording (prompts, passages, the book's answers) that quests may repeat. */
function bookWording(books: readonly LoadedBook[]): string[] {
  return books.flatMap(({ units }) =>
    units.flatMap((u) =>
      u.lessons.flatMap((l) =>
        l.sections.flatMap((s) =>
          [...(s.text ? [s.text.title, s.text.body] : []), ...s.items.flatMap((i) => [i.prompt, ...answerTexts(i.answer)])].map(normaliseWording),
        ),
      ),
    ),
  );
}

export function varietyIssues(quests: readonly QuestDefinition[], books: readonly LoadedBook[]): string[] {
  const issues: string[] = [];
  const printed = bookWording(books);
  const fromBook = (line: string) => printed.some((p) => p.includes(line));
  const firstUse = new Map<string, string>();
  for (const quest of quests) {
    for (const { where, text } of playerLines(quest)) {
      const line = normaliseWording(text).toLowerCase();
      if (line.length < MIN_LINE_LENGTH || fromBook(normaliseWording(text))) continue;
      const here = `quest ${quest.id} ${where}`;
      const first = firstUse.get(line);
      if (first) issues.push(`${here} repeats "${text}" (already used by ${first}): write a new line`);
      else firstUse.set(line, here);
    }
  }
  const sequences = new Map<string, string>();
  for (const quest of quests) {
    if (quest.status === 'stub' || !(quest.id.startsWith('toan2-') || quest.id.startsWith('tv2-'))) continue;
    const sequence = quest.steps.map(stepMechanic).join(' → ');
    const other = sequences.get(sequence);
    if (other) issues.push(`quest ${quest.id} plays exactly like ${other} (${sequence}): vary the mechanics or their order`);
    else sequences.set(sequence, quest.id);
  }
  return issues;
}

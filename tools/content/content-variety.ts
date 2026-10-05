// Content must never feel repeated: no quest reuses another quest's lines (dialogue, prompts, support,
// feedback, rewards…), and no two textbook quests are built from the same sequence of mechanics.
// The book's own wording is exempt: two quests may both show the same printed exercise.
import type { QuestDefinition } from '../../packages/schema/src/content';
import type { CurriculumItem } from '../../packages/schema/src/curriculum';
import type { LoadedBook } from './check-curriculum';
import { normaliseWording, stepMechanic } from './curriculum-links';

/** Shorter strings are labels (a choice "5", a title "Đọc bài"), not lines of content. */
const MIN_LINE_LENGTH = 16;
/**
 * Keys whose values are ids, enums or machine data, not something a child reads or hears, and the speaker of a
 * line or a boss's name (a character's name: a character who gives several games says its name in each, and keeps it
 * in English).
 */
const NOT_TEXT = new Set(['speaker', 'bossName', 'id', 'kind', 'mechanic', 'trigger', 'target', 'targets', 'skill', 'status', 'region', 'review', 'textRef', 'lessonId', 'curriculumRef', 'phases', 'type', 'mode', 'display', 'sevenQuestions', 'category', 'game', 'params']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const labelsOf = (choices: unknown): string[] =>
  Array.isArray(choices) ? choices.flatMap((c) => (typeof c === 'string' ? [c] : isRecord(c) && typeof c.text === 'string' ? [c.text] : [])) : [];

/**
 * A boss question's support with its answer layer's text left out where that text is one of the question's own
 * choices (in its language): the answer layer names the right choice as it reads, a label shown again, not a new line.
 */
function withoutChoiceAnswers(turn: Record<string, unknown>): Record<string, unknown> {
  const support = turn.support;
  if (!isRecord(support) || !isRecord(support.answer)) return turn;
  const vi = labelsOf(turn.choices);
  const en = isRecord(turn.en) ? labelsOf(turn.en.choices) : [];
  const answer = { ...support.answer };
  if (typeof answer.text === 'string' && vi.includes(answer.text)) delete answer.text;
  let english = support.en;
  if (isRecord(english) && isRecord(english.answer) && typeof english.answer.text === 'string' && en.includes(english.answer.text)) {
    const { text: _text, ...rest } = english.answer;
    english = { ...english, answer: rest };
  }
  return { ...turn, support: { ...support, answer, en: english } };
}

function playerLines(quest: QuestDefinition): Array<{ where: string; text: string }> {
  const lines: Array<{ where: string; text: string }> = [];
  const visit = (value: unknown, where: string): void => {
    if (typeof value === 'string') lines.push({ where, text: value });
    else if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${where}[${i}]`));
    else if (isRecord(value)) {
      // A step's `answer` is graded data; the support layer's `answer` is text the child reads.
      const isStep = 'kind' in value;
      const entries = Object.entries(!isStep && 'support' in value && 'choices' in value ? withoutChoiceAnswers(value) : value);
      for (const [k, v] of entries) {
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
  // One search over all printed text (NUL never occurs in wording) instead of one per passage.
  const printed = bookWording(books).join('\u0000');
  const fromBook = (line: string) => printed.includes(line);
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

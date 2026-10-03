// What the child copies into her notebook (owner, 03/10/2026: after a right answer show the question and the
// answer and ask her to copy them into her vở; the most important thing is that she writes it down once she
// has played). The answer shown is the one she just gave and the server accepted: nothing the client did
// not already hold. Each quest's entries are kept in this browser per child, so the quest's end can list
// them all again. Storage may be missing or full (private windows): the card still shows, the list at the
// end is then shorter.
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { WEEKDAY_NAMES } from '../challenge/mechanics/calendar-challenge';
import { templateParts } from '../challenge/mechanics/fill-blank-challenge';

export interface NotebookEntry {
  step: string;
  question: string;
  answer: string;
}

const PREFIX = 'miu.notebook.v1';
const keyOf = (owner: string | null, quest: string): string => `${PREFIX}:${owner ?? '-'}:${quest}`;

const labelOf = (list: ReadonlyArray<{ id: string; label?: string; text?: string }>, id: string): string => {
  const item = list.find((x) => x.id === id);
  return item?.label ?? item?.text ?? id;
};

/** "7 giờ", "7 giờ 30 phút". */
export const clockText = (hour: number, minute: number): string => (minute === 0 ? `${hour} giờ` : `${hour} giờ ${minute} phút`);

/**
 * The question and the right answer of a learning step as words to copy, from the step on screen and the
 * answer the server just accepted; null for steps with nothing to copy (talking, the worksheet, dialogue).
 */
export function notebookEntry(step: QuestStepPublic, answer: StepAnswer, fill: (text: string) => string): NotebookEntry | null {
  const entry = (question: string, said: string): NotebookEntry => ({ step: step.id, question: fill(question), answer: fill(said) });
  if (step.kind === 'read' && 'choice' in answer) return entry(step.question, labelOf(step.choices, answer.choice));
  if (step.kind === 'riddle' && 'value' in answer) return entry(step.question, String(answer.value));
  if (step.kind !== 'challenge') return null;
  switch (step.mechanic) {
    case 'quiz':
      return 'choice' in answer ? entry(step.prompt, labelOf(step.choices, answer.choice)) : null;
    case 'multi-select':
      return 'choices' in answer ? entry(step.prompt, answer.choices.map((id) => labelOf(step.choices, id)).join(', ')) : null;
    case 'drag-drop':
      return 'placed' in answer ? entry(`${step.prompt} (${step.container})`, answer.placed.map((id) => labelOf(step.pieces, id)).join(' + ')) : null;
    case 'sort':
      return 'order' in answer ? entry(step.prompt, answer.order.map((id) => labelOf(step.items, id)).join(' → ')) : null;
    case 'classify': {
      if (!('assignment' in answer)) return null;
      const groups = step.groups.map((g) => {
        const items = step.items.filter((item) => answer.assignment[item.id] === g.id).map((item) => item.label);
        return `${g.label}: ${items.join(', ')}`;
      });
      return entry(step.prompt, groups.join('; '));
    }
    case 'fill-blank': {
      if (!('fills' in answer)) return null;
      const parts = templateParts(step.template);
      const asked = parts.map((p) => ('text' in p ? p.text : '…')).join('');
      const filled = parts
        .map((p) => {
          if ('text' in p) return p.text;
          const blank = step.blanks.find((b) => b.id === p.blank);
          const picked = answer.fills[p.blank];
          return blank && picked ? labelOf(blank.options, picked) : '…';
        })
        .join('');
      return entry(`${step.prompt}\n${asked}`, filled);
    }
    case 'clock':
      return 'hour' in answer ? entry(step.prompt, clockText(answer.hour, answer.minute)) : null;
    case 'calendar':
      if ('day' in answer) return entry(`${step.prompt}\n${step.question}`, `Ngày ${answer.day}`);
      if ('weekday' in answer) return entry(`${step.prompt}\n${step.question}`, WEEKDAY_NAMES[answer.weekday]);
      return null;
    case 'connect':
      return 'edges' in answer ? entry(step.prompt, answer.edges.map(([a, b]) => `${labelOf(step.points, a)}${labelOf(step.points, b)}`).join(', ')) : null;
  }
}

function isEntry(value: unknown): value is NotebookEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.step === 'string' && typeof v.question === 'string' && typeof v.answer === 'string';
}

/** The entries kept for `quest`, in the order its steps were answered. */
export function readNotebook(owner: string | null, quest: string): NotebookEntry[] {
  try {
    const raw = window.localStorage.getItem(keyOf(owner, quest));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/** Keeps `entry` for `quest`, replacing an earlier one of the same step (a quest played again). */
export function keepInNotebook(owner: string | null, quest: string, entry: NotebookEntry): void {
  try {
    const list = readNotebook(owner, quest).filter((e) => e.step !== entry.step);
    window.localStorage.setItem(keyOf(owner, quest), JSON.stringify([...list, entry]));
  } catch {
    // No storage: the card still showed; the list at the quest's end leaves this one out.
  }
}

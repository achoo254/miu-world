// The lines a child copies into her vở (owner, 03/10/2026: once she has played, she writes it down): each
// question of a quest with its answer as the book writes it, the author's answer text (support layer
// "Đáp án", checked against the textbook). The server sends a line only for a step the child has done.
import { coopTasks, templateBlanks, type AnswerableStep, type CoopTask, type QuestStep } from '@miu/schema/content';
import type { NotebookLine } from '@miu/schema/game';
import { isAnswerable } from './quest-progress';

/** What the step asks, as the child saw it: a fill-in sentence shows its blanks as "…". */
function questionOf(step: AnswerableStep): string {
  if (step.kind === 'read' || step.kind === 'riddle') return step.question;
  if (step.mechanic === 'calendar') return `${step.prompt}\n${step.question}`;
  if (step.mechanic === 'fill-blank') return `${step.prompt}\n${templateBlanks(step.template).reduce((text, id) => text.replace(`{{${id}}}`, '…'), step.template)}`;
  return step.prompt;
}

/** The notebook line of a step: null for a step with no question (dialogue, search, talking, the worksheet). */
export function notebookLine(step: QuestStep): NotebookLine | null {
  return isAnswerable(step) ? { step: step.id, question: questionOf(step), answer: step.support.answer.text } : null;
}

/** A co-op question's answer as written: the right choice's text. */
export function coopAnswerText(task: CoopTask): string {
  return task.choices.find((c) => c.id === task.answer.choice)?.text ?? task.answer.choice;
}

/** Every question of the quest with its answer, in the quest's order (each question of a co-op challenge too). */
export function notebookLines(steps: readonly QuestStep[]): NotebookLine[] {
  return steps.flatMap((step) => {
    if (step.kind === 'coop') return coopTasks(step).map((task) => ({ step: task.id, question: task.prompt, answer: coopAnswerText(task) }));
    const line = notebookLine(step);
    return line ? [line] : [];
  });
}

import type { AnswerableStep } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => b[i] === id);
}

/** Drag-drop: each piece at most once, only known pieces, values adding up to the total. */
function checkPlaced(step: Extract<AnswerableStep, { mechanic: 'drag-drop' }>, placed: readonly string[]): boolean {
  if (new Set(placed).size !== placed.length) return false;
  let sum = 0;
  for (const id of placed) {
    const piece = step.pieces.find((p) => p.id === id);
    if (!piece) return false;
    sum += piece.value;
  }
  return sum === step.answer.total;
}

/**
 * Grades an answer for a learning step. Runs only on the server: the client never holds the answers
 * (it gets `QuestView`). An answer of the wrong shape for the step is simply wrong.
 */
export function checkAnswer(step: AnswerableStep, answer: StepAnswer): boolean {
  if (step.kind === 'riddle') return 'value' in answer && answer.value === step.answer.value;
  if (step.kind === 'read') return 'choice' in answer && answer.choice === step.answer.choice;
  switch (step.mechanic) {
    case 'quiz':
      return 'choice' in answer && answer.choice === step.answer.choice;
    case 'sort':
      return 'order' in answer && sameList(answer.order, step.answer.order);
    case 'drag-drop':
      return 'placed' in answer && checkPlaced(step, answer.placed);
  }
}

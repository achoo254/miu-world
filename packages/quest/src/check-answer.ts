import { sameClockTime, type AnswerableStep, type MinigameStep } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';

type Mechanic<M extends string> = Extract<AnswerableStep, { mechanic: M }>;

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => b[i] === id);
}

/** Same members, any order, no repeats. */
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return new Set(a).size === a.length && a.length === b.length && a.every((id) => b.includes(id));
}

/** Same keys and the same value for each key. */
function sameRecord(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const keys = Object.keys(b);
  return sameSet(Object.keys(a), keys) && keys.every((k) => a[k] === b[k]);
}

/** Drag-drop: each piece at most once, only known pieces, values adding up to the total. */
function checkPlaced(step: Mechanic<'drag-drop'>, placed: readonly string[]): boolean {
  if (new Set(placed).size !== placed.length) return false;
  let sum = 0;
  for (const id of placed) {
    const piece = step.pieces.find((p) => p.id === id);
    if (!piece) return false;
    sum += piece.value;
  }
  return sum === step.answer.total;
}

/** Connect: the same segments, in any order and either direction. */
function checkEdges(step: Mechanic<'connect'>, edges: readonly (readonly [string, string])[]): boolean {
  const key = ([a, b]: readonly [string, string]) => [a, b].sort().join('|');
  return sameSet(edges.map(key), step.answer.edges.map(key));
}

function checkCalendar(step: Mechanic<'calendar'>, answer: StepAnswer): boolean {
  if ('day' in step.answer) return 'day' in answer && answer.day === step.answer.day;
  return 'weekday' in answer && answer.weekday === step.answer.weekday;
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
    case 'classify':
      return 'assignment' in answer && sameRecord(answer.assignment, step.answer.assignment);
    case 'fill-blank':
      return 'fills' in answer && sameRecord(answer.fills, step.answer.fills);
    case 'multi-select':
      return 'choices' in answer && sameSet(answer.choices, step.answer.choices);
    case 'clock':
      return 'hour' in answer && sameClockTime(answer, step.answer, step.display);
    case 'calendar':
      return checkCalendar(step, answer);
    case 'connect':
      return 'edges' in answer && checkEdges(step, answer.edges);
  }
}

/**
 * Grades a minigame round: won when the score reaches the step's goal. The score comes from the child's
 * device (the game runs there); only reaching the goal matters, never how far past it.
 */
export function checkMinigameScore(step: MinigameStep, answer: StepAnswer): boolean {
  return 'score' in answer && answer.score >= step.goal;
}

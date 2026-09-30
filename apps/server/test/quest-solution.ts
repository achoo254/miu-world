import type { ActiveQuest, DraftQuest, QuestStep } from '@miu/schema/content';

/** One request of a correct play-through: the step id and the body the child sends. */
export type SolutionMove = [stepId: string, body: object];

function answerFor(step: QuestStep): object | null {
  if (step.kind === 'read') return { choice: step.answer.choice };
  if (step.kind === 'riddle') return { value: step.answer.value };
  if (step.kind !== 'challenge') return null;
  switch (step.mechanic) {
    case 'quiz':
      return { choice: step.answer.choice };
    case 'sort':
      return { order: step.answer.order };
    case 'drag-drop': {
      let left = step.answer.total;
      return { placed: step.pieces.filter((p) => (p.value <= left ? ((left -= p.value), true) : false)).map((p) => p.id) };
    }
    case 'classify':
      return { assignment: step.answer.assignment };
    case 'fill-blank':
      return { fills: step.answer.fills };
    case 'multi-select':
      return { choices: step.answer.choices };
    case 'clock':
      return { hour: step.answer.hour, minute: step.answer.minute };
    case 'calendar':
      return step.answer;
    case 'connect':
      return { edges: step.answer.edges };
  }
}

/**
 * The right input for every step, read from the definition (tests may read answers; the client never can).
 * Search steps send one move per target; steps without an answer send an empty body.
 */
export function solution(quest: ActiveQuest | DraftQuest): SolutionMove[] {
  return quest.steps.flatMap((step): SolutionMove[] => {
    if (step.kind === 'search') return step.targets.map((target) => [step.id, { target }]);
    const answer = answerFor(step);
    return [[step.id, answer ? { answer } : {}]];
  });
}
